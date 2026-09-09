"""Remove action definitions from the deck files by id, safely.

    python tools/trim_actions.py fire.spit fire.blow          # remove these
    python tools/trim_actions.py --file cuts.txt              # one id per line
    python tools/trim_actions.py --list                       # every id, by file

An action is an object literal inside an `A.register([...])` array, so removing one means finding
its opening brace, counting braces to the matching close while ignoring the ones inside strings and
comments, and taking the trailing comma and the blank line with it. Doing that by hand across nine
files is how a project ends up with a stray `},` that only shows up when a particular character
picks a particular item.
"""

import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK_DIR = os.path.join(ROOT, "game", "data")


def deck_files():
    return sorted(f for f in os.listdir(DECK_DIR) if f.startswith("actions-"))


def find_ids(text):
    return [m.group(1) for m in re.finditer(r'\bid:\s*"([\w.]+)"', text)]


def scan_object(text, brace_at):
    """Index just past the object literal that opens at `brace_at`, strings and comments skipped."""
    depth = 0
    i = brace_at
    n = len(text)
    while i < n:
        ch = text[i]
        if ch in "\"'":
            quote = ch
            i += 1
            while i < n and text[i] != quote:
                i += 2 if text[i] == "\\" else 1
            i += 1
            continue
        if ch == "/" and i + 1 < n and text[i + 1] == "/":
            i = text.find("\n", i)
            if i < 0:
                return n
            continue
        if ch == "/" and i + 1 < n and text[i + 1] == "*":
            i = text.find("*/", i) + 2
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError("unbalanced braces from %d" % brace_at)


def remove(text, action_id):
    """Text with the definition of `action_id` gone, or None if it is not in here."""
    m = re.search(r'\bid:\s*"%s"' % re.escape(action_id), text)
    if not m:
        return None

    # The opening brace is on this line before the id, or is the last '{' before it.
    line_start = text.rfind("\n", 0, m.start()) + 1
    brace_at = text.find("{", line_start, m.start())
    if brace_at < 0:
        brace_at = text.rfind("{", 0, m.start())
    if brace_at < 0:
        raise ValueError("no opening brace for " + action_id)

    end = scan_object(text, brace_at)
    if text[end:end + 1] == ",":
        end += 1

    # Take the blank line and any comment lines that belonged to it, but stop at a banner rule
    # (the long dashed section headers), which belongs to whatever comes next.
    start = text.rfind("\n", 0, brace_at) + 1
    while True:
        prev_end = start
        prev_start = text.rfind("\n", 0, prev_end - 1) + 1 if prev_end else 0
        line = text[prev_start:prev_end]
        stripped = line.strip()
        if stripped.startswith("//") and "---" not in stripped:
            start = prev_start
            continue
        if stripped == "" and prev_start != prev_end:
            start = prev_start
            continue
        break

    # And the newline the object sat on.
    while end < len(text) and text[end] in " \t":
        end += 1
    if text[end:end + 1] == "\n":
        end += 1
    return text[:start] + text[end:]


def main():
    args = sys.argv[1:]
    if "--list" in args:
        for name in deck_files():
            text = io.open(os.path.join(DECK_DIR, name), encoding="utf-8").read()
            print("\n" + name)
            for i in find_ids(text):
                print("  " + i)
        return 0

    ids = []
    if "--file" in args:
        path = args[args.index("--file") + 1]
        ids = [l.split("#")[0].strip() for l in io.open(path, encoding="utf-8")]
        ids = [i for i in ids if i]
    ids += [a for a in args if not a.startswith("--") and "." in a and
            a not in (args[args.index("--file") + 1] if "--file" in args else "")]

    files = {name: io.open(os.path.join(DECK_DIR, name), encoding="utf-8").read()
             for name in deck_files()}
    removed, missing = [], []
    for action_id in ids:
        hit = False
        for name in files:
            out = remove(files[name], action_id)
            if out is not None:
                files[name] = out
                removed.append(action_id)
                hit = True
                break
        if not hit:
            missing.append(action_id)

    for name, text in files.items():
        io.open(os.path.join(DECK_DIR, name), "w", encoding="utf-8", newline="\n").write(text)

    print("removed %d action%s" % (len(removed), "" if len(removed) == 1 else "s"))
    if missing:
        print("NOT FOUND (%d): %s" % (len(missing), ", ".join(missing)))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
