'use client';

import React from 'react';
import { Play, Info, Star, Clock, Sparkles } from 'lucide-react';
import { MediaItem } from '@/types';

interface HeroBannerProps {
  media: MediaItem | null;
  onPlay: (media: MediaItem) => void;
  onMoreInfo: (media: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ media, onPlay, onMoreInfo }) => {
  if (!media) return null;

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] max-h-[750px] overflow-hidden rounded-3xl mb-12 shadow-2xl border border-zinc-800/60 group">
      {/* Background Image with Cinematic Gradient */}
      <div className="absolute inset-0">
        {media.backdropPath && (
          <img
            src={media.backdropPath}
            alt={media.title}
            className="w-full h-full object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent w-full md:w-3/4" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col justify-end pb-12 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Badge */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-lg shadow-rose-600/20">
              <Sparkles className="w-3 h-3" />
              Featured Stream
            </span>
            {media.voteAverage > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/60 text-amber-400 text-xs font-semibold backdrop-blur-md">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {media.voteAverage} Rating
              </span>
            )}
            {media.duration && (
              <span className="inline-flex items-center gap-1 text-zinc-300 text-xs font-medium">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {media.duration} mins
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
            {media.title}
          </h1>

          {/* Genres */}
          {media.genres && media.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {media.genres.map((g) => (
                <span
                  key={g}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/40 text-zinc-300 backdrop-blur-sm"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          <p className="text-zinc-300 text-sm sm:text-base line-clamp-3 leading-relaxed drop-shadow">
            {media.overview}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onPlay(media)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-white" />
              Stream Now
            </button>
            <button
              onClick={() => onMoreInfo(media)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 font-semibold text-sm sm:text-base backdrop-blur-md hover:scale-105 active:scale-95 transition-all"
            >
              <Info className="w-5 h-5 text-zinc-400" />
              Sources & Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
