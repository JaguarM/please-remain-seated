// Changing your mind.
//
// A new player walks to the wrong end of the aeroplane, loses forty seconds, and has no way to
// say "no, not that". That is the frustration this file exists to remove, and it removes it by
// putting the world back exactly as it was.
//
// The thing it must not become is a way to reroll. Persuasion is the centre of this game and
// almost every social action is a die roll against a passenger's resistance; if undo let you
// retry a refusal, the whole social layer would collapse into "click until it works".
//
// So the snapshot includes the position of the random number stream. Rewind, repeat the same
// action, and you get the same result, down to the sentence the passenger says. You can change
// your mind. You cannot change your luck.
//
// Two things still cannot be undone:
//   * anything tagged `reveal`, because you cannot un-see what was in the bin, and rewinding the
//     clock after looking would make scouting free;
//   * anything after the aeroplane has landed.
//
// And a run of the same action collapses: three walks in a row undo as one decision, which is
// what "go back" means to somebody who has just wandered.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    const LIMIT = 80;              // how many turns back the stack goes; nobody needs eighty
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
            rng: S.rng.save(),
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
            flags: copy(S.flags),
            medals: copy(S.medals),
            stats: copy(S.stats),
            actions: S.actions.slice(),
            logLength: S.log.length,
            bags: copy(S._bags || {}),
            eventClock: S._eventClock || 0,
            eventsFired: copy(S._eventsFired || {}),
        };
    }

    function restore(S, snap) {
        S.rng.load(snap.rng);
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
        S.flags = copy(snap.flags);
        S.medals = copy(snap.medals);
        S.stats = copy(snap.stats);
        S.actions = snap.actions.slice();
        S.log.length = snap.logLength;
        S._eventClock = snap.eventClock;
        S._eventsFired = copy(snap.eventsFired);
        // The bags of flavour lines are restored too. They look cosmetic, but refilling one
        // draws from the random stream, so losing them would desynchronise every roll after.
        S._bags = copy(snap.bags);
        // The route field is derived from the rest and is cheaper to rebuild than to copy.
        S._field = null;
        S._fieldStamp = null;
        PRS.state.reindex(S);
    }

    /** Called by actions.perform before anything happens. */
    function push(S, def) {
        if (!S.undoStack) S.undoStack = [];
        S.undoStack.push({
            id: def.id,
            label: null,                       // filled in by perform once it knows the label
            reveal: (def.tags || []).indexOf("reveal") >= 0,
            snap: snapshot(S),
        });
        while (S.undoStack.length > LIMIT) S.undoStack.shift();
    }

    /**
     * What undo would do right now: the run of identical actions at the top of the stack, or a
     * reason it cannot. The button prints this, so the rule is visible before it is hit.
     */
    function peek(S) {
        const stack = S.undoStack || [];
        if (S.clock.landed) return { ok: false, why: "The aeroplane is on the ground." };
        if (!stack.length) return { ok: false, why: "You have not done anything yet." };

        const top = stack[stack.length - 1];
        if (top.reveal) {
            return { ok: false, why: "You cannot un-see that. Anything that told you something " +
                                     "new stays done." };
        }
        // Collapse a run of the same action: three walks in a row are one change of mind.
        let i = stack.length - 1;
        while (i > 0 && stack[i - 1].id === top.id && !stack[i - 1].reveal) i--;
        const first = stack[i];
        return {
            ok: true,
            index: i,
            count: stack.length - i,
            label: top.label || top.id,
            seconds: Math.round(S.clock.remaining - first.snap.clock.remaining) * -1,
            // Where you were standing before all that, so the cabin can show you the tile you
            // would be putting yourself back on.
            at: { x: first.snap.player.x, y: first.snap.player.y },
        };
    }

    /** Put it back. Returns what was undone, or null. */
    function undo(S) {
        const plan = peek(S);
        if (!plan.ok) return null;
        const stack = S.undoStack;
        const entry = stack[plan.index];
        stack.length = plan.index;
        restore(S, entry.snap);
        S.stats.undos = (S.stats.undos || 0) + plan.count;
        PRS.state.log(S, "You did not do that. " + plan.label +
            (plan.count > 1 ? " (and the " + (plan.count - 1) + " before it)" : "") +
            " is undone, and you have the " + Math.abs(plan.seconds) + " seconds back.", "undo");
        return plan;
    }

    PRS.undo = { snapshot, restore, push, peek, undo, LIMIT };
})(window);
