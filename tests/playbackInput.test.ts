import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlaybackInput } from '../src/lib/streaming/playbackInput.ts';

const VALID_MAGNET = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny';

test('resolves magnet playback to local loopback port even behind an HTTPS reverse proxy', async () => {
  const prevPort = process.env.PORT;
  const prevInternal = process.env.SCREENTIME_INTERNAL_PORT;
  try {
    delete process.env.PORT;
    delete process.env.SCREENTIME_INTERNAL_PORT;
    // Public HTTPS URL with no explicit port (e.g. behind Caddy/Nginx/Traefik on 443):
    // must connect to local port 3000 rather than 127.0.0.1:443.
    const req = new Request(`https://screentime.example.com/api/playback/probe?magnet=${encodeURIComponent(VALID_MAGNET)}&fileIndex=2`);
    const resolved = await resolvePlaybackInput(req);
    assert.equal(
      resolved,
      `http://127.0.0.1:3000/api/stream?magnet=${encodeURIComponent(VALID_MAGNET)}&fileIndex=2`,
    );

    process.env.SCREENTIME_INTERNAL_PORT = '4100';
    const customResolved = await resolvePlaybackInput(req);
    assert.equal(
      customResolved,
      `http://127.0.0.1:4100/api/stream?magnet=${encodeURIComponent(VALID_MAGNET)}&fileIndex=2`,
    );
  } finally {
    if (prevPort === undefined) delete process.env.PORT;
    else process.env.PORT = prevPort;
    if (prevInternal === undefined) delete process.env.SCREENTIME_INTERNAL_PORT;
    else process.env.SCREENTIME_INTERNAL_PORT = prevInternal;
  }
});

test('rejects invalid magnet strings and private/LAN direct URLs', async () => {
  const badMagnetReq = new Request('http://localhost:3000/api/playback/probe?magnet=not-a-magnet');
  assert.equal(await resolvePlaybackInput(badMagnetReq), null);

  const lanUrlReq = new Request('http://localhost:3000/api/playback/probe?url=http://192.168.1.50:8080/video.mp4');
  assert.equal(await resolvePlaybackInput(lanUrlReq), null);
});
