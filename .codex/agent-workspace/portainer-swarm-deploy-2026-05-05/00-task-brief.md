# Task Brief

## Cel

Wdrożyć produkcyjny model CI/CD i Portainer Swarm deploy dla Star Sign na VPS 2 vCPU / 4 GB.

## Zakres

- Dwa obrazy z jednego monorepo Nx: API i frontend SSR.
- Deploy przez GHCR + Portainer webhook.
- Produkcyjny stack Swarm za Traefikiem, bez Caddy i bez Bugsink.
- Media w Cloudflare R2, bez trwałego lokalnego wolumenu `uploads`.
- Zasoby ograniczone pod współdzielony VPS.

## Poza zakresem

- Realny deploy na VPS.
- Konfiguracja sekretów w Portainerze/GitHub.
- Osobny stack Bugsink.
- Live testy produkcji bez jawnej zgody.
