// The log book: what carries over between flights, and the only thing that does.
//
// Kept in the browser: how many flights you have flown, how many souls you saved across all of
// them, every medal you have ever been awarded, and the last sixty flights one line each.
//
// Saved, not survived. The book credits the difference between the flight you flew and the same
// aeroplane with you asleep in your seat, because forty-three people get off this aeroplane on
// their own and a book that counted those would fill itself while you made tea.
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
        // Only a flight that knows what it changed can be credited. Nothing reaches here
        // without one, but a book is a thing people keep and this is cheap.
        const saved = Math.max(0, result.saved || 0);
        const after = {
            flights: before.flights + 1,
            souls: before.souls + saved,
            medals: medals,
            history: [{
                at: Date.now(), seed: S.seed, character: S.character.id,
                outfit: S.outfit ? S.outfit.id : null,
                survived: result.survivors, saved: saved,
                lost: result.lost, grade: result.grade.key,
                ending: result.ending.title,
            }].concat(before.history).slice(0, KEEP),
        };
        save(after);
        // What turned over, as the thing itself and not its name: the unlock screen draws the
        // face or the coat beside it, and a name on its own cannot be drawn.
        const unlocked = PRS.data.characters.CHARACTERS
            .filter((c) => !isUnlocked(c, before) && isUnlocked(c, after))
            .map((c) => ({ kind: "character", name: c.name, character: c }))
            .concat(PRS.data.outfits.OUTFITS
                .filter((o) => !isUnlocked(o, before) && isUnlocked(o, after))
                .map((o) => ({ kind: "outfit", name: o.name, outfit: o })));
        return { before: before, after: after, saved: saved,
                 unlocked: unlocked, next: nextOutfit(after) };
    }

    /**
     * The locked character this flight came nearest to turning over, with how near it got, so the
     * unlock screen can print one card that is worth trying for instead of eight that are not.
     * Nothing to aim at, or nothing measurable, and there is no card.
     */
    function nearest(S, book) {
        book = book || load();
        let best = null;
        for (const c of PRS.data.characters.CHARACTERS) {
            if (isUnlocked(c, book)) continue;
            const medal = c.unlock && c.unlock.medal && PRS.medals.BY_ID[c.unlock.medal];
            if (!medal || !medal.near) continue;
            // Awarded on this flight and the card is still locked: a full bar under a lock
            // invites the wrong question, so that card is not the one to print.
            if (S.medals && S.medals[medal.id]) continue;
            const got = (S.nearly || {})[medal.id];
            if (!got || !got.need) continue;
            const part = Math.max(0, Math.min(1, got.have / got.need));
            if (!best || part > best.part) {
                best = { character: c, medal: medal, part: part,
                         have: Math.min(got.have, got.need), need: got.need, note: got.note };
            }
        }
        return best;
    }

    function forget() { store.drop("logbook"); }

    PRS.logbook = { load, isUnlocked, nextOutfit, counts, record, nearest, forget };
})(window);
