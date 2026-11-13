import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ADDON_URLS, cleanAddonUrls, isDefaultAddonList } from '../src/lib/scrapers/addonUrls.ts';

test('cleans addon URLs', () => {
  assert.deepEqual(
    cleanAddonUrls([
      'https://torrentio.strem.fun/manifest.json',
      'https://torrentio.strem.fun/',
      'https://knightcrawler.elfhosted.com',
      'ftp://example.com',
      'nonsense',
      'https://addon.example.com/config/',
    ]),
    ['https://torrentio.strem.fun', 'https://addon.example.com/config']
  );
});

test('falls back to the defaults when nothing usable is left', () => {
  assert.deepEqual(cleanAddonUrls(undefined), DEFAULT_ADDON_URLS);
  assert.deepEqual(cleanAddonUrls(['https://knightcrawler.elfhosted.com']), DEFAULT_ADDON_URLS);
});

test('caps the list at 10 addons', () => {
  const many = Array.from({ length: 15 }, (_, i) => `https://addon${i}.example.com`);
  assert.equal(cleanAddonUrls(many).length, 10);
});

test('recognises the default list', () => {
  assert.equal(isDefaultAddonList([...DEFAULT_ADDON_URLS]), true);
  assert.equal(isDefaultAddonList([DEFAULT_ADDON_URLS[0]]), false);
});
