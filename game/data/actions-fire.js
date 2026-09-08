// Deck: THE FIRE. Fifty-seven ways to attack a fire, and not one of them puts it out.
//
// This deck is the trap the game is built around. It is the biggest, the most satisfying, the most
// obviously correct, and if you spend the flight in it you will finish with two souls secured and
// an incident report that uses the word "obstructive". Everything here buys seconds. The people
// deck spends them.
//
// The three that are not a trap, in case anybody ever reads this file instead of playing:
// closing the bin, getting the case into a sink, and pre-wetting the row the fire is about to
// reach. Those change the shape of the next nine minutes. The other fifty-four are a bottle of
// water and a feeling.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const F = PRS.fire;
    const clamp01 = PRS.util.clamp01;

    // The tile a fire action lands on: the worst one you can reach from where you are standing.
    function hot(S) {
        let best = null, bestV = 0.4;
        const spots = [[S.player.x, S.player.y]].concat(cabin.neighbours(S.player.x, S.player.y));
        for (const [x, y] of spots) {
            const v = S.fire.intensity[cabin.idx(x, y)];
            if (v > bestV) { bestV = v; best = { x: x, y: y, v: v }; }
        }
        return best;
    }
    function nearFire(S) { return !!hot(S); }
    function atCore(S) {
        const c = S.fire.core;
        return Math.abs(S.player.x - c.x) <= 1 && Math.abs(S.player.y - c.y) <= 1;
    }
    function slot(S, id) { return st.slotOf(S, id); }
    function haveCharged(S, id) { const s = slot(S, id); return s && !s.spent && (s.uses === null || s.uses > 0); }

    /** Put an agent on the hot tile, spend the charge, and say something honest about it. */
    function pour(S, itemId, agentName, opts) {
        opts = opts || {};
        const target = opts.target || hot(S);
        if (!target) return "There is nothing burning within reach of you.";
        const s = itemId ? slot(S, itemId) : null;
        if (s) st.useCharge(S, s);
        let amount = opts.amount === undefined ? 1 : opts.amount;
        if (st.hasPerk(S, "firecraft") && agentName !== "spirits" && agentName !== "perfume"
            && agentName !== "sanitiser") amount *= 1.5;
        const r = F.apply(S.fire, target.x, target.y, agentName, amount, opts.spread || 0.35);
        S.stats.agentsUsed++;
        PRS.audio.play(opts.sound || (r.agent.knock < 0 ? "flare" : "pour"));
        const after = S.fire.intensity[cabin.idx(target.x, target.y)];

        if (r.agent.knock < 0) {
            return { text: (opts.text || "") + " The flame goes flat, gets brighter, and comes " +
                     "back up through it. It is now " + F.describe(S.fire, target.x, target.y) +
                     ".", kind: "bad" };
        }
        const line = opts.text || "";
        const gone = after < 1;
        const tail = gone
            ? " It goes out. For a moment there is nothing there at all, and it is the best moment " +
              "of your afternoon."
            : " It drops to " + F.describe(S.fire, target.x, target.y) + ".";
        const core = r.onCore
            ? " Some of it gets into the bin and the case gets cooler, which is the only part of " +
              "this that counts."
            : " None of it reaches the bin.";
        return { text: line + tail + core, kind: gone ? "good" : "plain" };
    }

    A.register([
        // ------------------------------------------------------------------ liquids on flame ---
        { id: "fire.water", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Pour the water bottle on it", cost: 9,
          detail: (S) => { const s = slot(S, "water_big"); return s ? s.uses + " left in the bottle." : ""; },
          when: (S) => nearFire(S) && haveCharged(S, "water_big"),
          run: (S) => pour(S, "water_big", "water",
                { text: "You empty a third of the bottle onto it in one go." }) },

        { id: "fire.water_base", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Water, at the base of it", cost: 11,
          detail: "Not at the flame. At the thing the flame is coming out of.",
          when: (S) => nearFire(S) && haveCharged(S, "water_big") &&
                       (st.hasPerk(S, "firecraft") || st.hasPerk(S, "reads_fire")),
          run: (S) => pour(S, "water_big", "water", { amount: 1.45, spread: 0.15,
                text: "You get down under the smoke and put it where the fire actually is." }) },

        { id: "fire.icewater", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Throw the ice bucket over it", cost: 8,
          when: (S) => nearFire(S) && !!S.flags.haveIce,
          run(S) {
              S.flags.haveIce = false;
              return pour(S, null, "icewater", { amount: 1.4,
                  text: "Three litres of ice and water in one movement." });
          } },

        { id: "fire.soda", deck: "fire", tags: ["fire", "hands"],
          label: "Empty a can of energy drink on it", cost: 7,
          detail: "It is mostly water. The rest of it is going to smell.",
          when: (S) => nearFire(S) && haveCharged(S, "energy"),
          run: (S) => pour(S, "energy", "soda",
                { text: "It goes on fizzing and the whole row instantly smells of burnt sugar." }) },

        { id: "fire.coffee", deck: "fire", tags: ["fire", "hands"],
          label: "Throw the coffee on it", cost: 6,
          detail: "It is hot. Hot is the wrong property here and you know it.",
          when: (S) => nearFire(S) && haveCharged(S, "thermos"),
          run: (S) => pour(S, "thermos", "coffee",
                { text: "A litre of scalding coffee, which is about a third as useful as a litre " +
                        "of cold water." }) },

        { id: "fire.binbag_water", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Empty the bin liner of water over it", cost: 12,
          detail: "Nine litres. The most water you can move in one trip.",
          when: (S) => nearFire(S) && S.flags.bagFull,
          run(S) {
              S.flags.bagFull = false;
              return pour(S, null, "water", { amount: 2.4, spread: 0.7,
                  text: "Nine litres goes over the whole locker in one heavy slap." });
          } },

        { id: "fire.gin", deck: "fire", tags: ["fire", "hands"], danger: "bad",
          label: "Pour a miniature on it", cost: 6,
          detail: "Forty per cent ethanol. You have been told. This is on you.",
          when: (S) => nearFire(S) && haveCharged(S, "gin"),
          run: (S) => pour(S, "gin", "spirits",
                { text: "You unscrew a fifty millilitre bottle of gin and pour it into a fire." }) },

        { id: "fire.perfume", deck: "fire", tags: ["fire", "hands"], danger: "bad",
          label: "Spray the duty-free perfume at it", cost: 5,
          detail: "Eighty per cent ethanol, aerosolised, at a naked flame.",
          when: (S) => nearFire(S) && haveCharged(S, "perfume"),
          run: (S) => pour(S, "perfume", "perfume", { amount: 1.3,
                text: "You hold down the atomiser. There is a noise like a sheet being torn." }) },

        { id: "fire.sanitiser", deck: "fire", tags: ["fire", "hands"], danger: "bad",
          label: "Squeeze the hand gel onto it", cost: 6,
          when: (S) => nearFire(S) && haveCharged(S, "sanitiser"),
          run: (S) => pour(S, "sanitiser", "sanitiser",
                { text: "Alcohol gel burns with a flame that is almost invisible in a lit cabin, " +
                        "so for four full seconds it looks like it worked." }) },

        // --------------------------------------------------------------------- smothering ------
        { id: "fire.blanket", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Smother it with the blanket", cost: 10,
          when: (S) => nearFire(S) && !!slot(S, "blanket") && !slot(S, "blanket").wet,
          run(S) {
              const r = pour(S, null, "smother", { sound: "smother",
                  text: "You get the blanket over it and lean on it." });
              const s = slot(S, "blanket");
              if (S.rng.chance(0.4)) {
                  s.scorched = true;
                  r.text += " The blanket is now scorched through in two places.";
              }
              return r;
          } },

        { id: "fire.wet_blanket", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Smother it with the wet blanket", cost: 11,
          detail: "A wet blanket is a different object to a dry one. Entirely different.",
          when: (S) => nearFire(S) && !!slot(S, "blanket") && slot(S, "blanket").wet,
          run(S) {
              slot(S, "blanket").wet = false;
              return pour(S, null, "wetcloth", { amount: 1.5, sound: "smother",
                  text: "The wet blanket goes down flat and there is a great deal of steam." });
          } },

        { id: "fire.wet_towel", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Beat it out with the damp towel", cost: 8,
          when: (S) => nearFire(S) && haveCharged(S, "wet_towel"),
          run: (S) => pour(S, "wet_towel", "wetcloth", { sound: "smother",
                text: "Short heavy strokes, from the outside in." }) },

        { id: "fire.wipes", deck: "fire", tags: ["fire", "hands"],
          label: "Wet wipes. All of them. At once.", cost: 7,
          when: (S) => nearFire(S) && haveCharged(S, "wipes"),
          run: (S) => pour(S, "wipes", "wetcloth", { amount: 0.5,
                text: "You put a fistful of aloe wet wipes on a fire, which is the most 2020 " +
                      "thing that has happened on this aeroplane." }) },

        { id: "fire.jacket", deck: "fire", tags: ["fire", "hands"],
          label: "Beat at it with your jacket", cost: 9,
          detail: "This is what everybody does and it is very nearly useless.",
          when: (S) => nearFire(S),
          run: (S) => pour(S, null, "beat", { sound: "smother",
                text: "You take your jacket off and hit the fire with it eleven times." }) },

        { id: "fire.magazine", deck: "fire", tags: ["fire", "hands", "waste"], danger: "bad",
          label: "Beat at it with the in-flight magazine", cost: 6,
          when: (S) => nearFire(S),
          run: (S) => pour(S, null, "air", { amount: 0.7,
                text: "You hit a fire with a hundred and sixty pages of glossy paper." }) },

        { id: "fire.stamp", deck: "fire", tags: ["fire"], danger: "bad",
          label: "Stamp on it", cost: 5,
          when: (S) => nearFire(S) && S.fire.intensity[cabin.idx(S.player.x, S.player.y)] > 1,
          run(S) {
              S.player.burns += 6;
              const t = hot(S);
              F.apply(S.fire, t.x, t.y, "beat", 0.8, 0);
              PRS.audio.play("smother");
              return { text: "You stamp on burning seat foam in the shoes you wore to an airport. " +
                       "The sole is now part of the fire.", kind: "bad" };
          } },

        { id: "fire.blow", deck: "fire", tags: ["fire", "waste"], danger: "bad",
          label: "Blow on it", cost: 4,
          detail: "You know. You do know.",
          when: (S) => nearFire(S),
          run: (S) => pour(S, null, "air", { amount: 0.6,
                text: "You blow on it, the way you would blow out a candle, which is the exact " +
                      "opposite of the correct amount of air." }) },

        { id: "fire.fan", deck: "fire", tags: ["fire", "waste"], danger: "bad",
          label: "Fan it with the safety card", cost: 5,
          when: (S) => nearFire(S),
          run: (S) => pour(S, null, "air", { amount: 0.9,
                text: "You fan a fire with a laminated card that has a picture of a fire on it." }) },

        { id: "fire.spit", deck: "fire", tags: ["fire", "waste"],
          label: "Spit on it", cost: 3,
          when: (S) => nearFire(S),
          run: (S) => ({ text: "You spit on it. It hisses, very briefly, and you feel " +
                         "approximately as stupid as you deserve to.", kind: "plain" }) },

        // ------------------------------------------------------------------ the bin, properly ---
        { id: "fire.close_bin", deck: "fire", tags: ["fire", "hands", "fiddly"], danger: "good",
          label: "Close the overhead bin", cost: 8,
          detail: "Take the air away from it. This is what the manual actually says.",
          when: (S) => atCore(S) && S.cabinFlags.binsOpen[cabin.binKey(S.fire.core.x, "left")],
          run(S) {
              delete S.cabinFlags.binsOpen[cabin.binKey(S.fire.core.x, "left")];
              delete S.fire.binOpen[cabin.binKey(S.fire.core.x, "left")];
              const c = F.starve(S.fire, S.fire.core.x, S.fire.core.y, 1);
              if (!st.wearing(S, "gloves")) S.player.burns += 9;
              PRS.audio.play("smother");
              return { text: "You get the latch shut. The noise from inside changes pitch. " +
                       "Containment is now " + Math.round(c * 100) + " per cent, and every second " +
                       "of that is a second the cabin does not get." +
                       (st.wearing(S, "gloves") ? "" : " Your hand is burned."), kind: "good" };
          } },

        { id: "fire.hold_bin", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Hold the bin shut with your body", cost: 26,
          detail: "It will not stay latched. You can make it stay latched.",
          when: (S) => atCore(S),
          run(S) {
              const c = F.starve(S.fire, S.fire.core.x, S.fire.core.y, 1.6);
              S.player.burns += st.wearing(S, "gloves") ? 4 : 16;
              S.player.smokeDose += 6;
              return { text: "You put your shoulder into the locker door and stand there. It gets " +
                       "hot enough through the panel to be a decision. Containment " +
                       Math.round(c * 100) + " per cent.", kind: "good" };
          } },

        { id: "fire.tape_bin", deck: "fire", tags: ["fire", "fiddly"], danger: "good",
          label: "Tape the bin shut", cost: 22,
          detail: "Six strips across the latch. It is not going to open again.",
          when: (S) => atCore(S) && haveCharged(S, "tape"),
          run(S) {
              st.useCharge(S, slot(S, "tape"), 2);
              const c = F.starve(S.fire, S.fire.core.x, S.fire.core.y, 2.2);
              st.setFlag(S, "binTaped");
              return { text: "You run six strips of duct tape over the latch and down the seam. " +
                       "It holds. Containment " + Math.round(c * 100) + " per cent, and unlike " +
                       "your shoulder, tape does not need to go anywhere.", kind: "great" };
          } },

        { id: "fire.open_bin", deck: "fire", tags: ["fire", "hands"], danger: "bad",
          label: "Open the bin and look at it", cost: 10,
          detail: "You will find out what this is. It will also get a great deal of air.",
          when: (S) => atCore(S) && !S.fire.core.exposed,
          run(S) {
              S.fire.core.exposed = true;
              S.player.lookedAtFire = true;
              S.cabinFlags.binsOpen[cabin.binKey(S.fire.core.x, "left")] = true;
              S.fire.binOpen[cabin.binKey(S.fire.core.x, "left")] = true;
              S.fire.core.contained = 0;
              S.credibility = Math.min(100, S.credibility + 26);
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 18);
              if (!st.wearing(S, "gloves")) S.player.burns += 12;
              F.apply(S.fire, S.fire.core.x, S.fire.core.y, "air", 1, 0);
              PRS.audio.play("flare");
              PRS.state.note(S, "Overhead locker opened by a passenger; source identified as a " +
                                "vape device in a hard case.");
              return { text: "The locker comes open and a wall of heat comes out with it. Inside, " +
                       "a hard-shell case is burning from the inside out and there is a small " +
                       "cylindrical thing in the middle of it going off like a firework every few " +
                       "seconds. It is a vape. It is somebody's vape.", kind: "great" };
          } },

        { id: "fire.pull_case", deck: "fire", tags: ["fire", "hands"], danger: "bad",
          label: "Pull the burning case out of the bin", cost: 16,
          detail: "You will be holding it. Have a plan for the next fifteen seconds.",
          when: (S) => atCore(S) && S.fire.core.exposed && !S.flags.holdingCase,
          run(S) {
              st.setFlag(S, "holdingCase");
              S.player.burns += st.wearing(S, "gloves") ? 8 : 30;
              S.fire.core.contained = 0;
              PRS.audio.play("flare");
              return { text: "You get both hands under it and haul it out. It is the size of a " +
                       "cabin bag and it is on fire and you are now holding it above your head in " +
                       "a corridor full of seated people." +
                       (st.wearing(S, "gloves") ? " The welding gloves are the only reason you " +
                        "still have hands." : " You are not wearing gloves. You will feel this " +
                        "for a year."), kind: "bad" };
          } },

        { id: "fire.case_to_lav", deck: "fire", tags: ["fire", "carry"], danger: "good",
          label: "Carry the case to the lavatory", cost: 34,
          detail: "There is a sink in there. A sink is a bucket you cannot knock over.",
          when: (S) => S.flags.holdingCase,
          run(S) {
              const r = A.route(S, cabin.AFT_GALLEY_X, 7);
              if (r) A.travel(S, r);
              st.setFlag(S, "caseInLav");
              S.player.burns += st.wearing(S, "gloves") ? 5 : 18;
              return { text: "You get it down the aisle at arm's length, past eleven rows of " +
                       "people who move for the first time all flight, and into the lavatory.",
                       kind: "good" };
          } },

        { id: "fire.case_in_sink", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Put the case in the sink and run the tap", cost: 18,
          detail: "This is the correct answer. Nobody in the history of this has done it in time.",
          when: (S) => S.flags.caseInLav && !S.fire.core.inSink,
          run(S) {
              S.fire.core.inSink = true;
              st.setFlag(S, "holdingCase", false);
              S.fire.core.x = cabin.AFT_GALLEY_X;
              S.fire.core.y = 7;
              S.fire.core.contained = Math.max(S.fire.core.contained, 0.6);
              PRS.audio.play("pour");
              PRS.state.note(S, "Source device immersed in water in the aft lavatory basin.");
              return { text: "You jam the case into the basin and hold the tap open with your " +
                       "elbow. It does not go out — a cell in runaway makes its own oxygen and " +
                       "there are " + S.fire.core.cells + " of them left — but every one of them " +
                       "is now going to vent under nine centimetres of water instead of into a " +
                       "locker above somebody's head.\n\nThis is the best thing you will do today " +
                       "and nobody will ever know you did it.", kind: "great" };
          } },

        { id: "fire.empty_bin", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Throw everything else out of the bin", cost: 19,
          detail: "The fuel is not the fire. The fuel is four cabin bags and a coat.",
          when: (S) => atCore(S) && S.fire.core.exposed && !S.flags.binEmptied,
          run(S) {
              st.setFlag(S, "binEmptied");
              for (let d = -1; d <= 1; d++) {
                  const i = cabin.idx(S.fire.core.x + d, S.fire.core.y);
                  if (i >= 0) S.fire.fuel[i] *= 0.45;
              }
              S.player.burns += st.wearing(S, "gloves") ? 3 : 11;
              return { text: "You throw four cabin bags, a wax jacket and a bag of Toblerone into " +
                       "the aisle. There is measurably less to burn up there now.", kind: "good" };
          } },

        // ----------------------------------------------------------------- proper equipment ---
        { id: "fire.halon", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Discharge the halon bottle into it", cost: 14,
          detail: "The real thing. It works. It works on the flame, which is not the fire.",
          when: (S) => nearFire(S) && haveCharged(S, "halon_bottle"),
          run: (S) => pour(S, "halon_bottle", "halon", { amount: 1.2, spread: 0.8, sound: "halon",
                text: "You pull the pin and put the whole bottle into the locker. Everything " +
                      "orange in a three metre radius stops being orange at once." }) },

        { id: "fire.halon_bursts", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Halon, in short bursts", cost: 20,
          detail: "Make the bottle last. A trained person does it this way.",
          when: (S) => nearFire(S) && haveCharged(S, "halon_bottle") &&
                       (st.hasPerk(S, "firecraft") || st.hasPerk(S, "knows_kit")),
          run(S) {
              const s = slot(S, "halon_bottle");
              s.uses = Math.max(0, s.uses - 0.34);
              const t = hot(S);
              F.apply(S.fire, t.x, t.y, "halon", 0.7, 0.5);
              S.stats.agentsUsed++;
              PRS.audio.play("halon");
              return { text: "Three one-second bursts at the base, sweeping. A third of a bottle " +
                       "and the same result as the whole bottle.", kind: "good" };
          } },

        { id: "fire.water_ext", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Water extinguisher from the galley", cost: 15,
          when: (S) => nearFire(S) && haveCharged(S, "water_ext"),
          run: (S) => pour(S, "water_ext", "water", { amount: 2.0, spread: 0.6, sound: "spray",
                text: "Nine litres under pressure, straight in." }) },

        { id: "fire.crash_axe", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Open the panel with the crash axe", cost: 24,
          detail: "There is fire behind the sidewall and you cannot reach it through the sidewall.",
          when: (S) => nearFire(S) && !!slot(S, "crash_axe"),
          run(S) {
              const t = hot(S);
              F.apply(S.fire, t.x, t.y, "smother", 0.6, 0);
              S.fire.fuel[cabin.idx(t.x, t.y)] *= 0.6;
              st.setFlag(S, "panelOpen");
              return { text: "Four swings and the sidewall panel comes off. Behind it there is " +
                       "insulation, a loom, and a great deal of orange you had not been able to " +
                       "see. Now you can put something on it.", kind: "good" };
          } },

        // ---------------------------------------------------------- firebreaks and prevention ---
        { id: "fire.firebreak", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Wet the row the fire is going to reach next", cost: 16,
          detail: "Not the fire. The seats beside it. This is the second best action in the deck.",
          when: (S) => haveCharged(S, "water_big") && nearFire(S),
          run(S) {
              st.useCharge(S, slot(S, "water_big"));
              const t = hot(S);
              const dir = t.x >= S.fire.core.x ? 1 : -1;
              let n = 0;
              for (let d = 1; d <= 2; d++) {
                  const x = t.x + dir * d;
                  for (const y of [t.y - 1, t.y, t.y + 1]) {
                      if (!cabin.inBounds(x, y)) continue;
                      const i = cabin.idx(x, y);
                      S.fire.suppress[i] = Math.min(100, S.fire.suppress[i] + 40);
                      n++;
                  }
              }
              S.stats.agentsUsed++;
              PRS.audio.play("pour");
              return { text: "You put the water on " + n + " tiles of seat that are not burning " +
                       "yet. Nothing visible happens, which is how you know it was the right " +
                       "thing to do.", kind: "good" };
          } },

        { id: "fire.wet_carpet", deck: "fire", tags: ["fire"], danger: "good",
          label: "Soak the carpet across the aisle", cost: 12,
          detail: "A firebreak across the whole cabin, at the one tile everything has to cross.",
          when: (S) => S.player.y === cabin.AISLE_Y &&
                       (haveCharged(S, "water_big") || S.flags.bagFull),
          run(S) {
              if (S.flags.bagFull) S.flags.bagFull = false;
              else st.useCharge(S, slot(S, "water_big"));
              for (let y = 1; y <= 7; y++) {
                  const i = cabin.idx(S.player.x, y);
                  S.fire.suppress[i] = Math.min(100, S.fire.suppress[i] + 34);
              }
              S.stats.agentsUsed++;
              return { text: "You lay a wet line all the way across the cabin at row " +
                       (cabin.rowAt(S.player.x) || "?") + ". The fire will get past it. It will " +
                       "take four times as long.", kind: "good" };
          } },

        { id: "fire.pull_cushion", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Pull the burning seat cushion out", cost: 14,
          detail: "Take the fuel away from the fire rather than the fire away from the fuel.",
          when: (S) => { const t = hot(S); return t && cabin.kindAt(t.x, t.y) === "seat"; },
          run(S) {
              const t = hot(S);
              const i = cabin.idx(t.x, t.y);
              S.fire.fuel[i] *= 0.3;
              S.fire.intensity[i] *= 0.5;
              S.player.burns += st.wearing(S, "gloves") ? 4 : 15;
              st.setFlag(S, "holdingCushion");
              return { text: "You rip the cushion out of the frame. Most of the fire goes with it " +
                       "and it is now a burning cushion that you are holding.", kind: "good" };
          } },

        { id: "fire.cushion_to_lav", deck: "fire", tags: ["fire", "carry"], danger: "good",
          label: "Put the burning cushion in the lavatory", cost: 26,
          when: (S) => S.flags.holdingCushion,
          run(S) {
              const r = A.route(S, cabin.AFT_GALLEY_X, 7);
              if (r) A.travel(S, r);
              st.setFlag(S, "holdingCushion", false);
              return { text: "You put a burning seat cushion in a lavatory and shut the door on " +
                       "it. It is a small metal room with a smoke detector and no people in it, " +
                       "which makes it the best place on this aeroplane for a fire.", kind: "good" };
          } },

        { id: "fire.stand_between", deck: "fire", tags: ["fire"], danger: "bad",
          label: "Stand between the fire and the people", cost: 20,
          detail: "Your body is a heat shield. It is not a very good one.",
          when: (S) => nearFire(S) && st.paxAt(S, S.player.x, S.player.y).length +
                       cabin.neighbours(S.player.x, S.player.y)
                            .reduce((n, [x, y]) => n + st.paxAt(S, x, y).length, 0) > 0,
          run(S) {
              S.player.burns += 14;
              S.player.smokeDose += 5;
              for (const [x, y] of cabin.neighbours(S.player.x, S.player.y)) {
                  for (const p of st.paxAt(S, x, y)) p.burns = Math.max(0, p.burns - 6);
              }
              S.credibility = Math.min(100, S.credibility + 8);
              return { text: "You put yourself between the locker and the row behind it and stay " +
                       "there. It works, in the sense that the heat has to go through you first.",
                       kind: "bad" };
          } },

        { id: "fire.laptop_shield", deck: "fire", tags: ["fire"], danger: "neutral",
          label: "Hold the laptop up as a heat shield", cost: 8,
          when: (S) => nearFire(S) && !!slot(S, "laptop"),
          run(S) {
              slot(S, "laptop").melted = true;
              S.player.burns = Math.max(0, S.player.burns - 4);
              return { text: "You hold seventeen hundred quid of work laptop between your face " +
                       "and a fire. The screen bows in the middle and goes off.", kind: "plain" };
          } },

        // --------------------------------------------------------------------- looking at it ---
        { id: "fire.look", deck: "fire", tags: ["fire", "look"],
          label: "Look at the fire properly", cost: 7,
          when: (S) => nearFire(S) || atCore(S),
          run(S) {
              S.player.lookedAtFire = true;
              const t = hot(S) || { x: S.fire.core.x, y: S.fire.core.y };
              const eta = F.ventEta(S.fire);
              let text = "It is " + F.describe(S.fire, t.x, t.y) + " at row " +
                  (cabin.rowAt(t.x) || "?") + ", and the smoke above it is " +
                  F.describeSmoke(S.fire.smoke[cabin.idx(t.x, t.y)]) + ".";
              if (st.hasPerk(S, "reads_fire")) {
                  text += " You know what this is. It is a cell in thermal runaway, there are " +
                      S.fire.core.cells + " left in the pack, containment is " +
                      Math.round(S.fire.core.contained * 100) + " per cent, and the next one goes " +
                      "in about " + PRS.util.mmss(eta) + ". Nothing you do will change the fact " +
                      "of that. Everything you do changes how bad it is.";
              } else {
                  text += " There is something in there that keeps going off. You do not know " +
                      "what it is and it is not behaving like a fire is supposed to behave.";
              }
              return text;
          } },

        { id: "fire.feel_bin", deck: "fire", tags: ["fire", "look"],
          label: "Put your hand flat on the bin", cost: 5,
          detail: "The back of your hand, and quickly. This is how you find out where it is.",
          when: (S) => cabin.rowAt(S.player.x) !== null,
          run(S) {
              const i = cabin.idx(S.player.x, S.player.y === cabin.AISLE_Y ? 3 : S.player.y);
              const h = S.fire.heat[i] + S.fire.intensity[i];
              S.credibility = Math.min(100, S.credibility + 3);
              if (h > 40) {
                  S.player.burns += 5;
                  return { text: "You cannot leave your hand there. It is not warm. It is a " +
                           "different thing entirely from warm.", kind: "bad" };
              }
              if (h > 8) return "It is warm. Not hot. Warm in the way a bin should never be warm.";
              return "Cold. The fire is not above this row.";
          } },

        { id: "fire.feel_ceiling", deck: "fire", tags: ["fire", "look"],
          label: "Put your hand on the ceiling", cost: 5,
          when: (S) => true,
          run(S) {
              const smoke = PRS.fire.totalSmoke(S.fire);
              if (smoke > 30) return { text: "The ceiling panel is hot enough that you take your " +
                  "hand off it without deciding to.", kind: "bad" };
              if (smoke > 8) return "Warm. It has been warm for a while and nobody else has checked.";
              return "Cool. Whatever this is, it is not in the ceiling void yet.";
          } },

        { id: "fire.smell", deck: "fire", tags: ["fire", "look"],
          label: "Smell it properly", cost: 4,
          when: (S) => true,
          run(S) {
              const smoke = PRS.fire.totalSmoke(S.fire);
              if (smoke < 3) return "Hot plastic and something sweet under it. Nobody else has " +
                  "mentioned it, which is the part you cannot get past.";
              if (smoke < 15) return "Burnt plastic, and now a sharp chemical edge that makes the " +
                  "back of your throat close slightly.";
              return { text: "Hydrogen fluoride. You do not know that is what it is called. You " +
                  "know that it is doing something to the inside of your face.", kind: "bad" };
          } },

        { id: "fire.photograph", deck: "fire", tags: ["fire", "look"], danger: "good",
          label: "Photograph the fire", cost: 6,
          detail: "Evidence. This is worth more than a bottle of water and it costs six seconds.",
          when: (S) => nearFire(S) && !!slot(S, "phone"),
          run(S) {
              st.setFlag(S, "havePhoto");
              S.stats.filmed++;
              S.player.filmedAt = S.clock.elapsed;
              S.credibility = Math.min(100, S.credibility + 12);
              return { text: "Four photographs and eleven seconds of video of an overhead locker " +
                       "with flame coming out of the seam. You now have something to show people " +
                       "instead of something to say to them.", kind: "good" };
          } },

        { id: "fire.point", deck: "fire", tags: ["fire", "social"],
          label: "Point at it and say nothing", cost: 4,
          when: (S) => nearFire(S),
          run(S) {
              const near = st.withinEarshot(S, 2);
              let n = 0;
              for (const p of near) { p.awareness = Math.min(100, p.awareness + 14); n++; }
              S.credibility = Math.min(100, S.credibility + 4);
              return "You point at it. You do not explain. " + n + " people look where you are " +
                     "pointing, which is more than have looked all flight.";
          } },

        { id: "fire.laser", deck: "fire", tags: ["fire", "waste"],
          label: "Point the laser pointer at the bin", cost: 4,
          when: (S) => !!slot(S, "laser"),
          run(S) {
              return "You put a green dot on the overhead locker of row " + cabin.ORIGIN.row +
                     " from eleven rows away. Nobody looks at it. Two people look at you.";
          } },

        { id: "fire.shout", deck: "fire", tags: ["fire", "social"], danger: "bad",
          label: "Shout FIRE", cost: 5,
          detail: "It will work. That is the problem with it.",
          when: (S) => true,
          run(S) {
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 34);
              S.cabinPanic = Math.min(100, S.cabinPanic + 26);
              S.credibility = Math.min(100, S.credibility + 8);
              for (const p of S.pax) p.awareness = Math.min(100, p.awareness + 26);
              PRS.audio.play("alarm");
              return { text: "You shout the word. Sixty people hear it at once and about forty of " +
                       "them stand up at the same time, in an aisle that is fifty centimetres " +
                       "wide, facing the wrong way.", kind: "bad" };
          } },

        { id: "fire.watch", deck: "fire", tags: ["fire", "waste"],
          label: "Just watch it for a minute", cost: 60,
          detail: "Sixty seconds. It is your sixty seconds.",
          when: (S) => nearFire(S),
          run(S) {
              return { text: "You watch it for a full minute. It gets bigger. That is the whole " +
                       "of what happens.", kind: "bad" };
          } },
    ]);

    A.register([
        { id: "fire.umbrella", deck: "fire", tags: ["fire", "reach"],
          label: "Reach the bin latch with the umbrella", cost: 9,
          detail: "From the aisle, without standing under a locker that is on fire.",
          when: (S) => !!slot(S, "umbrella") && Math.abs(S.player.x - S.fire.core.x) <= 2,
          run(S) {
              const key = cabin.binKey(S.fire.core.x, "left");
              if (S.cabinFlags.binsOpen[key]) {
                  delete S.cabinFlags.binsOpen[key];
                  delete S.fire.binOpen[key];
                  F.starve(S.fire, S.fire.core.x, S.fire.core.y, 0.8);
                  return { text: "You hook the latch with the umbrella and swing the locker shut " +
                           "from two metres away, with your face nowhere near it.", kind: "good" };
              }
              S.cabinFlags.binsOpen[key] = true;
              S.fire.binOpen[key] = true;
              S.fire.core.exposed = true;
              S.player.lookedAtFire = true;
              S.credibility = Math.min(100, S.credibility + 20);
              return { text: "You flip the latch with the umbrella from the aisle and the locker " +
                       "drops open. Everybody in four rows can now see it, which is the point.",
                       kind: "great" };
          } },

        { id: "fire.ball", deck: "fire", tags: ["fire", "throw", "absurd"],
          label: "Throw the cricket ball at the bin latch", cost: 6,
          when: (S) => !!slot(S, "ball") && Math.abs(S.player.x - S.fire.core.x) <= 8,
          run(S) {
              if (S.rng.chance(0.35)) {
                  const key = cabin.binKey(S.fire.core.x, "left");
                  S.cabinFlags.binsOpen[key] = true;
                  S.fire.binOpen[key] = true;
                  S.fire.core.exposed = true;
                  S.player.lookedAtFire = true;
                  S.credibility = Math.min(100, S.credibility + 18);
                  return { text: "Off stump. The latch goes, the locker drops open, and four rows " +
                           "of people find out what has been happening above their heads.",
                           kind: "great" };
              }
              S.cabinPanic = Math.min(100, S.cabinPanic + 5);
              return { text: "You throw a cricket ball down a pressurised cabin. It hits a " +
                       "ceiling panel, then a tray table, then Yevgeni Sobol.", kind: "bad" };
          } },

        { id: "fire.packs", deck: "fire", tags: ["fire", "cabin"],
          label: (S) => S.fire.packsHigh ? "Ask for the packs back to normal"
                                         : "Ask for the air conditioning on high",
          detail: "More air moves the smoke out faster and feeds the fire. Pick your problem.",
          when: (S) => S.crewPhase >= 2,
          cost: 18,
          run(S) {
              S.fire.packsHigh = !S.fire.packsHigh;
              if (S.fire.packsHigh) {
                  return { text: "The packs go to high. The noise in the cabin doubles, the smoke " +
                           "layer visibly lifts, and the fire gets a great deal more interested.",
                           kind: "neutral" };
              }
              return { text: "The packs come back. The smoke settles lower and stops moving, and " +
                       "the fire calms down about as much as a fire ever does.", kind: "neutral" };
          } },

        { id: "fire.seal_vent", deck: "fire", tags: ["fire", "fiddly"], danger: "good",
          label: "Tape over the air vents in this row", cost: 20,
          when: (S) => haveCharged(S, "tape") && cabin.rowAt(S.player.x) !== null,
          run(S) {
              st.useCharge(S, slot(S, "tape"));
              const x = S.player.x;
              for (let y = 1; y <= 7; y++) {
                  S.fire.smoke[cabin.idx(x, y)] *= 0.72;
              }
              return { text: "You tape over the gasper outlets down the whole row. It is a small " +
                       "thing and it visibly slows the grey.", kind: "good" };
          } },

        { id: "fire.name_it", deck: "fire", tags: ["fire", "absurd"],
          label: "Give the fire a name", cost: 5,
          when: (S) => !S.flags.fireName && nearFire(S),
          once: true,
          run(S) {
              const names = ["Colin", "The Situation", "Barbara", "Kevin", "The Guest",
                             "Our Friend In The Locker", "Deborah", "Sixty-One", "Trevor"];
              const name = S.rng.pick(names);
              st.setFlag(S, "fireName", name);
              return "You name it " + name + ". You will use the name for the rest of the flight " +
                     "and so, eventually, will three other people.";
          } },
    ]);
})(window);
