'use client';

import React, { useState } from 'react';
import { Film, Play, Star } from 'lucide-react';
import { MediaItem } from '@/types';

interface PosterCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onPlay?: (item: MediaItem) => void;
  className?: string;
}

const yearOf = (item: MediaItem) => (item.releaseDate || item.firstAirDate)?.split('-')[0];

/** Poster with title underneath; used by carousels and browse grids. */
export const PosterCard: React.FC<PosterCardProps> = ({ item, onSelect, onPlay, className = '' }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const year = yearOf(item);
  const showImage = Boolean(item.posterPath) && !failed;
  return (
    <div onClick={() => onSelect(item)} className={`group cursor-pointer select-none ${className}`}>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.06] shadow-lg shadow-black/40 transition-all duration-300 group-hover:ring-white/25 group-hover:shadow-2xl group-hover:shadow-rose-950/40 group-hover:-translate-y-1">
        {showImage && !loaded && <div className="absolute inset-0 skeleton" />}
        {showImage ? (
          <img
            src={item.posterPath!}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.04] ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <Film className="w-7 h-7 text-zinc-600" />
            <span className="text-xs font-medium text-zinc-400 line-clamp-3">{item.title}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {onPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            aria-label={`Play ${item.title}`}
            className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        )}
        {item.voteAverage > 0 && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {item.voteAverage.toFixed(1)}
          </span>
        )}
      </div>
      <div className="pt-2.5 px-0.5">
        <h3 className="text-sm font-medium text-zinc-100 truncate group-hover:text-white">{item.title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">
          {[year, item.genres?.[0]].filter(Boolean).join(' · ') || (item.mediaType === 'tv' ? 'Series' : 'Movie')}
        </p>
      </div>
    </div>
  );
};

export const PosterSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={className} aria-hidden="true">
    <div className="aspect-[2/3] w-full rounded-xl skeleton" />
    <div className="mt-3 h-3 w-3/4 rounded skeleton" />
    <div className="mt-2 h-2.5 w-1/2 rounded skeleton" />
  </div>
);
