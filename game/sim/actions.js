// The action engine. Every deck registers into here and this is the only place time passes.
//
// An action is data:
//
//   { id, deck, label, detail, cost, when, run, tags, danger, once, targets }
//
// `when(S, ctx)` decides whether it appears, `cost(S, ctx)` is in seconds, and `run(S, ctx)`
// returns the line the log prints. `targets(S)` is what makes the number large: an action with
// targets appears once per target, so one definition of "carry them forward" is sixty-one
// actions in practice and the player never sees an option that is not real.
//
// `spend()` at the bottom is the whole game. Nothing else in the codebase moves the clock.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const { clamp, clamp01 } = PRS.util;

    const REGISTRY = [];
    const BY_ID = {};

    const DECKS = {
        move:      { name: "Move",        order: 0, hint: "Where you are is most of what you can do." },
        fire:      { name: "The fire",    order: 1, hint: "None of this puts it out." },
        people:    { name: "People",      order: 2, hint: "The only thing that scales." },
        crew:      { name: "Crew",        order: 3, hint: "They have the equipment and the procedure." },
        cabin:     { name: "The cabin",   order: 4, hint: "Bins, masks, doors, the trolley, the lav." },
        self:      { name: "Yourself",    order: 5, hint: "You are also a person on this aeroplane." },
        items:     { name: "Your bag",    order: 6, hint: "Eight kilos of decisions made on the ground." },
        desperate: { name: "Desperate",   order: 7, hint: "It is a long fifteen minutes." },
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
        if (st.hasPerk(S, "fast_hands") && tags.indexOf("carry") < 0) c *= 0.75;
        if (st.hasPerk(S, "flock") && tags.indexOf("social") >= 0) c *= 0.7;
        if (S.character.id === "ubel" && tags.indexOf("social") >= 0) c += 8;
        if (st.hasPerk(S, "adrenaline") && S.player.panic >= 80) c *= 0.5;
        if (st.hasPerk(S, "adrenaline") && S.player.panic < 60) c *= 1.25;
        if (st.hasPerk(S, "denial") && tags.indexOf("fire") >= 0 && !S.player.lookedAtFire) c *= 2;

        // Being in smoke slows everything, and being frightened slows the fiddly things.
        const smoke = S.fire.smoke[cabin.idx(S.player.x, S.player.y)];
        if (!st.wearing(S, "hood")) c *= 1 + clamp01(smoke / 100) * 0.42;
        if (S.player.panic > 70 && tags.indexOf("fiddly") >= 0) c *= 1.3;
        if (S.player.burns > 30 && tags.indexOf("hands") >= 0) c *= 1.35;
        if (S.player.carrying.length) c *= 1 + 0.28 * S.player.carrying.length;

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

    function make(S, def, ctx) {
        return {
            key: def.id + (ctx && ctx.key ? "#" + ctx.key : ""),
            id: def.id,
            def: def,
            ctx: ctx,
            deck: def.deck,
            label: resolve(def.label, S, ctx),
            detail: resolve(def.detail, S, ctx),
            cost: costOf(S, def, ctx),
            danger: resolve(def.danger, S, ctx),
            tags: def.tags,
        };
    }

    /** Everything you could do, right now, from where you are standing. */
    function available(S) {
        if (S.clock.landed) return [];
        const out = [];
        for (const def of REGISTRY) {
            if (def.once && S.counts[def.id]) continue;
            const entries = entriesFor(def, S);
            for (const e of entries) out.push(e);
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

    /** Run an action and pay for it. The only entry point the UI has. */
    function perform(S, entry) {
        if (S.clock.landed) return null;
        const def = entry.def;
        let cost = entry.cost;
        let text = null, kind = def.danger === "bad" ? "bad" : def.danger === "good" ? "good" : "plain";

        let result = null;
        try {
            result = def.run ? def.run(S, entry.ctx) : null;
        } catch (err) {
            console.error("action failed", def.id, err);
            result = "Something in the cabin does not work the way you expected.";
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
        S.actions.push({ id: def.id, t: S.clock.elapsed, cost: cost, label: entry.label });

        if (text) st.log(S, text, kind);
        if (cost > 0) spend(S, cost, def);
        PRS.medals.check(S);
        return { text: text, cost: cost, kind: kind };
    }

    // -------------------------------------------------------------------------------- time ---

    /**
     * Move the world on. Nothing else in this codebase may call fire.advance, pax.advance or
     * crew.advance, so there is exactly one place where a second of this flight goes by.
     */
    function spend(S, seconds, def) {
        if (S.clock.landed || seconds <= 0) return;
        const dt = Math.min(seconds, Math.max(0, S.clock.remaining));
        const overshoot = seconds - dt;

        S.clock.remaining -= dt;
        S.clock.elapsed += dt;

        // Bookkeeping for the report, which is going to be read out at an inquiry.
        if (def) {
            const tags = def.tags || [];
            if (tags.indexOf("carry") >= 0) S.stats.timeCarrying += dt;
            else if (tags.indexOf("social") >= 0) S.stats.timeArguing += dt;
            else if (tags.indexOf("fire") >= 0) S.stats.timeFighting += dt;
            else if (tags.indexOf("waste") >= 0) S.stats.timeWasted += dt;
        }

        // Sub-stepping, so a ninety-second action does not let the fire teleport. Twelve seconds
        // is small enough that spread and smoke behave, and large enough to stay cheap.
        let left = dt;
        while (left > 0.001) {
            const step = Math.min(12, left);
            PRS.fire.advance(S.fire, step, S);
            PRS.pax.advance(S, step);
            PRS.crew.advance(S, step);
            playerTick(S, step);
            PRS.events.tick(S, step);
            left -= step;
            if (S.player.alive === false) break;
        }

        PRS.audio.setRoar(clamp01(PRS.fire.worst(S.fire) / 90));

        if (S.clock.remaining <= 0.001 && !S.clock.landed) {
            S.clock.remaining = 0;
            land(S);
        }
        if (overshoot > 0 && !S.clock.landed) {
            // Only possible if something raised the clock mid-action; harmless, but honest.
            spend(S, overshoot, def);
        }
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
        else if (st.wearing(S, "wet_towel") || st.wearing(S, "wipes")) intake *= 0.45;
        else if (st.wearing(S, "pillow")) intake *= 0.62;
        if (st.hasPerk(S, "under_the_smoke")) intake *= 0.55;
        if (p.crouching) intake *= 0.7;
        p.smokeDose += intake;

        if (inten > 16) {
            const shield = st.wearing(S, "gloves") ? 0.6 : 1;
            p.burns += (inten - 16) * dt * 0.0014 * shield;
        }

        let fear = smoke * 0.035 + (inten > 8 ? 0.9 : 0) + S.cabinPanic * 0.012;
        fear *= d.panicMul;
        if (st.wearing(S, "goggles")) fear *= 0.7;
        if (st.wearing(S, "headphones")) fear *= 0.6;
        if (st.wearing(S, "earplugs")) fear *= 0.75;
        if (st.slotOf(S, "rosary") && S.flags.prayed) fear *= 0.8;
        if (st.hasPerk(S, "calm_presence")) fear *= 0.5;
        p.panic = clamp(p.panic + fear * dt * 0.11 - dt * 0.035, 0, 100);

        // Kip has to keep filming or he comes apart.
        if (st.hasPerk(S, "filming")) {
            const since = S.clock.elapsed - p.filmedAt;
            if (since > 90) p.panic = clamp(p.panic + dt * 0.20, 0, 100);
        }

        p.stamina = clamp(p.stamina - dt * (p.carrying.length ? 0.34 : 0.06) + dt * 0.05, 0, 100);

        if (p.smokeDose > 92 && p.alive) {
            p.alive = false;
            p.downedAt = S.clock.elapsed;
            st.log(S, "You go down in the aisle. You do not get up.", "bad");
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
            if (st.hasPerk(S, "small")) c *= 0.5;      // she goes under, not over
        }
        // The aisle, blocked by people who have stood up, or by the trolley.
        if (y === cabin.AISLE_Y) {
            const block = S.cabinFlags.aisleBlocked[x];
            if (block >= 9999) return Infinity;         // the trolley. You do not get past it.
            if (block > 0 && !st.hasPerk(S, "small")) c += 6 + Math.min(20, block * 0.35);
            const bodies = st.paxAt(S, x, y).length;
            if (bodies) c += bodies * (st.hasPerk(S, "small") ? 1 : 4);
        }
        const smoke = S.fire.smoke[cabin.idx(x, y)];
        if (smoke > 25 && !st.wearing(S, "goggles") && !st.wearing(S, "hood")) {
            c *= 1 + clamp01((smoke - 25) / 90) * 0.6;
        }
        if (S.fire.intensity[cabin.idx(x, y)] > 30 && !st.wearing(S, "gloves")) c *= 1.5;
        for (const id of S.player.carrying) {
            const p = st.paxById(S, id);
            if (p) c *= 1 + clamp01(p.kg / 120) * (st.hasPerk(S, "brute") ? 0.35 : 0.95) * d.carryMul;
        }
        if (S.player.dragging) c *= 1.7;
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
        st.log(S, "The gear comes down. The cabin lights come up. Whatever is happening now is " +
                  "what is going to have happened.", "pa");
        PRS.scoring.settle(S);
    }

    PRS.actions = {
        DECKS, register, count, all, byId, deckCounts, costOf, available, availableByDeck,
        perform, spend, stepCost, moveTo, land, resolve,
    };
})(window);
