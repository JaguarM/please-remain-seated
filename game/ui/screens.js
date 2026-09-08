// Every screen that is not the aeroplane: the title, the briefing, choosing who you are, packing
// the bag, and the incident report at the end.
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
    const choice = { characterId: "volk", items: [] };

    function mount(node) { host = node; }
    function show(builder) {
        if (PRS.play && PRS.play.destroy) PRS.play.destroy();
        clear(host);
        builder(host);
        window.scrollTo(0, 0);
    }

    // --------------------------------------------------------------------------------- title ---

    function title() {
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
                el("div", { class: "title-buttons" }, [
                    el("button", { class: "big", text: "Board the aircraft",
                                   onclick: () => { PRS.audio.unlock(); characters(); } }),
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
                para("The controls.", "Click an action, or press 1–9 for the first nine. Arrow " +
                    "keys or WASD to step. Click a tile to walk there or to reach the person on " +
                    "it. Tab cycles the decks. Slash focuses the filter box."),
                el("div", { class: "title-buttons" }, [
                    el("button", { class: "big", text: "All right", onclick: characters }),
                    el("button", { text: "Back", onclick: title }),
                ]),
            ]));
        });
    }

    function para(head, body) {
        return el("p", {}, [el("b", { text: head + " " }), document.createTextNode(body)]);
    }

    // ------------------------------------------------------------------------------ characters ---

    function characters() {
        show(function (root) {
            root.className = "screen picker";
            const list = PRS.data.characters.CHARACTERS;
            const grid = el("div", { class: "char-grid" });

            for (const ch of list) {
                const locked = ch.locked && !PRS.medals.unlocked(ch.unlockKey);
                const card = el("button", {
                    class: "char" + (choice.characterId === ch.id ? " on" : "") +
                           (locked ? " locked" : ""),
                    onclick: locked ? null : function () {
                        choice.characterId = ch.id;
                        PRS.audio.unlock();
                        PRS.audio.play("select");
                        characters();
                    },
                }, [
                    el("div", { class: "char-face" }, [
                        PRS.atlas.icon("pax", 5, { h: ch.hair, s: ch.skin, c: ch.shirt }),
                    ]),
                    el("div", { class: "char-id" }, [
                        el("b", { text: locked ? "?????" : ch.name }),
                        el("i", { text: locked ? "Locked" : ch.age + " · " + ch.title }),
                    ]),
                    el("div", { class: "char-stats" }, statBars(ch)),
                    el("div", { class: "char-perk" }, [
                        el("span", { class: "good", text: locked ? "—" : ch.perkName }),
                        el("span", { class: "bad", text: locked ? "—" : ch.flawName }),
                    ]),
                ]);
                grid.appendChild(card);
            }

            const ch = PRS.data.characters.byId(choice.characterId);
            const detail = el("div", { class: "char-detail" }, [
                el("h3", { text: ch.name }),
                el("div", { class: "sub", text: ch.age + " · " + ch.title }),
                el("p", { text: ch.blurb }),
                el("div", { class: "perkbox good" }, [
                    el("b", { text: ch.perkName }), el("p", { text: ch.perkText })]),
                el("div", { class: "perkbox bad" }, [
                    el("b", { text: ch.flawName }), el("p", { text: ch.flawText })]),
                el("div", { class: "title-buttons" }, [
                    el("button", { class: "big", text: "Choose " + ch.name.split(" ")[0],
                                   onclick: loadout }),
                    el("button", { text: "Back", onclick: title }),
                ]),
            ]);

            root.appendChild(el("h2", { text: "Who is in seat 9C" }));
            root.appendChild(el("p", { class: "lede", text:
                "Ten people who could have been on this flight, and two you have to earn. Nobody " +
                "here is strictly better than anybody else; every one of them has something " +
                "that makes their fifteen minutes genuinely worse." }));
            root.appendChild(el("div", { class: "picker-body" }, [grid, detail]));
        });
    }

    function statBars(ch) {
        const names = { strength: "STR", speed: "SPD", lungs: "LNG", nerve: "NRV", voice: "VOI" };
        const out = [];
        for (const key in names) {
            const v = ch.stats[key];
            out.push(el("div", { class: "stat" }, [
                el("span", { text: names[key] }),
                el("div", { class: "stat-track" }, [
                    el("div", { class: "stat-fill", style: { width: (v * 10) + "%" } }),
                ]),
                el("b", { text: String(v) }),
            ]));
        }
        return out;
    }

    // --------------------------------------------------------------------------------- loadout ---

    function loadout() {
        if (!choice.items.length) choice.items = PRS.data.items.PRESETS[0].items.slice();
        show(function (root) {
            root.className = "screen picker";
            const D = PRS.data.items;
            const kg = D.totalKg(choice.items);

            const grid = el("div", { class: "item-grid" });
            for (const item of D.ITEMS) {
                const on = choice.items.indexOf(item.id) >= 0;
                const wouldBe = on ? kg : kg + item.kg;
                const blocked = !on && wouldBe > D.ALLOWANCE;
                const [sheet, sprite] = item.sprite.split(":");
                grid.appendChild(el("button", {
                    class: "item" + (on ? " on" : "") + (blocked ? " blocked" : ""),
                    onclick: function () {
                        if (on) choice.items = choice.items.filter((i) => i !== item.id);
                        else if (!blocked) choice.items.push(item.id);
                        else { PRS.audio.play("refuse"); return; }
                        PRS.audio.unlock();
                        PRS.audio.play(on ? "back" : "select");
                        loadout();
                    },
                }, [
                    PRS.atlas.icon(sprite, 3),
                    el("div", { class: "item-text" }, [
                        el("b", { text: item.name }),
                        el("i", { text: item.blurb }),
                        el("u", { text: item.note }),
                    ]),
                    el("span", { class: "item-kg", text: item.kg.toFixed(2) + "kg" }),
                ]));
            }

            const presets = el("div", { class: "presets" });
            for (const p of D.PRESETS) {
                presets.appendChild(el("button", {
                    class: "preset", onclick: function () {
                        choice.items = p.items.slice();
                        PRS.audio.play("select");
                        loadout();
                    },
                }, [el("b", { text: p.name }), el("i", { text: p.note })]));
            }

            const ch = PRS.data.characters.byId(choice.characterId);
            root.appendChild(el("h2", { text: "What is in the bag" }));
            root.appendChild(el("p", { class: "lede", text:
                "Eight kilos of cabin allowance, which the airline is going to keep enforcing " +
                "while its aeroplane is on fire. The correct answer is boring. It is right " +
                "there, and next to it there is a megaphone." }));
            root.appendChild(el("div", { class: "weigh" }, [
                el("div", { class: "weigh-bar" }, [
                    el("div", { class: "weigh-fill" + (kg > D.ALLOWANCE ? " over" : ""),
                                style: { width: Math.min(100, kg / D.ALLOWANCE * 100) + "%" } }),
                ]),
                el("b", { text: kg.toFixed(2) + " / " + D.ALLOWANCE.toFixed(2) + " kg" }),
                el("i", { text: plural(choice.items.length, "item") + " packed" }),
            ]));
            root.appendChild(presets);
            root.appendChild(grid);
            root.appendChild(el("div", { class: "title-buttons sticky" }, [
                el("button", { class: "big", text: "Board — " + ch.name, onclick: begin }),
                el("button", { text: "Take nothing", onclick: function () {
                    choice.items = []; loadout(); } }),
                el("button", { text: "Back", onclick: characters }),
            ]));
        });
    }

    // ----------------------------------------------------------------------------------- play ---

    function begin() {
        const S = PRS.state.create({
            characterId: choice.characterId,
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
                table.appendChild(el("div", { class: "man-row out-" + p.outcome }, [
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

            inner.appendChild(el("div", { class: "title-buttons" }, [
                el("button", { class: "big", text: "Fly it again", onclick: characters }),
                el("button", { text: "Same person, new bag", onclick: loadout }),
                el("button", { text: "Title", onclick: title }),
            ]));
            inner.appendChild(el("p", { class: "footnote", text:
                "Seed " + R.seed + " · " + R.actions + " actions taken · " +
                R.distinctActions + " of " + PRS.actions.count() + " distinct actions used" }));

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

    PRS.screens = { mount, title, brief, characters, loadout, begin, report, flights, gallery,
                    choice };
})(window);
