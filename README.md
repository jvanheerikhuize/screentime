# screentime

A self-hosted streaming dashboard for your home network. Browse movies, series and anime from free, open catalogs, watch free-to-air live TV, and stream torrents straight in the browser, with formats the browser can't play converted on the fly.

No accounts or API keys are needed: every built-in source is free and open.

## Features

- **Movies and series** from [Cinemeta](https://v3-cinemeta.strem.io), with genre and year filters and full episode lists. [TMDB](https://www.themoviedb.org/) is used too when you add a free API key.
- **Anime** from [AniList](https://anilist.co): trending, this season, all-time popular and top rated. Ids are mapped to Kitsu and IMDb so episodes and subtitles can be found.
- **Live TV:** about 1,700 free-to-air channels from the [Free-TV](https://github.com/Free-TV/IPTV) project, with search and a country picker. Channels that aren't on air are hidden. A small relay plays channels whose servers block browser playback.
- **What's on:** a "New episodes today" row and series status ("Returning series · next episode Friday") from [TVmaze](https://www.tvmaze.com).
- **Torrent streaming:**
  - Sources come from Stremio addons ([Torrentio](https://torrentio.strem.fun) and MediaFusion by default; add your own), and optionally from your own Prowlarr or Jackett.
  - Playback starts after a short pre-buffer, and you can seek.
  - The player switches to the next source if one fails.
  - It announces to an up-to-date list of [public trackers](https://github.com/ngosang/trackerslist).
- **Plays almost anything:** MKV, AVI and HEVC files, and audio such as AC3, EAC3 and DTS, are converted to browser-friendly MP4 with ffmpeg as you watch.
- **Subtitles** in your language from OpenSubtitles, turned on automatically.

## Requirements

- **Node.js 22.18 or newer**
- **ffmpeg and ffprobe** on your `PATH`. On Debian or Ubuntu: `sudo apt install ffmpeg`. On macOS: `brew install ffmpeg`.

## Getting started

```bash
git clone https://github.com/jvanheerikhuize/screentime.git
cd screentime
npm install
npm run dev
```

Open http://localhost:3000.

### Use it from other devices

The server listens on all network interfaces, so another device on your network can open `http://<this-machine's-ip>:3000`, e.g. `http://192.168.1.20:3000`. The dev server accepts private-network addresses and `.local` / `.lan` names. Your firewall must allow incoming connections on the port.

For everyday use, run the production build. It's faster and doesn't reload when files change:

```bash
npm run build
npm start            # or: npm start -- -p 8080
```

## Configuration

Everything works without configuration. Optional settings go in `.env.local` (see [`.env.example`](.env.example)):

| Variable | What it does |
| --- | --- |
| `TMDB_API_KEY` | Adds TMDB metadata and trending lists ([free key](https://www.themoviedb.org/settings/api)). |
| `PROWLARR_URL`, `PROWLARR_API_KEY` | Searches your Prowlarr instance for every title. |
| `JACKETT_URL`, `JACKETT_API_KEY` | Searches your Jackett instance for every title. |
| `SCREENTIME_ALLOW_PRIVATE_ADDONS` | Set to `1` to allow stream addons hosted on your own network. |

In the app, **Settings** (the sliders icon) shows the built-in sources. You can also use it to:
- manage stream addons;
- connect Prowlarr or Jackett per browser;
- pick a subtitle language.

## Development

```bash
npm run dev         # dev server with hot reload
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # unit tests (Node's built-in test runner)
npm run build       # production build
```

The project uses Next.js 16 (App Router), React 19 and Tailwind CSS 4. Here is where things live:

```
src/app/            pages and API routes (/api/media, /api/stream, /api/live, ...)
src/components/     UI: catalog browser, detail dialog, player, live TV, settings
src/lib/metadata/   Cinemeta, TMDB, AniList and TVmaze clients
src/lib/scrapers/   Stremio addons and Prowlarr/Jackett search
src/lib/streaming/  torrent engine, trackers, ffmpeg probing and conversion
src/lib/channels/   curated and Free-TV live channels
src/lib/net/        checks for requests to user-supplied addresses
tests/              unit tests
```

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

screentime is meant for a trusted home network. It has no login, so don't expose it to the internet as is. See [SECURITY.md](SECURITY.md).

## Disclaimer

screentime doesn't host or provide any media. It shows what public catalogs, addons and channel lists return, and streams torrents through the BitTorrent network. You are responsible for what you watch and download, and for following the copyright laws where you live.

## License

[MIT](LICENSE): free to use, change and share.
