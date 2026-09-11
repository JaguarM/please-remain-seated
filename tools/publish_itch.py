"""Build the game and push it to itch.io.

    python tools/publish_itch.py              # builds, then pushes dist/web
    python tools/publish_itch.py --dry-run    # builds and stops, so you can look at it first

The channel is `html5` and the name matters: itch marks a build as playable in the browser when
the channel name has "html" in it, so pushing to `web` would upload a download instead of a game.
index.html has to be at the top of what is pushed, and tools/build_web.py puts it there.

butler only sends the blocks that changed, so a typo fix is a twenty-kilobyte upload and not six
hundred. The version it stamps on the build is the git commit the build came from, which is the
only way to tell later which of these is playing on the page.

butler lives at C:\\butler\\butler.exe here; set BUTLER to override.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = "jaguarm/please-remain-seated:html5"


def butler() -> str:
    found = os.environ.get("BUTLER") or shutil.which("butler") or r"C:\butler\butler.exe"
    if not Path(found).is_file() and not shutil.which(found):
        sys.exit("butler is not where I looked (%s). Set BUTLER to its path." % found)
    return found


def main() -> int:
    if subprocess.call([sys.executable, str(ROOT / "tools" / "build_web.py")], cwd=ROOT):
        return 1

    if "--dry-run" in sys.argv:
        print("Built and stopped. python tools/serve.py 8745 dist/web to play it.")
        return 0

    version = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True
    ).stdout.strip()

    cmd = [butler(), "push", str(ROOT / "dist" / "web"), TARGET]
    if version:
        cmd += ["--userversion", version]
    return subprocess.call(cmd, cwd=ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
