'use client';

import React, { useState } from 'react';
import { Play, Info, Star } from 'lucide-react';
import { MediaItem } from '@/types';

interface HeroBannerProps {
  media: MediaItem | null;
  onPlay: (media: MediaItem) => void;
  onMoreInfo: (media: MediaItem) => void;
}

const HERO_HEIGHT = 'h-[72vh] min-h-[520px] max-h-[820px]';

/** Full-bleed featured title. Renders a skeleton while `media` is null. */
export const HeroBanner: React.FC<HeroBannerProps> = ({ media, onPlay, onMoreInfo }) => {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  if (!media) {
    return (
      <div className={`relative w-full ${HERO_HEIGHT}`} aria-hidden="true">
        <div className="absolute inset-0 skeleton opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 gap-4">
          <div className="h-4 w-40 rounded skeleton" />
          <div className="h-12 w-[28rem] max-w-full rounded-lg skeleton" />
          <div className="h-4 w-[34rem] max-w-full rounded skeleton" />
          <div className="h-4 w-[24rem] max-w-full rounded skeleton" />
          <div className="flex gap-3 pt-3">
            <div className="h-12 w-32 rounded-full skeleton" />
            <div className="h-12 w-36 rounded-full skeleton" />
          </div>
        </div>
      </div>
    );
  }

  const year = (media.releaseDate || media.firstAirDate)?.split('-')[0];
  const imageReady = !media.backdropPath || loadedSrc === media.backdropPath;
  const meta = [
    media.mediaType === 'tv' ? 'Series' : 'Film',
    year,
    media.duration ? `${Math.floor(media.duration / 60) ? `${Math.floor(media.duration / 60)}h ` : ''}${media.duration % 60}m` : null,
    ...(media.genres || []).slice(0, 3),
  ].filter(Boolean);

  return (
    <div className={`relative w-full ${HERO_HEIGHT} overflow-hidden`}>
      {media.backdropPath && (
        <img
          src={media.backdropPath}
          alt=""
          fetchPriority="high"
          decoding="async"
          onLoad={() => setLoadedSrc(media.backdropPath!)}
          className={`absolute inset-0 w-full h-full object-cover object-[center_20%] transition-all duration-[1200ms] ease-out ${
            imageReady ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        />
      )}
      {/* Cinematic shading: bottom fade into the page, left fade behind the text */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[color-mix(in_srgb,var(--background)_35%,transparent)] to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--background)_92%,transparent)] via-[color-mix(in_srgb,var(--background)_45%,transparent)] to-transparent md:via-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-14 sm:pb-16">
        <div className="max-w-xl space-y-4 animate-[hero-in_700ms_ease-out_both]">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm font-medium text-zinc-300">
            {media.voteAverage > 0 && (
              <span className="inline-flex items-center gap-1 text-white">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {media.voteAverage.toFixed(1)}
              </span>
            )}
            {meta.map((m, i) => (
              <React.Fragment key={`${m}-${i}`}>
                {(i > 0 || media.voteAverage > 0) && <span className="text-zinc-600">•</span>}
                <span>{m}</span>
              </React.Fragment>
            ))}
          </p>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[0.95] text-balance drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            {media.title}
          </h1>

          {media.overview && (
            <p className="text-zinc-300/90 text-sm sm:text-base leading-relaxed line-clamp-3 max-w-lg">{media.overview}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onPlay(media)}
              className="inline-flex items-center gap-2 pl-5 pr-6 py-3 rounded-full bg-white text-black font-semibold text-sm sm:text-base shadow-xl shadow-black/30 hover:bg-zinc-200 active:scale-[0.97] transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              Play
            </button>
            <button
              onClick={() => onMoreInfo(media)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base backdrop-blur-xl ring-1 ring-white/15 active:scale-[0.97] transition-all"
            >
              <Info className="w-5 h-5" />
              More info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
