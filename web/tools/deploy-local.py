#!/usr/bin/env python3
"""Copy a verified build to this game's local server folder, preserving saves in the browser."""
from pathlib import Path
import shutil,sys
root=Path(__file__).resolve().parents[2]
destination=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parents[1]/'outputs/seven-kingdoms'
if not (destination/'COPYING.txt').exists():raise SystemExit('Expected an existing Siege installation with COPYING.txt')
for name in ['7kaa.js','7kaa.wasm','7kaa.data','extras.js','extras.data','siege-pages.js','siege-hud.js','siege-modern.css','siege-presentation.js','siege-core.js']:
 shutil.copy2(root/'build'/name,destination/name)
for name in ['index.html','7kaa.html']:shutil.copy2(root/'build/7kaa.html',destination/name)
shutil.copytree(root/'web/gallery',destination/'gallery',dirs_exist_ok=True)
for name in ['new-game-fields.json','encyclopedia.json']:shutil.copy2(root/'web'/name,destination/name)
print('Updated local installation:',destination)
