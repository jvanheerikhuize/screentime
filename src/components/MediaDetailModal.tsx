'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Play, Star, Calendar, Magnet, DownloadCloud,
  Sparkles, RefreshCw, Layers, HardDrive, Users, CheckCircle2, Film
} from 'lucide-react';
import { MediaItem, StreamSource, Episode } from '@/types';

interface MediaDetailModalProps {
  media: MediaItem | null;
  onClose: () => void;
  onPlaySource: (source: StreamSource, media: MediaItem) => void;
  onPlayDirectMagnet: (magnet: string, title: string) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  onClose,
  onPlaySource,
  onPlayDirectMagnet,
}) => {
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [customMagnet, setCustomMagnet] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [filterQuality, setFilterQuality] = useState<'All' | '4K' | '1080p' | '720p'>('All');

  const fetchStreamSources = (seasonNum = selectedSeason, episodeNum = selectedEpisode) => {
    if (!media) return;
    setLoading(true);

    let url = `/api/media/${media.id}?type=${media.mediaType}`;
    if (media.imdbId) url += `&imdbId=${media.imdbId}`;
    if (media.mediaType === 'tv') {
      url += `&season=${seasonNum}&episode=${episodeNum}`;
    }

    try {
      const saved = localStorage.getItem('screentime_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.prowlarrEnabled && parsed.prowlarrUrl && parsed.prowlarrApiKey) {
          url += `&prowlarrUrl=${encodeURIComponent(parsed.prowlarrUrl)}&prowlarrApiKey=${encodeURIComponent(parsed.prowlarrApiKey)}`;
        }
        if (parsed.jackettEnabled && parsed.jackettUrl && parsed.jackettApiKey) {
          url += `&jackettUrl=${encodeURIComponent(parsed.jackettUrl)}&jackettApiKey=${encodeURIComponent(parsed.jackettApiKey)}`;
        }
      }
    } catch (e) {
      // ignore
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.streams) {
          setSources(data.streams);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!media) return;
    fetchStreamSources(1, 1);
  }, [media]);

  if (!media) return null;

  const handleSelectEpisode = (ep: Episode) => {
    setSelectedEpisode(ep.episodeNumber);
    fetchStreamSources(selectedSeason, ep.episodeNumber);
  };

  const filteredSources = sources.filter((s) => {
    if (filterQuality === 'All') return true;
    return s.quality === filterQuality;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-all shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header / Backdrop */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-zinc-950">
          {media.backdropPath ? (
            <img
              src={media.backdropPath}
              alt={media.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700">
              <Film className="w-12 h-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />

          {/* Floating info over backdrop */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end gap-5">
            {media.posterPath && (
              <img
                src={media.posterPath}
                alt={media.title}
                className="w-24 sm:w-32 rounded-2xl shadow-2xl border-2 border-zinc-700/50 hidden sm:block aspect-[2/3] object-cover flex-shrink-0"
              />
            )}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white text-xs font-bold uppercase tracking-wider">
                  {media.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                {media.voteAverage > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700 text-amber-400 text-xs font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {media.voteAverage} / 10
                  </span>
                )}
                {media.releaseDate && (
                  <span className="flex items-center gap-1 text-zinc-400 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {media.releaseDate.split('-')[0]}
                  </span>
                )}
                {media.imdbId && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    IMDb: {media.imdbId}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                {media.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Overview Synopsis */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Synopsis</h3>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">{media.overview}</p>
          </div>

          {/* Genres */}
          {media.genres && media.genres.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {media.genres.map((g) => (
                <span
                  key={g}
                  className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Season & Episode Selector for TV Series */}
          {media.mediaType === 'tv' && media.seasons && media.seasons.length > 0 && (
            <div className="space-y-3 pt-2 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-rose-500" />
                  Select Episode (S{selectedSeason}E{selectedEpisode})
                </h3>
              </div>

              {/* Seasons tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {media.seasons.map((season) => (
                  <button
                    key={season.seasonNumber}
                    onClick={() => {
                      setSelectedSeason(season.seasonNumber);
                      const firstEp = season.episodes[0]?.episodeNumber || 1;
                      setSelectedEpisode(firstEp);
                      fetchStreamSources(season.seasonNumber, firstEp);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedSeason === season.seasonNumber
                        ? 'bg-rose-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {season.name}
                  </button>
                ))}
              </div>

              {/* Episodes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {media.seasons
                  .find((s) => s.seasonNumber === selectedSeason)
                  ?.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => handleSelectEpisode(ep)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedEpisode === ep.episodeNumber
                          ? 'bg-rose-600/20 border-rose-500 text-white shadow-sm'
                          : 'bg-zinc-900 hover:bg-zinc-800/90 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className={`text-xs font-semibold ${selectedEpisode === ep.episodeNumber ? 'text-rose-400' : 'text-zinc-400'}`}>
                          Episode {ep.episodeNumber}
                        </p>
                        <p className="text-xs font-medium truncate">{ep.name}</p>
                      </div>
                      <Play className={`w-3.5 h-3.5 ${selectedEpisode === ep.episodeNumber ? 'text-rose-400' : 'text-zinc-500'}`} />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Streaming & Torrent Sources (Scraped via Torrentio & Stremio Addons) */}
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <Magnet className="w-4 h-4 text-rose-500" />
                  Available Streams & Torrent Swarms
                </h3>
                <p className="text-xs text-zinc-500">
                  Auto-scraped across Torrentio, open swarms, and direct CDNs
                </p>
              </div>

              {/* Quality Filter & Refresh */}
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-xs">
                  {(['All', '4K', '1080p', '720p'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setFilterQuality(q)}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        filterQuality === q ? 'bg-rose-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => fetchStreamSources(selectedSeason, selectedEpisode)}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="Rescrape streams"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin mx-auto" />
                <p className="text-xs text-zinc-400 font-medium">
                  Querying Torrentio & P2P swarm indexers for active seeds...
                </p>
              </div>
            ) : filteredSources.length > 0 ? (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredSources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3.5 bg-zinc-950/70 hover:bg-zinc-800/90 border border-zinc-800 hover:border-rose-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Quality Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            source.quality === '4K'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : source.quality === '1080p'
                              ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                              : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {source.quality}
                        </span>

                        {/* Codec */}
                        {source.codec && (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-700">
                            {source.codec}
                          </span>
                        )}

                        {/* Provider */}
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          {source.provider}
                        </span>
                      </div>

                      {/* Title snippet */}
                      <p className="text-xs text-zinc-400 font-mono truncate max-w-xl">
                        {source.name}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        {source.size && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-zinc-500" />
                            {source.size}
                          </span>
                        )}
                        {source.seeds !== undefined && (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <Users className="w-3 h-3 text-emerald-500" />
                            {source.seeds} seeds
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-500 capitalize">
                          • {source.type === 'torrent' ? '⚡ BitTorrent P2P' : '🌐 Direct CDN'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onPlaySource(source, media)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Stream Now
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-center space-y-2">
                <p className="text-sm text-zinc-400">
                  No streams found for this filter or title.
                </p>
                <p className="text-xs text-zinc-500">
                  You can paste any custom magnet link below to stream it instantly.
                </p>
              </div>
            )}

            {/* Custom Magnet URL input */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Stream custom Magnet URL for &quot;{media.title}&quot;:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMagnet}
                  onChange={(e) => setCustomMagnet(e.target.value)}
                  placeholder="magnet:?xt=urn:btih:..."
                  className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-mono"
                />
                <button
                  disabled={!customMagnet.trim()}
                  onClick={() => {
                    if (customMagnet.trim()) {
                      onPlayDirectMagnet(customMagnet.trim(), media.title);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Magnet className="w-4 h-4" />
                  Stream
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
