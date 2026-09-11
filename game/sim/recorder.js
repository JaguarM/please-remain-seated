// The flight recorder: what you did, in a form that plays back.
//
// A flight is a seed, a loadout and the list of things you did, because the simulation is
// nothing else: every die was cast at boarding from the seed, so the actions that were still
// standing at touchdown replay to the same touchdown.
// `node tools/replay.js` does exactly that, which is how a flight played in a browser turns into
// something the balance table can read.
//
// The last thirty flights are kept in the browser, each with an optional note in the player's
// own words about what they were trying to do, because that is the one thing a replay cannot
// work out.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const store = PRS.util.store;

    const KEEP = 30;
    const VERSION = 1;

    function all() {
        const list = store.get("recordings", []);
        return Array.isArray(list) ? list : [];
    }

    function capture(S, result) {
        const L = S.loadout;
        return {
            v: VERSION,
            at: new Date().toISOString(),
            seed: S.seed,
            luck: S.luck || "dice",
            character: L.characterId,
            outfit: L.outfitId,
            items: L.items.slice(),
            keys: S.actions.map((a) => a.key),
            undos: S.stats.undos || 0,
            result: {
                survivors: result.survivors, lost: result.lost, tally: result.tally,
                moved: result.moved, byYou: result.byYou, byHelpers: result.byHelpers,
                grade: result.grade.key, ending: result.ending.id,
            },
            note: "",
        };
    }

    /** Keep a landed flight. Returns the recording, which the report hangs the note box on. */
    function save(S, result) {
        const rec = capture(S, result);
        store.set("recordings", [rec].concat(all()).slice(0, KEEP));
        return rec;
    }

    /** What the player says they were trying to do, attached to the flight recorded at `at`. */
    function note(at, text) {
        const list = all();
        for (const r of list) if (r.at === at) r.note = String(text || "");
        store.set("recordings", list);
    }

    /** Everything, as one file tools/replay.js can read. */
    function exportText(list) {
        return JSON.stringify({
            game: "please-remain-seated",
            exported: new Date().toISOString(),
            flights: list || all(),
        });
    }

    function forget() { store.drop("recordings"); }

    PRS.recorder = { VERSION, all, capture, save, note, exportText, forget };
})(window);
