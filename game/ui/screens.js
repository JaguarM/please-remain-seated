// Every screen that is not the aeroplane: the title, the help overlay, and the incident report.
//
// The title boards you in one click, as either of the two people who could be in 9C. The report
// is the point of the whole thing: it is written in the flat voice of an air accident
// investigator, it lists every soul on board by seat with what happened to them, and it quotes
// your own actions back at you in the order you took them, which is a much harder read than a
// score. Then it boards you again, in one click, as the same person or the other one.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el, $, clear, mmss, costLabel, store } = PRS.util;

    let host = null;

    function mount(node) { host = node; }
    function show(builder) {
        if (PRS.play && PRS.play.destroy) PRS.play.destroy();
        clear(host);
        builder(host);
        window.scrollTo(0, 0);
    }

    /** Who flew last time, or the first of the two. */
    function lastCharacter() {
        return PRS.data.characters.byId(store.get("character", null));
    }

    // --------------------------------------------------------------------------------- title ---

    function title() {
        show(function (root) {
            root.className = "screen title";
            const last = lastCharacter();
            const C = PRS.data.characters;
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
                el("div", { class: "roster" }, C.CHARACTERS.map((c) => card(c, c.id === last.id))),
                el("div", { class: "title-buttons" }, [
                    el("button", { text: "How to play", onclick: () => help(root, last) }),
                ]),
                el("p", { class: "footnote", text:
                    "Nothing here can be won. Some of it can be done well." }),
            ]));
        });
    }

    function fact(n, label) {
        return el("div", { class: "fact" }, [el("b", { text: n }), el("i", { text: label })]);
    }

    /** One of the two people, with their face, their five numbers and the one sentence. */
    function card(c, lit) {
        return el("button", {
            class: "boarding" + (lit ? " lit" : ""),
            onclick: () => begin(c.id),
        }, [
            PRS.atlas.icon("pax", 4, PRS.pax.palette(c)),
            el("div", { class: "boarding-who" }, [
                el("b", { text: c.name }),
                el("i", { text: c.age + " · " + c.title }),
                el("div", { class: "char-stats" }, statBars(c)),
                el("u", { text: c.lean }),
                el("span", { class: "boarding-go", text: "Board as " + c.short }),
            ]),
        ]);
    }

    /** Five bars. */
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

    // ------------------------------------------------------------------------------ boarding ---

    /** One click, from the title or the report. Remembers who, so the next flight is one click. */
    function begin(characterId) {
        store.set("character", characterId);
        const S = PRS.state.create({
            characterId: characterId,
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
    }

    function helpLine(icon, head, body) {
        return el("div", { class: "help-line" }, [
            el("div", { class: "help-icon" }, [icon]),
            el("div", {}, [el("b", { text: head }), el("span", { text: body })]),
        ]);
    }

    function hideHelp(root) {
        const veil = root && $(".help-veil", root);
        if (veil) veil.remove();
        store.set("seenHelp", true);
    }

    // --------------------------------------------------------------------------------- report ---

    function report(S) {
        const R = S.result || PRS.scoring.settle(S);
        const other = PRS.data.characters.other(S.character.id);
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
                el("button", { class: "big", text: "Fly it again",
                               onclick: () => begin(S.character.id) }),
                el("button", { text: "Fly as " + other.short, onclick: () => begin(other.id) }),
                el("button", { text: "Title", onclick: title }),
            ]));
            inner.appendChild(el("p", { class: "footnote", text:
                S.character.name + " · seed " + R.seed + " · " + R.actions + " actions taken · " +
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

    PRS.screens = { mount, title, begin, report, help, hideHelp };
})(window);
