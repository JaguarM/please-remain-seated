// Deck: THE CABIN. The aeroplane as a machine with parts you can operate, most of which the
// airline would rather you did not.
//
// The lavatory is the most important room on board and this deck is where the game hides that:
// a tap, a sink, a bin, a smoke detector, and a door that shuts. Four of the six best actions in
// the game are in a cubicle at the back that nobody visits because it is thirty seconds away.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const F = PRS.fire;

    function atLav(S) { return cabin.kindAt(S.player.x, S.player.y) === "lav"; }
    function atGalley(S) {
        const kind = cabin.kindAt(S.player.x, S.player.y);
        return (S.player.x === cabin.FWD_GALLEY_X || S.player.x === cabin.AFT_GALLEY_X) &&
               (kind === "galley" || kind === "aisle");
    }
    function atExit(S) { return cabin.kindAt(S.player.x, S.player.y) === "exit"; }
    function inRow(S) { return cabin.rowAt(S.player.x) !== null; }
    function slot(S, id) { return st.slotOf(S, id); }

    A.register([
        // ------------------------------------------------------------------- the lavatory ------
        { id: "cabin.fill_bottle", item: "water_big", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Fill the bottle at the tap", cost: 9,
          detail: "The tap runs for four seconds a press. You will press it three times.",
          when: (S) => atLav(S) && !!slot(S, "water_big") && slot(S, "water_big").uses < 3,
          run(S) {
              const s = slot(S, "water_big");
              s.uses = 3; s.spent = false;
              return { text: "Three presses of a tap that gives you four seconds each time. The " +
                  "bottle is full. There is no limit on this and almost nobody comes back for a " +
                  "second one.", kind: "good" };
          } },

        { id: "cabin.wet_blanket", item: "blanket", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Soak the blanket in the sink", cost: 14,
          detail: "A wet blanket is a completely different object to a dry one.",
          when: (S) => atLav(S) && !!slot(S, "blanket") && !slot(S, "blanket").wet,
          run(S) {
              slot(S, "blanket").wet = true;
              return { text: "You fill the basin and push the whole blanket under it. It comes " +
                  "out four times heavier and worth about six times as much.", kind: "good" };
          } },

        { id: "cabin.wet_towel", item: "wet_towel", deck: "cabin", tags: ["hands"],
          label: "Wet the towel again", cost: 8,
          when: (S) => atLav(S) && !!slot(S, "wet_towel") && slot(S, "wet_towel").uses < 4,
          run(S) {
              const s = slot(S, "wet_towel"); s.uses = 4; s.spent = false;
              return "The towel goes back to being a wet towel, which is its whole job.";
          } },

        { id: "cabin.fill_bag", item: "binbag", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Fill a bin liner with water", cost: 20,
          detail: "Nine litres. Four times the bottle. It is awkward and it is worth it.",
          when: (S) => atLav(S) && !!slot(S, "binbag") && !S.flags.bagFull,
          run(S) {
              st.useCharge(S, slot(S, "binbag"));
              st.setFlag(S, "bagFull");
              return { text: "You hold a bin liner under a tap that gives four seconds a press for " +
                  "twenty seconds and come out with nine litres of water in a bag. Do not put " +
                  "this down.", kind: "great" };
          } },

        { id: "cabin.trigger_detector", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Set off the lavatory smoke detector", cost: 10,
          detail: "It is a hard-wired alarm on the flight deck and you can make it happen now.",
          when: (S) => atLav(S) && !S.cabinFlags.detectorSounded,
          run(S) {
              PRS.events.force(S, "detector");
              PRS.state.note(S, "Lavatory smoke detector activated deliberately by a passenger.");
              return { text: "You hold the wet towel over the detector, wring the smoke out of it, " +
                  "and wave. It takes eleven seconds and it puts a light on the flight deck panel " +
                  "that two pilots are contractually unable to ignore.", kind: "great" };
          } },

        // ---------------------------------------------------------------------- the galley ------

        { id: "cabin.galley_ext", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Take the extinguisher out of the galley stowage", cost: 16,
          detail: "It is behind a placard and a clip. It is not locked.",
          when: (S) => atGalley(S) && !slot(S, "water_ext"),
          run(S) {
              S.inventory.push({ id: "water_ext", uses: 2, spent: false, item: {
                  id: "water_ext", name: "Water extinguisher", kg: 6.4,
                  sprite: "cabin:extinguisher_water", uses: 2, agent: "water",
                  tags: ["extinguisher", "water"], blurb: "From the galley stowage.",
                  note: "Nine litres, two discharges." } });
              S.credibility = Math.max(0, S.credibility - 6);
              return { text: "You unclip nine litres of water under pressure from the galley wall. " +
                  "A member of crew sees you do it and does not have time to have a view about it.",
                  kind: "great" };
          } },

        { id: "cabin.stow_trolley", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Push the trolley into the galley yourself", cost: 26,
          detail: "Nobody has told you that you can. Nobody has told you that you cannot.",
          when: (S) => S.cabinFlags.cartOut && Math.abs(S.player.x - S.cabinFlags.cartX) <= 1,
          run(S) {
              S.cabinFlags.cartOut = false;
              delete S.cabinFlags.aisleBlocked[S.cabinFlags.cartX];
              S.credibility = Math.max(0, S.credibility - 4);
              return { text: "Two hundred kilos of trolley, six rows, into the galley, brake on. " +
                  "The aisle is clear from the flight deck door to the tail.", kind: "great" };
          } },

        // -------------------------------------------------------------------- bins and masks ---

        { id: "cabin.blankets", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Get the spare blankets out of the bin", cost: 14,
          when: (S) => inRow(S) && !S.flags.haveBlankets,
          run(S) {
              st.setFlag(S, "haveBlankets", 4);
              return { text: "Four airline blankets in plastic. They are thin, they are " +
                  "flammable, and wet they are four more chances to put over somebody's face.",
                  kind: "good" };
          } },

        { id: "cabin.hand_blanket", deck: "cabin", tags: ["hands"],
          targets: (S) => st.reachable(S).filter((p) => !p.masked).map((p) => ({ key: p.id, p: p })),
          when: (S) => (S.flags.haveBlankets || 0) > 0,
          label: (S, c) => "Give " + c.p.name + " a blanket for their face",
          cost: 8,
          run(S, c) {
              st.setFlag(S, "haveBlankets", S.flags.haveBlankets - 1);
              c.p.masked = true;
              c.p.trust = Math.min(100, c.p.trust + 10);
              return c.p.name + " has something over their mouth. It is dry, so it is worth about " +
                  "a third of a wet one, and a third is not nothing.";
          } },

        { id: "cabin.masks_manual", item: (S) => { const s = st.inventoryHas(S, "tool") || st.inventoryHas(S, "cut"); return s ? s.id : null; }, deck: "cabin", tags: ["hands", "fiddly"], danger: "good",
          label: "Force the oxygen mask panel open", cost: 18,
          detail: "There is a manual release. It is a hole and a pin and it is on the safety card.",
          when: (S) => inRow(S) && !S.cabinFlags.masksDropped &&
                       (!!st.inventoryHas(S, "tool") || !!st.inventoryHas(S, "cut")),
          run(S) {
              S.cabinFlags.masksDropped = true;
              PRS.audio.play("masksDrop");
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 24);
              S.cabinPanic = Math.min(100, S.cabinPanic + 14);
              return { text: "You find the pinhole in the panel and put the multi-tool spike into " +
                  "it. The panel drops and four masks come out on their tubes. Then you do the " +
                  "next one.", kind: "great" };
          } },

        { id: "cabin.masks_row", deck: "cabin", tags: ["hands"], danger: "good",
          label: (S) => "Pull down the masks for row " + cabin.rowAt(S.player.x),
          when: (S) => S.cabinFlags.masksDropped && inRow(S),
          cost: 16,
          run(S) {
              const row = cabin.rowAt(S.player.x);
              let n = 0;
              for (const p of S.pax) {
                  if (p.row !== row || p.masked) continue;
                  p.masked = true; n++;
              }
              if (!n) return "Everybody in row " + row + " already has one on.";
              return { text: "You pull the masks down and get them over " + n + " faces in row " +
                  row + ". You have to tug them to start the generator and nobody knows that.",
                  kind: "good" };
          } },

        // ---------------------------------------------------------------------- doors and exits ---

        { id: "cabin.bags_out", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Clear the bags out of the aisle", cost: 18,
          when: (S) => Object.keys(S.cabinFlags.aisleBlocked)
                             .some((x) => S.cabinFlags.aisleBlocked[x] < 9999),
          run(S) {
              let n = 0;
              for (const x in S.cabinFlags.aisleBlocked) {
                  if (S.cabinFlags.aisleBlocked[x] >= 9999) continue;
                  S.cabinFlags.aisleBlocked[x] = Math.max(0, S.cabinFlags.aisleBlocked[x] - 25);
                  if (!S.cabinFlags.aisleBlocked[x]) { delete S.cabinFlags.aisleBlocked[x]; n++; }
              }
              return { text: "You throw " + (n * 2 + 1) + " cabin bags over the seat backs into " +
                  "rows that are not using their footwells. Somebody objects. They are wrong.",
                  kind: "good" };
          } },

        { id: "cabin.pa_handset", deck: "cabin", tags: ["social"], danger: "bad",
          label: "Pick up the crew interphone and use the PA", cost: 20,
          detail: "It is on the bulkhead. There is no lock on it. There is a diagram.",
          when: (S) => (S.player.x <= cabin.FWD_GALLEY_X || S.player.x >= cabin.AFT_GALLEY_X) &&
                       !S.flags.usedPA,
          run(S) {
              st.setFlag(S, "usedPA");
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 46);
              S.cabinPanic = Math.min(100, S.cabinPanic + 26);
              S.credibility = Math.min(100, S.credibility + 10);
              for (const p of S.pax) p.awareness = Math.min(100, p.awareness + 40);
              PRS.audio.play("pa");
              return { text: "You take a handset off a bulkhead, press the button marked PA, and " +
                  "say the following to sixty-one people at once: “There is a fire in the " +
                  "overhead locker above row fourteen. If you can walk, walk forward. If you " +
                  "cannot, put your hand up.”\n\nEleven hands go up. Nine people walk. Everybody " +
                  "else stands up at the same time.", kind: "neutral" };
          } },
    ]);
})(window);
