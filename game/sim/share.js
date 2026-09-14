// A flight, as a line of text somebody else can paste.
//
// A flight in this game is a seed, a loadout and the things you did, and nothing else: every die
// was cast at boarding, so that list replays to the same touchdown on any machine. The recorder
// already kept it as JSON. This is the same flight small enough to put in a message, which is
// the difference between a format for balancing the game and a format for arguing about it.
//
// What makes it small is that the actions are not in it. At any moment there is a list of
// everything you could do - two hundred and some, most of them walks - and the simulation is
// deterministic, so a replay can build that same list at that same moment. All the code has to
// carry is which one you picked, and a number under three hundred is nine bits. A fifteen-minute
// flight is about two hundred characters, which fits in a tweet with the score above it.
//
// The cost of that is honesty about versions: add an action to a deck and every list in every
// flight shifts underneath, and a code from yesterday would replay into somebody else's
// afternoon. So the code carries a stamp of every id the lists are built from, and a code with
// the wrong stamp is refused rather than flown. `PRS.share.decode` says which it is.
//
//   PRS.share.encode(S, result)   the flight you have just flown, as a code
//   PRS.share.text(S, result)     the whole thing somebody pastes into Discord
//   PRS.share.decode(text)        a code, or a message with one in it, back to a flight plan
//   PRS.share.replay(plan)        flown, in silence, to its touchdown
//   PRS.share.ghost(plan)         flown a bit at a time, alongside yours
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;

    // Two, because the header has an aeroplane in it now and a version-1 code read with this
    // layout would land somebody on the wrong aircraft without ever looking wrong.
    const VERSION = 2;
    // What a code looks like in a wall of chat. One per aeroplane, so a pasted code says which
    // aircraft it is before anything decodes it - and `find` will take any of them, which is
    // what keeps a code from a third aeroplane readable by a build that has one.
    const TAG = "TN447-";
    const EPOCH = "2000-01-01";    // dates are kept as days from here, in sixteen bits

    // The widths of everything in the header, in bits. They are wider than the game needs,
    // because a tenth character or a seventeenth thing to put in your bag must not be the
    // reason a code stops fitting.
    const W = {
        version: 4, stamp: 16, seed: 32, day: 16,
        // Four bits each: sixteen aeroplanes and fifteen scenarios plus "none", which is more
        // of either than this game is going to have and cheaper than being wrong about it.
        aircraft: 4, scenario: 4,
        character: 5, outfit: 4, bagN: 3, item: 5,
        survived: 6, saved: 7, grade: 3, count: 12, check: 16,
    };

    const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    // -------------------------------------------------------------------------------- bits ---

    function writer() {
        const bytes = [];
        let acc = 0, n = 0;
        return {
            bytes: bytes,
            write(value, bits) {
                for (let i = bits - 1; i >= 0; i--) {
                    acc = (acc << 1) | ((value >>> i) & 1);
                    if (++n === 8) { bytes.push(acc); acc = 0; n = 0; }
                }
            },
            /** Whatever is left over, padded with zeroes: a reader knows when to stop. */
            close() {
                if (n) bytes.push(acc << (8 - n));
                acc = 0; n = 0;
                return bytes;
            },
        };
    }

    function reader(bytes) {
        let at = 0, bit = 0;
        return {
            at() { return at * 8 + bit; },
            left() { return (bytes.length - at) * 8 - bit; },
            /** Past a header, without caring what was in it. */
            skip(bits) {
                while (bits > 0) { this.read(Math.min(24, bits)); bits -= Math.min(24, bits); }
                return this;
            },
            read(bits) {
                let v = 0;
                for (let i = 0; i < bits; i++) {
                    if (at >= bytes.length) throw new Error("the code stops in the middle");
                    v = (v << 1) | ((bytes[at] >>> (7 - bit)) & 1);
                    if (++bit === 8) { bit = 0; at++; }
                }
                return v >>> 0;
            },
        };
    }

    function toBase64(bytes) {
        let out = "", acc = 0, n = 0;
        for (const b of bytes) {
            acc = (acc << 8) | b;
            n += 8;
            while (n >= 6) { out += B64[(acc >>> (n - 6)) & 63]; n -= 6; }
        }
        if (n) out += B64[(acc << (6 - n)) & 63];
        return out;
    }

    function fromBase64(text) {
        const out = [];
        let acc = 0, n = 0;
        for (const ch of String(text)) {
            const v = B64.indexOf(ch);
            if (v < 0) throw new Error("that is not a flight code");
            acc = (acc << 6) | v;
            n += 6;
            if (n >= 8) { out.push((acc >>> (n - 8)) & 255); n -= 8; }
        }
        return out;
    }

    /** A short check over the body, so a code that lost its last line in a paste says so. */
    function sum(bytes) {
        let h = 0x811c;
        for (const b of bytes) {
            h ^= b;
            h = (h * 0x0101) & 0xffff;
        }
        return h & 0xffff;
    }

    // ------------------------------------------------------------------------------- shapes ---

    const idsOf = (list) => list.map((x) => x.id).sort();
    const characters = () => idsOf(PRS.data.characters.CHARACTERS);
    const outfits = () => idsOf(PRS.data.outfits.OUTFITS);
    const items = () => idsOf(PRS.data.items.ITEMS);

    /**
     * Everything a list of what-you-could-do is built out of, in sixteen bits. Two builds that
     * agree on this agree on every list in every flight; two that do not cannot read each
     * other's codes and must not pretend to.
     *
     * Worked out every time rather than kept, because it is a hundred and twenty short strings
     * and a hash, and because a cached answer is one a test cannot change - and the one thing
     * this needs is a test that adds an action and watches yesterday's codes be refused.
     */
    function stamp() {
        const parts = PRS.actions.all().map((d) => d.id).sort()
            .concat(characters(), outfits(), items(), aircraft(), scenarios());
        return PRS.util.seedFromString(parts.join("|")) & 0xffff;
    }

    /** Every aeroplane, in an order no language can change. Same contract as `characters`. */
    function aircraft() { return PRS.data.aircraft.ids(); }

    function scenarios() { return PRS.data.scenarios ? PRS.data.scenarios.ids() : []; }

    /**
     * Everything you could do at this moment, in an order no language can change.
     *
     * `actions.available` sorts by deck, price and then the label, and a label is a translated
     * sentence - so the same aeroplane in German is the same list in a different order, and a
     * code is a list of positions. This orders by the key instead, which is the action's id and
     * its target and is written in no language at all.
     */
    function slate(S) {
        const list = PRS.actions.available(S, true);
        list.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        return list;
    }

    /** How many bits one pick out of `n` things takes. One thing takes none. */
    function widthFor(n) {
        let bits = 0;
        while ((1 << bits) < n) bits++;
        return bits;
    }

    function freshState(plan) {
        const S = PRS.state.create({
            characterId: plan.characterId, outfitId: plan.outfitId,
            items: plan.items.slice(), seed: plan.seed, daily: plan.day,
            aircraft: plan.aircraft, scenario: plan.scenario,
        });
        // Not your flight: it writes nothing down, makes no noise, and does not need the
        // counterfactual the report prints, which is a second fifteen minutes of physics.
        S.quiet = true;
        S.counterfactual = false;
        return S;
    }

    // ------------------------------------------------------------------------------ writing ---

    /**
     * The flight you have just flown, as a code - or null if it will not encode, which means the
     * flight does not replay in the build it was flown in and the honest thing is to offer
     * nobody a code that lands somewhere else.
     */
    function encode(S, result) {
        const R = result || S.result;
        if (!R) return null;
        const keys = S.actions.map((a) => a.key);
        const picks = choicesFor(S.seed, S.loadout, keys, S.daily);
        if (!picks) return null;
        return write({
            seed: S.seed,
            day: S.daily || null,
            aircraft: S.loadout.aircraft,
            scenario: S.loadout.scenario,
            characterId: S.loadout.characterId,
            outfitId: S.loadout.outfitId,
            items: S.loadout.items,
            survived: R.survivors,
            saved: Math.max(0, R.saved || 0),
            grade: R.grade ? R.grade.key : "F",
            choices: picks,
        });
    }

    /**
     * The same flight again from its keys, noting which row of the list each one was. This is a
     * whole fifteen minutes of physics, which is why it is done once when a code is asked for
     * and not on every action as it happens.
     */
    function choicesFor(seed, loadout, keys, day) {
        const S = freshState({ seed: seed, characterId: loadout.characterId,
                               outfitId: loadout.outfitId, items: loadout.items, day: day,
                               aircraft: loadout.aircraft, scenario: loadout.scenario });
        const out = [];
        for (const key of keys) {
            if (S.clock.landed) break;
            const list = slate(S);
            const at = list.findIndex((e) => e.key === key);
            if (at < 0) return null;
            out.push({ at: at, of: list.length });
            PRS.actions.perform(S, list[at]);
        }
        return out;
    }

    function write(plan) {
        const w = writer();
        const C = characters(), O = outfits(), I = items();
        const grades = PRS.scoring.GRADES.map((g) => g.key);
        w.write(VERSION, W.version);
        w.write(stamp(), W.stamp);
        w.write(plan.seed >>> 0, W.seed);
        w.write(plan.day && PRS.daily ? PRS.daily.daysBetween(EPOCH, plan.day) : 0, W.day);
        const A = aircraft(), SC = scenarios();
        w.write(Math.max(0, A.indexOf(plan.aircraft || PRS.data.aircraft.DEFAULT)), W.aircraft);
        w.write(plan.scenario ? SC.indexOf(plan.scenario) + 1 : 0, W.scenario);
        w.write(Math.max(0, C.indexOf(plan.characterId)), W.character);
        w.write(plan.outfitId ? O.indexOf(plan.outfitId) + 1 : 0, W.outfit);
        const bag = (plan.items || []).filter((id) => I.indexOf(id) >= 0);
        w.write(bag.length, W.bagN);
        for (const id of bag) w.write(I.indexOf(id), W.item);
        w.write(Math.min(63, plan.survived), W.survived);
        w.write(Math.min(127, plan.saved), W.saved);
        w.write(Math.max(0, grades.indexOf(plan.grade)), W.grade);
        w.write(plan.choices.length, W.count);
        for (const pick of plan.choices) w.write(pick.at, widthFor(pick.of));
        const body = w.close();
        const tail = writer();
        tail.write(sum(body), W.check);
        return PRS.data.aircraft.byId(plan.aircraft).tag
             + toBase64(body.concat(tail.close()));
    }

    // ------------------------------------------------------------------------------ reading ---

    /** The first code in a paste, which may be a whole message with one somewhere in it. */
    /**
     * The first code in a paste, whichever aeroplane's badge it is wearing. Longest tag first,
     * so a badge that is a prefix of another one cannot swallow it.
     */
    function find(text) {
        const s = String(text || "");
        let best = null, at = Infinity;
        for (const tag of PRS.data.aircraft.tags()) {
            const hit = s.match(new RegExp(tag + "([A-Za-z0-9_-]+)"));
            if (hit && hit.index < at) { at = hit.index; best = hit[0]; }
        }
        return best;
    }

    /** Which badge a code is wearing, and therefore where its body starts. */
    function tagOf(code) {
        for (const tag of PRS.data.aircraft.tags()) {
            if (String(code).startsWith(tag)) return tag;
        }
        return TAG;
    }

    /**
     * A code back to a flight plan, or a reason it is not one. The reason is a sentence for the
     * player, because "no" is not an answer to somebody who has just been sent something.
     */
    function decode(text) {
        const code = find(text);
        if (!code) return { ok: false, why: T("That is not a flight code. One starts with " +
                                              "TN447- and has no spaces in it.") };
        let bytes;
        try { bytes = fromBase64(code.slice(tagOf(code).length)); }
        catch (e) { return { ok: false, why: T("That code has something in it that is not " +
                                               "part of one.") }; }
        // The check is the last two bytes; everything before it is what was checked.
        if (bytes.length < 4) return { ok: false, why: T("That code is too short to be a flight.") };
        const body = bytes.slice(0, bytes.length - 2);
        const said = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
        if (sum(body) !== said) {
            return { ok: false, why: T("That code did not survive the journey - a piece of it " +
                                       "is missing or has been changed.") };
        }
        let plan;
        try { plan = read(body); }
        catch (e) { return { ok: false, why: T("That code stops in the middle of a flight.") }; }
        if (plan.version !== VERSION) {
            return { ok: false, why: T("That code was written by a different version of the " +
                                       "game and does not mean the same thing here.") };
        }
        if (plan.stamp !== stamp()) {
            return { ok: false, why: T("That flight was flown on a different version of the " +
                                       "aeroplane. The seed is still good - the same fifteen " +
                                       "minutes are one number away - but the flight itself " +
                                       "cannot be replayed here."),
                     plan: plan, stale: true };
        }
        return { ok: true, plan: plan };
    }

    function read(body) {
        const r = reader(body);
        const C = characters(), O = outfits(), I = items();
        const grades = PRS.scoring.GRADES.map((g) => g.key);
        const plan = {};
        plan.version = r.read(W.version);
        plan.stamp = r.read(W.stamp);
        plan.seed = r.read(W.seed) >>> 0;
        const day = r.read(W.day);
        plan.day = day && PRS.daily ? PRS.daily.shift(EPOCH, day) : null;
        const A = aircraft(), SC = scenarios();
        plan.aircraft = A[r.read(W.aircraft)] || PRS.data.aircraft.DEFAULT;
        const scen = r.read(W.scenario);
        plan.scenario = scen ? (SC[scen - 1] || null) : null;
        plan.characterId = C[r.read(W.character)] || C[0];
        const outfit = r.read(W.outfit);
        plan.outfitId = outfit ? (O[outfit - 1] || null) : null;
        const bagN = r.read(W.bagN);
        plan.items = [];
        for (let i = 0; i < bagN; i++) {
            const id = I[r.read(W.item)];
            if (id) plan.items.push(id);
        }
        plan.claim = {
            survived: r.read(W.survived),
            saved: r.read(W.saved),
            grade: grades[r.read(W.grade)] || "F",
        };
        plan.count = r.read(W.count);
        // The picks are not read here. How wide one is depends on how many things there were to
        // pick from at that moment, and the only way to know that is to be standing where the
        // player was standing - so the bits are kept, with a note of where the header ended,
        // and read as the flight is flown.
        plan.bits = body;
        plan.header = r.at();
        return plan;
    }

    /**
     * Fly a decoded plan. The picks are read as the flight goes, because how wide a pick is
     * depends on how many things there were to pick from at that moment.
     *
     * Returns the state at touchdown, what it says about itself, and whether the two agree.
     */
    function replay(plan) {
        const S = freshState(plan);
        const g = stepper(plan, S);
        while (g.next()) { /* all of it */ }
        g.finish();
        return { S: S, result: S.result, broke: g.broke(),
                 agrees: !!S.result && S.result.survivors === plan.claim.survived };
    }

    /**
     * One flight, handed out an action at a time. The play screen uses this to keep somebody
     * else's cabin level with yours: their aeroplane is not a recording being scrubbed, it is
     * the same simulation running beside yours, so the smoke on their side is smoke.
     *
     * `run` is who does the performing, and is only ever passed by the frame renderer in tools/,
     * which takes each action's seconds twelve at a time so that it can draw a picture every ten
     * seconds of the flight rather than one per click.
     */
    function stepper(plan, S, run) {
        const r = reader(plan.bits).skip(plan.header);
        let taken = 0;
        let broke = null;

        function next() {
            if (broke || taken >= plan.count || S.clock.landed) return false;
            const list = slate(S);
            if (!list.length) { broke = T("there was nothing left to do"); return false; }
            let at;
            try { at = r.read(widthFor(list.length)); }
            catch (e) { broke = T("the code ran out"); return false; }
            taken++;
            const entry = list[at];
            if (!entry) { broke = T("action {n} is not on this aeroplane", { n: taken }); return false; }
            try { (run || PRS.actions.perform)(S, entry); }
            catch (e) { broke = T("action {n} did not work here", { n: taken }); return false; }
            return true;
        }

        /**
         * The rest of the flight, with nobody doing anything, and then the wheels.
         *
         * In the steps a person would take, and not in one long one, because the world is
         * advanced in sub-steps and a sub-step is not a free unit: nine hundred seconds spent at
         * once is seventy-five twelve-second steps of fire and smoke, and the same nine hundred
         * spent ten at a time is ninety shorter ones, and they do not arrive at the same cabin.
         * The report's "without you" flies its silent flight the same way for the same reason.
         *
         * A flight anybody actually played has nothing for this to do: the clock only moves when
         * you act, so it runs out inside an action and lands there. It is the bots, which are
         * allowed to do nothing at all, that get here.
         */
        function finish() {
            while (!S.clock.landed && S.clock.remaining > 0.001) {
                PRS.actions.spend(S, Math.min(10, S.clock.remaining), null);
            }
            if (!S.clock.landed) PRS.actions.land(S);
        }

        return { S: S, next: next, finish: finish, broke: () => broke,
                 taken: () => taken, done: () => broke || taken >= plan.count };
    }

    /**
     * Somebody else's flight, flown beside yours.
     *
     * It is advanced by the clock and not by the frame: `at(elapsed)` puts their cabin exactly
     * as far into the afternoon as yours is, performing whatever they did in the meantime and,
     * once they have run out of things they did, letting the fire have the rest of it - because
     * standing still is also a thing a person on this aeroplane does.
     */
    function ghost(plan) {
        const S = freshState(plan);
        const g = stepper(plan, S);
        const ch = PRS.data.characters.byId(plan.characterId);
        let landed = false;

        function at(elapsed) {
            if (landed) return S;
            // Their cabin is a flight and flights make a noise. This one is not the one being
            // flown, so it is flown with the sound held down rather than switched off, which
            // would take the engine roar of your own flight with it.
            PRS.audio.hush(true);
            try {
                let guard = 0;
                while (!S.clock.landed && S.clock.elapsed < elapsed && guard++ < 400) {
                    if (g.next()) continue;
                    // They have run out of things they did. The fire has not run out of things
                    // it does, so the rest of it happens to them where they are standing.
                    const dt = Math.min(elapsed - S.clock.elapsed, S.clock.remaining);
                    if (dt <= 0.001) break;
                    PRS.actions.spend(S, dt, null);
                }
                if (!S.clock.landed && S.clock.remaining <= 0.001) PRS.actions.land(S);
                if (S.clock.landed) landed = true;
            } finally { PRS.audio.hush(false); }
            return S;
        }

        return {
            S: S, plan: plan, character: ch, at: at,
            name: ch ? ch.name : "",
            claim: plan.claim,
            broke: g.broke,
            landed: () => landed,
            /** How many of the sixty are still on their feet over there, for the caption. */
            standing: () => S.pax.filter((p) => p.state !== "down" && p.state !== "dead").length,
            moved: () => PRS.state.movedCount(S),
            down: () => PRS.state.downCount(S),
        };
    }

    // ------------------------------------------------------------------- what it looks like ---

    // One block a minute, coloured by what most of that minute went on. It is the only part of
    // the share that says anything about how the flight was flown rather than how it ended, and
    // it is the part somebody reads first: four minutes of orange then eleven of green is a
    // sentence about a plan, and a wall of white is a sentence about an afternoon.
    const BLOCKS = { carry: "🟩", fire: "🟧", social: "🟦",
                     other: "⬜", never: "⬛" };

    function minutes(S) {
        // The strip is as long as the flight was scheduled to be, which is fifteen blocks on a
        // narrowbody and five on the five-minute cut. The clock's `total` is the scheduled
        // length less whatever an emergency descent took off it, so the length of the strip
        // comes off the aircraft and the scenario rather than off a constant.
        const scheduled = (S.scenario && S.scenario.seconds)
                       || (S.aircraft && S.aircraft.seconds) || PRS.state.FLIGHT_SECONDS;
        const total = Math.ceil(scheduled / 60);
        const spent = [];
        for (let i = 0; i < total; i++) spent.push({ carry: 0, fire: 0, social: 0, other: 0 });
        for (const a of S.actions) {
            const def = PRS.actions.byId(a.id);
            const tags = (def && def.tags) || [];
            const kind = tags.indexOf("carry") >= 0 ? "carry"
                       : tags.indexOf("social") >= 0 ? "social"
                       : tags.indexOf("fire") >= 0 ? "fire" : "other";
            // An action's seconds are paid at its start and go by across whatever minutes they
            // reach, which is why a ninety-second carry colours two of these and not one.
            let from = a.t, left = Math.max(1, a.cost);
            while (left > 0 && from < scheduled) {
                const m = Math.floor(from / 60);
                const take = Math.min(left, (m + 1) * 60 - from);
                if (spent[m]) spent[m][kind] += take;
                from += take;
                left -= take;
            }
        }
        const flown = Math.ceil(Math.max(0, S.clock.elapsed) / 60);
        return spent.map(function (m, i) {
            if (i >= flown) return BLOCKS.never;
            let best = "other", most = 12;   // a minute with nothing much in it is a white one
            for (const kind of ["carry", "fire", "social"]) {
                if (m[kind] > most) { most = m[kind]; best = kind; }
            }
            return BLOCKS[best];
        }).join("");
    }

    /**
     * The whole thing, ready to paste: what aeroplane it was, how it went, what the fifteen
     * minutes were spent on, and the flight itself. Four lines, because the fourth is the one
     * that makes the other three worth sending - without it this is a boast, and with it it is
     * an invitation.
     */
    function block(o) {
        // Which flight, rather than the flight: the same four lines are sent from more than one
        // aeroplane now, and "TN 447" on a nineteen-seat turboprop would be the only untrue
        // thing in a block whose whole job is being checkable.
        const head = o.day
            ? T("PLEASE REMAIN SEATED · {flight} · daily {day}",
                { flight: o.flight, day: o.day })
            : T("PLEASE REMAIN SEATED · {flight} · seed {seed}",
                { flight: o.flight, seed: o.seed });
        const score = o.saved === null || o.saved === undefined
            ? T("{n} of {of} off alive · {grade} · {who}",
                { n: o.survived, of: o.of, grade: o.grade, who: o.who })
            : T("{n} of {of} off alive · {saved} who would not have been · {grade} · {who}",
                { n: o.survived, of: o.of, saved: o.saved, grade: o.grade, who: o.who });
        return [head, score, o.strip,
                o.code || T("(this flight will not encode)")].join("\n");
    }

    /** The flight in front of you. */
    function text(S, result) {
        const R = result || S.result;
        return block({
            day: S.daily, seed: S.seed, survived: R.survivors, saved: R.saved,
            flight: S.aircraft.flightNo, of: R.souls,
            grade: R.grade.key, who: S.character.name,
            strip: minutes(S), code: encode(S, R),
        });
    }

    /**
     * A flight that is only a code - one kept in the book of days, or one somebody sent. It has
     * to be flown to know what the fifteen minutes were spent on, which is a whole simulation
     * for four lines of text, and is why this is asked for by a button and not drawn on a list.
     */
    function textForCode(code) {
        const got = decode(code);
        if (!got.ok) return null;
        // Flying somebody else's code loads their aeroplane, and this is called from a screen
        // that is standing on yours. Put it back before returning, whatever happens.
        const was = PRS.cabin.aircraft.id;
        try { return codeText(got.plan, code); }
        finally { PRS.cabin.use(was); }
    }

    function codeText(plan, code) {
        const flown = replay(plan);
        const ch = PRS.data.characters.byId(plan.characterId);
        return block({
            day: plan.day, seed: plan.seed,
            survived: plan.claim.survived, saved: plan.claim.saved, grade: plan.claim.grade,
            flight: PRS.data.aircraft.byId(plan.aircraft).flightNo,
            of: flown.S.pax.length + 1,
            who: ch ? ch.name : "", strip: minutes(flown.S), code: find(code),
        });
    }

    PRS.share = { VERSION, TAG, tagOf, tags: () => PRS.data.aircraft.tags(),
                  stamp, encode, decode, find,
                  replay, stepper, ghost, text, textForCode };
})(window);
