#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BASENAME="star-sign-${TIMESTAMP}.dump"
TMP_FILE="${BACKUP_DIR}/.${BASENAME}.tmp"
BACKUP_FILE="${BACKUP_DIR}/${BASENAME}"

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

docker compose exec -T "$POSTGRES_SERVICE" pg_dump \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  > "$TMP_FILE"

chmod 600 "$TMP_FILE"
mv "$TMP_FILE" "$BACKUP_FILE"

(
  cd "$BACKUP_DIR"
  sha256sum "$BASENAME" > "${BASENAME}.sha256"
  chmod 600 "${BASENAME}.sha256"
)

find "$BACKUP_DIR" -type f \( -name 'star-sign-*.dump' -o -name 'star-sign-*.dump.sha256' \) -mtime +"$BACKUP_RETENTION_DAYS" -delete

echo "Backup written: ${BACKUP_FILE}"
