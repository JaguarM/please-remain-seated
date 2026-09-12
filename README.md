PLEASE REMAIN SEATED
====================

There is a fire in the overhead locker above seat 14C. You are the only person on this aeroplane
who has noticed. The plane lands in fifteen minutes, and the clock only moves when you do.

**Open `index.html`.** No build step, no server, no dependencies. If your browser is strict about
`file://`, `python tools/serve.py` serves it on http://localhost:8731.

![The cabin four minutes out](docs/cabin.png)

*Four minutes to touchdown. The fire has the left bank from row 8 to row 22 and has already
burnt through the seats in the middle of it, the aisle is full of people who stood up, twelve
have been moved to the floor by the doors, eight are down, and the flight deck has declared.
Drawn by `tools/render_frame.py` from the game's own simulation and sprite maps, so
`--seed=606 --at=540` gives you this picture and not one like it: every die in the flight is
cast from the seed.*

The rules
---------

- **Time only passes when you act.** Every action costs seconds, and paying them is the only
  thing that moves the fire, the smoke, the passengers and the crew. Nine hundred seconds, and
  each action's go by on the aeroplane in front of you before you get to take the next one.
- **You cannot put the fire out.** It is a lithium cell in a vape in a hard case in a closed
  locker. Water cools it, halon smothers the flame, nothing reaches the cell. Nine cells, and
  every one of them is going to go. Fighting it still matters: it keeps the smoke down and the
  aisle walkable, and it comes down on the people sitting under it, who remember.
- **Smoke is what kills.** It moves four times faster than the fire and fills from the ceiling
  down. A person on the floor is in different air from a person standing up.
- **Nowhere is safe.** When the doors open, every passenger is judged where they are: the smoke
  they have breathed, the air where they are lying, whether they are low, whether anything is
  over their face, and the aisle between them and a door. The score is how many of the sixty get
  off alive.
- **Nobody believes you, and they are right not to.** Credibility rises with evidence: a
  photograph, an open bin, a burn on your hand, the lavatory smoke detector, somebody getting up
  to help. Every social action is gated on it. A sceptic is not gated on it at all: a sceptic is
  not talked round, a sceptic is shown, and until they have seen the photograph or the open bin
  or enough smoke to need neither, there is no sentence you own that will move them. The
  photograph works on each person once, because nobody looks at the same photograph twice.
- **You cannot save everybody.** Alone you can carry a handful of people the length of the
  cabin. A recruited helper moves people for the rest of the flight without being told, and there
  is no ceiling on how many of them there can be: the limit is the aeroplane. What stops the
  eighth from being as cheap as the second is that everybody still sitting down by then is
  somebody who has already said no, and the aisle they would be working is fuller than it was.
  Fifty-four is very hard, and sixty is not on offer.
- **You can change your mind, not your luck.** Every die in the flight is cast at boarding, from
  the seed on the pass: what mood each passenger is in, when the fire jumps a row, what the cabin
  does on its third turn. Backspace undoes the last action and gives the seconds back, one action
  at a time, and so does walking back: every walk leaves the tile you left from marked on the
  floor behind you, and stepping onto one of those is the walks since then undone. A refusal
  undone is a refusal again, whatever you do first. Anything that told you something new stays
  done.

Languages
---------

The game is in English and in German, and **Einstellungen** on the title screen (or Escape, in
the air) has the picker, next to a volume slider. It opens in the language your browser is set
to, and the choice outlives the tab. Changing it mid-flight redraws the cabin, the cards and the
tooltips at once; the lines already in the log stay in the language they were written in,
because the log is a record of what happened and rewriting it underneath you would be a strange
thing to do.

A new language is a folder of catalogues and no changes to the game. The key is the English
sentence itself, so a missing line is the English and never an empty box, and

    node tools/i18n_scan.js          what each language has and has not
    node tools/i18n_scan.js de       the lines still to write, as a stub catalogue
    node tools/i18n_scan.js de --stale   lines the game no longer says

reads the source rather than a play-through, which means a sentence changed in the game shows up
as a line to rewrite in every language the next time anybody looks. The parts of a language that
are rules rather than sentences - "eine Rauchhaube" against "ein Inhalator", where to stand
against where to go - are registered by the catalogue itself through `PRS.i18n.grammar`, so the
game never has to guess at a grammar it does not have.

Controls
--------

The aeroplane is the menu. Click a person, the fire, or yourself and a card opens with the few
things you could do about it, each priced in seconds. Out of reach is not a dead click: the card
prices the walk and lists what you could do once there, and one click does both. Everything else
is floor, and clicking floor walks you there.

Arrow keys or WASD step, and a step back onto the trail behind you is a step back in time. 1–9
pick a row of the open card. Backspace undoes. M mutes. Escape closes whatever is open over the
cabin, and opens the settings when there is nothing left to close. The settings hold the sound,
the language, the help card and the way out of a flight, which asks first, because a flight is
saved nowhere and leaving one is leaving it.

