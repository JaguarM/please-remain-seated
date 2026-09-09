// The ninth file: the actions that only exist because of who is sitting where.
//
// Everything here is keyed to a trait or a named passenger, so none of it appears in a run where
// it would not make sense, and all of it appears in the same list at the same price as everything
// else. The roster in passengers.js gives sixty people a temperament each; this is what those
// temperaments are for, and it is where a second playthrough finds things a first one did not.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const P = PRS.pax;
    const F = PRS.fire;

    const slot = (S, id) => st.slotOf(S, id);
    const have = (S, id) => { const s = slot(S, id); return s && !s.spent; };

    /** Reachable passengers with a given trait. The workhorse of this file. */
    function withTrait(trait) {
        return (S) => st.reachable(S)
            .filter((p) => p.traits.indexOf(trait) >= 0 && p.state !== "secured" &&
                           p.state !== "dead")
            .map((p) => ({ key: p.id, p: p }));
    }
    function named(name) {
        return (S) => S.pax.filter((p) => p.name === name && p.state !== "secured" &&
                                          p.state !== "dead")
                            .filter((p) => Math.abs(p.x - S.player.x) <= 1 &&
                                           Math.abs(p.y - S.player.y) <= 1)
                            .map((p) => ({ key: p.id, p: p }));
    }
    const who = (c) => c.p.name;

    A.register([
        // ------------------------------------------------------------------- the sceptics ----
        { id: "extra.sceptic_evidence", deck: "people", tags: ["social"], danger: "good",
          targets: withTrait("sceptic"),
          when: (S) => S.fire.core.exposed || !!S.flags.havePhoto,
          label: (S, c) => "Make " + who(c) + " look at the open bin",
          detail: "A sceptic does not need persuading. A sceptic needs seeing.",
          cost: 15,
          run(S, c) {
              c.p.trust = Math.min(100, c.p.trust + 55);
              c.p.awareness = 100;
              c.p.traits = c.p.traits.filter((t) => t !== "sceptic");
              S.credibility = Math.min(100, S.credibility + 6);
              return { text: c.p.name + " looks at it for about four seconds and something goes " +
                  "out of their face. They are not a sceptic any more and they never will be " +
                  "again about anything.", kind: "great" };
          } },

        // ---------------------------------------------------------------------- the hostile ---
        { id: "extra.hostile_agree", deck: "people", tags: ["social"], danger: "good",
          targets: withTrait("hostile"),
          label: (S, c) => "Agree with " + who(c),
          detail: "Tell them they are right. They are, about most of it. Then ask.",
          cost: 18,
          run(S, c) {
              const roll = P.convince(S, c.p, 30);
              c.p.trust = Math.min(100, c.p.trust + 30);
              if (roll.ok) {
                  return { text: "“You're right. I shouldn't be out of my seat and I am " +
                      "frightening people.” " + c.p.name + " has nothing to push against and " +
                      "visibly does not know what to do with that.", kind: "good" };
              }
              return { text: c.p.name + " takes the agreement as a victory and goes back to " +
                  "reading.", kind: "bad" };
          } },

        { id: "extra.hostile_job", deck: "people", tags: ["social"], danger: "good",
          targets: withTrait("hostile"),
          label: (S, c) => "Give " + who(c) + " a job",
          detail: "The obstructive ones obstruct because nobody has given them anything to do.",
          cost: 20,
          run(S, c) {
              const roll = P.convince(S, c.p, 22);
              if (roll.ok) {
                  P.recruit(S, c.p, "The man who was telling you to sit down is now carrying " +
                      "people forward.");
                  return { text: "“Fine. Fine! What do you want me to do.” And then " + c.p.name +
                      " does it, faster and better than anybody, because being useful is all " +
                      "they ever wanted.", kind: "great" };
              }
              c.p.trust -= 8;
              return { text: "“I'm not taking instructions from you.”", kind: "bad" };
          } },

        // ------------------------------------------------------------------------ the drunk ---
        { id: "extra.drunk_task", deck: "people", tags: ["social"],
          targets: withTrait("drunk"),
          label: (S, c) => "Give " + who(c) + " something simple to do",
          detail: "One instruction. Four words. No context.",
          cost: 13,
          run(S, c) {
              const roll = P.convince(S, c.p, 26);
              if (roll.ok) {
                  P.recruit(S, c.p, "Nobody involved is going to remember this clearly.");
                  return { text: "“Carry people forward. Got it. CARRY PEOPLE FORWARD.” " +
                      c.p.name + " is now doing exactly that, at volume, with enormous " +
                      "commitment and no judgement whatsoever.", kind: "great" };
              }
              return { text: c.p.name + " agrees enthusiastically and does not move.", kind: "bad" };
          } },

        { id: "extra.drunk_sober", deck: "people", tags: ["hands"],
          targets: withTrait("drunk"),
          when: (S) => have(S, "water_big") && slot(S, "water_big").uses > 0,
          label: (S, c) => "Get water into " + who(c),
          cost: 16,
          run(S, c) {
              st.useCharge(S, slot(S, "water_big"));
              c.p.traits = c.p.traits.filter((t) => t !== "drunk");
              c.p.trust = Math.min(100, c.p.trust + 25);
              return { text: "Half a litre and thirty seconds. " + c.p.name + " is not sober and " +
                  "is measurably closer to it, which is the whole of what is available.",
                  kind: "good" };
          } },

        // ------------------------------------------------------------------- the medical ones ---
        { id: "extra.medic_station", deck: "people", tags: ["social"], danger: "good",
          targets: withTrait("medical"),
          label: (S, c) => "Put " + who(c) + " in the forward galley with the casualties",
          detail: "One person who knows what they are doing, in one place, and bring them people.",
          cost: 26,
          run(S, c) {
              const roll = P.convince(S, c.p, 30);
              if (!roll.ok) return { text: c.p.name + " will not leave the person next to them.",
                                     kind: "bad" };
              c.p.x = cabin.FWD_CROSS_X; c.p.y = cabin.AISLE_Y;
              c.p.state = "secured";
              c.p.securedAt = S.clock.elapsed;
              c.p.isMedicStation = true;
              st.setFlag(S, "medicStation");
              st.reindex(S);
              PRS.state.note(S, c.p.name + " established a casualty point in the forward galley.");
              return { text: c.p.name + " sets up in the forward cross-aisle and starts sorting " +
                  "people into two groups. Everybody you bring forward from now on is going to " +
                  "somebody who knows which of the two they are in.", kind: "great" };
          } },

        { id: "extra.medic_ask", deck: "people", tags: ["reveal", "social"], danger: "good",
          targets: withTrait("medical"),
          label: (S, c) => "Ask " + who(c) + " who to prioritise",
          detail: "You have been guessing. They have not.",
          cost: 14,
          run(S, c) {
              const worst = S.pax
                  .filter((p) => p.state !== "secured" && p.state !== "dead")
                  .sort((a, b) => (b.smokeDose + b.burns) - (a.smokeDose + a.burns))
                  .slice(0, 4);
              c.p.trust = Math.min(100, c.p.trust + 18);
              return { text: "“The quiet ones. Not the loud ones — the quiet ones.” " +
                  PRS.util.listSentence(worst.map((p) => p.name + " in " + p.seat)) +
                  ". Those four, in that order, before anybody who is still shouting.",
                  kind: "great" };
          } },

        // ------------------------------------------------------------------ the off-duty crew ---
        { id: "extra.offduty", deck: "people", tags: ["social"], danger: "good",
          targets: withTrait("crew"),
          label: (S, c) => "Tell " + who(c) + " to act like crew",
          detail: "They know the aeroplane, the drill and the kit. They are in seat 15E.",
          cost: 20,
          run(S, c) {
              const roll = P.convince(S, c.p, 34);
              if (!roll.ok) return { text: "“It isn't my aeroplane and it isn't my licence.”",
                                     kind: "bad" };
              P.recruit(S, c.p, "They know where everything is stowed, which you do not.");
              S.credibility = Math.min(100, S.credibility + 20);
              PRS.crew.setPhase(S, Math.max(S.crewPhase, 2),
                  "An off-duty crew member from another operator assisted.");
              return { text: c.p.name + " stands up and stops being a passenger. Inside twenty " +
                  "seconds they have the aft galley open, a bottle in their hand and two rows " +
                  "moving. This is what the training is for and it does not care whose aeroplane " +
                  "it is.", kind: "great" };
          } },

        // ------------------------------------------------------------------------ the nervous ---
        { id: "extra.nervous_job", deck: "people", tags: ["social"], danger: "good",
          targets: withTrait("nervous"),
          label: (S, c) => "Give " + who(c) + " one thing to count",
          detail: "A frightened person with a task is not a frightened person any more.",
          cost: 15,
          run(S, c) {
              c.p.panic = Math.max(0, c.p.panic - 46);
              c.p.trust = Math.min(100, c.p.trust + 30);
              c.p.counting = true;
              return { text: "“Count everybody who goes past you. Out loud. Start now.” " +
                  c.p.name + " starts counting and stops shaking, in that order, about four " +
                  "seconds apart.", kind: "good" };
          } },

        // -------------------------------------------------------------------- children and pets ---
        { id: "extra.child_game", deck: "people", tags: ["social"], danger: "good",
          targets: (S) => st.reachable(S).filter((p) => P.isChild(p) && p.state !== "secured")
                                          .map((p) => ({ key: p.id, p: p })),
          label: (S, c) => "Make it a game for " + who(c),
          detail: "Hold your breath, get down low, and beat me to the door.",
          cost: 14,
          run(S, c) {
              c.p.panic = Math.max(0, c.p.panic - 50);
              c.p.trust = 90;
              c.p.braced = true;
              return { text: "“Right — this is a game. Lowest wins. Can you get lower than me?” " +
                  c.p.name + " can get lower than you and immediately does, into the cleanest " +
                  "air in the cabin, laughing.", kind: "good" };
          } },

        { id: "extra.child_carry_pair", deck: "people", tags: ["carry"], danger: "good",
          targets: (S) => st.reachable(S).filter((p) => P.isChild(p) && p.state !== "secured" &&
                                                        p.state !== "carried")
                                          .map((p) => ({ key: p.id, p: p })),
          when: (S) => S.player.carrying.length < 2 &&
                       (S.derived.maxCarry > 1 || S.player.carrying.length === 0 ||
                        S.player.carrying.every((id) => {
                            const q = st.paxById(S, id); return q && P.isChild(q); })),
          label: (S, c) => "Take " + who(c) + " under the other arm",
          detail: "Children weigh nothing. You can do two.",
          cost: (S, c) => 8 + c.p.kg * 0.12,
          run(S, c) {
              c.p.state = "carried";
              c.p.carriedBy = "player";
              c.p.belted = false;
              S.player.carrying.push(c.p.id);
              st.reindex(S);
              return { text: "One under each arm. " + c.p.name + " weighs " + c.p.kg + " kilos " +
                  "and does not struggle, which is somehow worse than struggling.", kind: "good" };
          } },

        { id: "extra.pet", deck: "people", tags: ["carry"],
          targets: withTrait("pet"),
          label: (S, c) => "Get " + who(c) + " out from under the seat",
          detail: "It is a dog. It is thirty seconds. It is not a person and you are going anyway.",
          cost: 22,
          run(S, c) {
              c.p.state = "carried";
              c.p.carriedBy = "player";
              S.player.carrying.push(c.p.id);
              st.reindex(S);
              PRS.state.note(S, "A passenger recovered an animal from beneath a seat during the " +
                  "descent. The investigator has been asked not to include this and has included it.");
              return { text: "You get the bag out from under 21B. There is a dog in it and it is " +
                  "not making the noise a dog makes. Thirty seconds you will never get back and " +
                  "would spend again.", kind: "good" };
          } },

        // --------------------------------------------------------- the ones with names -------
        { id: "extra.chip", deck: "people", tags: ["reveal", "social"], danger: "good",
          targets: named("Chip Vanterpool"),
          label: "Ask Chip Vanterpool what is in the bag",
          detail: "It is his bag. He knows. He has known for eleven minutes.",
          cost: 16,
          once: true,
          run(S, c) {
              st.setFlag(S, "chipConfessed");
              S.fire.core.exposed = true;
              S.player.lookedAtFire = true;
              S.credibility = Math.min(100, S.credibility + 34);
              c.p.trust = 40;
              c.p.traits = c.p.traits.filter((t) => t !== "hostile" && t !== "sceptic");
              PRS.state.note(S, "The owner of the bag stated that it contained a personal " +
                  "vaporiser with a damaged cell, and that he had been aware of a smell for " +
                  "some minutes before the crew were informed.");
              return { text: "“It's a vape.”\n\nHe says it to the tray table. “It's a vape, it " +
                  "got wet in Málaga, it's been getting hot in my pocket all week and I put it " +
                  "in the case so I'd stop thinking about it.”\n\nYou now know exactly what this " +
                  "is, eleven minutes before anybody else was going to.", kind: "great" };
          } },

        { id: "extra.vera", deck: "people", tags: ["social"],
          targets: named("Vera Lundqvist"),
          label: "Tell Vera Lundqvist it is not her bag",
          detail: "She has decided it is. She is seventy-eight and she has decided it is.",
          cost: 12,
          once: true,
          run(S, c) {
              c.p.panic = Math.max(0, c.p.panic - 40);
              c.p.trust = 80;
              return { text: "“It is not your bag. It is not anything you did.” She does not " +
                  "believe you and she stops crying, which are two separate things and only one " +
                  "of them was available.", kind: "good" };
          } },

        { id: "extra.aiko", deck: "people", tags: ["reveal", "social"],
          targets: named("Aiko Sorensen"),
          label: "Ask Aiko Sorensen how she wants to be lifted",
          detail: "She has been lifted by strangers her whole adult life and she has a preference.",
          cost: 9,
          once: true,
          run(S, c) {
              c.p.liftKnown = true;
              c.p.trust = Math.min(100, c.p.trust + 45);
              return { text: "“Under the knees, one arm behind my back, and do not put your hand " +
                  "under my arm because it dislocates.” Nine seconds. Everybody who has ever " +
                  "picked her up could have asked and you are the first.", kind: "good" };
          } },

        { id: "extra.gideon", deck: "people", tags: ["social"], danger: "good",
          targets: named("Gideon Fenwick"),
          label: "Promise Gideon Fenwick you will come back for all four",
          detail: "He will not let one of them go without it. He is right not to.",
          cost: 18,
          once: true,
          run(S, c) {
              st.setFlag(S, "promisedFenwicks");
              for (const p of S.pax) {
                  if (p.name.indexOf("Fenwick") < 0) continue;
                  p.trust = 90;
                  p.belted = false;
              }
              return { text: "“All four. I'm telling you now so you can hold me to it.” Gideon " +
                  "holds you to it. The whole family will move for you now and there are four " +
                  "of them and one of you.", kind: "great" };
          } },

        { id: "extra.wilbur", deck: "people", tags: ["reveal", "social"],
          targets: named("Wilbur Ansty"),
          label: "Ask Wilbur Ansty what he thinks it is",
          detail: "He flew Vulcans. He has smelled this before, on an aeroplane, on purpose.",
          cost: 13,
          once: true,
          run(S, c) {
              S.credibility = Math.min(100, S.credibility + 14);
              st.setFlag(S, "wilburSaid");
              return { text: "“Lithium. It's lithium. You can't put it out and you mustn't try to " +
                  "smother it, you have to cool it, and the only thing on this aeroplane that " +
                  "cools anything is the tap in the lavatory.”\n\nHe is eighty-six and he has " +
                  "just told you the answer.", kind: "great" };
          } },

        { id: "extra.marguerite", deck: "people", tags: ["reveal", "social"],
          targets: named("Marguerite Okonjo"),
          label: "Ask Marguerite Okonjo what she has seen",
          detail: "She has been watching the cabin for eleven minutes and she has been counting.",
          cost: 12,
          once: true,
          run(S, c) {
              const need = S.pax.filter((p) => P.needsCarrying(p) && p.state !== "secured");
              c.p.trust = 80;
              return { text: "“Eleven people on this aeroplane cannot get out of their own seats. " +
                  PRS.util.listSentence(need.slice(0, 6).map((p) => p.seat)) +
                  ". I have been looking at them for an hour and nobody has come.”", kind: "great" };
          } },

        // -------------------------------------------------------------------- more of the fire ---
        { id: "extra.cool_bin", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Keep pouring water on the same spot", cost: 30,
          detail: "Not to put it out. To keep the case below the temperature the next cell needs.",
          when: (S) => Math.abs(S.player.x - S.fire.core.x) <= 1 &&
                       have(S, "water_big") && slot(S, "water_big").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "water_big"));
              S.fire.core.heat = Math.max(0, S.fire.core.heat - 42);
              S.stats.agentsUsed++;
              PRS.audio.play("pour");
              return { text: "Thirty seconds of pouring the same bottle onto the same seam. " +
                  "Nothing looks different. The next cell is now " +
                  PRS.util.mmss(F.ventEta(S.fire)) + " away instead of thirty seconds away, and " +
                  "that is what cooling means.", kind: "great" };
          } },

        { id: "extra.warn_row", deck: "fire", tags: ["social"], danger: "good",
          label: (S) => "Clear the two rows either side of the fire",
          detail: "Not because they are burning. Because in ninety seconds they will be.",
          when: (S) => Math.abs(S.player.x - S.fire.core.x) <= 3,
          cost: 40,
          run(S) {
              let moved = 0;
              for (const p of S.pax) {
                  if (Math.abs(p.x - S.fire.core.x) > 2) continue;
                  if (p.state === "secured" || p.state === "dead") continue;
                  const roll = P.convince(S, p, 20);
                  if (!roll.ok) continue;
                  if (P.needsCarrying(p)) { p.trust = Math.min(100, p.trust + 20); continue; }
                  p.x = P.nearestSafeX(p.x); p.y = cabin.AISLE_Y;
                  p.state = "secured"; p.securedAt = S.clock.elapsed;
                  S.stats.carriesCompleted++;
                  moved++;
              }
              st.reindex(S);
              if (!moved) return { text: "Nobody near the fire moves. They can see it. They " +
                  "can see it and they are still in their seats.", kind: "bad" };
              return { text: moved + " people get out of the rows either side of the locker. In " +
                  "about ninety seconds those seats are going to be part of the fire and none of " +
                  "them will have been in them.", kind: "great" };
          } },

        // ------------------------------------------------------------------ more of the cabin ---
        { id: "extra.head_count", deck: "cabin", tags: ["reveal", "look"], danger: "good",
          label: "Work out who cannot walk", cost: 20,
          detail: "Row by row. It is the list that decides everything else you do.",
          when: (S) => !S.flags.knowTheList,
          once: true,
          run(S) {
              st.setFlag(S, "knowTheList");
              const need = S.pax.filter((p) => P.needsCarrying(p) && p.state !== "secured");
              return { text: "Twenty seconds and you have the only list that matters: " +
                  PRS.util.listSentence(need.map((p) => p.seat)) + ". " + need.length +
                  " people who are not getting off this aeroplane unless somebody carries them, " +
                  "and now you know all of them by seat number instead of finding them one at " +
                  "a time.", kind: "great" };
          } },

        { id: "extra.assign_rows", deck: "cabin", tags: ["social"], danger: "good",
          label: "Split the cabin between the helpers", cost: 30,
          detail: "You take aft of the wing. They take forward. Nobody gets done twice.",
          when: (S) => st.helperCount(S) >= 3 && !S.flags.rowsAssigned,
          once: true,
          run(S) {
              st.setFlag(S, "rowsAssigned");
              let n = 0;
              for (const p of S.pax) {
                  if (!p.helper) continue;
                  p.taskLeft = Math.max(0, (p.taskLeft || 0) * 0.75);
                  n++;
              }
              PRS.state.note(S, "Passengers organised themselves into zones without instruction " +
                  "from the crew.");
              return { text: "Thirty seconds of pointing at rows. " + n + " people now know which " +
                  "part of this aeroplane is theirs, and none of them is going to walk past " +
                  "somebody because they assumed somebody else had them.", kind: "great" };
          } },

        { id: "extra.clear_exit_row", deck: "cabin", tags: ["social"], danger: "good",
          label: "Clear the overwing exit row", cost: 26,
          detail: "The only floor in the middle of this aeroplane worth putting anybody on, " +
                  "and there are bags in it.",
          when: (S) => Math.abs(S.player.x - cabin.OVERWING_X) <= 1 && !S.flags.exitRowClear,
          run(S) {
              st.setFlag(S, "exitRowClear");
              delete S.cabinFlags.aisleBlocked[cabin.OVERWING_X];
              return { text: "Four bags, a coat and a pushchair out of the overwing row and over " +
                  "the seat backs. The one place in the middle of this aeroplane worth carrying " +
                  "somebody to is now a place you can put somebody down.", kind: "great" };
          } },

        // --------------------------------------------------------------------- more of yourself ---

        // ------------------------------------------------------------------ more of the crew ---
        { id: "extra.crew_zone", deck: "crew", tags: ["social"], danger: "good",
          targets: (S) => PRS.crew.adjacentCrew(S).map((c) => ({ key: c.id, c: c })),
          label: (S, t) => "Tell " + t.c.name + " which seats cannot walk",
          detail: "You have the list. They have the authority. Neither of you has both.",
          when: (S) => !!S.flags.knowTheList,
          cost: 18,
          run(S, t) {
              S.credibility = Math.min(100, S.credibility + 18);
              st.setFlag(S, "crewHasList");
              PRS.crew.setPhase(S, Math.max(S.crewPhase, 3));
              for (const p of S.pax) {
                  if (P.needsCarrying(p) && p.state !== "secured") p.trust = Math.min(100, p.trust + 20);
              }
              return { text: "You give " + t.c.name + " eleven seat numbers and they write them " +
                  "on the back of their hand. That is the single most useful sentence anybody " +
                  "has said on this aeroplane.", kind: "great" };
          } },

        { id: "extra.crew_water", deck: "crew", tags: ["social"], danger: "good",
          targets: (S) => PRS.crew.adjacentCrew(S).map((c) => ({ key: c.id, c: c })),
          when: (S) => !!S.flags.wilburSaid || st.hasPerk(S, "reads_fire") || S.fire.core.exposed,
          label: (S, t) => "Tell " + t.c.name + " to use water, not the halon",
          detail: "Halon does the flame. Water does the cell. Only one of those comes back.",
          cost: 20,
          run(S, t) {
              st.setFlag(S, "crewUseWater");
              S.credibility = Math.min(100, S.credibility + 16);
              S.fire.core.rate *= 0.72;
              return { text: "“Water. Keep putting water on it and don't stop.” " + t.c.name +
                  " hesitates for exactly as long as it takes to remember that this is in the " +
                  "manual and that they read it in February.", kind: "great" };
          } },

        { id: "extra.crew_seatbelt", deck: "crew", tags: ["social"],
          targets: (S) => PRS.crew.adjacentCrew(S).map((c) => ({ key: c.id, c: c })),
          when: (S) => S.cabinFlags.beltSignOn && S.crewPhase >= 3,
          label: (S, t) => "Ask " + t.c.name + " to have the seatbelt sign turned off",
          detail: "Forty people are sitting down because of a light.",
          cost: 22,
          run(S, t) {
              S.cabinFlags.beltSignOn = false;
              for (const p of S.pax) if (p.state === "seated") p.belted = false;
              return { text: "The sign goes off with a chime and about forty people who have " +
                  "been waiting for permission stand up at once. This is either the best or the " +
                  "worst thing you have done and you will find out in nine minutes.",
                  kind: "neutral" };
          } },

        // ------------------------------------------------------------- more of the desperate ---
    ]);

    // ------------------------------------------- what used to be the desperate deck ------------
    // Four survivors out of thirty-two. The other twenty-eight were options that cost real
    // seconds and did nothing, which is a fine joke once and a bad game to play twice.

    A.register([
        { id: "people.speech", deck: "people", tags: ["social"], danger: "good",
          label: "Stand on a seat and address the cabin", cost: 30,
          detail: "Everybody within six rows, once, and you only get one of these.",
          when: (S) => cabin.rowAt(S.player.x) !== null && !S.flags.gaveSpeech,
          run(S) {
              st.setFlag(S, "gaveSpeech");
              let convinced = 0;
              for (const p of st.withinEarshot(S, 6)) {
                  p.awareness = Math.min(100, p.awareness + 30);
                  if (P.convince(S, p, 6).ok) {
                      p.trust = Math.min(100, p.trust + 30);
                      convinced++;
                  }
              }
              S.credibility = Math.min(100, S.credibility + 10);
              return { text: "You stand on an armrest and give thirty seconds of the worst and " +
                  "most sincere speech of your life. " + convinced + " people are moved by it. " +
                  "The rest of them are embarrassed, which is a thing people can still be eleven " +
                  "minutes into this.", kind: convinced > 3 ? "great" : "plain" };
          } },

        { id: "people.delegate", deck: "people", tags: ["social"], danger: "good",
          targets: (S) => st.reachable(S)
              .filter((p) => !p.helper && p.state !== "down" && p.state !== "secured")
              .map((p) => ({ key: p.id, p: p })),
          label: (S, c) => "Put " + c.p.name + " in charge instead of you",
          detail: "Hand the whole thing over. Some people are better at it than you are.",
          cost: 16,
          run(S, c) {
              if (P.convince(S, c.p, 4).ok) {
                  P.recruit(S, c.p, "You have handed the whole thing over.");
                  return { text: "“You do it. You're better at this than me.” " + c.p.name +
                      " looks at you, and takes it, and is better at it than you.", kind: "great" };
              }
              return { text: c.p.name + " says no. It is the correct answer and it does not help.",
                       kind: "bad" };
          } },

        { id: "people.roll_call", deck: "people", tags: ["social"], danger: "good",
          label: "Shout the seat numbers of everybody who cannot walk", cost: 24,
          detail: "Not to them. To everybody else.",
          when: (S) => !!S.flags.knowTheList,
          run(S) {
              const need = S.pax.filter((p) => P.needsCarrying(p) && p.state !== "secured");
              let helped = 0;
              for (const p of S.pax) {
                  if (p.helper || p.state === "secured" || p.state === "down") continue;
                  if (P.needsCarrying(p)) continue;
                  if (P.convince(S, p, 14).ok &&
                      P.recruit(S, p, "They heard a seat number and went to it.")) {
                      if (++helped >= 3) break;
                  }
              }
              return { text: "You shout eleven seat numbers down a burning aeroplane, twice, " +
                  "slowly. " + (helped ? helped + " people go to one." :
                  "Nobody goes to any of them.") + " There are " + need.length + " on the list.",
                  kind: helped ? "great" : "bad" };
          } },

        { id: "cabin.safety_demo", deck: "cabin", tags: ["social"], danger: "good",
          label: "Perform the safety demonstration", cost: 34,
          detail: "From memory, with the hand gestures, at the front, like they do.",
          when: (S) => S.player.x <= cabin.FWD_CROSS_X,
          once: true,
          run(S) {
              let n = 0;
              for (const p of S.pax) {
                  if (p.state === "secured" || p.state === "dead") continue;
                  p.braced = true;
                  p.knowsRows = true;
                  n++;
              }
              return { text: "You stand in the forward cross-aisle and do the whole demonstration " +
                  "with both arms — exits, brace, masks, vests — to a cabin that is finally, for " +
                  "the first time in the history of commercial aviation, watching it.\\n\\n" + n +
                  " people now know where the doors are and what the brace position is.",
                  kind: "great" };
          } },
    ]);
})(window);
