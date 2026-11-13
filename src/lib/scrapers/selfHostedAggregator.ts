import { StreamSource } from '@/types';
import { buildMagnet, extractInfoHash } from '@/lib/streaming/trackers';
import { XMLParser } from 'fast-xml-parser';
import { guardedFetch } from '@/lib/net/guardedFetch';
import { checkServiceUrl } from '@/lib/net/hosts';

/** Prowlarr/Jackett usually run on your own network; only link-local/metadata addresses are refused. */
const INDEXER = { allowPrivate: true };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface ProwlarrResult {
  title?: string;
  size?: number;
  seeders?: number;
  leechers?: number;
  indexer?: string;
  magnetUrl?: string;
  downloadUrl?: string;
  infoHash?: string;
  guid?: string;
}

interface TorznabAttr {
  '@_name': string;
  '@_value': string;
}


function parseQuality(text: string): '4K' | '1080p' | '720p' | '480p' | 'Auto' {
  const lower = text.toLowerCase();
  if (lower.includes('4k') || lower.includes('2160p') || lower.includes('uhd')) return '4K';
  if (lower.includes('1080p') || lower.includes('fhd')) return '1080p';
  if (lower.includes('720p') || lower.includes('hd')) return '720p';
  if (lower.includes('480p') || lower.includes('sd')) return '480p';
  return 'Auto';
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

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export class SelfHostedAggregatorService {
  /**
   * Search Prowlarr via native JSON v1 API
   */
  public async searchProwlarr(params: {
    hostUrl: string;
    apiKey: string;
    query: string;
    mediaType?: 'movie' | 'tv';
  }): Promise<StreamSource[]> {
    const { hostUrl, apiKey, query, mediaType = 'movie' } = params;
    if (!hostUrl || !apiKey || !query.trim()) return [];

    const cleanHost = checkServiceUrl(hostUrl, INDEXER);
    if (!cleanHost) return [];
    const searchType = mediaType === 'tv' ? 'tvsearch' : 'search';
    const targetUrl = `${cleanHost}/api/v1/search?query=${encodeURIComponent(query)}&type=${searchType}&categories=2000&categories=5000`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await guardedFetch(
        targetUrl,
        { headers: { 'X-Api-Key': apiKey, Accept: 'application/json' }, signal: controller.signal },
        INDEXER
      );
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[Prowlarr] Returned status ${res.status}`);
        return [];
      }

      const data: unknown = await res.json();
      if (!Array.isArray(data)) return [];

      const results: StreamSource[] = [];

      for (const item of data as ProwlarrResult[]) {
        const title = item.title || query;
        const quality = parseQuality(title);
        const codec = parseCodec(title);
        const sizeStr = item.size ? formatBytes(item.size) : undefined;
        const seeds = typeof item.seeders === 'number' ? item.seeders : undefined;
        const indexer = item.indexer || 'Prowlarr Indexer';

        const candidateMagnet = [item.magnetUrl, item.downloadUrl, item.guid].find(
          (v): v is string => typeof v === 'string' && /^magnet:\?/i.test(v.trim()),
        );
        const infoHash = item.infoHash || (candidateMagnet ? extractInfoHash(candidateMagnet) || undefined : undefined);
        const magnet = candidateMagnet ? candidateMagnet.trim() : infoHash ? buildMagnet(infoHash, title) : '';

        if (magnet) {
          results.push({
            id: `prowlarr-${infoHash || item.guid || Math.random().toString(36).substring(2, 7)}`,
            name: title,
            title,
            magnet,
            infoHash,
            quality,
            codec,
            size: sizeStr,
            seeds,
            peers: item.leechers,
            provider: `Prowlarr: ${indexer}`,
            type: 'torrent',
          });
        }
      }

      return results;
    } catch (e) {
      console.warn('[Prowlarr] Search error:', errorMessage(e));
      return [];
    }
  }

  /**
   * Search Jackett via Torznab XML / JSON API
   */
  public async searchJackett(params: {
    hostUrl: string;
    apiKey: string;
    query: string;
    imdbId?: string;
  }): Promise<StreamSource[]> {
    const { hostUrl, apiKey, query, imdbId } = params;
    if (!hostUrl || !apiKey || (!query.trim() && !imdbId)) return [];

    const cleanHost = checkServiceUrl(hostUrl, INDEXER);
    if (!cleanHost) return [];
    let targetUrl = `${cleanHost}/api/v2.0/indexers/all/results/torznab/api?apikey=${encodeURIComponent(apiKey)}&t=search&q=${encodeURIComponent(query)}&cat=2000,5000`;
    if (imdbId) {
      targetUrl += `&imdbid=${encodeURIComponent(imdbId)}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await guardedFetch(targetUrl, { signal: controller.signal }, INDEXER);
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[Jackett] Returned status ${res.status}`);
        return [];
      }

      const xmlText = await res.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const parsed = parser.parse(xmlText);
      const items = parsed?.rss?.channel?.item;
      if (!items) return [];

      const itemsArray = Array.isArray(items) ? items : [items];
      const results: StreamSource[] = [];

      for (const item of itemsArray) {
        const title = item.title || query;
        const quality = parseQuality(title);
        const codec = parseCodec(title);

        let size: number | undefined;
        let seeds: number | undefined;
        let peers: number | undefined;
        let infoHash: string | undefined;
        let attrMagnet: string | undefined;

        // Parse Torznab attributes
        const attrs = item['torznab:attr'];
        if (attrs) {
          const attrList: TorznabAttr[] = Array.isArray(attrs) ? attrs : [attrs];
          for (const a of attrList) {
            const name = a['@_name'];
            const val = a['@_value'];
            if (name === 'size') size = parseInt(val, 10);
            if (name === 'seeders') seeds = parseInt(val, 10);
            if (name === 'peers') peers = parseInt(val, 10);
            if (name === 'infohash') infoHash = val;
            if (name === 'magneturl' && typeof val === 'string' && /^magnet:\?/i.test(val.trim())) {
              attrMagnet = val.trim();
            }
          }
        }

        const enclosureUrl = String(item?.enclosure?.['@_url'] || item?.link || item?.guid || '').trim();
        let magnet = attrMagnet || (/^magnet:\?/i.test(enclosureUrl) ? enclosureUrl : '');
        if (!infoHash && magnet) {
          infoHash = extractInfoHash(magnet) || undefined;
        }
        if (!magnet && infoHash) {
          magnet = buildMagnet(infoHash, title);
        }

        const sizeStr = size ? formatBytes(size) : item.size ? formatBytes(item.size) : undefined;
        const indexer = item['jackettindexer']?.['#text'] || item['jackettindexer'] || 'Jackett Indexer';

        if (magnet) {
          results.push({
            id: `jackett-${infoHash || Math.random().toString(36).substring(2, 7)}`,
            name: title,
            title,
            magnet,
            infoHash,
            quality,
            codec,
            size: sizeStr,
            seeds: seeds !== undefined ? seeds : 0,
            peers,
            provider: `Jackett: ${indexer}`,
            type: 'torrent',
          });
        }
      }

      return results;
    } catch (e) {
      console.warn('[Jackett] Search error:', errorMessage(e));
      return [];
    }
  }

  /**
   * Test connection to Prowlarr or Jackett instance
   */
  public async testConnection(type: 'prowlarr' | 'jackett', hostUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    const cleanHost = checkServiceUrl(hostUrl, INDEXER);
    if (!cleanHost) return { success: false, message: 'Enter an http(s) address, e.g. http://192.168.1.10:9696' };
    try {
      if (type === 'prowlarr') {
        const res = await guardedFetch(
          `${cleanHost}/api/v1/system/status`,
          { headers: { 'X-Api-Key': apiKey }, signal: AbortSignal.timeout(8000) },
          INDEXER
        );
        if (res.ok) {
          const data = await res.json();
          return { success: true, message: `Connected to Prowlarr v${data.version || '1.x'}` };
        }
        return { success: false, message: `Prowlarr error: HTTP ${res.status}` };
      } else {
        const res = await guardedFetch(
          `${cleanHost}/api/v2.0/indexers/all/results/torznab/api?apikey=${encodeURIComponent(apiKey)}&t=caps`,
          { signal: AbortSignal.timeout(8000) },
          INDEXER
        );
        if (res.ok) {
          return { success: true, message: 'Connected to Jackett / Torznab API successfully!' };
        }
        return { success: false, message: `Jackett error: HTTP ${res.status}` };
      }
    } catch {
      return { success: false, message: 'Could not connect. Check the address and that the service is running.' };
    }
  }
}

export const selfHostedAggregator = new SelfHostedAggregatorService();
