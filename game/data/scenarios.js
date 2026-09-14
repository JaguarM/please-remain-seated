// A scenario is a flight flown on different terms: a different aeroplane, a different clock, and
// whatever is already true about the cabin when you look up.
//
// It exists for the tutorial, and the thing that took longest to learn about the tutorial is that
// a short flight is not a long flight with the beginning cut off.
//
// The tempting way to build one is to start in the middle. Everything in this game is cast from
// one seed at boarding and then moved only by what you do, so a short flight that opens on
// a one-tile fire has nothing at stake for its first two minutes - and the obvious fix is to
// advance the fire on its own, with nobody in the cabin, before the flight begins. That was
// `preburn`. It was the one sanctioned exception to the rule in actions.js that nothing but
// `spend` may move the fire, and it is gone, because it was wrong in a way that took a search to
// see: it is not the dice in it that hurt, it is the minutes. A cabin that opens on a fire is a
// cabin the player cannot change. Three minutes of fire handed over at t=0 - even with every die
// in it fixed, the same board on every seed, which was measured - leaves a flight where playing
// well is worth three and a half people and the seed is worth two. The same three minutes handed
// to the clock instead is worth seven, and the seed is worth one.
//
// So: every second the fire grows is a second somebody is in the room for it. That is the rule
// this file is now built on, and `tools/ceiling.js` is what it was learnt with.
//
// What a scenario may say
// -----------------------
//   aircraft   which aeroplane it is flown on
//   seconds    how long the flight is
//   blueAt     when the pack goes to its second stage, or null for never
//   open(S)    anything else that is already true at the start
//   beats      lines that arrive when something happens, once each. See `check`.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;

    // ------------------------------------------------------------------- the last five minutes ---
    //
    // The first flight anybody flies, and the answer to a question the full game asks badly:
    // what is all this for?
    //
    // On TN 447 a new player spends four minutes finding out that there is a fire, four more
    // finding out that they cannot put it out, and arrives at the part of the game that is
    // actually the game with a third of the clock left and no idea what any of it was worth.
    // This is that third, on its own, on an aeroplane small enough to see all of at once.
    //
    // Four decisions and why they are the right ones:
    //
    //   It is five minutes, not fifteen. Long enough to carry five people with your own arms
    //   and short enough that a first flight ends while the player still wants another one.
    //
    //   The fire starts where every fire starts: one tile in one locker, at t=0, on every
    //   seed. There is no head start, which is the whole of what makes the number at the end
    //   the player's. Swept against the bots at forty flights a cell, `good` as the stand-in
    //   for somebody playing sensibly:
    //
    //                              your score      what you saved
    //     three minutes of head start   11.9 ± 3.7      4.3
    //     no head start, five minutes   17.7 ± 0.9      7.0
    //
    //   The right-hand column is the tutorial's reason to exist and the left-hand one is
    //   whether it is yours. Both got better by taking the head start away and giving the
    //   minutes it was worth to the clock instead - see the note at the top of this file.
    //
    //   The fire never goes blue. The second stage is the best thing in the game and it is the
    //   worst possible thing to meet first: it is a rule that says everything you have learnt
    //   in the last six minutes has stopped applying. So `blueAt` is null here. What is burning
    //   is an ordinary fire that an ordinary person could understand, and the tutorial is about
    //   the people rather than the chemistry.
    //
    //   The danger comes off the manifest. An ordinary locker fire is survivable in a cabin
    //   that can walk. This one cannot walk: it is the island hospital run, seven people over
    //   seventy-four, a woman whose chair is in the hold, and a nine-month-old. Nothing about
    //   the fire is turned up. The passengers are simply people the fire is enough for, which
    //   is the truest thing this game has to teach and the hardest thing to say in a tooltip.
    //
    //   What the manifest cannot do is carry danger on its own, and it is worth writing down
    //   because it reads as though it should. Frailty in scoring.js is a multiplier on harm the
    //   fire has already done - `elderly` is 1.22, `infant` is 1.30 - and `immobile` is a flat
    //   twenty on somebody nobody moved. Give any one passenger any one of those and the flight
    //   moves by less than a person, because a multiplier on nothing is nothing. Seats the fire
    //   never reaches are safe seats whoever is in them. The manifest decides who the fire is
    //   enough for; the clock decides how many of them it gets to.
    //
    // And what is still wrong with it, written down here so that the next person to open this
    // file does not have to find it again: there is nothing above a sensible line. Searched with
    // `node tools/ceiling.js --scenario=lastfive --beam=32`, this aeroplane's ceiling is every
    // passenger on about four seeds in five - and `good`, a bot that recruits early and then
    // carries, lands on exactly that number. So the last beat's "you cannot save everybody" is
    // something this flight only sometimes makes true, which is why that beat now checks before
    // it says it. It is a property of the Beechcraft rather than of the tutorial: `sinkthen`
    // does the same thing to the full ten-minute sector, one basin four tiles from the locker is
    // most of the reason, and both are a decision about an aeroplane rather than about a flight.
    const LASTFIVE = {
        id: "lastfive",
        name: K("The last five minutes"),
        blurb: K("Five minutes, nineteen seats, and a cabin that cannot walk itself out. " +
                 "Start here."),
        aircraft: "be1900d",
        seconds: 300,
        // Never. See above.
        blueAt: null,
        tutorial: true,

        // The scenario opens the log rather than the aeroplane, because the thing that has to
        // be said first is not where you are - it is that you are the only one who has looked.
        opening: K("Coastal Link 2231, five minutes out, nineteen souls and no cabin crew. " +
                   "Something has started in the locker above {seat}, and you are the only " +
                   "person on this aeroplane who is looking at it. Almost nobody on here can " +
                   "get themselves off it."),

        open(S) {
            // You have not just this second noticed. You have been watching it for a minute and
            // have got as far as standing up, which is why the cabin is already half-awake and
            // the man sitting under it has already said something.
            //
            // It is worth a fifth of a person at the floor and it is worth a great deal more
            // than that to the ceiling: credibility gates every social action, and without this
            // whether a first flight finds a helper at all comes off the passengers' moods
            // rather than off the player. With it a sensible flight scores 17.7 ± 0.9; without
            // it, 16.1 ± 2.3, which is the same flight with the seed put back in charge of it.
            S.cabinAwareness = Math.max(S.cabinAwareness, 22);
            S.credibility = Math.max(S.credibility, 12);
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
            // The only beat that checks whether it is true before it says it. On a nineteen-seat
            // aeroplane with a fire this size, all eighteen is reachable - not often, but it is -
            // and a flight that ends with every passenger alive under a line saying you cannot
            // save everybody is a tutorial calling the player a liar at the last moment. So it
            // asks the same question the report is about to ask: if the doors opened now, is
            // there anybody this aeroplane is not going to account for.
            { id: "nearly",
              when: (S) => S.clock.remaining <= 40 &&
                           S.pax.some((p) => PRS.scoring.outcomeFor(S, p).key === "lost"),
              line: K("You cannot save everybody, and this is the part where that stops being " +
                      "a sentence in a rulebook.") },
        ],
    };

    const ALL = [LASTFIVE];
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
    PRS.data.scenarios = { ALL, LASTFIVE, byId, ids, check };
})(window);
