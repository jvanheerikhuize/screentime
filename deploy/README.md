# Self-Hosted Ecosystem Templates

Ready-to-use deployment templates and dashboard integrations for **Lumen**:

- **CasaOS / ZimaOS:** Import [`deploy/casaos/docker-compose.yml`](casaos/docker-compose.yml) via **App Store → Custom Install → Import**.
- **Unraid:** Place [`deploy/unraid/lumen.xml`](unraid/lumen.xml) in `/boot/config/plugins/dockerMan/templates-user/` (or map `ghcr.io/jvanheerikhuize/lumen:latest` on port `3000` with `/app/data`).
- **Homepage (`services.yaml`) Widget:**

```yaml
- Media:
    - Lumen:
        href: http://lumen.local:3000
        description: Movies, Series, Anime & Live TV
        widget:
          type: customapi
          url: http://lumen.local:3000/api/health
          mappings:
            - field: status
              label: Status
            - field: ffmpeg
              label: FFmpeg
```
