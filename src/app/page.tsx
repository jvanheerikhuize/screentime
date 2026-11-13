'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { MediaCarousel } from '@/components/MediaCarousel';
import { MediaDetailModal, PlaybackContext } from '@/components/MediaDetailModal';
import { VideoPlayerModal, SubtitleQuery, PlayableSource } from '@/components/VideoPlayerModal';
import { rankSources } from '@/lib/streaming/pickSource';
import { DirectStreamModal } from '@/components/DirectStreamModal';
import { SettingsModal } from '@/components/SettingsModal';
import { LiveChannelsGrid } from '@/components/LiveChannelsGrid';
import { CatalogBrowser } from '@/components/CatalogBrowser';
import { MediaItem, StreamSource, LiveChannel } from '@/types';
import { FEATURED_HERO, SAMPLE_MEDIA_CATALOG } from '@/lib/metadata/tmdb';
import { OPEN_SOURCE_STREAMS } from '@/lib/streaming/streamSources';
import { Clapperboard, Tv } from 'lucide-react';

interface CatalogRow {
  key: string;
  title: string;
  subtitle: string;
  items: MediaItem[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'movies' | 'tv' | 'live' | 'magnet' | 'settings'>('home');
  const [featured, setFeatured] = useState<MediaItem | null>(FEATURED_HERO);
  const [trending, setTrending] = useState<MediaItem[]>(SAMPLE_MEDIA_CATALOG);
  const [movies, setMovies] = useState<MediaItem[]>(SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'movie'));
  const [series, setSeries] = useState<MediaItem[]>(SAMPLE_MEDIA_CATALOG.filter((m) => m.mediaType === 'tv'));
  const [rows, setRows] = useState<CatalogRow[] | null>(null);

  // Modals state
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isMagnetModalOpen, setIsMagnetModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Active Player state
  const [activePlayer, setActivePlayer] = useState<{
    title: string;
    sources: PlayableSource[];
    isLive?: boolean;
    subtitleQuery?: SubtitleQuery;
  } | null>(null);

  useEffect(() => {
    fetch('/api/media/trending')
      .then((res) => res.json())
      .then((data) => {
        if (data.featured) setFeatured(data.featured);
        if (data.trending) setTrending(data.trending);
        if (data.movies) setMovies(data.movies);
        if (data.series) setSeries(data.series);
        if (Array.isArray(data.rows) && data.rows.length > 0) setRows(data.rows);
      })
      .catch((err) => console.error('Failed to load catalog:', err));
  }, []);

  const toPlayable = (sources: StreamSource[]): PlayableSource[] =>
    sources
      .filter((s) => s.magnet || s.url)
      .map((s) => (s.magnet ? { magnet: s.magnet, fileIdx: s.fileIdx, label: s.name } : { url: s.url, label: s.name }));

  const handlePlayMedia = (media: MediaItem) => {
    const sources = OPEN_SOURCE_STREAMS[String(media.id)] || OPEN_SOURCE_STREAMS[String(media.tmdbId)] || [];
    if (sources.length > 0) {
      handlePlaySource(rankSources(sources), media, {});
    } else {
      setSelectedMedia(media);
    }
  };

  const handlePlaySource = (sources: StreamSource[], media: MediaItem, context: PlaybackContext) => {
    const playable = toPlayable(sources);
    if (!playable.length) return;
    setSelectedMedia(null);
    const episodeTag = context.season ? ` · S${context.season}E${context.episode}` : '';
    const subtitleQuery: SubtitleQuery | undefined = media.imdbId
      ? { imdbId: media.imdbId, mediaType: media.mediaType, season: context.season, episode: context.episode }
      : undefined;
    setActivePlayer({ title: `${media.title}${episodeTag}`, sources: playable, subtitleQuery });
  };

  const handlePlayDirectMagnet = (magnet: string, title: string) => {
    setSelectedMedia(null);
    setIsMagnetModalOpen(false);
    setActivePlayer({ title: title || 'Custom Torrent Stream', sources: [{ magnet }] });
  };

  const handlePlayDirectUrl = (url: string, title: string) => {
    setIsMagnetModalOpen(false);
    setActivePlayer({ title: title || 'Direct Stream', sources: [{ url }] });
  };

  const handlePlayLiveChannel = (channel: LiveChannel) => {
    setActivePlayer({ title: `${channel.name} (Live)`, sources: [{ url: channel.streamUrl }], isLive: channel.isLive });
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
              {(rows ?? [
                { key: 'trending', title: 'Trending & Popular Streams', subtitle: 'High-speed seed swarms and open streams', items: trending },
                { key: 'movies', title: 'Movies & Feature Films', subtitle: 'Blockbuster cinema, 4K sci-fi & Blender Foundation originals', items: movies },
                { key: 'series', title: 'TV Series & Episodic Shows', subtitle: 'Multi-episode releases and seasonal collections', items: series },
              ]).map((row) => (
                <MediaCarousel
                  key={row.key}
                  title={row.title}
                  subtitle={row.subtitle}
                  items={row.items}
                  onSelectMedia={(item) => setSelectedMedia(item)}
                  onPlayMedia={handlePlayMedia}
                />
              ))}
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

            <CatalogBrowser mediaType="movie" onSelectMedia={(item) => setSelectedMedia(item)} />
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

            <CatalogBrowser mediaType="tv" onSelectMedia={(item) => setSelectedMedia(item)} />
          </div>
        )}

        {activeTab === 'live' && (
          <LiveChannelsGrid onPlayChannel={handlePlayLiveChannel} />
        )}
      </main>

      {/* Media Detail Modal */}
      {selectedMedia && (
        <MediaDetailModal
          key={`${selectedMedia.mediaType}-${selectedMedia.id}`}
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPlaySource={handlePlaySource}
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
      {activePlayer && (
        <VideoPlayerModal
          title={activePlayer.title}
          sources={activePlayer.sources}
          isLive={activePlayer.isLive}
          subtitleQuery={activePlayer.subtitleQuery}
          onClose={() => setActivePlayer(null)}
        />
      )}
    </div>
  );
}
