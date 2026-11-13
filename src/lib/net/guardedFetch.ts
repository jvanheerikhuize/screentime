// Server-only (uses node:dns): import from route handlers and server libraries, not components.
import { lookup } from 'node:dns/promises';
import { classifyHost, isAllowedClass } from './hosts.ts';

/**
 * Server-side checks for requests to user-supplied addresses. Besides the hostname
 * itself, every address it resolves to must be allowed, so a public-looking name that
 * points into your LAN is refused too.
 */
export async function isAllowedUrl(raw: string, { allowPrivate }: { allowPrivate: boolean }): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return false;
  const cls = classifyHost(url.hostname);
  if (!isAllowedClass(cls, allowPrivate)) return false;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (/^[\d.]+$/.test(host) || host.includes(':')) return true; // literal IP, already classified
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((a) => isAllowedClass(classifyHost(a.address), allowPrivate));
  } catch {
    return false;
  }
}

/** fetch() that checks the target and every redirect hop with {@link isAllowedUrl}. */
export async function guardedFetch(
  url: string,
  init: RequestInit = {},
  { allowPrivate }: { allowPrivate: boolean }
): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= 3; hop++) {
    if (!(await isAllowedUrl(current, { allowPrivate }))) throw new Error('Address not allowed');
    const res = await fetch(current, { ...init, redirect: 'manual' });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) return res;
    res.body?.cancel().catch(() => {});
    current = new URL(location, current).toString();
  }
  throw new Error('Too many redirects');
}

/** Custom stream addons on your own network are refused unless the server opts in. */
export const ALLOW_PRIVATE_ADDONS = process.env.SCREENTIME_ALLOW_PRIVATE_ADDONS === '1';

/** Read a text response up to maxBytes, aborting if the upstream body exceeds the limit. */
export async function readBoundedText(res: Response, maxBytes = 2 * 1024 * 1024): Promise<string> {
  const contentLength = Number(res.headers.get('content-length') || '0');
  if (contentLength > maxBytes) {
    res.body?.cancel().catch(() => {});
    throw new Error('Response too large');
  }
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let out = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error('Response too large');
      }
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
    return out;
  } finally {
    reader.releaseLock();
  }
}
