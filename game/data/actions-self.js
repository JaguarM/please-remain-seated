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
        { id: "self.hood", item: "hood", deck: "self", tags: ["self"], danger: "good",
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

        { id: "self.wet_shirt", item: (S) => { const s = st.inventoryHas(S, "cloth"); return s ? s.id : null; }, deck: "self", tags: ["self"], danger: "good",
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

        { id: "self.inhaler", item: "inhaler", deck: "self", tags: ["self"], danger: "good",
          label: "Use the inhaler yourself", cost: 8,
          when: (S) => have(S, "inhaler") && slot(S, "inhaler").uses > 0 && S.player.smokeDose > 15,
          run(S) {
              st.useCharge(S, slot(S, "inhaler"));
              S.player.smokeDose = Math.max(0, S.player.smokeDose - 18);
              return { text: "Two puffs. The bottom of your lungs comes back online.", kind: "good" };
          } },

        { id: "self.goggles", item: "goggles", deck: "self", tags: ["self"], danger: "good",
          label: "Put the swimming goggles on", cost: 7,
          when: (S) => have(S, "goggles") && !st.wearing(S, "goggles"),
          run(S) {
              S.player.wearing.goggles = true;
              return { text: "You put mirrored swimming goggles on in a burning aeroplane and you " +
                  "can suddenly keep your eyes open in smoke that has everybody else's shut. You " +
                  "look absurd. You look absurd and you can see.", kind: "good" };
          } },

        // ---------------------------------------------------------------------------- wearing ---
        { id: "self.hivis", item: "hivis", deck: "self", tags: ["self"], danger: "good",
          label: "Put the hi-vis vest on", cost: 9,
          when: (S) => have(S, "hivis") && !st.wearing(S, "hivis"),
          run(S) {
              S.player.wearing.hivis = true;
              S.credibility = Math.min(100, S.credibility + 8);
              return { text: "You put on a hi-vis vest. Nothing about you has changed and the way " +
                  "everybody in four rows looks at you has changed completely.", kind: "good" };
          } },

        { id: "self.gloves", item: "gloves", deck: "self", tags: ["self"], danger: "good",
          label: "Put the welding gloves on", cost: 8,
          when: (S) => have(S, "gloves") && !st.wearing(S, "gloves"),
          run(S) {
              S.player.wearing.gloves = true;
              return { text: "Elbow-length, leather, from a hobby you have not done since March. " +
                  "You can now pick up things that are on fire, which turns out to be the " +
                  "constraint on almost everything.", kind: "great" };
          } },

        // ------------------------------------------------------------------------ your state ---

        { id: "self.calm", deck: "self", tags: ["self"],
          label: "Get your own breathing under control", cost: 14,
          when: (S) => S.player.panic > 35,
          run(S) {
              const drop = 26 + (st.hasPerk(S, "calm_presence") ? 20 : 0);
              S.player.panic = Math.max(0, S.player.panic - drop);
              return "Four in, seven hold, eight out, twice. It works. It always works and it is " +
                  "the last thing anybody thinks of.";
          } },

        { id: "self.panic", deck: "self", tags: ["self"], danger: "bad",
          label: "Let go of it", cost: 18,
          detail: "Stop holding it together. See what is underneath.",
          // Only for the one person whose perk needs it: past eighty, everything Priya does
          // costs half. For anybody else this is eighteen seconds of coming apart.
          when: (S) => st.hasPerk(S, "adrenaline") && S.player.panic > 50,
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

        { id: "self.burn_gel_self", item: "first_aid", deck: "self", tags: ["self"], danger: "good",
          label: "Put burn gel on your own hands", cost: 18,
          when: (S) => S.player.burns > 15 && have(S, "first_aid") && slot(S, "first_aid").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "first_aid"));
              S.player.burns = Math.max(0, S.player.burns - 24);
              return { text: "Gel, then a dressing, then the glove back over the top of it. " +
                  "Eighteen seconds and your hands are hands again.", kind: "good" };
          } },

        // ---------------------------------------------------------------------- the phone ------
        { id: "self.film", item: "phone", deck: "self", tags: ["self"], danger: "good",
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

        // ------------------------------------------------------------------------- thinking ---
    ]);
})(window);
