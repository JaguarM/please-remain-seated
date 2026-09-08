"""Draw a dumped moment of a flight as a PNG, using the same sprite maps the browser uses.

    node tools/dump_frame.js --at=420        # write frame.json
    python tools/render_frame.py             # write frame.png

    python tools/render_frame.py --scale=6 --out=docs/cabin.png

This is the screenshot in the README, and it is not a screenshot: it is the game's own sprite
maps and the game's own simulation, drawn by the same rules the canvas renderer follows, in the
same order - floor, aeroplane, people, fire, smoke, and then the player again over the top of the
smoke because otherwise you cannot find them.

Keeping it in Python rather than screenshotting a browser means the picture can be regenerated
from a seed, in CI, without a display, and it stays honest: if the renderer's draw order changes
and this file does not, the two will visibly disagree.
"""

import io
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, os.pardir)


def load_sprites():
    """The two generated sprite bundles, read back out of the classic scripts they ship as."""
    sprites = {}
    for name in ("nauvis-sprites.js", "cabin-sprites.js"):
        path = os.path.join(ROOT, "game", "art", name)
        text = io.open(path, encoding="utf-8").read()
        start = text.index("= ", text.index("window.PRS_ART.")) + 2
        end = text.rindex(";")
        sprites.update(json.loads(text[start:end]))
    return sprites


def blit(img, sprites, name, ox, oy, scale, palette_override=None, alpha=1.0):
    sprite = sprites.get(name)
    if sprite is None:
        return
    palette = dict(sprite["palette"])
    if palette_override:
        palette.update(palette_override)
    px = img.load()
    for y, row in enumerate(sprite["rows"]):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            colour = palette.get(ch, "#ff00ff").lstrip("#")
            r, g, b = (int(colour[0:2], 16), int(colour[2:4], 16), int(colour[4:6], 16))
            for sy in range(scale):
                for sx in range(scale):
                    tx, ty = ox + x * scale + sx, oy + y * scale + sy
                    if not (0 <= tx < img.width and 0 <= ty < img.height):
                        continue
                    if alpha >= 0.999:
                        px[tx, ty] = (r, g, b, 255)
                    else:
                        old = px[tx, ty]
                        px[tx, ty] = (
                            int(old[0] + (r - old[0]) * alpha),
                            int(old[1] + (g - old[1]) * alpha),
                            int(old[2] + (b - old[2]) * alpha),
                            255,
                        )


def fire_sprite(v):
    if v <= 0.5:
        return None
    if v < 6:
        return "ember"
    if v < 20:
        return "fire_1"
    if v < 45:
        return "fire_2"
    if v < 72:
        return "fire_3"
    return "fire_4"


def smoke_sprite(v):
    if v < 6:
        return None
    if v < 26:
        return "smoke_1"
    if v < 58:
        return "smoke_2"
    return "smoke_3"


