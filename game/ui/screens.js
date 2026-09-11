// Every screen that is not the aeroplane: the title, the setup, the help, the previous flights,
// and the incident report.
//
// The title boards you in one click as whoever you were last time. The setup screen is for the
// flights where you want to be somebody else or wear something else, and it shows what the log
// book has not turned over yet, with the number that turns it. The report is the point of the
// whole thing: it is written in the flat voice of an air accident investigator, it lists every
// soul on board by seat with what happened to them, and it quotes your own actions back at you
// in the order you took them. Then it writes the flight into the log book and boards you again.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el, $, clear, mmss, costLabel, store } = PRS.util;

    let host = null;

    // Who the next flight is flown by, and in what. Boarding saves it.
    const choice = { characterId: "ansel", outfitId: null };
    let choiceLoaded = false;

    /** The choice, made sane: a saved character or outfit can be locked in this browser. */
    function ready() {
        if (!choiceLoaded) {
            choiceLoaded = true;
            const saved = store.get("choice", null);
            if (saved && typeof saved === "object") {
                if (typeof saved.characterId === "string") choice.characterId = saved.characterId;
                if (typeof saved.outfitId === "string") choice.outfitId = saved.outfitId;
            }
        }
        const C = PRS.data.characters, O = PRS.data.outfits, L = PRS.logbook;
        if (!L.isUnlocked(C.byId(choice.characterId))) choice.characterId = C.CHARACTERS[0].id;
        const o = O.byId(choice.outfitId);
        if (!o || !L.isUnlocked(o)) choice.outfitId = null;
        return choice;
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
                pass(),
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

    /** One sentence about the book: how far it has got, and what turns over next. */
    function logLine(book) {
        const next = PRS.logbook.next();
        const so_far = book.flights
            ? PRS.util.plural(book.flights, "flight") + " · " +
              PRS.util.plural(book.souls, "soul") + " secured"
            : "No flights in the log book yet";
        if (!next) return so_far + " · everything is unlocked.";
        return so_far + " · next: " + next.name + " at " + next.unlock + ".";
    }

    /**
     * The boarding pass: who the one button puts on the aeroplane, with their face, their clothes
     * and the three things on them. One click boards; the button under it changes any of it.
     */
    function pass() {
        const ch = PRS.data.characters.byId(choice.characterId);
        const outfit = PRS.data.outfits.byId(choice.outfitId);
        const D = PRS.data.items;
        return el("button", { class: "pass", title: "Board the aircraft", onclick: begin }, [
            PRS.atlas.icon("pax", 3, PRS.pax.palette(ch)),
            el("div", { class: "pass-who" }, [
                el("b", { text: ch.name }),
                el("i", { text: ch.title + " · seat " + ch.seat + " · " +
                                (outfit ? outfit.name.toLowerCase() : "as you are") }),
            ]),
            el("div", { class: "pass-bag" }, ch.bag.length
                ? ch.bag.map((id) => PRS.atlas.icon(D.byId(id).sprite.split(":")[1], 2))
                : [el("i", { text: "nothing on you" })]),
            el("span", { class: "pass-go", text: "Board" }),
        ]);
    }

    // ---------------------------------------------------------------------------------- setup ---
    //
    // Who you are and what you are wearing: two decisions on one screen with one button. Locked
    // cards say exactly what turns them over, because a row of question marks is not something
    // anybody can aim at.

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
        const C = PRS.data.characters, O = PRS.data.outfits, D = PRS.data.items, L = PRS.logbook;
        ready();
        const book = L.load();
        const ch = C.byId(choice.characterId);
        const outfit = O.byId(choice.outfitId);
        const repaint = function (sound) {
            PRS.audio.unlock();
            PRS.audio.play(sound || "select");
            paintSetup(root);
        };
        const lock = (thing) => el("div", { class: "char-lock" }, [
            el("span", { class: "lock-tag", text: "LOCKED" }),
            el("i", { text: "Unlocks at " + thing.unlock + " souls · " + book.souls + " so far" }),
        ]);

        // Who.
        const chars = el("div", { class: "char-grid" });
        for (const c of C.CHARACTERS) {
            const open = L.isUnlocked(c);
            chars.appendChild(el("button", {
                class: "char" + (choice.characterId === c.id ? " on" : "") +
                       (open ? "" : " locked"),
                onclick: !open ? null : function () { choice.characterId = c.id; repaint(); },
            }, [
                el("div", { class: "char-face" }, [PRS.atlas.icon("pax", 5, PRS.pax.palette(c))]),
                el("div", { class: "char-id" }, [
                    el("b", { text: c.name }),
                    el("i", { text: c.age + " · " + c.title }),
                ]),
                open ? el("div", { class: "char-stats" }, statBars(c)) : lock(c),
                open ? el("u", { class: "char-lean", text: c.lean }) : null,
            ]));
        }

        // Wearing.
        const wear = el("div", { class: "outfit-grid" });
        wear.appendChild(el("button", {
            class: "outfit" + (!choice.outfitId ? " on" : ""),
            onclick: function () { choice.outfitId = null; repaint(); },
        }, [
            el("div", { class: "outfit-head" }, [
                el("b", { text: "What you flew in" }),
                el("span", { class: "outfit-mod", text: "as you are" }),
            ]),
            el("i", { text: "Whatever " + ch.short + " had on. The five numbers are the five " +
                            "numbers." }),
        ]));
        for (const o of O.OUTFITS) {
            const open = L.isUnlocked(o);
            wear.appendChild(el("button", {
                class: "outfit" + (choice.outfitId === o.id ? " on" : "") + (open ? "" : " locked"),
                onclick: !open ? null : function () { choice.outfitId = o.id; repaint(); },
            }, [
                el("div", { class: "outfit-head" }, [
                    el("b", { text: o.name }),
                    el("span", { class: "outfit-mod", text: O.summary(o) }),
                ]),
                open ? el("i", { text: o.blurb }) : null,
                open ? el("u", { text: o.note }) : lock(o),
            ]));
        }

        // The composite you, and the one button.
        const panel = el("div", { class: "char-detail" }, [
            el("div", { class: "you-name" }, [
                PRS.atlas.icon("pax", 4, PRS.pax.palette(ch)),
                el("div", {}, [
                    el("b", { text: ch.name }),
                    el("i", { text: ch.age + " · " + ch.title + " · seat " + ch.seat }),
                ]),
            ]),
            el("div", { class: "char-stats big-stats" }, statBars(ch, outfit)),
            el("div", { class: "sub", text: outfit ? outfit.name + ". " + outfit.note
                                                   : "What you flew in." }),
            el("p", { text: ch.blurb }),
            el("p", { class: "lean", text: ch.lean }),
            el("div", { class: "kit" }, ch.bag.map((id) => {
                const item = D.byId(id);
                return el("span", { class: "kit-item", title: item.name }, [
                    PRS.atlas.icon(item.sprite.split(":")[1], 2),
                    el("i", { text: PRS.loot.short(item.name) }),
                ]);
            })),
            el("div", { class: "title-buttons" }, [
                el("button", { class: "big", text: "Board as " + ch.short, onclick: begin }),
                el("button", { text: "Back", onclick: title }),
            ]),
        ]);

        root.appendChild(el("h2", { text: "Who you are" }));
        root.appendChild(el("p", { class: "lede", text: logLine(book) + " Every soul you " +
            "secure goes into the book, and the book turns the cards over." }));
        root.appendChild(el("div", { class: "picker-body" }, [
            el("div", { class: "setup-sections" }, [
                chars,
                el("h3", { text: "What you are wearing" }),
                el("p", { class: "sec-note", text:
                    "It does nothing except move your five numbers. Two points of speed is a " +
                    "second off every step of nine hundred of them." }),
                wear,
            ]),
            panel,
        ]));
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

    /** One click, from the title, the setup or the report. Remembers who, and in what. */
    function begin() {
        ready();
        store.set("choice", { characterId: choice.characterId, outfitId: choice.outfitId });
        const S = PRS.state.create({
            characterId: choice.characterId,
            outfitId: choice.outfitId,
            seed: (Math.random() * 0xffffffff) >>> 0,
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
                        el("span", { text: h.secured + " secured" }),
                        el("span", { text: h.lost + " lost" }),
                        el("span", { class: "grade-" + h.grade, text: h.grade }),
                        el("i", { text: h.ending }),
                    ]);
                })),
                el("div", { class: "title-buttons" }, [
                    el("button", { text: "Back", onclick: title }),
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
            inner.appendChild(el("div", { class: "grade grade-" + R.grade.key }, [
                el("b", { text: R.grade.name }),
                el("i", { text: R.grade.text }),
                el("span", { text: R.secured + " secured · " + R.byYou + " carried by you · " +
                    R.byHelpers + " carried by people you recruited" }),
            ]));

            // The log book, and anything it turned over.
            if (R.logbook) {
                const L = R.logbook;
                inner.appendChild(el("div", { class: "book" }, [
                    el("b", { text: "+" + PRS.util.plural(R.secured, "soul") + " in the log book" }),
                    el("i", { text: PRS.util.plural(L.after.flights, "flight") + " · " +
                                    PRS.util.plural(L.after.souls, "soul") + " secured in all" }),
                    L.unlocked.length
                        ? el("span", { class: "unlocked", text: "Unlocked: " +
                              PRS.util.listSentence(L.unlocked.map((t) => t.name)) + "." })
                        : L.next
                            ? el("span", { text: "Next: " + L.next.name + " at " + L.next.unlock +
                                                  "." })
                            : el("span", { text: "Everything is unlocked." }),
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
                        p.state === "secured" ? "secured forward" +
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
                el("button", { class: "big", text: "Fly it again", onclick: begin }),
                el("button", { text: "Change who you are", onclick: setup }),
                el("button", { text: "Title", onclick: title }),
            ]));
            inner.appendChild(el("p", { class: "footnote", text:
                S.character.name + (S.outfit ? " in " + S.outfit.name.toLowerCase() : "") +
                " · seed " + R.seed + " · " + R.actions + " actions taken · " +
                (S.stats.itemsFound || 0) + " things found aboard · " +
                (S.stats.undos ? "changed your mind " + S.stats.undos + " times"
                               : "never changed your mind") }));

            root.appendChild(inner);
        });
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

    PRS.screens = { mount, title, setup, begin, report, flights, help, hideHelp };
})(window);
