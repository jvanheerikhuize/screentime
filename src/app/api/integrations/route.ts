import { NextResponse } from 'next/server';
import { getTrackers } from '@/lib/streaming/trackers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/integrations — state of the built-in sources shown in Settings. */
export async function GET() {
  const trackers = await getTrackers();
  return NextResponse.json({
    tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
    trackerCount: trackers.length,
  });
}
