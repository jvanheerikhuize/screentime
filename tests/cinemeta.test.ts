import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cinemetaToMediaItem } from '../src/lib/metadata/cinemeta.ts';

test('transforms Cinemeta movie metadata with runtime, trailer, and Metahub artwork fallback', () => {
  const item = cinemetaToMediaItem(
    {
      imdb_id: 'tt15239678',
      moviedb_id: 693134,
      name: 'Dune: Part Two',
      description: 'Paul Atreides unites with Chani and the Fremen.',
      released: '2024-03-01T00:00:00.000Z',
      imdbRating: '8.8',
      genres: ['Sci-Fi', 'Adventure'],
      runtime: '2 h 46 min',
      trailers: [{ source: 'Way9Dexny3w' }],
    },
    'movie',
  );

  assert.equal(item.id, 'tt15239678');
  assert.equal(item.imdbId, 'tt15239678');
  assert.equal(item.tmdbId, 693134);
  assert.equal(item.releaseDate, '2024-03-01');
  assert.equal(item.duration, 166);
  assert.equal(item.voteAverage, 8.8);
  assert.equal(item.posterPath, 'https://images.metahub.space/poster/medium/tt15239678/img');
  assert.equal(item.backdropPath, 'https://images.metahub.space/background/medium/tt15239678/img');
  assert.equal(item.trailerUrl, 'https://www.youtube.com/watch?v=Way9Dexny3w');
});

test('builds sorted TV seasons and episodes while skipping season 0 specials', () => {
  const item = cinemetaToMediaItem(
    {
      id: 'tt0903747',
      name: 'Breaking Bad',
      year: '2008–2013',
      videos: [
        { season: 0, episode: 1, name: 'Special' },
        { season: 2, episode: 1, name: 'Seven Thirty-Seven' },
        { season: 1, episode: 2, name: "Cat's in the Bag..." },
        { season: 1, episode: 1, name: 'Pilot', released: '2008-01-20T00:00:00.000Z' },
      ],
    },
    'tv',
  );

  assert.equal(item.firstAirDate, '2008-01-01');
  assert.equal(item.seasons?.length, 2);
  assert.equal(item.seasons?.[0].seasonNumber, 1);
  assert.equal(item.seasons?.[0].episodeCount, 2);
  assert.deepEqual(
    item.seasons?.[0].episodes.map((e) => e.name),
    ['Pilot', "Cat's in the Bag..."],
  );
  assert.equal(item.seasons?.[1].seasonNumber, 2);
});
