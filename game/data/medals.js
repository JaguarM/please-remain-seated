// The things you can be found to have done, checked after every action and printed at the
// bottom of the incident report under the heading OTHER OBSERVATIONS.
//
// They are not achievements in the sense of being good, and ten of them are the only way to
// unlock the ten characters you do not start with.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const st = PRS.state;

    const has = (S, id) => (S.counts[id] || 0);
    const used = (S, id, n) => has(S, id) >= (n || 1);

    const MEDALS = [
        // ------------------------------------------------------------------------ the fire ---
        { id: "first_water", name: "Nine seconds of relief",
          text: "Poured something on the fire. It went out. It came back.",
          when: (S) => S.stats.agentsUsed >= 1 },
        { id: "ten_agents", name: "Everything in the bag",
          text: "Put ten separate things on a fire that was never going to go out.",
          when: (S) => S.stats.agentsUsed >= 10 },
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
          text: "Actually opened the bin and looked at the thing that is doing all this. " +
                "Deidre Volk is now available.",
          when: (S) => S.fire.core.exposed,
          unlocks: "seen_it" },
        { id: "vent_survivor", name: "Six cells",
          text: "Was standing in the cabin for six separate thermal runaway events.",
          when: (S) => S.fire.core.vented >= 6 },

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
        { id: "child_first", name: "Children first",
          text: "The first person you carried was a child.",
          when: (S) => S.flags.firstCarryChild },
        { id: "heavy", name: "A hundred and one kilos",
          text: "Carried Solly Grubb. Both of you will remember it.",
          when: (S) => { const p = S.pax.filter((q) => q.name === "Solly Grubb")[0];
                         return p && p.state === "secured" && !p.carriedBy; } },
        { id: "immobile", name: "The ones who could not walk",
          text: "Both wheelchair users were secured. Neither could have done anything alone.",
          when: (S) => S.pax.filter((p) => p.traits.indexOf("immobile") >= 0)
                             .every((p) => p.state === "secured") },
        { id: "family", name: "All four Fenwicks",
          text: "The family that would not be separated were not separated.",
          when: (S) => S.pax.filter((p) => p.name.indexOf("Fenwick") >= 0)
                             .every((p) => p.state === "secured") },
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
        { id: "converted_sceptic", name: "Turned one round",
          text: "Recruited somebody who had told you to sit down.",
          when: (S) => S.pax.some((p) => p.helper && p.traits.indexOf("sceptic") >= 0) },
        { id: "converted_hostile", name: "Turned the worst one round",
          text: "Recruited a passenger who was actively obstructing you.",
          when: (S) => S.pax.some((p) => p.helper && p.traits.indexOf("hostile") >= 0) },

        // ----------------------------------------------------------------------------- crew ---
        { id: "believed", name: "Believed, and quickly",
          text: "Got cabin crew credibility above eighty inside six minutes, which nobody " +
                "manages by talking. " +
                "Terrence Ubel is now available.",
          when: (S) => S.credibility >= 80 && S.clock.elapsed < 360,
          unlocks: "believed" },
        { id: "phase3_fast", name: "Four minutes early",
          text: "Had the crew fighting the fire before the eight minute mark.",
          when: (S) => S.crewPhase >= 3 && S.crewPhaseAt < 420 },
        { id: "flight_deck", name: "Through the door",
          text: "Got into the flight deck. Almost nobody gets into the flight deck.",
          when: (S) => S.flags.cockpitOpened },
        { id: "took_halon", name: "Requisitioned",
          text: "Ended up holding a halon bottle you were not supposed to have.",
          when: (S) => S.inventory.some((s) => s.id === "halon_bottle") },
        { id: "argued_long", name: "Three minutes of arguing",
          text: "Spent a hundred and eighty seconds of a fifteen minute flight in conversation.",
          when: (S) => S.stats.timeArguing >= 180 },

        // ------------------------------------------------------------------------- yourself ---
        { id: "burned", name: "Burned",
          text: "Took a burn. It made people believe you, which is the worst part.",
          when: (S) => S.player.burns > 20 },
        { id: "hood_on", name: "Prepared",
          text: "Put on a smoke hood you bought after watching a documentary.",
          when: (S) => st.wearing(S, "hood") },
        { id: "panicking", name: "Ninety",
          text: "Panic reached ninety and your hands still worked. " +
                "Mo Achterberg is now available.",
          when: (S) => S.player.panic >= 90,
          unlocks: "panicking" },
        { id: "calm", name: "Never above thirty",
          text: "Went through the whole thing without your panic reaching thirty.",
          when: (S) => S.clock.landed && S.stats.maxPanic !== undefined && S.stats.maxPanic < 30 },
        { id: "found_vape", name: "The other one",
          text: "Found a second vape, of the same make and with the same cell, in the aft " +
                "lavatory bin, eleven rows from the fire. Somebody put it there and said nothing.",
          when: (S) => !!PRS.state.slotOf(S, "vape") },
        { id: "filmed_it", name: "Content",
          text: "Filmed the fire. The footage is very good. That is the problem.",
          when: (S) => S.stats.filmed >= 3 },

        // -------------------------------------------------------------------------- absurd ---
        { id: "call_button", name: "Forty times",
          text: "Pressed the call button forty times. It was heard. It was ignored.",
          when: (S) => has(S, "crew.call_button") >= 40 },

        // ------------------------------------------------ the ones that open a character ------
        { id: "five_down", name: "Sixteen went quiet",
          text: "Sixteen people on this aeroplane stopped coughing and stopped moving, and " +
                "you were still upright at the end of it. " +
                "Dr Priya Ansel is now available.",
          when: (S) => st.downCount(S) >= 16, unlocks: "five_down" },
        { id: "carried_heavy", name: "Ninety kilos",
          text: "Got somebody who weighs more than ninety kilos moving, by lifting them or " +
                "by dragging them because you could not. Gordy Mach is now available.",
          when: (S) => !!S.flags.carriedHeavy, unlocks: "carried_heavy" },
        { id: "declared", name: "Declared early",
          text: "Had the flight deck declare an emergency inside five minutes, which is " +
                "six minutes before it would have happened on its own. " +
                "Captain Nell Rusk is now available.",
          when: (S) => S.crewPhase >= 4 && S.clock.elapsed < 300, unlocks: "declared" },
        { id: "child_secured", name: "A child, forward",
          text: "Got one of the children to a safe zone. " +
                "Yuki Tanaka-Brandt is now available.",
          when: (S) => S.pax.some((p) => PRS.pax.isChild(p) && p.state === "secured"),
          unlocks: "child_secured" },
        { id: "jammed", name: "Asked to sit down, repeatedly",
          text: "Three separate passengers told you, personally, to sit down. The cabin " +
                "turned on you before the fire did. Dale Kowalczyk is now available.",
          when: (S) => (S.stats.sitDowns || 0) >= 3, unlocks: "jammed" },

        // ------------------------------------------------------------------------ the score ---
        { id: "ten_souls", name: "Ten souls",
          text: "Ten people were forward and low when it landed because of you.",
          when: (S) => st.securedCount(S) >= 10 },
        { id: "eighteen_souls", name: "Eighteen souls",
          text: "Eighteen. This is a very good run and you should know that.",
          when: (S) => st.securedCount(S) >= 18 },
        { id: "twentytwo_souls", name: "Twenty-two souls",
          text: "Twenty-two. Almost nobody gets here. Beverley Crane is now available.",
          when: (S) => st.securedCount(S) >= 22, unlocks: "beverley" },
        { id: "three_souls", name: "Three souls",
          text: "Three. It was always going to be like this for somebody. " +
                "Nils Ottersen is now available.",
          when: (S) => S.clock.landed && st.securedCount(S) <= 3, unlocks: "nils" },
        { id: "everyone", name: "All sixty-one",
          text: "Every soul on board. This is not possible. The report would like a word.",
          when: (S) => st.securedCount(S) >= 61 },
    ];

    const BY_ID = {};
    for (const m of MEDALS) BY_ID[m.id] = m;

    function check(S) {
        S.stats.maxPanic = Math.max(S.stats.maxPanic || 0, S.player.panic);
        for (const m of MEDALS) {
            if (S.medals[m.id]) continue;
            let ok = false;
            try { ok = m.when(S); } catch (e) { ok = false; }
            if (!ok) continue;
            S.medals[m.id] = S.clock.elapsed;
            PRS.state.log(S, "◆ " + m.name + " — " + m.text, "medal");
            if (m.unlocks) unlock(m.unlocks);
        }
    }

    function unlock(id) {
        const owned = PRS.util.store.get("unlocked", {});
        if (owned[id]) return false;
        owned[id] = true;
        PRS.util.store.set("unlocked", owned);
        return true;
    }

    function unlocked(id) {
        const owned = PRS.util.store.get("unlocked", {});
        return !!owned[id];
    }

    function earned(S) {
        return MEDALS.filter((m) => S.medals[m.id]);
    }

    PRS.medals = { MEDALS, BY_ID, check, unlock, unlocked, earned };
})(window);
