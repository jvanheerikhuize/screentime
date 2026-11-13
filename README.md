# Lumen

[![CI](https://github.com/jvanheerikhuize/lumen/actions/workflows/ci.yml/badge.svg)](https://github.com/jvanheerikhuize/lumen/actions/workflows/ci.yml)
[![Docker](https://github.com/jvanheerikhuize/lumen/actions/workflows/docker.yml/badge.svg)](https://github.com/jvanheerikhuize/lumen/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-rose.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.18-emerald.svg)](package.json)

**A zero-config, self-hosted streaming dashboard for your home network.**

Browse movies, TV series, and anime from free, keyless catalogs, watch 1,700+ free-to-air live TV channels, and stream torrents directly in your browser — with MKV, HEVC/x265, AC3, EAC3, and DTS converted on the fly via `ffmpeg`.

No accounts, cloud logins, or mandatory API keys required.

---

## Highlights

- **Movies & Series** from [Cinemeta](https://v3-cinemeta.strem.io) with genre/year filters, IMDb ratings, and full season/episode guides. Optional [TMDB](https://www.themoviedb.org/) integration when `TMDB_API_KEY` is provided.
- **Anime** from [AniList](https://anilist.co) (trending, seasonal, popular, and top-rated), automatically cross-referenced via [Fribb/anime-lists](https://github.com/Fribb/anime-lists) to Kitsu and IMDb IDs for episode streams and subtitles.
- **Personalized & Fresh Every Open:** Randomized hero banner that never repeats recently shown titles, automatic genre taste learning, interactive genre filter chips, **"Picked for You"** & **"Your Liked Titles"** rows, **"Continue Watching"** with per-episode resume memory, **"Up Next"** auto-advance, and LAN state sync (`/api/state`).
- **What's On Today:** "New episodes today" row and live series status (*"Returning series · Next: S2 · E5"*) powered by [TVmaze](https://www.tvmaze.com).
- **Live TV:** ~1,700 free-to-air channels from [Free-TV/IPTV](https://github.com/Free-TV/IPTV) plus curated international news/sports feeds, with category/country/favorite filters, background batch on-air verification, and a built-in CORS HLS relay (`/api/live/proxy`).
- **Smart Torrent Streaming:**
  - Queries Stremio addons ([Torrentio](https://torrentio.strem.fun) and MediaFusion by default; add custom manifests in Settings) plus optional self-hosted **Prowlarr** and **Jackett** indexers.
  - Prioritizes first and last pieces (`moov` atom) for fast startup, ranks sources by browser streamability, and automatically fails over if a swarm stalls.
  - Announces to a daily-refreshed list of live [public trackers](https://github.com/ngosang/trackerslist).
- **Plays Almost Anything in Any Browser:** `ffprobe` inspects every stream before playback; H.264/AAC MP4/WebM streams play directly (`206 Partial Content`), while MKV/AVI containers are remuxed (`-c:v copy`) and HEVC/AV1/AC3/DTS streams are transcoded on the fly to fragmented MP4 (`fMP4`) with full seek support and optional hardware acceleration (`LUMEN_HWACCEL`).
- **Embedded & External Subtitles:** Extracts embedded MKV subtitle tracks via `ffmpeg` and fetches external subtitles from OpenSubtitles, with live `±0.5s` sync adjustment (`G`/`H`).

---

## How Lumen Compares

| Capability | Lumen | Stremio Web | Jellyfin + \*arr Stack |
| :--- | :--- | :--- | :--- |
| **Zero-Account / No Cloud Login** | Yes | Requires Stremio account sync | Yes |
| **Built-in Torrent Engine + `ffmpeg` Remux/Transcode** | Built-in (`node` + `ffmpeg`) | Needs external local companion service | Requires separate qBittorrent + Radarr/Sonarr |
| **Stremio Addon + Prowlarr/Jackett Support** | Both built-in | Stremio Addons only | Prowlarr/Jackett via \*arr |
| **1,700+ Free-to-Air Live TV + CORS Relay** | Built-in | Via third-party addons | Requires M3U tuner setup |
| **Setup Time** | **1 command (`docker compose up -d`)** | Cloud web app + local server | Multi-container stack |

---

## Quick Start (Docker — Recommended)

Run Lumen with `ffmpeg` pre-installed in a single container:

```bash
docker compose up -d
```

Or with `docker run`:

```bash
docker run -d \
  --name lumen \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/jvanheerikhuize/lumen:latest
```

Then open **http://localhost:3000** (or `http://<your-lan-ip>:3000` from any TV, tablet, or phone on your home network).

---

## Local Installation (Node.js)

### Requirements
- **Node.js 22.18+**
- **`ffmpeg` and `ffprobe`** on your `PATH`:
  - Debian / Ubuntu: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`

```bash
git clone https://github.com/jvanheerikhuize/lumen.git
cd lumen
npm install
npm run build
npm start            # or: npm run dev for development with hot reload
```

---

## Architecture

```mermaid
flowchart LR
  subgraph Client["Browser Client (React 19)"]
    UI["Catalogs · Search · Detail Modal"]
    Player["VideoPlayerModal (HTML5 / hls.js)"]
  end

  subgraph Server["Lumen Server (Next.js 16 Node Runtime)"]
    Meta["Metadata Aggregator\nCinemeta · TMDB · AniList · TVmaze"]
    Scrapers["Stream Scrapers\nStremio Addons · Prowlarr · Jackett"]
    Engine["TorrentEngineManager\nHead/Tail Piece Priority + HTTP 206"]
    FFmpeg["Media Pipeline\nffprobe + ffmpeg fMP4 Remux/Transcode"]
    LiveRelay["Live TV Checker & CORS Relay\n/api/live/status · /api/live/proxy"]
    Subs["Subtitle Proxy\nEmbedded MKV + OpenSubtitles SRT → WebVTT"]
  end

  UI --> Meta
  UI --> Scrapers
  Player --> Engine
  Engine --> FFmpeg
  FFmpeg --> Player
  Player --> LiveRelay
  Player --> Subs
```

---

## Configuration

Everything works out of the box with zero configuration. Optional environment variables can be placed in `.env.local` (or passed to Docker via `compose.yaml`; see [`.env.example`](.env.example)):

| Variable | Description |
| :--- | :--- |
| `TMDB_API_KEY` | Optional [TMDB API key](https://www.themoviedb.org/settings/api) for TMDB trending lists and metadata. |
| `PROWLARR_URL`, `PROWLARR_API_KEY` | Query your self-hosted Prowlarr instance for every movie and series. |
| `JACKETT_URL`, `JACKETT_API_KEY` | Query your self-hosted Jackett Torznab endpoint for every movie and series. |
| `LUMEN_ALLOW_PRIVATE_ADDONS` | Set to `1` to allow Stremio addons hosted on private RFC1918 LAN addresses. |
| `LUMEN_INTERNAL_PORT` | Internal HTTP port Next.js listens on when behind a reverse proxy on `80`/`443` (defaults to `PORT` or `3000`). |
| `LUMEN_HWACCEL` | Optional hardware video encoding: `vaapi`, `nvenc`, `qsv`, `videotoolbox`, or `none`. |

---

## Player Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `/` | Focus global search bar (when player is closed) |
| `Space` / `K` | Play / Pause |
| `←` / `→` | Seek backward / forward 10 seconds |
| `↑` / `↓` | Previous / Next Live TV channel |
| `F` | Toggle fullscreen |
| `P` | Toggle Picture-in-Picture |
| `M` | Toggle mute |
| `C` | Toggle subtitles on / off |
| `G` / `H` | Subtitle sync `−0.5s` / `+0.5s` |
| `Esc` | Close menus or exit player |

---

## Development

```bash
npm run dev         # Start Next.js dev server with hot reload
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript compiler checks (tsc --noEmit)
npm test            # Run unit test suite (Node built-in test runner)
npm run build       # Build standalone production bundle
```

---

## Security

Lumen is designed for a trusted home network (or private VPN/Tailscale mesh). It does not include user authentication, so do not expose it directly to the public internet without an authenticating reverse proxy. All upstream fetches validate DNS and redirect hops against SSRF into link-local or private networks. See [SECURITY.md](SECURITY.md) for details.

## Disclaimer

Lumen does not host, store, or distribute any media content. It aggregates metadata and stream links from public catalogs, user-configured addons/indexers, and public BitTorrent swarms. You are solely responsible for complying with applicable laws in your jurisdiction.

## License

Released under the [MIT License](LICENSE).
