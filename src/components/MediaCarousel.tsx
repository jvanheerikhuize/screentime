'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '@/types';
import { PosterCard, PosterSkeleton } from '@/components/PosterCard';

interface MediaCarouselProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  onPlayMedia?: (item: MediaItem) => void;
  onRemoveItem?: (item: MediaItem) => void;
  progressByMediaId?: Record<string, { ratio: number; label: string }>;
}

const CARD = 'flex-none w-[140px] sm:w-[168px] lg:w-[184px] snap-start';

export const MediaCarousel: React.FC<MediaCarouselProps> = ({
  title,
  subtitle,
  items,
  onSelectMedia,
  onPlayMedia,
  onRemoveItem,
  progressByMediaId,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="group/row carousel-row-cv">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-semibold text-white tracking-tight truncate">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/15 text-zinc-300 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll(1)} aria-label="Scroll right" className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/15 text-zinc-300 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar snap-x pt-1 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scroll-px-4 sm:scroll-px-6 lg:scroll-px-8 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)]">
        {items.map((item) => {
          const prog = progressByMediaId?.[String(item.id)];
          return (
            <PosterCard
              key={item.id}
              item={item}
              onSelect={onSelectMedia}
              onPlay={onPlayMedia}
              onRemove={onRemoveItem}
              progressRatio={prog?.ratio}
              progressLabel={prog?.label}
              className={CARD}
            />
          );
        })}
      </div>
    </section>
  );
};

export const CarouselSkeleton: React.FC = () => (
  <section aria-hidden="true">
    <div className="h-5 w-48 rounded skeleton mb-2" />
    <div className="h-3 w-72 max-w-full rounded skeleton mb-4" />
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <PosterSkeleton key={i} className={CARD} />
      ))}
    </div>
  </section>
);
