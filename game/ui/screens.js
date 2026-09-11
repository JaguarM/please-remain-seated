// Every screen that is not the aeroplane: the title, the setup, the two pages a slot opens, the
// help, the previous flights, and the incident report.
//
// The title is a boarding pass. It boards you in one click as whoever you were last time, and
// under the name are five boxes: what you are wearing, the three things on you, and the seed the
// dice are cast from. A box opens a page of choices, unless it is part of who the character is,
// in which case it has a lock in the corner. The setup screen is for being somebody else: nine cards, and a locked card says exactly
// what turns it over. The report is the point of the whole thing: it is written in the flat voice
// of an air accident investigator, it lists every soul on board by seat with what happened to
// them, and it quotes your own actions back at you in the order you took them. Then it writes the
// flight into the log book and boards you again.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el, $, clear, mmss, costLabel, store } = PRS.util;

    let host = null;

    // Who the next flight is flown by, in what, and with what. Boarding saves it.
    const choice = { characterId: "ansel", outfitId: null, items: null,
                     seed: null, seedText: "", luck: "dice" };
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
                if (saved.luck === "perfect") choice.luck = "perfect";
            }
            // ?seed=606 or ?seed=PARIS on the address bar is a flight somebody sent you, and
            // ?luck=perfect is the testing mode. Both win over whatever was saved.
            try {
                const q = new URLSearchParams(global.location.search);
                if (q.has("seed")) setSeed(q.get("seed"));
                if (q.has("luck")) choice.luck = q.get("luck") === "perfect" ? "perfect" : "dice";
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
                              items: choice.items.slice(), seedText: choice.seedText,
                              luck: choice.luck });
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
                el("div", { class: "kicker", text: "TRANSNATIONAL 447 · 31,000 FT · DESCENT" }),
                el("h1", { text: "PLEASE REMAIN SEATED" }),
                el("p", { class: "tag", text:
                    "There is a fire in the overhead locker above seat 14C. You are the only " +
                    "person on this aeroplane who has noticed. The plane lands in fifteen " +
                    "minutes and the clock only moves when you do." }),
                el("div", { class: "title-facts" }, [
                    fact("61", "souls on board"),
                    fact("15:00", "to touchdown"),
                    fact(String(PRS.actions.count()), "things you can do"),
                    fact("0", "ways to put it out"),
                ]),
                pass(title),
                // A first flight is one click. The roster and the previous flights appear once
                // there is a log book to put them in.
                el("div", { class: "title-buttons" }, [
                    book.flights ? el("button", { text: "Change who you are", onclick: setup }) : null,
                    el("button", { text: "How to play", onclick: () => help(root, ch) }),
                    book.flights ? el("button", { text: "Previous flights (" + book.flights + ")",
                                                  onclick: flights }) : null,
                ]),
                book.flights ? el("p", { class: "footnote logline", text: logLine(book) }) : null,
                el("p", { class: "footnote", text:
                    "Nothing here can be won. Some of it can be done well." }),
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
        return PRS.util.plural(book.flights, "flight") + " · " +
            PRS.util.plural(book.souls, "soul") + " off alive · " +
            n.people + " of " + n.ofPeople + " people and " + n.outfits + " of " + n.ofOutfits +
            " outfits" + (next ? " · next outfit at " + next.unlock + " souls." : ".");
    }

    /**
     * The boarding pass: who the button puts on the aeroplane, with their face, their seat, the
     * four boxes, and the button. `back` is the screen a box's page returns to.
     */
    function pass(back) {
        const ch = PRS.data.characters.byId(choice.characterId);
        return el("div", { class: "pass" }, [
            PRS.atlas.icon("pax", 3, PRS.pax.palette(ch)),
            el("div", { class: "pass-who" }, [
                el("b", { text: ch.name }),
                el("i", { text: ch.title + " · seat " + ch.seat }),
                slots(ch, back),
            ]),
            el("button", { class: "big pass-go", text: "Board", onclick: begin }),
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
            label: outfit ? PRS.loot.short(outfit.name) : "as you are",
            sub: outfit ? O.summary(outfit) : "wearing",
            open: () => wardrobe(back),
        }));
        for (let i = 0; i < D.SLOTS; i++) {
            const id = choice.items[i] || null;
            const item = id ? D.byId(id) : null;
            const fixed = !!id && ch.kit.indexOf(id) >= 0;
            row.appendChild(slot({
                icon: item ? PRS.atlas.icon(item.sprite.split(":")[1], 3)
                           : el("span", { class: "slot-empty", text: String(i + 1) }),
                label: item ? PRS.loot.short(item.name) : "nothing",
                sub: fixed ? "kit" : (item ? (item.uses === null ? "" : item.uses + " uses") : "empty"),
                fixed: fixed,
                open: fixed ? null : () => bag(i, back),
            }));
        }
        // The fifth box is the seed: which aeroplane, and whether the dice are cast at all.
        row.appendChild(slot({
            icon: el("span", { class: "slot-empty slot-dice",
                               text: choice.luck === "perfect" ? "⚅" : "⚄" }),
            label: choice.seed === null ? "any seed" : choice.seedText,
            sub: choice.luck === "perfect" ? "perfect luck" : "seed",
            open: () => flight(back),
        }));
        return row;
    }

    function slot(spec) {
        return el("button", {
            class: "slot" + (spec.fixed ? " fixed" : " opens"),
            title: spec.fixed ? "Part of who they are" : "Click to change",
            onclick: spec.open ? () => { PRS.audio.unlock(); PRS.audio.play("blip"); spec.open(); }
                               : null,
        }, [
            spec.icon,
            el("b", { text: spec.label }),
            el("i", { text: spec.sub || "" }),
            spec.fixed ? el("span", { class: "slot-lock", text: "KIT" })
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
                    el("b", { text: "What you flew in" }),
                    el("span", { class: "option-mod", text: "as you are" }),
                    el("i", { text: "Whatever " + ch.short + " had on. The five numbers are the " +
                                    "five numbers." }),
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
                        el("b", { text: o.name }),
                        el("span", { class: "option-mod", text: O.summary(o) }),
                        open ? el("i", { text: o.blurb }) : null,
                        open ? el("u", { text: o.note })
                             : el("u", { class: "locked", text: "Unlocks at " + o.unlock +
                                                                 " souls · " + book.souls + " so far" }),
                    ]),
                ]));
            }
            root.appendChild(el("h2", { text: "What you are wearing" }));
            root.appendChild(el("p", { class: "lede", text:
                "It does nothing except move " + ch.short + "'s five numbers. Two points of " +
                "speed is a second off every step of nine hundred of them, and two points of " +
                "voice is the difference between being believed at minute four and at minute " +
                "nine." }));
            root.appendChild(grid);
            root.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { text: "Back", onclick: back }),
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
                    el("b", { text: "Nothing" }),
                    el("i", { text: "An empty slot. Both hands free, and everything you need is " +
                                    "somebody else's." }),
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
                        el("b", { text: it.name }),
                        el("i", { text: it.note }),
                        it.uses !== null ? el("u", { text: it.uses + " uses" +
                            (it.refill ? ", refilled at the tap" : "") }) : null,
                    ]),
                ]));
            }
            root.appendChild(el("h2", { text: "What is on you" }));
            root.appendChild(el("p", { class: "lede", text:
                "Slot " + (index + 1) + " of " + D.SLOTS + ". Three things is the cabin baggage " +
                "allowance, and the airline is going to keep enforcing it while its aeroplane " +
                "is on fire. Everything else is aboard: in the galley drawers, in the crew's " +
                "kit, and in other passengers' laps." }));
            root.appendChild(grid);
            root.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { text: "Back", onclick: back }),
            ]));
        });
    }

    /**
     * Which aeroplane: the seed every die in the flight is cast from, and whether they are cast
     * at all. Perfect luck is for testing a plan, and the log book does not take flights flown
     * on it.
     */
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
                    el("b", { text: "Whatever comes" }),
                    el("i", { text: "A new seed every flight. The report quotes it, so a flight " +
                                    "worth flying again is one number away." }),
                ]),
            ]));
            const input = el("input", { class: "seed-input", type: "text", maxlength: "40",
                                        placeholder: "606, or a word", spellcheck: "false",
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
                    el("b", { text: "This seed" }),
                    el("i", { text: "Every die in the flight is cast from it before you board: " +
                                    "what mood each passenger is in, when row 14 catches, what " +
                                    "the cabin does on its third turn. Two flights on one seed " +
                                    "differ only in what you do. The address bar takes it too: " +
                                    "index.html?seed=606." }),
                    input,
                    el("div", { class: "title-buttons" }, [
                        el("button", { text: "Fly this seed", onclick: take }),
                    ]),
                ]),
            ]));

            const luck = el("div", { class: "option-grid" });
            const pickLuck = (v) => { choice.luck = v; done(); };
            luck.appendChild(el("button", {
                class: "option" + (choice.luck !== "perfect" ? " on" : ""),
                onclick: () => pickLuck("dice"),
            }, [
                el("span", { class: "slot-empty slot-dice", text: "⚄" }),
                el("div", { class: "option-text" }, [
                    el("b", { text: "Dice" }),
                    el("i", { text: "Cast at boarding, from the seed. Backspace cannot re-cast " +
                                    "them, and neither can doing something else first." }),
                ]),
            ]));
            luck.appendChild(el("button", {
                class: "option" + (choice.luck === "perfect" ? " on" : ""),
                onclick: () => pickLuck("perfect"),
            }, [
                el("span", { class: "slot-empty slot-dice", text: "⚅" }),
                el("div", { class: "option-text" }, [
                    el("b", { text: "Perfect luck" }),
                    el("i", { text: "For testing a plan against the aeroplane rather than the " +
                                    "dice. Every coin lands your way: people say yes whenever " +
                                    "asking was worth it, the blanket does not burn through, " +
                                    "turbulence drops nobody, and the cabin's turn is the kindest " +
                                    "thing that could happen. Everything on a timer, the fire " +
                                    "included, happens at its middle time." }),
                    el("u", { class: "locked", text: "Nothing from a flight like this goes in " +
                                                     "the log book." }),
                ]),
            ]));

            root.appendChild(el("h2", { text: "Which flight" }));
            root.appendChild(el("p", { class: "lede", text:
                "It is the same aeroplane every time and the fire is in the same locker. What " +
                "the seed decides is everything that could have gone either way." }));
            root.appendChild(seeds);
            root.appendChild(el("h3", { text: "The dice" }));
            root.appendChild(luck);
            root.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { text: "Back", onclick: back }),
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
                    el("i", { text: c.age + " · " + c.title }),
                ]),
                open ? el("div", { class: "char-stats" }, statBars(c))
                     : el("div", { class: "char-lock" }, [
                           el("span", { class: "lock-tag", text: "LOCKED" }),
                           el("i", { text: c.unlock.text }),
                       ]),
                open ? el("u", { class: "char-lean", text: c.lean }) : null,
            ]));
        }

        const panel = el("div", { class: "char-detail" }, [
            el("div", { class: "you-name" }, [
                PRS.atlas.icon("pax", 4, PRS.pax.palette(ch)),
                el("div", {}, [
                    el("b", { text: ch.name }),
                    el("i", { text: ch.age + " · " + ch.title + " · seat " + ch.seat }),
                ]),
            ]),
            el("div", { class: "char-stats big-stats" }, statBars(ch, outfit)),
            slots(ch, setup),
            el("div", { class: "sub", text: outfit ? outfit.name + ". " + outfit.note
                                                   : "What you flew in." }),
            el("p", { text: ch.blurb }),
            el("p", { class: "lean", text: ch.lean }),
            el("div", { class: "title-buttons" }, [
                el("button", { class: "big", text: "Board as " + ch.short, onclick: begin }),
                el("button", { text: "Back", onclick: title }),
            ]),
        ]);

        root.appendChild(el("h2", { text: "Who you are" }));
        root.appendChild(el("p", { class: "lede", text: logLine(book) + " A locked card says " +
            "what turns it over: people by something you do on the aeroplane, clothes by the " +
            "souls in the book." }));
        root.appendChild(el("div", { class: "picker-body" }, [chars, panel]));
        window.scrollTo(0, y);
    }

    /** Five bars. With an outfit passed, the changed ones are coloured and the numbers move. */
    function statBars(ch, outfit) {
        const names = { strength: "STR", speed: "SPD", lungs: "LNG", nerve: "NRV", voice: "VOI" };
        const base = ch.stats;
        const now = outfit ? PRS.data.outfits.apply(base, outfit) : base;
        const out = [];
        for (const key in names) {
            const v = now[key];
            const delta = v - base[key];
            const dir = delta > 0 ? " up" : delta < 0 ? " down" : "";
            out.push(el("div", { class: "stat" }, [
                el("span", { text: names[key] }),
                el("div", { class: "stat-track" }, [
                    el("div", { class: "stat-fill" + dir, style: { width: (v * 10) + "%" } }),
                ]),
                el("b", { class: dir.trim(), text: String(v) }),
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
            luck: choice.luck,
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
                el("h3", { text: "How to play" }),
                helpLine(PRS.atlas.icon("pax_worried", 2, PRS.pax.palette(someone)),
                    "Click a person",
                    "to talk to them, treat them, or pick them up and carry them to a green end " +
                    "of the aeroplane. Nobody counts until they are there."),
                helpLine(PRS.atlas.icon("fire_2", 2), "Click the fire",
                    "to fight it. Nothing puts it out. Everything buys time."),
                helpLine(PRS.atlas.icon("pax", 2, you), "Click yourself",
                    "for everything about where you are standing - the tap, the lockers, the " +
                    "trolley - and for the things in your bag."),
                helpLine(PRS.atlas.icon("floor_aisle", 2), "Click anywhere else to walk there.",
                    "Whatever is under the pointer lights up, with the price. Arrow keys step."),
                helpLine(el("span", { class: "help-clock", text: "0:09" }),
                    "Time only moves when you act.",
                    "Every click costs the seconds it says. Backspace takes the last one back."),
                el("div", { class: "title-buttons" }, [
                    el("button", { class: "big", text: "Got it", onclick: () => hideHelp(root) }),
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
                el("h2", { text: "The log book" }),
                el("p", { text: logLine(book) }),
                el("div", { class: "history" }, book.history.map(function (h) {
                    const ch = C.byId(h.character);
                    const o = O.byId(h.outfit);
                    return el("div", { class: "hrow" }, [
                        PRS.atlas.icon("pax", 1, PRS.pax.palette(ch)),
                        el("b", { text: ch.short + (o ? ", " + o.name.toLowerCase() : "") }),
                        el("span", { text: h.survived !== undefined ? h.survived + " survived"
                                                                     : h.secured + " secured" }),
                        el("span", { text: h.lost + " lost" }),
                        el("span", { class: "grade-" + h.grade, text: h.grade }),
                        el("i", { text: h.ending }),
                    ]);
                })),
                el("div", { class: "title-buttons" }, [
                    el("button", { text: "Back", onclick: title }),
                    PRS.recorder && PRS.recorder.all().length
                        ? el("button", { text: "Save recorded flights (" +
                              PRS.recorder.all().length + ")", onclick: saveFlights })
                        : null,
                    el("button", { text: "Start the book again", onclick: function () {
                        if (window.confirm("Forget every flight, and lock everything the book " +
                                           "has unlocked?")) {
                            PRS.logbook.forget();
                            title();
                        }
                    } }),
                ]),
            ]));
        });
    }

    // --------------------------------------------------------------------------------- report ---

    function report(S) {
        const R = S.result || PRS.scoring.settle(S);
        PRS.audio.stopRoar();
        // The same aeroplane without you, flown now and in silence, before anything is drawn.
        const heard = PRS.audio.isEnabled();
        PRS.audio.setEnabled(false);
        let without = null;
        try { without = PRS.scoring.withoutYou(S); } catch (e) { without = null; }
        PRS.audio.setEnabled(heard);
        PRS.audio.play("touchdown");
        show(function (root) {
            root.className = "screen report";
            const inner = el("div", { class: "report-inner" });

            inner.appendChild(el("div", { class: "rep-head" }, [
                el("div", { class: "rep-kicker", text:
                    "AIR ACCIDENTS INVESTIGATION · PRELIMINARY REPORT · TRANSNATIONAL 447" }),
                el("h1", { text: R.ending.title }),
            ]));

            inner.appendChild(el("div", { class: "rep-ending" },
                R.ending.text.split("\n\n").map((p) => el("p", { text: p }))));

            // The numbers, in the order the report puts them.
            inner.appendChild(el("h3", { text: "Souls on board" }));
            inner.appendChild(el("div", { class: "tally" }, [
                tallyBox("61", "on board", ""),
                tallyBox(String(R.tally.unhurt), "walked off", "t-unhurt"),
                tallyBox(String(R.tally.treated), "treated", "t-treated"),
                tallyBox(String(R.tally.serious), "serious", "t-serious"),
                tallyBox(String(R.tally.lost), "not accounted for", "t-lost"),
            ]));
            // What you changed, which is the only thing on this page that is about you.
            if (without !== null) {
                const diff = R.survivors - without;
                inner.appendChild(el("div", { class: "versus" }, [
                    el("span", {}, ["Without you:", el("b", { text: String(without) })]),
                    el("span", { class: "you" }, ["With you:", el("b", { text: String(R.survivors) })]),
                    el("span", { class: "delta", text: diff > 0
                        ? PRS.util.plural(diff, "person", "people") + " alive who would not have been."
                        : diff < 0
                            ? "The cabin would have done " + PRS.util.plural(-diff, "life", "lives") +
                              " better with you in your seat."
                            : "Exactly what the cabin would have managed with you in your seat." }),
                ]));
            }
            inner.appendChild(el("div", { class: "grade grade-" + R.grade.key }, [
                el("b", { text: R.grade.name }),
                el("i", { text: R.grade.text }),
                el("span", { text: R.survivors + " of 60 survived · " + R.byYou + " moved by you · " +
                    R.byHelpers + " moved by people you recruited" }),
            ]));

            // The flight recorder. A replay can work out everything about this flight except what
            // you were trying to do, so there is a box for that.
            if (R.recording && PRS.recorder) {
                const at = R.recording.at;
                const done = el("span", { class: "done" });
                const note = el("textarea", { placeholder: "What were you trying to do, and when " +
                    "did you notice it was or was not working? (optional)" });
                note.value = R.recording.note || "";
                note.addEventListener("input", () => { PRS.recorder.note(at, note.value); });
                // Typing is not a keyboard shortcut.
                note.addEventListener("keydown", (ev) => ev.stopPropagation());
                inner.appendChild(el("div", { class: "rec" }, [
                    el("b", { text: "Flight recorder" }),
                    el("i", { text: "This flight is kept with your last " +
                        PRS.util.plural(PRS.recorder.all().length, "flight") + ". Save them to a " +
                        "file to send them in for balancing." }),
                    note,
                    el("div", { class: "title-buttons" }, [
                        el("button", { text: "Save recorded flights", onclick: () => {
                            saveFlights();
                            done.textContent = "saved to your downloads";
                        } }),
                        el("button", { text: "Copy this flight", onclick: () => copyText(
                            PRS.recorder.exportText(PRS.recorder.all().filter((r) => r.at === at)),
                            done) }),
                        done,
                    ]),
                ]));
            }

            // The log book, and anything it turned over. A flight on perfect luck is not in it.
            if (!R.logbook && S.luck === "perfect") {
                inner.appendChild(el("div", { class: "book" }, [
                    el("b", { text: "Nothing in the log book" }),
                    el("i", { text: "Perfect luck is for testing a plan. The flight is in the " +
                                    "recorder and nowhere else." }),
                ]));
            }
            if (R.logbook) {
                const L = R.logbook;
                inner.appendChild(el("div", { class: "book" }, [
                    el("b", { text: "+" + PRS.util.plural(R.survivors, "soul") + " in the log book" }),
                    el("i", { text: logLine(L.after) }),
                    L.unlocked.length
                        ? el("span", { class: "unlocked", text: "Unlocked: " +
                              PRS.util.listSentence(L.unlocked) + "." })
                        : el("span", { text: "Every locked card on the roster says what turns " +
                                             "it over." }),
                ]));
            }

            // The cabin at touchdown.
            const cv = el("canvas", { class: "rep-canvas" });
            cv.width = PRS.cabin.W * 8;
            cv.height = PRS.cabin.H * 8;
            inner.appendChild(el("h3", { text: "The cabin at touchdown" }));
            inner.appendChild(el("div", { class: "rep-map" }, [cv, el("div", { class: "legend" }, [
                legend("#5fd67a", "walked off"), legend("#e8c53a", "treated"),
                legend("#e08a2a", "serious"), legend("#d4483a", "not accounted for"),
                legend("#ffffff", "you"),
            ])]));
            setTimeout(() => PRS.render.drawSummary(cv.getContext("2d"), S, 0.5), 0);

            // Every soul, by seat. Their own face, at the size a boarding card photograph would
            // be. Sixty of them in a list is the point: this is the register, and it has people
            // in it.
            inner.appendChild(el("h3", { text: "Manifest" }));
            const table = el("div", { class: "manifest" });
            const rows = R.rows.slice().sort((a, b) => a.row - b.row ||
                (a.letter < b.letter ? -1 : 1));
            for (const p of rows) {
                table.appendChild(el("div", { class: "man-row out-" + p.outcome }, [
                    PRS.atlas.icon(p.outcome === "lost" ? "pax_down" : "pax", 1,
                                   PRS.pax.palette(p, p.outcome === "lost"), "man-face"),
                    el("span", { class: "man-seat", text: p.seat }),
                    el("span", { class: "man-name", text: p.name }),
                    el("span", { class: "man-state", text:
                        p.moved && p.state !== "carried" ? "moved to " +
                            PRS.cabin.placeName(p.x, p.y) +
                            (p.carriedBy && p.carriedBy !== "player" ? " by " +
                             (PRS.state.paxById(S, p.carriedBy) || {}).name : "") :
                        p.helper ? "was helping" : PRS.pax.displayState(p) }),
                    el("span", { class: "man-out", text: outcomeWord(p.outcome) }),
                ]));
            }
            table.appendChild(el("div", { class: "man-row out-" + R.you.outcome + " you" }, [
                PRS.atlas.icon("pax", 1, PRS.pax.palette(S.character), "man-face"),
                el("span", { class: "man-seat", text: S.player.seat }),
                el("span", { class: "man-name", text: S.character.name + " (you)" }),
                el("span", { class: "man-state", text: S.character.title }),
                el("span", { class: "man-out", text: outcomeWord(R.you.outcome) }),
            ]));
            inner.appendChild(table);

            // What you did.
            inner.appendChild(el("h3", { text: "Sequence of events" }));
            inner.appendChild(el("div", { class: "timeline" },
                S.actions.map((a) => el("div", { class: "tl" }, [
                    el("span", { class: "tl-t", text: mmss(S.clock.total - a.t) }),
                    el("span", { class: "tl-x", text: a.label }),
                    el("span", { class: "tl-c", text: costLabel(a.cost) }),
                ]))));

            inner.appendChild(el("h3", { text: "Where the fifteen minutes went" }));
            inner.appendChild(el("div", { class: "spend" }, [
                spendBar("Carrying people", R.time.carrying, R.time.total, "#5fd67a"),
                spendBar("Fighting the fire", R.time.fighting, R.time.total, "#e08a2a"),
                spendBar("Talking to people", R.time.arguing, R.time.total, "#4a8fd0"),
                spendBar("Everything else", Math.max(0, R.time.total - R.time.carrying -
                    R.time.fighting - R.time.arguing), R.time.total, "#6b7280"),
            ]));

            if (R.medals.length) {
                inner.appendChild(el("h3", { text: "Other observations" }));
                inner.appendChild(el("div", { class: "medals" },
                    R.medals.map((m) => el("div", { class: "medal" }, [
                        el("b", { text: m.name }), el("i", { text: m.text })]))));
            }

            inner.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { class: "big", onclick: begin,
                               text: choice.seed === null ? "Fly it again"
                                                          : "Fly seed " + choice.seedText + " again" }),
                // The same aeroplane once more, when this one came off the dice.
                choice.seed === null
                    ? el("button", { text: "Fly seed " + R.seed + " again",
                                     onclick: () => { setSeed(String(R.seed)); begin(); } })
                    : null,
                el("button", { text: "Change who you are", onclick: setup }),
                el("button", { text: "Title", onclick: title }),
            ]));
            inner.appendChild(el("p", { class: "footnote", text:
                S.character.name + (S.outfit ? " in " + S.outfit.name.toLowerCase() : "") +
                " · seed " + R.seed + (S.luck === "perfect" ? " · perfect luck" : "") +
                " · " + R.actions + " actions taken · " +
                (S.stats.itemsFound || 0) + " things found aboard · " +
                (S.stats.undos ? "changed your mind " + S.stats.undos + " times"
                               : "never changed your mind") }));

            root.appendChild(inner);
        });
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
        const ok = () => { if (done) done.textContent = "copied"; };
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

    function outcomeWord(key) {
        return { unhurt: "walked off", treated: "treated", serious: "serious",
                 lost: "not accounted for" }[key] || key;
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
