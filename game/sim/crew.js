// The crew, and their procedure.
//
// The procedure is good. It was written by people who thought hard about it, it is drilled every
// year, and it is the correct response to a galley oven fire, a laptop in a seat pocket, or a
// cigarette in a lavatory bin. It has six phases and it will run all six of them in order no
// matter what you do, because that is what a procedure is for.
//
// What it is not for is a lithium cell in a closed hard case in a bin, discovered by a passenger,
// nine minutes before top of descent. So the crew will do everything right and it will not be
// enough, and the only lever you have is how early phase 2 starts. Every minute you shave off
// that is worth more than any bottle of water you will ever pour.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const T = PRS.t, K = PRS.k;
    const { clamp, clamp01 } = PRS.util;

    // The phases, in the order they happen, with what has to be true for the next one to start.
    const PHASES = [
        { id: 0, name: K("Service"),
          desc: K("The trolley is out. There is a smell, and smells happen.") },
        { id: 1, name: K("Noted"),
          desc: K("Somebody has mentioned it to somebody. It has been noted.") },
        { id: 2, name: K("Investigating"),
          desc: K("A member of crew is coming to look. The trolley is being stowed.") },
        { id: 3, name: K("Fighting"),
          desc: K("Halon on the visible flame, which is not where the fire is.") },
        { id: 4, name: K("Declared"),
          desc: K("The flight deck knows. The descent steepens: a runway sooner, ninety seconds " +
                  "fewer.") },
        { id: 5, name: K("Secure cabin"),
          desc: K("Everybody sits down for landing. Including the ones you were carrying.") },
    ];

    // Which of the six phases an aeroplane actually runs. A narrowbody runs all of them in
    // order. An aeroplane with no cabin crew runs the two that do not need any: somebody
    // notices, and then the flight deck is told - and the four in between, which are a crew
    // member walking aft to look, a crew member emptying a bottle, and two crew members putting
    // everybody back in their seats for landing, simply never happen, because there is nobody
    // on board to do them.
    //
    // The last of those is worth saying out loud: CL 2231 never secures the cabin, so nobody
    // ever undoes your carries. That is not a kindness. It is the same fact as the other three.
    const PATHS = {
        cabin:      [1, 2, 3, 4, 5],
        flightdeck: [1, 4],
    };

    // Which readiness gate a jump is judged on, by the phase being jumped to. Climbing the
    // chain one step at a time on a narrowbody, these are the same thing. Jumping 1 to 4 on an
    // aeroplane with no crew is not gated on the flight deck's own row - there is no chain of
    // crew to climb, so the evidence goes straight to the front - but it is not free either.
    const GATE = { 1: 0, 2: 1, 3: 2, 4: 2, 5: 3 };

    function model(S) {
        return (S.aircraft && S.aircraft.crewModel) || "cabin";
    }

    function path(S) {
        return PATHS[model(S)] || PATHS.cabin;
    }

    /** The next phase this aeroplane runs after the one it is in, or null at the end. */
    function nextPhase(S) {
        for (const p of path(S)) if (p > S.crewPhase) return p;
        return null;
    }

    function create(S) {
        const data = PRS.data.passengers;
        const roster = data[(S.aircraft && S.aircraft.crewKey) || "CREW"] || data.CREW;
        S.crew = roster.map(function (c, i) {
            const fwd = c.seat === "fwd";
            // A crew member on the flight deck is behind a locked door and is not in the cabin
            // at all: not drawn, not walked past, not tapped on the shoulder, and not coming
            // out. The interphone by the door is the whole of your access to them.
            const deck = c.seat === "deck";
            // Yasmin boards the flight already out with the trolley, standing behind it.
            const withCart = c.id === "fa1" && S.cabinFlags.cartOut;
            return {
                id: c.id,
                name: c.name,
                role: c.role,
                sprite: c.sprite,
                hair: c.hair, skin: c.skin, shirt: c.shirt,
                line: c.line,
                deck: deck,
                x: deck ? 0
                   : withCart ? S.cabinFlags.cartX + 1
                   : fwd ? cabin.FWD_GALLEY_X : cabin.AFT_GALLEY_X,
                y: cabin.AISLE_Y + (i === 1 ? 0 : 0),
                home: deck ? 0 : fwd ? cabin.FWD_GALLEY_X : cabin.AFT_GALLEY_X,
                task: "service",
                busy: 0,
                halon: c.id === "fa1" ? 1 : (c.id === "purser" ? 1 : 0),  // two BCF bottles on board
                hood: 1,
                hasSeenIt: false,
                obliging: 0,        // how many times you have got this one to do something
                refusals: 0,
                askedThisPhase: false,
                // The twelve points either way that every ask used to roll, decided at boarding.
                mood: PRS.state.dice(S, "mood:" + c.id).range(-12, 12),
            };
        });
        S.crewPhase = 0;
        S.crewPhaseAt = 0;
        return S.crew;
    }

    function byId(S, id) {
        for (const c of S.crew) if (c.id === id) return c;
        return null;
    }

    /** The crew who are actually in the cabin: the only ones you can walk up to. */
    function inCabin(S) {
        return S.crew.filter((c) => !c.deck);
    }

    function nearest(S, x, y) {
        let best = null, bestD = 1e9;
        for (const c of inCabin(S)) {
            const d = Math.abs(c.x - x) + Math.abs(c.y - y);
            if (d < bestD) { bestD = d; best = c; }
        }
        return best;
    }

    function adjacentCrew(S) {
        const out = [];
        for (const c of inCabin(S)) {
            if (Math.abs(c.x - S.player.x) <= 1 && Math.abs(c.y - S.player.y) <= 1) out.push(c);
        }
        return out;
    }

    /** Force the procedure forward. Actions call this; it never goes backwards. */
    function setPhase(S, phase) {
        if (phase <= S.crewPhase) return false;
        S.crewPhase = phase;
        S.crewPhaseAt = S.clock.elapsed;
        for (const c of S.crew) c.askedThisPhase = false;
        const p = PHASES[phase];
        PRS.state.log(S, T("CABIN CREW — {phase}. {what}",
                           { phase: T(p.name).toUpperCase(), what: T(p.desc) }), "crew");
        onPhaseEnter(S, phase);
        return true;
    }

    function onPhaseEnter(S, phase) {
        const log = PRS.state.log;
        // Phases 2, 3 and 5 are three people doing three things, and an aeroplane without them
        // does not reach those phases at all. The guard is belt and braces: `path` already
        // leaves them out.
        if (phase === 2) {
            S.cabinFlags.cartOut = false;
            delete S.cabinFlags.aisleBlocked[S.cabinFlags.cartX];
            log(S, T("The trolley goes away. The aisle is yours."), "good");
        }
        if (phase === 3) {
            log(S, T("“BCF! BCF, aft galley, now!” Somebody is finally running."), "crew");
            PRS.audio.play("chime");
        }
        if (phase === 4) {
            S.cabinFlags.paLive = true;
            S.clock.descentCalled = true;
            log(S, T("PA: “Ladies and gentlemen, this is the flight deck. We have a situation " +
                     "in the cabin and we are going down early. Cabin crew, stations.”"), "pa");
            PRS.audio.play("pa");
            // An emergency descent is faster. Faster is not the same as better.
            const cut = Math.max(0, Math.min(S.clock.remaining - 300, 95));
            if (cut > 0) {
                S.clock.remaining -= cut;
                S.clock.total -= cut;
                log(S, T("The nose drops. You have just lost {n} seconds and gained a runway.",
                         { n: Math.round(cut) }), "bad");
            }
            S.cabinAwareness = Math.max(S.cabinAwareness, 68);
        }
        if (phase === 5) {
            log(S, T("PA: “CABIN CREW, TAKE YOUR STATIONS. BRACE ON MY COMMAND.”"), "pa");
            log(S, T("The crew begin putting people back into their seats. Including yours."),
                "bad");
        }
    }

    /**
     * How the procedure decides to move on. Credibility is the fast lever; the evidence is the
     * slow one that arrives whether you do anything or not, by which time it is too late.
     */
    // How long each step of the procedure takes before the next one can begin: walking the
    // cabin, finding the locker, getting the bottle, getting an answer out of the flight deck.
    const DWELL = [55, 70, 50, 40, 9999];

    function checkPhase(S) {
        const f = S.fire;
        const smoke = PRS.fire.totalSmoke(f);
        const worst = PRS.fire.worst(f);
        const cred = S.credibility;

        // Secure-cabin is on the clock and not on the evidence, so it jumps the queue - on an
        // aeroplane that has anybody to secure it. CL 2231 never reaches phase 5, so nothing
        // ever puts your carries back in their seats there, and nothing ever will.
        const runs5 = path(S).indexOf(5) >= 0;
        if (runs5 && S.crewPhase < 5 && S.clock.remaining < 190) {
            setPhase(S, 5);
            return;
        }
        if (S.crewPhase >= 5) return;
        // One step at a time, and never before the last one has had time to happen. The crew
        // cannot be fighting a fire they have not yet walked to.
        if (S.clock.elapsed - S.crewPhaseAt < DWELL[S.crewPhase]) return;

        const next = nextPhase(S);
        if (next === null) return;
        const ready = [
            cred >= 14 || smoke > 1.6,
            cred >= 34 || smoke > 5 || S.cabinFlags.detectorSounded || worst > 24,
            cred >= 55 || worst > 34 || smoke > 11,
            cred >= 74 || worst > 55 || smoke > 18 || S.cabinFlags.masksDropped,
        ][GATE[next]];
        if (!ready) return;
        setPhase(S, next);
    }

    /** One crew member walks one step toward a target tile. Crew are not fast either. */
    function stepToward(c, tx, ty, dt) {
        const budget = dt * 0.8;
        let moved = 0;
        while (moved < budget && (c.x !== tx || c.y !== ty)) {
            if (c.x !== tx) c.x += c.x < tx ? 1 : -1;
            else if (c.y !== ty) c.y += c.y < ty ? 1 : -1;
            moved += 1.1;
        }
    }

    function advance(S, dt) {
        checkPhase(S);
        const f = S.fire;
        const core = f.core;

        for (const c of S.crew) {
            // Two pilots, a locked door, and an aeroplane to fly. They do not come out.
            if (c.deck) continue;
            if (c.busy > 0) { c.busy = Math.max(0, c.busy - dt); continue; }

            if (S.crewPhase <= 1) {
                // Service. The trolley creeps aft one row at a time and blocks the aisle.
                if (c.id === "fa1" && S.cabinFlags.cartOut) {
                    c.busy = 22;
                    const next = S.cabinFlags.cartX - 1;
                    // A trolley does not walk through you. If you are standing in the aisle
                    // where the next row is, it waits there until you are not: without this the
                    // cart moves onto your square and you are drawn standing on top of it.
                    const inTheWay = S.player.y === cabin.AISLE_Y && S.player.x === next;
                    if (cabin.rowAt(next) !== null && !inTheWay) {
                        delete S.cabinFlags.aisleBlocked[S.cabinFlags.cartX];
                        S.cabinFlags.cartX = next;
                        S.cabinFlags.aisleBlocked[next] = 9999;
                        // Behind it, pushing, where you can see her. Not on the same square.
                        c.x = next + 1;
                    }
                }
                continue;
            }

            if (S.crewPhase === 2) {
                stepToward(c, core.x, cabin.AISLE_Y, dt);
                if (Math.abs(c.x - core.x) <= 1 && !c.hasSeenIt) {
                    c.hasSeenIt = true;
                    c.busy = 14;
                    PRS.state.log(S, T("“{who} has eyes on it. It's in the bin. It's in the " +
                                       "bin, it's not the oven.”",
                                       { who: c.name.split(" ")[0] }), "crew");
                    S.credibility = Math.min(100, S.credibility + 22);
                }
                continue;
            }

            if (S.crewPhase >= 3 && S.crewPhase < 5) {
                if (c.halon > 0) {
                    // The bottle goes on the biggest flame this crew member can see, which is
                    // never the cell, because the cell is inside a case inside a bin.
                    const target = biggestVisible(S, c);
                    if (target) {
                        stepToward(c, target.x, cabin.AISLE_Y, dt);
                        if (Math.abs(c.x - target.x) <= 1) {
                            c.halon--;
                            c.busy = 30;
                            PRS.fire.apply(f, target.x, target.y, "halon", 1.0, 0.5);
                            PRS.audio.play("halon");
                            PRS.state.log(S, T("“STAND BACK!” {who} empties a halon bottle " +
                                "into row {row}. The flame goes out like a light. The bin keeps " +
                                "ticking.",
                                { who: c.name, row: cabin.rowAt(target.x) || "?" }), "crew");
                        }
                    }
                } else {
                    // No bottle left. They do the other thing in the manual: move people forward.
                    doCrewCarry(S, c, dt);
                }
                continue;
            }

            if (S.crewPhase >= 5) {
                // Secure the cabin. They will physically undo your work, politely.
                stepToward(c, c.home, cabin.AISLE_Y, dt);
                if (PRS.state.hazard(S, c, "sit", dt / 60)) {
                    const victim = pickStander(S, c);
                    if (victim) {
                        victim.state = "seated";
                        victim.belted = true;
                        victim.x = victim.homeX; victim.y = victim.homeY;
                        PRS.state.reindex(S);
                        PRS.state.log(S, T("“Sit down, please. Sit DOWN.” {who} is put back " +
                                           "into {seat}.",
                                           { who: victim.name, seat: victim.seat }), "bad");
                    }
                }
                continue;
            }
        }
    }

    function biggestVisible(S, c) {
        const f = S.fire;
        let best = null, bestV = 18;
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 1; y < cabin.H - 1; y++) {
                const v = f.intensity[cabin.idx(x, y)];
                if (v > bestV) { bestV = v; best = { x: x, y: y, v: v }; }
            }
        }
        return best;
    }

    function pickStander(S, c) {
        const options = S.pax.filter((p) => (p.state === "standing" || p.state === "aisle") &&
                                            !p.helper);
        if (!options.length) return null;
        return PRS.state.dice(S, "sit:pick:" + c.id + ":" + c.sitN).pick(options);
    }

    function doCrewCarry(S, c, dt) {
        // A crew member without a bottle is worth more than one with. They will not work this
        // out, and they have a cabin to secure, so this happens rarely and it happens slowly.
        if (c.id === "purser" || S.crewPhase < 4) return;
        if ((S.stats.crewSaves || 0) >= 4) return;
        const candidates = S.pax.filter((p) => p.state === "down" && !p.carriedBy &&
                                               !cabin.byTheDoors(p.x));
        if (!candidates.length) return;
        let best = candidates[0], bestD = 1e9;
        for (const p of candidates) {
            const d = Math.abs(p.x - c.x) + Math.abs(p.y - c.y);
            if (d < bestD) { bestD = d; best = p; }
        }
        stepToward(c, best.x, best.y, dt);
        if (Math.abs(c.x - best.x) <= 1 && Math.abs(c.y - best.y) <= 1) {
            c.busy = 96;
            S.stats.crewSaves = (S.stats.crewSaves || 0) + 1;
            const r = PRS.pax.refuge(S, c.home);
            PRS.pax.shelter(S, best, r ? r.x : c.home, r ? r.y : cabin.AISLE_Y);
            PRS.state.reindex(S);
            PRS.state.log(S, T("{who} carries {whom} forward. That is one you did not have " +
                               "to do.", { who: c.name, whom: best.name }), "good");
        }
    }

    /** What this crew member will say to you right now, which is mostly "sit down". */
    function response(S, c) {
        if (S.crewPhase === 0) {
            return T("“Sir. Madam. Please take your seat, we're still serving.”");
        }
        if (S.crewPhase === 1) return T("“We know about the smell. It's being looked at.”");
        if (S.crewPhase === 2) return T("“I am looking at it right now. Please sit down.”");
        if (S.crewPhase === 3) return T("“It's under control. Sit down. SIT DOWN.”");
        if (S.crewPhase === 4) return T("“We're going down. Get in a seat, any seat.”");
        return T("“BRACE POSITION. NOW. IN A SEAT. NOW.”");
    }

    PRS.crew = { PHASES, PATHS, path, model, inCabin,
                 create, byId, nearest, adjacentCrew, setPhase, checkPhase, advance,
                 response };
})(window);
