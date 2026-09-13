// Play the game without a browser, a great many times, and complain about anything that breaks.
//
//   node tools/simulate.js                    200 random flights
//   node tools/simulate.js 2000               2000 of them
//   node tools/simulate.js 400 --strategy=carry --char=gordy --outfit=work
//   node tools/simulate.js 300 --strategy=douse --bag=water_big,wet_towel,blanket
//   node tools/simulate.js 1 --seed=12345 --verbose
//   node tools/simulate.js 8 --seed=1         every bot once, on one aeroplane
//
// This exists because the action list is a hundred definitions written by hand, every one of
// which is a function that touches the world, and the only honest way to know that none of them
// throws on a state I did not think of is to reach a very large number of states. The bots below
// are deliberately stupid in different directions - one only fights the fire, one only carries,
// one picks uniformly at random from everything available - because the uniform one is the one
// that finds the bug.
//
// It also prints the balance table at the end, which is the actual reason to keep it: if the
// random bot and the good bot get the same score, the game is not a game, and if any one bot
// that does only one thing beats the ones that mix, the mechanics have stopped interlocking.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

// The smallest browser that will run the simulation half of this game. Rendering and the DOM
// screens are not loaded, so none of this has to be convincing.
function makeSandbox() {
    const store = {};
    const sandbox = {
        console,
        performance: { now: () => Date.now() },
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; },
        },
        document: {
            readyState: "complete",
            addEventListener() {},
            getElementById: () => null,
            createElement: () => ({
                getContext: () => ({
                    fillRect() {}, drawImage() {}, save() {}, restore() {}, strokeRect() {},
                    fillText() {}, measureText: () => ({ width: 0 }),
                    set fillStyle(v) {}, set globalAlpha(v) {}, set font(v) {},
                    set imageSmoothingEnabled(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
                    set textAlign(v) {},
                }),
                toDataURL: () => "",
                style: {},
            }),
        },
        requestAnimationFrame: () => 0,
        cancelAnimationFrame() {},
        AudioContext: null,
        webkitAudioContext: null,
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    return vm.createContext(sandbox);
}

// The dependency order from index.html. Kept here rather than parsed out of the HTML so that a
// breakage in one is not silently papered over by the other.
const FILES = [
    "game/art/cabin-sprites.js",
    "game/engine/core.js",
    "game/i18n/i18n.js",
    "game/engine/atlas.js",
    "game/engine/audio.js",
    "game/sim/cabin.js",
    "game/sim/fire.js",
    "game/sim/pax.js",
    "game/sim/crew.js",
    "game/sim/state.js",
    "game/sim/undo.js",
    "game/sim/actions.js",
    "game/sim/scoring.js",
    "game/sim/logbook.js",
    "game/sim/recorder.js",
    "game/sim/daily.js",
    "game/sim/share.js",
    "game/sim/bots.js",
    "game/data/passengers.js",
    "game/data/characters.js",
    "game/data/items.js",
    "game/data/outfits.js",
    "game/data/events.js",
    "game/data/medals.js",
    "game/data/endings.js",
    "game/data/actions-move.js",
    "game/data/actions-fire.js",
    "game/data/actions-douse.js",
    "game/data/actions-people.js",
    "game/data/actions-crew.js",
    "game/data/actions-cabin.js",
    "game/data/actions-self.js",
    "game/data/actions-items.js",
    "game/data/actions-extra.js",
    "game/data/actions-loot.js",
];

// The catalogues, which are optional: a bot flying in English does not need them, and a run
// that wants German lines in its log (tools/render_frame.py reads them) does. They are listed
// separately because a missing one must not be a failure to load.
function catalogues() {
    const dir = path.join(ROOT, "game", "i18n");
    const out = [];
    for (const code of fs.readdirSync(dir)) {
        const sub = path.join(dir, code);
        if (!fs.statSync(sub).isDirectory()) continue;
        for (const name of fs.readdirSync(sub).sort()) {
            if (name.endsWith(".js")) out.push("game/i18n/" + code + "/" + name);
        }
    }
    return out;
}

/** Load the game. `lang` flies it in a language other than the English it is written in. */
function load(lang) {
    const ctx = makeSandbox();
    for (const rel of FILES.concat(catalogues())) {
        const file = path.join(ROOT, rel);
        const code = fs.readFileSync(file, "utf8");
        try {
            vm.runInContext(code, ctx, { filename: rel });
        } catch (err) {
            console.error("FAILED TO LOAD " + rel);
            console.error(err);
            process.exit(1);
        }
    }
    if (lang) ctx.PRS.i18n.setLang(lang);
    return ctx.PRS;
}

