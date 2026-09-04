# 🎬 Screentime

> A modern, self-hosted media streaming dashboard and open BitTorrent stream engine.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-6.1-green?style=flat&logo=ffmpeg)](https://ffmpeg.org/)

---

## ✨ Features

- 🍿 **Cinematic Web Dashboard**: Responsive dark-mode interface with featured hero banners, trending carousels, genre filters, and detailed media modals.
- ⚡ **Instant BitTorrent Streaming**: Streams video files sequentially over `HTTP 206 Partial Content` without waiting for the full torrent to finish downloading.
- 🔄 **On-the-Fly FFmpeg Transcoding**: Automatically remuxes MKV, AVI, and TS containers and transcodes non-browser audio (AC3, EAC3, DTS) to standard AAC on the fly.
- 🧲 **Direct Magnet Player**: Paste any magnet link, infohash, or direct CDN stream URL for immediate playback.
- 📊 **Live Swarm HUD**: Real-time stats overlay showing connected peers, download speed (MB/s), buffer progress, and multi-file selection for series episode packs.
- 🔍 **Metadata & Multi-Search**: Search and discover movies, series, trailers, and ratings powered by TMDB integration and built-in curated catalogs.
- ⚙️ **Customizable Preferences**: Configure TMDB API keys, Real-Debrid / Torbox tokens, max peer limits, and transcode settings.

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js React Web UI                     │
│  (Hero Banner, Media Carousels, Detail Modals, Video HUD)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP 206 Partial-Content / API
┌──────────────────────────────▼──────────────────────────────┐
│                    Node.js Stream Engine                    │
│                                                             │
│  • Torrent Engine (torrent-stream sequential piece manager) │
│  • Transcoder (fluent-ffmpeg on-the-fly AAC / MP4 remux)    │
│  • Metadata Service (TMDB API + Fallback catalog)           │
│  • Swarm Telemetry & Multi-file index resolution            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.x or higher
- **npm** or **yarn** / **pnpm**
- **FFmpeg**: Installed locally (`sudo apt install ffmpeg` on Debian/Ubuntu)

### Installation

```bash
# Clone repository
git clone git@github.com:jvanheerikhuize/screentime.git
cd screentime

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your web browser.

### Production Build

```bash
npm run build
npm start
```

---

## ⚙️ Configuration (Optional)

Create a `.env.local` file in the root directory:

```env
# Optional: The Movie Database API Key (v3)
TMDB_API_KEY=your_tmdb_api_key_here
```

---

## 📜 License

MIT License. Designed for personal open media streaming and research.
