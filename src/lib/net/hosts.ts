/**
 * Classifies hosts for outbound requests to user-supplied addresses (addons, indexers,
 * direct streams). Pure functions so they can run anywhere and be unit-tested.
 *
 * - "blocked": never contacted (unspecified, link-local / cloud metadata, multicast).
 * - "private": loopback and LAN (fine for your own Prowlarr/Jackett, not for public sources).
 * - "public":  everything else.
 */
export type HostClass = 'public' | 'private' | 'blocked';

function parseIPv4(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return null;
  const nums = parts.map(Number);
  return nums.every((n) => n <= 255) ? nums : null;
}

function classifyIPv4([a, b]: number[]): HostClass {
  if (a === 0 || (a === 169 && b === 254) || a >= 224) return 'blocked';
  if (a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) {
    return 'private';
  }
  return 'public';
}

export function classifyHost(hostname: string): HostClass {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h) return 'blocked';

  const v4 = parseIPv4(h);
  if (v4) return classifyIPv4(v4);

  if (h.includes(':')) {
    if (h === '::') return 'blocked';
    if (h === '::1') return 'private';
    const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return parseIPv4(mapped[1]) ? classifyIPv4(parseIPv4(mapped[1])!) : 'blocked';
    if (h.startsWith('::ffff:')) return 'blocked'; // hex-form mapped address: don't guess
    if (/^fe[89ab]/.test(h) || h.startsWith('ff')) return 'blocked';
    if (/^f[cd]/.test(h)) return 'private';
    return 'public';
  }

  if (h === 'metadata.google.internal' || h === 'metadata') return 'blocked';
  if (
    h === 'localhost' ||
    !h.includes('.') ||
    /\.(localhost|local|lan|internal|home\.arpa|home|corp)$/.test(h)
  ) {
    return 'private';
  }
  return 'public';
}

export function isAllowedClass(cls: HostClass, allowPrivate: boolean): boolean {
  return cls === 'public' || (cls === 'private' && allowPrivate);
}

/**
 * Normalises the base address of a user-supplied service: http(s) only, no embedded
 * credentials, query or fragment, no trailing slash. Returns null when it isn't allowed.
 */
export function checkServiceUrl(raw: string, { allowPrivate }: { allowPrivate: boolean }): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) return null;
  if (!isAllowedClass(classifyHost(url.hostname), allowPrivate)) return null;
  return url.toString().replace(/\/+$/, '');
}
