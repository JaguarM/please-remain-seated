// Fire every action in the game at least once, on purpose, and report the ones that cannot be.
//
//   node tools/coverage.js
//   node tools/coverage.js --verbose        print the log line each action produced
//   node tools/coverage.js fire.case_in_sink   just this one, with its log line
//
// The random bots in simulate.js find the crashes. They do not find the actions that are simply
// unreachable - the third step of a three-step chain, the thing that only exists in the aft
// lavatory, the crew request that needs a member of crew standing next to you - because a bot
// that picks the least-used action still has to be in the right place at the right time with the
// right thing in its hand.
//
// So this walks the list instead: for every definition, it builds a world designed to make that
// definition possible, puts the player in each of a dozen places in turn, and performs it. An
// action that never becomes available in any of them is either dead or its `when` is wrong, and
// either way it should not be in the game claiming to be one of three hundred.

const path = require("path");
const { load } = requireSim();

function requireSim() {
    // simulate.js is a script, not a module. Rather than duplicate the loader, read it and pull
    // the two functions out, which keeps the file list in exactly one place.
    const fs = require("fs");
    const src = fs.readFileSync(path.join(__dirname, "simulate.js"), "utf8")
        .replace(/\nmain\(\);\s*$/, "\nmodule.exports = { load, playOne, BOTS };\n");
    const mod = { exports: {} };
    new Function("module", "exports", "require", "__dirname", "__filename", src)(
        mod, mod.exports, require, __dirname, path.join(__dirname, "simulate.js"));
    return mod.exports;
}

const PRS = load();
const cabin = PRS.cabin;

const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const ONLY = args.filter((a) => a.indexOf("--") !== 0)[0] || null;

/** A world built to say yes: every item, every story flag, a fire, smoke, and casualties. */
function build(opts) {
    opts = opts || {};
    const S = PRS.state.create({
        characterId: opts.character || "beverley",
        outfitId: opts.outfit || "work",
        items: PRS.data.items.ITEMS.map((i) => i.id),   // the three-slot limit is not enforced here
        seed: opts.seed || 4242,
    });
    // Kit the crew hand over, which normally has to be asked for.
    S.inventory.push({ id: "halon_bottle", uses: 1, spent: false, item: {
        id: "halon_bottle", name: "BCF halon extinguisher", kg: 3.2,
        sprite: "cabin:extinguisher", uses: 1, agent: "halon", tags: ["extinguisher", "halon"],
        blurb: "", note: "" } });
    S.inventory.push({ id: "water_ext", uses: 2, spent: false, item: {
        id: "water_ext", name: "Water extinguisher", kg: 6.4,
        sprite: "cabin:extinguisher_water", uses: 2, agent: "water",
        tags: ["extinguisher", "water"], blurb: "", note: "" } });

    if (opts.elapsed) PRS.actions.spend(S, opts.elapsed, { tags: [] });

    // Make the fire real without waiting for it.
    if (opts.fire !== false) {
        const c = S.fire.core;
        for (let d = -2; d <= 2; d++) {
            for (const y of [2, 3, 5]) {
                if (!cabin.inBounds(c.x + d, y)) continue;
                const i = cabin.idx(c.x + d, y);
                S.fire.intensity[i] = 34 + Math.abs(d) * 4;
                S.fire.smoke[i] = 40;
                S.fire.heat[i] = 45;
            }
        }
        S.fire.core.vented = 3;
        S.fire.core.exposed = !!opts.exposed;
        S.fire.peakIntensity = 60;
    }

    // Every one-shot story flag the chains hang off, unless the action under test is the one
    // that sets it.
    if (opts.noBag) S.inventory = [];
    // The loot deck needs passengers whose pockets you have already looked into, and a player who
    // does not already own the thing they are holding.
    if (opts.revealAll) for (const p of S.pax) if (p.carries) p.revealed = true;
    if (opts.bare) {
        // Nothing fetched, nothing carried, nothing used: the world the "go and get it" actions
        // live in. Everything above is undone.
        S.inventory = S.inventory.filter((s) => ["halon_bottle", "water_ext"].indexOf(s.id) < 0);
    }
    Object.assign(S.flags, opts.bare ? { havePhoto: true } : {
        havePhoto: true, haveIce: true, bagFull: true, sinkFull: true, haveJug: true,
        haveBlankets: 4, haveCushion: true, knowTheList: true, wilburSaid: true,
        chipConfessed: true, usedPA: true, tookAVote: true,
        holdingCase: !!opts.holdingCase, caseInLav: !!opts.caseInLav,
        holdingCushion: !!opts.holdingCushion, lavClosed: true, panelOpen: false,
        cockpitOpened: !!opts.cockpit,
    });
    S.credibility = opts.credibility === undefined ? 85 : opts.credibility;
    S.cabinAwareness = 70;
    S.cabinPanic = 45;
    if (opts.crewPhase !== undefined) { S.crewPhase = opts.crewPhase; S.crewPhaseAt = 0; }
    S.cabinFlags.masksDropped = !opts.bare;
    if (opts.blockAisle) {
        S.cabinFlags.aisleBlocked[cabin.xOfRow(9)] = 40;
        S.cabinFlags.aisleBlocked[cabin.xOfRow(12)] = 40;
    }
    if (opts.binsOpen) {
        for (let d = -3; d <= 3; d++) {
            S.cabinFlags.binsOpen[cabin.binKey(S.fire.core.x + d, "left")] = true;
        }
    }
    if (opts.gunDrawn) S.flags.gunDrawn = true;
    if (opts.vest) S.player.wearing.vest = true;
    if (opts.wetBlanket) { const b = PRS.state.slotOf(S, "blanket"); if (b) b.wet = true; }
    if (opts.emptyBottle) {
        for (const id of ["water_big", "wet_towel"]) {
            const s = PRS.state.slotOf(S, id);
            if (s) { s.uses = 0; s.spent = false; }
        }
    }
    S.cabinFlags.detectorSounded = !!opts.detector;
    S.cabinFlags.binsOpen[cabin.binKey(S.fire.core.x, "left")] = !!opts.binOpen;
    S.cabinFlags.cartOut = !!opts.cartOut;
    if (opts.cartOut) {
        S.cabinFlags.cartX = cabin.xOfRow(11);
        S.cabinFlags.aisleBlocked[S.cabinFlags.cartX] = 9999;
    } else {
        S.cabinFlags.aisleBlocked = {};
    }

    // A cabin with every kind of person in every state the actions ask about.
    S.pax.forEach(function (p, n) {
        if (n % 7 === 0) { p.state = "down"; p.smokeDose = 60; }
        else if (n % 7 === 1) { p.state = "aisle"; p.x = p.homeX; p.y = cabin.AISLE_Y; p.panic = 80; }
        else if (n % 7 === 2) { p.state = "standing"; p.belted = false; }
        else if (n % 7 === 3) { p.burns = 30; p.smokeDose = 30; }
        if (n % 11 === 0 && p.state !== "down") PRS.pax.recruit(S, p, "");
        p.trust = 60;
        p.awareness = 70;
    });
    if (opts.carrying) {
        const victim = S.pax.filter((p) => p.state !== "down" && !p.helper)[0];
        if (victim) {
            victim.state = "carried"; victim.carriedBy = "player";
            S.player.carrying.push(victim.id);
        }
    }
    if (opts.dragging) {
        const victim = S.pax.filter((p) => p.state === "down")[0];
        if (victim) { victim.state = "carried"; S.player.dragging = victim.id; }
    }
    S.player.burns = opts.burns === undefined ? 25 : opts.burns;
    S.player.smokeDose = 25;
    S.player.panic = opts.panic === undefined ? 55 : opts.panic;
    S.player.stamina = 30;
    if (opts.wearHood) S.player.wearing.hood = true;
    if (opts.seated) { S.player.x = S.player.homeX; S.player.y = S.player.homeY;
                       S.player.seatedTurns = 1; }
    PRS.state.reindex(S);
    return S;
}