def render(frame, sprites, scale):
    T = 16 * scale
    W, H = frame["W"], frame["H"]
    img = Image.new("RGBA", (W * T, H * T), (32, 36, 44, 255))
    aisle = frame["aisle"]

    # ---- floor and the fixed aeroplane -------------------------------------------------------
    for y in range(H):
        for x in range(W):
            t = frame["tiles"][y][x]
            kind = t["kind"]
            ox, oy = x * T, y * T
            if kind in ("wall", "bulkhead"):
                blit(img, sprites, "window" if (y in (0, H - 1) and t["bin"]) else "wall",
                     ox, oy, scale)
                continue
            blit(img, sprites, "floor_aisle" if y == aisle else "floor_carpet", ox, oy, scale)
            if kind == "seat":
                burnt = t["burnt"]
                blit(img, sprites,
                     "seat_burnt" if burnt > 0.6 else "seat_scorched" if burnt > 0.2 else "seat",
                     ox, oy, scale)
            elif kind == "galley":
                blit(img, sprites, "galley", ox, oy, scale)
            elif kind == "lav":
                blit(img, sprites, "lav_door", ox, oy, scale)
            elif kind == "exit":
                blit(img, sprites, "exit_door", ox, oy, scale)
            elif kind == "cockpit":
                blit(img, sprites, "cockpit_door", ox, oy, scale)

    # ---- the overhead lockers, as a lip over each bank of seats -------------------------------
    for x in range(W):
        if not frame["tiles"][1][x]["bin"]:
            continue
        for y, key in ((1, "binOpenL"), (7, "binOpenR")):
            t = frame["tiles"][y][x]
            oy = y * T if y == 1 else (y * T + T - 9 * scale)
            blit(img, sprites, "bin_open" if t[key] else "bin_closed", x * T, oy, scale,
                 alpha=0.76)

    # ---- the safe zones ----------------------------------------------------------------------
    px = img.load()
    for y in range(1, H - 1):
        for x in range(W):
            if not frame["tiles"][y][x]["safe"]:
                continue
            for sy in range(T):
                for sx in range(T):
                    tx, ty = x * T + sx, y * T + sy
                    old = px[tx, ty]
                    px[tx, ty] = (int(old[0] + (0x5f - old[0]) * 0.16),
                                  int(old[1] + (0xd6 - old[1]) * 0.16),
                                  int(old[2] + (0x7a - old[2]) * 0.16), 255)

    if frame.get("cart"):
        blit(img, sprites, "drink_cart", frame["cart"]["x"] * T, frame["cart"]["y"] * T, scale)

    # ---- people ------------------------------------------------------------------------------
    for p in frame["pax"]:
        pal = {"h": p["hair"], "s": p["skin"], "c": p["shirt"]}
        blit(img, sprites, "pax_down" if p["down"] else "pax", p["x"] * T, p["y"] * T, scale, pal)
        if p["masked"]:
            blit(img, sprites, "mask_on", p["x"] * T, p["y"] * T, scale, alpha=0.95)
        if p["secured"]:
            blit(img, sprites, "mark_saved", p["x"] * T, p["y"] * T, scale, alpha=0.85)

    for c in frame["crew"]:
        blit(img, sprites, c["sprite"], c["x"] * T, c["y"] * T, scale,
             {"h": c["hair"], "s": c["skin"], "c": c["shirt"]})

    P = frame["player"]
    ppal = {"h": P["hair"], "s": P["skin"], "c": P["shirt"]}
    blit(img, sprites, "player_ring", P["x"] * T, P["y"] * T, scale)
    blit(img, sprites, "pax", P["x"] * T, P["y"] * T, scale, ppal)

    # ---- fire, then smoke over everything, then the fire glowing back through it --------------
    for y in range(H):
        for x in range(W):
            name = fire_sprite(frame["tiles"][y][x]["fire"])
            if name:
                blit(img, sprites, name, x * T, y * T, scale, alpha=0.92)
    for y in range(H):
        for x in range(W):
            v = frame["tiles"][y][x]["smoke"]
            name = smoke_sprite(v)
            if name:
                blit(img, sprites, name, x * T, y * T, scale, alpha=min(1.0, v / 90 * 0.82))
    for y in range(H):
        for x in range(W):
            t = frame["tiles"][y][x]
            if t["fire"] <= 4 or t["smoke"] < 10:
                continue
            name = fire_sprite(t["fire"])
            if name:
                blit(img, sprites, name, x * T, y * T, scale,
                     alpha=min(1.0, t["smoke"] / 70) * 0.5)

    # ---- you, again, over the smoke ----------------------------------------------------------
    blit(img, sprites, "player_ring", P["x"] * T, P["y"] * T, scale)
    blit(img, sprites, "pax", P["x"] * T, P["y"] * T, scale, ppal, alpha=0.9)
    for p in frame["pax"]:
        if p["secured"]:
            blit(img, sprites, "mark_saved", p["x"] * T, p["y"] * T, scale, alpha=0.95)

    return img


def main():
    args = sys.argv[1:]

    def opt(name, dflt):
        hit = [a for a in args if a.startswith("--" + name + "=")]
        return hit[0].split("=", 1)[1] if hit else dflt

    src = opt("frame", os.path.join(ROOT, "docs", "frame.json"))
    out = opt("out", os.path.join(ROOT, "docs", "cabin.png"))
    scale = int(opt("scale", "4"))

    if not os.path.exists(src):
        print("No " + os.path.relpath(src, ROOT) + ". Run: node tools/dump_frame.js")
        return 1

    frame = json.load(io.open(src, encoding="utf-8"))
    img = render(frame, load_sprites(), scale)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img.save(out)

    m = frame["meta"]
    print("%s  %dx%d" % (os.path.relpath(out, ROOT), img.width, img.height))
    print("  %s to touchdown · %d secured · %d helping · fire %d · smoke %s · crew: %s"
          % (m["clock"], m["secured"], m["helping"], m["worstFire"], m["smoke"], m["crewPhase"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
