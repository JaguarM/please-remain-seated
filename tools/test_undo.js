// Prove that undo puts the world back exactly, that it cannot be used to reroll, and that time
// paid for slowly is the same time.
//
//   node tools/test_undo.js
//
// Six properties, checked over a few hundred real turns:
//
//   1. exact       undo then redo the same action, and the world is bit-for-bit where it would
//                  have been if you had never hesitated. Fire fields, passengers, clock, all of it.
//   2. no reroll   a social action that failed, undone and repeated, fails again in the same
//                  words. This is the one that matters: without it, persuasion is free.
//   3. the trail   a walk undoes on its own, every tile on the trail is exactly the world you
//                  walked away from, and the trail ends at the last thing that was not a walk.
//   4. no scouting an action tagged `reveal` refuses to be undone.
//   5. no detour   the same ask, with and without ten seconds of something else first, meets
//                  the same dice. A shared random stream cannot give you this; named dice can.
//   6. paced       an action whose passage is played a sub-step at a time, the way the play
//                  screen plays it, lands exactly where spend() lands. Without this the game in
//                  the browser is not the game the bots and the replays measure.
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
        S.clock.remaining.toFixed(4), S.clock.elapsed.toFixed(4), S.clock.total, S.clock.landed,
        S.credibility.toFixed(4), S.cabinAwareness.toFixed(4), S.cabinPanic.toFixed(4),
        S.crewPhase, S.crewPhaseAt,
        S.player.x, S.player.y, S.player.smokeDose.toFixed(4),
        S.player.burns.toFixed(4), S.player.carrying.join("|"), S.player.dragging, S.player.alive,
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
                    p.braced, p.moved, (p.annoyed || 0).toFixed(3), p.claimedBy, p.outcome,
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

        const result = PRS.actions.perform(S, entry);
        const after = digest(S);

        const plan = PRS.undo.peek(S);
        if ((entry.def.tags || []).indexOf("reveal") >= 0) {
            revealChecked++;
            if (plan.ok) {
                revealFails++;
                problems.push("reveal action was undoable: " + entry.id);
            }
        } else if (plan.ok && !S.clock.landed && turn % 3 === 0) {
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

// The trail: a walk comes back on its own, every tile on it is exactly the world you walked away
// from, and the whole wander comes back in one go from the far end of it. That is what a player
// stepping back the way they came is asking for, and none of it is an approximation of a rewind.
let trailOk = false;
{
    const S = fresh(9200, "gordy");
    const worlds = [];                 // the world before each walk, oldest first
    for (let i = 0; i < 3; i++) {
        const step = PRS.actions.available(S, true)
            .filter((e) => e.id === "move.walk" && Math.abs(e.ctx.x - S.player.x) +
                                                   Math.abs(e.ctx.y - S.player.y) === 1)[0];
        if (!step) break;
        worlds.push({ digest: digest(S), x: S.player.x, y: S.player.y });
        PRS.actions.perform(S, step);
    }
    const trail = PRS.undo.trail(S);
    const plan = PRS.undo.peek(S);
    if (worlds.length !== 3) {
        problems.push("could not set up the trail test");
    } else if (trail.length !== 3 ||
               trail.some((s, k) => s.x !== worlds[2 - k].x || s.y !== worlds[2 - k].y)) {
        problems.push("the trail is not the tiles the walks started from (" + trail.length +
                      " stops)");
    } else if (!plan.ok || plan.count !== 1) {
        problems.push("undo took back more than the last walk (" +
                      (plan.ok ? plan.count : plan.why) + ")");
    } else {
        PRS.undo.undo(S);
        const one = digest(S) === worlds[2].digest;
        const back = PRS.undo.trail(S);
        PRS.undo.undo(S, back[back.length - 1].index);
        const all = digest(S) === worlds[0].digest;
        // And anything that is not a walk ends the trail, because walking back past it would be
        // taking that back as well.
        const crawl = PRS.actions.available(S, true).filter((e) => e.id === "move.crawl")[0];
        if (crawl) PRS.actions.perform(S, crawl);
        const ended = !PRS.undo.trail(S).length;
        if (!one) problems.push("a step back along the trail did not restore the last walk");
        else if (!all) problems.push("walking back to the start of the trail did not restore it");
        else if (!crawl) problems.push("could not check what ends a trail");
        else if (!ended) problems.push("the trail ran on past something that was not a walk");
        else trailOk = true;
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

// Time paid for slowly. The play screen does not spend an action's seconds in one go: it takes
// the passage a sub-step at a time and draws the cabin in between, and reads the world while it
// is half way through. Two flights, the same actions, one spent and one played, and they have to
// end up on the same aeroplane - including the flight that goes on without you after you go down,
// and the landing at the end of it.
let pacedChecked = 0, pacedFails = 0, pacedLanded = 0;
for (const seed of [606, 7, 4242]) {
    const straight = fresh(seed, "ansel");
    const paced = fresh(seed, "ansel");
    for (let turn = 0; turn < 400 && !straight.clock.landed; turn++) {
        const entry = BOTS.blend(PRS, straight, PRS.actions.available(straight, true));
        if (!entry) break;
        const twin = PRS.actions.available(paced, true).filter((e) => e.key === entry.key)[0];
        if (!twin) {
            pacedFails++;
            problems.push("the paced flight could not take " + entry.key + " on seed " + seed);
            break;
        }
        // A third of the way in, you go down in both of them, so the passage has to play out the
        // rest of the flight without you and put the aeroplane on the ground.
        if (turn === 30) { straight.player.smokeDose = 99; paced.player.smokeDose = 99; }

        PRS.actions.perform(straight, entry);
        const out = PRS.actions.perform(paced, twin, { paced: true });
        let n = 0;
        while (out.passage && !out.passage.finished) {
            out.passage.step();
            // Everything the screen asks the world between sub-steps, in case asking changes it.
            PRS.undo.trail(paced);
            PRS.undo.peek(paced);
            PRS.state.movedCount(paced);
            PRS.fire.worst(paced.fire);
            if (++n > 5000) { problems.push("a passage never finished"); break; }
        }
        pacedChecked++;
        if (digest(paced) !== digest(straight)) {
            pacedFails++;
            problems.push("a paced action landed somewhere else: " + entry.id + " on seed " + seed);
            break;
        }
    }
    if (straight.clock.landed && paced.clock.landed) pacedLanded++;
    else if (!pacedFails) problems.push("the paced flight on seed " + seed + " never landed");
}

console.log(undone + " undos across " + checked + " undo-and-redo pairs");
console.log("  state restored exactly:      " + (exactFails ? "FAIL (" + exactFails + ")" : "yes"));
console.log("  social rolls not rerollable: " +
            (rerollFails ? "FAIL (" + rerollFails + ")" : "yes, " + rerollChecked + " checked"));
console.log("  a step back is one walk:     " +
            (trailOk ? "yes, three walks and a trail that ends" : "FAIL"));
console.log("  reveals refuse to undo:      " +
            (revealFails ? "FAIL (" + revealFails + ")" : "yes, " + revealChecked + " checked"));
console.log("  a detour is not a reroll:    " +
            (detourFails ? "FAIL (" + detourFails + ")" : "yes, " + detourChecked + " seeds"));
console.log("  paced time is the same time: " +
            (pacedFails ? "FAIL (" + pacedFails + ")" : "yes, " + pacedChecked + " actions, " +
             pacedLanded + " landings"));

if (problems.length) {
    console.log("\nPROBLEMS");
    for (const p of problems.slice(0, 12)) console.log("  " + p);
    process.exit(1);
}
console.log("\nUndo is exact, it cannot buy you a better roll, and a second played slowly is the " +
            "same second.");
