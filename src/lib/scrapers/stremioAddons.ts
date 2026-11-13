import { StreamSource } from '@/types';

export const DEFAULT_ADDON_URLS = [
  'https://torrentio.strem.fun',
  'https://mediafusion.elfhosted.com',
];

// Public addon instances that have shut down; dropped from saved settings too.
const RETIRED_ADDON_HOSTS = ['knightcrawler.elfhosted.com'];

/** Removes retired public instances; falls back to the defaults if nothing is left. */
export function cleanAddonUrls(urls: string[] | undefined | null): string[] {
  const kept = (urls || []).filter((u) => {
    try {
      return !RETIRED_ADDON_HOSTS.includes(new URL(u).hostname);
    } catch {
      return false;
    }
  });
  return kept.length > 0 ? kept : DEFAULT_ADDON_URLS;
}

const DEFAULT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.tracker.cl:1337/announce',
  'udp://9.rarbg.com:2810/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'http://tracker.openbittorrent.com:80/announce',
];

function buildMagnet(infoHash: string, title: string): string {
  const trParams = DEFAULT_TRACKERS.map((t) => `tr=${encodeURIComponent(t)}`).join('&');
  return `magnet:?xt=urn:btih:${infoHash.toLowerCase()}&dn=${encodeURIComponent(title)}&${trParams}`;
}

function parseQuality(text: string): '4K' | '1080p' | '720p' | '480p' | 'Auto' {
  const lower = text.toLowerCase();
  if (lower.includes('4k') || lower.includes('2160p') || lower.includes('uhd')) return '4K';
  if (lower.includes('1080p') || lower.includes('fhd')) return '1080p';
  if (lower.includes('720p') || lower.includes('hd')) return '720p';
  if (lower.includes('480p') || lower.includes('sd')) return '480p';
  return 'Auto';
}

function parseSeeds(text: string): number | undefined {
  const match = text.match(/(?:👤|seeds?[:\s]|s[:\s])\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function parseSize(text: string): string | undefined {
  const match = text.match(/(?:💾\s*)?(\d+(?:\.\d+)?\s*(?:GB|MB|TB|GiB|MiB))/i);
  return match ? match[1] : undefined;
}

function parseCodec(text: string): string | undefined {
  const matches: string[] = [];
  if (/x265|hevc/i.test(text)) matches.push('HEVC/x265');
  else if (/x264|avc|h\.?264/i.test(text)) matches.push('x264');
  if (/av1/i.test(text)) matches.push('AV1');
  if (/hdr10\+|hdr/i.test(text)) matches.push('HDR');
  if (/dolby\s*vision|dv/i.test(text)) matches.push('DV');
  return matches.length > 0 ? matches.join(' • ') : undefined;
}

export class StremioAddonScraper {
  private addonUrls: string[];

  constructor(customAddons?: string[]) {
    this.addonUrls = cleanAddonUrls(customAddons);
  }

  public async fetchStreams(params: {
    imdbId?: string;
    tmdbId?: number | string;
    mediaType: 'movie' | 'tv';
    season?: number;
    episode?: number;
    title?: string;
  }): Promise<StreamSource[]> {
    const { imdbId, mediaType, season = 1, episode = 1, title = 'Media' } = params;

    if (!imdbId) {
      console.log(`[StremioScraper] No IMDb ID provided for ${title}, skipping addon query.`);
      return [];
    }

    const streamId = mediaType === 'tv' ? `${imdbId}:${season}:${episode}` : imdbId;
    const typePath = mediaType === 'tv' ? 'series' : 'movie';

    const results: StreamSource[] = [];
    const seenHashes = new Set<string>();

    await Promise.all(
      this.addonUrls.map(async (baseUrl) => {
        const cleanBase = baseUrl.replace(/\/+$/, '');
        const targetUrl = `${cleanBase}/stream/${typePath}/${encodeURIComponent(streamId)}.json`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);

          const res = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Screentime/1.0',
            },
          });
          clearTimeout(timeoutId);

          if (!res.ok) return;

          const data = await res.json();
          if (!data.streams || !Array.isArray(data.streams)) return;

          for (let i = 0; i < data.streams.length; i++) {
            const stream = data.streams[i];
            const rawTitle = stream.title || stream.name || title;
            const fullDesc = `${stream.name || ''}\n${rawTitle}`;

            if (stream.infoHash && seenHashes.has(stream.infoHash.toLowerCase())) {
              continue; // deduplicate swarms across multiple addons
            }
            if (stream.infoHash) {
              seenHashes.add(stream.infoHash.toLowerCase());
            }

            const quality = parseQuality(fullDesc);
            const seeds = parseSeeds(fullDesc);
            const size = parseSize(fullDesc);
            const codec = parseCodec(fullDesc);
            const firstLine = rawTitle.split('\n')[0].trim();

            let magnet = '';
            if (stream.infoHash) {
              magnet = buildMagnet(stream.infoHash, firstLine || title);
            }

            results.push({
              id: `addon-${stream.infoHash || i}-${Math.random().toString(36).substring(2, 7)}`,
              name: firstLine || `${title} (${quality})`,
              title: rawTitle,
              magnet: magnet || undefined,
              url: stream.url || undefined,
              infoHash: stream.infoHash,
              fileIdx: stream.fileIdx,
              quality,
              codec,
              size,
              seeds,
              peers: seeds ? Math.round(seeds * 0.3) : undefined,
              provider: stream.name?.replace(/\n.*/, '') || 'Torrent Swarm',
              type: stream.url ? 'direct' : 'torrent',
            });
          }
        } catch (err: any) {
          // silently continue
        }
      })
    );

    // Sort: 4K -> 1080p -> 720p, then highest seed count
    const qualityWeight = { '4K': 4, '1080p': 3, '720p': 2, '480p': 1, Auto: 0 };
    return results.sort((a, b) => {
      const qA = qualityWeight[a.quality] || 0;
      const qB = qualityWeight[b.quality] || 0;
      if (qB !== qA) return qB - qA;
      return (b.seeds || 0) - (a.seeds || 0);
    });
  }
}

export const stremioScraper = new StremioAddonScraper();
