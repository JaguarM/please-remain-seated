// Deck: YOUR BAG. The one thing you can do with any object that is not use it: hand it to
// somebody. It is written against a list of what is worth giving rather than against tags,
// because giving somebody the duct tape is not a kindness.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const st = PRS.state;
    const A = PRS.actions;

    const GIVABLE = ["water_big", "wet_towel", "blanket", "hood", "first_aid", "inhaler", "gloves"];

    A.register([
        { id: "items.give", item: (S, c) => c.s.id, deck: "items", tags: ["hands"],
          targets(S) {
            const out = [];
            for (const p of st.reachable(S)) {
                for (const s of S.inventory) {
                    if (s.spent || GIVABLE.indexOf(s.id) < 0) continue;
                    out.push({ key: p.id + ":" + s.id, p: p, s: s });
                }
            }
            return out.slice(0, 30);
          },
          label: (S, c) => "Hand " + c.p.name + " the " + PRS.loot.short(c.s.item.name),
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
              return { text: "You hand " + c.p.name + " the " + PRS.loot.short(c.s.item.name) +
                  " and do not explain and do not wait. It is the best use of that object " +
                  "available and it is now somebody else's problem to use it well.", kind: "good" };
          } },
    ]);
})(window);
