#!/bin/bash
# Start the Till Print Bridge.
# Works from download zip / install dir, or from frontend/scripts/ in a checkout.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

if [[ -f "$HERE/till-print-bridge.mjs" ]]; then
  BRIDGE="$HERE/till-print-bridge.mjs"
elif [[ -f "$HERE/../scripts/till-print-bridge.mjs" ]]; then
  cd "$HERE/.."
  BRIDGE="$(pwd)/scripts/till-print-bridge.mjs"
else
  echo "Could not find till-print-bridge.mjs"
  echo "Expected next to this file, or at frontend/scripts/till-print-bridge.mjs"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node not found in PATH. Install Node.js from https://nodejs.org/"
  exit 1
fi

echo "Starting Till Print Bridge for Palmart cloud cashier..."
echo "Leave this window open while cashiering. Press Ctrl+C to stop."
exec node "$BRIDGE"
