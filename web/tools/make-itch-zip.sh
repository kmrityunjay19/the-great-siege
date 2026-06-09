#!/usr/bin/env bash
# Package build/ into an itch.io-ready zip: index.html at the zip root + the
# runtime assets, nothing else. Upload the zip to itch.io as an HTML5 game.
# Run ./build.sh first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD="$ROOT/build"
OUT="$ROOT/dist"
ZIP="$OUT/7kaa-web-itch.zip"

ASSETS=(7kaa.js 7kaa.wasm 7kaa.data extras.js extras.data)
[ -f "$BUILD/7kaa.html" ] || { echo "missing $BUILD/7kaa.html — run ./build.sh first" >&2; exit 1; }
for f in "${ASSETS[@]}"; do
  [ -f "$BUILD/$f" ] || { echo "missing $BUILD/$f — run ./build.sh first" >&2; exit 1; }
done

mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$BUILD/7kaa.html" "$TMP/index.html"      # itch launches index.html
for f in "${ASSETS[@]}"; do cp "$BUILD/$f" "$TMP/"; done

rm -f "$ZIP"
( cd "$TMP" && zip -q -X -r "$ZIP" index.html "${ASSETS[@]}" )

echo "built $ZIP"
ls -lh "$ZIP" | awk '{print "  zip:", $5}'
echo "  contents:"; unzip -l "$ZIP" | awk 'NR>3 && $4 {printf "    %8s  %s\n",$1,$4}' | sed '/^ *$/d' | head -10
