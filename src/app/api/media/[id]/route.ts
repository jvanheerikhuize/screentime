import type { StreamSource } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/metadata/tmdb';
import { getStreamsForMedia } from '@/lib/streaming/streamSources';
import { StremioAddonScraper, stremioScraper } from '@/lib/scrapers/stremioAddons';
import { selfHostedAggregator } from '@/lib/scrapers/selfHostedAggregator';
import { getTrackers } from '@/lib/streaming/trackers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const season = Math.max(1, seasonParam ? parseInt(seasonParam, 10) || 1 : 1);
  const episode = Math.max(1, episodeParam ? parseInt(episodeParam, 10) || 1 : 1);

  // Self-hosted indexers: from the user's settings (sent as headers so keys stay out of
  // URLs and logs) or the server environment.
  const prowlarrUrl = req.headers.get('x-prowlarr-url') || process.env.PROWLARR_URL;
  const prowlarrApiKey = req.headers.get('x-prowlarr-key') || process.env.PROWLARR_API_KEY;
  const jackettUrl = req.headers.get('x-jackett-url') || process.env.JACKETT_URL;
  const jackettApiKey = req.headers.get('x-jackett-key') || process.env.JACKETT_API_KEY;
  // Stremio addons chosen in Settings (comma-separated); the built-in defaults otherwise.
  const addons = searchParams.get('addons');
  const addonScraper = addons ? new StremioAddonScraper(addons.split(',')) : stremioScraper;

  try {
    // Details and the live tracker list (used in every magnet we build) in parallel.
    const [details] = await Promise.all([tmdbService.getDetails(id, type), getTrackers()]);
    // Built-in open-movie streams are keyed by TMDB id.
    const staticStreams = getStreamsForMedia(id).length
      ? getStreamsForMedia(id)
      : details?.tmdbId
        ? getStreamsForMedia(details.tmdbId)
        : [];

    const kitsuId = details?.anime?.kitsuId;
    const rawImdbParam = searchParams.get('imdbId')?.trim();
    const validImdbParam = rawImdbParam && /^tt\d+$/i.test(rawImdbParam) ? rawImdbParam : undefined;
    const imdbId = kitsuId ? undefined : validImdbParam || details?.imdbId;
    const mediaTitle = details?.title || 'Media';
    const searchQuery = details?.anime
      ? type === 'tv'
        ? `${mediaTitle} ${String(episode).padStart(2, '0')}`
        : mediaTitle
      : type === 'tv'
      ? `${mediaTitle} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
      : `${mediaTitle} ${details?.releaseDate ? details.releaseDate.split('-')[0] : ''}`.trim();

    const fetchTasks: Promise<StreamSource[]>[] = [];

    // 1. Stremio addons (Torrentio, MediaFusion by default)
    if (imdbId || kitsuId) {
      fetchTasks.push(
        addonScraper.fetchStreams({
          imdbId,
          kitsuId,
          tmdbId: id,
          mediaType: type,
          season,
          episode,
          title: mediaTitle,
        }).catch((e) => {
          console.warn('[Media API] Stremio scraper query warning:', e.message);
          return [];
        })
      );
    }

    // 2. Self-Hosted Prowlarr Indexer
    if (prowlarrUrl && prowlarrApiKey) {
      fetchTasks.push(
        selfHostedAggregator.searchProwlarr({
          hostUrl: prowlarrUrl,
          apiKey: prowlarrApiKey,
          query: searchQuery,
          mediaType: type,
        }).catch((e) => {
          console.warn('[Media API] Prowlarr query warning:', e.message);
          return [];
        })
      );
    }

    // 3. Self-Hosted Jackett Indexer
    if (jackettUrl && jackettApiKey) {
      fetchTasks.push(
        selfHostedAggregator.searchJackett({
          hostUrl: jackettUrl,
          apiKey: jackettApiKey,
          query: searchQuery,
          imdbId,
        }).catch((e) => {
          console.warn('[Media API] Jackett query warning:', e.message);
          return [];
        })
      );
    }

    const fetchedResults = await Promise.all(fetchTasks);
    const scrapedStreams = fetchedResults.flat();

    if (!details) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Deduplicate streams by infoHash / magnet
    const seen = new Set<string>();
    const combinedStreams = [...staticStreams, ...scrapedStreams].filter((s) => {
      const key = s.infoHash ? s.infoHash.toLowerCase() : s.magnet ? s.magnet.toLowerCase() : s.url || s.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      ...details,
      streams: combinedStreams,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch media details' }, { status: 500 });
  }
}
