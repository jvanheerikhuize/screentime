'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Star, Film } from 'lucide-react';
import { MediaItem } from '@/types';

interface MediaCarouselProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  onPlayMedia: (item: MediaItem) => void;
}

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  title,
  subtitle,
  items,
  onSelectMedia,
  onPlayMedia,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -500 : 500;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3 mb-10 group/carousel">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Scroll Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover/carousel:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 hover:text-white transition-all shadow-md"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 hover:text-white transition-all shadow-md"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-none w-[180px] sm:w-[210px] snap-start group relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-600/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            onClick={() => onSelectMedia(item)}
          >
            {/* Poster Image */}
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
              {item.posterPath ? (
                <img
                  src={item.posterPath}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <Film className="w-8 h-8" />
                  <span className="text-xs">No Poster</span>
                </div>
              )}

              {/* Hover Overlay with Quick Play Button */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayMedia(item);
                  }}
                  className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 hover:scale-110 active:scale-95 transition-transform"
                >
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </button>
              </div>

              {/* Quality / Media Badge */}
              <div className="absolute top-2 left-2 flex gap-1">
                <span className="px-1.5 py-0.5 rounded bg-zinc-950/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-rose-400 border border-rose-500/20">
                  {item.mediaType === 'tv' ? 'Series' : 'Movie'}
                </span>
              </div>

              {/* Rating */}
              {item.voteAverage > 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-950/80 backdrop-blur-md text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {item.voteAverage}
                </div>
              )}
            </div>

            {/* Title & Metadata */}
            <div className="p-3">
              <h3 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-rose-400 transition-colors">
                {item.title}
              </h3>
              <div className="flex items-center justify-between text-xs text-zinc-400 mt-1">
                <span>
                  {item.releaseDate ? item.releaseDate.split('-')[0] : item.firstAirDate ? item.firstAirDate.split('-')[0] : '2024'}
                </span>
                {item.genres && item.genres.length > 0 && (
                  <span className="truncate max-w-[100px] text-zinc-500 text-right">
                    {item.genres[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
