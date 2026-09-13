// One moment of a flight, in the form a renderer can draw without knowing anything about the
// game.
//
// The browser draws the cabin from the live state, which is thirty files of rules. The PNG
// renderer in tools/render_frame.py draws it from this, which is a grid, some people and their
// colours - and the reason it can be a hundred and fifty lines of Python instead of a port of
// the game is that every question with an opinion in it is answered here, by the game's own
// functions: which sprite a frightened person is, which palette they are drawn in, whether a
// tile is a seat and which third of the bank it is. The Python has no opinions, so it cannot
// come to a different one.
//
// dump_frame.js writes one of these. dump_flight.js writes one every so many seconds of a whole
// flight, which is what the GIF is made of. Both of them, and the browser, are drawing the same
// simulation.
const path = require("path");

/** Load the game, once, the way the play-testers do. */
function loadGame() {
    const fs = require("fs");
    const here = __dirname;
    const src = fs.readFileSync(path.join(here, "simulate.js"), "utf8")
        .replace(/\nmain\(\);\s*$/, "\nmodule.exports = { load, playOne };\n");
    const mod = { exports: {} };
    new Function("module", "exports", "require", "__dirname", "__filename", src)(
        mod, mod.exports, require, here, path.join(here, "simulate.js"));
    return mod.exports;
}

/** Somebody in your arms or at your feet: what to draw them as, and in what colours. */
function held(PRS, q) {
    if (!q) return null;
    return { sprite: PRS.pax.isPet(q) ? "carried_pet" : null, palette: PRS.pax.palette(q) };
}

function build(PRS, S, extra) {
    const cabin = PRS.cabin;

    // The tile kinds are resolved here so the Python side does not have to reimplement cabin.js.
    const tiles = [];
    for (let y = 0; y < cabin.H; y++) {
        const row = [];
        for (let x = 0; x < cabin.W; x++) {
            const i = cabin.idx(x, y);
            row.push({
                kind: cabin.kindAt(x, y),
                seat: cabin.kindAt(x, y) === "seat" ? cabin.seatPos(y) : null,
                burnt: Math.round(S.fire.burnt[i] * 100) / 100,
                fire: Math.round(S.fire.intensity[i] * 10) / 10,
                // The jet is its own heat and not a point on the orange scale, so the tile says
                // so rather than making the Python side work it out from a number it cannot see.
                jet: S.fire.core.blue && S.fire.core.x === x && S.fire.core.y === y,
                smoke: Math.round(S.fire.smoke[i] * 10) / 10,
                bin: cabin.rowAt(x) !== null,
                binOpenL: !!S.cabinFlags.binsOpen[cabin.binKey(x, "left")],
                binOpenR: !!S.cabinFlags.binsOpen[cabin.binKey(x, "right")],
                door: cabin.byTheDoors(x),
            });
        }
        tiles.push(row);
    }

    return {
        meta: Object.assign({
            seed: S.seed, character: S.character.name,
            elapsed: Math.round(S.clock.elapsed), remaining: Math.round(S.clock.remaining),
            clock: PRS.util.mmss(S.clock.remaining),
            landed: !!S.clock.landed,
            moved: PRS.state.movedCount(S), helping: PRS.state.helperCount(S),
            down: PRS.state.downCount(S),
            credibility: Math.round(S.credibility),
            crewPhase: PRS.crew.PHASES[S.crewPhase].name,
            worstFire: Math.round(PRS.fire.worst(S.fire)),
            smoke: PRS.fire.describeSmoke(PRS.fire.totalSmoke(S.fire)),
            log: S.log.slice(-8).map((l) => l.clock + "  " + l.text),
        }, extra || {}),
        W: cabin.W, H: cabin.H, aisle: cabin.AISLE_Y,
        tiles: tiles,
        cart: S.cabinFlags.cartOut ? { x: S.cabinFlags.cartX, y: cabin.AISLE_Y } : null,
        // Everybody comes out with the sprite and the eight-colour palette already resolved, by
        // the same two functions the browser uses.
        // You, with whoever is in your arms and whoever is being dragged. Each of them is a
        // sprite and a palette, the same pair as everybody else, because the dog in your arms is
        // his bag and not a body, and a null palette means "the colours the art was drawn in".
        player: { x: S.player.x, y: S.player.y, sprite: "pax",
                  palette: PRS.pax.palette(S.character),
                  carrying: S.player.carrying.map((id) => held(PRS, PRS.state.paxById(S, id))),
                  dragging: held(PRS, PRS.state.paxById(S, S.player.dragging)) },
        crew: S.crew.map((c) => ({
            x: c.x, y: c.y,
            sprite: S.crewPhase >= 4 ? "pax_afraid" : S.crewPhase >= 2 ? "pax_worried" : "pax",
            palette: PRS.pax.palette(c),
        })),
        pax: S.pax.filter((p) => p.state !== "carried" && p.state !== "gone").map((p) => ({
            x: p.x, y: p.y,
            sprite: PRS.pax.face(p),
            palette: PRS.pax.palette(p, p.state === "dead"),
            dead: p.state === "dead", moved: !!p.moved, helper: !!p.helper,
            masked: !!p.masked,
        })),
        // The floor by the doors at each end, tinted by the air on it.
        zones: cabin.DOOR_ENDS.map((zx) => {
            let smoke = 0, fire = 0;
            for (let y = 1; y < cabin.H - 1; y++) {
                const i = cabin.idx(zx, y);
                smoke = Math.max(smoke, S.fire.smoke[i]);
                fire = Math.max(fire, S.fire.intensity[i]);
            }
            const bad = Math.min(1, smoke / 70 + fire / 30);
            return { x: zx, tier: bad > 0.62 ? 2 : bad > 0.24 ? 1 : 0 };
        }),
    };
}

module.exports = { build, loadGame, held };
