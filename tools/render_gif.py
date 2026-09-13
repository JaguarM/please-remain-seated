"""Draw a whole flight as an animated GIF, out of the game's own sprite maps and simulation.

    node tools/dump_flight.js --bot=sinkthen --seed=606     # write flight.json
    python tools/render_gif.py                              # write docs/flight.gif

    python tools/render_gif.py --scale=3 --ms=90 --out=docs/seed606.gif
    python tools/render_gif.py --from=300 --to=600          # just the bad four minutes

A cabin is thirty tiles by nine, which is a letterbox, and a shop wants a rectangle. So it also
crops, in tiles, and pads what is left onto a canvas of a given size:

    python tools/render_gif.py --crop=11,0,13,9 --scale=3 --pad=630x500 \
                               --what="PLEASE REMAIN SEATED"

Thirteen rows either side of the locker above 14C, on the 630x500 an itch.io cover wants.

This is tools/render_frame.py in a loop, and it draws every frame with that file's `render`, so
the animation and the still in the README are the same picture of the same thing. Nothing here
knows anything about aeroplanes.

What it adds is the caption strip along the bottom - the clock, how many have been moved and what
the fire is doing - because a picture of a cabin with no clock on it is a picture of a cabin, and
the whole point of fifteen minutes that only move when you do is that you can see them going.

A GIF has 256 colours and the palette is chosen once, from a handful of frames spread across the
flight, rather than per frame: a palette that is re-chosen every frame makes the whole cabin
shimmer as the smoke comes in, which looks like a compression artefact and is one.
"""

import io
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

import render_frame

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, os.pardir)

# The caption strip, in sprite pixels before the scale is applied. Two rows of text is one row
# too many for something that is on the screen for eighty milliseconds.
BAND = 13
INK = (0xDF, 0xE4, 0xEC)
DIM = (0x8A, 0x93, 0xA2)
FIRE = (0xFF, 0x7A, 0x10)
GROUND = (0x16, 0x19, 0x1F)


def caption(frame, film, width, what, fields_wanted):
    """The one line under the cabin, drawn at one pixel per pixel so it scales like the art.

    Laid out by measuring rather than by fractions of the width, because a crop can be a third
    of a cabin wide and three fields at fixed percentages of that sit on top of each other. The
    clock is the one that always fits; the rest are dropped from the right as the room runs out.
    """
    strip = Image.new("RGB", (width, BAND), GROUND)
    d = ImageDraw.Draw(strip)
    font = ImageFont.load_default()
    m = frame["meta"]
    # Each field in its long form and its short one. On a whole cabin they all fit as sentences;
    # on a cover cropped to thirteen rows there is room for a clock and not for the word
    # TOUCHDOWN, and a clock is the half of it worth keeping.
    fields = [
        ((["ON THE GROUND", "LANDED"] if m.get("landed")
          else ["%s TO TOUCHDOWN" % m["clock"], m["clock"]]), INK),
        (["%d MOVED" % m["moved"], "%d MVD" % m["moved"]], DIM),
        (["%d DOWN" % m["down"]], DIM),
        (["FIRE %d" % m["worstFire"], "F%d" % m["worstFire"]], FIRE),
    ]

    right = (film.get("what") or "") if what is None else what
    rw = d.textlength(right, font=font) if right else 0
    limit = width - 3 - (rw + 10 if right else 0)

    x = 3
    for forms, colour in fields[:fields_wanted]:
        fits = [(f, d.textlength(f, font=font)) for f in forms]
        fits = [(f, w) for f, w in fits if x + w <= limit]
        if not fits:
            break
        text, w = fits[0]
        d.text((x, 2), text, font=font, fill=colour)
        x += w + 9
    if right and rw + 6 < width:
        d.text((width - rw - 3, 2), right, font=font, fill=DIM)
    return strip


