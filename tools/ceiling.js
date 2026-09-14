// How well can this flight actually be flown?
//
//   node tools/ceiling.js --scenario=lastfive            the tutorial, one seed, searched
//   node tools/ceiling.js --scenario=lastfive --seeds=8  eight of them, and the spread
//   node tools/ceiling.js --aircraft=be1900d --seeds=4   the full sector on the turboprop
//   node tools/ceiling.js --scenario=lastfive --line     print the line it found, action by action
//   node tools/ceiling.js --scenario=lastfive --wide     every walk, not just the ones with a reason
//
// The bots in simulate.js say what happens when somebody plays one way on purpose. They do not
// say what the aeroplane has in it. A bot that scores eleven might be flying a cabin whose best
// line is twelve, which would make it nearly perfect, or a cabin whose best line is nineteen,
// which would make it hopeless - and those two aeroplanes need opposite fixes.
//
// So this searches. A nineteen-seat cabin is small enough to be honest about: fifteen columns,
// five rows, and about thirty things worth doing at any moment. It is not small enough to solve -
// five minutes is twenty-odd actions and the branching is forty - so what runs here is a beam
// search over the clock, which is the next most honest thing.
//
// How it works, and why each part is the way it is:
//
//   The clock is the layer, not the action count. Ten seconds of walking and ten seconds of
//   arguing are the same ten seconds, but a search that layers by action count compares a player
//   who has done four cheap things against one who has done four dear ones, and the cheap one
//   wins every time for no reason. So nodes are bucketed by elapsed seconds and only ever
//   compared against others at the same point in the flight.
//
//   A node is worth what it would be worth if you stopped. Every candidate is valued by freezing
//   the player where they stand and letting the rest of the flight happen - the fire spreads, the
//   smoke falls, the helpers you recruited go on working without you - and then opening the
//   doors. That is a true lower bound on the node, it costs four milliseconds, and it is the one
//   heuristic that does not quietly assume an answer: it knows nothing about fire or people, only
//   about what the aeroplane does when you stop.
//
//   A walk is only kept if there is a reason to be there. `actions.available` offers forty-one
//   places to stand on a fifteen-column aeroplane, and forty of them are the aisle. What is kept
//   is the cheapest walk to each reason: beside the fire, the lavatory, the floor by each door,
//   beside each person still in a seat, the flight deck. Everything that is not a walk is kept
//   whole, because those are the decisions. `--wide` turns the pruning off, which is how you
//   check it is not hiding anything.
//
// The number this prints is a floor under the ceiling, not the ceiling: a beam search finds a
// good line, not the best one. Widen the beam and it goes up a little and then stops, and where
// it stops is close enough to the top of the aeroplane to design against.

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

// ------------------------------------------------------------------------------- the world ---

/** A flight ready to be searched: no counterfactual, no log book, no medals, no undo stack. */
function makeFlight(PRS, opts) {
    const ch = PRS.data.characters.byId(opts.char || "priya");
    const S = PRS.state.create({
        characterId: ch.id, outfitId: opts.outfit || null, items: ch.kit.slice(),
        seed: opts.seed, aircraft: opts.aircraft, scenario: opts.scenario,
    });
    // `quiet` is the flag the counterfactual flies under: it keeps no undo stack, writes no log
    // book and awards no medals. A search does all three a hundred thousand times and wants
    // none of them.
    S.quiet = true;
    S.counterfactual = false;
    return S;
}

/** Survivors, right now, without settling: `settle` writes a report and this is called a lot. */
function survivorsNow(PRS, S) {
    let n = 0;
    for (const p of S.pax) if (PRS.scoring.outcomeFor(S, p).key !== "lost") n++;
    return n;
}

/** The same, and the harm underneath it, which orders two nodes that save the same people. */
function valueNow(PRS, S) {
    let n = 0, harm = 0;
    for (const p of S.pax) {
        const o = PRS.scoring.outcomeFor(S, p);
        if (o.key !== "lost") n++;
        harm += o.harm;
    }
    return { survivors: n, harm: harm };
}

/**
 * What this node is worth if you stop here: the player stands still and the aeroplane finishes
 * without them. Restores what it was given, so the caller's state comes back untouched.
 */
function freezeValue(PRS, S) {
    const snap = PRS.undo.snapshot(S);
    let guard = 0;
    while (!S.clock.landed && S.clock.remaining > 0.001 && guard++ < 400) {
        PRS.actions.spend(S, Math.min(10, S.clock.remaining), null);
    }
    if (!S.clock.landed) PRS.actions.land(S);
    const v = valueNow(PRS, S);
    PRS.undo.restore(S, snap);
    S.result = null;
    S.ended = false;
    return v;
}

// -------------------------------------------------------------------------- what to try next ---

/**
 * The things worth trying from here.
 *
 * Everything that is not a walk, plus the cheapest walk to each reason there is to be somewhere.
 * The reasons are the ones a player would give out loud - the fire, the tap, the floor by a door,
 * that person there, the flight deck - which is what makes this a search over sensible paths
 * rather than over the aisle.
 */
