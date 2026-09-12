// Drawing the cabin. Nose to the left, tail to the right, nine cells deep, every cell a 16x16
// sprite at whatever integer scale fits the canvas.
//
// The order matters and it is the order a photograph of a cabin fire has: floor, then the fixed
// aeroplane, then the people, then the fire, then the smoke over all of it, then the interface
// on top of the smoke because the player has to be able to read the interface.
//
// There is one animation clock and it drives everything that flickers, so the fire in row 14 and
// the fire in row 16 are never in step, which is the difference between a fire and a gif.
//
// Two things here are not decoration. Faces are the cabin's panic meter - there is no bar for it,
// so sixty people have to wear it - and `fx` is the layer that says what an action just did, in
// the place it did it, for as long as it takes to read.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    // `T` is the tile size everywhere in this file, so the translator goes by its
    // other name. X() is the one that takes a note, which is what these do: every word
    // drawn on the cabin is painted into one tile and has no room to grow.
    const X = PRS.tx;
    const cabin = PRS.cabin;
    const atlas = PRS.atlas;
    const clamp01 = PRS.util.clamp01;

    const TILE = 16;

    /**
     * The cabin is always drawn at the same integer sprite scale and then left to CSS to fit the
     * column. Drawing at a fractional scale would put half-pixels through sixteen-pixel sprites;
     * drawing at an integer scale and letting `image-rendering: pixelated` do the last bit keeps
     * every sprite square whatever width the window happens to be.
     */
    const DRAW_SCALE = 3;

    function fit(canvas) {
        canvas.width = cabin.W * TILE * DRAW_SCALE;
        canvas.height = cabin.H * TILE * DRAW_SCALE;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        return DRAW_SCALE;
    }

    /**
     * Which tile the mouse is over, or null, and where in the tile: `fx` and `fy` run 0..1
     * across it, so a click can tell the person in a burning seat from the fire round them.
     * Works at any CSS size the canvas ends up.
     */
    function tileAt(canvas, scale, clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        const tw = r.width / cabin.W, th = r.height / cabin.H;
        const px = (clientX - r.left) / tw, py = (clientY - r.top) / th;
        const x = Math.floor(px), y = Math.floor(py);
        if (!cabin.inBounds(x, y)) return null;
        return { x: x, y: y, fx: px - x, fy: py - y };
    }

    // ------------------------------------------------------------------------------- faces ---
    //
    // A person is one map and a palette, and both of those questions are answered in sim/pax.js
    // rather than here, because they are questions about a person and because the PNG renderer in
    // tools/ has to be able to ask them too. All this file does is point at the answers.

    const faceOf = (p) => PRS.pax.face(p);
    const paletteOf = (who) => PRS.pax.palette(who);
    const ashenOf = (who) => PRS.pax.palette(who, true);

    /** The player's own face, which answers to the same rules as everybody else's. */
    function playerFace(S) {
        const P = S.player;
        if (!P.alive) return "pax_down";
        if (P.crouching) return "pax_low";
        if (P.smokeDose > 40) return "pax_afraid";
        if (P.smokeDose > 15) return "pax_worried";
        return "pax";
    }

    /**
     * You, and whoever you have hold of. Drawn twice a frame - in your place among everybody
     * else, and again over the smoke - so it is one function. Somebody in your arms is a body
     * across your chest, head one side and feet the other, in their own colours; two are two,
     * stacked, the lower one the other way round and drawn last, so the heads are at opposite
     * ends and both show; somebody you are dragging is the same body, lower, on the floor at
     * your feet rather than across your chest. It used to be a crouching figure drawn three
     * pixels off centre, which read as somebody standing very close to you.
     */
    const CARRY = [[[0, "carried"]], [[-1, "carried"], [2, "carried_b"]]];   // rows down, by how many
    const DRAG_ROW = 4;

    /** What somebody in your arms is drawn as. The dog is his bag, whichever arm he is under. */
    function heldSprite(q, name) {
        return PRS.pax.isPet(q) ? "carried_pet" : name;
    }

    function drawYou(ctx, S, ppx, ppy, scale, alpha, ring) {
        const P = S.player;
        atlas.blitAlpha(ctx, "player_ring", ppx, ppy, scale, ring);
        atlas.blitAlpha(ctx, playerFace(S), ppx, ppy, scale, alpha, paletteOf(S.character));
        if (PRS.state.wearing(S, "hood")) atlas.blitAlpha(ctx, "mask_on", ppx, ppy, scale, alpha);
        const held = P.carrying.map((id) => PRS.state.paxById(S, id)).filter((q) => q);
        const bodies = CARRY[Math.min(held.length, CARRY.length) - 1] || [];
        bodies.forEach(([dy, name], k) => {
            atlas.blitAlpha(ctx, heldSprite(held[k], name), ppx, ppy + dy * scale, scale, alpha,
                            paletteOf(held[k]));
        });
        if (P.dragging) {
            const q = PRS.state.paxById(S, P.dragging);
            if (q) atlas.blitAlpha(ctx, heldSprite(q, "carried"), ppx, ppy + DRAG_ROW * scale,
                                   scale, alpha, paletteOf(q));
        }
    }

    // ----------------------------------------------------------------------------- figures ---
    //
    // A person no longer fills their cell. The body stops three pixels short of the edge on every
    // side, so the fire a person is sitting in shows all the way round them, and a click on the
    // person is not a click on the fire. Where exactly the body is comes from the art itself -
    // the bounding box of the sprite's opaque pixels - so if the maps change, this follows.

    const boxes = {};

    /** The opaque extent of a sprite, in sprite pixels: [left, top, right, bottom), cached. */
    function spriteBox(name) {
        let b = boxes[name];
        if (b) return b;
        const sp = atlas.get(name);
        let x0 = 16, y0 = 16, x1 = 0, y1 = 0;
        if (sp) {
            sp.rows.forEach((row, y) => {
                for (let x = 0; x < row.length; x++) {
                    if (row[x] === ".") continue;
                    if (x < x0) x0 = x; if (x + 1 > x1) x1 = x + 1;
                    if (y < y0) y0 = y; if (y + 1 > y1) y1 = y + 1;
                }
            });
        }
        if (x1 <= x0) { x0 = 0; y0 = 0; x1 = TILE; y1 = TILE; }
        b = boxes[name] = [x0, y0, x1, y1];
        return b;
    }

    /**
     * Everybody drawn on a tile, in the order they are drawn, each with where their body is in
     * sprite pixels. The stack fans out exactly as draw() fans it, so the box under the pointer
     * is the box on the screen. `kind` is person, crew or you.
     */
    function figures(S, x, y) {
        const out = [];
        let n = 0;
        for (const p of S.pax) {
            if (p.state === "gone" || p.state === "carried") continue;
            if (p.x !== x || p.y !== y) continue;
            const [dx, dy] = FAN[Math.min(FAN.length - 1, n++)];
            const sprite = faceOf(p);
            out.push({ kind: "person", id: p.id, who: p, sprite: sprite, dx: dx, dy: dy,
                       box: shift(spriteBox(sprite), dx, dy) });
        }
        const crewFace = S.crewPhase >= 4 ? "pax_afraid" : S.crewPhase >= 2 ? "pax_worried" : "pax";
        for (const c of S.crew) {
            if (c.x !== x || c.y !== y) continue;
            out.push({ kind: "crew", id: c.id, who: c, sprite: crewFace, dx: 0, dy: 0,
                       box: spriteBox(crewFace) });
        }
        if (S.player.x === x && S.player.y === y) {
            const sprite = playerFace(S);
            out.push({ kind: "you", id: "you", who: S.player, sprite: sprite, dx: 0, dy: 0,
                       box: spriteBox(sprite) });
        }
        return out;
    }

    function shift(box, dx, dy) {
        return [box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy];
    }

    /**
     * The topmost figure under a point in a tile, or null if the point is on the tile itself.
     * `inset` is how many sprite pixels inside the body the click has to be: negative is a
     * pixel of grace, for a tile where the body is the only thing to hit; positive gives the
     * edges of the body to whatever is round it, which on a burning tile is the fire, because
     * the fire is the harder of the two to land on.
     */
    function figureAt(S, x, y, fx, fy, inset) {
        const list = figures(S, x, y);
        const px = fx * TILE, py = fy * TILE;
        const n = inset === undefined ? -1 : inset;
        for (let i = list.length - 1; i >= 0; i--) {
            const b = list[i].box;
            if (px >= b[0] + n && px < b[2] - n && py >= b[1] + n && py < b[3] - n) return list[i];
        }
        return null;
    }

    // -------------------------------------------------------------------------------- halo ---
    //
    // The light round the thing under the pointer is the thing's own shape: every transparent
    // pixel that shares an edge with an opaque one, one pixel deep. Edges only - a pixel that
    // only touches at a corner stays dark - because that is the outline a pixel artist draws by
    // hand, and taking the diagonals too makes the ring chunky. It is worked out from the map
    // once per sprite and colour and kept, like any other stamp, at the same whole-pixel scale
    // as the art, so it is part of the picture rather than a line drawn over it.

    const halos = new Map();

    function haloStamp(name, scale, colour) {
        const key = name + "@" + scale + "|" + colour;
        const hit = halos.get(key);
        if (hit) return hit;
        const sp = atlas.get(name);
        const rows = sp ? sp.rows : [];
        const w = rows.length ? Math.max.apply(null, rows.map((r) => r.length)) : TILE;
        const h = rows.length || TILE;
        const solid = (x, y) => y >= 0 && y < h && x >= 0 && x < rows[y].length && rows[y][x] !== ".";
        const canvas = document.createElement("canvas");
        canvas.width = (w + 2) * scale;
        canvas.height = (h + 2) * scale;
        const cx = canvas.getContext("2d");
        cx.fillStyle = colour;
        for (let y = -1; y <= h; y++) {
            for (let x = -1; x <= w; x++) {
                if (solid(x, y)) continue;
                if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
                    cx.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
                }
            }
        }
        halos.set(key, canvas);
        return canvas;
    }

    // How much of the halo shows. Translucent, and steady: a one-pixel line that fades in and
    // out shimmers, and a solid white one is a wall round the thing rather than a light on it.
    const HALO_ALPHA = { person: 0.55, fire: 0.62 };

    /** A one-pixel halo round a sprite drawn at (px, py), in a colour, at an alpha. */
    function halo(ctx, name, px, py, scale, colour, alpha) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * Math.min(1, alpha === undefined ? 1 : alpha);
        ctx.drawImage(haloStamp(name, scale, colour), (px - scale) | 0, (py - scale) | 0);
        ctx.globalAlpha = prev;
    }

    // ------------------------------------------------------------------------------ motion ---
    //
    // Where somebody is drawn is not where they are. The simulation moves people in jumps - a
    // helper is in 21F and a moment later on the floor by the aft door, the trolley is across row
    // 11 and then across row 10 - and the picture chases each jump the way a person would have to
    // make it: out to the aisle, along it, and back in. A jump becomes something you watch happen,
    // which is the whole difference between sixty people and sixty sprites.
    //
    // Nothing reads any of it back. The simulation, the hit test and the cards only ever know
    // where people are, so somebody still on their way to a tile is already there as far as the
    // game is concerned. Chases are short for that reason - a third of a second, whatever the
    // distance - unless a figure is given a route and a time to walk it in, which is what happens
    // to you when you walk somewhere and pay for it.

    const CHASE = { speed: 10, within: 0.34 };   // tiles a second at least, and seconds at most
    const moving = new Map();
    let movedAt = 0;

    /** A new flight: nobody is anywhere yet. */
    function resetMotion() {
        moving.clear();
        movedAt = 0;
    }

    /** Seconds since the last frame. Asked once, at the top of a draw. */
    function frameStep(t) {
        const dt = movedAt ? Math.min(0.1, Math.max(0, t - movedAt) / 1000) : 0;
        movedAt = t;
        return dt;
    }

    /** The way a person crosses a cabin: out to the aisle and along it, unless it is next door. */
    function aisleRoute(fx, fy, tx, ty) {
        if (Math.abs(fx - tx) < 1 || Math.abs(fy - ty) < 1) return [[tx, ty]];
        const out = Math.abs(fy - cabin.AISLE_Y) < 0.5 ? [] : [[fx, cabin.AISLE_Y]];
        out.push([tx, cabin.AISLE_Y], [tx, ty]);
        return out;
    }

    function routeLength(x, y, route) {
        let d = 0;
        for (const [wx, wy] of route) { d += Math.hypot(wx - x, wy - y); x = wx; y = wy; }
        return d;
    }

    /**
     * Walk a figure along a route of tiles - the first of them being where it sets off from -
     * arriving in `ms`. Your own walks come through here, so the marker takes the route the price
     * was quoted for and arrives exactly as the seconds run out.
     */
    function follow(key, tiles, ms) {
        if (!tiles || !tiles.length) return;
        let m = moving.get(key);
        if (!m) {
            m = { x: tiles[0][0], y: tiles[0][1], tx: 0, ty: 0, route: [], speed: 0 };
            moving.set(key, m);
        }
        const last = tiles[tiles.length - 1];
        m.tx = last[0];
        m.ty = last[1];
        m.route = tiles.map((t) => [t[0], t[1]]);
        m.speed = ms > 0 ? Math.max(0.01, routeLength(m.x, m.y, m.route) / (ms / 1000)) : 1e6;
    }

    /** Where to draw somebody this frame, having moved them `dt` seconds toward where they are. */
    function drawnAt(key, x, y, dt) {
        let m = moving.get(key);
        if (!m) {
            m = { x: x, y: y, tx: x, ty: y, route: [], speed: 0 };
            moving.set(key, m);
            return m;
        }
        if (m.tx !== x || m.ty !== y || (!m.route.length && (m.x !== x || m.y !== y))) {
            m.tx = x;
            m.ty = y;
            m.route = aisleRoute(m.x, m.y, x, y);
            m.speed = Math.max(CHASE.speed, routeLength(m.x, m.y, m.route) / CHASE.within);
        }
        let go = m.speed * dt;
        while (go > 0 && m.route.length) {
            const [wx, wy] = m.route[0];
            const d = Math.hypot(wx - m.x, wy - m.y);
            if (d <= go) { m.x = wx; m.y = wy; go -= d; m.route.shift(); }
            else { m.x += (wx - m.x) * go / d; m.y += (wy - m.y) * go / d; go = 0; }
        }
        return m;
    }

    /** Put a figure exactly where another one is: whoever is in your arms is wherever you are. */
    function rideWith(key, at) {
        const m = moving.get(key);
        if (!m) { moving.set(key, { x: at.x, y: at.y, tx: at.x, ty: at.y, route: [], speed: 0 }); return; }
        m.x = at.x;
        m.y = at.y;
        m.route.length = 0;
    }

    /** A drawn position in canvas pixels, snapped to whole sprite pixels so the art stays square. */
    function pixels(v, scale) { return Math.round(v * TILE) * scale; }

    // ------------------------------------------------------------------------------- trail ---
    //
    // Where you have just walked from, for as long as walking back is free. Every tile a walk went
    // through gets a mark on the floor, and every tile you stood on between walks gets a square,
    // because those are the ones a step back returns you to: the walks since are undone and their
    // seconds come back. It ends at the last thing you did that was not a walk, which is exactly
    // where undo stops giving them back. Drawn under the people, like the reach.

    function drawTrail(ctx, trail, T, scale) {
        if (!trail || !trail.length) return;
        const dot = 2 * scale, box = 6 * scale;
        ctx.save();
        ctx.fillStyle = "#ffd54a";
        ctx.strokeStyle = "#ffd54a";
        ctx.lineWidth = scale;
        trail.forEach(function (stop, k) {
            const fade = 1 - k / (trail.length + 1);
            ctx.globalAlpha = 0.12 + 0.3 * fade;
            for (const i of stop.path || []) {
                ctx.fillRect(cabin.xOf(i) * T + (T - dot) / 2, cabin.yOf(i) * T + (T - dot) / 2,
                             dot, dot);
            }
            ctx.globalAlpha = 0.2 + 0.45 * fade;
            ctx.strokeRect(stop.x * T + (T - box + scale) / 2, stop.y * T + (T - box + scale) / 2,
                           box - scale, box - scale);
        });
        ctx.restore();
    }

    // ---------------------------------------------------------------------------------- fx ---
    //
    // Everything the cabin says about an action after the action is over: the price floating off
    // the tile it was paid on, a ring around whoever it happened to, a colour over the whole
    // aeroplane for a fifth of a second, and a shove.
    //
    // It is a flat list with timestamps and no scheduler. The draw loop is already running at
    // sixty frames a second whether anything is happening or not, so an effect is a thing that
    // knows when it started and how long it lasts, and the list is swept once a frame.

    // Where the second, third and fourth person on one tile stand, in sprite pixels.
    const FAN = [[0, 0], [3, -2], [-3, 2], [4, 3], [-4, -2], [2, 4], [-2, -4]];

    const fx = { items: [], flash: null, shakeUntil: 0, shakeAmp: 0 };

    function now() { return performance.now(); }

    /** A line of text that rises off a tile and fades. The cost of what you just did goes here. */
    function say(x, y, text, colour, opts) {
        opts = opts || {};
        fx.items.push({ kind: "say", x: x, y: y, text: text, colour: colour || "#ffd54a",
                        born: now(), ms: opts.ms || 1400, rise: opts.rise === undefined ? 14 : opts.rise,
                        size: opts.size || 0.36 });
    }

    /** A ring that expands out of a tile once. Where an action landed. */
    function pulse(x, y, colour, ms) {
        fx.items.push({ kind: "pulse", x: x, y: y, colour: colour || "#ffd54a",
                        born: now(), ms: ms || 520 });
    }

    /** A colour laid over the whole aeroplane, briefly. Only for things that happen to you. */
    function flashOver(colour, strength, ms) {
        fx.flash = { colour: colour, strength: strength || 0.2, born: now(), ms: ms || 260 };
    }

    /** A shove. Two pixels for a quarter of a second is a lot more than it sounds. */
    function shake(amp, ms) {
        fx.shakeAmp = Math.max(fx.shakeAmp, amp || 2);
        fx.shakeUntil = Math.max(fx.shakeUntil, now() + (ms || 260));
    }

    function clearFx() {
        fx.items.length = 0;
        fx.flash = null;
        fx.shakeUntil = 0;
    }

    // --------------------------------------------------------------------------------- draw ---

    function draw(ctx, S, opts) {
        opts = opts || {};
        const scale = opts.scale || 2;
        const T = TILE * scale;
        const t = opts.time || 0;
        const f = S.fire;
        const P = S.player;
        // How far everybody gets to move this frame, and where you are drawn now. Asked once,
        // here, because asking is what moves them.
        const dt = frameStep(t);
        const youAt = drawnAt("you", P.x, P.y, dt);

        ctx.imageSmoothingEnabled = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#20242c";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // A shove, applied to the whole aeroplane, because that is where it happened.
        if (t < fx.shakeUntil) {
            const left = (fx.shakeUntil - t) / 260;
            const a = fx.shakeAmp * scale * Math.min(1, left);
            ctx.setTransform(1, 0, 0, 1,
                             Math.round(Math.sin(t * 0.09) * a),
                             Math.round(Math.cos(t * 0.13) * a * 0.6));
        } else {
            fx.shakeAmp = 0;
        }

        // ---- the aeroplane -----------------------------------------------------------------
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const px = x * T, py = y * T;
                const kind = cabin.kindAt(x, y);
                const i = cabin.idx(x, y);

                if (kind === "bulkhead") {
                    atlas.blit(ctx, "bulkhead", px, py, scale);
                    continue;
                }
                if (kind === "wall") {
                    atlas.blit(ctx, cabin.rowAt(x) !== null ? "window" : "wall", px, py, scale);
                    continue;
                }
                atlas.blit(ctx, y === cabin.AISLE_Y ? "floor_aisle" : "floor_carpet", px, py, scale);

                if (kind === "seat") {
                    // One of three tiles, by where the seat is in its bank, so the bank joins up.
                    const burnt = f.burnt[i];
                    const name = "seat_" + cabin.seatPos(y) +
                                 (burnt > 0.6 ? "_burnt" : burnt > 0.2 ? "_scorched" : "");
                    atlas.blit(ctx, name, px, py, scale);
                } else if (kind === "galley") {
                    atlas.blit(ctx, "galley", px, py, scale);
                } else if (kind === "lav") {
                    atlas.blit(ctx, "lav_door", px, py, scale);
                } else if (kind === "exit") {
                    atlas.blit(ctx, "exit_door", px, py, scale);
                } else if (kind === "cockpit") {
                    atlas.blit(ctx, "cockpit_door", px, py, scale);
                }
            }
        }

        // ---- the overhead bins, on the hull rather than on the seats -----------------------
        // They used to be a nine-pixel lid drawn over the top of row A and the bottom of row F,
        // in the hull's own grey, which made the wall look like it was eating the two outboard
        // seats in every row. They are six pixels now and they sit against the wall, where a
        // locker is.
        for (let x = 0; x < cabin.W; x++) {
            if (cabin.rowAt(x) === null) continue;
            for (const y of [1, 7]) {
                const side = y < cabin.AISLE_Y ? "left" : "right";
                const open = S.cabinFlags.binsOpen[cabin.binKey(x, side)];
                const py = y === 1 ? (T - 6 * scale) : ((cabin.H - 1) * T);
                atlas.blit(ctx, open ? "bin_open" : "bin_closed", x * T, py, scale);
            }
        }

        drawZones(ctx, S, T, t);

        // ---- the trolley --------------------------------------------------------------------
        // Two hundred kilos of duty free, creeping aft one row at a time, and creeping is what it
        // has to look like: it is the biggest thing in the aisle and the player is planning round
        // where it will be.
        if (S.cabinFlags.cartOut) {
            const cart = drawnAt("cart", S.cabinFlags.cartX, cabin.AISLE_Y, dt);
            atlas.blit(ctx, "drink_cart", pixels(cart.x, scale), pixels(cart.y, scale), scale);
        }

        // ---- fire, under the people ---------------------------------------------------------
        // A burning tile burns edge to edge from the first stage, and a seat that is on fire is
        // drawn as a seat that is on fire rather than a fire on top of a seat. It goes under the
        // people, because the people are what you click, and a person you cannot see for the
        // flames is a person you cannot click. Every tile flickers on its own phase, so the
        // cabin never pulses as one.
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const i = cabin.idx(x, y);
                const name = fireSpriteAt(S, x, y);
                if (!name) continue;
                const flick = 0.84 + 0.16 * Math.sin(t * 0.011 + i * 1.7);
                atlas.blitAlpha(ctx, name, x * T, y * T, scale, flick);
            }
        }

        // ---- everything you could put a hand on without moving ------------------------------
        // Arm's reach is a rule the player is subject to on every single turn and could not see
        // until now. It is drawn under the people so it never gets in the way of a face.
        if (opts.showReach !== false && !S.clock.landed) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = "rgba(255,213,74,0.34)";
            ctx.lineWidth = Math.max(1, scale * 0.5);
            for (const [rx, ry] of [[P.x, P.y]].concat(cabin.neighbours(P.x, P.y))) {
                if (cabin.solid(rx, ry)) continue;
                ctx.strokeRect(rx * T + scale, ry * T + scale, T - 2 * scale, T - 2 * scale);
            }
            ctx.restore();
        }

        // ---- the way you came ---------------------------------------------------------------
        drawTrail(ctx, opts.trail, T, scale);

        // ---- people --------------------------------------------------------------------------
        //
        // Several people end up on one tile all the time - the floor in front of a door is one
        // square of carpet and a busy flight puts a dozen people on it - so a stack fans out
        // rather than hiding under itself, and anything over two says how many. Where somebody is
        // drawn chases where they are, fan and all, so being moved looks like being moved.
        const stacks = {};
        for (const p of S.pax) {
            if (p.state === "gone") continue;
            if (p.state === "carried") {
                // In your arms: they go where you go, so that when they are put down they come
                // out of your arms and not out of the seat you took them from.
                rideWith("p:" + p.id, youAt);
                continue;
            }
            const key = p.x + "," + p.y;
            const n = stacks[key] = (stacks[key] || 0) + 1;
            const [dx, dy] = FAN[Math.min(FAN.length - 1, n - 1)];
            const spot = drawnAt("p:" + p.id, p.x + dx / TILE, p.y + dy / TILE, dt);
            const px = pixels(spot.x, scale), py = pixels(spot.y, scale);
            const dead = p.state === "dead";
            // Somebody in the aisle, or somebody frightened, does not hold still.
            const jitter = (!dead && (p.state === "aisle" || p.panic > 70))
                ? Math.round(Math.sin(t * 0.008 + p.n) * scale) : 0;
            const pal = dead ? ashenOf(p) : paletteOf(p);
            atlas.blitAlpha(ctx, faceOf(p), px + jitter, py, scale, dead ? 0.72 : 1, pal);
            if (p.masked) atlas.blitAlpha(ctx, "mask_on", px + jitter, py, scale, 0.95);
            if (dead) atlas.blitAlpha(ctx, "mark_lost", px, py, scale, 0.5);
            if (p.helper) {
                // A green bar under the feet of everybody who is working with you. Helpers are
                // the only thing in this game that scales and the only thing worth counting.
                ctx.save();
                ctx.globalAlpha = 0.75;
                ctx.fillStyle = "#5fd67a";
                ctx.fillRect(px + 3 * scale, py + T - 2 * scale, T - 6 * scale, 2 * scale);
                ctx.restore();
            }
        }
        ctx.save();
        const cs = Math.round(T * TEXT.count), cbox = Math.round(cs * 1.4);
        ctx.font = "700 " + cs + "px ui-monospace, monospace";
        ctx.textAlign = "center";
        for (const key in stacks) {
            if (stacks[key] < 3) continue;
            const [sx, sy] = key.split(",");
            const bx = sx * T + T - cbox, by = sy * T + T - cbox;
            ctx.fillStyle = "rgba(16,19,24,0.9)";
            ctx.fillRect(bx, by, cbox, cbox);
            ctx.fillStyle = "#dfe4ec";
            ctx.fillText(String(stacks[key]), bx + cbox / 2, by + cbox * 0.78);
        }
        ctx.restore();

        // ---- crew ---------------------------------------------------------------------------
        // The crew wear the procedure. They are excellent and calm through the first two phases,
        // which is exactly the problem, and they stop being calm at the same moment they start
        // being right.
        const crewFace = S.crewPhase >= 4 ? "pax_afraid" : S.crewPhase >= 2 ? "pax_worried" : "pax";
        for (const c of S.crew) {
            const spot = drawnAt("c:" + c.id, c.x, c.y, dt);
            atlas.blit(ctx, crewFace, pixels(spot.x, scale), pixels(spot.y, scale), scale,
                       paletteOf(c));
        }

        // ---- you ----------------------------------------------------------------------------
        const ppx = pixels(youAt.x, scale), ppy = pixels(youAt.y, scale);
        drawYou(ctx, S, ppx, ppy, scale, 1, 0.55 + 0.45 * Math.abs(Math.sin(t * 0.004)));

        // ---- smoke, over everything, because that is what it does ---------------------------
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const v = f.smoke[cabin.idx(x, y)];
                const name = PRS.fire.smokeSprite(v);
                if (!name) continue;
                const a = clamp01(v / 90) * 0.82;
                const drift = Math.round(Math.sin(t * 0.0016 + x * 0.4 + y) * scale);
                atlas.blitAlpha(ctx, name, x * T + drift, y * T, scale, a);
            }
        }

        // ---- fire, again, through the smoke ------------------------------------------------
        // A fire behind smoke is a glow, not nothing. Without this pass the middle of the cabin
        // is a flat grey rectangle by minute six and the player cannot see the thing the whole
        // game is about.
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const i = cabin.idx(x, y);
                if (f.intensity[i] <= 4) continue;
                const behind = clamp01(f.smoke[i] / 70);
                if (behind < 0.15) continue;
                const name = fireSpriteAt(S, x, y);
                if (!name) continue;
                atlas.blitAlpha(ctx, name, x * T, y * T, scale,
                                behind * (0.4 + 0.2 * Math.sin(t * 0.009 + i)));
            }
        }

        // ---- you, again, over the smoke ----------------------------------------------------
        // Not a cheat: the smoke does everything to you it does to everybody, and this is the
        // interface refusing to lose the player in it.
        drawYou(ctx, S, ppx, ppy, scale, 0.9, 1);
        {
            // A chevron over your head, so a glance finds you at any zoom.
            const cx = ppx + T / 2, cy = ppy - 3 * scale;
            ctx.save();
            ctx.fillStyle = "#ffd54a";
            ctx.beginPath();
            ctx.moveTo(cx, cy + 3 * scale);
            ctx.lineTo(cx - 3 * scale, cy - 2 * scale);
            ctx.lineTo(cx + 3 * scale, cy - 2 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        drawPlan(ctx, S, opts, T, scale, t);
        // The thing the card is open on. Steady and white, so it reads as "selected" rather than
        // as one more thing the pointer is proposing. A person gets the brackets round their
        // body; the fire gets them round the tile, because the fire is the tile.
        if (opts.selected && cabin.inBounds(opts.selected.x, opts.selected.y)) {
            if (opts.selected.box) {
                boxBracket(ctx, opts.selected.x, opts.selected.y, opts.selected.box, T, scale,
                           "#ffffff", 0.9);
            } else {
                bracket(ctx, opts.selected.x, opts.selected.y, T, scale, "#ffffff", 0.9);
            }
        }
        drawHover(ctx, S, opts, T, scale, t);
        drawLabels(ctx, S, T, scale, opts);
        drawFx(ctx, T, scale, t);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawVeil(ctx, S, t);
    }

    /**
     * What a burning tile is drawn with. A seat that is alight is `seat_{pos}_fire_N`, the seat
     * tile for its place in the bank with the fire in it; anything else is `fire_N`, in one of
     * two orientations by tile so a row of them is not a row of stamps. Embers are embers.
     * tools/render_frame.py follows the same rule.
     */
    function fireSpriteAt(S, x, y) {
        const base = PRS.fire.fireSprite(S.fire.intensity[cabin.idx(x, y)]);
        if (!base) return null;
        if (base.indexOf("fire_") !== 0) return base;
        if (cabin.kindAt(x, y) === "seat") return "seat_" + cabin.seatPos(y) + "_" + base;
        return base + (((x + y) & 1) ? "b" : "");
    }

    // ------------------------------------------------------------------------------- zones ---

    /**
     * The floor by the doors at each end, and what the air on it is like right now.
     *
     * It is where people get put down, because the door is there and the fire is not, and it is
     * not safe. It is tinted by what is actually in it - green while the air is clean, amber as
     * the smoke arrives, red once the fire is in it - and the label changes with it.
     */
    function zoneAir(S, zx) {
        let smoke = 0, fire = 0;
        for (let y = 1; y < cabin.H - 1; y++) {
            const i = cabin.idx(zx, y);
            smoke = Math.max(smoke, S.fire.smoke[i]);
            fire = Math.max(fire, S.fire.intensity[i]);
        }
        return { smoke: smoke, fire: fire, bad: clamp01(smoke / 70 + fire / 30) };
    }

    const ZONE_TINT = ["#5fd67a", "#e8c53a", "#d4483a"];

    // The two ends of the aeroplane. The overwing exit row is drawn as what it is - a clear
    // column of floor with a door at each end - and it is not a zone, so it is not painted.
    const ZONES = [cabin.FWD_GALLEY_X, cabin.FWD_CROSS_X, cabin.AFT_CROSS_X, cabin.AFT_GALLEY_X];

    function drawZones(ctx, S, T, t) {
        for (const zx of ZONES) {
            const air = zoneAir(S, zx);
            const tier = air.bad > 0.62 ? 2 : air.bad > 0.24 ? 1 : 0;
            ctx.save();
            ctx.globalAlpha = 0.16 + (tier ? 0.06 * Math.abs(Math.sin(t * 0.004)) : 0);
            ctx.fillStyle = ZONE_TINT[tier];
            ctx.fillRect(zx * T, T, T, (cabin.H - 2) * T);
            ctx.restore();
        }
    }

    // -------------------------------------------------------------------------------- plan ---

    /**
     * What the thing under the mouse would do, drawn on the aeroplane before it is done.
     *
     * The action list is the game and the list is words. This is the other half of the sentence:
     * hover "Carry Odette Ruus forward" and Odette lights up, at 23E, at the far end of a cabin
     * you have not walked yet. Nothing here changes the world; it is the same route and the same
     * target the action will use, asked a frame early.
     */
    function drawPlan(ctx, S, opts, T, scale, t) {
        const plan = opts.plan;
        if (!plan) return;
        const beat = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.006));
        const colour = plan.danger === "bad" ? "#d4483a"
                     : plan.danger === "good" ? "#5fd67a" : "#ffd54a";

        if (plan.path && plan.path.length) {
            ctx.save();
            ctx.strokeStyle = colour;
            ctx.globalAlpha = 0.5 * beat + 0.3;
            ctx.lineWidth = Math.max(1, scale);
            ctx.setLineDash([scale * 2, scale * 3]);
            ctx.lineDashOffset = -(t * 0.02) % (scale * 5);
            ctx.beginPath();
            ctx.moveTo(S.player.x * T + T / 2, S.player.y * T + T / 2);
            for (const [px, py] of plan.path) ctx.lineTo(px * T + T / 2, py * T + T / 2);
            ctx.stroke();
            ctx.restore();
        }

        // A line from one person to another: a helper and the person you are pointing them at.
        if (plan.link) {
            ctx.save();
            ctx.strokeStyle = colour;
            ctx.globalAlpha = 0.65 * beat;
            ctx.lineWidth = Math.max(1, scale);
            ctx.setLineDash([scale, scale * 2]);
            ctx.beginPath();
            ctx.moveTo(plan.link[0] * T + T / 2, plan.link[1] * T + T / 2);
            ctx.lineTo(plan.link[2] * T + T / 2, plan.link[3] * T + T / 2);
            ctx.stroke();
            ctx.restore();
        }

        for (const tile of plan.tiles || []) bracket(ctx, tile[0], tile[1], T, scale, colour, beat);

        if (plan.focus) {
            bracket(ctx, plan.focus.x, plan.focus.y, T, scale, colour, 1);
            if (plan.cost) {
                priceTag(ctx, plan.focus.x, plan.focus.y, T, scale,
                         PRS.util.costLabel(plan.cost), colour);
            }
        }
    }

    /** Four corner brackets around a tile. A box would hide the thing it is pointing at. */
    function bracket(ctx, x, y, T, scale, colour, alpha) {
        corners(ctx, x * T, y * T, T, T, scale, colour, alpha);
    }

    /** The same brackets, round a body rather than a tile: `box` is in sprite pixels. */
    function boxBracket(ctx, x, y, box, T, scale, colour, alpha) {
        const pad = scale;
        corners(ctx, x * T + box[0] * scale - pad, y * T + box[1] * scale - pad,
                (box[2] - box[0]) * scale + 2 * pad, (box[3] - box[1]) * scale + 2 * pad,
                scale, colour, alpha);
    }

    function corners(ctx, px, py, w, h, scale, colour, alpha) {
        const n = Math.round(Math.min(w, h) * 0.24);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = colour;
        ctx.lineWidth = Math.max(1, scale);
        const o = scale * 0.5;
        ctx.beginPath();
        ctx.moveTo(px + o, py + n);       ctx.lineTo(px + o, py + o);      ctx.lineTo(px + n, py + o);
        ctx.moveTo(px + w - n, py + o);   ctx.lineTo(px + w - o, py + o);  ctx.lineTo(px + w - o, py + n);
        ctx.moveTo(px + w - o, py + h - n); ctx.lineTo(px + w - o, py + h - o); ctx.lineTo(px + w - n, py + h - o);
        ctx.moveTo(px + n, py + h - o);   ctx.lineTo(px + o, py + h - o);  ctx.lineTo(px + o, py + h - n);
        ctx.stroke();
        ctx.restore();
    }

    /** The price, on the tile, so the cost of a thing is where the thing is. */
    function priceTag(ctx, x, y, T, scale, label, colour) {
        const hx = x * T, hy = y * T;
        const size = Math.round(T * TEXT.price), box = Math.round(size * 1.34);
        ctx.save();
        ctx.font = "700 " + size + "px ui-monospace, monospace";
        const w = ctx.measureText(label).width + size * 0.5;
        const bx = Math.max(0, Math.min(cabin.W * T - w, hx + T / 2 - w / 2));
        const by = hy - box < 0 ? hy + T : hy - box;
        ctx.fillStyle = "rgba(22,25,31,0.94)";
        ctx.fillRect(bx, by, w, box);
        ctx.strokeStyle = colour;
        ctx.lineWidth = Math.max(1, scale * 0.34);
        ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, box - 1);
        ctx.fillStyle = colour;
        ctx.textAlign = "center";
        ctx.fillText(label, bx + w / 2, by + box * 0.76);
        ctx.restore();
    }

    // ------------------------------------------------------------------------------- hover ---

    /**
     * What is under the pointer, lit. There are three things you can click - a person, the fire,
     * yourself - and the light says which one this click would be: a halo in the shape of the
     * person, a halo in the shape of the fire, and the floor gets the walk drawn on it with the
     * price. `opts.target` is the thing hotspots.js says the click would open, so the light and
     * the click cannot disagree.
     *
     * A walk you are proposing is gold and costs seconds. A walk back along your own trail is
     * green and gives them back, and it is the same line drawn the other way, so the two can
     * never be taken for one another.
     */
    function drawHover(ctx, S, opts, T, scale, t) {
        const hr = opts.hoverRoute;
        const tg = opts.target;
        const back = !!(hr && hr.back);
        const colour = back ? "#5fd67a" : "#ffd54a";
        if (hr && hr.path.length && (!tg || tg.kind === "walk")) {
            ctx.save();
            ctx.strokeStyle = back ? "rgba(95,214,122,0.85)" : "rgba(255,213,74,0.75)";
            ctx.lineWidth = Math.max(1, scale);
            ctx.setLineDash([scale * 2, scale * 3]);
            ctx.beginPath();
            ctx.moveTo(S.player.x * T + T / 2, S.player.y * T + T / 2);
            for (const [px, py] of hr.path) ctx.lineTo(px * T + T / 2, py * T + T / 2);
            ctx.stroke();
            ctx.restore();
        }
        if (!opts.hover || !cabin.inBounds(opts.hover.x, opts.hover.y)) return;
        const hx = opts.hover.x * T, hy = opts.hover.y * T;

        if (tg && tg.fig) {
            // A body: one pixel of light all the way round it, in its own shape.
            const f = tg.fig;
            halo(ctx, f.sprite, hx + f.dx * scale, hy + f.dy * scale, scale, "#ffffff",
                 HALO_ALPHA.person);
            return;
        }
        if (tg && tg.kind === "fire") {
            // The fire: the same light, in the shape of the flames on this tile. Embers are
            // too sparse to have a shape, so they get the tile.
            const name = fireSpriteAt(S, opts.hover.x, opts.hover.y);
            if (name && name !== "ember") {
                halo(ctx, name, hx, hy, scale, "#fff4b0", HALO_ALPHA.fire);
            } else {
                ctx.save();
                ctx.strokeStyle = "#fff4b0";
                ctx.globalAlpha = HALO_ALPHA.fire;
                ctx.lineWidth = Math.max(1, scale);
                ctx.strokeRect(hx + scale * 0.5, hy + scale * 0.5, T - scale, T - scale);
                ctx.restore();
            }
            return;
        }
        if (tg && tg.kind === "none") return;
        // The floor: the tile, and the price of walking to it - or of having walked from it.
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = Math.max(1, scale);
        ctx.strokeRect(hx + 0.5, hy + 0.5, T - 1, T - 1);
        ctx.restore();
        if (hr) {
            priceTag(ctx, opts.hover.x, opts.hover.y, T, scale,
                     (back ? "+" : "") + hr.cost + "s", colour);
        }
    }

    // ------------------------------------------------------------------------------ labels ---

    /**
     * The words drawn on the aeroplane, sized off the tile rather than off the sprite scale.
     *
     * The canvas is 1440 pixels wide and the column it sits in usually is not, so everything on
     * it arrives at the eye through a CSS downscale of a third or so. Text picked to look right
     * in the canvas is text nobody can read on the screen, which is what these were.
     */
    const TEXT = { place: 0.42, row: 0.44, seat: 0.46, price: 0.5, count: 0.4 };

    function drawLabels(ctx, S, T, scale, opts) {
        ctx.save();
        ctx.font = "700 " + Math.round(T * TEXT.place) + "px ui-monospace, monospace";
        ctx.textAlign = "center";
        const label = (text, x, y) => ctx.fillText(text, x * T + T / 2, y * T + T * 0.64);

        // The galleys are one tile wide and the word is not, so it is written down the column
        // the way it is written down the side of a galley.
        ctx.fillStyle = "rgba(20,32,36,0.8)";
        for (const [gx, gy] of [[cabin.FWD_GALLEY_X, 2], [cabin.FWD_GALLEY_X, 6],
                                [cabin.AFT_GALLEY_X, 2.5], [cabin.AFT_GALLEY_X, 5.5]]) {
            ctx.save();
            ctx.translate(gx * T + T * 0.64, gy * T + T / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(X("GALLEY", "written down the side of a galley, one short word"), 0, 0);
            ctx.restore();
        }
        const lav = X("LAV", "written across a lavatory door, three letters at most");
        label(lav, cabin.AFT_GALLEY_X, 1);
        label(lav, cabin.AFT_GALLEY_X, 7);

        // The floor by the doors at each end says what the air is like on it, and nothing more.
        // It is not a promise and it stops being good news the moment the smoke gets there.
        for (const zx of [cabin.FWD_CROSS_X, cabin.AFT_CROSS_X]) {
            const air = zoneAir(S, zx);
            const tier = air.bad > 0.62 ? 2 : air.bad > 0.24 ? 1 : 0;
            ctx.fillStyle = ["rgba(120,214,140,0.95)", "rgba(232,197,58,0.95)",
                             "rgba(212,72,58,1)"][tier];
            // Painted on one tile of floor: five letters is the room there is.
            const word = [X("CLEAR", "the air by a door, painted on the floor"),
                          X("SMOKE", "the air by a door, painted on the floor"),
                          X("GONE", "the air by a door, painted on the floor")][tier];
            label(word, zx, 2);
            label(word, zx, 6);
        }
        ctx.restore();

        if (opts.rowNumbers === false) return;

        // Row numbers down the aisle, and the seat letters on the bulkheads at either end, so
        // that "the locker above 14C" is a place on the picture and not a piece of trivia.
        ctx.save();
        ctx.fillStyle = "rgba(210,218,230,0.8)";
        ctx.font = "700 " + Math.round(T * TEXT.row) + "px ui-monospace, monospace";
        ctx.textAlign = "center";
        for (let x = 0; x < cabin.W; x++) {
            const row = cabin.rowAt(x);
            if (row === null || row % 2) continue;
            ctx.fillText(String(row), x * T + T / 2, cabin.AISLE_Y * T + T * 0.68);
        }
        ctx.font = "700 " + Math.round(T * TEXT.seat) + "px ui-monospace, monospace";
        ctx.fillStyle = "rgba(210,218,230,0.7)";
        for (let y = 1; y <= 7; y++) {
            const letter = cabin.seatLetter(y);
            if (!letter) continue;
            ctx.fillText(letter, T / 2, y * T + T * 0.68);
            ctx.fillText(letter, (cabin.W - 1) * T + T / 2, y * T + T * 0.68);
        }
        ctx.restore();
    }

    // ---------------------------------------------------------------------------------- fx ---

    function drawFx(ctx, T, scale, t) {
        if (!fx.items.length) return;
        const keep = [];
        ctx.save();
        ctx.textAlign = "center";
        for (const it of fx.items) {
            const k = (t - it.born) / it.ms;
            if (k >= 1) continue;
            keep.push(it);
            if (it.kind === "say") {
                const ease = 1 - Math.pow(1 - k, 3);
                const x = it.x * T + T / 2;
                const y = it.y * T + T * 0.3 - ease * it.rise * scale;
                ctx.globalAlpha = k < 0.12 ? k / 0.12 : Math.min(1, (1 - k) * 3.2);
                ctx.font = "700 " + Math.round(T * it.size) + "px ui-monospace, monospace";
                ctx.lineWidth = Math.max(2, scale * 1.2);
                ctx.strokeStyle = "rgba(12,14,18,0.92)";
                ctx.strokeText(it.text, x, y);
                ctx.fillStyle = it.colour;
                ctx.fillText(it.text, x, y);
            } else if (it.kind === "pulse") {
                const r = (0.34 + k * 0.9) * T;
                ctx.globalAlpha = (1 - k) * 0.85;
                ctx.strokeStyle = it.colour;
                ctx.lineWidth = Math.max(1, scale * (1 - k) * 1.6);
                ctx.beginPath();
                ctx.arc(it.x * T + T / 2, it.y * T + T / 2, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();
        fx.items = keep;
    }

    /**
     * The two things laid over the finished picture: whatever just happened to you, and the air
     * you are personally in. The second one is the honest half - the smoke does the same thing to
     * you it does to everybody, and this is the only place the interface admits it.
     */
    function drawVeil(ctx, S, t) {
        const w = ctx.canvas.width, h = ctx.canvas.height;
        const P = S.player;
        const dose = clamp01(P.smokeDose / 100);
        if (dose > 0.12) {
            const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.62);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(1, "rgba(14,10,8," + (dose * 0.72).toFixed(3) + ")");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }
        if (fx.flash) {
            const k = (t - fx.flash.born) / fx.flash.ms;
            if (k >= 1) { fx.flash = null; }
            else {
                ctx.save();
                ctx.globalAlpha = (1 - k) * fx.flash.strength;
                ctx.fillStyle = fx.flash.colour;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
            }
        }
    }

    /**
     * A small static drawing of the cabin for the report: who was where at touchdown.
     *
     * `focus` is the tile the manifest is pointing at: the one seat in two hundred and seventy
     * that somebody is asking about, lit from under the dot that is already there and boxed.
     */
    function drawSummary(ctx, S, scale, focus) {
        const T = TILE * scale;
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#1a1d23";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const kind = cabin.kindAt(x, y);
                if (kind === "wall" || kind === "bulkhead") continue;
                const burnt = S.fire.burnt[cabin.idx(x, y)];
                ctx.fillStyle = burnt > 0.5 ? "#2a211c" : burnt > 0.15 ? "#2f2a26" : "#272c36";
                ctx.fillRect(x * T, y * T, T - 1, T - 1);
            }
        }
        const colours = { unhurt: "#5fd67a", treated: "#e8c53a", serious: "#e08a2a", lost: "#d4483a" };
        for (const p of S.pax) {
            ctx.fillStyle = colours[p.outcome] || "#888";
            ctx.fillRect(p.x * T + 1, p.y * T + 1, T - 3, T - 3);
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(S.player.x * T + 2, S.player.y * T + 2, T - 5, T - 5);
        if (!focus) return;
        // A box round the tile, drawn as four bars because a one-pixel stroke on a canvas the
        // page then scales up lands between pixels and goes soft.
        ctx.fillStyle = "#ffd54a";
        const bx = focus.x * T - 2, by = focus.y * T - 2, bw = T + 3, bh = T + 3;
        ctx.fillRect(bx, by, bw, 1);
        ctx.fillRect(bx, by + bh - 1, bw, 1);
        ctx.fillRect(bx, by, 1, bh);
        ctx.fillRect(bx + bw - 1, by, 1, bh);
    }

    PRS.render = {
        TILE, fit, tileAt, draw, drawSummary,
        paletteOf, faceOf, zoneAir, fireSpriteAt,
        spriteBox, figures, figureAt, halo,
        fx: { say, pulse, flash: flashOver, shake, clear: clearFx },
        // Where everybody is drawn, which is not where they are. The play screen empties it at
        // boarding and hands it your own walks; everybody else chases without being asked.
        motion: { follow: follow, reset: resetMotion, route: aisleRoute },
    };
})(window);
