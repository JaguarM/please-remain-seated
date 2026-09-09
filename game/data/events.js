// Things that happen to you rather than because of you.
//
// The cabin gets a turn roughly every forty seconds of elapsed time, and it spends that turn on
// one of these. Half of them are jokes, a third of them cost you something real, and a few of
// them are the only way certain doors open at all - the smoke detector going off is worth thirty
// credibility and you cannot make it happen, you can only be standing somewhere useful when it
// does.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const clamp = PRS.util.clamp;

    // weight: relative chance. when: must be true. once: fires at most once a run.
    const EVENTS = [
        // ------------------------------------------------------------------ the fire's turn ---
        { id: "detector", weight: 30, once: true,
          when: (S) => PRS.fire.totalSmoke(S.fire) > 7 && !S.cabinFlags.detectorSounded,
          run(S) {
              S.cabinFlags.detectorSounded = true;
              S.credibility = Math.min(100, S.credibility + 30);
              S.cabinAwareness = Math.max(S.cabinAwareness, 42);
              PRS.audio.play("alarm");
              PRS.state.note(S, "Lavatory smoke detector activated.");
              return { text: "The aft lavatory smoke detector goes off. It is a very small noise " +
                             "and it changes everything: sixty people stop talking at once.",
                       kind: "great" };
          } },

        { id: "flashover", weight: 16,
          when: (S) => PRS.fire.worst(S.fire) > 58,
          run(S) {
              const f = S.fire;
              const x = f.core.x + S.rng.irange(-2, 2);
              const y = S.rng.chance(0.5) ? f.core.y : (f.core.y === 3 ? 2 : 5);
              if (!cabin.inBounds(x, y)) return null;
              f.intensity[cabin.idx(x, y)] = Math.min(100, f.intensity[cabin.idx(x, y)] + 30);
              PRS.audio.play("flare");
              return { text: "A bin latch lets go with a bang and the whole locker above row " +
                             (cabin.rowAt(x) || "?") + " is alight at once.", kind: "bad" };
          } },

        { id: "bin_pops", weight: 12,
          when: (S) => PRS.fire.worst(S.fire) > 26,
          run(S) {
              PRS.audio.play("fireGrow");
              return { text: "Something in the bin goes off like a firework. Nobody screams. " +
                             "That is somehow worse.", kind: "bad" };
          } },

        { id: "smoke_layer", weight: 14, once: true,
          when: (S) => PRS.fire.totalSmoke(S.fire) > 22,
          run(S) {
              return { text: "The smoke finds the ceiling and stops. It sits there in a flat grey " +
                             "line about a foot above everyone's heads, and it comes down.",
                       kind: "bad" };
          } },

        // --------------------------------------------------------------- the cabin's turn ----
        { id: "pa_sorry", weight: 20,
          when: (S) => S.crewPhase <= 2 && S.clock.elapsed > 60,
          run(S) {
              S.clock.announcements++;
              PRS.audio.play("pa");
              const lines = [
                  "“Ladies and gentlemen, from the flight deck — we've begun our descent into a " +
                  "rather grey afternoon. Cabin crew, ten minutes.”",
                  "“Just a quick note from the galley — we are aware of a slight smell and it is " +
                  "being looked into. Please do remain seated.”",
                  "“Ladies and gentlemen, we'll be coming through the cabin shortly to collect any " +
                  "remaining glassware.”",
                  "“Would the passenger in 9C please return to their seat. Thank you.”",
              ];
              return { text: "PA: " + PRS.state.line(S, "pa", lines), kind: "pa" };
          } },

        { id: "belt_sign", weight: 14, once: true,
          when: (S) => S.clock.elapsed > 120,
          run(S) {
              S.cabinFlags.beltSignOn = true;
              PRS.audio.play("beltSign");
              return { text: "The seatbelt sign comes on with a chime. Forty people who were " +
                             "about to stand up sit back down. Including two of yours.",
                       kind: "bad" };
          } },

        { id: "turbulence", weight: 12,
          when: (S) => S.clock.elapsed > 90,
          run(S) {
              const dropped = [];
              for (const id of S.player.carrying.slice()) {
                  if (S.rng.chance(0.4)) {
                      const p = PRS.state.paxById(S, id);
                      if (p) {
                          p.state = p.state === "down" ? "down" : PRS.pax.looseState(p);
                          p.carriedBy = null;
                          dropped.push(p.name);
                          S.player.carrying = S.player.carrying.filter((c) => c !== id);
                      }
                  }
              }
              PRS.audio.play("drop");
              return { text: "The aeroplane drops half a wing and comes back. " +
                       (dropped.length ? "You put " + dropped.join(" and ") + " down harder than " +
                        "you meant to." : "You get a hand to a seat back in time."),
                       kind: dropped.length ? "bad" : "plain" };
          } },

        { id: "cart_rolls", weight: 10,
          when: (S) => S.cabinFlags.cartOut && S.cabinPanic > 40,
          run(S) {
              const x = clamp(S.cabinFlags.cartX + 3, cabin.FWD_ROWS.x0, cabin.AFT_ROWS.x1);
              delete S.cabinFlags.aisleBlocked[S.cabinFlags.cartX];
              S.cabinFlags.cartX = x;
              S.cabinFlags.aisleBlocked[x] = 9999;
              return { text: "Somebody knocks the brake off the trolley and two hundred kilos of " +
                             "duty free rolls three rows aft and stops across the aisle at row " +
                             (cabin.rowAt(x) || "?") + ".", kind: "bad" };
          } },

        { id: "someone_stands", weight: 18,
          when: (S) => S.cabinPanic > 30,
          run(S) {
              const options = S.pax.filter((p) => p.state === "seated" && p.panic > 45 &&
                                                  !p.helper && PRS.pax.canStandUp(p));
              if (!options.length) return null;
              const p = S.rng.pick(options);
              p.state = "aisle";
              p.x = p.homeX; p.y = cabin.AISLE_Y;
              S.cabinFlags.aisleBlocked[p.x] = (S.cabinFlags.aisleBlocked[p.x] || 0) + 30;
              PRS.state.reindex(S);
              return { text: p.name + " stands up in row " + p.row + ", gets a bag out of the bin, " +
                             "puts it down in the aisle, and stands next to it.", kind: "bad" };
          } },

        { id: "argument", weight: 16,
          when: (S) => S.cabinAwareness > 35,
          run(S) {
              const pairs = S.pax.filter((p) => p.state !== "secured" && p.state !== "down");
              if (pairs.length < 2) return null;
              const a = S.rng.pick(pairs), b = S.rng.pick(pairs.filter((p) => p !== a));
              if (!b) return null;
              S.cabinPanic = Math.min(100, S.cabinPanic + 4);
              return { text: a.name + " and " + b.name + " begin a loud argument about whether " +
                             PRS.state.line(S, "argument", [
                                 "the crew have been told", "this is normal",
                                 "somebody should do something",
                                 "it is legally allowed to be this hot",
                                 "whose bag it is",
                                 "whether anybody has actually seen a flame",
                                 "the exits open from the inside"]) + ".", kind: "plain" };
          } },

        { id: "phone_out", weight: 12,
          when: (S) => S.cabinAwareness > 45,
          run(S) {
              const p = S.rng.pick(S.pax.filter((q) => q.state !== "down" && q.state !== "secured"));
              if (!p) return null;
              return { text: p.name + " holds a phone up over the seat backs to film the smoke, in " +
                             "portrait, with the flash on.", kind: "plain" };
          } },

        { id: "child_cries", weight: 10,
          when: (S) => S.cabinPanic > 45,
          run(S) {
              return { text: "One of the children starts crying, and it goes through the cabin " +
                             "like a crack through glass.", kind: "bad" };
          } },

        { id: "someone_prays", weight: 8,
          when: (S) => S.cabinPanic > 60,
          run(S) {
              return { text: "Three rows behind you somebody starts praying, quite loudly, in a " +
                             "language you do not have.", kind: "plain" };
          } },

        { id: "applause", weight: 5,
          when: (S) => S.credibility > 60 && S.clock.remaining < 400,
          run(S) {
              S.cabinPanic = Math.max(0, S.cabinPanic - 6);
              return { text: "Somebody starts clapping. For you. It is the single most unhelpful " +
                             "thing that has happened in nine minutes.", kind: "plain" };
          } },

        { id: "helpful_offer", weight: 14,
          when: (S) => S.credibility > 45 && PRS.state.helperCount(S) < 6,
          run(S) {
              const options = S.pax.filter((p) => !p.helper && p.state !== "down" &&
                  p.state !== "secured" && p.traits.indexOf("helpful") >= 0);
              if (!options.length) return null;
              const p = S.rng.pick(options);
              p.trust = Math.min(100, p.trust + 30);
              return { text: p.name + " catches your eye from " + p.seat + " and mouths: what do " +
                             "you need. Ask them.", kind: "great" };
          } },


        { id: "bruno", weight: 7, once: true,
          when: (S) => PRS.fire.totalSmoke(S.fire) > 14,
          run(S) {
              const dog = S.pax.filter((p) => p.traits.indexOf("pet") >= 0)[0];
              if (!dog || dog.state === "secured") return null;
              return { text: "Under 21B, Bruno has stopped making the noise he was making. " +
                             "Delphine Mercier has noticed and is not coping.", kind: "bad" };
          } },

        { id: "sit_down", weight: 22,
          when: (S) => S.crewPhase < 4 && S.credibility < 55,
          run(S) {
              const p = S.rng.pick(S.pax.filter((q) => q.traits.indexOf("hostile") >= 0 &&
                                                        q.state !== "down" && q.state !== "secured"));
              if (!p) return null;
              S.player.panic = Math.min(100, S.player.panic + 4);
              S.stats.sitDowns = (S.stats.sitDowns || 0) + 1;
              const lines = [
                  "“Will you SIT DOWN.”",
                  "“You are frightening my children.”",
                  "“There is a procedure and you are not it.”",
                  "“I have asked you politely. That was the polite one.”",
                  "“Cabin crew! CABIN CREW! This person won't sit down!”",
              ];
              return { text: p.name + ", from " + p.seat + ": " +
                  PRS.state.line(S, "sitdown", lines), kind: "bad" };
          } },

        { id: "vindication", weight: 10, once: true,
          when: (S) => S.credibility > 70,
          run(S) {
              const p = S.rng.pick(S.pax.filter((q) => q.traits.indexOf("sceptic") >= 0 &&
                                                        q.state !== "down"));
              if (!p) return null;
              p.trust = 60;
              return { text: p.name + " says, to nobody: “You were right. You were right and I " +
                             "told you to sit down.” It does not help. It is nice.", kind: "good" };
          } },

        { id: "quiet", weight: 12,
          when: (S) => S.clock.remaining < 300,
          run(S) {
              return { text: "For about four seconds the cabin is completely quiet, and you can " +
                             "hear the fire.", kind: "plain" };
          } },

        { id: "landing_gear", weight: 30, once: true,
          when: (S) => S.clock.remaining < 150,
          run(S) {
              PRS.audio.play("chime");
              return { text: "The gear comes down with a thump that everybody feels in their " +
                             "chest. Two minutes. Whatever you are doing, this is the last of it.",
                       kind: "pa" };
          } },

        { id: "flaps", weight: 20, once: true,
          when: (S) => S.clock.remaining < 260,
          run(S) {
              return { text: "The flaps run out and the aeroplane slows and tips forward. " +
                             "Everything in the aisle slides one row toward the front.",
                       kind: "plain" };
          } },
    ];

    const BY_ID = {};
    for (const e of EVENTS) BY_ID[e.id] = e;

    function tick(S, dt) {
        S._eventClock = (S._eventClock || 0) + dt;
        const interval = 38 - Math.min(16, S.cabinPanic * 0.16);
        if (S._eventClock < interval) return;
        S._eventClock = 0;
        fire(S);
    }

    function fire(S) {
        S._eventsFired = S._eventsFired || {};
        const pool = [];
        for (const e of EVENTS) {
            if (e.once && S._eventsFired[e.id]) continue;
            let ok = true;
            try { ok = e.when ? e.when(S) : true; } catch (err) { ok = false; }
            if (!ok) continue;
            for (let i = 0; i < e.weight; i++) pool.push(e);
        }
        if (!pool.length) return null;
        const chosen = S.rng.pick(pool);
        let result = null;
        try { result = chosen.run(S); } catch (err) { console.error("event", chosen.id, err); }
        if (!result) return null;
        S._eventsFired[chosen.id] = true;
        PRS.state.log(S, result.text, result.kind || "plain");
        return chosen.id;
    }

    /** Fire a named event on purpose. Actions use this so the story beats stay in one file. */
    function force(S, id) {
        const e = BY_ID[id];
        if (!e) return null;
        const r = e.run(S);
        if (r) {
            S._eventsFired = S._eventsFired || {};
            S._eventsFired[id] = true;
            PRS.state.log(S, r.text, r.kind || "plain");
        }
        return r;
    }

    PRS.events = { EVENTS, tick, fire, force };
})(window);
