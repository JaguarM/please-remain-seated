// Deck: MOVE. One action, hidden from every card because the aeroplane is its button: a click on
// a tile walks you there along the cheapest route, priced by a Dijkstra over `stepCost`, so the
// price you are quoted is the price you pay, including the trolley, the smoke and whoever is
// standing in row 11 with a wheelie bag. Plus crawling, which is a trade the safety card mentions.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;
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

    function arrival(S) {
        const where = cabin.placeName(S.player.x, S.player.y);
        const f = S.fire;
        const i = cabin.idx(S.player.x, S.player.y);
        const bits = [];
        if (f.intensity[i] > 2) {
            bits.push(T("It is {what} where you are standing.",
                        { what: PRS.fire.describe(f, S.player.x, S.player.y) }));
        }
        if (f.smoke[i] > 12) {
            bits.push(T("Smoke: {what}.", { what: PRS.fire.describeSmoke(f.smoke[i]) }));
        }
        const here = st.paxAt(S, S.player.x, S.player.y).filter((p) => p.state !== "carried");
        if (here.length) {
            bits.push(T("You are on top of {who}.",
                        { who: PRS.util.listSentence(here.map((p) => p.name)) }));
        }
        return T("You are at {where}. ", { where: where }) + bits.join(" ");
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
            label: (S, c) => T("Go to {where}", { where: cabin.placeTo(c.x, c.y) }),
            detail: (S, c) => cabin.placeName(c.x, c.y),
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
            label: (S) => S.player.crouching ? T("Stand back up") : T("Get down and crawl"),
            detail: K("The smoke is at the ceiling and the air is at the floor. Down there you " +
                    "breathe less than half of it, and every step takes half again as long."),
            when: (S) => !S.player.carrying.length && !S.player.dragging,
            cost: 5,
            run(S) {
                S.player.crouching = !S.player.crouching;
                if (S.player.crouching) {
                    return T("You go down onto your hands and knees. The air down here is " +
                             "startlingly better and you can see forty rows of shoes.");
                }
                return T("You stand back up into the grey.");
            },
        },
    ]);

    PRS.actions.route = route;
    PRS.actions.travel = travel;
    PRS.actions.arrival = arrival;
})(window);
