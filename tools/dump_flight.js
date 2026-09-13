// A whole flight, one drawable moment every so many seconds, for tools/render_gif.py.
//
//   node tools/dump_flight.js                                a good bot, every ten seconds
//   node tools/dump_flight.js --bot=sinkthen --seed=606 --every=8
//   node tools/dump_flight.js --code=TN447-...               a flight somebody shared
//   node tools/dump_flight.js --flight=flights.json --only=0 one out of the recorder's file
//
// Then:  python tools/render_gif.py                          writes docs/flight.gif
//
// This is dump_frame.js over and over, and it draws its moments the same way for the same
// reason: the frame is built by tools/frame.js, so the still in the README and the animation are
// the same picture of the same simulation.
//
// The sampling is the only thing here with an idea of its own. An action pays its seconds up
// front and then plays them out in twelve-second sub-steps - that is what the play screen watches
// go by - so this takes the sub-steps one at a time and writes a frame whenever the played clock
// crosses the next mark. A frame every ten seconds, rather than a frame every click: a
// ninety-second carry through the smoke is nine pictures of a cabin getting worse, which is what
// it was.
const fs = require("fs");
const path = require("path");
const F = require("./frame.js");

const PRS = F.loadGame().load();

const args = process.argv.slice(2);
const opt = (name, dflt) => {
    const hit = args.find((a) => a.startsWith("--" + name + "="));
    return hit ? hit.split("=")[1] : dflt;
};

const every = Math.max(1, Number(opt("every", 10)));
const out = opt("out", path.join(__dirname, "..", "docs", "flight.json"));
const codeArg = opt("code", null);
const fileArg = opt("flight", null);
const only = Number(opt("only", 0));

// ------------------------------------------------------------------------ what is being flown ---
//
// Three ways in, and they all come down to the same thing: a state, and something that says what
// the next action is. A bot decides; a code and a recording remember.

function fromBot() {
    const seed = Number(opt("seed", 606));
    const name = opt("bot", "blend");
    const bot = PRS.bots.BOTS[name];
    if (!bot) throw new Error("no such bot: " + name + " (" + PRS.bots.names().join(", ") + ")");
    const bag = opt("bag", null);
    const S = PRS.state.create({
        characterId: opt("char", "ansel"), outfitId: opt("outfit", null) || null,
        items: bag ? bag.split(",") : undefined, seed: seed,
        daily: PRS.daily.isKey(opt("daily", "")) ? opt("daily", "") : null,
    });
    PRS.bots.setCoin(PRS.util.makeRng((seed ^ 0x9e3779b9) >>> 0));
    return {
        S: S, what: name + ", seed " + seed,
        next() {
            const list = PRS.actions.available(S, true);
            return list.length ? bot(PRS, S, list) : null;
        },
    };
}

/** A shared code, flown by the same reader the game uses when it puts a ghost beside you. */
function fromCode(code) {
    const got = PRS.share.decode(code);
    if (!got.ok) throw new Error(got.why);
    const plan = got.plan;
    const S = PRS.state.create({ characterId: plan.characterId, outfitId: plan.outfitId,
                                 items: plan.items, seed: plan.seed, daily: plan.day });
    S.quiet = true;
    S.counterfactual = false;
    const ch = PRS.data.characters.byId(plan.characterId);
    const g = PRS.share.stepper(plan, S, perform);
    return {
        S: S, stepper: g,
        what: (ch ? ch.name : "somebody") + ", " + (plan.day ? "daily " + plan.day
                                                             : "seed " + plan.seed),
        drive() { while (g.next()) { /* the whole flight */ } },
    };
}

