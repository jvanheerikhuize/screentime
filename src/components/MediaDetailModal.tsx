'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Play, Star, Film, ChevronDown, Loader2, Users, HardDrive, CalendarClock, Heart } from 'lucide-react';
import { MediaItem, StreamSource } from '@/types';
import { Modal } from './Modal';
import { rankSources } from '@/lib/streaming/pickSource';
import type { ShowStatus } from '@/lib/metadata/tvmaze';
import { cleanAddonUrls, isDefaultAddonList } from '@/lib/scrapers/addonUrls';
import { getEpisodeProgress, getMediaProgress } from '@/lib/watchProgress';

function formatAirDate(airstamp?: string): string {
  if (!airstamp) return '';
  const d = new Date(airstamp);
  if (isNaN(d.getTime())) return '';
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
}

export interface PlaybackContext {
  season?: number;
  episode?: number;
  startAt?: number;
}

interface MediaDetailModalProps {
  media: MediaItem;
  onClose: () => void;
  /** `sources` is the chosen source first, then fallbacks the player may switch to. */
  onPlaySource: (sources: StreamSource[], media: MediaItem, context: PlaybackContext) => void;
  isLiked?: boolean;
  onToggleLike?: (media: MediaItem) => void;
}

/** Stream lookup request; indexer credentials travel as headers so they stay out of URLs and logs. */
export function buildMediaRequest(
  media: MediaItem,
  season: number,
  episode: number
): { url: string; headers: Record<string, string> } {
  let url = `/api/media/${encodeURIComponent(String(media.id))}?type=${media.mediaType}`;
  if (media.imdbId) url += `&imdbId=${media.imdbId}`;
  if (media.mediaType === 'tv') url += `&season=${season}&episode=${episode}`;
  const headers: Record<string, string> = {};

  try {
    const raw = localStorage.getItem('lumen_settings') || localStorage.getItem('screentime_settings') || '{}';
    const parsed = JSON.parse(raw);
    if (parsed.prowlarrEnabled && parsed.prowlarrUrl && parsed.prowlarrApiKey) {
      headers['X-Prowlarr-Url'] = parsed.prowlarrUrl;
      headers['X-Prowlarr-Key'] = parsed.prowlarrApiKey;
    }
    if (parsed.jackettEnabled && parsed.jackettUrl && parsed.jackettApiKey) {
      headers['X-Jackett-Url'] = parsed.jackettUrl;
      headers['X-Jackett-Key'] = parsed.jackettApiKey;
    }
    const addons = cleanAddonUrls(parsed.addonUrls);
    if (!isDefaultAddonList(addons)) url += `&addons=${encodeURIComponent(addons.join(','))}`;
  } catch {
    // no saved settings
  }
  return { url, headers };
}

