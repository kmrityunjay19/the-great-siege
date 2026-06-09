#!/usr/bin/env bash
# Refresh the exported patchset (patches/*.patch) from upstream/'s web-port branch.
# Run this after committing engine changes to web-port, so patches/ stays in sync.
# See MAINTAINING.md ("Keeping the patchset current").
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # web/tools -> repo root
cd "$ROOT/upstream"

# The commit web-port was started from (cloned 7kaa base, v2.15.6).
# After a backport onto a newer release, update this to the new base commit.
BASE="14e6fdf"

if ! git rev-parse --verify -q web-port >/dev/null; then
  echo "error: no 'web-port' branch in upstream/ — see MAINTAINING.md" >&2; exit 1
fi

# Warn (don't fail) if engine edits aren't committed — they won't be in the patches.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "WARNING: uncommitted changes in upstream/ — commit them to web-port first:" >&2
  git status --short >&2
fi

mkdir -p "$ROOT/patches"
rm -f "$ROOT"/patches/*.patch
git format-patch "$BASE"..web-port -o "$ROOT/patches" >/dev/null

n="$(ls "$ROOT"/patches/*.patch 2>/dev/null | wc -l | tr -d ' ')"
echo "refreshed $n patch(es) in patches/:"
ls -1 "$ROOT"/patches/*.patch | sed "s#$ROOT/##"
