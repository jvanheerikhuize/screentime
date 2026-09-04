import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/metadata/tmdb';
import { getStreamsForMedia } from '@/lib/streaming/streamSources';
import { stremioScraper } from '@/lib/scrapers/stremioAddons';

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

  try {
    const details = await tmdbService.getDetails(id, type);
    const staticStreams = getStreamsForMedia(id);

    const imdbId = searchParams.get('imdbId') || details?.imdbId;

    let scrapedStreams: any[] = [];
    if (imdbId) {
      try {
        scrapedStreams = await stremioScraper.fetchStreams({
          imdbId,
          tmdbId: id,
          mediaType: type,
          season,
          episode,
          title: details?.title || 'Media',
        });
      } catch (err: any) {
        console.warn('[Media API] Stremio scraper query warning:', err.message);
      }
    }

    if (!details) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Combine static streams and scraped streams (deduplicating by infoHash or id)
    const combinedStreams = [...staticStreams, ...scrapedStreams];

    return NextResponse.json({
      ...details,
      streams: combinedStreams,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch media details' }, { status: 500 });
  }
}
