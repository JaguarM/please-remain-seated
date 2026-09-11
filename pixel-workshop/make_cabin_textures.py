"""Generate the game's art.

    python pixel-workshop/make_cabin_textures.py             # write game/art/cabin-sprites.js
    python pixel-workshop/make_cabin_textures.py --preview   # also write cabin-preview.png
    python pixel-workshop/make_cabin_textures.py --json      # also write cabin-sprites.json

Every sprite is an ASCII map plus a palette, 16x16 at most, `.` transparent. Three groups:

    tiles     top-down, nose to the left. Seats, aisle, galley, bins, doors, walls.
    entities  drawn over a tile. People, fire at four intensities, smoke, the player's ring.
    items     icons for the things you can hold: an outline, three tones, one highlight.

A family is one map and a palette per member, so the members cannot drift apart: every passenger
on Flight 447 is `pax` with a skin, a hair and a shirt colour swapped in (see `PRS.pax.palette`),
and the five expressions are one body with five pixels moved (see FACES). Fire is one map at four
heats, so the four read as the same fire growing.

The output is a classic script that assigns a global, because the game has to open by
double-clicking `index.html` and a `file://` page may not fetch a sibling JSON. A key missing
from a palette draws magenta, and `check()` refuses to write anything with a hole in it.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, os.pardir)
OUT_DIR = os.path.join(ROOT, "game", "art")


def m(text):
    """A map written as one multi-line string, blank edge lines dropped, short rows padded."""
    lines = [line.rstrip() for line in text.split("\n")]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    width = max(len(line) for line in lines)
    return [line.ljust(width, ".") for line in lines]


SPRITES = {}


def sprite(name, rows, palette):
    SPRITES[name] = {"rows": rows, "palette": palette, "source": "make_cabin_textures.py"}


def variant(name, base, palette_override):
    """One map, another palette: the family trick, so members cannot drift apart."""
    src = SPRITES[base]
    SPRITES[name] = {
        "rows": src["rows"],
        "palette": {**src["palette"], **palette_override},
        "source": "make_cabin_textures.py",
    }


# ---------------------------------------------------------------------------------------------
# Tiles. The floor is drawn under everything, so a tile above it may have air in it.
# ---------------------------------------------------------------------------------------------

# Airline carpet: a dark blue-grey with a fleck, because it has to hide everything.
sprite("floor_carpet", m("""
cccccccccccccccc
ccccfcccccccccfc
ccccccccfccccccc
cfcccccccccccccc
ccccccccccccfccc
ccfccccccccccccc
cccccfccccccccfc
cccccccccccccccc
ccccccccfccccccc
cfccccccccccfccc
cccccccccccccccc
ccccfccccccccccc
cccccccccfcccccc
cfcccccccccccccc
ccccccfccccccfcc
cccccccccccccccc
"""), {"c": "#2f3746", "f": "#39424f"})

# The aisle, worn lighter by three hundred flights a year.
sprite("floor_aisle", m("""
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aawaaaaaaaaaaaaa
aaaaaaaaaawaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
awaaaaaaaaaaaawa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaawaaaaaaaa
aaaaaaaaaaaaaaaa
aaawaaaaaaaaaaaa
aaaaaaaaaaaawaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
"""), {"a": "#3b4454", "w": "#47515f"})

# A seat from above, and the direction matters. The nose is at x=0, so a passenger faces left,
# their back is at the tail end of the cell, and the two armrests run fore and aft alongside them
# - which on this screen means across, not up and down. Drawn the other way round they read as
# the arms of the seat in front, which is what they used to do.
#
#   d   the outline, and the gap between one seat and the next
#   a   the armrests, the hard top edges either side, which catch the cabin lights
#   l   the cushion
#   b   the seat back, aft
#   h   the top of the seat back, which is the bit you actually see from above
#
# The blue is the airline's blue, which is the same blue as every airline's blue.
sprite("seat", m("""
................
.dddddddddddddd.
.daaaaaaaaabbhd.
.daaaaaaaaabbhd.
.dlllllllllbbhd.
.dlllllllllbbhd.
.dlllllllllbbhd.
.dlllllllllbbhd.
.dlllllllllbbhd.
.dlllllllllbbhd.
.dlllllllllbbhd.
.dlllllllllbbhd.
.daaaaaaaaabbhd.
.daaaaaaaaabbhd.
.dddddddddddddd.
................
"""), {"d": "#131822", "h": "#5b6a92", "b": "#28324c", "l": "#42557d", "a": "#6f7a90"})

# The same seat scorched, and the same seat gone: one map, three states of the day. The armrest
# stays the lightest thing on it all the way through, because it is the only part that is metal.
variant("seat_scorched", "seat", {"h": "#4e463c", "b": "#2c2621", "l": "#453d34", "a": "#57503f"})
variant("seat_burnt", "seat", {"d": "#101010", "h": "#2e2926", "b": "#181615",
                               "l": "#2a2422", "a": "#3a3430"})

# The overhead locker, seen from above as a lip on the hull rather than a lid on the seats. Six
# rows, drawn against the wall and not over the passenger in A, because a locker that covers half
# of row A makes the aeroplane look like it has swallowed its own seats.
sprite("bin_closed", m("""
mmmmmmmmmmmmmmmm
mhhhhhhhhhhhhhhm
mllllllllllllllm
mllllllllllllllm
mmmmmmmmmmmmmmmm
kkkkkkkkkkkkkkkk
"""), {"m": "#3c414b", "h": "#7d8595", "l": "#565d6b", "k": "#171a20"})

sprite("bin_open", m("""
mmmmmmmmmmmmmmmm
mhhhhhhhhhhhhhhm
mvvvvvvvvvvvvvvm
mvgbbbbggbbbbgvm
mvvvvvvvvvvvvvvm
kkkkkkkkkkkkkkkk
"""), {"m": "#3c414b", "h": "#7d8595", "v": "#14171c", "g": "#22262e", "b": "#2b303a", "k": "#171a20"})

# The wall, which is the only opaque tile in the cabin, and the window in it.
sprite("wall", m("""
pppppppppppppppp
pssssssssssssssp
pssssssssssssssp
pppppppppppppppp
pssssssssssssssp
pssssssssssssssp
pppppppppppppppp
pssssssssssssssp
pssssssssssssssp
pppppppppppppppp
pssssssssssssssp
pssssssssssssssp
pppppppppppppppp
pssssssssssssssp
pssssssssssssssp
pppppppppppppppp
"""), {"p": "#5b6270", "s": "#767e8d"})

sprite("window", m("""
pppppppppppppppp
pssssssssssssssp
psspppppppppsssp
pspwwwwwwwwwpssp
pspwccccccwwpssp
pspwcccccccwpssp
pspwcccccccwpssp
pspwcccccccwpssp
pspwcccccccwpssp
pspwwcccccwwpssp
pspwwwwwwwwwpssp
psspppppppppsssp
pssssssssssssssp
pssssssssssssssp
pppppppppppppppp
"""), {"p": "#5b6270", "s": "#767e8d", "w": "#3c4350", "c": "#9fd4f2"})

# The galley: a steel monument to trolleys, at both ends of the aeroplane.
sprite("galley", m("""
dddddddddddddddd
dhhhhhhhhhhhhhhd
dhllllddllllllhd
dhllllddllllllhd
dhllllddllllllhd
dddddddddddddddd
dhllllddllllllhd
dhllllddllllllhd
dhllllddllllllhd
dddddddddddddddd
dhllllddllllllhd
dhllllddllllllhd
dhllllddllllllhd
dhhhhhhhhhhhhhhd
dddddddddddddddd
"""), {"d": "#3f444d", "h": "#aeb6c2", "l": "#858d9a"})

# The lavatory door, with the little sign that says whether the day can get worse.
sprite("lav_door", m("""
dddddddddddddddd
dlllllllllllllld
dlhhhhhhhhhhhhld
dlhllllllllllhld
dlhllllllllllhld
dlhllllggllllhld
dlhllllggllllhld
dlhllllllllllhld
dlhllllllllllhld
dlhllllllllllhld
dlhllllllllllhld
dlhhhhhhhhhhhhld
dlllllllllllllld
dddddddddddddddd
"""), {"d": "#3a3f48", "l": "#7b838f", "h": "#949cab", "g": "#2f7d4f"})

# An exit door, the handle picked out because it is the only part that matters.
sprite("exit_door", m("""
dddddddddddddddd
dlllllllllllllld
dlhhhhhhhhhhhhld
dlhmmmmmmmmmmhld
dlhmmmmmmmmmmhld
dlhmyyyyyyyymhld
dlhmykkkkkkymhld
dlhmyyyyyyyymhld
dlhmmmmmmmmmmhld
dlhmmmmmmmmmmhld
dlhhhhhhhhhhhhld
dlllllllllllllld
dddddddddddddddd
"""), {"d": "#2f343c", "l": "#6d757f", "h": "#8b93a0", "m": "#5a626d",
        "y": "#e8c53a", "k": "#22242a"})

# The cockpit door. Reinforced, locked, and it stays that way.
sprite("cockpit_door", m("""
kkkkkkkkkkkkkkkk
kmmmmmmmmmmmmmmk
kmhhhhhhhhhhhhmk
kmhssssssssssHmk
kmhssssssssssHmk
kmhsskkkkkkssHmk
kmhsskrrrrkssHmk
kmhsskkkkkkssHmk
kmhssssssssssHmk
kmhssssssssssHmk
kmhhhhhhhhhhhhmk
kmmmmmmmmmmmmmmk
kkkkkkkkkkkkkkkk
"""), {"k": "#232830", "m": "#454c57", "h": "#7e8794", "s": "#5f6773",
        "H": "#8e97a4", "r": "#c23a2e"})

# The bulkhead, and the flat panel a fire likes to live behind.
sprite("bulkhead", m("""
kkkkkkkkkkkkkkkk
klllllllllllllk.
kllhhhhhhhhhhlk.
kllhmmmmmmmmhlk.
kllhmmmmmmmmhlk.
kllhmmmmmmmmhlk.
kllhmmmmmmmmhlk.
kllhmmmmmmmmhlk.
kllhmmmmmmmmhlk.
kllhhhhhhhhhhlk.
klllllllllllllk.
kkkkkkkkkkkkkkkk
"""), {"k": "#2a2f37", "l": "#6a727e", "h": "#838b98", "m": "#727a86"})


# ---------------------------------------------------------------------------------------------
# Entities. Drawn over a tile, so they are mostly air.
# ---------------------------------------------------------------------------------------------

# People.
#
# Sixty-one faces out of one map. The body below has three colours in it that every passenger
# overrides - hair, skin, shirt - and five more that are the face: the eyes, the brow, the mouth,
# the lids, and `g`, which is the hair that comes down the sides of the head. None of those five
# is drawn as a colour anybody chose. The renderer works them out from the skin, so the eyes of
# the palest person on board and the eyes of the darkest are both eyes, and neither is a smudge.
#
# `g` is the trick worth knowing. Its pixels are on the outside of the face, where the skin used
# to be, so setting `g` to the skin colour gives short hair and setting it to the hair colour
# gives long hair. Two heads, one map, and the choice is a palette entry rather than a drawing.
#
# The expressions are the same body with five pixels moved, because a cabin that is frightened
# has to be visible as a cabin that is frightened and there is no meter for that. The face box is
# rows 5-9, columns 3-12, and a `~` in a patch means "leave the body alone".
#
# The body stops three pixels short of the edge of the cell on every side. It used to run edge to
# edge, and a person sitting in a burning seat was a person you could not see for the fire, or a
# fire you could not click for the person. Now the fire is the tile and the person is the thing in
# the middle of it, and a click on one is not a click on the other.

PAX_BODY = m("""
................
................
................
.....hhhhhh.....
....hhhhhhhh....
....hssssssh....
....gssssssg....
....gssssssg....
...cgssssssgc...
...ccgssssgcc...
...cccssssccc...
...cccccccccc...
....cccccccc....
.....cccccc.....
................
................
""")

# The same person slumped, which the game needs sixty-one of as well.
PAX_DOWN_BODY = m("""
................
................
................
................
................
....hhhh........
...hhssshh......
...hgssssgc.....
...gsssssscccc..
....sssccccccc..
.....ccccccccc..
......ccccccc...
................
................
................
................
""")

# A smaller body for the people on board who are not adults: a narrower head on narrower
# shoulders, so a child and their parent are one drawing at two sizes. The face box is two
# rows lower than an adult's, because the whole child is.
CHILD_BODY = m("""
................
................
................
................
................
......hhhhh.....
.....hhhhhhh....
.....hsssssh....
.....gsssssg....
....cgsssssgc...
....ccgsssgcc...
....cccsssccc...
....ccccccccc...
.....ccccccc....
................
................
""")

# The face. Defaults are worked out from the default skin, and every one of them is overridden
# per person by the renderer; they exist so the sprite is honest on its own in the gallery.
FACE_PALETTE = {"e": "#413024", "b": "#634a37", "m": "#564030", "l": "#9c7457", "g": "#d9a279"}

# rows 5..9 of the body, columns 3..12. Amount of dark on a face is the whole readout: a calm
# cabin is pale and a frightened one is not, and no number anywhere says so.
FACES = {
    "":          ["~~~~~~~~~~",
                  "~~ee~~ee~~",
                  "~~~~~~~~~~",
                  "~~~~mm~~~~",
                  "~~~~~~~~~~"],
    "_relieved": ["~~~~~~~~~~",
                  "~~ee~~ee~~",
                  "~~~m~~m~~~",
                  "~~~~mm~~~~",
                  "~~~~~~~~~~"],
    "_worried":  ["~~bb~~bb~~",
                  "~~ee~~ee~~",
                  "~~~~~~~~~~",
                  "~~~mmmm~~~",
                  "~~~~~~~~~~"],
    "_afraid":   ["~~bb~~bb~~",
                  "~~ee~~ee~~",
                  "~~~~~~~~~~",
                  "~~~mmmm~~~",
                  "~~~~mm~~~~"],
    "_asleep":   ["~~~~~~~~~~",
                  "~~ll~~ll~~",
                  "~~~~~~~~~~",
                  "~~~~ll~~~~",
                  "~~~~~~~~~~"],
}

# A child's head is narrower, so the same five patches lose their outer pixel and the eyes end up
# one pixel each and closer together, which is what a child's face does anyway.
CHILD_FACES = {
    "":          ["~~~~~~~~~~",
                  "~~~~e~e~~~",
                  "~~~~~~~~~~",
                  "~~~~~m~~~~",
                  "~~~~~~~~~~"],
    "_relieved": ["~~~~~~~~~~",
                  "~~~~e~e~~~",
                  "~~~~m~m~~~",
                  "~~~~~m~~~~",
                  "~~~~~~~~~~"],
    "_worried":  ["~~~~b~b~~~",
                  "~~~~e~e~~~",
                  "~~~~~~~~~~",
                  "~~~~mmm~~~",
                  "~~~~~~~~~~"],
    "_afraid":   ["~~~~b~b~~~",
                  "~~~~e~e~~~",
                  "~~~~~~~~~~",
                  "~~~~mmm~~~",
                  "~~~~~m~~~~"],
    "_asleep":   ["~~~~~~~~~~",
                  "~~~~l~l~~~",
                  "~~~~~~~~~~",
                  "~~~~~l~~~~",
                  "~~~~~~~~~~"],
}

# Lying down is a profile, so it gets one eye's worth of face and no expressions: the two states
# that use it are unconscious and being carried, and neither is doing much with a brow.
DOWN_FACES = {
    "_down": ["~~~~~~~~~~",      # out cold: the lid shut, the mouth slack and open
              "~~~ll~~~~~",
              "~~~~~mm~~~",
              "~~~~~~~~~~",
              "~~~~~~~~~~"],
    "_low":  ["~~~~~~~~~~",      # awake and low: crouching, or in somebody's arms
              "~~~ee~~~~~",
              "~~~~~mm~~~",
              "~~~~~~~~~~",
              "~~~~~~~~~~"],
}


def face(body, patch, y0=5, x0=3):
    """One body, one five-row patch over the face box. `~` keeps whatever the body had."""
    rows = [list(r) for r in body]
    for dy, line in enumerate(patch):
        for dx, ch in enumerate(line):
            if ch == "~":
                continue
            rows[y0 + dy][x0 + dx] = ch
    return ["".join(r) for r in rows]


PEOPLE_PALETTE = {"h": "#2b2118", "s": "#d9a279", "c": "#4a5a86", **FACE_PALETTE}

for suffix, patch in FACES.items():
    sprite("pax" + suffix, face(PAX_BODY, patch), PEOPLE_PALETTE)
for suffix, patch in CHILD_FACES.items():
    sprite("child" + suffix, face(CHILD_BODY, patch, y0=7, x0=3), PEOPLE_PALETTE)
# Nobody gets a child-sized version of these two: a person on the floor is a profile with one
# eye in it, and shrinking that produces a smudge rather than a smaller child.
for suffix, patch in DOWN_FACES.items():
    sprite("pax" + suffix, face(PAX_DOWN_BODY, patch, y0=5, x0=2), PEOPLE_PALETTE)

# You. A ring drawn under the body so you can find yourself in the smoke.
sprite("player_ring", m("""
....rrrrrrrr....
..rr........rr..
.r............r.
r..............r
r..............r
................
................
................
................
................
r..............r
r..............r
.r............r.
..rr........rr..
....rrrrrrrr....
"""), {"r": "#ffd54a"})

# The crew, in the airline's jacket, and the purser with the darker one.
variant("crew", "pax", {"c": "#20304e", "h": "#3a2c1e"})
variant("purser", "pax", {"c": "#141c30", "h": "#5a4630"})


# Fire, one map at four heats. It used to be one map at four sizes, a spark growing into a
# blaze, and a tile that was alight was a small flame you could miss and could not click. Now a
# burning tile is burning edge to edge from the first stage, and what changes as it gets worse is
# the colour: a dull red with an orange heart, then orange, then yellow, then white. Seen from
# above a flame is a blob with a bright middle, so that is what this is, with bites out of the
# edge so it does not read as a square. The heart is under the person sitting in it, which is
# the point: the fire is the tile, and the person is the thing in the middle of it.
FIRE_MAP = m("""
.oo..o.ooo..oo..
oorooooroooroooo
orooyoooyooorooo
ooyyoooyyyoooroo
.oyyyoyyyyyooro.
ooyywyyywyyyoooo
oyywwwyywwyyyoo.
oyywwwwwwwwyyooo
ooyywwwwwwyyyoro
.oyyywwwwyyyooo.
ooyyyywwyyyooroo
oroyyyyyyyooooro
oooyyyoyyoooooro
.oroooooooorooo.
orooroooorooooro
.oo.ooo.oo.ooo..
""")

# The same tile the other way up, so a row of burning seats is not a row of identical stamps.
FIRE_MAP_B = [row[::-1] for row in FIRE_MAP[::-1]]

# r is the deep red at the base, o the flame, y the hot part, w the heart.
FIRE_HEATS = {
    "1": {"r": "#5a1806", "o": "#a8380c", "y": "#d85a14", "w": "#f07a22"},   # alight
    "2": {"r": "#7a2408", "o": "#e8641a", "y": "#ffa32a", "w": "#ffd860"},   # burning
    "3": {"r": "#8e2c08", "o": "#ff7a10", "y": "#ffd02a", "w": "#fff4b0"},   # burning hard
    "4": {"r": "#a8360a", "o": "#ff8c22", "y": "#ffe66a", "w": "#ffffff"},   # an inferno
}

for _n, _heat in FIRE_HEATS.items():
    sprite("fire_" + _n, FIRE_MAP, _heat)
    sprite("fire_" + _n + "b", FIRE_MAP_B, _heat)

# A seat that is on fire, which is a different drawing from a fire on a seat. The frame of the
# seat - the outline, the armrests, the back - is still there in the corners and down the aft
# edge, charred, and the flames have the cushion and are coming over the sides. One map, four
# heats, and the frame goes from scorched to burnt as the heat goes up.
SEAT_FIRE_MAP = m("""
................
.dddddddddddddd.
.daaooaaaaabbhd.
.dooyoooaoobbhd.
.doyyyoooyoobhd.
.doyywyoyyyoohd.
.ooyywwyywyyobd.
.oyywwwwwwyyood.
.oyywwwwwwyyoob.
.ooyywwwwyyyooo.
.doyyyywyyyoobd.
.dooyyyyyooobhd.
.daooyooaoobbhd.
.daaaooaaaabbhd.
.dddddddddddddd.
................
""")

SEAT_FRAME_SCORCHED = {"d": "#131822", "h": "#4e463c", "b": "#2c2621", "a": "#57503f"}
SEAT_FRAME_BURNT = {"d": "#101010", "h": "#2e2926", "b": "#181615", "a": "#3a3430"}

for _n, _heat in FIRE_HEATS.items():
    _frame = SEAT_FRAME_SCORCHED if _n in ("1", "2") else SEAT_FRAME_BURNT
    sprite("seat_fire_" + _n, SEAT_FIRE_MAP, {**_frame, **_heat})

# Embers: what suppression leaves behind, and where it all starts again from. Scattered over the
# whole tile, because a tile that is smouldering is a thing you can click, and it has to look
# like one.
sprite("ember", m("""
................
..e.........e...
.ede..e....ede..
..e..ede....e...
......e.........
...........e....
..e.......ede...
.ede...e...e....
..e...ede.......
.....edkde......
.......e....e...
..e........ede..
.ede........e...
..e....e........
......ede...e...
.......e........
"""), {"e": "#ff8c1a", "d": "#7a2b06", "k": "#ffd06a"})

# Smoke, three densities. The last one is what the cabin looks like when you cannot see the seat
# in front of you, which happens sooner than anybody expects.
sprite("smoke_1", m("""
................
....gg....gg....
...gggg..gggg...
...gggg..gggg...
....gg....gg....
................
..gg....gg......
.gggg..gggg.....
.gggg..gggg..gg.
..gg....gg..gggg
............gggg
.....gg......gg.
....gggg........
....gggg........
.....gg.........
................
"""), {"g": "#7b7f88"})

sprite("smoke_2", m("""
..gggg..gggg..gg
gggggggggggggggg
gggggggg.ggggggg
gggg.gggggggg.gg
.gggggggg.gggggg
gg.ggggggggg.ggg
ggggg.gggggggggg
.ggggggg.gggggg.
gggg.gggggggg.gg
ggggggg.gggggggg
.gg.gggggggg.ggg
gggggggg.gggggg.
ggg.gggggggg.ggg
.gggggggg.gggggg
gggg.ggggggggggg
gggggggg.gggggg.
"""), {"g": "#63666e"})

sprite("smoke_3", m("""
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
gggggggggggggggg
"""), {"g": "#3e4046"})

# The mask that drops from the ceiling, drawn on anyone wearing one.
sprite("mask_on", m("""
................
................
................
................
................
.....yyyyyy.....
....yyyyyyyy....
....yywwwwyy....
....yywwwwyy....
.....yyyyyy.....
......y..y......
.....t....t.....
................
................
................
................
"""), {"y": "#ffd93b", "w": "#fff6cf", "t": "#b8952a"})

# The marker for a passenger who is accounted for, and the one for a passenger who is not.
sprite("mark_saved", m("""
................
................
..............g.
.............gg.
............gg..
.g.........gg...
.gg.......gg....
..gg.....gg.....
...gg...gg......
....gg.gg.......
.....ggg........
......g.........
................
................
................
................
"""), {"g": "#5fd67a"})

sprite("mark_lost", m("""
................
................
..r..........r..
..rr........rr..
...rr......rr...
....rr....rr....
.....rr..rr.....
......rrrr......
......rrrr......
.....rr..rr.....
....rr....rr....
...rr......rr...
..rr........rr..
..r..........r..
................
................
"""), {"r": "#d4483a"})


# ---------------------------------------------------------------------------------------------
# Items. Sixteen pixels, an outline, three tones and a highlight: the item idiom.
# ---------------------------------------------------------------------------------------------

# The halon bottle the crew have and you do not. Red, because everything that works is red.
sprite("extinguisher", m("""
.......kk.......
......khhk......
.....kbbbbk.....
....kbhhhhbk....
...kbbbbbbbbk...
...kdrrrrrrdk...
...kdrhhrrrdk...
...kdrhhrrrdk...
...kdrrrrrrdk...
...kdrwwwwrdk...
...kdrwwwwrdk...
...kdrrrrrrdk...
...kdrrrrrrdk...
...kddddddddk...
....kkkkkkkk....
................
"""), {"k": "#2a1210", "r": "#c8322a", "h": "#f0736a", "d": "#8c1f19",
        "w": "#e8e2d4", "b": "#7b828c"})

variant("extinguisher_water", "extinguisher", {"r": "#3f7fc4", "h": "#8dc3ee", "d": "#26558c"})

# A folded blanket, and the same blanket after four seconds in a lavatory sink.
sprite("blanket", m("""
................
..kkkkkkkkkkkk..
.khhhhhhhhhhhhk.
.kbbbbbbbbbbbbk.
.kbllllllllllbk.
.kbllllllllllbk.
.kkkkkkkkkkkkkk.
.kbllllllllllbk.
.kbllllllllllbk.
.kbllllllllllbk.
.kkkkkkkkkkkkkk.
.kbllllllllllbk.
.kbllllllllllbk.
.khhhhhhhhhhhhk.
..kkkkkkkkkkkk..
................
"""), {"k": "#1e2a3c", "h": "#5f7196", "b": "#2f3f5e", "l": "#43567c"})

variant("blanket_wet", "blanket", {"h": "#3d5f7a", "b": "#1c3040", "l": "#264456"})

# The bottle of still water that will turn out to be your main weapon, which is the joke.
sprite("water_bottle", m("""
.......kk.......
.......kk.......
......kddk......
......kbbk......
.....kbwwbk.....
....kbwwwwbk....
....kbwwwwbk....
....kbwwwwbk....
....kbwwwwbk....
....kbwwwwbk....
....kbwwwwbk....
....kbwwwwbk....
....kbwwwwbk....
....kbbbbbbk....
.....kkkkkk.....
................
"""), {"k": "#2b3844", "b": "#7fb6d8", "w": "#cfe9f7", "d": "#4a7fa0"})

variant("water_bottle_empty", "water_bottle", {"b": "#8e9aa4", "w": "#c3ccd3", "d": "#66727c"})

# The smoke hood the crew keep for exactly this, sealed in its foil.
sprite("smoke_hood", m("""
................
....kkkkkkkk....
...kssssssssk...
..kssssssssssk..
..ksswwwwwwssk..
..kswwwwwwwwsk..
..kswwwwwwwwsk..
..ksswwwwwwssk..
..kssssssssssk..
..kssoooooosk...
..kssoooooosk...
..kssssssssssk..
...kssssssssk...
....kkkkkkkk....
................
................
"""), {"k": "#3a3a2e", "s": "#c9c2a6", "w": "#e9f3f8", "o": "#d8862c"})

# Fire gloves, which are the only reason you can hold anything.
sprite("fire_gloves", m("""
................
...kk...kk......
..khhk.khhk.....
..khhkkkhhk.....
.kkhhhhhhhkk....
.khhhhhhhhhk....
.khhhhhhhhhk....
.khyyyyyyyhk....
.khyyyyyyyhk....
.khhhhhhhhhk....
..khhhhhhhk.....
..kdddddddk.....
..kkkkkkkkk.....
................
................
................
"""), {"k": "#2a2018", "h": "#9c7a4a", "y": "#d8b46a", "d": "#5e4628"})

# A phone, on which you will film the thing instead of solving it.
sprite("phone", m("""
....kkkkkkkk....
....khhhhhhk....
....kwsssswk....
....kssssssk....
....kssssssk....
....kssssssk....
....kssssssk....
....kssssssk....
....kssssssk....
....kssssssk....
....kssssssk....
....kssssssk....
....khhhhhhk....
....kkkkkkkk....
................
................
"""), {"k": "#141416", "h": "#3a3d44", "s": "#4a7fb8", "w": "#a8d2f0"})


# Duct tape, the second most useful thing in the bag.
sprite("duct_tape", m("""
................
....kkkkkkkk....
...khhhhhhhhk...
..khgggggggghk..
..kgggkkkkgggk..
..kggk....kggk..
..kggk....kggk..
..kggk....kggk..
..kggk....kggk..
..kgggkkkkgggk..
..khgggggggghk..
...khhhhhhhhk...
....kkkkkkkk....
................
................
................
"""), {"k": "#1e2024", "h": "#a4aab2", "g": "#7a8088"})

# The trolley the miniatures came from, which is also a two-hundred-kilo rolling wall.
sprite("drink_cart", m("""
kkkkkkkkkkkkkkkk
khhhhhhhhhhhhhhk
khllllllllllllhk
khlmmmmmmmmmmlhk
khllllllllllllhk
kkkkkkkkkkkkkkkk
khlmmmmmmmmmmlhk
khllllllllllllhk
kkkkkkkkkkkkkkkk
khlmmmmmmmmmmlhk
khllllllllllllhk
kkkkkkkkkkkkkkkk
kdkkkkkkkkkkkkdk
kdd..........ddk
.d............d.
................
"""), {"k": "#2c313a", "h": "#b8c0cb", "l": "#8e97a3", "m": "#6c7480", "d": "#1a1c20"})

# A pet carrier with something in it that has been very quiet for an hour.
sprite("pet_carrier", m("""
................
....kkkkkkkk....
..kkbbbbbbbbkk..
..kbbbbbbbbbbk..
..kbkgkgkgkgbk..
..kbkgkgkgkgbk..
..kbkgkgkgkgbk..
..kbkgkgkgkgbk..
..kbkgkgkgkgbk..
..kbbbbbbbbbbk..
..kbbbbbbbbbbk..
..kkkkkkkkkkkk..
...k........k...
................
................
................
"""), {"k": "#1e1a16", "b": "#4a5a72", "g": "#8ad06a"})

# The first aid kit and the defibrillator, both of which are for a different emergency.
sprite("first_aid", m("""
................
..kkkkkkkkkkkk..
..khhhhhhhhhhk..
..kwwwwwwwwwwk..
..kwwwwrrwwwwk..
..kwwwwrrwwwwk..
..kwwrrrrrrwwk..
..kwwrrrrrrwwk..
..kwwwwrrwwwwk..
..kwwwwrrwwwwk..
..kwwwwwwwwwwk..
..khhhhhhhhhhk..
..kkkkkkkkkkkk..
................
................
................
"""), {"k": "#2a2a2a", "h": "#b8b8b8", "w": "#e8e8e8", "r": "#c8322a"})

sprite("headphones", m("""
................
.....kkkkkk.....
....k......k....
...k........k...
..k..........k..
..k..........k..
..kkk......kkk..
..kbbk....kbbk..
..kbbk....kbbk..
..kbbk....kbbk..
..kbbk....kbbk..
..kkkk....kkkk..
................
................
................
................
"""), {"k": "#26282e", "b": "#5a6270"})

# The wet towel, which is the correct answer, and which nobody picks.
sprite("wet_towel", m("""
................
..kkkkkkkkkkkk..
..khhhhhhhhhhk..
..kbwbwbwbwbwk..
..kwbwbwbwbwbk..
..kbwbwbwbwbwk..
..kwbwbwbwbwbk..
..kbwbwbwbwbwk..
..khhhhhhhhhhk..
..kkkkkkkkkkkk..
................
................
................
................
................
................
"""), {"k": "#1c3038", "h": "#5a8fa8", "b": "#2f5e74", "w": "#417d96"})

# The four things that used to borrow the modpack's icons: a vest, a folded knife, a roll of
# bin liners and an inhaler, in the same idiom as everything above.
sprite("hivis", m("""
................
...kkk....kkk...
..kyyk....kyyk..
..kyykkkkkkyyk..
..kyyyyyyyyyyk..
..kyyyyyyyyyyk..
..kssssssssssk..
..kssssssssssk..
..kyyyyyyyyyyk..
..kyyyyyyyyyyk..
..kssssssssssk..
..kssssssssssk..
..kyyyyyyyyyyk..
..khhhhhhhhhhk..
..kkkkkkkkkkkk..
................
"""), {"k": "#1e2024", "y": "#d8c828", "s": "#c9ced6", "h": "#a89a1e"})

sprite("multitool", m("""
................
...........kk...
..........khhk..
.........khhhk..
........khhhk...
.......khhhk....
......khhhk.....
.....khhhk......
....kkhhk.......
...kmmkk........
..kmbbmmk.......
..kmbrbmmk......
..kmbbbmmk......
..kmmmmmmk......
...kkkkkk.......
................
"""), {"k": "#1e2024", "h": "#dfe4ec", "m": "#4f5a68", "b": "#2f3f7a", "r": "#c9a227"})

sprite("binbag", m("""
................
................
....kkkkkkkk....
...khhhhhhhhk...
..kgddddddddgk..
..kdddddddddddk.
..kdddddddddddk.
..kdddddddddddk.
..kdddddddddddk.
..kdddddddddddk.
..kgddddddddgk..
...kggggggggk...
....kkkkkkkk....
......kgggk.....
.......kkk......
................
"""), {"k": "#141414", "d": "#33373f", "g": "#5c626c", "h": "#7d848f"})

sprite("goggles", m("""
................
................
................
..kkkkk..kkkkk..
.kbbbbbkkbbbbbk.
.kbllbbkkbbllbk.
.kbllbbkkbbllbk.
.kbbbbbkkbbbbbk.
..kkkkk..kkkkk..
..k..........k..
..kssssssssssk..
...kkkkkkkkkk...
................
................
................
................
"""), {"k": "#1e2024", "b": "#3a8fb8", "l": "#cfeaf6", "s": "#2a2d33"})

sprite("strap", m("""
................
..kkkk..........
.koooook........
.kohhoook.......
.kooooook.......
..koooook.......
...koooook......
....koooook.....
.....koooook....
......koooook...
.......kmmmmk...
.......kmssmk...
.......kmmmmk...
........kkkk....
................
................
"""), {"k": "#1e2024", "o": "#e0782a", "h": "#f5a55a", "m": "#4f5a68", "s": "#8e94a2"})

# What you are wearing: one top, and a palette per outfit. "As you are" is the same map in the
# character's own shirt colour, swapped in at runtime the way a passenger's is.
sprite("outfit", m("""
................
....kkkkkkkk....
...kccckkcccck..
..kccccclcccccck
..kcccclccccccck
..kkccclcccccckk
...kkcclcccccckk
....kcclcccccck.
....kcclcccccck.
....kcclcccccck.
....kcclcccccck.
....kcclcccccck.
....kcclcccccck.
....kkkkkkkkkkk.
................
................
"""), {"k": "#1e2024", "c": "#4a5a86", "l": "#6b7cab"})
variant("outfit_gym",     "outfit", {"c": "#3a8fd0", "l": "#7ab8e8"})
variant("outfit_suit",    "outfit", {"c": "#2a3140", "l": "#4a566e"})
variant("outfit_work",    "outfit", {"c": "#6b4423", "l": "#8f6a3f"})
variant("outfit_comfort", "outfit", {"c": "#6b7280", "l": "#9aa3b2"})
variant("outfit_hill",    "outfit", {"c": "#c0392b", "l": "#e07060"})
variant("outfit_beach",   "outfit", {"c": "#e8c53a", "l": "#f5e08a"})

sprite("inhaler", m("""
................
......kkkk......
.....kcccck.....
.....klbbbk.....
.....klbbbk.....
.....klbbbk.....
.....klbbbk.....
.....klbbbk.....
.....klbbbk.....
..kkkklbbbk.....
.kmmmmlbbbk.....
.kmmmmbbbbk.....
.kkkkkkkkkk.....
................
................
................
"""), {"k": "#1e2024", "b": "#3a6fd0", "l": "#6b9be8", "c": "#a0b8e8", "m": "#2b4a94"})

# ---------------------------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------------------------

BANNER = ("// Generated by pixel-workshop/make_cabin_textures.py - do not edit by hand.\n"
          "// Every sprite is an ASCII map plus a palette; game/engine/atlas.js draws them.\n")


def check():
    """Every map rectangular, every key coloured. A hole found here is not found in play."""
    problems = []
    for name, sp in SPRITES.items():
        widths = {len(r) for r in sp["rows"]}
        if len(widths) != 1:
            problems.append(f"{name}: ragged rows {sorted(widths)}")
        if len(sp["rows"]) > 16 or max(widths) > 16:
            problems.append(f"{name}: {max(widths)}x{len(sp['rows'])} is bigger than 16x16")
        used = {ch for row in sp["rows"] for ch in row if ch != "."}
        missing = used - set(sp["palette"])
        if missing:
            problems.append(f"{name}: no colour for {sorted(missing)}")
        for key, colour in sp["palette"].items():
            if not (isinstance(colour, str) and len(colour) == 7 and colour[0] == "#"
                    and all(c in "0123456789abcdefABCDEF" for c in colour[1:])):
                problems.append(f"{name}: {key} is not a hex colour ({colour!r})")
    return problems


def write_preview(path):
    from PIL import Image
    cols, cell = 12, 18
    names = sorted(SPRITES)
    rows = (len(names) + cols - 1) // cols
    img = Image.new("RGBA", (cols * cell, rows * cell), (40, 42, 48, 255))
    px = img.load()
    for i, name in enumerate(names):
        ox, oy = (i % cols) * cell + 1, (i // cols) * cell + 1
        sp = SPRITES[name]
        for y, row in enumerate(sp["rows"]):
            for x, ch in enumerate(row):
                if ch == ".":
                    continue
                c = sp["palette"].get(ch, "#ff00ff").lstrip("#")
                px[ox + x, oy + y] = (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), 255)
    img.resize((img.width * 3, img.height * 3), Image.NEAREST).save(path)


def main():
    problems = check()
    if problems:
        for p in problems:
            print("  !", p)
        print(f"{len(problems)} problem(s); nothing written.")
        return 1

    os.makedirs(OUT_DIR, exist_ok=True)
    blob = json.dumps(SPRITES, separators=(",", ":"), sort_keys=True)
    js = os.path.join(OUT_DIR, "cabin-sprites.js")
    with open(js, "w", encoding="utf-8") as fh:
        fh.write(BANNER)
        fh.write("window.PRS_ART = window.PRS_ART || {};\n")
        fh.write("window.PRS_ART.cabin = ")
        fh.write(blob)
        fh.write(";\n")
    print(f"{len(SPRITES)} sprites -> {os.path.relpath(js, ROOT)}")

    if "--json" in sys.argv:
        path = os.path.join(OUT_DIR, "cabin-sprites.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(SPRITES, fh, indent=1, sort_keys=True)
        print(f"                 -> {os.path.relpath(path, ROOT)}")

    if "--preview" in sys.argv:
        path = os.path.join(HERE, "cabin-preview.png")
        write_preview(path)
        print(f"                 -> {os.path.relpath(path, ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
