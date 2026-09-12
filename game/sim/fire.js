// Fire, smoke and heat. Three fields over the cabin grid, advanced by however many seconds the
// player just spent, because in this game the world only moves when the player does.
//
// The one rule that is not negotiable
// -----------------------------------
//
// The fire cannot be put out. Not as a difficulty setting: as the premise. The seat of it is a
// lithium cell in a vape pen inside a hard case inside a closed overhead bin, and a lithium cell
// in thermal runaway makes its own oxygen. Water cools the cell and buys you time. Halon smothers
// the flame and buys you more. Neither reaches the cell, so the cell reheats and lights the bin
// again, and it will do that until the aeroplane is on the ground and somebody with a hose and a
// bucket of vermiculite takes the case off it.
//
// So suppression is real - it drops intensity, it stops spread, it saves lives - and `core` is the
// thing suppression cannot touch. `core.heat` climbs on its own and dumps back into the cabin
// every time it tops out. Everything the player does to the fire changes how often that happens
// and how bad it is when it does. Nothing sets it to zero. `putOut()` does not exist in this file.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const T = PRS.t, K = PRS.k;
    const { clamp, clamp01 } = PRS.util;

    const N = cabin.W * cabin.H;

    // How an agent behaves once it is on a tile: how much intensity it takes off now, how much
    // suppression it leaves behind, how fast that fades, and what it does to smoke.
    // `coolsCore` is the only column that matters in the long run: it is the fraction of the
    // agent that gets past the case and onto the cell.
    //
    // Everything a passenger can hold is a small dose that lands on one seat, not a row. The first
    // playtest held the whole fire down for fifteen minutes with a bottle, a towel and a blanket
    // by standing where one pour reached three burning tiles, so the doses are smaller, water
    // turns into steam over whoever is sitting under it, and what makes fighting it worth doing
    // is what it does to the air everybody else is breathing, not the flame.
    const AGENTS = {
        water:     { knock: 20, hold: 28, decay: 0.020, smoke: +20, coolsCore: 0.55, name: K("water") },
        halon:     { knock: 74, hold: 82, decay: 0.014, smoke: -8,  coolsCore: 0.10, name: K("halon") },
        smother:   { knock: 20, hold: 34, decay: 0.016, smoke: -8,  coolsCore: 0.12, name: K("smothering") },
        wetcloth:  { knock: 28, hold: 42, decay: 0.013, smoke: +4,  coolsCore: 0.30, name: K("a wet cloth") },
        beat:      { knock: 10, hold: 6,  decay: 0.060, smoke: +22, coolsCore: 0.02, name: K("beating") },
        // Opening the bin is an agent too, and it is in the same table so the code cannot pretend
        // it did not know that it makes things worse.
        air:       { knock: -22, hold: 0, decay: 0.10, smoke: +8,  coolsCore: 0.00, name: "air" },
    };

    function create(S) {
        const st = PRS.state;
        // The fuel map, and the mark every tile has to reach before the fire jumps to it. Both
        // are drawn now, from the seed, so the fire on a seed is the same fire whatever you do.
        const fuelDice = st.dice(S, "fire:fuel", "mid");
        const spreadDice = st.dice(S, "fire:spread", "mid");
        const f = {
            intensity: new Float32Array(N),
            fuel: new Float32Array(N),
            burnt: new Float32Array(N),      // 0 unburnt, 1 nothing left. Drives the scorch art.
            suppress: new Float32Array(N),   // agent still on the tile
            smoke: new Float32Array(N),
            heat: new Float32Array(N),
            spreadAcc: new Float32Array(N),  // chances of catching paid in so far, per tile
            spreadAt: new Float32Array(N),   // the mark they have to reach
            spreadAmt: new Float32Array(N),  // how hard the tile catches when they do
            spreadN: new Uint16Array(N),     // how many marks this tile has had
            binOpen: {},                     // binKey -> true, an open bin feeds the fire air
            binBurning: {},
            // The seat of it.
            core: {
                x: cabin.originTile().x,
                y: cabin.originTile().y,
                heat: 46,        // 0..100. At 100 it dumps into the cabin and resets.
                rate: 1.00,      // how fast heat climbs, per second, before modifiers
                cells: 9,        // cells left in the pack. Each flare-up is one cell venting.
                vented: 0,
                contained: 0,    // 0..1, how much of the venting the cabin does not see
                exposed: false,  // has anyone actually looked at it
                inSink: false,   // the one thing that genuinely helps and nobody thinks of
                lastVent: 0,
            },
            oxygen: 1.0,         // cabin oxygen fraction available to the fire
            totalBurned: 0,
            ventCount: 0,
            peakIntensity: 0,
            suppressedSeconds: 0,
        };
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const i = cabin.idx(x, y);
                // A little variation so the fire does not spread in a diamond.
                f.fuel[i] = cabin.baseFuel(x, y) * (0.82 + fuelDice() * 0.36);
                f.spreadAt[i] = spreadDice.expo();
                f.spreadAmt[i] = 6 + spreadDice() * 8;
            }
        }
        const ci = cabin.idx(f.core.x, f.core.y);
        f.intensity[ci] = 12;
        f.binBurning[cabin.binKey(f.core.x, "left")] = true;
        return f;
    }

    const at = (f, x, y) => f.intensity[cabin.idx(x, y)];
    const smokeAt = (f, x, y) => f.smoke[cabin.idx(x, y)];
    const heatAt = (f, x, y) => f.heat[cabin.idx(x, y)];

    /** The number the HUD shows: the worst tile in the cabin, 0..100. */
    function worst(f) {
        let m = 0;
        for (let i = 0; i < N; i++) if (f.intensity[i] > m) m = f.intensity[i];
        return m;
    }

    function burningTiles(f) {
        let n = 0;
        for (let i = 0; i < N; i++) if (f.intensity[i] > 4) n++;
        return n;
    }

    function totalSmoke(f) {
        let s = 0;
        for (let i = 0; i < N; i++) s += f.smoke[i];
        return s / N;
    }

    /** Everything above this line of smoke is unbreathable; below it you can crawl. */
    function smokeLayer(f) {
        return clamp01(totalSmoke(f) / 62);
    }

    // -------------------------------------------------------------------------- suppression ---

    /**
     * Put an agent on a tile and its neighbours. Returns what visibly happened, because the log
     * line is different for "that did something" and "that made it worse".
     */
    function apply(f, x, y, agentName, amount, spread) {
        const agent = AGENTS[agentName] || AGENTS.water;
        amount = amount === undefined ? 1 : amount;
        spread = spread === undefined ? 0 : spread;
        const tiles = [[x, y]];
        if (spread > 0) {
            for (const [nx, ny] of cabin.neighbours(x, y)) tiles.push([nx, ny]);
        }
        let knocked = 0, worsened = 0;
        for (const [tx, ty] of tiles) {
            if (!cabin.inBounds(tx, ty)) continue;
            const i = cabin.idx(tx, ty);
            const factor = (tx === x && ty === y) ? 1 : spread;
            const before = f.intensity[i];
            if (agent.knock >= 0) {
                f.intensity[i] = Math.max(0, f.intensity[i] - agent.knock * amount * factor);
                f.suppress[i] = Math.min(100, f.suppress[i] + agent.hold * amount * factor);
                knocked += before - f.intensity[i];
            } else {
                // An accelerant. It does nothing to a tile that is not already alight, which is
                // the only mercy in the table.
                if (before > 1) {
                    f.intensity[i] = Math.min(100, f.intensity[i] - agent.knock * amount * factor);
                    f.fuel[i] = Math.min(1.4, f.fuel[i] + 0.25 * amount * factor);
                    worsened += f.intensity[i] - before;
                }
            }
            f.smoke[i] = clamp(f.smoke[i] + agent.smoke * amount * factor * 0.35, 0, 100);
        }
        // Does any of it reach the cell? Only if you are on the seat of the fire.
        const onCore = (x === f.core.x && y === f.core.y);
        if (onCore && agent.coolsCore > 0) {
            f.core.heat = Math.max(0, f.core.heat - 34 * agent.coolsCore * amount);
        } else if (onCore && agent.knock < 0) {
            f.core.heat = Math.min(100, f.core.heat + 12 * amount);
        }
        f.suppressedSeconds += knocked * 0.1;
        return { agent: agent, knocked: knocked, worsened: worsened, onCore: onCore };
    }

    /** Deny the fire air rather than fight it: closing the bin, sealing a vent, the packs off. */
    function starve(f, x, y, strength) {
        const i = cabin.idx(x, y);
        f.intensity[i] = Math.max(0, f.intensity[i] - 18 * strength);
        f.suppress[i] = Math.min(100, f.suppress[i] + 30 * strength);
        f.core.contained = clamp01(f.core.contained + 0.16 * strength);
        return f.core.contained;
    }

    // ------------------------------------------------------------------------------- advance ---

    /**
     * Move the world on by `dt` seconds. Called once per action, with the action's cost, which
     * is why a forty-second argument with a flight attendant is expensive in a way the player
     * feels immediately.
     */
    function advance(f, dt, S) {
        if (dt <= 0) return { vented: false, spread: 0 };

        // Ventilation limit. Everything alight is competing for the same air, so the cabin as a
        // whole has a ceiling and a big fire holds itself down.
        let burning = 0;
        for (let i = 0; i < N; i++) burning += f.intensity[i];
        f.oxygen = clamp(1.12 - burning / 2400, 0.30, 1.0);
        const spreadTo = [];
        let spread = 0;

        // Containment leaks. Whatever you have done to the locker, the heat is working on it,
        // so holding the fire in is something you keep doing rather than something you did.
        f.core.contained = Math.max(0, f.core.contained - 0.006 * dt);

        // The core climbs. Nothing in the cabin stops this; things only slow it. A sink slows it
        // by about half, which is the most anything on this aeroplane can do.
        const coreRate = f.core.rate
            * (f.core.inSink ? 0.55 : 1)
            * (1 - 0.35 * f.core.contained)
            * (1 + 0.10 * f.core.vented);          // each vented cell heats its neighbours
        f.core.heat += coreRate * dt * 0.55;

        let vented = false;
        if (f.core.heat >= 100 && f.core.cells > 0) {
            vented = true;
            // This cell's own dice: how far the core drops back, and which bins the splash reaches.
            const vent = PRS.state.dice(S, "fire:vent:" + f.ventCount, "mid");
            f.core.heat = 18 + vent() * 14;
            f.core.cells--;
            f.core.vented++;
            f.ventCount++;
            f.core.lastVent = S.clock.elapsed;
            const ci = cabin.idx(f.core.x, f.core.y);
            const violence = (1 - 0.55 * f.core.contained) * (f.core.inSink ? 0.35 : 1);
            f.intensity[ci] = Math.min(100, f.intensity[ci] + 55 * violence + 20);
            f.suppress[ci] = f.suppress[ci] * 0.25;
            f.smoke[ci] = Math.min(100, f.smoke[ci] + 34 * violence);
            // A venting cell throws burning electrolyte down the bin.
            const side = f.core.y < cabin.AISLE_Y ? "left" : "right";
            for (let d = -3; d <= 3; d++) {
                const bx = f.core.x + d;
                if (!cabin.inBounds(bx, f.core.y) || d === 0) continue;
                if (cabin.rowAt(bx) === null) continue;
                const bi = cabin.idx(bx, f.core.y);
                const reach = violence * (1 - Math.abs(d) / 4.5);
                if (reach > 0 && vent() < reach) {
                    f.intensity[bi] = Math.min(100, f.intensity[bi] + 22 * reach);
                    f.binBurning[cabin.binKey(bx, side)] = true;
                }
            }
        }

        // Every tile: burn, make smoke, cool, try the neighbours.
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const i = cabin.idx(x, y);
                const inten = f.intensity[i];

                // Suppressant fades. Water evaporates fastest, foam sits longest.
                if (f.suppress[i] > 0) {
                    f.suppress[i] = Math.max(0, f.suppress[i] - f.suppress[i] * 0.022 * dt - 0.05 * dt);
                }

                if (inten <= 0.05) {
                    // Cold tile. Smoke still drifts through it; handled below.
                    f.heat[i] = Math.max(0, f.heat[i] - 0.9 * dt);
                    continue;
                }

                const fuel = f.fuel[i];
                if (fuel <= 0.002) {
                    // Burnt out. It goes to embers, not to nothing, because embers relight.
                    f.intensity[i] = Math.max(0, inten - 3.2 * dt);
                    f.heat[i] = Math.max(0, f.heat[i] - 0.6 * dt);
                    continue;
                }

                const suppressed = clamp01(f.suppress[i] / 70);
                const air = f.oxygen
                          * (f.binOpen[cabin.binKey(x, y < cabin.AISLE_Y ? "left" : "right")] ? 1.12 : 1);

                // Growth. A fire with fuel and air doubles about every forty seconds; suppression
                // is subtracted from the growth rate, not from the fire, which is why holding a
                // fire down needs you to keep standing there.
                const grow = (0.017 * air * (0.45 + fuel) * (1 - suppressed)
                            * (1 - inten / 135) - 0.030 * suppressed)
                           * inten * dt;
                f.intensity[i] = clamp(inten + grow, 0, 100);

                // Fuel goes. This is the only thing that is permanent.
                const eaten = Math.min(fuel, inten * 0.00010 * dt * (1 - suppressed * 0.6));
                f.fuel[i] -= eaten;
                f.burnt[i] = clamp01(f.burnt[i] + eaten * 1.6);
                f.totalBurned += eaten;

                // Smoke. A suppressed fire smokes more, not less, which surprises people.
                const smokeRate = inten * (0.024 + 0.034 * suppressed);
                f.smoke[i] = clamp(f.smoke[i] + smokeRate * dt, 0, 100);
                f.heat[i] = clamp(f.heat[i] + (inten * 0.03 - 0.8) * dt, 0, 100);

                if (f.intensity[i] > f.peakIntensity) f.peakIntensity = f.intensity[i];

                // Spread. Along the bin is fastest, across the aisle is slowest.
                if (f.intensity[i] > 14) {
                    for (const [nx, ny] of cabin.neighbours(x, y)) {
                        const ni = cabin.idx(nx, ny);
                        if (f.fuel[ni] <= 0.02) continue;
                        if (f.intensity[ni] > f.intensity[i] * 0.7) continue;
                        const nSup = clamp01(f.suppress[ni] / 70);
                        let p = f.intensity[i] * f.fuel[ni] * 0.00030 * dt * air * (1 - nSup);
                        if (ny === cabin.AISLE_Y || y === cabin.AISLE_Y) p *= 0.42;  // the aisle is a firebreak
                        if (nx !== x) p *= 1.55;                                     // along the bin
                        if (cabin.kindAt(nx, ny) === "galley") p *= 1.4;
                        // Not a roll: the chance is paid into the tile, and the tile catches when
                        // what it has been paid reaches the mark it was given at boarding.
                        f.spreadAcc[ni] += p;
                        if (f.spreadAcc[ni] >= f.spreadAt[ni]) {
                            spreadTo.push([ni, f.spreadAmt[ni]]);
                            rearmSpread(S, f, ni);
                        }
                    }
                }
            }
        }
        for (const [ni, amount] of spreadTo) {
            if (f.intensity[ni] < 4) spread++;
            f.intensity[ni] = Math.min(100, f.intensity[ni] + amount);
        }

        advanceSmoke(f, dt, S);
        return { vented: vented, spread: spread };
    }

    /** A tile has just caught: reset what it had paid in, and draw its next mark from its own dice. */
    function rearmSpread(S, f, i) {
        const n = ++f.spreadN[i];
        const r = PRS.state.dice(S, "fire:spread:" + i + ":" + n, "mid");
        f.spreadAcc[i] = 0;
        f.spreadAt[i] = r.expo();
        f.spreadAmt[i] = 6 + r() * 8;
    }

    /**
     * Smoke moves four times faster than fire and does not care how big the fire is once it
     * exists. It fills the ceiling first and comes down, so the game keeps one scalar for the
     * layer height and one field for where it is thickest.
     */
    function advanceSmoke(f, dt, S) {
        const next = new Float32Array(N);
        const drift = 0.05;   // fore-aft airflow from the packs: aft is worse, not a grave
        const rate = clamp01(dt * 0.16);
        for (let x = 0; x < cabin.W; x++) {
            for (let y = 0; y < cabin.H; y++) {
                const i = cabin.idx(x, y);
                const s = f.smoke[i];
                if (s <= 0.02) continue;
                if (cabin.solid(x, y)) { next[i] += s * 0.5; continue; }
                let kept = s;
                const ns = cabin.neighbours(x, y).filter(([nx, ny]) => !cabin.solid(nx, ny));
                for (const [nx, ny] of ns) {
                    const ni = cabin.idx(nx, ny);
                    if (f.smoke[ni] >= s) continue;
                    let flow = (s - f.smoke[ni]) * rate / Math.max(1, ns.length);
                    if (nx > x) flow *= (1 + drift);        // aft
                    if (nx < x) flow *= (1 - drift * 0.6);  // forward, against the packs
                    if (ny === cabin.AISLE_Y) flow *= 1.25; // the aisle is the chimney
                    next[ni] += flow;
                    kept -= flow;
                }
                next[i] += kept;
            }
        }
        // The packs scrub a little of it, and the recirculation filters take a little more.
        const scrub = 0.0022 * dt;
        for (let i = 0; i < N; i++) f.smoke[i] = clamp(next[i] * (1 - scrub), 0, 100);
    }

    // ---------------------------------------------------------------------------- inspection ---

    /** What a person standing here would say the fire is doing. Feeds the log and the HUD. */
    function describe(f, x, y) {
        const i = cabin.idx(x, y);
        const v = f.intensity[i];
        if (v <= 0.5) return f.burnt[i] > 0.25 ? T("charred and cold") : T("nothing");
        if (v < 8) return T("smouldering");
        if (v < 22) return T("alight");
        if (v < 45) return T("burning properly");
        if (v < 70) return T("burning hard");
        if (v < 88) return T("an inferno");
        return T("not survivable");
    }

    function describeSmoke(v) {
        if (v < 3) return T("clear");
        if (v < 12) return T("hazy");
        if (v < 30) return T("thick");
        if (v < 55) return T("you cannot see the seat in front");
        if (v < 80) return T("black");
        return T("solid");
    }

    /** The four-sprite fire, picked by intensity. */
    function fireSprite(v) {
        if (v <= 0.5) return null;
        if (v < 6) return "ember";
        if (v < 20) return "fire_1";
        if (v < 45) return "fire_2";
        if (v < 72) return "fire_3";
        return "fire_4";
    }

    function smokeSprite(v) {
        if (v < 6) return null;
        if (v < 26) return "smoke_1";
        if (v < 58) return "smoke_2";
        return "smoke_3";
    }

    /** Seconds until the next cell vents, at the current rate. The lawyer can see this. */
    function ventEta(f) {
        const rate = f.core.rate * (f.core.inSink ? 0.55 : 1) * (1 - 0.35 * f.core.contained)
                   * (1 + 0.10 * f.core.vented) * 0.55;
        if (rate <= 0.0001) return Infinity;
        return (100 - f.core.heat) / rate;
    }

    PRS.fire = {
        AGENTS, create, at, smokeAt, heatAt, worst, burningTiles, totalSmoke, smokeLayer,
        apply, starve, advance, describe, describeSmoke, fireSprite, smokeSprite, ventEta,
    };
})(window);
