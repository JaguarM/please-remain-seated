"""Re-emit pixel-workshop/sprites.json as a classic script the game can load from file://.

    python tools/bundle_nauvis_sprites.py

The game opens by double-clicking index.html, and a file:// page may not fetch a sibling JSON or
load an ES module, so the pack's icons ship as an assignment to a global exactly the way
make_cabin_textures.py ships the cabin art. sprites.json stays the source; this is a build step.
"""

import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "pixel-workshop", "sprites.json")
OUT = os.path.join(ROOT, "game", "art", "nauvis-sprites.js")

sprites = json.load(io.open(SRC, encoding="utf-8"))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with io.open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    fh.write("// The ProjectNauvis item icons from pixel-workshop/sprites.json, as a classic script\n")
    fh.write("// so a file:// page can have them. Regenerate with tools/bundle_nauvis_sprites.py.\n")
    fh.write("window.PRS_ART = window.PRS_ART || {};\n")
    fh.write("window.PRS_ART.nauvis = ")
    fh.write(json.dumps(sprites, separators=(",", ":"), sort_keys=True))
    fh.write(";\n")
print(f"{len(sprites)} sprites -> {os.path.relpath(OUT, ROOT)}")
