// Synthesised Web Audio engine for Please Remain Seated.
// Zero external audio files required — works directly from file://.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};

    let ctx = null;
    let master = null;
    let roarGain = null, roarSource = null;
    let enabled = true;
    let volume = 1;
    let ready = false;
    let plays = 0;
    let hushed = 0;

    function ensure() {
        if (ctx) return ctx;
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) { enabled = false; return null; }
        try { ctx = new AC(); } catch (e) { enabled = false; return null; }
        master = ctx.createGain();
        master.gain.value = level();
        master.connect(ctx.destination);
        return ctx;
    }

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

    function startRoar() {
        if (!enabled || !ensure() || !ready || roarSource) return;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(3);
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 240;
        roarGain = ctx.createGain();
        roarGain.gain.value = 0.04;
        src.connect(lp).connect(roarGain).connect(master);
        src.start();
        roarSource = src;
    }

    function setRoar(lvl) {
        if (hushed || !roarGain || !ctx) return;
        roarGain.gain.setTargetAtTime(0.03 + 0.09 * Math.min(1, Math.max(0, lvl)), now(), 0.4);
    }

    function stopRoar() {
        if (roarSource) { try { roarSource.stop(); } catch (e) {} }
        roarSource = null;
    }

    const sfx = {
        chime() {
            tone(880, 0.45, { type: "sine", gain: 0.16 });
            tone(660, 0.65, { type: "sine", gain: 0.14, delay: 0.25 });
        },
        click() { tone(540, 0.04, { type: "square", gain: 0.05 }); },
        select() {
            tone(660, 0.06, { type: "triangle", gain: 0.09 });
            tone(990, 0.08, { type: "triangle", gain: 0.08, delay: 0.05 });
        },
        back() { tone(400, 0.08, { type: "square", gain: 0.06 }); },
        step() { noise(0.045, { freq: 380, gain: 0.03, q: 0.8 }); },
        jump() {
            tone(240, 0.16, { type: "sine", gain: 0.11, slideTo: 580 });
            noise(0.08, { freq: 600, gain: 0.05 });
        },
        pour() { noise(0.45, { freq: 1600, freqTo: 520, gain: 0.14, q: 0.6 }); },
        splash() {
            noise(0.55, { freq: 2200, freqTo: 420, gain: 0.20, q: 0.5 });
            tone(320, 0.18, { type: "sine", gain: 0.1, slideTo: 140 });
        },
        spray() { noise(0.35, { freq: 3600, freqTo: 1500, gain: 0.14, q: 0.4 }); },
        halon() { noise(0.5, { freq: 5000, freqTo: 950, gain: 0.17, q: 0.3 }); },
        fan() { noise(0.4, { freq: 750, freqTo: 1200, gain: 0.12, q: 0.9 }); },
        smother() { noise(0.3, { freq: 300, gain: 0.14, filter: "lowpass" }); },
        flare() {
            noise(0.45, { freq: 240, freqTo: 1600, gain: 0.22, filter: "lowpass" });
            tone(95, 0.45, { type: "sawtooth", gain: 0.11, slideTo: 220 });
        },
        pop() {
            tone(520, 0.08, { type: "sawtooth", gain: 0.16, slideTo: 110 });
            noise(0.18, { freq: 1400, freqTo: 300, gain: 0.18 });
        },
        sizzle() {
            noise(0.28, { freq: 4200, freqTo: 2600, gain: 0.12, q: 0.8 });
            tone(190, 0.15, { type: "sawtooth", gain: 0.08, slideTo: 130 });
        },
        grab() {
            tone(320, 0.09, { type: "triangle", gain: 0.1, slideTo: 480 });
            noise(0.1, { freq: 500, gain: 0.08, filter: "lowpass" });
        },
        drop() {
            tone(260, 0.11, { type: "triangle", gain: 0.1, slideTo: 130 });
            noise(0.14, { freq: 220, gain: 0.1, filter: "lowpass" });
        },
        thud() {
            tone(130, 0.22, { type: "sine", gain: 0.2, slideTo: 48 });
            noise(0.18, { freq: 240, gain: 0.16, filter: "lowpass" });
        },
        secure() {
            tone(523, 0.1, { type: "triangle", gain: 0.12 });
            tone(659, 0.12, { type: "triangle", gain: 0.12, delay: 0.08 });
            tone(784, 0.14, { type: "triangle", gain: 0.12, delay: 0.16 });
            tone(1046, 0.24, { type: "triangle", gain: 0.12, delay: 0.24 });
        },
        refuse() {
            tone(240, 0.14, { type: "square", gain: 0.08, slideTo: 170 });
            tone(190, 0.18, { type: "square", gain: 0.08, slideTo: 130, delay: 0.12 });
        },
        whistle() {
            tone(2600, 0.12, { type: "sine", gain: 0.14, slideTo: 2950 });
            tone(2850, 0.22, { type: "sine", gain: 0.15, slideTo: 2500, delay: 0.13 });
        },
        horn() {
            tone(311, 0.42, { type: "sawtooth", gain: 0.16 });
            tone(392, 0.42, { type: "sawtooth", gain: 0.14 });
            noise(0.35, { freq: 900, gain: 0.08 });
        },
        camera() {
            tone(1800, 0.03, { type: "square", gain: 0.09 });
            noise(0.08, { freq: 3200, gain: 0.12, delay: 0.02 });
        },
        alarm() {
            for (let i = 0; i < 3; i++) {
                tone(2400, 0.11, { type: "square", gain: 0.1, delay: i * 0.16 });
            }
        },
        masksDrop() {
            noise(0.35, { freq: 700, gain: 0.12 });
            tone(587, 0.2, { type: "sine", gain: 0.1 });
            tone(880, 0.35, { type: "sine", gain: 0.1, delay: 0.15 });
        },
        pa() {
            tone(987, 0.14, { type: "sine", gain: 0.12 });
            tone(784, 0.22, { type: "sine", gain: 0.11, delay: 0.14 });
        },
        bad() { tone(165, 0.35, { type: "sawtooth", gain: 0.12, slideTo: 92 }); },
        good() {
            tone(660, 0.11, { type: "triangle", gain: 0.11 });
            tone(880, 0.2, { type: "triangle", gain: 0.11, delay: 0.09 });
        },
        tick() { tone(1400, 0.02, { type: "square", gain: 0.025 }); },
        blip() { tone(1180, 0.018, { type: "sine", gain: 0.02 }); },
        talk() {
            tone(260, 0.06, { type: "sawtooth", gain: 0.04 });
            tone(330, 0.06, { type: "sawtooth", gain: 0.035, delay: 0.07 });
        },
        landing() {
            tone(60, 1.8, { type: "sawtooth", gain: 0.16, slideTo: 120 });
            noise(2.0, { freq: 320, freqTo: 1800, gain: 0.15, filter: "lowpass" });
        },
    };

    function hush(on) {
        hushed = Math.max(0, hushed + (on ? 1 : -1));
    }

    function play(name) {
        if (hushed) return;
        const fn = sfx[name];
        if (!fn) return;
        plays++;
        fn();
    }

    function count() { return plays; }
    function level() { return enabled ? 0.5 * volume : 0; }

    function apply() {
        if (master) master.gain.setTargetAtTime(level(), now(), 0.05);
        if (!enabled || volume <= 0) stopRoar();
    }

    function setEnabled(on) {
        enabled = !!on;
        apply();
    }

    function isEnabled() { return enabled; }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, typeof v === "number" ? v : 1));
        apply();
    }

    function getVolume() { return volume; }

    PRS.audio = {
        unlock, play, count, sfx, setEnabled, isEnabled, setVolume, getVolume,
        startRoar, stopRoar, setRoar, hush
    };
})(window);
