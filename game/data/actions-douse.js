// The two actions that replaced eleven.
//
// There used to be six ways to pour a liquid on the fire and five ways to smother it, one per
// object, and choosing between them was never a decision: you always used the best thing you had.
// Eleven rows of list for one choice the player was not really making.
//
// So there is one of each now, and it picks the best thing you are carrying and says so on the
// button. Getting a better thing — filling a bin liner at the tap, soaking the blanket — is still
// a real decision, it just happens where it belongs, which is at the tap rather than in a list of
// near-identical verbs.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const F = PRS.fire;

    /** The worst tile you can reach from where you are standing. */
    function hot(S) {
        let best = null, bestV = 0.4;
        const spots = [[S.player.x, S.player.y]].concat(cabin.neighbours(S.player.x, S.player.y));
        for (const [x, y] of spots) {
            const v = S.fire.intensity[cabin.idx(x, y)];
            if (v > bestV) { bestV = v; best = { x: x, y: y, v: v }; }
        }
        return best;
    }

    // Best first. `have` decides whether you have it, `use` spends it, and `amount` is how much
    // of a dose it is worth against fire.AGENTS.
    const LIQUIDS = [
        { id: "bag", name: "the nine litres in the bin liner", agent: "water", amount: 2.4,
          spread: 0.7, have: (S) => !!S.flags.bagFull, use: (S) => st.setFlag(S, "bagFull", false) },
        { id: "water_big", name: "the water bottle", agent: "water", amount: 1.0, spread: 0.35,
          have: (S) => charged(S, "water_big"), use: (S) => spend(S, "water_big") },
    ];

    // The jacket is last and is always available, which is why the action never disappears.
    const CLOTHS = [
        { id: "wetblanket", name: "the wet blanket", agent: "wetcloth", amount: 1.5,
          have: (S) => { const b = st.slotOf(S, "blanket"); return b && b.wet; },
          use: (S) => { st.slotOf(S, "blanket").wet = false; } },
        { id: "wet_towel", name: "the damp towel", agent: "wetcloth", amount: 1.0,
          have: (S) => charged(S, "wet_towel"), use: (S) => spend(S, "wet_towel") },
        { id: "blanket", name: "the blanket", agent: "smother", amount: 1.0,
          have: (S) => !!st.slotOf(S, "blanket"), use: () => {} },
        { id: "jacket", name: "your jacket", agent: "beat", amount: 1.0,
          have: () => true, use: () => {} },
    ];

    function charged(S, id) {
        const s = st.slotOf(S, id);
        return !!(s && !s.spent && (s.uses === null || s.uses > 0));
    }
    function spend(S, id) { st.useCharge(S, st.slotOf(S, id)); }

    function best(S, table) {
        for (const entry of table) if (entry.have(S)) return entry;
        return null;
    }

    /** Put it on, say what happened, and be honest that none of it reached the cell. */
    function apply(S, entry, target, sound) {
        entry.use(S);
        const r = F.apply(S.fire, target.x, target.y, entry.agent, entry.amount, entry.spread || 0.35);
        S.stats.agentsUsed++;
        PRS.audio.play(sound);
        const gone = S.fire.intensity[cabin.idx(target.x, target.y)] < 1;
        return {
            text: "You put " + entry.name + " on it. " +
                (gone
                    ? "It goes out. For a moment there is nothing there at all, and it is the best " +
                      "moment of your afternoon."
                    : "It drops to " + F.describe(S.fire, target.x, target.y) + ".") +
                (r.onCore
                    ? " Some of it gets into the bin and the case gets cooler, which is the only " +
                      "part of this that counts."
                    : " None of it reaches the bin."),
            kind: gone ? "good" : "plain",
        };
    }

    A.register([
        {
            id: "fire.douse", item: (S) => { const b = best(S, LIQUIDS); return b ? (b.id === "bag" ? "binbag" : b.id) : null; }, deck: "fire", tags: ["fire", "hands"], danger: "good",
            when: (S) => !!hot(S) && !!best(S, LIQUIDS),
            label: (S) => "Pour " + best(S, LIQUIDS).name + " on it",
            detail: (S) => {
                const e = best(S, LIQUIDS);
                const slot = st.slotOf(S, e.id);
                return slot && slot.uses !== null && slot.uses !== undefined
                    ? slot.uses + " left. Water cools the cell. Nothing puts it out."
                    : "Water cools the cell. Nothing puts it out.";
            },
            cost: (S) => best(S, LIQUIDS).amount > 2 ? 12 : 9,
            run: (S) => apply(S, best(S, LIQUIDS), hot(S), "pour"),
        },

        {
            id: "fire.smother", item: (S) => { const c = best(S, CLOTHS); return c ? (c.id === "wetblanket" ? "blanket" : c.id) : null; }, deck: "fire", tags: ["fire", "hands"], danger: "good",
            when: (S) => !!hot(S) && !!best(S, CLOTHS),
            label: (S) => "Smother it with " + best(S, CLOTHS).name,
            detail: (S) => best(S, CLOTHS).id === "jacket"
                ? "This is what everybody does and it is very nearly useless."
                : "Takes the air off it without spreading it about.",
            cost: (S) => best(S, CLOTHS).id === "jacket" ? 9 : 10,
            run(S) {
                const entry = best(S, CLOTHS);
                const out = apply(S, entry, hot(S), "smother");
                if (entry.id === "blanket" && S.rng.chance(0.4)) {
                    const b = st.slotOf(S, "blanket");
                    if (b) b.scorched = true;
                    out.text += " The blanket is scorched through in two places.";
                }
                return out;
            },
        },
    ]);
})(window);
