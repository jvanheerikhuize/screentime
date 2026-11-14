# Changelog

All notable changes to **Lumen** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-14

### Added
- **Zero-config catalogs:** Movies and TV series via Cinemeta, Anime via AniList + Fribb ID mapping, and airing-today schedule via TVmaze.
- **Personalization & discovery:** Randomized Hero banner (never repeating recent titles), automatic genre taste learning, interactive **"Your taste"** genre chips, **"Surprise me"** / **"Shuffle picks"**, **"Picked for You"**, and **"Your Liked Titles"** rows.
- **Continue Watching & Up Next:** Per-episode and movie resume memory, **"Continue Watching"** carousel with progress bars, **"Up Next"** auto-advance overlay in the final 35s, and LAN state sync (`/api/state`).
- **Unified global search:** Parallel search across Movies, TV Series, Anime (`TMDB`/`Cinemeta` + `AniList`), and Live TV channels with `/` keyboard shortcut.
- **Torrent streaming & on-the-fly conversion:** BitTorrent swarm engine with head/tail piece prioritization (`moov` atom first), HTTP range serving, `ffprobe` codec inspection, on-the-fly `ffmpeg` remuxing/transcoding to fragmented MP4 (`fMP4`), optional hardware acceleration (`LUMEN_HWACCEL`), and concurrent transcode limiting.
- **In-player controls:** Source switcher, audio track switcher, embedded MKV subtitle extraction (`/api/subtitles/embedded`), OpenSubtitles SRT-to-WebVTT proxy with live `±0.5s` sync (`G`/`H`), playback speed (`0.5x–2x`), Picture-in-Picture, `navigator.mediaSession`, and mobile tap/double-tap gestures.
- **Live TV:** ~1,700 free-to-air channels from Free-TV/IPTV + curated feeds with category/country/favorite (`★`) filters, batch on-air verification (`/api/live/status`), Prev/Next channel surfing, and automatic CORS HLS relay (`/api/live/proxy`).
- **Docker, PWA & self-hosted ecosystem:** Standalone Next.js output, multi-arch `Dockerfile`, `compose.yaml`, `/api/health` endpoint, PWA manifest, and CasaOS / Unraid / Homepage templates.

### Security & Reliability
- SSRF protection (`guardedFetch`) across all upstream addon, indexer, live TV, and subtitle endpoints with bounded response readers (`readBoundedText`).
- Canonical 40-char `infoHash` swarm keying (supporting both hex and base32 magnets), immediate episode `fileIndex` selection for season packs, and automatic temp cache cleanup.
- Native `<dialog>` top-layer modal accessibility, keyboard-navigable poster cards, and URL history sync (`?tab=`, `?genre=`, `?media=`).
- Reverse-proxy loopback port resolution (`LUMEN_INTERNAL_PORT` / `PORT`) for `ffmpeg` and `ffprobe`.
