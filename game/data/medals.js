// The things you can be found to have done, checked after every action and printed at the
// bottom of the incident report under the heading OTHER OBSERVATIONS.
//
// They are not achievements in the sense of being good. They are the only place the game says
// out loud what it thinks of a strategy, so each one is a sentence about the arithmetic. Seven of
// them are also what turns a character's card over in the log book, and the first time one of
// those is awarded the line says who has become available.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const st = PRS.state;

    const MEDALS = [
        // ------------------------------------------------------------------------ the fire ---
        { id: "first_water", name: "Nine seconds of relief",
          text: "Poured something on the fire. It went out. It came back.",
          when: (S) => S.stats.agentsUsed >= 1 },
        { id: "thirty_agents", name: "Not the point",
          text: "Thirty applications of suppressant. Thirty. The report has counted them.",
          when: (S) => S.stats.agentsUsed >= 30 },
        { id: "starved", name: "Understood the problem",
          text: "Closed the bin instead of fighting the flame, which is what the manual says.",
          when: (S) => S.fire.core.contained > 0.5 },
        { id: "sink", name: "The correct answer",
          text: "Got the case into a sink full of water. Nobody has ever thought of this in time.",
          when: (S) => S.fire.core.inSink },
        { id: "seen_it", name: "Looked at it",
          text: "Actually opened the bin and looked at the thing that is doing all this.",
          when: (S) => S.fire.core.exposed },

        // ------------------------------------------------------------------------- carrying ---
        { id: "first_carry", name: "One",
          text: "Carried one person to safety, which is one more than anybody else did.",
          when: (S) => S.stats.carriesCompleted >= 1 },
        { id: "five_carry", name: "Five",
          text: "Five. On your own. In a corridor full of people telling you to stop.",
          when: (S) => S.stats.carriesCompleted >= 5 },
        { id: "twelve_carry", name: "Twelve",
          text: "Twelve carries. That is the physical limit and you found it.",
          when: (S) => S.stats.carriesCompleted >= 12 },
        { id: "immobile", name: "The ones who could not walk",
          text: "Both wheelchair users were secured. Neither could have done anything alone.",
          when: (S) => S.pax.filter((p) => p.traits.indexOf("immobile") >= 0)
                             .every((p) => p.state === "secured") },
        { id: "child_secured", name: "A child, forward",
          text: "Got one of the children to a safe zone.",
          when: (S) => S.pax.some((p) => PRS.pax.isChild(p) && p.state === "secured") },
        { id: "dog", name: "Bruno",
          text: "The dog got out. This was not free and you knew that.",
          when: (S) => S.pax.filter((p) => p.traits.indexOf("pet") >= 0)
                             .every((p) => p.state === "secured") },

        // -------------------------------------------------------------------------- helpers ---
        { id: "first_helper", name: "The multiplier",
          text: "Recruited one other person. This is worth more than the water bottle.",
          when: (S) => S.stats.helpersRecruited >= 1 },
        { id: "four_helpers", name: "A crew",
          text: "Four helpers, working the cabin without being told twice.",
          when: (S) => S.stats.helpersRecruited >= 4 },
        { id: "eight_helpers", name: "You solved it",
          text: "Eight helpers. This is the actual answer to the puzzle and you found it.",
          when: (S) => S.stats.helpersRecruited >= 8 },
        { id: "helper_carries", name: "Delegation",
          text: "Other people carried more passengers than you did.",
          when: (S) => (S.stats.helperSaves || 0) > S.stats.carriesCompleted &&
                        S.stats.carriesCompleted > 0 },
        { id: "converted_hostile", name: "Turned the worst one round",
          text: "Recruited a passenger who was actively obstructing you.",
          when: (S) => S.pax.some((p) => p.helper && p.traits.indexOf("hostile") >= 0) },

        // ----------------------------------------------------------------------------- crew ---
        { id: "believed", name: "Believed, and quickly",
          text: "Got cabin crew credibility above eighty inside six minutes, which nobody " +
                "manages by talking.",
          when: (S) => S.credibility >= 80 && S.clock.elapsed < 360 },
        { id: "declared", name: "Declared early",
          text: "Had the flight deck declare an emergency inside five minutes, which is " +
                "six minutes before it would have happened on its own.",
          when: (S) => S.crewPhase >= 4 && S.clock.elapsed < 300 },
        { id: "jammed", name: "Asked to sit down, repeatedly",
          text: "Three separate passengers told you, personally, to sit down. The cabin turned " +
                "on you before the fire did.",
          when: (S) => Object.keys(S.stats.sitDownBy || {}).length >= 3 },
        { id: "argued_long", name: "Three minutes of arguing",
          text: "Spent a hundred and eighty seconds of a fifteen minute flight in conversation.",
          when: (S) => S.stats.timeArguing >= 180 },

        // ------------------------------------------------------------------------- yourself ---
        { id: "burned", name: "Burned",
          text: "Took a burn. It made people believe you, which is the worst part.",
          when: (S) => S.player.burns > 20 },

        // ------------------------------------------------------------------------ the score ---
        { id: "ten_souls", name: "Ten souls",
          text: "Ten people were forward and low when it landed because of you.",
          when: (S) => st.securedCount(S) >= 10 },
        { id: "eighteen_souls", name: "Eighteen souls",
          text: "Eighteen. This is a very good run and you should know that.",
          when: (S) => st.securedCount(S) >= 18 },
        { id: "twentytwo_souls", name: "Twenty-two souls",
          text: "Twenty-two. Almost nobody gets here.",
          when: (S) => st.securedCount(S) >= 22 },
        { id: "three_souls", name: "Three souls",
          text: "Three. It was always going to be like this for somebody.",
          when: (S) => S.clock.landed && st.securedCount(S) <= 3 },
    ];

    const BY_ID = {};
    for (const m of MEDALS) BY_ID[m.id] = m;

    function check(S) {
        for (const m of MEDALS) {
            if (S.medals[m.id]) continue;
            let ok = false;
            try { ok = m.when(S); } catch (e) { ok = false; }
            if (!ok) continue;
            S.medals[m.id] = S.clock.elapsed;
            PRS.state.log(S, "◆ " + m.name + " — " + m.text + opens(m.id), "medal");
        }
    }

    /** " Deidre Volk is now available." if this medal turns a card over for the first time. */
    function opens(id) {
        if (!PRS.logbook || !PRS.data.characters) return "";
        const book = PRS.logbook.load();
        const names = PRS.data.characters.CHARACTERS
            .filter((c) => c.unlock && c.unlock.medal === id && !book.medals[id])
            .map((c) => c.name);
        return names.length ? " " + PRS.util.listSentence(names) + " is now available." : "";
    }

    function earned(S) {
        return MEDALS.filter((m) => S.medals[m.id]);
    }

    PRS.medals = { MEDALS, BY_ID, check, earned };
})(window);
