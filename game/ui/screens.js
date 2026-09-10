// Every screen that is not the aeroplane: the title, the briefing, the one setup screen for who
// you are and what is on you, and the incident report at the end. The title and the report each
// board you in one click; the setup screen is for the flights where you want to be somebody else.
//
// The report is the point of the whole thing. It is written in the flat voice of an air accident
// investigator, it lists every soul on board by seat with what happened to them, and it quotes
// your own actions back at you in the order you took them, which is a much harder read than a
// score.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el, $, $$, clear, mmss, costLabel, listSentence, plural, store } = PRS.util;

    let host = null;

    // Who the next flight is flown by. Boarding saves it, so the title's one button boards you
    // as whoever you were last time; the first time, it is Kip in gym kit with the sensible three,
    // which is the answer the game would suggest anyway.
    const choice = { characterId: "kip", outfitId: "gym", items: [] };
    let choiceLoaded = false;

    function ready() {
        if (!choiceLoaded) {
            choiceLoaded = true;
            const saved = store.get("choice", null);
            if (saved && typeof saved === "object") {
                if (typeof saved.characterId === "string") choice.characterId = saved.characterId;
                if (typeof saved.outfitId === "string") choice.outfitId = saved.outfitId;
                if (Array.isArray(saved.items)) {
                    choice.items = saved.items.filter((id) => typeof id === "string");
                }
            } else {
                choice.items = PRS.data.items.PRESETS[0].items.slice();
            }
        }
        return sane();
    }

    /** A saved choice can name a character that is locked on this machine, or an item that is
     *  no longer in the bag pool. Nothing downstream should have to think about that. */
    function sane() {
        const C = PRS.data.characters, O = PRS.data.outfits, D = PRS.data.items;
        const ch = C.byId(choice.characterId);
        if (!ch || !C.isUnlocked(ch)) choice.characterId = C.STARTERS[0];
        if (!O.byId(choice.outfitId)) choice.outfitId = O.OUTFITS[0].id;
        choice.items = choice.items
            .filter((id, i, all) => D.BAG_POOL.indexOf(id) >= 0 && all.indexOf(id) === i)
            .slice(0, D.SLOTS);
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
            const history = store.get("history", []);
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
                    fact(String(PRS.actions.count()), "actions written"),
                    fact("0", "ways to put it out"),
                ]),
                pass(),
                el("div", { class: "title-buttons" }, [
                    el("button", { class: "big", text: "Board the aircraft", onclick: begin }),
                    el("button", { text: "How this works", onclick: brief }),
                    el("button", { text: "Sprite sheet", onclick: gallery }),
                    history.length ? el("button", { text: "Previous flights (" + history.length + ")",
                                                    onclick: flights }) : null,
                ]),
                el("p", { class: "footnote", text:
                    "Art and tooling from the ProjectNauvis pixel workshop. Nothing here can be " +
                    "won. Some of it can be done well." }),
            ]));
        });
    }

    function fact(n, label) {
        return el("div", { class: "fact" }, [el("b", { text: n }), el("i", { text: label })]);
    }

    /**
     * The boarding pass: who the one button puts on the aeroplane, with their face, their clothes
     * and the three things on them. Clicking it is how you become somebody else, and nobody has
     * to, which is the point - a first flight is one click from here and so is the tenth.
     */
    function pass() {
        const ch = PRS.data.characters.byId(choice.characterId);
        const outfit = PRS.data.outfits.byId(choice.outfitId);
        const D = PRS.data.items;
        return el("button", {
            class: "pass", title: "Change who you are, what you are wearing, or what is on you",
            onclick: function () { PRS.audio.unlock(); PRS.audio.play("select"); setup(); },
        }, [
            PRS.atlas.icon("pax", 3, PRS.pax.palette(ch)),
            el("div", { class: "pass-who" }, [
                el("b", { text: ch.name }),
                el("i", { text: ch.title + " · " + outfit.name.toLowerCase() }),
            ]),
            el("div", { class: "pass-bag" }, choice.items.length
                ? choice.items.map((id) => PRS.atlas.icon(D.byId(id).sprite.split(":")[1], 2))
                : [el("i", { text: "nothing on you" })]),
            el("span", { class: "pass-change", text: "change" }),
        ]);
    }

    // -------------------------------------------------------------------------------- briefing ---

    function brief() {
        show(function (root) {
            root.className = "screen prose";
            root.appendChild(el("div", { class: "prose-inner" }, [
                el("h2", { text: "How this works" }),
                para("Time only passes when you act.", "There is no timer running while you " +
                    "think. Every action in the list costs a number of seconds, and paying that " +
                    "cost is the only thing that moves the fire, the smoke, the passengers and " +
                    "the crew. Nine hundred seconds, total, and then the aeroplane lands."),
                para("You cannot put the fire out.", "It is a lithium cell in a vape in a hard " +
                    "case in a closed locker, and a cell in thermal runaway makes its own " +
                    "oxygen. Water cools it and buys time. Halon smothers the flame and buys " +
                    "more. Nothing reaches the cell. There are nine cells and they will all go."),
                para("Smoke is what actually kills people.", "It moves four times faster than " +
                    "the fire and it fills from the ceiling down. A person on the floor is in " +
                    "different air from a person standing up. This is why carrying somebody " +
                    "forward and low is worth so much more than it looks."),
                para("Nobody believes you, and they are right not to.", "You are a passenger out " +
                    "of your seat during the meal service pointing at a closed locker. " +
                    "Credibility goes up when the evidence becomes public — a photograph, an " +
                    "open bin, a burn on your hand, the smoke detector — and every social action " +
                    "in the game is gated behind it."),
                para("You cannot save everybody.", "You can carry about fourteen people in " +
                    "fifteen minutes. There are sixty. The arithmetic is the design, not the " +
                    "difficulty. What you are actually playing for is the difference between " +
                    "three and twenty, and the way to find the top of that range is not in the " +
                    "fire deck."),
                para("Most of the equipment is not in your bag.", "You carry three things. The " +
                    "other six are aboard already: two in the galley drawers, and four in other " +
                    "passengers' laps. Asking somebody what they have got costs seven seconds " +
                    "and is the same conversation that turns them into a helper."),
                para("The aeroplane is the menu, and there are three things on it.", "A person, " +
                    "the fire, and you. Click one and a card opens with the handful of things " +
                    "you could do about it, each with its price in seconds. Out of reach is not " +
                    "a dead click: the card says how long the walk is and what you could do " +
                    "once you got there, and one click does both. Everything else is floor, " +
                    "and clicking floor walks you there; arrow keys or WASD step one tile."),
                para("You are the biggest card.", "Click yourself for everything about the " +
                    "place you are standing in - the tap, the galley drawer, the trolley, the " +
                    "lockers - and for the things on you: the hood goes on from here, the " +
                    "bottle gets used on the fire or given to a person, and the card says where " +
                    "each thing in your bag would be worth carrying."),
                para("You can change your mind.", "Backspace undoes your last action and " +
                    "gives you the seconds back; a run of the same action undoes as one. " +
                    "What it will not undo is anything that told you something you did not " +
                    "know — looking in a bin, asking somebody what they have got — because " +
                    "you cannot un-see that. And repeating an action after an undo gives " +
                    "exactly the same result, down to the sentence: you can change your " +
                    "mind, you cannot change your luck."),
                para("Pointing costs nothing.", "Whatever is under the pointer lights up - the " +
                    "person, the fire, or the tile you would walk to, with the price on it - so " +
                    "you can see what a click would be before it is one. Press 1–9 for the " +
                    "rows of an open card."),
                el("div", { class: "title-buttons" }, [
                    el("button", { class: "big", text: "All right — board the aircraft",
                                   onclick: begin }),
                    el("button", { text: "Back", onclick: title }),
                ]),
            ]));
        });
    }

    function para(head, body) {
        return el("p", {}, [el("b", { text: head + " " }), document.createTextNode(body)]);
    }

    // ----------------------------------------------------------------------------- the setup ---
    // Who you are, what you are wearing and what is on you: three decisions on one screen with
    // one button. They used to be three screens with a Next on each, and every flight walked
    // through all of them, including the ones where the player wanted exactly what they had last
    // time. Now the title and the report board you directly, and this screen is for changing
    // your mind about who is in 9C.

    function setup() {
        ready();
        show(function (root) {
            root.className = "screen picker setup";
            paintSetup(root);
        });
    }

    /** Rebuilt in place on every click, with the scroll kept where it was. */
    function paintSetup(root) {
        const y = window.scrollY;
        clear(root);
        const C = PRS.data.characters, O = PRS.data.outfits, D = PRS.data.items;
        sane();
        const ch = C.byId(choice.characterId);
        const outfit = O.byId(choice.outfitId);
        const repaint = function (sound) {
            PRS.audio.unlock();
            PRS.audio.play(sound || "select");
            paintSetup(root);
        };

        // Who.
        const list = C.inPickOrder();
        const openCount = list.filter(C.isUnlocked).length;
        const chars = el("div", { class: "char-grid" });
        for (const c of list) {
            const open = C.isUnlocked(c);
            chars.appendChild(el("button", {
                class: "char" + (choice.characterId === c.id ? " on" : "") +
                       (open ? "" : " locked"),
                onclick: !open ? null : function () { choice.characterId = c.id; repaint(); },
            }, [
                el("div", { class: "char-face" }, [
                    PRS.atlas.icon("pax", 5, PRS.pax.palette(c)),
                ]),
                el("div", { class: "char-id" }, [
                    el("b", { text: c.name }),
                    el("i", { text: c.age + " · " + c.title }),
                ]),
                open
                    ? el("div", { class: "char-stats" }, statBars(c))
                    : el("div", { class: "char-lock" }, [
                          el("span", { class: "lock-tag", text: "LOCKED" }),
                          el("i", { text: c.unlock }),
                      ]),
                open ? el("div", { class: "char-perk" }, [
                    el("span", { class: "good", text: c.perkName }),
                    el("span", { class: "bad", text: c.flawName }),
                ]) : null,
            ]));
        }

        // Wearing.
        const wear = el("div", { class: "outfit-grid" });
        for (const o of O.OUTFITS) {
            wear.appendChild(el("button", {
                class: "outfit" + (choice.outfitId === o.id ? " on" : ""),
                onclick: function () { choice.outfitId = o.id; repaint(); },
            }, [
                el("div", { class: "outfit-head" }, [
                    el("b", { text: o.name }),
                    el("span", { class: "outfit-mod", text: O.summary(o) }),
                ]),
                el("i", { text: o.blurb }),
                el("u", { text: o.note }),
            ]));
        }

        // On you.
        const full = choice.items.length >= D.SLOTS;
        const presets = el("div", { class: "presets" });
        for (const preset of D.PRESETS) {
            presets.appendChild(el("button", {
                class: "preset",
                onclick: function () { choice.items = preset.items.slice(); repaint(); },
            }, [el("b", { text: preset.name }), el("i", { text: preset.note })]));
        }
        presets.appendChild(el("button", {
            class: "preset",
            onclick: function () { choice.items = []; repaint("back"); },
        }, [el("b", { text: "Nothing" }),
            el("i", { text: "Both hands free, and everything you need is somebody else's." })]));

        const bag = el("div", { class: "item-grid" });
        for (const item of D.bagPool()) {
            const on = choice.items.indexOf(item.id) >= 0;
            bag.appendChild(el("button", {
                class: "item" + (on ? " on" : "") + (!on && full ? " dim" : ""),
                onclick: function () {
                    if (on) {
                        choice.items = choice.items.filter((i) => i !== item.id);
                    } else {
                        // A full bag swaps rather than refusing: three slots is a small enough
                        // decision that making somebody undo one first is just rude.
                        if (choice.items.length >= D.SLOTS) choice.items.shift();
                        choice.items.push(item.id);
                    }
                    repaint(on ? "back" : "select");
                },
            }, [
                PRS.atlas.icon(item.sprite.split(":")[1], 3),
                el("div", { class: "item-text" }, [
                    el("b", { text: item.name }),
                    el("i", { text: item.blurb }),
                    el("u", { text: item.note }),
                ]),
            ]));
        }

        const sections = el("div", { class: "setup-sections" }, [
            el("h3", { text: "Who you are" }),
            el("p", { class: "sec-note", text:
                openCount + " of " + list.length + " available. The rest are unlocked by things " +
                "that happen on the aeroplane, and every condition is printed on its card, so " +
                "they are somewhere to aim rather than something withheld." }),
            chars,
            el("h3", { text: "What you are wearing" }),
            el("p", { class: "sec-note", text:
                "One of six, and it does nothing except move your five numbers. Two points of " +
                "speed is a second off every step of nine hundred of them; two points of voice " +
                "is the difference between being believed at minute four and at minute nine." }),
            wear,
            el("h3", { text: "What is on you" }),
            el("p", { class: "sec-note", text:
                "Three things. That is the cabin baggage allowance, and the airline is going to " +
                "keep enforcing it while its aeroplane is on fire. Everything else in this game " +
                "is already aboard — in the galleys, under the seats, and in other passengers' " +
                "laps — and the way you get it is by asking." }),
            presets,
            bag,
        ]);

        // The composite you, and the one button. Three slots drawn as three slots, so the size
        // of the bag decision is visible before it is made.
        const panel = el("div", { class: "char-detail" }, [
            el("div", { class: "you-name" }, [
                PRS.atlas.icon("pax", 4, PRS.pax.palette(ch)),
                el("div", {}, [
                    el("b", { text: ch.name }),
                    el("i", { text: ch.age + " · " + ch.title }),
                ]),
            ]),
            el("div", { class: "char-stats big-stats" }, statBars(ch, outfit)),
            el("div", { class: "sub", text: outfit.name + ". " + outfit.note }),
            el("p", { text: ch.blurb }),
            el("div", { class: "perkbox good" }, [
                el("b", { text: ch.perkName }), el("p", { text: ch.perkText })]),
            el("div", { class: "perkbox bad" }, [
                el("b", { text: ch.flawName }), el("p", { text: ch.flawText })]),
            el("div", { class: "slots" }, [0, 1, 2].map(function (i) {
                const item = choice.items[i] ? D.byId(choice.items[i]) : null;
                return el("div", { class: "slot" + (item ? " filled" : ""),
                                   title: item ? item.name : "empty" }, [
                    item ? PRS.atlas.icon(item.sprite.split(":")[1], 3)
                         : el("span", { class: "slot-empty", text: String(i + 1) }),
                ]);
            })),
            el("div", { class: "title-buttons" }, [
                el("button", { class: "big", text: "Board — " + ch.name, onclick: begin }),
                el("button", { text: "Back", onclick: title }),
            ]),
        ]);

        root.appendChild(el("h2", { text: "Who is in seat 9C" }));
        root.appendChild(el("p", { class: "lede", text:
            "Three decisions, none of them longer than twenty seconds, and the button at the " +
            "side takes whatever they are. Almost nothing is decided before you board." }));
        root.appendChild(el("div", { class: "picker-body" }, [sections, panel]));
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

    /** One click, from anywhere: the title, the report, the briefing, or the setup screen. The
     *  choice is saved here, so the next flight's one click is the same person. */
    function begin() {
        ready();
        store.set("choice", { characterId: choice.characterId, outfitId: choice.outfitId,
                              items: choice.items.slice() });
        const S = PRS.state.create({
            characterId: choice.characterId,
            outfitId: choice.outfitId,
            items: choice.items.slice(),
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
                el("span", { text: R.secured + " secured by hand · " + R.byYou + " carried by " +
                    "you · " + R.byHelpers + " carried by people you recruited" }),
            ]));

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

            // Every soul, by seat.
            inner.appendChild(el("h3", { text: "Manifest" }));
            const table = el("div", { class: "manifest" });
            const rows = R.rows.slice().sort((a, b) => a.row - b.row ||
                (a.letter < b.letter ? -1 : 1));
            for (const p of rows) {
                // Their own face, at the size a boarding card photograph would be. Sixty of them
                // in a list is the point: this is the register, and it has people in it.
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

            if (R.notes.length) {
                inner.appendChild(el("h3", { text: "Findings" }));
                inner.appendChild(el("ul", { class: "findings" },
                    R.notes.map((n) => el("li", { text: n.clock + " — " + n.text }))));
            }

            inner.appendChild(el("h3", { text: "The fire" }));
            inner.appendChild(el("p", { class: "fireline", text:
                "The source was a lithium-ion cell in a personal vaporiser in a hard-shell case " +
                "in the overhead stowage above seat 14C. " + R.fire.vented + " of nine cells " +
                "vented in flight. " + R.fire.cellsLeft + " remained on landing. Containment " +
                "achieved by cabin occupants: " + R.fire.contained + " per cent" +
                (R.fire.inSink ? ", and the unit was immersed in water in the aft lavatory basin, " +
                 "which is the correct action and is not in any cabin crew manual" : "") + "." }));

            if (R.medals.length) {
                inner.appendChild(el("h3", { text: "Other observations" }));
                inner.appendChild(el("div", { class: "medals" },
                    R.medals.map((m) => el("div", { class: "medal" }, [
                        el("b", { text: m.name }), el("i", { text: m.text })]))));
            }

            // Fly it again is the same person, the same clothes and the same bag on a new
            // seed, in one click. Being somebody else is the other button.
            inner.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { class: "big", text: "Fly it again", onclick: begin }),
                el("button", { text: "Change who you are", onclick: setup }),
                el("button", { text: "Title", onclick: title }),
            ]));
            inner.appendChild(el("p", { class: "footnote", text:
                S.character.name + " in " + S.outfit.name.toLowerCase() + " · seed " +
                R.seed + " · " + R.actions + " actions taken · " + R.distinctActions +
                " of " + PRS.actions.count() + " distinct actions used · " +
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

    // ------------------------------------------------------------------------------- extras ---

    function flights() {
        show(function (root) {
            root.className = "screen prose";
            const history = store.get("history", []);
            root.appendChild(el("div", { class: "prose-inner" }, [
                el("h2", { text: "Previous flights" }),
                el("div", { class: "history" }, history.map(function (h) {
                    const ch = PRS.data.characters.byId(h.character);
                    return el("div", { class: "hrow" }, [
                        el("b", { text: ch.name }),
                        el("span", { text: h.secured + " secured" }),
                        el("span", { text: h.lost + " lost" }),
                        el("span", { class: "grade-" + h.grade, text: h.grade }),
                        el("i", { text: h.ending }),
                    ]);
                })),
                el("div", { class: "title-buttons" }, [
                    el("button", { text: "Back", onclick: title }),
                    el("button", { text: "Forget all of it", onclick: function () {
                        store.drop("history"); flights(); } }),
                ]),
            ]));
        });
    }

    function gallery() {
        show(function (root) {
            root.className = "screen prose";
            const names = PRS.atlas.names();
            const grid = el("div", { class: "sprite-grid" });
            for (const n of names) {
                grid.appendChild(el("div", { class: "sprite-cell" }, [
                    PRS.atlas.icon(n, 3), el("span", { text: n })]));
            }
            root.appendChild(el("div", { class: "prose-inner" }, [
                el("h2", { text: "Every sprite in the game" }),
                el("p", { text: names.length + " sprites. The item icons came out of the " +
                    "ProjectNauvis modpack; the cabin, the people and the fire are drawn by " +
                    "pixel-workshop/make_cabin_textures.py in the same idiom — an ASCII map and " +
                    "a palette, so a passenger is one map and sixty palettes." }),
                grid,
                el("div", { class: "title-buttons" }, [
                    el("button", { text: "Back", onclick: title })]),
            ]));
        });
    }

    PRS.screens = { mount, title, brief, setup, begin, report, flights, gallery, choice };
})(window);
