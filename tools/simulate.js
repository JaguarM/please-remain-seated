// Play the game without a browser, a great many times, and complain about anything that breaks.
//
//   node tools/simulate.js                    200 random flights
//   node tools/simulate.js 2000               2000 of them
//   node tools/simulate.js 400 --strategy=carry --char=gordy --outfit=work
//   node tools/simulate.js 300 --strategy=douse --bag=water_big,wet_towel,blanket
//   node tools/simulate.js 1 --seed=12345 --verbose
//   node tools/simulate.js 8 --luck=perfect --seed=1     every bot once, one aeroplane, no dice
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

// The bots' own coin, kept well away from the game's. The flight's dice are cast at boarding
// from its seed and never touched again, so a bot cannot shift them; this coin is for the bot's
// own tie-breaks, seeded from the run seed so that a seed still reproduces a whole flight, bot
// included, which is what tools/dump_frame.js needs in order to promise that the picture in the
// README regenerates.
let coin = () => Math.random();

function setCoin(rng) { coin = rng; }

// The map is the only way to move, so a bot that wants to be somewhere scores the walk entries
// by where they end up: `walkTo` is the cheapest walk whose destination satisfies a test.
function walkTo(list, pred) {
    let best = null;
    for (const e of list) {
        if (e.id !== "move.walk" || !pred(e.ctx.x, e.ctx.y)) continue;
        if (!best || e.cost < best.cost) best = e;
    }
    return best;
}
const beside = (x, y, tx, ty) => Math.abs(x - tx) + Math.abs(y - ty) <= 1;

/** Somebody still in the rows who could be moved: not by a door, not in anybody's arms. */
function movable(PRS, p) {
    return p.state !== "dead" && p.state !== "carried" && !p.helper && !PRS.cabin.byTheDoors(p.x);
}

/**
 * Who most needs moving, from where the bot is standing: the gain a helper reads off the cabin,
 * less the walk to them, and nobody a helper is already on the way to. A person can read the same
 * thing - who is coughing, who is under the fire, which end has clear air - so this is not the
 * bot knowing something a player could not.
 */
function worstOff(PRS, S) {
    let best = null, bestV = 0;
    for (const p of S.pax) {
        if (!movable(PRS, p) || p.claimedBy) continue;
        const v = PRS.pax.moveGain(S, p) -
                  (Math.abs(p.x - S.player.x) + Math.abs(p.y - S.player.y)) * 0.6;
        if (v > bestV) { bestV = v; best = p; }
    }
    return best;
}

/** The bit of floor to put somebody down on: the one a helper would choose. */
function doorFloor(PRS, S) {
    const r = PRS.pax.refuge(S, S.player.x);
    return (x, y) => !!r && x === r.x && y === r.y;
}

/** Everything burning within reach of a tile, which is how much one pour from there can touch. */
function heatAround(PRS, S, x, y) {
    const f = S.fire, cabin = PRS.cabin;
    let sum = f.intensity[cabin.idx(x, y)];
    for (const [nx, ny] of cabin.neighbours(x, y)) sum += f.intensity[cabin.idx(nx, ny)];
    return sum;
}

/** Whether there is anything wet in the bag that the fire deck would use. */
function loaded(PRS, S) {
    const st = PRS.state;
    const has = (id) => { const s = st.slotOf(S, id); return s && !s.spent && s.uses > 0; };
    const blanket = st.slotOf(S, "blanket");
    return !!S.flags.bagFull || has("water_big") || has("wet_towel") || !!(blanket && blanket.wet);
}

