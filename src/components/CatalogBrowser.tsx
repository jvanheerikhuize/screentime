'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MediaItem } from '@/types';
import { PosterCard, PosterSkeleton } from '@/components/PosterCard';

type BrowseType = 'movie' | 'tv' | 'anime';
type BrowseSource = 'top' | 'year' | 'trending' | 'popular' | 'season';

interface CatalogBrowserProps {
  mediaType: BrowseType;
  onSelectMedia: (item: MediaItem) => void;
}

const ANIME_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Music', 'Mystery',
  'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];

const SOURCES: Record<BrowseType, { key: BrowseSource; label: string; genres: boolean }[]> = {
  movie: [
    { key: 'top', label: 'Popular', genres: true },
    { key: 'year', label: 'By year', genres: false },
  ],
  tv: [
    { key: 'top', label: 'Popular', genres: true },
    { key: 'year', label: 'By year', genres: false },
  ],
  anime: [
    { key: 'trending', label: 'Trending', genres: true },
    { key: 'season', label: 'This season', genres: false },
    { key: 'popular', label: 'All-time popular', genres: true },
    { key: 'top', label: 'Top rated', genres: true },
  ],
};

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Mystery', 'Romance',
  'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => String(CURRENT_YEAR - i));

const CINEMETA_PAGE = 50;

async function fetchPage(
  mediaType: BrowseType,
  source: BrowseSource,
  genre: string | null,
  pageIndex: number
): Promise<{ items: MediaItem[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  params.set('type', mediaType);
  params.set('catalog', source);
  params.set('skip', String(pageIndex * CINEMETA_PAGE));
  if (genre) params.set('genre', genre);
  const res = await fetch(`/api/catalog?${params.toString()}`);
  const data = await res.json();
  return { items: data.items || [], hasMore: Boolean(data.hasMore) };
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({ mediaType, onSelectMedia }) => {
  const [source, setSource] = useState<BrowseSource>(SOURCES[mediaType][0].key);
  const [genre, setGenre] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  // Bumped on every filter change so in-flight "load more" responses for the old filter are dropped.
  const filterVersion = useRef(0);

  const sources = SOURCES[mediaType];
  const genres = mediaType === 'anime' ? ANIME_GENRES : GENRES;
  const showGenres = sources.find((s) => s.key === source)?.genres ?? false;

  // First page for the current filter.
  useEffect(() => {
    let cancelled = false;
    fetchPage(mediaType, source, genre, 0)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setHasMore(result.hasMore);
        setPage(0);
      })
      .catch((e) => {
        if (!cancelled) console.error('Failed to load catalog page:', e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, source, genre]);

  const changeFilter = (nextSource: BrowseSource, nextGenre: string | null) => {
    if (nextSource === source && nextGenre === genre) return;
    filterVersion.current++;
    setSource(nextSource);
    setGenre(nextGenre);
    setItems([]);
    setHasMore(false);
    setLoading(true);
  };

  const loadMore = () => {
    const version = filterVersion.current;
    const nextPage = page + 1;
    setLoading(true);
    fetchPage(mediaType, source, genre, nextPage)
      .then((result) => {
        if (version !== filterVersion.current) return;
        setItems((prev) => {
          const seen = new Set(prev.map((i) => String(i.id)));
          return [...prev, ...result.items.filter((i) => !seen.has(String(i.id)))];
        });
        setHasMore(result.hasMore);
        setPage(nextPage);
      })
      .catch((e) => {
        if (version === filterVersion.current) setHasMore(false);
        console.error('Failed to load catalog page:', e);
      })
      .finally(() => {
        if (version === filterVersion.current) setLoading(false);
      });
  };

  const chip = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
      active ? 'bg-white text-zinc-950' : 'bg-white/[0.05] text-zinc-300 ring-1 ring-inset ring-white/[0.08] hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="space-y-6">
      {/* Popular / By year, plus the year picker */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex p-1 rounded-full bg-white/[0.05] ring-1 ring-inset ring-white/[0.08]">
          {sources.map((s) => (
            <button
              key={s.key}
              onClick={() => changeFilter(s.key, s.key === 'year' ? String(CURRENT_YEAR) : null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                source === s.key ? 'bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-900/40' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {source === 'year' && (
          <select
            value={genre ?? String(CURRENT_YEAR)}
            onChange={(e) => changeFilter('year', e.target.value)}
            aria-label="Year"
            className="bg-white/[0.05] ring-1 ring-inset ring-white/[0.08] text-sm text-white rounded-full pl-4 pr-3 py-2 outline-none focus:ring-white/25 [&>option]:bg-zinc-900"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Genre chips wrap onto extra lines instead of scrolling */}
      {showGenres && (
        <div className="flex flex-wrap gap-2">
          {[null, ...genres].map((g) => (
            <button key={g ?? 'all'} onClick={() => changeFilter(source, g)} className={chip(genre === g)}>
              {g ?? 'All'}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
        {items.map((item) => (
          <PosterCard key={item.id} item={item} onSelect={onSelectMedia} />
        ))}
        {loading && Array.from({ length: items.length ? 6 : 18 }).map((_, i) => <PosterSkeleton key={`s${i}`} />)}
      </div>

      {!loading && items.length === 0 && (
        <p className="text-sm text-zinc-500 py-16 text-center">No titles found for this filter.</p>
      )}

      {!loading && hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/10 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
};
