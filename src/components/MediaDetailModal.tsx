'use client';

import React, { useState, useEffect } from 'react';
import { X, Play, Star, Calendar, Magnet, DownloadCloud, Sparkles, ExternalLink } from 'lucide-react';
import { MediaItem, StreamSource } from '@/types';

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

  useEffect(() => {
    if (!media) return;
    setLoading(true);
    fetch(`/api/media/${media.id}?type=${media.mediaType}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.streams) {
          setSources(data.streams);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [media]);

  if (!media) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-all shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header / Backdrop */}
        <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-zinc-950">
          {media.backdropPath ? (
            <img
              src={media.backdropPath}
              alt={media.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />

          {/* Floating info over backdrop */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end gap-6">
            {media.posterPath && (
              <img
                src={media.posterPath}
                alt={media.title}
                className="w-28 sm:w-36 rounded-2xl shadow-2xl border-2 border-zinc-700/50 hidden sm:block aspect-[2/3] object-cover flex-shrink-0"
              />
            )}
            <div className="space-y-2">
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
                    {media.releaseDate}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {media.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Overview Synopsis */}
          <div className="space-y-2">
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

          {/* Season Selector for TV Series */}
          {media.mediaType === 'tv' && media.seasons && media.seasons.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Episodes</h3>
              <div className="flex gap-2 pb-2 overflow-x-auto">
                {media.seasons.map((season) => (
                  <button
                    key={season.seasonNumber}
                    onClick={() => setSelectedSeason(season.seasonNumber)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {media.seasons
                  .find((s) => s.seasonNumber === selectedSeason)
                  ?.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-3 bg-zinc-800/60 hover:bg-zinc-800 rounded-xl border border-zinc-700/40 flex items-center justify-between cursor-pointer transition-colors"
                      onClick={() =>
                        onPlayDirectMagnet(
                          'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=' +
                            encodeURIComponent(`${media.title} S${ep.seasonNumber}E${ep.episodeNumber}`),
                          `${media.title} - S${ep.seasonNumber}E${ep.episodeNumber}: ${ep.name}`
                        )
                      }
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-rose-400">Episode {ep.episodeNumber}</p>
                        <p className="text-sm font-medium text-white truncate">{ep.name}</p>
                      </div>
                      <Play className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Streaming & Torrent Sources */}
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Magnet className="w-4 h-4 text-rose-500" />
                Available Stream Sources & Torrents
              </h3>
              <span className="text-xs text-zinc-500">Live P2P & CDN Streams</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-zinc-400 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-rose-500" />
                Querying stream swarm...
              </div>
            ) : sources.length > 0 ? (
              <div className="space-y-2.5">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="p-4 bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-rose-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold">
                          {source.quality}
                        </span>
                        <span className="text-sm font-semibold text-white truncate">{source.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>Provider: {source.provider}</span>
                        {source.size && <span>• Size: {source.size}</span>}
                        {source.seeds !== undefined && (
                          <span className="text-emerald-400 font-medium">
                            • {source.seeds} Seeds / {source.peers} Peers
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onPlaySource(source, media)}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Stream Stream
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-zinc-800/30 border border-zinc-800 rounded-2xl text-center space-y-2">
                <p className="text-sm text-zinc-400">
                  No pre-configured stream index for this title yet.
                </p>
                <p className="text-xs text-zinc-500">
                  You can paste any torrent magnet link below to stream it immediately!
                </p>
              </div>
            )}

            {/* Custom Magnet input */}
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
                  className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-xl px-4 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
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
