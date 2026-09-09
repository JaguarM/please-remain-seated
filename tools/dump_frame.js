// Play a flight up to a chosen moment and write out everything needed to draw it.
//
//   node tools/dump_frame.js                              default: a good player, six minutes in
//   node tools/dump_frame.js --at=420 --char=gordy --bot=carry --seed=7
//
// Pairs with tools/render_frame.py, which turns the JSON into a PNG using the same sprite maps
// the browser uses. Between them they make a real screenshot of a real simulated moment without
// a browser being involved, which is how the picture in the README is made.
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "simulate.js"), "utf8")
    .replace(/\nmain\(\);\s*$/, "\nmodule.exports = { load, BOTS, setCoin };\n");
const mod = { exports: {} };
new Function("module", "exports", "require", "__dirname", "__filename", src)(
    mod, mod.exports, require, __dirname, path.join(__dirname, "simulate.js"));

const PRS = mod.exports.load();
const BOTS = mod.exports.BOTS;
const setCoin = mod.exports.setCoin;
const cabin = PRS.cabin;

const args = process.argv.slice(2);
const opt = (name, dflt) => {
    const hit = args.find((a) => a.startsWith("--" + name + "="));
    return hit ? hit.split("=")[1] : dflt;
};

const at = Number(opt("at", 420));           // seconds elapsed to stop at
const bot = BOTS[opt("bot", "good")];
const seed = Number(opt("seed", 20260908));
const character = opt("char", "volk");
const out = opt("out", path.join(__dirname, "..", "docs", "frame.json"));

const S = PRS.state.create({
    characterId: character,
    items: ["water_big", "wet_towel", "blanket", "gloves", "phone", "hivis", "tape", "torch"],
    seed: seed,
});

// The bot's coin, seeded from the same number, so this file's whole promise - that a picture
// regenerates from a seed - is actually true.
setCoin(PRS.util.makeRng((seed ^ 0x9e3779b9) >>> 0));

let turns = 0;
while (!S.clock.landed && S.clock.elapsed < at && turns < 400) {
    const list = PRS.actions.available(S);
    if (!list.length) break;
    PRS.actions.perform(S, bot(PRS, S, list));
    turns++;
}

// Only what a renderer needs. The tile kinds are resolved here so the Python side does not have
// to reimplement cabin.js.
const tiles = [];
for (let y = 0; y < cabin.H; y++) {
    const row = [];
    for (let x = 0; x < cabin.W; x++) {
        const i = cabin.idx(x, y);
        row.push({
            kind: cabin.kindAt(x, y),
            burnt: Math.round(S.fire.burnt[i] * 100) / 100,
            fire: Math.round(S.fire.intensity[i] * 10) / 10,
            smoke: Math.round(S.fire.smoke[i] * 10) / 10,
            bin: cabin.rowAt(x) !== null,
            binOpenL: !!S.cabinFlags.binsOpen[cabin.binKey(x, "left")],
            binOpenR: !!S.cabinFlags.binsOpen[cabin.binKey(x, "right")],
            safe: cabin.isSafeZone(x, y),
        });
    }
    tiles.push(row);
}

const frame = {
    meta: {
        seed: S.seed, character: S.character.name, bot: opt("bot", "good"),
        elapsed: Math.round(S.clock.elapsed), remaining: Math.round(S.clock.remaining),
        clock: PRS.util.mmss(S.clock.remaining),
        secured: PRS.state.securedCount(S), helping: PRS.state.helperCount(S),
        down: PRS.state.downCount(S),
        credibility: Math.round(S.credibility),
        crewPhase: PRS.crew.PHASES[S.crewPhase].name,
        worstFire: Math.round(PRS.fire.worst(S.fire)),
        smoke: PRS.fire.describeSmoke(PRS.fire.totalSmoke(S.fire)),
        turns: turns,
        log: S.log.slice(-8).map((l) => l.clock + "  " + l.text),
    },
    W: cabin.W, H: cabin.H, aisle: cabin.AISLE_Y,
    tiles: tiles,
    cart: S.cabinFlags.cartOut ? { x: S.cabinFlags.cartX, y: cabin.AISLE_Y } : null,
    // Everybody comes out with the sprite and the eight-colour palette already resolved, by the
    // same two functions the browser uses. The Python side has no opinions about who looks
    // frightened, so it cannot come to a different one.
    player: { x: S.player.x, y: S.player.y, carrying: S.player.carrying.length,
              sprite: "pax", palette: PRS.pax.palette(S.character) },
    crew: S.crew.map((c) => ({
        x: c.x, y: c.y,
        sprite: S.crewPhase >= 4 ? "pax_afraid" : S.crewPhase >= 2 ? "pax_worried" : "pax",
        palette: PRS.pax.palette(c),
    })),
    pax: S.pax.filter((p) => p.state !== "carried" && p.state !== "gone").map((p) => ({
        x: p.x, y: p.y,
        sprite: PRS.pax.face(p),
        palette: PRS.pax.palette(p, p.state === "dead"),
        dead: p.state === "dead", secured: p.state === "secured", helper: !!p.helper,
        masked: !!p.masked,
    })),
    zones: [cabin.FWD_GALLEY_X, cabin.FWD_CROSS_X, cabin.OVERWING_X, cabin.AFT_CROSS_X,
            cabin.AFT_GALLEY_X].map((zx) => {
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

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(frame, null, 1));
console.log("wrote " + path.relative(process.cwd(), out) + " — " + frame.meta.clock +
            " to touchdown, " + frame.meta.secured + " secured, fire " + frame.meta.worstFire);
