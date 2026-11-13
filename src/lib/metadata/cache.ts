// Small in-memory TTL cache for public catalog APIs, so browsing the dashboard
// doesn't hammer upstream services on every page load.
const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 500;
const store = new Map<string, { expires: number; value: unknown }>();

/** GETs JSON through the cache. `T` describes the expected shape; fields may still be missing. */
export async function cachedJson<T>(url: string, timeoutMs = 10000): Promise<T | null> {
  const hit = store.get(url);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Screentime/1.0', Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const value = (await res.json()) as T;

    if (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
    store.set(url, { expires: Date.now() + TTL_MS, value });
    return value;
  } catch (e) {
    console.warn(`[catalog] fetch failed for ${url}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}
