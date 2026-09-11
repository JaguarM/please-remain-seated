// The log book: what carries over between flights, and the only thing that does.
//
// Kept in the browser: how many flights you have flown, how many souls you have secured across
// all of them, and the last sixty flights one line each. Characters and outfits each name a
// souls total at which they unlock, so a good flight unlocks things faster than a bad one, and a
// bad one still counts for something, because three secured is three. There is nothing to buy
// and nothing to choose: reach the number and the card turns over.
//
// Nothing in the simulation reads this. It is the title screen's business and the report's.
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
            history: Array.isArray(raw.history) ? raw.history : [],
        };
    }

    function save(book) { store.set("logbook", book); }

    /** Everything that can be unlocked, in the order it unlocks. */
    function ladder() {
        const C = PRS.data.characters.CHARACTERS.map((c) => ({ kind: "character", id: c.id,
            name: c.name, unlock: c.unlock }));
        const O = PRS.data.outfits.OUTFITS.map((o) => ({ kind: "outfit", id: o.id,
            name: o.name, unlock: o.unlock }));
        return C.concat(O).sort((a, b) => a.unlock - b.unlock);
    }

    function isUnlocked(thing) {
        return !thing.unlock || thing.unlock <= load().souls;
    }

    /** The next thing the log book will turn over, or null once it has turned them all. */
    function next() {
        const souls = load().souls;
        return ladder().filter((t) => t.unlock > souls)[0] || null;
    }

    /**
     * Write a landed flight into the book. Returns what changed, so the report can say it:
     * the totals before and after, and everything that unlocked on the way.
     */
    function record(S, result) {
        const before = load();
        const after = {
            flights: before.flights + 1,
            souls: before.souls + (result.secured || 0),
            history: [{
                at: Date.now(), seed: S.seed, character: S.character.id,
                outfit: S.outfit ? S.outfit.id : null,
                secured: result.secured, lost: result.lost, grade: result.grade.key,
                ending: result.ending.title,
            }].concat(before.history).slice(0, KEEP),
        };
        save(after);
        const unlocked = ladder().filter((t) => t.unlock > before.souls && t.unlock <= after.souls);
        return { before: before, after: after, unlocked: unlocked, next: next() };
    }

    function forget() { store.drop("logbook"); }

    PRS.logbook = { load, ladder, isUnlocked, next, record, forget };
})(window);
