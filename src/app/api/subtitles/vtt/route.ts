import { NextRequest } from 'next/server';
import { isAllowedSubtitleUrl, srtToVtt } from '@/lib/subtitles';
import { guardedFetch, readBoundedText } from '@/lib/net/guardedFetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Fetches an SRT subtitle file and serves it as same-origin WebVTT for the <track> element. */
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const url = params.get('url') || '';
  const offset = Math.max(0, parseFloat(params.get('offset') || '0') || 0);
  if (!isAllowedSubtitleUrl(url)) {
    return new Response('Subtitle host not allowed', { status: 400 });
  }

  try {
    const res = await guardedFetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' }, { allowPrivate: false });
    if (!res.ok) return new Response('Subtitle download failed', { status: 502 });
    const vtt = srtToVtt(await readBoundedText(res), offset);
    return new Response(vtt, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Subtitle download failed', { status: 502 });
  }
}
