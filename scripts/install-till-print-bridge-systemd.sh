#!/bin/bash
# Install Till Print Bridge as a systemd --user service (Linux).
# Run once on the till PC:
#   cd frontend && bash scripts/install-till-print-bridge-systemd.sh

set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT_DST="$UNIT_DIR/palmart-till-print-bridge.service"
BRIDGE_SCRIPT="$FRONTEND_DIR/scripts/till-print-bridge.mjs"

if [[ -z "${NODE_BIN:-}" ]]; then
  echo "node not found in PATH. Install Node.js first."
  exit 1
fi

if [[ ! -f "$BRIDGE_SCRIPT" ]]; then
  echo "Missing $BRIDGE_SCRIPT"
  exit 1
fi

mkdir -p "$UNIT_DIR"

cat > "$UNIT_DST" <<EOF
[Unit]
Description=Palmart Till Print Bridge
After=network.target

[Service]
Type=simple
WorkingDirectory=$FRONTEND_DIR
ExecStart=$NODE_BIN $BRIDGE_SCRIPT
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now palmart-till-print-bridge.service

# Keep user services running after logout (optional; may need password once)
if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger "$USER" 2>/dev/null || true
fi

sleep 1
if curl -sf http://127.0.0.1:19500/health >/dev/null; then
  echo "Till Print Bridge is running on http://127.0.0.1:19500"
  echo "Unit: $UNIT_DST"
  echo "Logs: journalctl --user -u palmart-till-print-bridge -f"
else
  echo "Installed, but health check failed. See: journalctl --user -u palmart-till-print-bridge -e"
  exit 1
fi