// ------------------------------------------------------------------------------------ bots ---

// The bots moved to game/sim/bots.js, because the title screen flies one too: the cabin behind
// the boarding pass is this simulation with one of the bots at the controls, slowed down to a
// speed a person can watch. They are loaded above with the rest of the game, so there is one copy
// of each of them and the balance table below and the aeroplane on the menu cannot drift apart.

// ------------------------------------------------------------------------------------- run ---

function playOne(PRS, opts) {
    const chars = PRS.data.characters.CHARACTERS;
    const seed = opts.seed !== undefined ? opts.seed : (Math.random() * 0xffffffff) >>> 0;
    const rng = PRS.util.makeRng(seed);

    const ch = opts.char ? PRS.data.characters.byId(opts.char) : rng.pick(chars);
    // One flight in six is flown in an outfit and half are flown with the free slots repacked,
    // which is roughly how often a player will bother.
    const outfit = opts.outfit !== undefined ? opts.outfit
                 : (rng.chance(1 / 6) ? rng.pick(PRS.data.outfits.OUTFITS).id : null);
    const free = PRS.data.items.pool().map((i) => i.id).filter((id) => ch.kit.indexOf(id) < 0);
    const bag = opts.bag ? ch.kit.concat(opts.bag.filter((id) => ch.kit.indexOf(id) < 0))
                              .slice(0, PRS.data.items.SLOTS)
              : rng.chance(0.5) ? ch.bag
              : ch.kit.concat(rng.shuffle(free).slice(0, PRS.data.items.SLOTS - ch.kit.length));
    const S = PRS.state.create({ characterId: ch.id, outfitId: outfit, items: bag,
                                 seed: seed });
    // The report works out what the same flight does with nobody in it, because that is what the
    // log book credits. Nothing here reads the number and it is a second fifteen minutes of
    // physics per flight, so a run of ten thousand does not pay for it.
    S.counterfactual = false;
    PRS.bots.setCoin(PRS.util.makeRng((seed ^ 0x9e3779b9) >>> 0));
    const bot = PRS.bots.BOTS[opts.strategy || "random"];
    let steps = 0;
    const errors = [];

    // Catch anything an action logs to the console as a failure, and anything it throws.
    while (!S.clock.landed && steps < 3000) {
        let list;
        try {
            list = PRS.actions.available(S, true);
        } catch (err) {
            errors.push({ where: "available", err: err });
            break;
        }
        if (!list.length) { errors.push({ where: "empty list", err: new Error("no actions") }); break; }
        const entry = bot(PRS, S, list);
        if (!entry) {
            // A bot with nothing to do waits, in the steps a person would, until the wheels are down.
            PRS.actions.spend(S, Math.min(10, S.clock.remaining), null);
            if (S.clock.remaining <= 0.001 && !S.clock.landed) PRS.actions.land(S);
            continue;
        }
        try {
            PRS.actions.perform(S, entry);
        } catch (err) {
            errors.push({ where: entry.key, err: err });
            break;
        }
        steps++;
        if (opts.verbose) {
            const line = S.log[S.log.length - 1];
            console.log("  " + PRS.util.mmss(S.clock.remaining).padStart(5) + "  " +
                        String(entry.cost).padStart(3) + "s  " + entry.label +
                        (line ? "\n           " + line.text.slice(0, 150) : ""));
        }
    }
    if (!S.clock.landed) {
        try { PRS.actions.land(S); } catch (err) { errors.push({ where: "land", err: err }); }
    }
    return { S: S, steps: steps, errors: errors, seed: seed, character: ch.id,
             result: S.result || null };
}

