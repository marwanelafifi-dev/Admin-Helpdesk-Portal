#!/usr/bin/env bash
# Ubuntu host backup worker for the Company Portal. Installed by
# install-synology-backup-ubuntu.sh and invoked by a systemd timer.
set -euo pipefail

APP_DATA_PATH="${APP_DATA_PATH:-/opt/company-portal/data}"
NAS_MOUNT="${NAS_MOUNT:-/mnt/company-portal-synology}"
DEFAULT_DESTINATION="${DEFAULT_DESTINATION:-$NAS_MOUNT/Company Portal}"
DB_CONTAINER="${DB_CONTAINER:-company-portal-db}"
APP_CONTAINER="${APP_CONTAINER:-company-portal-app}"
APP_REPO_PATH="${APP_REPO_PATH:-/home/docker-machine/admin-request-platform}"
RECOVERY_KEY_FILE="${RECOVERY_KEY_FILE:-/etc/company-portal/recovery-config.key}"
CONFIG_FILE="$APP_DATA_PATH/synology-backup.json"
HISTORY_FILE="$APP_DATA_PATH/synology-backup-history.json"
HISTORY_LIMIT=50
SCHEDULED_INVOCATION="${SCHEDULED_INVOCATION:-1}"
FORCE_BACKUP="${FORCE_BACKUP:-0}"
SKIP_PRUNE="${SKIP_PRUNE:-0}"
LOCK_FILE="${LOCK_FILE:-/run/company-portal-synology-recovery.lock}"
LOCK_HELD="${LOCK_HELD:-0}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }; }
require docker
require jq
require rsync
require gzip
require sha256sum
require tar
require flock
require realpath
require gpg

# The restore service and timer must never copy or prune the same recovery
# artifacts concurrently. A restore that already owns the lock passes
# LOCK_HELD=1 when it invokes this script for its mandatory safety backup.
if [[ "$LOCK_HELD" != "1" ]]; then
  exec 9>"$LOCK_FILE"
  flock -n 9 || { echo "Another Company Portal Synology recovery operation is running; skipping this timer tick."; exit 0; }
fi

if [[ ! -d "$APP_DATA_PATH" ]]; then
  echo "Portal data folder not found: $APP_DATA_PATH" >&2
  exit 1
fi

# A green backup is useful only when it contains the data volume used by the
# running portal.  The installer writes APP_DATA_PATH from Docker Compose's
# deployment account; keep that assumption verifiable on every run rather
# than silently backing up an old /opt folder after a host reconfiguration.
mounted_data_path="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Source}}{{end}}{{end}}' "$APP_CONTAINER" 2>/dev/null || true)"
if [[ -z "$mounted_data_path" ]]; then
  echo "Could not find the /app/data bind mount for $APP_CONTAINER" >&2
  exit 1
fi
if [[ "$(realpath -e "$APP_DATA_PATH")" != "$(realpath -e "$mounted_data_path")" ]]; then
  echo "APP_DATA_PATH ($APP_DATA_PATH) does not match $APP_CONTAINER's live /app/data mount ($mounted_data_path)" >&2
  exit 1
fi
[[ -d "$APP_REPO_PATH" ]] || { echo "Portal source folder not found: $APP_REPO_PATH" >&2; exit 1; }
[[ -s "$RECOVERY_KEY_FILE" ]] || { echo "Recovery encryption key is missing: $RECOVERY_KEY_FILE" >&2; exit 1; }
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
  # The portal container must keep being able to read this shared status file.
  # mktemp runs as the systemd service user (normally root), so preserve the
  # original ownership and mode instead of turning the file into root:root 0600
  # after the first scheduled Synology run.
  chown --reference="$CONFIG_FILE" "$temp"
  chmod --reference="$CONFIG_FILE" "$temp"
  mv "$temp" "$CONFIG_FILE"
}

