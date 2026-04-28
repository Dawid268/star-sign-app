#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  > "${BACKUP_DIR}/star-sign-${TIMESTAMP}.dump"

find "$BACKUP_DIR" -type f -name 'star-sign-*.dump' -mtime +14 -delete
