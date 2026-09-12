// Where the harm comes from.
//
//   node tools/harm.js 100 --strategy=idle
//   node tools/harm.js 100 --strategy=good --char=gordy
//
// Flies a number of flights with one bot and, at touchdown, splits every passenger's harm into
// the parts scoring.js adds up - the smoke they breathed, their burns, the air and heat where they
// ended up, the mask, whether they were low, how far the door was, how crowded the floor was - and
// averages them for three groups: the people nobody moved, the people moved to the front, and the
// people moved to the back. The arithmetic is scoring.harmParts, not a copy of it.
//
// This is the table to look at when a strategy scores too well or too badly and the reason is not
// obvious: it says which number is doing it.

const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "simulate.js"), "utf8")
    .replace(/\nmain\(\);\s*$/, "\nmodule.exports = { load, playOne };\n");
const mod = { exports: {} };
new Function("module", "exports", "require", "__dirname", "__filename", src)(
    mod, mod.exports, require, __dirname, path.join(__dirname, "simulate.js"));
const { load, playOne } = mod.exports;

const args = process.argv.slice(2);
const n = Number(args.find((a) => /^\d+$/.test(a)) || 60);
const opt = (name, dflt) => {
    const hit = args.find((a) => a.startsWith("--" + name + "="));
    return hit ? hit.split("=")[1] : dflt;
};
const strategy = opt("strategy", "good");
const char = opt("char", "ansel");

const PRS = load();
const cabin = PRS.cabin;
const groups = {};
const outcomes = {};
let survived = 0;

for (let i = 0; i < n; i++) {
    const r = playOne(PRS, { strategy: strategy, char: char, seed: 5000 + i });
    const S = r.S;
    survived += r.result.survivors;
    for (const p of S.pax) {
        const name = !p.moved ? "not moved"
                   : p.x <= cabin.OVERWING_X ? "moved forward" : "moved aft";
        const h = PRS.scoring.harmParts(S, p);
        const g = groups[name] = groups[name] || { n: 0, lost: 0, total: 0, parts: {} };
        g.n++;
        g.total += h.total;
        if (p.outcome === "lost") g.lost++;
        for (const k in h.parts) g.parts[k] = (g.parts[k] || 0) + h.parts[k];
        outcomes[p.outcome] = (outcomes[p.outcome] || 0) + 1;
    }
}

const KEYS = ["breathed", "burns", "air", "heat", "unmasked", "upright", "down", "door",
              "stuck", "other"];
const pad = (v, w) => String(v).padStart(w);
console.log("\n" + strategy + " as " + char + ", " + n + " flights: " +
            (survived / n).toFixed(1) + " of 60 survived on average.  " +
            Object.keys(outcomes).map((k) => k + " " + (outcomes[k] / n).toFixed(1)).join(" · "));
console.log("\nMean harm per person at touchdown, by part. Lost is " +
            PRS.scoring.BANDS.serious + " or more.\n");
console.log("group".padEnd(15) + pad("per", 5) + KEYS.map((k) => pad(k, 9)).join("") +
            pad("total", 8) + pad("lost", 7));
for (const name of ["not moved", "moved forward", "moved aft"]) {
    const g = groups[name];
    if (!g) continue;
    console.log(name.padEnd(15) + pad((g.n / n).toFixed(1), 5) +
                KEYS.map((k) => pad(((g.parts[k] || 0) / g.n).toFixed(1), 9)).join("") +
                pad((g.total / g.n).toFixed(1), 8) +
                pad(Math.round(g.lost / g.n * 100) + "%", 7));
}