function candidates(PRS, S, wide) {
    const list = PRS.actions.available(S, true);
    if (wide) return list;
    const cabin = PRS.cabin;
    const out = [];
    const walkFor = {};            // reason -> the cheapest walk that satisfies it
    const consider = (why, e) => {
        if (!walkFor[why] || e.cost < walkFor[why].cost) walkFor[why] = e;
    };
    const core = S.fire.core;
    const near = (x, y, tx, ty) => Math.abs(x - tx) + Math.abs(y - ty) <= 1;

    for (const e of list) {
        if (e.id !== "move.walk") { out.push(e); continue; }
        const x = e.ctx.x, y = e.ctx.y;
        if (near(x, y, core.x, core.y)) consider("fire", e);
        const kind = cabin.kindAt(x, y);
        if (kind === "lav") consider("lav", e);
        if (kind === "galley") consider("galley:" + x, e);
        if (cabin.byTheDoors(x)) consider("doors:" + x + ":" + y, e);
        if (x <= 1) consider("deck", e);
        for (const p of S.pax) {
            if (p.state === "carried" || p.state === "dead") continue;
            if (near(x, y, p.x, p.y)) consider("pax:" + p.id, e);
        }
    }
    for (const why in walkFor) out.push(walkFor[why]);
    return out;
}

// --------------------------------------------------------------------------------- the search ---

function search(PRS, opts) {
    const S = makeFlight(PRS, opts);
    const total = S.clock.total;
    const BUCKET = opts.bucket;
    const nBuckets = Math.ceil(total / BUCKET) + 2;
    const layers = [];
    for (let i = 0; i < nBuckets; i++) layers.push([]);

    const root = { snap: PRS.undo.snapshot(S), path: [], value: 0, elapsed: 0 };
    root.value = freezeValue(PRS, S).survivors;
    layers[0].push(root);

    let best = { survivors: -1, path: [], harm: Infinity };
    let expansions = 0, tried = 0;
    const seen = new Set();

    for (let b = 0; b < nBuckets; b++) {
        let nodes = layers[b];
        if (!nodes.length) continue;
        nodes.sort((a, c) => c.value - a.value || a.harm - c.harm);
        nodes = nodes.slice(0, opts.beam);
        for (const node of nodes) {
            expansions++;
            PRS.undo.restore(S, node.snap);
            S.result = null; S.ended = false;
            const cands = candidates(PRS, S, opts.wide);
            for (const e of cands) {
                PRS.undo.restore(S, node.snap);
                S.result = null; S.ended = false;
                try { PRS.actions.perform(S, e); } catch (err) { continue; }
                tried++;
                const path = node.path.concat([{ label: e.label, id: e.id,
                                                 cost: Math.round(total - S.clock.remaining -
                                                                  node.elapsed) }]);
                if (S.clock.landed || S.clock.remaining <= 0.001) {
                    if (!S.clock.landed) PRS.actions.land(S);
                    const v = valueNow(PRS, S);
                    if (v.survivors > best.survivors ||
                        (v.survivors === best.survivors && v.harm < best.harm)) {
                        best = { survivors: v.survivors, harm: v.harm, path: path };
                    }
                    continue;
                }
                const elapsed = total - S.clock.remaining;
                // A node that goes nowhere - a refused conversation, a walk to where you already
                // are - is the same aeroplane one action poorer, and expanding both is expanding
                // the same tree twice.
                //
                // Everything in the stamp is something that makes two aeroplanes genuinely
                // different to play on from here: the clock, where you are standing, who is in
                // your arms, how many people are working for you, how many are out of the rows,
                // and how much has burned. Leave out who is in your arms and the search quietly
                // treats a player holding a nine-month-old as the same position as one holding
                // nothing, which is the kind of pruning that makes a ceiling too low and says
                // nothing about why.
                const stamp = [Math.round(elapsed), S.player.x, S.player.y,
                               S.player.carrying.length + (S.player.dragging ? "d" : ""),
                               PRS.state.helperCount(S), PRS.state.movedCount(S),
                               S.actions.length,
                               Math.round(S.fire.totalBurned * 10)].join("|");
                if (seen.has(stamp)) continue;
                seen.add(stamp);
                const v = freezeValue(PRS, S);
                // Everything it would be worth if you stopped here is already known; what the
                // search is looking for is the line where stopping here is worth the most.
                if (v.survivors > best.survivors ||
                    (v.survivors === best.survivors && v.harm < best.harm)) {
                    best = { survivors: v.survivors, harm: v.harm, path: path };
                }
                const child = { snap: PRS.undo.snapshot(S), path: path, elapsed: elapsed,
                                value: v.survivors, harm: v.harm };
                // Never backwards, and never into the layer it came from: a two-second action
                // inside a ten-second bucket would otherwise be expanded forever.
                const into = Math.max(b + 1, Math.floor(elapsed / BUCKET));
                if (into < nBuckets) layers[into].push(child);
            }
        }
        // The layer is done with and it holds a snapshot of the whole aeroplane per node.
        layers[b] = null;
    }
    return { best: best, expansions: expansions, tried: tried, pax: S.pax.length,
             seconds: total };
}

