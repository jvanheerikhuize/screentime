import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/metadata/tmdb';
import { getStreamsForMedia } from '@/lib/streaming/streamSources';
import { stremioScraper } from '@/lib/scrapers/stremioAddons';
import { selfHostedAggregator } from '@/lib/scrapers/selfHostedAggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') as 'movie' | 'tv') || 'movie';
  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');
  const season = seasonParam ? parseInt(seasonParam, 10) : 1;
  const episode = episodeParam ? parseInt(episodeParam, 10) : 1;

  // Self-Hosted Indexer parameters (from user settings or env)
  const prowlarrUrl = searchParams.get('prowlarrUrl') || process.env.PROWLARR_URL;
  const prowlarrApiKey = searchParams.get('prowlarrApiKey') || process.env.PROWLARR_API_KEY;
  const jackettUrl = searchParams.get('jackettUrl') || process.env.JACKETT_URL;
  const jackettApiKey = searchParams.get('jackettApiKey') || process.env.JACKETT_API_KEY;

  try {
    const details = await tmdbService.getDetails(id, type);
    // Built-in open-movie streams are keyed by TMDB id.
    const staticStreams = getStreamsForMedia(id).length
      ? getStreamsForMedia(id)
      : details?.tmdbId
        ? getStreamsForMedia(details.tmdbId)
        : [];

    const imdbId = searchParams.get('imdbId') || details?.imdbId;
    const mediaTitle = details?.title || 'Media';
    const searchQuery = type === 'tv'
      ? `${mediaTitle} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
      : `${mediaTitle} ${details?.releaseDate ? details.releaseDate.split('-')[0] : ''}`.trim();

    const fetchTasks: Promise<any[]>[] = [];

    // 1. Stremio Addons (Torrentio, MediaFusion, KnightCrawler)
    if (imdbId) {
      fetchTasks.push(
        stremioScraper.fetchStreams({
          imdbId,
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch media details' }, { status: 500 });
  }
}
