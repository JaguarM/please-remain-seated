"""Build the game and push it to itch.io.

    python tools/publish_itch.py              # builds, then pushes dist/web
    python tools/publish_itch.py --dry-run    # builds and stops, so you can look at it first

The channel is `html5` and the name matters: itch marks a build as playable in the browser when
the channel name has "html" in it, so pushing to `web` would upload a download instead of a game.
index.html has to be at the top of what is pushed, and tools/build_web.py puts it there.

butler only sends the blocks that changed, so a typo fix is a twenty-kilobyte upload and not six
hundred. The version it stamps on the build is the git commit the build came from, which is the
only way to tell later which of these is playing on the page.

butler is looked for on the PATH and then in the two places it has actually been kept; set
BUTLER to its path to override that.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = "jaguarm/please-remain-seated:html5"


# Where butler has been kept, in the order to look. It is not a thing with an installer and it
# does not put itself on the PATH, so this is a list of real places rather than a guess.
BUTLER_PATHS = [Path.home() / "Public" / "butler", Path(r"C:\butler\butler.exe")]


def butler() -> str:
    named = os.environ.get("BUTLER")
    if named:
        if Path(named).is_file() or shutil.which(named):
            return named
        sys.exit("BUTLER is set to %s, and there is nothing there." % named)
    found = shutil.which("butler")
    if found:
        return found
    for path in BUTLER_PATHS:
        if path.is_file():
            return str(path)
    sys.exit("butler is not on the PATH or in %s. Set BUTLER to its path."
             % " or ".join(str(p) for p in BUTLER_PATHS))


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
