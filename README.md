PLEASE REMAIN SEATED
====================

There is a fire in the overhead locker above seat 14C. You are the only person on this aeroplane
who has noticed. The plane lands in fifteen minutes, and the clock only moves when you do.

**Open `index.html`.** That is the whole installation. No build step, no server, no dependencies —
every file is a classic script, so a double-clicked `index.html` works from disk.

    please-remain-seated/
      index.html          ← open this

![The cabin at four minutes to touchdown](docs/cabin.png)

*Four minutes nine to touchdown. Nine souls secured at the two ends, nobody helping, eight
people on the floor, and the fire has moved: the seats round 14C are burnt through and it is
in rows 4 and 5 now, and 16 to 19. The aisle is full of people who have stood up with their
bags and stopped. Everybody with a green tick is somebody who is somewhere better than their
seat. Not a screenshot: `tools/render_frame.py` draws the game's own simulation with the
game's own sprite maps, and the bots roll their own dice off the run seed, so `--seed=606
--at=540` gives you this picture and not one like it.*

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

**You can change your mind, but you cannot change your luck.** Backspace undoes your last action
and gives the seconds back; a run of the same action undoes as one. What it will not undo is
anything that told you something you did not know — looking in a bin, asking somebody what they
have got — because you cannot un-see that. And the snapshot includes the position of the random
number stream, so repeating an action after an undo gives *exactly* the same result, down to the
sentence. Refusals cannot be re-rolled.

**You cannot ask the fire how it is doing.** There is no action that reads out its intensity, how
many cells are left, or when the next one goes. You can see the fire, on the screen, in the row it
is in. That is the readout, and it is the same one everybody else on the aeroplane has.

**The cabin's panic is on sixty faces and not in a bar.** Every passenger has eyes, a brow and a
mouth, and which of the five faces they are wearing comes from their own panic and their own
smoke dose. You find out that row 16 has understood what is happening because row 16 stops looking
calm, three rows at a time, ahead of the smoke. There is a meter for how much of the cabin has
noticed; there is not one for how frightened it is, because there are sixty people on the screen
already and they are better at saying it than a bar would be.

**There are two green columns and two places to put somebody down.** Both are galleys: steel,
doors, crew, and the furthest points in the aeroplane from the seat of the fire. The overwing exit
row in the middle is not one. It is a break in the seats with a door at each end, two rows from
the locker that is burning, and somebody put down there has been put down in the aisle. Being
accounted for is not a force field either: what was in the air where you left somebody is charged
for at touchdown, and the way you find that out is by looking at it.

**You cannot save everybody.** You can carry about fourteen people in fifteen minutes. There are
sixty. The arithmetic is the design, not the difficulty. What you are playing for is the difference
between three and twenty-seven, and the route to the top of that range is not in the fire deck.

**Almost nothing is decided before you board, and none of it has to be.** The title has one
button, and it puts you on the aeroplane as whoever you were last time — the first time, that is
Kip, in gym kit, with the sensible three — and the report has one button that puts you straight
back on it. The three decisions, if you want them, are on one screen: who you are, what you are
wearing, and which three things are on you, and none of them takes longer than twenty seconds.
Everything else — the other five items, and ten of the twelve characters — is found in the
aeroplane or earned by flying it. The only thing progress gates is characters, and every unlock
condition is printed on its own locked card, so the roster is a list of things to try rather than
a wall.

What is in it
-------------

- **126 hand-written actions** across seven decks, each with its own cost, conditions and line of
  text. Walking is not one of them — it is on the map, where the aeroplane is. There were 325;
  two trims took them down, the second on one rule: nothing stays unless it can help. Flavour,
  near-duplicates, readouts of the fire's state, jokes that cost seconds, and things whose only
  function was to make the day worse are gone. So is every request that was going to be refused:
  a card never offers you a conversation you are about to lose. What went is in `archive/`.
- **Twelve playable characters**, two to start and ten earned, on five stats — strength, speed,
  lungs, nerve, voice — with a signature ability and a genuine flaw each. A retired fire officer
  who is the slowest person in the cast. An eight-year-old who fits under the seats and cannot
  lift an adult. An air marshal with a firearm and no useful application for it.
- **Six outfits**, which do nothing at all except move your five numbers, and **three item slots**
  — the airline's cabin baggage allowance, still being enforced while its aeroplane is on fire.
- **Fourteen items**, of which nine are ever in your bag. The rest are already aboard: two in
  the galley drawers, and **four in other passengers' laps**, which means the way you get
  equipped is by talking to people.
- **Sixty named passengers**, each with a weight, a temperament, a seat and an opinion, and a
  **helper system** that is the only thing in the game that scales. All sixty have faces, and the
  faces are the same map with five pixels moved, so the aeroplane can look calm and then stop.
- **Thirty-five synthesised sounds** and not one audio file, because a folder you double-click
  should not need forty `.ogg`s to make a noise. Water, foam and halon are three different hisses
  and you learn them. Everything you do makes the right kind of noise whether or not anybody wrote
  it a specific one: the screen watches whether the action made its own sound and supplies a
  fallback for its deck when it did not.
- Cabin crew running a **six-phase procedure** that is excellent and is for a different fire.
- A **fire, smoke and heat simulation** over a 30×9 cabin grid, ventilation-limited, with a core
  that suppression cannot touch.
- **Forty medals**, **nine endings**, and an **incident report** written in the flat voice of
  an air accident investigator: every soul on board by seat with what happened to them, your own
  actions quoted back in order, and where the fifteen minutes went.

Controls
--------

**The aeroplane is the menu, and there are three things on it.** A person, the fire, and you.
Click one and a card opens on it with the handful of things you could do about it, each priced in
seconds. Out of reach is not a dead click: the card says how long the walk is and what you could
do once you got there, and one click on any of those does both. Everything else on the picture is
floor, and clicking floor walks you there; **arrow keys** or **WASD** step one tile. There is no
list of actions anywhere on the screen. There used to be, and then there were three suggestions,
and now the aeroplane is the whole interface.

**You are the biggest card.** Click yourself for everything about the place you are standing in
— the tap, the galley drawer, the trolley, the lockers — and for the things in your bag: the hood
goes on from here, and the card says where the bottle would be worth carrying, to the lavatory
tap when it is empty and to the fire when it is not. Walk into the lavatory or a galley and your
card opens by itself, because that is what you went there for. Things used *on* somebody — give
her the water — are on their card, not yours.

**A person is the thing in the middle of the tile, and the fire is the tile.** Nobody fills their
seat any more; a burning tile burns edge to edge from the first stage, and a seat that is on fire
is drawn as a seat that is on fire. So on a burning seat with somebody in it, the body is the
person and the flames round it are the fire, and the card gets a tab for the other one. The fire
is the harder of the two to hit, so it gets the outer two pixels of the body as well.

**Pointing costs nothing, and it shows.** Whatever is under the pointer gets a one-pixel halo in
its own shape — the person's silhouette, or the flames on that tile — and the floor gets the
price of walking to it. Hover somebody and you get their name, their weight and what state they
are in. Hover a row on a card and the person it would happen to is bracketed on the cabin,
wherever they are, with the price on their tile. Neither direction moves the clock. A plan costs
nothing until it is a decision, which is the one mercy in this game that is free.

**1–9** picks a row of the open card. **Backspace** undoes, from the button under the clock. **M**
turns the sound off. **?** brings the five-line briefing back.

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

Faces are the same trick again. The `pax` map has eight palette keys and only three of them were
chosen by anybody — hair, skin, shirt. The eyes, the brow, the mouth and the eyelids are worked
out from that person's own skin, so the palest face on board and the darkest both have eyes in
them and neither is a smudge; and `g`, the hair down the sides of the head, is either the hair
colour or the skin colour, which is the entire difference between a crop and hair past the jaw.
The five expressions are one body with five pixels moved. Nobody reads a mouth at three pixels to
the sprite pixel — what they read is how much dark there is on sixty faces at once.

```bash
python pixel-workshop/make_cabin_textures.py --preview   # 95 cabin sprites + a preview sheet
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
node tools/test_undo.js           # undo is exact, and cannot buy a better roll

