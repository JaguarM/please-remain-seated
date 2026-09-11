"""Gather the files itch.io needs into dist/web, and nothing else.

The aeroplane is a folder you can double-click, which is the whole point of it, but a folder you
can double-click also holds a .git with nine hundred objects in it, a __pycache__, a sprite
generator and a README with a picture. Zip that and itch counts twelve hundred files and refuses
the upload; the game itself is forty-five.

So this reads index.html and copies exactly what index.html asks for - every <script src> and
every <link href> - plus index.html. Nothing is listed twice here and in the page, which means a
new file in the game is a new file in the build the moment the page loads it, and a file that
stops being loaded stops being uploaded. If the page asks for something that is not on disk this
stops and says so rather than shipping a build that is missing a script.

    python tools/build_web.py

Then tools/publish_itch.py pushes dist/web. The two are separate because the build is worth
looking at before it goes anywhere.
"""

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "web"

# Local sources only. A src or href that starts with a scheme or a slash is somebody else's file
# and does not belong in the build; today there are none, and this is what keeps it that way.
REF = re.compile(r"""(?:src|href)\s*=\s*["']([^"':?#][^"':?#]*)["']""")


def referenced(page: str) -> list[str]:
    """The paths index.html loads, in the order it loads them, without repeats."""
    seen: list[str] = []
    for path in REF.findall(page):
        if path not in seen:
            seen.append(path)
    return seen


def main() -> int:
    index = ROOT / "index.html"
    paths = referenced(index.read_text(encoding="utf-8"))

    missing = [p for p in paths if not (ROOT / p).is_file()]
    if missing:
        print("index.html asks for files that are not here:", file=sys.stderr)
        for path in missing:
            print("    " + path, file=sys.stderr)
        return 1

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    shutil.copy2(index, OUT / "index.html")
    total = index.stat().st_size
    for path in paths:
        target = OUT / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / path, target)
        total += (ROOT / path).stat().st_size

    print(f"dist/web: {len(paths) + 1} files, {total / 1024:.0f} kB")
    print("itch.io allows a thousand. index.html is at the top level, which is what it wants.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
