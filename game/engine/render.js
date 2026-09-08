// Drawing the cabin. Nose to the left, tail to the right, nine cells deep, every cell a 16x16
// sprite at whatever integer scale fits the canvas.
//
// The order matters and it is the order a photograph of a cabin fire has: floor, then the fixed
// aeroplane, then the people, then the fire, then the smoke over all of it, then the interface
// on top of the smoke because the player has to be able to read the interface.
//
// There is one animation clock and it drives everything that flickers, so the fire in row 14 and
// the fire in row 16 are never in step, which is the difference between a fire and a gif.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const atlas = PRS.atlas;
    const clamp01 = PRS.util.clamp01;

    const TILE = 16;

    function fit(canvas) {
        const wantW = cabin.W * TILE;
        const wantH = cabin.H * TILE;
        const box = canvas.parentElement.getBoundingClientRect();
        const scale = Math.max(1, Math.floor(Math.min(box.width / wantW,
                                                      (box.height || 400) / wantH)));
        canvas.width = wantW * scale;
        canvas.height = wantH * scale;
        canvas.style.width = (wantW * scale) + "px";
        canvas.style.height = (wantH * scale) + "px";
        return scale;
    }

    /** Which tile the mouse is over, or null. */
    function tileAt(canvas, scale, clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        const x = Math.floor((clientX - r.left) / (r.width / cabin.W));
        const y = Math.floor((clientY - r.top) / (r.height / cabin.H));
        if (!cabin.inBounds(x, y)) return null;
        return { x: x, y: y };
    }

    function draw(ctx, S, opts) {
        opts = opts || {};
        const scale = opts.scale || 2;
        const T = TILE * scale;
        const t = opts.time || 0;
        const f = S.fire;

        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#20242c";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

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

        // ---- the overhead bins, drawn as a lip over the top of each seat bank ---------------
        for (let x = 0; x < cabin.W; x++) {
            if (cabin.rowAt(x) === null) continue;
            for (const y of [1, 7]) {
                const side = y < cabin.AISLE_Y ? "left" : "right";
                const open = S.cabinFlags.binsOpen[cabin.binKey(x, side)];
                const py = y === 1 ? (y * T) : (y * T + T - 9 * scale);
                atlas.blitAlpha(ctx, open ? "bin_open" : "bin_closed", x * T, py, scale, 0.9);
            }
        }

        // ---- safe zones, marked so the player can see where "forward" means ----------------
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "#5fd67a";
        for (const zx of [cabin.FWD_GALLEY_X, cabin.FWD_CROSS_X, cabin.OVERWING_X,
                          cabin.AFT_CROSS_X, cabin.AFT_GALLEY_X]) {
            ctx.fillRect(zx * T, T, T, (cabin.H - 2) * T);
        }
        ctx.restore();

        // ---- the trolley --------------------------------------------------------------------
        if (S.cabinFlags.cartOut) {
            atlas.blit(ctx, "drink_cart", S.cabinFlags.cartX * T, cabin.AISLE_Y * T, scale);
        }

        // ---- people --------------------------------------------------------------------------
        for (const p of S.pax) {
            if (p.state === "dead" || p.state === "gone") continue;
            if (p.state === "carried") continue;   // drawn on the player
            const px = p.x * T, py = p.y * T;
            const down = p.state === "down";
            const jitter = (p.state === "aisle" || p.panic > 70)
                ? Math.round(Math.sin(t * 0.008 + p.n) * scale) : 0;
            atlas.blit(ctx, down ? "pax_down" : "pax", px + jitter, py, scale,
                       { h: p.hair, s: p.skin, c: p.shirt });
            if (p.masked) atlas.blitAlpha(ctx, "mask_on", px + jitter, py, scale, 0.95);
            if (p.state === "secured") atlas.blitAlpha(ctx, "mark_saved", px, py, scale, 0.85);
            if (p.helper) {
                ctx.save();
                ctx.globalAlpha = 0.75;
                ctx.fillStyle = "#5fd67a";
                ctx.fillRect(px + 2 * scale, py + T - 3 * scale, T - 4 * scale, 2 * scale);
                ctx.restore();
            }
        }

        // ---- crew ---------------------------------------------------------------------------
        for (const c of S.crew) {
            atlas.blit(ctx, c.sprite, c.x * T, c.y * T, scale,
                       { h: c.hair, s: c.skin, c: c.shirt });
        }

        // ---- you ----------------------------------------------------------------------------
        const P = S.player;
        const ppx = P.x * T, ppy = P.y * T;
        atlas.blitAlpha(ctx, "player_ring", ppx, ppy, scale,
                        0.55 + 0.45 * Math.abs(Math.sin(t * 0.004)));
        atlas.blit(ctx, P.crouching ? "pax_down" : "pax", ppx, ppy, scale,
                   { h: S.character.hair, s: S.character.skin, c: S.character.shirt });
        if (PRS.state.wearing(S, "hood")) atlas.blitAlpha(ctx, "mask_on", ppx, ppy, scale, 1);
        // Anyone in your arms rides one pixel up and to the side.
        let off = 0;
        for (const id of P.carrying) {
            const q = PRS.state.paxById(S, id);
            if (!q) continue;
            atlas.blitAlpha(ctx, "pax_down", ppx + (3 + off) * scale, ppy - 2 * scale, scale, 0.95,
                            { h: q.hair, s: q.skin, c: q.shirt });
            off += 3;
        }
        if (P.dragging) {
            const q = PRS.state.paxById(S, P.dragging);
            if (q) atlas.blitAlpha(ctx, "pax_down", ppx - 4 * scale, ppy + 2 * scale, scale, 0.9,
                                   { h: q.hair, s: q.skin, c: q.shirt });
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

        // ---- overlays ------------------------------------------------------------------------
        if (opts.hover && cabin.inBounds(opts.hover.x, opts.hover.y)) {
            ctx.save();
            ctx.strokeStyle = "#ffd54a";
            ctx.lineWidth = Math.max(1, scale);
            ctx.strokeRect(opts.hover.x * T + 0.5, opts.hover.y * T + 0.5, T - 1, T - 1);
            ctx.restore();
        }

        if (opts.rowNumbers !== false) {
            ctx.save();
            ctx.fillStyle = "rgba(200,208,220,0.55)";
            ctx.font = (5 * scale) + "px ui-monospace, monospace";
            ctx.textAlign = "center";
            for (let x = 0; x < cabin.W; x++) {
                const row = cabin.rowAt(x);
                if (row === null || row % 2) continue;
                ctx.fillText(String(row), x * T + T / 2, cabin.AISLE_Y * T + T * 0.68);
            }
            ctx.restore();
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

    PRS.render = { TILE, fit, tileAt, draw, drawSummary };
})(window);
