// The action engine. Every deck registers into here and this is the only place time passes.
//
// An action is data:
//
//   { id, deck, label, detail, cost, when, run, tags, danger, once, targets, item }
//
// `once: true` is once a flight; `once: "target"` is once per person, seat or crew member the
// definition can point at.
//
// `when(S, ctx)` decides whether it appears, `cost(S, ctx)` is in seconds, and `run(S, ctx)`
// returns the line the log prints. `targets(S)` is what makes the number large: an action with
// targets appears once per target, so one definition of "carry them forward" is sixty-one
// actions in practice and the player never sees an option that is not real. `item` names the
// thing in your bag the action uses (an id, or a function of the state), which is how clicking
// the bottle finds everything the bottle can do.
//
// `passage()` at the bottom is the whole game: the twelve-second sub-steps an action's seconds
// are made of, handed out one at a time. `spend()` takes them all at once, which is what the bots
// and the replays do, and the play screen takes them frame by frame so the cabin can be watched
// while they go by. Nothing else in the codebase moves the clock.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const T = PRS.t, K = PRS.k;
    const { clamp, clamp01 } = PRS.util;

    const REGISTRY = [];
    const BY_ID = {};

    const DECKS = {
        move:      { name: K("Move"),      order: 0,
                     hint: K("Click the cabin to walk there. Arrows or WASD to step.") },
        fire:      { name: K("The fire"),  order: 1, hint: K("None of this puts it out.") },
        people:    { name: K("People"),    order: 2, hint: K("The only thing that scales.") },
        crew:      { name: K("Crew"),      order: 3,
                     hint: K("They have the equipment and the procedure.") },
        cabin:     { name: K("The cabin"), order: 4,
                     hint: K("Bins, masks, doors, the trolley, the lav.") },
        self:      { name: K("Yourself"),  order: 5,
                     hint: K("You are also a person on this aeroplane.") },
        items:     { name: K("Your bag"),  order: 6,
                     hint: K("Three things and whatever you have found.") },
    };

    function register(list) {
        for (const def of [].concat(list)) {
            if (BY_ID[def.id]) {
                console.warn("duplicate action id", def.id);
                continue;
            }
            def.deck = def.deck || "desperate";
            def.tags = def.tags || [];
            def.danger = def.danger || "neutral";
            BY_ID[def.id] = def;
            REGISTRY.push(def);
        }
    }

    function count() { return REGISTRY.length; }
    function all() { return REGISTRY.slice(); }
    function byId(id) { return BY_ID[id]; }

    function deckCounts() {
        const out = {};
        for (const def of REGISTRY) out[def.deck] = (out[def.deck] || 0) + 1;
        return out;
    }

    // ------------------------------------------------------------------------------- costing ---

    function resolve(value, S, ctx) {
        return typeof value === "function" ? value(S, ctx) : value;
    }

    /** The cost of an action after everything about you that changes it. */
    function costOf(S, def, ctx) {
        let c = resolve(def.cost, S, ctx);
        if (c === undefined || c === null) c = 5;
        const d = S.derived;
        const tags = def.tags;

        if (tags.indexOf("carry") < 0 && tags.indexOf("move") < 0) c *= d.actionMul;
        if (tags.indexOf("social") >= 0) c *= (2.0 - d.voiceMul) * 0.72 + 0.5;

        // Being in smoke slows everything, and being frightened slows the fiddly things.
        const smoke = S.fire.smoke[cabin.idx(S.player.x, S.player.y)];
        if (!st.wearing(S, "hood")) c *= 1 + clamp01(smoke / 100) * 0.42;
        if (S.player.panic > 70 && tags.indexOf("fiddly") >= 0) c *= 1.3;
        if (S.player.burns > 30 && tags.indexOf("hands") >= 0) c *= 1.35;
        if (S.player.carrying.length) c *= 1 + 0.28 * S.player.carrying.length;
        // Somebody you have soaked has hold of your arm. Everything you do to the fire with them
        // there is done around them, until somebody calms them down.
        if (tags.indexOf("fire") >= 0 && PRS.pax.obstructor(S)) c *= 1.6;

        return Math.max(1, Math.round(c));
    }

    // ------------------------------------------------------------------------ what is on offer ---

    function entriesFor(def, S) {
        const out = [];
        if (def.targets) {
            let list;
            try { list = def.targets(S) || []; } catch (e) { list = []; }
            for (const ctx of list) {
                try { if (def.when && !def.when(S, ctx)) continue; } catch (e) { continue; }
                out.push(make(S, def, ctx));
            }
        } else {
            try { if (def.when && !def.when(S, null)) return out; } catch (e) { return out; }
            out.push(make(S, def, null));
        }
        return out;
    }

    /**
     * One row of a card, made now.
     *
     * This is where an action's words are put into the language being played in, and which of
     * the two ways depends on how the deck wrote them. A plain string is the English the deck
     * was written in, marked with K(), and it is translated here. A function is evaluated now,
     * with the state in front of it, and has already called T() on its own pieces - so it is
     * left alone, because translating a translated sentence is a lookup that can only miss.
     */
    function make(S, def, ctx) {
        return {
            key: def.id + (ctx && ctx.key ? "#" + ctx.key : ""),
            id: def.id,
            def: def,
            ctx: ctx,
            deck: def.deck,
            label: typeof def.label === "function" ? def.label(S, ctx) : T(def.label),
            detail: typeof def.detail === "function" ? def.detail(S, ctx) : T(def.detail),
            cost: costOf(S, def, ctx),
            danger: resolve(def.danger, S, ctx),
            tags: def.tags,
            // The thing in your bag this uses, if any, so the bag can find it.
            item: resolve(def.item, S, ctx) || null,
        };
    }

    /**
     * Everything you could do, right now, from where you are standing.
     *
     * `includeHidden` is for the play-testers. A hidden action is real and reachable and costs
     * what it says; it is simply not in the list, because the player reaches it another way. The
     * only ones are the walks, which are on the map where the aeroplane is.
     */
    function available(S, includeHidden) {
        if (S.clock.landed) return [];
        const out = [];
        for (const def of REGISTRY) {
            if (def.hidden && !includeHidden) continue;
            if (def.once === true && S.counts[def.id]) continue;
            const entries = entriesFor(def, S);
            for (const e of entries) {
                // `once: "target"` is once per person rather than once per flight: showing one
                // passenger the photograph is a thing that works, and showing them it a second
                // time is not a thing that works twice.
                if (def.once === "target" && S.doneTo[e.key]) continue;
                out.push(e);
            }
        }
        out.sort(function (a, b) {
            const da = DECKS[a.deck].order, db = DECKS[b.deck].order;
            if (da !== db) return da - db;
            if (a.cost !== b.cost) return a.cost - b.cost;
            return a.label < b.label ? -1 : 1;
        });
        return out;
    }

    function availableByDeck(S) {
        const groups = {};
        for (const e of available(S)) (groups[e.deck] = groups[e.deck] || []).push(e);
        return groups;
    }

    // -------------------------------------------------------------------------------- doing ---

    /**
     * Run an action and pay for it. The only entry point the UI has.
     *
     * The seconds are all gone by the time this returns, unless `opts.paced` is set: then the
     * result carries the `passage` still to be played, and whoever asked for it steps through it.
     */
    function perform(S, entry, opts) {
        if (S.clock.landed) return null;
        const def = entry.def;
        // Everything the world is, before anything happens, including which dice have been used.
        PRS.undo.push(S, entry);
        let cost = entry.cost;
        let text = null, kind = def.danger === "bad" ? "bad" : def.danger === "good" ? "good" : "plain";

        let result = null;
        try {
            result = def.run ? def.run(S, entry.ctx) : null;
        } catch (err) {
            console.error("action failed", def.id, err);
            result = T("Something in the cabin does not work the way you expected.");
        }
        if (result && typeof result === "object") {
            text = result.text;
            if (result.kind) kind = result.kind;
            if (typeof result.cost === "number") cost = Math.max(1, Math.round(result.cost));
            if (result.free) cost = 0;
        } else if (typeof result === "string") {
            text = result;
        }

        S.counts[def.id] = (S.counts[def.id] || 0) + 1;
        if (def.once === "target") S.doneTo[entry.key] = 1;
        // The key is what the recorder keeps: the definition and the target, which is enough to
        // find the same entry again on a replay of the same seed.
        S.actions.push({ id: def.id, key: entry.key, t: S.clock.elapsed, cost: cost,
                         label: entry.label });

        if (text) st.log(S, text, kind);
        const done = { text: text, cost: cost, kind: kind, passage: null };
        // Medals are looked at once the seconds have gone by, whenever that turns out to be.
        const check = () => PRS.medals.check(S);
        if (cost <= 0) {
            check();
            return done;
        }
        const time = passage(S, cost, def, check);
        if (opts && opts.paced) done.passage = time;
        else while (time.step()) { /* all of it, now */ }
        return done;
    }

    // -------------------------------------------------------------------------------- time ---

    /**
     * Move the world on. Nothing else in this codebase may call fire.advance, pax.advance or
     * crew.advance, so there is exactly one place where a second of this flight goes by.
     *
     * It goes by in sub-steps, so a ninety-second action does not let the fire teleport, and a
     * passage hands them out one at a time: `step()` moves the world on by one of them and says
     * whether it did. spend() takes them all at once, which is what the bots, the replays and the
     * report's "without you" do; the play screen takes them as the frames go by, which is the
     * same world arriving at the same place slowly enough to watch it get there.
     *
     * The clock is paid up front, as it always was, so everything that happens during an action
     * happens at the time the action ends. `owed()` is what has been paid and not yet played.
     */
    function passage(S, seconds, def, then) {
        const p = { seconds: seconds, done: 0, finished: false, step: step, owed: owed };
        let next = { seconds: seconds, def: def };     // the spend waiting to start
        let now = null;                              // the one playing: { def, left, overshoot }

        function owed() { return now ? now.left : 0; }

        /** Pay for a spend, or say there is nothing to pay for. */
        function begin(n) {
            if (!n || S.clock.landed || n.seconds <= 0) return null;
            const dt = Math.min(n.seconds, Math.max(0, S.clock.remaining));
            S.clock.remaining -= dt;
            S.clock.elapsed += dt;

            // Bookkeeping for the report, which is going to be read out at an inquiry.
            if (n.def) {
                const tags = n.def.tags || [];
                if (tags.indexOf("carry") >= 0) S.stats.timeCarrying += dt;
                else if (tags.indexOf("social") >= 0) S.stats.timeArguing += dt;
                else if (tags.indexOf("fire") >= 0) S.stats.timeFighting += dt;
                else if (tags.indexOf("waste") >= 0) S.stats.timeWasted += dt;
            }
            return { def: n.def, left: dt, overshoot: n.seconds - dt };
        }

        /** A spend has run out of sub-steps: what that means, and the spend after it, if any. */
        function close() {
            const s = now;
            now = null;
            next = null;
            PRS.audio.setRoar(clamp01(PRS.fire.worst(S.fire) / 90));

            if (S.player.alive === false && !S.clock.landed && S.clock.remaining > 0.001) {
                // You went down. Nobody on this aeroplane is going to do anything on your behalf,
                // so the rest of the flight happens without you in it, and then it lands.
                next = { seconds: S.clock.remaining, def: null };
            } else {
                if (S.clock.remaining <= 0.001 && !S.clock.landed) {
                    S.clock.remaining = 0;
                    land(S);
                }
                if (s.overshoot > 0 && !S.clock.landed) {
                    // Only possible if something raised the clock mid-action; harmless, but honest.
                    next = { seconds: s.overshoot, def: s.def };
                }
            }
            if (!next) finish();
        }

        function finish() {
            p.finished = true;
            if (then) then();
        }

        /** One sub-step of the world, and true; or false, once there is nothing left to play. */
        function step() {
            while (!p.finished) {
                if (!now) {
                    now = begin(next);
                    next = null;
                    if (!now) { finish(); break; }
                }
                if (now.left <= 0.001) { close(); continue; }

                // Twelve seconds is small enough that spread and smoke behave, and large enough
                // to stay cheap.
                const dt = Math.min(12, now.left);
                tick(S, dt);
                now.left -= dt;
                p.done += dt;
                // The flight deck can take ninety seconds off the descent in the middle of a long
                // action. The clock was paid in full up front, so what is really left is the clock
                // plus what this action has not spent yet; when that runs out, the wheels are down.
                if (S.clock.remaining + now.left <= 0.001) {
                    S.clock.elapsed -= now.left;
                    now.left = 0;
                }
                if (now.left <= 0.001) close();
                return true;
            }
            return false;
        }

        return p;
    }

    /** A sub-step: everything on the aeroplane that is not you deciding something. */
    function tick(S, dt) {
        PRS.fire.advance(S.fire, dt, S);
        PRS.pax.advance(S, dt);
        PRS.crew.advance(S, dt);
        playerTick(S, dt);
        PRS.events.tick(S, dt);
    }

    /** A whole passage, at once. */
    function spend(S, seconds, def) {
        const time = passage(S, seconds, def);
        while (time.step()) { /* all of it, now */ }
    }

    /** What the fire is doing to you while you do all this. */
    function playerTick(S, dt) {
        const p = S.player;
        const i = cabin.idx(p.x, p.y);
        const smoke = S.fire.smoke[i];
        const inten = S.fire.intensity[i];
        const d = S.derived;

        let intake = smoke * dt * 0.0034 * d.smokeMul;
        if (st.wearing(S, "hood")) intake *= 0.05;
        else if (st.wearing(S, "wet_towel") || st.wearing(S, "blanket")) intake *= 0.45;
        if (p.crouching) intake *= 0.6;
        p.smokeDose += intake;

        if (inten > 16) {
            const shield = st.wearing(S, "gloves") ? 0.6 : 1;
            p.burns += (inten - 16) * dt * 0.0014 * shield;
        }

        let fear = (smoke * 0.035 + (inten > 8 ? 0.9 : 0) + S.cabinPanic * 0.012) * 0.7;
        if (st.wearing(S, "goggles")) fear *= 0.7;   // you can see, which is most of it
        p.panic = clamp(p.panic + fear * dt * 0.11 - dt * 0.035, 0, 100);

        // Smoke puts you on the floor, and so, a little more slowly, do your hands.
        if (p.smokeDose + p.burns * 0.35 > 92 && p.alive) {
            p.alive = false;
            p.downedAt = S.clock.elapsed;
            st.log(S, T("You go down in the aisle. You do not get up."), "bad");
            PRS.audio.play("bad");
        }
    }

    // ------------------------------------------------------------------------------ movement ---

    /** Seconds to step from where you are to an adjacent tile, all in. */
    function stepCost(S, x, y) {
        let c = cabin.baseWalk(x, y);
        if (!isFinite(c)) return Infinity;
        const d = S.derived;
        c *= d.moveMul;

        // Climbing over a row of seats is what it sounds like.
        if (cabin.kindAt(x, y) === "seat") {
            const occupied = st.paxAt(S, x, y).length > 0;
            if (occupied) c *= 1.6;
        }
        // The aisle, blocked by people who have stood up, or by the trolley.
        if (y === cabin.AISLE_Y) {
            const block = S.cabinFlags.aisleBlocked[x];
            if (block >= 9999) return Infinity;         // the trolley. You do not get past it.
            if (block > 0) c += 6 + Math.min(20, block * 0.35);
            const bodies = st.paxAt(S, x, y).length;
            if (bodies) c += bodies * 4;
        }
        // On your hands and knees the air is better and everything else is slower.
        if (S.player.crouching) c *= 1.5;
        const smoke = S.fire.smoke[cabin.idx(x, y)];
        if (smoke > 25 && !st.wearing(S, "goggles") && !st.wearing(S, "hood")) {
            c *= 1 + clamp01((smoke - 25) / 90) * 0.6;
        }
        if (S.fire.intensity[cabin.idx(x, y)] > 30 && !st.wearing(S, "gloves")) c *= 1.5;
        for (const id of S.player.carrying) {
            const p = st.paxById(S, id);
            if (p) c *= 1 + clamp01(p.kg / 120) * 0.95 * d.carryMul;
        }
        // Dragging is slow. A strap under the arms is a handle, and a handle is half again as fast.
        if (S.player.dragging) c *= st.slotOf(S, "strap") ? 1.3 : 1.7;
        return c;
    }

    function moveTo(S, x, y) {
        S.player.x = x;
        S.player.y = y;
        S.stats.stepsTaken++;
        for (const id of S.player.carrying) {
            const p = st.paxById(S, id);
            if (p) { p.x = x; p.y = y; }
        }
        if (S.player.dragging) {
            const p = st.paxById(S, S.player.dragging);
            if (p) { p.x = x; p.y = y; }
        }
        st.reindex(S);
    }

    // ------------------------------------------------------------------------------- landing ---

    function land(S) {
        if (S.clock.landed) return;
        S.clock.landed = true;
        PRS.audio.play("landing");
        st.log(S, "—", "rule");
        st.log(S, T("The gear comes down. The cabin lights come up. Whatever is happening now " +
                    "is what is going to have happened."), "pa");
        PRS.scoring.settle(S);
    }

    PRS.actions = {
        DECKS, register, count, all, byId, deckCounts, costOf, available, availableByDeck,
        perform, passage, spend, stepCost, moveTo, land, resolve,
        // Ask one definition whether it is possible right now, without evaluating the other
        // three hundred. tools/coverage.js walks the whole registry with this.
        entriesFor,
    };
})(window);
