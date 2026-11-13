import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_TRACKERS, buildMagnet, dedupe, magnetTrackers } from '../src/lib/streaming/trackers.ts';

test('reads udp/http trackers from a magnet and skips websocket ones', () => {
  const magnet =
    'magnet:?xt=urn:btih:abc&tr=' +
    encodeURIComponent('udp://tracker.opentrackr.org:1337/announce') +
    '&tr=' +
    encodeURIComponent('wss://tracker.webtorrent.dev') +
    '&tr=' +
    encodeURIComponent('http://tracker.example.org/announce');
  assert.deepEqual(magnetTrackers(magnet), ['udp://tracker.opentrackr.org:1337/announce', 'http://tracker.example.org/announce']);
  assert.deepEqual(magnetTrackers('magnet:no-query'), []);
});

test('dedupes trackers ignoring case and trailing slashes', () => {
  assert.deepEqual(dedupe(['udp://A.org:1/announce', 'udp://a.org:1/announce/', 'udp://b.org:2']), ['udp://A.org:1/announce', 'udp://b.org:2']);
});

test('builds a magnet with a lowercase hash, title and the tracker list', () => {
  const magnet = buildMagnet('ABCDEF0123', 'Big Buck Bunny');
  assert.ok(magnet.startsWith('magnet:?xt=urn:btih:abcdef0123&dn=Big%20Buck%20Bunny&tr='));
  assert.equal(magnetTrackers(magnet).length, FALLBACK_TRACKERS.length);
});
