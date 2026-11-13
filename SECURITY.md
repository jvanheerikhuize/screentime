# Security

## Intended use

screentime is built to run on a trusted home network. It has **no login**, so:

- Don't expose it to the internet as is (no port forwarding to it). If you need remote access, put it behind a VPN such as WireGuard or Tailscale, or behind a reverse proxy that adds authentication.
- Anyone who can reach it can use it, including starting torrent downloads on the machine it runs on.

## What the server protects against

Several features make the server fetch addresses that come from the browser: stream addons, Prowlarr/Jackett, direct streams and live channels. To keep them from being used to reach other machines on your network:

- **Stream addons and direct streams** (including those converted with ffmpeg) must be on the public internet. A hostname is checked against every address it resolves to. Addons on your own network are allowed only with `SCREENTIME_ALLOW_PRIVATE_ADDONS=1`.
- **Prowlarr and Jackett** may be on your network, but link-local and cloud-metadata addresses (`169.254.x.x` and the like) are always refused. Only their fixed search and status API paths are called, and responses are never passed back raw.
- **Redirects** are followed one hop at a time, and every hop is checked again.
- **The live TV relay** only relays hosts from the channel list (and the playlists they link to), never arbitrary URLs.
- **Subtitles** are only fetched from the OpenSubtitles addon.
- **API keys** for Prowlarr and Jackett are sent to the server in request headers, so they don't end up in URLs or request logs. They are stored in the browser's local storage.

## Known limits

- ffmpeg follows redirects itself, so a public direct-stream URL that redirects into your network isn't fully covered.
- DNS answers can change between the check and the request (DNS rebinding).
- The Prowlarr/Jackett "Test connection" button reveals whether an address on your network answers.

These are acceptable on a home network, but are further reasons not to expose the app publicly.

## Reporting a vulnerability

Please report security issues privately through GitHub: **Security → Report a vulnerability** on this repository. Don't open a public issue. You'll get a reply as soon as possible.
