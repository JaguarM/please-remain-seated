// The things you can be found to have done, checked after every action and once more at
// touchdown, and printed at the bottom of the incident report under the heading OTHER
// OBSERVATIONS.
//
// They are not achievements in the sense of being good. They are the only place the game says
// out loud what it thinks of a strategy, so each one is a sentence about the arithmetic. Seven of
// them are also what turns a character's card over in the log book, and the first time one of
// those is awarded the line says who has become available.
//
// The seven that turn a card over also carry `near`, which says how far this flight got towards
// them - four of five carries, two of three people telling you to sit down - so the unlock screen
// can print the one you came closest to instead of a wall of things you have not done.
//
// A few ids are older than what they now measure. Log books written when the game counted
// "secured" souls have `ten_souls` and `twentytwo_souls` in them, and the cards those turned over
// should stay turned over, so the ids stayed and the sentences changed.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;

    /** The manifest, once there is one. Medals about how it ended wait for it. */
    const landed = (S) => S.result || null;
    const outOfTheRows = (S, trait) => S.pax.filter((p) => p.traits.indexOf(trait) >= 0);

    const MEDALS = [
        // ------------------------------------------------------------------------ the fire ---
        { id: "first_water", name: K("Nine seconds of relief"),
          text: K("Poured something on the fire. It went out. It came back."),
          when: (S) => S.stats.agentsUsed >= 1 },
        { id: "thirty_agents", name: K("Not the point"),
          text: K("Thirty applications of suppressant. Thirty. The report has counted them."),
          when: (S) => S.stats.agentsUsed >= 30 },
        { id: "starved", name: K("Understood the problem"),
          text: K("Closed the bin instead of fighting the flame, which is what the manual says."),
          when: (S) => S.fire.core.contained > 0.5 },
        { id: "sink", name: K("The correct answer"),
          text: K("Got the case into a sink full of water. Nobody has ever thought of this in time."),
          when: (S) => S.fire.core.inSink },
        { id: "seen_it", name: K("Looked at it"),
          text: K("Actually opened the bin and looked at the thing that is doing all this."),
          when: (S) => S.fire.core.exposed,
          near: (S) => ({ have: S.fire.core.exposed ? 1 : 0, need: 1,
                          note: K("bins opened and looked into") }) },
        { id: "grabbed", name: K("Held back"),
          text: K("Somebody you had soaked got hold of your arm. They were sitting under the fire " +
                "too."),
          when: (S) => (S.stats.grabbed || 0) >= 1 },

        // ------------------------------------------------------------------------- carrying ---
        { id: "first_carry", name: K("One"),
          text: K("Carried one person out of the rows, which is one more than anybody else did."),
          when: (S) => S.stats.carriesCompleted >= 1 },
        { id: "five_carry", name: K("Five"),
          text: K("Five. On your own. In a corridor full of people telling you to stop."),
          when: (S) => S.stats.carriesCompleted >= 5,
          near: (S) => ({ have: S.stats.carriesCompleted, need: 5,
                          note: K("carried out of the rows") }) },
        { id: "twelve_carry", name: K("Twelve"),
          text: K("Twelve carries. That is the physical limit and you found it."),
          when: (S) => S.stats.carriesCompleted >= 12 },
        { id: "immobile", name: K("The ones who could not walk"),
          text: K("Both wheelchair users were moved out of their rows, and both of them got off."),
          when: (S) => landed(S) && outOfTheRows(S, "immobile")
                             .every((p) => p.moved && p.outcome !== "lost") },
        { id: "child_secured", name: K("A child, forward"),
          text: K("Got one of the children out of the rows and down on the floor by a door."),
          when: (S) => S.pax.some((p) => PRS.pax.isChild(p) && p.moved && p.state !== "dead"),
          near: (S) => ({ have: S.pax.filter((p) => PRS.pax.isChild(p) && p.moved).length,
                          need: 1, note: K("children moved forward") }) },
        { id: "dog", name: K("Bruno"),
          text: K("The dog got out. This was not free and you knew that."),
          when: (S) => landed(S) && outOfTheRows(S, "pet")
                             .every((p) => p.moved && p.outcome !== "lost") },

        // -------------------------------------------------------------------------- helpers ---
        { id: "first_helper", name: K("The multiplier"),
          text: K("Recruited one other person. This is worth more than the water bottle."),
          when: (S) => S.stats.helpersRecruited >= 1 },
        { id: "four_helpers", name: K("A crew"),
          text: K("Four helpers, working the cabin without being told twice."),
          when: (S) => S.stats.helpersRecruited >= 4,
          near: (S) => ({ have: S.stats.helpersRecruited, need: 4,
                          note: K("people working the cabin for you") }) },
        { id: "eight_helpers", name: K("You solved it"),
          text: K("Eight helpers. This is the actual answer to the puzzle and you found it."),
          when: (S) => S.stats.helpersRecruited >= 8 },
        { id: "helper_carries", name: K("Delegation"),
          text: K("Other people moved more passengers than you did."),
          when: (S) => (S.stats.helperSaves || 0) > S.stats.carriesCompleted &&
                        S.stats.carriesCompleted > 0 },
        { id: "converted_hostile", name: K("Turned the worst one round"),
          text: K("Recruited a passenger who was actively obstructing you."),
          when: (S) => S.pax.some((p) => p.helper && p.traits.indexOf("hostile") >= 0) },

        // ----------------------------------------------------------------------------- crew ---
        { id: "believed", name: K("Believed, and quickly"),
          text: K("Got cabin crew credibility above eighty inside six minutes, which nobody " +
                "manages by talking."),
          when: (S) => S.credibility >= 80 && S.clock.elapsed < 360 },
        { id: "declared", name: K("Declared early"),
          text: K("Had the flight deck declare an emergency inside five minutes, which is " +
                "six minutes before it would have happened on its own."),
          when: (S) => S.crewPhase >= 4 && S.clock.elapsed < 300,
          // Inside the five minutes only. The flight deck declares on its own at minute
          // eleven and a card that said 4 of 4 for that would be a lie with a bar under it.
          near: (S) => ({ have: S.clock.elapsed < 300 ? Math.min(S.crewPhase, 4) : 0, need: 4,
                          note: K("steps towards the flight deck, inside five minutes") }) },
        { id: "jammed", name: K("Asked to sit down, repeatedly"),
          text: K("Three separate passengers told you, personally, to sit down. The cabin turned " +
                "on you before the fire did."),
          when: (S) => Object.keys(S.stats.sitDownBy || {}).length >= 3,
          near: (S) => ({ have: Object.keys(S.stats.sitDownBy || {}).length, need: 3,
                          note: K("people who told you to sit down") }) },
        { id: "argued_long", name: K("Three minutes of arguing"),
          text: K("Spent a hundred and eighty seconds of a fifteen minute flight in conversation."),
          when: (S) => S.stats.timeArguing >= 180 },

        // ------------------------------------------------------------------------- yourself ---
        { id: "burned", name: K("Burned"),
          text: K("Took a burn. It made people believe you, which is the worst part."),
          when: (S) => S.player.burns > 20 },

        // ------------------------------------------------------------------------ the score ---
        { id: "ten_souls", name: K("Forty"),
          text: K("Forty people got off this aeroplane alive."),
          when: (S) => landed(S) && S.result.survivors >= 40 },
        { id: "eighteen_souls", name: K("Forty-eight"),
          text: K("Forty-eight. This is a very good flight and you should know that."),
          when: (S) => landed(S) && S.result.survivors >= 48 },
        { id: "twentytwo_souls", name: K("Fifty-two"),
          text: K("Fifty-two. Almost nobody gets here."),
          when: (S) => landed(S) && S.result.survivors >= 52,
          near: (S) => ({ have: landed(S) ? S.result.survivors : 0, need: 52,
                          note: K("off alive") }) },
        { id: "three_souls", name: K("Half"),
          text: K("Half the cabin, or fewer. It was always going to be like this for somebody."),
          when: (S) => landed(S) && S.result.survivors <= 30 },
    ];

    const BY_ID = {};
    for (const m of MEDALS) BY_ID[m.id] = m;

    function check(S) {
        for (const m of MEDALS) {
            if (S.medals[m.id]) continue;
            // How near it is right now, kept if it is the nearest it has been. Read at the end
            // instead, a medal with a clock on it would report the four steps up the chain you
            // took at minute nine as though they had been the four it wanted at minute four.
            if (m.near && S.nearly) {
                let got = null;
                try { got = m.near(S); } catch (e) { got = null; }
                const best = S.nearly[m.id];
                if (got && got.need && (!best || got.have > best.have)) S.nearly[m.id] = got;
            }
            let ok = false;
            try { ok = m.when(S); } catch (e) { ok = false; }
            if (!ok) continue;
            S.medals[m.id] = S.clock.elapsed;
            PRS.state.log(S, T("◆ {name} — {text}",
                               { name: T(m.name), text: T(m.text) }) + opens(m.id), "medal");
        }
    }

    /** " Deidre Volk is now available." if this medal turns a card over for the first time. */
    function opens(id) {
        if (!PRS.logbook || !PRS.data.characters) return "";
        const book = PRS.logbook.load();
        const names = PRS.data.characters.CHARACTERS
            .filter((c) => c.unlock && c.unlock.medal === id && !book.medals[id])
            .map((c) => c.name);
        return names.length
            ? T(" {who} is now available.", { who: PRS.util.listSentence(names) })
            : "";
    }

    function earned(S) {
        return MEDALS.filter((m) => S.medals[m.id]);
    }

    PRS.medals = { MEDALS, BY_ID, check, earned };
})(window);
