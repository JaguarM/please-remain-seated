PLEASE REMAIN SEATED
====================

There is a fire in the overhead locker above seat 14C. You are the only person on this aeroplane
who has noticed. The plane lands in fifteen minutes, and the clock only moves when you do.

**Open `index.html`.** That is the whole installation. No build step, no server, no dependencies —
every file is a classic script, so a double-clicked `index.html` works from disk.

    please-remain-seated/
      index.html          ← open this

![The cabin at five minutes to touchdown](docs/cabin.png)

*Five minutes fifteen to touchdown. Twelve souls secured, four people helping, the fire in the
locker above 14C has taken most of the left bank, and everybody with a green tick is somebody who
is somewhere better than their seat. Not a screenshot — `tools/render_frame.py` draws the game's
own simulation with the game's own sprite maps, so the picture regenerates from a seed.*

If your browser is unusually strict about `file://`, any static server will do:

```bash
python -m http.server 8731
```

The rules
---------

**Time only passes when you act.** Nothing moves while you think. Every action in the list costs a
number of seconds, and paying that cost is the only thing that advances the fire, the smoke, the
passengers and the crew. Nine hundred seconds, and then it lands.

**You cannot put the fire out.** Not a difficulty setting — the premise. It is a lithium cell in a
vape pen, in a hard case, in a closed locker, and a cell in thermal runaway makes its own oxygen.
Water cools it and buys time. Halon smothers the flame and buys more. Nothing reaches the cell.
There are nine cells and they are all going to go. `putOut()` does not exist in `game/sim/fire.js`.

**Smoke is what actually kills people.** It moves four times faster than the fire and fills from
the ceiling down. A person on the floor is in different air from a person standing up, which is
why carrying somebody forward and low is worth so much more than it looks.

**Nobody believes you, and they are right not to.** You are a passenger out of your seat during
the meal service, pointing at a closed locker. Credibility rises when the evidence becomes public
— a photograph, an open bin, a burn on your hand, the lavatory smoke detector — and every social
action in the game is gated behind it.

**You cannot save everybody.** You can carry about fourteen people in fifteen minutes. There are
sixty. The arithmetic is the design, not the difficulty. What you are playing for is the difference
between three and twenty-seven, and the route to the top of that range is not in the fire deck.

What is in it
-------------

- **315 hand-written actions** across eight decks, each with its own cost, conditions and line of
  text. Actions with targets appear once per target, so a turn offers **a hundred and thirty
  concrete options** at the median and over four hundred at the worst moment in the cabin — and
  the list only ever contains things that are actually possible right now.
- **Twelve playable characters**, ten available and two earned, on five stats — strength, speed,
  lungs, nerve, voice — with a signature ability and a genuine flaw each. A retired fire officer
  who is the slowest person in the cast. An eight-year-old who fits under the seats and cannot
  lift an adult. An air marshal with a firearm and no useful application for it.
- **Forty-three loadout items** against an eight-kilo cabin allowance the airline keeps enforcing
  while its aeroplane is on fire. The correct answer is boring and next to it there is a megaphone.
- **Sixty named passengers**, each with a weight, a temperament, a seat and an opinion, and a
  **helper system** that is the only thing in the game that scales.
- Cabin crew running a **six-phase procedure** that is excellent and is for a different fire.
- A **fire, smoke and heat simulation** over a 30×9 cabin grid, ventilation-limited, with a core
  that suppression cannot touch.
- **Forty-eight medals**, **fourteen endings**, and an **incident report** written in the flat
  voice of an air accident investigator: every soul on board by seat with what happened to them,
  your own actions quoted back in order, and where the fifteen minutes went.

Controls
--------

Click an action, or press **1–9** for the first nine. **Arrow keys** or **WASD** to step. **Click
a tile** to walk there or reach the person on it. **Tab** cycles the decks, **/** focuses the
filter box.

How it is built
---------------

```
index.html            the script order, which is the dependency graph
game/
  art/                generated sprite data (two files, both regenerable)
  engine/             seeded RNG, sprite atlas, synthesised audio, canvas renderer
  sim/                cabin geometry, fire, passengers, crew, the action engine, scoring
  data/               characters, items, the roster, events, medals, endings, the action decks
  ui/                 the play screen and the menu screens
  style.css
pixel-workshop/       the ProjectNauvis pixel workshop, plus make_cabin_textures.py
tools/                the play-testers and the sprite bundler
```

Everything assigns to one global, `window.PRS`, because the game has to run from a file you can
double-click and `file://` will not load an ES module or fetch a sibling JSON. The cost is that
the script order in `index.html` matters; the benefit is that the game is a folder you can open.

`game/sim/actions.js` has the only function in the codebase that moves the clock. Nothing else may
call `fire.advance`, `pax.advance` or `crew.advance`.

The art
-------

Every sprite is an ASCII map plus a palette, in the idiom of the ProjectNauvis pixel workshop that
this repository started as (see [ART.md](ART.md)). A passenger is one map and sixty palettes, so
the roster is data and the art cannot drift; fire is one map at four sizes, so the four read as
the same fire growing.

```bash
python pixel-workshop/make_cabin_textures.py --preview   # 85 cabin sprites + a preview sheet
python tools/bundle_nauvis_sprites.py                    # the pack's 54 item icons, as a script
```

The generator validates every map before it writes anything: rectangular, within 16×16, and no
palette key without a colour.

Testing it
----------

The game is three hundred hand-written functions that all touch the same world, so it is tested by
being played, a great many times, by things that are not people.

```bash
node tools/simulate.js 400        # six bots, a few hundred flights, and the balance table
node tools/coverage.js            # build a world for every action and perform it
node tools/coverage.js --verbose  # ...and print what each one said

node tools/dump_frame.js --at=480 --seed=447   # play to a moment and dump it
python tools/render_frame.py --scale=4         # draw that moment as a PNG
```

`simulate.js` finds the crashes and prints the tuning table. The numbers below are what the design
is aiming at, and they were found with it rather than guessed:

| bot | what it does | souls secured of 60 | not accounted for |
|-----|--------------|---------------------|-------------------|
| `fire` | only fights the fire | **1.9** | 18.8 |
| `idle` | never leaves its seat | 6.8 | 14.7 |
| `random` | picks uniformly from everything | 8.5 | 12.6 |
| `carry` | carries people, one at a time | 19.1 | 10.3 |
| `good` | recruits, delegates, then carries | **19.3** (best 31) | 11.4 |

If the fire bot ever scores well, the game has stopped being about the thing it is about.

`coverage.js` walks the registry instead of playing: for each of the 315 definitions it builds a
world designed to make that one possible, stands the player in every plausible place, and performs
it. It currently reports **315 of 315 reachable, none throw**. It has already found one action
that asked for an item which had never been added to `items.js`, and so could never have appeared
in a real game at all.

Licence
-------

The pixel art and the workshop tooling are ProjectNauvis's own work under its MIT licence
(copyright JaguarM), as described in [ART.md](ART.md). Everything else here was written for this
game.
