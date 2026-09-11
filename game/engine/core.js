// Engine bits with no opinion about aeroplanes: a seeded RNG, small maths, DOM sugar, and the
// namespace every other file hangs itself off. Classic script, no modules, because the game has
// to run from a double-clicked index.html and file:// will not load an ES module.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};

    // ------------------------------------------------------------------------------- random ---
    // Mulberry32. Seeded, because a run should be reproducible from its seed and because the
    // incident report at the end quotes the seed like a flight number.
    //
    // Nothing in a flight draws from one long stream. Every roll the game makes comes from a
    // stream of its own, named for what it decides and seeded from the flight's seed and that
    // name (`hashSeed`), so whether row 14 catches or what the cabin does on its third turn does
    // not depend on how many people you spoke to first. A seed is a whole flight; what you do in
    // it is the only thing that varies. `constRng` is the same interface with the dice glued
    // down, which is what perfect luck flies on.
    function attach(rng, unit) {
        // `unit` is the draw kept below 1, for the helpers that index with it.
        rng.int = (n) => Math.floor(unit() * n);
        rng.range = (lo, hi) => lo + rng() * (hi - lo);
        rng.irange = (lo, hi) => lo + Math.floor(unit() * (hi - lo + 1));
        rng.pick = (arr) => arr[Math.floor(unit() * arr.length)];
        rng.chance = (p) => rng() < p;
        // How much hazard something sits through before it happens: the waiting time of a thing
        // that has a small chance every second, with a mean of one. Infinity when the draw is 1.
        rng.expo = () => -Math.log(1 - rng());
        rng.shuffle = function (arr) {
            const out = arr.slice();
            for (let i = out.length - 1; i > 0; i--) {
                const j = Math.floor(unit() * (i + 1));
                const t = out[i]; out[i] = out[j]; out[j] = t;
            }
            return out;
        };
        return rng;
    }

    function makeRng(seed) {
        let a = seed >>> 0;
        const rng = function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        rng.seed = seed >>> 0;
        rng.save = () => a;
        rng.load = (v) => { a = v >>> 0; };
        return attach(rng, rng);
    }

    /** Dice that always land on `v`: 0 is the lowest they go, 1 the highest, 0.5 the middle. */
    function constRng(v) {
        const rng = function () { return v; };
        rng.seed = null;
        rng.save = () => 0;
        rng.load = () => {};
        return attach(rng, () => Math.min(v, 1 - 1e-9));
    }

    function seedFromString(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    /**
     * One 32-bit seed for a named thing inside a flight, from the flight's seed and the name:
     * "mood:p14", "event:3", "fire:vent:0". The flight is the seed; the name is what is being
     * decided; nothing about how the flight was played comes into it.
     */
    function hashSeed(seed, key) {
        const s = seed >>> 0;
        let h = 2166136261 >>> 0;
        for (const b of [s & 255, (s >>> 8) & 255, (s >>> 16) & 255, s >>> 24]) {
            h ^= b;
            h = Math.imul(h, 16777619);
        }
        for (let i = 0; i < key.length; i++) {
            h ^= key.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        // Stir, so that seeds a bit apart do not start their streams a bit apart.
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        return (h ^ (h >>> 16)) >>> 0;
    }

    // -------------------------------------------------------------------------------- maths ---
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const clamp01 = (v) => clamp(v, 0, 1);
    const lerp = (a, b, t) => a + (b - a) * t;
    const inv = (v, lo, hi) => clamp01((v - lo) / (hi - lo));

    // Seconds as the cabin clock shows them.
    function mmss(seconds) {
        const s = Math.max(0, Math.round(seconds));
        const m = Math.floor(s / 60);
        return m + ":" + String(s % 60).padStart(2, "0");
    }

    // "9s", "1m 04s" - for action costs, where the shape of the number is the whole warning.
    function costLabel(seconds) {
        const s = Math.round(seconds);
        if (s < 60) return s + "s";
        return Math.floor(s / 60) + "m " + String(s % 60).padStart(2, "0") + "s";
    }

    /** A hex colour, multiplied. Under 1 darkens; over 1 lightens, up to white. */
    function shade(hex, f) {
        const n = parseInt(hex.slice(1), 16);
        const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
        const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
    }

    function plural(n, one, many) {
        return n + " " + (n === 1 ? one : (many || one + "s"));
    }

    // A list read as a sentence: "a, b and c". Used everywhere the report speaks.
    function listSentence(items, conj) {
        conj = conj || "and";
        if (!items.length) return "";
        if (items.length === 1) return items[0];
        return items.slice(0, -1).join(", ") + " " + conj + " " + items[items.length - 1];
    }

    // ---------------------------------------------------------------------------------- dom ---
    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) {
            for (const key in attrs) {
                const v = attrs[key];
                if (v === null || v === undefined || v === false) continue;
                if (key === "class") node.className = v;
                else if (key === "text") node.textContent = v;
                else if (key === "html") node.innerHTML = v;
                else if (key === "style" && typeof v === "object") Object.assign(node.style, v);
                else if (key.slice(0, 2) === "on" && typeof v === "function") {
                    node.addEventListener(key.slice(2).toLowerCase(), v);
                } else if (key === "dataset") Object.assign(node.dataset, v);
                else node.setAttribute(key, v === true ? "" : v);
            }
        }
        if (children) {
            for (const child of [].concat(children)) {
                if (child === null || child === undefined || child === false) continue;
                node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
            }
        }
        return node;
    }

    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
        return node;
    }

    // ------------------------------------------------------------------------------ storage ---
    // Best effort. A file:// page in some browsers has no localStorage at all, and the game must
    // not care: the run history is a nicety, not a system.
    const store = {
        get(key, fallback) {
            try {
                const raw = global.localStorage.getItem("prs." + key);
                return raw === null ? fallback : JSON.parse(raw);
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { global.localStorage.setItem("prs." + key, JSON.stringify(value)); return true; }
            catch (e) { return false; }
        },
        drop(key) {
            try { global.localStorage.removeItem("prs." + key); } catch (e) { /* fine */ }
        },
    };

    PRS.util = {
        makeRng, constRng, hashSeed, seedFromString, clamp, clamp01, lerp, inv, mmss, costLabel,
        plural, shade,
        listSentence, el, $, $$, clear, store,
    };
})(window);
