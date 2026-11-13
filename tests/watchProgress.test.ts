import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MediaItem } from '../src/types/index.ts';
import {
  getEpisodeProgress,
  getMediaProgress,
  getWatchProgressList,
  removeWatchProgress,
  saveWatchProgress,
} from '../src/lib/watchProgress.ts';

function mockLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown; localStorage: Storage }).window = {};
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
}

function makeMedia(id: string, title: string, mediaType: 'movie' | 'tv'): MediaItem {
  return {
    id,
    imdbId: id,
    title,
    overview: `${title} overview`,
    posterPath: null,
    backdropPath: null,
    voteAverage: 8.0,
    mediaType,
    genres: ['Sci-Fi'],
  };
}

test('saveWatchProgress records movie progress and removes movie when >= 94% complete', () => {
  mockLocalStorage();
  const movie = makeMedia('tt100', 'Interstellar', 'movie');

  const list1 = saveWatchProgress(movie, 1200, 7200);
  assert.equal(list1.length, 1);
  assert.equal(getMediaProgress('tt100')?.position, 1200);

  // Finishing the movie (>= 94%) removes it from Continue Watching
  const list2 = saveWatchProgress(movie, 7000, 7200);
  assert.equal(list2.length, 0);
  assert.equal(getMediaProgress('tt100'), null);
});

test('saveWatchProgress remembers last-watched season/episode and per-episode progress for series', () => {
  mockLocalStorage();
  const show = makeMedia('tt200', 'Severance', 'tv');

  saveWatchProgress(show, 1400, 2800, 1, 2);
  saveWatchProgress(show, 600, 2900, 1, 3);

  const entry = getMediaProgress('tt200');
  assert.equal(entry?.season, 1);
  assert.equal(entry?.episode, 3);
  assert.equal(getEpisodeProgress('tt200', 1, 2)?.position, 1400);
  assert.equal(getEpisodeProgress('tt200', 1, 3)?.position, 600);

  removeWatchProgress('tt200');
  assert.equal(getWatchProgressList().length, 0);
});
