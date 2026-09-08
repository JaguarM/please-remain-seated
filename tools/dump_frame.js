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
    .replace(/\nmain\(\);\s*$/, "\nmodule.exports = { load, BOTS };\n");
const mod = { exports: {} };
new Function("module", "exports", "require", "__dirname", "__filename", src)(
    mod, mod.exports, require, __dirname, path.join(__dirname, "simulate.js"));

const PRS = mod.exports.load();
const BOTS = mod.exports.BOTS;
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
    player: { x: S.player.x, y: S.player.y, hair: S.character.hair, skin: S.character.skin,
              shirt: S.character.shirt, carrying: S.player.carrying.length },
    crew: S.crew.map((c) => ({ x: c.x, y: c.y, hair: c.hair, skin: c.skin, shirt: c.shirt,
                               sprite: c.sprite })),
    pax: S.pax.filter((p) => p.state !== "carried").map((p) => ({
        x: p.x, y: p.y, hair: p.hair, skin: p.skin, shirt: p.shirt,
        down: p.state === "down", secured: p.state === "secured", helper: !!p.helper,
        masked: !!p.masked,
    })),
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(frame, null, 1));
console.log("wrote " + path.relative(process.cwd(), out) + " — " + frame.meta.clock +
            " to touchdown, " + frame.meta.secured + " secured, fire " + frame.meta.worstFire);