/** Everywhere worth standing, in the order most likely to unlock something. */
function places(S) {
    const c = S.fire.core;
    return [
        [c.x, cabin.AISLE_Y], [c.x, c.y], [c.x - 1, c.y],
        [cabin.AFT_GALLEY_X, 7],                       // the aft lavatory
        [cabin.AFT_GALLEY_X, 3], [cabin.AFT_GALLEY_X, cabin.AISLE_Y],
        [cabin.FWD_GALLEY_X, 3], [cabin.FWD_GALLEY_X, cabin.AISLE_Y],
        [cabin.FWD_CROSS_X, cabin.AISLE_Y], [cabin.FWD_CROSS_X, 0],
        [cabin.OVERWING_X, cabin.AISLE_Y], [cabin.OVERWING_X, 8],
        [cabin.AFT_CROSS_X, cabin.AISLE_Y],
        [cabin.xOfRow(11), cabin.AISLE_Y], [cabin.xOfRow(11), 2],
        [cabin.xOfRow(1), cabin.AISLE_Y], [cabin.xOfRow(23), cabin.AISLE_Y],
        [1, cabin.AISLE_Y], [0 + 1, 1],
    ].filter(([x, y]) => cabin.inBounds(x, y) && !cabin.solid(x, y));
}

// The worlds to try, in order. Each one unlocks a different family of actions.
const SCENARIOS = [
    { name: "mid-flight",   opts: { elapsed: 240, crewPhase: 2, cartOut: true } },
    { name: "bin open",     opts: { elapsed: 240, exposed: true, binOpen: true, crewPhase: 3 } },
    { name: "holding case", opts: { elapsed: 240, exposed: true, holdingCase: true } },
    { name: "case in lav",  opts: { elapsed: 240, exposed: true, caseInLav: true } },
    { name: "carrying",     opts: { elapsed: 300, carrying: true } },
    { name: "dragging",     opts: { elapsed: 300, dragging: true } },
    { name: "late",         opts: { elapsed: 700, crewPhase: 5, detector: true } },
    { name: "sat down",     opts: { elapsed: 240, seated: true } },
    { name: "calm start",   opts: { elapsed: 20, crewPhase: 0, credibility: 5, fire: false,
                                    panic: 20, burns: 0, cartOut: true } },
    { name: "hooded",       opts: { elapsed: 300, wearHood: true } },
    { name: "flight deck",  opts: { elapsed: 300, cockpit: true, crewPhase: 4 } },
    { name: "bare",         opts: { elapsed: 240, bare: true, crewPhase: 2, cartOut: true } },
    { name: "bare late",    opts: { elapsed: 820, bare: true, crewPhase: 4, detector: true,
                                    panic: 90 } },
    { name: "empty bag",    opts: { elapsed: 300, bare: true, noBag: true, crewPhase: 3 } },
    { name: "asked around", opts: { elapsed: 300, bare: true, noBag: true,
                                    revealAll: true, crewPhase: 3 } },
    { name: "empty handed", opts: { elapsed: 300, emptyBottle: true, bare: true } },
    { name: "jammed",       opts: { elapsed: 300, blockAisle: true, binsOpen: true,
                                    cartOut: true } },
    { name: "kitted out",   opts: { elapsed: 300, gunDrawn: true, vest: true, wetBlanket: true,
                                    binsOpen: true } },
];

