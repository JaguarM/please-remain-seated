// Six ways for fifteen minutes to end.
//
// None of them is "you put the fire out", because the fire does not go out, and none of them is a
// clean win, because there is no arrangement of sixty seats and nine hundred seconds that gets
// everybody off. The best ending in the file is called The Ones Who Walked Off and it is about
// the people you recruited. That is the game being honest with you rather than being cruel.
//
// They are checked in order and the first one that fits wins, so the strange ones sit at the top.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;

    const ENDINGS = [
        {
            id: "gone",
            title: K("PASSENGER NOT ACCOUNTED FOR"),
            when: (S, R) => R.you.outcome === "lost",
            text(S, R) {
                return T("You went down in the aisle at {when} into the descent, somewhere " +
                         "around row {row}, with {hands}.",
                         { when: PRS.util.mmss(S.player.downedAt || 0),
                           row: PRS.cabin.rowAt(S.player.x) || 14,
                           hands: S.player.carrying.length ? T("somebody in your arms")
                                                           : T("your hands empty") }) +
                    "\n\n" +
                    T("The report will note that you were the first person on board to identify " +
                      "the source of the fire, and that you identified it eleven minutes before " +
                      "the crew did, and that this is in the transcript because {why}.",
                      { why: R.survivors
                          ? T("{n} people are alive to say so", { n: R.survivors })
                          : T("the cabin interphone recorded you saying it") }) +
                    "\n\n" +
                    T("It will not note that nobody listened, because the report does not have " +
                      "a field for that.");
            },
        },
        {
            id: "sink",
            title: K("THE ONE THING THAT WORKED"),
            when: (S, R) => S.fire.core.inSink,
            text(S, R) {
                return T("You got the case into a lavatory sink and you filled the sink.") +
                    "\n\n" +
                    T("It did not put the fire out. Nothing puts that fire out; there were {n} " +
                      "cells left in the pack when the wheels touched and every one of them was " +
                      "still going to go. But a cell venting under nine centimetres of water is " +
                      "a noise and some steam, and a cell venting in an overhead locker is a " +
                      "cabin full of hydrogen fluoride.", { n: S.fire.core.cells }) +
                    "\n\n" +
                    T("{n} people got off this aeroplane alive and {walked} of them walked. Some " +
                      "of those are breathing because of where somebody put them down, and some " +
                      "of them are breathing because of a tap.",
                      { n: R.survivors, walked: R.tally.unhurt }) +
                    "\n\n" +
                    T("Nobody will ever know that you did this. It is not visible in any " +
                      "photograph of the aeroplane.");
            },
        },
        {
            id: "delegated",
            title: K("THE ONES WHO WALKED OFF"),
            when: (S, R) => R.byHelpers >= 10 && R.survivors >= 44,
            text(S, R) {
                return T("You recruited {n} people.", { n: S.stats.helpersRecruited }) +
                    "\n\n" +
                    T("Between them they moved {them} passengers out of the rows. You moved " +
                      "{you}. You spent most of the last four minutes not carrying anybody, " +
                      "because you were pointing, and pointing turned out to be the " +
                      "highest-value action available on this aeroplane.",
                      { them: R.byHelpers, you: R.byYou }) +
                    "\n\n" +
                    T("{n} of sixty got off alive. {walked} walked. {lost}",
                      { n: R.survivors, walked: R.tally.unhurt,
                        lost: R.lost ? T("{n} did not.", { n: R.lost })
                                     : T("Everybody who was on this aeroplane got off this " +
                                         "aeroplane.") }) +
                    "\n\n" +
                    T("In eleven of the statements taken afterward, the passenger being " +
                      "interviewed describes themselves as the person who helped, and not one " +
                      "of them mentions you. This is the correct outcome and you would not " +
                      "change it.");
            },
        },
        {
            id: "nobody",
            title: K("PLEASE REMAIN SEATED"),
            when: (S, R) => R.moved === 0,
            text(S, R) {
                return T("You did not move one person.") + "\n\n" +
                    T("{actions} actions. Nine hundred seconds. {poured} things poured on a fire " +
                      "that was never going to go out, and {secs} seconds spent explaining to " +
                      "people who did not want to be explained to.",
                      { actions: S.actions.length, poured: S.stats.agentsUsed,
                        secs: Math.round(S.stats.timeArguing) }) +
                    "\n\n" +
                    T("{walked} walked off, {treated} went to hospital, {serious} stayed there, " +
                      "and {lost} did not.",
                      { walked: R.tally.unhurt, treated: R.tally.treated,
                        serious: R.tally.serious, lost: R.lost }) +
                    "\n\n" +
                    T("The cabin crew's report describes you as “obstructive”. It is going to be " +
                      "eight months before anybody reads the maintenance log and works out what " +
                      "was in the bin, and by then everybody will have agreed on a version of " +
                      "this afternoon that does not have you in it.");
            },
        },
        {
            id: "carried",
            title: K("WHAT ONE PERSON CAN CARRY"),
            when: (S, R) => R.byYou >= 8,
            text(S, R) {
                return T("You carried {n} people the length of an aeroplane, one at a time, " +
                         "through smoke, past a trolley, with {burns} on the burn scale and " +
                         "{smoke} on the other one.",
                         { n: R.byYou, burns: Math.round(S.player.burns),
                           smoke: Math.round(S.player.smokeDose) }) +
                    "\n\n" +
                    T("It is a physical limit and you found it. There was no arrangement of " +
                      "those nine hundred seconds in which your arms got to {n}.",
                      { n: R.byYou + 1 }) +
                    "\n\n" +
                    T("{n} got off alive, {walked} walked, {lost} not accounted for.",
                      { n: R.survivors, walked: R.tally.unhurt, lost: R.lost }) +
                    "\n\n" +
                    T("The thing you will think about, for years, is that four rows behind the " +
                      "last person you carried there were eleven people who would have walked " +
                      "if somebody had told them to.");
            },
        },
        {
            id: "default",
            title: K("INCIDENT CONCLUDED"),
            when: () => true,
            text(S, R) {
                return T("The aeroplane landed. It always lands. That was never the question.") +
                    "\n\n" +
                    T("{moved} people were out of their seats and on the floor when it did. " +
                      "{walked} walked off unaided, {treated} were taken to hospital and " +
                      "released, {serious} were taken to hospital and kept, and {lost} were not " +
                      "accounted for.",
                      { moved: R.moved, walked: R.tally.unhurt, treated: R.tally.treated,
                        serious: R.tally.serious, lost: R.lost }) +
                    "\n\n" +
                    T("The fire vented {vented} cells of a pack of nine. There were {left} left " +
                      "when the doors opened, and they went in the aircraft rescue foam nine " +
                      "minutes later, one at a time, popping, while sixty people stood on a " +
                      "taxiway in the rain and watched.",
                      { vented: R.fire.vented, left: R.fire.cellsLeft }) +
                    "\n\n" +
                    T("You were right about the bin at {you} into the descent. Nobody else was " +
                      "right about the bin until {them}.",
                      { you: PRS.util.mmss(0),
                        them: S.crewPhaseAt ? PRS.util.mmss(S.crewPhaseAt) : T("the ground") });
            },
        },
    ];

    function pick(S, result) {
        for (const e of ENDINGS) {
            let ok = false;
            try { ok = e.when(S, result); } catch (err) { ok = false; }
            if (ok) return { id: e.id, title: e.title, text: e.text(S, result) };
        }
        const last = ENDINGS[ENDINGS.length - 1];
        return { id: last.id, title: last.title, text: last.text(S, result) };
    }

    PRS.endings = { ENDINGS, pick };
})(window);
