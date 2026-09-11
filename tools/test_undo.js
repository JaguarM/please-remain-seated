// Prove that undo puts the world back exactly, and that it cannot be used to reroll.
//
//   node tools/test_undo.js
//
// Three properties, checked over a few hundred real turns:
//
//   1. exact       undo then redo the same action, and the world is bit-for-bit where it would
//                  have been if you had never hesitated. Fire fields, passengers, clock, all of it.
//   2. no reroll   a social action that failed, undone and repeated, fails again in the same
//                  words. This is the one that matters: without it, persuasion is free.
//   3. no scouting an action tagged `reveal` refuses to be undone.
//   4. no detour    the same ask, with and without ten seconds of something else first, meets
//                  the same dice. A shared random stream cannot give you this; named dice can.
//
// The comparison is a canonical digest of the whole simulation state, so anything a snapshot
// forgets to copy shows up here rather than as a strange bug three sessions later.

const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "simulate.js"), "utf8")
    .replace(/\nmain\(\);\s*$/, "\nmodule.exports = { load, BOTS };\n");
const mod = { exports: {} };
new Function("module", "exports", "require", "__dirname", "__filename", src)(
    mod, mod.exports, require, __dirname, path.join(__dirname, "simulate.js"));

const PRS = mod.exports.load();
const BOTS = mod.exports.BOTS;

/**
 * Everything about the simulation, as one string. Not the log: undo writes a line into the log
 * on purpose saying that you changed your mind, so the transcript is checked separately below.
 */
function digest(S) {
    const parts = [
        S._eventTurn || 0,
        S.clock.remaining.toFixed(4), S.clock.elapsed.toFixed(4), S.clock.total,
        S.credibility.toFixed(4), S.cabinAwareness.toFixed(4), S.cabinPanic.toFixed(4),
        S.crewPhase, S.crewPhaseAt,
        S.player.x, S.player.y, S.player.panic.toFixed(4), S.player.smokeDose.toFixed(4),
        S.player.burns.toFixed(4), S.player.carrying.join("|"), S.player.dragging,
        Object.keys(S.player.wearing).sort().join("|"),
        S.inventory.map((s) => s.id + ":" + s.uses + ":" + s.spent + ":" + s.wet).join("|"),
        S.fire.core.heat.toFixed(4), S.fire.core.cells, S.fire.core.contained.toFixed(4),
        S.fire.core.x, S.fire.core.y, S.fire.core.exposed, S.fire.core.inSink,
        S.actions.length,
        JSON.stringify(S.counts), JSON.stringify(S.flags), JSON.stringify(S.cabinFlags),
        JSON.stringify(S.stash), JSON.stringify(S.medals),
    ];
    for (const key of ["intensity", "fuel", "burnt", "suppress", "smoke", "heat", "spreadAcc",
                       "spreadAt", "spreadN"]) {
        let sum = 0, i = 0;
        for (const v of S.fire[key]) sum += v * (1 + (i++ % 7));
        parts.push(key + sum.toFixed(3));
    }
    for (const p of S.pax) {
        parts.push([p.id, p.x, p.y, p.state, p.helper, p.carries, p.revealed, p.masked, p.belted,
                    p.braced, p.moved, (p.annoyed || 0).toFixed(3), p.claimedBy,
                    p.smokeDose.toFixed(3), p.panic.toFixed(3), p.trust.toFixed(3),
                    p.awareness.toFixed(3), (p.taskLeft || 0).toFixed(2), p.mood.toFixed(3),
                    p.standN || 0, (p.standAcc || 0).toFixed(4), p.spreadN || 0,
                    (p.spreadAcc || 0).toFixed(4)].join(","));
    }
    for (const c of S.crew) {
        parts.push([c.id, c.x, c.y, c.halon, c.busy.toFixed(2), c.sitN || 0,
                    (c.sitAcc || 0).toFixed(4)].join(","));
    }
    return parts.join(";");
}

function fresh(seed, charId) {
    return PRS.state.create({ characterId: charId, seed: seed });
}

let collapseOk = false;
let checked = 0, exactFails = 0, rerollChecked = 0, rerollFails = 0, revealChecked = 0,
    revealFails = 0, undone = 0;
const problems = [];

