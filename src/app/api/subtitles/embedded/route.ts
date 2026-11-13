import { NextRequest } from 'next/server';
import { extractEmbeddedSubtitleSrt } from '@/lib/streaming/media';
import { resolvePlaybackInput } from '@/lib/streaming/playbackInput';
import { srtToVtt } from '@/lib/subtitles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/subtitles/embedded?(magnet=...&fileIndex=N | url=...)&stream=INDEX&offset=SECONDS
 * Extracts a text subtitle stream embedded in an MKV/MP4 container and converts it to WebVTT.
 */
export async function GET(req: NextRequest) {
  const input = await resolvePlaybackInput(req);
  if (!input) return new Response('Missing or invalid magnet/url', { status: 400 });

  const { searchParams } = new URL(req.url);
  const rawStream = searchParams.get('stream');
  if (!rawStream || !/^\d+$/.test(rawStream)) {
    return new Response('Missing or invalid stream index', { status: 400 });
  }
  const streamIndex = parseInt(rawStream, 10);
  const offset = parseFloat(searchParams.get('offset') || '0') || 0;

  try {
    const srt = await extractEmbeddedSubtitleSrt(input, streamIndex);
    const vtt = srtToVtt(srt, offset);
    return new Response(vtt, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('WEBVTT\n\n', {
      headers: { 'Content-Type': 'text/vtt; charset=utf-8' },
    });
  }
}
