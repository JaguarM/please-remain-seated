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

    // A strip of canvas above the aeroplane, in tiles, where the state of the cabin is written.
    // It is part of the picture and not part of the aeroplane: nothing lives in it and no tile
    // is under it, so every coordinate in this file is still a cabin coordinate.
    //
    // Across the aeroplane it rides on the same canvas, because there is room for it there. Down
    // the aeroplane there is not - the picture is longer than the screen and scrolls, and a
    // readout that scrolls off the top is a readout nobody reads - so it goes onto a canvas of
    // its own and this is zero. `drawStatus` is exported for that reason and no other.
    const BAND = 1.5;

    /**
     * Which way up the aeroplane is.
     *
     * A cabin is thirty tiles by nine, which is a letterbox, and a phone is not. So on a narrow
     * screen the aeroplane is flown down the page instead of across it: the nose at the top, the
     * rows running away from you, the seat letters across. The simulation is not told. A seat is
     * still 14C, the fire is still at the tile it is at, and every coordinate in this file is
     * still a cabin coordinate - the turn is one rotation of the canvas, set once in `draw`, and
     * every line that draws a tile at `x * T` lands where it should without knowing why.
     *
     * What does not turn with it is a face and a word. A passenger rotated ninety degrees is a
     * passenger lying down, and a row number on its side is a row number nobody reads. Those go
     * through `upright`, which squares the canvas back up over one tile and then puts it back.
     */
    const view = { down: false, e: 0, f: 0 };

    /**
     * When the aeroplane is worth turning.
     *
     * `TURN_BELOW` is the width at which thirty tiles across stop being worth putting a thumb
     * on. It is a width and not a phone: a narrow window on a desktop gets the same aeroplane.
     *
     * `TURN_NEEDS` is the height it takes to make anything of the turn. A phone held sideways is
     * narrow by the first number and has no height at all, and turning that one would trade a
     * cabin that is a little small for a cabin seen through a letterbox on its end. It is also
     * the shape the aeroplane was drawn for, so sideways gets the aeroplane the way round it
     * has always been.
     */
    const TURN_BELOW = 900;
    const TURN_NEEDS = 560;

    function wantsTurn() {
        const w = global.innerWidth || 0, h = global.innerHeight || 0;
        return w > 0 && w < TURN_BELOW && h >= TURN_NEEDS;
    }

    /**
     * Turn the aeroplane down the page, or back across it; with nothing to say, ask the window.
     *
     * Which way up it is belongs to whoever is drawing, not to the renderer, because the two
     * places that draw a cabin want different answers: the play screen turns when the window is
     * narrow, and the aeroplane flying behind the title never turns at all - it is a background
     * with a mask cut for a letterbox, and a mask is not a thing that rotates. So both of them
     * say which they want before they fit and before they draw, and neither inherits the other's.
     */
    function turn(down) { view.down = down === undefined ? wantsTurn() : !!down; }

    function turned() { return view.down; }

    /** The picture, in tiles: what it is across and what it is down, the readout included. */
    function shape() {
        return view.down
            ? { across: cabin.H, down: cabin.W, band: 0 }
            : { across: cabin.W, down: cabin.H + BAND, band: BAND };
    }

    function fit(canvas, scale) {
        const s = scale || DRAW_SCALE;
        const box = shape();
        canvas.width = box.across * TILE * s;
        canvas.height = Math.round(box.down * TILE * s);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        // A fifteen-tile cabin stretched across a page meant for thirty is a cabin drawn at
        // twice the size of every sprite in it, and it does not fit down the page either. So
        // the canvas never renders wider than it actually is: a tile is a tile on every
        // aeroplane, and a short one is centred in the space rather than blown up to fill it.
        canvas.style.maxWidth = canvas.width + "px";
        return s;
    }

    /**
     * How the four numbers are laid out in the width they have been given, in tiles. Along the
     * top of a whole aeroplane there is room for four of them in a line. Above a turned one
     * there is a third of that width, and four cells in it are four words on top of each other,
     * so they go two and two and the strip is twice as deep.
     */
    function statusGrid(across) {
        return across >= 14 ? { cols: 4, rows: 1 } : { cols: 2, rows: 2 };
    }

    /**
     * How far through its procedure the crew are, as a fraction - counted against the phases
     * this aeroplane actually runs. On TN 447 that is all six. On CL 2231 it is two, and a bar
     * that sat at one sixth all flight would be saying the crew were about to do something.
     */
    function crewProgress(S) {
        const path = PRS.crew.path(S);
        let done = 0;
        for (const p of path) if (S.crewPhase >= p) done++;
        return (done + 1) / (path.length + 1);
    }

    /**
     * The middle of one of the two banks of seats, as a y in tiles: where a word painted across
     * the cabin goes. Three seats deep on a narrowbody and one on a turboprop, so it is asked
     * for rather than being the 2 and the 6 it was while there was one aeroplane.
     */
    function bankMid(lower) {
        return lower ? (cabin.AISLE_Y + 1 + cabin.H - 2) / 2 : (1 + cabin.AISLE_Y - 1) / 2;
    }

    /** The readout on a canvas of its own, which is what a turned cabin needs. */
    // How wide the readout draws when it is on a canvas of its own, in tiles. It used to be
    // the cabin's depth, because a turned cabin is that many tiles across and the readout sits
    // over it - which is nine on a narrowbody and five on a turboprop, and five tiles is not
    // enough room for "OUT OF SEATS" beside "HELPING". Both are stretched to the width of the
    // page by the CSS anyway, so the readout asks for the room the words need and lets the
    // cabin below it be whatever width it is.
    const STATUS_TILES = 9;

    function statusWidth() { return Math.max(STATUS_TILES, cabin.H); }

    function fitStatus(canvas, scale) {
        const s = scale || DRAW_SCALE;
        canvas.width = statusWidth() * TILE * s;
        canvas.height = Math.round(BAND * statusGrid(statusWidth()).rows * TILE * s);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        return s;
    }

    /**
     * The transform the aeroplane is drawn under, given where the readout ends and how hard the
     * cabin is being shaken. Across the page it is a translation and nothing else. Down it, the
     * whole picture is turned a quarter turn clockwise about its own corner: cabin x runs down
     * the screen, so row 1 is at the top and row 30 at the bottom, and cabin y runs right to
     * left, so A is by the right-hand window. A quarter turn is exact - no sprite lands on half
     * a pixel - which is the only reason this is allowed to touch a pixel-art canvas at all.
     */
    function stance(ctx, T, oy, sx, sy) {
        if (view.down) {
            view.e = cabin.H * T + sx;
            view.f = oy + sy;
            ctx.setTransform(0, 1, -1, 0, view.e, view.f);
        } else {
            view.e = sx;
            view.f = oy + sy;
            ctx.setTransform(1, 0, 0, 1, view.e, view.f);
        }
    }

    /**
     * Square the canvas back up over the tile whose corner is at cabin pixel (px, py), and say
     * where that corner has ended up, because in a turned cabin it is not where it was. Draw
     * from the two numbers handed back and everything inside lands on that tile the right way
     * up. `settle` puts the canvas back.
     */
    function upright(ctx, px, py, T) {
        if (!view.down) return [px, py];
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, view.e - py - T, view.f + px);
        return [0, 0];
    }

    function settle(ctx) { if (view.down) ctx.restore(); }

    /**
     * Which tile the mouse is over, or null, and where in the tile: `fx` and `fy` run 0..1
     * across it, so a click can tell the person in a burning seat from the fire round them.
     * Works at any CSS size the canvas ends up, and either way up: the quarter turn is undone
     * here rather than anywhere else, so a click is a cabin coordinate by the time it leaves.
     */
    function tileAt(canvas, scale, clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        const box = shape();
        // The readout is above the aeroplane and takes its share of the height with it.
        const band = r.height * (box.band / box.down);
        const across = (clientX - r.left) / (r.width / box.across);
        const down = (clientY - r.top - band) / ((r.height - band) / (box.down - box.band));
        // Undo the quarter turn: down the screen is along the aeroplane, and across it is the
        // seat letters, right to left.
        //
        // The tile is counted from the whole part of each and never from the turned coordinate,
        // because `H - across` and `H - 1 - floor(across)` are the same number everywhere
        // except on a tile's own edge, where they are one seat apart. That edge is every
        // fortieth column of pixels at the size a telephone draws this, so it is not a corner
        // case: it is one tap in forty landing on the wrong person.
        const ia = Math.floor(across), id = Math.floor(down);
        const x = view.down ? id : ia;
        const y = view.down ? cabin.H - 1 - ia : id;
        if (!cabin.inBounds(x, y)) return null;
        // Where in the tile, in cabin coordinates. Across a turned cabin the seat letters run
        // the other way, so the fraction does too.
        return { x: x, y: y,
                 fx: view.down ? down - id : across - ia,
                 fy: view.down ? 1 - (across - ia) : down - id };
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
        // You are a person, and a person stands up in the picture whichever way the aeroplane
        // has been turned. So is whoever you are carrying, who is drawn a few pixels below your
        // own feet and has to stay below them rather than beside them.
        const u = upright(ctx, ppx, ppy, TILE * scale);
        ppx = u[0]; ppy = u[1];
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
        settle(ctx);
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
        for (const c of PRS.crew.inCabin(S)) {
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
    // When each cabin on the page was last moved on. There is more than one when somebody else's
    // flight is running beside yours, and they are drawn one after the other in the same frame:
    // a single clock here would hand the first draw the whole of the elapsed time and the second
    // one none of it, and everybody in the second cabin would stand perfectly still.
    const movedAt = new Map();

    /** A new flight: nobody is anywhere yet. */
    function resetMotion(ns) {
        if (ns === undefined) { moving.clear(); movedAt.clear(); return; }
        for (const key of Array.from(moving.keys())) {
            if (key.slice(0, ns.length) === ns) moving.delete(key);
        }
        movedAt.delete(ns);
    }

    /** Seconds since this cabin's last frame. Asked once, at the top of a draw. */
    function frameStep(t, ns) {
        const was = movedAt.get(ns || "");
        const dt = was ? Math.min(0.1, Math.max(0, t - was) / 1000) : 0;
        movedAt.set(ns || "", t);
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
     *
     * `strain`, 0 to 1, is how hard the walk was, and a hard walk is walked hard: the figure
     * lurches a pixel or two down on every stride while it is on its way. The time it takes is
     * capped, so this is what tells a walk through the smoke with four people in your arms from
     * a stroll to the galley.
     */
    function follow(key, tiles, ms, strain) {
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
        m.strain = strain || 0;
        m.walked = 0;
    }

    /**
     * How far down to draw a walking figure this frame, in sprite pixels: a stagger, one dip a
     * tile, as deep as the walk is hard. Nothing once it has arrived.
     */
    function stagger(m) {
        if (!m.route.length || !m.strain) return 0;
        return Math.round(m.strain * 2.4 * Math.abs(Math.sin(m.walked * Math.PI)));
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
            if (d <= go) { m.x = wx; m.y = wy; go -= d; m.route.shift(); m.walked += d; }
            else { m.x += (wx - m.x) * go / d; m.y += (wy - m.y) * go / d; m.walked += go; go = 0; }
        }
        if (!m.route.length) m.strain = 0;
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
        // Which cabin this is. Yours has no prefix; somebody else's flight running beside it
        // has one, so the two sets of figures chase their own positions and not each other's.
        const ns = opts.ns || "";
        const dt = frameStep(t, ns);
        const youAt = drawnAt(ns + "you", P.x, P.y, dt);

        // Everything the aeroplane is drawn with sits below the readout, so the whole picture
        // is moved down by it once, here, and every draw after this is in cabin coordinates.
        const OY = Math.round(shape().band * T);

        ctx.imageSmoothingEnabled = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#20242c";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // A shove, applied to the whole aeroplane, because that is where it happened. It is a
        // shove on the screen and not in the cabin, so it is handed to `stance` in screen
        // pixels and shakes the same way whichever way up the aeroplane is.
        if (t < fx.shakeUntil && !opts.ghost) {
            const left = (fx.shakeUntil - t) / 260;
            const a = fx.shakeAmp * scale * Math.min(1, left);
            stance(ctx, T, OY, Math.round(Math.sin(t * 0.09) * a),
                   Math.round(Math.cos(t * 0.13) * a * 0.6));
        } else {
            fx.shakeAmp = 0;
            stance(ctx, T, OY, 0, 0);
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
            // The outboard seat row on each side of the aisle: A and F on a narrowbody, A and C
            // on a turboprop, which is 1 and H-2 on both and was 1 and 7 while there was one.
            for (const y of [1, cabin.H - 2]) {
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
            const cart = drawnAt(ns + "cart", S.cabinFlags.cartX, cabin.AISLE_Y, dt);
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
                rideWith(ns + "p:" + p.id, youAt);
                continue;
            }
            const key = p.x + "," + p.y;
            const n = stacks[key] = (stacks[key] || 0) + 1;
            const [dx, dy] = FAN[Math.min(FAN.length - 1, n - 1)];
            const spot = drawnAt(ns + "p:" + p.id, p.x + dx / TILE, p.y + dy / TILE, dt);
            const px = pixels(spot.x, scale), py = pixels(spot.y, scale);
            const dead = p.state === "dead";
            // Somebody in the aisle, or somebody frightened, does not hold still.
            const jitter = (!dead && (p.state === "aisle" || p.panic > 70))
                ? Math.round(Math.sin(t * 0.008 + p.n) * scale) : 0;
            const pal = dead ? ashenOf(p) : paletteOf(p);
            // Sixty faces, and not one of them lies down because the aeroplane was turned.
            const [ux, uy] = upright(ctx, px, py, T);
            atlas.blitAlpha(ctx, faceOf(p), ux + jitter, uy, scale, dead ? 0.72 : 1, pal);
            if (p.masked) atlas.blitAlpha(ctx, "mask_on", ux + jitter, uy, scale, 0.95);
            if (dead) atlas.blitAlpha(ctx, "mark_lost", ux, uy, scale, 0.5);
            if (p.helper) {
                // A green bar under the feet of everybody who is working with you. Helpers are
                // the only thing in this game that scales and the only thing worth counting.
                ctx.save();
                ctx.globalAlpha = 0.75;
                ctx.fillStyle = "#5fd67a";
                ctx.fillRect(ux + 3 * scale, uy + T - 2 * scale, T - 6 * scale, 2 * scale);
                ctx.restore();
            }
            settle(ctx);
        }
        ctx.save();
        const cs = Math.round(T * TEXT.count), cbox = Math.round(cs * 1.4);
        ctx.font = "700 " + cs + "px ui-monospace, monospace";
        ctx.textAlign = "center";
        for (const key in stacks) {
            if (stacks[key] < 3) continue;
            const [sx, sy] = key.split(",");
            const [ux, uy] = upright(ctx, sx * T, sy * T, T);
            const bx = ux + T - cbox, by = uy + T - cbox;
            ctx.fillStyle = "rgba(16,19,24,0.9)";
            ctx.fillRect(bx, by, cbox, cbox);
            ctx.fillStyle = "#dfe4ec";
            ctx.fillText(String(stacks[key]), bx + cbox / 2, by + cbox * 0.78);
            settle(ctx);
        }
        ctx.restore();

        // ---- crew ---------------------------------------------------------------------------
        // The crew wear the procedure. They are excellent and calm through the first two phases,
        // which is exactly the problem, and they stop being calm at the same moment they start
        // being right.
        const crewFace = S.crewPhase >= 4 ? "pax_afraid" : S.crewPhase >= 2 ? "pax_worried" : "pax";
        for (const c of PRS.crew.inCabin(S)) {
            const spot = drawnAt(ns + "c:" + c.id, c.x, c.y, dt);
            const [ux, uy] = upright(ctx, pixels(spot.x, scale), pixels(spot.y, scale), T);
            atlas.blit(ctx, crewFace, ux, uy, scale, paletteOf(c));
            settle(ctx);
        }

        // ---- you ----------------------------------------------------------------------------
        const ppx = pixels(youAt.x, scale), ppy = pixels(youAt.y, scale) + stagger(youAt) * scale;
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
            // A chevron over your head, so a glance finds you at any zoom. Over your head, not
            // off your shoulder, so it is drawn the same way up you are.
            const [ux, uy] = upright(ctx, ppx, ppy, T);
            const cx = ux + T / 2, cy = uy - 3 * scale;
            ctx.save();
            ctx.fillStyle = "#ffd54a";
            ctx.beginPath();
            ctx.moveTo(cx, cy + 3 * scale);
            ctx.lineTo(cx - 3 * scale, cy - 2 * scale);
            ctx.lineTo(cx + 3 * scale, cy - 2 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            settle(ctx);
        }

        drawCore(ctx, S, T, scale, t);
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
        // What just happened is something that just happened to you. Somebody else's cabin gets
        // none of it: their flight is already over and the numbers flying off it would be a
        // second conversation over the top of the one you are having.
        if (!opts.ghost) drawFx(ctx, T, scale, t);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawVeil(ctx, S, t, opts.ghost);
        // Last of all, above the smoke and above whatever just happened to you, because it is
        // the one part of the picture that has to be legible in a cabin nobody can see through.
        // Unless it is not on this canvas at all, which is what a turned cabin does with it.
        if (shape().band) drawStatus(ctx, S, T, scale, t);
    }

    /**
     * The seat of it. Everything else on this picture is a consequence; this one tile is the
     * case with the cell in it, and until now the only way to know which tile it was was to read
     * "the locker above 12A" off a card and count rows. So it is marked, in red, over the smoke,
     * and it follows the case: put the thing in the lavatory basin and the mark goes with it.
     *
     * It is corners rather than a fill because the tile underneath it is the thing being marked,
     * and a caret over the top because at a glance a player finds a shape above a tile faster
     * than they find a tile.
     */
    function drawCore(ctx, S, T, scale, t) {
        const c = S.fire.core;
        if (!cabin.inBounds(c.x, c.y)) return;
        const pulse = 0.62 + 0.24 * Math.abs(Math.sin(t * 0.0035));
        const colour = c.blue ? "#3fa8ff" : "#d4483a";
        corners(ctx, c.x * T + scale, c.y * T + scale, T - 2 * scale, T - 2 * scale, scale,
                colour, pulse);
        const [ux, uy] = upright(ctx, c.x * T, c.y * T, T);
        const cx = ux + T / 2, cy = uy - 2 * scale;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 3 * scale);
        ctx.lineTo(cx - 3 * scale, cy - 2 * scale);
        ctx.lineTo(cx + 3 * scale, cy - 2 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        settle(ctx);
    }

    /**
     * What a burning tile is drawn with. A seat that is alight is `seat_{pos}_fire_N`, the seat
     * tile for its place in the bank with the fire in it; anything else is `fire_N`, in one of
     * two orientations by tile so a row of them is not a row of stamps. Embers are embers.
     * tools/render_frame.py follows the same rule.
     */
    function fireSpriteAt(S, x, y) {
        const core = S.fire.core;
        // The jet is its own heat and it is not on the orange scale, so it is drawn as itself
        // wherever the case has got to: in the locker, in your hands, in the basin.
        const base = core.blue && x === core.x && y === core.y
            ? "fire_blue"
            : PRS.fire.fireSprite(S.fire.intensity[cabin.idx(x, y)]);
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
    // The floor in front of the doors, asked for rather than remembered: which columns those
    // are depends on which aeroplane is on the screen.
    const zones = () => cabin.DOOR_ENDS;

    function drawZones(ctx, S, T, t) {
        for (const zx of zones()) {
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
        // `box` is the extent of a sprite's own opaque pixels, so it is a shape in the sprite's
        // frame and has to be bracketed in it: a body is taller than it is wide either way up.
        const [ux, uy] = upright(ctx, x * T, y * T, T);
        corners(ctx, ux + box[0] * scale - pad, uy + box[1] * scale - pad,
                (box[2] - box[0]) * scale + 2 * pad, (box[3] - box[1]) * scale + 2 * pad,
                scale, colour, alpha);
        settle(ctx);
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
        const label = (text, x, y) => {
            const [ux, uy] = upright(ctx, x * T, y * T, T);
            ctx.fillText(text, ux + T / 2, uy + T * 0.64);
            settle(ctx);
        };

        // The galleys are one tile wide and the word is not, so it is written along the galley
        // rather than across it. Across the page that is a column and the word is turned to go
        // down it; down the page the galley is already lying the way the word reads, and the
        // turn would be putting back the one the cabin has just had.
        // Where the words go is asked of the cabin rather than written down here, because the
        // two aeroplanes do not put the lavatories in the same places and one of them has a
        // service end that is also its only cross-aisle. So: the word goes down the middle of
        // whatever run of galley tiles there actually is on that side of the aisle, and the
        // lavatory word goes on the lavatory tiles, wherever those turn out to be.
        ctx.fillStyle = "rgba(20,32,36,0.8)";
        for (const gx of [cabin.FWD_GALLEY_X, cabin.AFT_GALLEY_X]) {
            // A vestibule that is also a door is labelled with the state of its air instead:
            // that word is the one a player needs and two words on one tile is neither.
            if (gx === cabin.FWD_CROSS_X || gx === cabin.AFT_CROSS_X) continue;
            const word = gx === cabin.FWD_GALLEY_X ? cabin.aircraft.fwdGalleyWord
                                                   : cabin.aircraft.aftGalleyWord;
            for (const lower of [false, true]) {
                const ys = [];
                for (let y = 1; y <= cabin.H - 2; y++) {
                    if (y === cabin.AISLE_Y || (y > cabin.AISLE_Y) !== lower) continue;
                    if (cabin.kindAt(gx, y) === "galley") ys.push(y);
                }
                if (!ys.length) continue;
                const gy = (ys[0] + ys[ys.length - 1]) / 2;
                const [ux, uy] = upright(ctx, gx * T, gy * T, T);
                ctx.save();
                if (view.down) {
                    ctx.translate(ux + T / 2, uy + T * 0.64);
                } else {
                    ctx.translate(ux + T * 0.64, uy + T / 2);
                    ctx.rotate(-Math.PI / 2);
                }
                // `PRS.t` and not `X`: the word is the aeroplane's own, marked with K() in
                // aircraft.js, so the key is that word and nothing else - noting it here would
                // look it up with a note the scanner cannot see it being given. And `PRS.t`
                // spelled out, because `T` inside this function is the tile size.
                ctx.fillText(PRS.t(word), 0, 0);
                ctx.restore();
                settle(ctx);
            }
        }
        const lav = X("LAV", "written across a lavatory door, three letters at most");
        for (const gx of [cabin.FWD_GALLEY_X, cabin.AFT_GALLEY_X]) {
            for (let y = 1; y <= cabin.H - 2; y++) {
                if (cabin.kindAt(gx, y) === "lav") label(lav, gx, y);
            }
        }

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
            label(word, zx, bankMid(false));
            label(word, zx, bankMid(true));
        }
        ctx.restore();

        if (opts.rowNumbers === false) return;

        // Row numbers down the aisle, and the seat letters on the bulkheads at either end, so
        // that "the locker above 14C" is a place on the picture and not a piece of trivia.
        ctx.save();
        ctx.fillStyle = "rgba(210,218,230,0.8)";
        ctx.font = "700 " + Math.round(T * TEXT.row) + "px ui-monospace, monospace";
        ctx.textAlign = "center";
        // Every row, not every other one, when the aeroplane runs down the page: there is a
        // whole tile of aisle to write each of them on and a player scrolling past row 12
        // looking for row 14 should not have to count.
        const every = view.down ? 1 : 2;
        for (let x = 0; x < cabin.W; x++) {
            const row = cabin.rowAt(x);
            if (row === null || row % every) continue;
            const [ux, uy] = upright(ctx, x * T, cabin.AISLE_Y * T, T);
            ctx.fillText(String(row), ux + T / 2, uy + T * 0.68);
            settle(ctx);
        }
        ctx.font = "700 " + Math.round(T * TEXT.seat) + "px ui-monospace, monospace";
        ctx.fillStyle = "rgba(210,218,230,0.7)";
        for (let y = 1; y <= cabin.H - 2; y++) {
            const letter = cabin.seatLetter(y);
            if (!letter) continue;
            for (const x of [0, cabin.W - 1]) {
                const [ux, uy] = upright(ctx, x * T, y * T, T);
                ctx.fillText(letter, ux + T / 2, uy + T * 0.68);
                settle(ctx);
            }
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
                // A price rises off the tile it was paid on, and rising is up the screen: the
                // number is drawn the way it is read and drifts the way a thing drifts.
                const ease = 1 - Math.pow(1 - k, 3);
                const [ux, uy] = upright(ctx, it.x * T, it.y * T, T);
                const x = ux + T / 2;
                const y = uy + T * 0.3 - ease * it.rise * scale;
                ctx.globalAlpha = k < 0.12 ? k / 0.12 : Math.min(1, (1 - k) * 3.2);
                ctx.font = "700 " + Math.round(T * it.size) + "px ui-monospace, monospace";
                ctx.lineWidth = Math.max(2, scale * 1.2);
                ctx.strokeStyle = "rgba(12,14,18,0.92)";
                ctx.strokeText(it.text, x, y);
                ctx.fillStyle = it.colour;
                ctx.fillText(it.text, x, y);
                settle(ctx);
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

    // ------------------------------------------------------------------------------ state ---

    /**
     * What the cabin is doing, written along the top of the cabin.
     *
     * It used to be a panel of bars beside the aeroplane, which meant the two halves of the same
     * question - how many are up, and how bad is it in here - were in two places and you had to
     * look away from the fire to read one of them. It is four numbers and they belong on the
     * picture: how many are out of their seats out of sixty, how many of those are working for
     * you, how frightened the cabin is, and how far the crew have got.
     *
     * Drawn in canvas pixels, after everything else, so neither the smoke nor a shove touches it.
     */
    const BAR_GOOD = "#5fd67a", BAR_PANIC = ["#5fd67a", "#e8c53a", "#d4483a"];

    function drawStatus(ctx, S, T, scale, t) {
        const st = PRS.state;
        const W = ctx.canvas.width, h = Math.round(BAND * T);
        const grid = statusGrid(W / T);
        const moved = st.movedCount(S);
        const helping = st.helperCount(S);
        // Against the people still sitting down who would ever get up: a full bar means this
        // cabin has nobody left in it to ask.
        const cap = Math.max(1, helping + PRS.pax.helperCap(S));
        const panic = S.cabinPanic;
        const phase = PRS.crew.PHASES[S.crewPhase];
        const tier = panic > 66 ? 2 : panic > 33 ? 1 : 0;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#12151b";
        ctx.fillRect(0, 0, W, h * grid.rows);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(0, h * grid.rows - scale, W, scale);

        const cells = [
            // Of however many are on this aeroplane, which is sixty on TN 447 and eighteen on
            // a nineteen-seat turboprop. It was the literal 60 for as long as there was one
            // aeroplane.
            { label: X("OUT OF SEATS", "readout along the top of the cabin"),
              value: moved + " / " + S.pax.length, frac: moved / Math.max(1, S.pax.length),
              colour: BAR_GOOD },
            { label: X("HELPING", "readout along the top of the cabin"),
              value: String(helping), frac: helping / cap, colour: BAR_GOOD },
            { label: X("PANIC", "readout along the top of the cabin"),
              value: Math.round(panic) + "%", frac: panic / 100, colour: BAR_PANIC[tier] },
            { label: X("CREW", "readout along the top of the cabin"),
              // How far along the procedure this aeroplane's procedure is. An aeroplane with
              // no cabin crew runs two of the six phases, so the bar is against the two it
              // runs and not against six it never will.
              value: PRS.t(phase.name),
              frac: crewProgress(S), colour: "#7fb0e8" },
        ];
        const pad = Math.round(T * 0.35);
        const cw = (W - pad * 2) / grid.cols;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        for (let i = 0; i < cells.length; i++) {
            const c = cells[i];
            const x = Math.round(pad + (i % grid.cols) * cw);
            const top = Math.floor(i / grid.cols) * h;
            const w = Math.round(cw - pad);
            ctx.fillStyle = "rgba(190,200,214,0.72)";
            ctx.font = "700 " + Math.round(T * 0.30) + "px ui-monospace, monospace";
            ctx.fillText(c.label, x, top + Math.round(h * 0.30));
            ctx.fillStyle = c.colour;
            ctx.font = "700 " + Math.round(T * 0.42) + "px ui-monospace, monospace";
            ctx.fillText(c.value, x, top + Math.round(h * 0.70));
            // The bar under the number, so the number has a scale without being asked to carry
            // one. Past the end of the track it stays the width of the track.
            const by = top + Math.round(h * 0.80), bh = Math.max(scale, Math.round(T * 0.09));
            ctx.fillStyle = "rgba(255,255,255,0.10)";
            ctx.fillRect(x, by, w, bh);
            ctx.fillStyle = c.colour;
            ctx.fillRect(x, by, Math.round(w * clamp01(c.frac)), bh);
        }
        ctx.restore();
    }

    /**
     * The two things laid over the finished picture: whatever just happened to you, and the air
     * you are personally in. The second one is the honest half - the smoke does the same thing to
     * you it does to everybody, and this is the only place the interface admits it.
     */
    function drawVeil(ctx, S, t, ghost) {
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
        if (fx.flash && !ghost) {
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
        // Which way up the aeroplane is flown, and the readout on a canvas of its own for when
        // it is flown down the page. Nothing outside the renderer needs to know more than this.
        turn, turned, wantsTurn, fitStatus, status: drawStatus,
        paletteOf, faceOf, zoneAir, fireSpriteAt,
        spriteBox, figures, figureAt, halo,
        fx: { say, pulse, flash: flashOver, shake, clear: clearFx },
        // Where everybody is drawn, which is not where they are. The play screen empties it at
        // boarding and hands it your own walks; everybody else chases without being asked.
        motion: { follow: follow, reset: resetMotion, route: aisleRoute, at: drawnAt, stagger: stagger },
    };
})(window);