node tools/dump_frame.js --at=540 --seed=606   # play to a moment and dump it
python tools/render_frame.py --scale=4         # draw that moment as a PNG

python tools/trim_actions.py --list            # every action id, by file
python tools/trim_actions.py fire.spit         # remove one, brace-matched, comment and all
```

`simulate.js` finds the crashes and prints the tuning table. The bots roll off their own seeded
coin rather than `Math.random`, and well away from the game's own stream, so a table is
reproducible and a dumped frame is a specific frame. The numbers below are six hundred flights,
and they are what the design is aiming at rather than something that was guessed:

| bot | what it does | souls secured of 60 | not accounted for |
|-----|--------------|---------------------|-------------------|
| `fire` | only fights the fire | **4.0** | 11.3 |
| `idle` | never leaves its seat | 4.1 | 22.2 |
| `random` | picks uniformly from everything | 9.8 | 16.2 |
| `novelty` | always takes the thing it has taken least | 17.1 | 13.1 |
| `carry` | carries and drags, one at a time | 14.4 | 19.4 |
| `good` | recruits early, then carries | **29.1** (best 49) | 12.8 |

The fire bot is the interesting row. It secures almost nobody and it has the fewest casualties,
because holding a fire down really does keep a cabin breathable — it just leaves everybody in the
seat they started in. That tension is the game: the score is souls you moved, and the fire is a
thing you can spend your whole afternoon on and be able to justify afterwards.

If the fire bot ever scores well, the game has stopped being about the thing it is about.

`test_undo.js` is the one that earns its keep. It plays a few hundred real turns, undoes and
redoes each one, and compares a digest of the entire simulation — every fire field, every
passenger, the clock, the random stream. It found two bugs on the first run: the flavour-line bags
were closures that could not be snapshotted, and refilling one *draws from the random stream*, so
losing them across an undo silently desynchronised every roll afterwards.

`coverage.js` walks the registry instead of playing: for each of the 126 definitions it builds a
world designed to make that one possible, stands the player in every plausible place, and performs
it. It currently reports **126 of 126 reachable, none throw**. It has already found one action
that asked for an item which had never been added to `items.js`, and so could never have appeared
in a real game at all.

Licence
-------

The pixel art and the workshop tooling are ProjectNauvis's own work under its MIT licence
(copyright JaguarM), as described in [ART.md](ART.md). Everything else here was written for this
game.
