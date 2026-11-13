import { LiveChannel } from '@/types';

/**
 * Free-TV/IPTV (github.com/Free-TV/IPTV): a curated playlist of free, officially
 * available channels — free-to-air broadcasters and ad-supported services such as
 * Pluto TV, Samsung TV Plus, Plex and Roku. Refreshed every 6 hours.
 */
const PLAYLIST_URLS = [
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
  'https://cdn.jsdelivr.net/gh/Free-TV/IPTV@master/playlist.m3u8',
];
const REFRESH_MS = 6 * 60 * 60 * 1000;

let cached: { channels: LiveChannel[]; at: number } | null = null;
let inflight: Promise<LiveChannel[]> | null = null;

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

// Region name -> ISO code, for playlist groups that carry a country name but no tvg-country.
const CODE_BY_NAME = (() => {
  const map = new Map<string, string>();
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      try {
        const name = regionNames?.of(code);
        if (name && name !== code) map.set(name.toLowerCase(), code);
      } catch {
        // invalid code
      }
    }
  }
  map.set('uk', 'GB');
  map.set('usa', 'US');
  map.set('korea', 'KR');
  return map;
})();

const THEMED_GROUPS: [RegExp, LiveChannel['category']][] = [
  [/news|business|weather/i, 'News'],
  [/documentar/i, 'Documentary'],
  [/music/i, 'Music & Culture'],
  [/sport/i, 'Sports'],
];

function countryName(code: string | undefined, group: string): string {
  if (code) {
    try {
      const name = regionNames?.of(code.toUpperCase());
      if (name && name.toUpperCase() !== code.toUpperCase()) return name;
    } catch {
      // not a region code
    }
  }
  return group.replace(/^.*\/\s*/, ''); // "日本 / Japan" -> "Japan"
}

function attr(line: string, name: string): string | undefined {
  return line.match(new RegExp(`${name}="([^"]*)"`))?.[1] || undefined;
}

/** Parses the playlist, keeping only streams our player can open (HLS / MP4 over HTTP). */
export function parseFreeTvPlaylist(m3u: string): LiveChannel[] {
  const lines = m3u.split(/\r?\n/);
  const channels: LiveChannel[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const info = lines[i];
    if (!info.startsWith('#EXTINF')) continue;
    const url = (lines[i + 1] || '').trim();
    if (!/^https?:\/\//i.test(url) || !/\.(m3u8|mp4)(\?|$)/i.test(url) || /youtube\.com|youtu\.be|twitch\.tv/i.test(url)) continue;
    if (seen.has(url)) continue;

    const group = attr(info, 'group-title') || '';
    if (/^VOD\b/i.test(group)) continue; // on-demand film lists, not live channels
    const rawName = info.slice(info.lastIndexOf(',') + 1).trim();
    const name = rawName.replace(/\s*[ⒼⓈⓉⓎ]/g, '').trim();
    if (!name) continue;
    seen.add(url);

    const groupName = group.replace(/^.*\/\s*/, '').trim();
    const themed = THEMED_GROUPS.find(([re]) => re.test(group));
    const code =
      attr(info, 'tvg-country')?.split(/[;,]/)[0]?.trim().toUpperCase() || (themed ? undefined : CODE_BY_NAME.get(groupName.toLowerCase()));
    channels.push({
      id: `freetv-${channels.length}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
      name,
      category: themed ? themed[1] : /\bnews\b/i.test(name) ? 'News' : 'General',
      country: themed && !code ? 'International' : countryName(code, group),
      countryCode: code && /^[A-Z]{2}$/.test(code) ? code : undefined,
      language: '',
      logo: attr(info, 'tvg-logo') || '',
      streamUrl: url,
      description: '',
      isLive: true,
      source: 'freetv',
      geoBlocked: rawName.includes('Ⓖ'),
      partTime: rawName.includes('Ⓢ'),
    });
  }
  return channels;
}

async function download(): Promise<LiveChannel[]> {
  for (const url of PLAYLIST_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
      if (!res.ok) continue;
      const channels = parseFreeTvPlaylist(await res.text());
      if (channels.length > 50) return channels;
    } catch {
      // try the mirror
    }
  }
  throw new Error('Free-TV playlist unavailable');
}

/** Free-TV channels (cached; returns the last good list, or [] if never loaded). */
export async function getFreeTvChannels(): Promise<LiveChannel[]> {
  if (cached && Date.now() - cached.at < REFRESH_MS) return cached.channels;
  inflight ??= download()
    .then((channels) => {
      cached = { channels, at: Date.now() };
      return channels;
    })
    .catch(() => {
      // Keep serving the previous list; retry in 15 minutes.
      cached = { channels: cached?.channels || [], at: Date.now() - REFRESH_MS + 15 * 60 * 1000 };
      return cached.channels;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
