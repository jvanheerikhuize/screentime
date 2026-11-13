import type { NextConfig } from "next";

/**
 * Private-network origins (RFC 1918 + mDNS names) so the dev server works when opened
 * from another machine on the LAN, e.g. http://192.168.1.20:3000. Next.js otherwise blocks
 * its dev assets and hot reload for anything but localhost, leaving the page half-loaded.
 */
const LAN_ORIGINS = [
  "10.*.*.*",
  "192.168.*.*",
  ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  "*.local",
  "*.lan",
];

const nextConfig: NextConfig = {
  output: "standalone",
  // The dev badge sits on top of the player controls (bottom-left). Errors are still surfaced.
  devIndicators: false,
  allowedDevOrigins: LAN_ORIGINS,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
