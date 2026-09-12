// Things that happen to you rather than because of you.
//
// The cabin gets a turn roughly every forty seconds of elapsed time, and it spends that turn on
// one of these. Every one of them changes a number the score depends on: the detector is thirty
// credibility you cannot make happen, only be standing somewhere useful for; turbulence is what
// a long carry risks; a passenger standing up is the aisle getting narrower.
//
// Which one it spends the turn on is that turn's own dice, so the third cabin turn on a seed is
// the same draw however you spent the first two minutes.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t;
    const cabin = PRS.cabin;
    const clamp = PRS.util.clamp;

    // weight: relative chance. when: must be true. once: fires at most once a run.
    // run(S, r): r is the turn's dice.
    const EVENTS = [
        { id: "detector", weight: 30, once: true,
          when: (S) => PRS.fire.totalSmoke(S.fire) > 7 && !S.cabinFlags.detectorSounded,
          run(S) {
              S.cabinFlags.detectorSounded = true;
              S.credibility = Math.min(100, S.credibility + 30);
              S.cabinAwareness = Math.max(S.cabinAwareness, 42);
              PRS.audio.play("alarm");
              return { text: T("The aft lavatory smoke detector goes off. It is a very small " +
                               "noise and it changes everything: sixty people stop talking at " +
                               "once."),
                       kind: "great" };
          } },

        { id: "flashover", weight: 16,
          when: (S) => PRS.fire.worst(S.fire) > 58,
          run(S, r) {
              const f = S.fire;
              const x = f.core.x + r.irange(-2, 2);
              const y = r.chance(0.5) ? f.core.y : (f.core.y === 3 ? 2 : 5);
              if (!cabin.inBounds(x, y)) return null;
              f.intensity[cabin.idx(x, y)] = Math.min(100, f.intensity[cabin.idx(x, y)] + 30);
              PRS.audio.play("flare");
              return { text: T("A bin latch lets go with a bang and the whole locker above " +
                               "row {row} is alight at once.",
                               { row: cabin.rowAt(x) || "?" }), kind: "bad" };
          } },

        { id: "turbulence", weight: 12,
          when: (S) => S.clock.elapsed > 90,
          run(S, r) {
              const dropped = [];
              for (const id of S.player.carrying.slice()) {
                  if (r.chance(0.4)) {
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
              return { text: T("The aeroplane drops half a wing and comes back. {what}",
                       { what: dropped.length
                           ? T("You put {who} down harder than you meant to.",
                               { who: PRS.util.listSentence(dropped) })
                           : T("You get a hand to a seat back in time.") }),
                       kind: dropped.length ? "bad" : "plain" };
          } },

        { id: "cart_rolls", weight: 10,
          when: (S) => S.cabinFlags.cartOut && S.cabinPanic > 40,
          run(S) {
              // Three rows aft, or up against you if you are in the aisle before that: two
              // hundred kilos stops at the person, it does not pass through them.
              let x = clamp(S.cabinFlags.cartX + 3, cabin.FWD_ROWS.x0, cabin.AFT_ROWS.x1);
              if (S.player.y === cabin.AISLE_Y &&
                  S.player.x > S.cabinFlags.cartX && S.player.x <= x) x = S.player.x - 1;
              if (x <= S.cabinFlags.cartX) return null;
              delete S.cabinFlags.aisleBlocked[S.cabinFlags.cartX];
              S.cabinFlags.cartX = x;
              S.cabinFlags.aisleBlocked[x] = 9999;
              return { text: T("Somebody knocks the brake off the trolley and two hundred " +
                               "kilos of duty free rolls three rows aft and stops across the " +
                               "aisle at row {row}.",
                               { row: cabin.rowAt(x) || "?" }), kind: "bad" };
          } },

        { id: "someone_stands", weight: 18,
          when: (S) => S.cabinPanic > 30,
          run(S, r) {
              const options = S.pax.filter((p) => p.state === "seated" && p.panic > 45 &&
                                                  !p.helper && PRS.pax.canStandUp(p));
              if (!options.length) return null;
              const p = r.pick(options);
              p.state = "aisle";
              p.x = p.homeX; p.y = cabin.AISLE_Y;
              S.cabinFlags.aisleBlocked[p.x] = (S.cabinFlags.aisleBlocked[p.x] || 0) + 30;
              PRS.state.reindex(S);
              return { text: T("{who} stands up in row {row}, gets a bag out of the bin, puts " +
                               "it down in the aisle, and stands next to it.",
                               { who: p.name, row: p.row }), kind: "bad" };
          } },

        { id: "helpful_offer", weight: 14,
          when: (S) => S.credibility > 45 && PRS.pax.helperCap(S) > 0,
          run(S, r) {
              const options = S.pax.filter((p) => !p.helper && p.state !== "down" &&
                  p.state !== "dead" && p.traits.indexOf("helpful") >= 0);
              if (!options.length) return null;
              const p = r.pick(options);
              p.trust = Math.min(100, p.trust + 30);
              return { text: T("{who} catches your eye from {seat} and mouths: what do you " +
                               "need. Ask them.", { who: p.name, seat: p.seat }), kind: "great" };
          } },

        { id: "sit_down", weight: 22,
          when: (S) => S.crewPhase < 4 && S.credibility < 55,
          run(S, r) {
              const p = r.pick(S.pax.filter((q) => q.traits.indexOf("hostile") >= 0 &&
                                                   q.state !== "down" && q.state !== "dead"));
              if (!p) return null;
              (S.stats.sitDownBy = S.stats.sitDownBy || {})[p.id] = true;
              const lines = [
                  T("“Will you SIT DOWN.”"),
                  T("“You are frightening my children.”"),
                  T("“There is a procedure and you are not it.”"),
                  T("“I have asked you politely. That was the polite one.”"),
                  T("“Cabin crew! CABIN CREW! This person won't sit down!”"),
              ];
              return { text: T("{who}, from {seat}: {said}",
                               { who: p.name, seat: p.seat,
                                 said: PRS.state.line(S, "sitdown", lines) }), kind: "bad" };
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

    /** The cabin's turn. Numbered, and the number is the name of the dice it is decided with. */
    function fire(S) {
        S._eventsFired = S._eventsFired || {};
        const turn = S._eventTurn = (S._eventTurn || 0) + 1;
        const r = PRS.state.dice(S, "event:" + turn);
        const pool = [];
        for (const e of EVENTS) {
            if (e.once && S._eventsFired[e.id]) continue;
            let ok = true;
            try { ok = e.when ? e.when(S) : true; } catch (err) { ok = false; }
            if (ok) pool.push(e);
        }
        if (!pool.length) return null;

        let chosen = null;
        let total = 0;
        for (const e of pool) total += e.weight;
        let t = r() * total;
        for (const e of pool) {
            t -= e.weight;
            if (t < 0) { chosen = e; break; }
        }
        chosen = chosen || pool[pool.length - 1];

        let result = null;
        try { result = chosen.run(S, r); } catch (err) { console.error("event", chosen.id, err); }
        if (!result) return null;
        S._eventsFired[chosen.id] = true;
        PRS.state.log(S, result.text, result.kind || "plain");
        return chosen.id;
    }

    /** Fire a named event on purpose. The lavatory action sets the detector off through this. */
    function force(S, id) {
        const e = BY_ID[id];
        if (!e) return null;
        const r = e.run(S, PRS.state.dice(S, "event:forced:" + id));
        if (r) {
            S._eventsFired = S._eventsFired || {};
            S._eventsFired[id] = true;
            PRS.state.log(S, r.text, r.kind || "plain");
        }
        return r;
    }

    PRS.events = { EVENTS, tick, fire, force };
})(window);
