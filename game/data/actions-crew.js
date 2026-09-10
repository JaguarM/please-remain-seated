// Deck: CREW. They have the halon, the hoods, the interphone, the manual and the authority, and
// you have none of those things. Everything in this deck is you trying to move a procedure.
//
// The lever is `credibility`, and credibility is slow: nobody sensible believes a passenger who
// is out of their seat during the meal service pointing at a closed locker. What moves it fast is
// evidence - a photograph, an open bin, a burn on your hand, the smoke detector - and what moves
// it slowly is talking, which is most of this deck.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const C = PRS.crew;

    function near(S) {
        return C.adjacentCrew(S).map((c) => ({ key: c.id, c: c }));
    }
    function anyNear(S) { return C.adjacentCrew(S).length > 0; }
    function cred(S, n) { S.credibility = Math.min(100, Math.max(0, S.credibility + n)); }

    /** The crew's willingness to do a thing for you, rolled against credibility. */
    function ask(S, c, difficulty, bonus) {
        let score = S.credibility + (bonus || 0) + S.rng.range(-12, 12);
        score += c.obliging * 8;
        score += S.derived.voiceMul * 12;
        if (st.hasPerk(S, "chapter_and_verse")) score += 26;
        if (st.hasPerk(S, "flight_deck")) score += 22;
        if (st.hasPerk(S, "authority")) score += 24;
        if (st.hasPerk(S, "invisible")) score -= 26;
        if (S.character.id === "ansel") score -= 10;
        if (st.wearing(S, "hivis")) score += 8;
        if (S.player.burns > 20) score += 12;
        if (S.flags.havePhoto) score += 14;
        const ok = score >= difficulty;
        if (ok) c.obliging++; else c.refusals++;
        return ok;
    }

    A.register([
        // ------------------------------------------------------------------- the call button ---
        { id: "crew.call_button", deck: "crew", tags: ["social"],
          label: "Press the call button", cost: 3,
          detail: (S) => { const n = S.counts["crew.call_button"] || 0;
                           return n ? "You have pressed it " + n + " times." : "Ding."; },
          when: (S) => cabin.rowAt(S.player.x) !== null || S.player.y !== cabin.AISLE_Y,
          run(S) {
              const n = (S.counts["crew.call_button"] || 0) + 1;
              PRS.audio.play("beltSign");
              cred(S, n < 6 ? 2 : 0.2);
              if (n === 1) return "Ding. A light comes on above your head and nothing else " +
                  "happens at all.";
              if (n < 5) return "Ding. Two lights. Three lights. The crew are still at the trolley.";
              if (n < 12) return "Ding. Somebody four rows back tuts.";
              if (n < 25) return "Ding. Yasmin Aboud looks down the cabin at your light, and then " +
                  "at the trolley, and then at your light.";
              if (n < 40) return { text: "Ding. The purser has now seen the light " + n + " times " +
                  "and has formed a view about the sort of person you are.", kind: "bad" };
              return { text: "Ding. That is " + n + " presses of a call button on an aeroplane " +
                  "that is on fire. It is going to be in the transcript.", kind: "bad" };
          } },

        { id: "crew.call_button_hold", deck: "crew", tags: ["social"], danger: "neutral",
          label: "Hold the call button down", cost: 14,
          detail: "Fourteen seconds of continuous chime. Somebody will come.",
          when: (S) => S.crewPhase < 2,
          run(S) {
              cred(S, 8);
              S.cabinPanic = Math.min(100, S.cabinPanic + 5);
              PRS.audio.play("chime");
              return { text: "You hold it down. The chime does not stop. Fourteen seconds is a " +
                  "very long chime and by the end of it somebody is walking up the aisle with a " +
                  "particular expression on their face, which is exactly what you wanted.",
                  kind: "good" };
          } },

        // ----------------------------------------------------------------------- talking to ---
        { id: "crew.tell", deck: "crew", tags: ["social"],
          targets: near,
          label: (S, t) => "Tell " + t.c.name + " about the bin",
          detail: (S, t) => t.c.role + " · " + (t.c.refusals ? "has said no " +
                            t.c.refusals + " times" : "has not refused you yet"),
          cost: 20,
          run(S, t) {
              if (ask(S, t.c, 30)) {
                  cred(S, 14);
                  C.setPhase(S, Math.max(S.crewPhase, 1));
                  return { text: t.c.name + " actually listens. “Which locker. Which row. Show me.”",
                           kind: "good" };
              }
              cred(S, 4);
              return { text: t.c.name + ": " + C.response(S, t.c), kind: "bad" };
          } },

        { id: "crew.show_photo", item: "phone", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => !!S.flags.havePhoto,
          label: (S, t) => "Show " + t.c.name + " the photograph",
          detail: "Evidence beats an account of evidence every time.",
          cost: 10,
          run(S, t) {
              cred(S, 26);
              C.setPhase(S, Math.max(S.crewPhase, 2));
              return { text: t.c.name + " looks at your phone. The whole conversation you were " +
                  "about to have does not need to happen.", kind: "great" };
          } },

        { id: "crew.show_burn", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => S.player.burns > 12,
          label: (S, t) => "Show " + t.c.name + " your hand",
          cost: 8,
          run(S, t) {
              cred(S, 22);
              C.setPhase(S, Math.max(S.crewPhase, 2));
              return { text: "You hold your hand out. There is no version of that hand that came " +
                  "from a galley oven. " + t.c.name + " stops talking mid-sentence.", kind: "great" };
          } },

        { id: "crew.lead", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          label: (S, t) => "Take " + t.c.name + " to the bin",
          detail: "Do not describe it. Walk them to it.",
          cost: 42,
          run(S, t) {
              const r = A.route(S, S.fire.core.x, cabin.AISLE_Y);
              if (r) A.travel(S, r);
              t.c.x = S.fire.core.x; t.c.y = cabin.AISLE_Y;
              t.c.hasSeenIt = true;
              cred(S, 34);
              C.setPhase(S, Math.max(S.crewPhase, 2), "Cabin crew taken to the locker by a passenger.");
              return { text: "You walk " + t.c.name + " eleven rows and point at the seam of the " +
                  "locker above " + cabin.ORIGIN.row + cabin.ORIGIN.letter + ". They put the back " +
                  "of their hand on it for about a quarter of a second. Everything is different " +
                  "from here.", kind: "great" };
          } },

        { id: "crew.regulation", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => st.hasPerk(S, "chapter_and_verse"),
          label: (S, t) => "Quote the manual at " + t.c.name,
          detail: "Section, sub-section, and the page it is on.",
          cost: 26,
          run(S, t) {
              cred(S, 30);
              C.setPhase(S, Math.max(S.crewPhase, 2));
              return { text: "“Your operations manual, in-flight fire, section four: on discovery " +
                  "of a fire in an overhead stowage the crew member shall not open the stowage but " +
                  "shall — and I am quoting — inform the commander immediately.” " + t.c.name +
                  " has gone a colour.", kind: "great" };
          } },

        { id: "crew.four_bars", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => st.hasPerk(S, "flight_deck"),
          label: (S, t) => "Identify yourself to " + t.c.name,
          detail: "Name, licence number, and the airline you fly for.",
          cost: 16,
          run(S, t) {
              cred(S, 40);
              C.setPhase(S, Math.max(S.crewPhase, 2));
              return { text: "You give " + t.c.name + " your name, your operator and your licence " +
                  "number, and something in the cabin changes shape. You are no longer a " +
                  "passenger who is being difficult.", kind: "great" };
          } },

        { id: "crew.purser", deck: "crew", tags: ["social"],
          label: "Ask for the purser by name",
          detail: "Ingrid Halloway. Thirty-one years on the type. She is the one who can decide.",
          when: (S) => S.crewPhase < 4,
          cost: 24,
          run(S) {
              const p = C.byId(S, "purser");
              if (ask(S, p, 34, 10)) {
                  p.x = S.player.x; p.y = cabin.AISLE_Y;
                  cred(S, 20);
                  return { text: "Ingrid Halloway comes down the aisle at a speed that is not a " +
                      "walk and is not a run and is a thing cabin crew are trained to do.",
                      kind: "good" };
              }
              return { text: "“The purser is dealing with something.” The purser is at the front " +
                  "of the aeroplane, dealing with something.", kind: "bad" };
          } },

        { id: "crew.ask_halon", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => !st.slotOf(S, "halon_bottle"),
          label: (S, t) => "Ask " + t.c.name + " for the halon bottle",
          detail: "There are two on this aeroplane and neither of them is yours.",
          cost: 22,
          run(S, t) {
              if (t.c.halon <= 0) return { text: "“It's gone. Both of them are gone.”", kind: "bad" };
              if (ask(S, t.c, 62, st.hasPerk(S, "firecraft") ? 25 : 0)) {
                  t.c.halon--;
                  S.inventory.push({ id: "halon_bottle", uses: 1, spent: false, item: {
                      id: "halon_bottle", name: "BCF halon extinguisher", kg: 3.2,
                      sprite: "cabin:extinguisher", uses: 1, agent: "halon",
                      tags: ["extinguisher", "halon"], blurb: "Not yours.",
                      note: "One discharge. Make it count." } });
                  return { text: "“Do you know how to use it?” You say yes. " + t.c.name +
                      " gives you a red bottle and eleven seconds of instructions.", kind: "great" };
              }
              return { text: "“Absolutely not. Sit down.” Which is, to be fair to them, correct.",
                       kind: "bad" };
          } },

        { id: "crew.ask_hood", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => !st.slotOf(S, "hood"),
          label: (S, t) => "Ask " + t.c.name + " for a smoke hood",
          cost: 20,
          run(S, t) {
              if (ask(S, t.c, 58)) {
                  t.c.hood--;
                  S.inventory.push({ id: "hood", uses: 1, spent: false,
                      item: PRS.data.items.byId("hood") });
                  return { text: t.c.name + " hands you a foil packet. It is the crew's own and " +
                      "they now do not have it.", kind: "great" };
              }
              return { text: "“They're for crew.” They are for crew.", kind: "bad" };
          } },

        { id: "crew.ask_extinguisher", deck: "crew", tags: ["social"],
          targets: near,
          when: (S) => !st.slotOf(S, "water_ext"),
          label: (S, t) => "Ask " + t.c.name + " for the water extinguisher",
          cost: 18,
          run(S, t) {
              if (ask(S, t.c, 44)) {
                  S.inventory.push({ id: "water_ext", uses: 2, spent: false, item: {
                      id: "water_ext", name: "Water extinguisher", kg: 6.4,
                      sprite: "cabin:extinguisher_water", uses: 2, agent: "water",
                      tags: ["extinguisher", "water"], blurb: "Nine litres, from the galley.",
                      note: "Two good discharges." } });
                  return { text: "The galley water extinguisher, which is nine litres and weighs " +
                      "as much as a small child. You now have both hands full.", kind: "great" };
              }
              return { text: "“I'll bring it. Sit down.” They do not bring it.", kind: "bad" };
          } },

        { id: "crew.ask_ice", deck: "crew", tags: ["social"],
          targets: near,
          when: (S) => !S.flags.haveIce,
          label: (S, t) => "Ask " + t.c.name + " for the ice bucket",
          detail: "It is the one thing on the trolley that is worth having.",
          cost: 12,
          run(S, t) {
              if (ask(S, t.c, 20)) {
                  st.setFlag(S, "haveIce");
                  return { text: "Three litres of ice and water, handed over without a single " +
                      "question, because ice is not equipment. Ice is service.", kind: "good" };
              }
              return { text: "“We've finished the service.”", kind: "bad" };
          } },

        { id: "crew.move_trolley", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => S.cabinFlags.cartOut,
          label: (S, t) => "Ask " + t.c.name + " to stow the trolley",
          detail: "Two hundred kilos across the aisle is the single biggest thing in your way.",
          cost: 20,
          run(S, t) {
              if (ask(S, t.c, 36)) {
                  S.cabinFlags.cartOut = false;
                  delete S.cabinFlags.aisleBlocked[S.cabinFlags.cartX];
                  return { text: "The trolley goes away. The aisle is a corridor again and " +
                      "everything you do for the rest of this flight is faster.", kind: "great" };
              }
              return { text: "“We're mid-service.” The trolley stays across row " +
                  (cabin.rowAt(S.cabinFlags.cartX) || "?") + ".", kind: "bad" };
          } },

        { id: "crew.ask_masks", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => !S.cabinFlags.masksDropped,
          label: (S, t) => "Ask " + t.c.name + " to drop the oxygen masks",
          detail: "It is the wrong oxygen for this and it is oxygen.",
          cost: 24,
          run(S, t) {
              if (ask(S, t.c, 66)) {
                  S.cabinFlags.masksDropped = true;
                  PRS.audio.play("masksDrop");
                  return { text: "Sixty panels open at once with a noise like a deck of cards. " +
                      "The masks come down all the way to the tail. Half the cabin puts one on " +
                      "and the other half looks at it.", kind: "great" };
              }
              return { text: "“Oxygen and fire.” They are not wrong. They are also not right.",
                       kind: "bad" };
          } },

        { id: "crew.ask_pa", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          label: (S, t) => "Ask " + t.c.name + " to make an announcement",
          detail: "One sentence to sixty people beats sixty conversations.",
          cost: 22,
          run(S, t) {
              if (ask(S, t.c, 50)) {
                  S.cabinAwareness = Math.min(100, S.cabinAwareness + 30);
                  S.cabinPanic = Math.min(100, S.cabinPanic + 12);
                  cred(S, 16);
                  PRS.audio.play("pa");
                  for (const p of S.pax) p.awareness = Math.min(100, p.awareness + 24);
                  return { text: "PA: “Ladies and gentlemen, cabin crew — we have a small fire in " +
                      "the cabin and it is being dealt with. Please remain seated with your " +
                      "seatbelts fastened.” The word remain is doing a great deal of work.",
                      kind: "good" };
              }
              return { text: "“That would cause a panic.” It would. That is not the same as it " +
                  "being wrong.", kind: "bad" };
          } },

        { id: "crew.ask_interphone", deck: "crew", tags: ["social"],
          targets: near,
          when: (S) => S.crewPhase < 4,
          label: (S, t) => "Tell " + t.c.name + " to call the flight deck",
          detail: "The two people who can put this aeroplane on the ground do not know yet.",
          cost: 26,
          run(S, t) {
              if (ask(S, t.c, 56)) {
                  C.setPhase(S, 4, "Flight deck notified at the request of a passenger.");
                  return { text: t.c.name + " picks up the handset. Whatever they say takes nine " +
                      "seconds and the nose is down before they have hung it up.", kind: "great" };
              }
              return { text: "“Not yet. We assess first, then we call.” That is the procedure and " +
                  "the procedure is costing you ninety seconds a minute.", kind: "bad" };
          } },

        { id: "crew.ask_lithium", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S) => S.fire.core.exposed,
          label: (S, t) => "Tell " + t.c.name + " it is a lithium battery",
          detail: "There is a specific drill for this and it is not the drill they are doing.",
          cost: 18,
          run(S, t) {
              cred(S, 24);
              st.setFlag(S, "toldLithium");
              C.setPhase(S, Math.max(S.crewPhase, 3));
              return { text: "“Lithium?” Everything in " + t.c.name + "'s training reorders " +
                  "itself in about a second and a half. “Water. Not the BCF. Water, and keep " +
                  "putting water on it.” Which is right, and which is nine minutes late.",
                  kind: "great" };
          } },

        { id: "crew.follow", deck: "crew", tags: ["move"],
          targets: near,
          label: (S, t) => "Stay with " + t.c.name,
          detail: "Where the crew go, the equipment goes.",
          cost: 10,
          run(S, t) {
              A.moveTo(S, t.c.x, cabin.AISLE_Y);
              return "You stay on " + t.c.name + "'s shoulder. They do not like it and they do " +
                  "not stop you.";
          } },

        // ---------------------------------------------------------------------- flight deck ---

        { id: "crew.cockpit", deck: "crew", tags: ["social"], danger: "good",
          label: "Get into the flight deck",
          detail: "You are type rated on this aeroplane. They will open it for you.",
          when: (S) => st.hasPerk(S, "flight_deck") && S.player.x <= 1 && !S.flags.cockpitOpened,
          cost: 40,
          run(S) {
              st.setFlag(S, "cockpitOpened");
              C.setPhase(S, 4, "Deadheading captain admitted to the flight deck.");
              return { text: "The interphone, then the code, then the door. Two people who have " +
                  "been flying an aeroplane for nine minutes with no idea what is happening " +
                  "behind them turn round and look at you.", kind: "great" };
          } },

        { id: "crew.mayday", deck: "crew", tags: ["social"], danger: "good",
          label: "Tell the flight deck to declare and get it down",
          when: (S) => S.flags.cockpitOpened && !S.flags.maydayCalled,
          cost: 30,
          run(S) {
              st.setFlag(S, "maydayCalled");
              const cut = Math.min(S.clock.remaining - 45, 150);
              if (cut > 0) { S.clock.remaining -= cut; S.clock.total -= cut; }
              return { text: "“Mayday, mayday, mayday, smoke in the cabin, request immediate " +
                  "descent and the longest runway you have.” You have just taken " +
                  Math.round(cut) + " seconds off this flight, and the fire has not agreed to " +
                  "take " + Math.round(cut) + " seconds off anything.", kind: "great" };
          } },

        { id: "crew.ask_lights", deck: "crew", tags: ["social"],
          targets: near,
          when: (S) => !S.cabinFlags.lightsUp,
          label: (S, t) => "Ask " + t.c.name + " to put the cabin lights up",
          cost: 12,
          run(S, t) {
              if (ask(S, t.c, 24)) {
                  S.cabinFlags.lightsUp = true;
                  return { text: "The cabin lights go to full. Everybody can suddenly see the " +
                      "smoke they had been managing not to see.", kind: "good" };
              }
              return { text: "“We dim for landing.”", kind: "bad" };
          } },
    ]);
})(window);
