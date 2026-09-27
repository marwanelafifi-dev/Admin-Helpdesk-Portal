#!/usr/bin/env bash
# Run once as root on the Ubuntu host that runs the Company Portal Docker stack.
set -euo pipefail

[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo." >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DATA_PATH="${APP_DATA_PATH:-/opt/company-portal/data}"
NAS_SHARE="${NAS_SHARE:-//192.168.2.204/Si-Ware Apps}"
NAS_MOUNT="${NAS_MOUNT:-/mnt/company-portal-synology}"
DB_CONTAINER="${DB_CONTAINER:-company-portal-db}"

apt-get update
apt-get install -y cifs-utils jq rsync
install -d -m 0750 /etc/company-portal "$NAS_MOUNT" /usr/local/sbin

if [[ ! -f /etc/company-portal/synology-credentials ]]; then
  cat >&2 <<'MESSAGE'
Create /etc/company-portal/synology-credentials before enabling the service:
username=company-portal-backup
password=YOUR_NAS_PASSWORD
MESSAGE
  exit 1
fi
chmod 600 /etc/company-portal/synology-credentials

cat > /etc/company-portal/synology-backup.env <<EOF
APP_DATA_PATH=$APP_DATA_PATH
NAS_MOUNT=$NAS_MOUNT
DEFAULT_DESTINATION=$NAS_MOUNT/Company Portal
DB_CONTAINER=$DB_CONTAINER
EOF
chmod 600 /etc/company-portal/synology-backup.env

cat > /etc/systemd/system/company-portal-synology-mount.service <<EOF
[Unit]
Description=Mount Synology share for Company Portal recovery backup
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStartPre=/usr/bin/mkdir -p $NAS_MOUNT
ExecStart=/usr/sbin/mount -t cifs "$NAS_SHARE" "$NAS_MOUNT" -o credentials=/etc/company-portal/synology-credentials,vers=3.0,iocharset=utf8,nosuid,nodev
ExecStop=/usr/bin/umount $NAS_MOUNT

[Install]
WantedBy=multi-user.target
EOF

install -m 0750 "$SCRIPT_DIR/synology-company-portal-backup.sh" /usr/local/sbin/company-portal-synology-backup
cat > /etc/systemd/system/company-portal-synology-backup.service <<'EOF'
[Unit]
Description=Company Portal Synology recovery backup
Wants=network-online.target company-portal-synology-mount.service docker.service
After=network-online.target company-portal-synology-mount.service docker.service

[Service]
Type=oneshot
EnvironmentFile=/etc/company-portal/synology-backup.env
ExecStart=/usr/local/sbin/company-portal-synology-backup
EOF

cat > /etc/systemd/system/company-portal-synology-backup.timer <<'EOF'
[Unit]
Description=Check Company Portal Synology backup settings every five minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=5min
Persistent=true
Unit=company-portal-synology-backup.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now company-portal-synology-mount.service
systemctl enable --now company-portal-synology-backup.timer
echo "Installed. Confirm with: systemctl list-timers company-portal-synology-backup.timer"
