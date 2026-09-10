// Deck: YOUR BAG. Everything you decided on the ground, made available to you at the worst
// possible time, plus the small number of things you can make out of two other things.
//
// The generic entries at the bottom - look in the bag, hand a thing over, drop a thing - are
// written against item tags rather than item ids, so a new item in items.js is playable in every
// one of them without a line being written here.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;

    function slot(S, id) { return st.slotOf(S, id); }
    function have(S, id) { const s = slot(S, id); return s && !s.spent; }
    function atLav(S) { return cabin.kindAt(S.player.x, S.player.y) === "lav"; }

    A.register([
        // -------------------------------------------------------------------------- the bag ---

        { id: "items.give", item: (S, c) => c.s.id, deck: "items", tags: ["hands"],
          targets(S) {
            const out = [];
            for (const p of st.reachable(S)) {
                for (const s of S.inventory) {
                    if (s.spent) continue;
                    if (["water_big", "wet_towel", "blanket", "hood", "first_aid",
                         "inhaler", "goggles", "gloves"].indexOf(s.id) < 0) continue;
                    out.push({ key: p.id + ":" + s.id, p: p, s: s });
                }
            }
            return out.slice(0, 30);
          },
          label: (S, c) => "Give " + c.p.name + " the " + c.s.item.name.toLowerCase(),
          detail: "You will not have it any more. They will.",
          cost: 9,
          run(S, c) {
              S.inventory = S.inventory.filter((s) => s !== c.s);
              c.p.trust = Math.min(100, c.p.trust + 35);
              if (c.s.id === "hood" || c.s.id === "wet_towel" || c.s.id === "blanket") {
                  c.p.masked = true;
              }
              if (c.s.id === "inhaler" || c.s.id === "first_aid") {
                  c.p.smokeDose = Math.max(0, c.p.smokeDose - 14);
              }
              return { text: "You give " + c.p.name + " the " + c.s.item.name.toLowerCase() +
                  " and do not explain and do not wait. It is the best use of that object " +
                  "available and it is now somebody else's problem to use it well.", kind: "good" };
          } },

        // ------------------------------------------------------------------ making things wet ---

        // -------------------------------------------------------------------- making a noise ---

        // ------------------------------------------------------------------------- the iguana ---

        // -------------------------------------------------------------------------- the tool ---

        { id: "items.strap_drag", item: "strap", deck: "items", tags: ["carry"], danger: "good",
          targets: (S) => st.reachable(S).filter((p) => p.state === "down" ||
                                                        p.traits.indexOf("immobile") >= 0)
                                          .map((p) => ({ key: p.id, p: p })),
          when: (S) => have(S, "strap") && !S.player.dragging,
          label: (S, c) => "Get the luggage strap under " + c.p.name,
          detail: "A strap under the arms turns an impossible lift into a possible drag.",
          cost: 16,
          run(S, c) {
              S.player.dragging = c.p.id;
              c.p.state = "carried";
              c.p.carriedBy = "player";
              c.p.strapped = true;
                if (c.p.kg > 90) st.setFlag(S, "carriedHeavy");
              st.reindex(S);
              return { text: "Under the arms, across the chest, buckle at the back, and you have " +
                  "a handle. " + c.p.name + " weighs " + c.p.kg + " kilos and now weighs about " +
                  "half that.", kind: "great" };
          } },
    ]);
})(window);