Who you are
-----------

The title is a boarding pass and nothing else: a face, a name, a seat, one line about what that
person is for, and the button. One click puts you on the aeroplane as whoever you were last
time, and the first time that is Dr Priya Ansel, who talks people out of their seats and cannot
lift the heavy ones.

"Change who you are" appears from the second flight and holds everything you can change. The
loadout is there: what you are wearing and the three things on you, each a box that opens a page
of choices, except the ones that are part of who the character is, which have a lock in the
corner. Deidre Volk always boards with her gloves and her tape; the other slot is yours.

The fifth box is the seed. Leave it and every flight is a new one; type a number or a word and it
is the same aeroplane, the same moods and the same fire until you clear it, which is how two
people compare what they did with one fifteen minutes, and `index.html?seed=606` opens with it
filled in. The same page has the dice. **Perfect luck** is for testing a plan: every coin lands
your way and everything on a timer, the fire included, happens at its middle time, so what is
left to vary is what you do. Nothing from a flight like that goes in the log book.

The same screen opens the roster: nine people, two of them free. Gordy Mach carries two at a time
and nobody listens to him. Each of the other seven is locked behind something you do on the
aeroplane, printed on the card, and each one makes you play a different way to earn it: open the
locker and look inside, recruit four helpers, carry five people yourself, get the flight deck to
declare inside five minutes, be told to sit down by three different passengers, get a child out of
the rows, get fifty-two people off alive.

There are no perks. Each person is four numbers, one to ten, and every number is a multiplier on
something you feel inside a minute: strength (how long a carry takes, who can be carried at all,
and at ten, two at once), speed, lungs, voice. What else makes them different is data the
game already understands: what is on them when they board, and which row they are sitting in.
Six outfits move the four numbers by a point or two; they unlock as the souls total in the log
book climbs, ten for the first and five hundred for the last.

**The log book** is the only thing that carries over between flights: flights flown, souls saved
across all of them, every medal ever awarded, and the last sixty flights one line each. Saved,
not survived: forty-odd people get off this aeroplane whatever you do, so the book credits the
difference between the flight you flew and the same aeroplane with you asleep in 9C, which is the
number the screen after the report is about and the only number that fills the bar. Nothing is bought. Everything else in the aeroplane, from the galley drawers to what other
passengers have in their laps, is found in flight, and asking somebody what they have is the same
conversation that recruits them.

What is in it
-------------

- **82 actions** across seven decks, each with a cost, a condition and a line of text. Every one
  changes a number the score depends on. The ones that did not are in git history.
- **Nine characters, six outfits and a bag of three from a pool of nine.** Two characters are
  free; the rest are earned by playing a particular way. The outfits open with the souls total.
- **60 named passengers** with a weight, a temperament, a seat and an opinion, and a helper
  system that is the only thing in the game that scales. All sixty have faces: one map, sixty
  palettes, five expressions from five pixels moved.
- A **fire, smoke and heat simulation** over a 30×9 grid, with a core that suppression cannot
  reach.
- Cabin crew running a **six-phase procedure** that is excellent and is for a different fire.
- Seven events, 26 medals that each say one thing about the arithmetic, six endings, and an
  **incident report** in the flat voice of an air accident investigator: every soul by seat,
  your own actions quoted back in order, and where the fifteen minutes went. Then one more
  screen: what you changed, what the book credited for it, and the locked person you came
  nearest to.
- A **flight recorder** on the report, which keeps your last thirty flights and plays them back.
- 31 synthesised sounds and no audio files.
- **English and German**, every word of both, from the title screen to the sixty passengers'
  refusals to the incident report: 1,062 lines, and a scanner that says what a language is
  missing before a player finds out.

How it is built
---------------

    index.html            the script order, which is the dependency graph
    game/
      art/                cabin-sprites.js, generated by pixel-workshop/make_cabin_textures.py
      engine/             the dice (one seed, a stream per named thing), DOM sugar, sprite
                          atlas, synthesised audio, renderer
      sim/                cabin geometry, fire, passengers, crew, the action engine, undo,
                          scoring, the log book that carries over between flights, and the
                          flight recorder
      data/               characters, outfits, items, the roster, events, medals, endings, the
                          action decks
      i18n/               the translator, and one folder of catalogues per language
      ui/                 hotspots (what a click means), the play screen, the other screens,
                          the settings panel
      style.css
    pixel-workshop/       the art generator: every sprite is an ASCII map plus a palette, and
                          --preview draws the whole set on one sheet, in context and by name
    tools/                the play-testers, replay and harm, the frame renderer, a dev server

Everything assigns to one global, `window.PRS`, because the game has to run from a double-clicked
file and `file://` will not load an ES module. `game/sim/actions.js` has the only function that
moves the clock: a passage of twelve-second sub-steps, which the bots and the replays take in one
go and the play screen takes a frame at a time, so that an action's seconds can be watched going
by. Nothing else may call `fire.advance`, `pax.advance` or `crew.advance`.

