// Every sound in the game is synthesised here, because the game ships as a folder you can open
// from disk and a folder you can open from disk should not need forty .ogg files to make a noise.
//
// The palette is the aeroplane's own: the two-tone cabin chime, the seatbelt sign, the flat hiss
// of the air conditioning, and one low roar under all of it that gets louder as the fire does.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};

    let ctx = null;
    let master = null;
    let roarGain = null, roarSource = null;
    let enabled = true;
    let ready = false;

    function ensure() {
        if (ctx) return ctx;
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) { enabled = false; return null; }
        try { ctx = new AC(); } catch (e) { enabled = false; return null; }
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        return ctx;
    }

    // Browsers will not make a sound until the player has clicked something. The menus call this
    // on the first click and nothing before it needs to be audible anyway.
    function unlock() {
        const c = ensure();
        if (!c) return;
        if (c.state === "suspended") c.resume();
        ready = true;
    }

    function now() { return ctx ? ctx.currentTime : 0; }

    function tone(freq, dur, opts) {
        if (!enabled || !ensure() || !ready) return;
        opts = opts || {};
        const t0 = now() + (opts.delay || 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = opts.type || "sine";
        osc.frequency.setValueAtTime(freq, t0);
        if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
        const peak = (opts.gain === undefined ? 0.18 : opts.gain);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.min(0.02, dur * 0.2));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    }

    function noiseBuffer(seconds) {
        const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    function noise(dur, opts) {
        if (!enabled || !ensure() || !ready) return;
        opts = opts || {};
        const t0 = now() + (opts.delay || 0);
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(Math.max(0.05, dur));
        const filter = ctx.createBiquadFilter();
        filter.type = opts.filter || "bandpass";
        filter.frequency.setValueAtTime(opts.freq || 900, t0);
        if (opts.freqTo) filter.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqTo), t0 + dur);
        filter.Q.value = opts.q === undefined ? 1 : opts.q;
        const gain = ctx.createGain();
        const peak = opts.gain === undefined ? 0.16 : opts.gain;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filter).connect(gain).connect(master);
        src.start(t0);
        src.stop(t0 + dur + 0.02);
    }

    // The low roar of a cabin at cruise, which is also the bed the fire sits on.
    function startRoar() {
        if (!enabled || !ensure() || !ready || roarSource) return;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(3);
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 260;
        roarGain = ctx.createGain();
        roarGain.gain.value = 0.05;
        src.connect(lp).connect(roarGain).connect(master);
        src.start();
        roarSource = src;
    }

    function setRoar(level) {
        if (!roarGain || !ctx) return;
        roarGain.gain.setTargetAtTime(0.035 + 0.10 * Math.min(1, Math.max(0, level)), now(), 0.6);
    }

    function stopRoar() {
        if (roarSource) { try { roarSource.stop(); } catch (e) { /* already stopped */ } }
        roarSource = null;
    }

    // The library. Named for what happens, not for what it sounds like.
    const sfx = {
        // Two-tone cabin chime, the "bing-bong" that in this game always means bad news.
        chime() { tone(880, 0.5, { type: "sine", gain: 0.16 });
                  tone(660, 0.7, { type: "sine", gain: 0.14, delay: 0.28 }); },
        // The seatbelt sign, which is one tone and a smug one.
        beltSign() { tone(1046, 0.35, { type: "triangle", gain: 0.14 }); },
        click() { tone(520, 0.045, { type: "square", gain: 0.05 }); },
        select() { tone(660, 0.06, { type: "square", gain: 0.07 });
                   tone(990, 0.08, { type: "square", gain: 0.05, delay: 0.05 }); },
        back() { tone(400, 0.08, { type: "square", gain: 0.06 }); },
        step() { noise(0.06, { freq: 380, gain: 0.035, q: 0.7 }); },
        // Water, foam and halon are three different hisses and the player learns them.
        pour() { noise(0.55, { freq: 1600, freqTo: 500, gain: 0.13, q: 0.6 }); },
        spray() { noise(0.8, { freq: 3800, freqTo: 1400, gain: 0.16, q: 0.4 }); },
        halon() { noise(1.1, { freq: 5200, freqTo: 900, gain: 0.18, q: 0.3 }); },
        smother() { noise(0.35, { freq: 300, gain: 0.14, filter: "lowpass" }); },
        flare() { noise(0.5, { freq: 220, freqTo: 1500, gain: 0.22, filter: "lowpass" });
                  tone(90, 0.5, { type: "sawtooth", gain: 0.1, slideTo: 200 }); },
        fireGrow() { tone(70, 0.9, { type: "sawtooth", gain: 0.09, slideTo: 55 }); },
        grab() { noise(0.13, { freq: 500, gain: 0.09, filter: "lowpass" }); },
        drop() { noise(0.16, { freq: 200, gain: 0.11, filter: "lowpass" }); },
        secure() { tone(523, 0.1, { type: "triangle", gain: 0.1 });
                   tone(784, 0.14, { type: "triangle", gain: 0.1, delay: 0.09 });
                   tone(1046, 0.2, { type: "triangle", gain: 0.09, delay: 0.19 }); },
        slap() { noise(0.09, { freq: 1800, gain: 0.2, q: 0.5 }); },
        refuse() { tone(220, 0.16, { type: "square", gain: 0.07, slideTo: 160 }); },
        cough() { noise(0.22, { freq: 480, freqTo: 200, gain: 0.13, filter: "lowpass" }); },
        alarm() { for (let i = 0; i < 3; i++) tone(2400, 0.12, { type: "square", gain: 0.09, delay: i * 0.18 }); },
        masksDrop() { noise(0.4, { freq: 700, gain: 0.1 });
                      tone(440, 0.6, { type: "sine", gain: 0.08, delay: 0.1 }); },
        pa() { tone(1200, 0.06, { type: "square", gain: 0.05 });
               noise(0.25, { freq: 1200, gain: 0.04, q: 0.4, delay: 0.06 }); },
        bad() { tone(160, 0.4, { type: "sawtooth", gain: 0.12, slideTo: 90 }); },
        good() { tone(660, 0.12, { type: "triangle", gain: 0.1 });
                 tone(880, 0.22, { type: "triangle", gain: 0.1, delay: 0.1 }); },
        tick() { tone(1500, 0.02, { type: "square", gain: 0.025 }); },
        landing() { tone(55, 2.2, { type: "sawtooth", gain: 0.16, slideTo: 120 });
                    noise(2.4, { freq: 300, freqTo: 2000, gain: 0.14, filter: "lowpass" }); },
        touchdown() { noise(0.9, { freq: 180, freqTo: 60, gain: 0.28, filter: "lowpass" }); },
    };

    function play(name) {
        const fn = sfx[name];
        if (fn) fn();
    }

    function setEnabled(on) {
        enabled = !!on;
        if (master) master.gain.setTargetAtTime(enabled ? 0.5 : 0, now(), 0.05);
        if (!enabled) stopRoar();
    }

    function isEnabled() { return enabled; }

    PRS.audio = { unlock, play, sfx, setEnabled, isEnabled, startRoar, stopRoar, setRoar };
})(window);
