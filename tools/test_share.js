// Every flight a bot can fly, written out as a code and flown again from it.
//
//   node tools/test_share.js            # 120 flights, every bot, every character
//   node tools/test_share.js 600
//   node tools/test_share.js 40 --verbose
//
// A code is not a recording. It is the list of choices a player made, each one written as its
// position in the list of everything they could have done at that moment - which is nine bits
// rather than a sentence, and is why a whole fifteen minutes fits in a message. The cost of that
// is that a code means nothing without the simulation: read it a row out of step and it is
// somebody else's afternoon, in the same cabin, and it will not look wrong.
//
// So the only test worth having is the whole round trip. Fly it, write it, read it back, fly it
// again from the code alone, and insist that the same sixty people come off the aeroplane in the
// same condition. This asserts that, and it asserts the two ways a code is allowed to be refused
// - a corrupted one and one from another build - because those are the paths a player meets when
// somebody pastes them something, and a refusal that does not happen is a flight that lands in
// the wrong cabin.
const F = require("./frame.js");

const PRS = F.loadGame().load();

const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a)) || 120);
const VERBOSE = args.includes("--verbose");

const rng = PRS.util.makeRng(20260913);
const bots = PRS.bots.names();
const chars = PRS.data.characters.CHARACTERS.map((c) => c.id);

function fly(strategy, char, seed, day) {
    const S = PRS.state.create({ characterId: char, seed: seed, daily: day || null });
    S.counterfactual = false;               // nothing here reads it and it doubles the work
    PRS.bots.setCoin(PRS.util.makeRng((seed ^ 0x9e3779b9) >>> 0));
    const bot = PRS.bots.BOTS[strategy];
    let turns = 0;
    while (!S.clock.landed && turns++ < 1200) {
        const list = PRS.actions.available(S, true);
        if (!list.length) break;
        const entry = bot(PRS, S, list);
        if (!entry) {
            PRS.actions.spend(S, Math.min(10, S.clock.remaining), null);
            if (S.clock.remaining <= 0.001 && !S.clock.landed) PRS.actions.land(S);
            continue;
        }
        PRS.actions.perform(S, entry);
    }
    if (!S.clock.landed) PRS.actions.land(S);
    return S;
}

/** Everybody's condition at touchdown, which is the thing a replay has to reproduce exactly. */
function manifest(S) {
    return S.pax.map((p) => p.outcome + ":" + p.harm + "@" + p.x + "," + p.y).join("|");
}

const fails = [];
let longest = 0, total = 0;

for (let i = 0; i < N; i++) {
    const strategy = rng.pick(bots);
    const char = rng.pick(chars);
    const seed = rng.int(0xffffffff) >>> 0;
    // One flight in four is a daily, because the date rides in the code and a date that came
    // back as null would send somebody to the wrong aeroplane with the right numbers on it.
    const day = rng.chance(0.25) ? PRS.daily.shift("2026-09-13", rng.irange(-400, 400)) : null;

    const S = fly(strategy, char, seed, day);
    const R = S.result;
    const text = PRS.share.text(S, R);
    const code = PRS.share.find(text);
    const what = strategy + " / " + char + " / " + seed + (day ? " / " + day : "");

    if (!code) { fails.push(what + ": would not encode"); continue; }
    total += code.length;
    longest = Math.max(longest, code.length);

    const got = PRS.share.decode(code);
    if (!got.ok) { fails.push(what + ": would not decode - " + got.why); continue; }
    const plan = got.plan;

    if (plan.seed !== S.seed) fails.push(what + ": seed came back as " + plan.seed);
    if (plan.characterId !== S.loadout.characterId) {
        fails.push(what + ": character came back as " + plan.characterId);
    }
    if ((plan.day || null) !== (S.daily || null)) {
        fails.push(what + ": the day came back as " + plan.day);
    }
    if (plan.items.join(",") !== S.loadout.items.slice().sort().join(",")) {
        // The bag comes back in the order the code writes it, which is the order of the ids.
        if (plan.items.slice().sort().join(",") !== S.loadout.items.slice().sort().join(",")) {
            fails.push(what + ": the bag came back as " + plan.items.join(","));
        }
    }
    if (plan.claim.survived !== R.survivors) {
        fails.push(what + ": the code claims " + plan.claim.survived + " and the flight was " +
                   R.survivors);
    }

    const back = PRS.share.replay(plan);
    if (back.broke) { fails.push(what + ": stopped replaying - " + back.broke); continue; }
    if (back.result.survivors !== R.survivors) {
        fails.push(what + ": flew " + R.survivors + ", replayed " + back.result.survivors);
        continue;
    }
    if (manifest(back.S) !== manifest(S)) {
        fails.push(what + ": the same number of survivors, and not the same people");
        continue;
    }
    if (VERBOSE) {
        console.log("  " + what.padEnd(42) + " " + String(S.actions.length).padStart(4) +
                    " actions  " + String(code.length).padStart(4) + " chars  " +
                    R.survivors + " of 60");
    }
}

