The art pack
============

(This file was the repository's original README, describing the pixel art and tooling that
Please Remain Seated was built on top of. The game's own README is in README.md.)

From ProjectNauvis
------------------

Pixel art and the tooling behind it, copied out of the ProjectNauvis Minecraft modpack on
2026-09-08 for use in a JavaScript pixel-art RPG. Everything here is the pack's own work under
its MIT licence (copyright JaguarM); nothing of Factorio's or Mojang's is in this folder.

What is here
------------

    sprites/items/       51 item icons, 16x16 PNG with transparency
    sprites/gui/         3 HUD meter sprites: a flame, a lightning bolt, an arrow
    pixel-workshop/
      sprites.json       every sprite above as an ASCII map plus a palette
      pixelmap.js        draws a sprites.json entry to a canvas, with palette swaps
      demo.html          opens in a browser from disk; every sprite, and a few recolours
      make_*_textures.py the original Python generators (they write into the modpack)
      WORKSHOP-README.md the conventions the maps follow

The icons
---------

Drawn in vanilla Minecraft's idiom - an outline, three or four tones, one highlight - so they sit
beside stock Minecraft art. For an RPG the useful ones are:

- **Seven flasks** (`*_science_pack`): one map, seven liquid colours. Potions. Recolour the `c`,
  `b`, `d` keys for any new one; see the bottom of `demo.html`.
- **Two guns** (`pistol`, `submachine_gun`), drawn level with the muzzle to the left, and two
  curved **magazines** with a yellow or red stripe.
- **Armour** (`light_armor`, `heavy_armor`), a **grenade**, a **repair pack** (wrench and
  screwdriver), **explosives** (three sticks with fuses).
- **Materials**: gear, rod, coil of wire, plates, plastic bar, sulfur crystal, battery, engine,
  motor, circuit boards in three colours, honeycomb plate, fuel canister, coal brick.
- **Eight barrels**: one drum, a colour band per fluid.
- **Nine modules**: one square unit with three lamps, three colours, gold stripes for tiers.
- **Three meters** (`sprites/gui`): draw the sprite tinted dark as the empty meter, then the bright
  sprite over it from the bottom up (or the left, for the arrow) as far as the meter is full.

The technique
-------------

A sprite is an ASCII map and a palette. A family - potions, barrels, modules, circuit boards,
magazines - is one map with a palette per member, so the members cannot drift apart and a new
one is a line of colours. `pixelmap.js` does this at runtime:

    import { drawSprite, spriteCanvas, recolour } from "./pixel-workshop/pixelmap.js";
    import sprites from "./pixel-workshop/sprites.json" with { type: "json" };

    const healthPotion = spriteCanvas(sprites.automation_science_pack, 4);
    const manaPotion = spriteCanvas(sprites.automation_science_pack, 4,
        { c: "#3a5ad4", b: "#8aa4ff", d: "#1a2a8a" });
    drawSprite(ctx, sprites.pistol, x, y, 3);

`sprites.json` is checked pixel for pixel against the PNGs when it is exported, so either is the
source. To draw a new sprite, write its map in the same shape (16 rows of 16, `.` transparent)
and give it a palette; a key with no colour is drawn magenta so the hole is seen.

The Python scripts are how the modpack makes its PNGs. They write into the modpack's folders, so
run them there; here they are the readable source of every map, with the reasoning in their
docstrings. `make_belt_textures.py` has one trick worth knowing for animation: a belt that moves
1.5 pixels a frame gets eight frames and a frame list that walks them one pixel, then two, so any
speed can be animated from whole-pixel frames.

Not copied
----------

The modpack's block textures (belts, chests, drills, turrets) are faces of 3D Minecraft blocks and
do not read as top-down or side-on tiles. `tools/render_model.py` there projects a Minecraft block
model into a 2D sprite, which is only useful with Minecraft models. The research screen in
`nauvis_research` lays out a technology tree in Java; if the RPG wants a skill tree, its layout
rules (`ResearchScreen.java`) are worth reading, not porting.


Added for the game
------------------

    pixel-workshop/make_cabin_textures.py   95 more sprites in the same idiom: the cabin seen from
                                            above, sixty-one people out of three bodies and five
                                            faces, fire at four intensities, and forty-one loadout
                                            icons.
    tools/bundle_nauvis_sprites.py          re-emits sprites.json as a classic script, because the
                                            game has to open from a double-clicked index.html and a
                                            file:// page may not fetch a sibling JSON.

Both write into `game/art/`. Neither touches anything above.

Faces, which are a palette problem
----------------------------------

The pack's family trick - one map, a palette per member - is what sixty-one passengers are made
of, and the same trick is what gives them expressions and haircuts without a second drawing.

The `pax` map has eight keys in it. Three are chosen: `h` hair, `s` skin, `c` shirt. The other
five are not colours anybody picked:

    e   the eyes        skin x 0.30
    b   the brow        skin x 0.46
    m   the mouth       skin x 0.40
    l   the eyelids     skin x 0.72
    g   the hair down the sides of the head

`e`, `b`, `m` and `l` are computed from that person's own skin by `PRS.pax.palette`, which is why
the palest face on board and the darkest both have eyes in them and neither is a smudge: a fixed
brown eye would vanish on `#3f2717` and shout on `#f2d0b4`.

`g` is the one worth stealing. Its pixels sit on the outside of the face, where the skin was, so
setting `g` to the skin colour draws short hair and setting it to the hair colour draws hair past
the jaw. Two heads, one map, and the choice is a palette entry - `black` or `black_long` in
`passengers.js`.

Expressions are five pixels moved rather than five drawings. `make_cabin_textures.py` keeps one
body and a set of five-row patches over rows 5-9, columns 3-12, where `~` means "leave the body
alone":

    ""          "_worried"      "_afraid"       "_asleep"       "_relieved"
    ~~~~~~~~~~  ~~bb~~bb~~      ~~bb~~bb~~      ~~~~~~~~~~      ~~~~~~~~~~
    ~~ee~~ee~~  ~~ee~~ee~~      ~~ee~~ee~~      ~~ll~~ll~~      ~~ee~~ee~~
    ~~~~~~~~~~  ~~~~~~~~~~      ~~~~~~~~~~      ~~~~~~~~~~      ~~~m~~m~~~
    ~~~~mm~~~~  ~~~mmmm~~~      ~~~mmmm~~~      ~~~~ll~~~~      ~~~~mm~~~~
    ~~~~~~~~~~  ~~~~~~~~~~      ~~~~mm~~~~      ~~~~~~~~~~      ~~~~~~~~~~

The readout is not the shape of any one face - at three pixels to the sprite pixel nobody is
reading a mouth - it is how much dark there is on sixty of them at once. A calm cabin is pale. A
frightened one is not. `PRS.pax.face` decides which patch somebody is wearing from their panic
and their smoke dose, and it is the only panic meter the cabin has.
