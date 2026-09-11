// What happened, decided at touchdown and not before.
//
// Nobody dies during the flight. People go down, and going down is bad, but the game does not tell
// you who you have lost until the wheels are on the ground, because that is the honest shape of
// it: on the day you do not find out either. You carry someone forward and you do not know until
// afterwards whether it mattered.
//
// There is no safe zone and nobody is "secured". Each person is scored where they are when the
// doors open: the smoke they have already breathed, their burns, the air in the place they are
// lying or standing in, whether they are low, whether they have something over their face, and
// how far the door is through the aisle. Carrying somebody to a galley is worth exactly what it
// changes in that sum, and so is pouring water on a locker. The score is how many of the sixty
// are alive.
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

    // Where the harm total stops being one outcome and becomes the next.
    const BANDS = { unhurt: 30, treated: 66, serious: 96 };

    /**
     * One person's harm at touchdown, in named parts. Kept apart from the banding so that
     * tools/harm.js can show where a flight's harm came from with the same arithmetic the
     * report uses, rather than a copy of it that drifts.
     */
    function harmParts(S, p) {
        const f = S.fire;
        const i = cabin.idx(p.x, p.y);
        const parts = {
            breathed: p.smokeDose,
            burns: p.burns * 1.5,
            // The air they are in when the gear comes down, and the minute and a half after it
            // before the slide is at the door, on top of everything they have already breathed.
            air: f.smoke[i] * 0.7,
            heat: f.intensity[i] * 0.42,
            unmasked: p.masked ? 0 : 5,
            upright: (p.braced ? 0 : 3) +
                     (p.state === "aisle" || p.state === "standing" ? 7 : 0),  // in the layer
            down: p.state === "down" ? 11 : 0,
            // Getting to a door once it opens, down an aisle with whatever is on it.
            door: PRS.pax.evacuation(S, p.x),
        };
        let base = 0;
        for (const k in parts) base += parts[k];
        let mul = 1;
        if (p.traits.indexOf("elderly") >= 0) mul *= 1.22;
        if (p.traits.indexOf("infant") >= 0) mul *= 1.30;
        if (p.traits.indexOf("child") >= 0) mul *= 1.12;
        parts.stuck = p.traits.indexOf("immobile") >= 0 && !p.moved ? 20 : 0;
        parts.other = (p.traits.indexOf("medical") >= 0 ? -4 : 0) +
                      (p.helper ? -3 : 0);                 // they were moving, and moving is low
        return { parts: parts, mul: mul, total: base * mul + parts.stuck + parts.other };
    }

    function band(harm) {
        if (harm < BANDS.unhurt) return "unhurt";
        if (harm < BANDS.treated) return "treated";
        if (harm < BANDS.serious) return "serious";
        return "lost";
    }

    /** Everything that decides one person's afternoon. No dice: two identical flights score alike. */
    function outcomeFor(S, p) {
        const harm = Math.max(0, harmParts(S, p).total);
        return { key: band(harm), harm: harm };
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

        const survivors = tally.unhurt + tally.treated + tally.serious;

        const result = {
            souls: S.pax.length + 1,
            survivors: survivors,
            lost: tally.lost,
            tally: tally,
            moved: st.movedCount(S),
            byYou: S.stats.carriesCompleted,
            byHelpers: S.stats.helperSaves || 0,
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
                wasted: Math.round(S.stats.timeWasted || 0),
            },
            actions: S.actions.length,
            distinctActions: Object.keys(S.counts).length,
            medals: [],
            seed: S.seed,
            character: S.character,
            grade: null,
            ending: null,
        };
        result.grade = gradeOf(result);
        S.result = result;
        S.ended = true;
        // A flight flown only to see what would have happened keeps nothing and says nothing.
        if (S.quiet) return result;

        // Some medals are about how it ended, so they are checked once the manifest exists, and
        // before the log book writes down which ones you have.
        PRS.medals.check(S);
        result.medals = PRS.medals.earned(S);
        result.ending = PRS.endings.pick(S, result);
        // What carries over. The bots have a log book too, in memory, and do not read it.
        result.logbook = PRS.logbook ? PRS.logbook.record(S, result) : null;
        result.recording = PRS.recorder ? PRS.recorder.save(S, result) : null;

        const accounted = survivors + (you.outcome === "lost" ? 0 : 1);
        PRS.state.log(S, "SOULS ON BOARD 61. ACCOUNTED FOR " + accounted + ". " +
            (accounted < 61 ? "NOT ACCOUNTED FOR " + (61 - accounted) + "." : "ALL ACCOUNTED FOR."),
            accounted < 61 ? "bad" : "great");
        return result;
    }

    // Out of sixty. Nobody is meant to see an A often, and all sixty is not a thing this
    // aeroplane has in it.
    const GRADES = [
        { key: "A", min: 54, name: "Exceptional",
          text: "Almost everybody. There is no version of this afternoon that goes better, and " +
                "you found the one that nearly does." },
        { key: "B", min: 49, name: "Remarkable",
          text: "Most of a burning aeroplane got off it alive, and a good part of that was what " +
                "you did in the first five minutes." },
        { key: "C", min: 43, name: "Considerable",
          text: "More people lived than would have. That is the job, and it is the whole job." },
        { key: "D", min: 36, name: "Some",
          text: "Some. Which is a strange word to have to use." },
        { key: "E", min: 28, name: "A few",
          text: "The fire decided most of this. You decided some of it." },
        { key: "F", min: 0, name: "Almost none",
          text: "You were the only person on this aeroplane who understood, and it was not enough." },
    ];

    /** The grade is nothing hidden: how many of the sixty got off alive. */
    function gradeOf(result) {
        for (const g of GRADES) if (result.survivors >= g.min) return g;
        return GRADES[GRADES.length - 1];
    }

    /**
     * The same aeroplane with nobody doing anything: the same seed, the same person in the same
     * seat with the same bag, the same luck, and fifteen minutes spent standing in the aisle.
     * Thirty people off alive is a failure or a triumph depending entirely on this number, so the
     * report puts it next to the real one.
     */
    function withoutYou(S) {
        const L = S.loadout;
        const B = st.create({ characterId: L.characterId, outfitId: L.outfitId, items: L.items,
                              seed: S.seed, luck: S.luck });
        B.quiet = true;
        // In the steps a person would take, so an early descent shortens this flight as it would
        // have shortened yours, instead of being flown straight through.
        while (!B.clock.landed && B.clock.remaining > 0.001) {
            PRS.actions.spend(B, Math.min(10, B.clock.remaining), null);
        }
        if (!B.clock.landed) PRS.actions.land(B);
        return B.result.survivors;
    }

    PRS.scoring = { settle, outcomeFor, harmParts, band, gradeOf, withoutYou, GRADES, BANDS };
})(window);