An action is data:

    { id, deck, label, detail, cost, when, run, tags, danger, once, targets, item }

Every string a player can read goes through `T()`, keyed on the English sentence. A `label` that
is a plain string is that English, marked `K()`, and is translated where the card is built; a
`label` that is a function runs with the state in front of it and calls `T()` on its own pieces.
Interpolation is `{name}`, never `+`, because German does not put the pieces of a sentence in
the order English does and a translator has to be able to move them.

`targets` makes one definition appear once per person you can reach. `item` names the thing in
your bag it uses, which is how clicking the bottle finds everything the bottle can do. Add one to
a deck file and it is on the right card the next time the page loads. The rule for whether it
belongs: it has to change a number the score depends on, through a path the player can see, and
not be a dearer copy of something already on the card.

Testing it
----------

    node tools/simulate.js 360 --char=ansel   # the bots, the balance table, any crash
    node tools/simulate.js 100 --char=yuki --strategy=good,blend --outfit=gym
    node tools/simulate.js 8 --luck=perfect --seed=1   # every bot once, no dice: the plans alone
    node tools/harm.js 60 --strategy=idle     # where the harm at touchdown comes from, by part
    node tools/replay.js flights.json         # play recorded flights back against the bots
    node tools/coverage.js                    # every action performed at least once
    node tools/test_undo.js                   # undo is exact; neither it nor a detour buys a roll,
                                              # and a second played slowly is the same second
    node tools/i18n_scan.js                   # what each language has, and what it is missing
    node tools/dump_frame.js --at=540 --seed=606 && python tools/render_frame.py --out=docs/cabin.png
    python tools/trim_actions.py --list       # every action id; pass ids to remove them cleanly

The bots are deliberately stupid in different directions, and the table they print is what the
design aims at. Survivors of 60 as Priya, sixty flights each:

| bot | what it does | survived | best |
|---|---|---|---|
| idle | does nothing at all: the report's "without you" | 20 | 29 |
| fire | only the fire deck: the bin, the case, the sink | 35 | 60 |
| douse | the first playtest: pours from where one pour reaches the most fire, refills at the tap | 33 | 49 |
| carry | carries whoever is worst off to the best floor by a door | 31 | 48 |
| good | recruits early, then carries | 34 | 51 |
| blend | two or three minutes at the fire while it is small, then recruits and carries | 39 | 58 |

No bot that does one thing is far ahead of the others, and the one that does two is ahead of all
of them. If the fire bot or the douse bot ever leads the table, fighting the fire has become the
whole game again; if either falls to the idle line, it has stopped being worth doing.

**Playtesting.** The report has a flight recorder: the last thirty flights, each with a box for
what you were trying to do. "Save recorded flights" writes them to a file, and `tools/replay.js`
replays every one exactly and flies the same seed with the idle, douse, good and blend bots, so
a flight a person played can be read against the table.

Publishing it
-------------

The game is on itch.io at <https://jaguarm.itch.io/please-remain-seated>, and it goes there with

    python tools/publish_itch.py              # builds, then pushes with butler
    python tools/publish_itch.py --dry-run    # builds and stops
    python tools/serve.py 8745 dist/web       # play the build, not the working tree

`tools/build_web.py` reads index.html and copies exactly the files index.html loads into
`dist/web`, which is fifty files and 790 kB. That is not tidiness. itch.io refuses an
HTML5 upload with more than a thousand files in it, and this folder zipped whole is twelve
hundred: nine hundred of them are git objects, and the rest are the sprite generator, the frame
renderer, `__pycache__` and a README with a picture in it. None of that is the aeroplane.

Because the list comes out of index.html rather than being written down twice, a script added to
the page is in the next build and a script taken off it is not. If the page asks for a file that
is not on disk the build stops instead of shipping without it.

The channel is `html5` and the name is load-bearing: itch treats a build as playable in the
browser when the channel name contains "html", so `web` would upload a download. The build is
stamped with the git commit it came from, which is how you tell later which one is on the page.
butler sends only changed blocks, so a typo fix is a twenty-kilobyte upload.

The page settings live on itch and are set by hand once: kind "HTML", the html5 upload ticked as
played in the browser, and a viewport of about 1280x900 with the fullscreen button on. The
layout is `100vh` with a breakpoint at 1000px, so anything narrower than that gets the stacked
version in a small box, which is not the game.

Text
----

Every sentence the player reads is in one of four places: `game/data/` (the decks, the roster,
the characters and outfits, events, medals, endings), `game/sim/crew.js` and `game/sim/pax.js` (what the
crew and the cabin say), `game/ui/` (title, help, HUD, report), and the renderer's five labels.
Nothing is assembled from English at runtime except names, seats and numbers. Translating the
game means those files.

The pixel-art idiom, one map and a palette per family, comes from the ProjectNauvis workshop
(MIT, JaguarM). Everything here was written for this game.
