// Play recorded flights back and say where they went.
//
//   node tools/replay.js flights.json               every flight in the file, a paragraph each
//   node tools/replay.js flights.json --timeline    and every action, walks folded together
//   node tools/replay.js flights.json --only=3      just the fourth flight
//
// The file is what the report's "Save recorded flights" button writes. A flight replays because
// the simulation is a seed, a loadout and a list of actions and nothing else. If one does not
// replay to the same touchdown it was recorded by a different version of the game, and this says
// so rather than pretending.
//
// Every flight is also flown again on the same seed, with the same person and the same bag, by
// three of the bots in simulate.js: one that does nothing, one that plays well, and one that only
// fights the fire. So each paragraph says what the same aeroplane did without you, and what else
// it could have done.

const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "simulate.js"), "utf8")
    .replace(/\nmain\(\);\s*$/, "\nmodule.exports = { load, playOne };\n");
const mod = { exports: {} };
new Function("module", "exports", "require", "__dirname", "__filename", src)(
    mod, mod.exports, require, __dirname, path.join(__dirname, "simulate.js"));
const { load, playOne } = mod.exports;

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
    console.error("usage: node tools/replay.js flights.json [--timeline] [--only=N]");
    process.exit(2);
}
const TIMELINE = args.includes("--timeline");
const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? Number(onlyArg.split("=")[1]) : null;

const PRS = load();
const raw = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
const flights = Array.isArray(raw) ? raw : raw.flights ? raw.flights : [raw];

/** Find the recorded action again. The walks are hidden from the player's list, not from this. */
function find(S, key) {
    const def = PRS.actions.byId(key.split("#")[0]);
    if (!def) return null;
    if (def.once && S.counts[def.id]) return null;
    return PRS.actions.entriesFor(def, S).filter((e) => e.key === key)[0] || null;
}

function replay(rec) {
    const S = PRS.state.create({ characterId: rec.character, outfitId: rec.outfit,
                                 items: rec.items, seed: rec.seed });
    const steps = [];
    let broke = null;
    for (let i = 0; i < rec.keys.length; i++) {
        if (S.clock.landed) { broke = "the aeroplane landed " + (rec.keys.length - i) +
                                      " actions early"; break; }
        const entry = find(S, rec.keys[i]);
        if (!entry) { broke = "action " + (i + 1) + " was not available: " + rec.keys[i]; break; }
        const clock = S.clock.remaining;
        const res = PRS.actions.perform(S, entry);
        steps.push({ clock: clock, cost: res ? res.cost : 0, id: entry.id, label: entry.label });
    }
    if (!S.clock.landed) PRS.actions.land(S);
    return { S: S, steps: steps, broke: broke };
}

const mmss = (s) => PRS.util.mmss(Math.max(0, s));

function describe(n, rec) {
    const { S, steps, broke } = replay(rec);
    const R = S.result;
    const ch = PRS.data.characters.byId(rec.character);
    const outfit = PRS.data.outfits.byId(rec.outfit);
    const T = R.tally;
    const same = R.survivors === rec.result.survivors && R.lost === rec.result.lost;

    console.log("\n#" + n + "  " + ch.name + (outfit ? ", " + outfit.name.toLowerCase() : "") +
                "  ·  bag: " + rec.items.join(", ") + "  ·  seed " + rec.seed +
                (rec.at ? "  ·  " + rec.at.slice(0, 16).replace("T", " ") : ""));
    if (rec.note) console.log("    “" + rec.note.trim().replace(/\s+/g, " ") + "”");
    console.log("    survived " + R.survivors + " of 60  (walked " + T.unhurt + " · treated " +
                T.treated + " · serious " + T.serious + " · lost " + T.lost + ")  ·  grade " +
                R.grade.key + "  ·  " + R.ending.title.toLowerCase());
    console.log("    " + (broke ? "DID NOT REPLAY: " + broke
                        : same ? "replays exactly"
                        : "REPLAYED DIFFERENTLY: recorded " + rec.result.survivors +
                          " survived, replay " + R.survivors + " (a different version of the game)"));
    console.log("    moved " + R.moved + " (you " + R.byYou + ", helpers " + R.byHelpers + ")  ·  " +
                "helpers recruited " + S.stats.helpersRecruited + "  ·  things put on the fire " +
                S.stats.agentsUsed + "  ·  grabbed " + (S.stats.grabbed || 0) + "  ·  " +
                "credibility " + Math.round(S.credibility) + "  ·  crew: " +
                PRS.crew.PHASES[S.crewPhase].name.toLowerCase() + "  ·  undos " + (rec.undos || 0));
    const t = R.time;
    console.log("    time: carrying " + mmss(t.carrying) + " · the fire " + mmss(t.fighting) +
                " · talking " + mmss(t.arguing) + " · everything else " +
                mmss(t.total - t.carrying - t.fighting - t.arguing));
    console.log("    fire: vented " + R.fire.vented + " of 9 · peak " + R.fire.peak +
                " · smoke at touchdown " + R.fire.smoke + " · you " + R.you.outcome);
    if (R.medals.length) console.log("    medals: " + R.medals.map((m) => m.name).join(", "));

    // The same aeroplane, flown by the bots.
    const same_ = { char: rec.character, outfit: rec.outfit, bag: rec.items, seed: rec.seed };
    const bots = {};
    for (const b of ["idle", "douse", "good", "blend"]) {
        bots[b] = playOne(PRS, Object.assign({ strategy: b }, same_)).result.survivors;
    }
    console.log("    same seed: doing nothing " + bots.idle + " · only the fire " + bots.douse +
                " · recruiting and carrying " + bots.good + " · both " + bots.blend);

    if (TIMELINE) {
        let i = 0;
        while (i < steps.length) {
            const s = steps[i];
            if (s.id === "move.walk") {
                let j = i, secs = 0;
                while (j < steps.length && steps[j].id === "move.walk") { secs += steps[j].cost; j++; }
                const last = steps[j - 1];
                console.log("      " + mmss(s.clock).padStart(5) + "  " + String(secs).padStart(4) +
                            "s  walk" + (j - i > 1 ? " ×" + (j - i) : "") + " → " +
                            last.label.replace(/^Go to /, ""));
                i = j;
                continue;
            }
            console.log("      " + mmss(s.clock).padStart(5) + "  " + String(s.cost).padStart(4) +
                        "s  " + s.label);
            i++;
        }
    }
    return { survived: R.survivors, bots: bots };
}

const out = [];
flights.forEach(function (rec, i) {
    if (ONLY !== null && i !== ONLY) return;
    out.push(describe(i, rec));
});

if (out.length > 1) {
    const avg = (f) => (out.reduce((a, o) => a + f(o), 0) / out.length).toFixed(1);
    console.log("\n" + out.length + " flights: you " + avg((o) => o.survived) + " survived on " +
                "average · doing nothing " + avg((o) => o.bots.idle) + " · only the fire " +
                avg((o) => o.bots.douse) + " · recruiting and carrying " + avg((o) => o.bots.good) +
                " · both " + avg((o) => o.bots.blend));
}
