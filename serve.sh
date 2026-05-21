#!/usr/bin/env bash
# Launch the local web server for the Books workspace and open the active book.
#
# Usage:
#   ./serve.sh                              # default: serve and open string-theory-primer
#   ./serve.sh 9000                         # use port 9000 instead of 8765
#   ./serve.sh 8765 some-other-book/        # open a different book at the given port
#   ./serve.sh --no-open                    # serve but don't open a browser
#
# Press Ctrl-C to stop the server.

set -euo pipefail

PORT="${1:-8765}"
TARGET="${2:-string-theory-primer/}"
OPEN_BROWSER=1

# Allow --no-open as either argument
for arg in "$@"; do
  case "$arg" in
    --no-open) OPEN_BROWSER=0 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verify Python 3 is available
if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 not found in PATH" >&2
  echo "install Python 3 (e.g. 'brew install python3') and re-run." >&2
  exit 1
fi

# Refuse to silently steal a port that's already in use
if lsof -nP -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "error: port $PORT is already in use." >&2
  echo "either stop the existing process or pass a different port: ./serve.sh 8766" >&2
  exit 1
fi

URL="http://localhost:${PORT}/${TARGET}"

echo "Serving $SCRIPT_DIR at $URL"
echo "Press Ctrl-C to stop."
echo

# Start Python's static file server in the background so we can open a browser,
# then forward signals to it for a clean shutdown on Ctrl-C.
python3 -m http.server "$PORT" --bind 127.0.0.1 &
SERVER_PID=$!
trap 'echo; echo "stopping server..."; kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; exit 0' INT TERM

# Give the server a beat to bind before opening
sleep 0.4

if [ "$OPEN_BROWSER" = "1" ]; then
  if command -v open >/dev/null 2>&1; then
    open "$URL"   # macOS
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"   # Linux
  else
    echo "(could not auto-open browser; navigate to $URL manually.)"
  fi
fi

wait "$SERVER_PID"
