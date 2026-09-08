// What happened, decided at touchdown and not before.
//
// Nobody dies during the flight. People go down, and going down is bad, but the game does not tell
// you who you have lost until the wheels are on the ground, because that is the honest shape of
// it: on the day you do not find out either. You carry someone forward and you do not know until
// afterwards whether it mattered.
//
// Four outcomes per soul, in the language of the report:
//   unhurt      walked off
//   treated     taken to hospital, will be fine, would not have been in another two minutes
//   serious     alive when the doors opened, and that is all the report will commit to
//   lost        not accounted for
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const { clamp, clamp01 } = PRS.util;

    /** Everything that decides one person's afternoon, in the order it matters. */
    function outcomeFor(S, p) {
        const f = S.fire;
        const i = cabin.idx(p.x, p.y);
        let harm = p.smokeDose + p.burns * 1.5;

        if (p.state === "secured") {
            harm *= 0.55;                                  // forward, low, by a door
            harm -= 8;
        } else {
            harm += f.smoke[i] * 0.42;                     // the last ninety seconds count double
            harm += f.intensity[i] * 0.55;
            if (!p.masked) harm += 6;
            if (!p.braced) harm += 4;
            if (p.state === "aisle" || p.state === "standing") harm += 9;  // upright, in the layer
            if (p.state === "down") harm += 14;
            const distToDoor = Math.min(
                Math.abs(p.x - cabin.FWD_CROSS_X),
                Math.abs(p.x - cabin.OVERWING_X),
                Math.abs(p.x - cabin.AFT_CROSS_X));
            harm += distToDoor * 1.5;
        }
        if (p.traits.indexOf("elderly") >= 0) harm *= 1.22;
        if (p.traits.indexOf("infant") >= 0) harm *= 1.30;
        if (p.traits.indexOf("child") >= 0) harm *= 1.12;
        if (p.traits.indexOf("immobile") >= 0 && p.state !== "secured") harm += 20;
        if (p.traits.indexOf("medical") >= 0) harm -= 4;
        if (p.helper) harm -= 3;                           // they were moving, and moving is low

        harm = Math.max(0, harm + S.rng.range(-7, 7));

        if (harm < 22) return { key: "unhurt", harm: harm };
        if (harm < 52) return { key: "treated", harm: harm };
        if (harm < 78) return { key: "serious", harm: harm };
        return { key: "lost", harm: harm };
    }

    function settle(S) {
        if (S.result) return S.result;
        const rows = [];
        const tally = { unhurt: 0, treated: 0, serious: 0, lost: 0 };

        for (const p of S.pax) {
            const o = outcomeFor(S, p);
            p.outcome = o.key;
            p.harm = Math.round(o.harm);
            tally[o.key]++;
            rows.push(p);
        }

        // You are the sixty-first soul.
        const you = { name: S.character.name, seat: S.player.seat, isPlayer: true };
        let yourHarm = S.player.smokeDose + S.player.burns * 1.4;
        if (!S.player.alive) yourHarm = 120;
        if (st.wearing(S, "hood")) yourHarm *= 0.4;
        you.outcome = yourHarm > 92 ? "lost" : yourHarm > 62 ? "serious"
                    : yourHarm > 26 ? "treated" : "unhurt";
        you.harm = Math.round(yourHarm);

        const secured = st.securedCount(S);
        const helped = S.stats.helperSaves || 0;
        const survivors = tally.unhurt + tally.treated + tally.serious;

        const result = {
            souls: S.pax.length + 1,
            secured: secured,
            byYou: S.stats.carriesCompleted,
            byHelpers: helped,
            tally: tally,
            survivors: survivors,
            lost: tally.lost,
            you: you,
            rows: rows,
            helpers: S.pax.filter((p) => p.helper).map((p) => p.name),
            crewPhase: S.crewPhase,
            fire: {
                vented: S.fire.core.vented,
                cellsLeft: S.fire.core.cells,
                contained: Math.round(S.fire.core.contained * 100),
                inSink: S.fire.core.inSink,
                peak: Math.round(S.fire.peakIntensity),
                burnedTiles: Math.round(S.fire.totalBurned * 100) / 100,
                smoke: Math.round(PRS.fire.totalSmoke(S.fire)),
            },
            time: {
                total: Math.round(S.clock.total),
                carrying: Math.round(S.stats.timeCarrying),
                arguing: Math.round(S.stats.timeArguing),
                fighting: Math.round(S.stats.timeFighting),
                wasted: Math.round(S.stats.timeWasted),
            },
            actions: S.actions.length,
            distinctActions: Object.keys(S.counts).length,
            medals: PRS.medals.earned(S),
            notes: S.notes,
            seed: S.seed,
            character: S.character,
            grade: null,
            ending: null,
        };

        result.grade = gradeOf(result);
        result.ending = PRS.endings.pick(S, result);
        S.result = result;
        S.ended = true;

        PRS.state.log(S, "SOULS ON BOARD 61. ACCOUNTED FOR " + survivors + ". " +
            (tally.lost ? "NOT ACCOUNTED FOR " + tally.lost + "." : "ALL ACCOUNTED FOR."),
            tally.lost ? "bad" : "great");

        const history = PRS.util.store.get("history", []);
        history.unshift({
            at: Date.now(), seed: S.seed, character: S.character.id,
            secured: secured, lost: tally.lost, grade: result.grade.key,
            ending: result.ending.id,
        });
        PRS.util.store.set("history", history.slice(0, 60));

        PRS.medals.check(S);
        return result;
    }

    const GRADES = [
        { key: "A", min: 30, name: "Exceptional",
          text: "This is not what a passenger can do. This is what a passenger can do." },
        { key: "B", min: 20, name: "Remarkable",
          text: "Twenty souls forward is an extraordinary outcome for one person with a bottle." },
        { key: "C", min: 12, name: "Considerable",
          text: "A dozen people were somewhere better than their seats. That is the job." },
        { key: "D", min: 6, name: "Some",
          text: "Some. Which is a strange word to have to use." },
        { key: "E", min: 2, name: "A few",
          text: "A few, in fifteen minutes, against sixty. It was always going to be like this." },
        { key: "F", min: 0, name: "Almost none",
          text: "You were the only person on this aeroplane who understood, and it was not enough." },
    ];

    function gradeOf(result) {
        const score = result.secured + result.byHelpers * 0.5 -
                      result.lost * 0.8;
        for (const g of GRADES) if (score >= g.min) return g;
        return GRADES[GRADES.length - 1];
    }

    PRS.scoring = { settle, outcomeFor, gradeOf, GRADES };
})(window);
