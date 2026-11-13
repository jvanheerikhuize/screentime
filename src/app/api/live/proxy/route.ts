import { NextRequest } from 'next/server';
import { LIVE_CHANNELS } from '@/lib/channels/liveChannels';
import { getFreeTvChannels } from '@/lib/channels/freeTv';

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

function proxied(target: string): string {
  return PROXY_PATH + encodeURIComponent(target);
}

function rewritePlaylist(text: string, base: string): string {
  const abs = (ref: string) => {
    const url = new URL(ref, base);
    if (learnedHosts.size > 2000) learnedHosts.clear();
    learnedHosts.add(url.hostname);
    return url.toString();
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        // URI="..." attributes (keys, init segments, alternate audio/subtitle renditions).
        return line.replace(/URI="([^"]+)"/g, (_m, ref: string) => `URI="${proxied(abs(ref))}"`);
      }
      return proxied(abs(trimmed));
    })
    .join('\n');
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
    upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Screentime/1.0' },
      redirect: 'follow',
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(15000)]),
      cache: 'no-store',
    });
  } catch {
    return new Response('Upstream unreachable', { status: 502 });
  }
  if (!upstream.ok) return new Response('Upstream error', { status: upstream.status === 404 ? 404 : 502 });

  const type = upstream.headers.get('content-type') || '';
  const looksLikePlaylist = /mpegurl/i.test(type) || /\.m3u8?(\?|$)/i.test(upstream.url || url.pathname);
  if (looksLikePlaylist) {
    const text = await upstream.text();
    if (text.trimStart().startsWith('#EXTM3U')) {
      return new Response(rewritePlaylist(text, upstream.url || url.toString()), {
        headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' },
      });
    }
    return new Response(text, { headers: { 'Content-Type': type || 'text/plain', 'Cache-Control': 'no-store' } });
  }

  // Segments, keys, init files: stream straight through.
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (type) headers.set('Content-Type', type);
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new Response(upstream.body, { headers });
}
