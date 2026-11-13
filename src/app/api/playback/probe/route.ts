import { NextRequest, NextResponse } from 'next/server';
import { probeMedia } from '@/lib/streaming/media';
import { resolvePlaybackInput } from '@/lib/streaming/playbackInput';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/playback/probe?magnet=...&fileIndex=N  |  ?url=https://...
 * Tells the player the real duration and whether the file can play directly or needs converting.
 */
export async function GET(req: NextRequest) {
  const input = resolvePlaybackInput(req);
  if (!input) return NextResponse.json({ error: 'Missing or invalid magnet/url' }, { status: 400 });

  try {
    const info = await probeMedia(input);
    return NextResponse.json({
      duration: info.duration,
      directPlayable: info.directPlayable,
      reason: info.reason,
      video: info.video?.codec,
      audio: info.audio ? `${info.audio.codec}${info.audio.language ? ` (${info.audio.language})` : ''}` : undefined,
      reencodesVideo: !info.directPlayable && !info.copyVideo,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Probe failed' }, { status: 502 });
  }
}
