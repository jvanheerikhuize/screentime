import { NextRequest, NextResponse } from 'next/server';
import { LIVE_CHANNELS } from '@/lib/channels/liveChannels';
import { getFreeTvChannels } from '@/lib/channels/freeTv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Status = 'ok' | 'offline';
const TTL_MS = 30 * 60 * 1000;
const MAX_URLS = 80;
const CONCURRENCY = 12;
const cache = new Map<string, { status: Status; at: number }>();

async function fetchPlaylist(url: string): Promise<{ text: string; url: string } | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Screentime/1.0' },
    signal: AbortSignal.timeout(6000),
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!res.ok) {
    res.body?.cancel().catch(() => {});
    return null;
  }
  const text = await res.text();
  return text.trimStart().startsWith('#EXTM3U') ? { text, url: res.url || url } : null;
}

const uris = (playlist: string) =>
  playlist.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

/** Asks for the first kilobyte of a media segment: playlists of dead channels often still answer. */
async function segmentAnswers(url: string): Promise<boolean> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Screentime/1.0', Range: 'bytes=0-1023' },
    signal: AbortSignal.timeout(6000),
    redirect: 'follow',
    cache: 'no-store',
  });
  res.body?.cancel().catch(() => {});
  return res.ok;
}

/**
 * A channel is on air when its playlist, first variant and a media segment all answer:
 * many dead channels still serve a master playlist whose variants or segments 404.
 * (Missing CORS headers are fine: the player falls back to /api/live/proxy.)
 */
async function check(url: string): Promise<Status> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.status;
  let status: Status = 'offline';
  try {
    if (/\.mp4(\?|$)/i.test(url)) {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000), redirect: 'follow' });
      if (res.ok) status = 'ok';
    } else {
      const master = await fetchPlaylist(url);
      if (master) {
        const variantRef = master.text.includes('#EXT-X-STREAM-INF') ? uris(master.text)[0] : undefined;
        const media = variantRef ? await fetchPlaylist(new URL(variantRef, master.url).toString()) : master;
        const segment = media ? uris(media.text).at(-1) : undefined; // newest segment
        if (media && segment && (await segmentAnswers(new URL(segment, media.url).toString()))) status = 'ok';
      }
    }
  } catch {
    // unreachable / timed out
  }
  if (cache.size > 5000) cache.clear();
  cache.set(url, { status, at: Date.now() });
  return status;
}

/** POST /api/live/status  { urls: string[] } -> { status: { [url]: 'ok' | 'offline' } } */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // Only channels from our own list are checked (this must not become an open proxy).
  const known = new Set([...LIVE_CHANNELS, ...(await getFreeTvChannels())].map((c) => c.streamUrl));
  const urls: string[] = Array.isArray(body?.urls)
    ? body.urls.filter((u: unknown): u is string => typeof u === 'string' && known.has(u)).slice(0, MAX_URLS)
    : [];

  const status: Record<string, Status> = {};
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
      while (next < urls.length) {
        const url = urls[next++];
        status[url] = await check(url);
      }
    })
  );
  return NextResponse.json({ status });
}
