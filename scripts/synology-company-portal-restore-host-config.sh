#!/usr/bin/env bash
# Decrypts a verified Synology recovery configuration archive into a chosen
# staging folder. It deliberately never overwrites a live host automatically.
set -euo pipefail

[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }
[[ $# -eq 2 && "$1" == "--manifest" ]] || { echo "Usage: sudo $0 --manifest /mnt/company-portal-synology/Company\ Portal/manifests/backup-....json" >&2; exit 2; }

manifest="$2"
key_file="${RECOVERY_KEY_FILE:-/etc/company-portal/recovery-config.key}"
output_root="${RECOVERY_OUTPUT_DIR:-/root/company-portal-recovery-$(date +%Y%m%d-%H%M%S)}"
command -v jq >/dev/null && command -v gpg >/dev/null && command -v tar >/dev/null && command -v sha256sum >/dev/null || { echo "jq, gpg, tar, and sha256sum are required." >&2; exit 1; }
[[ -f "$manifest" && -s "$key_file" ]] || { echo "Manifest or recovery key is missing." >&2; exit 1; }

archive="$(jq -er '.recoveryConfigArchive | strings' "$manifest")"
checksum="$(jq -er '.recoveryConfigArchiveSha256 | strings | select(test("^[A-Fa-f0-9]{64}$"))' "$manifest")"
source_archive="$(jq -er '.sourceArchive | strings' "$manifest")"
source_checksum="$(jq -er '.sourceArchiveSha256 | strings | select(test("^[A-Fa-f0-9]{64}$"))' "$manifest")"
[[ -f "$archive" ]] || { echo "Encrypted recovery configuration archive is missing." >&2; exit 1; }
[[ "$(sha256sum "$archive" | awk '{print $1}')" == "$checksum" ]] || { echo "Configuration archive checksum does not match its manifest." >&2; exit 1; }
[[ -f "$source_archive" ]] || { echo "Source recovery archive is missing." >&2; exit 1; }
[[ "$(sha256sum "$source_archive" | awk '{print $1}')" == "$source_checksum" ]] || { echo "Source archive checksum does not match its manifest." >&2; exit 1; }

mkdir -p "$output_root"
gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$key_file" --decrypt "$archive" | tar -xzf - -C "$output_root"
mkdir -p "$output_root/source"
tar -xzf "$source_archive" -C "$output_root/source"
chmod -R go-rwx "$output_root"
echo "Recovered protected configuration and source snapshot to: $output_root"
echo "Review it, then copy the required .env files and /etc/company-portal files to the rebuilt host."
