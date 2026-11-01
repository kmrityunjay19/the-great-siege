#!/bin/bash
# Double-click in Finder to play The Great Siege from this folder.
# Keep the Terminal window open while playing; close it (or press Ctrl+C) to stop.
cd "$(dirname "$0")" || exit 1
exec /usr/bin/python3 site/serve.py --open
