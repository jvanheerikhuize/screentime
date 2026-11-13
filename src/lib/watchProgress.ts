import type { MediaItem } from '../types/index.ts';

const PROGRESS_STORAGE_KEY = 'lumen_watch_progress_v1';
const FAVORITE_CHANNELS_KEY = 'lumen_favorite_channels_v1';
const MAX_PROGRESS_ITEMS = 40;

export interface EpisodeProgress {
  position: number;
  duration: number;
  updatedAt: number;
}

export interface WatchProgressEntry {
  media: MediaItem;
  season?: number;
  episode?: number;
  position: number;
  duration: number;
  updatedAt: number;
  /** Per-episode progress map keyed by `${season}:${episode}` for TV/anime series. */
  episodes?: Record<string, EpisodeProgress>;
}

/** Normalize a media item before storing in localStorage so we don't bloat storage with 500-episode season trees. */
function compactMediaItem(media: MediaItem): MediaItem {
  const copy: MediaItem = { ...media };
  delete copy.seasons;
  return copy;
}

export function getWatchProgressList(): WatchProgressEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is WatchProgressEntry => Boolean(item?.media?.id && typeof item.position === 'number'))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeWatchProgressList(list: WatchProgressEntry[], syncServer = true): WatchProgressEntry[] {
  const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_PROGRESS_ITEMS);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(sorted));
    } catch {
      // ignore storage quota errors
    }
    if (syncServer) pushStateToServer();
  }
  return sorted;
}

export function getMediaProgress(mediaId: string | number, list = getWatchProgressList()): WatchProgressEntry | null {
  const key = String(mediaId);
  return list.find((entry) => String(entry.media.id) === key || (entry.media.imdbId && entry.media.imdbId === key)) || null;
}

export function getEpisodeProgress(
  mediaId: string | number,
  season: number,
  episode: number,
  list = getWatchProgressList()
): EpisodeProgress | null {
  const entry = getMediaProgress(mediaId, list);
  if (!entry) return null;
  const epKey = `${season}:${episode}`;
  if (entry.episodes?.[epKey]) return entry.episodes[epKey];
  if (entry.season === season && entry.episode === episode) {
    return { position: entry.position, duration: entry.duration, updatedAt: entry.updatedAt };
  }
  return null;
}

/**
 * Record playback progress for a movie or episode.
 * - For movies: if >= 94% complete, removes the movie from Continue Watching (finished).
 * - For series: keeps the series in Continue Watching with the latest season/episode and per-episode progress.
 */
export function saveWatchProgress(
  media: MediaItem,
  position: number,
  duration: number,
  season?: number,
  episode?: number
): WatchProgressEntry[] {
  if (!Number.isFinite(position) || position < 5) return getWatchProgressList();
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const ratio = safeDuration > 0 ? position / safeDuration : 0;

  const current = getWatchProgressList();
  const key = String(media.id);
  const existing = current.find((e) => String(e.media.id) === key);

  // If a movie is finished (>= 94% watched), remove it from Continue Watching.
  if (media.mediaType === 'movie' && ratio >= 0.94) {
    return removeWatchProgress(media.id);
  }

  const now = Date.now();
  const episodesMap: Record<string, EpisodeProgress> = { ...(existing?.episodes || {}) };
  if (season !== undefined && episode !== undefined) {
    episodesMap[`${season}:${episode}`] = {
      position: Math.floor(position),
      duration: Math.floor(safeDuration),
      updatedAt: now,
    };
  }

  const updatedEntry: WatchProgressEntry = {
    media: compactMediaItem(media),
    season,
    episode,
    position: Math.floor(position),
    duration: Math.floor(safeDuration),
    updatedAt: now,
    ...(Object.keys(episodesMap).length > 0 ? { episodes: episodesMap } : {}),
  };

  const next = [updatedEntry, ...current.filter((e) => String(e.media.id) !== key)];
  return writeWatchProgressList(next);
}

export function removeWatchProgress(mediaId: string | number): WatchProgressEntry[] {
  const key = String(mediaId);
  const next = getWatchProgressList().filter(
    (e) => String(e.media.id) !== key && (!e.media.imdbId || e.media.imdbId !== key)
  );
  return writeWatchProgressList(next);
}

export function getFavoriteChannelIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITE_CHANNELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteChannel(channelId: string): string[] {
  const current = getFavoriteChannelIds();
  const exists = current.includes(channelId);
  const next = exists ? current.filter((id) => id !== channelId) : [channelId, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FAVORITE_CHANNELS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    pushStateToServer();
  }
  return next;
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

/** Debounced background push of client watch progress & favorites to `/api/state` for LAN device sync. */
export function pushStateToServer(): void {
  if (typeof window === 'undefined') return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    const watchProgress = getWatchProgressList();
    const favoriteChannelIds = getFavoriteChannelIds();
    fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchProgress, favoriteChannelIds }),
    }).catch(() => {});
  }, 400);
}

/** Merge server-side LAN state with local state so devices on the same home network share progress. */
export async function syncStateFromServer(): Promise<{
  watchProgress: WatchProgressEntry[];
  favoriteChannelIds: string[];
}> {
  const localProgress = getWatchProgressList();
  const localFavorites = getFavoriteChannelIds();
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) return { watchProgress: localProgress, favoriteChannelIds: localFavorites };
    const data = await res.json();
    const serverProgress: WatchProgressEntry[] = Array.isArray(data?.watchProgress) ? data.watchProgress : [];
    const serverFavorites: string[] = Array.isArray(data?.favoriteChannelIds) ? data.favoriteChannelIds : [];

    // Merge watchProgress by media.id, keeping whichever entry has the newer updatedAt timestamp.
    const byId = new Map<string, WatchProgressEntry>();
    for (const item of [...serverProgress, ...localProgress]) {
      if (!item?.media?.id) continue;
      const key = String(item.media.id);
      const prev = byId.get(key);
      if (!prev || item.updatedAt > prev.updatedAt) {
        byId.set(key, {
          ...item,
          episodes: { ...(prev?.episodes || {}), ...(item.episodes || {}) },
        });
      }
    }
    const mergedProgress = writeWatchProgressList(Array.from(byId.values()), false);

    // Union favorite channels
    const mergedFavorites = Array.from(new Set([...localFavorites, ...serverFavorites]));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FAVORITE_CHANNELS_KEY, JSON.stringify(mergedFavorites));
      } catch {
        // ignore
      }
    }
    return { watchProgress: mergedProgress, favoriteChannelIds: mergedFavorites };
  } catch {
    return { watchProgress: localProgress, favoriteChannelIds: localFavorites };
  }
}
