import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFreeTvPlaylist } from '../src/lib/channels/freeTv.ts';

const PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-logo="https://logo/dw.png" group-title="Germany",DW Ⓖ
https://example.com/dw/master.m3u8
#EXTINF:-1 group-title="Germany",Duplicate URL
https://example.com/dw/master.m3u8
#EXTINF:-1 group-title="News",Global News Ⓢ
https://example.com/news.m3u8?token=1
#EXTINF:-1 group-title="Netherlands",YouTube channel Ⓨ
https://www.youtube.com/watch?v=abc
#EXTINF:-1 group-title="VOD Movies",Some film
https://example.com/film.mp4
#EXTINF:-1 group-title="United Kingdom",Not a stream
https://example.com/page.html
`;

test('parses live HLS channels and skips VOD, YouTube, duplicates and non-streams', () => {
  const channels = parseFreeTvPlaylist(PLAYLIST);
  assert.deepEqual(
    channels.map((c) => c.name),
    ['DW', 'Global News']
  );
});

test('fills in country, category and markers', () => {
  const [dw, news] = parseFreeTvPlaylist(PLAYLIST);
  assert.equal(dw.countryCode, 'DE');
  assert.equal(dw.logo, 'https://logo/dw.png');
  assert.equal(dw.geoBlocked, true);
  assert.equal(dw.partTime, false);
  assert.equal(dw.source, 'freetv');

  assert.equal(news.category, 'News');
  assert.equal(news.country, 'International');
  assert.equal(news.countryCode, undefined);
  assert.equal(news.partTime, true);
});