for (let run = 0; run < 14; run++) {
    const seed = 7000 + run;
    const charId = run % 2 ? "gordy" : "ansel";
    const S = fresh(seed, charId);
    let turn = 0;

    while (!S.clock.landed && turn < 90) {
        const list = PRS.actions.available(S, true);
        if (!list.length) break;
        const entry = BOTS[run % 2 ? "good" : "carry"](PRS, S, list);

        // What the world looks like if we simply do it.
        const before = digest(S);
        const logBefore = S.log.length;
        const straight = fresh(seed, charId);   // not used; kept cheap by only digesting S

        const result = PRS.actions.perform(S, entry);
        const after = digest(S);

        const plan = PRS.undo.peek(S);
        if ((entry.def.tags || []).indexOf("reveal") >= 0) {
            revealChecked++;
            if (plan.ok) {
                revealFails++;
                problems.push("reveal action was undoable: " + entry.id);
            }
        } else if (plan.ok && plan.count === 1 && !S.clock.landed && turn % 3 === 0) {
            // count === 1 only: a run of the same action collapses into one change of mind, and
            // that case is checked on its own below.
            // 1. Undo, and check we are back where we started.
            PRS.undo.undo(S);
            undone++;
            if (digest(S) !== before) {
                exactFails++;
                problems.push("undo did not restore: " + entry.id + " (run " + run + ")");
            }
            // The transcript is back to what it was, plus undo's own line saying so.
            if (S.log.length !== logBefore + 1) {
                exactFails++;
                problems.push("transcript not rewound: " + entry.id + " (" + S.log.length +
                              " vs " + (logBefore + 1) + ")");
            }
            // 2. Redo the identical action; the world must land in exactly the same place.
            const again = PRS.actions.available(S, true)
                .filter((e) => e.key === entry.key)[0];
            if (again) {
                const redo = PRS.actions.perform(S, again);
                checked++;
                if (digest(S) !== after) {
                    exactFails++;
                    problems.push("redo diverged: " + entry.id + " (run " + run + ")");
                }
                // 3. And if it was a roll, it rolled the same way.
                if ((entry.def.tags || []).indexOf("social") >= 0) {
                    rerollChecked++;
                    if ((redo && redo.text) !== (result && result.text)) {
                        rerollFails++;
                        problems.push("social action rerolled: " + entry.id);
                    }
                }
            }
        }
        turn++;
    }
}

// A run of the same action undoes as one decision, which is what "go back" means to somebody who
// has just walked three times in the wrong direction.
{
    const S = fresh(9200, "gordy");
    const start = digest(S);
    let walks = 0;
    for (let i = 0; i < 3; i++) {
        const step = PRS.actions.available(S, true)
            .filter((e) => e.id === "move.walk" && Math.abs(e.ctx.x - S.player.x) +
                                                   Math.abs(e.ctx.y - S.player.y) === 1)[0];
        if (!step) break;
        PRS.actions.perform(S, step);
        walks++;
    }
    const plan = PRS.undo.peek(S);
    if (walks !== 3) problems.push("could not set up the collapse test");
    else if (!plan.ok || plan.count !== 3) {
        problems.push("a run of three walks did not collapse (count " +
                      (plan.ok ? plan.count : "blocked") + ")");
    } else {
        PRS.undo.undo(S);
        if (digest(S) !== start) problems.push("collapsed undo did not restore the start");
        else collapseOk = true;
    }
}

// The bots do not go looking in bins, so the reveal rule is checked deliberately.
for (const id of ["fire.open_bin", "loot.ask_carrying", "loot.galley_drawer", "extra.chip"]) {
    const S = fresh(9100, "ansel");
    const def = PRS.actions.byId(id);
    if (!def) { problems.push("no such action: " + id); continue; }
    let done = false;
    for (let x = 0; x < PRS.cabin.W && !done; x++) {
        for (let y = 0; y < PRS.cabin.H && !done; y++) {
            if (PRS.cabin.solid(x, y)) continue;
            PRS.actions.moveTo(S, x, y);
            const hit = PRS.actions.entriesFor(def, S)[0];
            if (!hit) continue;
            PRS.actions.perform(S, hit);
            done = true;
            revealChecked++;
            const plan = PRS.undo.peek(S);
            if (plan.ok) {
                revealFails++;
                problems.push("reveal action was undoable: " + id);
            }
        }
    }
    if (!done) problems.push("could not reach reveal action to test it: " + id);
}

// A detour is not a reroll. The same ask, with and without something else done first, meets
// the same dice: whatever moved between the two is trust and awareness, not luck. This is the
// property a shared random stream cannot give you, and the reason the dice are named instead.
let detourChecked = 0, detourFails = 0;
for (const seed of [606, 7, 42, 1999, 31]) {
    const rolls = [0, 10, 40].map(function (wait) {
        const S = fresh(seed, "ansel");
        if (wait) PRS.actions.spend(S, wait, { tags: [] });
        const r = PRS.pax.convince(S, S.pax[12], 6);
        return r.got - PRS.pax.persuasion(S, 6);       // what the dice added to your side
    });
    detourChecked++;
    if (rolls.some((v) => Math.abs(v - rolls[0]) > 1e-9)) {
        detourFails++;
        problems.push("a detour changed the dice on seed " + seed + ": " + rolls.join(", "));
    }
}

console.log(undone + " undos across " + checked + " undo-and-redo pairs");
console.log("  state restored exactly:      " + (exactFails ? "FAIL (" + exactFails + ")" : "yes"));
console.log("  social rolls not rerollable: " +
            (rerollFails ? "FAIL (" + rerollFails + ")" : "yes, " + rerollChecked + " checked"));
console.log("  a run collapses to one:      " + (collapseOk ? "yes, three walks" : "FAIL"));
console.log("  reveals refuse to undo:      " +
            (revealFails ? "FAIL (" + revealFails + ")" : "yes, " + revealChecked + " checked"));
console.log("  a detour is not a reroll:    " +
            (detourFails ? "FAIL (" + detourFails + ")" : "yes, " + detourChecked + " seeds"));

if (problems.length) {
    console.log("\nPROBLEMS");
    for (const p of problems.slice(0, 12)) console.log("  " + p);
    process.exit(1);
}
console.log("\nUndo is exact, and it cannot buy you a better roll.");