// ------------------------------------------------------------------------------ the reference ---

/** Doing nothing at all: the report's "without you", and the floor everything is measured off. */
function idleScore(PRS, opts) {
    const S = makeFlight(PRS, opts);
    return freezeValue(PRS, S).survivors;
}

/** The best any bot manages on this seed, and which one it was. */
function botBest(PRS, opts) {
    let best = { bot: null, survivors: -1 };
    for (const name of PRS.bots.names()) {
        if (name === "idle" || name === "novelty" || name === "random") continue;
        const r = playOne(PRS, { strategy: name, char: opts.char || "priya", outfit: null,
                                 seed: opts.seed, aircraft: opts.aircraft,
                                 scenario: opts.scenario });
        const n = r.result ? r.result.survivors : 0;
        if (n > best.survivors) best = { bot: name, survivors: n };
    }
    return best;
}

// ----------------------------------------------------------------------------------- running ---

function main() {
    const args = process.argv.slice(2);
    const opt = (name, dflt) => {
        const hit = args.find((a) => a.startsWith("--" + name + "="));
        return hit ? hit.split("=")[1] : dflt;
    };
    const aircraft = opt("aircraft", undefined);
    const scenario = opt("scenario", undefined);
    const char = opt("char", "priya");
    const seeds = Number(opt("seeds", 1));
    const seed0 = Number(opt("seed", 1000));
    const beam = Number(opt("beam", 24));
    const bucket = Number(opt("bucket", 10));
    const wide = args.includes("--wide");
    const showLine = args.includes("--line");
    const withBots = !args.includes("--no-bots");

    const PRS = load();
    const probe = PRS.state.create({ characterId: char, seed: seed0,
                                     aircraft: aircraft, scenario: scenario });
    // `survivors` counts the cabin and not you - you are the last soul on the manifest and not
    // one of the people you are trying to save - so the ceiling is a fraction of the passengers.
    const pax = probe.pax.length;
    console.log(probe.aircraft.flightNo + ", " + (pax + 1) + " souls, " +
                PRS.util.mmss(probe.clock.total) +
                (probe.scenario ? " · " + PRS.t(probe.scenario.name) : "") +
                "   beam " + beam + ", " + bucket + "s buckets" + (wide ? ", every walk" : ""));
    console.log("");
    console.log("seed      idle   best bot   searched   of " + pax + " pax   headroom");
    console.log("-".repeat(64));

    const rows = [];
    for (let i = 0; i < seeds; i++) {
        const o = { seed: seed0 + i * 7, char: char, aircraft: aircraft, scenario: scenario,
                    beam: beam, bucket: bucket, wide: wide };
        const t0 = Date.now();
        const idle = idleScore(PRS, o);
        const bots = withBots ? botBest(PRS, o) : { bot: "-", survivors: 0 };
        const r = search(PRS, o);
        rows.push({ seed: o.seed, idle: idle, bot: bots, best: r.best.survivors,
                    path: r.best.path, ms: Date.now() - t0, tried: r.tried });
        const row = rows[rows.length - 1];
        console.log(String(row.seed).padEnd(10) +
                    String(row.idle).padEnd(7) +
                    (withBots ? (row.bot.survivors + " " + row.bot.bot) : "-").padEnd(11) +
                    String(row.best).padEnd(11) +
                    (Math.round(row.best / pax * 100) + "%").padEnd(11) +
                    ("+" + (row.best - row.idle)).padEnd(6) +
                    "  " + (row.ms / 1000).toFixed(1) + "s");
    }

    const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const idles = rows.map((r) => r.idle), bests = rows.map((r) => r.best);
    console.log("-".repeat(64));
    console.log("mean      " + mean(idles).toFixed(1).padEnd(7) +
                (withBots ? mean(rows.map((r) => r.bot.survivors)).toFixed(1) : "-").padEnd(11) +
                mean(bests).toFixed(1).padEnd(11) +
                (Math.round(mean(bests) / pax * 100) + "%").padEnd(11) +
                "+" + (mean(bests) - mean(idles)).toFixed(1));
    console.log("spread    " + (Math.min.apply(null, idles) + "-" + Math.max.apply(null, idles))
                .padEnd(7) + "".padEnd(11) +
                (Math.min.apply(null, bests) + "-" + Math.max.apply(null, bests)).padEnd(11));

    if (showLine) {
        const r = rows[0];
        console.log("\nThe line it found on seed " + r.seed + " (" + r.best + " of " + pax + "):");
        let t = 0;
        for (const step of r.path) {
            t += step.cost;
            console.log("  " + String(t).padStart(4) + "s  " + String(step.cost).padStart(3) +
                        "s  " + step.label);
        }
    }
}

main();
