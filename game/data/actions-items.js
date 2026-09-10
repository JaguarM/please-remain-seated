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
                    if (["water_big", "wet_towel", "blanket", "hood", "torch", "first_aid",
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
        { id: "items.soak_pillow", item: "pillow", deck: "items", tags: ["hands"], danger: "good",
          label: "Soak the neck pillow", cost: 10,
          detail: "Memory foam holds a surprising amount of water and makes a real filter.",
          when: (S) => atLav(S) && have(S, "pillow") && !slot(S, "pillow").wet,
          run(S) {
              slot(S, "pillow").wet = true;
              S.player.wearing.pillow = true;
              return { text: "Sixty pounds of memory foam neck pillow, held under a tap until it " +
                  "stops taking any more, then over your face. You look like a person in the " +
                  "worst photograph ever taken and you are breathing filtered air.", kind: "good" };
          } },

        // -------------------------------------------------------------------- making a noise ---
        { id: "items.airhorn", item: "airhorn", deck: "items", tags: ["loud"], danger: "bad",
          label: "Sound the air horn", cost: 5,
          detail: "One hundred and twenty decibels. Everybody wakes up. Everybody.",
          when: (S) => have(S, "airhorn") && slot(S, "airhorn").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "airhorn"));
              PRS.audio.play("alarm");
              let woken = 0;
              for (const p of S.pax) {
                  if (p.state === "asleep") { p.state = "seated"; woken++; }
                  p.awareness = Math.min(100, p.awareness + 42);
                  p.panic = Math.min(100, p.panic + 26);
                  p.traits = p.traits.filter((t) => t !== "headphones");
              }
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 44);
              S.cabinPanic = Math.min(100, S.cabinPanic + 32);
              S.credibility = Math.max(0, S.credibility - 6);
              return { text: "You let off an air horn in a pressurised cabin. " + woken +
                  " people wake up instantly, sixty-one people find out at the same moment that " +
                  "something is wrong, and every one of them stands up in a corridor that fits " +
                  "one.", kind: "neutral" };
          } },

        { id: "items.whistle", item: "whistle", deck: "items", tags: ["loud"], danger: "good",
          label: "Blow the whistle", cost: 4,
          detail: "It cuts through smoke and noise and it does not start a stampede.",
          when: (S) => have(S, "whistle"),
          run(S) {
              PRS.audio.play("alarm");
              for (const p of st.withinEarshot(S, 4)) {
                  p.awareness = Math.min(100, p.awareness + 18);
              }
              S.credibility = Math.min(100, S.credibility + 4);
              return "Three short blasts. Everybody within four rows looks at exactly one place, " +
                  "which is you, which is what you wanted.";
          } },

        // ------------------------------------------------------------------------- the iguana ---

        { id: "items.carrier_child", item: "carrier", deck: "items", tags: ["carry"], danger: "good",
          targets: (S) => st.reachable(S).filter((p) => PRS.pax.isChild(p) || PRS.pax.isPet(p))
                                          .map((p) => ({ key: p.id, p: p })),
          when: (S) => have(S, "carrier") && S.player.carrying.length < S.derived.maxCarry,
          label: (S, c) => "Put " + c.p.name + " in the pet carrier",
          detail: "It has a strap. It goes over your shoulder. Both your hands come back.",
          cost: 14,
          run(S, c) {
              c.p.state = "carried";
              c.p.carriedBy = "player";
              c.p.inCarrier = true;
              S.player.carrying.push(c.p.id);
              st.reindex(S);
              return { text: c.p.name + " goes into a soft pet carrier and over your shoulder, " +
                  "and you have both hands free for the first time since this started.",
                  kind: "great" };
          } },

        // -------------------------------------------------------------------------- the tool ---
        { id: "items.pry_panel", item: "multitool", deck: "items", tags: ["fiddly"], danger: "good",
          label: "Get the sidewall panel off with the multi-tool", cost: 26,
          when: (S) => have(S, "multitool") && cabin.rowAt(S.player.x) !== null &&
                       S.fire.intensity[cabin.idx(S.player.x, S.player.y)] > 4 &&
                       !S.flags.panelOpen,
          run(S) {
              st.setFlag(S, "panelOpen");
              const i = cabin.idx(S.player.x, S.player.y);
              S.fire.fuel[i] *= 0.7;
              return { text: "Four fasteners, a quarter turn each, and the panel comes off in " +
                  "your hands. Behind it is where the fire has actually been going, which is " +
                  "sideways, along the insulation, at about a row a minute.", kind: "great" };
          } },

        { id: "items.cut_seat", item: (S) => { const s = st.inventoryHas(S, "cut"); return s ? s.id : null; }, deck: "items", tags: ["fiddly"],
          label: "Cut the seat cover open", cost: 16,
          detail: "To get at the foam and pull the burning part out of the middle of it.",
          when: (S) => !!st.inventoryHas(S, "cut") &&
                       S.fire.intensity[cabin.idx(S.player.x, S.player.y)] > 10,
          run(S) {
              const i = cabin.idx(S.player.x, S.player.y);
              S.fire.fuel[i] *= 0.5;
              S.fire.intensity[i] *= 0.7;
              S.player.burns += st.wearing(S, "gloves") ? 3 : 12;
              return { text: "You cut the dress cover off and pull the burning core of the " +
                  "cushion out in handfuls. It is the most direct thing you have done all day.",
                  kind: "good" };
          } },

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

        { id: "items.tape_door", item: "tape", deck: "items", tags: ["fiddly"],
          label: "Tape the lavatory door shut", cost: 16,
          when: (S) => have(S, "tape") && !!S.flags.lavClosed && !S.flags.lavTaped,
          run(S) {
              st.useCharge(S, slot(S, "tape"));
              st.setFlag(S, "lavTaped");
              for (let y = 1; y <= 7; y++) S.fire.smoke[cabin.idx(cabin.AFT_GALLEY_X, y)] *= 0.7;
              return { text: "You tape the seam of the lavatory door all the way round. The smoke " +
                  "stops coming out of it, which is not the same as the fire stopping, and it is " +
                  "worth about ninety seconds to everybody in the last six rows.", kind: "good" };
          } },

        { id: "items.tape_seat", item: "tape", deck: "items", tags: ["fiddly"],
          label: "Tape a route marker on the seat backs", cost: 18,
          detail: "A strip of tape every row so somebody in smoke can follow it forward.",
          when: (S) => have(S, "tape") && !S.flags.tapeTrail,
          run(S) {
              st.useCharge(S, slot(S, "tape"), 2);
              st.setFlag(S, "tapeTrail");
              for (const p of S.pax) p.knowsRows = true;
              return { text: "You run a strip of duct tape along the aisle seat backs, one per " +
                  "row, all the way to the forward cross-aisle. In smoke you cannot see through, " +
                  "a hand can follow that.", kind: "great" };
          } },
    ]);
})(window);
