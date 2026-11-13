import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewritePlaylist } from '../src/lib/live/playlist.ts';

test('rewrites variants, segments and URI attributes to absolute relayed URLs', () => {
  const master = [
    '#EXTM3U',
    '#EXT-X-KEY:METHOD=AES-128,URI="keys/k1.key"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",URI="audio/en.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=800000',
    'low/index.m3u8',
    '',
    'https://cdn.example.org/seg1.ts',
  ].join('\n');
  const out = rewritePlaylist(master, 'https://live.example.com/ch/master.m3u8', (u) => `/relay?u=${encodeURIComponent(u)}`);
  const lines = out.split('\n');
  assert.equal(lines[0], '#EXTM3U');
  assert.equal(lines[1], `#EXT-X-KEY:METHOD=AES-128,URI="/relay?u=${encodeURIComponent('https://live.example.com/ch/keys/k1.key')}"`);
  assert.ok(lines[2].includes(encodeURIComponent('https://live.example.com/ch/audio/en.m3u8')));
  assert.equal(lines[3], '#EXT-X-STREAM-INF:BANDWIDTH=800000');
  assert.equal(lines[4], `/relay?u=${encodeURIComponent('https://live.example.com/ch/low/index.m3u8')}`);
  assert.equal(lines[5], '');
  assert.equal(lines[6], `/relay?u=${encodeURIComponent('https://cdn.example.org/seg1.ts')}`);
});
