import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkServiceUrl, classifyHost } from '../src/lib/net/hosts.ts';

test('classifies public, private and blocked hosts', () => {
  for (const h of ['torrentio.strem.fun', '8.8.8.8', '2606:4700::1111', '172.32.0.1']) assert.equal(classifyHost(h), 'public', h);
  for (const h of ['localhost', '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.178.12', '100.64.0.1', '::1', 'fd00::1', 'nas', 'nas.local', 'router.lan', '[::1]'])
    assert.equal(classifyHost(h), 'private', h);
  for (const h of ['169.254.169.254', '0.0.0.0', '::', 'fe80::1', '224.0.0.1', 'metadata.google.internal', '::ffff:169.254.169.254', ''])
    assert.equal(classifyHost(h), 'blocked', h);
  assert.equal(classifyHost('::ffff:192.168.1.1'), 'private');
});

test('service URLs: http(s) only, no credentials/query, private only when allowed', () => {
  assert.equal(checkServiceUrl('https://torrentio.strem.fun/', { allowPrivate: false }), 'https://torrentio.strem.fun');
  assert.equal(checkServiceUrl('http://192.168.1.10:9696', { allowPrivate: true }), 'http://192.168.1.10:9696');
  assert.equal(checkServiceUrl('http://192.168.1.10:9696', { allowPrivate: false }), null);
  assert.equal(checkServiceUrl('http://169.254.169.254/latest', { allowPrivate: true }), null);
  assert.equal(checkServiceUrl('file:///etc/passwd', { allowPrivate: true }), null);
  assert.equal(checkServiceUrl('https://user:pass@example.com', { allowPrivate: false }), null);
  assert.equal(checkServiceUrl('https://example.com/?x=1', { allowPrivate: false }), null);
  assert.equal(checkServiceUrl('not a url', { allowPrivate: true }), null);
});
