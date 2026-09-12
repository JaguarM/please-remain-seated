// Deck: THE FIRE. Every way to attack a fire, and not one of them puts it out.
//
// This deck is the half of the game that looks like the whole of it. It is the most satisfying and
// the most obviously correct, and it does real good: every point of fire held down is smoke that
// nobody breathes and an aisle somebody can still walk down when the doors open. Spend the whole
// flight in it and you will have soaked the people you were protecting, moved nobody, and an
// incident report will use the word "obstructive". Everything here buys time. The people deck
// spends it.
//
// The ones that are not a trap, in case anybody ever reads this file instead of playing: closing
// or taping the bin, getting the case into a sink, and pre-wetting the row the fire is about to
// reach. Those change the shape of the next nine minutes. The rest are a bottle of water and a
// feeling. The pouring and smothering actions themselves are in actions-douse.js.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const F = PRS.fire;

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
    /**
     * Is the case still in the locker above 14C? Everything about the bin — closing it, holding
     * it, taping it, emptying it, hauling the case out of it — is about a case that is in it.
     * Once the thing is in your hands or in the basin there is no bin to fight, and a locker
     * door in the aft lavatory is not a locker door.
     */
    function inLocker(S) {
        return !S.flags.holdingCase && !S.flags.caseInLav && !S.fire.core.inSink;
    }
    function slot(S, id) { return st.slotOf(S, id); }
    function haveCharged(S, id) { const s = slot(S, id); return s && !s.spent && (s.uses === null || s.uses > 0); }

    /** Put an agent on the hot tile, spend the charge, and say something honest about it. */
    function pour(S, itemId, agentName, opts) {
        opts = opts || {};
        const target = opts.target || hot(S);
        if (!target) return T("There is nothing burning within reach of you.");
        const s = itemId ? slot(S, itemId) : null;
        if (s) st.useCharge(S, s);
        const amount = opts.amount === undefined ? 1 : opts.amount;
        const r = F.apply(S.fire, target.x, target.y, agentName, amount, opts.spread || 0.35);
        S.stats.agentsUsed++;
        if (r.agent.knock >= 0) PRS.douse.witness(S, r.knocked, opts.soak === undefined ? 1 : opts.soak);
        PRS.audio.play(opts.sound || (r.agent.knock < 0 ? "flare" : "pour"));
        const after = S.fire.intensity[cabin.idx(target.x, target.y)];

        if (r.agent.knock < 0) {
            return { text: (opts.text ? T(opts.text) : "") +
                     T(" The flame goes flat, gets brighter, and comes back up through it. It " +
                       "is now {what}.",
                       { what: F.describe(S.fire, target.x, target.y) }), kind: "bad" };
        }
        const line = opts.text ? T(opts.text) : "";
        const gone = after < 1;
        const tail = gone
            ? T(" It goes out. For a moment there is nothing there at all, and it is the best " +
                "moment of your afternoon.")
            : T(" It drops to {what}.", { what: F.describe(S.fire, target.x, target.y) });
        const core = r.onCore
            ? T(" Some of it gets into the bin and the case gets cooler, which is the only part " +
                "of this that counts.")
            : T(" None of it reaches the bin.");
        return { text: line + tail + core, kind: gone ? "good" : "plain" };
    }

    A.register([
        // ------------------------------------------------------------------ liquids on flame ---

        // --------------------------------------------------------------------- smothering ------

        // ------------------------------------------------------------------ the bin, properly ---
        { id: "fire.close_bin", deck: "fire", tags: ["fire", "hands", "fiddly"], danger: "good",
          label: K("Close the overhead bin"), cost: 8,
          detail: K("Take the air away from it. This is what the manual actually says."),
          when: (S) => atCore(S) && inLocker(S) &&
                       S.cabinFlags.binsOpen[cabin.binKey(S.fire.core.x, "left")],
          run(S) {
              delete S.cabinFlags.binsOpen[cabin.binKey(S.fire.core.x, "left")];
              delete S.fire.binOpen[cabin.binKey(S.fire.core.x, "left")];
              const c = F.starve(S.fire, S.fire.core.x, S.fire.core.y, 1);
              if (!st.wearing(S, "gloves")) S.player.burns += 9;
              PRS.audio.play("smother");
              return { text: T("You get the latch shut. The noise from inside changes pitch. " +
                               "Containment is now {pct} per cent, and every second of that is " +
                               "a second the cabin does not get.",
                               { pct: Math.round(c * 100) }) +
                       (st.wearing(S, "gloves") ? "" : T(" Your hand is burned.")),
                       kind: "good" };
          } },

        { id: "fire.hold_bin", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: K("Hold the bin shut with your body"), cost: 26,
          detail: K("It will not stay latched. You can make it stay latched."),
          when: (S) => atCore(S) && inLocker(S),
          run(S) {
              const c = F.starve(S.fire, S.fire.core.x, S.fire.core.y, 1.6);
              S.player.burns += st.wearing(S, "gloves") ? 4 : 16;
              S.player.smokeDose += 6;
              return { text: T("You put your shoulder into the locker door and stand there. " +
                               "It gets hot enough through the panel to be a decision. " +
                               "Containment {pct} per cent.", { pct: Math.round(c * 100) }),
                       kind: "good" };
          } },

        { id: "fire.tape_bin", item: "tape", deck: "fire", tags: ["fire", "fiddly"], danger: "good",
          label: K("Tape the bin shut"), cost: 22,
          detail: K("Six strips across the latch. It is not going to open again."),
          when: (S) => atCore(S) && inLocker(S) && haveCharged(S, "tape") && !S.flags.binTaped,
          run(S) {
              st.useCharge(S, slot(S, "tape"), 2);
              const c = F.starve(S.fire, S.fire.core.x, S.fire.core.y, 2.2);
              st.setFlag(S, "binTaped");
              return { text: T("You run six strips of duct tape over the latch and down the " +
                               "seam. It holds. Containment {pct} per cent, and unlike your " +
                               "shoulder, tape does not need to go anywhere.",
                               { pct: Math.round(c * 100) }), kind: "great" };
          } },

        { id: "fire.open_bin", deck: "fire", tags: ["reveal", "fire", "hands"], danger: "bad",
          label: K("Open the bin and look at it"), cost: 10,
          detail: K("You will find out what this is. It will also get a great deal of air."),
          when: (S) => atCore(S) && inLocker(S) && !S.fire.core.exposed,
          run(S) {
              S.fire.core.exposed = true;
              S.cabinFlags.binsOpen[cabin.binKey(S.fire.core.x, "left")] = true;
              S.fire.binOpen[cabin.binKey(S.fire.core.x, "left")] = true;
              S.fire.core.contained = 0;
              S.credibility = Math.min(100, S.credibility + 26);
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 18);
              if (!st.wearing(S, "gloves")) S.player.burns += 12;
              F.apply(S.fire, S.fire.core.x, S.fire.core.y, "air", 1, 0);
              PRS.audio.play("flare");
              return { text: T("The locker comes open and a wall of heat comes out with it. " +
                               "Inside, a hard-shell case is burning from the inside out and " +
                               "there is a small cylindrical thing in the middle of it going " +
                               "off like a firework every few seconds. It is a vape. It is " +
                               "somebody's vape."), kind: "great" };
          } },

        { id: "fire.pull_case", deck: "fire", tags: ["fire", "hands"], danger: "bad",
          label: K("Pull the burning case out of the bin"), cost: 16,
          detail: K("You will be holding it. Have a plan for the next fifteen seconds."),
          when: (S) => atCore(S) && inLocker(S) && S.fire.core.exposed,
          run(S) {
              st.setFlag(S, "holdingCase");
              S.player.burns += st.wearing(S, "gloves") ? 8 : 30;
              S.fire.core.contained = 0;
              // Out of the locker and into your hands: the seat of the fire is now wherever
              // you are, and it goes where you go.
              S.fire.core.x = S.player.x;
              S.fire.core.y = S.player.y;
              PRS.audio.play("flare");
              return { text: T("You get both hands under it and haul it out. It is the size " +
                               "of a cabin bag and it is on fire and you are now holding it " +
                               "above your head in a corridor full of seated people.") +
                       (st.wearing(S, "gloves")
                           ? T(" The welding gloves are the only reason you still have hands.")
                           : T(" You are not wearing gloves. You will feel this for a year.")),
                       kind: "bad" };
          } },

        { id: "fire.case_to_lav", deck: "fire", tags: ["fire", "carry"], danger: "good",
          label: K("Carry the case to the lavatory"), cost: 34,
          detail: K("There is a sink in there. A sink is a bucket you cannot knock over."),
          when: (S) => S.flags.holdingCase && !S.flags.caseInLav,
          run(S) {
              const r = A.route(S, cabin.AFT_GALLEY_X, 7);
              if (r) A.travel(S, r);
              st.setFlag(S, "caseInLav");
              S.player.burns += st.wearing(S, "gloves") ? 5 : 18;
              return { text: T("You get it down the aisle at arm's length, past eleven rows " +
                               "of people who move for the first time all flight, and into the " +
                               "lavatory."), kind: "good" };
          } },

        { id: "fire.case_in_sink", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: K("Put the case in the sink and run the tap"), cost: 18,
          detail: K("This is the correct answer. Nobody in the history of this has done it in time."),
          when: (S) => S.flags.caseInLav && !S.fire.core.inSink,
          run(S) {
              S.fire.core.inSink = true;
              st.setFlag(S, "holdingCase", false);
              S.fire.core.x = cabin.AFT_GALLEY_X;
              S.fire.core.y = 7;
              S.fire.core.contained = Math.max(S.fire.core.contained, 0.6);
              PRS.audio.play("pour");
              return { text: T("You jam the case into the basin and hold the tap open with " +
                               "your elbow. It does not go out — a cell in runaway makes its " +
                               "own oxygen and there are {n} of them left — but every one of " +
                               "them is now going to vent under nine centimetres of water " +
                               "instead of into a locker above somebody's head.",
                               { n: S.fire.core.cells }) + "\n\n" +
                       T("This is the best thing you will do today and nobody will ever know " +
                         "you did it."), kind: "great" };
          } },

        { id: "fire.empty_bin", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: K("Throw everything else out of the bin"), cost: 19,
          detail: K("The fuel is not the fire. The fuel is four cabin bags and a coat."),
          when: (S) => atCore(S) && inLocker(S) && S.fire.core.exposed && !S.flags.binEmptied,
          run(S) {
              st.setFlag(S, "binEmptied");
              for (let d = -1; d <= 1; d++) {
                  const i = cabin.idx(S.fire.core.x + d, S.fire.core.y);
                  if (i >= 0) S.fire.fuel[i] *= 0.45;
              }
              S.player.burns += st.wearing(S, "gloves") ? 3 : 11;
              return { text: T("You throw four cabin bags, a wax jacket and a bag of " +
                               "Toblerone into the aisle. There is measurably less to burn up " +
                               "there now."), kind: "good" };
          } },

        // ----------------------------------------------------------------- proper equipment ---
        { id: "fire.halon", item: "halon_bottle", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: K("Discharge the halon bottle into it"), cost: 14,
          detail: K("The real thing. It works. It works on the flame, which is not the fire."),
          when: (S) => nearFire(S) && haveCharged(S, "halon_bottle"),
          run: (S) => pour(S, "halon_bottle", "halon", { amount: 1.2, spread: 0.8, sound: "halon",
                soak: 0.6,
                text: K("You pull the pin and put the whole bottle into the locker. " +
                        "Everything orange in a three metre radius stops being orange at " +
                        "once.") }) },

        { id: "fire.water_ext", item: "water_ext", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: K("Water extinguisher from the galley"), cost: 15,
          when: (S) => nearFire(S) && haveCharged(S, "water_ext"),
          run: (S) => pour(S, "water_ext", "water", { amount: 2.0, spread: 0.6, sound: "spray",
                soak: 1.4, text: K("Nine litres under pressure, straight in.") }) },

        // ---------------------------------------------------------- firebreaks and prevention ---
        { id: "fire.firebreak", item: "water_big", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: K("Wet the row the fire is going to reach next"), cost: 16,
          detail: K("Not the fire. The seats beside it, and the people in them."),
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
                      S.fire.suppress[i] = Math.min(100, S.fire.suppress[i] + 32);
                      n++;
                  }
              }
              S.stats.agentsUsed++;
              PRS.pax.annoy(S, 0.7);
              PRS.audio.play("pour");
              return { text: T("You put the water on {n} tiles of seat that are not burning " +
                               "yet. Nothing visible happens, which is how you know it was the " +
                               "right thing to do.", { n: n }), kind: "good" };
          } },

        { id: "fire.pull_cushion", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: K("Pull the burning seat cushion out"), cost: 14,
          detail: K("Take the fuel away from the fire rather than the fire away from the fuel."),
          when: (S) => { const t = hot(S); return t && cabin.kindAt(t.x, t.y) === "seat"; },
          run(S) {
              const t = hot(S);
              const i = cabin.idx(t.x, t.y);
              S.fire.fuel[i] *= 0.3;
              S.fire.intensity[i] *= 0.5;
              S.player.burns += st.wearing(S, "gloves") ? 4 : 15;
              return { text: T("You rip the cushion out of the frame. Most of the fire goes " +
                               "with it, and you throw it down the aisle onto carpet over " +
                               "aluminium, where there is nothing for it to eat."),
                       kind: "good" };
          } },

        // --------------------------------------------------------------------- looking at it ---

        { id: "fire.photograph", item: "phone", deck: "fire", tags: ["fire", "look"], danger: "good",
          label: K("Photograph the fire"), cost: 6,
          detail: K("Evidence. This is worth more than a bottle of water and it costs six seconds."),
          when: (S) => nearFire(S) && !!slot(S, "phone") && !S.flags.havePhoto,
          run(S) {
              st.setFlag(S, "havePhoto");
              S.credibility = Math.min(100, S.credibility + 12);
              return { text: T("Four photographs and eleven seconds of video of an overhead " +
                               "locker with flame coming out of the seam. You now have " +
                               "something to show people instead of something to say to them."),
                       kind: "good" };
          } },
    ]);

    A.register([
        { id: "fire.point", deck: "fire", tags: ["fire", "social"],
          label: K("Point at it and say nothing"), cost: 4,
          detail: K("For the people nearby who have still not looked up."),
          when: (S) => nearFire(S) &&
                       st.withinEarshot(S, 2).some((p) => p.awareness < 75),
          run(S) {
              let n = 0;
              for (const p of st.withinEarshot(S, 2)) {
                  if (p.awareness >= 75) continue;
                  p.awareness = Math.min(100, p.awareness + 18);
                  n++;
              }
              return T("You point at it. You do not explain. {n} people look where you are " +
                       "pointing, which is more than have looked all flight.", { n: n });
          } },


        // A row of gaspers can be taped once. There were six strips in the roll and a row that
        // has been done stays done: the smoke that comes back into it comes past the tape, not
        // through the holes, and taping tape does nothing.
        { id: "fire.seal_vent", item: "tape", deck: "fire", tags: ["fire", "fiddly"], danger: "good",
          label: K("Tape over the air vents in this row"), cost: 20,
          when: (S) => haveCharged(S, "tape") && cabin.rowAt(S.player.x) !== null &&
                       !S.cabinFlags.ventsTaped[S.player.x],
          run(S) {
              st.useCharge(S, slot(S, "tape"));
              const x = S.player.x;
              S.cabinFlags.ventsTaped[x] = true;
              for (let y = 1; y <= 7; y++) {
                  S.fire.smoke[cabin.idx(x, y)] *= 0.72;
              }
              return { text: T("You tape over the gasper outlets down the whole row. It is a " +
                               "small thing and it visibly slows the grey."), kind: "good" };
          } },
    ]);
})(window);
