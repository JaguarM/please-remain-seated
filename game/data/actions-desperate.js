// Deck: DESPERATE. It is a long fifteen minutes.
//
// Everything here costs real seconds and almost nothing here does anything, and that is the point
// of the deck: it is always in the list, next to carrying somebody forward, at a similar price,
// looking equally reasonable at three in the morning of the ninth minute. Two of them are how you
// unlock an ending and one of them is genuinely the best action in the game for one character.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;

    function slot(S, id) { return st.slotOf(S, id); }
    function have(S, id) { const s = slot(S, id); return s && !s.spent; }
    function nearFire(S) {
        const spots = [[S.player.x, S.player.y]].concat(cabin.neighbours(S.player.x, S.player.y));
        return spots.some(([x, y]) => S.fire.intensity[cabin.idx(x, y)] > 1);
    }

    A.register([
        // -------------------------------------------------------------- talking to the fire ---
        { id: "desperate.negotiate", deck: "desperate", tags: ["absurd", "waste"],
          label: "Negotiate with the fire", cost: 14,
          when: nearFire,
          run(S) {
              const name = S.flags.fireName || "it";
              return "You explain to " + name + ", out loud, in a reasonable tone, that there are " +
                  "sixty-one people on this aeroplane and eleven minutes to go and that this " +
                  "does not have to happen. " + name + " continues.";
          } },

        { id: "desperate.apologise", deck: "desperate", tags: ["absurd", "waste"],
          label: "Apologise to the fire", cost: 9,
          when: nearFire,
          run(S) {
              return "“Sorry.” You say it to a fire. Two rows can hear you. One of them says it " +
                  "back, which is worse.";
          } },

        { id: "desperate.ask_stop", deck: "desperate", tags: ["absurd", "waste"],
          label: "Ask the fire to stop", cost: 7,
          when: nearFire,
          run(S) {
              return "You ask it to stop. There is a version of you that would find this funny and " +
                  "it is not the version that is currently operating.";
          } },

        { id: "desperate.stare", deck: "desperate", tags: ["absurd", "waste"],
          label: "Stare into it", cost: 22,
          when: nearFire,
          run(S) {
              S.player.smokeDose += 4;
              return "Twenty-two seconds of looking at the middle of a fire. Nobody moves you. " +
                  "Nobody asks. Everybody assumes you are doing something.";
          } },

        { id: "desperate.headbutt", deck: "desperate", tags: ["absurd"], danger: "bad",
          label: "Headbutt the overhead locker", cost: 6,
          when: (S) => cabin.rowAt(S.player.x) !== null,
          run(S) {
              S.player.burns += 4;
              S.player.panic = Math.max(0, S.player.panic - 12);
              return { text: "You headbutt a locker. It does not open. Your forehead is now also " +
                  "part of today.", kind: "bad" };
          } },

        // ---------------------------------------------------------------- performing for people ---
        { id: "desperate.speech", deck: "desperate", tags: ["social", "absurd"],
          label: "Stand on a seat and address the cabin", cost: 30,
          when: (S) => cabin.rowAt(S.player.x) !== null && !S.flags.gaveSpeech,
          run(S) {
              st.setFlag(S, "gaveSpeech");
              let convinced = 0;
              for (const p of st.withinEarshot(S, 6)) {
                  p.awareness = Math.min(100, p.awareness + 30);
                  const roll = PRS.pax.convince(S, p, 6);
                  if (roll.ok) { p.trust = Math.min(100, p.trust + 30); convinced++; }
              }
              S.credibility = Math.min(100, S.credibility + 10);
              return { text: "You stand on an armrest and give thirty seconds of the worst and " +
                  "most sincere speech of your life. " + convinced + " people are moved by it. " +
                  "The rest of them are embarrassed, which is a thing people can still be " +
                  "eleven minutes into this.", kind: convinced > 3 ? "good" : "plain" };
          } },

        { id: "desperate.vote", deck: "desperate", tags: ["social", "absurd", "waste"],
          label: "Take a vote", cost: 44,
          when: (S) => S.cabinAwareness > 30 && !S.flags.tookAVote,
          run(S) {
              st.setFlag(S, "tookAVote");
              const yes = Math.round(S.cabinAwareness / 4);
              return { text: "You ask for a show of hands on whether the cabin should do something " +
                  "about the fire. " + yes + " in favour. Eleven against. Nine abstentions and " +
                  "one procedural objection from a man in 15C who is a magistrate.", kind: "bad" };
          } },

        { id: "desperate.committee", deck: "desperate", tags: ["social", "absurd", "waste"],
          label: "Form a committee", cost: 52,
          when: (S) => !!S.flags.tookAVote,
          once: true,
          run(S) {
              return { text: "Four of you, in the cross-aisle, with terms of reference. Bernard " +
                  "Halliwell has appointed himself chair. The first item is apologies for " +
                  "absence.", kind: "bad" };
          } },

        { id: "desperate.delegate", deck: "desperate", tags: ["social", "absurd"],
          label: "Put somebody else in charge", cost: 16,
          when: (S) => st.reachable(S).length > 0,
          run(S) {
              const p = S.rng.pick(st.reachable(S));
              if (!p) return "There is nobody to hand it to.";
              const roll = PRS.pax.convince(S, p, 4);
              if (roll.ok) {
                  PRS.pax.recruit(S, p, "You have handed the whole thing over.");
                  return { text: "“You do it. You're better at this than me.” " + p.name +
                      " looks at you, and takes it, and is better at it than you.", kind: "great" };
              }
              return { text: p.name + " says no. It is the correct answer and it does not help.",
                       kind: "bad" };
          } },

        { id: "desperate.sing", deck: "desperate", tags: ["absurd", "social"],
          label: "Start singing", cost: 22,
          run(S) {
              let n = 0;
              for (const p of st.withinEarshot(S, 3)) { p.panic = Math.max(0, p.panic - 18); n++; }
              S.player.panic = Math.max(0, S.player.panic - 16);
              return { text: "You start singing, in an aeroplane, during a fire. " + n +
                  " people near you become calmer. Two of them join in and one of them is " +
                  "harmonising, which suggests they have been waiting for the opportunity.",
                  kind: "good" };
          } },

        { id: "desperate.harmonica", deck: "desperate", tags: ["absurd", "social"],
          label: "Play the harmonica properly", cost: 26,
          detail: "Not a few bars. A whole thing. All the way through.",
          when: (S) => have(S, "harmonica"),
          run(S) {
              let n = 0;
              for (const p of st.withinEarshot(S, 5)) {
                  p.panic = Math.max(0, p.panic - 38);
                  p.trust = Math.min(100, p.trust + 12);
                  n++;
              }
              S.player.panic = Math.max(0, S.player.panic - 30);
              const times = (S.counts["desperate.harmonica"] || 0) + 1;
              if (times >= 3) {
                  return { text: "Third time. Twenty-six seconds each. Seventy-eight seconds of " +
                      "harmonica out of nine hundred seconds of aeroplane. Every survivor is " +
                      "going to mention this and not one of them is going to be able to say why " +
                      "it helped.", kind: "great" };
              }
              return { text: "The whole thing, all the way through, in C, in the aisle at row " +
                  (cabin.rowAt(S.player.x) || "?") + ". " + n + " people go quiet and listen to " +
                  "it and stop being as frightened as they were.", kind: "good" };
          } },

        { id: "desperate.safety_demo", deck: "desperate", tags: ["absurd", "social"],
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
                  "the first time in the history of commercial aviation, watching it.\n\n" + n +
                  " people now know where the doors are and what the brace position is. It took " +
                  "thirty-four seconds and it is worth more than most of what you have done.",
                  kind: "great" };
          } },

        { id: "desperate.laugh", deck: "desperate", tags: ["absurd", "self"],
          label: "Laugh", cost: 7,
          when: (S) => S.player.panic > 55,
          run(S) {
              S.player.panic = Math.max(0, S.player.panic - 22);
              S.cabinPanic = Math.min(100, S.cabinPanic + 6);
              return "You laugh. It is not a good laugh and it does not stop cleanly and three " +
                  "people look at you the way you have been looking at everybody else.";
          } },

        { id: "desperate.scream", deck: "desperate", tags: ["absurd", "self"], danger: "bad",
          label: "Scream", cost: 6,
          run(S) {
              S.player.panic = Math.max(0, S.player.panic - 14);
              S.cabinPanic = Math.min(100, S.cabinPanic + 18);
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 12);
              return { text: "You scream. It works: it takes something out of you and it puts " +
                  "the same thing into sixty other people.", kind: "bad" };
          } },

        { id: "desperate.hug", deck: "desperate", tags: ["social"],
          targets: (S) => st.reachable(S).filter((p) => p.state !== "down")
                                          .map((p) => ({ key: p.id, p: p })),
          label: (S, c) => "Hug " + c.p.name,
          cost: 12,
          run(S, c) {
              c.p.panic = Math.max(0, c.p.panic - 34);
              c.p.trust = Math.min(100, c.p.trust + 26);
              S.player.panic = Math.max(0, S.player.panic - 14);
              return "You hug " + c.p.name + ", who you have known for nine minutes. Both of you " +
                  "needed it and only one of you is going to mention it afterwards.";
          } },

        // ----------------------------------------------------------------- administrative acts ---
        { id: "desperate.will", deck: "desperate", tags: ["absurd"],
          label: "Write a will on the sick bag", cost: 40,
          once: true,
          run(S) {
              PRS.state.note(S, "A holographic will was recovered, written on an air sickness " +
                  "bag, dated and signed, and it was found to be valid.");
              S.player.panic = Math.max(0, S.player.panic - 30);
              return { text: "Forty seconds, a biro, and a paper bag. You date it and sign it. It " +
                  "will turn out, in about a year, to be legally valid, which is going to cause " +
                  "an enormous amount of trouble for people you love.", kind: "plain" };
          } },

        { id: "desperate.survey", deck: "desperate", tags: ["absurd", "waste"],
          label: "Fill in the customer satisfaction survey", cost: 30,
          when: (S) => have(S, "phone"),
          once: true,
          run(S) {
              return { text: "How likely are you to recommend us to a friend or colleague, on a " +
                  "scale of nought to ten? You give it careful thought. You give it a six, " +
                  "because the crew have been lovely.", kind: "bad" };
          } },

        { id: "desperate.complaint", deck: "desperate", tags: ["absurd", "waste"],
          label: "Draft a complaint to the airline", cost: 46,
          when: (S) => have(S, "phone"),
          once: true,
          run(S) {
              return { text: "Forty-six seconds. It opens “I am writing to express my " +
                  "disappointment” and it is, in its way, the most British object ever produced " +
                  "at eleven thousand feet.", kind: "bad" };
          } },

        { id: "desperate.petition", deck: "desperate", tags: ["absurd", "waste", "social"],
          label: "Start a petition", cost: 38,
          when: (S) => S.cabinAwareness > 40,
          once: true,
          run(S) {
              const n = Math.round(S.cabinAwareness / 8);
              return { text: n + " signatures, on the back of the safety card, calling on the " +
                  "operator to do something about the fire. Bernard Halliwell has signed it twice.",
                  kind: "bad" };
          } },

        { id: "desperate.rate", deck: "desperate", tags: ["absurd", "waste"],
          label: "Check whether you are insured for this", cost: 26,
          when: (S) => have(S, "phone"),
          once: true,
          run(S) {
              return { text: "No signal, but you have the policy document downloaded. Section 14, " +
                  "exclusions. You are reading an insurance policy. You are reading an insurance " +
                  "policy right now.", kind: "bad" };
          } },

        { id: "desperate.tracker", deck: "desperate", tags: ["absurd", "waste"],
          label: "Check the flight tracker", cost: 14,
          when: (S) => have(S, "phone"),
          run(S) {
              const t = S.clock.remaining;
              return "Cached, from before the descent. It says you are over the sea and that the " +
                  "flight is on time and that it lands in " + Math.ceil(t / 60) + " minutes, and " +
                  "every one of those three things is true.";
          } },

        // ------------------------------------------------------------------------- the gun -----
        { id: "desperate.gun_show", deck: "desperate", tags: ["social"], danger: "bad",
          label: "Draw the firearm",
          detail: "It is in the list because it is on you. It has no application here.",
          when: (S) => st.hasPerk(S, "armed") && !S.flags.gunDrawn,
          cost: 8,
          run(S) {
              st.setFlag(S, "gunDrawn");
              S.cabinPanic = Math.min(100, S.cabinPanic + 40);
              S.credibility = Math.max(0, S.credibility - 10);
              for (const p of S.pax) p.panic = Math.min(100, p.panic + 30);
              return { text: "You draw a firearm in the cabin of a burning aircraft. Everybody who " +
                  "was worried about the smoke is now worried about something else, which is " +
                  "not the same as being less worried.", kind: "bad" };
          } },

        { id: "desperate.gun_fire", deck: "desperate", tags: ["absurd"], danger: "bad",
          label: "Fire at the overhead locker", cost: 6,
          when: (S) => st.hasPerk(S, "armed") && !!S.flags.gunDrawn &&
                       Math.abs(S.player.x - S.fire.core.x) <= 3,
          run(S) {
              S.stats.gunShots++;
              S.player.usedGun = true;
              S.cabinPanic = 100;
              const key = cabin.binKey(S.fire.core.x, "left");
              S.cabinFlags.binsOpen[key] = true;
              S.fire.binOpen[key] = true;
              S.fire.core.exposed = true;
              S.fire.core.contained = 0;
              PRS.fire.apply(S.fire, S.fire.core.x, S.fire.core.y, "air", 1.4, 0.4);
              PRS.audio.play("flare");
              PRS.state.note(S, "A firearm was discharged in the cabin at the overhead stowage.");
              return { text: "You put a round through a composite locker door at a range of three " +
                  "metres, inside a pressure hull, above sixty-one people. The locker opens. The " +
                  "fire gets a great deal of air. Everybody in the aeroplane is now on the floor " +
                  "and none of them are getting up.", kind: "bad" };
          } },

        // -------------------------------------------------------------------------- the end ---
        { id: "desperate.count_souls", deck: "desperate", tags: ["look"],
          label: "Count everybody", cost: 24,
          detail: "Properly. Row by row. So somebody has the number.",
          when: (S) => S.clock.remaining < 400,
          once: true,
          run(S) {
              const secured = st.securedCount(S);
              const down = st.downCount(S);
              PRS.state.note(S, "A passenger conducted a manual head count during the descent: " +
                  secured + " forward, " + down + " unresponsive.");
              return { text: "Twenty-four seconds, row by row, both sides. Sixty-one souls. " +
                  secured + " forward and accounted for. " + down + " not responding. The rest " +
                  "in their seats.\n\nSomebody had to have the number and nobody else was going " +
                  "to have it.", kind: "good" };
          } },

        { id: "desperate.stand_still", deck: "desperate", tags: ["waste"],
          label: "Stand completely still", cost: 30,
          run(S) {
              return { text: "Thirty seconds. You do not move. The fire does. That is the deal " +
                  "and it has been the deal the whole time.", kind: "bad" };
          } },

        { id: "desperate.give_up", deck: "desperate", tags: ["self"], danger: "bad",
          label: "Sit down on the floor of the aisle", cost: 45,
          when: (S) => S.clock.remaining < 240,
          run(S) {
              S.player.smokeDose = Math.max(0, S.player.smokeDose - 6);
              S.player.panic = Math.max(0, S.player.panic - 40);
              S.player.stamina = Math.min(100, S.player.stamina + 30);
              return { text: "You sit down on the floor of the aisle with your back against a " +
                  "seat, in the good air, and you stop for forty-five seconds. It is the first " +
                  "time you have stopped. It is also the cleanest air you have breathed in nine " +
                  "minutes, so it is not even a mistake, which is somehow the worst part.",
                  kind: "plain" };
          } },

        { id: "desperate.last_look", deck: "desperate", tags: ["look"],
          label: "Look down the cabin one more time", cost: 12,
          when: (S) => S.clock.remaining < 120,
          run(S) {
              const secured = st.securedCount(S);
              return { text: "Grey, from about waist height up, all the way to the tail. " +
                  secured + " people forward with their heads down. Somewhere aft, something in " +
                  "a locker goes off again, and it is the ninth time and nobody in this aeroplane " +
                  "reacts to it any more.\n\nThat is the whole thing. That is what it was.",
                  kind: "plain" };
          } },
    ]);
})(window);
