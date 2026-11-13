import { NextRequest, NextResponse } from 'next/server';
import { torrentManager } from '@/lib/streaming/torrentEngine';
import { extractInfoHash } from '@/lib/streaming/trackers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Polled by the player before playback starts. Kicks off the swarm on first call and reports
 * how much of the start of the file is downloaded; the player only starts once state === 'ready'.
 *   GET /api/stream/prepare?magnet=...&fileIndex=2&from=<byte offset of current playback position>
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnet = searchParams.get('magnet');
  if (!magnet || !extractInfoHash(magnet)) {
    return NextResponse.json({ error: 'Missing or invalid magnet parameter' }, { status: 400 });
  }

  const fileIndexParam = searchParams.get('fileIndex');
  const fileIndex = fileIndexParam ? parseInt(fileIndexParam, 10) : undefined;
  const from = Math.max(0, parseInt(searchParams.get('from') || '0', 10) || 0);
  const status = torrentManager.getBufferStatus(magnet, fileIndex, from);
  const stats = torrentManager.getStats(magnet);

  return NextResponse.json({ ...status, files: stats?.files || [] });
}
