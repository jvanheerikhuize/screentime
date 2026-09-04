'use client';

import React, { useState } from 'react';
import { Film, Search, SlidersHorizontal, Magnet, Sparkles, Tv, Clapperboard } from 'lucide-react';
import { MediaItem } from '@/types';

interface NavbarProps {
  activeTab: 'home' | 'movies' | 'tv' | 'magnet' | 'settings';
  setActiveTab: (tab: 'home' | 'movies' | 'tv' | 'magnet' | 'settings') => void;
  onSelectMedia: (media: MediaItem) => void;
  onOpenMagnetModal: () => void;
  onOpenSettingsModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectMedia,
  onOpenMagnetModal,
  onOpenSettingsModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Screentime
              </span>
              <span className="text-[10px] uppercase font-semibold text-rose-500 tracking-wider">
                Open Stream Engine
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'home'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab('movies')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'movies'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <Clapperboard className="w-4 h-4" />
              Movies
            </button>
            <button
              onClick={() => setActiveTab('tv')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'tv'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <Tv className="w-4 h-4" />
              Series
            </button>
          </nav>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
          {/* Search Input */}
          <div className="relative w-full max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setShowDropdown(true)}
                placeholder="Search movies, series, anime..."
                className="w-full bg-zinc-900/90 border border-zinc-700/60 focus:border-rose-500 rounded-full pl-9 pr-4 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
              />
            </div>

            {/* Live Search Dropdown */}
            {showDropdown && (
              <div className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-rose-500" />
                    Searching catalogs...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectMedia(item);
                        setShowDropdown(false);
                        setSearchQuery('');
                      }}
                      className="p-2.5 hover:bg-zinc-800/80 cursor-pointer flex items-center gap-3 transition-colors border-b border-zinc-800/40 last:border-b-0"
                    >
                      {item.posterPath ? (
                        <img
                          src={item.posterPath}
                          alt={item.title}
                          className="w-9 h-13 object-cover rounded shadow-sm bg-zinc-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-13 bg-zinc-800 rounded flex items-center justify-center flex-shrink-0">
                          <Film className="w-4 h-4 text-zinc-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                        <p className="text-xs text-zinc-400 capitalize">
                          {item.mediaType} {item.releaseDate ? `• ${item.releaseDate.split('-')[0]}` : ''}
                        </p>
                      </div>
                      {item.voteAverage > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-amber-500/20">
                          ★ {item.voteAverage}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-zinc-400">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direct Magnet Stream Button */}
          <button
            onClick={onOpenMagnetModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-600 text-sm font-medium transition-all shadow-sm group"
            title="Stream Magnet Link / Torrent"
          >
            <Magnet className="w-4 h-4 text-rose-500 group-hover:text-white group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Stream Magnet</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettingsModal}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            title="Settings & Integrations"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
