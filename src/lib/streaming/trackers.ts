/**
 * Public BitTorrent trackers. The list is refreshed daily from ngosang/trackerslist
 * (a community-maintained list of trackers that are currently online), with a
 * built-in snapshot as fallback. More live trackers = peers found faster.
 */

const TRACKER_LIST_URLS = [
  'https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_best.txt',
  'https://cdn.jsdelivr.net/gh/ngosang/trackerslist@master/trackers_best.txt',
];
const REFRESH_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKERS = 30;

// Snapshot of trackers_best.txt (Nov 2026); used until the first refresh succeeds.
export const FALLBACK_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.tracker.cl:1337/announce',
  'udp://tracker.qu.ax:6969/announce',
  'udp://tracker.ducks.party:1984/announce',
  'udp://tracker-udp.gbitt.info:80/announce',
  'udp://tracker.tryhackx.org:6969/announce',
  'udp://tracker.theoks.net:6969/announce',
  'udp://tracker.gmi.gd:6969/announce',
  'udp://explodie.org:6969/announce',
  'http://tracker.renfei.net:8080/announce',
  'http://tracker.dler.org:6969/announce',
];

// torrent-stream speaks UDP and HTTP(S) trackers only (no WebSocket/WebRTC).
const SUPPORTED = /^(udp|https?):\/\/[^\s]+$/i;

let cached: { list: string[]; at: number } | null = null;
let inflight: Promise<string[]> | null = null;

async function download(): Promise<string[]> {
  for (const url of TRACKER_LIST_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (!res.ok) continue;
      const list = (await res.text())
        .split(/\s+/)
        .map((l) => l.trim())
        .filter((l) => SUPPORTED.test(l));
      if (list.length >= 5) return list;
    } catch {
      // try the next mirror
    }
  }
  throw new Error('tracker list unavailable');
}

/** Current public trackers (cached for a day; never throws). */
export async function getTrackers(): Promise<string[]> {
  if (cached && Date.now() - cached.at < REFRESH_MS) return cached.list;
  inflight ??= download()
    .then((list) => {
      cached = { list: dedupe(list).slice(0, MAX_TRACKERS), at: Date.now() };
      return cached.list;
    })
    .catch(() => {
      // Retry in an hour rather than on every request.
      cached = { list: cached?.list || FALLBACK_TRACKERS, at: Date.now() - REFRESH_MS + 60 * 60 * 1000 };
      return cached.list;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Synchronous best-known list, for code paths that can't await. */
export function knownTrackers(): string[] {
  return cached?.list || FALLBACK_TRACKERS;
}

export function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((t) => {
    const key = t.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Trackers embedded in a magnet link (`tr=` params). */
export function magnetTrackers(magnet: string): string[] {
  const q = magnet.indexOf('?');
  if (q === -1) return [];
  return new URLSearchParams(magnet.slice(q + 1)).getAll('tr').filter((t) => SUPPORTED.test(t));
}

/** Builds a magnet link carrying the current tracker list. */
export function buildMagnet(infoHash: string, title: string): string {
  const tr = knownTrackers().map((t) => `tr=${encodeURIComponent(t)}`).join('&');
  return `magnet:?xt=urn:btih:${infoHash.toLowerCase()}&dn=${encodeURIComponent(title)}&${tr}`;
}
