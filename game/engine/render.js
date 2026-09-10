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

    /** Which tile the mouse is over, or null. Works at any CSS size the canvas ends up. */
    function tileAt(canvas, scale, clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        const x = Math.floor((clientX - r.left) / (r.width / cabin.W));
        const y = Math.floor((clientY - r.top) / (r.height / cabin.H));
        if (!cabin.inBounds(x, y)) return null;
        return { x: x, y: y };
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
        const fear = P.panic + P.smokeDose * 0.55;
        if (fear > 62) return "pax_afraid";
        if (fear > 27) return "pax_worried";
        return "pax";
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

                if (kind === "wall" || kind === "bulkhead") {
                    atlas.blit(ctx, (y === 0 || y === cabin.H - 1) && cabin.rowAt(x) !== null
                                    ? "window" : "wall", px, py, scale);
                    continue;
                }
                atlas.blit(ctx, y === cabin.AISLE_Y ? "floor_aisle" : "floor_carpet", px, py, scale);

                if (kind === "seat") {
                    const burnt = f.burnt[i];
                    const name = burnt > 0.6 ? "seat_burnt" : burnt > 0.2 ? "seat_scorched" : "seat";
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
        if (S.cabinFlags.cartOut) {
            atlas.blit(ctx, "drink_cart", S.cabinFlags.cartX * T, cabin.AISLE_Y * T, scale);
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

        // ---- people --------------------------------------------------------------------------
        //
        // Several people end up on one tile all the time - a safe zone is one square of carpet
        // and twelve souls secured is twelve people standing on it - so a stack fans out rather
        // than hiding under itself, and anything over two says how many.
        const stacks = {};
        const ticked = {};
        for (const p of S.pax) {
            if (p.state === "gone" || p.state === "carried") continue;   // carried ride on you
            const key = p.x + "," + p.y;
            const n = stacks[key] = (stacks[key] || 0) + 1;
            const [dx, dy] = FAN[Math.min(FAN.length - 1, n - 1)];
            const px = p.x * T + dx * scale, py = p.y * T + dy * scale;
            const dead = p.state === "dead";
            // Somebody in the aisle, or somebody frightened, does not hold still.
            const jitter = (!dead && (p.state === "aisle" || p.panic > 70))
                ? Math.round(Math.sin(t * 0.008 + p.n) * scale) : 0;
            const pal = dead ? ashenOf(p) : paletteOf(p);
            atlas.blitAlpha(ctx, faceOf(p), px + jitter, py, scale, dead ? 0.72 : 1, pal);
            if (p.masked) atlas.blitAlpha(ctx, "mask_on", px + jitter, py, scale, 0.95);
            if (dead) atlas.blitAlpha(ctx, "mark_lost", px, py, scale, 0.5);
            // One tick per tile, not one per person: a safe zone with nine people in it wants to
            // read as a tile that is ticked, and nine ticks on one square is a green scribble.
            if (p.state === "secured" && !ticked[key]) {
                ticked[key] = true;
                atlas.blitAlpha(ctx, "mark_saved", p.x * T, p.y * T, scale, 0.85);
            }
            if (p.helper) {
                // A green bar under the feet of everybody who is working with you. Helpers are
                // the only thing in this game that scales and the only thing worth counting.
                ctx.save();
                ctx.globalAlpha = 0.75;
                ctx.fillStyle = "#5fd67a";
                ctx.fillRect(px + 2 * scale, py + T - 3 * scale, T - 4 * scale, 2 * scale);
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
            atlas.blit(ctx, crewFace, c.x * T, c.y * T, scale, paletteOf(c));
        }

        // ---- you ----------------------------------------------------------------------------
        const at = opts.playerAt || P;
        const ppx = at.x * T, ppy = at.y * T;
        const you = paletteOf(S.character);
        atlas.blitAlpha(ctx, "player_ring", ppx, ppy, scale,
                        0.55 + 0.45 * Math.abs(Math.sin(t * 0.004)));
        atlas.blit(ctx, playerFace(S), ppx, ppy, scale, you);
        if (PRS.state.wearing(S, "hood")) atlas.blitAlpha(ctx, "mask_on", ppx, ppy, scale, 1);
        // Anyone in your arms rides one pixel up and to the side.
        let off = 0;
        for (const id of P.carrying) {
            const q = PRS.state.paxById(S, id);
            if (!q) continue;
            atlas.blitAlpha(ctx, q.state === "down" ? "pax_down" : "pax_low",
                            ppx + (3 + off) * scale, ppy - 2 * scale, scale, 0.95, paletteOf(q));
            off += 3;
        }
        if (P.dragging) {
            const q = PRS.state.paxById(S, P.dragging);
            if (q) atlas.blitAlpha(ctx, "pax_down", ppx - 4 * scale, ppy + 2 * scale, scale, 0.9,
                                   paletteOf(q));
        }

        // ---- fire ----------------------------------------------------------------------------
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const i = cabin.idx(x, y);
                const v = f.intensity[i];
                if (v <= 0.5) continue;
                const name = PRS.fire.fireSprite(v);
                if (!name) continue;
                // Every tile flickers on its own phase, so the cabin never pulses as one.
                const flick = 0.78 + 0.22 * Math.sin(t * 0.011 + i * 1.7);
                const wob = Math.round(Math.sin(t * 0.013 + i) * 0.5) * scale;
                atlas.blitAlpha(ctx, name, x * T + wob, y * T, scale, flick);
            }
        }

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
                const v = f.intensity[i];
                if (v <= 4) continue;
                const behind = clamp01(f.smoke[i] / 70);
                if (behind < 0.15) continue;
                const name = PRS.fire.fireSprite(v);
                if (!name) continue;
                atlas.blitAlpha(ctx, name, x * T, y * T, scale,
                                behind * (0.4 + 0.2 * Math.sin(t * 0.009 + i)));
            }
        }

        // ---- you, again, over the smoke ----------------------------------------------------
        // Not a cheat: the smoke does everything to you it does to everybody, and this is the
        // interface refusing to lose the player in it.
        atlas.blitAlpha(ctx, "player_ring", ppx, ppy, scale, 1);
        atlas.blitAlpha(ctx, playerFace(S), ppx, ppy, scale, 0.9, you);
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
        // Anybody secured keeps their tick over the smoke too, because the tick is the score.
        for (const key in ticked) {
            const [sx, sy] = key.split(",");
            atlas.blitAlpha(ctx, "mark_saved", sx * T, sy * T, scale, 0.95);
        }

        drawPlan(ctx, S, opts, T, scale, t);
        // The thing the card is open on. Steady and white, so it reads as "selected" rather than
        // as one more thing the pointer is proposing.
        if (opts.selected && cabin.inBounds(opts.selected.x, opts.selected.y)) {
            bracket(ctx, opts.selected.x, opts.selected.y, T, scale, "#ffffff", 0.9);
        }
        drawHover(ctx, S, opts, T, scale);
        drawLabels(ctx, S, T, scale, opts);
        drawFx(ctx, T, scale, t);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawVeil(ctx, S, t);
    }

    // ------------------------------------------------------------------------------- zones ---

    /**
     * The two places worth carrying somebody to, and how true that still is.
     *
     * Both zones are galleys: steel, doors, crew, and the furthest points in the aeroplane from
     * the seat of the fire. Neither is painted with a promise. Every zone is tinted by what is
     * actually in it right now - green while the air is clean, amber as the smoke arrives, red
     * once the fire is in it - and the label changes with it.
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
        const px = x * T, py = y * T, n = Math.round(T * 0.24);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = colour;
        ctx.lineWidth = Math.max(1, scale);
        const o = scale * 0.5;
        ctx.beginPath();
        ctx.moveTo(px + o, py + n);       ctx.lineTo(px + o, py + o);      ctx.lineTo(px + n, py + o);
        ctx.moveTo(px + T - n, py + o);   ctx.lineTo(px + T - o, py + o);  ctx.lineTo(px + T - o, py + n);
        ctx.moveTo(px + T - o, py + T - n); ctx.lineTo(px + T - o, py + T - o); ctx.lineTo(px + T - n, py + T - o);
        ctx.moveTo(px + n, py + T - o);   ctx.lineTo(px + o, py + T - o);  ctx.lineTo(px + o, py + T - n);
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

    function drawHover(ctx, S, opts, T, scale) {
        const hr = opts.hoverRoute;
        if (hr && hr.path.length) {
            ctx.save();
            ctx.strokeStyle = "rgba(255,213,74,0.75)";
            ctx.lineWidth = Math.max(1, scale);
            ctx.setLineDash([scale * 2, scale * 3]);
            ctx.beginPath();
            ctx.moveTo(S.player.x * T + T / 2, S.player.y * T + T / 2);
            for (const [px, py] of hr.path) ctx.lineTo(px * T + T / 2, py * T + T / 2);
            ctx.stroke();
            ctx.restore();
        }
        if (opts.hover && cabin.inBounds(opts.hover.x, opts.hover.y)) {
            const hx = opts.hover.x * T, hy = opts.hover.y * T;
            ctx.save();
            ctx.strokeStyle = "#ffd54a";
            ctx.lineWidth = Math.max(1, scale);
            ctx.strokeRect(hx + 0.5, hy + 0.5, T - 1, T - 1);
            ctx.restore();
            if (hr) priceTag(ctx, opts.hover.x, opts.hover.y, T, scale, hr.cost + "s", "#ffd54a");
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
            ctx.fillText("GALLEY", 0, 0);
            ctx.restore();
        }
        label("LAV", cabin.AFT_GALLEY_X, 1);
        label("LAV", cabin.AFT_GALLEY_X, 7);

        // The two galley ends say SAFE, and stop saying anything reassuring once the smoke
        // arrives. The overwing row says nothing: it is a pair of doors two rows from the locker
        // that is burning, and it is not a zone.
        for (const zx of [cabin.FWD_CROSS_X, cabin.AFT_CROSS_X]) {
            const air = zoneAir(S, zx);
            const tier = air.bad > 0.62 ? 2 : air.bad > 0.24 ? 1 : 0;
            ctx.fillStyle = ["rgba(120,214,140,0.95)", "rgba(232,197,58,0.95)",
                             "rgba(212,72,58,1)"][tier];
            label(["SAFE", "SMOKE", "GONE"][tier], zx, 2);
            label(["SAFE", "SMOKE", "GONE"][tier], zx, 6);
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

    /** A small static drawing of the cabin for the report: who was where at touchdown. */
    function drawSummary(ctx, S, scale) {
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
    }

    PRS.render = {
        TILE, fit, tileAt, draw, drawSummary,
        paletteOf, faceOf, zoneAir,
        fx: { say, pulse, flash: flashOver, shake, clear: clearFx },
    };
})(window);
