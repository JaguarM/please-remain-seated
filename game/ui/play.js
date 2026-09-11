// The screen you spend fifteen minutes on: the cabin, the clock, the log, your bag, and a card
// for whatever you last clicked.
//
// There used to be a list here of everything you could do, forty rows long, and the list was the
// game. Then there were three suggestions and the list folded under them. Now there is neither.
// The aeroplane is the game, and there are three things on it you can click: a person, the fire,
// and yourself. A card opens on whichever one you clicked with the handful of things you could
// do about it, priced in seconds. Everything else on the picture is floor, and clicking floor
// walks you there. Out of reach is not a dead click either - the card says how far the walk is
// and what you could do once you got there, and one click on any of those does both.
//
// Pointing costs nothing. Whatever is under the pointer lights up - the person round their
// body, the fire round its tile, the floor with the price of walking to it - so you can see what
// a click would be before it is one.
//
// What an action costs is not taken all at once. The engine hands this screen the seconds in
// twelve-second sub-steps and they are played out over a few hundred milliseconds: the clock runs
// down, the fire grows, people move, and the aeroplane takes no instructions until they have all
// gone by. Then it is your turn again - and the tiles you walked over are still marked behind
// you, because stepping back onto one of them is how you take a walk back.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el, $, $$, clear, mmss, costLabel, clamp01, store } = PRS.util;
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const H = PRS.hotspots;

    let S = null;
    let root = null;
    let canvas = null, ctx = null, scale = 2;
    let hover = null;             // the tile the mouse is over, and where in it
    let target = null;            // what a click there would open, from hotspots.js
    let raf = 0;
    let lastEntries = [];         // everything possible right now
    let lastAll = [];             // ...and including the walks, which the cabin handles
    let busy = null;              // the action whose seconds are going by on the screen
    let trail = [];               // the tiles you have just walked from, and can walk back to
    let plan = null;              // what the row under the pointer would do, drawn on the cabin
    let planKey = null;
    let clockShown = 0;           // the number on the clock, which chases the real one
    let clockMinute = null;       // and the minute it was last showing, for the tick
    let clockClass = null;
    let lastMeters = {};
    let selected = null;          // the thing the card is open on
    let cardMore = false;         // whether the card's "more" is unfolded
    let cardAnchor = null;        // where the card hangs from when it was opened from a button
    let tipKey = null;

    /**
     * How long an action's seconds take to go by on the screen: long enough that forty seconds
     * spent is visibly more than five, short enough that a hundred actions are not a film.
     * Anything past the action's own seconds - the rest of the flight, once you have gone down -
     * runs much faster, because none of it is a decision any more.
     */
    const PACE = { perSecond: 28, least: 140, most: 900, after: 0.45 };

    function paceMs(seconds) {
        return Math.max(PACE.least, Math.min(PACE.most, seconds * PACE.perSecond));
    }

    // What a thing in your bag is called under a forty-eight pixel icon.
    const SHORT = {
        water_big: "water", wet_towel: "towel", blanket: "blanket", gloves: "gloves",
        hood: "hood", goggles: "goggles", multitool: "multi-tool", tape: "tape",
        binbag: "bin liners", first_aid: "first aid", inhaler: "inhaler", strap: "strap",
        hivis: "hi-vis", phone: "phone", halon_bottle: "halon", water_ext: "extinguisher",
    };

    function build(container, state) {
        S = state;
        root = clear(container);
        root.className = "screen play";
        clockShown = S.clock.remaining;
        clockMinute = null;
        clockClass = null;
        lastMeters = {};
        selected = null; cardMore = false; cardAnchor = null;
        hover = null; target = null;
        busy = null; trail = [];
        PRS.render.fx.clear();
        PRS.render.motion.reset();

        const bar = el("div", { class: "hud" }, [
            el("div", { class: "hud-clock" }, [
                el("div", { class: "clock-label", text: "TO TOUCHDOWN" }),
                el("div", { class: "clock", id: "clock", text: mmss(S.clock.remaining) }),
                el("div", { class: "clock-plan", id: "clockplan" }),
                el("div", { class: "undo-bar", id: "undobar" }),
                el("div", { class: "hud-buttons" }, [
                    el("button", { class: "sound", id: "sound", title: "Sound (M)",
                                   onclick: toggleSound }),
                    el("button", { class: "sound", title: "How to play (?)", text: "HOW TO PLAY",
                                   onclick: showHelp }),
                ]),
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
        const logwrap = el("div", { class: "logwrap" }, [
            el("div", { class: "log", id: "log" }),
        ]);

        root.appendChild(bar);
        root.appendChild(el("div", { class: "board" }, [left, logwrap]));
        root.appendChild(el("div", { class: "card", id: "card" }));

        ctx = canvas.getContext("2d");
        scale = PRS.render.fit(canvas);

        canvas.addEventListener("mousemove", onCabinMove);
        canvas.addEventListener("mouseleave", function () {
            hover = null; target = null; hideTip();
        });
        canvas.addEventListener("click", function (e) {
            const t = PRS.render.tileAt(canvas, scale, e.clientX, e.clientY);
            if (t) clickTile(t);
        });
        window.addEventListener("resize", onResize);
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onPress);

        S.onLog = pushLog;
        for (const entry of S.log) pushLog(entry);

        st.log(S, S.character.open, "open");
        st.log(S, "Transnational 447, thirty-one thousand feet, beginning the descent. " +
                  "Sixty-one souls. There is something burning in the locker above " +
                  cabin.ORIGIN.row + cabin.ORIGIN.letter + " and you are the only person on this " +
                  "aeroplane who has noticed.", "open");
        st.log(S, "The clock only moves when you do. Every action costs seconds. " +
                  "You cannot put this fire out.", "rule");
        st.log(S, "Click a person, the fire, or yourself to see what you can do. " +
                  "Click anywhere else to walk there, and back onto your own trail to take a " +
                  "walk back.", "rule");

        paintSound();
        paint();
        loop();
        if (!store.get("seenHelp", false)) showHelp();
    }

    function showHelp() { PRS.screens.help(root, S.character); }

    /**
     * Every action in the game makes a noise now, so there has to be a way to stop it. The
     * setting outlives the flight; nothing else on this screen does.
     */
    function toggleSound() {
        PRS.audio.unlock();
        PRS.audio.setEnabled(!PRS.audio.isEnabled());
        store.set("sound", PRS.audio.isEnabled());
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
        // An action whose seconds were still going by is finished here rather than abandoned, so
        // the world is never left half way through one.
        if (busy && busy.passage) { while (busy.passage.step()) { /* the rest of them */ } }
        busy = null;
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("mousedown", onPress);
        window.removeEventListener("resize", onResize);
        if (S) S.onLog = null;
    }

    function onResize() {
        if (!canvas || !canvas.isConnected) return;
        scale = PRS.render.fit(canvas);
        placeCard();
    }

    // -------------------------------------------------------------------------------- loop ---

    function loop() {
        raf = requestAnimationFrame(loop);
        if (!canvas || !canvas.isConnected) return;
        const now = performance.now();
        if (busy) playOut(now);
        tickClock(now);
        PRS.render.draw(ctx, S, {
            scale: scale, time: now,
            // While the seconds are going by, nothing under the pointer is a click, so nothing
            // under the pointer is lit.
            hover: busy ? null : hover,
            target: busy ? null : target,
            hoverRoute: plan || busy ? null : hoverRoute(),
            plan: busy ? null : plan,
            selected: selectedMark(),
            trail: trail,
            showReach: !busy,
        });
    }

    /** Where the brackets go for the thing the card is open on: round a body, or round a tile. */
    function selectedMark() {
        if (!selected) return null;
        const mark = { x: selected.x, y: selected.y, box: null };
        if (selected.kind !== "fire") {
            const fig = PRS.render.figures(S, selected.x, selected.y)
                .filter((g) => g.id === (selected.kind === "you" ? "you" : selected.id))[0];
            if (fig) mark.box = fig.box;
        }
        return mark;
    }

    /**
     * The clock chases the number rather than jumping to it. Fifteen seconds spent has to look
     * like fifteen seconds spent, and a digit that changes by itself is the only thing on this
     * screen that moves without being asked.
     *
     * While an action's seconds are going by it does not chase at all: it is exactly as far
     * through them as the cabin is. The engine takes the whole cost up front, so what the clock
     * shows is what has actually been played, and it stops the moment the aeroplane does.
     */
    function tickClock(now) {
        const p = busy && busy.passage;
        if (p) {
            clockShown = S.clock.remaining + p.owed() + Math.max(0, p.done - due(busy, now));
        } else {
            const target = S.clock.remaining;
            if (Math.abs(clockShown - target) < 0.4) clockShown = target;
            else clockShown += (target - clockShown) * 0.16;
        }
        const was = clockMinute;
        clockMinute = Math.floor(clockShown / 60);
        if (was !== null && clockMinute < was) PRS.audio.play("tick");
        const node = root && $("#clock", root);
        if (!node) return;
        node.textContent = mmss(clockShown);
        const cls = "clock" + (clockShown < 120 ? " urgent" : clockShown < 300 ? " warn" : "");
        if (cls !== clockClass) { clockClass = cls; node.className = cls; }
    }

    // ------------------------------------------------------------------- the seconds going by ---

    /**
     * Play as much of the action's seconds as is due by now. One sub-step is twelve seconds of
     * cabin, so a long action arrives in several jumps and everybody drawn chases each one; the
     * aeroplane comes back to the player once the last of them has been on the screen.
     */
    function playOut(now) {
        const b = busy;
        const p = b.passage;
        if (p && !p.finished) {
            let moved = false;
            try {
                const owed = due(b, now);
                while (!p.finished && p.done <= owed) moved = p.step() || moved;
            } catch (err) {
                // A sub-step should never throw; if one does, the player still gets their turn
                // back rather than a frozen aeroplane.
                console.error("the clock stopped", err);
                b.passage = null;
            }
            if (moved) paintLive();
        }
        if ((!b.passage || b.passage.finished) && now - b.start >= b.ms) endAction();
    }

    /** How many of the passage's seconds should have gone by by now. */
    function due(b, now) {
        const t = now - b.start;
        if (t < b.ms) return b.passage.seconds * t / b.ms;
        return b.passage.seconds + (t - b.ms) * PACE.after;
    }

    /** They have all gone by: say what they did, and give the player the aeroplane back. */
    function endAction() {
        const b = busy;
        busy = null;
        root.classList.remove("busy");
        // Anything priced while the seconds were going by was priced on a cabin half way through
        // them. The route field is cheap to rebuild and wrong to keep.
        S._field = null;
        S._fieldStamp = null;
        tell(b.before, measure(), b.focus, b.said);

        if (S.clock.landed) {
            closeCard();
            paint();
            setTimeout(() => PRS.screens.report(S), 900);
            return;
        }
        paint();
        if (b.then) b.then();
    }

    /** The numbers the cabin says out loud when they move. */
    function measure() {
        return { moved: st.movedCount(S), helpers: st.helperCount(S),
                 burns: S.player.burns, dose: S.player.smokeDose,
                 fire: PRS.fire.worst(S.fire), cred: S.credibility };
    }

    /**
     * What changed, said on the aeroplane rather than only in the log, and said in the place it
     * happened. Every action says it twice: once for what the doing did, and again when its
     * seconds have gone by, for whatever they did that has not been said yet.
     */
    function tell(before, now, focus, said) {
        const fx = PRS.render.fx;
        said = said || { moved: before.moved, helpers: before.helpers };
        const gained = now.moved - said.moved;
        if (gained > 0) {
            fx.say(S.player.x, S.player.y, "+" + gained + " MOVED", "#8ae8a0",
                   { ms: 1900, rise: 22, size: 0.32 });
            fx.flash("#5fd67a", 0.1);
        }
        if (now.helpers > said.helpers) {
            fx.say(focus.x, focus.y, "HELPING", "#5fd67a", { ms: 1800, rise: 20, size: 0.3 });
        }
        if (!said.burns && now.burns > before.burns + 0.6) {
            fx.flash("#d4483a", 0.22);
            fx.shake(2);
            said.burns = true;
        }
        if (!said.dose && now.dose > before.dose + 4) {
            fx.flash("#6b6055", 0.16);
            said.dose = true;
        }
        if (!said.fire && now.fire - before.fire > 6) {
            fx.shake(3);
            fx.flash("#ff7a10", 0.14);
            said.fire = true;
        }
        if (!said.cred && now.cred > before.cred + 4) {
            fx.say(S.player.x, S.player.y, "BELIEVED", "#ffd54a", { ms: 1500, rise: 18, size: 0.3 });
            said.cred = true;
        }
        said.moved = now.moved;
        said.helpers = now.helpers;
        return said;
    }

    /** The route the mouse is proposing, for the dotted line and the price on the tile. */
    function hoverRoute() {
        if (!hover || S.clock.landed) return null;
        if (target && target.kind !== "walk") return null;
        if (hover.x === S.player.x && hover.y === S.player.y) return null;
        // A tile you have just walked from is not a walk, it is a walk taken back, and it gives
        // seconds instead of costing them.
        const stop = trailStop(hover);
        if (stop) {
            const path = wayBack(stop.index);
            if (path) return { path: path, cost: stop.seconds, back: true };
        }
        const r = A.route(S, hover.x, hover.y);
        if (!r) return null;
        return { path: r.path.map((i) => [cabin.xOf(i), cabin.yOf(i)]),
                 cost: Math.max(1, Math.round(r.cost)),
                 name: cabin.placeName(hover.x, hover.y) };
    }

    // ------------------------------------------------------------------------------ walking ---

    /** Walk to a tile, and do something on arrival. This is what the cabin is for. */
    function walkTo(t, then) {
        const hit = lastAll.filter(
            (e) => e.id === "move.walk" && e.ctx.x === t.x && e.ctx.y === t.y)[0];
        if (!hit) return false;
        run(hit, then);
        return true;
    }

    /** The most recent place on the trail at a tile, if there is one. */
    function trailStop(t) {
        for (const s of PRS.undo.trail(S)) if (s.x === t.x && s.y === t.y) return s;
        return null;
    }

    /** The tiles from where you are standing back to where the walk at `index` set off from. */
    function wayBack(index) {
        const out = [];
        for (const s of PRS.undo.trail(S)) {
            for (let i = s.path.length - 2; i >= 0; i--) {
                out.push([cabin.xOf(s.path[i]), cabin.yOf(s.path[i])]);
            }
            out.push([s.x, s.y]);
            if (s.index === index) return out;
        }
        return null;
    }

    /**
     * A step back onto a tile you have just walked from is not a walk. It is the walks since,
     * undone: the seconds come back and so does the cabin, which is what going back the way you
     * came ought to mean in a game where you can change your mind and not your luck.
     */
    function walkBack(t) {
        const stop = trailStop(t);
        if (!stop) return false;
        doUndo(stop.index);
        return true;
    }

    /**
     * A click on the floor. If the tile itself cannot be stood on - the trolley, the far side
     * of the trolley - the walk goes to the nearest tile beside it that can, because a click
     * next to a thing is a click on the thing.
     */
    function walkClick(t) {
        if (walkBack(t)) return;
        if (walkTo(t, arrival(t))) return;
        let best = null;
        for (const [nx, ny] of cabin.neighbours(t.x, t.y)) {
            const r = A.route(S, nx, ny);
            if (r && (!best || r.cost < best.cost)) best = { x: nx, y: ny, cost: r.cost };
        }
        if (best) walkTo(best, arrival(best));
    }

    /**
     * If the walk ends somewhere with things in it - the lavatory, a galley, beside the trolley -
     * your card opens by itself, since the click was plainly about what is there. It opens when
     * you arrive, which is when you are there to use it.
     */
    function arrival(dest) {
        return function () {
            if (S.clock.landed) return;
            const kind = cabin.kindAt(dest.x, dest.y);
            const byTrolley = S.cabinFlags.cartOut && dest.y === cabin.AISLE_Y &&
                              Math.abs(dest.x - S.cabinFlags.cartX) <= 1;
            if (kind === "lav" || kind === "galley" || byTrolley) {
                openThing(H.youThing(S), tileRect(S.player.x, S.player.y));
            }
        };
    }

    // -------------------------------------------------------------------- planning an action ---

    /**
     * Where an action would land. Every deck builds its targets the same way - `p` is a person,
     * `c` is a member of crew, `h` and `t` are a helper and who you would point them at, `x`/`y`
     * is a tile and `r` is a route - so one reader covers all of them.
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
        // A carry is drawn with the bit of floor a helper would put them down on.
        if (e.tags.indexOf("carry") >= 0) {
            const r = PRS.pax.refuge(S, S.player.x);
            if (r && r.x !== S.player.x) out.tiles.push([r.x, r.y]);
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

    function setPlan(entry, path) {
        const key = entry ? entry.key : null;
        if (key === planKey) return;
        planKey = key;
        plan = entry ? planFor(entry) : null;
        if (plan && path) plan.path = path;
        if (entry) PRS.audio.play("blip");
    }

    function setWalkPlan(w) {
        if (planKey === "walk") return;
        planKey = "walk";
        plan = { danger: "neutral", cost: w.cost, tiles: [], focus: { x: w.x, y: w.y }, path: w.path };
    }

    function clearPlan() { planKey = null; plan = null; }

    // -------------------------------------------------------------------------------- paint ---

    function paint() {
        if (!root || !root.isConnected || busy) return;
        tipKey = null;      // the panel prints the air on a tile, and the air has just moved
        lastEntries = A.available(S);
        lastAll = A.available(S, true);
        trail = PRS.undo.trail(S);
        if (hover) target = H.targetAt(S, hover.x, hover.y, hover.fx, hover.fy);
        paintMeters();
        paintYou();
        paintHere();
        paintUndo();
        paintCard();
    }

    /** The parts of the screen that move while an action's seconds are going by. */
    function paintLive() {
        if (!root || !root.isConnected) return;
        paintMeters();
        paintYou();
    }

    /**
     * The undo button, by the clock, because the clock is where the seconds come back to. It
     * always says what it would undo and what it would give back, or why it will not, because a
     * rule the player cannot see is a rule they will resent.
     */
    function paintUndo() {
        const box = clear($("#undobar", root));
        const back = PRS.undo.peek(S);
        if (!back.ok) {
            box.appendChild(el("div", { class: "undo off", title: back.why }, [
                el("span", { class: "undo-mark", text: "↶" }),
                el("i", { text: back.why }),
            ]));
            return;
        }
        box.appendChild(el("button", {
            class: "undo",
            title: "Backspace · " + back.label,
            onclick: function () { doUndo(); },
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
                               (back.count > 1 ? " · " + back.count : "") }),
        ]));
    }

    /** Take it back: the last thing you did, or everything back to a tile on the trail. */
    function doUndo(index) {
        if (busy) return;
        const plan = PRS.undo.peek(S, index);
        if (!plan.ok) return;
        const from = [S.player.x, S.player.y];
        const path = plan.walks ? wayBack(plan.index) : null;
        const done = PRS.undo.undo(S, plan.index);
        if (!done) return;
        PRS.audio.play("back");
        clearPlan();
        // You go back the way you came. Anybody else the rewind moved finds their own way back.
        if (path && path.length) {
            PRS.render.motion.follow("you", [from].concat(path),
                                     Math.min(420, 60 + path.length * 45));
        }
        // The clock jumps back rather than chasing, and the ticker will not redraw a number it
        // thinks it has already shown, so it is written here.
        clockShown = S.clock.remaining;
        clockMinute = Math.floor(clockShown / 60);
        const clockNode = root && $("#clock", root);
        if (clockNode) clockNode.textContent = mmss(clockShown);
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
        // Not the score. The score is who is alive when the doors open, and nobody knows that
        // yet; this is how many people are off their seats and on the floor because of you.
        box.appendChild(meter("OUT OF THEIR SEATS", st.movedCount(S), 60, "m-good",
                              st.movedCount(S) + " / 60"));
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

    /**
     * You, and what is on you. Your name is a button and so is every thing in the bag, and they
     * all open the same card - yours - because the bag is part of you: the hood goes on from
     * here, and the card says where the bottle would be worth carrying.
     */
    function paintYou() {
        const box = clear($("#youbox", root));
        const P = S.player;
        box.appendChild(el("button", {
            class: "you-name opens", title: "What you can do here, and to yourself",
            onclick: (ev) => openThing(H.youThing(S), ev.currentTarget.getBoundingClientRect(), true),
        }, [
            PRS.atlas.icon("pax", 2, PRS.render.paletteOf(S.character)),
            el("div", {}, [
                el("b", { text: S.character.name }),
                el("i", { text: S.character.title + (S.luck === "perfect" ? " · perfect luck" : "") }),
            ]),
        ]));
        box.appendChild(meter("YOUR LUNGS", 100 - P.smokeDose, 100, "m-lungs",
                              P.smokeDose > 70 ? "failing" : P.smokeDose > 40 ? "bad"
                              : P.smokeDose > 15 ? "coughing" : "fine"));
        box.appendChild(meter("YOUR PANIC", P.panic, 100, "m-panic"));
        box.appendChild(meter("BURNS", P.burns, 100, "m-burn",
                              P.burns > 40 ? "severe" : P.burns > 15 ? "bad"
                              : P.burns > 3 ? "sore" : "none"));
        // Whoever is in your arms, as a button, because putting them down is on their card.
        const held = P.carrying.map((id) => [id, "CARRYING"])
            .concat(P.dragging ? [[P.dragging, "DRAGGING"]] : []);
        for (const [id, tag] of held) {
            const p = st.paxById(S, id);
            if (!p) continue;
            box.appendChild(el("button", {
                class: "carrying opens", title: "What you can do with " + p.name,
                onclick: (ev) => openThing(H.personThing(p),
                                           ev.currentTarget.getBoundingClientRect(), true),
            }, [
                el("span", { class: "tag", text: tag }),
                el("b", { text: p.name }),
            ]));
        }
        box.appendChild(paintBag());
    }

    function paintBag() {
        const wrap = el("div", { class: "bagbar" });
        wrap.appendChild(el("div", { class: "bag-head" }, [
            el("b", { text: "YOUR BAG" }),
            el("i", { text: "used from your card" }),
        ]));
        const row = el("div", { class: "bag-items" });
        // An empty bottle stays, because it refills; an empty air horn does not.
        const shown = S.inventory.filter((s) => !s.spent || s.item.refill);
        if (!shown.length) {
            row.appendChild(el("div", { class: "bag-empty", text:
                "Nothing on you. Everything else is in the aeroplane, and in other people's laps." }));
        }
        for (const s of shown) {
            const item = s.item;
            const empty = s.spent || (s.uses !== null && s.uses <= 0);
            const worn = st.wearing(S, s.id);
            const status = empty ? "empty" : s.wet ? "wet" : worn ? "on"
                         : s.uses === null ? "" : s.uses + " left";
            row.appendChild(el("button", {
                class: "bag-item opens" + (empty ? " empty" : "") +
                       (s.wet ? " wet" : "") + (worn ? " worn" : ""),
                title: item.name + (status ? " — " + status : "") + " · click for what it can do",
                dataset: { item: s.id },
                onclick: (ev) => openThing(H.youThing(S),
                                           ev.currentTarget.getBoundingClientRect(), true),
            }, [
                PRS.atlas.icon(H.itemSprite(s), 3),
                el("b", { text: SHORT[s.id] || PRS.loot.short(item.name) }),
                el("i", { text: status }),
            ]));
        }
        wrap.appendChild(row);
        return wrap;
    }

    /** One line under the aeroplane: where you are, what the air is like, and the whole manual. */
    function paintHere() {
        const box = clear($("#here", root));
        const P = S.player;
        const i = cabin.idx(P.x, P.y);
        const bits = [cabin.placeName(P.x, P.y)];
        const inten = S.fire.intensity[i], smoke = S.fire.smoke[i];
        if (inten > 0.5) bits.push("fire: " + PRS.fire.describe(S.fire, P.x, P.y));
        if (smoke > 6) bits.push("smoke: " + PRS.fire.describeSmoke(smoke));
        box.appendChild(el("span", { class: "here-place", text: "You are at " + bits.join(" · ") }));
        box.appendChild(el("span", { class: "here-hint", text: S.clock.landed ? "It has landed."
            : "Click a person, the fire, or yourself. Anywhere else is a walk." }));
    }

    // ------------------------------------------------------------------------- the tooltip ---

    function onCabinMove(e) {
        hover = PRS.render.tileAt(canvas, scale, e.clientX, e.clientY);
        target = hover ? H.targetAt(S, hover.x, hover.y, hover.fx, hover.fy) : null;
        const clickable = !busy && target && (target.kind !== "none");
        canvas.style.cursor = clickable ? "pointer" : "default";
        if (busy) { hideTip(); return; }
        showTip(e, hover, target);
    }

    function showTip(e, tile, tg) {
        const tip = root && $("#tip", root);
        if (!tip || !tile || !tg || tg.kind === "none") { tipKey = null; return hideTip(); }
        const wrap = $("#canvaswrap", root).getBoundingClientRect();
        const who = tg.thing ? tg.thing.key + (tg.thing.id ? ":" + stateOf(tg.thing) : "") : "";
        const key = tile.x + "," + tile.y + ":" + tg.kind + ":" + who;
        if (key !== tipKey) { tipKey = key; buildTip(tip, tile, tg); }

        const w = tip.offsetWidth, h = tip.offsetHeight;
        let x = e.clientX - wrap.left + 16;
        let y = e.clientY - wrap.top + 16;
        if (x + w > wrap.width - 6) x = e.clientX - wrap.left - w - 14;
        if (y + h > wrap.height - 6) y = Math.max(4, e.clientY - wrap.top - h - 14);
        tip.style.left = Math.max(4, x) + "px";
        tip.style.top = Math.max(4, y) + "px";
        tip.classList.add("on");
    }

    function stateOf(thing) {
        if (thing.kind === "person") { const p = st.paxById(S, thing.id); return p ? p.state : ""; }
        return "";
    }

    /** Who or what that is, and what a click on it would be. Never a list of things to do. */
    function buildTip(tip, tile, tg) {
        clear(tip);
        const i = cabin.idx(tile.x, tile.y);
        const inten = S.fire.intensity[i], smoke = S.fire.smoke[i];
        const air = [];
        if (inten > 0.5) air.push(PRS.fire.describe(S.fire, tile.x, tile.y));
        if (smoke > 6) air.push("smoke " + PRS.fire.describeSmoke(smoke));

        if (tg.kind === "person" || tg.kind === "crew") {
            const p = tg.kind === "person" ? st.paxById(S, tg.thing.id) : PRS.crew.byId(S, tg.thing.id);
            if (!p) return;
            const cond = tg.kind === "person" ? PRS.pax.condition(p) : null;
            tip.appendChild(el("div", { class: "tip-who" }, [
                PRS.atlas.icon(tg.kind === "person" ? PRS.render.faceOf(p) : (p.sprite || "crew"),
                               2, PRS.render.paletteOf(p)),
                el("div", {}, [
                    el("b", { text: p.name }),
                    el("i", { text: tg.kind === "person"
                        ? p.seat + " · " + p.kg + "kg · " + PRS.pax.displayState(p) + " · " + cond.label
                        : p.role }),
                    p.traits && p.traits.length ? el("u", { text: p.traits.join(", ") }) : null,
                    p.helper ? el("em", { text: "working with you" }) : null,
                ]),
            ]));
            if (air.length) tip.appendChild(el("div", { class: "tip-air", text: air.join(" · ") }));
        } else if (tg.kind === "you") {
            tip.appendChild(el("div", { class: "tip-place", text: "You, at " + cabin.placeName(tile.x, tile.y) }));
            if (air.length) tip.appendChild(el("div", { class: "tip-air", text: air.join(" · ") }));
        } else if (tg.kind === "fire") {
            tip.appendChild(el("div", { class: "tip-place", text: "The fire · " + cabin.placeName(tile.x, tile.y) }));
            tip.appendChild(el("div", { class: "tip-air", text: air.join(" · ") }));
        } else {
            tip.appendChild(el("div", { class: "tip-place", text: cabin.placeName(tile.x, tile.y) }));
            if (air.length) tip.appendChild(el("div", { class: "tip-air", text: air.join(" · ") }));
        }
        const hint = tipHint(tile, tg);
        if (hint) tip.appendChild(el("div", { class: "tip-hint", text: hint }));
    }

    /** What a click here would do. The answer is always "something", which is the point. */
    function tipHint(tile, tg) {
        if (S.clock.landed) return null;
        if (tg.kind === "person" || tg.kind === "crew") {
            return "Click for what you can do with " + tg.thing.short;
        }
        if (tg.kind === "fire") return "Click the fire for what you can do about it";
        if (tg.kind === "you") return "Click yourself for what you can do here";
        if (tg.kind === "walk") {
            if (tile.x === S.player.x && tile.y === S.player.y) return null;
            const stop = trailStop(tile);
            if (stop) {
                return "You walked from here. Click to take that back · +" +
                       costLabel(stop.seconds);
            }
            const r = A.route(S, tile.x, tile.y);
            if (r) return "Click to walk here · " + costLabel(Math.max(1, Math.round(r.cost)));
            return "You cannot stand there. A click walks you to the nearest tile you can.";
        }
        return null;
    }

    function hideTip() {
        const tip = root && $("#tip", root);
        if (tip) tip.classList.remove("on");
    }

    // --------------------------------------------------------------------------- the card ---

    /** Open a card on a thing, hung off the tile it is on, or under the button that opened it. */
    function openThing(thing, anchorRect, below) {
        if (busy) return;
        selected = thing;
        cardMore = false;
        cardAnchor = anchorRect ? { rect: anchorRect, below: !!below } : null;
        PRS.audio.unlock();
        PRS.audio.play("blip");
        hideTip();      // the card is the answer now; the tip was the question
        paintCard();
    }

    function closeCard() {
        selected = null;
        cardMore = false;
        const card = root && $("#card", root);
        if (card) { card.classList.remove("on"); clear(card); }
    }

    function paintCard() {
        const card = $("#card", root);
        if (!selected) { card.classList.remove("on"); clear(card); return; }
        const R = H.resolve(S, selected, lastEntries);
        if (!R) { closeCard(); return; }
        clear(card);
        card.appendChild(cardHead(R));
        if (selected.siblings && selected.siblings.length > 1) card.appendChild(cardTabs());

        const body = el("div", { class: "card-body" });
        let n = 0;
        if (R.empty) body.appendChild(el("div", { class: "card-empty", text: R.empty }));
        for (const sec of R.sections) {
            if (sec.more && !cardMore) {
                body.appendChild(el("button", { class: "card-more",
                    text: "▸ " + sec.rows.length + " more…",
                    onclick: () => { cardMore = true; paintCard(); } }));
                continue;
            }
            if (sec.title) body.appendChild(el("div", { class: "card-sec" }, [el("b", { text: sec.title })]));
            if (sec.walk) body.appendChild(walkRow(sec.walk, n++));
            for (const e of sec.rows) {
                body.appendChild(actionRow(e, n++, sec.then
                    ? { then: true, path: sec.walk.path, onclick: (x) => walkThen(sec.walk, x.key) }
                    : {}));
            }
            if (sec.hidden) {
                body.appendChild(el("div", { class: "card-empty", text:
                    "…and " + sec.hidden + " more once you are there." }));
            }
        }
        if (!R.near && !R.walk && !R.empty) {
            body.appendChild(el("div", { class: "card-empty", text: "Out of reach." }));
        }
        card.appendChild(body);
        card.classList.add("on");
        placeCard();
    }

    function cardHead(R) {
        const h = R.header;
        return el("div", { class: "card-head" }, [
            h.icon ? PRS.atlas.icon(h.icon, h.iconScale || 2, h.palette || null, "card-icon")
                   : el("span", { class: "card-icon" }),
            el("div", {}, [
                el("b", { text: h.title }),
                h.sub ? el("i", { text: h.sub }) : null,
                h.traits ? el("u", { text: h.traits }) : null,
                h.flag ? el("em", { text: h.flag }) : null,
            ]),
            el("button", { class: "card-close", text: "×", title: "Close (Esc)",
                           onclick: closeCard }),
        ]);
    }

    /** Several things on one tile - Chip Vanterpool and the fire above him - as tabs. */
    function cardTabs() {
        const things = selected.siblings;
        const row = el("div", { class: "card-tabs" });
        for (const t of things) {
            row.appendChild(el("button", {
                class: "chip opens" + (t.key === selected.key ? " lit" : ""),
                onclick: () => { selected = t; selected.siblings = things; cardMore = false; paintCard(); },
            }, [tabIcon(t), el("b", { text: t.short })]));
        }
        return row;
    }

    function tabIcon(t) {
        if (t.kind === "person") {
            const p = st.paxById(S, t.id);
            return p ? PRS.atlas.icon(PRS.render.faceOf(p), 1, PRS.render.paletteOf(p)) : null;
        }
        if (t.kind === "crew") {
            const c = PRS.crew.byId(S, t.id);
            return c ? PRS.atlas.icon(c.sprite || "crew", 1, PRS.render.paletteOf(c)) : null;
        }
        if (t.kind === "fire") return PRS.atlas.icon("fire_2", 1);
        if (t.kind === "you") return PRS.atlas.icon("pax", 1, PRS.render.paletteOf(S.character));
        return null;
    }

    /** The first row of a card about something out of reach: the walk, priced. */
    function walkRow(w, n) {
        return el("button", {
            class: "act act-walk",
            onclick: () => walkThen(w, null),
            onmouseenter: () => setWalkPlan(w),
            onmouseleave: () => { if (planKey === "walk") clearPlan(); },
            onfocus: () => setWalkPlan(w),
            onblur: () => { if (planKey === "walk") clearPlan(); },
        }, [
            el("span", { class: "act-key", text: n < 9 ? String(n + 1) : "" }),
            el("span", { class: "act-icon act-icon-walk", text: "→" }),
            el("span", { class: "act-body" }, [
                el("b", { text: w.label }),
                el("i", { text: w.detail }),
            ]),
            el("span", { class: "act-cost", text: costLabel(w.cost) }),
        ]);
    }

    /**
     * Walk there, and then do the thing, as two actions - both undoable, the second one only if
     * it is still possible when you arrive, because the world moves while you walk.
     */
    function walkThen(w, key) {
        const keep = selected;
        walkTo({ x: w.x, y: w.y }, function () {
            if (S.clock.landed) return;
            selected = keep;
            cardAnchor = null;
            if (!key) { paintCard(); return; }
            const hit = A.available(S).filter((e) => e.key === key)[0];
            if (hit) run(hit);
            else paintCard();
        });
    }

    /** Hang the card off the thing it is about, on whichever side there is room. */
    function placeCard() {
        const card = root && $("#card", root);
        if (!card || !selected || !card.classList.contains("on")) return;
        let a = null, below = false;
        if (cardAnchor) {
            a = cardAnchor.rect;
            below = cardAnchor.below;
        } else {
            a = tileRect(selected.x, selected.y);
        }
        if (!a) return;
        const rr = root.getBoundingClientRect();
        const w = card.offsetWidth, h = card.offsetHeight;
        let x, y;
        if (below) {
            x = a.left - rr.left;
            y = a.bottom - rr.top + 8;
            if (y + h > rr.height - 8) y = a.top - rr.top - h - 8;
        } else {
            x = a.right - rr.left + 10;
            y = a.top - rr.top - 8;
            if (x + w > rr.width - 8) x = a.left - rr.left - w - 10;
        }
        if (x + w > rr.width - 8) x = rr.width - 8 - w;
        if (x < 8) x = 8;
        if (y + h > rr.height - 8) y = rr.height - 8 - h;
        if (y < 8) y = 8;
        card.style.left = (x + root.scrollLeft) + "px";
        card.style.top = (y + root.scrollTop) + "px";
    }

    function tileRect(x, y) {
        const r = canvas.getBoundingClientRect();
        const tw = r.width / cabin.W, th = r.height / cabin.H;
        return { left: r.left + x * tw, right: r.left + (x + 1) * tw,
                 top: r.top + y * th, bottom: r.top + (y + 1) * th, width: tw, height: th };
    }

    /** A click anywhere that is not the card, and not something that opens one, closes it. */
    function onPress(ev) {
        if (!selected || busy) return;
        const t = ev.target;
        if (!(t instanceof Element)) return;
        if (t.closest("#card") || t.closest(".opens") || t.closest("#cabin")) return;
        closeCard();
    }

    // -------------------------------------------------------------------------------- rows ---

    /** The icon on a row: the thing from your bag it uses, or the face it is about. */
    function rowIcon(e) {
        if (e.item) {
            const s = st.slotOf(S, e.item);
            const it = s ? s.item : PRS.data.items.byId(e.item);
            if (it) return PRS.atlas.icon(String(it.sprite).split(":")[1], 1, null, "act-icon");
        }
        if (e.ctx && e.ctx.t) return PRS.atlas.icon(PRS.render.faceOf(e.ctx.t), 1, PRS.render.paletteOf(e.ctx.t), "act-icon");
        if (e.ctx && e.ctx.p) return PRS.atlas.icon(PRS.render.faceOf(e.ctx.p), 1, PRS.render.paletteOf(e.ctx.p), "act-icon");
        if (e.ctx && e.ctx.c) return PRS.atlas.icon(e.ctx.c.sprite || "crew", 1, PRS.render.paletteOf(e.ctx.c), "act-icon");
        if (e.deck === "fire") return PRS.atlas.icon("fire_2", 1, null, "act-icon");
        if (e.deck === "move") return el("span", { class: "act-icon act-icon-walk", text: "→" });
        return el("span", { class: "act-icon" });
    }

    function actionRow(e, n, opts) {
        opts = opts || {};
        const over = e.cost > S.clock.remaining;
        return el("button", {
            class: "act act-" + e.danger + (over ? " over" : "") + (opts.then ? " then" : ""),
            onclick: () => (opts.onclick ? opts.onclick(e) : run(e)),
            onmouseenter: () => setPlan(e, opts.path),
            onmouseleave: () => { if (planKey === e.key) clearPlan(); },
            onfocus: () => setPlan(e, opts.path),
            onblur: () => { if (planKey === e.key) clearPlan(); },
            dataset: { key: e.key },
        }, [
            el("span", { class: "act-key", text: n !== undefined && n < 9 ? String(n + 1) : "" }),
            rowIcon(e),
            el("span", { class: "act-body" }, [
                el("b", { text: e.label }),
                e.detail ? el("i", { text: e.detail }) : null,
            ]),
            el("span", { class: "act-cost", text: over ? "over" : costLabel(e.cost) }),
        ]);
    }

    // -------------------------------------------------------------------------------- doing ---

    // One fallback cue per deck, so that every action in the game makes a noise of the right
    // kind. An action that plays its own sound keeps it; this is only for the ones that do not.
    const DECK_CUE = { move: "step", fire: "effort", people: "grab", crew: "talk",
                       cabin: "latch", self: "breath", items: "rummage" };

    function cueFor(e) {
        if (e.tags.indexOf("social") >= 0) return "talk";
        if (e.tags.indexOf("carry") >= 0) return "grab";
        return DECK_CUE[e.deck] || "click";
    }

    /**
     * Do it, and then watch it cost what it costs.
     *
     * The log gets the sentence. The cabin gets the price, floating off the tile it was paid on,
     * a ring around the thing it landed on, and - if the aeroplane got meaningfully worse or
     * better - a colour over the whole picture and a shove. Everything is measured before and
     * after rather than reported by the action, so every action gets it without knowing about it.
     *
     * Then the action's seconds are played out on the screen, a sub-step at a time, and nothing
     * can be clicked until they have gone: you walk the route you were quoted and arrive as the
     * last of them goes by, which is the only honest way to draw a cabin where time is the price
     * of everything.
     */
    function run(entry, then) {
        if (S.clock.landed || busy) return;
        PRS.audio.unlock();
        const fx = PRS.render.fx;
        const focus = planFor(entry).focus;
        const from = [S.player.x, S.player.y];
        const before = measure();
        const sounds = PRS.audio.count();
        clearPlan();
        hideTip();

        const res = A.perform(S, entry, { paced: true });
        if (!res) return;

        if (PRS.audio.count() === sounds) PRS.audio.play(cueFor(entry));

        if (res.cost > 0) {
            fx.say(focus.x, focus.y, "−" + costLabel(res.cost),
                   res.kind === "bad" ? "#e5897c" : "#ffd54a");
            spentTag(res.cost);
        }
        fx.pulse(focus.x, focus.y,
                 res.kind === "bad" ? "#d4483a"
                 : (res.kind === "good" || res.kind === "great") ? "#5fd67a" : "#ffd54a");

        const ms = res.passage ? paceMs(res.cost) : 0;
        if (S.player.x !== from[0] || S.player.y !== from[1]) {
            const path = entry.id === "move.walk" && entry.ctx && entry.ctx.r
                ? entry.ctx.r.path.map((i) => [cabin.xOf(i), cabin.yOf(i)])
                : PRS.render.motion.route(from[0], from[1], S.player.x, S.player.y);
            PRS.render.motion.follow("you", [from].concat(path), ms);
        }

        busy = { passage: res.passage, start: performance.now(), ms: ms, focus: focus,
                 before: before, said: tell(before, measure(), focus), then: then };
        root.classList.add("busy");
        playOut(busy.start);
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
     * Clicking the cabin. Whatever is under the pointer - a person, the fire, yourself - opens a
     * card; the floor is a walk; the hull is nothing. When one tile has several of those on it -
     * a passenger with the fire in the seat round them - the click lands on the one the pointer
     * was actually on, and the card gets a tab for each of the others.
     */
    function clickTile(t) {
        if (S.clock.landed || busy) return;
        const tg = H.targetAt(S, t.x, t.y, t.fx, t.fy);
        if (tg.kind === "none") return;
        if (tg.kind === "walk") {
            closeCard();
            walkClick(t);
            return;
        }
        const thing = tg.thing;
        thing.siblings = tg.siblings;
        openThing(thing, null);
    }

    // -------------------------------------------------------------------------------- keys ---

    function onKey(ev) {
        if (!root || !root.isConnected) return;
        const tag = (ev.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;

        // The three that are about the screen rather than the aeroplane, and work at any time.
        if (ev.key === "m" || ev.key === "M") { toggleSound(); return; }
        if (ev.key === "?") { showHelp(); return; }
        if (ev.key === "Escape") {
            if ($(".help-veil", root)) PRS.screens.hideHelp(root);
            else closeCard();
            return;
        }

        // Everything else does something to the aeroplane, and while an action's seconds are
        // going by the aeroplane is not taking instructions.
        if (ev.key >= "1" && ev.key <= "9") {
            ev.preventDefault();
            if (busy) return;
            const rows = $$("#card .act", root);
            const i = Number(ev.key) - 1;
            if (rows[i]) rows[i].click();
            return;
        }
        const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
                       a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
        const d = dirs[ev.key];
        if (d) {
            ev.preventDefault();
            if (busy) return;
            closeCard();
            const t = { x: S.player.x + d[0], y: S.player.y + d[1] };
            if (!walkBack(t)) walkTo(t);
            return;
        }
        if (ev.key === "Backspace" || ev.key === "z" || ev.key === "Z") {
            ev.preventDefault();
            doUndo();
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

    PRS.play = { build, destroy, paint, openThing, closeCard };
})(window);