// ------------------------------------------------------------------ the two honest refusals ---

const sample = fly("blend", "ansel", 606);
const good = PRS.share.find(PRS.share.text(sample, sample.result));

// A code that lost a character on the way through a chat client.
const bent = good.slice(0, good.length - 4) + (good.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
const bentGot = PRS.share.decode(bent);
if (bentGot.ok) fails.push("a damaged code was accepted");

// ------------------------------------------------------------------- and in another language ---
//
// A code is a list of positions in the list of everything you could do, so the order of that
// list is load-bearing. `actions.available` sorts it by deck, price and then the label - and a
// label is a translated sentence, so the same aeroplane in German is the same list in a
// different order. `share.slate` re-sorts by the action's id, which is written in no language,
// and this is the test of that: a whole second copy of the game, loaded in German, flying and
// writing out flights that this one then reads and flies.

const DE = F.loadGame().load("de");
if (DE.share.stamp() !== PRS.share.stamp()) {
    fails.push("the same build in German has a different stamp");
}
for (const strategy of ["blend", "sinkthen", "good", "aftline"]) {
    const seed = 777;
    const S = DE.state.create({ characterId: "volk", seed: seed });
    S.counterfactual = false;
    DE.bots.setCoin(DE.util.makeRng((seed ^ 0x9e3779b9) >>> 0));
    const bot = DE.bots.BOTS[strategy];
    let turns = 0;
    while (!S.clock.landed && turns++ < 1200) {
        const list = DE.actions.available(S, true);
        if (!list.length) break;
        const entry = bot(DE, S, list);
        if (!entry) {
            DE.actions.spend(S, Math.min(10, S.clock.remaining), null);
            if (S.clock.remaining <= 0.001 && !S.clock.landed) DE.actions.land(S);
            continue;
        }
        DE.actions.perform(S, entry);
    }
    if (!S.clock.landed) DE.actions.land(S);

    const got = PRS.share.decode(DE.share.encode(S, S.result));
    if (!got.ok) { fails.push("a flight flown in German would not decode: " + got.why); continue; }
    const back = PRS.share.replay(got.plan);
    if (!back.result || back.result.survivors !== S.result.survivors) {
        fails.push("a flight flown in German (" + strategy + ") landed " + S.result.survivors +
                   " and replayed in English as " +
                   (back.result ? back.result.survivors : "nothing"));
    }
}

// A message with a code somewhere in it, which is how one actually arrives.
const pasted = "look at this\n\n" + PRS.share.text(sample, sample.result) + "\n\nbeat that";
if (PRS.share.find(pasted) !== good) fails.push("a code pasted inside a message was not found");
if (!PRS.share.decode(pasted).ok) fails.push("a code pasted inside a message did not decode");

// And last, because it makes this process a different build of the game: one more action in the
// registry. It can never appear - `when` says no - so it changes no list anywhere, and it still
// has to invalidate every code written above, because the next action added will not be so
// polite. A code accepted here is somebody else's afternoon flown in the wrong cabin, silently.
const wasStamp = PRS.share.stamp();
PRS.actions.register([{
    id: "test.a_deck_that_grew", deck: "self", label: "never", cost: 1,
    when: () => false, run: () => null,
}]);
if (PRS.share.stamp() === wasStamp) fails.push("adding an action did not change the build stamp");
const stale = PRS.share.decode(good);
if (stale.ok) fails.push("a code from another build was accepted");
else if (!stale.stale) fails.push("a code from another build was refused as damage, not as age");
else if (!stale.plan || stale.plan.seed !== sample.seed) {
    fails.push("a code from another build did not give up its seed, which still works");
}

console.log("");
console.log(N + " flights written out and flown again from the code alone.");
if (total) {
    console.log("Codes: " + Math.round(total / Math.max(1, N - fails.length)) +
                " characters on average, " + longest + " at the longest.");
}
if (fails.length) {
    console.log("\n" + fails.length + " FAILED:");
    for (const f of fails.slice(0, 20)) console.log("  " + f);
    process.exit(1);
}
console.log("Every one replays to the same sixty people in the same condition.");
console.log("A flight flown in German replays in English.");
console.log("A damaged code is refused, and so is one from another build.");
