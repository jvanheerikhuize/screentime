'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Play, Star, Film, ChevronDown, Loader2, Users, HardDrive } from 'lucide-react';
import { MediaItem, StreamSource } from '@/types';
import { Modal } from './Modal';
import { rankSources } from '@/lib/streaming/pickSource';

export interface PlaybackContext {
  season?: number;
  episode?: number;
}

interface MediaDetailModalProps {
  media: MediaItem;
  onClose: () => void;
  onPlaySource: (source: StreamSource, media: MediaItem, context: PlaybackContext) => void;
}

function buildMediaUrl(media: MediaItem, season: number, episode: number): string {
  let url = `/api/media/${encodeURIComponent(String(media.id))}?type=${media.mediaType}`;
  if (media.imdbId) url += `&imdbId=${media.imdbId}`;
  if (media.mediaType === 'tv') url += `&season=${season}&episode=${episode}`;

  try {
    const parsed = JSON.parse(localStorage.getItem('screentime_settings') || '{}');
    if (parsed.prowlarrEnabled && parsed.prowlarrUrl && parsed.prowlarrApiKey) {
      url += `&prowlarrUrl=${encodeURIComponent(parsed.prowlarrUrl)}&prowlarrApiKey=${encodeURIComponent(parsed.prowlarrApiKey)}`;
    }
    if (parsed.jackettEnabled && parsed.jackettUrl && parsed.jackettApiKey) {
      url += `&jackettUrl=${encodeURIComponent(parsed.jackettUrl)}&jackettApiKey=${encodeURIComponent(parsed.jackettApiKey)}`;
    }
  } catch {
    // no saved settings
  }
  return url;
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

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({ media: baseMedia, onClose, onPlaySource }) => {
  const [details, setDetails] = useState<Partial<MediaItem> | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [showAllSources, setShowAllSources] = useState(false);

  // Full details (all seasons/episodes etc.) layered over the list item.
  const media: MediaItem = { ...baseMedia, ...(details || {}), id: baseMedia.id, mediaType: baseMedia.mediaType };
  const isSeries = media.mediaType === 'tv';
  const seasons = media.seasons || [];
  const currentSeason = seasons.find((s) => s.seasonNumber === season);
  const currentEpisode = currentSeason?.episodes.find((e) => e.episodeNumber === episode);

  useEffect(() => {
    let cancelled = false;
    fetch(buildMediaUrl(baseMedia, season, episode))
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

  const play = (source: StreamSource) => onPlaySource(source, media, isSeries ? { season, episode } : {});

  const year = (media.releaseDate || media.firstAirDate)?.split('-')[0];
  const playLabel = isSeries ? `Play S${season} · E${episode}` : 'Play';

  return (
    <Modal onClose={onClose} label={media.title}>
      {/* Header */}
      <div className="relative h-56 sm:h-72 w-full overflow-hidden rounded-t-3xl bg-zinc-950">
        {media.backdropPath ? (
          <img src={media.backdropPath} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <Film className="w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
        <div className="absolute bottom-5 left-6 right-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">{media.title}</h2>
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
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Primary action */}
        <div className="space-y-2">
          <button
            onClick={() => best && play(best)}
            disabled={loading || !best}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-400 text-white text-base font-bold shadow-lg shadow-rose-600/20 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            {loading ? 'Finding streams…' : best ? playLabel : 'No streams found'}
          </button>
          {!loading && best && (
            <p className="text-xs text-zinc-500">
              Best of {ranked.length} source{ranked.length === 1 ? '' : 's'}: {sourceSummary(best)}
            </p>
          )}
          {!loading && !best && (
            <p className="text-xs text-zinc-500">
              Nothing to stream yet. Add more indexers in Settings, or paste a magnet link with “Stream Magnet”.
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
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white">Episodes</h3>
              <select
                value={season}
                onChange={(e) => {
                  const next = seasons.find((s) => s.seasonNumber === Number(e.target.value));
                  selectEpisode(Number(e.target.value), next?.episodes[0]?.episodeNumber || 1);
                }}
                className="bg-zinc-800 border border-zinc-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500"
                aria-label="Season"
              >
                {seasons.map((s) => (
                  <option key={s.seasonNumber} value={s.seasonNumber}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden">
              {currentSeason?.episodes.map((ep) => {
                const active = ep.episodeNumber === episode;
                return (
                  <button
                    key={ep.id}
                    onClick={() => selectEpisode(season, ep.episodeNumber)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      active ? 'bg-rose-600/15' : 'hover:bg-zinc-800/70'
                    }`}
                  >
                    <span className={`w-7 text-sm font-mono ${active ? 'text-rose-400' : 'text-zinc-500'}`}>{ep.episodeNumber}</span>
                    <span className={`flex-1 truncate text-sm ${active ? 'text-white font-semibold' : 'text-zinc-300'}`}>{ep.name}</span>
                    {active && <Play className="w-4 h-4 text-rose-400 fill-rose-400" />}
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
              <div className="mt-3 divide-y divide-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden">
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
