# Architecture Analysis

## Decyzja architektoniczna

Produkcyjny Portainer stack powinien być osobny od lokalnego `docker-compose.yml`. Stack Swarm używa Traefika, nie Caddy, i nie zawiera Bugsink.

## Topologia

- `frontend`: Angular SSR, publicznie przez Traefik, port wewnętrzny `4000`.
- `api`: Strapi, publicznie przez Traefik dla `/api` i `API_DOMAIN`, port `1337`.
- `postgres`: tylko sieć wewnętrzna.
- `redis`: tylko sieć wewnętrzna, z hasłem i limitem pamięci.
- `star_sign_backend`: wewnętrzna overlay network.
- `traefik-public`: zewnętrzna sieć Traefika.

## Media

Źródłem prawdy dla uploadów jest Cloudflare R2. Lokalny system plików API nie ma trwałego wolumenu `public/uploads`; może służyć tylko do plików tymczasowych.

## Polska konkluzja

Architektura rozdziela runtime, routing i dane. To pasuje do współdzielonego VPS i Portainera, a jednocześnie zostawia prosty rollback przez tag obrazu.
