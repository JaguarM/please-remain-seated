// Deck: YOURSELF. You are also a person on this aeroplane, and the game keeps a smoke dose and a
// burn total for you the way it keeps them for the other sixty. It does not keep a panic level.
// Everybody on board is frightened; you are the one who is allowed to be frightened and work
// anyway, and there is no number here that can take that off you.
//
// Almost everything here is a trade of seconds for capability: a hood is thirty seconds now and
// four minutes of working lungs later, and sitting down is forty-six seconds for nothing at all,
// and the game will offer you both with the same face.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;
    const st = PRS.state;
    const A = PRS.actions;

    function slot(S, id) { return st.slotOf(S, id); }
    function have(S, id) { const s = slot(S, id); return s && !s.spent; }

    A.register([
        // ------------------------------------------------------------------------ breathing ---
        { id: "self.hood", item: "hood", deck: "self", tags: ["self"], danger: "good",
          label: K("Put on the smoke hood"), cost: 26,
          detail: K("Fifteen minutes of air. It is the whole flight and it is twenty-six seconds."),
          when: (S) => have(S, "hood") && !st.wearing(S, "hood"),
          run(S) {
              S.player.wearing.hood = true;
              st.useCharge(S, slot(S, "hood"));
              return { text: T("The foil packet, the seal round the neck, and then the whole " +
                               "cabin goes quiet and slightly yellow and you can breathe. You " +
                               "can just breathe. Nobody else on this aeroplane can do that."),
                       kind: "great" };
          } },

        { id: "self.wet_shirt", item: (S) => { const s = st.inventoryHas(S, "cloth"); return s ? s.id : null; }, deck: "self", tags: ["self"], danger: "good",
          label: K("Tie something wet over your face"), cost: 12,
          when: (S) => (!!st.inventoryHas(S, "cloth")) && !st.wearing(S, "wet_towel") &&
                       !st.wearing(S, "hood"),
          run(S) {
              const s = st.inventoryHas(S, "cloth");
              S.player.wearing[s.id] = true;
              return { text: T("Over the nose and mouth, tied at the back. It stops the " +
                               "particles and it does nothing at all about the carbon monoxide, " +
                               "and one out of two is the best offer on this aeroplane."),
                       kind: "good" };
          } },

        { id: "self.inhaler", item: "inhaler", deck: "self", tags: ["self"], danger: "good",
          label: K("Use the inhaler yourself"), cost: 8,
          when: (S) => have(S, "inhaler") && slot(S, "inhaler").uses > 0 && S.player.smokeDose > 15,
          run(S) {
              st.useCharge(S, slot(S, "inhaler"));
              S.player.smokeDose = Math.max(0, S.player.smokeDose - 18);
              return { text: T("Two puffs. The bottom of your lungs comes back online."),
                       kind: "good" };
          } },

        { id: "self.goggles", item: "goggles", deck: "self", tags: ["self"], danger: "good",
          label: K("Put the swimming goggles on"), cost: 7,
          when: (S) => have(S, "goggles") && !st.wearing(S, "goggles"),
          run(S) {
              S.player.wearing.goggles = true;
              return { text: T("You put mirrored swimming goggles on in a burning aeroplane " +
                               "and you can suddenly keep your eyes open in smoke that has " +
                               "everybody else's shut. You look absurd. You look absurd and you " +
                               "can see."), kind: "good" };
          } },

        // ---------------------------------------------------------------------------- wearing ---
        { id: "self.hivis", item: "hivis", deck: "self", tags: ["self"], danger: "good",
          label: K("Put the hi-vis vest on"), cost: 9,
          when: (S) => have(S, "hivis") && !st.wearing(S, "hivis"),
          run(S) {
              S.player.wearing.hivis = true;
              S.credibility = Math.min(100, S.credibility + 8);
              return { text: T("You put on a hi-vis vest. Nothing about you has changed and " +
                               "the way everybody in four rows looks at you has changed " +
                               "completely."), kind: "good" };
          } },

        { id: "self.gloves", item: "gloves", deck: "self", tags: ["self"], danger: "good",
          label: K("Put the welding gloves on"), cost: 8,
          when: (S) => have(S, "gloves") && !st.wearing(S, "gloves"),
          run(S) {
              S.player.wearing.gloves = true;
              return { text: T("Elbow-length, leather, from a hobby you have not done since " +
                               "March. You can now pick up things that are on fire, which turns " +
                               "out to be the constraint on almost everything."),
                       kind: "great" };
          } },

        // ------------------------------------------------------------------------ your state ---

        { id: "self.burn_gel_self", item: "first_aid", deck: "self", tags: ["self"], danger: "good",
          label: K("Put burn gel on your own hands"), cost: 18,
          when: (S) => S.player.burns > 15 && have(S, "first_aid") && slot(S, "first_aid").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "first_aid"));
              S.player.burns = Math.max(0, S.player.burns - 24);
              return { text: T("Gel, then a dressing, then the glove back over the top of it. " +
                               "Eighteen seconds and your hands are hands again."),
                       kind: "good" };
          } },

        // ---------------------------------------------------------------------- the phone ------

        // ------------------------------------------------------------------------- thinking ---
    ]);
})(window);
