#!/usr/bin/env bash
# Ubuntu host backup worker for the Company Portal. Installed by
# install-synology-backup-ubuntu.sh and invoked by a systemd timer.
set -euo pipefail

APP_DATA_PATH="${APP_DATA_PATH:-/opt/company-portal/data}"
NAS_MOUNT="${NAS_MOUNT:-/mnt/company-portal-synology}"
DEFAULT_DESTINATION="${DEFAULT_DESTINATION:-$NAS_MOUNT/Company Portal}"
DB_CONTAINER="${DB_CONTAINER:-company-portal-db}"
CONFIG_FILE="$APP_DATA_PATH/synology-backup.json"
SCHEDULED_INVOCATION="${SCHEDULED_INVOCATION:-1}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }; }
require docker
require jq
require rsync
require gzip

if [[ ! -d "$APP_DATA_PATH" ]]; then
  echo "Portal data folder not found: $APP_DATA_PATH" >&2
  exit 1
fi
if ! mountpoint -q "$NAS_MOUNT"; then
  echo "Synology share is not mounted at $NAS_MOUNT" >&2
  exit 1
fi

config_value() { jq -r "$1 // empty" "$CONFIG_FILE" 2>/dev/null || true; }
write_state() {
  local filter="$1" temp
  [[ -f "$CONFIG_FILE" ]] || return 0
  temp="$(mktemp "${CONFIG_FILE}.tmp.XXXXXX")"
  jq "$filter" "$CONFIG_FILE" > "$temp"
  mv "$temp" "$CONFIG_FILE"
}

enabled="true"
schedule_time="02:30"
retention_days="365"
prune_old="true"
destination="$DEFAULT_DESTINATION"
requested_at=""
last_handled=""

if [[ -f "$CONFIG_FILE" ]]; then
  enabled="$(config_value '.enabled')"; [[ -n "$enabled" ]] || enabled=true
  schedule_time="$(config_value '.scheduleTime')"; [[ "$schedule_time" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]] || schedule_time=02:30
  retention_days="$(config_value '.retentionDays')"; [[ "$retention_days" =~ ^[0-9]+$ ]] || retention_days=365
  prune_old="$(config_value '.pruneOldBackups')"; [[ -n "$prune_old" ]] || prune_old=true
  requested_at="$(config_value '.runRequestedAt')"
  last_handled="$(config_value '.lastRequestHandledAt')"
  configured_destination="$(config_value '.nasRoot')"
  # Linux accepts only the local mount path. A legacy Windows UNC value safely
  # falls back to the standard mounted Company Portal folder.
  if [[ "$configured_destination" == "$NAS_MOUNT"/* || "$configured_destination" == "$NAS_MOUNT" ]]; then
    destination="$configured_destination"
  fi
fi

[[ "$enabled" == "true" ]] || exit 0
pending_request=false
[[ -n "$requested_at" && "$requested_at" != "$last_handled" ]] && pending_request=true
if [[ "$SCHEDULED_INVOCATION" == "1" && "$pending_request" == false && "$(date +%H:%M)" != "$schedule_time" ]]; then
  exit 0
fi

now_iso="$(date --iso-8601=seconds)"
write_state ".lastStartedAt = \"$now_iso\""
stage="$(mktemp -d)"
dump_file="company-portal-$(date +%Y%m%d-%H%M%S).sql.gz"
container_dump="/tmp/$dump_file"

cleanup() {
  docker exec "$DB_CONTAINER" rm -f "$container_dump" >/dev/null 2>&1 || true
  rm -rf "$stage"
}
trap cleanup EXIT

fail() {
  local message="$1" escaped
  escaped="$(printf '%s' "$message" | jq -Rs .)"
  if [[ -n "$requested_at" ]]; then write_state ".lastRequestHandledAt = \"$requested_at\""; fi
  write_state ".lastFailureAt = \"$(date --iso-8601=seconds)\" | .lastFailureMessage = $escaped"
  echo "$message" >&2
  exit 1
}

[[ "$destination" == "$NAS_MOUNT"/* || "$destination" == "$NAS_MOUNT" ]] || fail "Synology destination must be below $NAS_MOUNT"
mkdir -p "$destination/data" "$destination/postgres" "$destination/manifests" || fail "Cannot create Synology recovery folders"

docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip -c > "$1"' sh "$container_dump" || fail "PostgreSQL logical dump failed"
docker cp "$DB_CONTAINER:$container_dump" "$stage/$dump_file" || fail "Could not copy PostgreSQL dump from container"

# Never use --delete: the NAS keeps the last known copy of portal files even
# when a local file is accidentally removed.
rsync -a --exclude 'synology-staging' "$APP_DATA_PATH/" "$destination/data/" || fail "Portal data sync failed"
cp "$stage/$dump_file" "$destination/postgres/$dump_file" || fail "Could not write PostgreSQL dump to Synology"

jq -n --arg at "$(date --iso-8601=seconds)" --arg data "$destination/data" --arg dump "$destination/postgres/$dump_file" \
  '{createdAt:$at,appDataDestination:$data,postgresDump:$dump,note:"Portal data copied without deletion mirroring; PostgreSQL is a gzip-compressed logical pg_dump."}' \
  > "$destination/manifests/backup-$(date +%Y%m%d-%H%M%S).json"

if [[ "$prune_old" == "true" ]]; then
  find "$destination/postgres" -type f -name 'company-portal-*.sql.gz' -mtime "+$retention_days" -delete
  find "$destination/manifests" -type f -name 'backup-*.json' -mtime "+$retention_days" -delete
fi

if [[ -n "$requested_at" ]]; then write_state ".lastRequestHandledAt = \"$requested_at\""; fi
write_state ".lastSuccessAt = \"$(date --iso-8601=seconds)\" | .lastFailureAt = null | .lastFailureMessage = null | .lastPostgresDump = \"$destination/postgres/$dump_file\""
echo "Synology recovery backup completed: $destination"
