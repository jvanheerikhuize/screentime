'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shuffle, Sparkles } from 'lucide-react';
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
import {
  getTasteProfile,
  isMediaLiked,
  personalizeRows,
  pickRandomHero,
  POPULAR_TASTE_GENRES,
  recordMediaInteraction,
  rememberHeroId,
  TasteProfile,
  toggleFavoriteGenre,
  toggleLikedMedia,
} from '@/lib/tasteProfile';

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

const VALID_TABS = new Set<AppTab>(['home', 'movies', 'tv', 'anime', 'live']);

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
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<CatalogRow[]>([]);
  const [home, setHome] = useState<HomeData | null>(null);
  const [taste, setTaste] = useState<TasteProfile>(() => getTasteProfile());

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activePlayer, setActivePlayer] = useState<{
    title: string;
    sources: PlayableSource[];
    initialSourceIndex?: number;
    isLive?: boolean;
    subtitleQuery?: SubtitleQuery;
  } | null>(null);

  // Sync initial state and browser Back/Forward with URL search params (?tab=, ?genre=, ?media=).
  const applyUrlParams = useCallback((rowsData?: HomeData | null) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as AppTab | null;
    if (tabParam && VALID_TABS.has(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('home');
    }
    setActiveGenre(params.get('genre'));

    const mediaParam = params.get('media');
    if (!mediaParam) {
      setSelectedMedia(null);
    } else if (rowsData) {
      const allItems = [
        ...(rowsData.featured ? [rowsData.featured] : []),
        ...rowsData.rows.flatMap((r) => r.items),
        ...SAMPLE_MEDIA_CATALOG,
      ];
      const found = allItems.find((m) => String(m.imdbId || m.id) === mediaParam || String(m.id) === mediaParam);
      if (found) setSelectedMedia(found);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => applyUrlParams(home);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyUrlParams, home]);

  const updateUrl = useCallback((tab: AppTab, genre: string | null, media: MediaItem | null) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (tab !== 'home') params.set('tab', tab);
    if (genre && (tab === 'movies' || tab === 'tv' || tab === 'anime')) params.set('genre', genre);
    if (media) params.set('media', String(media.imdbId || media.id));
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, '', nextUrl);
    }
  }, []);

  useEffect(() => {
    fetch('/api/media/trending')
      .then((res) => res.json())
      .then((data) => {
        const base =
          Array.isArray(data.rows) && data.rows.length > 0
            ? { featured: data.featured ?? data.rows[0].items[0] ?? null, rows: data.rows as CatalogRow[] }
            : fallbackHome(data);
        const currentTaste = getTasteProfile();
        setRawRows(base.rows);
        const hero = pickRandomHero(base.rows, currentTaste) ?? base.featured;
        const updatedTaste = hero ? rememberHeroId(hero.id) : currentTaste;
        setTaste(updatedTaste);
        const nextHome: HomeData = {
          featured: hero,
          rows: personalizeRows(base.rows, updatedTaste),
        };
        setHome(nextHome);
        applyUrlParams(nextHome);
      })
      .catch((err) => {
        console.error('Failed to load catalog:', err);
        const fallback = fallbackHome();
        setRawRows(fallback.rows);
        setHome(fallback);
        applyUrlParams(fallback);
      });
  }, [applyUrlParams]);

  const shuffleHome = useCallback(
    (profileOverride?: TasteProfile) => {
      if (!rawRows.length) return;
      const activeProfile = profileOverride ?? getTasteProfile();
      const nextHero = pickRandomHero(rawRows, activeProfile, home?.featured?.id) ?? home?.featured ?? null;
      const updatedProfile = nextHero ? rememberHeroId(nextHero.id) : activeProfile;
      setTaste(updatedProfile);
      setHome({
        featured: nextHero,
        rows: personalizeRows(rawRows, updatedProfile),
      });
    },
    [rawRows, home?.featured]
  );

  const handleToggleFavoriteGenre = (genre: string) => {
    const nextProfile = toggleFavoriteGenre(genre);
    shuffleHome(nextProfile);
  };

  const handleToggleLike = (media: MediaItem) => {
    const { profile: nextProfile } = toggleLikedMedia(media);
    setTaste(nextProfile);
    if (rawRows.length) {
      setHome((prev) =>
        prev
          ? {
              ...prev,
              rows: personalizeRows(rawRows, nextProfile),
            }
          : prev
      );
    }
  };

  const switchTab = (tab: AppTab) => {
    setActiveTab(tab);
    setActiveGenre(null);
    updateUrl(tab, null, selectedMedia);
    window.scrollTo({ top: 0 });
  };

  const selectMedia = (media: MediaItem | null) => {
    if (media) {
      const nextProfile = recordMediaInteraction(media, 1);
      setTaste(nextProfile);
    }
    setSelectedMedia(media);
    updateUrl(activeTab, activeGenre, media);
  };

  const handleGenreChange = (genre: string | null) => {
    setActiveGenre(genre);
    updateUrl(activeTab, genre, selectedMedia);
  };

  const toPlayable = (sources: StreamSource[]): PlayableSource[] =>
    sources
      .filter((s) => (s.type === 'torrent' ? Boolean(s.magnet) : Boolean(s.magnet || s.url)))
      .map((s) => (s.magnet ? { magnet: s.magnet, fileIdx: s.fileIdx, label: s.name } : { url: s.url, label: s.name }));

  const handlePlaySource = (sources: StreamSource[], media: MediaItem, context: PlaybackContext) => {
    const playable = toPlayable(sources);
    if (!playable.length) return;
    const nextProfile = recordMediaInteraction(media, 3);
    setTaste(nextProfile);
    selectMedia(null);
    const episodeTag = context.season ? ` · S${context.season}E${context.episode}` : '';
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
    else selectMedia(media);
  };

  const handlePlayLiveChannel = (channel: LiveChannel, channelList?: LiveChannel[]) => {
    const list = channelList && channelList.length > 0 ? channelList : [channel];
    const idx = Math.max(0, list.findIndex((c) => c.id === channel.id || c.streamUrl === channel.streamUrl));
    setActivePlayer({
      title: channel.name,
      sources: list.map((c) => ({ url: c.streamUrl, label: c.name })),
      initialSourceIndex: idx,
      isLive: channel.isLive,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={switchTab}
        onSelectMedia={selectMedia}
        onSelectLiveChannel={(ch) => handlePlayLiveChannel(ch)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

      {activeTab === 'home' ? (
        <main className="flex-1 pb-24">
          <HeroBanner
            media={home?.featured ?? null}
            onPlay={handlePlayMedia}
            onMoreInfo={selectMedia}
            onShuffle={() => shuffleHome()}
            isLiked={home?.featured ? isMediaLiked(home.featured.id, taste) : false}
            onToggleLike={handleToggleLike}
          />
          <div className="relative z-10 -mt-8 sm:-mt-12 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            {/* Personalization & Shuffle Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                Your taste:
              </span>
              {POPULAR_TASTE_GENRES.map((g) => {
                const active = taste.favoriteGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleToggleFavoriteGenre(g)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? 'bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-sm shadow-rose-950/50'
                        : 'bg-white/[0.05] text-zinc-300 ring-1 ring-inset ring-white/[0.08] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => shuffleHome()}
                className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/[0.07] hover:bg-white/15 text-xs font-medium text-zinc-200 hover:text-white ring-1 ring-inset ring-white/10 transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5 text-rose-400" />
                Shuffle picks
              </button>
            </div>

            {home
              ? home.rows.map((row) => (
                  <MediaCarousel
                    key={row.key}
                    title={row.title}
                    subtitle={row.subtitle}
                    items={row.items}
                    onSelectMedia={selectMedia}
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
              <CatalogBrowser
                mediaType="movie"
                onSelectMedia={selectMedia}
                initialGenre={activeGenre}
                onGenreChange={handleGenreChange}
              />
            </>
          )}
          {activeTab === 'tv' && (
            <>
              <PageHeader eyebrow="Browse" title="Series" description="Every season and episode, ready to stream." />
              <CatalogBrowser
                mediaType="tv"
                onSelectMedia={selectMedia}
                initialGenre={activeGenre}
                onGenreChange={handleGenreChange}
              />
            </>
          )}
          {activeTab === 'anime' && (
            <>
              <PageHeader eyebrow="Browse" title="Anime" description="Trending, seasonal and all-time favourites, powered by AniList." />
              <CatalogBrowser
                mediaType="anime"
                onSelectMedia={selectMedia}
                initialGenre={activeGenre}
                onGenreChange={handleGenreChange}
              />
            </>
          )}
          {activeTab === 'live' && <LiveChannelsGrid onPlayChannel={handlePlayLiveChannel} />}
        </main>
      )}

      {selectedMedia && (
        <MediaDetailModal
          key={`${selectedMedia.mediaType}-${selectedMedia.id}`}
          media={selectedMedia}
          onClose={() => selectMedia(null)}
          onPlaySource={handlePlaySource}
          isLiked={isMediaLiked(selectedMedia.id, taste)}
          onToggleLike={handleToggleLike}
        />
      )}

      {isSettingsModalOpen && <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />}

      {activePlayer && (
        <VideoPlayerModal
          title={activePlayer.title}
          sources={activePlayer.sources}
          initialSourceIndex={activePlayer.initialSourceIndex}
          isLive={activePlayer.isLive}
          subtitleQuery={activePlayer.subtitleQuery}
          onClose={() => setActivePlayer(null)}
        />
      )}
    </div>
  );
}
