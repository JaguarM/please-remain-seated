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
//
// Fighting the fire is worth doing and it is not free. It holds the smoke down for everybody near
// the locker and it convinces the people watching, and it lands on the people sitting under it,
// who remember. `witness()` is both halves, and the fire deck's own pours go through it too.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const F = PRS.fire;
    const P = PRS.pax;

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

    // Best first. `have` decides whether you have it, `use` spends it, `amount` is how much of a
    // dose it is worth against fire.AGENTS, `spread` how much of it reaches the tiles around the
    // one you aimed at, and `soak` how much of it comes down on the people sitting there.
    const LIQUIDS = [
        { id: "bag", name: K("the nine litres in the bin liner"), agent: "water", amount: 2.4,
          spread: 0.55, soak: 1.6,
          have: (S) => !!S.flags.bagFull, use: (S) => st.setFlag(S, "bagFull", false) },
        { id: "water_big", name: K("the water bottle"), agent: "water", amount: 1.0, spread: 0.3,
          soak: 1.0, have: (S) => charged(S, "water_big"), use: (S) => spend(S, "water_big") },
    ];

    // The jacket is last and is always available, which is why the action never disappears. A
    // cloth covers the place you put it and not the seats either side.
    const CLOTHS = [
        { id: "wetblanket", name: K("the wet blanket"), agent: "wetcloth", amount: 1.2, spread: 0.2,
          soak: 0.8,
          have: (S) => { const b = st.slotOf(S, "blanket"); return b && b.wet; },
          use: (S) => { st.slotOf(S, "blanket").wet = false; } },
        { id: "wet_towel", name: K("the damp towel"), agent: "wetcloth", amount: 1.0, spread: 0.15,
          soak: 0.6, have: (S) => charged(S, "wet_towel"), use: (S) => spend(S, "wet_towel") },
        { id: "blanket", name: K("the blanket"), agent: "smother", amount: 1.0, spread: 0.15,
          soak: 0.5, have: (S) => !!st.slotOf(S, "blanket"), use: () => {} },
        { id: "jacket", name: K("your jacket"), agent: "beat", amount: 1.0, spread: 0.1, soak: 0.3,
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

    /**
     * What a fire being fought in front of people does to the people. The ones a few rows off see
     * the flame drop and start to believe you; the ones directly under it get the steam and the
     * drips and hold it against you. The believing is capped, because by the seventh time the
     * cabin has watched you pour something at a locker it has made up its mind about you.
     */
    function witness(S, knocked, soak) {
        if (knocked > 4 && (S.stats.fireCred || 0) < 14) {
            S.credibility = Math.min(100, S.credibility + 2);
            S.stats.fireCred = (S.stats.fireCred || 0) + 2;
            for (const p of st.withinEarshot(S, 3)) p.awareness = Math.min(100, p.awareness + 8);
        }
        return P.annoy(S, soak);
    }

    /** The card's first words, when somebody has hold of you. */
    function held(S) {
        const q = P.obstructor(S);
        return q ? T("{who} has hold of your arm. ", { who: q.name }) : "";
    }

    /** Put it on, say what happened, and be honest that none of it reached the cell. */
    function apply(S, entry, target, sound) {
        entry.use(S);
        const r = F.apply(S.fire, target.x, target.y, entry.agent, entry.amount, entry.spread);
        S.stats.agentsUsed++;
        PRS.audio.play(sound);
        witness(S, r.knocked, entry.soak);
        const gone = S.fire.intensity[cabin.idx(target.x, target.y)] < 1;
        return {
            text: T("You put {what} on it. ", { what: T(entry.name) }) +
                (gone
                    ? T("It goes out. For a moment there is nothing there at all, and it is the " +
                        "best moment of your afternoon.")
                    : T("It drops to {what}.",
                        { what: F.describe(S.fire, target.x, target.y) })) +
                (r.onCore
                    ? T(" Some of it gets into the bin and the case gets cooler, which is the " +
                        "only part of this that counts.")
                    : T(" None of it reaches the bin.")),
            kind: gone ? "good" : "plain",
        };
    }

    A.register([
        {
            id: "fire.douse", item: (S) => { const b = best(S, LIQUIDS); return b ? (b.id === "bag" ? "binbag" : b.id) : null; }, deck: "fire", tags: ["fire", "hands"], danger: "good",
            when: (S) => !!hot(S) && !!best(S, LIQUIDS),
            label: (S) => T("Pour {what} on it", { what: T(best(S, LIQUIDS).name) }),
            detail: (S) => {
                const e = best(S, LIQUIDS);
                const slot = st.slotOf(S, e.id);
                return held(S) + (slot && slot.uses !== null && slot.uses !== undefined
                    ? T("{n} left. It will come down on whoever is sitting under it.",
                        { n: slot.uses })
                    : T("It will come down on whoever is sitting under it."));
            },
            cost: (S) => best(S, LIQUIDS).amount > 2 ? 14 : 11,
            run: (S) => apply(S, best(S, LIQUIDS), hot(S), "pour"),
        },

        {
            id: "fire.smother", item: (S) => { const c = best(S, CLOTHS); return c ? (c.id === "wetblanket" ? "blanket" : c.id) : null; }, deck: "fire", tags: ["fire", "hands"], danger: "good",
            when: (S) => !!hot(S) && !!best(S, CLOTHS),
            label: (S) => T("Smother it with {what}", { what: T(best(S, CLOTHS).name) }),
            detail: (S) => held(S) + (best(S, CLOTHS).id === "jacket"
                ? T("This is what everybody does and it is very nearly useless.")
                : best(S, CLOTHS).id === "blanket"
                    ? T("Dry, it takes some of the air off it, and it will not stay a blanket " +
                        "for long.")
                    : T("Takes the air off it without spreading it about.")),
            cost: (S) => best(S, CLOTHS).id === "jacket" ? 9 : 11,
            run(S) {
                const entry = best(S, CLOTHS);
                const out = apply(S, entry, hot(S), "smother");
                const b = entry.id === "blanket" ? st.slotOf(S, "blanket") : null;
                if (b) {
                    // Whether this smothering scorches it was decided at boarding: the first, the
                    // second and the third time it is used, whatever else you did in between.
                    b.smothers = (b.smothers || 0) + 1;
                    if (PRS.state.dice(S, "blanket:" + b.smothers).chance(0.35)) {
                        b.scorched = (b.scorched || 0) + 1;
                        if (b.scorched >= 2) {
                            S.inventory = S.inventory.filter((s) => s !== b);
                            out.text += T(" The blanket burns through and you drop what is " +
                                          "left of it.");
                        } else {
                            out.text += T(" The blanket is scorched through in two places.");
                        }
                    }
                }
                return out;
            },
        },
    ]);

    PRS.douse = { hot, witness };
})(window);
