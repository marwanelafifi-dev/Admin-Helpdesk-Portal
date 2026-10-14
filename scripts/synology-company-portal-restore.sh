#!/usr/bin/env bash
# Ubuntu host restore worker. It is intentionally separate from the portal
# container: the browser can only queue a restore request; this root-owned
# service validates the NAS artifacts and controls Docker locally.
set -euo pipefail

APP_DATA_PATH="${APP_DATA_PATH:-/opt/company-portal/data}"
NAS_MOUNT="${NAS_MOUNT:-/mnt/company-portal-synology}"
DEFAULT_DESTINATION="${DEFAULT_DESTINATION:-$NAS_MOUNT/Company Portal}"
DB_CONTAINER="${DB_CONTAINER:-company-portal-db}"
APP_CONTAINER="${APP_CONTAINER:-company-portal-app}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-/usr/local/sbin/company-portal-synology-backup}"
CONFIG_FILE="$APP_DATA_PATH/synology-backup.json"
HISTORY_FILE="$APP_DATA_PATH/synology-backup-history.json"
REQUEST_FILE="$APP_DATA_PATH/synology-restore-request.json"
STATUS_FILE="$APP_DATA_PATH/synology-restore-status.json"
LOCK_FILE="${LOCK_FILE:-/run/company-portal-synology-recovery.lock}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }; }
require docker
require jq
require gzip
require tar
require rsync
require sha256sum
require realpath
require flock

[[ -f "$REQUEST_FILE" ]] || exit 0
[[ -d "$APP_DATA_PATH" ]] || { echo "Portal data folder not found: $APP_DATA_PATH" >&2; exit 1; }
mountpoint -q "$NAS_MOUNT" || { echo "Synology share is not mounted at $NAS_MOUNT" >&2; exit 1; }
[[ -x "$BACKUP_SCRIPT" ]] || { echo "Backup script is unavailable: $BACKUP_SCRIPT" >&2; exit 1; }

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Another Company Portal recovery operation is running; restore remains queued."; exit 0; }

write_status() {
  local state="$1" message="$2" safety_manifest="${3:-}" source temporary owner
  source="$STATUS_FILE"; [[ -f "$source" ]] || source="$REQUEST_FILE"
  temporary="$(mktemp "${STATUS_FILE}.tmp.XXXXXX")"
  jq --arg state "$state" --arg message "$message" --arg at "$(date --iso-8601=seconds)" --arg safety "$safety_manifest" \
    '.status = $state | .message = $message | .safetyBackupManifest = (if $safety == "" then (.safetyBackupManifest // null) else $safety end) | .startedAt = (if $state == "creating_safety_backup" and (.startedAt == null) then $at else .startedAt end) | .completedAt = (if ($state == "succeeded" or $state == "failed") then $at else null end)' \
    "$source" > "$temporary"
  owner="$source"
  chown --reference="$owner" "$temporary" 2>/dev/null || true
  chmod --reference="$owner" "$temporary" 2>/dev/null || true
  mv "$temporary" "$STATUS_FILE"
}

fail_before_change() {
  write_status "failed" "$1"
  rm -f "$REQUEST_FILE"
  echo "$1" >&2
  exit 1
}

path_within() {
  local candidate root
  candidate="$(realpath -e "$1")" || return 1
  root="$(realpath -e "$2")" || return 1
  [[ "$candidate" == "$root/"* ]]
}

safe_file() {
  local file="$1" root="$2"
  [[ -f "$file" ]] && path_within "$file" "$root"
}

