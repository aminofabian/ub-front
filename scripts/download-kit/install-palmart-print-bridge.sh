#!/usr/bin/env bash
# Install / start Palmart Till Print Bridge from an extracted Linux download package.
# Usage: bash install-palmart-print-bridge.sh

set -euo pipefail

PKG_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${HOME}/.palmart/till-print-bridge"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT_DST="$UNIT_DIR/palmart-till-print-bridge.service"

echo "=== Palmart Till Print Bridge (Linux) ==="

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it (e.g. sudo apt install nodejs) then re-run."
  echo "Or download LTS from https://nodejs.org/"
  exit 1
fi

NODE_BIN="$(command -v node)"
mkdir -p "$INSTALL_DIR" "$UNIT_DIR"
cp -f "$PKG_DIR/till-print-bridge.mjs" "$INSTALL_DIR/till-print-bridge.mjs"

cat > "$UNIT_DST" <<EOF
[Unit]
Description=Palmart Till Print Bridge
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN $INSTALL_DIR/till-print-bridge.mjs
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now palmart-till-print-bridge.service
if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger "$USER" 2>/dev/null || true
fi

sleep 1
if curl -sf http://127.0.0.1:19500/health >/dev/null; then
  echo "Installed and running at http://127.0.0.1:19500"
  echo "Go back to Palmart Cashier and click Detect printers."
else
  echo "Installed, but health check failed. See: journalctl --user -u palmart-till-print-bridge -e"
  exit 1
fi
