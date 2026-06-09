#!/usr/bin/env bash
# One-shot for the manual itch.io release: (re)build the web port, package the
# itch-ready zip, and reveal it in Finder so you can upload it by hand.
#
#   ./web/tools/build-itch.sh            # full: ./build.sh, then package, then reveal
#   ./web/tools/build-itch.sh --zip-only # skip the wasm rebuild; just re-package build/
#
# Upload dist/7kaa-web-itch.zip on the itch edit page (Edit game -> replace the
# HTML upload -> keep "played in the browser" ticked -> Save).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ "${1:-}" = "--zip-only" ]; then
  echo "build-itch: --zip-only (skipping wasm rebuild)"
else
  echo "build-itch: building the web port (./build.sh)…"
  "$ROOT/build.sh"
fi

echo "build-itch: packaging the itch zip…"
"$ROOT/web/tools/make-itch-zip.sh"

ZIP="$ROOT/dist/7kaa-web-itch.zip"
if command -v open >/dev/null 2>&1; then
  echo "build-itch: revealing $ZIP in Finder"
  open -R "$ZIP" 2>/dev/null || open "$ROOT/dist"
fi
