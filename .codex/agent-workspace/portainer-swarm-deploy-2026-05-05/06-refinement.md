# Refinement

## Uzgodniony zakres MVP

- Dodać production workflow dla `main`.
- Uporządkować CI branch/PR.
- Dodać Portainer Swarm stack template.
- Dodać dokumentację operacyjną i wymagane sekrety.
- Dostosować predeploy/env guard do stacka bez Bugsink i z Redis password.

## Kryteria akceptacji

- CI uruchamia się dla każdego brancha i PR.
- Main workflow buduje i publikuje oba obrazy do GHCR.
- Portainer stack nie ma Caddy, Bugsink, Mailpit ani Stripe CLI.
- Stack nie montuje trwałego wolumenu `uploads`.
- Resource limits odpowiadają VPS 2 vCPU / 4 GB.
- Walidacje lokalne przechodzą składniowo bez realnych sekretów.

## Polska konkluzja

Implementacja ma dostarczyć gotowy szablon deployu i workflow. Rzeczywiste wartości sekretów i pierwsze uruchomienie Portainera zostają operacją ręczną na VPS/GitHub.
