'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, Settings2, Film, Tv, Loader2, X } from 'lucide-react';
import { LiveChannel, MediaItem } from '@/types';
import { Logo } from '@/components/Logo';

export type AppTab = 'home' | 'movies' | 'tv' | 'anime' | 'live';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onSelectMedia: (media: MediaItem) => void;
  onSelectLiveChannel?: (channel: LiveChannel) => void;
  onOpenSettingsModal: () => void;
}

const TABS: { key: AppTab; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'movies', label: 'Movies' },
  { key: 'tv', label: 'Series' },
  { key: 'anime', label: 'Anime' },
  { key: 'live', label: 'Live TV' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectMedia,
  onSelectLiveChannel,
  onOpenSettingsModal,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [failedPosters, setFailedPosters] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Press '/' anywhere (outside inputs) to focus search.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close the results when clicking elsewhere.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Debounced search; stale responses are ignored.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const id = ++requestId.current;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          if (id === requestId.current) {
            setResults(data.results || []);
            setChannels(data.channels || []);
          }
        })
        .catch(() => {
          if (id === requestId.current) {
            setResults([]);
            setChannels([]);
          }
        })
        .finally(() => {
          if (id === requestId.current) setSearching(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const clearSearch = () => {
    requestId.current++;
    setQuery('');
    setResults([]);
    setChannels([]);
    setSearching(false);
    setOpen(false);
  };

  const solid = scrolled || activeTab !== 'home';
  const hasResults = results.length > 0 || channels.length > 0;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        solid ? 'bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-xl border-b border-white/[0.06]' : 'bg-gradient-to-b from-black/70 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 md:pt-0 md:h-16 flex flex-wrap md:flex-nowrap items-center gap-x-8">
        <Logo onClick={() => setActiveTab('home')} />

        <nav className="order-3 md:order-none w-full md:w-auto -mx-2.5 md:mx-0 mt-1 md:mt-0 flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              aria-current={activeTab === t.key ? 'page' : undefined}
              className={`relative px-2.5 sm:px-3 py-2 text-[13px] sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.key ? 'text-white' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {t.label}
              {t.key === 'live' && <span className="absolute top-1.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500" />}
              <span
                className={`absolute left-2.5 right-2.5 sm:left-3 sm:right-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-opacity ${
                  activeTab === t.key ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  setOpen(Boolean(val.trim()));
                  if (!val.trim()) {
                    requestId.current++;
                    setResults([]);
                    setChannels([]);
                    setSearching(false);
                  }
                }}
                onFocus={() => query.trim() && setOpen(true)}
                onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
                placeholder="Search"
                aria-label="Search titles and live channels (Press / to focus)"
                className="w-28 sm:w-44 focus:w-40 sm:focus:w-72 transition-[width] duration-300 bg-white/[0.07] hover:bg-white/10 focus:bg-zinc-900 ring-1 ring-white/10 focus:ring-white/25 rounded-full pl-9 pr-8 py-2 text-sm text-white placeholder-zinc-400 outline-none"
              />
              {query ? (
                <button onClick={clearSearch} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/[0.06] ring-1 ring-inset ring-white/10 rounded pointer-events-none">
                  /
                </kbd>
              )}
            </div>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl bg-zinc-900/95 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl shadow-black/60 overflow-hidden">
                <div className="max-h-[65vh] overflow-y-auto py-1.5">
                  {searching && !hasResults ? (
                    <div className="p-5 flex items-center justify-center gap-2 text-xs text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      Searching…
                    </div>
                  ) : hasResults ? (
                    <>
                      {results.map((item) => {
                        const badge = item.anime ? 'Anime' : item.mediaType === 'tv' ? 'Series' : 'Movie';
                        const badgeColor = item.anime
                          ? 'bg-purple-500/15 text-purple-300'
                          : item.mediaType === 'tv'
                            ? 'bg-sky-500/15 text-sky-300'
                            : 'bg-amber-500/15 text-amber-300';
                        return (
                          <button
                            key={`${item.mediaType}-${item.id}`}
                            onClick={() => {
                              onSelectMedia(item);
                              clearSearch();
                            }}
                            className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-white/[0.06] transition-colors"
                          >
                            {item.posterPath && !failedPosters[item.posterPath] ? (
                              <img
                                src={item.posterPath}
                                alt=""
                                onError={() => setFailedPosters((prev) => ({ ...prev, [item.posterPath!]: true }))}
                                className="w-9 h-[54px] object-cover rounded-md bg-zinc-800 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-[54px] rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                <Film className="w-4 h-4 text-zinc-600" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">{item.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>{badge}</span>
                                {(item.releaseDate || item.firstAirDate) && (
                                  <span>{(item.releaseDate || item.firstAirDate)!.split('-')[0]}</span>
                                )}
                              </div>
                            </div>
                            {item.voteAverage > 0 && <span className="text-xs font-medium text-zinc-400">★ {item.voteAverage.toFixed(1)}</span>}
                          </button>
                        );
                      })}

                      {channels.length > 0 && (
                        <>
                          {results.length > 0 && <div className="my-1 border-t border-white/[0.06]" />}
                          {channels.map((ch) => (
                            <button
                              key={`live-${ch.id}`}
                              onClick={() => {
                                if (onSelectLiveChannel) onSelectLiveChannel(ch);
                                else setActiveTab('live');
                                clearSearch();
                              }}
                              className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-white/[0.06] transition-colors"
                            >
                              <div className="w-9 h-9 rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
                                {ch.logo && !failedPosters[ch.logo] ? (
                                  <img
                                    src={ch.logo}
                                    alt=""
                                    onError={() => setFailedPosters((prev) => ({ ...prev, [ch.logo]: true }))}
                                    className="max-w-full max-h-full object-contain"
                                  />
                                ) : (
                                  <Tv className="w-4 h-4 text-rose-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">{ch.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300">
                                    Live TV
                                  </span>
                                  <span className="truncate">{ch.country}</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <p className="p-5 text-center text-xs text-zinc-500">No results for “{query}”</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenSettingsModal}
            title="Settings"
            aria-label="Settings"
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
};
