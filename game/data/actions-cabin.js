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
        { id: "cabin.fill_bottle", deck: "cabin", tags: ["hands"], danger: "good",
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

        { id: "cabin.wet_blanket", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Soak the blanket in the sink", cost: 14,
          detail: "A wet blanket is a completely different object to a dry one.",
          when: (S) => atLav(S) && !!slot(S, "blanket") && !slot(S, "blanket").wet,
          run(S) {
              slot(S, "blanket").wet = true;
              return { text: "You fill the basin and push the whole blanket under it. It comes " +
                  "out four times heavier and worth about six times as much.", kind: "good" };
          } },

        { id: "cabin.wet_towel", deck: "cabin", tags: ["hands"],
          label: "Wet the towel again", cost: 8,
          when: (S) => atLav(S) && !!slot(S, "wet_towel") && slot(S, "wet_towel").uses < 4,
          run(S) {
              const s = slot(S, "wet_towel"); s.uses = 4; s.spent = false;
              return "The towel goes back to being a wet towel, which is its whole job.";
          } },

        { id: "cabin.fill_bag", deck: "cabin", tags: ["hands"], danger: "good",
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

        { id: "cabin.fill_sink", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Fill the sink and jam the drain", cost: 12,
          detail: "So there is a full sink here when you come back with something on fire.",
          when: (S) => atLav(S) && !S.flags.sinkFull,
          run(S) {
              st.setFlag(S, "sinkFull");
              return { text: "You jam the drain with a paper towel and hold the tap. The basin " +
                  "fills. It is nine centimetres of standing water in a metal bowl and it is the " +
                  "most useful object on this aeroplane.", kind: "great" };
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

        // The one thing left in this game that does not help. It is in a bin at the back of
        // the aeroplane and it has an ending attached to it.
        { id: "cabin.lav_bin", deck: "cabin", tags: ["reveal", "hands"],
          label: "Look in the lavatory waste bin", cost: 7,
          when: (S) => atLav(S) && !S.flags.lookedInBin,
          once: true,
          run(S) {
              st.setFlag(S, "lookedInBin");
              st.setFlag(S, "vapeFoundAt", Math.round(S.clock.elapsed));
              st.give(S, "vape");
              PRS.state.note(S, "A second personal vaporiser, of the same make and with the same " +
                  "cell type as the source unit, was recovered from the aft lavatory waste bin.");
              return { text: "Paper towels, a nappy, and — under both — a vape pen. Same brand as " +
                  "the one in the locker. Same battery. Somebody stood in this cubicle at some " +
                  "point in the last four hours, used it, panicked, and put it in the bin, and it " +
                  "has been sitting eleven rows from the fire ever since.\n\nYou put it in your " +
                  "pocket. You do not entirely know why.", kind: "great" };
          } },

        { id: "cabin.lav_door", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Shut the lavatory door on it", cost: 6,
          detail: "A small metal room with a fire in it and nobody in it.",
          when: (S) => atLav(S) && (S.flags.caseInLav || S.flags.holdingCushion),
          run(S) {
              st.setFlag(S, "lavClosed");
              if (S.flags.holdingCushion) st.setFlag(S, "holdingCushion", false);
              for (let y = 1; y <= 7; y++) {
                  const i = cabin.idx(cabin.AFT_GALLEY_X, y);
                  S.fire.smoke[i] *= 0.6;
              }
              return { text: "You shut the door. Whatever happens in there now happens in a " +
                  "ninety-centimetre metal box that was designed by people who assumed somebody " +
                  "would eventually set fire to it.", kind: "good" };
          } },

        // ---------------------------------------------------------------------- the galley ------
        { id: "cabin.galley_ice", deck: "cabin", tags: ["hands"],
          label: "Take the ice from the galley", cost: 10,
          when: (S) => atGalley(S) && !S.flags.haveIce,
          run(S) {
              st.setFlag(S, "haveIce");
              return "Three litres of ice, water and four small bottles of tonic, in a steel bin " +
                  "with a handle. Nobody stops you because nobody guards ice.";
          } },

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

        { id: "cabin.galley_halon", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Take the BCF bottle off the galley bulkhead", cost: 18,
          when: (S) => atGalley(S) && !slot(S, "halon_bottle") &&
                       S.crew.some((c) => c.halon > 0) && S.crewPhase < 3,
          run(S) {
              for (const c of S.crew) if (c.halon > 0) { c.halon--; break; }
              S.inventory.push({ id: "halon_bottle", uses: 1, spent: false, item: {
                  id: "halon_bottle", name: "BCF halon extinguisher", kg: 3.2,
                  sprite: "cabin:extinguisher", uses: 1, agent: "halon",
                  tags: ["extinguisher", "halon"], blurb: "Taken, not given.",
                  note: "One discharge. It knocks a flame flat." } });
              S.credibility = Math.max(0, S.credibility - 10);
              return { text: "You take the halon off the bulkhead. There are two on this " +
                  "aeroplane, there is now one where the crew think there are two, and that is " +
                  "going to matter in about four minutes.", kind: "bad" };
          } },

        { id: "cabin.galley_jug", deck: "cabin", tags: ["hands"],
          label: "Fill a galley jug with water", cost: 12,
          when: (S) => atGalley(S) && !S.flags.haveJug,
          run(S) {
              st.setFlag(S, "haveJug");
              return "Two litres in a steel jug with a spout, which is a much better shape for " +
                  "putting water into a locker than a bottle is.";
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

        { id: "cabin.trolley_barrier", deck: "cabin", tags: ["hands"], danger: "neutral",
          label: "Push the trolley across the aisle at the fire", cost: 24,
          detail: "A steel wall between the fire and everybody forward of it.",
          when: (S) => S.cabinFlags.cartOut && Math.abs(S.player.x - S.cabinFlags.cartX) <= 1,
          run(S) {
              const x = Math.max(cabin.FWD_ROWS.x0, S.fire.core.x - 1);
              delete S.cabinFlags.aisleBlocked[S.cabinFlags.cartX];
              S.cabinFlags.cartX = x;
              S.cabinFlags.aisleBlocked[x] = 9999;
              for (let y = 1; y <= 7; y++) S.fire.suppress[cabin.idx(x, y)] += 20;
              return { text: "You wedge the trolley across the aisle one row forward of the fire " +
                  "and put the brake on. It is a firebreak and it is also, now, a wall you " +
                  "cannot get past either.", kind: "neutral" };
          } },

        // -------------------------------------------------------------------- bins and masks ---
        { id: "cabin.open_bin_here", deck: "cabin", tags: ["reveal", "hands"],
          label: (S) => "Open the bins above row " + cabin.rowAt(S.player.x),
          detail: "Blankets, coats, and somebody's duty free.",
          when: (S) => inRow(S) && !S.cabinFlags.binsOpen[cabin.binKey(S.player.x, "left")],
          cost: 7,
          run(S) {
              const key = cabin.binKey(S.player.x, "left");
              S.cabinFlags.binsOpen[key] = true;
              S.fire.binOpen[key] = true;
              const hot = S.fire.heat[cabin.idx(S.player.x, 3)];
              if (hot > 25) {
                  S.player.burns += 8;
                  return { text: "The locker comes open and so does a lot of heat. This is the " +
                      "wrong row to have done that in.", kind: "bad" };
              }
              return "Two coats, a wax jacket, four cabin bags and a blanket in a bag. Nothing " +
                  "on fire. You have also just given the whole run of lockers a bit more air.";
          } },

        { id: "cabin.close_bins", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Go along and close every open bin", cost: 30,
          detail: "Air is what it is short of. Take the air away from all of them.",
          when: (S) => Object.keys(S.cabinFlags.binsOpen).length > 1,
          run(S) {
              const n = Object.keys(S.cabinFlags.binsOpen).length;
              S.cabinFlags.binsOpen = {};
              S.fire.binOpen = {};
              F.starve(S.fire, S.fire.core.x, S.fire.core.y, 0.6);
              return { text: "You go down the cabin shutting " + n + " lockers. The run of bins is " +
                  "a closed box again, and a closed box burns slower.", kind: "good" };
          } },

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

        { id: "cabin.masks_manual", deck: "cabin", tags: ["hands", "fiddly"], danger: "good",
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

        { id: "cabin.safety_card", deck: "cabin", tags: ["reveal", "look"],
          label: "Read the safety card. Actually read it.", cost: 16,
          once: true,
          when: (S) => inRow(S),
          run(S) {
              st.setFlag(S, "readCard");
              return { text: "Brace position. Exits, four, with the row numbers. Masks, and the " +
                  "fact that you have to pull them to start them. Life vest, under the seat, do " +
                  "not inflate inside. Floor path lighting. And in the corner, in a box, the " +
                  "manual release for the oxygen panel.\n\nSixteen seconds. Every single thing on " +
                  "it is true and useful and you have never read one before.", kind: "good" };
          } },

        { id: "cabin.floor_lights", deck: "cabin", tags: ["reveal", "hands"],
          label: "Find the floor path lighting", cost: 8,
          when: (S) => S.player.y === cabin.AISLE_Y && PRS.fire.totalSmoke(S.fire) > 20,
          run(S) {
              st.setFlag(S, "foundFloorLights");
              return { text: "There is a line of small lights along the aisle floor and it goes " +
                  "all the way to a door. In smoke you cannot see through it is the only " +
                  "navigation in this aeroplane and it has been there the whole time.",
                  kind: "good" };
          } },

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

        { id: "cabin.count_hands", deck: "cabin", tags: ["reveal", "look"], danger: "good",
          label: "Count the hands that went up", cost: 12,
          when: (S) => !!S.flags.usedPA && !S.flags.countedHands,
          run(S) {
              st.setFlag(S, "countedHands");
              const need = S.pax.filter((p) => PRS.pax.needsCarrying(p) && p.state !== "secured");
              const rows = need.map((p) => p.seat).slice(0, 12);
              return { text: "Eleven hands. They are in " + PRS.util.listSentence(rows) + ". " +
                  "You now know exactly who cannot get themselves off this aeroplane, which is " +
                  "the single most valuable piece of information available and it took twelve " +
                  "seconds.", kind: "great" };
          } },

        { id: "cabin.megaphone", deck: "cabin", tags: ["social"], danger: "neutral",
          label: "Address the cabin through the megaphone", cost: 16,
          when: (S) => !!slot(S, "megaphone"),
          run(S) {
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 38);
              S.cabinPanic = Math.min(100, S.cabinPanic + 18);
              S.credibility = Math.min(100, S.credibility + 12);
              for (const p of S.pax) {
                  p.awareness = Math.min(100, p.awareness + 30);
                  p.trust = Math.min(100, p.trust + 8);
              }
              return { text: "You stand on a seat and address sixty-one people through a " +
                  "collapsible megaphone that you brought onto an aeroplane. Nobody, in the " +
                  "whole subsequent inquiry, is able to explain why you had it.", kind: "neutral" };
          } },
    ]);
})(window);
