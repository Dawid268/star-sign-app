#!/usr/bin/env sh
set -eu

BACKUP_FILE="${1:-${BACKUP_FILE:-}}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
RESTORE_MODE="${RESTORE_MODE:-test}"
RESTORE_TEST_DB="${RESTORE_TEST_DB:-star_sign_restore_test}"
RESTORE_TARGET_DB="${RESTORE_TARGET_DB:-${RESTORE_TEST_DB}}"

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: BACKUP_FILE=./backups/postgres/star-sign-YYYY.dump RESTORE_CONFIRM=restore-star-sign $0" >&2
  echo "   or: RESTORE_CONFIRM=restore-star-sign $0 ./backups/postgres/star-sign-YYYY.dump" >&2
  exit 2
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 2
fi

if [ "${RESTORE_CONFIRM:-}" != "restore-star-sign" ]; then
  echo "Refusing restore: set RESTORE_CONFIRM=restore-star-sign." >&2
  exit 2
fi

case "$RESTORE_MODE" in
  test)
    RESTORE_TARGET_DB="$RESTORE_TEST_DB"
    ;;
  production)
    RESTORE_TARGET_DB="${RESTORE_TARGET_DB:-$POSTGRES_DB}"
    if [ "${RESTORE_PRODUCTION:-}" != "true" ]; then
      echo "Refusing production restore: set RESTORE_PRODUCTION=true." >&2
      exit 2
    fi
    ;;
  *)
    echo "RESTORE_MODE must be test or production." >&2
    exit 2
    ;;
esac

case "$RESTORE_TARGET_DB" in
  *[!A-Za-z0-9_]* | "")
    echo "RESTORE_TARGET_DB may contain only letters, digits and underscores." >&2
    exit 2
    ;;
esac

if [ "$RESTORE_MODE" = "test" ] && [ "$RESTORE_TARGET_DB" = "$POSTGRES_DB" ]; then
  echo "Refusing test restore into the production database name." >&2
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

if [ "$RESTORE_MODE" = "test" ]; then
  docker compose exec -T "$POSTGRES_SERVICE" psql \
    -U "$POSTGRES_USER" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"$RESTORE_TARGET_DB\" WITH (FORCE);" \
    -c "CREATE DATABASE \"$RESTORE_TARGET_DB\";"
else
  docker compose exec -T "$POSTGRES_SERVICE" psql \
    -U "$POSTGRES_USER" \
    -d postgres \
    -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$RESTORE_TARGET_DB' AND pid <> pg_backend_pid();"
fi

docker compose exec -T "$POSTGRES_SERVICE" pg_restore \
  -U "$POSTGRES_USER" \
  -d "$RESTORE_TARGET_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  < "$BACKUP_FILE"

docker compose exec -T "$POSTGRES_SERVICE" psql \
  -U "$POSTGRES_USER" \
  -d "$RESTORE_TARGET_DB" \
  -v ON_ERROR_STOP=1 \
  -c "select current_database() as restored_database, count(*) as user_tables from information_schema.tables where table_schema = 'public';"

echo "Restore completed into database: ${RESTORE_TARGET_DB}"
