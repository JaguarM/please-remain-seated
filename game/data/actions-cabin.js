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

        { id: "cabin.break_detector", deck: "cabin", tags: ["hands"], danger: "bad",
          label: "Break the smoke detector", cost: 12,
          when: (S) => atLav(S) && S.cabinFlags.detectorSounded,
          run(S) {
              S.cabinFlags.detectorSounded = false;
              S.credibility = Math.max(0, S.credibility - 20);
              return { text: "The noise stops. That is the only good thing about this and it is " +
                  "not a good thing.", kind: "bad" };
          } },

        { id: "cabin.lav_bin", deck: "cabin", tags: ["hands"],
          label: "Look in the lavatory waste bin", cost: 7,
          when: (S) => atLav(S) && !S.flags.lookedInBin,
          once: true,
          run(S) {
              st.setFlag(S, "lookedInBin");
              return "Paper towels, a nappy, and a vape pen exactly like the one in the locker. " +
                  "Somebody has been in here at some point in the last four hours doing exactly " +
                  "the thing that is currently on fire eleven rows away.";
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

        { id: "cabin.jug_pour", deck: "cabin", tags: ["fire", "hands"], danger: "good",
          label: "Pour the galley jug into the bin", cost: 8,
          when: (S) => S.flags.haveJug && Math.abs(S.player.x - S.fire.core.x) <= 1,
          run(S) {
              st.setFlag(S, "haveJug", false);
              F.apply(S.fire, S.fire.core.x, S.fire.core.y, "water", 1.6, 0.3);
              S.stats.agentsUsed++;
              PRS.audio.play("pour");
              return { text: "Two litres straight down the seam of the locker, from a spout, " +
                  "which puts it where a bottle cannot.", kind: "good" };
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
        { id: "cabin.open_bin_here", deck: "cabin", tags: ["hands"],
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
        { id: "cabin.look_exit", deck: "cabin", tags: ["look"],
          label: "Look at the exit and the handle", cost: 6,
          when: (S) => atExit(S) || S.player.x === cabin.OVERWING_X,
          run(S) {
              return "Red handle, arrows, a placard, and a small window with a wing under it. It " +
                  "is armed. Opening it on the ground fires a slide; opening it now does not open " +
                  "it, because there are four hundred kilonewtons on the other side of it.";
          } },

        { id: "cabin.open_exit", deck: "cabin", tags: ["hands"], danger: "bad",
          label: "Pull the exit handle", cost: 14,
          detail: "It will not open. Something else will happen.",
          when: (S) => (atExit(S) || S.player.x === cabin.OVERWING_X) && !S.cabinFlags.slideDeployed,
          run(S) {
              S.cabinFlags.slideDeployed = true;
              S.cabinPanic = Math.min(100, S.cabinPanic + 40);
              S.credibility = Math.max(0, S.credibility - 30);
              const x = S.player.x;
              S.cabinFlags.aisleBlocked[x] = 9999;
              PRS.audio.play("bad");
              PRS.state.note(S, "Door handle operated in flight; slide pack deployed into cabin.");
              return { text: "The door does not move a millimetre — it cannot, and it was never " +
                  "going to. What does move is the slide pack, which fires into the cabin and " +
                  "inflates to the size of a small car in about a second and a half.\n\nThe " +
                  "cabin is now in two halves and you are in one of them.", kind: "bad" };
          } },

        { id: "cabin.disarm", deck: "cabin", tags: ["hands"],
          label: "Disarm the door", cost: 10,
          detail: "So that when they do open it on the ground, nobody goes down a slide.",
          when: (S) => atExit(S) && S.cabinFlags.exitsArmed,
          run(S) {
              S.cabinFlags.exitsArmed = false;
              return { text: "You put the girt bar lever to disarmed. It is the wrong call and " +
                  "it is confidently made.", kind: "bad" };
          } },

        { id: "cabin.window", deck: "cabin", tags: ["look", "waste"],
          label: "Look out of the window", cost: 5,
          when: (S) => S.player.y === 0 || S.player.y === 8 ||
                       (inRow(S) && (S.player.y === 1 || S.player.y === 7)),
          run(S) {
              const t = S.clock.remaining;
              if (t > 600) return "Cloud, and a grey line where the sea is. Nothing about the " +
                  "view suggests anything at all.";
              if (t > 300) return "You are through the cloud. There are fields and a motorway and " +
                  "a roundabout with a lorry on it, and everybody down there is fine.";
              if (t > 120) return "Low. Very low. You can see individual cars and a school and " +
                  "somebody's washing, and there is a fire engine on a road that is going the " +
                  "same way you are.";
              return { text: "Runway lights. Three of them, then a hundred of them. There are " +
                  "eleven vehicles with blue lights waiting at the intersection and they have " +
                  "been there for a while.", kind: "pa" };
          } },

        { id: "cabin.safety_card", deck: "cabin", tags: ["look"],
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

        { id: "cabin.floor_lights", deck: "cabin", tags: ["hands"],
          label: "Find the floor path lighting", cost: 8,
          when: (S) => S.player.y === cabin.AISLE_Y && PRS.fire.totalSmoke(S.fire) > 20,
          run(S) {
              st.setFlag(S, "foundFloorLights");
              return { text: "There is a line of small lights along the aisle floor and it goes " +
                  "all the way to a door. In smoke you cannot see through it is the only " +
                  "navigation in this aeroplane and it has been there the whole time.",
                  kind: "good" };
          } },

        { id: "cabin.curtain", deck: "cabin", tags: ["hands"],
          label: "Pull the galley curtain across", cost: 6,
          detail: "It will not stop smoke. It will stop people watching.",
          when: (S) => S.player.x <= cabin.FWD_CROSS_X || S.player.x >= cabin.AFT_CROSS_X,
          run(S) {
              S.cabinPanic = Math.max(0, S.cabinPanic - 6);
              return "You draw the curtain across the galley. Sixty people can no longer see what " +
                  "is happening at the front, which turns out to help.";
          } },

        { id: "cabin.tray_tables", deck: "cabin", tags: ["hands"],
          label: (S) => "Stow the tray tables in row " + cabin.rowAt(S.player.x),
          detail: "Six tables down across the aisle is six things to catch a person on.",
          when: (S) => inRow(S),
          cost: 10,
          run(S) {
              return "You put six tray tables up and latch them. If anybody has to get out of " +
                  "this row in the dark, they now can.";
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

        { id: "cabin.seat_cushion", deck: "cabin", tags: ["hands"],
          label: "Pull a seat cushion off", cost: 8,
          detail: "It comes off with a strap. It floats, and it is also a shield.",
          when: (S) => inRow(S) && !S.flags.haveCushion,
          run(S) {
              st.setFlag(S, "haveCushion");
              return "The cushion comes away from the pan with two pops. It is a flotation device " +
                  "over water and today it is a square metre of fire-blocking foam with a handle.";
          } },

        { id: "cabin.cushion_shield", deck: "cabin", tags: ["fire"], danger: "good",
          label: "Hold the seat cushion up against the heat", cost: 12,
          when: (S) => S.flags.haveCushion &&
                       S.fire.intensity[cabin.idx(S.player.x, S.player.y)] > 8,
          run(S) {
              S.player.burns = Math.max(0, S.player.burns - 8);
              return { text: "Modern seat cushions are fire blocking by regulation and this is " +
                  "the one time in the life of the aeroplane that anybody finds out.",
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

        { id: "cabin.count_hands", deck: "cabin", tags: ["look"], danger: "good",
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
