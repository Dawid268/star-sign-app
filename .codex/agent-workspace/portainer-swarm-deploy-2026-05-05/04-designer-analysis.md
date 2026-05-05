# Designer Analysis

## UX deployu

Zmiana jest infrastrukturalna, ale wpływa na UX przez dostępność SSR frontendu i media z CDN. Frontend musi pozostać osobnym procesem Node, bo aktualny build jest SSR.

## Stany do walidacji po deployu

- Home, blog, premium, horoskopy i tarot renderują się przez SSR.
- Media z `cdn.star-sign.pl` są widoczne.
- Maintenance mode nadal przykrywa publiczne strony, jeśli zostanie włączony.
- Mobile navigation działa po deployu.

## Polska konkluzja

Nie należy zamieniać frontendu na statyczny hosting w tym etapie. Kontener SSR daje najmniejsze ryzyko regresji SEO i renderowania.
