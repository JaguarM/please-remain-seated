// Deck: MOVE. Where you are is most of what you can do, so this is the deck the player spends
// the most seconds in and thinks about the least.
//
// Four steps, one per neighbour, and then the long moves - to the fire, to a galley, to a named
// seat - which are the same steps run through a Dijkstra over `stepCost` so the price you are
// quoted is the price you pay, including the trolley, the smoke and whoever is standing in row 11
// with a wheelie bag.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;

    // --------------------------------------------------------------------------- pathfinding ---

    /**
     * Cheapest route from the player to (tx, ty), or null if there is no way through.
     *
     * The whole distance field is computed in one go and cached against the player's position and
     * the clock, because the action list asks for twenty-odd routes every time it is rebuilt and
     * they are all from the same place. One Dijkstra a turn, not twenty.
     */
    function field(S) {
        const stamp = S.clock.elapsed + ":" + S.player.x + "," + S.player.y + ":" +
                      S.player.carrying.length + ":" + (S.player.dragging || "");
        if (S._fieldStamp === stamp) return S._field;

        const N = cabin.W * cabin.H;
        const dist = new Float64Array(N).fill(Infinity);
        const prev = new Int32Array(N).fill(-1);
        const done = new Uint8Array(N);
        const start = cabin.idx(S.player.x, S.player.y);
        dist[start] = 0;

        // Two hundred and seventy nodes. A linear scan for the minimum beats a heap here and it
        // allocates nothing, which matters because this runs every turn.
        for (let n = 0; n < N; n++) {
            let best = -1, bestD = Infinity;
            for (let i = 0; i < N; i++) if (!done[i] && dist[i] < bestD) { bestD = dist[i]; best = i; }
            if (best < 0) break;
            done[best] = 1;
            const bx = cabin.xOf(best), by = cabin.yOf(best);
            for (const [nx, ny] of cabin.neighbours(bx, by)) {
                const ni = cabin.idx(nx, ny);
                if (done[ni]) continue;
                const c = A.stepCost(S, nx, ny);
                if (!isFinite(c)) continue;
                if (dist[best] + c < dist[ni]) { dist[ni] = dist[best] + c; prev[ni] = best; }
            }
        }
        S._fieldStamp = stamp;
        S._field = { dist: dist, prev: prev, start: start };
        return S._field;
    }

    function route(S, tx, ty) {
        if (!cabin.inBounds(tx, ty)) return null;
        const f = field(S);
        const goal = cabin.idx(tx, ty);
        if (!isFinite(f.dist[goal])) return null;
        const path = [];
        let cur = goal;
        while (cur !== f.start && cur >= 0) { path.unshift(cur); cur = f.prev[cur]; }
        return { cost: f.dist[goal], path: path };
    }

    /** Walk a whole route, so the arrival log line knows where it has been. */
    function travel(S, r) {
        let overSeats = 0;
        for (const i of r.path) {
            const x = cabin.xOf(i), y = cabin.yOf(i);
            if (cabin.kindAt(x, y) === "seat") overSeats++;
            A.moveTo(S, x, y);
        }
        if (overSeats) S.counts["move.over_seats"] = (S.counts["move.over_seats"] || 0) + overSeats;
        PRS.audio.play("step");
        return overSeats;
    }

    const DIRS = [
        { dx: -1, dy: 0, word: "forward" },
        { dx: 1, dy: 0, word: "aft" },
        { dx: 0, dy: -1, word: "to the left" },
        { dx: 0, dy: 1, word: "to the right" },
    ];

    function arrival(S) {
        const where = cabin.placeName(S.player.x, S.player.y);
        const f = S.fire;
        const i = cabin.idx(S.player.x, S.player.y);
        const bits = [];
        if (f.intensity[i] > 2) bits.push("It is " + PRS.fire.describe(f, S.player.x, S.player.y) +
                                          " where you are standing.");
        if (f.smoke[i] > 12) bits.push("Smoke: " + PRS.fire.describeSmoke(f.smoke[i]) + ".");
        const here = st.paxAt(S, S.player.x, S.player.y).filter((p) => p.state !== "carried");
        if (here.length) bits.push("You are on top of " +
            PRS.util.listSentence(here.map((p) => p.name)) + ".");
        return "You are at " + where + ". " + bits.join(" ");
    }

    // -------------------------------------------------------------------------------- steps ---

    A.register([
        {
            // What a click on the cabin does. Hidden, because the cabin is the button.
            id: "move.walk",
            deck: "move",
            tags: ["move"],
            hidden: true,
            targets(S) {
                const out = [];
                for (let x = 0; x < cabin.W; x++) {
                    for (let y = 0; y < cabin.H; y++) {
                        if (x === S.player.x && y === S.player.y) continue;
                        const r = route(S, x, y);
                        if (!r) continue;
                        out.push({ key: x + "," + y, x: x, y: y, r: r });
                    }
                }
                return out;
            },
            label: (S, c) => "Go to " + cabin.placeName(c.x, c.y),
            detail: (S, c) => cabin.placeName(c.x, c.y),
            cost: (S, c) => c.r.cost,
            run(S, c) {
                travel(S, c.r);
                return arrival(S);
            },
        },

        {
            id: "move.step",
            hidden: true,   // on the map, not in the list
            deck: "move",
            tags: ["move"],
            targets(S) {
                const out = [];
                for (const d of DIRS) {
                    const x = S.player.x + d.dx, y = S.player.y + d.dy;
                    if (!cabin.inBounds(x, y)) continue;
                    const c = A.stepCost(S, x, y);
                    if (!isFinite(c)) continue;
                    out.push({ key: d.word.replace(/ /g, "_"), x: x, y: y, dir: d, cost: c });
                }
                return out;
            },
            label: (S, c) => {
                const seat = cabin.seatName(c.x, c.y);
                const kind = cabin.kindAt(c.x, c.y);
                if (seat) return "Climb over " + seat;
                if (kind === "exit") return "Step to " + cabin.placeName(c.x, c.y);
                return "Step " + c.dir.word;
            },
            detail: (S, c) => cabin.placeName(c.x, c.y),
            cost: (S, c) => c.cost,
            run(S, c) {
                A.moveTo(S, c.x, c.y);
                PRS.audio.play("step");
                return arrival(S);
            },
        },

        {
            id: "move.aisle",
            hidden: true,   // on the map, not in the list
            deck: "move",
            tags: ["move"],
            label: "Get into the aisle",
            detail: "Out of the seats and onto the carpet where you can actually move.",
            when: (S) => S.player.y !== cabin.AISLE_Y &&
                         !!route(S, S.player.x, cabin.AISLE_Y),
            cost: (S) => { const r = route(S, S.player.x, cabin.AISLE_Y); return r ? r.cost : 99; },
            run(S) {
                const r = route(S, S.player.x, cabin.AISLE_Y);
                if (!r) return "There is no way out of this row.";
                travel(S, r);
                return arrival(S);
            },
        },

        {
            id: "move.to_fire",
            hidden: true,   // on the map, not in the list
            deck: "move",
            tags: ["move", "fire"],
            label: "Go to the fire",
            detail: (S) => "The bin above " + cabin.ORIGIN.row + cabin.ORIGIN.letter +
                           ", which is where all of this is coming from.",
            when: (S) => {
                const c = S.fire.core;
                return (S.player.x !== c.x || S.player.y !== cabin.AISLE_Y) &&
                       !!route(S, c.x, cabin.AISLE_Y);
            },
            cost: (S) => {
                const r = route(S, S.fire.core.x, cabin.AISLE_Y);
                return r ? r.cost : 99;
            },
            run(S) {
                const r = route(S, S.fire.core.x, cabin.AISLE_Y);
                if (!r) return "You cannot get there from here. Somebody is in the way.";
                travel(S, r);
                return arrival(S);
            },
        },

        {
            id: "move.fwd_galley",
            hidden: true,   // on the map, not in the list
            deck: "move",
            tags: ["move"],
            label: "Go to the forward galley",
            detail: "Furthest from the fire, next to two doors, and it is where you put people.",
            when: (S) => S.player.x > cabin.FWD_CROSS_X &&
                         !!route(S, cabin.FWD_GALLEY_X, cabin.AISLE_Y),
            cost: (S) => { const r = route(S, cabin.FWD_GALLEY_X, cabin.AISLE_Y);
                           return r ? r.cost : 99; },
            run(S) {
                const r = route(S, cabin.FWD_GALLEY_X, cabin.AISLE_Y);
                if (!r) return "The aisle is blocked and you cannot get forward.";
                travel(S, r);
                return arrival(S);
            },
        },

        {
            id: "move.aft_galley",
            hidden: true,   // on the map, not in the list
            deck: "move",
            tags: ["move"],
            label: "Go to the aft galley",
            detail: "The other safe zone, and it has a lavatory with a tap in it.",
            when: (S) => S.player.x < cabin.AFT_CROSS_X &&
                         !!route(S, cabin.AFT_GALLEY_X, cabin.AISLE_Y),
            cost: (S) => { const r = route(S, cabin.AFT_GALLEY_X, cabin.AISLE_Y);
                           return r ? r.cost : 99; },
            run(S) {
                const r = route(S, cabin.AFT_GALLEY_X, cabin.AISLE_Y);
                if (!r) return "You cannot get aft. Something is across the aisle.";
                travel(S, r);
                return arrival(S);
            },
        },

        {
            id: "move.overwing",
            hidden: true,   // on the map, not in the list
            deck: "move",
            tags: ["move"],
            label: "Go to the overwing exits",
            detail: "The middle safe zone. Half the distance of either galley from most of the cabin.",
            when: (S) => S.player.x !== cabin.OVERWING_X &&
                         !!route(S, cabin.OVERWING_X, cabin.AISLE_Y),
            cost: (S) => { const r = route(S, cabin.OVERWING_X, cabin.AISLE_Y);
                           return r ? r.cost : 99; },
            run(S) {
                const r = route(S, cabin.OVERWING_X, cabin.AISLE_Y);
                if (!r) return "Blocked.";
                travel(S, r);
                return arrival(S);
            },
        },

        {
            id: "move.to_lav",
            hidden: true,   // on the map, not in the list
            deck: "move",
            tags: ["move"],
            label: "Go to the aft lavatory",
            detail: "There is a tap in there, and a sink, and a bin, and a door that closes.",
            when: (S) => !(S.player.x === cabin.AFT_GALLEY_X && cabin.kindAt(S.player.x, S.player.y) === "lav") &&
                         !!route(S, cabin.AFT_GALLEY_X, 7),
            cost: (S) => { const r = route(S, cabin.AFT_GALLEY_X, 7); return r ? r.cost : 99; },
            run(S) {
                const r = route(S, cabin.AFT_GALLEY_X, 7);
                if (!r) return "You cannot get to it.";
                travel(S, r);
                return "You are in the aft lavatory. It is ninety centimetres wide and it has a " +
                       "tap, which makes it the most useful room on this aeroplane.";
            },
        },

        {
            id: "move.to_row",
            hidden: true,   // on the map, not in the list
            deck: "move",
            tags: ["move"],
            targets(S) {
                // Twenty-three rows is twenty-three near-identical buttons, which is a list nobody
                // reads. Six is a list somebody reads: the nearest few, and the nearest few that
                // contain a person who cannot get out of their own seat.
                const rows = {};
                for (const p of S.pax) {
                    if (p.state === "secured" || p.state === "dead" || p.state === "carried") continue;
                    const x = cabin.xOfRow(p.row);
                    if (x === null || x === S.player.x) continue;
                    const row = rows[p.row] || (rows[p.row] = { row: p.row, x: x, n: 0,
                                                                stuck: 0, down: 0 });
                    row.n++;
                    if (p.state === "down") row.down++;
                    else if (PRS.pax.needsCarrying(p)) row.stuck++;
                }
                const out = [];
                for (const key in rows) {
                    const row = rows[key];
                    const r = route(S, row.x, cabin.AISLE_Y);
                    if (!r) continue;
                    row.r = r;
                    row.key = "r" + row.row;
                    row.score = row.down * 6 + row.stuck * 4 + row.n - r.cost * 0.35;
                    out.push(row);
                }
                out.sort((a, b) => b.score - a.score);
                return out.slice(0, 6).sort((a, b) => a.r.cost - b.r.cost);
            },
            label: (S, c) => "Go to row " + c.row,
            detail: (S, c) => {
                const bits = [PRS.util.plural(c.n, "person", "people") + " there"];
                if (c.down) bits.push(c.down + " unconscious");
                if (c.stuck) bits.push(c.stuck + " who cannot walk");
                return bits.join(", ") + ".";
            },
            cost: (S, c) => c.r.cost,
            run(S, c) {
                travel(S, c.r);
                return arrival(S);
            },
        },

        {
            id: "move.crawl",
            deck: "move",
            tags: ["move", "self"],
            label: (S) => S.player.crouching ? "Stand back up" : "Get down and crawl",
            detail: "The smoke is at the ceiling. The air is at the floor. It is not a close call.",
            when: (S) => true,
            cost: 5,
            run(S) {
                S.player.crouching = !S.player.crouching;
                if (S.player.crouching) {
                    return "You go down onto your hands and knees. The air down here is " +
                           "startlingly better and you can see forty rows of shoes.";
                }
                return "You stand back up into the grey.";
            },
        },

        {
            id: "move.over_seats",
            deck: "move",
            tags: ["move"],
            label: "Go over the seat backs",
            detail: "Along the tops of the seats, over everybody's heads, aft.",
            when: (S) => S.player.y !== cabin.AISLE_Y || Object.keys(S.cabinFlags.aisleBlocked).length > 0,
            cost: (S) => 16 + (S.player.carrying.length ? 22 : 0),
            run(S) {
                const dir = S.fire.core.x > S.player.x ? 1 : -1;
                let moved = 0;
                for (let n = 0; n < 3; n++) {
                    const x = S.player.x + dir;
                    if (!cabin.inBounds(x, S.player.y) || cabin.solid(x, S.player.y)) break;
                    A.moveTo(S, x, S.player.y);
                    moved++;
                }
                S.cabinPanic = Math.min(100, S.cabinPanic + 3);
                S.counts["move.over_seats"] = (S.counts["move.over_seats"] || 0) + moved;
                if (!moved) return "There is nowhere to go along the tops of the seats.";
                return "You go over the seat backs, " + moved + " rows, standing on armrests and " +
                       "somebody's shoulder. Two people shout. " + arrival(S);
            },
        },

        {
            id: "move.push_through",
            deck: "move",
            tags: ["move", "social"],
            label: "Push through the people in the aisle",
            detail: "Shoulder first. It works. It costs you something with the cabin.",
            when: (S) => {
                for (const x in S.cabinFlags.aisleBlocked) {
                    if (S.cabinFlags.aisleBlocked[x] < 9999) return true;
                }
                return false;
            },
            cost: 14,
            run(S) {
                let cleared = 0;
                for (const x in S.cabinFlags.aisleBlocked) {
                    if (S.cabinFlags.aisleBlocked[x] >= 9999) continue;
                    if (Math.abs(Number(x) - S.player.x) <= 2) {
                        delete S.cabinFlags.aisleBlocked[x];
                        cleared++;
                    }
                }
                S.cabinPanic = Math.min(100, S.cabinPanic + 6);
                S.credibility = Math.max(0, S.credibility - 4);
                if (!cleared) return "You shoulder past two people who do not move much.";
                return "You put a shoulder into it and go through. Somebody's bag goes over. " +
                       "Two people are now shouting at you and one of them is right.";
            },
        },

        {
            id: "move.under_seats",
            deck: "move",
            tags: ["move"],
            label: "Go under the seats",
            detail: "On your front, along the floor, under the whole row. You are small enough.",
            when: (S) => st.hasPerk(S, "small") || st.hasPerk(S, "under_the_smoke"),
            cost: (S) => 9,
            run(S) {
                const dir = S.fire.core.x > S.player.x ? 1 : -1;
                let moved = 0;
                for (let n = 0; n < 4; n++) {
                    const x = S.player.x + dir;
                    if (!cabin.inBounds(x, S.player.y) || cabin.solid(x, S.player.y)) break;
                    A.moveTo(S, x, S.player.y);
                    moved++;
                }
                return "You go under the seats on your front, past " + moved + " rows of ankles, " +
                       "in air nobody else on this aeroplane can reach. " + arrival(S);
            },
        },
    ]);

    PRS.actions.route = route;
    PRS.actions.travel = travel;
    PRS.actions.arrival = arrival;
})(window);
