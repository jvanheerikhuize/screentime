/**
 * AniList id -> Kitsu / IMDb ids, from the community-maintained Fribb/anime-lists
 * mapping (~40k entries, refreshed daily). Kitsu ids let the stream addons
 * (Torrentio etc.) find anime by absolute episode; IMDb ids find subtitles.
 */
const MAPPING_URLS = [
  'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json',
  'https://cdn.jsdelivr.net/gh/Fribb/anime-lists@master/anime-list-mini.json',
];
const REFRESH_MS = 24 * 60 * 60 * 1000;

export interface AnimeIds {
  kitsuId?: number;
  imdbId?: string;
  /** Season number of this entry within the IMDb/TVDB series (for subtitles). */
  season?: number;
}

let cached: { map: Map<number, AnimeIds>; at: number } | null = null;
let inflight: Promise<Map<number, AnimeIds>> | null = null;

interface MappingEntry {
  anilist_id?: number;
  kitsu_id?: number;
  imdb_id?: string | string[];
  season?: { tvdb?: number; tmdb?: number };
}

async function download(): Promise<Map<number, AnimeIds>> {
  for (const url of MAPPING_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
      if (!res.ok) continue;
      const list: MappingEntry[] = await res.json();
      const map = new Map<number, AnimeIds>();
      for (const e of list) {
        if (!e.anilist_id) continue;
        const imdb = Array.isArray(e.imdb_id) ? e.imdb_id[0] : e.imdb_id;
        map.set(e.anilist_id, {
          kitsuId: e.kitsu_id || undefined,
          imdbId: imdb && /^tt\d+$/.test(imdb) ? imdb : undefined,
          season: e.season?.tvdb || e.season?.tmdb || undefined,
        });
      }
      if (map.size > 1000) return map;
    } catch {
      // try the mirror
    }
  }
  throw new Error('anime id mapping unavailable');
}

async function getMap(): Promise<Map<number, AnimeIds>> {
  if (cached && Date.now() - cached.at < REFRESH_MS) return cached.map;
  inflight ??= download()
    .then((map) => {
      cached = { map, at: Date.now() };
      return map;
    })
    .catch(() => {
      cached = { map: cached?.map || new Map(), at: Date.now() - REFRESH_MS + 15 * 60 * 1000 };
      return cached.map;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function getAnimeIds(anilistId: number): Promise<AnimeIds | undefined> {
  return (await getMap()).get(anilistId);
}