function sourceSummary(source: StreamSource): string {
  return [
    source.quality !== 'Auto' ? source.quality : null,
    source.size,
    source.type === 'torrent' ? (source.seeds !== undefined ? `${source.seeds} seeds` : 'torrent') : 'direct stream',
  ]
    .filter(Boolean)
    .join(' · ');
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media: baseMedia,
  onClose,
  onPlaySource,
  isLiked = false,
  onToggleLike,
}) => {
  const savedMediaProgress = useMemo(() => getMediaProgress(baseMedia.id), [baseMedia.id]);
  const [details, setDetails] = useState<Partial<MediaItem> | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(() => savedMediaProgress?.season ?? 1);
  const [episode, setEpisode] = useState(() => savedMediaProgress?.episode ?? 1);
  const [showAllSources, setShowAllSources] = useState(false);
  const [showStatus, setShowStatus] = useState<ShowStatus | null>(null);
  const [episodeRange, setEpisodeRange] = useState<number | null>(null);

  // Full details (all seasons/episodes etc.) layered over the list item.
  const media: MediaItem = { ...baseMedia, ...(details || {}), id: baseMedia.id, mediaType: baseMedia.mediaType };
  const isSeries = media.mediaType === 'tv';
  const seasons = media.seasons || [];
  const currentSeason = seasons.find((s) => s.seasonNumber === season);
  const currentEpisode = currentSeason?.episodes.find((e) => e.episodeNumber === episode);
  // Long seasons (e.g. anime with hundreds of episodes) are shown 50 at a time.
  const EPISODE_PAGE = 50;
  const seasonEpisodes = currentSeason?.episodes || [];
  const currentIndex = Math.max(0, seasonEpisodes.findIndex((e) => e.episodeNumber === episode));
  const rangeStart = episodeRange ?? Math.floor(currentIndex / EPISODE_PAGE) * EPISODE_PAGE;
  const visibleEpisodes = seasonEpisodes.slice(rangeStart, rangeStart + EPISODE_PAGE);

  useEffect(() => {
    let cancelled = false;
    const request = buildMediaRequest(baseMedia, season, episode);
    fetch(request.url, { headers: request.headers })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setSources(Array.isArray(data.streams) ? data.streams : []);
        if (data.title) {
          const rest = { ...data };
          delete rest.streams;
          delete rest.error;
          setDetails(rest);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseMedia, season, episode]);

  // Series status and upcoming episode from TVmaze.
  const statusImdb = baseMedia.mediaType === 'tv' ? baseMedia.imdbId || (/^tt\d+$/.test(String(baseMedia.id)) ? String(baseMedia.id) : '') : '';
  useEffect(() => {
    if (!statusImdb) return;
    let cancelled = false;
    fetch(`/api/tvmaze/show?imdbId=${statusImdb}`)
      .then((r) => r.json())
      .then((data: ShowStatus) => !cancelled && data?.status && setShowStatus(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [statusImdb]);

  const ranked = useMemo(() => rankSources(sources).filter((s) => s.magnet || s.url), [sources]);
  const best = ranked[0];

  const selectEpisode = (seasonNumber: number, episodeNumber: number) => {
    if (seasonNumber === season && episodeNumber === episode) return;
    setLoading(true);
    setSources([]);
    setShowAllSources(false);
    setSeason(seasonNumber);
    setEpisode(episodeNumber);
  };

  const activeEpProgress = isSeries ? getEpisodeProgress(baseMedia.id, season, episode) : savedMediaProgress;
  const resumeSeconds =
    activeEpProgress &&
    activeEpProgress.position > 10 &&
    (!activeEpProgress.duration || activeEpProgress.position / activeEpProgress.duration < 0.94)
      ? activeEpProgress.position
      : 0;

  const play = (source: StreamSource, startAt = resumeSeconds) =>
    onPlaySource(
      [source, ...ranked.filter((s) => s !== source)].slice(0, 8),
      media,
      isSeries ? { season, episode, startAt } : { startAt }
    );

  const [failedBackdrop, setFailedBackdrop] = useState<string | null>(null);
  const year = (media.releaseDate || media.firstAirDate)?.split('-')[0];
  const basePlayLabel = isSeries ? (media.anime ? `Episode ${episode}` : `S${season} · E${episode}`) : '';
  const playLabel =
    resumeSeconds > 0
      ? isSeries
        ? `Resume ${basePlayLabel}`
        : `Resume (${Math.floor(resumeSeconds / 60)}m)`
      : isSeries
        ? `Play ${basePlayLabel}`
        : 'Play';

  return (
    <Modal onClose={onClose} label={media.title}>
      {/* Header */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden rounded-t-3xl bg-zinc-950">
        {media.backdropPath && failedBackdrop !== media.backdropPath ? (
          <img
            src={media.backdropPath}
            alt=""
            onError={() => setFailedBackdrop(media.backdropPath!)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <Film className="w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111114] via-[#111114]/60 to-transparent" />
        <div className="absolute bottom-5 left-6 right-6">
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight leading-none text-balance">{media.title}</h2>
          <div className="mt-2 flex items-center gap-3 text-sm text-zinc-300 flex-wrap">
            {year && <span>{year}</span>}
            {media.duration ? <span>{media.duration} min</span> : null}
            {media.voteAverage > 0 && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="w-4 h-4 fill-amber-400" />
                {media.voteAverage}
              </span>
            )}
            {media.genres?.length > 0 && <span className="text-zinc-400">{media.genres.slice(0, 3).join(' · ')}</span>}
          </div>
          {showStatus && (
            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              <span
                className={`px-2.5 py-1 rounded-full font-semibold ${
                  showStatus.status === 'Running' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-zinc-300'
                }`}
              >
                {showStatus.status === 'Running' ? 'Returning series' : showStatus.status}
                {showStatus.network ? ` · ${showStatus.network}` : ''}
              </span>
              {showStatus.nextEpisode && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-zinc-200">
                  <CalendarClock className="w-3.5 h-3.5 text-orange-300" />
                  Next: S{showStatus.nextEpisode.season} · E{showStatus.nextEpisode.episode}
                  {formatAirDate(showStatus.nextEpisode.airstamp) && ` · ${formatAirDate(showStatus.nextEpisode.airstamp)}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Primary action */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => best && play(best, resumeSeconds)}
              disabled={loading || !best}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-400 text-black text-base font-semibold shadow-xl shadow-black/40 active:scale-[0.98] transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              {loading ? 'Finding streams…' : best ? playLabel : 'No streams found'}
            </button>
            {resumeSeconds > 0 && !loading && best && (
              <button
                onClick={() => play(best, 0)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-sm font-semibold bg-white/[0.06] border border-white/10 text-zinc-200 hover:bg-white/15 hover:text-white transition-all active:scale-[0.98]"
              >
                Start over
              </button>
            )}
            {onToggleLike && (
              <button
                onClick={() => onToggleLike(media)}
                aria-pressed={isLiked}
                title={isLiked ? 'Remove from liked titles' : 'Add to liked titles'}
                className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-sm font-semibold border transition-all active:scale-[0.98] ${
                  isLiked
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 hover:bg-rose-500/30'
                    : 'bg-white/[0.06] border-white/10 text-zinc-200 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </button>
            )}
          </div>
          {!loading && best && (
            <p className="text-xs text-zinc-500">
              Best of {ranked.length} source{ranked.length === 1 ? '' : 's'}: {sourceSummary(best)}
            </p>
          )}
          {!loading && !best && (
            <p className="text-xs text-zinc-500">
              Nothing to stream yet. Add more sources in Settings and try again.
            </p>
          )}
        </div>

        {/* Overview */}
        {(isSeries ? currentEpisode?.overview || media.overview : media.overview) && (
          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
            {isSeries && currentEpisode ? (
              <>
                <span className="font-semibold text-white">{currentEpisode.name}. </span>
                {currentEpisode.overview || media.overview}
              </>
            ) : (
              media.overview
            )}
          </p>
        )}

        {/* Episodes */}
        {isSeries && seasons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-display text-lg font-semibold text-white">Episodes</h3>
              <div className="flex items-center gap-2">
              {seasonEpisodes.length > EPISODE_PAGE && (
                <select
                  value={rangeStart}
                  onChange={(e) => setEpisodeRange(Number(e.target.value))}
                  aria-label="Episode range"
                  className="bg-white/[0.06] ring-1 ring-inset ring-white/10 text-sm text-white rounded-full px-3.5 py-1.5 outline-none focus:ring-white/25 [&>option]:bg-zinc-900"
                >
                  {Array.from({ length: Math.ceil(seasonEpisodes.length / EPISODE_PAGE) }, (_, i) => {
                    const first = seasonEpisodes[i * EPISODE_PAGE];
                    const last = seasonEpisodes[Math.min(seasonEpisodes.length, (i + 1) * EPISODE_PAGE) - 1];
                    return (
                      <option key={i} value={i * EPISODE_PAGE}>
                        {first.episodeNumber}–{last.episodeNumber}
                      </option>
                    );
                  })}
                </select>
              )}
              {seasons.length > 1 && (
              <select
                value={season}
                onChange={(e) => {
                  const next = seasons.find((s) => s.seasonNumber === Number(e.target.value));
                  setEpisodeRange(null);
                  selectEpisode(Number(e.target.value), next?.episodes[0]?.episodeNumber || 1);
                }}
                className="bg-white/[0.06] ring-1 ring-inset ring-white/10 text-sm text-white rounded-full px-3.5 py-1.5 outline-none focus:ring-white/25 [&>option]:bg-zinc-900"
                aria-label="Season"
              >
                {seasons.map((s) => (
                  <option key={s.seasonNumber} value={s.seasonNumber}>
                    {s.name}
                  </option>
                ))}
              </select>
              )}
              </div>
            </div>
            <div className="divide-y divide-white/[0.06] ring-1 ring-inset ring-white/[0.08] rounded-2xl overflow-hidden bg-white/[0.02]">
              {visibleEpisodes.map((ep) => {
                const active = ep.episodeNumber === episode;
                const epProg = getEpisodeProgress(baseMedia.id, season, ep.episodeNumber);
                const epRatio = epProg && epProg.duration > 0 ? Math.min(1, epProg.position / epProg.duration) : 0;
                const watched = epRatio >= 0.9;
                return (
                  <button
                    key={ep.id}
                    onClick={() => selectEpisode(season, ep.episodeNumber)}
                    className={`relative w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      active ? 'bg-rose-600/15' : 'hover:bg-zinc-800/70'
                    }`}
                  >
                    <span className={`min-w-7 text-sm font-mono ${active ? 'text-rose-400' : 'text-zinc-500'}`}>{ep.episodeNumber}</span>
                    <span className={`flex-1 truncate text-sm ${active ? 'text-white font-semibold' : 'text-zinc-300'}`}>{ep.name}</span>
                    {watched && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                        Watched
                      </span>
                    )}
                    {active && <Play className="w-4 h-4 text-rose-400 fill-rose-400" />}
                    {epRatio > 0.02 && epRatio < 0.9 && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                        <span
                          className="block h-full bg-rose-500"
                          style={{ width: `${Math.round(epRatio * 100)}%` }}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Alternative sources (collapsed by default) */}
        {!loading && ranked.length > 1 && (
          <div>
            <button
              onClick={() => setShowAllSources((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAllSources ? 'rotate-180' : ''}`} />
              {showAllSources ? 'Hide other sources' : `Choose another source (${ranked.length - 1})`}
            </button>
            {showAllSources && (
              <div className="mt-3 divide-y divide-white/[0.06] ring-1 ring-inset ring-white/[0.08] rounded-2xl overflow-hidden bg-white/[0.02]">
                {ranked.slice(1, 31).map((source) => (
                  <button
                    key={source.id}
                    onClick={() => play(source)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/70 transition-colors"
                  >
                    <Play className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm text-zinc-200">{source.name}</span>
                      <span className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span>{source.quality}</span>
                        {source.size && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {source.size}
                          </span>
                        )}
                        {source.seeds !== undefined && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {source.seeds}
                          </span>
                        )}
                        <span className="truncate">{source.provider}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
