// A scenario is a flight that starts somewhere other than the beginning.
//
// Everything in this game is cast from one seed at boarding and then only moved by what you do,
// which makes a flight very hard to start in the middle - and starting in the middle is the only
// honest way to build a short one. Fifteen minutes is not long because the clock is long. It is
// long because the first four minutes of a lithium fire are a smell, and a game that opens on a
// smell has to explain itself for four minutes before anything is at stake.
//
// So a scenario says three things: which aeroplane, how long, and how much of the fire has
// already happened. The last of those is `preburn`, and it is the whole trick: the fire is
// advanced on its own, with nobody in the cabin, before the flight begins. That is the one
// sanctioned exception to the rule in actions.js that nothing but `spend` may move the fire, and
// it is sanctioned because it is not moving time forward - it is deciding what time it already
// is when you look up.
//
// What a scenario may say
// -----------------------
//   aircraft   which aeroplane it is flown on
//   seconds    how long the flight is
//   preburn    seconds of fire that already happened before you noticed
//   blueAt     when the pack goes to its second stage, or null for never
//   open(S)    anything else that is already true at the start
//   beats      lines that arrive when something happens, once each. See `check`.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;

    // ------------------------------------------------------------------ the last four minutes ---
    //
    // The first flight anybody flies, and the answer to a question the full game asks badly:
    // what is all this for?
    //
    // On TN 447 a new player spends four minutes finding out that there is a fire, four more
    // finding out that they cannot put it out, and arrives at the part of the game that is
    // actually the game with a third of the clock left and no idea what any of it was worth.
    // This is that third, on its own, on an aeroplane small enough to see all of at once.
    //
    // Three decisions and why they are the right ones:
    //
    //   It is four minutes, not fifteen. Long enough to carry three people and short enough
    //   that a first flight ends while the player still wants another one.
    //
    //   The fire never goes blue. The second stage is the best thing in the game and it is the
    //   worst possible thing to meet first: it is a rule that says everything you have learnt
    //   in the last six minutes has stopped applying. So `blueAt` is null here. What is burning
    //   is an ordinary fire that an ordinary person could understand, and the tutorial is about
    //   the people rather than the chemistry.
    //
    //   The danger comes off the manifest instead. An ordinary locker fire is survivable in a
    //   cabin that can walk. This one cannot walk: it is the island hospital run, seven people
    //   over seventy-four, a woman whose chair is in the hold, and a nine-month-old. Nothing
    //   about the fire is turned up. The passengers are simply people the fire is enough for,
    //   which is the truest thing this game has to teach and the hardest thing to say in a
    //   tooltip.
    const LASTFOUR = {
        id: "lastfour",
        name: K("The last four minutes"),
        blurb: K("Four minutes, nineteen seats, and a cabin that cannot walk itself out. " +
                 "Start here."),
        aircraft: "be1900d",
        seconds: 240,
        // Three minutes of fire that happened while you were reading the safety card. It has
        // the locker and it has started on the seats under it, which is a thing you can see
        // from anywhere in an aeroplane this size - and the point of starting here is that you
        // can.
        //
        // Three and not five, and the difference is the whole tutorial. Swept against the bots
        // at twenty-five flights a cell: at five minutes of preburn the cabin is already lost
        // when the game opens on it and the best bot beats doing nothing by two and a half
        // people. At three it beats it by five, out of nineteen. A tutorial has to have a
        // number at the end that is obviously yours, and that is the number.
        preburn: 180,
        // Never. See above.
        blueAt: null,
        tutorial: true,

        // The scenario opens the log rather than the aeroplane, because the thing that has to
        // be said first is not where you are - it is that this started before you looked up.
        opening: K("Coastal Link 2231, four minutes out, nineteen souls and no cabin crew. " +
                   "The locker above {seat} has been alight for three minutes and you have " +
                   "spent one of those deciding it was really happening. Almost nobody on this " +
                   "aeroplane can get themselves off it."),

        open(S) {
            // You have not just noticed. You have been watching it for about a minute and have
            // got as far as standing up, which is why the cabin is already half-awake and the
            // man sitting under it has already said something.
            S.cabinAwareness = Math.max(S.cabinAwareness, 22);
            S.credibility = Math.max(S.credibility, 12);
            S.cabinFlags.detectorSounded = true;
        },

        // What a tutorial is allowed to be: seven sentences, each one arriving at the moment the
        // thing it is about has just happened to you. Not a panel in front of the aeroplane, and
        // not a hand on your hand. The game already writes a line every time you act; these are
        // six more lines in the same voice, in the same place, and none of them stops the clock.
        beats: [
            { id: "moved",
              when: (S) => S.stats.stepsTaken > 0,
              line: K("The clock moved because you moved. It is the only thing that moves it: " +
                      "stand still and read the cabin for as long as you like, it costs you " +
                      "nothing.") },
            { id: "refused",
              when: (S) => (S.counts["people.tell"] || 0) + (S.counts["people.order"] || 0) >= 2
                           && S.stats.helpersRecruited === 0,
              line: K("Nobody is going to take your word for it, and they are right not to. " +
                      "Show them something instead: the open locker, the photograph, your " +
                      "hand. A sceptic is not talked round. A sceptic is shown.") },
            { id: "helper",
              when: (S) => S.stats.helpersRecruited > 0,
              line: K("That one works for the rest of the flight without being asked again. " +
                      "Every other pair of hands on this aeroplane is worth more than " +
                      "anything in your bag.") },
            { id: "carried",
              when: (S) => S.stats.carriesCompleted > 0,
              line: K("By the doors is where people live. Not because the air is good there - " +
                      "it will not be - but because it is the only floor the fire has to cross " +
                      "the whole cabin to reach.") },
            { id: "fought",
              when: (S) => (S.stats.timeFighting || 0) > 30,
              line: K("You cannot put this out. What you are buying is a walkable aisle and " +
                      "less smoke in it, and on this aeroplane that is worth buying - but it " +
                      "is not the thing that saves anybody. People are.") },
            { id: "half",
              when: (S) => S.clock.remaining <= 120,
              line: K("Two minutes. Whoever is still in a seat aft of the wing is a decision " +
                      "now rather than a plan.") },
            { id: "nearly",
              when: (S) => S.clock.remaining <= 40,
              line: K("You cannot save everybody, and this is the part where that stops being " +
                      "a sentence in a rulebook.") },
        ],
    };

    const ALL = [LASTFOUR];
    const BY_ID = {};
    for (const s of ALL) BY_ID[s.id] = s;

    function byId(id) { return (id && BY_ID[id]) || null; }

    /** Every scenario id, sorted, for the share code's stamp. */
    function ids() { return ALL.map((s) => s.id).sort(); }

    /**
     * Anything the flight has just become true enough to say. Called after every action, and
     * every beat fires at most once - which is why it is kept on the state and not here.
     */
    function check(S) {
        const sc = S.scenario;
        if (!sc || !sc.beats) return;
        S.beatsSeen = S.beatsSeen || {};
        for (const b of sc.beats) {
            if (S.beatsSeen[b.id]) continue;
            let hit = false;
            try { hit = !!b.when(S); } catch (err) { hit = false; }
            if (!hit) continue;
            S.beatsSeen[b.id] = true;
            PRS.state.log(S, T(b.line), "rule");
            // One at a time. Two rules arriving together read as a wall and are skipped.
            return;
        }
    }

    PRS.data = PRS.data || {};
    PRS.data.scenarios = { ALL, LASTFOUR, byId, ids, check };
})(window);
