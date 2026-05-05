# Test plan

## Walidacja

- `rtk git status --short` po usunięciu, żeby potwierdzić zakres zmian.
- `rtk git diff --check`, żeby potwierdzić brak problemów whitespace.
- `rtk git diff --cached --check`, żeby potwierdzić brak problemów whitespace w indeksie, jeśli narzędzia git coś zstage'ują.
- `rtk npm exec -- nx run ai-content-orchestrator:lint --outputStyle=static`, żeby sprawdzić, że cleanup dokumentów i cache nie pogorszył pluginu.

## Polska konkluzja

Nie ma potrzeby pełnego builda dla usunięcia nieużywanych Markdownów i ignorowanego `.tmp`, ale warto utrzymać szybki gate na pluginie, który był ostatnio dotykany.
