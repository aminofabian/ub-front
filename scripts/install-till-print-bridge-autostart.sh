#!/bin/bash
# Install Till Print Bridge to start automatically when you log in (macOS LaunchAgent).
# Run once on the till Mac:
#   cd frontend && bash scripts/install-till-print-bridge-autostart.sh

set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node)"
PLIST_SRC="$FRONTEND_DIR/scripts/com.palmart.till-print-bridge.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.palmart.till-print-bridge.plist"
LOG_DIR="$HOME/Library/Logs/palmart"
BRIDGE_SCRIPT="$FRONTEND_DIR/scripts/till-print-bridge.mjs"

if [[ ! -x "$NODE_BIN" && ! -f "$NODE_BIN" ]]; then
  echo "node not found in PATH. Install Node.js first."
  exit 1
fi

if [[ ! -f "$BRIDGE_SCRIPT" ]]; then
  echo "Missing $BRIDGE_SCRIPT"
  exit 1
fi

mkdir -p "$LOG_DIR" "$HOME/Library/LaunchAgents"

sed \
  -e "s|__NODE_BIN__|$NODE_BIN|g" \
  -e "s|__BRIDGE_SCRIPT__|$BRIDGE_SCRIPT|g" \
  -e "s|__FRONTEND_DIR__|$FRONTEND_DIR|g" \
  -e "s|__LOG_DIR__|$LOG_DIR|g" \
  "$PLIST_SRC" > "$PLIST_DST"

launchctl bootout "gui/$(id -u)/com.palmart.till-print-bridge" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/com.palmart.till-print-bridge"
launchctl kickstart -k "gui/$(id -u)/com.palmart.till-print-bridge"

sleep 1
if curl -sf http://127.0.0.1:19500/health >/dev/null; then
  echo "Till Print Bridge is running on http://127.0.0.1:19500"
  echo "Logs: $LOG_DIR/till-print-bridge.log"
  echo "It will auto-start on every login."
else
  echo "Installed, but health check failed. See $LOG_DIR/till-print-bridge.err.log"
  exit 1
fi
