import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankSources, streamabilityScore } from '../src/lib/streaming/pickSource.ts';
import type { StreamSource } from '../src/types/index.ts';

test('streamabilityScore prefers direct HTTP sources and browser-friendly 1080p x264 over 4K HEVC remuxes', () => {
  const directMp4: StreamSource = {
    id: 'direct-1',
    name: 'Direct CDN MP4',
    title: 'Movie.2024.1080p.WEB-DL.x264.mp4',
    url: 'https://cdn.example.com/movie.mp4',
    quality: '1080p',
    provider: 'CDN',
    type: 'direct',
  };
  const goodTorrent: StreamSource = {
    id: 'tor-1080',
    name: '1080p WEB-DL x264',
    title: 'Movie.2024.1080p.WEB-DL.x264',
    magnet: 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567',
    quality: '1080p',
    codec: 'x264',
    size: '2.4 GB',
    seeds: 120,
    provider: 'Torrentio',
    type: 'torrent',
  };
  const heavy4kRemux: StreamSource = {
    id: 'tor-4k',
    name: '4K BluRay REMUX HEVC HDR DV',
    title: 'Movie.2024.2160p.BluRay.REMUX.HEVC.DV.HDR',
    magnet: 'magnet:?xt=urn:btih:abcdef0123456789abcdef0123456789abcdef01',
    quality: '4K',
    codec: 'HEVC/x265 • HDR • DV',
    size: '48.5 GB',
    seeds: 80,
    provider: 'Torrentio',
    type: 'torrent',
  };
  const deadCam: StreamSource = {
    id: 'tor-cam',
    name: 'HDCAM',
    title: 'Movie.2024.HDCAM.x264',
    magnet: 'magnet:?xt=urn:btih:1111111111111111111111111111111111111111',
    quality: '480p',
    size: '150 MB',
    seeds: 0,
    provider: 'Torrentio',
    type: 'torrent',
  };

  assert.ok(streamabilityScore(directMp4) > streamabilityScore(goodTorrent));
  assert.ok(streamabilityScore(goodTorrent) > streamabilityScore(heavy4kRemux));
  assert.ok(streamabilityScore(heavy4kRemux) > streamabilityScore(deadCam));

  const ranked = rankSources([deadCam, heavy4kRemux, goodTorrent, directMp4]);
  assert.deepEqual(
    ranked.map((s) => s.id),
    ['direct-1', 'tor-1080', 'tor-4k', 'tor-cam'],
  );
});
