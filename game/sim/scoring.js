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
            harm *= 0.45;                                  // out of the seats, low, by a door
            harm -= 14;
            // Being accounted for is not a force field. A zone is worth exactly what is in the
            // air in it by the time the gear comes down.
            harm += f.smoke[i] * 0.13;
            harm += f.intensity[i] * 0.22;
        } else {
            harm += f.smoke[i] * 0.34;                     // the last ninety seconds count double
            harm += f.intensity[i] * 0.42;
            if (!p.masked) harm += 5;
            if (!p.braced) harm += 3;
            if (p.state === "aisle" || p.state === "standing") harm += 7;  // upright, in the layer
            if (p.state === "down") harm += 11;
            const distToDoor = Math.min(
                Math.abs(p.x - cabin.FWD_CROSS_X),
                Math.abs(p.x - cabin.AFT_CROSS_X));
            harm += distToDoor * 1.2;
        }
        if (p.traits.indexOf("elderly") >= 0) harm *= 1.22;
        if (p.traits.indexOf("infant") >= 0) harm *= 1.30;
        if (p.traits.indexOf("child") >= 0) harm *= 1.12;
        if (p.traits.indexOf("immobile") >= 0 && p.state !== "secured") harm += 20;
        if (p.traits.indexOf("medical") >= 0) harm -= 4;
        if (p.helper) harm -= 3;                           // they were moving, and moving is low

        harm = Math.max(0, harm + S.rng.range(-7, 7));

        if (harm < 30) return { key: "unhurt", harm: harm };
        if (harm < 66) return { key: "treated", harm: harm };
        if (harm < 96) return { key: "serious", harm: harm };
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
        you.outcome = yourHarm > 100 ? "lost" : yourHarm > 70 ? "serious"
                    : yourHarm > 32 ? "treated" : "unhurt";
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
            seed: S.seed,
            character: S.character,
            grade: null,
            ending: null,
        };

        result.grade = gradeOf(result);
        result.ending = PRS.endings.pick(S, result);
        // What carries over. The bots have a log book too, in memory, and do not read it.
        result.logbook = PRS.logbook ? PRS.logbook.record(S, result) : null;
        S.result = result;
        S.ended = true;

        PRS.state.log(S, "SOULS ON BOARD 61. ACCOUNTED FOR " + survivors + ". " +
            (tally.lost ? "NOT ACCOUNTED FOR " + tally.lost + "." : "ALL ACCOUNTED FOR."),
            tally.lost ? "bad" : "great");

        PRS.medals.check(S);
        return result;
    }

    const GRADES = [
        { key: "A", min: 30, name: "Exceptional",
          text: "This is not what a passenger can do. This is what a passenger can do." },
        { key: "B", min: 22, name: "Remarkable",
          text: "Twenty souls forward is an extraordinary outcome for one person with a bottle." },
        { key: "C", min: 15, name: "Considerable",
          text: "A dozen people were somewhere better than their seats. That is the job." },
        { key: "D", min: 8, name: "Some",
          text: "Some. Which is a strange word to have to use." },
        { key: "E", min: 3, name: "A few",
          text: "A few, in fifteen minutes, against sixty. It was always going to be like this." },
        { key: "F", min: 0, name: "Almost none",
          text: "You were the only person on this aeroplane who understood, and it was not enough." },
    ];

    /** The grade is the number on the HUD, and nothing hidden: souls secured. */
    function gradeOf(result) {
        for (const g of GRADES) if (result.secured >= g.min) return g;
        return GRADES[GRADES.length - 1];
    }

    PRS.scoring = { settle, outcomeFor, gradeOf, GRADES };
})(window);
