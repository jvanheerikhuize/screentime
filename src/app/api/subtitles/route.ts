import { NextRequest, NextResponse } from 'next/server';
import { findSubtitles } from '@/lib/subtitles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/subtitles?imdbId=tt0068646&type=movie  (or &type=tv&season=1&episode=2) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imdbId = searchParams.get('imdbId') || '';
  if (!/^tt\d+$/.test(imdbId)) {
    return NextResponse.json({ subtitles: [] });
  }

  const mediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const season = parseInt(searchParams.get('season') || '1', 10) || 1;
  const episode = parseInt(searchParams.get('episode') || '1', 10) || 1;

  const subtitles = await findSubtitles({ imdbId, mediaType, season, episode }).catch(() => []);
  return NextResponse.json({ subtitles });
}