function main() {
    const args = process.argv.slice(2);
    const n = Number(args.find((a) => /^\d+$/.test(a)) || 200);
    const opt = (name, dflt) => {
        const hit = args.find((a) => a.startsWith("--" + name + "="));
        return hit ? hit.split("=")[1] : dflt;
    };
    const verbose = args.includes("--verbose");
    const strategy = opt("strategy", null);
    const char = opt("char", null);
    const outfit = opt("outfit", undefined);
    const seedArg = opt("seed", null);
    const bagArg = opt("bag", null);

    const PRS = load();
    console.log("Loaded " + PRS.atlas.boot() + " sprites, " + PRS.actions.count() +
                " action definitions.");
    console.log("Decks: " + JSON.stringify(PRS.actions.deckCounts()));
    // How many concrete actions exist at the very start, before targets multiply further.
    const probe = PRS.state.create({ characterId: "ansel", seed: 1 });
    console.log("Concrete actions available on turn one: " + PRS.actions.available(probe).length);

    const strategies = strategy ? strategy.split(",") : PRS.bots.names();
    const table = [];
    const failures = [];
    const usedIds = new Set();
    let totalSteps = 0;

    for (const s of strategies) {
        const runs = [];
        const per = Math.max(1, Math.round(n / strategies.length));
        for (let i = 0; i < per; i++) {
            const r = playOne(PRS, {
                strategy: s, char: char, outfit: outfit,
                seed: seedArg !== null ? Number(seedArg) : undefined,
                // The douse bot flies with what the playtest flew with, unless told otherwise.
                bag: bagArg ? bagArg.split(",") : s === "douse" ? ["water_big", "wet_towel", "blanket"]
                                                              : null,
                verbose: verbose,
            });
            totalSteps += r.steps;
            for (const id in r.S.counts) usedIds.add(id);
            if (r.errors.length) {
                for (const e of r.errors) {
                    failures.push({ strategy: s, seed: r.seed, character: r.character,
                                    where: e.where, err: e.err });
                }
            }
            runs.push(r);
        }
        const survived = runs.map((r) => r.result ? r.result.survivors : 0);
        table.push({
            bot: s,
            runs: runs.length,
            survivedAvg: mean(survived), survivedMax: Math.max.apply(null, survived),
            ninety: survived.filter((v) => v >= 54).length / runs.length,
            unhurtAvg: mean(runs.map((r) => r.result ? r.result.tally.unhurt : 0)),
            movedAvg: mean(runs.map((r) => r.result ? r.result.moved : 0)),
            helpersAvg: mean(runs.map((r) => r.S.stats.helpersRecruited)),
            agentsAvg: mean(runs.map((r) => r.S.stats.agentsUsed)),
            actionsAvg: mean(runs.map((r) => r.steps)),
        });
    }

    console.log("\nSurvived of 60, and how.\n");
    console.log(pad("bot", 10) + pad("runs", 6) + pad("survived", 10) + pad("best", 6) +
                pad("54+", 6) + pad("walked", 8) + pad("moved", 7) + pad("helpers", 9) +
                pad("pours", 7) + "actions");
    console.log("-".repeat(78));
    for (const row of table) {
        console.log(pad(row.bot, 10) + pad(row.runs, 6) + pad(row.survivedAvg.toFixed(1), 10) +
                    pad(row.survivedMax, 6) + pad(Math.round(row.ninety * 100) + "%", 6) +
                    pad(row.unhurtAvg.toFixed(1), 8) + pad(row.movedAvg.toFixed(1), 7) +
                    pad(row.helpersAvg.toFixed(1), 9) + pad(row.agentsAvg.toFixed(1), 7) +
                    row.actionsAvg.toFixed(0));
    }

    // Coverage: an action that never fires in ten thousand random turns is either unreachable or
    // its `when` is wrong, and both are bugs.
    const never = PRS.actions.all().filter((d) => !usedIds.has(d.id)).map((d) => d.id);
    console.log("\n" + totalSteps + " actions taken. " + usedIds.size + " of " +
                PRS.actions.count() + " definitions reached.");
    if (never.length) {
        console.log("Never reached (" + never.length + "): " + never.join(", "));
    }

    if (failures.length) {
        console.log("\n" + failures.length + " FAILURES");
        const seen = {};
        for (const f of failures) {
            const key = f.where + ":" + (f.err && f.err.message);
            if (seen[key]) { seen[key]++; continue; }
            seen[key] = 1;
            console.log("\n  [" + f.strategy + " seed " + f.seed + " " + f.character + "] " +
                        f.where);
            console.log("  " + (f.err && f.err.stack ? f.err.stack.split("\n").slice(0, 4)
                                .join("\n  ") : f.err));
        }
        process.exit(1);
    }
    console.log("\nNo failures.");
}

function mean(a) { return a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); }
function pad(v, n) { return String(v).padEnd(n); }

main();
