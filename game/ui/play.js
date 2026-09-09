// The screen you spend fifteen minutes on: the cabin, the clock, the log, and the list.
//
// The list is the game, so it gets the rules. Everything currently possible is in it, grouped by
// deck, sorted by cost, with the price in seconds on the right of every row, because the whole
// design depends on the player feeling the price of a conversation next to the price of a carry.
// Nothing is hidden and nothing is greyed out: if an action is impossible it is not in the list,
// and if it is in the list it will happen.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el, $, $$, clear, mmss, costLabel, clamp01 } = PRS.util;
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;

    let S = null;
    let root = null;
    let canvas = null, ctx = null, scale = 2;
    let hover = null;
    let raf = 0;
    let filter = "";
    let openDeck = null;
    let lastEntries = [];

    function build(container, state) {
        S = state;
        root = clear(container);
        root.className = "screen play";

        const bar = el("div", { class: "hud" }, [
            el("div", { class: "hud-clock" }, [
                el("div", { class: "clock-label", text: "TO TOUCHDOWN" }),
                el("div", { class: "clock", id: "clock", text: mmss(S.clock.remaining) }),
            ]),
            el("div", { class: "hud-meters", id: "meters" }),
            el("div", { class: "hud-you", id: "youbox" }),
        ]);

        const left = el("div", { class: "col-left" }, [
            el("div", { class: "canvas-wrap" }, [
                canvas = el("canvas", { id: "cabin", class: "cabin" }),
            ]),
            el("div", { class: "here", id: "here" }),
        ]);
        // The log is a sibling of the two columns rather than a child of the left one, so that a
        // narrow window can order it after the action list instead of burying the list under it.
        const logwrap = el("div", { class: "logwrap" }, [
            el("div", { class: "log", id: "log" }),
        ]);

        const right = el("div", { class: "col-right" }, [
            el("div", { class: "list-head" }, [
                el("input", { id: "filter", class: "filter", type: "text",
                              placeholder: "filter actions…", autocomplete: "off",
                              oninput: (e) => { filter = e.target.value.toLowerCase(); paint(); } }),
                el("div", { class: "list-count", id: "listcount" }),
            ]),
            el("div", { class: "decks", id: "decks" }),
            el("div", { class: "actions", id: "actions" }),
        ]);

        root.appendChild(bar);
        root.appendChild(el("div", { class: "board" }, [left, right, logwrap]));

        ctx = canvas.getContext("2d");
        scale = PRS.render.fit(canvas);

        canvas.addEventListener("mousemove", function (e) {
            hover = PRS.render.tileAt(canvas, scale, e.clientX, e.clientY);
        });
        canvas.addEventListener("mouseleave", function () { hover = null; });
        canvas.addEventListener("click", function (e) {
            const t = PRS.render.tileAt(canvas, scale, e.clientX, e.clientY);
            if (!t) return;
            clickTile(t);
        });
        window.addEventListener("resize", function () {
            if (!canvas.isConnected) return;
            scale = PRS.render.fit(canvas);
        });
        document.addEventListener("keydown", onKey);

        S.onLog = pushLog;
        for (const entry of S.log) pushLog(entry);

        st.log(S, S.character.open, "open");
        st.log(S, "Transnational 447, thirty-one thousand feet, beginning the descent. " +
                  "Sixty-one souls. There is something burning in the locker above " +
                  cabin.ORIGIN.row + cabin.ORIGIN.letter + " and you are the only person on this " +
                  "aeroplane who has noticed.", "open");
        st.log(S, "The clock only moves when you do. Every action costs seconds. " +
                  "You cannot put this fire out.", "rule");

        paint();
        loop();
    }

    function destroy() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        if (S) S.onLog = null;
    }

    // -------------------------------------------------------------------------------- loop ---

    function loop() {
        raf = requestAnimationFrame(loop);
        if (!canvas || !canvas.isConnected) return;
        PRS.render.draw(ctx, S, { scale: scale, time: performance.now(), hover: hover });
    }

    // -------------------------------------------------------------------------------- paint ---

    function paint() {
        if (!root || !root.isConnected) return;
        $("#clock", root).textContent = mmss(S.clock.remaining);
        $("#clock", root).className = "clock" +
            (S.clock.remaining < 120 ? " urgent" : S.clock.remaining < 300 ? " warn" : "");
        paintMeters();
        paintYou();
        paintHere();
        paintActions();
    }

    function meter(label, value, max, cls, note) {
        const pct = Math.round(clamp01(value / max) * 100);
        return el("div", { class: "meter " + (cls || "") }, [
            el("div", { class: "meter-label" }, [
                el("span", { text: label }),
                el("b", { text: note !== undefined ? note : pct + "%" }),
            ]),
            el("div", { class: "meter-track" }, [
                el("div", { class: "meter-fill", style: { width: pct + "%" } }),
            ]),
        ]);
    }

    function paintMeters() {
        const box = clear($("#meters", root));
        const f = S.fire;
        box.appendChild(meter("SOULS SECURED", st.securedCount(S), 61, "m-good",
                              st.securedCount(S) + " / 61"));
        box.appendChild(meter("HELPING", st.helperCount(S), 10, "m-good",
                              String(st.helperCount(S))));
        box.appendChild(meter("THEY BELIEVE YOU", S.credibility, 100, "m-cred"));
        box.appendChild(meter("CABIN PANIC", S.cabinPanic, 100, "m-panic"));
        // There is no fire meter and no smoke meter. The cabin is on the screen; how bad it is
        // is a thing you look at, the way everybody else on this aeroplane has to.
        const phase = PRS.crew.PHASES[S.crewPhase];
        box.appendChild(el("div", { class: "crewphase" }, [
            el("span", { class: "tag", text: "CREW" }),
            el("b", { text: phase.name }),
            el("i", { text: phase.desc }),
        ]));
    }

    function paintYou() {
        const box = clear($("#youbox", root));
        const P = S.player;
        box.appendChild(el("div", { class: "you-name" }, [
            PRS.atlas.icon("pax", 2, { h: S.character.hair, s: S.character.skin,
                                       c: S.character.shirt }),
            el("div", {}, [
                el("b", { text: S.character.name }),
                el("i", { text: S.character.title }),
            ]),
        ]));
        box.appendChild(meter("YOUR LUNGS", 100 - P.smokeDose, 100, "m-lungs",
                              P.smokeDose > 70 ? "failing" : P.smokeDose > 40 ? "bad"
                              : P.smokeDose > 15 ? "coughing" : "fine"));
        box.appendChild(meter("YOUR PANIC", P.panic, 100, "m-panic"));
        box.appendChild(meter("BURNS", P.burns, 100, "m-burn",
                              P.burns > 40 ? "severe" : P.burns > 15 ? "bad"
                              : P.burns > 3 ? "sore" : "none"));
        const carrying = P.carrying.map((id) => st.paxById(S, id)).filter(Boolean);
        if (carrying.length) {
            box.appendChild(el("div", { class: "carrying" }, [
                el("span", { class: "tag", text: "CARRYING" }),
                el("b", { text: carrying.map((p) => p.name).join(", ") }),
            ]));
        }
        if (P.dragging) {
            const p = st.paxById(S, P.dragging);
            box.appendChild(el("div", { class: "carrying" }, [
                el("span", { class: "tag", text: "DRAGGING" }),
                el("b", { text: p ? p.name : "?" }),
            ]));
        }
        const kit = S.inventory.filter((s) => !s.spent);
        if (kit.length) {
            const row = el("div", { class: "kit" });
            for (const s of kit) {
                const [sheet, name] = s.item.sprite.split(":");
                const node = PRS.atlas.icon(name, 2, null, "kit-item");
                node.title = s.item.name + (s.uses === null ? "" : " — " + s.uses + " left") +
                             (s.wet ? " — wet" : "");
                row.appendChild(node);
            }
            box.appendChild(row);
        }
    }

    function paintHere() {
        const box = clear($("#here", root));
        const P = S.player;
        const i = cabin.idx(P.x, P.y);
        const bits = [cabin.placeName(P.x, P.y)];
        const inten = S.fire.intensity[i], smoke = S.fire.smoke[i];
        if (inten > 0.5) bits.push("fire: " + PRS.fire.describe(S.fire, P.x, P.y));
        if (smoke > 6) bits.push("smoke: " + PRS.fire.describeSmoke(smoke));
        const here = st.reachable(S);
        box.appendChild(el("div", { class: "here-place", text: bits.join(" · ") }));
        if (here.length) {
            const row = el("div", { class: "here-people" });
            for (const p of here) {
                const cond = PRS.pax.condition(p);
                row.appendChild(el("span", { class: "chip chip-t" + cond.tier,
                    title: p.name + " · " + p.seat + " · " + p.kg + "kg · " +
                           PRS.pax.displayState(p) + " · " + cond.label }, [
                    PRS.atlas.icon(p.state === "down" ? "pax_down" : "pax", 1,
                                   { h: p.hair, s: p.skin, c: p.shirt }),
                    el("b", { text: p.name.split(" ")[0] }),
                    el("i", { text: p.seat }),
                ]));
            }
            box.appendChild(row);
        }
    }

    // ------------------------------------------------------------------------------ the list ---

    function paintActions() {
        const entries = A.available(S);
        lastEntries = entries;
        const decks = clear($("#decks", root));
        const counts = {};
        for (const e of entries) counts[e.deck] = (counts[e.deck] || 0) + 1;

        decks.appendChild(deckTab("ALL", null, entries.length));
        for (const key of Object.keys(A.DECKS).sort((a, b) => A.DECKS[a].order - A.DECKS[b].order)) {
            if (!counts[key]) continue;
            decks.appendChild(deckTab(A.DECKS[key].name, key, counts[key]));
        }

        const shown = entries.filter(function (e) {
            if (openDeck && e.deck !== openDeck) return false;
            if (!filter) return true;
            return (e.label + " " + (e.detail || "") + " " + e.deck).toLowerCase()
                   .indexOf(filter) >= 0;
        });

        $("#listcount", root).textContent = shown.length + " of " + entries.length + " available";

        const box = clear($("#actions", root));
        let deck = null;
        shown.forEach(function (e, n) {
            if (e.deck !== deck) {
                deck = e.deck;
                box.appendChild(el("div", { class: "deck-head" }, [
                    el("b", { text: A.DECKS[deck].name }),
                    el("i", { text: A.DECKS[deck].hint }),
                ]));
            }
            box.appendChild(actionRow(e, n));
        });
        if (!shown.length) {
            box.appendChild(el("div", { class: "empty", text:
                "Nothing here matches. Everything you can actually do is in ALL." }));
        }
    }

    function deckTab(name, key, n) {
        return el("button", {
            class: "deck-tab" + (openDeck === key ? " on" : ""),
            onclick: () => { openDeck = key; paintActions(); },
        }, [el("span", { text: name }), el("b", { text: String(n) })]);
    }

    function actionRow(e, n) {
        const over = e.cost > S.clock.remaining;
        return el("button", {
            class: "act act-" + e.danger + (over ? " over" : ""),
            onclick: () => run(e),
            dataset: { key: e.key },
        }, [
            el("span", { class: "act-key", text: n < 9 ? String(n + 1) : "" }),
            el("span", { class: "act-body" }, [
                el("b", { text: e.label }),
                e.detail ? el("i", { text: e.detail }) : null,
            ]),
            el("span", { class: "act-cost", text: over ? "over" : costLabel(e.cost) }),
        ]);
    }

    function run(entry) {
        if (S.clock.landed) return;
        PRS.audio.unlock();
        PRS.audio.play("click");
        A.perform(S, entry);
        if (S.clock.landed) {
            paint();
            setTimeout(() => PRS.screens.report(S), 900);
            return;
        }
        paint();
    }

    function clickTile(t) {
        // Clicking a tile does the cheapest sensible thing for it: step there, or reach the
        // person on it. It is a shortcut into the list, never a thing the list cannot do.
        const entries = lastEntries.length ? lastEntries : A.available(S);
        const here = st.paxAt(S, t.x, t.y);
        if (here.length) {
            const p = here[0];
            const carry = entries.filter((e) => e.id === "people.carry" && e.ctx &&
                                                e.ctx.p && e.ctx.p.id === p.id)[0];
            if (carry) return run(carry);
            const tell = entries.filter((e) => e.id === "people.tell" && e.ctx &&
                                               e.ctx.p && e.ctx.p.id === p.id)[0];
            if (tell) return run(tell);
        }
        const step = entries.filter((e) => e.id === "move.step" && e.ctx &&
                                           e.ctx.x === t.x && e.ctx.y === t.y)[0];
        if (step) return run(step);
        const row = cabin.rowAt(t.x);
        const goto = entries.filter((e) => e.id === "move.to_row" && e.ctx && e.ctx.row === row)[0];
        if (goto) return run(goto);
    }

    // -------------------------------------------------------------------------------- keys ---

    function onKey(ev) {
        if (!root || !root.isConnected) return;
        const tag = (ev.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") {
            if (ev.key === "Escape") { ev.target.blur(); ev.target.value = ""; filter = ""; paint(); }
            return;
        }
        const rows = $$(".act", root);
        if (ev.key >= "1" && ev.key <= "9") {
            const i = Number(ev.key) - 1;
            if (rows[i]) { rows[i].click(); ev.preventDefault(); }
            return;
        }
        const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
                       a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
        const d = dirs[ev.key];
        if (d) {
            const entries = lastEntries.length ? lastEntries : A.available(S);
            const step = entries.filter((e) => e.id === "move.step" && e.ctx &&
                e.ctx.x === S.player.x + d[0] && e.ctx.y === S.player.y + d[1])[0];
            if (step) { run(step); ev.preventDefault(); }
            return;
        }
        if (ev.key === "/") { $("#filter", root).focus(); ev.preventDefault(); }
        if (ev.key === "Tab") {
            const keys = [null].concat(Object.keys(A.DECKS));
            const i = keys.indexOf(openDeck);
            openDeck = keys[(i + 1) % keys.length];
            paintActions();
            ev.preventDefault();
        }
    }

    // -------------------------------------------------------------------------------- the log ---

    function pushLog(entry) {
        const box = root && $("#log", root);
        if (!box) return;
        const line = el("div", { class: "log-line log-" + entry.kind }, [
            el("span", { class: "log-t", text: entry.clock }),
            el("span", { class: "log-x", text: entry.text }),
        ]);
        box.appendChild(line);
        while (box.children.length > 220) box.removeChild(box.firstChild);
        box.scrollTop = box.scrollHeight;
    }

    PRS.play = { build, destroy, paint };
})(window);
