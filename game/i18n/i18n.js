// Language. One catalogue per language, keyed by the English the game was written in.
//
// Every string a player can read goes through `T(...)`, which is `PRS.i18n.t`. The key is the
// English sentence itself, so an untranslated string is not a missing box on the screen, it is
// the English, and the game is never broken by a gap in a catalogue. `tools/i18n_scan.js` walks
// the source for the keys and prints what each language is still missing, which is the only
// list anybody translating from here needs.
//
// Interpolation is `{name}`, filled from the second argument, because German does not put the
// pieces of a sentence in the order English does and a translator has to be free to move them:
//
//     T("It drops to {what}.", { what: F.describe(...) })
//
// Anything that is not a whole sentence in the source is not a key. Fragments glued together
// with + are wrapped as one key each, never split across the +, or a translator would be
// handed half a clause and no way to reorder it.
//
// Numbers, plurals and lists are language-shaped too, so `n()` and `list()` live here and
// PRS.util.plural / listSentence defer to them.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    // The languages on offer, in the order the picker shows them. `self` is the name in its own
    // language, which is the only name a speaker of it will recognise at a glance.
    const LANGS = [
        { code: "en", self: "English",  flag: "EN" },
        { code: "de", self: "Deutsch",  flag: "DE" },
    ];

    const CATALOGS = { en: {} };
    const MISSED = {};              // language -> { key: true }, for the coverage tool
    const LISTENERS = [];

    let current = "en";
    let started = false;

    /**
     * Add (or extend) a catalogue. Called by game/i18n/<code>/*.js, which may be several files.
     *
     * `entries` is an object when the keys are short enough to be object keys, and an array of
     * [key, line] pairs when they are not: a key here is a whole English sentence and JavaScript
     * will not let an object key be two literals joined with +, so a sentence that does not fit
     * on one line has to arrive as a pair.
     */
    function add(code, entries) {
        const c = CATALOGS[code] = CATALOGS[code] || {};
        const put = function (key, line) {
            if (c[key] !== undefined && c[key] !== line) {
                console.warn("i18n: " + code + " defines a key twice: " + JSON.stringify(key));
            }
            c[key] = line;
        };
        if (Array.isArray(entries)) {
            for (const pair of entries) put(pair[0], pair[1]);
        } else {
            for (const key in entries) put(key, entries[key]);
        }
        return c;
    }

    function known(code) { return LANGS.some((l) => l.code === code); }

    /** What the browser is set to, if the game speaks it. */
    function detect() {
        let tags = [];
        try {
            tags = (global.navigator.languages || [global.navigator.language || ""]).slice();
        } catch (e) { tags = []; }
        for (const tag of tags) {
            const code = String(tag).toLowerCase().split("-")[0];
            if (known(code)) return code;
        }
        return "en";
    }

    /** The language this browser last chose, or the one it is set to, once. */
    function start() {
        if (started) return current;
        started = true;
        const saved = PRS.util.store.get("lang", null);
        setLang(known(saved) ? saved : detect(), true);
        return current;
    }

    function lang() { return started ? current : start(); }

    function setLang(code, quiet) {
        if (!known(code)) code = "en";
        const changed = code !== current;
        current = code;
        PRS.util.store.set("lang", code);
        try { global.document.documentElement.lang = code; } catch (e) { /* no document */ }
        if (changed && !quiet) for (const fn of LISTENERS.slice()) fn(code);
        return current;
    }

    function onChange(fn) { LISTENERS.push(fn); return fn; }

    function langInfo(code) {
        return LANGS.filter((l) => l.code === (code || lang()))[0] || LANGS[0];
    }

    // ---------------------------------------------------------------------------- the lookup ---

    const FIELD = /\{(\w+)\}/g;

    function fill(str, vars) {
        if (!vars) return str;
        return str.replace(FIELD, function (whole, name) {
            const v = vars[name];
            return v === undefined || v === null ? whole : String(v);
        });
    }

    /**
     * The English source string, in the language in play. Unknown keys come back as they went
     * in, which is how a half-translated catalogue still ships.
     */
    function t(src, vars) {
        if (src === null || src === undefined) return src;
        const code = lang();
        if (code === "en") return fill(String(src), vars);
        const hit = CATALOGS[code] && CATALOGS[code][src];
        if (hit === undefined) {
            (MISSED[code] = MISSED[code] || {})[src] = true;
            return fill(String(src), vars);
        }
        return fill(hit, vars);
    }

    /**
     * The same, for a word too short to be a key on its own. "s" is seconds here and something
     * else three files away, and a translator handed a bare "s" cannot tell which. The catalogue
     * key is the word and the note together; the fallback is the plain word.
     */
    const NOTE = "␟";
    function tx(src, note, vars) {
        const code = lang();
        if (code === "en") return fill(String(src), vars);
        const key = src + NOTE + note;
        const hit = CATALOGS[code] && CATALOGS[code][key];
        if (hit === undefined) {
            (MISSED[code] = MISSED[code] || {})[key] = true;
            return fill(String(src), vars);
        }
        return fill(hit, vars);
    }

    // ------------------------------------------------------------------------- grammar ---
    //
    // The places where a language needs a rule and not a sentence. English wants "a smoke hood"
    // and "an inhaler" and the head noun decides which; German wants "eine Rauchhaube" and "ein
    // Inhalator" and the noun's gender decides, which no algorithm can read off the spelling.
    // So a catalogue may register a function of its own and the English one is the default.
    //
    //   PRS.i18n.grammar("de", { article: (name) => ... })

    const RULES = {};

    function grammar(code, rules) {
        if (rules) RULES[code] = Object.assign(RULES[code] || {}, rules);
        return RULES[code] || {};
    }

    /** The rule this language has for `what`, or nothing, in which case English is the rule. */
    function rule(what) {
        const r = RULES[lang()];
        return r && r[what] ? r[what] : null;
    }

    /** Whether this language has a line for that key. For the coverage tool and the tests. */
    function has(src, code) {
        code = code || lang();
        if (code === "en") return true;
        return !!(CATALOGS[code] && CATALOGS[code][src] !== undefined);
    }

    /** Every key asked for in this session that the language had nothing for. */
    function missing(code) { return Object.keys(MISSED[code || lang()] || {}).sort(); }

    function catalogue(code) { return CATALOGS[code || lang()] || {}; }

    // ------------------------------------------------------------------ numbers, lists, time ---

    /**
     * "1 flight", "6 flights". `one` and `many` are the English words; both are keys, because a
     * language can inflect the noun in ways a suffix cannot reach.
     */
    function n(count, one, many) {
        many = many || one + "s";
        return count + " " + t(count === 1 ? one : many);
    }

    /** "a, b and c" - and in German, "a, b und c". */
    function list(items, conj) {
        items = items.filter((s) => s !== null && s !== undefined && s !== "");
        if (!items.length) return "";
        if (items.length === 1) return items[0];
        const word = conj ? t(conj) : t("and");
        return items.slice(0, -1).join(", ") + " " + word + " " + items[items.length - 1];
    }

    /**
     * A string in a data file: the English, unchanged, marked so the scanner finds it.
     *
     * Data modules are evaluated once when the page loads, so a `T()` in one would freeze the
     * language they were loaded in and the picker would do nothing. So the data keeps the
     * English and whoever prints it calls `T()` on the way to the screen: the label of an action
     * in actions.make, the name of an item where the bag is drawn. Nothing is lost - the key is
     * still the English sentence - and the language can change under a cabin already built.
     */
    function k(src) { return src; }

    PRS.i18n = { LANGS, NOTE, add, grammar, rule, start, lang, setLang, onChange, langInfo,
                 detect, known, t, tx, k, has, missing, catalogue, n, list, fill };
    // The short names, because they are about to appear a few thousand times.
    PRS.t = t;
    PRS.tx = tx;
    PRS.k = k;
})(window);
