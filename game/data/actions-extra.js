// The actions that only exist because of who is sitting where.
//
// Everything here is keyed to a trait or a named passenger, so none of it appears in a run where
// it would not make sense, and each one does something no generic action does: a sceptic shown
// the bin stops being one, a hostile given a job becomes a helper, an off-duty crew member moves
// the crew's own procedure, and the man whose bag it is can tell you what is in it without the
// bin being opened.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const P = PRS.pax;
    const F = PRS.fire;

    const slot = (S, id) => st.slotOf(S, id);
    const have = (S, id) => { const s = slot(S, id); return s && !s.spent; };

    /** Reachable passengers with a given trait who are not already working. */
    function withTrait(trait) {
        return (S) => st.reachable(S)
            .filter((p) => p.traits.indexOf(trait) >= 0 && p.state !== "dead" && !p.helper)
            .map((p) => ({ key: p.id, p: p }));
    }
    function named(name) {
        return (S) => S.pax.filter((p) => p.name === name && p.state !== "dead")
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
          label: (S, c) => T("Make {who} look at the open bin", { who: who(c) }),
          detail: K("A sceptic does not need persuading. A sceptic needs seeing."),
          cost: 15,
          run(S, c) {
              c.p.trust = Math.min(100, c.p.trust + 55);
              c.p.awareness = 100;
              c.p.traits = c.p.traits.filter((t) => t !== "sceptic");
              S.credibility = Math.min(100, S.credibility + 6);
              return { text: T("{who} looks at it for about four seconds and something goes " +
                               "out of their face. They are not a sceptic any more and they " +
                               "never will be again about anything.", { who: c.p.name }),
                       kind: "great" };
          } },

        { id: "extra.hostile_job", deck: "people", tags: ["social"], danger: "good",
          targets: withTrait("hostile"),
          when: (S, c) => P.helperCap(S) > 0 && P.worthAsking(S, c.p, 22),
          label: (S, c) => T("Give {who} a job", { who: who(c) }),
          detail: K("The obstructive ones obstruct because nobody has given them anything to do."),
          cost: 20,
          run(S, c) {
              const roll = P.convince(S, c.p, 22);
              if (roll.ok) {
                  P.recruit(S, c.p, T("The man who was telling you to sit down is now " +
                                      "carrying people forward."));
                  return { text: T("“Fine. Fine! What do you want me to do.” And then {who} " +
                                   "does it, faster and better than anybody, because being " +
                                   "useful is all they ever wanted.", { who: c.p.name }),
                           kind: "great" };
              }
              c.p.trust -= 8;
              return { text: T("“I'm not taking instructions from you.”"), kind: "bad" };
          } },

        // ------------------------------------------------------------------ the off-duty crew ---
        { id: "extra.offduty", deck: "people", tags: ["social"], danger: "good",
          targets: withTrait("crew"),
          when: (S, c) => P.helperCap(S) > 0 && P.worthAsking(S, c.p, 34),
          label: (S, c) => T("Tell {who} to act like crew", { who: who(c) }),
          detail: K("They know the aeroplane, the drill and the kit. They are in seat 15E."),
          cost: 20,
          run(S, c) {
              const roll = P.convince(S, c.p, 34);
              if (!roll.ok) {
                  return { text: T("“It isn't my aeroplane and it isn't my licence.”"),
                           kind: "bad" };
              }
              P.recruit(S, c.p, T("They know where everything is stowed, which you do not."));
              S.credibility = Math.min(100, S.credibility + 20);
              PRS.crew.setPhase(S, Math.max(S.crewPhase, 2));
              return { text: T("{who} stands up and stops being a passenger. Inside twenty " +
                               "seconds they have the aft galley open, a bottle in their hand " +
                               "and two rows moving. This is what the training is for and it " +
                               "does not care whose aeroplane it is.", { who: c.p.name }),
                       kind: "great" };
          } },

        { id: "extra.child_carry_pair", deck: "people", tags: ["carry"], danger: "good",
          targets: (S) => st.reachable(S).filter((p) => P.isChild(p) && p.state !== "dead" &&
                                                        p.state !== "carried")
                                          .map((p) => ({ key: p.id, p: p })),
          when: (S) => S.player.carrying.length < 2 &&
                       (S.derived.maxCarry > 1 || S.player.carrying.length === 0 ||
                        S.player.carrying.every((id) => {
                            const q = st.paxById(S, id); return q && P.isChild(q); })),
          label: (S, c) => T("Take {who} under the other arm", { who: who(c) }),
          detail: K("Children weigh nothing. You can do two."),
          cost: (S, c) => 8 + c.p.kg * 0.12,
          run(S, c) {
              c.p.state = "carried";
              c.p.carriedBy = "player";
              c.p.belted = false;
              S.player.carrying.push(c.p.id);
              S.player.crouching = false;
              st.reindex(S);
              return { text: T("One under each arm. {who} weighs {kg} kilos and does not " +
                               "struggle, which is somehow worse than struggling.",
                               { who: c.p.name, kg: c.p.kg }), kind: "good" };
          } },

        // --------------------------------------------------------- the ones with names -------
        { id: "extra.chip", deck: "people", tags: ["reveal", "social"], danger: "good",
          targets: named("Chip Vanterpool"),
          label: K("Ask Chip Vanterpool what is in the bag"),
          detail: K("It is his bag. He knows. He has known for eleven minutes."),
          cost: 16,
          once: true,
          run(S, c) {
              st.setFlag(S, "chipConfessed");
              S.fire.core.exposed = true;
              S.credibility = Math.min(100, S.credibility + 34);
              c.p.trust = 40;
              c.p.traits = c.p.traits.filter((t) => t !== "hostile" && t !== "sceptic");
              return { text: T("“It's a vape.”") + "\n\n" +
                       T("He says it to the tray table. “It's a vape, it got wet in Málaga, " +
                         "it's been getting hot in my pocket all week and I put it in the case " +
                         "so I'd stop thinking about it.”") + "\n\n" +
                       T("You now know exactly what this is, eleven minutes before anybody else " +
                         "was going to."), kind: "great" };
          } },

        { id: "extra.wilbur", deck: "people", tags: ["reveal", "social"],
          targets: named("Wilbur Ansty"),
          label: K("Ask Wilbur Ansty what he thinks it is"),
          detail: K("He flew Vulcans. He has smelled this before, on an aeroplane, on purpose."),
          cost: 13,
          once: true,
          run(S, c) {
              S.credibility = Math.min(100, S.credibility + 14);
              st.setFlag(S, "wilburSaid");
              return { text: T("“Lithium. It's lithium. You can't put it out and you mustn't " +
                               "try to smother it, you have to cool it, and the only thing on " +
                               "this aeroplane that cools anything is the tap in the " +
                               "lavatory.”") + "\n\n" +
                       T("He is eighty-six and he has just told you the answer."),
                       kind: "great" };
          } },

        // -------------------------------------------------------------------- more of the fire ---
        { id: "extra.cool_bin", item: "water_big", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: K("Keep pouring water on the same spot"), cost: 30,
          detail: K("Not to put it out. To keep the case below the temperature the next cell needs, " +
                  "and everybody in the row is going to get wet."),
          when: (S) => Math.abs(S.player.x - S.fire.core.x) <= 1 &&
                       have(S, "water_big") && slot(S, "water_big").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "water_big"));
              S.fire.core.heat = Math.max(0, S.fire.core.heat - 42);
              S.stats.agentsUsed++;
              P.annoy(S, 1);
              PRS.audio.play("pour");
              return { text: T("Thirty seconds of pouring the same bottle onto the same " +
                               "seam. Nothing looks different. The next cell is now {eta} away " +
                               "instead of thirty seconds away, and that is what cooling means.",
                               { eta: PRS.util.mmss(F.ventEta(S.fire)) }), kind: "great" };
          } },

        // ------------------------------------------------------------------ more of the crew ---

        { id: "extra.crew_water", deck: "crew", tags: ["social"], danger: "good",
          targets: (S) => PRS.crew.adjacentCrew(S).map((c) => ({ key: c.id, c: c })),
          when: (S) => (!!S.flags.wilburSaid || S.fire.core.exposed) && !S.flags.crewUseWater,
          label: (S, t) => T("Tell {who} it is a lithium battery: water, not halon",
                             { who: t.c.name }),
          detail: K("There is a specific drill for this and it is not the drill they are doing. " +
                  "You only know it because you looked, or because Wilbur told you."),
          cost: 20,
          run(S, t) {
              st.setFlag(S, "crewUseWater");
              S.credibility = Math.min(100, S.credibility + 20);
              S.fire.core.rate *= 0.72;
              PRS.crew.setPhase(S, Math.max(S.crewPhase, 3));
              return { text: T("“Lithium?” Everything in {who}'s training reorders itself in " +
                               "about a second and a half. “Water. Not the BCF. Water, and keep " +
                               "putting water on it.” Which is right, and which the next cell " +
                               "is going to notice.", { who: t.c.name }), kind: "great" };
          } },


        // ---------------------------------------------------------------------- the cabin ---
        { id: "people.speech", deck: "people", tags: ["social"], danger: "good",
          label: K("Stand on a seat and address the cabin"), cost: 30,
          detail: K("Everybody within six rows, once, and you only get one of these."),
          when: (S) => cabin.rowAt(S.player.x) !== null && !S.flags.gaveSpeech &&
                       st.withinEarshot(S, 6).some((p) => P.worthAsking(S, p, 6)),
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
              return { text: T("You stand on an armrest and give thirty seconds of the worst " +
                               "and most sincere speech of your life. {n} people are moved by " +
                               "it. The rest of them are embarrassed, which is a thing people " +
                               "can still be eleven minutes into this.", { n: convinced }),
                       kind: convinced > 3 ? "great" : "plain" };
          } },
    ]);
})(window);
