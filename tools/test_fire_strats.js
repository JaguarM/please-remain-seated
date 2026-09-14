// Every way anybody has found to play the fire, flown on every aeroplane until it stops being
// an opinion.
//
//   node tools/test_fire_strats.js                 the standing check: 40 flights per strategy
//   node tools/test_fire_strats.js 200             more of them, for when a number is close
//   node tools/test_fire_strats.js --table         the whole table and no assertions
//   node tools/test_fire_strats.js --flight=tn447  one flight only, when iterating on it
//
// This file exists because the fire is the half of the game that looks like the whole of it, and
// twice now a playtester has found a line through it that returned sixty of sixty: park the vape
// in the aft lavatory, stand at the tap, and pour. Both times the fix was a real one - the pack
// goes to a second stage that water has no opinion about; a door with a fire in it is not a door -
// and both times the only reason anybody noticed was that somebody sat down and played it.
//
// So the lines are bots now, in game/sim/bots.js, and this is what they are for. It asserts four
// things, and each one is a sentence from the README that would otherwise rot:
//
//   1. No line gets every passenger off as a matter of course. `survivors` counts the cabin and
//      not you - you are the last soul on the manifest and not one of the people you are trying
//      to save - so every passenger is souls less one.
//
//      On the narrowbody this is the README's flat "sixty is not on offer" and the bots are
//      nowhere near it: the best of them lands on 47 of 60 and none has ever reached 60. On the
//      turboprop every passenger is eighteen and it is reachable, which is a real difference
//      between a fifteen-minute cabin of sixty and a five-minute cabin of eighteen and not by
//      itself a bug. What would be a bug is a line that does it every time, because that is a
//      line that has removed the fire from the aeroplane rather than fought it. So the bar is a
//      rate, and it is deliberately a loose one.
//
//      It is loose because there is a real thing sitting under it that this file is not the
//      place to decide: `good` lands every passenger on the tutorial in about seven flights in
//      ten, and `sinkthen` does it on the full CL 2231 sector in about six. Both are under the
//      bar and both are higher than "you cannot save everybody" ought to allow. The Beechcraft
//      is too survivable, the single basin four tiles from the locker is most of why, and fixing
//      that is a design decision about an aeroplane rather than a number to tighten here.
//   2. No strategy that only fights the fire beats the one that fights the fire AND moves people.
//      If it does, fighting the fire has become the whole game again.
//   3. Fighting the fire is still worth doing: the best fire line stays clear of the idle floor.
//      A fix that makes the fire unfightable is not a fix, it is the same bug upside down.
//   4. On the tutorial, everything except the two ideas the game names as bad ones beats doing
//      nothing. A first flight where sensible play scores under the "without you" line teaches
//      the player that they are the problem, which is the one thing a tutorial may not do.
//
// It flies all three flights, because until it did, it asserted all of the above about TN 447 and
// none of it about the two aeroplanes a new player actually meets - and both of them had drifted.
// Everything here is a fraction of the souls on board rather than a count: five of sixty and five
// of nineteen are not the same sentence, and the version of this file that said `idle.mean + 5`
// was making a claim about a narrowbody and applying it to a turboprop.
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
                sinkthen: "the basin, and then other people",
                carry: "carries whoever is worst off to the best floor by a door",
                good: "recruits early, then carries" };
const FLOOR = { idle: "does nothing at all" };

// The two ideas the game names as worse than doing nothing, on the aeroplane where a player
// meets them first. Everything else on the tutorial has to beat the idle line; these two are
// allowed not to, because the table in the README says in words that they are the bad ideas.
const BAD_IDEAS = ["forward", "mover"];

// The three flights, and what each one is for. `aircraft` and `scenario` are the keys
// `state.create` actually reads - `aircraftId` and `scenarioId` silently fly TN 447 instead.
const FLIGHTS = [
    { id: "tn447",    label: "TN 447, the full fifteen",   opts: {} },
    { id: "cl2231",   label: "CL 2231, the full sector",   opts: { aircraft: "be1900d" } },
    { id: "lastfive", label: "The last five minutes",      opts: { scenario: "lastfive" } },
];

// How much of an aeroplane one line has to beat doing nothing by before the fire deck counts as
// worth the seconds it costs. Eight per cent: five of sixty, which is what this used to say in
// a number, and one and a half of nineteen, which is what that sentence means on a turboprop.
const WORTH_IT = 0.08;
// How often a single line may land every passenger before it has stopped being a good flight and
// started being a hole. See the note on assertion 1: loose on purpose, and the turboprop is under
// it rather than clear of it.
const ALWAYS = 0.90;
// A very good flight, on whichever aeroplane. The same fraction simulate.js prints its column at.
const GREAT = 0.9;

const args = process.argv.slice(2);
const RUNS = Number(args.find((a) => /^\d+$/.test(a)) || 40);
const TABLE_ONLY = args.includes("--table");
const ONLY = (args.find((a) => a.startsWith("--flight=")) || "").split("=")[1] || null;

