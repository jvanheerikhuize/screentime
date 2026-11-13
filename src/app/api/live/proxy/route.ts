import { NextRequest } from 'next/server';
import { LIVE_CHANNELS } from '@/lib/channels/liveChannels';
import { getFreeTvChannels } from '@/lib/channels/freeTv';
import { guardedFetch, readBoundedText } from '@/lib/net/guardedFetch';
import { rewritePlaylist } from '@/lib/live/playlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/live/proxy?u=<url>
 * Relays a live HLS stream for channels whose servers don't send CORS headers on every
 * file (the browser player can't read those directly). Playlists are rewritten so that
 * variant playlists, keys and segments also go through this relay.
 *
 * Only hosts of channels in our own list — and hosts their playlists point to — are
 * relayed, so this can't be used as an open proxy.
 */
const PROXY_PATH = '/api/live/proxy?u=';
const learnedHosts = new Set<string>();
let channelHosts: { hosts: Set<string>; at: number } | null = null;

async function allowedHosts(): Promise<Set<string>> {
  if (!channelHosts || Date.now() - channelHosts.at > 60 * 60 * 1000) {
    const hosts = new Set<string>();
    for (const c of [...LIVE_CHANNELS, ...(await getFreeTvChannels())]) {
      try {
        hosts.add(new URL(c.streamUrl).hostname);
      } catch {
        // skip malformed
      }
    }
    channelHosts = { hosts, at: Date.now() };
  }
  return channelHosts.hosts;
}

/** Rewrites playlist references through the relay and remembers their hosts. */
function relayPlaylist(text: string, base: string): string {
  return rewritePlaylist(text, base, (url) => {
    if (learnedHosts.size > 2000) learnedHosts.clear();
    learnedHosts.add(new URL(url).hostname);
    return PROXY_PATH + encodeURIComponent(url);
  });
}

export async function GET(req: NextRequest) {
  const target = new URL(req.url).searchParams.get('u') || '';
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return new Response('Bad url', { status: 400 });
  }
  if (!/^https?:$/.test(url.protocol)) return new Response('Bad url', { status: 400 });
  if (!(await allowedHosts()).has(url.hostname) && !learnedHosts.has(url.hostname)) {
    return new Response('Host not allowed', { status: 403 });
  }

  let upstream: Response;
  try {
    // Channel servers are public; redirects into this machine or the LAN are refused.
    upstream = await guardedFetch(
      url.toString(),
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Screentime/1.0' },
        signal: AbortSignal.any([req.signal, AbortSignal.timeout(15000)]),
        cache: 'no-store',
      },
      { allowPrivate: false }
    );
  } catch {
    return new Response('Upstream unreachable', { status: 502 });
  }
  if (!upstream.ok) return new Response('Upstream error', { status: upstream.status === 404 ? 404 : 502 });

  const type = upstream.headers.get('content-type') || '';
  const looksLikePlaylist = /mpegurl/i.test(type) || /\.m3u8?(\?|$)/i.test(upstream.url || url.pathname);
  if (looksLikePlaylist) {
    try {
      const text = await readBoundedText(upstream);
      if (text.trimStart().startsWith('#EXTM3U')) {
        return new Response(relayPlaylist(text, upstream.url || url.toString()), {
          headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' },
        });
      }
      return new Response(text, { headers: { 'Content-Type': type || 'text/plain', 'Cache-Control': 'no-store' } });
    } catch {
      return new Response('Upstream playlist too large or unreadable', { status: 502 });
    }
  }

  // Segments, keys, init files: stream straight through.
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (type) headers.set('Content-Type', type);
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new Response(upstream.body, { headers });
}
