import { NextRequest } from 'next/server';
import { probeMedia, transcodeToMp4 } from '@/lib/streaming/media';
import { resolvePlaybackInput } from '@/lib/streaming/playbackInput';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/playback/transcode?(magnet=...&fileIndex=N | url=...)&start=SECONDS
 * Browser-playable fragmented MP4 starting at `start`. Seeking = a new request with a new start.
 */
export async function GET(req: NextRequest) {
  const input = resolvePlaybackInput(req);
  if (!input) return new Response('Missing or invalid magnet/url', { status: 400 });
  const start = Math.max(0, parseFloat(new URL(req.url).searchParams.get('start') || '0') || 0);

  try {
    const info = await probeMedia(input);
    const body = transcodeToMp4(input, start, info, req.signal);
    return new Response(body, {
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
        'X-Content-Duration': String(info.duration),
      },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'Transcode failed', { status: 502 });
  }
}
