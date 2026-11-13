import { NextRequest, NextResponse } from 'next/server';
import { torrentManager } from '@/lib/streaming/torrentEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/stream/release?magnet=...  Stops downloading a torrent the player has left. */
export async function POST(req: NextRequest) {
  const magnet = new URL(req.url).searchParams.get('magnet');
  if (!magnet) return NextResponse.json({ error: 'Missing magnet parameter' }, { status: 400 });
  return NextResponse.json({ released: torrentManager.release(magnet) });
}
