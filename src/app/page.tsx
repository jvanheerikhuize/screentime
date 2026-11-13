'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, AppTab } from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { MediaCarousel, CarouselSkeleton } from '@/components/MediaCarousel';
import { MediaDetailModal, PlaybackContext } from '@/components/MediaDetailModal';
import { VideoPlayerModal, SubtitleQuery, PlayableSource } from '@/components/VideoPlayerModal';
import { rankSources } from '@/lib/streaming/pickSource';
import { SettingsModal } from '@/components/SettingsModal';
import { LiveChannelsGrid } from '@/components/LiveChannelsGrid';
import { CatalogBrowser } from '@/components/CatalogBrowser';
import { PageHeader } from '@/components/PageHeader';
import { MediaItem, StreamSource, LiveChannel } from '@/types';
import { FEATURED_HERO, SAMPLE_MEDIA_CATALOG } from '@/lib/metadata/tmdb';
import { OPEN_SOURCE_STREAMS } from '@/lib/streaming/streamSources';

interface CatalogRow {
  key: string;
  title: string;
  subtitle?: string;
  items: MediaItem[];
}

interface HomeData {
  featured: MediaItem | null;
  rows: CatalogRow[];
}

/** Rows built from the bundled sample catalog; only used if the catalog API is unreachable. */
function fallbackHome(data?: { featured?: MediaItem; trending?: MediaItem[]; movies?: MediaItem[]; series?: MediaItem[] }): HomeData {
  const all = data?.trending?.length ? data.trending : SAMPLE_MEDIA_CATALOG;
  const rows: CatalogRow[] = [
    { key: 'trending', title: 'Trending now', items: all },
    { key: 'movies', title: 'Movies', items: data?.movies?.length ? data.movies : all.filter((m) => m.mediaType === 'movie') },
    { key: 'series', title: 'Series', items: data?.series?.length ? data.series : all.filter((m) => m.mediaType === 'tv') },
  ];
  return { featured: data?.featured ?? FEATURED_HERO, rows: rows.filter((r) => r.items.length > 0) };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [home, setHome] = useState<HomeData | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
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
        if (Array.isArray(data.rows) && data.rows.length > 0) {
          setHome({ featured: data.featured ?? data.rows[0].items[0] ?? null, rows: data.rows });
        } else {
          setHome(fallbackHome(data));
        }
      })
      .catch((err) => {
        console.error('Failed to load catalog:', err);
        setHome(fallbackHome());
      });
  }, []);

  const switchTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const toPlayable = (sources: StreamSource[]): PlayableSource[] =>
    sources
      .filter((s) => (s.type === 'torrent' ? Boolean(s.magnet) : Boolean(s.magnet || s.url)))
      .map((s) => (s.magnet ? { magnet: s.magnet, fileIdx: s.fileIdx, label: s.name } : { url: s.url, label: s.name }));

  const handlePlaySource = (sources: StreamSource[], media: MediaItem, context: PlaybackContext) => {
    const playable = toPlayable(sources);
    if (!playable.length) return;
    setSelectedMedia(null);
    const episodeTag = context.season ? ` · S${context.season}E${context.episode}` : '';
    // Anime episodes are numbered absolutely; subtitles use the mapped IMDb series and season.
    const subtitleQuery: SubtitleQuery | undefined = media.anime
      ? media.anime.imdbId
        ? { imdbId: media.anime.imdbId, mediaType: media.mediaType, season: media.anime.season ?? 1, episode: context.episode }
        : undefined
      : media.imdbId
        ? { imdbId: media.imdbId, mediaType: media.mediaType, season: context.season, episode: context.episode }
        : undefined;
    setActivePlayer({ title: `${media.title}${episodeTag}`, sources: playable, subtitleQuery });
  };

  // Titles with bundled open streams play straight away; everything else opens its details.
  const handlePlayMedia = (media: MediaItem) => {
    const sources = OPEN_SOURCE_STREAMS[String(media.id)] || OPEN_SOURCE_STREAMS[String(media.tmdbId)] || [];
    if (sources.length > 0) handlePlaySource(rankSources(sources), media, {});
    else setSelectedMedia(media);
  };

  const handlePlayLiveChannel = (channel: LiveChannel) => {
    setActivePlayer({ title: channel.name, sources: [{ url: channel.streamUrl }], isLive: channel.isLive });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={switchTab}
        onSelectMedia={setSelectedMedia}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

      {activeTab === 'home' ? (
        <main className="flex-1 pb-24">
          <HeroBanner media={home?.featured ?? null} onPlay={handlePlayMedia} onMoreInfo={setSelectedMedia} />
          <div className="relative z-10 -mt-8 sm:-mt-12 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            {home
              ? home.rows.map((row) => (
                  <MediaCarousel
                    key={row.key}
                    title={row.title}
                    subtitle={row.subtitle}
                    items={row.items}
                    onSelectMedia={setSelectedMedia}
                    onPlayMedia={handlePlayMedia}
                  />
                ))
              : Array.from({ length: 4 }).map((_, i) => <CarouselSkeleton key={i} />)}
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 md:pt-28 pb-24">
          {activeTab === 'movies' && (
            <>
              <PageHeader eyebrow="Browse" title="Movies" description="Popular films, by genre or by year." />
              <CatalogBrowser mediaType="movie" onSelectMedia={setSelectedMedia} />
            </>
          )}
          {activeTab === 'tv' && (
            <>
              <PageHeader eyebrow="Browse" title="Series" description="Every season and episode, ready to stream." />
              <CatalogBrowser mediaType="tv" onSelectMedia={setSelectedMedia} />
            </>
          )}
          {activeTab === 'anime' && (
            <>
              <PageHeader eyebrow="Browse" title="Anime" description="Trending, seasonal and all-time favourites, powered by AniList." />
              <CatalogBrowser mediaType="anime" onSelectMedia={setSelectedMedia} />
            </>
          )}
          {activeTab === 'live' && <LiveChannelsGrid onPlayChannel={handlePlayLiveChannel} />}
        </main>
      )}

      {selectedMedia && (
        <MediaDetailModal
          key={`${selectedMedia.mediaType}-${selectedMedia.id}`}
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPlaySource={handlePlaySource}
        />
      )}

      {isSettingsModalOpen && <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />}

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