// Some perks gate whole families, so the character has to change too. Beverley has most of them.
const CHARACTERS = ["beverley", "gordy", "yuki", "dale", "miriam", "rusk", "ansel", "mo",
                    "kip", "nils", "volk", "ubel"];

/** Every tile you could stand on. The slow second pass, for the ones the short list missed. */
function everywhere() {
    const out = [];
    for (let x = 0; x < cabin.W; x++) {
        for (let y = 0; y < cabin.H; y++) {
            if (!cabin.solid(x, y)) out.push([x, y]);
        }
    }
    return out;
}

function tryDef(def, wide) {
    for (const ch of CHARACTERS) {
        for (const scenario of SCENARIOS) {
            const S = build(Object.assign({ character: ch }, scenario.opts));
            const spots = wide ? everywhere() : places(S);
            for (const [x, y] of spots) {
                PRS.actions.moveTo(S, x, y);
                // Standing next to a crew member unlocks the whole crew deck.
                for (const c of S.crew) { c.x = x; c.y = y; c.busy = 0; }
                PRS.state.reindex(S);
                let entries;
                try {
                    entries = PRS.actions.entriesFor(def, S);
                } catch (err) {
                    return { ok: false, where: "available", err: err, ch: ch,
                             scenario: scenario.name };
                }
                if (!entries.length) continue;
                const entry = entries[0];
                let out;
                try {
                    out = PRS.actions.perform(S, entry);
                } catch (err) {
                    return { ok: false, where: "perform", err: err, ch: ch,
                             scenario: scenario.name, label: entry.label };
                }
                return { ok: true, ch: ch, scenario: scenario.name, place: cabin.placeName(x, y),
                         label: entry.label, cost: entry.cost, text: out && out.text };
            }
        }
    }
    return { ok: false, where: "unreachable" };
}

function main() {
    const defs = PRS.actions.all().filter((d) => !ONLY || d.id === ONLY);
    const unreachable = [];
    const broken = [];
    let ok = 0;

    for (const def of defs) {
        let r = tryDef(def, false);
        // The short list of places did not find it. Try standing everywhere, which is slow and
        // is only ever run for the handful that get this far.
        if (!r.ok && r.where === "unreachable") r = tryDef(def, true);
        if (r.ok) {
            ok++;
            if (VERBOSE || ONLY) {
                console.log("\n" + def.id + "  [" + r.ch + " / " + r.scenario + " / " + r.place +
                            "]  " + r.cost + "s");
                console.log("  " + r.label);
                if (r.text) console.log("  " + String(r.text).replace(/\n/g, "\n  "));
            }
        } else if (r.where === "unreachable") {
            unreachable.push(def.id);
        } else {
            broken.push({ id: def.id, r: r });
        }
    }

    console.log("\n" + ok + " of " + defs.length + " actions performed at least once.");
    if (unreachable.length) {
        console.log("\nNEVER AVAILABLE (" + unreachable.length + "):");
        for (const id of unreachable) console.log("  " + id);
    }
    if (broken.length) {
        console.log("\nTHREW (" + broken.length + "):");
        for (const b of broken) {
            console.log("  " + b.id + " in " + b.r.where + " [" + b.r.ch + "/" + b.r.scenario + "]");
            console.log("    " + (b.r.err.stack || b.r.err).split("\n").slice(0, 3).join("\n    "));
        }
    }
    if (broken.length) process.exit(1);
    if (!unreachable.length && !broken.length) console.log("Every action in the game is reachable.");
}

main();
