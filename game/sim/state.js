// The world, built once at the start of a run and then only ever moved forward by actions.
//
// There is no update loop. `spend(S, seconds)` is the only thing that makes time pass, and every
// action calls it exactly once with its own cost. That is the whole game: the fire is not on a
// timer, it is on your decisions.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const { clamp, clamp01 } = PRS.util;

    const FLIGHT_SECONDS = 900;   // fifteen minutes to the runway

    function create(opts) {
        const util = PRS.util;
        const seed = opts.seed || (Date.now() >>> 0);
        const rng = util.makeRng(seed);
        const ch = PRS.data.characters.byId(opts.characterId);
        const outfit = PRS.data.outfits.byId(opts.outfitId);
        const derived = PRS.data.characters.derive(ch, outfit);

        const S = {
            seed: seed,
            rng: rng,
            character: ch,
            outfit: outfit,
            derived: derived,
            difficulty: opts.difficulty || "normal",

            clock: {
                total: FLIGHT_SECONDS,
                remaining: FLIGHT_SECONDS,
                elapsed: 0,
                landed: false,
                descentCalled: false,
                announcements: 0,
            },

            player: {
                x: cabin.xOfRow(9), y: cabin.AISLE_Y,
                seat: opts.seatOverride || "9C",
                homeX: cabin.xOfRow(9), homeY: 3,
                panic: ch.perks.indexOf("adrenaline") >= 0 ? 45 : 12,
                smokeDose: 0,
                burns: 0,
                stamina: 100,
                carrying: [],       // passenger ids
                dragging: null,
                wearing: {},        // itemId -> true
                held: null,         // itemId currently in hand, for flavour
                filmedAt: 0,
                seatedTurns: 0,
                lookedAtFire: ch.perks.indexOf("denial") < 0,
                alive: true,
                downedAt: null,
            },

            inventory: (opts.items || []).map(function (id) {
                const item = PRS.data.items.byId(id);
                return item ? { id: id, item: item, uses: item.uses, wet: false, spent: false } : null;
            }).filter(Boolean),

            fire: PRS.fire.create(rng),

            pax: [],
            crew: [],

            cabinFlags: {
                masksDropped: false,
                detectorSounded: false,
                paLive: false,
                beltSignOn: true,
                lightsUp: false,
                cartOut: true,
                cartX: cabin.xOfRow(11),
                aisleBlocked: {},         // x -> seconds of blockage remaining
                lavFwdOccupied: true,
                lavAftOccupied: false,
                binsOpen: {},
                exitsArmed: true,
                depressurised: false,
            },

            credibility: 0,        // 0..100. Nobody believes you and they are right not to.
            cabinAwareness: 4,     // 0..100. How much of the cabin has noticed.
            cabinPanic: 0,         // 0..100. What happens after they notice.
            crewPhase: 0,          // see crew.js

            log: [],
            actions: [],           // every action id, in order, for the report
            counts: {},            // action id -> how many times
            medals: {},
            flags: {},             // one-shot story flags
            notes: [],             // report-worthy moments
            stats: {
                stepsTaken: 0, carriesCompleted: 0, metresCarried: 0,
                agentsUsed: 0, wordsSpoken: 0, timeArguing: 0, timeCarrying: 0,
                timeFighting: 0, timeWasted: 0, helpersRecruited: 0, revives: 0,
                filmed: 0,
            },
            ended: null,
        };

        buildPassengers(S);
        buildStash(S);
        PRS.crew.create(S);

        // Two of the crew are in the aisle with the trolley, which is a wall you cannot pass.
        S.cabinFlags.aisleBlocked[S.cabinFlags.cartX] = 9999;

        return S;
    }

    function buildPassengers(S) {
        const data = PRS.data.passengers;
        const rng = S.rng;
        S.pax = data.ROSTER.map(function (row, n) {
            const [name, seat, kg, hairKey, skinKey, shirtKey, traits, says, refuse,
                   carries] = row;
            const rowNum = parseInt(seat, 10);
            const letter = seat.replace(/[0-9]/g, "");
            const x = cabin.xOfRow(rowNum);
            const y = cabin.yOfLetter(letter);
            const asleep = traits.indexOf("asleep") >= 0;
            return {
                id: "p" + n,
                n: n,
                name: name,
                seat: seat,
                row: rowNum,
                letter: letter,
                homeX: x, homeY: y,
                x: x, y: y,
                kg: kg,
                traits: traits,
                hair: data.HAIR[hairKey] || hairKey,
                skin: data.SKIN[skinKey] || skinKey,
                shirt: data.SHIRT[shirtKey] || shirtKey,
                says: says,
                refuse: refuse,
                carries: carries || null,   // what is in their lap, if anything
                revealed: false,            // whether you have asked them about it
                state: asleep ? "asleep" : "seated",
                awareness: asleep ? 0 : rng.irange(0, 14),
                panic: rng.irange(0, 8),
                trust: traits.indexOf("sceptic") >= 0 ? -20
                     : traits.indexOf("helpful") >= 0 ? 25
                     : traits.indexOf("hostile") >= 0 ? -30 : 0,
                smokeDose: 0,
                burns: 0,
                masked: false,
                belted: true,
                braced: false,
                spokenTo: 0,
                helper: false,
                helperTarget: null,
                carriedBy: null,
                securedAt: null,
                downAt: null,
                lastLine: null,
                note: null,
            };
        });
        // A passenger index by tile, rebuilt whenever anybody moves. The action list asks "who is
        // next to me" forty times a second, so it cannot be a scan.
        reindex(S);
    }

    /**
     * Where the cabin keeps the things you did not pack. Eight items across three kinds of hiding
     * place, shuffled per run, so searching the galley is a real decision about thirteen seconds
     * rather than a lever with a known output.
     */
    function buildStash(S) {
        const rng = S.rng;
        S.stash = {
            galley:    rng.shuffle(["first_aid", "binbag", "thermos", "energy"]),
            pocket:    rng.shuffle(["scissors", "wipes"]),
            underseat: rng.shuffle(["sock", "pillow"]),
        };
    }

    /** Put an item into your hands. Topping up something you already have counts. */
    function give(S, itemId, uses) {
        const item = PRS.data.items.byId(itemId);
        if (!item) return null;
        const held = slotOf(S, itemId);
        if (held) {
            if (item.uses !== null) { held.uses = uses === undefined ? item.uses : uses; }
            held.spent = false;
            return held;
        }
        const slot = { id: itemId, item: item, wet: false, spent: false,
                       uses: uses === undefined ? item.uses : uses };
        S.inventory.push(slot);
        S.stats.itemsFound = (S.stats.itemsFound || 0) + 1;
        return slot;
    }

    function reindex(S) {
        const map = {};
        for (const p of S.pax) {
            if (p.state === "carried" || p.state === "gone") continue;
            const key = p.x + "," + p.y;
            (map[key] = map[key] || []).push(p);
        }
        S._paxAt = map;
    }

    function paxAt(S, x, y) {
        return (S._paxAt && S._paxAt[x + "," + y]) || [];
    }

    function paxById(S, id) {
        for (const p of S.pax) if (p.id === id) return p;
        return null;
    }

    /** Everyone you could put a hand on from where you are standing. */
    function reachable(S) {
        const out = [];
        const seen = {};
        const spots = [[S.player.x, S.player.y]].concat(cabin.neighbours(S.player.x, S.player.y));
        for (const [x, y] of spots) {
            for (const p of paxAt(S, x, y)) {
                if (seen[p.id]) continue;
                if (p.state === "secured" || p.state === "gone") continue;
                seen[p.id] = true;
                out.push(p);
            }
        }
        return out;
    }

    /** Everyone within earshot, which is further than arm's reach and much less useful. */
    function withinEarshot(S, radius) {
        radius = radius || 2;
        const out = [];
        for (const p of S.pax) {
            if (p.state === "secured" || p.state === "gone" || p.state === "carried") continue;
            if (Math.abs(p.x - S.player.x) <= radius && Math.abs(p.y - S.player.y) <= radius + 1) {
                out.push(p);
            }
        }
        return out;
    }

    function inventoryHas(S, tag) {
        for (const slot of S.inventory) {
            if (slot.spent) continue;
            if (slot.item.tags.indexOf(tag) >= 0) return slot;
        }
        return null;
    }

    function inventoryAll(S, tag) {
        return S.inventory.filter((s) => !s.spent && s.item.tags.indexOf(tag) >= 0);
    }

    function slotOf(S, itemId) {
        for (const slot of S.inventory) if (slot.id === itemId) return slot;
        return null;
    }

    function useCharge(S, slot, n) {
        n = n === undefined ? 1 : n;
        if (slot.uses === null) return true;
        if (slot.uses <= 0) { slot.spent = true; return false; }
        slot.uses -= n;
        if (slot.uses <= 0) { slot.uses = 0; slot.spent = true; }
        return true;
    }

    function has(S, flag) { return !!S.flags[flag]; }
    function setFlag(S, flag, value) { S.flags[flag] = value === undefined ? true : value; }

    function hasPerk(S, perk) { return S.character.perks.indexOf(perk) >= 0; }

    function wearing(S, itemId) { return !!S.player.wearing[itemId]; }

    /** The number the report cares about, computed live so the HUD can show it. */
    function securedCount(S) {
        let n = 0;
        for (const p of S.pax) if (p.state === "secured") n++;
        return n;
    }

    function downCount(S) {
        let n = 0;
        for (const p of S.pax) if (p.state === "down" || p.state === "dead") n++;
        return n;
    }

    function helperCount(S) {
        let n = 0;
        for (const p of S.pax) if (p.helper && p.state !== "dead" && p.state !== "down") n++;
        return n;
    }

    // ------------------------------------------------------------------------------ the log ---

    /**
     * A flavour line that does not repeat until the whole set has been used. Two passengers
     * saying the same sentence one after the other reads as a bug even when it is not one.
     */
    function line(S, key, options) {
        S._bags = S._bags || {};
        let bag = S._bags[key];
        if (!bag || !bag.length) bag = S._bags[key] = S.rng.shuffle(options);
        return bag.pop();
    }

    function log(S, text, kind) {
        if (!text) return;
        const entry = {
            t: S.clock.elapsed,
            clock: PRS.util.mmss(S.clock.remaining),
            text: text,
            kind: kind || "plain",
        };
        S.log.push(entry);
        if (S.log.length > 900) S.log.shift();
        if (S.onLog) S.onLog(entry);
        return entry;
    }

    function note(S, text) {
        S.notes.push({ t: S.clock.elapsed, clock: PRS.util.mmss(S.clock.remaining), text: text });
    }

    PRS.state = {
        FLIGHT_SECONDS, create, reindex, paxAt, paxById, reachable, withinEarshot,
        inventoryHas, inventoryAll, slotOf, useCharge, give, buildStash,
        has, setFlag, hasPerk, wearing,
        securedCount, downCount, helperCount, log, note, line,
    };
})(window);
