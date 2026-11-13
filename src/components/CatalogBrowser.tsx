'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Film, Loader2, Star } from 'lucide-react';
import { MediaItem } from '@/types';

type BrowseSource = 'top' | 'year' | 'archive';

interface CatalogBrowserProps {
  mediaType: 'movie' | 'tv';
  onSelectMedia: (item: MediaItem) => void;
}

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Mystery', 'Romance',
  'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => String(CURRENT_YEAR - i));

const CINEMETA_PAGE = 50;

async function fetchPage(
  mediaType: 'movie' | 'tv',
  source: BrowseSource,
  genre: string | null,
  pageIndex: number
): Promise<{ items: MediaItem[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (source === 'archive') {
    params.set('source', 'archive');
    params.set('page', String(pageIndex + 1));
  } else {
    params.set('type', mediaType);
    params.set('catalog', source);
    params.set('skip', String(pageIndex * CINEMETA_PAGE));
    if (genre) params.set('genre', genre);
  }
  const res = await fetch(`/api/catalog?${params.toString()}`);
  const data = await res.json();
  return { items: data.items || [], hasMore: Boolean(data.hasMore) };
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({ mediaType, onSelectMedia }) => {
  const [source, setSource] = useState<BrowseSource>('top');
  const [genre, setGenre] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  // Bumped on every filter change so in-flight "load more" responses for the old filter are dropped.
  const filterVersion = useRef(0);

  const sources: { key: BrowseSource; label: string }[] = [
    { key: 'top', label: 'Popular' },
    { key: 'year', label: 'By Year' },
    ...(mediaType === 'movie' ? [{ key: 'archive' as const, label: 'Free & Public Domain' }] : []),
  ];

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

  return (
    <div className="space-y-5">
      {/* Source tabs */}
      <div className="flex flex-wrap gap-2">
        {sources.map((s) => (
          <button
            key={s.key}
            onClick={() => changeFilter(s.key, s.key === 'year' ? String(CURRENT_YEAR) : null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              source === s.key
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Genre chips for Popular, year chips for By Year (Cinemeta catalogs only) */}
      {source !== 'archive' && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(source === 'year' ? YEARS : [null, ...GENRES]).map((g) => (
            <button
              key={g ?? 'all'}
              onClick={() => changeFilter(source, g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                genre === g
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {g ?? 'All genres'}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectMedia(item)}
            className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-600/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
          >
            <div className="relative aspect-[2/3] w-full bg-zinc-950">
              {item.posterPath ? (
                <img src={item.posterPath} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Film className="w-8 h-8" />
                </div>
              )}
              {item.voteAverage > 0 && (
                <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-950/85 text-amber-400 text-[11px] font-semibold">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {item.voteAverage}
                </span>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm text-zinc-100 truncate">{item.title}</h3>
              <p className="text-xs text-zinc-400 mt-1">
                {(item.releaseDate || item.firstAirDate)?.split('-')[0] || '—'}
                {item.genres?.[0] ? ` · ${item.genres[0]}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <p className="text-sm text-zinc-500 py-10 text-center">No titles found for this filter.</p>
      )}

      <div className="flex justify-center pt-2">
        {loading ? (
          <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
        ) : (
          hasMore && (
            <button
              onClick={loadMore}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Load more
            </button>
          )
        )}
      </div>
    </div>
  );
};