# The portal reads this compact local index to display recent *verified* NAS
# backups.  Do not put it on the NAS: the portal container intentionally has
# no NAS credentials or mount.  The index is appended only after the final
# NAS dump has passed gzip verification.
write_history() {
  local entry temp
  [[ -f "$CONFIG_FILE" ]] || return 0
  entry="$(jq -n \
    --arg createdAt "$(date --iso-8601=seconds)" \
    --arg trigger "$1" \
    --arg postgresDump "$nas_dump" \
    --argjson postgresDumpBytes "$(stat -c '%s' "$nas_dump")" \
    --arg postgresDumpSha256 "$(sha256sum "$nas_dump" | awk '{print $1}')" \
    --arg manifest "$manifest_path" \
    --arg appDataDestination "$destination/data" \
    --arg dataArchive "$nas_data_archive" \
    --argjson dataArchiveBytes "$(stat -c '%s' "$nas_data_archive")" \
    --arg dataArchiveSha256 "$(sha256sum "$nas_data_archive" | awk '{print $1}')" \
    --argjson sourceAttachmentCount "$source_attachment_count" \
    --argjson destinationAttachmentCount "$destination_attachment_count" \
    '{createdAt:$createdAt,trigger:$trigger,postgresDump:$postgresDump,postgresDumpBytes:$postgresDumpBytes,postgresDumpSha256:$postgresDumpSha256,manifest:$manifest,appDataDestination:$appDataDestination,dataArchive:$dataArchive,dataArchiveBytes:$dataArchiveBytes,dataArchiveSha256:$dataArchiveSha256,sourceAttachmentCount:$sourceAttachmentCount,destinationAttachmentCount:$destinationAttachmentCount}')"
  temp="$(mktemp "${HISTORY_FILE}.tmp.XXXXXX")"
  if [[ -f "$HISTORY_FILE" ]] && jq -e '.entries | type == "array"' "$HISTORY_FILE" >/dev/null 2>&1; then
    jq --argjson entry "$entry" --argjson limit "$HISTORY_LIMIT" \
      '{version:1,entries:([$entry] + ((.entries // []) | map(select(type == "object"))))[0:$limit]}' \
      "$HISTORY_FILE" > "$temp"
  else
    jq -n --argjson entry "$entry" '{version:1,entries:[$entry]}' > "$temp"
  fi
  chown --reference="$CONFIG_FILE" "$temp"
  chmod --reference="$CONFIG_FILE" "$temp"
  mv "$temp" "$HISTORY_FILE"
}

enabled="true"
schedule_time="02:30"
schedule_frequency="daily"
schedule_weekday="0"
schedule_day="1"
schedule_month="1"
schedule_updated_at=""
last_applied_schedule=""
last_scheduled_period=""
retention_days="365"
prune_old="true"
destination="$DEFAULT_DESTINATION"
requested_at=""
last_handled=""

if [[ -f "$CONFIG_FILE" ]]; then
  enabled="$(config_value '.enabled')"; [[ -n "$enabled" ]] || enabled=true
  schedule_time="$(config_value '.scheduleTime')"; [[ "$schedule_time" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]] || schedule_time=02:30
  schedule_frequency="$(config_value '.scheduleFrequency')"; [[ "$schedule_frequency" =~ ^(daily|weekly|monthly|yearly)$ ]] || schedule_frequency=daily
  schedule_weekday="$(config_value '.scheduleWeekday')"; [[ "$schedule_weekday" =~ ^[0-6]$ ]] || schedule_weekday=0
  schedule_day="$(config_value '.scheduleDay')"; [[ "$schedule_day" =~ ^([1-9]|[12][0-9]|3[01])$ ]] || schedule_day=1
  schedule_month="$(config_value '.scheduleMonth')"; [[ "$schedule_month" =~ ^([1-9]|1[0-2])$ ]] || schedule_month=1
  schedule_updated_at="$(config_value '.scheduleUpdatedAt')"
  last_applied_schedule="$(config_value '.lastAppliedScheduleUpdatedAt')"
  last_scheduled_period="$(config_value '.lastScheduledPeriod')"
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

if [[ -n "$schedule_updated_at" && "$schedule_updated_at" != "$last_applied_schedule" ]]; then
  write_state ".lastHostConfigAppliedAt = \"$(date --iso-8601=seconds)\" | .lastAppliedScheduleUpdatedAt = \"$schedule_updated_at\""
fi
[[ "$enabled" == "true" || "$FORCE_BACKUP" == "1" ]] || exit 0
pending_request=false
[[ -n "$requested_at" && "$requested_at" != "$last_handled" ]] && pending_request=true

