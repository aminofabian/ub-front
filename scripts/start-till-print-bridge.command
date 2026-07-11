#!/bin/bash
# Double-click on macOS (or run in Terminal) to start the Till Print Bridge.
cd "$(dirname "$0")/.." || exit 1
echo "Starting Till Print Bridge for Palmart cloud cashier..."
echo "Leave this window open while cashiering. Press Ctrl+C to stop."
exec node scripts/till-print-bridge.mjs
