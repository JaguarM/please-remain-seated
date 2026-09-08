// Forty-eight things you can be found to have done, checked after every action and printed at
// the bottom of the incident report under the heading OTHER OBSERVATIONS.
//
// They are not achievements in the sense of being good. About a third of them are the report
// noticing something embarrassing, and two of them are the only way to unlock the last two
// characters.
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
        { id: "accelerant", name: "Chemically illiterate",
          text: "Put an alcohol on a fire, on purpose, having been told.",
          when: (S) => used(S, "fire.gin") || used(S, "fire.perfume") || used(S, "fire.sanitiser") },
        { id: "all_three", name: "The complete duty free",
          text: "Spirits, perfume and hand gel. All three. In one flight.",
          when: (S) => used(S, "fire.gin") && used(S, "fire.perfume") && used(S, "fire.sanitiser") },
        { id: "starved", name: "Understood the problem",
          text: "Closed the bin instead of fighting the flame, which is what the manual says.",
          when: (S) => S.fire.core.contained > 0.5 },
        { id: "sink", name: "The correct answer",
          text: "Got the case into a sink full of water. Nobody has ever thought of this in time.",
          when: (S) => S.fire.core.inSink },
        { id: "seen_it", name: "Looked at it",
          text: "Actually opened the bin and looked at the thing that is doing all this.",
          when: (S) => S.fire.core.exposed },
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
        { id: "believed", name: "Believed",
          text: "Got cabin crew credibility above eighty. It took most of the flight.",
          when: (S) => S.credibility >= 80 },
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
          text: "Panic reached ninety and your hands still worked.",
          when: (S) => S.player.panic >= 90 },
        { id: "calm", name: "Never above thirty",
          text: "Went through the whole thing without your panic reaching thirty.",
          when: (S) => S.clock.landed && S.stats.maxPanic !== undefined && S.stats.maxPanic < 30 },
        { id: "never_sat", name: "Never sat down",
          text: "Was asked to sit down repeatedly and did not, once.",
          when: (S) => S.clock.landed && !has(S, "self.sit") },
        { id: "sat_down", name: "Sat down",
          text: "Was asked to sit down, and did.",
          when: (S) => used(S, "self.sit") },
        { id: "filmed_it", name: "Content",
          text: "Filmed the fire. The footage is very good. That is the problem.",
          when: (S) => S.stats.filmed >= 3 },

        // -------------------------------------------------------------------------- absurd ---
        { id: "harmonica", name: "Played the harmonica",
          text: "Played a harmonica in a burning cabin. There are witnesses.",
          when: (S) => used(S, "desperate.harmonica") },
        { id: "named_it", name: "Named the fire",
          text: "Gave the fire a name. The report has recorded the name.",
          when: (S) => !!S.flags.fireName },
        { id: "apologised", name: "Apologised to the fire",
          text: "Apologised. To the fire. Out loud. In front of people.",
          when: (S) => used(S, "desperate.apologise") },
        { id: "gerald", name: "Released Gerald",
          text: "Released an iguana into a cabin that was already having a difficult afternoon.",
          when: (S) => !!S.flags.iguanaOut },
        { id: "gun", name: "Discharged a firearm",
          text: "Fired a gun. Inside an aeroplane. That was on fire.",
          when: (S) => S.stats.gunShots > 0 },
        { id: "slide", name: "Deployed a slide",
          text: "Deployed an evacuation slide at altitude. The airline will be writing to you.",
          when: (S) => S.cabinFlags.slideDeployed },
        { id: "call_button", name: "Forty times",
          text: "Pressed the call button forty times. It was heard. It was ignored.",
          when: (S) => has(S, "crew.call_button") >= 40 },
        { id: "ate_pretzels", name: "Ate the pretzels",
          text: "Ate the pretzels yourself, during, standing up.",
          when: (S) => used(S, "self.pretzels") },

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
