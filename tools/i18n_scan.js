// What every language is still missing, from the source rather than from a play-through.
//
//     node tools/i18n_scan.js              what each language has and has not
//     node tools/i18n_scan.js de           the German lines still to write, as a stub catalogue
//     node tools/i18n_scan.js de --stale   German keys no longer anywhere in the source
//
// It reads the game's own files for `T("...")`, `K("...")` and `X("...", "note")` calls, which
// is where every readable string in this game goes, and compares that list against
// game/i18n/<code>/*.js.
// A key is the English sentence, so the stub it prints for a missing line is already half the
// work: the English is on the left of the colon and on the right, waiting to be written over.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const NOTE = "␟";

/** Every .js under game/ that is not itself a catalogue. */
function sources() {
    const out = [];
    (function walk(dir) {
        for (const name of fs.readdirSync(dir).sort()) {
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) {
                // The catalogues are not sources; i18n.js itself is, because it says "and".
                if (path.relative(ROOT, full).split(path.sep).join("/").indexOf("game/i18n/") === 0) continue;
                walk(full);
            } else if (name.endsWith(".js")) out.push(full);
        }
    })(path.join(ROOT, "game"));
    return out;
}

// A JS string literal, single or double quoted, escapes and all.
const STR = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/y;

function unquote(raw) {
    // Only the escapes this codebase actually uses; anything else is left as written.
    return raw.replace(/\\(u[0-9a-fA-F]{4}|.)/g, function (whole, what) {
        if (what[0] === "u" && what.length === 5) {
            return String.fromCharCode(parseInt(what.slice(1), 16));
        }
        return { n: "\n", r: "\r", t: "\t" }[what] || what;
    });
}

/**
 * Read the argument list of a T( / X( that starts at `i`, as far as the literals go. Adjacent
 * literals joined with + are one key, because that is one sentence wrapped over two lines.
 */
function readCall(src, i) {
    const parts = [];
    let j = i;
    const at = () => src[j];
    const skip = function () {
        for (;;) {
            while (j < src.length && /\s/.test(src[j])) j++;
            if (src[j] === "/" && src[j + 1] === "/") {
                while (j < src.length && src[j] !== "\n") j++;
                continue;
            }
            return;
        }
    };
    for (;;) {
        skip();
        STR.lastIndex = j;
        const m = STR.exec(src);
        if (!m) return null;                    // a variable key, not one this tool can find
        parts.push(unquote(m[1] !== undefined ? m[1] : m[2]));
        j = STR.lastIndex;
        skip();
        if (at() === "+") { j++; continue; }    // one sentence, wrapped
        break;
    }
    return { key: parts.join(""), end: j, next: at() };
}

function scanFile(file) {
    const src = fs.readFileSync(file, "utf8");
    const found = [];
    // Both spellings: T/X/K at a call site, and the lower-case t/tx/k inside i18n.js,
    // which is the one file that both defines them and uses them.
    const re = /(^|[^\w.$])(T|X|K|t|tx|k|PRS\.t|PRS\.tx|PRS\.k)\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
        const isX = m[2] === "X" || m[2] === "tx" || m[2] === "PRS.tx";
        const first = readCall(src, re.lastIndex);
        if (!first) continue;
        let key = first.key;
        if (isX) {
            if (first.next !== ",") continue;
            const note = readCall(src, first.end + 1);
            if (!note) continue;
            key = first.key + NOTE + note.key;
        }
        const line = src.slice(0, m.index).split("\n").length;
        found.push({ key: key, file: path.relative(ROOT, file).split(path.sep).join("/"), line: line });
    }
    return found;
}

/** Load a language's catalogues by running them against a stub PRS. */
function catalogue(code) {
    const dir = path.join(ROOT, "game", "i18n", code);
    if (!fs.existsSync(dir)) return null;
    const out = {};
    const add = function (code, entries) {
        if (Array.isArray(entries)) for (const p of entries) out[p[0]] = p[1];
        else Object.assign(out, entries);
    };
    // Enough of PRS.i18n for a catalogue to run: the lines it adds, and the grammar rules it
    // may register, which this tool does not need but must not choke on.
    const fake = { PRS: { i18n: { add: add, grammar: function () { return {}; } } } };
    fake.window = fake;
    for (const name of fs.readdirSync(dir).sort()) {
        if (!name.endsWith(".js")) continue;
        const text = fs.readFileSync(path.join(dir, name), "utf8");
        new Function("window", "console", text)(fake, console);
    }
    return out;
}

function languages() {
    const dir = path.join(ROOT, "game", "i18n");
    return fs.readdirSync(dir)
        .filter((n) => fs.statSync(path.join(dir, n)).isDirectory())
        .sort();
}

function jsString(s) {
    return JSON.stringify(s).split(NOTE).join("\\u241F");
}

function main() {
    const args = process.argv.slice(2);
    const want = args.filter((a) => a[0] !== "-")[0] || null;
    const stale = args.indexOf("--stale") >= 0;

    const keys = new Map();                     // key -> the first place the game says it
    for (const file of sources()) {
        for (const hit of scanFile(file)) if (!keys.has(hit.key)) keys.set(hit.key, hit);
    }

    if (!want) {
        console.log(keys.size + " keys in the source.\n");
        for (const code of languages()) {
            const cat = catalogue(code) || {};
            let have = 0;
            for (const k of keys.keys()) if (cat[k] !== undefined) have++;
            const pct = keys.size ? Math.round((have / keys.size) * 100) : 100;
            const extra = Object.keys(cat).filter((k) => !keys.has(k)).length;
            console.log("  " + code + "  " + String(pct).padStart(3) + "%  " +
                        have + " of " + keys.size +
                        (extra ? "   (" + extra + " no longer in the source)" : ""));
        }
        console.log("\nnode tools/i18n_scan.js <code>  prints the missing ones as a stub catalogue.");
        return;
    }

    const cat = catalogue(want);
    if (!cat) { console.error("No catalogue at game/i18n/" + want + "/."); process.exit(1); }

    if (stale) {
        const gone = Object.keys(cat).filter((k) => !keys.has(k)).sort();
        if (!gone.length) { console.log("Nothing stale in " + want + "."); return; }
        console.log("// " + gone.length + " keys in " + want + " the source no longer says:");
        for (const k of gone) console.log("  " + jsString(k));
        return;
    }

    const missing = [];
    for (const pair of keys) if (cat[pair[0]] === undefined) missing.push(pair);
    if (!missing.length) { console.log("// " + want + " is complete: " + keys.size + " keys."); return; }
    console.log("// " + missing.length + " of " + keys.size + " keys still to write in " + want + ".");
    // Printed as pairs, because a key is a whole sentence and an object key cannot be two
    // literals joined with a +.
    console.log("PRS.i18n.add(" + JSON.stringify(want) + ", [");
    let file = null;
    for (const pair of missing) {
        if (pair[1].file !== file) { file = pair[1].file; console.log("\n    // " + file); }
        console.log("    [" + jsString(pair[0]) + ",\n     " + jsString(pair[0]) + "],");
    }
    console.log("]);");
}

main();
