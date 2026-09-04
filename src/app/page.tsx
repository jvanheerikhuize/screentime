'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { MediaCarousel } from '@/components/MediaCarousel';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { DirectStreamModal } from '@/components/DirectStreamModal';
import { SettingsModal } from '@/components/SettingsModal';
import { LiveChannelsGrid } from '@/components/LiveChannelsGrid';
import { MediaItem, StreamSource, LiveChannel } from '@/types';
import { FEATURED_HERO, SAMPLE_MEDIA_CATALOG } from '@/lib/metadata/tmdb';
import { OPEN_SOURCE_STREAMS } from '@/lib/streaming/streamSources';
import { Sparkles, Magnet, Clapperboard, Tv, Film } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'movies' | 'tv' | 'live' | 'magnet' | 'settings'>('home');
  const [featured, setFeatured] = useState<MediaItem | null>(FEATURED_HERO);
  const [trending, setTrending] = useState<MediaItem[]>(SAMPLE_MEDIA_CATALOG);
  const [movies, setMovies] = useState<MediaItem[]>(SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'movie'));
  const [series, setSeries] = useState<MediaItem[]>(SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'tv'));

  // Modals state
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isMagnetModalOpen, setIsMagnetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Active Player state
  const [activePlayer, setActivePlayer] = useState<{
    isOpen: boolean;
    title: string;
    streamUrl: string;
    magnet?: string;
    isTorrent: boolean;
    isLive?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch('/api/media/trending')
      .then((res) => res.json())
      .then((data) => {
        if (data.featured) setFeatured(data.featured);
        if (data.trending) setTrending(data.trending);
        if (data.movies) setMovies(data.movies);
        if (data.series) setSeries(data.series);
      })
      .catch((err) => console.error('Failed to load catalog:', err));
  }, []);

  const handlePlayMedia = (media: MediaItem) => {
    const sources = OPEN_SOURCE_STREAMS[String(media.id)] || OPEN_SOURCE_STREAMS[String(media.tmdbId)] || [];
    if (sources.length > 0) {
      handlePlaySource(sources[0], media);
    } else {
      setSelectedMedia(media);
    }
  };

  const handlePlaySource = (source: StreamSource, media: MediaItem) => {
    setSelectedMedia(null);
    if (source.type === 'torrent' && source.magnet) {
      setActivePlayer({
        isOpen: true,
        title: `${media.title} (${source.quality})`,
        streamUrl: `/api/stream?magnet=${encodeURIComponent(source.magnet)}`,
        magnet: source.magnet,
        isTorrent: true,
      });
    } else if (source.url) {
      setActivePlayer({
        isOpen: true,
        title: `${media.title} (${source.quality})`,
        streamUrl: source.url,
        isTorrent: false,
      });
    }
  };

  const handlePlayDirectMagnet = (magnet: string, title: string) => {
    setSelectedMedia(null);
    setIsMagnetModalOpen(false);
    setActivePlayer({
      isOpen: true,
      title: title || 'Custom Torrent Stream',
      streamUrl: `/api/stream?magnet=${encodeURIComponent(magnet)}`,
      magnet,
      isTorrent: true,
    });
  };

  const handlePlayDirectUrl = (url: string, title: string) => {
    setIsMagnetModalOpen(false);
    setActivePlayer({
      isOpen: true,
      title: title || 'Direct Stream',
      streamUrl: url,
      isTorrent: false,
    });
  };

  const handlePlayLiveChannel = (channel: LiveChannel) => {
    setActivePlayer({
      isOpen: true,
      title: `${channel.name} (Live)`,
      streamUrl: channel.streamUrl,
      isTorrent: false,
      isLive: channel.isLive,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectMedia={(item) => setSelectedMedia(item)}
        onOpenMagnetModal={() => setIsMagnetModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        {/* Dynamic Views based on active tab */}
        {activeTab === 'home' && (
          <>
            {/* Featured Hero Banner */}
            <HeroBanner
              media={featured}
              onPlay={handlePlayMedia}
              onMoreInfo={(media) => setSelectedMedia(media)}
            />

            {/* Carousels */}
            <div className="space-y-6">
              <MediaCarousel
                title="Trending & Popular Streams"
                subtitle="High-speed seed swarms and open streams"
                items={trending}
                onSelectMedia={(item) => setSelectedMedia(item)}
                onPlayMedia={handlePlayMedia}
              />

              <MediaCarousel
                title="Movies & Feature Films"
                subtitle="Blockbuster cinema, 4K sci-fi & Blender Foundation originals"
                items={movies}
                onSelectMedia={(item) => setSelectedMedia(item)}
                onPlayMedia={handlePlayMedia}
              />

              <MediaCarousel
                title="TV Series & Episodic Shows"
                subtitle="Multi-episode releases and seasonal collections"
                items={series}
                onSelectMedia={(item) => setSelectedMedia(item)}
                onPlayMedia={handlePlayMedia}
              />
            </div>
          </>
        )}

        {activeTab === 'movies' && (
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center">
                <Clapperboard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Feature Films & Movies</h1>
                <p className="text-xs text-zinc-400">Browse and stream full-length movies with live swarm acceleration</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-4">
              {movies.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-600/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-[2/3] w-full bg-zinc-950">
                    {item.posterPath ? (
                      <img src={item.posterPath} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Film className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-zinc-100 truncate">{item.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{item.releaseDate?.split('-')[0] || '2024'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tv' && (
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">TV Series & Shows</h1>
                <p className="text-xs text-zinc-400">Episodic series with season and episode selection</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-4">
              {series.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-600/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-[2/3] w-full bg-zinc-950">
                    {item.posterPath ? (
                      <img src={item.posterPath} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Film className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-zinc-100 truncate">{item.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">{item.firstAirDate?.split('-')[0] || '2024'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <LiveChannelsGrid onPlayChannel={handlePlayLiveChannel} />
        )}
      </main>

      {/* Media Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPlaySource={handlePlaySource}
          onPlayDirectMagnet={handlePlayDirectMagnet}
        />
      )}

      {/* Direct Magnet Stream Modal */}
      {isMagnetModalOpen && (
        <DirectStreamModal
          onClose={() => setIsMagnetModalOpen(false)}
          onPlayMagnet={handlePlayDirectMagnet}
          onPlayDirectUrl={handlePlayDirectUrl}
        />
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      )}

      {/* Fullscreen Video Player Modal */}
      {activePlayer && activePlayer.isOpen && (
        <VideoPlayerModal
          title={activePlayer.title}
          streamUrl={activePlayer.streamUrl}
          magnet={activePlayer.magnet}
          isTorrent={activePlayer.isTorrent}
          isLive={activePlayer.isLive}
          onClose={() => setActivePlayer(null)}
        />
      )}
    </div>
  );
}
