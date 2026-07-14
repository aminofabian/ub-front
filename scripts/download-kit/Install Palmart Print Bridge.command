#!/usr/bin/env bash
# Install / start Palmart Till Print Bridge from an extracted download package.
# Double-click this file on macOS (or: bash "Install Palmart Print Bridge.command").

set -euo pipefail

PKG_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${HOME}/.palmart/till-print-bridge"
LOG_DIR="${HOME}/Library/Logs/palmart"
PLIST_DST="${HOME}/Library/LaunchAgents/com.palmart.till-print-bridge.plist"
LABEL="com.palmart.till-print-bridge"

echo "=== Palmart Till Print Bridge (macOS) ==="

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js is required but was not found."
  echo "Opening https://nodejs.org/ — install the LTS build, then run this installer again."
  open "https://nodejs.org/en/download" 2>/dev/null || true
  read -r -p "Press Enter after Node is installed..."
  if ! command -v node >/dev/null 2>&1; then
    echo "Still no node in PATH. Quit Terminal/iTerm and try again, or install from nodejs.org."
    exit 1
  fi
fi

NODE_BIN="$(command -v node)"
mkdir -p "$INSTALL_DIR" "$LOG_DIR" "$HOME/Library/LaunchAgents"

cp -f "$PKG_DIR/till-print-bridge.mjs" "$INSTALL_DIR/till-print-bridge.mjs"
cp -f "$PKG_DIR/start-till-print-bridge.command" "$INSTALL_DIR/start-till-print-bridge.command" 2>/dev/null || true
chmod +x "$INSTALL_DIR/till-print-bridge.mjs" 2>/dev/null || true
chmod +x "$INSTALL_DIR/start-till-print-bridge.command" 2>/dev/null || true

cat > "$PLIST_DST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${INSTALL_DIR}/till-print-bridge.mjs</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/till-print-bridge.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/till-print-bridge.err.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl kickstart -k "gui/$(id -u)/${LABEL}" 2>/dev/null || launchctl start "$LABEL" || true

sleep 1
if curl -sf http://127.0.0.1:19500/health >/dev/null; then
  echo ""
  echo "Installed and running at http://127.0.0.1:19500"
  echo "It will start automatically when you log in."
  echo "Go back to Palmart Cashier and click Detect printers."
else
  echo ""
  echo "Installed, but health check failed. Try:"
  echo "  ${NODE_BIN} ${INSTALL_DIR}/till-print-bridge.mjs"
  echo "Logs: ${LOG_DIR}/till-print-bridge.err.log"
  exit 1
fi

echo ""
read -r -p "Press Enter to close…"
