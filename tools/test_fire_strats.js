// Every way anybody has found to play the fire, flown until it stops being an opinion.
//
//   node tools/test_fire_strats.js                 the standing check: 40 flights per strategy
//   node tools/test_fire_strats.js 200             more of them, for when a number is close
//   node tools/test_fire_strats.js --table         the whole table and no assertions
//
// This file exists because the fire is the half of the game that looks like the whole of it, and
// twice now a playtester has found a line through it that returned sixty of sixty: park the vape
// in the aft lavatory, stand at the tap, and pour. Both times the fix was a real one - the pack
// goes to a second stage that water has no opinion about; a door with a fire in it is not a door -
// and both times the only reason anybody noticed was that somebody sat down and played it.
//
// So the lines are bots now, in simulate.js, and this is what they are for. It asserts three
// things about them, and each one is a sentence from the README that would otherwise rot:
//
//   1. Nobody gets all sixty off. Sixty is not on offer, and a strategy that reaches it is a
//      strategy that has found a hole rather than a strategy that is good.
//   2. No strategy that only fights the fire beats the one that fights the fire AND moves people.
//      If it does, fighting the fire has become the whole game again.
//   3. Fighting the fire is still worth doing: the best fire line stays clear of the idle floor.
//      A fix that makes the fire unfightable is not a fix, it is the same bug upside down.
//
// It is deliberately not a unit test. There is nothing to mock: it flies the game.

const path = require("path");
const fs = require("fs");

function requireSim() {
    const src = fs.readFileSync(path.join(__dirname, "simulate.js"), "utf8")
        .replace(/\nmain\(\);\s*$/, "\nmodule.exports = { load, playOne };\n");
    const mod = { exports: {} };
    new Function("module", "exports", "require", "__dirname", "__filename", src)(
        mod, mod.exports, require, __dirname, path.join(__dirname, "simulate.js"));
    return mod.exports;
}

const { load, playOne } = requireSim();

// The strategies that only fight the fire, and what each one is. The whole point of naming them
// is that when one of these numbers moves, the name says what changed about the game.
const FIRE_LINES = {
    fire:     "takes whatever the fire deck offers, wherever it is standing",
    douse:    "pours from where one pour reaches the most fire, refills at the tap",
    sink:     "the recorded flight: into the basin as fast as possible, then lives at the tap",
    aftline:  "the basin, then holds the ground round it with everything wet",
    hold:     "never opens the locker: closes it, tapes it, holds it shut",
    forward:  "carries the case the other way and puts it down in the forward galley",
    mover:    "never lets it settle: lifts it and puts it down somewhere else, over and over",
};

// The lines that do two things, and the line that does none. The README's rule is that no bot
// that does one thing is far ahead of the others and the one that does two is ahead of all of
// them, so the fire lines are measured against the best of these, not against a nominated one:
// which mixed line is strongest is allowed to change, and has - `blend` fights at the locker and
// `sinkthen` moves the vape first, and they have swapped places once already.
const MIXED = { blend: "fights the fire while it is small, then recruits and carries",
                sinkthen: "the basin, and then other people" };
const FLOOR = { idle: "does nothing at all" };

const args = process.argv.slice(2);
const RUNS = Number(args.find((a) => /^\d+$/.test(a)) || 40);
const TABLE_ONLY = args.includes("--table");

function fly(PRS, strategy, runs) {
    const scores = [];
    for (let i = 0; i < runs; i++) {
        // A fixed seed line, so two runs of this file on the same code say the same thing and a
        // number that moves moved because the game moved.
        const r = playOne(PRS, { strategy: strategy, char: "priya", outfit: null,
                                 seed: 1000 + i * 7 });
        scores.push(r.result ? r.result.survivors : 0);
        if (r.errors.length) {
            console.log("  " + strategy + " threw at " + r.errors[0].where + ": " +
                        r.errors[0].err.message);
        }
    }
    scores.sort((a, b) => a - b);
    return {
        mean: scores.reduce((a, b) => a + b, 0) / scores.length,
        best: scores[scores.length - 1],
        ninety: scores.filter((v) => v >= 54).length / scores.length,
    };
}

function main() {
    const PRS = load();
    const all = Object.assign({}, FIRE_LINES, MIXED, FLOOR);
    const out = {};
    console.log("Survivors of 60 as Priya, " + RUNS + " flights each, on one fixed seed line.\n");
    console.log("strategy   mean  best  54+   what it does");
    console.log("-".repeat(94));
    for (const name of Object.keys(all)) {
        const r = out[name] = fly(PRS, name, RUNS);
        console.log(name.padEnd(10) + r.mean.toFixed(1).padStart(4) +
                    String(r.best).padStart(6) + (Math.round(r.ninety * 100) + "%").padStart(6) +
                    "   " + all[name]);
    }

    if (TABLE_ONLY) return 0;

    const fails = [];
    const best = (names) => names.reduce((a, b) => out[a].mean >= out[b].mean ? a : b);
    const bestFire = best(Object.keys(FIRE_LINES));
    const bestMixed = best(Object.keys(MIXED));

    // 1. Nobody gets all sixty off.
    for (const name of Object.keys(all)) {
        if (out[name].best >= 60) {
            fails.push(name + " got all sixty off (best " + out[name].best + "). Sixty is not on " +
                       "offer: something it did removed the fire from the aeroplane rather than " +
                       "fought it.");
        }
    }

    // 2. Fighting the fire is not the whole game.
    if (out[bestFire].mean > out[bestMixed].mean) {
        fails.push("the best fire-only line (" + bestFire + ", " + out[bestFire].mean.toFixed(1) +
                   ") beats the best line that also moves people (" + bestMixed + ", " +
                   out[bestMixed].mean.toFixed(1) + "). Fighting the fire has become the whole " +
                   "game again; the people deck is meant to be where the survivors come from.");
    }

    // 3. Fighting the fire is still worth doing.
    if (out[bestFire].mean < out.idle.mean + 5) {
        fails.push("the best fire-only line (" + bestFire + ", " + out[bestFire].mean.toFixed(1) +
                   ") is within five of doing nothing (" + out.idle.mean.toFixed(1) + "). The " +
                   "fire deck has stopped being worth the seconds it costs.");
    }

    console.log("");
    if (fails.length) {
        for (const f of fails) console.log("FAILED: " + f);
        return 1;
    }
    console.log("Nobody saves sixty. The best fire-only line is " + bestFire + " at " +
                out[bestFire].mean.toFixed(1) + ", behind " + bestMixed + " at " +
                out[bestMixed].mean.toFixed(1) + " and well clear of doing nothing at " +
                out.idle.mean.toFixed(1) + ".");
    return 0;
}

process.exit(main());
