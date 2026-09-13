// The aeroplane behind the boarding pass.
//
// The title screen used to be words on a flat colour, which made the first thing anybody saw the
// one screen in the game with no aeroplane on it. This is the aeroplane, and it is not a loop of
// video and not a scripted demo: it is the real simulation, on a real seed, with one of the bots
// from game/sim/bots.js at the controls, losing to the same fire the player is about to lose to.
//
// Three things make it a backdrop rather than a game:
//
//   - It plays slowly. A bot in simulate.js takes nine hundred seconds in a few milliseconds;
//     here each of its actions is spread over ACTION_MS of real time and followed by a pause, so
//     the cabin is legible between moves and the fire has time to be looked at.
//   - It is silent. The simulation rings the cabin chime, reads the PA and runs a fire roar
//     underneath itself, none of which a menu may do, so every call that moves the world goes
//     through `silent()` - the same trick scoring.js uses to run the flight nobody hears.
//   - It is never read. Nothing here writes the log book, keeps a recording, or touches the
//     player's choice of character, seed or loadout. The flight is thrown away when it lands and
//     another one takes off.
//
// It warms up before it is shown, because a cabin at fifteen minutes is a quiet cabin: a couple
// of hundred seconds go by instantly at boarding so the menu always opens on a fire that is
// already burning and people who are already out of their seats.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const { el } = PRS.util;

    // An action's seconds go by over this long, and then the cabin is left alone for a beat. Both
    // are a good deal slower than the play screen, which is pacing something the player is
    // waiting on; nobody is waiting on this one.
    const ACTION_MS = 2400;
    const BEAT_MS = 900;

    // Seconds flown instantly before the first frame, so the menu never opens on a cold cabin.
    const WARM_MIN = 150, WARM_MAX = 330;

    // Bots that are worth watching, which is not the same as bots that play well. `idle` and
    // `hold` do nothing and `mover` paces without ever arriving; these four walk the cabin, pour
    // things on the fire and carry people to the doors, which is what the picture is for.
    const WATCHABLE = ["blend", "sinkthen", "douse", "good"];

    let canvas = null, ctx = null, scale = 1, raf = 0;
    let S = null, bot = null, busy = null, resumeAt = 0;
    let still = false;

    /**
     * Run the simulation with nobody listening. fire.js flares, crew.js rings the chime and reads
     * the PA, and actions.js keeps a roar under the whole thing; a title screen that did any of
     * that would be a title screen that makes a noise at somebody who has not pressed anything.
     */
    function silent(fn) {
        const heard = PRS.audio && PRS.audio.isEnabled();
        if (PRS.audio) PRS.audio.setEnabled(false);
        try { return fn(); }
        finally { if (PRS.audio) PRS.audio.setEnabled(heard); }
    }

    // Which aeroplane is flying behind the pass. Set by `start`, so the cabin behind the
    // boarding pass is the cabin the pass is made out for: pick the turboprop on the seed screen
    // and the thing burning behind the title is a turboprop.
    let aircraft = null;

    /** A new flight, already burning. Random in every respect, and read by nothing. */
    function takeOff() {
        const chars = PRS.data.characters.CHARACTERS;
        const seed = (Math.random() * 0xffffffff) >>> 0;
        const rng = PRS.util.makeRng(seed);
        const ch = rng.pick(chars);

        S = PRS.state.create({ characterId: ch.id, items: ch.bag, seed: seed,
                               aircraft: aircraft });
        // The report's "what the same flight does with nobody in it" is a second fifteen minutes
        // of physics and nothing here is ever going to read it.
        S.counterfactual = false;
        PRS.bots.setCoin(PRS.util.makeRng((seed ^ 0x9e3779b9) >>> 0));
        bot = PRS.bots.BOTS[rng.pick(WATCHABLE)];

        busy = null;
        resumeAt = 0;
        PRS.render.motion.reset();
        PRS.render.fx.clear();

        // The warm-up, at the speed the bots usually fly: all of it at once.
        const until = rng.irange(WARM_MIN, WARM_MAX);
        silent(function () {
            let guard = 0;
            while (!S.clock.landed && S.clock.elapsed < until && guard++ < 400) {
                if (!step(true)) break;
            }
        });
        // Whoever the bot walked into position is drawn there rather than gliding in from 9C.
        PRS.render.motion.reset();
    }

    /**
     * One of the bot's turns. `now` takes its seconds immediately, which is the warm-up; otherwise
     * the seconds are handed back as a passage for the loop to spend over ACTION_MS.
     * Returns false when the flight is over or the bot has nothing left to do.
     */
    function step(now) {
        let list;
        try { list = PRS.actions.available(S, true); }
        catch (err) { return false; }
        if (!list.length) return false;

        let entry = null;
        try { entry = bot(PRS, S, list); }
        catch (err) { entry = null; }

        if (!entry) {
            // A bot with nothing to do waits, in the steps a person would.
            PRS.actions.spend(S, Math.min(10, S.clock.remaining), null);
            if (S.clock.remaining <= 0.001 && !S.clock.landed) PRS.actions.land(S);
            return !S.clock.landed;
        }

        let done = null;
        try { done = PRS.actions.perform(S, entry, now ? null : { paced: true }); }
        catch (err) { return false; }

        if (!now && done && done.passage) {
            busy = { passage: done.passage, start: performance.now() };
        }
        return true;
    }

    /** How many of the current action's seconds should have gone by by now. */
    function due(b, t) {
        return b.passage.seconds * Math.min(1, (t - b.start) / ACTION_MS);
    }

    function loop() {
        raf = requestAnimationFrame(loop);
        // Any route off the title screen calls stop() first, but a node that leaves the document
        // some other way must not leave a flight running behind it for ever.
        if (!canvas || !canvas.isConnected) { stop(); return; }
        const now = performance.now();

        // A tab nobody is looking at does not burn. requestAnimationFrame mostly stops on its own
        // when the tab is hidden; this is what stops the first frame back from being a jump.
        if (!global.document.hidden && !still) advance(now);

        // Across the page, always. The mask and the clip that make this a background rather
        // than a picture are cut for a letterbox, and the play screen may have left the
        // renderer turned the other way on its way out of a flight.
        PRS.render.turn(false);
        PRS.render.draw(ctx, S, { scale: scale, time: now });
    }

    function advance(now) {
        if (busy) {
            const p = busy.passage;
            silent(function () {
                try {
                    const owed = due(busy, now);
                    while (!p.finished && p.done <= owed) { if (!p.step()) break; }
                } catch (err) {
                    // A sub-step should never throw. If one does, this is a menu: drop the flight
                    // and take off again rather than leaving a frozen aeroplane on the screen.
                    busy = null;
                    takeOff();
                }
            });
            if (busy && p.finished) { busy = null; resumeAt = now + BEAT_MS; }
            return;
        }
        if (now < resumeAt) return;
        if (S.clock.landed) { takeOff(); return; }
        silent(function () { if (!step(false)) takeOff(); });
        if (!busy) resumeAt = now + BEAT_MS;
    }

    /**
     * Put a cabin behind `host`. Safe to call twice; the second one replaces the first.
     *
     * Everything that can go wrong here is a menu that does not draw, so all of it is wrapped: a
     * browser with no canvas, a sprite sheet that did not boot, an action that throws on a state
     * the bots have not reached. The title screen has to come up either way.
     */
    function start(host, which) {
        aircraft = which || null;
        stop();
        let wrap = null;
        try {
            canvas = el("canvas", { class: "backdrop-cabin" });
            ctx = canvas.getContext("2d");
            if (!ctx) { canvas = null; return null; }

            wrap = el("div", { class: "backdrop", "aria-hidden": "true" }, [canvas]);
            host.appendChild(wrap);
            PRS.render.turn(false);
            scale = PRS.render.fit(canvas);
            // fit() sizes the canvas to be read: 100% wide and as tall as it likes. Behind the
            // title it is a background instead, and covers.
            canvas.style.width = "";
            canvas.style.height = "";

            // Somebody who has asked for less movement gets the aeroplane and not the flight.
            still = !!(global.matchMedia &&
                       global.matchMedia("(prefers-reduced-motion: reduce)").matches);

            takeOff();
            loop();
            return wrap;
        } catch (err) {
            console.error("the cabin behind the title did not start", err);
            stop();
            if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
            return null;
        }
    }

    function stop() {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        // The flight is abandoned rather than landed, because nothing was ever going to read it.
        busy = null;
        S = null;
        bot = null;
        canvas = null;
        ctx = null;
        PRS.render.motion.reset();
        PRS.render.fx.clear();
    }

    PRS.backdrop = { start, stop };
})(window);