config_value() { jq -r "$1 // empty" "$CONFIG_FILE" 2>/dev/null || true; }
destination="$DEFAULT_DESTINATION"
if [[ -f "$CONFIG_FILE" ]]; then
  configured_destination="$(config_value '.nasRoot')"
  if [[ "$configured_destination" == "$NAS_MOUNT"/* || "$configured_destination" == "$NAS_MOUNT" ]]; then
    destination="$configured_destination"
  fi
fi
[[ "$destination" == "$NAS_MOUNT"/* || "$destination" == "$NAS_MOUNT" ]] || fail_before_change "Synology destination is outside the protected mount."

request_id="$(jq -er '.id | strings | select(test("^[A-Fa-f0-9-]{16,80}$"))' "$REQUEST_FILE")" || fail_before_change "Restore request is malformed."
target_manifest="$(jq -er '.targetManifest | strings' "$REQUEST_FILE")" || fail_before_change "Restore request has no target manifest."
safe_file "$target_manifest" "$destination/manifests" || fail_before_change "Selected manifest is outside the verified Synology manifest folder."

read_artifacts() {
  local manifest="$1" prefix="$2" dump_var archive_var
  jq -e '.version >= 3 and .verified == true and (.postgresDump | type == "string") and (.dataArchive | type == "string") and (.postgresDumpSha256 | test("^[A-Fa-fA-F0-9]{64}$")) and (.dataArchiveSha256 | test("^[A-Fa-fA-F0-9]{64}$")) and (.postgresDumpBytes | type == "number" and . > 0) and (.dataArchiveBytes | type == "number" and . > 0)' "$manifest" >/dev/null || return 1
  printf -v "${prefix}_dump" '%s' "$(jq -r '.postgresDump' "$manifest")"
  printf -v "${prefix}_dump_sha" '%s' "$(jq -r '.postgresDumpSha256' "$manifest")"
  printf -v "${prefix}_dump_bytes" '%s' "$(jq -r '.postgresDumpBytes' "$manifest")"
  printf -v "${prefix}_archive" '%s' "$(jq -r '.dataArchive' "$manifest")"
  printf -v "${prefix}_archive_sha" '%s' "$(jq -r '.dataArchiveSha256' "$manifest")"
  printf -v "${prefix}_archive_bytes" '%s' "$(jq -r '.dataArchiveBytes' "$manifest")"
  dump_var="${prefix}_dump"
  archive_var="${prefix}_archive"
  safe_file "${!dump_var}" "$destination/postgres" && safe_file "${!archive_var}" "$destination/data-archives"
}

verify_artifacts() {
  local prefix="$1" dump archive dump_var archive_var dump_bytes_var archive_bytes_var dump_sha_var archive_sha_var
  dump_var="${prefix}_dump"; archive_var="${prefix}_archive"
  dump_bytes_var="${prefix}_dump_bytes"; archive_bytes_var="${prefix}_archive_bytes"
  dump_sha_var="${prefix}_dump_sha"; archive_sha_var="${prefix}_archive_sha"
  dump="${!dump_var}"; archive="${!archive_var}"
  [[ "$(stat -c '%s' "$dump")" == "${!dump_bytes_var}" ]] || return 1
  [[ "$(stat -c '%s' "$archive")" == "${!archive_bytes_var}" ]] || return 1
  [[ "$(sha256sum "$dump" | awk '{print $1}')" == "${!dump_sha_var}" ]] || return 1
  [[ "$(sha256sum "$archive" | awk '{print $1}')" == "${!archive_sha_var}" ]] || return 1
  gzip -t "$dump" && gzip -t "$archive" && archive_paths_safe "$archive"
}

archive_paths_safe() {
  local archive="$1"
  tar -tzf "$archive" | awk '
    /^\// || /(^|\/)\.\.([\/]|$)/ { unsafe = 1 }
    END { exit unsafe ? 1 : 0 }
  '
}

read_artifacts "$target_manifest" target || fail_before_change "Selected backup is not a complete v3 verified recovery point."
verify_artifacts target || fail_before_change "Selected Synology backup failed integrity verification; no live data was changed."

write_status "creating_safety_backup" "Creating and verifying a fresh Synology safety backup before restoring any live data."
# Do not prune during this safety run: an entry still advertised to the user
# must not disappear between selection and restore. The ordinary timer prunes
# later according to the configured retention policy.
if ! FORCE_BACKUP=1 SCHEDULED_INVOCATION=0 SKIP_PRUNE=1 LOCK_HELD=1 "$BACKUP_SCRIPT"; then
  fail_before_change "Fresh Synology safety backup failed; the requested restore was not started."
fi
pre_manifest="$(jq -er '.entries[0].manifest | strings' "$HISTORY_FILE" 2>/dev/null || true)"
safe_file "$pre_manifest" "$destination/manifests" || fail_before_change "Fresh safety backup completed but its verified manifest could not be found."
read_artifacts "$pre_manifest" pre || fail_before_change "Fresh safety backup is not a complete recovery point."
verify_artifacts pre || fail_before_change "Fresh safety backup did not pass integrity verification."

write_status "validating" "Fresh safety backup verified. Validating the selected recovery version." "$pre_manifest"
verify_artifacts target || fail_before_change "Selected backup changed or failed validation after the safety backup; no live data was changed."

restore_stage=""
app_was_running=false
if [[ "$(docker inspect -f '{{.State.Running}}' "$APP_CONTAINER" 2>/dev/null || true)" == "true" ]]; then app_was_running=true; fi

cleanup() { [[ -n "$restore_stage" && -d "$restore_stage" ]] && rm -rf "$restore_stage"; }
trap cleanup EXIT

restore_data() {
  local archive="$1"
  [[ -z "$restore_stage" || ! -d "$restore_stage" ]] || rm -rf "$restore_stage"
  archive_paths_safe "$archive" || return 1
  restore_stage="$(mktemp -d "${APP_DATA_PATH}.restore.XXXXXX")"
  tar --no-same-owner -xzf "$archive" -C "$restore_stage" || return 1
  rsync -a --delete \
    --exclude 'synology-backup.json' \
    --exclude 'synology-backup-history.json' \
    --exclude 'synology-restore-request.json' \
    --exclude 'synology-restore-status.json' \
    --exclude 'synology-staging' \
    --exclude 'backups/' \
    --exclude '*.partial' \
    "$restore_stage/" "$APP_DATA_PATH/"
  rm -rf "$restore_stage"; restore_stage=""
}

restore_database() {
  local dump="$1"
  docker exec "$DB_CONTAINER" sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"' \
    && gzip -cd "$dump" | docker exec -i "$DB_CONTAINER" sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

wait_for_app_health() {
  local attempts=24
  while (( attempts > 0 )); do
    [[ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$APP_CONTAINER" 2>/dev/null || true)" == "healthy" ]] && return 0
    sleep 5
    ((attempts--))
  done
  return 1
}

rollback() {
  local reason="$1"
  write_status "restoring" "Restore did not complete; automatically returning to the fresh safety backup." "$pre_manifest"
  docker stop -t 60 "$APP_CONTAINER" >/dev/null 2>&1 || true
  if ! restore_data "$pre_archive" || ! restore_database "$pre_dump"; then
    write_status "failed" "Restore failed and automatic rollback also failed. Do not use the portal; restore the safety manifest manually: $pre_manifest" "$pre_manifest"
    rm -f "$REQUEST_FILE"
    exit 1
  fi
  if [[ "$app_was_running" == true ]]; then
    docker start "$APP_CONTAINER" >/dev/null
    if ! wait_for_app_health; then
      write_status "failed" "Restore failed. The safety backup was restored, but the application did not become healthy; investigate before use. Safety manifest: $pre_manifest" "$pre_manifest"
      rm -f "$REQUEST_FILE"
      exit 1
    fi
  fi
  write_status "failed" "Restore failed: $reason. The fresh safety backup was restored and verified." "$pre_manifest"
  rm -f "$REQUEST_FILE"
  exit 1
}

write_status "restoring" "Restoring the selected verified portal data and PostgreSQL version. The portal is temporarily offline." "$pre_manifest"
if [[ "$app_was_running" == true ]] && ! docker stop -t 60 "$APP_CONTAINER" >/dev/null; then rollback "Could not stop the portal application cleanly."; fi
if ! restore_data "$target_archive"; then rollback "Could not restore the selected portal-data archive."; fi
if ! restore_database "$target_dump"; then rollback "Could not restore the selected PostgreSQL dump."; fi

if [[ "$app_was_running" == true ]]; then
  docker start "$APP_CONTAINER" >/dev/null || rollback "Could not restart the portal application."
  write_status "verifying" "Selected version restored. Waiting for the portal health check." "$pre_manifest"
  wait_for_app_health || rollback "Portal health check did not succeed after restore."
fi

write_status "succeeded" "Restore completed successfully. A fresh verified safety backup was created first." "$pre_manifest"
rm -f "$REQUEST_FILE"
echo "Synology recovery restore completed successfully: $target_manifest"
