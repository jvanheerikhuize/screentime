import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anilistToMediaItem } from '../src/lib/metadata/anilist.ts';

test('transforms AniList media item, strips HTML/source notes, and filters adult genres', () => {
  const item = anilistToMediaItem({
    id: 154587,
    title: {
      romaji: 'Sousou no Frieren',
      english: "Frieren: Beyond Journey's End",
    },
    description: 'An elf mage reflects on her journey.<br><br><i>Second paragraph.</i> (Source: Crunchyroll)',
    coverImage: { extraLarge: 'https://s4.anilist.co/cover.jpg' },
    bannerImage: 'https://s4.anilist.co/banner.jpg',
    format: 'TV',
    averageScore: 91,
    genres: ['Adventure', 'Drama', 'Fantasy', 'Ecchi'],
    startDate: { year: 2023, month: 9, day: 29 },
  });

  assert.equal(item.id, 'al-154587');
  assert.equal(item.title, "Frieren: Beyond Journey's End");
  assert.equal(item.originalTitle, 'Sousou no Frieren');
  assert.equal(item.overview, 'An elf mage reflects on her journey.\n\nSecond paragraph.');
  assert.equal(item.mediaType, 'tv');
  assert.equal(item.firstAirDate, '2023-09-29');
  assert.equal(item.voteAverage, 9.1);
  assert.deepEqual(item.genres, ['Anime', 'Adventure', 'Drama', 'Fantasy']);
  assert.deepEqual(item.anime, { anilistId: 154587 });
});
