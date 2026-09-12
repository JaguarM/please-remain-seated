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
        const seed = (opts.seed === undefined || opts.seed === null ? (Date.now() >>> 0)
                                                                    : opts.seed) >>> 0;
        const ch = PRS.data.characters.byId(opts.characterId);
        const outfit = PRS.data.outfits.byId(opts.outfitId) || null;
        const derived = PRS.data.characters.derive(ch, outfit);
        const seatRow = parseInt(ch.seat, 10);
        const seatY = cabin.yOfLetter(ch.seat.replace(/[0-9]/g, ""));
        const items = (opts.items || ch.bag).slice();

        const S = {
            seed: seed,
            character: ch,
            outfit: outfit,
            derived: derived,
            // Exactly what the flight was started with, so the recorder can start it again.
            loadout: { characterId: ch.id, outfitId: outfit ? outfit.id : null, items: items },

            clock: {
                total: FLIGHT_SECONDS,
                remaining: FLIGHT_SECONDS,
                elapsed: 0,
                landed: false,
                descentCalled: false,
            },

            player: {
                // Out of the seat already, in the aisle at your row: the fifteen minutes start
                // with you standing up, because you are the one who noticed.
                x: cabin.xOfRow(seatRow), y: cabin.AISLE_Y,
                seat: ch.seat,
                homeX: cabin.xOfRow(seatRow), homeY: seatY,
                smokeDose: 0,
                burns: 0,
                crouching: false,
                // Walking is priced in whole seconds, and a step is rarely a whole second. The
                // fraction the rounding took, or gave, is kept here and put into the next step,
                // so that two steps taken one at a time cost what the same two steps cost when
                // you click the far tile and walk them in one go.
                walkCarry: 0,
                carrying: [],       // passenger ids
                dragging: null,
                wearing: {},        // itemId -> true
                alive: true,
                downedAt: null,
            },

            inventory: items.map(function (id) {
                const item = PRS.data.items.byId(id);
                return item ? { id: id, item: item, uses: item.uses, wet: false, spent: false } : null;
            }).filter(Boolean),

            fire: null,            // built below, once the seed is on S

            pax: [],
            crew: [],

            cabinFlags: {
                masksDropped: false,
                detectorSounded: false,
                paLive: false,
                cartOut: true,
                cartX: cabin.xOfRow(11),
                aisleBlocked: {},         // x -> seconds of blockage remaining
                binsOpen: {},
                ventsTaped: {},           // x -> the gaspers down that row are taped over
            },

            credibility: 0,        // 0..100. Nobody believes you and they are right not to.
            cabinAwareness: 4,     // 0..100. How much of the cabin has noticed.
            cabinPanic: 0,         // 0..100. What happens after they notice.
            crewPhase: 0,          // see crew.js

            log: [],
            actions: [],           // every action id, in order, for the report and the recorder
            counts: {},            // action id -> how many times
            doneTo: {},            // entry key -> done, for actions that work once per person
            medals: {},
            // The nearest each unlocking medal ever came, which is not always where it ended up:
            // "declared early" is four steps up the chain before minute five and nothing after.
            nearly: {},
            flags: {},             // one-shot story flags
            stats: {
                stepsTaken: 0, carriesCompleted: 0, metresCarried: 0,
                agentsUsed: 0, timeArguing: 0, timeCarrying: 0,
                timeFighting: 0, helpersRecruited: 0,
            },
            ended: null,
        };

        S.fire = PRS.fire.create(S);
        buildPassengers(S);
        buildStash(S);
        PRS.crew.create(S);

        // Two of the crew are in the aisle with the trolley, which is a wall you cannot pass.
        S.cabinFlags.aisleBlocked[S.cabinFlags.cartX] = 9999;

        return S;
    }

    function buildPassengers(S) {
        const data = PRS.data.passengers;
        S.pax = data.ROSTER.map(function (row, n) {
            const id = "p" + n;
            const [name, seat, kg, hairKey, skinKey, shirtKey, traits, says, refuse,
                   carries] = row;
            const rowNum = parseInt(seat, 10);
            const letter = seat.replace(/[0-9]/g, "");
            const x = cabin.xOfRow(rowNum);
            const y = cabin.yOfLetter(letter);
            const asleep = traits.indexOf("asleep") >= 0;
            const hair = data.hairOf(hairKey);
            return {
                id: id,
                n: n,
                name: name,
                seat: seat,
                row: rowNum,
                letter: letter,
                homeX: x, homeY: y,
                x: x, y: y,
                kg: kg,
                traits: traits,
                hair: hair.colour,
                longHair: !!hair.long,
                skin: data.SKIN[skinKey] || skinKey,
                shirt: data.SHIRT[shirtKey] || shirtKey,
                says: says,
                refuse: refuse,
                carries: carries || null,   // what is in their lap, if anything
                revealed: false,            // whether you have asked them about it
                state: asleep ? "asleep" : "seated",
                awareness: asleep ? 0 : dice(S, "aware:" + id).irange(0, 14),
                panic: dice(S, "panic:" + id).irange(0, 8),
                // How this person takes being asked, decided now and not per conversation: the
                // same fourteen points either way that used to be rolled every time, so that a
                // refusal is a fact about them and not about the moment.
                mood: dice(S, "mood:" + id).range(-14, 14),
                trust: traits.indexOf("sceptic") >= 0 ? -20
                     : traits.indexOf("helpful") >= 0 ? 25
                     : traits.indexOf("hostile") >= 0 ? -30 : 0,
                annoyed: 0,                 // 0..100, how much of your firefighting has landed on them
                smokeDose: 0,
                burns: 0,
                masked: false,
                belted: true,
                braced: false,
                moved: false,               // out of their own seat, because somebody moved them
                spokenTo: 0,
                sawEvidence: false,         // shown the fire, rather than told about it
                helper: false,
                helperTarget: null,
                carriedBy: null,
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
     * Where the cabin keeps the things you did not pack: two things in the galley drawers, in an
     * order shuffled per run, so searching the galley is a real decision about thirteen seconds
     * rather than a lever with a known output.
     */
    function buildStash(S) {
        S.stash = { galley: dice(S, "stash").shuffle(["first_aid", "binbag"]) };
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
                if (p.state === "gone") continue;
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
            if (p.state === "gone" || p.state === "carried") continue;
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

    function wearing(S, itemId) { return !!S.player.wearing[itemId]; }

    /**
     * How many people are out of their own seats because somebody moved them, computed live so
     * the HUD can show it. It is not the score. The score is who is alive at touchdown, and being
     * moved is only worth what it changed about that.
     */
    function movedCount(S) {
        let n = 0;
        for (const p of S.pax) if (p.moved && p.state !== "carried" && p.state !== "dead") n++;
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

    // --------------------------------------------------------------------------------- dice ---
    //
    // Nothing in the flight draws from a stream that other actions can push along. Every roll
    // asks for the dice by name - "mood:p14", "event:3", "fire:vent:0" - and gets a stream seeded
    // from the flight's seed and that name, so the answer depends on the seed and on what is
    // being decided, and on nothing else. Two flights on one seed differ only in what was done.

    /** The dice for one named thing, from the flight's seed and that name. */
    function dice(S, key) {
        return PRS.util.makeRng(PRS.util.hashSeed(S.seed, key));
    }

    /**
     * Something that happens at some point rather than on a roll every second: a passenger
     * standing up, a helper talking somebody else into it, the crew putting somebody back. The
     * wait is drawn ahead of time, and `amount` is the chance the moment would have had this
     * tick; when the chances paid in reach the mark, it happens and the next mark is drawn.
     * Numbered per thing, so neither undo nor a detour changes when.
     */
    function hazard(S, obj, name, amount) {
        if (obj[name + "At"] === undefined) rearm(S, obj, name);
        obj[name + "Acc"] += amount;
        if (obj[name + "Acc"] < obj[name + "At"]) return false;
        rearm(S, obj, name);
        return true;
    }

    function rearm(S, obj, name) {
        const n = obj[name + "N"] = (obj[name + "N"] || 0) + 1;
        obj[name + "At"] = dice(S, name + ":" + (obj.id || "") + ":" + n).expo();
        obj[name + "Acc"] = 0;
    }

    // ------------------------------------------------------------------------------ the log ---

    /**
     * A flavour line that does not repeat until the whole set has been used. Two passengers
     * saying the same sentence one after the other reads as a bug even when it is not one.
     */
    function line(S, key, options) {
        S._bags = S._bags || {};
        S._bagN = S._bagN || {};
        let bag = S._bags[key];
        if (!bag || !bag.length) {
            // Each refill of a bag is numbered, so it is the same shuffle however you got here.
            const n = S._bagN[key] = (S._bagN[key] || 0) + 1;
            bag = S._bags[key] = dice(S, "line:" + key + ":" + n).shuffle(options);
        }
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

    PRS.state = {
        FLIGHT_SECONDS, create, reindex, paxAt, paxById, reachable, withinEarshot,
        inventoryHas, inventoryAll, slotOf, useCharge, give, buildStash,
        has, setFlag, wearing,
        movedCount, downCount, helperCount, log, line, dice, hazard, rearm,
    };
})(window);
