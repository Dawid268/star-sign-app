#!/usr/bin/env sh
set -eu

BACKUP_FILE="${1:-${BACKUP_FILE:-}}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
RESTORE_TEST_DB="${RESTORE_TEST_DB:-star_sign_restore_test}"

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: BACKUP_FILE=./backups/postgres/star-sign-YYYY.dump $0" >&2
  echo "   or: $0 ./backups/postgres/star-sign-YYYY.dump" >&2
  exit 2
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 2
fi

SHA_FILE="${BACKUP_FILE}.sha256"
if [ -f "$SHA_FILE" ]; then
  (
    cd "$(dirname "$BACKUP_FILE")"
    sha256sum -c "$(basename "$SHA_FILE")"
  )
else
  echo "Warning: checksum file not found: $SHA_FILE" >&2
fi

docker compose exec -T "$POSTGRES_SERVICE" pg_restore --list < "$BACKUP_FILE" >/dev/null

RESTORE_CONFIRM=restore-star-sign \
RESTORE_MODE=test \
RESTORE_TEST_DB="$RESTORE_TEST_DB" \
POSTGRES_SERVICE="$POSTGRES_SERVICE" \
POSTGRES_USER="$POSTGRES_USER" \
POSTGRES_DB="$POSTGRES_DB" \
  "$(dirname "$0")/restore-postgres.sh" "$BACKUP_FILE"

echo "Backup verification completed: ${BACKUP_FILE}"