/** One flight out of the file the report's "Save recorded flights" writes. */
function fromFile(file) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
    const flights = Array.isArray(raw) ? raw : raw.flights ? raw.flights : [raw];
    const rec = flights[only];
    if (!rec) throw new Error("no flight " + only + " in " + file);
    const S = PRS.state.create({ characterId: rec.character, outfitId: rec.outfit,
                                 items: rec.items, seed: rec.seed });
    let at = 0;
    const ch = PRS.data.characters.byId(rec.character);
    return {
        S: S, what: (ch ? ch.name : "somebody") + ", seed " + rec.seed,
        next() {
            while (at < rec.keys.length) {
                const key = rec.keys[at++];
                const def = PRS.actions.byId(key.split("#")[0]);
                if (!def) continue;
                const entry = PRS.actions.entriesFor(def, S).filter((e) => e.key === key)[0];
                if (entry) return entry;
                console.error("  action " + at + " is not on this aeroplane: " + key);
                return null;
            }
            return null;
        },
    };
}

// --------------------------------------------------------------------------------- sampling ---

const frames = [];
let lastAt = -1e9;
let source = null;

/**
 * A frame, if enough of the flight has gone by since the last one.
 *
 * "Gone by" is not what the clock says. An action's seconds are taken from the clock the moment
 * it starts and then played out in sub-steps, so in the middle of a ninety-second carry the
 * clock reads ninety seconds later than the cabin does. The play screen shows the played number
 * and so does this, for the same reason: the picture and the time under it have to be the same
 * moment, or the last four frames of every flight say 0:00 over four different cabins.
 *
 * The marks are not on a grid either. A sub-step is twelve seconds of world and that is as fine
 * as this simulation goes, so asking for a frame every ten seconds on a fixed grid asks for two
 * pictures of one sub-step - the same cabin twice, which in a GIF is a stutter. This asks for a
 * frame once at least `every` seconds have been played since the last one, and takes the cabin
 * where it actually is.
 */
function sample(passage, force) {
    const S = source.S;
    const owed = passage && !passage.finished ? passage.owed() : 0;
    const played = S.clock.elapsed - owed;
    if (!force && played - lastAt < every) return;
    lastAt = played;
    frames.push(F.build(PRS, S, {
        at: Math.round(played), frame: frames.length,
        elapsed: Math.round(played),
        remaining: Math.round(S.clock.remaining + owed),
        clock: PRS.util.mmss(S.clock.remaining + owed),
    }));
}

/** One action, its seconds taken twelve at a time, with a picture whenever one is due. */
function perform(S, entry) {
    const done = PRS.actions.perform(S, entry, { paced: true });
    if (done && done.passage) {
        while (done.passage.step()) sample(done.passage);
    }
    sample(null);
    return done;
}

function main() {
    source = codeArg ? fromCode(codeArg) : fileArg ? fromFile(fileArg) : fromBot();
    const S = source.S;
    sample(null, true);                             // the cabin before anything was done to it

    if (source.drive) {
        source.drive();
    } else {
        let turns = 0;
        while (!S.clock.landed && turns++ < 1200) {
            const entry = source.next();
            if (!entry) break;
            perform(S, entry);
        }
    }
    // Whatever is left of the flight, with nobody doing anything, in sampled steps.
    while (!S.clock.landed && S.clock.remaining > 0.001) {
        const p = PRS.actions.passage(S, Math.min(every, S.clock.remaining), null);
        while (p.step()) { /* the sub-steps */ }
        sample(null);
    }
    if (!S.clock.landed) PRS.actions.land(S);
    // And the cabin the doors opened on - unless the last sub-step already drew it, which it
    // does whenever the wheels come down in the middle of an action rather than after one.
    if (!frames.length || !frames[frames.length - 1].meta.landed) sample(null, true);

    const film = {
        what: source.what,
        every: every,
        seed: S.seed,
        daily: S.daily || null,
        survivors: S.result ? S.result.survivors : null,
        grade: S.result && S.result.grade ? S.result.grade.key : null,
        W: PRS.cabin.W, H: PRS.cabin.H,
        frames: frames,
    };
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(film));
    const kb = Math.round(fs.statSync(out).size / 1024);
    console.log("wrote " + path.relative(process.cwd(), out) + " — " + frames.length +
                " frames every " + every + "s of " + source.what + ", " +
                (film.survivors === null ? "" : film.survivors + " of 60, ") + kb + " kB");
    console.log("now: python tools/render_gif.py");
}

main();