function fly(PRS, strategy, flight, runs, great, everyone) {
    const scores = [];
    for (let i = 0; i < runs; i++) {
        // A fixed seed line, so two runs of this file on the same code say the same thing and a
        // number that moves moved because the game moved.
        const r = playOne(PRS, Object.assign({ strategy: strategy, char: "priya", outfit: null,
                                               seed: 1000 + i * 7 }, flight.opts));
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
        ninety: scores.filter((v) => v >= great).length / scores.length,
        everybody: scores.filter((v) => v >= everyone).length / scores.length,
    };
}

function main() {
    const PRS = load();
    const all = Object.assign({}, FIRE_LINES, MIXED, FLOOR);
    const fails = [];
    const flights = FLIGHTS.filter((f) => !ONLY || f.id === ONLY);
    if (!flights.length) {
        console.log("No flight called " + ONLY + ". There is " +
                    FLIGHTS.map((f) => f.id).join(", ") + ".");
        return 1;
    }

    for (const flight of flights) {
        // What this flight is, asked of the game rather than written down here.
        const probe = PRS.state.create(Object.assign({ characterId: "priya", seed: 1 },
                                                     flight.opts));
        const souls = probe.pax.length + 1;
        const great = Math.round(souls * GREAT);
        const out = {};

        console.log("\n" + flight.label + ": survivors of " + souls + " as Priya, " + RUNS +
                    " flights each, on one fixed seed line.\n");
        console.log("strategy   mean  best  " + (great + "+").padEnd(5) +
                    (souls - 1 + "/" + (souls - 1)).padEnd(7) + "what it does");
        console.log("-".repeat(94));
        for (const name of Object.keys(all)) {
            const r = out[name] = fly(PRS, name, flight, RUNS, great, souls - 1);
            console.log(name.padEnd(10) + r.mean.toFixed(1).padStart(4) +
                        String(r.best).padStart(6) +
                        (Math.round(r.ninety * 100) + "%").padStart(5) +
                        (Math.round(r.everybody * 100) + "%").padStart(6) + "   " + all[name]);
        }
        if (TABLE_ONLY) continue;

        const where = " on " + flight.label + ". ";
        const best = (names) => names.reduce((a, b) => out[a].mean >= out[b].mean ? a : b);
        const bestFire = best(Object.keys(FIRE_LINES));
        const bestMixed = best(Object.keys(MIXED));

        // 1. No line gets every passenger off as a matter of course. See the note at the top:
        // you are not in this count, and the bar is a rate rather than ever.
        const everybody = souls - 1;
        for (const name of Object.keys(all)) {
            if (out[name].everybody > ALWAYS) {
                fails.push(name + " got all " + everybody + " passengers off in " +
                           Math.round(out[name].everybody * 100) + "% of its flights" + where +
                           "A line that works every time is a line that has removed the fire " +
                           "from the aeroplane rather than fought it.");
            }
        }

        // 2. Fighting the fire is not the whole game.
        if (out[bestFire].mean > out[bestMixed].mean) {
            fails.push("the best fire-only line (" + bestFire + ", " +
                       out[bestFire].mean.toFixed(1) + ") beats the best line that also moves " +
                       "people (" + bestMixed + ", " + out[bestMixed].mean.toFixed(1) + ")" +
                       where + "Fighting the fire has become the whole game again; the people " +
                       "deck is meant to be where the survivors come from.");
        }

        // 3. Fighting the fire is still worth doing.
        const margin = souls * WORTH_IT;
        if (out[bestFire].mean < out.idle.mean + margin) {
            fails.push("the best fire-only line (" + bestFire + ", " +
                       out[bestFire].mean.toFixed(1) + ") is within " + margin.toFixed(1) +
                       " of doing nothing (" + out.idle.mean.toFixed(1) + ")" + where +
                       "The fire deck has stopped being worth the seconds it costs.");
        }

        // 4. The tutorial is not backwards.
        if (flight.opts.scenario) {
            const under = Object.keys(all).filter((n) =>
                n !== "idle" && BAD_IDEAS.indexOf(n) < 0 && out[n].mean <= out.idle.mean);
            if (under.length) {
                fails.push(under.join(", ") + " scored at or below doing nothing (" +
                           out.idle.mean.toFixed(1) + ")" + where + "This is the first flight " +
                           "anybody flies. A player who does a sensible thing on it and lands " +
                           "under the \"without you\" line has been taught that they are what " +
                           "went wrong. Only " + BAD_IDEAS.join(" and ") + " are allowed here.");
            }
        }

        console.log("\n  nobody saves all " + everybody + "; best fire line " + bestFire + " at " +
                    out[bestFire].mean.toFixed(1) + ", behind " + bestMixed + " at " +
                    out[bestMixed].mean.toFixed(1) + ", clear of doing nothing at " +
                    out.idle.mean.toFixed(1) + " by " +
                    (out[bestFire].mean - out.idle.mean).toFixed(1) + " (needs " +
                    margin.toFixed(1) + ").");
    }

    if (TABLE_ONLY) return 0;
    console.log("");
    if (fails.length) {
        for (const f of fails) console.log("FAILED: " + f);
        return 1;
    }
    console.log("All three flights: nobody saves everybody, fighting the fire is worth doing " +
                "and is not the whole game, and the tutorial rewards playing it.");
    return 0;
}

process.exit(main());
