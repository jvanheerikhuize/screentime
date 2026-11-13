import { MediaItem } from '@/types';
import { cachedJson } from '@/lib/metadata/cache';

/**
 * TVmaze (api.tvmaze.com): keyless TV schedule and show-status data.
 * Rate limit ~20 requests / 10 s per IP; every call goes through the TTL cache.
 */
const TVMAZE = 'https://api.tvmaze.com';

export interface EpisodeRef {
  season: number;
  episode: number;
  name: string;
  airstamp?: string;
}

export interface ShowStatus {
  status: string; // "Running", "Ended", "To Be Determined", "In Development"
  network?: string;
  nextEpisode?: EpisodeRef;
  previousEpisode?: EpisodeRef;
  officialSite?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toEpisodeRef(ep: any): EpisodeRef | undefined {
  if (!ep || typeof ep.season !== 'number' || typeof ep.number !== 'number') return undefined;
  return { season: ep.season, episode: ep.number, name: ep.name || `Episode ${ep.number}`, airstamp: ep.airstamp || undefined };
}

function stripHtml(html?: string | null): string {
  return (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Status, network and next/previous episode for a series, by IMDb id. */
export async function getShowStatus(imdbId: string): Promise<ShowStatus | null> {
  const lookup = await cachedJson(`${TVMAZE}/lookup/shows?imdb=${encodeURIComponent(imdbId)}`);
  if (!lookup?.id) return null;
  const show = await cachedJson(`${TVMAZE}/shows/${lookup.id}?embed[]=nextepisode&embed[]=previousepisode`);
  if (!show) return null;
  return {
    status: show.status || 'Unknown',
    network: show.network?.name || show.webChannel?.name || undefined,
    nextEpisode: toEpisodeRef(show._embedded?.nextepisode),
    previousEpisode: toEpisodeRef(show._embedded?.previousepisode),
    officialSite: show.officialSite || undefined,
  };
}

/** Shows with a new episode out today (streaming + US broadcast), most popular first. */
export async function getAiringToday(limit = 30): Promise<MediaItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [web, broadcast] = await Promise.all([
    cachedJson(`${TVMAZE}/schedule/web?date=${today}`),
    cachedJson(`${TVMAZE}/schedule?date=${today}&country=US`),
  ]);

  const shows = new Map<string, { show: any; weight: number }>();
  for (const entry of [...(Array.isArray(web) ? web : []), ...(Array.isArray(broadcast) ? broadcast : [])]) {
    const show = entry?._embedded?.show || entry?.show;
    const imdb = show?.externals?.imdb;
    if (!imdb || !show.image || shows.has(imdb)) continue; // need an IMDb id to find streams
    if (/^(News|Talk Show|Game Show|Sports)$/i.test(show.type || '')) continue; // daily/live formats
    shows.set(imdb, { show, weight: show.weight || 0 });
  }

  return [...shows.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, limit)
    .map(([imdb, { show }]) => ({
      id: imdb,
      imdbId: imdb,
      title: show.name,
      overview: stripHtml(show.summary),
      posterPath: show.image?.original || show.image?.medium || null,
      backdropPath: null,
      mediaType: 'tv' as const,
      firstAirDate: show.premiered || undefined,
      voteAverage: show.rating?.average || 0,
      genres: show.genres || [],
    }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */
