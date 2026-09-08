// Deck: YOURSELF. You are also a person on this aeroplane, and the game keeps a smoke dose and a
// burn total and a panic level for you exactly the way it keeps them for the other sixty.
//
// Almost everything here is a trade of seconds for capability: a hood is thirty seconds now and
// four minutes of working lungs later, and sitting down is forty-six seconds for nothing at all,
// and the game will offer you both with the same face.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const clamp = PRS.util.clamp;

    function slot(S, id) { return st.slotOf(S, id); }
    function have(S, id) { const s = slot(S, id); return s && !s.spent; }
    function smokeHere(S) { return S.fire.smoke[cabin.idx(S.player.x, S.player.y)]; }

    A.register([
        // ------------------------------------------------------------------------ breathing ---
        { id: "self.hood", deck: "self", tags: ["self"], danger: "good",
          label: "Put on the smoke hood", cost: 26,
          detail: "Fifteen minutes of air. It is the whole flight and it is twenty-six seconds.",
          when: (S) => have(S, "hood") && !st.wearing(S, "hood"),
          run(S) {
              S.player.wearing.hood = true;
              st.useCharge(S, slot(S, "hood"));
              return { text: "The foil packet, the seal round the neck, and then the whole cabin " +
                  "goes quiet and slightly yellow and you can breathe. You can just breathe. " +
                  "Nobody else on this aeroplane can do that.", kind: "great" };
          } },

        { id: "self.hood_off", deck: "self", tags: ["self"], danger: "bad",
          label: "Take the smoke hood off", cost: 8,
          detail: "So that people can hear what you are saying to them.",
          when: (S) => st.wearing(S, "hood"),
          run(S) {
              S.player.wearing.hood = false;
              return { text: "You pull the hood off so somebody can hear you. It is a reasonable " +
                  "trade and it is a trade.", kind: "bad" };
          } },

        { id: "self.wet_shirt", deck: "self", tags: ["self"], danger: "good",
          label: "Tie something wet over your face", cost: 12,
          when: (S) => (!!st.inventoryHas(S, "cloth")) && !st.wearing(S, "wet_towel") &&
                       !st.wearing(S, "hood"),
          run(S) {
              const s = st.inventoryHas(S, "cloth");
              S.player.wearing[s.id] = true;
              return { text: "Over the nose and mouth, tied at the back. It stops the particles " +
                  "and it does nothing at all about the carbon monoxide, and one out of two is " +
                  "the best offer on this aeroplane.", kind: "good" };
          } },

        { id: "self.hold_breath", deck: "self", tags: ["self"],
          label: "Hold your breath and go through it", cost: 14,
          detail: "Fourteen seconds of not breathing. It is a real technique.",
          when: (S) => smokeHere(S) > 25,
          run(S) {
              S.player.smokeDose = Math.max(0, S.player.smokeDose - 8);
              S.player.stamina = Math.max(0, S.player.stamina - 20);
              return "You take one breath from as low as you can get and hold it. Fourteen " +
                  "seconds is a very long time when you have been running.";
          } },

        { id: "self.cough", deck: "self", tags: ["self"],
          label: "Cough it out", cost: 9,
          when: (S) => S.player.smokeDose > 14,
          run(S) {
              PRS.audio.play("cough");
              S.player.smokeDose = Math.max(0, S.player.smokeDose - 4);
              return "You cough until it changes shape, and something black comes up, and you " +
                  "look at it for a second and then you do not think about it again.";
          } },

        { id: "self.inhaler", deck: "self", tags: ["self"], danger: "good",
          label: "Use the inhaler yourself", cost: 8,
          when: (S) => have(S, "inhaler") && slot(S, "inhaler").uses > 0 && S.player.smokeDose > 15,
          run(S) {
              st.useCharge(S, slot(S, "inhaler"));
              S.player.smokeDose = Math.max(0, S.player.smokeDose - 18);
              return { text: "Two puffs. The bottom of your lungs comes back online.", kind: "good" };
          } },

        { id: "self.goggles", deck: "self", tags: ["self"], danger: "good",
          label: "Put the swimming goggles on", cost: 7,
          when: (S) => have(S, "goggles") && !st.wearing(S, "goggles"),
          run(S) {
              S.player.wearing.goggles = true;
              return { text: "You put mirrored swimming goggles on in a burning aeroplane and you " +
                  "can suddenly keep your eyes open in smoke that has everybody else's shut. You " +
                  "look absurd. You look absurd and you can see.", kind: "good" };
          } },

        // ---------------------------------------------------------------------------- wearing ---
        { id: "self.hivis", deck: "self", tags: ["self"], danger: "good",
          label: "Put the hi-vis vest on", cost: 9,
          when: (S) => have(S, "hivis") && !st.wearing(S, "hivis"),
          run(S) {
              S.player.wearing.hivis = true;
              S.credibility = Math.min(100, S.credibility + 8);
              return { text: "You put on a hi-vis vest. Nothing about you has changed and the way " +
                  "everybody in four rows looks at you has changed completely.", kind: "good" };
          } },

        { id: "self.lanyard", deck: "self", tags: ["self"],
          label: "Put the lanyard on", cost: 5,
          when: (S) => have(S, "lanyard") && !st.wearing(S, "lanyard"),
          run(S) {
              S.player.wearing.lanyard = true;
              return "AVIATION SAFETY EXPO 2023 — DELEGATE, round your neck, face out. Nobody is " +
                  "going to read it and everybody is going to see it.";
          } },

        { id: "self.gloves", deck: "self", tags: ["self"], danger: "good",
          label: "Put the welding gloves on", cost: 8,
          when: (S) => have(S, "gloves") && !st.wearing(S, "gloves"),
          run(S) {
              S.player.wearing.gloves = true;
              return { text: "Elbow-length, leather, from a hobby you have not done since March. " +
                  "You can now pick up things that are on fire, which turns out to be the " +
                  "constraint on almost everything.", kind: "great" };
          } },

        { id: "self.life_vest", deck: "self", tags: ["self", "waste"],
          label: "Put on the life vest", cost: 22,
          detail: "You are over land. It is thirty-one thousand feet of land.",
          when: (S) => !st.wearing(S, "vest"),
          run(S) {
              S.player.wearing.vest = true;
              S.player.panic = Math.max(0, S.player.panic - 10);
              return { text: "Over the head, tapes round the waist, buckle at the front. It makes " +
                  "you feel better, which is the only thing it is doing.", kind: "plain" };
          } },

        { id: "self.inflate_vest", deck: "self", tags: ["self"], danger: "bad",
          label: "Inflate the life vest", cost: 6,
          detail: "Inside the cabin. There is a reason the briefing says not to.",
          when: (S) => st.wearing(S, "vest") && !S.flags.vestInflated,
          run(S) {
              st.setFlag(S, "vestInflated");
              return { text: "You pull the toggle and become forty per cent wider in a corridor " +
                  "that is fifty centimetres across. Everything you do from here costs more.",
                  kind: "bad" };
          } },

        { id: "self.headphones", deck: "self", tags: ["self"],
          label: (S) => st.wearing(S, "headphones") ? "Take the headphones off"
                                                    : "Put the noise cancelling on",
          detail: "It is calmer in there. It is also where the last hour went.",
          when: (S) => have(S, "headphones"),
          cost: 6,
          run(S) {
              S.player.wearing.headphones = !S.player.wearing.headphones;
              if (S.player.wearing.headphones) {
                  S.player.panic = Math.max(0, S.player.panic - 18);
                  return "The cabin drops away to a hum. You are calmer and you cannot hear a " +
                      "single thing anybody is shouting at you.";
              }
              return "The aeroplane comes back all at once and it is much worse than you had " +
                  "been letting yourself remember.";
          } },

        { id: "self.earplugs", deck: "self", tags: ["self", "absurd"],
          label: "Put the earplugs in", cost: 5,
          when: (S) => have(S, "earplugs") && !st.wearing(S, "earplugs"),
          run(S) {
              S.player.wearing.earplugs = true;
              return "Foam earplugs, rolled between the fingers and pushed in. You can no longer " +
                  "hear anybody telling you to sit down, which is a genuine tactical advantage.";
          } },

        // ------------------------------------------------------------------------ your state ---
        { id: "self.brace", deck: "self", tags: ["self"], danger: "good",
          label: "Brace", cost: 10,
          when: (S) => S.clock.remaining < 200 && !S.player.braced,
          run(S) {
              S.player.braced = true;
              return { text: "Head down, hands over the back of it, feet back behind your knees. " +
                  "It is the last thing on the list and there is not much list left.", kind: "good" };
          } },

        { id: "self.sit", deck: "self", tags: ["self", "waste"], danger: "bad",
          label: "Sit down", cost: 40,
          detail: "It is what everyone has been asking you to do since minute one.",
          when: (S) => S.player.x !== S.player.homeX || S.player.y !== S.player.homeY,
          run(S) {
              const r = A.route(S, S.player.homeX, S.player.homeY);
              if (r) A.travel(S, r);
              S.player.seatedTurns++;
              S.player.panic = Math.max(0, S.player.panic - 14);
              S.cabinPanic = Math.max(0, S.cabinPanic - 3);
              return { text: "You go back to " + S.player.seat + " and you sit down and you put " +
                  "your belt on, and the cabin relaxes around you by a measurable amount. " +
                  "Nothing else about the situation changes in any way.", kind: "bad" };
          } },

        { id: "self.stand", deck: "self", tags: ["self"],
          label: "Stand back up", cost: 8,
          when: (S) => S.player.x === S.player.homeX && S.player.y === S.player.homeY &&
                       S.player.seatedTurns > 0,
          run(S) {
              return "You stand up again. Two people sigh. One of them says something to the " +
                  "person next to them about it.";
          } },

        { id: "self.calm", deck: "self", tags: ["self"],
          label: "Get your own breathing under control", cost: 14,
          when: (S) => S.player.panic > 35,
          run(S) {
              const drop = 26 + (st.hasPerk(S, "calm_presence") ? 20 : 0);
              S.player.panic = Math.max(0, S.player.panic - drop);
              return "Four in, seven hold, eight out, twice. It works. It always works and it is " +
                  "the last thing anybody thinks of.";
          } },

        { id: "self.count_ten", deck: "self", tags: ["self", "waste"],
          label: "Count to ten", cost: 10,
          run(S) {
              S.player.panic = Math.max(0, S.player.panic - 12);
              return "One. Two. Three. Four. Five. Six. Seven. Eight. Nine. Ten. The fire got " +
                  "ten seconds of your fifteen minutes and you got your hands back.";
          } },

        { id: "self.panic", deck: "self", tags: ["self"], danger: "bad",
          label: "Let go of it", cost: 18,
          detail: "Stop holding it together. See what is underneath.",
          when: (S) => S.player.panic > 50,
          run(S) {
              S.player.panic = Math.min(100, S.player.panic + 30);
              if (st.hasPerk(S, "adrenaline") && S.player.panic >= 80) {
                  return { text: "Everything goes very bright and very simple and very fast. You " +
                      "have been waiting your whole life to find out what you are like at the " +
                      "bottom of this and it turns out you are quick.", kind: "great" };
              }
              return { text: "You come apart for eighteen seconds in the aisle at row " +
                  (cabin.rowAt(S.player.x) || "?") + ". Nobody helps. Two people film it.",
                  kind: "bad" };
          } },

        { id: "self.check_burns", deck: "self", tags: ["self", "look"],
          label: "Look at your hands", cost: 5,
          when: (S) => S.player.burns > 5,
          run(S) {
              const b = S.player.burns;
              if (b > 45) return { text: "They are bad. They are properly bad and they have " +
                  "stopped hurting, which you know is the wrong direction for that to go.",
                  kind: "bad" };
              if (b > 20) return { text: "Red across the backs and one blister that has already " +
                  "gone. They work. They are going to be a problem tomorrow.", kind: "bad" };
              return "Red. Sore. Fine. It is going to look worse in the morning than it is.";
          } },

        { id: "self.burn_gel_self", deck: "self", tags: ["self"], danger: "good",
          label: "Put burn gel on your own hands", cost: 18,
          when: (S) => S.player.burns > 15 && have(S, "first_aid") && slot(S, "first_aid").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "first_aid"));
              S.player.burns = Math.max(0, S.player.burns - 24);
              return { text: "Gel, then a dressing, then the glove back over the top of it. " +
                  "Eighteen seconds and your hands are hands again.", kind: "good" };
          } },

        { id: "self.drink", deck: "self", tags: ["self"],
          label: "Drink some of the water", cost: 6,
          when: (S) => have(S, "water_big") && slot(S, "water_big").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "water_big"));
              S.player.smokeDose = Math.max(0, S.player.smokeDose - 4);
              S.player.stamina = Math.min(100, S.player.stamina + 20);
              return "You drink about a third of a bottle of water in one go, standing in the " +
                  "aisle, and it is the best thing you have ever tasted.";
          } },

        { id: "self.drink_gin", deck: "self", tags: ["self", "absurd"], danger: "bad",
          label: "Drink one of the miniatures", cost: 6,
          when: (S) => have(S, "gin") && slot(S, "gin").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "gin"));
              S.player.panic = Math.max(0, S.player.panic - 26);
              S.player.drunk = (S.player.drunk || 0) + 1;
              return { text: "Fifty millilitres of gin, neat, warm, in an aisle, during a fire. " +
                  "You feel considerably better and you are considerably worse.", kind: "bad" };
          } },

        { id: "self.pretzels", deck: "self", tags: ["self", "absurd"],
          label: "Eat the pretzels", cost: 8,
          when: (S) => have(S, "pretzels") && slot(S, "pretzels").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "pretzels"));
              S.player.stamina = Math.min(100, S.player.stamina + 25);
              return "You eat a bag of pretzels, standing up, in smoke, at row " +
                  (cabin.rowAt(S.player.x) || "?") + ", while an aeroplane burns. They are very " +
                  "salty. You needed the salt. That is not why you did it.";
          } },

        { id: "self.rest", deck: "self", tags: ["self", "waste"],
          label: "Put your hands on your knees for a moment", cost: 20,
          when: (S) => S.player.stamina < 45,
          run(S) {
              S.player.stamina = Math.min(100, S.player.stamina + 40);
              return "Twenty seconds, bent over, in the cross-aisle. Your arms come back. It is " +
                  "the right call and it feels like the wrong one.";
          } },

        // ---------------------------------------------------------------------- the phone ------
        { id: "self.film", deck: "self", tags: ["self"], danger: "good",
          label: "Film what is happening", cost: 8,
          when: (S) => have(S, "phone"),
          run(S) {
              S.stats.filmed++;
              S.player.filmedAt = S.clock.elapsed;
              st.setFlag(S, "havePhoto");
              S.credibility = Math.min(100, S.credibility + 6);
              if (st.hasPerk(S, "filming")) S.player.panic = Math.max(0, S.player.panic - 18);
              const n = S.stats.filmed;
              if (n === 1) return { text: "Eleven seconds of an overhead locker with light coming " +
                  "out of the seam of it. You now have proof.", kind: "good" };
              if (n < 4) return "More footage. The bin, the smoke line on the ceiling, and about " +
                  "four seconds of somebody in row 16 asking you to sit down.";
              return "You are now the only continuous record of this event. That is going to be " +
                  "important and it is not going to be comfortable.";
          } },

        { id: "self.check_phone", deck: "self", tags: ["self", "waste"],
          label: "Check your phone for signal", cost: 6,
          when: (S) => have(S, "phone"),
          run(S) {
              return "No service. Sixty-one per cent battery, no service, and eleven notifications " +
                  "about a parcel.";
          } },

        { id: "self.airplane_mode", deck: "self", tags: ["self", "waste", "absurd"],
          label: "Turn airplane mode off", cost: 7,
          when: (S) => have(S, "phone") && !S.flags.airplaneModeOff,
          run(S) {
              st.setFlag(S, "airplaneModeOff");
              return "You break the one rule of aeroplanes that everybody actually follows, on an " +
                  "aeroplane that is on fire, and you get no signal at all.";
          } },

        { id: "self.text", deck: "self", tags: ["self"],
          label: "Write a message to somebody", cost: 26,
          detail: "It will not send. It will be on the phone.",
          when: (S) => have(S, "phone") && !S.flags.wroteMessage,
          run(S) {
              st.setFlag(S, "wroteMessage");
              S.player.panic = Math.max(0, S.player.panic - 20);
              PRS.state.note(S, "An unsent message was found on a passenger's phone, timestamped " +
                  PRS.util.mmss(S.clock.elapsed) + " into the descent.");
              return { text: "Twenty-six seconds. It does not send and it stays in the outbox, " +
                  "which is where somebody will find it either way.", kind: "plain" };
          } },

        { id: "self.search", deck: "self", tags: ["self", "absurd", "waste"],
          label: "Search for how to put out a lithium fire", cost: 20,
          when: (S) => have(S, "phone") && !S.flags.searched,
          run(S) {
              st.setFlag(S, "searched");
              return { text: "No service. You type the whole query anyway, and read it back, and " +
                  "it is: how to put out a lithium battery fire on a plane. It sits there in the " +
                  "box with a spinner next to it for the rest of the flight.", kind: "bad" };
          } },

        { id: "self.post", deck: "self", tags: ["self", "absurd", "waste"],
          label: "Post about it", cost: 24,
          when: (S) => have(S, "phone") && !S.flags.posted,
          run(S) {
              st.setFlag(S, "posted");
              return { text: "You compose four hundred characters about an ongoing emergency, " +
                  "attach the footage, and press post. It queues. Twenty-four seconds.",
                  kind: "bad" };
          } },

        { id: "self.torch_on", deck: "self", tags: ["self"], danger: "good",
          label: "Turn the torch on", cost: 4,
          when: (S) => have(S, "torch") && !S.flags.torchOn,
          run(S) {
              st.setFlag(S, "torchOn");
              return { text: "The beam goes about a metre into the smoke and stops dead, which " +
                  "tells you more about the smoke than anything else has.", kind: "good" };
          } },

        // ------------------------------------------------------------------------- thinking ---
        { id: "self.think", deck: "self", tags: ["self", "look"],
          label: "Stop and think for ten seconds", cost: 10,
          run(S) {
              const secured = st.securedCount(S);
              const helpers = st.helperCount(S);
              const left = S.pax.filter((p) => p.state !== "secured" && p.state !== "dead").length;
              const rate = secured / Math.max(1, S.clock.elapsed / 60);
              return "Ten seconds. " + secured + " secured, " + helpers + " people helping, " +
                  left + " still in seats, " + PRS.util.mmss(S.clock.remaining) + " left. At the " +
                  "rate you are going that is " + Math.round(rate * (S.clock.remaining / 60)) +
                  " more. The arithmetic is not a secret and it is not on your side.";
          } },

        { id: "self.remember_briefing", deck: "self", tags: ["self", "look"],
          label: "Try to remember the safety briefing", cost: 9,
          once: true,
          run(S) {
              return "Somebody in a uniform pointing both hands at a door while you looked at " +
                  "your phone. A card in a pocket you did not take out. A sentence about the " +
                  "nearest exit possibly being behind you. That is genuinely all of it.";
          } },

        { id: "self.accept", deck: "self", tags: ["self"],
          label: "Accept how this is going to go", cost: 12,
          when: (S) => S.clock.remaining < 300,
          once: true,
          run(S) {
              S.player.panic = Math.max(0, S.player.panic - 34);
              st.setFlag(S, "accepted");
              return { text: "You do the arithmetic properly and you stop arguing with it. There " +
                  "are people on this aeroplane you are not going to reach. Knowing that makes " +
                  "your hands steady, which is a horrible way for that to work.", kind: "plain" };
          } },

        { id: "self.refuse", deck: "self", tags: ["self"],
          label: "Refuse to accept how this is going to go", cost: 8,
          when: (S) => S.clock.remaining < 300,
          run(S) {
              S.player.panic = Math.min(100, S.player.panic + 12);
              S.player.stamina = Math.min(100, S.player.stamina + 30);
              return "No. You are not doing that. Not yet.";
          } },

        { id: "self.pray", deck: "self", tags: ["self"],
          label: "Pray", cost: 14,
          when: (S) => !!slot(S, "rosary") || S.player.panic > 60,
          run(S) {
              st.setFlag(S, "prayed");
              S.player.panic = Math.max(0, S.player.panic - 24);
              return "Fourteen seconds. You are not sure who to and it works anyway.";
          } },

        { id: "self.look_at_them", deck: "self", tags: ["self", "look"],
          label: "Look at the people you have not got to", cost: 11,
          when: (S) => S.clock.remaining < 420,
          run(S) {
              const left = S.pax.filter((p) => p.state !== "secured" && p.state !== "dead" &&
                                               PRS.pax.needsCarrying(p));
              if (!left.length) return { text: "Everybody who cannot walk is forward. Everybody. " +
                  "Look at that.", kind: "great" };
              const names = left.slice(0, 5).map((p) => p.name + " in " + p.seat);
              return { text: PRS.util.listSentence(names) +
                  (left.length > 5 ? ", and " + (left.length - 5) + " others" : "") +
                  ". None of them can get off this aeroplane without somebody.", kind: "bad" };
          } },

        { id: "self.vape", deck: "self", tags: ["self", "absurd"], danger: "bad",
          label: "Have a vape", cost: 9,
          detail: "You have one. It is the same model. It is in your pocket.",
          when: (S) => have(S, "vape"),
          run(S) {
              st.setFlag(S, "vapedOnBoard");
              S.player.panic = Math.max(0, S.player.panic - 16);
              PRS.state.note(S, "A vape device identical to the source unit was recovered from a " +
                  "passenger who had used it in the cabin during the event.");
              return { text: "You take a pull on a vape pen, in a cabin, during a fire caused by " +
                  "a vape pen, and put it back in your pocket next to a lithium cell that has " +
                  "been through the same eleven charge cycles as the one in the locker.",
                  kind: "bad" };
          } },
    ]);
})(window);
