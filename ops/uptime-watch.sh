#!/usr/bin/env sh
set -eu

FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-https://star-sign.pl}"
API_BASE_URL="${API_BASE_URL:-https://api.star-sign.pl/api}"
OPS_ALERT_WEBHOOK_URL="${OPS_ALERT_WEBHOOK_URL:-}"
UPTIME_STATE_FILE="${UPTIME_STATE_FILE:-./artifacts/uptime-watch.state}"
UPTIME_FAILURE_THRESHOLD="${UPTIME_FAILURE_THRESHOLD:-2}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-10}"

FRONTEND_BASE_URL="${FRONTEND_BASE_URL%/}"
API_BASE_URL="${API_BASE_URL%/}"

mkdir -p "$(dirname "$UPTIME_STATE_FILE")"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

check_url() {
  name="$1"
  url="$2"
  status="$(curl -gksS -m "$TIMEOUT_SECONDS" -o /tmp/star-sign-uptime-watch.body -w '%{http_code}' "$url" || true)"

  case "$status" in
    2* | 3*)
      echo "OK   $name $status $url"
      return 0
      ;;
    *)
      echo "FAIL $name $status $url"
      return 1
      ;;
  esac
}

failures=0
failed_checks=""

run_check() {
  name="$1"
  url="$2"
  if ! check_url "$name" "$url"; then
    failures=$((failures + 1))
    failed_checks="${failed_checks}${name} ${url}\n"
  fi
}

run_check "frontend health" "$FRONTEND_BASE_URL/healthz"
run_check "frontend home" "$FRONTEND_BASE_URL/"
run_check "frontend sitemap" "$FRONTEND_BASE_URL/sitemap.xml"
run_check "api ready" "$API_BASE_URL/health/ready"

previous_failures="0"
if [ -f "$UPTIME_STATE_FILE" ]; then
  previous_failures="$(cat "$UPTIME_STATE_FILE" 2>/dev/null || printf '0')"
fi

case "$previous_failures" in
  *[!0-9]* | "")
    previous_failures="0"
    ;;
esac

if [ "$failures" -eq 0 ]; then
  printf '0' > "$UPTIME_STATE_FILE"
  exit 0
fi

consecutive_failures=$((previous_failures + 1))
printf '%s' "$consecutive_failures" > "$UPTIME_STATE_FILE"

if [ "$consecutive_failures" -lt "$UPTIME_FAILURE_THRESHOLD" ]; then
  echo "Failure recorded (${consecutive_failures}/${UPTIME_FAILURE_THRESHOLD}); alert not sent yet."
  exit 1
fi

message="Star Sign uptime check failed ${consecutive_failures} times in a row. Failed checks:\n${failed_checks}"

if [ -z "$OPS_ALERT_WEBHOOK_URL" ]; then
  echo "OPS_ALERT_WEBHOOK_URL is not set; alert payload:"
  printf '%b\n' "$message"
  exit 1
fi

payload="{\"text\":\"$(json_escape "$(printf '%b' "$message")")\"}"
curl -gksS -m "$TIMEOUT_SECONDS" \
  -H 'Content-Type: application/json' \
  -d "$payload" \
  "$OPS_ALERT_WEBHOOK_URL" >/dev/null

echo "Alert sent."
exit 1
