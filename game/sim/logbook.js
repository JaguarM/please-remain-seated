// The log book: what carries over between flights, and the only thing that does.
//
// Kept in the browser: how many flights you have flown, how many souls got off alive across all
// of them, every medal you have ever been awarded, and the last sixty flights one line each.
//
// Two kinds of thing unlock from it. A character unlocks when a particular medal is in the book,
// and the locked card says which - open the locker and look, get a child forward, be told to sit
// down three times - so the roster is a list of things to try rather than a wall. An outfit
// unlocks when the souls total reaches the number on it, so a good flight opens the wardrobe
// faster and a bad one still counts. Nothing is bought.
//
// Nothing in the simulation reads this. Medals ask it whether they are news; the title screen
// and the report do the rest.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const store = PRS.util.store;

    const KEEP = 60;

    function load() {
        const raw = store.get("logbook", null) || {};
        return {
            flights: typeof raw.flights === "number" ? raw.flights : 0,
            souls: typeof raw.souls === "number" ? raw.souls : 0,
            medals: raw.medals && typeof raw.medals === "object" ? raw.medals : {},
            history: Array.isArray(raw.history) ? raw.history : [],
        };
    }

    function save(book) { store.set("logbook", book); }

    /**
     * Whether a character or outfit is available. `unlock` is a souls total (a number), a medal
     * ({ medal, text }), or nothing at all for the ones you start with.
     */
    function isUnlocked(thing, book) {
        const u = thing.unlock;
        if (!u) return true;
        book = book || load();
        if (typeof u === "number") return u <= book.souls;
        return !!book.medals[u.medal];
    }

    /** The next outfit the souls total will turn over, or null. */
    function nextOutfit(book) {
        book = book || load();
        return PRS.data.outfits.OUTFITS.filter((o) => o.unlock > book.souls)
            .sort((a, b) => a.unlock - b.unlock)[0] || null;
    }

    /** "4 of 9 people, 2 of 6 outfits". */
    function counts(book) {
        book = book || load();
        const C = PRS.data.characters.CHARACTERS, O = PRS.data.outfits.OUTFITS;
        return {
            people: C.filter((c) => isUnlocked(c, book)).length, ofPeople: C.length,
            outfits: O.filter((o) => isUnlocked(o, book)).length, ofOutfits: O.length,
        };
    }

    /**
     * Write a landed flight into the book: the flight, the souls, and every medal awarded on the
     * way. Returns what changed, so the report can say it, including everything that unlocked.
     */
    function record(S, result) {
        const before = load();
        const medals = Object.assign({}, before.medals);
        for (const id in S.medals) if (!medals[id]) medals[id] = before.flights + 1;
        const after = {
            flights: before.flights + 1,
            souls: before.souls + (result.survivors || 0),
            medals: medals,
            history: [{
                at: Date.now(), seed: S.seed, character: S.character.id,
                outfit: S.outfit ? S.outfit.id : null,
                survived: result.survivors, lost: result.lost, grade: result.grade.key,
                ending: result.ending.title,
            }].concat(before.history).slice(0, KEEP),
        };
        save(after);
        const unlocked = PRS.data.characters.CHARACTERS
            .filter((c) => !isUnlocked(c, before) && isUnlocked(c, after))
            .map((c) => c.name)
            .concat(PRS.data.outfits.OUTFITS
                .filter((o) => !isUnlocked(o, before) && isUnlocked(o, after))
                .map((o) => o.name));
        return { before: before, after: after, unlocked: unlocked, next: nextOutfit(after) };
    }

    function forget() { store.drop("logbook"); }

    PRS.logbook = { load, isUnlocked, nextOutfit, counts, record, forget };
})(window);
