#!/bin/bash
# NightWatch - Stop Script

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "[*] Stopping NightWatch..."

# Kill existing processes
pids=$(ps aux | grep -E "(uvicorn.*backend.api.main:app|serve -s dist)" | grep -v grep | awk '{print $2}')
if [ -n "$pids" ]; then
    echo "[*] Killing processes: $pids"
    kill $pids 2>/dev/null || true
    sleep 2
fi

# Verify all stopped
remaining=$(ps aux | grep -E "(uvicorn.*backend.api.main:app|serve -s dist)" | grep -v grep | awk '{print $2}')
if [ -z "$remaining" ]; then
    echo "[+] NightWatch stopped"
else
    echo "[!] Force killing remaining: $remaining"
    kill -9 $remaining 2>/dev/null || true
    echo "[+] All processes killed"
fi