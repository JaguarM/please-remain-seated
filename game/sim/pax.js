// Sixty-one people, and what they do while you are busy.
//
// The important thing about this file is the helpers. You can carry about one passenger a minute
// and there are sixty of them, so on your own the ceiling is thirteen or fourteen people and no
// amount of clever play moves it. A recruited helper carries at about two thirds your rate and
// keeps doing it for the rest of the flight without being told, so the fourth helper you recruit
// is worth more than every bottle of water in the aeroplane.
//
// The game never says this. It is in the numbers, and the numbers are in `helperTick`.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const { clamp, clamp01 } = PRS.util;

    const DOWN_AT = 52;      // smoke dose at which a person stops being able to help themselves
    const CRITICAL_AT = 96;  // and at which the report starts using a different word

    function isChild(p) { return p.traits.indexOf("child") >= 0 || p.traits.indexOf("infant") >= 0; }
    function isPet(p) { return p.traits.indexOf("pet") >= 0; }
    function canWalk(p) {
        return p.traits.indexOf("immobile") < 0 && p.traits.indexOf("infant") < 0 &&
               p.state !== "down" && p.state !== "dead";
    }
    function needsCarrying(p) {
        return !canWalk(p) || p.state === "down" || p.traits.indexOf("elderly") >= 0;
    }

    function displayState(p) {
        switch (p.state) {
            case "asleep": return "asleep";
            case "seated": return "seated";
            case "standing": return "standing";
            case "aisle": return "in the aisle";
            case "carried": return "in your arms";
            case "helping": return "helping";
            case "secured": return "secured";
            case "down": return "unconscious";
            case "dead": return "not moving";
            default: return p.state;
        }
    }

    /** The one number the triage perk shows and everybody else has to guess at. */
    function condition(p) {
        if (p.state === "dead") return { label: "gone", tier: 5 };
        const d = p.smokeDose + p.burns * 1.6;
        if (d > 80) return { label: "critical", tier: 4 };
        if (d > DOWN_AT) return { label: "unconscious", tier: 3 };
        if (d > 30) return { label: "in a bad way", tier: 2 };
        if (d > 12) return { label: "coughing", tier: 1 };
        return { label: "fine", tier: 0 };
    }

    /** Seconds for the player to pick this person up and put them down again, before distance. */
    function carryOverhead(S, p) {
        const d = S.derived;
        let base = 6 + p.kg * 0.11;
        if (p.state === "down") base += 5;                       // dead weight
        if (p.traits.indexOf("large") >= 0) base += 6;
        if (p.traits.indexOf("hostile") >= 0 && p.trust < 30) base += 8;
        if (isChild(p) || isPet(p)) base *= 0.55;
        if (p.belted) base += PRS.state.inventoryHas(S, "cut") ? 2 : 6;
        return base * d.carryMul;
    }

    /** Can the player physically pick this person up at all. */
    function canCarry(S, p) {
        const st = PRS.state;
        if (p.state === "secured" || p.state === "dead") return false;
        if (S.player.carrying.length >= S.derived.maxCarry) return false;
        if (st.hasPerk(S, "small")) return isChild(p) || isPet(p);
        if (st.hasPerk(S, "brute")) return true;
        if (p.kg > S.derived.carryCap) return false;
        if (S.character.id === "miriam" && !isChild(p) && !isPet(p)) return false;
        return true;
    }

    function refusalFor(S, p) {
        const st = PRS.state;
        if (p.state === "secured") return p.name + " is already forward and out of this.";
        if (p.state === "dead") return "No.";
        if (S.player.carrying.length >= S.derived.maxCarry) {
            return "Your arms are full. Put somebody down first.";
        }
        if (st.hasPerk(S, "small")) {
            return "You are eight years old and " + p.name + " is an adult. It is not going to work.";
        }
        if (S.character.id === "miriam" && !isChild(p) && !isPet(p)) {
            return "You are four foot eleven. You cannot lift " + p.name + ". You can talk to them.";
        }
        if (p.kg > S.derived.carryCap) {
            return p.name + " weighs " + p.kg + " kilos and you are not going to lift that. " +
                   "Somebody else might.";
        }
        return "Not right now.";
    }

    // ------------------------------------------------------------------------------ advance ---

    function advance(S, dt) {
        const f = S.fire;
        let awarenessSum = 0, panicSum = 0, alive = 0;
        const smokeMean = PRS.fire.totalSmoke(f);

        for (const p of S.pax) {
            if (p.state === "dead" || p.state === "gone") continue;
            alive++;

            const i = cabin.idx(p.x, p.y);
            const smoke = f.smoke[i];
            const inten = f.intensity[i];
            const heat = f.heat[i];

            // ---- what the smoke does, which is the thing that actually kills people ----------
            if (p.state !== "secured") {
                const maskFactor = p.masked ? 0.16 : 1;
                const lowFactor = (p.state === "down" || p.braced) ? 0.72 : 1;  // smoke is high up
                p.smokeDose += smoke * dt * 0.0031 * maskFactor * lowFactor;
            } else {
                // Forward, low, by a door, next to the crew. Not nothing, but much less.
                p.smokeDose += smokeMean * dt * 0.0012 * (p.masked ? 0.2 : 1);
            }
            if (inten > 18) p.burns += (inten - 18) * dt * 0.0012;
            if (heat > 40) p.burns += (heat - 40) * dt * 0.0009;

            if (p.state !== "down" && p.state !== "secured" && p.smokeDose > DOWN_AT) {
                p.state = "down";
                p.downAt = S.clock.elapsed;
                p.helper = false;
                PRS.state.log(S, p.name + " (" + p.seat + ") stops coughing and goes quiet.", "bad");
                PRS.audio.play("bad");
            }
            if (p.smokeDose > CRITICAL_AT && p.state !== "secured" && !p.critical) {
                p.critical = true;
                PRS.state.note(S, p.name + " was unconscious in heavy smoke for an extended period.");
            }

            // ---- noticing ---------------------------------------------------------------------
            let wake = smoke * 0.09 + (inten > 3 ? 6 : 0) + S.cabinAwareness * 0.010;
            if (S.cabinFlags.detectorSounded) wake += 3.0;
            if (S.cabinFlags.masksDropped) wake += 5.0;
            if (S.crewPhase >= 3) wake += 1.6;
            if (S.crewPhase >= 4) wake += 3.2;
            if (p.traits.indexOf("headphones") >= 0) wake *= 0.25;
            if (p.state === "asleep") wake *= 0.45;
            p.awareness = clamp(p.awareness + wake * dt * 0.09, 0, 100);

            if (p.state === "asleep" && p.awareness > 34) {
                p.state = "seated";
                p.lastLine = p.refuse;
                PRS.state.log(S, p.name + " wakes up in " + p.seat + " and does not understand " +
                                 "anything they can see.", "plain");
            }

            // ---- panic ------------------------------------------------------------------------
            let fear = p.awareness * 0.028 + smoke * 0.05 + S.cabinPanic * 0.020;
            if (p.traits.indexOf("nervous") >= 0) fear *= 1.9;
            if (p.traits.indexOf("sceptic") >= 0) fear *= 0.55;
            if (p.traits.indexOf("drunk") >= 0) fear *= 0.4;
            if (p.trust > 40) fear *= 0.7;
            if (p.state === "secured") fear *= 0.5;
            if (PRS.state.hasPerk(S, "calm_presence") &&
                Math.abs(p.x - S.player.x) <= 2) fear *= 0.45;
            p.panic = clamp(p.panic + fear * dt * 0.1, 0, 100);

            // ---- standing up, and getting in the way -----------------------------------------
            if (p.helper) { helperTick(S, p, dt); }
            else if (p.state === "seated" && p.panic > 58 && p.awareness > 45) {
                if (S.rng.chance(clamp01(dt * 0.045))) {
                    p.state = "standing";
                    p.belted = false;
                }
            } else if (p.state === "standing" && p.panic > 74) {
                if (S.rng.chance(clamp01(dt * 0.05)) && S.crewPhase < 5) {
                    // Into the aisle, facing the wrong way, with a bag.
                    p.state = "aisle";
                    p.x = p.homeX; p.y = cabin.AISLE_Y;
                    const key = p.x;
                    S.cabinFlags.aisleBlocked[key] = (S.cabinFlags.aisleBlocked[key] || 0) + 26;
                    PRS.state.log(S, p.name + " gets into the aisle at row " + p.row +
                                     " with a wheelie bag and stops.", "bad");
                }
            } else if (p.state === "aisle" && p.panic > 86 && S.rng.chance(clamp01(dt * 0.02))) {
                // Toward the front. Everyone toward the front. This is how aisles jam.
                const nx = Math.max(cabin.FWD_CROSS_X, p.x - 1);
                if (nx !== p.x) {
                    p.x = nx;
                    S.cabinFlags.aisleBlocked[nx] = (S.cabinFlags.aisleBlocked[nx] || 0) + 20;
                }
            }

            awarenessSum += p.awareness;
            panicSum += p.panic;
        }

        // The cabin as one animal.
        if (alive) {
            const meanAware = awarenessSum / alive;
            const meanPanic = panicSum / alive;
            S.cabinAwareness = clamp(S.cabinAwareness * 0.86 + meanAware * 0.14, 0, 100);
            S.cabinPanic = clamp(S.cabinPanic * 0.88 + meanPanic * 0.12, 0, 100);
        }

        // Aisle blockages clear as people give up and sit down again, mostly.
        for (const key in S.cabinFlags.aisleBlocked) {
            if (S.cabinFlags.aisleBlocked[key] >= 9999) continue;
            S.cabinFlags.aisleBlocked[key] -= dt;
            if (S.cabinFlags.aisleBlocked[key] <= 0) delete S.cabinFlags.aisleBlocked[key];
        }

        PRS.state.reindex(S);
    }

    // ------------------------------------------------------------------------------ helpers ---

    /**
     * A recruited passenger, working. Two phases and a timer, because a helper who pathfinds is a
     * helper who gets stuck behind the trolley and stops being funny.
     */
    function helperTick(S, p, dt) {
        if (p.state === "down" || p.state === "dead") { p.helper = false; return; }
        p.state = "helping";
        spreadHelping(S, p, dt);
        p.taskLeft = (p.taskLeft || 0) - dt;
        if (p.taskLeft > 0) return;

        if (p.helperPhase === "carry" && p.helperTarget) {
            const t = PRS.state.paxById(S, p.helperTarget);
            if (t && t.state !== "secured" && t.state !== "dead") {
                t.state = "secured";
                t.securedAt = S.clock.elapsed;
                t.carriedBy = p.id;
                const zoneX = nearestSafeX(t.x);
                t.x = zoneX; t.y = cabin.AISLE_Y;
                p.x = zoneX; p.y = cabin.AISLE_Y;
                S.stats.helperSaves = (S.stats.helperSaves || 0) + 1;
                PRS.state.log(S, p.name + " gets " + t.name + " to " +
                    cabin.safeZoneName(zoneX) + ". You did not have to be there.", "good");
                PRS.audio.play("secure");
            }
            p.helperTarget = null;
            p.helperPhase = "seek";
            p.taskLeft = 4;
            PRS.state.reindex(S);
            return;
        }

        // Find somebody. Nearest first, unconscious before conscious, children before adults.
        let best = null, bestScore = -1e9;
        for (const t of S.pax) {
            if (t === p || t.helper) continue;
            if (t.state === "secured" || t.state === "dead" || t.state === "carried") continue;
            if (t.claimedBy && t.claimedBy !== p.id) continue;
            const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
            let score = 60 - d * 2.2;
            if (t.state === "down") score += 28;
            if (isChild(t)) score += 16;
            if (t.traits.indexOf("immobile") >= 0) score += 22;
            if (t.traits.indexOf("elderly") >= 0) score += 12;
            if (t.kg > 90) score -= 14;
            score += S.fire.smoke[cabin.idx(t.x, t.y)] * 0.25;
            if (score > bestScore) { bestScore = score; best = t; }
        }
        if (!best) { p.taskLeft = 10; return; }

        best.claimedBy = p.id;
        p.helperTarget = best.id;
        p.helperPhase = "carry";
        // Reach them, get them out of the seat, and carry them forward. Slower than you,
        // and slower again in smoke, because they have no idea what they are doing.
        const dist = Math.abs(best.x - p.x) + Math.abs(best.y - p.y) +
                     Math.abs(best.x - nearestSafeX(best.x));
        const fog = 1 + clamp01(S.fire.smoke[cabin.idx(best.x, best.y)] / 100) * 0.8;
        const fright = 1 + clamp01(p.panic / 100) * 0.5;
        p.taskLeft = (16 + best.kg * 0.22 + dist * 2.1) * 1.05 * fog * fright;
        p.x = best.x; p.y = best.y;
    }

    function nearestSafeX(x) {
        const options = [cabin.FWD_CROSS_X, cabin.OVERWING_X, cabin.AFT_CROSS_X];
        let best = options[0], bestD = 1e9;
        for (const o of options) {
            const d = Math.abs(o - x);
            if (d < bestD) { bestD = d; best = o; }
        }
        return best;
    }

    /**
     * A helper who has been working for a while pulls somebody else in. This is the compounding
     * that makes recruiting worth more than carrying: the fourth person you ask is not worth one
     * person, they are worth everybody that person asks. It is capped, because a cabin has a
     * finite number of people in it who are ever going to get out of their seat.
     */
    function spreadHelping(S, p, dt) {
        if (S.cabinAwareness < 30) return;
        if (helperCap(S) <= 0) return;
        // About one conversion every two minutes per helper, at full credibility, and none at all
        // while nobody believes anything is happening.
        const rate = 0.0036 * dt * clamp01(S.credibility / 70) * clamp01(S.cabinAwareness / 60);
        if (!S.rng.chance(rate)) return;
        const near = S.pax.filter((q) => !q.helper && q.state !== "down" && q.state !== "dead" &&
            q.state !== "secured" && Math.abs(q.x - p.x) <= 3 &&
            q.traits.indexOf("hostile") < 0);
        if (!near.length) return;
        const q = S.rng.pick(near);
        if (resistance(S, q) > persuasion(S, 24) + S.rng.range(-10, 20)) return;
        recruit(S, q, p.name + " asked them, which is not something you had to do.");
    }

    function helperCap(S) {
        let n = 0;
        for (const p of S.pax) if (p.helper) n++;
        return 9 - n;
    }

    /** Turn somebody into a helper. The single highest-value thing in the game. */
    function recruit(S, p, reason) {
        if (p.helper) return false;
        if (p.state === "down" || p.state === "dead") return false;
        p.helper = true;
        p.helperPhase = "seek";
        p.taskLeft = 3;
        p.state = "helping";
        p.trust = Math.min(100, p.trust + 40);
        p.belted = false;
        S.stats.helpersRecruited++;
        PRS.state.log(S, p.name + " is helping. " + (reason || ""), "great");
        PRS.state.note(S, p.name + " (" + p.seat + ") assisted with the evacuation of the cabin.");
        PRS.audio.play("good");
        return true;
    }

    /** How hard this person is to talk into anything, 0..100 needed against your persuasion. */
    function resistance(S, p) {
        let r = 46;
        if (p.traits.indexOf("sceptic") >= 0) r += 30;
        if (p.traits.indexOf("hostile") >= 0) r += 26;
        if (p.traits.indexOf("helpful") >= 0) r -= 34;
        if (p.traits.indexOf("drunk") >= 0) r += 16;
        if (p.traits.indexOf("medical") >= 0) r -= 12;
        if (p.traits.indexOf("crew") >= 0) r -= 18;
        if (p.traits.indexOf("headphones") >= 0) r += 40;
        if (p.state === "asleep") r += 55;
        r -= p.trust * 0.55;
        r -= p.awareness * 0.30;
        r -= S.credibility * 0.38;
        r -= p.spokenTo * 4;
        if (p.panic > 70) r += 18;              // too frightened to hear you
        if (p.panic > 30 && p.panic < 65) r -= 10;  // frightened enough to want a plan
        return clamp(r, 2, 140);
    }

    /** Your side of the same roll. */
    function persuasion(S, extra) {
        const st = PRS.state;
        let v = 32 * S.derived.voiceMul;
        v += S.credibility * 0.45;
        if (st.wearing(S, "hivis")) v += 12;
        if (st.wearing(S, "lanyard")) v += 9;
        if (st.slotOf(S, "clipboard")) v += 7;
        if (st.hasPerk(S, "authority")) v += 22;
        if (st.hasPerk(S, "respected")) v += 20;
        if (st.hasPerk(S, "flock")) v += 14;
        if (st.hasPerk(S, "invisible")) v -= 18;
        if (S.player.panic > 80) v -= 14;
        if (S.player.burns > 20) v += 8;         // a burn on your hand is an argument
        return v + (extra || 0);
    }

    /** The roll itself. Returns { ok, margin }. */
    function convince(S, p, extra) {
        const need = resistance(S, p);
        const got = persuasion(S, extra) + S.rng.range(-14, 14);
        p.spokenTo++;
        p.trust = clamp(p.trust + (got - need) * 0.20, -60, 100);
        return { ok: got >= need, margin: got - need, need: need, got: got };
    }

    function speak(S, p) {
        const data = PRS.data.passengers;
        if (p.state === "down") return "(" + p.name + " does not answer.)";
        if (p.smokeDose > 34 || S.cabinAwareness > 70) return S.rng.pick(data.LATE);
        if (p.spokenTo === 0) return p.says;
        return S.rng.pick(data.AMBIENT);
    }

    PRS.pax = {
        DOWN_AT, CRITICAL_AT, isChild, isPet, canWalk, needsCarrying, displayState, condition,
        carryOverhead, canCarry, refusalFor, advance, recruit, resistance, persuasion, convince,
        speak, nearestSafeX,
    };
})(window);
