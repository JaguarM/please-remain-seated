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
python tools/serve.py
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

**You cannot ask the fire how it is doing.** There is no action that reads out its intensity, how
many cells are left, or when the next one goes. You can see the fire, on the screen, in the row it
is in. That is the readout, and it is the same one everybody else on the aeroplane has.

**You cannot save everybody.** You can carry about fourteen people in fifteen minutes. There are
sixty. The arithmetic is the design, not the difficulty. What you are playing for is the difference
between three and twenty-seven, and the route to the top of that range is not in the fire deck.

**Almost nothing is decided before you board.** Three decisions, none of them longer than twenty
seconds: who you are, what you are wearing, and which three things are on you. Everything else —
the other forty items, and ten of the twelve characters — is found in the aeroplane or earned by
flying it. The only thing progress gates is characters, and every unlock condition is printed on
its own locked card, so the roster is a list of things to try rather than a wall.

What is in it
-------------

- **188 hand-written actions** across seven decks, each with its own cost, conditions and line of
  text. A turn offers about **seventy concrete options**, and the list only ever contains things
  that are actually possible right now. There were 325 of them until a playtest said the options
  were the ridiculous part rather than the story; the 139 that went were flavour, near-duplicates,
  readouts of the fire's state, and things whose only function was to make the day worse.
- **Twelve playable characters**, two to start and ten earned, on five stats — strength, speed,
  lungs, nerve, voice — with a signature ability and a genuine flaw each. A retired fire officer
  who is the slowest person in the cast. An eight-year-old who fits under the seats and cannot
  lift an adult. An air marshal with a firearm and no useful application for it.
- **Six outfits**, which do nothing at all except move your five numbers, and **three item slots**
  — the airline's cabin baggage allowance, still being enforced while its aeroplane is on fire.
- **Twenty-eight items**, of which ten are ever in your bag. The rest are already aboard: four in
  the galley drawers, the seat pockets and the footwells, and **thirteen in other passengers'
  laps**, which means the way you get equipped is by talking to people. And one more, which is in
  a bin at the back and does nothing at all.
- **Sixty named passengers**, each with a weight, a temperament, a seat and an opinion, and a
  **helper system** that is the only thing in the game that scales.
- Cabin crew running a **six-phase procedure** that is excellent and is for a different fire.
- A **fire, smoke and heat simulation** over a 30×9 cabin grid, ventilation-limited, with a core
  that suppression cannot touch.
- **Forty-three medals**, **ten endings**, and an **incident report** written in the flat voice of
  an air accident investigator: every soul on board by seat with what happened to them, your own
  actions quoted back in order, and where the fifteen minutes went.

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
  data/               characters, outfits, items, the roster, events, medals, endings,
                      and the nine files of action decks
  ui/                 the play screen and the menu screens
  style.css
pixel-workshop/       the ProjectNauvis pixel workshop, plus make_cabin_textures.py
tools/                the play-testers, the frame renderer, the sprite bundler and a
                      no-cache dev server
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

The game is a couple of hundred hand-written functions that all touch one world, so it is tested by
being played, a great many times, by things that are not people.

```bash
node tools/simulate.js 400        # six bots, a few hundred flights, and the balance table
node tools/coverage.js            # build a world for every action and perform it
node tools/coverage.js --verbose  # ...and print what each one said

node tools/dump_frame.js --at=480 --seed=447   # play to a moment and dump it
python tools/render_frame.py --scale=4         # draw that moment as a PNG

python tools/trim_actions.py --list            # every action id, by file
python tools/trim_actions.py fire.spit         # remove one, brace-matched, comment and all
```

`simulate.js` finds the crashes and prints the tuning table. The numbers below are what the design
is aiming at, and they were found with it rather than guessed:

| bot | what it does | souls secured of 60 | not accounted for |
|-----|--------------|---------------------|-------------------|
| `fire` | only fights the fire | **2.7** | 6.7 |
| `idle` | never leaves its seat | 6.1 | 16.8 |
| `novelty` | always takes the thing it has taken least | 10.5 | 6.3 |
| `random` | picks uniformly from everything | 10.7 | 11.8 |
| `carry` | carries and drags, one at a time | 21.1 | 11.3 |
| `good` | recruits early, then carries | **26.4** (best 38) | 11.1 |

The fire bot is the interesting row. It secures almost nobody and it has the fewest casualties,
because holding a fire down really does keep a cabin breathable — it just leaves everybody in the
seat they started in. That tension is the game: the score is souls you moved, and the fire is a
thing you can spend your whole afternoon on and be able to justify afterwards.

If the fire bot ever scores well, the game has stopped being about the thing it is about.

`coverage.js` walks the registry instead of playing: for each of the 188 definitions it builds a
world designed to make that one possible, stands the player in every plausible place, and performs
it. It currently reports **188 of 188 reachable, none throw**. It has already found one action
that asked for an item which had never been added to `items.js`, and so could never have appeared
in a real game at all.

Licence
-------

The pixel art and the workshop tooling are ProjectNauvis's own work under its MIT licence
(copyright JaguarM), as described in [ART.md](ART.md). Everything else here was written for this
game.
