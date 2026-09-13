// The flight everybody is on today.
//
// The game already had the whole of this and was not pointing it at a date: every die in a
// flight is cast at boarding from one seed, so two people typing the same number get the same
// aeroplane, the same sixty moods and the same fire. All a daily is, is the day deciding the
// number instead of the player - and then it is the same fifteen minutes for everyone who
// boards it, which is the only condition under which "I got 44" is a sentence worth saying.
//
// The date is the local one, because the day a person is having is the day their clock says.
// A day's seed is the date hashed, so it needs nothing from a server, arrives the same on every
// machine, and can be worked out for any date in either direction - which is what makes
// yesterday's flight something you can still be sent.
//
// What the day keeps is the first flight you land on it. Not the best: the point of a daily is
// that everyone flew the same aeroplane once, and a board of best-of-nine attempts is a board
// about who had the afternoon free. Flying it again is allowed and the log book credits it like
// any other flight - the aeroplane does not care - but the day's line stays the one you got
// the first time, and the screen says so rather than quietly keeping the better number.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const store = PRS.util.store;

    const KEEP = 90;                 // days of history; the streak never needs more
    const MS_DAY = 86400000;

    /** Today where the player is, as YYYY-MM-DD. */
    function keyOf(date) {
        const d = date || new Date();
        const p = (n) => String(n).padStart(2, "0");
        return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    }

    function today() { return keyOf(); }

    /** A date key back to a local midnight, for counting days between two of them. */
    function dateOf(key) {
        const [y, m, d] = String(key).split("-").map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    }

    function isKey(key) { return /^\d{4}-\d{2}-\d{2}$/.test(String(key || "")); }

    /** How many days apart two date keys are, ignoring clocks going forward and back. */
    function daysBetween(a, b) {
        return Math.round((dateOf(b) - dateOf(a)) / MS_DAY);
    }

    function shift(key, days) {
        const d = dateOf(key);
        d.setDate(d.getDate() + days);
        return keyOf(d);
    }

    /**
     * The aeroplane for a date. Hashed from the date and a word, so it is not the same number as
     * anything a player might type, and so that two dates a day apart are not two seeds a day
     * apart either.
     */
    function seedFor(key) {
        return PRS.util.seedFromString("TN447 daily " + key);
    }

    // ------------------------------------------------------------------------------- the book ---

    function all() {
        const raw = store.get("daily", null);
        const days = raw && typeof raw === "object" && raw.days && typeof raw.days === "object"
            ? raw.days : {};
        return { days: days };
    }

    function save(book) {
        // Only the ones worth keeping. Ninety days is more streak than anybody will have.
        const cut = shift(today(), -KEEP);
        const days = {};
        for (const key in book.days) if (isKey(key) && key >= cut) days[key] = book.days[key];
        store.set("daily", { days: days });
    }

    /** What stands for a day: the first flight landed on it, or nothing. */
    function standing(key, book) {
        return (book || all()).days[key || today()] || null;
    }

    /**
     * Write a landed flight into the day. The first one stands; the ones after it are counted
     * so the screen can say how many times you have been back, and change nothing else.
     */
    function record(S, result, book) {
        if (!S.daily || !isKey(S.daily)) return null;
        book = book || all();
        const was = book.days[S.daily];
        if (was) {
            was.flights = (was.flights || 1) + 1;
            save(book);
            return { day: S.daily, entry: was, stands: false, flights: was.flights };
        }
        const entry = {
            at: Date.now(),
            seed: S.seed,
            character: S.character.id,
            outfit: S.outfit ? S.outfit.id : null,
            survived: result.survivors,
            saved: Math.max(0, result.saved || 0),
            lost: result.lost,
            grade: result.grade.key,
            flights: 1,
            // The flight itself, so the day's line can be shared or watched months later.
            code: PRS.share ? PRS.share.encode(S, result) : null,
        };
        book.days[S.daily] = entry;
        save(book);
        return { day: S.daily, entry: entry, stands: true, flights: 1 };
    }

    /**
     * Days in a row, counted back from today. A day you have not flown yet does not break a
     * streak until it is over: at nine in the morning the streak is still yesterday's.
     */
    function streak(book) {
        book = book || all();
        let key = today();
        if (!book.days[key]) key = shift(key, -1);
        let n = 0;
        while (book.days[key]) { n++; key = shift(key, -1); }
        return n;
    }

    /** Every day flown, newest first, for the screen that lists them. */
    function history(book) {
        book = book || all();
        return Object.keys(book.days).sort().reverse()
            .map((key) => Object.assign({ day: key }, book.days[key]));
    }

    function forget() { store.drop("daily"); }

    PRS.daily = { keyOf, today, dateOf, isKey, daysBetween, shift, seedFor,
                  all, standing, record, streak, history, forget };
})(window);
