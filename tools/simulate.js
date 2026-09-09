// Play the game without a browser, a great many times, and complain about anything that breaks.
//
//   node tools/simulate.js                    200 random flights
//   node tools/simulate.js 2000               2000 of them
//   node tools/simulate.js 400 --strategy=carry --char=gordy
//   node tools/simulate.js 1 --seed=12345 --verbose
//
// This exists because the action list is three hundred definitions written by hand, every one of
// which is a function that touches the world, and the only honest way to know that none of them
// throws on a state I did not think of is to reach a very large number of states. The bots below
// are deliberately stupid in different directions - one only fights the fire, one only carries,
// one picks uniformly at random from everything available - because the uniform one is the one
// that finds the bug.
//
// It also prints the balance table at the end, which is the actual reason to keep it: if the
// random bot and the good bot get the same score, the game is not a game.

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
    "game/art/nauvis-sprites.js",
    "game/art/cabin-sprites.js",
    "game/engine/core.js",
    "game/engine/atlas.js",
    "game/engine/audio.js",
    "game/sim/cabin.js",
    "game/sim/fire.js",
    "game/sim/pax.js",
    "game/sim/crew.js",
    "game/sim/state.js",
    "game/sim/actions.js",
    "game/sim/scoring.js",
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

function load() {
    const ctx = makeSandbox();
    for (const rel of FILES) {
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
    return ctx.PRS;
}

// ------------------------------------------------------------------------------------ bots ---

// Each bot scores the available actions and takes the best. `random` does not score at all, which
// is the whole point of it.
const BOTS = {
    random(PRS, S, list) {
        // Walking is hidden from the player's list and there are two hundred places to walk to, so
        // a uniform pick over everything is a bot that paces. A confused person mostly does things.
        const walks = list.filter((e) => e.id === "move.walk");
        const rest = list.filter((e) => e.id !== "move.walk");
        const pool = rest.length && Math.random() > 0.3 ? rest : (walks.length ? walks : rest);
        return pool[Math.floor(Math.random() * pool.length)];
    },

    fire(PRS, S, list) {
        return pickBy(list, (e) => {
            if (e.deck === "fire") return 100 - e.cost * 0.2;
            if (e.id === "move.to_fire") return 60;
            if (e.deck === "move") return 5;
            return 0;
        });
    },

    carry(PRS, S, list) {
        const hands = S.player.carrying.length || (S.player.dragging ? 1 : 0);
        const safe = PRS.cabin.isSafeZone(S.player.x, S.player.y);
        return pickBy(list, (e) => {
            if (hands && safe && (e.id === "people.put_down" || e.id === "people.stop_drag")) return 200;
            if (hands && (e.id === "move.fwd_galley" || e.id === "move.overwing")) return 160;
            // Dragging is how you move anybody heavier than your arms, which for most of the cast
            // is most of the aeroplane.
            if (!hands && (e.id === "people.carry" || e.id === "people.drag")) return 120 - e.cost * 0.3;
            if (!hands && e.id === "move.step") return 45;      // into the row, where the people are
            if (!hands && e.id === "move.to_row") return 40 - e.cost * 0.4;
            if (e.deck === "move") return 10;
            return 0;
        });
    },

    // What the game is actually about: recruit, delegate, and only then carry.
    good(PRS, S, list) {
        const st = PRS.state;
        const carrying = S.player.carrying.length || (S.player.dragging ? 1 : 0);
        const safe = PRS.cabin.isSafeZone(S.player.x, S.player.y);
        const helpers = st.helperCount(S);
        return pickBy(list, (e) => {
            if (carrying && safe && (e.id === "people.put_down" ||
                                     e.id === "people.stop_drag")) return 300;
            if (carrying && (e.id === "move.overwing" || e.id === "move.fwd_galley")) return 250;
            if (e.id === "fire.photograph" && !S.flags.havePhoto) return 240;
            if (e.id === "crew.show_photo") return 230;
            if (e.id === "cabin.trigger_detector" && !S.cabinFlags.detectorSounded) return 220;
            // Recruit early, then use your own arms. A helper found at minute two works for
            // thirteen minutes; one found at minute twelve works for three.
            const early = S.clock.elapsed < 330;
            if (e.id === "people.recruit" && helpers < 6) return (early ? 210 : 120) - e.cost * 0.2;
            if (e.id === "people.recruit_row" && helpers < 6) return early ? 215 : 100;
            if (e.id === "people.follow") return 200 - e.cost * 0.5;
            if (e.id === "people.chain") return 205 - e.cost * 0.6;
            if (e.id === "fire.tape_bin" || e.id === "fire.close_bin") return 180;
            if (e.id === "cabin.stow_trolley") return 175;
            // Once there are enough helpers, the best thing you can do is be a fourteenth pair
            // of arms yourself.
            if (!carrying && (e.id === "people.carry" || e.id === "people.drag")) {
                const p = e.ctx && e.ctx.p;
                const urgent = p && (p.state === "down" ||
                    p.traits.indexOf("immobile") >= 0 || p.traits.indexOf("elderly") >= 0);
                return (urgent ? 185 : 140) - e.cost * 0.3;
            }
            if (e.id === "move.to_row") return 34 - e.cost * 0.3;
            if (e.deck === "move") return 12 - e.cost * 0.2;
            if (e.deck === "people") return 20;
            return 1;
        });
    },

    // Never moves. Establishes the floor: what happens if you do nothing useful at all.
    idle(PRS, S, list) {
        return pickBy(list, (e) => (e.deck === "self" || e.deck === "desperate") ? 10 : 0);
    },

    // The coverage bot. Always takes the thing it has taken least, which walks it into the
    // lavatory, the galley and the flight deck and down every chain that needs three actions in
    // the right order. It plays appallingly and it is the only bot that reaches the whole game.
    novelty(PRS, S, list) {
        return pickBy(list, (e) => {
            const used = S.counts[e.id] || 0;
            // A never-taken action beats everything; after that, cheap beats dear so the bot
            // keeps enough clock left to reach the far end of a chain.
            return (used === 0 ? 500 : 60 - used * 12) - e.cost * 0.25;
        });
    },
};

function pickBy(list, score) {
    let best = null, bestScore = -Infinity;
    for (const e of list) {
        const s = score(e) + Math.random() * 4;
        if (s > bestScore) { bestScore = s; best = e; }
    }
    return best || list[Math.floor(Math.random() * list.length)];
}

// ------------------------------------------------------------------------------------- run ---

function playOne(PRS, opts) {
    const chars = PRS.data.characters.CHARACTERS;
    const items = PRS.data.items.ITEMS;
    const seed = opts.seed !== undefined ? opts.seed : (Math.random() * 0xffffffff) >>> 0;
    const rng = PRS.util.makeRng(seed);

    const ch = opts.char ? PRS.data.characters.byId(opts.char) : rng.pick(chars);
    // Three things out of the twelve the bag screen offers, and one outfit. Everything else in
    // items.js is in the aeroplane, to be found.
    const bag = rng.shuffle(PRS.data.items.BAG_POOL).slice(0, PRS.data.items.SLOTS);
    const outfit = opts.outfit || rng.pick(PRS.data.outfits.OUTFITS).id;

    const S = PRS.state.create({ characterId: ch.id, items: bag, outfitId: outfit, seed: seed });
    const bot = BOTS[opts.strategy || "random"];
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
        if (!entry) break;
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
             outfit: outfit,
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
    const seedArg = opt("seed", null);

    const PRS = load();
    console.log("Loaded " + PRS.atlas.boot() + " sprites, " + PRS.actions.count() +
                " action definitions.");
    console.log("Decks: " + JSON.stringify(PRS.actions.deckCounts()));

    // How many concrete actions exist at the very start, before targets multiply further.
    const probe = PRS.state.create({ characterId: "volk", outfitId: "work",
        items: PRS.data.items.PRESETS[0].items, seed: 1 });
    console.log("Concrete actions available on turn one: " + PRS.actions.available(probe).length);

    const strategies = strategy ? [strategy] : Object.keys(BOTS);
    const table = [];
    const failures = [];
    const usedIds = new Set();
    let totalSteps = 0;

    for (const s of strategies) {
        const runs = [];
        const per = Math.max(1, Math.round(n / strategies.length));
        for (let i = 0; i < per; i++) {
            const r = playOne(PRS, {
                strategy: s, char: char,
                seed: seedArg !== null ? Number(seedArg) : undefined,
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
        const secured = runs.map((r) => r.result ? r.result.secured : 0);
        const lost = runs.map((r) => r.result ? r.result.lost : 61);
        const helpers = runs.map((r) => r.S.stats.helpersRecruited);
        table.push({
            bot: s,
            runs: runs.length,
            securedAvg: mean(secured), securedMax: Math.max.apply(null, secured),
            lostAvg: mean(lost),
            helpersAvg: mean(helpers),
            actionsAvg: mean(runs.map((r) => r.steps)),
        });
    }

    console.log("\n" + pad("bot", 10) + pad("runs", 6) + pad("secured", 9) + pad("best", 6) +
                pad("lost", 7) + pad("helpers", 9) + "actions");
    console.log("-".repeat(58));
    for (const row of table) {
        console.log(pad(row.bot, 10) + pad(row.runs, 6) + pad(row.securedAvg.toFixed(1), 9) +
                    pad(row.securedMax, 6) + pad(row.lostAvg.toFixed(1), 7) +
                    pad(row.helpersAvg.toFixed(1), 9) + row.actionsAvg.toFixed(0));
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
