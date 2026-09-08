// Engine bits with no opinion about aeroplanes: a seeded RNG, small maths, DOM sugar, and the
// namespace every other file hangs itself off. Classic script, no modules, because the game has
// to run from a double-clicked index.html and file:// will not load an ES module.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};

    // ------------------------------------------------------------------------------- random ---
    // Mulberry32. Seeded, because a run should be reproducible from its seed and because the
    // incident report at the end quotes the seed like a flight number.
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
        rng.int = (n) => Math.floor(rng() * n);
        rng.range = (lo, hi) => lo + rng() * (hi - lo);
        rng.irange = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
        rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
        rng.chance = (p) => rng() < p;
        rng.shuffle = function (arr) {
            const out = arr.slice();
            for (let i = out.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                const t = out[i]; out[i] = out[j]; out[j] = t;
            }
            return out;
        };
        // Pick without repeating until the bag is empty: for flavour lines, so the same joke does
        // not land twice in a row.
        rng.bagPicker = function (arr) {
            let bag = [];
            return function () {
                if (!bag.length) bag = rng.shuffle(arr);
                return bag.pop();
            };
        };
        return rng;
    }

    function seedFromString(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
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
        makeRng, seedFromString, clamp, clamp01, lerp, inv, mmss, costLabel, plural,
        listSentence, el, $, $$, clear, store,
    };
})(window);
