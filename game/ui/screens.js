// Every screen that is not the aeroplane: the title, the setup, the two pages a slot opens, the
// help, the previous flights, and the incident report.
//
// The title is a boarding pass and nothing else: a face, a name, a seat, one line about what
// that person is for, and the button. It boards you in one click as whoever you were last time.
//
// Everything you can change is a screen further in, behind "Change who you are", which appears
// from the second flight: the nine cards, the stat bars, and the five boxes for what you are
// wearing, the three things on you and the seed the dice are cast from. A box opens a page of
// choices, unless it is part of who the character is, in which case it has a lock in the corner.
// The loadout lived on the title once and it made the first screen of the game a row of
// vocabulary - "bottle of water · 3 uses", "any seed · seed" - aimed at a player who does not
// exist yet, because nobody has a view about the bottle before they have flown.
//
// The report is the point of the whole thing: it is written in the flat voice of an air accident
// investigator, it lists every soul on board by seat with what happened to them, and it quotes
// your own actions back at you in the order you took them. Then it writes the flight into the
// log book and boards you again.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el, $, clear, mmss, costLabel, store } = PRS.util;
    const T = PRS.t, X = PRS.tx, K = PRS.k;

    let host = null;

    // Who the next flight is flown by, in what, and with what. Boarding saves it.
    const choice = { characterId: "ansel", outfitId: null, items: null,
                     seed: null, seedText: "" };
    let choiceLoaded = false;

    /**
     * The choice, made sane: a saved character or outfit can be locked in this browser, a bag
     * can name things that are not in the pool, and a character's kit is always in their bag.
     */
    function ready() {
        if (!choiceLoaded) {
            choiceLoaded = true;
            const saved = store.get("choice", null);
            if (saved && typeof saved === "object") {
                if (typeof saved.characterId === "string") choice.characterId = saved.characterId;
                if (typeof saved.outfitId === "string") choice.outfitId = saved.outfitId;
                if (Array.isArray(saved.items)) choice.items = saved.items.slice();
                if (typeof saved.seedText === "string") setSeed(saved.seedText);
            }
            // ?seed=606 or ?seed=PARIS on the address bar is a flight somebody sent you, and it
            // wins over whatever was saved.
            try {
                const q = new URLSearchParams(global.location.search);
                if (q.has("seed")) setSeed(q.get("seed"));
            } catch (e) { /* no address bar to read */ }
        }
        const C = PRS.data.characters, O = PRS.data.outfits, D = PRS.data.items, L = PRS.logbook;
        if (!L.isUnlocked(C.byId(choice.characterId))) choice.characterId = C.CHARACTERS[0].id;
        const ch = C.byId(choice.characterId);
        const o = O.byId(choice.outfitId);
        if (!o || !L.isUnlocked(o)) choice.outfitId = null;
        if (!Array.isArray(choice.items)) choice.items = ch.bag.slice();
        const allowed = (id) => { const it = D.byId(id); return it && (it.pool || ch.kit.indexOf(id) >= 0); };
        let items = choice.items.filter((id, i, all) => allowed(id) && all.indexOf(id) === i);
        for (const id of ch.kit) if (items.indexOf(id) < 0) items.unshift(id);
        choice.items = items.slice(0, D.SLOTS);
        return choice;
    }

    function saveChoice() {
        store.set("choice", { characterId: choice.characterId, outfitId: choice.outfitId,
                              items: choice.items.slice(), seedText: choice.seedText });
    }

    /** A seed typed or pasted: digits are the seed itself, and a word is hashed into one. */
    function setSeed(text) {
        const t = String(text === null || text === undefined ? "" : text).trim();
        if (!t) { choice.seed = null; choice.seedText = ""; return; }
        choice.seedText = t.slice(0, 40);
        choice.seed = /^\d+$/.test(choice.seedText) ? (Number(choice.seedText) % 4294967296) >>> 0
                                                    : PRS.util.seedFromString(choice.seedText);
    }

    function mount(node) { host = node; }
    function show(builder) {
        if (PRS.play && PRS.play.destroy) PRS.play.destroy();
        clear(host);
        builder(host);
        window.scrollTo(0, 0);
    }

    // --------------------------------------------------------------------------------- title ---

    function title() {
        ready();
        show(function (root) {
            root.className = "screen title";
            const book = PRS.logbook.load();
            const ch = PRS.data.characters.byId(choice.characterId);
            root.appendChild(el("div", { class: "title-inner" }, [
                el("div", { class: "kicker", text: T("TRANSNATIONAL 447 · 31,000 FT · DESCENT") }),
                el("h1", { text: T("PLEASE REMAIN SEATED") }),
                // One line, not the premise. The locker, the fifteen minutes and the clock that
                // only moves when you do are all in the opening lines of the log in play.js,
                // said better, ten seconds later, over a picture of the fire. This is the
                // situation and the hook and nothing else - and it names the fire, because
                // "you are the only one who has noticed" on its own is a riddle.
                el("p", { class: "tag", text:
                    T("There is a fire. You are the only one who has noticed.") }),
                el("div", { class: "title-facts" }, [
                    fact("61", T("souls on board")),
                    fact("15:00", T("to touchdown")),
                    fact(String(PRS.actions.count()), T("things you can do")),
                    fact("0", T("ways to put it out")),
                ]),
                pass(),
                // A first flight is one click. The roster and the previous flights appear once
                // there is a log book to put them in.
                el("div", { class: "title-buttons" }, [
                    book.flights ? el("button", { text: T("Change who you are"), onclick: setup }) : null,
                    el("button", { text: T("How to play"), onclick: () => help(root, ch) }),
                    book.flights ? el("button", { text: T("Previous flights ({n})",
                                                          { n: book.flights }),
                                                  onclick: flights }) : null,
                    el("button", { text: T("Settings"),
                                   onclick: () => PRS.settings.open(root, title) }),
                ]),
                book.flights ? el("p", { class: "footnote logline", text: logLine(book) }) : null,
            ]));
        });
    }

    function fact(n, label) {
        return el("div", { class: "fact" }, [el("b", { text: n }), el("i", { text: label })]);
    }

    /** One sentence about the book: how far it has got, and what the souls turn over next. */
    function logLine(book) {
        const n = PRS.logbook.counts(book);
        const next = PRS.logbook.nextOutfit(book);
        return T("{flights} · {souls} saved · {people} of {ofPeople} people and " +
                 "{outfits} of {ofOutfits} outfits", {
                     flights: PRS.util.plural(book.flights, K("flight"), K("flights")),
                     souls: PRS.util.plural(book.souls, K("soul"), K("souls")),
                     people: n.people, ofPeople: n.ofPeople,
                     outfits: n.outfits, ofOutfits: n.ofOutfits,
                 }) +
            (next ? T(" · next outfit at {n} souls.", { n: next.unlock }) : ".");
    }

    /**
     * The boarding pass: who the button puts on the aeroplane, and the button.
     *
     * The loadout used to be here, as five boxes under the name. It is not any more, and the
     * reason is who reads this screen. Five boxes saying "bottle of water · 3 uses" and "any
     * seed · seed" are five useful controls to somebody on their ninth flight and five pieces
     * of unexplained vocabulary to somebody on their first, and the first flight is the one
     * that decides whether there is a ninth. So the pass is a pass - a face, a name, a seat -
     * and the one line that says what this person is for. Everything you can change about them
     * is behind "Change who you are", next to the stat bars and the locked cards that explain
     * what the changing is for.
     */
    function pass() {
        const ch = PRS.data.characters.byId(choice.characterId);
        return el("div", { class: "pass" }, [
            PRS.atlas.icon("pax", 3, PRS.pax.palette(ch)),
            el("div", { class: "pass-who" }, [
                el("b", { text: ch.name }),
                el("i", { text: T("{title} · seat {seat}",
                                  { title: T(ch.title), seat: ch.seat }) }),
                el("u", { class: "pass-lean", text: T(ch.lean) }),
            ]),
            el("button", { class: "big pass-go", text: T("Board"), onclick: begin }),
        ]);
    }

    // --------------------------------------------------------------------------- the slots ---
    //
    // What you are wearing and the three things on you, as four boxes. A box opens a page,
    // unless it is part of who the character is. The pass and the setup panel both use this, so
    // they cannot disagree.

    function slots(ch, back) {
        const D = PRS.data.items, O = PRS.data.outfits;
        const row = el("div", { class: "slots" });
        const outfit = O.byId(choice.outfitId);
        row.appendChild(slot({
            icon: O.icon(outfit, ch, 3),
            label: outfit ? PRS.loot.short(T(outfit.name)) : T("as you are"),
            sub: outfit ? O.summary(outfit) : T("wearing"),
            open: () => wardrobe(back),
        }));
        for (let i = 0; i < D.SLOTS; i++) {
            const id = choice.items[i] || null;
            const item = id ? D.byId(id) : null;
            const fixed = !!id && ch.kit.indexOf(id) >= 0;
            row.appendChild(slot({
                icon: item ? PRS.atlas.icon(item.sprite.split(":")[1], 3)
                           : el("span", { class: "slot-empty", text: String(i + 1) }),
                label: item ? PRS.loot.short(T(item.name)) : T("nothing"),
                sub: fixed ? T("kit")
                           : (item ? (item.uses === null ? ""
                                                         : T("{n} uses", { n: item.uses }))
                                   : T("empty")),
                fixed: fixed,
                open: fixed ? null : () => bag(i, back),
            }));
        }
        // The fifth box is the seed: which aeroplane.
        row.appendChild(slot({
            icon: el("span", { class: "slot-empty slot-dice", text: "⚄" }),
            label: choice.seed === null ? T("any seed") : choice.seedText,
            sub: T("seed"),
            open: () => flight(back),
        }));
        return row;
    }

    function slot(spec) {
        return el("button", {
            class: "slot" + (spec.fixed ? " fixed" : " opens"),
            title: spec.fixed ? T("Part of who they are") : T("Click to change"),
            onclick: spec.open ? () => { PRS.audio.unlock(); PRS.audio.play("blip"); spec.open(); }
                               : null,
        }, [
            spec.icon,
            el("b", { text: spec.label }),
            el("i", { text: spec.sub || "" }),
            spec.fixed ? el("span", { class: "slot-lock", text: T("KIT") })
                       : el("span", { class: "slot-caret", text: "▾" }),
        ]);
    }

    /** What you are wearing: every outfit, the locked ones saying what turns them over. */
    function wardrobe(back) {
        ready();
        show(function (root) {
            root.className = "screen picker";
            const C = PRS.data.characters, O = PRS.data.outfits, L = PRS.logbook;
            const ch = C.byId(choice.characterId);
            const book = L.load();
            const pick = (id) => {
                choice.outfitId = id;
                saveChoice();
                PRS.audio.unlock();
                PRS.audio.play("select");
                back();
            };
            const grid = el("div", { class: "option-grid" });
            grid.appendChild(el("button", {
                class: "option" + (!choice.outfitId ? " on" : ""),
                onclick: () => pick(null),
            }, [
                O.icon(null, ch, 3),
                el("div", { class: "option-text" }, [
                    el("b", { text: T("What you flew in") }),
                    el("span", { class: "option-mod", text: T("as you are") }),
                    el("i", { text: T("Whatever {who} had on. The five numbers are the five " +
                                      "numbers.", { who: ch.short }) }),
                ]),
            ]));
            for (const o of O.OUTFITS) {
                const open = L.isUnlocked(o, book);
                grid.appendChild(el("button", {
                    class: "option" + (choice.outfitId === o.id ? " on" : "") + (open ? "" : " locked"),
                    onclick: open ? () => pick(o.id) : null,
                }, [
                    O.icon(o, ch, 3),
                    el("div", { class: "option-text" }, [
                        el("b", { text: T(o.name) }),
                        el("span", { class: "option-mod", text: O.summary(o) }),
                        open ? el("i", { text: T(o.blurb) }) : null,
                        open ? el("u", { text: T(o.note) })
                             : el("u", { class: "locked",
                                         text: T("Unlocks at {n} souls · {have} so far",
                                                 { n: o.unlock, have: book.souls }) }),
                    ]),
                ]));
            }
            root.appendChild(el("h2", { text: T("What you are wearing") }));
            root.appendChild(el("p", { class: "lede", text:
                T("It does nothing except move {who}'s five numbers. Two points of speed is " +
                  "a second off every step of nine hundred of them, and two points of voice is " +
                  "the difference between being believed at minute four and at minute nine.",
                  { who: ch.short }) }));
            root.appendChild(grid);
            root.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { text: T("Back"), onclick: back }),
            ]));
        });
    }

    /** What is on you: everything that can go in this slot, and nothing. */
    function bag(index, back) {
        ready();
        show(function (root) {
            root.className = "screen picker";
            const C = PRS.data.characters, D = PRS.data.items;
            const ch = C.byId(choice.characterId);
            const current = choice.items[index] || null;
            const pick = (id) => {
                if (id === null) choice.items.splice(index, 1);
                else if (current) choice.items[index] = id;
                else choice.items.push(id);
                saveChoice();
                PRS.audio.unlock();
                PRS.audio.play("select");
                back();
            };
            const grid = el("div", { class: "option-grid" });
            grid.appendChild(el("button", {
                class: "option" + (!current ? " on" : ""),
                onclick: () => pick(null),
            }, [
                el("span", { class: "slot-empty", text: String(index + 1) }),
                el("div", { class: "option-text" }, [
                    el("b", { text: T("Nothing") }),
                    el("i", { text: T("An empty slot. Both hands free, and everything you need is " +
                                    "somebody else's.") }),
                ]),
            ]));
            for (const it of D.pool()) {
                if (it.id !== current && choice.items.indexOf(it.id) >= 0) continue;
                grid.appendChild(el("button", {
                    class: "option" + (it.id === current ? " on" : ""),
                    onclick: () => pick(it.id),
                }, [
                    PRS.atlas.icon(it.sprite.split(":")[1], 3),
                    el("div", { class: "option-text" }, [
                        el("b", { text: T(it.name) }),
                        el("i", { text: T(it.note) }),
                        it.uses !== null
                            ? el("u", { text: it.refill
                                  ? T("{n} uses, refilled at the tap", { n: it.uses })
                                  : T("{n} uses", { n: it.uses }) })
                            : null,
                    ]),
                ]));
            }
            root.appendChild(el("h2", { text: T("What is on you") }));
            root.appendChild(el("p", { class: "lede", text:
                T("Slot {n} of {of}. Three things is the cabin baggage allowance, and the " +
                  "airline is going to keep enforcing it while its aeroplane is on fire. " +
                  "Everything else is aboard: in the galley drawers, in the crew's kit, and in " +
                  "other passengers' laps.", { n: index + 1, of: D.SLOTS }) }));
            root.appendChild(grid);
            root.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { text: T("Back"), onclick: back }),
            ]));
        });
    }

    /** Which aeroplane: the seed every die in the flight is cast from. */
    function flight(back) {
        ready();
        show(function (root) {
            root.className = "screen picker";
            const done = function () {
                saveChoice();
                PRS.audio.unlock();
                PRS.audio.play("select");
                back();
            };

            const seeds = el("div", { class: "option-grid" });
            seeds.appendChild(el("button", {
                class: "option" + (choice.seed === null ? " on" : ""),
                onclick: () => { setSeed(""); done(); },
            }, [
                el("span", { class: "slot-empty slot-dice", text: "⚄" }),
                el("div", { class: "option-text" }, [
                    el("b", { text: T("Whatever comes") }),
                    el("i", { text: T("A new seed every flight. The report quotes it, so a flight " +
                                    "worth flying again is one number away.") }),
                ]),
            ]));
            const input = el("input", { class: "seed-input", type: "text", maxlength: "40",
                                        placeholder: T("606, or a word"), spellcheck: "false",
                                        value: choice.seedText || "" });
            const take = () => { setSeed(input.value); done(); };
            // Typing is not a keyboard shortcut, and Enter is the button.
            input.addEventListener("keydown", (ev) => {
                ev.stopPropagation();
                if (ev.key === "Enter") take();
            });
            seeds.appendChild(el("div", { class: "option" + (choice.seed !== null ? " on" : "") }, [
                el("span", { class: "slot-empty", text: "#" }),
                el("div", { class: "option-text" }, [
                    el("b", { text: T("This seed") }),
                    el("i", { text: T("Every die in the flight is cast from it before you board: " +
                                    "what mood each passenger is in, when row 14 catches, what " +
                                    "the cabin does on its third turn. Two flights on one seed " +
                                    "differ only in what you do. The address bar takes it too: " +
                                    "index.html?seed=606.") }),
                    input,
                    el("div", { class: "title-buttons" }, [
                        el("button", { text: T("Fly this seed"), onclick: take }),
                    ]),
                ]),
            ]));

            root.appendChild(el("h2", { text: T("Which flight") }));
            root.appendChild(el("p", { class: "lede", text:
                T("It is the same aeroplane every time and the fire is in the same locker. What " +
                "the seed decides is everything that could have gone either way.") }));
            root.appendChild(seeds);
            root.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { text: T("Back"), onclick: back }),
            ]));
        });
    }

    // ---------------------------------------------------------------------------------- setup ---
    //
    // Who you are: nine cards and the composite you. A locked card says exactly what turns it
    // over, because a row of question marks is not something anybody can aim at.

    function setup() {
        ready();
        show(function (root) {
            root.className = "screen picker";
            paintSetup(root);
        });
    }

    /** Rebuilt in place on every click, with the scroll kept where it was. */
    function paintSetup(root) {
        const y = window.scrollY;
        clear(root);
        const C = PRS.data.characters, O = PRS.data.outfits, L = PRS.logbook;
        ready();
        const book = L.load();
        const ch = C.byId(choice.characterId);
        const outfit = O.byId(choice.outfitId);
        const repaint = function (sound) {
            PRS.audio.unlock();
            PRS.audio.play(sound || "select");
            paintSetup(root);
        };

        const chars = el("div", { class: "char-grid" });
        for (const c of C.CHARACTERS) {
            const open = L.isUnlocked(c, book);
            chars.appendChild(el("button", {
                class: "char" + (choice.characterId === c.id ? " on" : "") +
                       (open ? "" : " locked"),
                onclick: !open ? null : function () {
                    if (choice.characterId !== c.id) {
                        choice.characterId = c.id;
                        choice.items = c.bag.slice();     // their bag, until you repack it
                        saveChoice();
                    }
                    repaint();
                },
            }, [
                el("div", { class: "char-face" }, [PRS.atlas.icon("pax", 5, PRS.pax.palette(c))]),
                el("div", { class: "char-id" }, [
                    el("b", { text: c.name }),
                    el("i", { text: T("{age} · {title}",
                                      { age: c.age, title: T(c.title) }) }),
                ]),
                open ? el("div", { class: "char-stats" }, statBars(c))
                     : el("div", { class: "char-lock" }, [
                           el("span", { class: "lock-tag", text: T("LOCKED") }),
                           el("i", { text: T(c.unlock.text) }),
                       ]),
                open ? el("u", { class: "char-lean", text: T(c.lean) }) : null,
            ]));
        }

        const panel = el("div", { class: "char-detail" }, [
            el("div", { class: "you-name" }, [
                PRS.atlas.icon("pax", 4, PRS.pax.palette(ch)),
                el("div", {}, [
                    el("b", { text: ch.name }),
                    el("i", { text: T("{age} · {title} · seat {seat}",
                                      { age: ch.age, title: T(ch.title), seat: ch.seat }) }),
                ]),
            ]),
            el("div", { class: "char-stats big-stats" }, statBars(ch, outfit)),
            slots(ch, setup),
            el("div", { class: "sub", text: outfit
                ? T("{name}. {note}", { name: T(outfit.name), note: T(outfit.note) })
                : T("What you flew in.") }),
            el("p", { text: T(ch.blurb) }),
            el("p", { class: "lean", text: T(ch.lean) }),
            el("div", { class: "title-buttons" }, [
                el("button", { class: "big", text: T("Board as {who}", { who: ch.short }),
                               onclick: begin }),
                el("button", { text: T("Back"), onclick: title }),
            ]),
        ]);

        root.appendChild(el("h2", { text: T("Who you are") }));
        root.appendChild(el("p", { class: "lede", text: logLine(book) + " " +
            T("A locked card says what turns it over: people by something you do on the " +
              "aeroplane, clothes by the souls in the book.") }));
        root.appendChild(el("div", { class: "picker-body" }, [chars, panel]));
        window.scrollTo(0, y);
    }

    /**
     * Four bars. With an outfit passed, the changed ones are coloured and the numbers move.
     * A stat can go past ten or under one now, and the bar cannot: it is ten wide and it stays
     * ten wide, so the eleventh point is a colour and a number rather than a longer bar.
     */
    function statBars(ch, outfit) {
        // Three letters each, and a language picks its own three. The note is what the bar
        // measures, because a bare "SPD" tells a translator nothing.
        const names = { strength: X("STR", "strength, on a stat bar"),
                        speed: X("SPD", "speed, on a stat bar"),
                        lungs: X("LNG", "lungs, on a stat bar"),
                        voice: X("VOI", "voice, on a stat bar") };
        const base = ch.stats;
        const now = outfit ? PRS.data.outfits.apply(base, outfit) : base;
        const out = [];
        for (const key in names) {
            const v = now[key];
            const delta = v - base[key];
            const dir = delta > 0 ? " up" : delta < 0 ? " down" : "";
            const edge = v > 10 ? " over" : v < 1 ? " under" : "";
            out.push(el("div", { class: "stat" + edge }, [
                el("span", { text: names[key] }),
                el("div", { class: "stat-track" }, [
                    el("div", { class: "stat-fill" + dir + edge,
                                style: { width: Math.max(0, Math.min(10, v)) * 10 + "%" } }),
                ]),
                el("b", { class: (dir + edge).trim(), text: String(v) }),
            ]));
        }
        return out;
    }

    // ------------------------------------------------------------------------------ boarding ---

    /** One click, from the title, the setup or the report. Remembers who, in what, with what. */
    function begin() {
        ready();
        saveChoice();
        const S = PRS.state.create({
            characterId: choice.characterId,
            outfitId: choice.outfitId,
            items: choice.items.slice(),
            seed: choice.seed === null ? (Math.random() * 0xffffffff) >>> 0 : choice.seed,
        });
        PRS.current = S;
        PRS.audio.unlock();
        PRS.audio.startRoar();
        PRS.audio.play("chime");
        if (PRS.play && PRS.play.destroy) PRS.play.destroy();
        clear(host);
        PRS.play.build(host, S);
    }

    // ---------------------------------------------------------------------------------- help ---

    /** Five sentences, with pictures, over whatever screen is showing. */
    function help(root, character) {
        if ($(".help-veil", root)) return;
        const you = PRS.pax.palette(character);
        const someone = { hair: "#4a3220", skin: "#c08a5e", shirt: "#25355c" };
        const veil = el("div", { class: "help-veil",
                                 onclick: (ev) => { if (ev.target === veil) hideHelp(root); } }, [
            el("div", { class: "help" }, [
                el("h3", { text: T("How to play") }),
                helpLine(PRS.atlas.icon("pax_worried", 2, PRS.pax.palette(someone)),
                    T("Click a person"),
                    T("to talk to them, treat them, or pick them up and carry them to a green " +
                      "end of the aeroplane. Nobody counts until they are there.")),
                helpLine(PRS.atlas.icon("fire_2", 2), T("Click the fire"),
                    T("to fight it. Nothing puts it out. Everything buys time.")),
                helpLine(PRS.atlas.icon("pax", 2, you), T("Click yourself"),
                    T("for everything about where you are standing - the tap, the lockers, the " +
                      "trolley - and for the things in your bag.")),
                helpLine(PRS.atlas.icon("floor_aisle", 2),
                    T("Click anywhere else to walk there."),
                    T("Whatever is under the pointer lights up, with the price. Arrow keys " +
                      "step.")),
                helpLine(el("span", { class: "help-clock", text: "0:09" }),
                    T("Time only moves when you act."),
                    T("Every click costs the seconds it says, and you watch them go by. " +
                      "Backspace takes the last one back, and so does walking back the way you " +
                      "came.")),
                el("div", { class: "title-buttons" }, [
                    el("button", { class: "big", text: T("Got it"), onclick: () => hideHelp(root) }),
                ]),
            ]),
        ]);
        root.appendChild(veil);
        // Escape closes it from any screen; the play screen has its own handler, which is fine.
        veil.onkey = (ev) => { if (ev.key === "Escape") hideHelp(root); };
        document.addEventListener("keydown", veil.onkey);
    }

    function helpLine(icon, head, body) {
        return el("div", { class: "help-line" }, [
            el("div", { class: "help-icon" }, [icon]),
            el("div", {}, [el("b", { text: head }), el("span", { text: body })]),
        ]);
    }

    function hideHelp(root) {
        const veil = root && $(".help-veil", root);
        if (veil) {
            if (veil.onkey) document.removeEventListener("keydown", veil.onkey);
            veil.remove();
        }
        store.set("seenHelp", true);
    }

    // ---------------------------------------------------------------------- previous flights ---

    function flights() {
        show(function (root) {
            root.className = "screen prose";
            const book = PRS.logbook.load();
            const C = PRS.data.characters, O = PRS.data.outfits;
            root.appendChild(el("div", { class: "prose-inner" }, [
                el("h2", { text: T("The log book") }),
                el("p", { text: logLine(book) }),
                el("div", { class: "history" }, book.history.map(function (h) {
                    const ch = C.byId(h.character);
                    const o = O.byId(h.outfit);
                    return el("div", { class: "hrow" }, [
                        PRS.atlas.icon("pax", 1, PRS.pax.palette(ch)),
                        el("b", { text: ch.short + (o ? ", " + T(o.name).toLowerCase() : "") }),
                        // What the book counted for that flight. Rows written before the book
                        // counted the difference have only the survivors, and say so.
                        el("span", { text: h.saved !== undefined
                            ? T("{n} saved", { n: h.saved })
                            : h.survived !== undefined
                                ? T("{n} survived", { n: h.survived })
                                : T("{n} secured", { n: h.secured }) }),
                        el("span", { text: T("{n} lost", { n: h.lost }) }),
                        el("span", { class: "grade-" + h.grade, text: h.grade }),
                        el("i", { text: T(h.ending) }),
                    ]);
                })),
                el("div", { class: "title-buttons" }, [
                    el("button", { text: T("Back"), onclick: title }),
                    PRS.recorder && PRS.recorder.all().length
                        ? el("button", { text: T("Save recorded flights ({n})",
                                                 { n: PRS.recorder.all().length }),
                                         onclick: saveFlights })
                        : null,
                    el("button", { text: T("Start the book again"), onclick: function () {
                        // Asked in the game's own furniture. window.confirm is not always
                        // allowed to open - inside the itch frame, or an app's own browser -
                        // and where it is not it answers no without ever asking, which is how
                        // this button came to do nothing at all.
                        PRS.settings.ask({
                            title: T("Start the book again?"),
                            body: T("Forget every flight, and lock everything the book " +
                                    "has unlocked?"),
                            yes: T("Forget every flight"),
                            onYes: function () {
                                PRS.logbook.forget();
                                PRS.audio.play("select");
                                title();
                            },
                        });
                    } }),
                ]),
            ]));
        });
    }

    // --------------------------------------------------------------------------------- report ---

    function report(S) {
        const R = S.result || PRS.scoring.settle(S);
        PRS.audio.stopRoar();
        PRS.audio.play("touchdown");
        show(function (root) {
            root.className = "screen report";
            const inner = el("div", { class: "report-inner" });

            inner.appendChild(el("div", { class: "rep-head" }, [
                el("div", { class: "rep-kicker", text:
                    T("AIR ACCIDENTS INVESTIGATION · PRELIMINARY REPORT · TRANSNATIONAL 447") }),
                el("h1", { text: T(R.ending.title) }),
            ]));

            inner.appendChild(el("div", { class: "rep-ending" },
                R.ending.text.split("\n\n").map((p) => el("p", { text: p }))));

            // The numbers, in the order the report puts them.
            inner.appendChild(el("h3", { text: T("Souls on board") }));
            inner.appendChild(el("div", { class: "tally" }, [
                tallyBox("61", T("on board"), ""),
                tallyBox(String(R.tally.unhurt), T("walked off"), "t-unhurt"),
                tallyBox(String(R.tally.treated), T("treated"), "t-treated"),
                tallyBox(String(R.tally.serious), T("serious"), "t-serious"),
                tallyBox(String(R.tally.lost), T("not accounted for"), "t-lost"),
            ]));
            // The cabin at touchdown, and everybody who was in it.
            //
            // The manifest used to be sixty-one rows of name, seat and outcome, and it was half
            // the length of this page: nobody read past row nine and nobody could see the shape
            // of it. The same sixty-one people are a photograph now, standing the way a crew
            // photograph stands, in the order the report cares about - the ones who walked off
            // first and the ones who did not last - so how the afternoon went is one look at a
            // strip of colour. Nothing is lost: everything a row used to say is in the card
            // under the photograph, one person at a time, and pointing at somebody puts the
            // crosshairs on the tile they were lying in, which a list could never do.
            const cv = el("canvas", { class: "rep-canvas" });
            cv.width = PRS.cabin.W * 8;
            cv.height = PRS.cabin.H * 8;
            inner.appendChild(el("h3", { text: T("The cabin at touchdown") }));
            inner.appendChild(el("div", { class: "rep-map" }, [cv, el("div", { class: "legend" }, [
                legend("#5fd67a", T("walked off")), legend("#e8c53a", T("treated")),
                legend("#e08a2a", T("serious")), legend("#d4483a", T("not accounted for")),
                legend("#ffffff", T("you")),
            ])]));

            inner.appendChild(el("h3", { text: T("Manifest") }));
            inner.appendChild(groupPhoto(S, R, cv));

            inner.appendChild(el("h3", { text: T("Where the fifteen minutes went") }));
            inner.appendChild(el("div", { class: "spend" }, [
                spendBar(T("Carrying people"), R.time.carrying, R.time.total, "#5fd67a"),
                spendBar(T("Fighting the fire"), R.time.fighting, R.time.total, "#e08a2a"),
                spendBar(T("Talking to people"), R.time.arguing, R.time.total, "#4a8fd0"),
                spendBar(T("Everything else"), Math.max(0, R.time.total - R.time.carrying -
                    R.time.fighting - R.time.arguing), R.time.total, "#6b7280"),
            ]));

            if (R.medals.length) {
                inner.appendChild(el("h3", { text: T("Other observations") }));
                inner.appendChild(el("div", { class: "medals" },
                    R.medals.map((m) => el("div", { class: "medal" }, [
                        el("b", { text: T(m.name) }), el("i", { text: T(m.text) })]))));
            }

            // Everything you did, in order, and the recorder. Both are for the flight you have
            // already read about, both are long, and neither is what anybody wants in the first
            // ten seconds after the wheels come down - so both are a closed drawer.
            inner.appendChild(fold(T("Everything you did ({n})", { n: S.actions.length }), () =>
                el("div", { class: "timeline" },
                    S.actions.map((a) => el("div", { class: "tl" }, [
                        el("span", { class: "tl-t", text: mmss(S.clock.total - a.t) }),
                        el("span", { class: "tl-x", text: a.label }),
                        el("span", { class: "tl-c", text: costLabel(a.cost) }),
                    ])))));
            if (R.recording && PRS.recorder) {
                inner.appendChild(fold(T("Flight recorder"), () => recorderPanel(R)));
            }

            // One way on. What the flight was worth is the next screen and nothing else is.
            inner.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { class: "big", text: T("What you changed"),
                               onclick: () => unlocks(S, R) }),
            ]));
            inner.appendChild(el("p", { class: "footnote", text:
                (S.outfit ? T("{name} in {outfit}", { name: S.character.name,
                                                      outfit: T(S.outfit.name).toLowerCase() })
                          : S.character.name) +
                T(" · seed {seed}", { seed: R.seed }) +
                T(" · {n} actions taken · {found} things found aboard · ",
                  { n: R.actions, found: S.stats.itemsFound || 0 }) +
                (S.stats.undos ? T("changed your mind {n} times", { n: S.stats.undos })
                               : T("never changed your mind")) }));

            root.appendChild(inner);
        });
    }

    /** A heading that is a button, and the long thing underneath it, built the first time. */
    function fold(label, build) {
        let body = null;
        const arrow = el("span", { class: "fold-arrow", text: "+" });
        const wrap = el("div", { class: "fold" });
        wrap.appendChild(el("button", { class: "fold-head", onclick: function () {
            PRS.audio.unlock();
            PRS.audio.play("blip");
            if (!body) { body = build(); wrap.appendChild(body); }
            const open = !wrap.classList.contains("open");
            body.style.display = open ? "" : "none";
            wrap.classList.toggle("open", open);
            arrow.textContent = open ? "−" : "+";
        } }, [arrow, el("b", { text: label })]));
        return wrap;
    }

    /**
     * The flight recorder, inside the drawer. A replay can work out everything about a flight
     * except what you were trying to do, so there is a box for that.
     */
    function recorderPanel(R) {
        const at = R.recording.at;
        const done = el("span", { class: "done" });
        const note = el("textarea", { placeholder: T("What were you trying to do, and when " +
            "did you notice it was or was not working? (optional)") });
        note.value = R.recording.note || "";
        note.addEventListener("input", () => { PRS.recorder.note(at, note.value); });
        // Typing is not a keyboard shortcut.
        note.addEventListener("keydown", (ev) => ev.stopPropagation());
        return el("div", { class: "rec" }, [
            el("i", { text: T("This flight is kept with your last {n}. Save them to a " +
                              "file to send them in for balancing.",
                              { n: PRS.util.plural(PRS.recorder.all().length,
                                                   K("flight"), K("flights")) }) }),
            note,
            el("div", { class: "title-buttons" }, [
                el("button", { text: T("Save recorded flights"), onclick: () => {
                    saveFlights();
                    done.textContent = T("saved to your downloads");
                } }),
                el("button", { text: T("Copy this flight"), onclick: () => copyText(
                    PRS.recorder.exportText(PRS.recorder.all().filter((r) => r.at === at)),
                    done) }),
                done,
            ]),
        ]);
    }

    // ------------------------------------------------------------------------------- unlocks ---

    /**
     * What the flight was worth, which is a different question from what happened on it, and used
     * to be three boxes buried a third of the way down the report with the manifest underneath
     * them.
     *
     * One number is the whole screen: the difference between the aeroplane you flew and the same
     * aeroplane with you asleep in 9C. That difference is what the log book counts now. The old
     * book counted everybody who got off, and forty-three of them get off without you, so an
     * afternoon spent doing nothing at all filled the book at two thirds the rate of a good
     * flight and the wardrobe opened itself while you made tea. The bar moves by what you
     * changed, and nothing changed moves it not at all.
     */
    function unlocks(S, R) {
        const L = R.logbook;
        const book = L ? L.after : PRS.logbook.load();
        const near = PRS.logbook.nearest(S, book);
        show(function (root) {
            root.className = "screen report unlocks";
            const inner = el("div", { class: "report-inner" });
            inner.appendChild(el("div", { class: "rep-kicker", text: T("WHAT YOU CHANGED") }));

            // The two aeroplanes, side by side. Everything else on this screen comes off them.
            if (R.without !== null) {
                const diff = R.survivors - R.without;
                inner.appendChild(el("div", { class: "versus" }, [
                    el("span", {}, [T("Without you:"), el("b", { text: String(R.without) })]),
                    // Green only when it is green. A bigger number in the good colour, under a
                    // line saying the cabin would have done better without you, is a lie told
                    // by a stylesheet.
                    el("span", { class: "you" + (diff > 0 ? "" : diff < 0 ? " worse" : " same") },
                       [T("With you:"), el("b", { text: String(R.survivors) })]),
                ]));
                inner.appendChild(el("p", { class: "delta", text: diff > 0
                    ? T("{n} alive who would not have been.",
                        { n: PRS.util.plural(diff, K("person"), K("people")) })
                    : diff < 0
                        ? T("The cabin would have done {n} better with you in your seat.",
                            { n: PRS.util.plural(-diff, K("life"), K("lives")) })
                        : T("Exactly what the cabin would have managed with you in your seat.") }));
            }

            // The book: what it counted, and how far that got you.
            if (L) {
                inner.appendChild(soulBar(L));
                if (L.unlocked.length) {
                    inner.appendChild(el("p", { class: "unlocked",
                        text: T("Unlocked: {what}.", { what: PRS.util.listSentence(
                            L.unlocked.map((n) => T(n))) }) }));
                }
            }

            // One locked card: the one this flight came nearest to. A person you nearly have is
            // a reason to fly again, and a wall of eight you do not have is not.
            if (near) inner.appendChild(nearCard(near));

            inner.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { class: "big", onclick: begin,
                               text: choice.seed === null
                                   ? T("Fly it again")
                                   : T("Fly seed {seed} again", { seed: choice.seedText }) }),
                // The same aeroplane once more, when this one came off the dice.
                choice.seed === null
                    ? el("button", { text: T("Fly seed {seed} again", { seed: R.seed }),
                                     onclick: () => { setSeed(String(R.seed)); begin(); } })
                    : null,
                el("button", { text: T("Change who you are"), onclick: setup }),
                el("button", { text: T("The report again"), onclick: () => report(S) }),
                el("button", { text: T("Title"), onclick: title }),
            ]));
            root.appendChild(inner);
        });
    }

    /**
     * The souls total, as the wardrobe laid out end to end: one pip per outfit, in the order the
     * book opens them, and a bar running under them from where the book was to where it is now.
     *
     * Two colours, because two different things happened. Everything you had walking on is the
     * settled one; what this flight added is the bright one, and it is the part that moves. A
     * single-colour bar that grows says only "more", and the question on this screen is "how
     * much of that was today".
     *
     * The scale is one equal slice per outfit rather than souls-to-pixels: five hundred souls at
     * the far end would leave a first flight with a bar too short to see it move, and the pips
     * are what the bar is measured against now, not the number.
     */
    function soulBar(L) {
        const OUT = PRS.data.outfits.OUTFITS.slice().sort((a, b) => a.unlock - b.unlock);
        const now = L.after.souls, was = L.before.souls;

        // souls -> percent across the track, piecewise so each outfit gets an equal slice.
        function pct(n) {
            const step = 100 / OUT.length;
            for (let i = 0; i < OUT.length; i++) {
                const lo = i === 0 ? 0 : OUT[i - 1].unlock, hi = OUT[i].unlock;
                if (n <= hi) return (i * step) + ((n - lo) / (hi - lo)) * step;
            }
            return 100;
        }

        const wasPct = Math.max(0, Math.min(100, pct(was)));
        const nowPct = Math.max(0, Math.min(100, pct(now)));
        // One track, two bars, both measured from the left. The gain runs the whole way to
        // where the book is now and lies underneath; what you walked on with sits on top of it
        // and covers all but the end. So the only part of the gain you ever see is the part
        // that is actually new, and it opens out from under the bar as it grows.
        const grown = el("div", { class: "soul-grown", style: { width: wasPct + "%" } });
        const held = el("div", { class: "soul-held", style: { width: wasPct + "%" } });
        const pips = OUT.map((o) => {
            const open = o.unlock <= now, fresh = open && o.unlock > was;
            const pip = el("div", {
                class: "soul-pip" + (open ? " open" : "") + (fresh ? " fresh" : ""),
                // Nudged in by half an icon at the ends, so the first and last pips sit inside
                // the track instead of hanging off it.
                style: { left: "calc(" + pct(o.unlock) + "% + " +
                               (13 - 0.26 * pct(o.unlock)) + "px)" },
                title: T(o.name) + " · " + o.unlock,
            }, [
                PRS.data.outfits.icon(o, null, 2),
                el("u", { text: String(o.unlock) }),
            ]);
            return pip;
        });
        requestAnimationFrame(() => requestAnimationFrame(() => {
            grown.style.width = nowPct + "%";
            // The pips this flight turned over light with the bar rather than before it, so the
            // eye arrives at them the way the souls did.
            for (const pip of pips) {
                if (pip.classList.contains("fresh")) {
                    setTimeout(() => pip.classList.add("lit"), 300 + 1100 * 0.7);
                }
            }
        }));

        const next = L.next;
        return el("div", { class: "souls" }, [
            el("div", { class: "soul-top" }, [
                el("b", { text: T("+{n} in the log book",
                                  { n: PRS.util.plural(L.saved, K("soul"), K("souls")) }) }),
                el("i", { text: next ? T("{now} of {target}", { now: now, target: next.unlock })
                                     : T("{n} in all", { n: now }) }),
            ]),
            el("div", { class: "soul-ladder" }, pips),
            el("div", { class: "soul-track" }, [grown, held]),
            el("i", { class: "soul-next", text: next
                ? T("Next: {what}", { what: T(next.name) })
                : T("Every outfit in the wardrobe is yours.") }),
        ]);
    }

    /** The locked person this flight got nearest to, and how near, with a bar of their own. */
    function nearCard(near) {
        const c = near.character;
        return el("div", { class: "near" }, [
            el("div", { class: "rep-kicker", text: T("CLOSEST TO UNLOCKING") }),
            el("div", { class: "char locked near-card" }, [
                el("div", { class: "char-face" }, [PRS.atlas.icon("pax", 5, PRS.pax.palette(c))]),
                el("div", { class: "char-id" }, [
                    el("b", { text: c.name }),
                    el("i", { text: T("{age} · {title}", { age: c.age, title: T(c.title) }) }),
                ]),
                el("div", { class: "char-lock" }, [
                    el("div", { class: "soul-track" }, [
                        el("div", { class: "soul-grown",
                                    style: { width: (near.part * 100) + "%" } }),
                    ]),
                    el("i", { text: T("{have} of {need} {what}, this flight",
                                      { have: near.have, need: near.need,
                                        what: T(near.note) }) }),
                ]),
            ]),
            el("p", { class: "near-how", text: T(c.unlock.text) }),
        ]);
    }

    /** Every recorded flight, as a file in Downloads that tools/replay.js reads. */
    function saveFlights() {
        const blob = new Blob([PRS.recorder.exportText()], { type: "application/json" });
        const a = el("a", {
            href: URL.createObjectURL(blob),
            download: "please-remain-seated-flights-" + new Date().toISOString().slice(0, 10) + ".json",
        });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }

    /** Onto the clipboard, including from a double-clicked file, where the clipboard API is not. */
    function copyText(text, done) {
        const ok = () => { if (done) done.textContent = T("copied"); };
        const fallback = () => {
            const t = el("textarea", { style: { position: "fixed", opacity: "0" } });
            t.value = text;
            document.body.appendChild(t);
            t.select();
            try { if (document.execCommand("copy")) ok(); } catch (e) { /* nothing to do */ }
            t.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(ok, fallback);
        } else {
            fallback();
        }
    }

    // ------------------------------------------------------------------------- the manifest ---
    //
    // Sixty-one people as one photograph, in the order the report cares about. The sort key is
    // harm, which is the same number that decided their outcome, so the block runs green to red
    // from the top left and the gradient across it is the whole afternoon at a glance. Reading
    // order does the hard part on a telephone for free: the grid reflows to nine across instead
    // of twenty-two, and the healthiest are still the top row.

    const HARM_WORDS = {
        breathed: K("smoke they had breathed"), burns: K("burns"),
        air: K("the air where they lay"), heat: K("the heat where they lay"),
        unmasked: K("nothing over their face"), upright: K("upright, in the smoke layer"),
        down: K("unconscious when the doors opened"), door: K("the aisle between them and a door"),
        stuck: K("could not get out of the seat"), other: K("everything else"),
    };

    /** Which face somebody wears in the report. The crossed eyes live here and nowhere else. */
    function photoFace(p, outcome) {
        if (PRS.pax.isPet(p)) return "pet_carrier";
        const base = PRS.pax.isChild(p) ? "child" : "pax";
        if (outcome === "lost") return base + "_gone";
        if (outcome === "serious") return base + "_afraid";
        if (outcome === "treated") return base + "_worried";
        return base + "_relieved";
    }

    /** What the manifest row used to say in its third column: what they were doing, and where. */
    function soulWhere(S, p) {
        const where = PRS.cabin.placeTo(p.x, p.y);
        if (p.isYou) return where;
        if (p.moved && p.state !== "carried") {
            const by = p.carriedBy && p.carriedBy !== "player" &&
                       PRS.state.paxById(S, p.carriedBy);
            return by ? T("moved to {where} by {who}", { where: where, who: by.name })
                      : T("moved to {where}", { where: where });
        }
        if (p.helper) return T("was helping, at {where}", { where: where });
        // Somebody still in their own seat has their seat in the line above already.
        const state = PRS.pax.displayState(p);
        return p.x === p.homeX && p.y === p.homeY
            ? state : T("{state}, at {where}", { state: state, where: where });
    }

    /** The short facts a sentence would bury: what was over their face, who had hold of them. */
    function soulFlags(S, p) {
        const out = [];
        if (p.helper) out.push(T("worked with you"));
        if (p.carriedBy === "player") out.push(T("you carried them"));
        if (p.masked) out.push(T("something over their face"));
        if (p.braced) out.push(T("low, out of the smoke layer"));
        if (p.isYou && PRS.state.wearing(S, "hood")) out.push(T("hooded"));
        return out.join(" · ");
    }

    /** One bar of what a person's afternoon cost them, longest first, scaled to the longest. */
    function harmBar(label, value, worst, colour) {
        return el("div", { class: "harm-row" }, [
            el("span", { class: "harm-label", text: label }),
            el("div", { class: "spend-track" }, [
                el("div", { class: "spend-fill", style: {
                    width: Math.round(Math.min(1, value / worst) * 100) + "%", background: colour } }),
            ]),
            el("b", { text: String(Math.round(value)) }),
        ]);
    }

    /**
     * The four biggest things that were done to one person, in the report's own arithmetic:
     * scoring.js works out the same parts to decide the outcome, so this is not a second opinion
     * about them, it is the first one, shown.
     */
    function harmBars(S, entry, colour) {
        const parts = entry.isYou
            ? { breathed: S.player.smokeDose, burns: S.player.burns * 1.4 }
            : PRS.scoring.harmParts(S, entry.p).parts;
        const list = Object.keys(parts).map((k) => [k, parts[k]])
            .filter((e) => e[1] > 0.5).sort((a, b) => b[1] - a[1]).slice(0, 4);
        if (!list.length) return el("div", { class: "harm-none",
            text: T("Nothing worth writing down happened to them.") });
        const worst = list[0][1];
        return el("div", { class: "harm" },
            list.map((e) => harmBar(T(HARM_WORDS[e[0]] || e[0]), e[1], worst, colour)));
    }

    /**
     * The photograph, the tooltip over it, and the wire from both to the drawing of the cabin.
     *
     * The tooltip follows the pointer on a desktop and opens beside the face on a telephone,
     * where a tap is the only hover there is; either way the same thing happens to the drawing
     * above, which puts a box round the tile that person was lying in. Nothing is pinned and
     * nothing has to be dismissed: the sentence about somebody lasts exactly as long as you are
     * pointing at them.
     */
    function groupPhoto(S, R, cv) {
        const ctx = cv.getContext("2d");
        const OUT = { unhurt: "#5fd67a", treated: "#e8c53a", serious: "#e08a2a", lost: "#d4483a" };

        // You are the sixty-first soul and you stand in the line with everybody else.
        const you = Object.assign({}, S.character, {
            isYou: true, id: "you", seat: S.player.seat, traits: [],
            x: S.player.x, y: S.player.y, homeX: S.player.homeX, homeY: S.player.homeY,
            name: T("{name} (you)", { name: S.character.name }),
            state: S.player.alive ? "standing" : "down",
            smokeDose: S.player.smokeDose, burns: S.player.burns,
            masked: PRS.state.wearing(S, "hood"),
        });
        const souls = R.rows.map((p) => ({ p: p, outcome: p.outcome, harm: p.harm }))
            .concat([{ p: you, outcome: R.you.outcome, harm: R.you.harm, isYou: true }])
            .sort((a, b) => a.harm - b.harm || (a.p.row || 0) - (b.p.row || 0) ||
                            (a.p.seat < b.p.seat ? -1 : 1));

        const photo = el("div", { class: "photo" });
        const tip = el("div", { class: "soul-tip" });
        const wrap = el("div", { class: "photo-wrap" }, [photo, tip]);

        function fill(entry) {
            clear(tip);
            const p = entry.p, colour = OUT[entry.outcome] || "#888";
            tip.appendChild(PRS.atlas.icon(photoFace(p, entry.outcome), 3,
                                           PRS.pax.palette(p, entry.outcome === "lost"),
                                           "soul-face"));
            tip.appendChild(el("div", { class: "soul-text" }, [
                el("b", { text: p.name }),
                el("i", {}, [
                    el("span", { class: "soul-seat", text: p.seat }),
                    p.kg ? el("span", { text: T("{kg}kg", { kg: p.kg }) }) : null,
                    el("span", { style: { color: colour }, text: outcomeWord(entry.outcome) }),
                ]),
                el("span", { class: "soul-where", text: soulWhere(S, p) }),
                p.traits && p.traits.length
                    ? el("u", { text: p.traits.map(PRS.data.passengers.traitName).join(", ") })
                    : null,
                soulFlags(S, p) ? el("u", { text: soulFlags(S, p) }) : null,
                harmBars(S, entry, colour),
            ]));
        }

        /** Beside the face, inside the photograph, and never off the end of it. */
        function place(face) {
            const box = face.getBoundingClientRect(), area = wrap.getBoundingClientRect();
            const w = tip.offsetWidth, h = tip.offsetHeight;
            let x = box.left - area.left + box.width / 2 - w / 2;
            let y = box.top - area.top - h - 6;
            if (y < 4) y = box.bottom - area.top + 6;
            tip.style.left = Math.max(4, Math.min(x, area.width - w - 4)) + "px";
            tip.style.top = y + "px";
        }

        function show(entry, face) {
            fill(entry);
            tip.classList.add("on");
            place(face);
            PRS.render.drawSummary(ctx, S, 0.5, { x: entry.p.x, y: entry.p.y });
            // The drawing is thirty tiles wide and a telephone shows about half of it, so bring
            // the seat being pointed at into the part of it that is on the screen.
            const map = cv.parentNode;
            if (map && map.scrollWidth > map.clientWidth) {
                const at = (entry.p.x + 0.5) / PRS.cabin.W * cv.clientWidth;
                map.scrollTo({ left: Math.max(0, at - map.clientWidth / 2), behavior: "smooth" });
            }
        }

        function hide() {
            tip.classList.remove("on");
            PRS.render.drawSummary(ctx, S, 0.5, null);
        }

        for (const entry of souls) {
            const p = entry.p;
            const face = el("button", {
                class: "soul out-" + entry.outcome + (entry.isYou ? " you" : ""),
                type: "button",
                "aria-label": p.seat + " " + p.name + " · " + outcomeWord(entry.outcome),
                onclick: (ev) => { ev.preventDefault(); show(entry, face); },
            }, [PRS.atlas.icon(photoFace(p, entry.outcome), 3,
                               PRS.pax.palette(p, entry.outcome === "lost"))]);
            face.addEventListener("mouseenter", () => show(entry, face));
            face.addEventListener("focus", () => show(entry, face));
            face.addEventListener("blur", hide);
            photo.appendChild(face);
        }
        photo.addEventListener("mouseleave", hide);
        // A telephone has no way to stop pointing at somebody, so a tap anywhere else does it.
        // The listener takes itself off the document once the report has been left.
        function away(ev) {
            if (!wrap.isConnected) return document.removeEventListener("pointerdown", away, true);
            if (!ev.target.closest || !ev.target.closest(".soul")) hide();
        }
        document.addEventListener("pointerdown", away, true);
        PRS.render.drawSummary(ctx, S, 0.5, null);

        return el("div", {}, [
            el("p", { class: "sec-note", text: T("Sixty-one souls, the ones who walked off " +
                "first and the ones who did not last. Point at anybody.") }),
            wrap,
        ]);
    }

    function outcomeWord(key) {
        return { unhurt: T("walked off"), treated: T("treated"), serious: T("serious"),
                 lost: T("not accounted for") }[key] || key;
    }
    function tallyBox(n, label, cls) {
        return el("div", { class: "tbox " + cls }, [el("b", { text: n }), el("i", { text: label })]);
    }
    function legend(colour, label) {
        return el("span", { class: "leg" }, [
            el("i", { style: { background: colour } }), el("span", { text: label })]);
    }
    function spendBar(label, value, total, colour) {
        const pct = total ? Math.round(value / total * 100) : 0;
        return el("div", { class: "spend-row" }, [
            el("span", { class: "spend-label", text: label }),
            el("div", { class: "spend-track" }, [
                el("div", { class: "spend-fill", style: { width: pct + "%", background: colour } }),
            ]),
            el("b", { text: mmss(value) }),
        ]);
    }

    PRS.screens = { mount, title, setup, wardrobe, bag, flight, begin, report, flights, help,
                    hideHelp };
})(window);
