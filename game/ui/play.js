// The screen you spend fifteen minutes on: the cabin, the clock, the log, and the list.
//
// The list is the game, so it gets the rules. Everything currently possible is in it, grouped by
// deck, sorted by cost, with the price in seconds on the right of every row, because the whole
// design depends on the player feeling the price of a conversation next to the price of a carry.
// Nothing is hidden and nothing is greyed out: if an action is impossible it is not in the list,
// and if it is in the list it will happen.
//
// The list and the aeroplane are two halves of one sentence, and this file is the hinge. Point at
// a row and the person it would happen to lights up on the cabin, wherever they are, with the
// price on the tile. Point at somebody on the cabin and every row that could touch them lights up
// in the list. Neither direction moves the clock: a plan costs nothing until it is a decision.
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
    let hover = null;             // the tile the mouse is over
    let raf = 0;
    let filter = "";
    let openDeck = null;
    let lastEntries = [];
    let walkAnim = null;          // cosmetic: the marker walking the route it just walked
    let plan = null;              // what the row under the pointer would do, drawn on the cabin
    let planKey = null;
    let litPax = null;            // the person under the pointer, lit in the list
    let clockShown = 0;           // the number on the clock, which chases the real one
    let clockMinute = null;       // and the minute it was last showing, for the tick
    let lastMeters = {};

    function build(container, state) {
        S = state;
        root = clear(container);
        root.className = "screen play";
        clockShown = S.clock.remaining;
        clockMinute = null;
        lastMeters = {};
        PRS.render.fx.clear();

        const bar = el("div", { class: "hud" }, [
            el("div", { class: "hud-clock" }, [
                el("div", { class: "clock-label", text: "TO TOUCHDOWN" }),
                el("div", { class: "clock", id: "clock", text: mmss(S.clock.remaining) }),
                el("div", { class: "clock-plan", id: "clockplan" }),
                el("button", { class: "sound", id: "sound", title: "Sound (M)",
                               onclick: toggleSound }),
            ]),
            el("div", { class: "hud-meters", id: "meters" }),
            el("div", { class: "hud-you", id: "youbox" }),
        ]);

        const left = el("div", { class: "col-left" }, [
            el("div", { class: "canvas-wrap", id: "canvaswrap" }, [
                canvas = el("canvas", { id: "cabin", class: "cabin" }),
                el("div", { class: "tip", id: "tip" }),
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
            el("div", { class: "undo-bar", id: "undobar" }),
            el("div", { class: "actions", id: "actions" }),
        ]);

        root.appendChild(bar);
        root.appendChild(el("div", { class: "board" }, [left, right, logwrap]));

        ctx = canvas.getContext("2d");
        scale = PRS.render.fit(canvas);

        canvas.addEventListener("mousemove", onCabinMove);
        canvas.addEventListener("mouseleave", function () {
            hover = null; litPax = null; hideTip(); relight();
        });
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

        paintSound();
        paint();
        loop();
    }

    /**
     * Every action in the game makes a noise now, so there has to be a way to stop it. The
     * setting outlives the flight; nothing else on this screen does.
     */
    function toggleSound() {
        PRS.audio.unlock();
        PRS.audio.setEnabled(!PRS.audio.isEnabled());
        PRS.util.store.set("sound", PRS.audio.isEnabled());
        if (PRS.audio.isEnabled()) { PRS.audio.startRoar(); PRS.audio.play("select"); }
        paintSound();
    }

    function paintSound() {
        const b = root && $("#sound", root);
        if (!b) return;
        const on = PRS.audio.isEnabled();
        b.textContent = on ? "SOUND ON" : "SOUND OFF";
        b.className = "sound" + (on ? "" : " off");
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
        const now = performance.now();
        tickClock();
        PRS.render.draw(ctx, S, {
            scale: scale, time: now, hover: hover,
            hoverRoute: plan ? null : hoverRoute(),
            plan: plan,
            playerAt: walkPos(now),
        });
    }

    /**
     * The clock chases the number rather than jumping to it. Fifteen seconds spent has to look
     * like fifteen seconds spent, and a digit that changes by itself is the only thing on this
     * screen that moves without being asked.
     */
    function tickClock() {
        const target = S.clock.remaining;
        if (Math.abs(clockShown - target) < 0.4) {
            if (clockShown === target) return;
            clockShown = target;
        } else {
            clockShown += (target - clockShown) * 0.16;
        }
        const was = clockMinute;
        clockMinute = Math.floor(clockShown / 60);
        // One tick per minute gone. Fifteen of them in a flight, and the last few are the only
        // sound in this game that is not something you or the aeroplane did.
        if (was !== null && clockMinute < was) PRS.audio.play("tick");
        const node = root && $("#clock", root);
        if (node) node.textContent = mmss(clockShown);
    }

    /** Where to draw the marker this frame: along the last walk, or simply where you are. */
    function walkPos(now) {
        if (!walkAnim) return null;
        const t = (now - walkAnim.start) / walkAnim.ms;
        if (t >= 1) { walkAnim = null; return null; }
        const path = walkAnim.path;
        const at = t * (path.length - 1);
        const i = Math.min(path.length - 2, Math.floor(at));
        const f = at - i;
        return { x: path[i][0] + (path[i + 1][0] - path[i][0]) * f,
                 y: path[i][1] + (path[i + 1][1] - path[i][1]) * f };
    }

    /** The route the mouse is proposing, for the dotted line and the price on the tile. */
    function hoverRoute() {
        if (!hover || S.clock.landed) return null;
        if (hover.x === S.player.x && hover.y === S.player.y) return null;
        const r = A.route(S, hover.x, hover.y);
        if (!r) return null;
        return { path: r.path.map((i) => [cabin.xOf(i), cabin.yOf(i)]),
                 cost: Math.max(1, Math.round(r.cost)),
                 name: cabin.placeName(hover.x, hover.y) };
    }

    /** Walk to a tile. This is what the cabin is for. */
    function walkTo(t) {
        const hit = A.available(S, true).filter(
            (e) => e.id === "move.walk" && e.ctx.x === t.x && e.ctx.y === t.y)[0];
        if (!hit) return false;
        const from = [S.player.x, S.player.y];
        const path = hit.ctx.r.path.map((i) => [cabin.xOf(i), cabin.yOf(i)]);
        run(hit);
        walkAnim = { path: [from].concat(path), start: performance.now(),
                     ms: Math.min(650, 80 + path.length * 50) };
        return true;
    }

    // -------------------------------------------------------------------- planning an action ---

    /**
     * Where an action would land. Every deck builds its targets the same way - `p` is a person,
     * `c` is a member of crew, `h` and `t` are a helper and who you would point them at, `x`/`y`
     * is a tile and `r` is a route - so one reader covers all hundred and eighty-nine of them.
     *
     * An action with no target at all happens where you are standing, except for the fire deck,
     * which happens at the fire, and the fire is wherever it has got to.
     */
    function planFor(e) {
        const c = e.ctx;
        const out = { danger: e.danger, cost: e.cost, tiles: [] };
        if (c) {
            if (c.h && c.t) {
                out.link = [c.h.x, c.h.y, c.t.x, c.t.y];
                out.focus = { x: c.t.x, y: c.t.y };
                out.tiles.push([c.h.x, c.h.y]);
            } else if (c.p) {
                out.focus = { x: c.p.x, y: c.p.y };
            } else if (c.c) {
                out.focus = { x: c.c.x, y: c.c.y };
            } else if (typeof c.x === "number") {
                out.focus = { x: c.x, y: c.y };
            }
            if (c.r && c.r.path) out.path = c.r.path.map((i) => [cabin.xOf(i), cabin.yOf(i)]);
        }
        if (!out.focus && e.tags.indexOf("fire") >= 0) out.focus = nearestFire();
        if (!out.focus) out.focus = { x: S.player.x, y: S.player.y };
        // Anything that ends with somebody in your arms wants the place you would be taking them.
        if (e.tags.indexOf("carry") >= 0) {
            const zx = PRS.pax.nearestSafeX(S.player.x);
            if (zx !== S.player.x) out.tiles.push([zx, cabin.AISLE_Y]);
        }
        return out;
    }

    /** The hottest tile you could reach from here, which is what "the fire" means to an action. */
    function nearestFire() {
        let best = null, worst = 0;
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const v = S.fire.intensity[cabin.idx(x, y)];
                if (v <= 1) continue;
                const d = Math.abs(x - S.player.x) + Math.abs(y - S.player.y);
                if (d > 3) continue;
                if (v > worst) { worst = v; best = { x: x, y: y }; }
            }
        }
        return best;
    }

    function setPlan(entry) {
        const key = entry ? entry.key : null;
        if (key === planKey) return;
        planKey = key;
        plan = entry ? planFor(entry) : null;
        if (entry) PRS.audio.play("blip");
    }

    // -------------------------------------------------------------------------------- paint ---

    function paint() {
        if (!root || !root.isConnected) return;
        tipKey = null;      // the panel prints the air on a tile, and the air has just moved
        $("#clock", root).className = "clock" +
            (S.clock.remaining < 120 ? " urgent" : S.clock.remaining < 300 ? " warn" : "");
        paintMeters();
        paintYou();
        paintHere();
        paintUndo();
        paintActions();
    }

    /**
     * The undo bar. It always says what it would undo and what it would give back, or why it
     * will not, because a rule the player cannot see is a rule they will resent.
     */
    function paintUndo() {
        const box = clear($("#undobar", root));
        const back = PRS.undo.peek(S);
        if (!back.ok) {
            box.appendChild(el("div", { class: "undo off" }, [
                el("span", { class: "undo-mark", text: "↶" }),
                el("i", { text: back.why }),
            ]));
            return;
        }
        box.appendChild(el("button", {
            class: "undo",
            title: "Backspace",
            onclick: doUndo,
            // Hovering it shows the tile you would be standing on again, which is usually the
            // whole reason somebody is reaching for it.
            onmouseenter: function () {
                planKey = "undo";
                plan = { danger: "good", tiles: [], focus: back.at,
                         cost: Math.abs(back.seconds) };
            },
            onmouseleave: clearPlan,
        }, [
            el("span", { class: "undo-mark", text: "↶" }),
            el("b", { text: back.label }),
            el("span", { class: "undo-back",
                         text: "+" + costLabel(Math.abs(back.seconds)) +
                               (back.count > 1 ? " · " + back.count + " actions" : "") }),
        ]));
    }

    function clearPlan() { planKey = null; plan = null; }

    function doUndo() {
        const done = PRS.undo.undo(S);
        if (!done) return;
        PRS.audio.play("back");
        walkAnim = null;
        clearPlan();
        clockShown = S.clock.remaining;
        PRS.render.fx.say(S.player.x, S.player.y, "+" + costLabel(Math.abs(done.seconds)),
                          "#5fd67a");
        PRS.render.fx.pulse(S.player.x, S.player.y, "#5fd67a");
        rebuildLog();
        paint();
    }

    /** After a rewind the log has been truncated, so its list is rebuilt from the state. */
    function rebuildLog() {
        const box = root && $("#log", root);
        if (!box) return;
        clear(box);
        for (const entry of S.log.slice(-220)) pushLog(entry);
    }

    function meter(label, value, max, cls, note) {
        const pct = Math.round(clamp01(value / max) * 100);
        // A number that has just moved says so for a moment. Four of these change constantly and
        // none of them is worth watching; the point is to catch the one that changed.
        const was = lastMeters[label];
        lastMeters[label] = value;
        const moved = was === undefined || Math.abs(was - value) < 0.5 ? ""
                    : value > was ? " up" : " down";
        return el("div", { class: "meter " + (cls || "") + moved }, [
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
            PRS.atlas.icon("pax", 2, PRS.render.paletteOf(S.character)),
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
                const name = s.item.sprite.split(":")[1];
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
            for (const p of here) row.appendChild(paxChip(p));
            box.appendChild(row);
        }
    }

    /** One person, small, with their face on it. Used under the cabin and inside the tooltip. */
    function paxChip(p) {
        const cond = PRS.pax.condition(p);
        return el("span", {
            class: "chip chip-t" + cond.tier + (litPax === p.id ? " lit" : ""),
            title: p.name + " · " + p.seat + " · " + p.kg + "kg · " +
                   PRS.pax.displayState(p) + " · " + cond.label,
            dataset: { pax: p.id },
            onmouseenter: () => { litPax = p.id; relight(); },
            onmouseleave: () => { litPax = null; relight(); },
        }, [
            PRS.atlas.icon(PRS.render.faceOf(p), 1, PRS.render.paletteOf(p)),
            el("b", { text: p.name.split(" ")[0] }),
            el("i", { text: p.seat }),
        ]);
    }

    // ------------------------------------------------------------------------- the tooltip ---

    /**
     * Who that is. Sixty people at thirty-six pixels each is a crowd, and until now the only way
     * to find out that the small one in 13F is a one-year-old was to stand next to him.
     */
    function onCabinMove(e) {
        hover = PRS.render.tileAt(canvas, scale, e.clientX, e.clientY);
        const was = litPax;
        const people = hover ? st.paxAt(S, hover.x, hover.y) : [];
        litPax = people.length ? people[0].id : null;
        if (litPax !== was) relight();
        showTip(e, hover, people);
    }

    let tipKey = null;

    function showTip(e, tile, people) {
        const tip = root && $("#tip", root);
        if (!tip || !tile) { tipKey = null; return hideTip(); }
        const wrap = $("#canvaswrap", root).getBoundingClientRect();
        // A mousemove is sixty events a second and the panel only changes when the tile does.
        const key = tile.x + "," + tile.y + ":" + people.map((p) => p.id + p.state).join();
        if (key !== tipKey) { tipKey = key; buildTip(tip, tile, people); }

        const w = tip.offsetWidth, h = tip.offsetHeight;
        let x = e.clientX - wrap.left + 16;
        let y = e.clientY - wrap.top + 16;
        if (x + w > wrap.width - 6) x = e.clientX - wrap.left - w - 14;
        if (y + h > wrap.height - 6) y = Math.max(4, e.clientY - wrap.top - h - 14);
        tip.style.left = Math.max(4, x) + "px";
        tip.style.top = Math.max(4, y) + "px";
        tip.classList.add("on");
    }

    function buildTip(tip, tile, people) {
        clear(tip);
        const i = cabin.idx(tile.x, tile.y);
        const inten = S.fire.intensity[i], smoke = S.fire.smoke[i];
        tip.appendChild(el("div", { class: "tip-place", text: cabin.placeName(tile.x, tile.y) }));
        if (inten > 0.5 || smoke > 6) {
            const bits = [];
            if (inten > 0.5) bits.push(PRS.fire.describe(S.fire, tile.x, tile.y));
            if (smoke > 6) bits.push(PRS.fire.describeSmoke(smoke));
            tip.appendChild(el("div", { class: "tip-air", text: bits.join(" · ") }));
        }
        for (const p of people) {
            const cond = PRS.pax.condition(p);
            tip.appendChild(el("div", { class: "tip-who" }, [
                PRS.atlas.icon(PRS.render.faceOf(p), 2, PRS.render.paletteOf(p)),
                el("div", {}, [
                    el("b", { text: p.name }),
                    el("i", { text: p.seat + " · " + p.kg + "kg · " +
                                    PRS.pax.displayState(p) + " · " + cond.label }),
                    p.traits.length ? el("u", { text: p.traits.join(", ") }) : null,
                    p.helper ? el("em", { text: "working with you" }) : null,
                ]),
            ]));
        }
        // What you could do about it, from where you are standing, with the price of each.
        const mine = (lastEntries.length ? lastEntries : A.available(S))
            .filter((x) => x.ctx && ((x.ctx.p && people.some((p) => p.id === x.ctx.p.id)) ||
                                     (x.ctx.c && x.ctx.c.x === tile.x && x.ctx.c.y === tile.y)));
        if (mine.length) {
            const box = el("div", { class: "tip-acts" });
            for (const x of mine.slice(0, 5)) {
                box.appendChild(el("div", {}, [
                    el("span", { text: x.label }),
                    el("b", { text: costLabel(x.cost) }),
                ]));
            }
            if (mine.length > 5) {
                box.appendChild(el("div", { class: "tip-more",
                                            text: "…and " + (mine.length - 5) + " more" }));
            }
            tip.appendChild(box);
        } else if (people.length) {
            tip.appendChild(el("div", { class: "tip-more",
                                        text: "Out of reach. Click to walk over." }));
        }
    }

    function hideTip() {
        const tip = root && $("#tip", root);
        if (tip) tip.classList.remove("on");
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

    /**
     * The other half of pointing at somebody: every row in the list that could touch them.
     * A class on rows that already exist, because rebuilding a hundred and eighty of them on a
     * mousemove would make the aeroplane stutter every time the pointer crossed a seat.
     */
    function relight() {
        for (const row of $$(".act", root)) {
            row.classList.toggle("lit", !!litPax && row.dataset.pax === litPax);
        }
        for (const chip of $$(".chip", root)) {
            chip.classList.toggle("lit", !!litPax && chip.dataset.pax === litPax);
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
        // Lit, because the person it would happen to is under the pointer over on the aeroplane.
        const lit = litPax && e.ctx && e.ctx.p && e.ctx.p.id === litPax;
        return el("button", {
            class: "act act-" + e.danger + (over ? " over" : "") + (lit ? " lit" : ""),
            onclick: () => run(e),
            onmouseenter: () => setPlan(e),
            onmouseleave: () => { if (planKey === e.key) clearPlan(); },
            onfocus: () => setPlan(e),
            onblur: () => { if (planKey === e.key) clearPlan(); },
            dataset: { key: e.key, pax: (e.ctx && e.ctx.p && e.ctx.p.id) || "" },
        }, [
            el("span", { class: "act-key", text: n < 9 ? String(n + 1) : "" }),
            el("span", { class: "act-body" }, [
                el("b", { text: e.label }),
                e.detail ? el("i", { text: e.detail }) : null,
            ]),
            el("span", { class: "act-cost", text: over ? "over" : costLabel(e.cost) }),
        ]);
    }

    // -------------------------------------------------------------------------------- doing ---

    // One fallback cue per deck, so that every action in the game makes a noise of the right
    // kind. An action that plays its own sound keeps it; this is only for the ones that do not,
    // and there are a hundred and fifty of those.
    const DECK_CUE = { move: "step", fire: "effort", people: "grab", crew: "talk",
                       cabin: "latch", self: "breath", items: "rummage" };

    function cueFor(e) {
        if (e.tags.indexOf("social") >= 0) return "talk";
        if (e.tags.indexOf("carry") >= 0) return "grab";
        return DECK_CUE[e.deck] || "click";
    }

    /**
     * Do it, and then say what happened where it happened.
     *
     * The log gets the sentence. The cabin gets the price, floating off the tile it was paid on,
     * a ring around the thing it landed on, and - if the aeroplane got meaningfully worse or
     * better in that moment - a colour over the whole picture and a shove. Everything here is
     * measured before and after rather than reported by the action, so all hundred and
     * eighty-nine of them get it without knowing about it.
     */
    function run(entry) {
        if (S.clock.landed) return;
        PRS.audio.unlock();
        const fx = PRS.render.fx;
        const focus = planFor(entry).focus;
        const before = {
            secured: st.securedCount(S), helpers: st.helperCount(S),
            burns: S.player.burns, dose: S.player.smokeDose,
            fire: PRS.fire.worst(S.fire), cred: S.credibility,
            sounds: PRS.audio.count(),
        };
        clearPlan();

        const res = A.perform(S, entry);

        // Whatever the action did not say for itself.
        if (PRS.audio.count() === before.sounds) PRS.audio.play(cueFor(entry));

        const cost = res ? res.cost : 0;
        if (cost > 0) {
            fx.say(focus.x, focus.y, "−" + costLabel(cost),
                   res.kind === "bad" ? "#e5897c" : "#ffd54a");
            spentTag(cost);
        }
        fx.pulse(focus.x, focus.y,
                 res && res.kind === "bad" ? "#d4483a"
                 : res && (res.kind === "good" || res.kind === "great") ? "#5fd67a" : "#ffd54a");

        const gained = st.securedCount(S) - before.secured;
        if (gained > 0) {
            fx.say(S.player.x, S.player.y, "+" + gained + " ACCOUNTED FOR", "#8ae8a0",
                   { ms: 1900, rise: 22, size: 0.32 });
            fx.flash("#5fd67a", 0.1);
        }
        if (st.helperCount(S) > before.helpers) {
            fx.say(focus.x, focus.y, "HELPING", "#5fd67a", { ms: 1800, rise: 20, size: 0.3 });
        }
        if (S.player.burns > before.burns + 0.6) {
            fx.flash("#d4483a", 0.22);
            fx.shake(2);
        }
        if (S.player.smokeDose > before.dose + 4) fx.flash("#6b6055", 0.16);
        // The fire getting away from you is the one thing on this aeroplane that shoves back.
        const grew = PRS.fire.worst(S.fire) - before.fire;
        if (grew > 6) { fx.shake(3); fx.flash("#ff7a10", 0.14); }
        if (S.credibility > before.cred + 4) {
            fx.say(S.player.x, S.player.y, "BELIEVED", "#ffd54a", { ms: 1500, rise: 18, size: 0.3 });
        }

        if (S.clock.landed) {
            paint();
            setTimeout(() => PRS.screens.report(S), 900);
            return;
        }
        paint();
    }

    /** The price, once more, next to the clock, because that is the number it came out of. */
    function spentTag(cost) {
        const box = root && $("#clockplan", root);
        if (!box) return;
        clear(box);
        box.appendChild(el("span", { class: "spent", text: "−" + costLabel(cost) }));
        clearTimeout(spentTag.timer);
        spentTag.timer = setTimeout(() => { if (box.isConnected) clear(box); }, 1100);
    }

    /**
     * Clicking the cabin. If somebody on that tile is already in reach, pick them up; otherwise
     * walk there. Twenty-three per cent of every action list used to be the words "go to"; it is
     * a picture of an aeroplane and you should be able to point at it.
     */
    function clickTile(t) {
        const entries = lastEntries.length ? lastEntries : A.available(S);
        for (const p of st.paxAt(S, t.x, t.y)) {
            const carry = entries.filter((e) => e.id === "people.carry" && e.ctx &&
                                                e.ctx.p && e.ctx.p.id === p.id)[0];
            if (carry) return run(carry);
        }
        walkTo(t);
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
            walkTo({ x: S.player.x + d[0], y: S.player.y + d[1] });
            ev.preventDefault();
            return;
        }
        if (ev.key === "Backspace" || ev.key === "z" || ev.key === "Z") {
            doUndo();
            ev.preventDefault();
            return;
        }
        if (ev.key === "m" || ev.key === "M") { toggleSound(); return; }
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
        const line = el("div", { class: "log-line log-" + entry.kind + " fresh" }, [
            el("span", { class: "log-t", text: entry.clock }),
            el("span", { class: "log-x", text: entry.text }),
        ]);
        box.appendChild(line);
        while (box.children.length > 220) box.removeChild(box.firstChild);
        box.scrollTop = box.scrollHeight;
    }

    PRS.play = { build, destroy, paint };
})(window);
