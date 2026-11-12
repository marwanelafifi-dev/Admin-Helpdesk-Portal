#!/usr/bin/env bash
# Installs a boot-time systemd unit for the Company Portal Compose stack.
# Run from the repository root on the Ubuntu production host:
#   sudo ./scripts/install-company-portal-startup-ubuntu.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer with sudo."
  exit 1
fi

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_bin="$(command -v docker || true)"

if [[ -z "${compose_bin}" ]]; then
  echo "Docker is not installed or not on PATH."
  exit 1
fi

if [[ ! -f "${repo_dir}/docker-compose.yml" ]]; then
  echo "docker-compose.yml was not found in ${repo_dir}."
  exit 1
fi

cat > /etc/systemd/system/admin-helpdesk-stack.service <<EOF
[Unit]
Description=Company Portal Docker Compose stack
Wants=network-online.target
After=network-online.target docker.service
Requires=docker.service
RequiresMountsFor=${repo_dir}

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${repo_dir}
# The port-based health check in docker-compose.yml prevents a route change
# from blocking the Cloudflare Tunnel at boot.
ExecStart=${compose_bin} compose --profile tunnel up -d
ExecStop=${compose_bin} compose --profile tunnel stop
TimeoutStartSec=10min
TimeoutStopSec=2min

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable admin-helpdesk-stack.service
echo "Installed admin-helpdesk-stack.service. Start it now with:"
echo "  sudo systemctl start admin-helpdesk-stack.service"
