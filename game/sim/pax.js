// Sixty-one people, and what they do while you are busy.
//
// The important thing about this file is the helpers. You can move about one passenger a minute
// and there are sixty of them, so on your own the ceiling is thirteen or fourteen people and no
// amount of clever play moves it. A recruited helper moves people at about two thirds your rate
// and keeps doing it for the rest of the flight without being told, so the fourth helper you
// recruit is worth more than every bottle of water in the aeroplane.
//
// There is no safe zone. Nobody is "secured": a person is wherever they are when the doors open,
// and what happens to them is the smoke they have already breathed, the air in the place they
// are lying in, how low they are and how far the door is. `exposure()` is that sum, worked out
// the way scoring.js works it out at touchdown, and it is what a helper reads to decide who needs
// moving and where to. The game never says any of this out loud. It is in the numbers.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;
    const cabin = PRS.cabin;
    const { clamp, clamp01 } = PRS.util;

    const DOWN_AT = 52;      // smoke dose at which a person stops being able to help themselves
    const GRAB_AT = 50;      // how fed up somebody has to be before they put a hand on your arm
    const MOVE_WORTH = 6;    // how much better off somebody has to be before a helper bothers

    function isChild(p) { return p.traits.indexOf("child") >= 0 || p.traits.indexOf("infant") >= 0; }
    function isPet(p) { return p.traits.indexOf("pet") >= 0; }
    function canWalk(p) {
        // A dog in a carrier is luggage that breathes. Bruno goes where he is carried and
        // nowhere else, the same as the infant, so nothing may ask him to walk to a door.
        return p.traits.indexOf("immobile") < 0 && p.traits.indexOf("infant") < 0 &&
               p.traits.indexOf("pet") < 0 &&
               p.state !== "down" && p.state !== "dead";
    }
    function needsCarrying(p) {
        return !canWalk(p) || p.state === "down" || p.traits.indexOf("elderly") >= 0;
    }

    /**
     * What "no longer held" means for this person. Somebody put down away from their seat is on
     * the floor; somebody who never left it is on their feet, or not.
     */
    function looseState(p) {
        if (p.moved) return "sheltering";
        return canStandUp(p) ? "standing" : "seated";
    }

    /** Anybody who could physically get up and block the aisle. Not the dog. */
    function canStandUp(p) {
        return p.traits.indexOf("pet") < 0 && p.traits.indexOf("infant") < 0 &&
               p.traits.indexOf("immobile") < 0;
    }

    /** Anybody who could be asked to carry other people: an adult, upright, not already doing it. */
    function canHelp(p) {
        return canStandUp(p) && !isChild(p) && !p.helper &&
               p.state !== "down" && p.state !== "dead" && p.state !== "carried";
    }

    /**
     * Their eyes open. `asleep` is a trait because it is how somebody boarded, but the card
     * reads the trait list as well as the state, and a woman you have just shaken awake should
     * not still be described as asleep. So waking spends the trait: it has done its job.
     */
    function wakeUp(p) {
        p.state = "seated";
        if (p.traits.indexOf("asleep") >= 0) {
            p.traits = p.traits.filter((t) => t !== "asleep");
        }
    }

    function displayState(p) {
        switch (p.state) {
            case "asleep": return T("asleep");
            case "seated": return T("seated");
            case "standing": return T("standing");
            case "aisle": return T("in the aisle");
            case "carried": return T("in your arms");
            case "helping": return T("helping");
            case "sheltering": return T("on the floor, out of the seats");
            case "down": return T("unconscious");
            case "dead": return T("not moving");
            default: return p.state;
        }
    }

    // -------------------------------------------------------------------- what they look like ---
    //
    // Not drawing - the drawing is in render.js - but the two questions the drawing asks, kept
    // here because they are questions about a person rather than about a canvas. `tools/dump_frame.js`
    // asks them too, and writes the answers into the frame, so the browser and the PNG renderer
    // cannot end up with different opinions about who is frightened.

    /**
     * Which face somebody is wearing. There is no panic meter for the cabin, on purpose: this is
     * it. A calm aeroplane is pale and a frightened one is not, and the change runs across sixty
     * people at once, three rows at a time, ahead of the smoke.
     */
    function face(p) {
        if (isPet(p)) return "pet_carrier";
        // Crossed eyes are the report's face and nobody wears it in the air: the flight does not
        // know who it has lost, so somebody who has stopped moving is drawn slumped and alive.
        if (p.state === "dead") return isChild(p) ? "child_gone" : "pax_gone";
        if (p.state === "down") return "pax_down";
        if (p.state === "carried") return "pax_low";
        // A helper has hold of them: out of the seat and on the way to the floor by a door, and
        // drawn low like anybody in somebody's arms, so a helper at work is a thing you can see.
        if (p.claimedBy) return "pax_low";
        const base = isChild(p) ? "child" : "pax";
        if (p.state === "asleep") return base + "_asleep";
        const fear = p.panic + p.smokeDose * 0.55;
        if (fear > 62) return base + "_afraid";
        if (fear > 27) return base + "_worried";
        if (p.state === "sheltering" || p.helper) return base + "_relieved";
        return base;
    }

    /**
     * The eight colours somebody is drawn with, from the three that are theirs.
     *
     * Hair, skin and shirt are chosen; the other five are worked out. `g` is the hair down the
     * sides of the head, which is the hair colour on somebody with long hair and the skin colour
     * on somebody without, and the eyes and the mouth are the skin with the light taken out of
     * them, so that the palest face on board and the darkest both have eyes in them and neither
     * is a smudge.
     */
    const palettes = new Map();
    function palette(who, ashen) {
        // A dog in a carrier has hair, skin and a shirt on the roster because every row of the
        // roster does, and painting a plastic case with them turned a blue box with a green dog
        // behind the grille into a flat tan crate. Nothing overrides the carrier: null means
        // "the colours the art was drawn in", which every blitter here already understands.
        if (who.traits && who.traits.indexOf("pet") >= 0) return null;
        const key = who.hair + who.skin + who.shirt + (who.longHair ? "|L" : "") + (ashen ? "|A" : "");
        let pal = palettes.get(key);
        if (pal) return pal;
        const shade = PRS.util.shade;
        pal = {
            h: who.hair, s: who.skin, c: who.shirt,
            g: who.longHair ? who.hair : who.skin,
            e: shade(who.skin, 0.30),      // eyes
            b: shade(who.skin, 0.46),      // brow
            m: shade(who.skin, 0.40),      // mouth
            l: shade(who.skin, 0.72),      // eyelids, which are skin with the light off
        };
        // The colour somebody goes when the report stops using their name.
        if (ashen) for (const k in pal) pal[k] = shade(pal[k], 0.62);
        palettes.set(key, pal);
        return pal;
    }

    /** The one number the triage perk shows and everybody else has to guess at. */
    function condition(p) {
        if (p.state === "dead") return { label: K("gone"), tier: 5 };
        const d = p.smokeDose + p.burns * 1.6;
        if (d > 80) return { label: K("critical"), tier: 4 };
        if (d > DOWN_AT) return { label: K("unconscious"), tier: 3 };
        if (d > 30) return { label: K("in a bad way"), tier: 2 };
        if (d > 12) return { label: K("coughing"), tier: 1 };
        return { label: K("fine"), tier: 0 };
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
        if (p.state === "dead") return false;
        if (S.player.carrying.length >= S.derived.maxCarry) return false;
        return p.kg <= S.derived.carryCap;
    }

    // ---------------------------------------------------------------------------- where to be ---

    /**
     * What getting out costs somebody in column x once the doors open: the aisle between them and
     * the nearer end door, and whatever smoke and fire is on it. Moving somebody shortens it, and
     * holding the fire down keeps it walkable.
     */
    function evacuation(S, x) {
        const f = S.fire;
        let best = Infinity;
        for (const doorX of [cabin.FWD_CROSS_X, cabin.AFT_CROSS_X]) {
            const step = doorX < x ? -1 : 1;
            let cost = 0;
            for (let cx = x; cx !== doorX; cx += step) {
                const i = cabin.idx(cx, cabin.AISLE_Y);
                cost += 1.0 + f.smoke[i] * 0.08 + f.intensity[i] * 0.5;
            }
            if (cost < best) best = cost;
        }
        return best;
    }

    /**
     * How bad a place is to be left in, on the scale scoring.js uses at touchdown: the air in it
     * now, the way out from it, and how close it is to the seat of the fire - closer still if it
     * is downwind, because the packs push the smoke aft. It does not know the future, and neither
     * does anybody choosing where to put somebody down.
     */
    function exposure(S, x, y) {
        return spot(S, x, y) + evacuation(S, x);
    }

    /** The half of exposure() that belongs to the tile itself rather than to the way out. */
    function spot(S, x, y) {
        const f = S.fire;
        const i = cabin.idx(x, y);
        const c = f.core;
        const gap = Math.abs(x - c.x) + Math.abs(y - c.y) * 0.5;
        return f.smoke[i] * 0.7 + f.intensity[i] * 0.42 +
               Math.max(0, 8 - gap) * 2.5 + (x > c.x ? Math.max(0, 14 - gap) * 1.5 : 0);
    }

    /**
     * The best bit of floor by a door to put somebody down on, from where they are: the least
     * exposed, and not the far end of the aeroplane if the near end will do, and not on top of
     * somebody else if there is floor next to them. The ends are only candidates. Nothing about
     * them is safe except what exposure() says.
     */
    function refuge(S, fromX) {
        let best = null, bestScore = Infinity;
        for (const x of cabin.DOOR_ENDS) {
            // The way out is the same for every tile in a column, so it is worked out once.
            const out = evacuation(S, x) + Math.abs(x - fromX) * 0.35;
            for (let y = 1; y < cabin.H - 1; y++) {
                if (cabin.solid(x, y)) continue;
                const score = spot(S, x, y) + out + PRS.state.paxAt(S, x, y).length;
                if (score < bestScore) { bestScore = score; best = { x: x, y: y, score: score }; }
            }
        }
        return best;
    }

    /** What being where they are costs somebody on top of the air: upright, and stuck. */
    function postureCost(p) {
        let h = 0;
        if (!p.braced) h += 3;
        if (p.state === "aisle" || p.state === "standing") h += 7;
        if (p.traits.indexOf("immobile") >= 0 && !p.moved) h += 20;
        return h;
    }

    /** How much better off somebody would be on the floor by a door than where they are now. */
    function moveGain(S, p) {
        if (cabin.byTheDoors(p.x) && (p.braced || p.state === "down")) return 0;
        const r = refuge(S, p.x);
        if (!r) return 0;
        return exposure(S, p.x, p.y) + postureCost(p) - r.score;
    }

    /** Somebody put down somewhere: on the floor, low, belt off, and not getting back up. */
    function shelter(S, p, x, y) {
        p.x = x; p.y = y;
        p.belted = false;
        p.braced = true;
        p.moved = p.moved || x !== p.homeX || y !== p.homeY;
        p.state = p.smokeDose > DOWN_AT ? "down" : looseState(p);
    }

    // ------------------------------------------------------------------ being in their way ---

    /**
     * Throwing water about in a full cabin is not free. Everybody awake within arm's reach who is
     * not already working with you gets wet, or steamed, or has a blanket waved over their head,
     * and they hold it against you: less trust, more fear, and past a point, a hand on your arm.
     * `amount` is 1 for a bottle and more for the bigger things. Returns whoever just grabbed you.
     */
    function annoy(S, amount) {
        amount = amount === undefined ? 1 : amount;
        const px = S.player.x, py = S.player.y;
        let grabbed = null;
        for (const q of S.pax) {
            if (q.helper || q.state === "down" || q.state === "dead" || q.state === "carried" ||
                q.state === "asleep" || !canStandUp(q) || isChild(q)) continue;
            if (Math.abs(q.x - px) > 1 || Math.abs(q.y - py) > 2) continue;
            const was = q.annoyed || 0;
            let add = 20 * amount;
            if (q.traits.indexOf("hostile") >= 0 || q.traits.indexOf("sceptic") >= 0) add *= 1.6;
            if (q.trust > 40) add *= 0.5;
            q.annoyed = Math.min(100, was + add);
            q.trust = clamp(q.trust - 5 * amount, -60, 100);
            q.panic = Math.min(100, q.panic + 4 * amount);
            if (was < GRAB_AT && q.annoyed >= GRAB_AT && !grabbed) grabbed = q;
        }
        if (grabbed) {
            S.stats.grabbed = (S.stats.grabbed || 0) + 1;
            PRS.state.log(S, T("{who} has been soaked once too often and gets hold of your " +
                               "arm. “What is WRONG with you?” Everything you do to that fire " +
                               "is now done around them.", { who: grabbed.name }), "bad");
        }
        return grabbed;
    }

    /** Whoever within reach has had enough of you and is in the way of your hands. */
    function obstructor(S) {
        for (const q of PRS.state.reachable(S)) {
            if ((q.annoyed || 0) < GRAB_AT || q.trust >= 40 || q.helper) continue;
            if (q.state === "down" || q.state === "dead" || q.state === "carried" ||
                q.state === "asleep" || !canStandUp(q)) continue;
            return q;
        }
        return null;
    }

    // ------------------------------------------------------------------------------ advance ---

    function advance(S, dt) {
        const f = S.fire;
        let awarenessSum = 0, panicSum = 0, alive = 0;

        for (const p of S.pax) {
            if (p.state === "dead" || p.state === "gone") continue;
            alive++;

            const i = cabin.idx(p.x, p.y);
            const smoke = f.smoke[i];
            const inten = f.intensity[i];
            const heat = f.heat[i];

            // ---- what the smoke does, which is the thing that actually kills people ----------
            // The same for everybody, wherever they are. Low air is better air, and anything over
            // the face halves it.
            const maskFactor = p.masked ? 0.5 : 1;
            const lowFactor = (p.state === "down" || p.braced) ? 0.6 : 1;   // smoke is high up
            p.smokeDose += smoke * dt * 0.0031 * maskFactor * lowFactor;
            if (inten > 18) p.burns += (inten - 18) * dt * 0.0012;
            if (heat > 40) p.burns += (heat - 40) * dt * 0.0009;

            if (p.state !== "down" && p.smokeDose > DOWN_AT) {
                p.state = "down";
                p.downAt = S.clock.elapsed;
                if (p.helper) release(S, p);
                p.helper = false;
                PRS.state.log(S, p.name + " (" + p.seat + ") stops coughing and goes quiet.", "bad");
                PRS.audio.play("bad");
            }

            // Being soaked wears off, slowly. Being calmed down wears it off faster.
            if (p.annoyed) p.annoyed = Math.max(0, p.annoyed - dt * 0.10);

            // ---- noticing ---------------------------------------------------------------------
            let wake = smoke * 0.09 + (inten > 3 ? 6 : 0) + S.cabinAwareness * 0.010;
            if (S.cabinFlags.detectorSounded) wake += 3.0;
            if (S.cabinFlags.masksDropped) wake += 5.0;
            if (S.crewPhase >= 3) wake += 1.6;
            if (S.crewPhase >= 4) wake += 3.2;
            if (p.traits.indexOf("headphones") >= 0) wake *= 0.25;
            if (p.state === "asleep") wake *= 0.45;
            p.awareness = clamp(p.awareness + wake * dt * 0.09, 0, 100);

            // ---- a sceptic stops being one ----------------------------------------------------
            // A sceptic does not need persuading, a sceptic needs seeing - so the trait is not
            // a personality, it is a state, and it ends the moment they have seen it: smoke on
            // their own row, flame where they are looking, or you have simply worn them round.
            // The trait is worth thirty points of resistance, so this is also the moment asking
            // them for anything starts working, and the card must stop calling them a sceptic
            // or it is lying about why the ask is suddenly available.
            if (p.traits.indexOf("sceptic") >= 0 && p.state !== "asleep" &&
                ((p.awareness > 30 && (smoke > 30 || inten > 3)) || p.trust > 35 || p.helper)) {
                p.traits = p.traits.filter((t) => t !== "sceptic");
                PRS.state.log(S, T("{who} ({seat}) has stopped arguing about whether there " +
                                   "is a fire.", { who: p.name, seat: p.seat }), "good");
            }

            if (p.state === "asleep" && p.awareness > 34) {
                wakeUp(p);
                p.lastLine = p.refuse;
                PRS.state.log(S, T("{who} wakes up in {seat} and does not understand " +
                                   "anything they can see.",
                                   { who: p.name, seat: p.seat }), "plain");
            }

            // ---- panic ------------------------------------------------------------------------
            let fear = p.awareness * 0.028 + smoke * 0.05 + S.cabinPanic * 0.020;
            if (p.traits.indexOf("nervous") >= 0) fear *= 1.9;
            if (p.traits.indexOf("sceptic") >= 0) fear *= 0.55;
            if (p.traits.indexOf("drunk") >= 0) fear *= 0.4;
            if (p.trust > 40) fear *= 0.7;
            if (p.moved) fear *= 0.6;
            p.panic = clamp(p.panic + fear * dt * 0.1, 0, 100);

            // ---- standing up, and getting in the way -----------------------------------------
            // Somebody who has been put on the floor by a door stays on the floor by the door.
            if (p.helper) { helperTick(S, p, dt); }
            else if (p.moved) { /* staying down */ }
            else if (p.state === "seated" && p.panic > 58 && p.awareness > 45 &&
                       canStandUp(p)) {
                if (PRS.state.hazard(S, p, "stand", dt * 0.045)) {
                    p.state = "standing";
                    p.belted = false;
                }
            } else if (p.state === "standing" && p.panic > 74 && canStandUp(p)) {
                if (PRS.state.hazard(S, p, "aisle", dt * 0.05) && S.crewPhase < 5) {
                    // Into the aisle, facing the wrong way, with a bag.
                    p.state = "aisle";
                    p.x = p.homeX; p.y = cabin.AISLE_Y;
                    const key = p.x;
                    S.cabinFlags.aisleBlocked[key] = (S.cabinFlags.aisleBlocked[key] || 0) + 26;
                    PRS.state.log(S, p.name + " gets into the aisle at row " + p.row +
                                     " with a wheelie bag and stops.", "bad");
                }
            } else if (p.state === "aisle" && p.panic > 86 &&
                       PRS.state.hazard(S, p, "drift", dt * 0.02)) {
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

    /** Let go of whoever this helper was on their way to, so somebody else can go instead. */
    function release(S, p) {
        if (!p.helperTarget) return;
        const t = PRS.state.paxById(S, p.helperTarget);
        if (t && t.claimedBy === p.id) t.claimedBy = null;
        p.helperTarget = null;
    }

    /**
     * A recruited passenger, working. Two phases and a timer, because a helper who pathfinds is a
     * helper who gets stuck behind the trolley and stops being funny.
     */
    function helperTick(S, p, dt) {
        if (p.state === "down" || p.state === "dead") { release(S, p); p.helper = false; return; }
        p.state = "helping";
        spreadHelping(S, p, dt);
        p.taskLeft = (p.taskLeft || 0) - dt;
        if (p.taskLeft > 0) return;

        if (p.helperPhase === "carry" && p.helperTarget) {
            const t = PRS.state.paxById(S, p.helperTarget);
            release(S, p);
            if (t && t.state !== "dead" && t.state !== "carried" && !t.helper) {
                const r = refuge(S, t.x);
                if (r) {
                    // A recruited doctor, nurse or vet has a look at the airway on the way, which
                    // is the difference between "treated" and "serious" on the manifest.
                    const medic = p.traits.indexOf("medical") >= 0;
                    if (medic) t.smokeDose = Math.max(0, t.smokeDose - 20);
                    shelter(S, t, r.x, r.y);
                    t.carriedBy = p.id;
                    p.x = r.x; p.y = r.y;
                    S.stats.helperSaves = (S.stats.helperSaves || 0) + 1;
                    PRS.state.log(S, medic
                        ? T("{who} gets {whom} down on the floor at {where}, breathing better " +
                            "than they were.",
                            { who: p.name, whom: t.name, where: cabin.placeName(r.x, r.y) })
                        : T("{who} gets {whom} down on the floor at {where}. You did not have " +
                            "to be there.",
                            { who: p.name, whom: t.name, where: cabin.placeName(r.x, r.y) }),
                        "good");
                    PRS.audio.play("secure");
                }
            }
            p.helperPhase = "seek";
            p.taskLeft = 4;
            PRS.state.reindex(S);
            return;
        }

        // Find somebody: whoever would gain most from being moved, nearest first.
        let best = null, bestScore = -1e9;
        for (const t of S.pax) {
            if (t === p || t.helper) continue;
            if (t.state === "dead" || t.state === "carried") continue;
            if (t.claimedBy && t.claimedBy !== p.id) continue;
            const gain = moveGain(S, t);
            if (gain < MOVE_WORTH) continue;
            const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y);
            let score = gain - d * 1.2;
            if (isChild(t)) score += 8;
            if (t.kg > 90) score -= 8;
            if (score > bestScore) { bestScore = score; best = t; }
        }
        if (!best) { p.taskLeft = 10; return; }

        best.claimedBy = p.id;
        p.helperTarget = best.id;
        p.helperPhase = "carry";
        // Reach them, get them out of the seat, and carry them to a door. Slower than you, and
        // slower again in smoke, because they have no idea what they are doing.
        const r = refuge(S, best.x);
        const dist = Math.abs(best.x - p.x) + Math.abs(best.y - p.y) +
                     (r ? Math.abs(best.x - r.x) : 0);
        const fog = 1 + clamp01(S.fire.smoke[cabin.idx(best.x, best.y)] / 100) * 0.8;
        const fright = 1 + clamp01(p.panic / 100) * 0.5;
        // The aisle is fifty centimetres wide. A second pair of hands is worth almost a whole
        // extra pair; a tenth is worth rather less, because nine of them are already in it.
        const congestion = 1 + 0.08 * Math.max(0, activeHelpers(S) - 1);
        p.taskLeft = (14 + best.kg * 0.2 + dist * 2.0) * fog * fright * congestion;
        p.x = best.x; p.y = best.y;
    }

    /**
     * A helper who has been working for a while pulls somebody else in. This is the compounding
     * that makes recruiting worth more than carrying: the fourth person you ask is not worth one
     * person, they are worth everybody that person asks. It slows as the cabin fills with them,
     * because everybody left to ask has now watched somebody be asked and stayed in their seat.
     */
    function spreadHelping(S, p, dt) {
        if (S.cabinAwareness < 30) return;
        if (helperCap(S) <= 0) return;
        // About one conversion every two minutes per helper, at full credibility, and none at all
        // while nobody believes anything is happening. Slower the more of them are already up,
        // because the people left to ask are the ones who have watched somebody ask and stayed
        // in their seat.
        const rate = 0.0036 * dt * clamp01(S.credibility / 70) * clamp01(S.cabinAwareness / 60) /
                     (1 + activeHelpers(S) * 0.22);
        if (rate <= 0 || !PRS.state.hazard(S, p, "spread", rate)) return;
        const near = S.pax.filter((q) => canHelp(q) && Math.abs(q.x - p.x) <= 3 &&
            q.traits.indexOf("hostile") < 0);
        if (!near.length) return;
        const q = PRS.state.dice(S, "spread:pick:" + p.id + ":" + p.spreadN).pick(near);
        // A helper asking is a friendlier ask than yours, and it meets the same mood yours would.
        if (resistance(S, q) > persuasion(S, 24) + q.mood + 5) return;
        recruit(S, q, p.name + " asked them, which is not something you had to do.");
    }

    function activeHelpers(S) {
        let n = 0;
        for (const p of S.pax) if (p.helper) n++;
        return n;
    }

    /**
     * How many more people this cabin has in it who will ever get out of their seat. There is no
     * ceiling on helpers: the limit is the aeroplane. What stops the eighth from being as cheap
     * as the second is that the people still sitting down by then are the ones who already said
     * no, and the aisle they would be working is fuller than it was.
     */
    function helperCap(S) {
        let n = 0;
        for (const p of S.pax) if (canHelp(p)) n++;
        return n;
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
        p.annoyed = 0;
        p.belted = false;
        S.stats.helpersRecruited++;
        // Somebody getting up to help is the cabin seeing that something is worth helping with.
        S.credibility = Math.min(100, S.credibility + 3);
        PRS.state.log(S, T("{who} is helping. ", { who: p.name }) + (reason || ""), "great");
        PRS.audio.play("good");
        return true;
    }

    /**
     * Whether this person has seen the fire rather than been told about it. Shown the photograph,
     * shown the open bin - or sitting in enough of it that nobody has to show them anything.
     */
    function hasSeen(p) {
        return !!p.sawEvidence || p.awareness >= 65 || p.smokeDose > 8;
    }

    /** Mark that they have seen it. Every action that puts the fire in front of somebody calls this. */
    function saw(S, p) {
        p.sawEvidence = true;
        p.awareness = Math.min(100, p.awareness + 12);
    }

    /** How hard this person is to talk into anything, 0..100 needed against your persuasion. */
    function resistance(S, p) {
        let r = 46;
        // A sceptic is not talked round, a sceptic is shown. Until this one has seen something -
        // the photograph, the bin open, the burn on your hand, or enough smoke to have stopped
        // needing any of that - the number is out of reach of anything you can say.
        if (p.traits.indexOf("sceptic") >= 0) r += hasSeen(p) ? 12 : 58;
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
        // Being told the same thing again wears most people down, for about three conversations.
        // A sceptic is not worn down by talking at all: a sceptic needs to see it.
        r -= Math.min(p.traits.indexOf("sceptic") >= 0 ? 0 : 2, p.spokenTo) * 3;
        // Somebody you have soaked is not in a mood to do you favours.
        r += (p.annoyed || 0) * 0.3;
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
        if (S.player.burns > 20) v += 8;         // a burn on your hand is an argument
        return v + (extra || 0);
    }

    /**
     * The roll itself, except that it was rolled at boarding: the fourteen points either way are
     * the mood this person boarded in, so asking twice meets the same person twice, and what
     * moves between the two asks is trust, awareness and how often they have been asked.
     * Returns { ok, margin }.
     */
    function convince(S, p, extra) {
        const need = resistance(S, p);
        const got = persuasion(S, extra) + (p.mood || 0);
        p.spokenTo++;
        p.trust = clamp(p.trust + (got - need) * 0.20, -60, 100);
        return { ok: got >= need, margin: got - need, need: need, got: got };
    }

    /** The chance convince() comes off, over a mood you cannot see: even odds at a mood of nought. */
    function odds(S, p, extra) {
        return clamp01((persuasion(S, extra) + 14 - resistance(S, p)) / 28);
    }

    /**
     * Whether asking is worth the seconds: one chance in four, or better. A conversation that
     * is going to be refused is not offered, because a list of things people will say no to is
     * not a list of things you can do.
     */
    function worthAsking(S, p, extra) {
        return odds(S, p, extra) >= 0.25;
    }

    function speak(S, p) {
        const data = PRS.data.passengers;
        if (p.state === "down") return T("({who} does not answer.)", { who: p.name });
        if (p.smokeDose > 34 || S.cabinAwareness > 70) {
            return T(PRS.state.line(S, "late", data.LATE));
        }
        if (p.spokenTo === 0) return T(p.says);
        return T(PRS.state.line(S, "ambient", data.AMBIENT));
    }

    PRS.pax = {
        DOWN_AT, GRAB_AT, isChild, isPet, canWalk, canStandUp, canHelp, looseState, needsCarrying,
        displayState, wakeUp, condition, carryOverhead, canCarry, advance, recruit, helperCap,
        resistance, persuasion, convince, odds, worthAsking, face, palette, speak, hasSeen, saw,
        evacuation, exposure, refuge, moveGain, shelter, annoy, obstructor,
    };
})(window);