def one(frame, film, sprites, scale, with_caption, crop=None, pad=None, what=None, fields=4):
    img = render_frame.render(frame, sprites, scale).convert("RGB")
    if crop:
        x, y, w, h = crop
        t = 16 * scale
        img = img.crop((x * t, y * t, (x + w) * t, (y + h) * t))
    out = img
    if with_caption:
        band = caption(frame, film, img.width // scale, what, fields).resize(
            (img.width, BAND * scale), Image.NEAREST)
        out = Image.new("RGB", (img.width, img.height + band.height), GROUND)
        out.paste(img, (0, 0))
        out.paste(band, (0, img.height))
    if pad:
        pw, ph = pad
        canvas = Image.new("RGB", (pw, ph), GROUND)
        canvas.paste(out, ((pw - out.width) // 2, (ph - out.height) // 2))
        out = canvas
    return out


def palette_of(images):
    """One palette for the whole flight, from frames spread across it."""
    picks = images
    width = picks[0].width
    sheet = Image.new("RGB", (width, sum(p.height for p in picks)))
    y = 0
    for p in picks:
        sheet.paste(p, (0, y))
        y += p.height
    return sheet.quantize(colors=255, method=Image.MEDIANCUT)


def main():
    args = sys.argv[1:]

    def opt(name, dflt):
        hit = [a for a in args if a.startswith("--" + name + "=")]
        return hit[0].split("=", 1)[1] if hit else dflt

    src = opt("film", os.path.join(ROOT, "docs", "flight.json"))
    out = opt("out", os.path.join(ROOT, "docs", "flight.gif"))
    scale = int(opt("scale", "2"))
    ms = int(opt("ms", "80"))
    hold = int(opt("hold", "1400"))          # how long the last frame stays up
    with_caption = opt("caption", "on") != "off"
    start = float(opt("from", "-1"))
    stop = float(opt("to", "1e9"))
    # A window of the cabin, in tiles: x,y,w,h. The whole thing by default.
    crop = opt("crop", None)
    crop = tuple(int(v) for v in crop.split(",")) if crop else None
    # A canvas to sit the result in the middle of, in pixels: 630x500 is what itch.io wants.
    pad = opt("pad", None)
    pad = tuple(int(v) for v in pad.lower().split("x")) if pad else None
    # What the right-hand end of the caption says. The flight, unless you say otherwise; "off"
    # for nothing at all, because "sinkthen, seed 606" is for a README and not for a shop.
    what = opt("what", None)
    if what == "off":
        what = ""
    # How many of the caption's fields to draw, from the clock rightwards. A cover wants the
    # clock and the title and nothing else; a screenshot can carry the lot.
    fields = int(opt("fields", "4"))

    if not os.path.exists(src):
        print("No " + os.path.relpath(src, ROOT) + ". Run: node tools/dump_flight.js")
        return 1

    film = json.load(io.open(src, encoding="utf-8"))
    frames = [f for f in film["frames"]
              if start <= f["meta"]["elapsed"] <= stop]
    if not frames:
        print("Nothing between %s and %s seconds." % (start, stop))
        return 1

    sprites = render_frame.load_sprites()

    # The palette first, from eight frames across the flight, because the last one has a cabin
    # full of smoke in it and the first one has none and a palette chosen from either is wrong
    # for the other.
    n = min(8, len(frames))
    spread = [frames[round(i * (len(frames) - 1) / max(1, n - 1))] for i in range(n)]
    draw = lambda f: one(f, film, sprites, scale, with_caption, crop, pad, what, fields)
    pal = palette_of([draw(f) for f in spread])

    out_frames = []
    for i, f in enumerate(frames):
        img = draw(f)
        out_frames.append(img.quantize(palette=pal, dither=Image.Dither.NONE))
        if not i % 10:
            sys.stdout.write("\r  %d/%d" % (i, len(frames)))
            sys.stdout.flush()
    sys.stdout.write("\r")

    times = [ms] * len(out_frames)
    times[-1] = max(ms, hold)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    out_frames[0].save(out, save_all=True, append_images=out_frames[1:],
                       duration=times, loop=0, optimize=True, disposal=1)

    size = os.path.getsize(out)
    first, last = frames[0]["meta"], frames[-1]["meta"]
    print("%s  %dx%d  %d frames  %.1f MB" %
          (os.path.relpath(out, ROOT), out_frames[0].width, out_frames[0].height,
           len(out_frames), size / 1048576.0))
    print("  %s → %s · %s · %s"
          % (first["clock"], last["clock"], film.get("what") or "",
             "%s of 60" % film["survivors"] if film.get("survivors") is not None else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
