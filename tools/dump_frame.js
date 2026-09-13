// Play a flight up to a chosen moment and write out everything needed to draw it.
//
//   node tools/dump_frame.js                              default: a good player, six minutes in
//   node tools/dump_frame.js --at=420 --char=gordy --bot=carry --seed=7
//
// Pairs with tools/render_frame.py, which turns the JSON into a PNG using the same sprite maps
// the browser uses. Between them they make a real screenshot of a real simulated moment without
// a browser being involved, which is how the picture in the README is made.
//
// What goes into the file is decided by tools/frame.js, which dump_flight.js uses too, so the
// still and the animation cannot disagree about what a moment of this game looks like.
const fs = require("fs");
const path = require("path");
const F = require("./frame.js");

const PRS = F.loadGame().load();
// The bots live in the game (game/sim/bots.js), which simulate.js loads with the rest of it.
const BOTS = PRS.bots.BOTS;
const setCoin = PRS.bots.setCoin;

const args = process.argv.slice(2);
const opt = (name, dflt) => {
    const hit = args.find((a) => a.startsWith("--" + name + "="));
    return hit ? hit.split("=")[1] : dflt;
};

const at = Number(opt("at", 420));           // seconds elapsed to stop at
const bot = BOTS[opt("bot", "good")];
const seed = Number(opt("seed", 20260908));
const character = opt("char", "ansel");
const out = opt("out", path.join(__dirname, "..", "docs", "frame.json"));

const S = PRS.state.create({ characterId: character, seed: seed });

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

const frame = F.build(PRS, S, { bot: opt("bot", "good"), turns: turns });

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(frame, null, 1));
console.log("wrote " + path.relative(process.cwd(), out) + " — " + frame.meta.clock +
            " to touchdown, " + frame.meta.moved + " moved, fire " + frame.meta.worstFire);
