// Real-Time First-Person 3D Simulation Engine for Please Remain Seated.
// Coordinates:
//   x: longitudinal station along the cabin (0.0 = Cockpit bulkhead .. 16.5 = Aft Lavatory wall)
//   y: lateral offset across the cabin (-1.35 = Left Window wall, 0.0 = Center of Aisle, +1.35 = Right Window wall)
//   z: vertical height above cabin floor (0.0 = Floor, 2.25 = Cabin Ceiling)
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};
    const { makeRng, hashSeed, seedFromString, clamp, clamp01, lerp } = PRS.util;
    const CAT = PRS.catalog;
    const CABIN = CAT.CABIN;

    function createWorld(opts) {
        opts = opts || {};
        const seedStr = opts.seed ? String(opts.seed).trim() : String(Math.floor(Math.random() * 900000 + 100000));
        const seed = seedFromString(seedStr);
        const rng = makeRng(seed);
        const ch = CAT.charById(opts.charId || "ansel");

        const bagIds = (opts.bag && opts.bag.length === 3) ? opts.bag.slice() : ch.defaultBag.slice();
        for (let i = 0; i < ch.kit.length; i++) {
            if (bagIds.indexOf(ch.kit[i]) < 0) bagIds[i] = ch.kit[i];
        }
        const bag = bagIds.map((id) => makeBagSlot(id));

        const N = CABIN.STATIONS;
        const fire = new Float32Array(N);
        const smoke = new Float32Array(N);
        const wet = new Float32Array(N);
        const masksDropped = new Array(N).fill(false);
        const ventsTaped = new Array(N).fill(false);

        // Fire starts in Row 9 Left Overhead Locker (Station 11, y = -0.85, z = 1.85)
        fire[CABIN.ORIGIN_X] = 24;
        smoke[CABIN.ORIGIN_X] = 20;

        const startX = CABIN.ROW_TO_X[ch.seatRow] || 6;

        // Place the 24 passengers across Left ("A" -> y = -0.85) and Right ("B" -> y = +0.85) seat banks!
        const pax = CAT.PASSENGERS.map((p, idx) => {
            const prng = makeRng(hashSeed(seed, "pax:" + idx));
            const stX = CABIN.ROW_TO_X[p.row];
            const isLeft = p.seat.endsWith("A");
            const seatY = isLeft ? -0.82 : 0.82;
            return {
                id: "p" + idx,
                idx: idx,
                name: p.name,
                row: p.row,
                seat: p.seat,
                side: isLeft ? -1 : 1,
                role: p.role,
                kg: p.kg,
                hair: p.hair,
                shirt: p.shirt,
                skin: prng.pick(["#f2d0b4", "#e5b791", "#d69e72", "#b87b52", "#8d5531"]),
                line: p.line,
                x: stX,
                y: seatY,
                homeX: stX,
                homeY: seatY,
                state: p.role === "sleeper" ? "asleep" : "seated",
                health: 100,
                smokeDose: 0,
                burns: 0,
                panic: prng.range(5, 20),
                convinced: false,
                helper: false,
                helperTarget: null,
                carryingId: null,
                bagBlocking: false,
                streaming: false,
                viralUsed: false,
                confessed: false,
                tipGiven: false,
                headphonesOn: p.role === "sleeper",
                snitchCooldown: prng.range(4, 9),
                bubble: null,
                bubbleTimer: 0
            };
        });

        const crew = [
            {
                id: "c_brenda",
                name: "Purser Brenda",
                x: 4.2,
                y: -0.1,
                patrolMin: 2.0,
                patrolMax: 8.5,
                dir: 1,
                facing: 1,
                mode: "patrol",
                stunTimer: 0,
                cooldown: 0,
                actionTimer: 0,
                bubble: "Fasten your seatbelts, please!",
                bubbleTimer: 3.5,
                skin: "#e5b791",
                hair: "#3f2718"
            },
            {
                id: "c_clive",
                name: "Steward Clive",
                x: 13.5,
                y: 0.1,
                patrolMin: 8.5,
                patrolMax: 15.0,
                dir: -1,
                facing: -1,
                mode: "patrol",
                stunTimer: 0,
                cooldown: 0,
                actionTimer: 0,
                bubble: "Seatbelt sign is illuminated!",
                bubbleTimer: 3.0,
                skin: "#d69e72",
                hair: "#1e293b"
            }
        ];

        // Start player in the aisle facing toward Row 9 (yaw = 0 looks along +x toward tail/fire)
        const initialYaw = startX <= CABIN.ORIGIN_X ? 0.0 : Math.PI;

        const S = {
            seedStr,
            seed,
            rng,
            quiet: !!opts.quiet,
            character: ch,
            clock: {
                total: 180,
                remaining: 180,
                elapsed: 0,
                declared: false,
                landed: false
            },
            player: {
                x: startX,
                y: 0.0,
                z: 0.0,
                vx: 0,
                vy: 0,
                vz: 0,
                yaw: initialYaw,
                pitch: 0.08, // slightly looking at overhead bin level initially
                eyeH: 1.58,
                crouching: false,
                stunTimer: 0,
                lungs: 100,
                burns: 0,
                alive: true,
                holdingCase: false,
                carrying: [],
                bag: bag,
                activeSlot: 0,
                hasPhoto: false,
                useAnim: 0,
                bobPhase: 0,
                bubble: "Locker 9C ahead is smoking!",
                bubbleTimer: 4.0
            },
            credibility: Math.round(ch.stats.voice * 3.5),
            crewAlerted: false,
            detectorTriggered: false,
            paUsed: false,
            galleyItems: {
                fwdHalon: true,
                aftWaterExt: true
            },
            core: {
                x: CABIN.ORIGIN_X,
                y: -0.85,
                z: 1.82,
                inBin: true,
                inSink: false,
                binOpen: false,
                binTaped: false,
                cellsLeft: 6,
                cellTimer: 16,
                heat: 35,
                stage2Blue: false
            },
            fire,
            smoke,
            wet,
            masksDropped,
            ventsTaped,
            cart: {
                x: CABIN.OVERWING_X,
                y: 0.0,
                vx: 0,
                braked: true,
                taped: false
            },
            turb: {
                timer: 22,
                active: 0,
                dir: 1,
                tiltAngle: 0,
                rollAngle: 0
            },
            pax,
            crew,
            fx: [],
            toasts: [],
            stats: {
                savedAtDoors: 0,
                helpersRecruited: 0,
                firesDoused: 0,
                timesTackled: 0,
                cartsJumped: 0,
                declaredAt: null,
                caseSunkAt: null,
                viralUsed: false,
                medals: []
            }
        };

        return S;
    }

    function makeBagSlot(id) {
        const def = CAT.itemById(id);
        if (!def) return null;
        return {
            id: def.id,
            def: def,
            uses: def.startsEmpty ? 0 : def.uses,
            maxUses: def.maxUses || null
        };
    }

    function hasPassive(S, itemId) {
        return S.player.bag.some((s) => s && s.id === itemId);
    }

    function activeItem(S) {
        return S.player.bag[S.player.activeSlot] || null;
    }

    function sayBubble(entity, text, dur) {
        entity.bubble = text;
        entity.bubbleTimer = dur || 2.8;
    }

    function addToast(S, text, kind) {
        S.toasts.unshift({ text, kind: kind || "info", timer: 4.0 });
        if (S.toasts.length > 4) S.toasts.pop();
    }

    function addFx(S, fxObj) {
        S.fx.push(Object.assign({ t: 0, dur: 0.45 }, fxObj));
    }

    // ------------------------------------------------------------------------- Main Real-Time Step ---
    function stepWorld(S, dt, input) {
        if (S.clock.landed) return;
        dt = Math.min(dt, 0.1);
        input = input || {};

        S.clock.elapsed += dt;
        S.clock.remaining = Math.max(0, S.clock.remaining - dt);

        if (S.clock.remaining <= 0) {
            landAircraft(S);
            return;
        }

        if (S.player.bubbleTimer > 0) S.player.bubbleTimer = Math.max(0, S.player.bubbleTimer - dt);
        if (S.player.useAnim > 0) S.player.useAnim = Math.max(0, S.player.useAnim - dt * 3.2);
        for (const t of S.toasts) t.timer -= dt;
        S.toasts = S.toasts.filter((t) => t.timer > 0);
        for (const f of S.fx) f.t += dt;
        S.fx = S.fx.filter((f) => f.t < f.dur);

        stepTurbulenceAndCart(S, dt);
        stepFireAndSmoke(S, dt);
        stepPlayer3D(S, dt, input);
        stepCrew(S, dt);
        stepPassengers(S, dt);

        if (!S.quiet) {
            let maxF = 0;
            for (let i = 0; i < CABIN.STATIONS; i++) if (S.fire[i] > maxF) maxF = S.fire[i];
            PRS.audio.setRoar(clamp01(maxF / 85));
        }
    }

    function stepTurbulenceAndCart(S, dt) {
        const tb = S.turb;
        if (tb.active > 0) {
            tb.active = Math.max(0, tb.active - dt);
            const targetTilt = tb.dir * 4.8;
            tb.tiltAngle = lerp(tb.tiltAngle, targetTilt, dt * 5);
            tb.rollAngle = Math.sin(S.clock.elapsed * 5.5) * 4.2;
            if (!S.cart.taped && !S.cart.braked) {
                S.cart.vx += tb.dir * 4.6 * dt;
            }
            if (tb.active <= 0) {
                S.cart.braked = true;
            }
        } else {
            tb.tiltAngle = lerp(tb.tiltAngle, 0, dt * 6);
            tb.rollAngle = lerp(tb.rollAngle, 0, dt * 6);
            tb.timer -= dt;
            if (tb.timer <= 0) {
                const trng = makeRng(hashSeed(S.seed, "turb:" + Math.floor(S.clock.elapsed)));
                tb.timer = trng.range(24, 34);
                tb.active = trng.range(4.0, 5.5);
                tb.dir = trng.chance(0.55) ? 1 : -1;
                if (!S.cart.taped && S.cart.x > 1.8 && S.cart.x < 14.5) {
                    S.cart.braked = false;
                    addToast(S, "⚠️ TURBULENCE! The 200kg Beverage Cart is rolling down the aisle! Jump [Space]!", "warn");
                } else {
                    addToast(S, "⚠️ TURBULENCE! Hold on!", "warn");
                }
                if (!S.quiet) PRS.audio.play("chime");
            }
        }

        if (Math.abs(S.cart.vx) > 0.05) {
            S.cart.x += S.cart.vx * dt;
            S.cart.vx *= Math.pow(0.45, dt);
            if (S.cart.x <= 1.6) { S.cart.x = 1.6; S.cart.vx = 0; S.cart.braked = true; }
            if (S.cart.x >= 14.6) { S.cart.x = 14.6; S.cart.vx = 0; S.cart.braked = true; }

            const P = S.player;
            if (Math.abs(P.x - S.cart.x) < 0.45 && Math.abs(P.y) < 0.42 && Math.abs(S.cart.vx) > 1.1) {
                if (P.z > 0.32) {
                    if (!S.cart._jumpedThisRoll) {
                        S.cart._jumpedThisRoll = true;
                        S.stats.cartsJumped++;
                        S.credibility = Math.min(100, S.credibility + 6);
                        addToast(S, "🤸 Vaulted right over the runaway Beverage Cart! (+6 Credibility)", "good");
                        if (!S.quiet) PRS.audio.play("good");
                    }
                } else if (P.stunTimer <= 0) {
                    P.stunTimer = 1.0;
                    P.vx = Math.sign(S.cart.vx) * 4.2;
                    S.cart.vx *= -0.3;
                    addToast(S, "💥 Clobbered by the runaway Beverage Cart! Press [Space] to jump over it!", "warn");
                    if (!S.quiet) PRS.audio.play("thud");
                }
            }
        } else {
            S.cart.vx = 0;
            S.cart._jumpedThisRoll = false;
        }
    }

    function stepFireAndSmoke(S, dt) {
        const core = S.core;
        const P = S.player;

        if (P.holdingCase) {
            core.x = clamp(P.x + Math.cos(P.yaw) * 0.35, 1, CABIN.STATIONS - 1.5);
            core.y = clamp(P.y + Math.sin(P.yaw) * 0.35, -0.8, 0.8);
            core.z = P.eyeH - 0.25;
        }

        if (!core.inSink) {
            const o2Factor = (core.inBin && !core.binOpen)
                ? (core.binTaped ? 0.28 : 0.52)
                : 1.0;

            core.heat = clamp(core.heat + dt * 3.8 * o2Factor, 10, 100);
            core.cellTimer -= dt * o2Factor * (0.65 + core.heat / 110);

            if (core.cellTimer <= 0 && core.cellsLeft > 0) {
                core.cellsLeft--;
                core.cellTimer = 15 + (core.cellsLeft * 1.5);
                const cx = clamp(Math.round(core.x), 1, CABIN.STATIONS - 2);
                S.fire[cx] = Math.min(100, S.fire[cx] + 32);
                S.smoke[cx] = Math.min(100, S.smoke[cx] + 24);
                if (cx > 1) S.fire[cx - 1] = Math.min(100, S.fire[cx - 1] + 14);
                if (cx < CABIN.STATIONS - 2) S.fire[cx + 1] = Math.min(100, S.fire[cx + 1] + 14);

                if (core.inBin && !core.binOpen && !core.binTaped && core.cellsLeft <= 4) {
                    core.binOpen = true;
                    addToast(S, "💥 BANG! A lithium cell blew Locker 9C wide open!", "bad");
                } else {
                    addToast(S, "⚡ POP! Another lithium cell vented! (" + core.cellsLeft + " left)", "warn");
                }

                addFx(S, { kind: "sparks", x: core.x, y: core.y, z: core.z, dur: 0.7 });
                if (!S.quiet) PRS.audio.play("pop");
            }

            if (!core.stage2Blue && (S.clock.elapsed >= 78 || core.cellsLeft <= 2) && core.heat > 58) {
                core.stage2Blue = true;
                core.binOpen = true;
                core.binTaped = false;
                addToast(S, "🔵 STAGE 2 THERMAL RUNAWAY! Blue lithium jet! Grab case [Right-Click / E] & dunk in Aft Lavatory Sink!", "bad");
                if (!S.quiet) PRS.audio.play("flare");
            }

            const cx = clamp(Math.round(core.x), 1, CABIN.STATIONS - 2);
            const feed = core.stage2Blue ? 18 : (10 * o2Factor);
            S.fire[cx] = Math.min(100, S.fire[cx] + feed * dt);
            S.smoke[cx] = Math.min(100, S.smoke[cx] + (feed * 1.15) * dt);
        } else {
            core.stage2Blue = false;
            core.heat = Math.max(10, core.heat - dt * 15);
        }

        const nextFire = new Float32Array(S.fire);
        const nextSmoke = new Float32Array(S.smoke);

        for (let i = 0; i < CABIN.STATIONS; i++) {
            if (S.wet[i] > 0) {
                S.wet[i] = Math.max(0, S.wet[i] - dt * (1.2 + S.fire[i] * 0.04));
            }

            const f = S.fire[i];
            if (f > 0.5) {
                const isBlueCore = core.stage2Blue && !core.inSink && Math.round(core.x) === i;
                const growth = isBlueCore ? 8.0 : (f > 12 ? 2.4 : -1.5) * (1 - S.wet[i] / 130);
                nextFire[i] = clamp(nextFire[i] + growth * dt, isBlueCore ? 55 : 0, 100);

                const ventMul = S.ventsTaped[i] ? 0.55 : 1.0;
                nextSmoke[i] = clamp(nextSmoke[i] + (f * 0.19 * ventMul) * dt, 0, 100);

                if (f > 36) {
                    const spreadRate = (f - 32) * 0.055 * dt;
                    for (const ni of [i - 1, i + 1]) {
                        if (ni >= 1 && ni <= CABIN.STATIONS - 2) {
                            const resist = 1 - S.wet[ni] / 110;
                            if (resist > 0) nextFire[ni] = clamp(nextFire[ni] + spreadRate * resist, 0, 100);
                        }
                    }
                }
            }

            const s = S.smoke[i];
            if (s > 2) {
                for (const ni of [i - 1, i + 1]) {
                    if (ni >= 0 && ni < CABIN.STATIONS && s > S.smoke[ni]) {
                        const flow = (s - S.smoke[ni]) * 0.38 * dt;
                        nextSmoke[ni] += flow * 0.85;
                        nextSmoke[i] -= flow * 0.35;
                    }
                }
            }

            if (i === CABIN.FWD_EXIT_X || i === CABIN.AFT_EXIT_X) {
                nextSmoke[i] = Math.max(0, nextSmoke[i] - 1.8 * dt);
            }
        }

        for (let i = 0; i < CABIN.STATIONS; i++) {
            S.fire[i] = clamp(nextFire[i], 0, 100);
            S.smoke[i] = clamp(nextSmoke[i], 0, 100);
        }

        if (!S.detectorTriggered && S.smoke[CABIN.LAV_X] > 28) {
            triggerSmokeDetector(S, false);
        }
    }

    // Physical height of the bottom of the ceiling smoke layer at station `stIdx` (in meters, 2.25m = ceiling, 0.35m = floor)
    function smokeCeilingHeightAt(S, stIdx) {
        const s = S.smoke[clamp(Math.round(stIdx), 0, CABIN.STATIONS - 1)];
        return 2.25 - clamp01(s / 100) * 1.85;
    }

    function triggerSmokeDetector(S, byPlayer) {
        if (S.detectorTriggered) return;
        S.detectorTriggered = true;
        S.credibility = Math.min(100, S.credibility + 35);
        alertCrew(S, byPlayer
            ? "🚨 BEEP-BEEP-BEEP! You set off the Lavatory Smoke Alarm! Cockpit & Crew alerted!"
            : "🚨 BEEP-BEEP-BEEP! Smoke reached the Lavatory Detector! Crew alerted!");
        if (!S.quiet) PRS.audio.play("alarm");
    }

    function alertCrew(S, toastMsg) {
        const wasAlerted = S.crewAlerted;
        S.crewAlerted = true;
        S.credibility = Math.max(S.credibility, 65);
        for (const c of S.crew) {
            c.mode = "emergency";
            sayBubble(c, "CODE RED! It's a lithium fire! Evacuate!", 3.5);
        }
        if (!wasAlerted) {
            if (toastMsg) addToast(S, toastMsg, "good");
            awardMedal(S, "crew_flipped");
            if (!S.clock.declared) {
                S.clock.remaining = Math.max(12, S.clock.remaining - 20);
            }
        }
    }

    function declareEmergency(S, sourceText) {
        if (S.clock.declared) return;
        S.clock.declared = true;
        S.stats.declaredAt = S.clock.elapsed;
        alertCrew(S, null);
        const cut = Math.min(45, Math.max(10, S.clock.remaining - 12));
        S.clock.remaining -= cut;
        addToast(S, "✈️ MAYDAY DECLARED! " + sourceText + " (-" + Math.round(cut) + "s steep descent!)", "good");
        if (S.clock.elapsed <= 60) awardMedal(S, "declared_fast");
        if (!S.quiet) PRS.audio.play("pa");
    }

    // -------------------------------------------------------- First-Person 3D Movement & Controls ---
    function stepPlayer3D(S, dt, input) {
        const P = S.player;
        if (!P.alive) return;

        // Apply mouse look deltas + keyboard turn keys (Q/E or Left/Right arrows)
        if (input.lookYaw) P.yaw += input.lookYaw;
        if (input.lookPitch) P.pitch = clamp(P.pitch + input.lookPitch, -1.15, 1.15);
        if (input.turnLeft) P.yaw -= 2.3 * dt;
        if (input.turnRight) P.yaw += 2.3 * dt;

        if (input.slot !== undefined && input.slot !== null && P.bag[input.slot]) {
            P.activeSlot = input.slot;
        }

        if (P.stunTimer > 0) {
            P.stunTimer = Math.max(0, P.stunTimer - dt);
            P.x = clamp(P.x + P.vx * dt, 0.35, CABIN.STATIONS - 0.45);
            P.vx *= Math.pow(0.08, dt);
        } else {
            const forwardInput = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
            const strafeInput = (input.strafeRight ? 1 : 0) - (input.strafeLeft ? 1 : 0);
            P.crouching = !!input.crouch && P.z <= 0.02;

            // Direction vectors in the horizontal (x, y) cabin plane
            // yaw = 0 points along +x (toward Aft / Row 9 / Lavatory), +y is Right seat bank
            const cosY = Math.cos(P.yaw);
            const sinY = Math.sin(P.yaw);
            let wishX = forwardInput * cosY - strafeInput * sinY;
            let wishY = forwardInput * sinY + strafeInput * cosY;
            const wishLen = Math.hypot(wishX, wishY);
            if (wishLen > 1) {
                wishX /= wishLen;
                wishY /= wishLen;
            }

            let baseSpeed = 3.1 + S.character.stats.speed * 0.22;
            if (P.crouching) baseSpeed *= 0.65;
            if (P.carrying.length > 0) {
                const carryPenalty = S.character.stats.strength >= 10 ? 0.92 : (0.76 - (P.carrying.length - 1) * 0.18);
                baseSpeed *= carryPenalty;
            }
            if (P.holdingCase) baseSpeed *= 0.88;

            const nextX = P.x + wishX * baseSpeed * dt;
            if (Math.abs(wishX) > 0.01 && P.z < 0.28 && isBlockedAt(S, nextX, P.y)) {
                baseSpeed *= 0.16;
            }

            P.vx = wishX * baseSpeed;
            P.vy = wishY * baseSpeed * 1.35;

            P.x = clamp(P.x + P.vx * dt, 0.35, CABIN.STATIONS - 0.45);

            // Constrain lateral movement `y` (wider in cross-aisles/galleys, narrower in seat aisle unless jumping/leaning)
            const st = Math.round(P.x);
            const isCrossAisle = (st === CABIN.FWD_EXIT_X || st === CABIN.OVERWING_X || st === CABIN.AFT_EXIT_X || st === CABIN.LAV_X);
            const maxY = isCrossAisle ? 0.92 : (P.z > 0.25 ? 0.78 : 0.46);
            P.y = clamp(P.y + P.vy * dt, -maxY, maxY);

            if (wishLen > 0.1 && P.z <= 0.02) {
                P.bobPhase += dt * (P.crouching ? 6 : 10);
            }

            // Jump / Vault [Space]
            if (input.jump && P.z <= 0.01) {
                P.vz = 3.9;
                P.crouching = false;
                if (!S.quiet) PRS.audio.play("jump");
            }
        }

        // Vertical jump physics
        if (P.z > 0 || P.vz !== 0) {
            P.z += P.vz * dt;
            P.vz -= 10.5 * dt;
            if (P.z <= 0) {
                P.z = 0;
                P.vz = 0;
            }
        }

        // Smooth eye height (1.60m standing, 0.82m crouched, + jump z + subtle walk bob)
        const targetEye = (P.crouching ? 0.80 : 1.58) + P.z * 0.75 + Math.sin(P.bobPhase) * 0.025;
        P.eyeH = lerp(P.eyeH, targetEye, Math.min(1, dt * 14));

        // Update carried passengers
        for (const id of P.carrying) {
            const px = S.pax.find((q) => q.id === id);
            if (px) {
                px.x = P.x;
                px.y = P.y;
                px.state = "carried";
            }
        }

        // Smoke & burn exposure based on actual 3D eye height vs ceiling smoke layer height!
        const stIdx = clamp(Math.round(P.x), 0, CABIN.STATIONS - 1);
        const smk = S.smoke[stIdx];
        const flm = S.fire[stIdx];
        const smokeBottomZ = smokeCeilingHeightAt(S, stIdx);
        const headInSmoke = P.eyeH > smokeBottomZ + 0.05;
        const hoodFactor = hasPassive(S, "hood") ? 0.1 : 1.0;
        const lungFactor = 1.35 - S.character.stats.lungs * 0.07;

        if (headInSmoke && smk > 22) {
            const intake = (smk - 18) * 0.12 * hoodFactor * lungFactor * dt;
            P.lungs = Math.max(0, P.lungs - intake);
        } else if (smk < 20 && P.lungs < 100) {
            P.lungs = Math.min(100, P.lungs + 4.5 * dt);
        }

        const hasGloves = hasPassive(S, "gloves");
        if (P.holdingCase && !hasGloves) {
            P.burns = Math.min(100, P.burns + (S.core.stage2Blue ? 9.5 : 5.5) * dt);
        }
        if (flm > 22 && P.z < 0.2) {
            P.burns = Math.min(100, P.burns + (flm - 20) * (hasGloves ? 0.05 : 0.11) * dt);
        }

        if (P.stunTimer <= 0) {
            if (input.grabPressed) {
                P.useAnim = 1.0;
                performGrabOrDrop(S);
            }
            if (input.usePressed) {
                P.useAnim = 1.0;
                performInteract(S);
            }
        }

        if (P.lungs <= 0 || P.burns >= 100) {
            P.alive = false;
            P.holdingCase = false;
            P.carrying = [];
            addToast(S, "💀 You collapsed from smoke & burns! The remaining seconds play out...", "bad");
            if (!S.quiet) PRS.audio.play("bad");
        }
    }

    function isBlockedAt(S, x, y) {
        if (Math.abs(y) < 0.48 && Math.abs(x - S.cart.x) < 0.38 && Math.abs(S.player.x - S.cart.x) >= 0.38) {
            return true;
        }
        for (const p of S.pax) {
            if (p.bagBlocking && p.state === "aisle" && Math.abs(x - p.x) < 0.36 && Math.abs(S.player.x - p.x) >= 0.36) {
                return true;
            }
        }
        return false;
    }

    // ---------------------------------------------------- 3D Look Raycast & Contextual Prompts ---
    // Computes how closely the player's 3D look ray `(yaw, pitch)` aligns with a 3D point `(tx, ty, tz)`.
    function lookScoreAt(S, tx, ty, tz, maxDist) {
        const P = S.player;
        const dx = tx - P.x;
        const dy = ty - P.y;
        const dz = (tz - P.eyeH) * 0.85; // scale vertical meters to station units
        const dist = Math.hypot(dx, dy, dz);
        if (dist > (maxDist || 2.1)) return -1;
        if (dist < 0.001) return 1;

        const lookX = Math.cos(P.pitch) * Math.cos(P.yaw);
        const lookY = Math.cos(P.pitch) * Math.sin(P.yaw);
        const lookZ = Math.sin(P.pitch);

        const dot = (dx * lookX + dy * lookY + dz * lookZ) / dist;
        if (dot < 0.42) return -1; // outside ~65-degree forward view cone
        return dot * 2.0 - dist * 0.45;
    }

    function maxCarryCount(S) {
        return S.character.stats.strength >= 10 ? 2 : 1;
    }

    function getPrompts(S) {
        const P = S.player;
        if (!P.alive || S.clock.landed) return { e: null, f: null };
        return {
            e: computeGrabPrompt(S),
            f: computeUsePrompt(S)
        };
    }

    function computeGrabPrompt(S) {
        const P = S.player;

        if (P.holdingCase) {
            if (Math.abs(P.x - CABIN.LAV_X) <= 1.35) {
                return { label: "Dunk Case in Lavatory Sink!", x: CABIN.LAV_X, y: -0.7, z: 1.0, kind: "sink_dunk", urgent: true };
            }
            return { label: "Drop Burning Case", x: P.x + Math.cos(P.yaw) * 0.6, y: P.y, z: 0.4, kind: "drop_case" };
        }

        if (P.carrying.length > 0) {
            if (P.carrying.length < maxCarryCount(S)) {
                const extraPax = bestLookCarriablePax(S, 1.5);
                if (extraPax) {
                    return { label: "Grab 2nd: " + extraPax.name.split(" ")[0], x: extraPax.x, y: extraPax.y, z: 1.0, kind: "carry_pax", target: extraPax, urgent: true };
                }
            }
            const atDoor = Math.abs(P.x - CABIN.FWD_EXIT_X) <= 1.35 || Math.abs(P.x - CABIN.AFT_EXIT_X) <= 1.35;
            return {
                label: atDoor ? "Place Safe on Exit Floor!" : "Put Passenger Down",
                x: P.x, y: P.y, z: 0.4,
                kind: "drop_pax",
                urgent: atDoor
            };
        }

        // Near burning lithium case (in open bin 9C or dropped on floor)
        if (!S.core.inSink && (!S.core.inBin || S.core.binOpen)) {
            const sc = lookScoreAt(S, S.core.x, S.core.y, S.core.inBin ? 1.82 : 0.35, 1.85);
            if (sc > 0 || Math.abs(P.x - S.core.x) <= 0.95) {
                return {
                    label: hasPassive(S, "gloves") ? "Grab Burning Case (Gloves Safe!)" : "Yank Burning Case (HOT!)",
                    x: S.core.x, y: S.core.y, z: S.core.inBin ? 1.82 : 0.35,
                    kind: "grab_case",
                    urgent: true
                };
            }
        }

        // Galley Extinguishers
        if (Math.abs(P.x - CABIN.FWD_EXIT_X) <= 1.25 && S.galleyItems.fwdHalon) {
            return { label: "Take Halon Extinguisher", x: CABIN.FWD_EXIT_X, y: -0.85, z: 1.2, kind: "take_halon", urgent: true };
        }
        if (Math.abs(P.x - CABIN.AFT_EXIT_X) <= 1.25 && S.galleyItems.aftWaterExt) {
            return { label: "Take Water Extinguisher", x: CABIN.AFT_EXIT_X, y: 0.85, z: 1.2, kind: "take_water_ext", urgent: true };
        }

        const paxTarget = bestLookCarriablePax(S, 1.65);
        if (paxTarget) {
            return {
                label: "Carry " + paxTarget.name.split(" ")[0],
                x: paxTarget.x, y: paxTarget.y, z: 1.0,
                kind: "carry_pax",
                target: paxTarget,
                urgent: paxTarget.state === "down" || paxTarget.role === "frail" || paxTarget.role === "child" || paxTarget.role === "pet"
            };
        }

        return null;
    }

    function bestLookCarriablePax(S, maxDist) {
        const P = S.player;
        let best = null;
        let bestScore = -999;
        for (const p of S.pax) {
            if (p.state === "dead" || p.state === "carried" || p.state === "safe" || p.helper) continue;
            if (P.carrying.indexOf(p.id) >= 0) continue;
            const pz = p.state === "down" ? 0.35 : 1.05;
            const lookSc = lookScoreAt(S, p.x, p.y, pz, maxDist);
            if (lookSc < 0) continue;
            let prio = lookSc * 25;
            if (p.state === "down") prio += 30;
            else if (p.role === "child" || p.role === "pet" || p.role === "frail") prio += 18;
            if (prio > bestScore) {
                bestScore = prio;
                best = p;
            }
        }
        return best;
    }

    function computeUsePrompt(S) {
        const P = S.player;
        const item = activeItem(S);

        // 1. Holding burning case near Lavatory Sink
        if (P.holdingCase && Math.abs(P.x - CABIN.LAV_X) <= 1.4) {
            return { label: "Dunk Case in Lavatory Sink!", x: CABIN.LAV_X, y: -0.75, z: 1.0, kind: "sink_dunk", urgent: true };
        }

        // 2. At Aft Lavatory: Ceiling Smoke Detector or Sink Tap
        if (Math.abs(P.x - CABIN.LAV_X) <= 1.35) {
            if (!S.detectorTriggered && (P.pitch > 0.15 || !findRefillableSlot(S))) {
                return { label: "Set Off Ceiling Smoke Detector!", x: CABIN.LAV_X, y: 0, z: 2.15, kind: "trigger_detector", urgent: true };
            }
            const refillSlot = findRefillableSlot(S);
            if (refillSlot) {
                return {
                    label: refillSlot.id === "bin_liner" ? "Fill 9L Water Bomb at Sink!" : "Refill Water at Sink Tap",
                    x: CABIN.LAV_X, y: -0.75, z: 1.0,
                    kind: "refill_tap",
                    slot: refillSlot,
                    urgent: true
                };
            }
            if (!S.detectorTriggered) {
                return { label: "Set Off Ceiling Smoke Detector!", x: CABIN.LAV_X, y: 0, z: 2.15, kind: "trigger_detector", urgent: true };
            }
        }

        // 3. At Cockpit Door (x <= 1.2)
        if (P.x <= 1.25 && Math.cos(P.yaw) < -0.2 && !S.clock.declared) {
            if (S.crewAlerted || P.hasPhoto || S.credibility >= 50) {
                return { label: "Alert Cockpit: Declare Mayday (-45s!)", x: 0.1, y: 0, z: 1.3, kind: "cockpit_declare", urgent: true };
            }
            return { label: "Pound on Cockpit Door (Need Proof!)", x: 0.1, y: 0, z: 1.3, kind: "cockpit_knock" };
        }

        // 4. Forward Galley Tap
        if (Math.abs(P.x - CABIN.FWD_EXIT_X) <= 1.1) {
            const refillSlot = findRefillableSlot(S);
            if (refillSlot) {
                return {
                    label: refillSlot.id === "bin_liner" ? "Fill 9L Water Bomb at Galley Tap!" : "Refill Water at Galley Tap",
                    x: CABIN.FWD_EXIT_X, y: -0.85, z: 1.0,
                    kind: "refill_tap",
                    slot: refillSlot
                };
            }
        }

        // 5. Aft Galley PA Handset
        if (Math.abs(P.x - CABIN.AFT_EXIT_X) <= 1.15 && !S.paUsed && (S.credibility >= 40 || P.hasPhoto || S.crewAlerted)) {
            return { label: "Use PA Handset: Order Evacuation!", x: CABIN.AFT_EXIT_X, y: 0.85, z: 1.35, kind: "use_pa", urgent: true };
        }

        // 6. Active Item Contextual Actions
        const nearFireX = findNearestFireStation(S, P.x, 1.85);

        if (item) {
            if (item.id === "phone" && !P.hasPhoto && (nearFireX !== null || Math.abs(P.x - S.core.x) <= 2.2)) {
                return { label: "📸 Snap Photo of Fire (Proof!)", x: S.core.x, y: S.core.y, z: 1.7, kind: "snap_photo", urgent: true };
            }

            if (item.id === "tape" && item.uses > 0) {
                if (S.core.inBin && !S.core.binTaped && Math.abs(P.x - S.core.x) <= 1.35) {
                    return { label: "🧻 Tape Bin 9C Shut (-70% O2!)", x: S.core.x, y: -0.85, z: 1.82, kind: "tape_bin", urgent: true };
                }
                if (Math.abs(P.x - S.cart.x) <= 1.2 && !S.cart.taped) {
                    return { label: "🧻 Tape Beverage Cart Brake", x: S.cart.x, y: 0, z: 0.8, kind: "tape_cart" };
                }
                const st = clamp(Math.round(P.x), 2, 14);
                if (!S.ventsTaped[st] && S.smoke[st] > 15) {
                    return { label: "🧻 Seal Overhead Vents Here", x: st, y: 0, z: 2.0, kind: "tape_vents" };
                }
            }

            if (item.id === "multitool") {
                const st = clamp(Math.round(P.x), 2, 14);
                if (!S.masksDropped[st] && CABIN.X_TO_ROW[st]) {
                    return { label: "🔧 Drop Oxygen Masks (Row " + CABIN.X_TO_ROW[st] + ")", x: st, y: 0, z: 1.9, kind: "drop_masks", urgent: S.smoke[st] > 25 };
                }
            }

            if ((item.id === "water_bottle" || item.id === "bin_liner" || item.id === "halon" || item.id === "water_ext") && item.uses > 0) {
                if (nearFireX !== null) {
                    return {
                        label: item.def.icon + " Douse Fire with " + item.def.short,
                        x: nearFireX, y: -0.7, z: 1.5,
                        kind: "douse_fire",
                        fireX: nearFireX,
                        urgent: true
                    };
                }
            }

            if (item.id === "leaf_blower" && item.uses > 0) {
                const st = clamp(Math.round(P.x), 1, 15);
                if (S.smoke[st] > 16 || Math.abs(P.x - S.cart.x) <= 1.8) {
                    return { label: "💨 Blast Smoke & Aisle Clear!", x: P.x + Math.cos(P.yaw), y: 0, z: 1.4, kind: "use_blower", urgent: true };
                }
            }

            if (item.id === "air_horn" && item.uses > 0) {
                const hasTarget = S.crew.some((c) => c.mode === "chase" && Math.abs(c.x - P.x) <= 3.5) ||
                    S.pax.some((p) => Math.abs(p.x - P.x) <= 3.5 && (p.state === "asleep" || p.bagBlocking || p.role === "snitch"));
                if (hasTarget) {
                    return { label: "📢 BLAST AIR HORN!", x: P.x + Math.cos(P.yaw), y: 0, z: 1.3, kind: "use_horn", urgent: true };
                }
            }

            if (item.id === "first_aid" && item.uses > 0) {
                const hurtPax = S.pax.find((p) => Math.abs(p.x - P.x) <= 1.35 && p.state !== "dead" && (p.state === "down" || p.smokeDose > 35 || p.burns > 15));
                if (hurtPax) {
                    return { label: "🧰 Revive & Recruit " + hurtPax.name.split(" ")[0], x: hurtPax.x, y: hurtPax.y, z: 0.9, kind: "heal_pax", target: hurtPax, urgent: true };
                }
                if (P.burns > 20 || P.lungs < 75) {
                    return { label: "🧰 Use Medkit on Yourself", x: P.x, y: P.y, z: 1.0, kind: "heal_self" };
                }
            }
        }

        // 7. Overhead Bin 9C Direct Interaction
        if (S.core.inBin && lookScoreAt(S, S.core.x, S.core.y, 1.82, 1.85) > 0) {
            if (!S.core.binOpen) {
                return { label: "Open Smoking Bin 9C (Inspect / Grab Case)", x: S.core.x, y: -0.85, z: 1.82, kind: "open_bin", urgent: true };
            } else {
                return { label: "Slam Bin 9C Shut (Starve Oxygen)", x: S.core.x, y: -0.85, z: 1.82, kind: "close_bin" };
            }
        }

        // 8. Convince nearby Flight Attendant
        const nearCrew = S.crew.find((c) => lookScoreAt(S, c.x, c.y, 1.3, 2.0) > 0 && !S.crewAlerted);
        if (nearCrew) {
            if (P.hasPhoto || S.credibility >= 45 || S.fire[Math.round(nearCrew.x)] > 10 || S.smoke[Math.round(nearCrew.x)] > 25) {
                return { label: P.hasPhoto ? "📸 Show Fire Photo to " + nearCrew.name : "Alert " + nearCrew.name + " to Fire!", x: nearCrew.x, y: nearCrew.y, z: 1.4, kind: "convince_crew", target: nearCrew, urgent: true };
            }
        }

        // 9. Interact with Passenger in 3D view
        const nearPax = findBestLookInteractPax(S, 1.85);
        if (nearPax) {
            return buildPaxInteractPrompt(S, nearPax);
        }

        // 10. Shove Beverage Cart
        if (lookScoreAt(S, S.cart.x, 0, 0.8, 1.55) > 0) {
            return { label: "Shove Beverage Cart Down Aisle", x: S.cart.x, y: 0, z: 0.8, kind: "shove_cart" };
        }

        return null;
    }

    function findRefillableSlot(S) {
        const act = activeItem(S);
        if (act && act.def.refillable && act.uses < act.maxUses) return act;
        return S.player.bag.find((s) => s && s.def.refillable && s.uses < s.maxUses) || null;
    }

    function findNearestFireStation(S, x, radius) {
        let best = null;
        let bestInt = 5;
        for (let i = 1; i < CABIN.STATIONS - 1; i++) {
            if (Math.abs(i - x) <= radius && S.fire[i] > bestInt) {
                bestInt = S.fire[i];
                best = i;
            }
        }
        return best;
    }

    function findBestLookInteractPax(S, maxDist) {
        let best = null;
        let bestPrio = -999;
        for (const p of S.pax) {
            if (p.state === "dead" || p.state === "carried" || p.state === "safe" || p.helper) continue;
            const lookSc = lookScoreAt(S, p.x, p.y, 1.15, maxDist);
            if (lookSc < 0) continue;
            let prio = lookSc * 20;
            if (p.bagBlocking) prio += 35;
            else if (p.role === "culprit" && !p.confessed) prio += 32;
            else if (p.role === "expert" && !p.tipGiven) prio += 30;
            else if (p.role === "influencer" && !p.viralUsed) prio += 28;
            else if (p.state === "asleep" || p.headphonesOn) prio += 24;
            else if (p.role === "able" || p.role === "sceptic" || p.role === "snitch") prio += 18;
            else continue;

            if (prio > bestPrio) {
                bestPrio = prio;
                best = p;
            }
        }
        return best;
    }

    function buildPaxInteractPrompt(S, p) {
        const P = S.player;
        if (p.bagBlocking) {
            return { label: "Chuck " + p.name.split(" ")[0] + "'s Suitcase Out of Aisle!", x: p.x, y: p.y, z: 0.9, kind: "pax_interact", target: p, urgent: true };
        }
        if (p.role === "culprit" && !p.confessed) {
            return { label: "Confront Chip About His Bag! (+35 Cred)", x: p.x, y: p.y, z: 1.1, kind: "pax_interact", target: p, urgent: true };
        }
        if (p.role === "expert" && !p.tipGiven) {
            return { label: "Ask Veteran Pilot Wilbur (+25 Cred)", x: p.x, y: p.y, z: 1.1, kind: "pax_interact", target: p, urgent: true };
        }
        if (p.role === "influencer" && !p.viralUsed) {
            return { label: "📸 Show Fire to " + p.name.split(" ")[0] + "'s Livestream! (+35 Cred)", x: p.x, y: p.y, z: 1.2, kind: "pax_interact", target: p, urgent: true };
        }
        if (p.state === "asleep" || p.headphonesOn) {
            return { label: "Yank " + p.name.split(" ")[0] + "'s Headphones Off!", x: p.x, y: p.y, z: 1.1, kind: "pax_interact", target: p, urgent: true };
        }
        if (p.role === "sceptic" && !p.convinced) {
            const canProve = P.hasPhoto || S.core.binOpen || S.smoke[Math.round(p.x)] > 25;
            return {
                label: canProve ? "📸 Prove Fire & Recruit " + p.name.split(" ")[0] : "Argue with Sceptic (Need Photo/Smoke!)",
                x: p.x, y: p.y, z: 1.1,
                kind: "pax_interact",
                target: p,
                urgent: canProve
            };
        }
        if (p.role === "snitch") {
            return { label: "Calm Snitch " + p.name.split(" ")[0] + " Down", x: p.x, y: p.y, z: 1.1, kind: "pax_interact", target: p };
        }
        return { label: "Recruit " + p.name.split(" ")[0] + " as Helper!", x: p.x, y: p.y, z: 1.1, kind: "pax_interact", target: p, urgent: true };
    }

    function performGrabOrDrop(S) {
        const prompt = computeGrabPrompt(S);
        if (!prompt) return false;
        const P = S.player;

        if (prompt.kind === "sink_dunk") return dunkCaseInSink(S);

        if (prompt.kind === "drop_case") {
            P.holdingCase = false;
            S.core.x = clamp(P.x + Math.cos(P.yaw) * 0.5, 1, CABIN.STATIONS - 2);
            S.core.y = 0;
            S.core.z = 0.25;
            S.core.inBin = false;
            if (!S.quiet) PRS.audio.play("drop");
            return true;
        }
        if (prompt.kind === "grab_case") {
            P.holdingCase = true;
            S.core.inBin = false;
            S.core.binOpen = true;
            const hasGloves = hasPassive(S, "gloves");
            if (!hasGloves) {
                P.burns = Math.min(100, P.burns + 14);
                if (!S.quiet) PRS.audio.play("sizzle");
            } else {
                if (!S.quiet) PRS.audio.play("grab");
            }
            S.credibility = Math.min(100, S.credibility + 20);
            addToast(S, "🔥 Holding the burning vape case! Sprint to the AFT LAVATORY SINK at the back of the plane!", "warn");
            return true;
        }
        if (prompt.kind === "take_halon") {
            S.galleyItems.fwdHalon = false;
            equipOrSwapItem(S, "halon");
            addToast(S, "🧯 Grabbed the Galley Halon Extinguisher!", "good");
            if (!S.quiet) PRS.audio.play("grab");
            return true;
        }
        if (prompt.kind === "take_water_ext") {
            S.galleyItems.aftWaterExt = false;
            equipOrSwapItem(S, "water_ext");
            addToast(S, "🚿 Grabbed the Pressurized Water Extinguisher!", "good");
            if (!S.quiet) PRS.audio.play("grab");
            return true;
        }
        if (prompt.kind === "carry_pax" && prompt.target) {
            const p = prompt.target;
            p.state = "carried";
            p.bagBlocking = false;
            p.streaming = false;
            p.headphonesOn = false;
            P.carrying.push(p.id);
            sayBubble(p, p.role === "pet" ? "*Yip!*" : "Get me to an exit door!", 2.0);
            if (!S.quiet) PRS.audio.play("grab");
            return true;
        }
        if (prompt.kind === "drop_pax") {
            const atFwd = Math.abs(P.x - CABIN.FWD_EXIT_X) <= 1.4;
            const atAft = Math.abs(P.x - CABIN.AFT_EXIT_X) <= 1.4;
            const doorX = atFwd ? CABIN.FWD_EXIT_X : (atAft ? CABIN.AFT_EXIT_X : null);
            for (const id of P.carrying) {
                const p = S.pax.find((q) => q.id === id);
                if (!p) continue;
                if (doorX !== null) {
                    p.state = "safe";
                    p.x = doorX + (Math.random() * 0.4 - 0.2);
                    p.y = (Math.random() > 0.5 ? 0.65 : -0.65);
                    S.stats.savedAtDoors++;
                    S.credibility = Math.min(100, S.credibility + 5);
                    sayBubble(p, p.role === "pet" ? "*Pant pant!* 🐶" : "Safe under the smoke!", 2.5);
                    if (p.role === "pet") awardMedal(S, "pug_saved");
                } else {
                    p.state = "seated";
                    p.x = clamp(P.x, 2, 14);
                    p.y = p.homeY;
                }
            }
            P.carrying = [];
            if (doorX !== null) {
                addToast(S, "✅ Passenger secured on the floor by the Exit Door!", "good");
                if (!S.quiet) PRS.audio.play("secure");
            } else {
                if (!S.quiet) PRS.audio.play("drop");
            }
            return true;
        }
        return false;
    }

    function equipOrSwapItem(S, newItemId) {
        const slot = makeBagSlot(newItemId);
        let idx = S.player.bag.findIndex((s) => !s || (s.uses !== null && s.uses <= 0 && !s.def.refillable));
        if (idx < 0) idx = S.player.activeSlot;
        S.player.bag[idx] = slot;
        S.player.activeSlot = idx;
    }

    function dunkCaseInSink(S) {
        const P = S.player;
        P.holdingCase = false;
        S.core.inSink = true;
        S.core.inBin = false;
        S.core.stage2Blue = false;
        S.core.x = CABIN.LAV_X;
        S.core.y = -0.75;
        S.core.z = 0.95;
        S.stats.caseSunkAt = S.clock.elapsed;
        S.credibility = Math.min(100, S.credibility + 35);
        alertCrew(S, null);
        awardMedal(S, "sink_dunk");
        addFx(S, { kind: "splash", x: CABIN.LAV_X, y: -0.75, z: 1.0, dur: 0.9 });
        addToast(S, "🚰 CASE DUNKED IN LAVATORY SINK! The lithium cells are submerged under running water!", "good");
        if (!S.quiet) {
            PRS.audio.play("splash");
            PRS.audio.play("secure");
        }
        return true;
    }

    function performInteract(S) {
        const prompt = computeUsePrompt(S);
        if (!prompt) return false;
        const P = S.player;
        const item = activeItem(S);

        switch (prompt.kind) {
            case "sink_dunk":
                return dunkCaseInSink(S);

            case "trigger_detector":
                triggerSmokeDetector(S, true);
                return true;

            case "refill_tap": {
                const slot = prompt.slot;
                if (!slot) return false;
                slot.uses = slot.maxUses;
                addFx(S, { kind: "splash", x: prompt.x, y: prompt.y, z: 1.0, dur: 0.5 });
                addToast(S, slot.id === "bin_liner" ? "💧 Filled 9-Litre Bin Liner Water Bomb!" : "💧 Water Bottle refilled!", "good");
                if (!S.quiet) PRS.audio.play("pour");
                return true;
            }

            case "cockpit_declare":
                declareEmergency(S, "You briefed the Captain at the Cockpit Door!");
                return true;

            case "cockpit_knock":
                addToast(S, "🔒 Cockpit is locked! Snap a Photo [Phone] or trigger the Lavatory Smoke Alarm first!", "warn");
                if (!S.quiet) PRS.audio.play("refuse");
                return true;

            case "use_pa": {
                S.paUsed = true;
                S.credibility = Math.min(100, S.credibility + 20);
                alertCrew(S, "📢 PA ANNOUNCEMENT! Able passengers are moving to the exit doors!");
                if (!S.clock.declared) declareEmergency(S, "Flight deck heard your PA call!");
                let moved = 0;
                for (const p of S.pax) {
                    if (p.state === "seated" && p.role !== "frail" && p.role !== "sleeper" && moved < 3) {
                        p.state = "safe";
                        p.x = p.homeX < 8 ? CABIN.FWD_EXIT_X : CABIN.AFT_EXIT_X;
                        p.y = (moved % 2 === 0 ? -0.65 : 0.65);
                        S.stats.savedAtDoors++;
                        moved++;
                    }
                }
                if (!S.quiet) PRS.audio.play("pa");
                return true;
            }

            case "snap_photo":
                P.hasPhoto = true;
                S.credibility = Math.min(100, S.credibility + 22);
                addFx(S, { kind: "flash", x: S.core.x, y: S.core.y, z: S.core.z, dur: 0.4 });
                addToast(S, "📸 Snapped clear photo of the fire! Crew, Sceptics & Cockpit will believe you now!", "good");
                if (!S.quiet) PRS.audio.play("camera");
                return true;

            case "tape_bin":
                if (item && item.uses > 0) item.uses--;
                S.core.binTaped = true;
                S.core.binOpen = false;
                S.credibility = Math.min(100, S.credibility + 12);
                addToast(S, "🧻 Taped Locker 9C shut! Oxygen starved by 70%!", "good");
                if (!S.quiet) PRS.audio.play("smother");
                return true;

            case "tape_cart":
                if (item && item.uses > 0) item.uses--;
                S.cart.taped = true;
                S.cart.braked = true;
                S.cart.vx = 0;
                addToast(S, "🧻 Beverage Cart taped locked! It won't roll in turbulence!", "good");
                if (!S.quiet) PRS.audio.play("smother");
                return true;

            case "tape_vents": {
                if (item && item.uses > 0) item.uses--;
                const st = prompt.x;
                S.ventsTaped[st] = true;
                S.smoke[st] *= 0.6;
                addToast(S, "🧻 Sealed ceiling vents in this row!", "good");
                if (!S.quiet) PRS.audio.play("smother");
                return true;
            }

            case "drop_masks": {
                const st = prompt.x;
                for (let k = Math.max(2, st - 1); k <= Math.min(14, st + 1); k++) {
                    S.masksDropped[k] = true;
                }
                S.credibility = Math.min(100, S.credibility + 10);
                addToast(S, "🔧 Oxygen masks deployed across Rows " + (CABIN.X_TO_ROW[st] - 1 || 1) + "–" + (CABIN.X_TO_ROW[st] + 1 || 12) + "!", "good");
                if (!S.quiet) PRS.audio.play("masksDrop");
                return true;
            }

            case "douse_fire": {
                if (!item || item.uses <= 0) return false;
                item.uses--;
                const fx = prompt.fireX;
                const isBag = item.id === "bin_liner";
                const isHalon = item.id === "halon";
                const isExt = item.id === "water_ext";
                const radius = (isBag || isHalon || isExt) ? 1 : 0;
                const knock = isHalon ? 65 : isBag ? 60 : isExt ? 52 : 36;
                const cool = isHalon ? 4 : isBag ? 26 : isExt ? 18 : 12;

                for (let k = fx - radius; k <= fx + radius; k++) {
                    if (k < 1 || k >= CABIN.STATIONS - 1) continue;
                    const isBlueTile = S.core.stage2Blue && !S.core.inSink && Math.round(S.core.x) === k;
                    if (!isBlueTile) {
                        S.fire[k] = Math.max(0, S.fire[k] - knock);
                    }
                    S.smoke[k] = Math.max(0, S.smoke[k] - knock * 0.45);
                    if (!isHalon) S.wet[k] = Math.min(100, S.wet[k] + (isBag ? 65 : 40));
                }

                if (Math.abs(fx - S.core.x) <= 1.3 && !S.core.inSink) {
                    S.core.heat = Math.max(15, S.core.heat - cool);
                    S.core.cellTimer += cool * 0.65;
                }

                S.stats.firesDoused++;
                S.credibility = Math.min(100, S.credibility + 5);
                addFx(S, { kind: isHalon ? "halon" : "spray", x: fx, y: -0.7, z: 1.5, dur: 0.45 });

                if (S.core.stage2Blue && !S.core.inSink && Math.round(S.core.x) === fx) {
                    addToast(S, "🔵 Water boils off the Stage 2 Blue Jet! Grab case [Right-Click / E] & dunk in Lavatory Sink!", "warn");
                }
                if (!S.quiet) PRS.audio.play(isHalon ? "halon" : isBag ? "splash" : "pour");
                return true;
            }

            case "use_blower": {
                if (!item || item.uses <= 0) return false;
                item.uses--;
                const dir = Math.cos(P.yaw) >= 0 ? 1 : -1;
                for (let d = 0; d <= 3; d++) {
                    const st = clamp(Math.round(P.x) + dir * d, 1, CABIN.STATIONS - 2);
                    S.smoke[st] = Math.max(0, S.smoke[st] - 44);
                }
                if (Math.abs(S.cart.x - P.x) <= 2.4) {
                    S.cart.vx = dir * 6.5;
                    S.cart.braked = false;
                }
                for (const p of S.pax) {
                    if (p.bagBlocking && Math.abs(p.x - P.x) <= 2.4) {
                        p.bagBlocking = false;
                        p.y = p.homeY;
                        p.state = "seated";
                        sayBubble(p, "My carry-on blew away!", 2.2);
                    }
                }
                addFx(S, { kind: "wind", x: P.x + dir, y: 0, z: 1.4, dir: dir, dur: 0.55 });
                if (!S.quiet) PRS.audio.play("fan");
                return true;
            }

            case "use_horn": {
                if (!item || item.uses <= 0) return false;
                item.uses--;
                for (const c of S.crew) {
                    if (Math.abs(c.x - P.x) <= 3.5 && !S.crewAlerted) {
                        c.stunTimer = 4.0;
                        c.mode = "stunned";
                        sayBubble(c, "MY EARS! *RINGING*", 3.0);
                    }
                }
                for (const p of S.pax) {
                    if (Math.abs(p.x - P.x) <= 3.5 && p.state !== "dead") {
                        if (p.state === "asleep" || p.headphonesOn) {
                            p.state = "seated";
                            p.headphonesOn = false;
                            sayBubble(p, "I'M AWAKE! I'M AWAKE!", 2.5);
                        }
                        if (p.bagBlocking) {
                            p.bagBlocking = false;
                            p.y = p.homeY;
                            p.state = "seated";
                            sayBubble(p, "Okay! Moving my bag!", 2.2);
                        }
                        if (p.role === "snitch") {
                            p.snitchCooldown = 25;
                            sayBubble(p, "*Ears ringing*", 2.5);
                        }
                    }
                }
                addFx(S, { kind: "horn", x: P.x, y: 0, z: 1.3, dur: 0.5 });
                if (!S.quiet) PRS.audio.play("horn");
                return true;
            }

            case "heal_pax": {
                if (!item || item.uses <= 0 || !prompt.target) return false;
                item.uses--;
                const p = prompt.target;
                p.smokeDose = Math.max(0, p.smokeDose - 45);
                p.burns = Math.max(0, p.burns - 40);
                p.health = Math.min(100, p.health + 45);
                if (p.state === "down") p.state = "seated";
                if (p.role !== "frail" && p.role !== "child" && p.role !== "pet" && !p.helper) {
                    recruitHelper(S, p);
                } else {
                    sayBubble(p, "I can breathe again! Thank you!", 2.5);
                }
                if (!S.quiet) PRS.audio.play("good");
                return true;
            }

            case "heal_self":
                if (!item || item.uses <= 0) return false;
                item.uses--;
                P.lungs = Math.min(100, P.lungs + 45);
                P.burns = Math.max(0, P.burns - 45);
                addToast(S, "🧰 Used Inhaler & Burn Gel — Lungs and hands restored!", "good");
                if (!S.quiet) PRS.audio.play("good");
                return true;

            case "open_bin":
                S.core.binOpen = true;
                S.core.binTaped = false;
                S.credibility = Math.min(100, S.credibility + 24);
                addFx(S, { kind: "sparks", x: S.core.x, y: S.core.y, z: 1.82, dur: 0.6 });
                addToast(S, "🔓 Opened Locker 9C! It's a sparking lithium vape case! Right-Click / [E] to yank it out!", "warn");
                if (!S.quiet) PRS.audio.play("flare");
                return true;

            case "close_bin":
                S.core.binOpen = false;
                addToast(S, "🔒 Slammed Locker 9C shut to starve it of oxygen!", "good");
                if (!S.quiet) PRS.audio.play("smother");
                return true;

            case "convince_crew":
                alertCrew(S, "🫡 Crew convinced! They switched to Emergency Evacuation & Firefighting Mode!");
                return true;

            case "pax_interact":
                if (prompt.target) return interactWithPassenger(S, prompt.target);
                return false;

            case "shove_cart":
                S.cart.vx = (Math.cos(P.yaw) >= 0 ? 1 : -1) * 5.2;
                S.cart.braked = false;
                if (!S.quiet) PRS.audio.play("grab");
                return true;
        }
        return false;
    }

    function interactWithPassenger(S, p) {
        const P = S.player;

        if (p.bagBlocking) {
            p.bagBlocking = false;
            p.y = p.homeY;
            p.state = "seated";
            S.credibility = Math.min(100, S.credibility + 5);
            sayBubble(p, "My duty-free Toblerone!!", 2.0);
            if (!S.quiet) PRS.audio.play("thud");
            return true;
        }

        if (p.role === "culprit" && !p.confessed) {
            p.confessed = true;
            S.core.binOpen = true;
            S.credibility = Math.min(100, S.credibility + 35);
            sayBubble(p, p.line, 3.8);
            addToast(S, "🗣️ Chip confessed it's his wet lithium vape! (+35 Credibility!)", "good");
            recruitHelper(S, p);
            if (!S.quiet) PRS.audio.play("good");
            return true;
        }

        if (p.role === "expert" && !p.tipGiven) {
            p.tipGiven = true;
            S.credibility = Math.min(100, S.credibility + 25);
            sayBubble(p, p.line, 4.2);
            addToast(S, "🎖️ Veteran Pilot Wilbur backs you up! (+25 Credibility — Tip: Dunk the case in the Aft Lavatory Sink!)", "good");
            if (!S.quiet) PRS.audio.play("good");
            return true;
        }

        if (p.role === "influencer" && !p.viralUsed) {
            p.viralUsed = true;
            p.streaming = false;
            p.y = p.homeY;
            p.state = "seated";
            S.stats.viralUsed = true;
            S.credibility = Math.min(100, S.credibility + 35);
            alertCrew(S, "📱 You went viral on Cabin Wi-Fi! Everyone sees the fire now! (+35 Credibility!)");
            awardMedal(S, "viral_proof");
            sayBubble(p, "CHAT WE HAVE LIVE FOOTAGE OF THE HERO!", 3.2);
            if (!S.quiet) PRS.audio.play("camera");
            return true;
        }

        if (p.state === "asleep" || p.headphonesOn) {
            p.state = "seated";
            p.headphonesOn = false;
            sayBubble(p, p.line, 2.8);
            if (!S.quiet) PRS.audio.play("grab");
            return true;
        }

        if (p.role === "sceptic" && !p.convinced) {
            const canProve = P.hasPhoto || S.core.binOpen || S.smoke[Math.round(p.x)] > 25 || S.credibility >= 75;
            if (!canProve) {
                sayBubble(p, p.line, 3.0);
                addToast(S, "🤨 Sceptic refuses to listen! Show a Smartphone Photo or open Locker 9C first!", "warn");
                if (!S.quiet) PRS.audio.play("refuse");
                return true;
            }
            p.convinced = true;
            if (P.hasPhoto) awardMedal(S, "viral_proof");
            recruitHelper(S, p);
            return true;
        }

        if (p.role === "snitch") {
            p.snitchCooldown = 30;
            if (S.credibility >= 50 || P.hasPhoto) {
                recruitHelper(S, p);
            } else {
                sayBubble(p, "Hmph! Well don't bump into my armrest!", 2.5);
                if (!S.quiet) PRS.audio.play("talk");
            }
            return true;
        }

        if (S.credibility >= 28 || P.hasPhoto || S.crewAlerted || S.smoke[Math.round(p.x)] > 20) {
            recruitHelper(S, p);
        } else {
            sayBubble(p, "Are you sure there's a fire? The seatbelt sign is on...", 2.8);
            addToast(S, "📢 Need more Credibility to recruit! Snap a Photo, talk to Chip in 9A, or open Locker 9C!", "warn");
            if (!S.quiet) PRS.audio.play("refuse");
        }
        return true;
    }

    function recruitHelper(S, p) {
        if (p.helper) return;
        p.helper = true;
        p.convinced = true;
        p.bagBlocking = false;
        p.streaming = false;
        p.y = 0.0;
        p.state = "helper";
        S.stats.helpersRecruited++;
        S.credibility = Math.min(100, S.credibility + 8);
        if (S.stats.helpersRecruited >= 3) awardMedal(S, "squad_goals");
        sayBubble(p, "I'm with you! I'll carry people to the doors!", 3.0);
        addToast(S, "🤝 " + p.name + " joined as a Helper and is rescuing passengers!", "good");
        if (!S.quiet) PRS.audio.play("secure");
    }

    function stepCrew(S, dt) {
        const P = S.player;

        for (const c of S.crew) {
            if (c.bubbleTimer > 0) c.bubbleTimer = Math.max(0, c.bubbleTimer - dt);
            if (c.cooldown > 0) c.cooldown = Math.max(0, c.cooldown - dt);

            const stIdx = clamp(Math.round(c.x), 0, CABIN.STATIONS - 1);
            if (!S.crewAlerted) {
                if (S.fire[stIdx] > 15 || S.smoke[stIdx] > 38 ||
                    (P.holdingCase && Math.abs(c.x - P.x) <= 3.0) ||
                    (S.core.binOpen && Math.abs(c.x - S.core.x) <= 2.5)) {
                    alertCrew(S, "👀 " + c.name + " saw the fire firsthand! Crew switched to Emergency Mode!");
                }
            }

            if (c.stunTimer > 0) {
                c.stunTimer = Math.max(0, c.stunTimer - dt);
                if (c.stunTimer <= 0) c.mode = S.crewAlerted ? "emergency" : "patrol";
                continue;
            }

            if (!S.crewAlerted) {
                const distToPlayer = Math.abs(P.x - c.x);
                const playerOut = Math.abs(P.vx) > 0.2 || P.carrying.length > 0 || P.z > 0.1 || Math.abs(P.x - (CABIN.ROW_TO_X[S.character.seatRow] || 6)) > 0.8;

                if (playerOut && distToPlayer < 3.4 && S.credibility < 55 && c.cooldown <= 0) {
                    if (c.mode !== "chase") {
                        c.mode = "chase";
                        sayBubble(c, "SIR! THE SEATBELT SIGN IS ON!", 2.4);
                        if (!S.quiet) PRS.audio.play("whistle");
                    }
                } else if (c.mode === "chase" && (distToPlayer > 4.8 || S.credibility >= 55)) {
                    c.mode = "patrol";
                }

                if (c.mode === "chase") {
                    const dir = Math.sign(P.x - c.x);
                    c.facing = dir || 1;
                    c.x = clamp(c.x + dir * 2.9 * dt, 1.2, 15.2);
                    c.y = lerp(c.y, P.y, dt * 3);

                    if (Math.abs(P.x - c.x) < 0.42 && Math.abs(P.y - c.y) < 0.45 && P.z < 0.32 && P.stunTimer <= 0 && c.cooldown <= 0) {
                        c.cooldown = 4.5;
                        c.mode = "patrol";
                        P.stunTimer = 1.2;
                        const homeX = CABIN.ROW_TO_X[S.character.seatRow] || 6;
                        P.vx = Math.sign(homeX - P.x) * 4.5;
                        S.stats.timesTackled++;
                        sayBubble(c, "Back to your seat IMMEDIATELY!", 2.5);
                        addToast(S, "👮 " + c.name + " shoved you back! Jump [Space] over them or show a Photo [Left-Click]!", "warn");
                        if (!S.quiet) PRS.audio.play("thud");
                    }
                } else {
                    c.x += c.dir * 1.4 * dt;
                    c.y = lerp(c.y, 0, dt * 2);
                    c.facing = c.dir;
                    if (c.x >= c.patrolMax) { c.x = c.patrolMax; c.dir = -1; }
                    if (c.x <= c.patrolMin) { c.x = c.patrolMin; c.dir = 1; }
                }
            } else {
                c.mode = "emergency";
                const hotSt = findNearestFireStation(S, c.x, 12);
                if (hotSt !== null) {
                    const diff = hotSt - c.x;
                    if (Math.abs(diff) > 0.9) {
                        c.facing = Math.sign(diff);
                        c.x += c.facing * 2.8 * dt;
                    } else {
                        c.actionTimer -= dt;
                        if (c.actionTimer <= 0) {
                            c.actionTimer = 3.2;
                            const isBlue = S.core.stage2Blue && !S.core.inSink && Math.round(S.core.x) === hotSt;
                            if (!isBlue) S.fire[hotSt] = Math.max(0, S.fire[hotSt] - 24);
                            S.smoke[hotSt] = Math.max(0, S.smoke[hotSt] - 18);
                            addFx(S, { kind: "halon", x: hotSt, y: -0.5, z: 1.4, dur: 0.4 });
                            sayBubble(c, isBlue ? "Halon won't stop the blue jet! Sink it!" : "Suppressing fire!", 2.0);
                        }
                    }
                } else {
                    const st = clamp(Math.round(c.x), 2, 14);
                    if (S.smoke[st] > 28 && !S.masksDropped[st]) {
                        S.masksDropped[st] = true;
                        sayBubble(c, "Masks out! Breathe normal!", 2.0);
                    }
                }
            }
        }
    }

    function stepPassengers(S, dt) {
        const P = S.player;

        for (const p of S.pax) {
            if (p.bubbleTimer > 0) p.bubbleTimer = Math.max(0, p.bubbleTimer - dt);
            if (p.state === "dead") continue;

            const stIdx = clamp(Math.round(p.x), 0, CABIN.STATIONS - 1);
            const smk = S.smoke[stIdx];
            const flm = S.fire[stIdx];

            const smokeThreshold = p.state === "safe" ? 72 : (p.state === "aisle" || p.helper ? 30 : 48);
            let maskShield = (S.masksDropped[stIdx] && p.state === "seated") ? 0.3 : 1.0;
            if (p.state === "safe") maskShield = 0.15;
            const frailMul = (p.role === "frail" || p.role === "child") ? 1.3 : 1.0;

            if (smk > smokeThreshold) {
                p.smokeDose += (smk - smokeThreshold) * 0.085 * maskShield * frailMul * dt;
                p.panic = Math.min(100, p.panic + 4 * dt);
            }
            if (flm > 20 && p.state !== "carried") {
                p.burns += (flm - 18) * (p.state === "safe" ? 0.03 : 0.09) * dt;
                p.panic = Math.min(100, p.panic + 10 * dt);
            }

            p.health = clamp(100 - p.smokeDose * 0.85 - p.burns * 0.9, 0, 100);
            if (p.health <= 0) {
                p.state = "dead";
                p.helper = false;
                p.bagBlocking = false;
                p.streaming = false;
                continue;
            } else if (p.health < 24 && p.state !== "carried" && p.state !== "safe" && p.state !== "down") {
                p.state = "down";
                p.helper = false;
                p.bagBlocking = false;
                p.streaming = false;
                p.y = 0.0;
                sayBubble(p, "*Collapses coughing!*", 2.5);
                continue;
            }

            if (p.helper) {
                stepHelperAI(S, p, dt);
                continue;
            }

            if (p.state === "carried" || p.state === "safe" || p.state === "down") continue;

            if (p.role === "hoarder" && !p.bagBlocking && !p.convinced && (p.panic > 30 || smk > 20 || S.clock.elapsed > 32 + p.row * 2)) {
                p.bagBlocking = true;
                p.state = "aisle";
                p.y = 0.0;
                sayBubble(p, p.line, 3.5);
            }

            if (p.role === "influencer" && !p.streaming && !p.viralUsed && (S.clock.elapsed > 14 || smk > 15)) {
                p.streaming = true;
                p.state = "aisle";
                p.y = p.side * 0.28;
                if (!p.bubbleTimer) sayBubble(p, p.line, 3.5);
            }

            if (p.role === "snitch" && !S.crewAlerted && S.credibility < 55) {
                p.snitchCooldown -= dt;
                if (p.snitchCooldown <= 0 && Math.abs(P.x - p.x) <= 1.8) {
                    p.snitchCooldown = 14;
                    sayBubble(p, p.line, 3.2);
                    let nearC = S.crew[0];
                    if (Math.abs(S.crew[1].x - p.x) < Math.abs(nearC.x - p.x)) nearC = S.crew[1];
                    if (nearC.stunTimer <= 0) {
                        nearC.mode = "chase";
                        sayBubble(nearC, "On my way! Remain seated!", 2.2);
                        if (!S.quiet) PRS.audio.play("whistle");
                    }
                }
            }
        }
    }

    function stepHelperAI(S, h, dt) {
        h.y = lerp(h.y, 0.0, dt * 4);
        if (h.carryingId) {
            const victim = S.pax.find((q) => q.id === h.carryingId);
            if (!victim || victim.state === "dead") {
                h.carryingId = null;
                return;
            }
            const doorX = Math.abs(h.x - CABIN.FWD_EXIT_X) < Math.abs(h.x - CABIN.AFT_EXIT_X)
                ? CABIN.FWD_EXIT_X : CABIN.AFT_EXIT_X;
            const diff = doorX - h.x;
            if (Math.abs(diff) <= 0.45) {
                victim.state = "safe";
                victim.x = doorX + (Math.random() * 0.4 - 0.2);
                victim.y = (Math.random() > 0.5 ? -0.65 : 0.65);
                h.carryingId = null;
                S.stats.savedAtDoors++;
                sayBubble(h, "Got " + victim.name.split(" ")[0] + " to the door!", 2.0);
                if (!S.quiet) PRS.audio.play("secure");
            } else {
                h.x += Math.sign(diff) * 2.5 * dt;
                victim.x = h.x;
                victim.y = h.y;
                victim.state = "carried";
            }
            return;
        }

        let target = null;
        let bestScore = -999;
        for (const q of S.pax) {
            if (q.id === h.id || q.helper || q.state === "safe" || q.state === "dead" || q.state === "carried") continue;
            const claimed = S.pax.some((other) => other.helper && other.id !== h.id && (other.helperTarget === q.id || other.carryingId === q.id));
            if (claimed) continue;

            let sc = 20 - Math.abs(q.x - h.x) * 1.8;
            if (q.state === "down") sc += 40;
            else if (q.role === "frail" || q.role === "child" || q.role === "pet") sc += 30;
            sc += S.smoke[clamp(Math.round(q.x), 0, CABIN.STATIONS - 1)] * 0.35;
            if (sc > bestScore) {
                bestScore = sc;
                target = q;
            }
        }

        if (!target) {
            const doorX = Math.abs(h.x - CABIN.FWD_EXIT_X) < Math.abs(h.x - CABIN.AFT_EXIT_X)
                ? CABIN.FWD_EXIT_X : CABIN.AFT_EXIT_X;
            if (Math.abs(doorX - h.x) > 0.4) h.x += Math.sign(doorX - h.x) * 2.6 * dt;
            return;
        }

        h.helperTarget = target.id;
        const diff = target.x - h.x;
        if (Math.abs(diff) <= 0.45) {
            h.carryingId = target.id;
            target.state = "carried";
            target.bagBlocking = false;
            target.streaming = false;
            sayBubble(h, "Hang on " + target.name.split(" ")[0] + "!", 1.8);
        } else {
            h.x += Math.sign(diff) * 3.1 * dt;
        }
    }

    function awardMedal(S, id) {
        if (S.stats.medals.indexOf(id) < 0) {
            S.stats.medals.push(id);
        }
    }

    function landAircraft(S) {
        if (S.clock.landed) return;
        S.clock.landed = true;
        S.clock.remaining = 0;
        if (!S.quiet) PRS.audio.play("landing");

        let aliveCount = 0;
        for (const p of S.pax) {
            if (p.state === "dead") continue;
            const st = clamp(Math.round(p.x), 0, CABIN.STATIONS - 1);
            if (p.state === "down" && (S.smoke[st] > 65 || S.fire[st] > 35)) {
                p.state = "dead";
                continue;
            }
            aliveCount++;
        }

        const totalPax = S.pax.length;
        if (aliveCount === totalPax && S.player.alive) {
            awardMedal(S, "zero_casualties");
        }

        let baselineAlive = 10;
        if (!S._isBaseline) {
            baselineAlive = simulateBaseline(S.seedStr);
        }

        const savedOverBaseline = Math.max(0, aliveCount - baselineAlive);
        let grade = "C";
        if (!S.player.alive) grade = "F";
        else if (aliveCount >= totalPax) grade = "S";
        else if (aliveCount >= totalPax - 2) grade = "A";
        else if (aliveCount >= totalPax - 5) grade = "B";
        else if (aliveCount >= totalPax - 9) grade = "C";
        else grade = "D";

        S.report = {
            aliveCount,
            totalPax,
            baselineAlive,
            savedOverBaseline,
            grade,
            playerAlive: S.player.alive,
            medals: S.stats.medals.map((id) => CAT.MEDALS.find((m) => m.id === id)).filter(Boolean)
        };
    }

    function simulateBaseline(seedStr) {
        PRS.audio.hush(true);
        try {
            const B = createWorld({ seed: seedStr, quiet: true });
            B._isBaseline = true;
            while (!B.clock.landed) {
                stepWorld(B, 0.25, {});
            }
            let alive = 0;
            for (const p of B.pax) if (p.state !== "dead") alive++;
            return alive;
        } finally {
            PRS.audio.hush(false);
        }
    }

    function stepBot(S, dt) {
        if (S.clock.landed) return;
        const P = S.player;
        const input = { forward: true, lookYaw: 0, lookPitch: 0 };
        S._botCooldown = Math.max(0, (S._botCooldown || 0) - dt);

        let goalX = CABIN.ORIGIN_X;
        if (!S.core.inSink) {
            goalX = P.holdingCase ? CABIN.LAV_X : S.core.x;
        } else if (P.carrying.length > 0) {
            goalX = CABIN.FWD_EXIT_X;
        } else {
            goalX = 4 + Math.sin(S.clock.elapsed * 0.4) * 6;
        }

        const desiredYaw = goalX >= P.x ? 0 : Math.PI;
        let diffYaw = desiredYaw - P.yaw;
        while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
        while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        P.yaw += diffYaw * Math.min(1, dt * 5);
        P.pitch = Math.sin(S.clock.elapsed * 0.8) * 0.15;

        if (Math.abs(goalX - P.x) < 0.9 && S._botCooldown <= 0) {
            if (!S.core.inSink) {
                if (!S.core.binOpen) input.usePressed = true;
                else if (!P.holdingCase) input.grabPressed = true;
                else input.usePressed = true;
                S._botCooldown = 0.7;
            }
        }
        if (isBlockedAt(S, P.x + Math.cos(P.yaw) * 0.5, P.y) && P.z === 0) {
            input.jump = true;
        }

        stepWorld(S, dt, input);
    }

    PRS.world = {
        createWorld,
        stepWorld,
        stepBot,
        getPrompts,
        performGrabOrDrop,
        performInteract,
        hasPassive,
        activeItem,
        smokeCeilingHeightAt
    };
})(window);