scheduled_due=false
scheduled_period=""
today="$(date +%F)"
current_time="$(date +%H:%M)"
if [[ "$current_time" > "$schedule_time" || "$current_time" == "$schedule_time" ]]; then
  case "$schedule_frequency" in
    daily)
      scheduled_due=true; scheduled_period="$today"
      ;;
    weekly)
      if (( 10#$(date +%w) >= 10#$schedule_weekday )); then
        scheduled_due=true; scheduled_period="week-$(date -d "$(date +%F) - $(date +%w) days" +%F)"
      fi
      ;;
    monthly)
      last_day="$(date -d "$(date +%Y-%m-01) +1 month -1 day" +%d)"
      due_day=$(( 10#$schedule_day > 10#$last_day ? 10#$last_day : 10#$schedule_day ))
      if (( 10#$(date +%d) >= due_day )); then
        scheduled_due=true; scheduled_period="$(date +%Y-%m)"
      fi
      ;;
    yearly)
      if (( 10#$(date +%m) >= 10#$schedule_month )); then
        last_day="$(date -d "$(date +%Y)-$(printf '%02d' "$schedule_month")-01 +1 month -1 day" +%d)"
        due_day=$(( 10#$schedule_day > 10#$last_day ? 10#$last_day : 10#$schedule_day ))
        if (( 10#$(date +%m) > 10#$schedule_month || 10#$(date +%d) >= due_day )); then
          scheduled_due=true; scheduled_period="$(date +%Y)"
        fi
      fi
      ;;
  esac
fi

if [[ "$FORCE_BACKUP" != "1" && "$SCHEDULED_INVOCATION" == "1" && "$pending_request" == false ]]; then
  [[ "$scheduled_due" == true && "$scheduled_period" != "$last_scheduled_period" ]] || exit 0
  # Record the period before the work starts. A failed scheduled backup is
  # reported to the portal and does not retry every five minutes all day.
  write_state ".lastScheduledPeriod = \"$scheduled_period\""
fi

now_iso="$(date --iso-8601=seconds)"
write_state ".lastStartedAt = \"$now_iso\""
stage="$(mktemp -d)"
dump_file="company-portal-$(date +%Y%m%d-%H%M%S).sql.gz"
data_archive_file="company-portal-data-$(date +%Y%m%d-%H%M%S).tar.gz"
source_archive_file="company-portal-source-$(date +%Y%m%d-%H%M%S).tar.gz"
config_archive_file="company-portal-recovery-config-$(date +%Y%m%d-%H%M%S).tar.gz.gpg"
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
mkdir -p "$destination/data" "$destination/postgres" "$destination/data-archives" "$destination/source-archives" "$destination/recovery-configs" "$destination/manifests" || fail "Cannot create Synology recovery folders"

docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip -c > "$1"' sh "$container_dump" || fail "PostgreSQL logical dump failed"
docker cp "$DB_CONTAINER:$container_dump" "$stage/$dump_file" || fail "Could not copy PostgreSQL dump from container"
gzip -t "$stage/$dump_file" || fail "Local PostgreSQL dump failed gzip verification"

# A mutable NAS data mirror is useful for quick file recovery but cannot prove
# what attachments belonged to an older database dump. Every v3 recovery point
# therefore gets its own archive. The restore service permits only these
# complete, gzip-and-tar verified points. Do not include host-operation files:
# restoring one must never alter NAS settings, history, or a queued restore.
tar -czf "$stage/$data_archive_file" \
  --exclude='./synology-staging' \
  --exclude='./backups' \
  --exclude='./synology-backup.json' \
  --exclude='./synology-backup-history.json' \
  --exclude='./synology-restore-request.json' \
  --exclude='./synology-restore-status.json' \
  --exclude='*.partial' \
  -C "$APP_DATA_PATH" . || fail "Could not create versioned portal-data archive"
gzip -t "$stage/$data_archive_file" || fail "Local portal-data archive failed gzip verification"
tar -tzf "$stage/$data_archive_file" >/dev/null || fail "Local portal-data archive failed tar verification"

# Source is recoverable from Git, but a versioned NAS snapshot makes a full
# host recovery independent of Git availability. Secrets stay out of this
# archive and are placed in the encrypted recovery-config archive below.
tar -czf "$stage/$source_archive_file" \
  --exclude='./.git' --exclude='./node_modules' --exclude='./.next' --exclude='./.next-dev' \
  --exclude='./data' --exclude='./.env' --exclude='./.env.local' \
  -C "$APP_REPO_PATH" . || fail "Could not create portal source archive"
gzip -t "$stage/$source_archive_file" || fail "Local source archive failed gzip verification"
tar -tzf "$stage/$source_archive_file" >/dev/null || fail "Local source archive failed tar verification"

config_stage="$stage/recovery-config"
mkdir -p "$config_stage/repo" "$config_stage/etc/company-portal" "$config_stage/etc/systemd/system"
for config_file in .env .env.local; do
  [[ -f "$APP_REPO_PATH/$config_file" ]] && cp -p "$APP_REPO_PATH/$config_file" "$config_stage/repo/$config_file"
done
if [[ -d /etc/company-portal ]]; then
  tar --exclude='recovery-config.key' -C /etc/company-portal -cf - . | tar -C "$config_stage/etc/company-portal" -xf - || fail "Could not stage protected host configuration"
fi
for unit in company-portal-synology-mount.service company-portal-synology-backup.service company-portal-synology-backup.timer company-portal-synology-restore.service company-portal-synology-restore.timer; do
  [[ -f "/etc/systemd/system/$unit" ]] && cp -p "/etc/systemd/system/$unit" "$config_stage/etc/systemd/system/$unit"
done
tar -czf "$stage/recovery-config.tar.gz" -C "$config_stage" . || fail "Could not package protected host configuration"
gpg --batch --yes --pinentry-mode loopback --passphrase-file "$RECOVERY_KEY_FILE" --symmetric --cipher-algo AES256 --output "$stage/$config_archive_file" "$stage/recovery-config.tar.gz" || fail "Could not encrypt protected host configuration"
gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$RECOVERY_KEY_FILE" --decrypt "$stage/$config_archive_file" | tar -tzf - >/dev/null || fail "Encrypted host configuration failed local verification"

# Never use --delete: the NAS keeps the last known copy of portal files even
# when a local file is accidentally removed. Local JSON snapshots are derived
# artifacts; copying them again makes every NAS recovery run transfer hundreds
# of MB without protecting any additional live data. PostgreSQL receives its
# own logical dump below, while the remaining app data is copied directly.
rsync -a \
  --exclude 'synology-staging' \
  --exclude 'backups/' \
  --exclude '*.partial' \
  "$APP_DATA_PATH/" "$destination/data/" || fail "Portal data sync failed"
cp "$stage/$dump_file" "$destination/postgres/$dump_file" || fail "Could not write PostgreSQL dump to Synology"
nas_dump="$destination/postgres/$dump_file"
cp "$stage/$data_archive_file" "$destination/data-archives/$data_archive_file" || fail "Could not write portal-data archive to Synology"
nas_data_archive="$destination/data-archives/$data_archive_file"
cp "$stage/$source_archive_file" "$destination/source-archives/$source_archive_file" || fail "Could not write source archive to Synology"
nas_source_archive="$destination/source-archives/$source_archive_file"
cp "$stage/$config_archive_file" "$destination/recovery-configs/$config_archive_file" || fail "Could not write encrypted configuration archive to Synology"
nas_config_archive="$destination/recovery-configs/$config_archive_file"
# A successful copy syscall is not proof that a network-backed share retained
# the complete file.  Verify the final NAS artifact before publishing either a
# manifest or a successful status to the portal.
[[ -s "$nas_dump" ]] || fail "PostgreSQL dump is missing or empty on Synology"
gzip -t "$nas_dump" || fail "PostgreSQL dump failed gzip verification on Synology"
[[ -s "$nas_data_archive" ]] || fail "Portal-data archive is missing or empty on Synology"
gzip -t "$nas_data_archive" || fail "Portal-data archive failed gzip verification on Synology"
tar -tzf "$nas_data_archive" >/dev/null || fail "Portal-data archive failed tar verification on Synology"
[[ -s "$nas_source_archive" ]] && gzip -t "$nas_source_archive" && tar -tzf "$nas_source_archive" >/dev/null || fail "Source archive failed verification on Synology"
[[ -s "$nas_config_archive" ]] || fail "Encrypted configuration archive is missing on Synology"
gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$RECOVERY_KEY_FILE" --decrypt "$nas_config_archive" | tar -tzf - >/dev/null || fail "Encrypted configuration archive failed verification on Synology"

source_attachment_count="$(find "$APP_DATA_PATH/attachments" -type f 2>/dev/null | wc -l)"
destination_attachment_count="$(find "$destination/data/attachments" -type f 2>/dev/null | wc -l)"
manifest_path="$destination/manifests/backup-$(date +%Y%m%d-%H%M%S).json"
manifest_temp="$(mktemp "$destination/manifests/.backup.tmp.XXXXXX")"
jq -n \
  --arg at "$(date --iso-8601=seconds)" \
  --arg data "$destination/data" \
  --arg dump "$nas_dump" \
  --arg dumpSha256 "$(sha256sum "$nas_dump" | awk '{print $1}')" \
  --argjson dumpBytes "$(stat -c '%s' "$nas_dump")" \
  --argjson sourceAttachmentCount "$source_attachment_count" \
  --argjson destinationAttachmentCount "$destination_attachment_count" \
  --arg dataArchive "$nas_data_archive" \
  --arg dataArchiveSha256 "$(sha256sum "$nas_data_archive" | awk '{print $1}')" \
  --argjson dataArchiveBytes "$(stat -c '%s' "$nas_data_archive")" \
  --arg sourceArchive "$nas_source_archive" --arg sourceArchiveSha256 "$(sha256sum "$nas_source_archive" | awk '{print $1}')" --argjson sourceArchiveBytes "$(stat -c '%s' "$nas_source_archive")" \
  --arg recoveryConfigArchive "$nas_config_archive" --arg recoveryConfigArchiveSha256 "$(sha256sum "$nas_config_archive" | awk '{print $1}')" --argjson recoveryConfigArchiveBytes "$(stat -c '%s' "$nas_config_archive")" \
  '{version:4,verified:true,createdAt:$at,appDataDestination:$data,postgresDump:$dump,postgresDumpSha256:$dumpSha256,postgresDumpBytes:$dumpBytes,dataArchive:$dataArchive,dataArchiveSha256:$dataArchiveSha256,dataArchiveBytes:$dataArchiveBytes,sourceArchive:$sourceArchive,sourceArchiveSha256:$sourceArchiveSha256,sourceArchiveBytes:$sourceArchiveBytes,recoveryConfigArchive:$recoveryConfigArchive,recoveryConfigArchiveSha256:$recoveryConfigArchiveSha256,recoveryConfigArchiveBytes:$recoveryConfigArchiveBytes,sourceAttachmentCount:$sourceAttachmentCount,destinationAttachmentCount:$destinationAttachmentCount,note:"Complete recovery point: verified portal data, PostgreSQL, source snapshot, and encrypted host configuration."}' \
  > "$manifest_temp" || fail "Could not write Synology backup manifest"
mv "$manifest_temp" "$manifest_path" || fail "Could not publish Synology backup manifest"

if [[ "$pending_request" == true ]]; then
  backup_trigger="manual"
else
  backup_trigger="scheduled"
fi
write_history "$backup_trigger" || fail "Could not record verified Synology backup history"

if [[ "$prune_old" == "true" && "$SKIP_PRUNE" != "1" ]]; then
  find "$destination/postgres" -type f -name 'company-portal-*.sql.gz' -mtime "+$retention_days" -delete
  find "$destination/data-archives" -type f -name 'company-portal-data-*.tar.gz' -mtime "+$retention_days" -delete
  find "$destination/source-archives" -type f -name 'company-portal-source-*.tar.gz' -mtime "+$retention_days" -delete
  find "$destination/recovery-configs" -type f -name 'company-portal-recovery-config-*.tar.gz.gpg' -mtime "+$retention_days" -delete
  find "$destination/manifests" -type f -name 'backup-*.json' -mtime "+$retention_days" -delete
fi

if [[ -n "$requested_at" ]]; then write_state ".lastRequestHandledAt = \"$requested_at\""; fi
write_state ".lastSuccessAt = \"$(date --iso-8601=seconds)\" | .lastFailureAt = null | .lastFailureMessage = null | .lastPostgresDump = \"$nas_dump\""
echo "Synology recovery backup completed: $destination"