// Each bot scores the available actions and takes the best. `random` does not score at all, which
// is the whole point of it.
const BOTS = {
    random(PRS, S, list) {
        // Walking is hidden from the player's list and there are two hundred places to walk to, so
        // a uniform pick over everything is a bot that paces. A confused person mostly does things.
        const walks = list.filter((e) => e.id === "move.walk");
        const rest = list.filter((e) => e.id !== "move.walk");
        const pool = rest.length && coin() > 0.3 ? rest : (walks.length ? walks : rest);
        return pool[Math.floor(coin() * pool.length)];
    },

    fire(PRS, S, list) {
        const c = S.fire.core;
        const go = walkTo(list, (x, y) => beside(x, y, c.x, c.y));
        return pickBy(list, (e) => {
            if (e.deck === "fire") return 100 - e.cost * 0.2;
            if (e === go) return 60;
            if (e.id === "move.walk") return 5 - e.cost * 0.1;
            return 0;
        });
    },

    // The strategy the first playtest found: stand where one pour lands on the most fire, use
    // everything wet you have, and walk back to the lavatory tap when it runs out. It is here so
    // that it can never quietly become the best way to play again, and so that it can never
    // quietly become worthless either.
    douse(PRS, S, list) {
        const cabin = PRS.cabin;
        const here = heatAround(PRS, S, S.player.x, S.player.y);
        const atLav = cabin.kindAt(S.player.x, S.player.y) === "lav";
        const wet = loaded(PRS, S);
        let spot = null, spotV = -Infinity;
        for (const e of list) {
            if (e.id !== "move.walk") continue;
            if (S.fire.intensity[cabin.idx(e.ctx.x, e.ctx.y)] > 25) continue;
            const v = heatAround(PRS, S, e.ctx.x, e.ctx.y) - e.cost * 1.5;
            if (v > spotV) { spotV = v; spot = e; }
        }
        const toLav = walkTo(list, (x, y) => cabin.kindAt(x, y) === "lav");
        const refill = ["cabin.fill_bottle", "cabin.wet_towel", "cabin.wet_blanket", "cabin.fill_bag"];
        return pickBy(list, (e) => {
            if (atLav && refill.indexOf(e.id) >= 0) return 300;
            if (e.id === "fire.photograph") return 250;
            if (e.id === "people.reassure" && (e.ctx.p.annoyed || 0) >= PRS.pax.GRAB_AT) return 210;
            if (wet) {
                if (e.id === "fire.douse" && here > 20) return 200;
                if (e.id === "fire.smother" && here > 20 && e.label.indexOf("jacket") < 0) return 190;
                if (e === spot && spot && here < spotV * 0.7) return 150;
            } else {
                if (e === toLav) return 140;
                if (e.id === "fire.smother" && here > 20 && e.label.indexOf("jacket") < 0) return 120;
            }
            if (e.id === "move.walk") return 1 - e.cost * 0.1;
            return 0;
        });
    },

    carry(PRS, S, list) {
        const cabin = PRS.cabin;
        const hands = S.player.carrying.length || (S.player.dragging ? 1 : 0);
        const atDoor = cabin.byTheDoors(S.player.x);
        const toDoor = hands ? walkTo(list, doorFloor(PRS, S)) : null;
        const target = hands ? null : worstOff(PRS, S);
        const toPax = target ? walkTo(list, (x, y) => beside(x, y, target.x, target.y)) : null;
        return pickBy(list, (e) => {
            if (hands && atDoor && (e.id === "people.put_down" || e.id === "people.stop_drag")) return 200;
            if (e === toDoor) return 160;
            // Dragging is how you move anybody heavier than your arms, which for most of the cast
            // is most of the aeroplane.
            if (!hands && (e.id === "people.carry" || e.id === "people.drag") &&
                e.ctx.p === target) return 130 - e.cost * 0.2;
            if (e === toPax) return 40;
            if (e.id === "move.walk") return 10 - e.cost * 0.2;
            return 0;
        });
    },

    // What the game is actually about: recruit, delegate, and only then carry.
    good(PRS, S, list) {
        return goodScore(PRS, S, list, false);
    },

    // The good bot, but it starts at the fire while the fire is small, with whatever it boarded
    // with, and only then goes to recruit. If the mechanics interlock this should do at least as
    // well as either half on its own.
    blend(PRS, S, list) {
        return goodScore(PRS, S, list, true);
    },

    // Does nothing at all. Establishes the floor, and it is the same flight the report calls
    // "without you". It used to pick a thing for itself and, with nothing to pick, clicked at
    // random, which made the floor a few people too high.
    idle() {
        return null;
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

function goodScore(PRS, S, list, fightsFirst) {
    const st = PRS.state;
    const cabin = PRS.cabin;
    const core = S.fire.core;
    const carrying = S.player.carrying.length || (S.player.dragging ? 1 : 0);
    const atDoor = cabin.byTheDoors(S.player.x);
    const helpers = st.helperCount(S);
    const toDoor = carrying ? walkTo(list, doorFloor(PRS, S)) : null;
    const target = carrying ? null : worstOff(PRS, S);
    const toPax = target ? walkTo(list, (x, y) => beside(x, y, target.x, target.y)) : null;
    // The first three minutes at the locker, while there is something wet in the bag and nobody
    // has hold of your arm.
    const atFire = fightsFirst && !carrying && S.clock.elapsed < 180 && loaded(PRS, S) &&
                   !PRS.pax.obstructor(S);
    const hot = atFire && heatAround(PRS, S, S.player.x, S.player.y) > 8;
    const toFire = atFire && !hot ? walkTo(list, (x, y) => beside(x, y, core.x, core.y) &&
        S.fire.intensity[cabin.idx(x, y)] < 25) : null;
    return pickBy(list, (e) => {
        if (carrying && atDoor && (e.id === "people.put_down" ||
                                   e.id === "people.stop_drag")) return 300;
        if (e === toDoor) return 250;
        if (e.id === "fire.photograph") return 240;
        if (hot && (e.id === "fire.close_bin" || e.id === "fire.tape_bin")) return 238;
        if (hot && (e.id === "fire.douse" || (e.id === "fire.smother" &&
                                              e.label.indexOf("jacket") < 0))) return 235;
        if (e === toFire) return 232;
        if (e.id === "crew.show_photo") return 230;
        if (e.id === "cabin.trigger_detector") return 220;
        // Recruit early, then use your own arms. A helper found at minute two works for
        // thirteen minutes; one found at minute twelve works for three.
        const early = S.clock.elapsed < 330;
        if (e.id === "people.recruit") return (early ? 210 : 120) - e.cost * 0.2 - helpers * 5;
        // A sceptic is not talked round. The photograph is the only thing that moves them, and
        // it moves each of them exactly once.
        if (e.id === "people.show_photo" && e.ctx && !PRS.pax.hasSeen(e.ctx.p)) return 205;
        if (e.id === "people.follow") return 200 - e.cost * 0.5;
        if (e.id === "fire.tape_bin" || e.id === "fire.close_bin") return 180;
        if (e.id === "cabin.stow_trolley") return 175;
        // Once there are enough helpers, the best thing you can do is be an eighth pair
        // of arms yourself, for whoever is worst off.
        if (!carrying && (e.id === "people.carry" || e.id === "people.drag") && e.ctx.p === target) {
            const p = e.ctx.p;
            const urgent = p.state === "down" ||
                p.traits.indexOf("immobile") >= 0 || p.traits.indexOf("elderly") >= 0;
            return (urgent ? 185 : 140) - e.cost * 0.3;
        }
        if (e === toPax) return 34;
        if (e.id === "move.walk") return 12 - e.cost * 0.2;
        if (e.deck === "people") return 20;
        return 1;
    });
}

function pickBy(list, score) {
    let best = null, bestScore = -Infinity;
    for (const e of list) {
        const s = score(e) + coin() * 4;
        if (s > bestScore) { bestScore = s; best = e; }
    }
    return best || list[Math.floor(coin() * list.length)];
}

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
    const S = PRS.state.create({ characterId: ch.id, outfitId: outfit, items: bag, seed: seed,
                                 luck: opts.luck });
    // The report works out what the same flight does with nobody in it, because that is what the
    // log book credits. Nothing here reads the number and it is a second fifteen minutes of
    // physics per flight, so a run of ten thousand does not pay for it.
    S.counterfactual = false;
    setCoin(PRS.util.makeRng((seed ^ 0x9e3779b9) >>> 0));
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
    const luck = opt("luck", "dice");

    const PRS = load();
    console.log("Loaded " + PRS.atlas.boot() + " sprites, " + PRS.actions.count() +
                " action definitions.");
    console.log("Decks: " + JSON.stringify(PRS.actions.deckCounts()));
    if (luck === "perfect") {
        console.log("Perfect luck: every coin the player's way, every timer at its middle, no dice.");
    }

    // How many concrete actions exist at the very start, before targets multiply further.
    const probe = PRS.state.create({ characterId: "ansel", seed: 1 });
    console.log("Concrete actions available on turn one: " + PRS.actions.available(probe).length);

    const strategies = strategy ? strategy.split(",") : Object.keys(BOTS);
    const table = [];
    const failures = [];
    const usedIds = new Set();
    let totalSteps = 0;

    for (const s of strategies) {
        const runs = [];
        const per = Math.max(1, Math.round(n / strategies.length));
        for (let i = 0; i < per; i++) {
            const r = playOne(PRS, {
                strategy: s, char: char, outfit: outfit, luck: luck,
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
