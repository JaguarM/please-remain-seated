// Changing your mind.
//
// A new player walks to the wrong end of the aeroplane, loses forty seconds, and has no way to
// say "no, not that". That is the frustration this file exists to remove, and it removes it by
// putting the world back exactly as it was.
//
// The thing it must not become is a way to reroll. Persuasion is the centre of this game and
// almost every social action is a roll against a passenger's resistance; if undo let you retry
// a refusal, the whole social layer would collapse into "click until it works".
//
// It cannot, because there is nothing left to roll: every die in the flight was cast at boarding
// from the seed (state.js, `dice`), and the snapshot carries the counters that say which have
// been used. Rewind, repeat the same action, and you get the same result, down to the sentence
// the passenger says. Do something else first and you still get the same result, because the
// dice are not a queue that other actions push along. You can change your mind. You cannot
// change the dice.
//
// Two things still cannot be undone:
//   * anything tagged `reveal`, because you cannot un-see what was in the bin, and rewinding the
//     clock after looking would make scouting free;
//   * anything after the aeroplane has landed.
//
// Undo takes back one action at a time. Walks leave a trail - the tiles you stood on before each
// walk since you last did anything else - and walking back onto one of those is every walk since
// then undone at once, which is what "go back" means to somebody who has just wandered.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;

    const LIMIT = 80;              // how many turns back the stack goes; nobody needs eighty
    const TRAIL = 12;              // how many walks back the trail goes
    const WALK = "move.walk";
    const SHARED = { item: true }; // keys that point at read-only data and must stay shared

    /**
     * A copy of one live object: arrays sliced, plain objects copied one level, everything else
     * taken by value. Deliberately generic, because passengers and the player grow ad-hoc
     * properties all over the action decks and a snapshot that only knew about the declared ones
     * would go quietly wrong the first time somebody added another.
     */
    function copy(o) {
        const out = {};
        for (const key in o) {
            const v = o[key];
            if (SHARED[key] || v === null || typeof v !== "object") out[key] = v;
            else if (Array.isArray(v)) out[key] = v.slice();
            else if (ArrayBuffer.isView(v)) out[key] = v.slice();
            else out[key] = copy(v);
        }
        return out;
    }

    function snapshot(S) {
        return {
            clock: copy(S.clock),
            player: copy(S.player),
            inventory: S.inventory.map(copy),
            fire: copy(S.fire),
            pax: S.pax.map(copy),
            crew: S.crew.map(copy),
            cabinFlags: copy(S.cabinFlags),
            stash: copy(S.stash),
            credibility: S.credibility,
            cabinAwareness: S.cabinAwareness,
            cabinPanic: S.cabinPanic,
            crewPhase: S.crewPhase,
            crewPhaseAt: S.crewPhaseAt,
            counts: copy(S.counts),
            doneTo: copy(S.doneTo),
            flags: copy(S.flags),
            medals: copy(S.medals),
            nearly: copy(S.nearly || {}),
            stats: copy(S.stats),
            actions: S.actions.slice(),
            logLength: S.log.length,
            bags: copy(S._bags || {}),
            eventClock: S._eventClock || 0,
            eventsFired: copy(S._eventsFired || {}),
            eventTurn: S._eventTurn || 0,
            bagN: copy(S._bagN || {}),
        };
    }

    function restore(S, snap) {
        S.clock = copy(snap.clock);
        S.player = copy(snap.player);
        S.inventory = snap.inventory.map(copy);
        S.fire = copy(snap.fire);
        S.pax = snap.pax.map(copy);
        S.crew = snap.crew.map(copy);
        S.cabinFlags = copy(snap.cabinFlags);
        S.stash = copy(snap.stash);
        S.credibility = snap.credibility;
        S.cabinAwareness = snap.cabinAwareness;
        S.cabinPanic = snap.cabinPanic;
        S.crewPhase = snap.crewPhase;
        S.crewPhaseAt = snap.crewPhaseAt;
        S.counts = copy(snap.counts);
        S.doneTo = copy(snap.doneTo);
        S.flags = copy(snap.flags);
        S.medals = copy(snap.medals);
        S.nearly = copy(snap.nearly || {});
        S.stats = copy(snap.stats);
        S.actions = snap.actions.slice();
        S.log.length = snap.logLength;
        S._eventClock = snap.eventClock;
        S._eventsFired = copy(snap.eventsFired);
        S._eventTurn = snap.eventTurn;
        // The bags of flavour lines are restored too, with the count of refills each has had,
        // which is what the next refill's shuffle is drawn from.
        S._bags = copy(snap.bags);
        S._bagN = copy(snap.bagN);
        // The route field is derived from the rest and is cheaper to rebuild than to copy.
        S._field = null;
        S._fieldStamp = null;
        PRS.state.reindex(S);
    }

    /** Called by actions.perform before anything happens. */
    function push(S, entry) {
        if (!S.undoStack) S.undoStack = [];
        const def = entry.def;
        S.undoStack.push({
            id: def.id,
            label: entry.label,
            reveal: (def.tags || []).indexOf("reveal") >= 0,
            // The tiles a walk goes through, which is the trail it leaves.
            path: def.id === WALK && entry.ctx && entry.ctx.r ? entry.ctx.r.path : null,
            snap: snapshot(S),
        });
        while (S.undoStack.length > LIMIT) S.undoStack.shift();
    }

    /**
     * What undo would do right now: the last thing you did or, given an `index` into the stack,
     * everything from there up; or a reason it cannot. The button prints this, so the rule is
     * visible before it is hit.
     */
    function peek(S, index) {
        const stack = S.undoStack || [];
        if (S.clock.landed) return { ok: false, why: K("The aeroplane is on the ground.") };
        if (!stack.length) return { ok: false, why: K("You have not done anything yet.") };
        const i = index === undefined ? stack.length - 1 : index;
        if (!(i >= 0 && i < stack.length)) {
            return { ok: false, why: K("That is further back than you can go.") };
        }

        let walks = true;
        for (let k = i; k < stack.length; k++) {
            if (stack[k].reveal) {
                return { ok: false, why: K("You cannot un-see that. Anything that told you " +
                                           "something new stays done.") };
            }
            if (stack[k].id !== WALK) walks = false;
        }
        const top = stack[stack.length - 1];
        const first = stack[i];
        return {
            ok: true,
            index: i,
            count: stack.length - i,
            label: top.label || top.id,
            walks: walks,
            seconds: Math.round(S.clock.remaining - first.snap.clock.remaining) * -1,
            // Where you were standing before all that, so the cabin can show you the tile you
            // would be putting yourself back on.
            at: { x: first.snap.player.x, y: first.snap.player.y },
        };
    }

    /** Put it back: the last thing, or everything from `index` up. Returns what was undone, or null. */
    function undo(S, index) {
        const plan = peek(S, index);
        if (!plan.ok) return null;
        const stack = S.undoStack;
        const entry = stack[plan.index];
        stack.length = plan.index;
        restore(S, entry.snap);
        S.stats.undos = (S.stats.undos || 0) + plan.count;
        const back = Math.abs(plan.seconds);
        PRS.state.log(S, plan.walks
            ? T("You go back the way you came, to {where}, and you have {secs} back.",
                { where: PRS.cabin.placeTo(plan.at.x, plan.at.y),
                  secs: PRS.util.plural(back, K("second"), K("seconds")) })
            : (plan.count > 1
                ? T("You did not do that. {what} (and the {n} before it) is undone, and you " +
                    "have the {secs} seconds back.",
                    { what: T(plan.label), n: plan.count - 1, secs: back })
                : T("You did not do that. {what} is undone, and you have the {secs} seconds back.",
                    { what: T(plan.label), secs: back })), "undo");
        return plan;
    }

    /**
     * Where you have just walked from: the tile you stood on before each of the walks at the top
     * of the stack, the most recent first, back as far as the last thing you did that was not a
     * walk. Walking back onto one of them is those walks undone, which is why the trail ends at
     * anything else: going back past a conversation would be taking the conversation back too.
     * `path` is the tiles that walk went through, and `seconds` is what going back gives you.
     */
    function trail(S) {
        const stack = S.undoStack || [];
        const out = [];
        if (S.clock.landed) return out;
        for (let i = stack.length - 1; i >= 0 && out.length < TRAIL; i--) {
            const e = stack[i];
            if (e.id !== WALK || e.reveal) break;
            out.push({ x: e.snap.player.x, y: e.snap.player.y, index: i, path: e.path || [],
                       seconds: Math.abs(Math.round(S.clock.remaining - e.snap.clock.remaining)) });
        }
        return out;
    }

    PRS.undo = { snapshot, restore, push, peek, undo, trail, LIMIT, TRAIL };
})(window);
