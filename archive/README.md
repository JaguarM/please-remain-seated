What was cut
============

Nothing in this folder is loaded by `index.html`. It is the source of everything removed from the
game on 2026-09-10, on one rule: nothing stays unless it can help. Sixty-four actions, seventeen
items, three medals and one ending went, and a good deal of it was funny, which is why it is here
rather than gone.

    cut-actions.js    the sixty-four actions, verbatim, grouped by the deck file they came from
    cut-items.js      the seventeen items: the air horn, the megaphone, the gin, the vape, ...
    cut-endings.js    the ending for the second vape, and the three medals that went with the cuts

To bring one back, paste it into the deck it came from, restore any item it needs from
`cut-items.js` (and put that item back in a pool or a passenger's lap in `passengers.js`), and run
`node tools/coverage.js`, which will tell you whether it can ever happen.

The ones worth a second look, in the author's opinion of the author's jokes: the air horn, the
megaphone, the gin miniatures, the neck pillow and the sock, *Shout FIRE* and its diminishing
returns, the trolley barrier, the safety card actually read, the lie about the crew, duct-taping
a man into his seat, the call button pressed forty times, the flight deck door, and the second
vape in the lavatory bin, which had an ending of its own.

What is not here is the family of things that were only ever refused: asking somebody who was
never going to say yes. Those actions still exist. They are simply not offered until the odds are
worth the seconds (`pax.worthAsking`, and `worth()` in the crew deck).
