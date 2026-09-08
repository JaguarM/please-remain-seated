// Fourteen ways for fifteen minutes to end.
//
// None of them is "you put the fire out", because the fire does not go out, and none of them is a
// clean win, because there is no arrangement of sixty seats and nine hundred seconds that gets
// everybody off. The best ending in the file is called The Ones Who Walked Off and it is about
// eleven people. That is the game being honest with you rather than being cruel to you.
//
// They are checked in order and the first one that fits wins, so the strange ones sit at the top.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const st = PRS.state;

    const ENDINGS = [
        {
            id: "gone",
            title: "PASSENGER NOT ACCOUNTED FOR",
            when: (S, R) => R.you.outcome === "lost",
            text(S, R) {
                return "You went down in the aisle at " + PRS.util.mmss(S.player.downedAt || 0) +
                    " into the descent, somewhere around row " +
                    (PRS.cabin.rowAt(S.player.x) || 14) + ", with " +
                    (S.player.carrying.length ? "somebody in your arms" : "your hands empty") +
                    ".\n\nThe report will note that you were the first person on board to " +
                    "identify the source of the fire, and that you identified it eleven minutes " +
                    "before the crew did, and that this is in the transcript because " +
                    (R.secured ? R.secured + " people are alive to say so" :
                     "the cabin interphone recorded you saying it") + ".\n\n" +
                    "It will not note that nobody listened, because the report does not have a " +
                    "field for that.";
            },
        },
        {
            id: "harmonica",
            title: "THE HARMONICA",
            when: (S, R) => (S.counts["desperate.harmonica"] || 0) >= 3,
            text(S, R) {
                return "You played the harmonica three times on a burning aeroplane.\n\n" +
                    "Sixty-one people were on board. " + R.secured + " of them were forward and " +
                    "low when it landed. Every single one of the survivors, in every single one " +
                    "of their statements, mentions the harmonica. Not the fire. Not the smoke. " +
                    "Not the eleven-year-old you carried past four rows of people who were " +
                    "telling you to sit down.\n\nThe harmonica.\n\n" +
                    "The investigator's note reads, in full: “Witnesses consistent.”";
            },
        },
        {
            id: "gerald",
            title: "GERALD",
            when: (S, R) => S.flags.iguanaOut && R.secured >= 4,
            text(S, R) {
                return "At six minutes and forty seconds you released an iguana into a cabin " +
                    "with a fire in it.\n\nWithin ninety seconds, eleven passengers who had " +
                    "refused to acknowledge a fire were standing in the aisle. Four of them were " +
                    "on their seats. Two had opened the overhead bins. One had found the smoke.\n\n" +
                    R.secured + " souls were secured forward, and the reason " +
                    "the cabin finally moved was not the smoke detector, the halon, the public " +
                    "address system or you.\n\nGerald was recovered on the ground, unharmed, from " +
                    "the flight deck door handle. He has been retired from service.";
            },
        },
        {
            id: "gunfire",
            title: "DISCHARGE OF A FIREARM",
            when: (S, R) => S.stats.gunShots > 0,
            text(S, R) {
                return "A firearm was discharged " + PRS.util.plural(S.stats.gunShots, "time") +
                    " inside the pressure hull of an aircraft in flight, in the presence of an " +
                    "uncontained fire.\n\n" + R.secured + " souls were secured forward. The " +
                    "report is not going to talk about that part. The report is going to be " +
                    "about the other part, for four hundred pages, and there is going to be a " +
                    "second report about how the first report was handled.\n\n" +
                    "You were right about the bin. That is going to come up in about eighteen " +
                    "months and it is going to be a footnote.";
            },
        },
        {
            id: "slide",
            title: "DOOR IN THE FLIGHT REGIME",
            when: (S, R) => S.cabinFlags.slideDeployed,
            text(S, R) {
                return "You operated a door handle at altitude. It did not open, because it " +
                    "cannot open, because there are four hundred kilonewtons of differential " +
                    "pressure holding it shut and the handle is a very good handle.\n\n" +
                    "What it did do was disarm, arm, and fire a slide pack into the cabin.\n\n" +
                    "The slide is now the largest object in the aeroplane. It is between rows 14 " +
                    "and 18. Everything aft of it is aft of it.\n\n" + R.secured +
                    " souls were secured, all of them from the forward side, and " + R.lost +
                    " were not, all of them from the other one.";
            },
        },
        {
            id: "sink",
            title: "THE ONE THING THAT WORKED",
            when: (S, R) => S.fire.core.inSink,
            text(S, R) {
                return "You got the case into a lavatory sink and you filled the sink.\n\n" +
                    "It did not put the fire out. Nothing puts that fire out; there were " +
                    S.fire.core.cells + " cells left in the pack when the wheels touched and " +
                    "every one of them was still going to go. But a cell venting under nine " +
                    "centimetres of water is a noise and some steam, and a cell venting in an " +
                    "overhead locker is a cabin full of hydrogen fluoride.\n\n" +
                    R.tally.unhurt + " people walked off this aeroplane. " + R.secured + " of " +
                    "them were where they were because of you, and the other " +
                    (R.tally.unhurt - Math.min(R.tally.unhurt, R.secured)) +
                    " were where they were because of a tap.\n\n" +
                    "Nobody will ever know that you did this. It is not visible in any photograph " +
                    "of the aeroplane.";
            },
        },
        {
            id: "delegated",
            title: "THE ONES WHO WALKED OFF",
            when: (S, R) => R.byHelpers >= 6 && R.secured >= 14,
            text(S, R) {
                return "You recruited " + S.stats.helpersRecruited + " people.\n\n" +
                    "Between them they moved " + R.byHelpers + " passengers forward. You moved " +
                    R.byYou + ". You spent most of the last four minutes not carrying anybody, " +
                    "because you were pointing, and pointing turned out to be the highest-value " +
                    "action available on this aeroplane.\n\n" + R.secured + " souls secured. " +
                    R.tally.unhurt + " walked off. " + (R.lost ? R.lost + " did not." :
                    "Everybody who was on this aeroplane got off this aeroplane.") + "\n\n" +
                    "In eleven of the statements taken afterward, the passenger being interviewed " +
                    "describes themselves as the person who helped, and not one of them mentions " +
                    "you. This is the correct outcome and you would not change it.";
            },
        },
        {
            id: "believed_late",
            title: "SIX MINUTES",
            when: (S, R) => S.credibility >= 75 && S.crewPhaseAt > 480,
            text(S, R) {
                return "They believed you at " + PRS.util.mmss(S.crewPhaseAt) + ".\n\n" +
                    "Everything after that went well. The crew were fast, the halon was where it " +
                    "needed to be, the flight deck declared, and the aeroplane was on the ground " +
                    "inside four minutes of the call. The procedure, once it started, was " +
                    "excellent.\n\n" + "It started six minutes late, and the six minutes are the " +
                    "whole report. " + R.secured + " secured, " + R.tally.treated + " to hospital, " +
                    R.lost + " not accounted for.\n\n" +
                    "The recommendation, when it comes, will be one sentence long and it will be " +
                    "about believing passengers.";
            },
        },
        {
            id: "duty_free",
            title: "AN ACCELERANT EVENT",
            when: (S, R) => (S.counts["fire.gin"] || 0) + (S.counts["fire.perfume"] || 0) +
                            (S.counts["fire.sanitiser"] || 0) >= 3,
            text(S, R) {
                return "Three separate times, you put an alcohol on a fire.\n\n" +
                    "The gin was forty per cent. The perfume was eighty. The hand gel was " +
                    "seventy and it burns with a flame you cannot see in a lit cabin, which is " +
                    "why you did it twice.\n\n" +
                    "The fire reached " + R.fire.peak + " on a scale where thirty is a seat and " +
                    "seventy is a row. " + R.secured + " souls were secured forward and " +
                    R.lost + " were not.\n\n" +
                    "You were the only person on this aeroplane who saw the fire coming. You were " +
                    "also, and the report will have to find a way to say both of these things, " +
                    "the largest single contributor to its growth.";
            },
        },
        {
            id: "content",
            title: "FORTY MILLION VIEWS",
            when: (S, R) => S.character.id === "kip" && S.stats.filmed >= 4,
            text(S, R) {
                return "The footage is nine minutes and eleven seconds long and it is the best " +
                    "thing that has ever been filmed inside an aeroplane.\n\n" +
                    "It is also the only continuous record of the event, so it is Exhibit 1, and " +
                    "it is going to be watched frame by frame by people who do this for a living " +
                    "and who are going to be able to say exactly when the bin went and exactly " +
                    "how long it took anybody to move.\n\n" + R.secured + " souls secured. " +
                    "You carried " + R.byYou + " of them yourself, with one hand, filming with " +
                    "the other, and the comments are going to be about that.\n\n" +
                    "Your channel is going to be very large and you are never going to enjoy it.";
            },
        },
        {
            id: "denial",
            title: "THERE WAS NO FIRE",
            when: (S, R) => S.character.id === "nils" && !S.player.lookedAtFire,
            text(S, R) {
                return "You never looked.\n\nFifteen minutes, a smell, a haze, a woman shouting " +
                    "about a bin, and at no point did you stand up and put your eyes on it, " +
                    "because you knew what it was. You have known what things are for forty-four " +
                    "years and you have been right nearly every time.\n\n" +
                    R.lost + " souls were not accounted for.\n\n" +
                    "In your statement you say the crew handled it well. In your statement you " +
                    "say there was a great deal of unnecessary panic. In your statement you use " +
                    "the phrase “one individual in particular”.\n\n" +
                    "You are describing the person who carried your neighbour off.";
            },
        },
        {
            id: "nobody",
            title: "PLEASE REMAIN SEATED",
            when: (S, R) => R.secured === 0,
            text(S, R) {
                return "You did not move one person.\n\n" + S.actions.length + " actions. " +
                    "Nine hundred seconds. " + S.stats.agentsUsed + " things poured on a fire " +
                    "that was never going to go out, and " + Math.round(S.stats.timeArguing) +
                    " seconds spent explaining to people who did not want to be explained to.\n\n" +
                    R.tally.unhurt + " walked off, " + R.tally.treated + " went to hospital, and " +
                    R.lost + " did not.\n\n" +
                    "The cabin crew's report describes you as “obstructive”. It is going to be " +
                    "eight months before anybody reads the maintenance log and works out what " +
                    "was in the bin, and by then everybody will have agreed on a version of this " +
                    "afternoon that does not have you in it.";
            },
        },
        {
            id: "carried",
            title: "WHAT ONE PERSON CAN CARRY",
            when: (S, R) => R.byYou >= 8,
            text(S, R) {
                return "You carried " + R.byYou + " people the length of an aeroplane, one at a " +
                    "time, through smoke, past a trolley, over " +
                    (S.counts["move.over_seats"] || 0) + " rows of seats, with " +
                    Math.round(S.player.burns) + " on the burn scale and " +
                    Math.round(S.player.smokeDose) + " on the other one.\n\n" +
                    "It is a physical limit and you found it. There was no arrangement of those " +
                    "nine hundred seconds in which your arms got to " + (R.byYou + 1) + ".\n\n" +
                    R.secured + " secured, " + R.tally.unhurt + " walked off, " + R.lost +
                    " not accounted for.\n\n" +
                    "The thing you will think about, for years, is that four rows behind the " +
                    "last person you carried there were eleven people who would have walked if " +
                    "somebody had told them to.";
            },
        },
        {
            id: "default",
            title: "INCIDENT CONCLUDED",
            when: () => true,
            text(S, R) {
                return "The aeroplane landed. It always lands. That was never the question.\n\n" +
                    R.secured + " souls were secured forward and low. " + R.tally.unhurt +
                    " walked off unaided, " + R.tally.treated + " were taken to hospital and " +
                    "released, " + R.tally.serious + " were taken to hospital and kept, and " +
                    R.lost + " were not accounted for.\n\n" +
                    "The fire vented " + R.fire.vented + " cells of a pack of nine. There were " +
                    R.fire.cellsLeft + " left when the doors opened, and they went in the " +
                    "aircraft rescue foam nine minutes later, one at a time, popping, while " +
                    "sixty people stood on a taxiway in the rain and watched.\n\n" +
                    "You were right about the bin at " + PRS.util.mmss(0) + " into the descent. " +
                    "Nobody else was right about the bin until " +
                    (S.crewPhaseAt ? PRS.util.mmss(S.crewPhaseAt) : "the ground") + ".";
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
