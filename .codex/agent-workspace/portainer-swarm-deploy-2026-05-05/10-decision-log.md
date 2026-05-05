# Decision Log

## Decision: Osobny Portainer Swarm stack bez Caddy i Bugsink

Date: 2026-05-05
Agents involved: PO, Virtual User, Designer, Architect, Developer, QA

### Context

VPS ma już Traefik load balancer i kilka usług. Star Sign ma działać za Traefikiem, a Bugsink zostanie wdrożony później jako osobny stack.

### Decision

Dodać osobny stack `ops/portainer/star-sign-production-stack.yml`, bez Caddy, Bugsink, Mailpit i Stripe CLI.

### Alternatives considered

- Reużyć lokalny `docker-compose.yml` z Caddy.
- Dodać Bugsink do tego samego stacka.
- Deployować frontend poza Dockerem.

### Rationale

Traefik już pełni funkcję edge. Oddzielny stack ogranicza zasoby na VPS i pasuje do Portainera/Swarm. Frontend SSR w kontenerze jest najprostszy operacyjnie.

### Consequences

Trzeba utrzymywać osobny stack template dla Portainera, ale produkcja nie miesza się z lokalnym compose i nie dubluje reverse proxy.

### Polish summary

Produkcja Star Sign dostaje własny stack Swarm za Traefikiem, bez Caddy i bez Bugsink w tej fazie.

## Decision: Trivy scan jako report-only w pierwszym rollout

Date: 2026-05-05
Agents involved: Architect, DevOps, QA

### Context

DevOps workflow powinien skanować obrazy kontenerów, ale obecny projekt ma jeszcze jawnie sklasyfikowane zależności Strapi low/moderate i nie ma historii skanów OS image dla `node:20-bookworm-slim`.

### Decision

Dodać Trivy scan dla API i frontendu po pushu do GHCR, ale z `continue-on-error: true`.

### Alternatives considered

- Brak container scan.
- Twardy fail na high/critical od pierwszego deployu.

### Rationale

Report-only daje widoczność bez przypadkowego zablokowania pierwszego wdrożenia przez CVE wymagające osobnej klasyfikacji.

### Consequences

Po pierwszym raporcie Trivy trzeba zdecydować, czy zmienić scan na twardy gate dla `CRITICAL,HIGH`.

### Polish summary

Skan kontenerów jest włączony, ale pierwszy etap nie blokuje deployu automatycznie.

## Decision: Jeden aktywny pipeline per branch i workflow

Date: 2026-05-05
Agents involved: DevOps, QA

### Context

Po merge do `main` kolejne commity uruchamiały nowe runy GitHub Actions, ale starsze runy nie były konsekwentnie anulowane we wszystkich workflowach. Użytkownik wymaga, żeby po nowym pushu do tego samego brancha starsze pipeline'y były anulowane i zastępowane świeżym runem.

### Decision

Dodać albo ujednolicić `concurrency` we wszystkich workflowach GitHub Actions. Dla `push` i `pull_request` używać grupy opartej o nazwę workflow oraz branch (`github.event.pull_request.head.ref || github.ref_name`). Dla workflowów ręcznych i produkcyjnego deployu używać nazwy workflow oraz `github.ref_name`. Wszędzie ustawić `cancel-in-progress: true`.

### Alternatives considered

- Zostawić concurrency tylko w `CI`.
- Użyć jednej globalnej grupy per branch dla wszystkich workflowów.
- Nie anulować produkcyjnego deployu na `main`.

### Rationale

Grupa per workflow i branch anuluje przestarzałe runy danego workflow, ale nie powoduje wzajemnego kasowania niezależnych workflowów, takich jak `CI` i `Secrets Scan`.

### Consequences

Nowy push do feature brancha, PR lub `main` przerwie starszy run tego samego workflow. Jeżeli deployment na `main` jest w toku i pojawi się nowy commit, starszy deployment zostanie anulowany, a aktualny commit przejmie pipeline.

### Polish summary

CI/CD działa w trybie najnowszego commita: dla każdej gałęzi i workflow aktywny zostaje tylko najświeższy run, starsze są anulowane.
