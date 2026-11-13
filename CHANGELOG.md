# Changelog

All notable changes to **Screentime** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-13

### Added
- **Zero-config catalogs:** Movies and TV series via Cinemeta, Anime via AniList + Fribb ID mapping, and airing-today schedule via TVmaze.
- **Unified global search:** Parallel search across Movies, TV Series, and Anime (`TMDB`/`Cinemeta` + `AniList`).
- **Torrent streaming & on-the-fly conversion:** BitTorrent swarm engine with head/tail piece prioritization (`moov` atom first), HTTP range serving, `ffprobe` codec inspection, and on-the-fly `ffmpeg` remuxing/transcoding to fragmented MP4 (`fMP4`).
- **Stream sources:** Built-in Stremio addon aggregation (Torrentio, MediaFusion, custom manifests) plus self-hosted Prowlarr and Jackett Torznab integration.
- **Live TV:** Free-TV/IPTV + curated international live channels with batch on-air verification (`/api/live/status`) and automatic CORS HLS playlist/segment relay (`/api/live/proxy`).
- **Subtitles:** Automatic OpenSubtitles lookup with SRT-to-WebVTT conversion and seek offset synchronization.
- **Docker & healthcheck support:** Standalone Next.js output, multi-stage `Dockerfile`, `compose.yaml`, `/api/health` endpoint, and GHCR multi-arch workflow.

### Security & Reliability
- SSRF protection (`guardedFetch`) across all upstream addon, indexer, live TV, and subtitle endpoints with bounded response readers (`readBoundedText`).
- Canonical 40-char `infoHash` swarm keying (supporting both hex and base32 magnets), immediate episode `fileIndex` selection for season packs, and automatic temp cache cleanup.
- Reverse-proxy loopback port resolution (`SCREENTIME_INTERNAL_PORT` / `PORT`) for `ffmpeg` and `ffprobe`.
