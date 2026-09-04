import { NextRequest, NextResponse } from 'next/server';
import { torrentManager } from '@/lib/streaming/torrentEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const magnet = searchParams.get('magnet');

  if (!magnet) {
    return NextResponse.json({ error: 'Missing magnet parameter' }, { status: 400 });
  }

  const stats = torrentManager.getStats(magnet);
  if (!stats) {
    return NextResponse.json({
      infoHash: '',
      name: 'Initializing...',
      totalSize: 0,
      downloaded: 0,
      uploaded: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      peers: 0,
      progress: 0,
      files: [],
    });
  }

  return NextResponse.json(stats);
}
