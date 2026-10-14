// UI Controller for Please Remain Seated: Title & Loadout, First-Person 3D Play Screen, and Post-Flight Report.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};
    const { el, $, clear, mmss, clamp01, store } = PRS.util;
    const CAT = PRS.catalog;

    let host = null;
    let S = null;
    let bgWorld = null;
    let rafId = 0;
    let lastTime = 0;
    let paused = false;

    // Persistent player selections
    let selectedCharId = store.get("charId", "ansel");
    let selectedBag = store.get("bag", null);
    let customSeed = "";
    let editingSlot = null;

    // First-Person 3D Real-Time Input State
    const inputState = {
        forward: false,
        backward: false,
        strafeLeft: false,
        strafeRight: false,
        turnLeft: false,
        turnRight: false,
        jump: false,
        crouch: false,
        lookYaw: 0,
        lookPitch: 0,
        grabPressed: false,
        usePressed: false,
        slot: null,
        draggingLook: false
    };

    function resetInputState() {
        inputState.forward = false;
        inputState.backward = false;
        inputState.strafeLeft = false;
        inputState.strafeRight = false;
        inputState.turnLeft = false;
        inputState.turnRight = false;
        inputState.jump = false;
        inputState.crouch = false;
        inputState.lookYaw = 0;
        inputState.lookPitch = 0;
        inputState.grabPressed = false;
        inputState.usePressed = false;
        inputState.slot = null;
        inputState.draggingLook = false;
    }

    function ensureValidLoadout() {
        const ch = CAT.charById(selectedCharId);
        if (!Array.isArray(selectedBag) || selectedBag.length !== 3) {
            selectedBag = ch.defaultBag.slice();
        }
        for (let i = 0; i < ch.kit.length; i++) {
            const kitId = ch.kit[i];
            if (selectedBag.indexOf(kitId) < 0) {
                selectedBag[i] = kitId;
            }
        }
        for (let i = 0; i < 3; i++) {
            if (!CAT.itemById(selectedBag[i])) {
                selectedBag[i] = ch.defaultBag[i] || "water_bottle";
            }
        }
    }

    function selectCharacter(charId) {
        selectedCharId = charId;
        const ch = CAT.charById(charId);
        selectedBag = ch.defaultBag.slice();
        editingSlot = null;
        store.set("charId", selectedCharId);
        store.set("bag", selectedBag);
        PRS.audio.unlock();
        PRS.audio.play("select");
        showTitle();
    }

    function pickBagItem(slotIndex, itemId) {
        const ch = CAT.charById(selectedCharId);
        if (slotIndex < ch.kit.length) return;
        const existingIdx = selectedBag.indexOf(itemId);
        if (existingIdx >= 0 && existingIdx >= ch.kit.length) {
            selectedBag[existingIdx] = selectedBag[slotIndex];
        }
        selectedBag[slotIndex] = itemId;
        editingSlot = null;
        store.set("bag", selectedBag);
        PRS.audio.unlock();
        PRS.audio.play("click");
        showTitle();
    }

    // ------------------------------------------------------------------------- Title Screen ---
    function showTitle() {
        stopLoop();
        if (document.pointerLockElement && document.exitPointerLock) {
            document.exitPointerLock();
        }
        resetInputState();
        ensureValidLoadout();
        clear(host);
        host.className = "screen title-screen";

        const ch = CAT.charById(selectedCharId);

        // Live 3D Cabin Bot Demo flying in the background (with 2D pixel-art sprites)
        const bgCanvas = el("canvas", { class: "title-backdrop-canvas" });
        const bgOverlay = el("canvas", { class: "title-backdrop-canvas" });
        bgWorld = PRS.world.createWorld({ charId: "volk", quiet: true });
        PRS.render3d.resetCamera(6.0);

        // Character selector pills with 2D Pixel-Art Portraits from PRS.atlas
        const charRow = el("div", { class: "char-grid" });
        for (const c of CAT.CHARACTERS) {
            const active = c.id === ch.id;
            const avatarNode = PRS.atlas
                ? el("div", { class: "char-avatar pixel-avatar" }, [
                    PRS.atlas.icon("pax", 2, { s: c.skin, h: c.hair, c: c.shirt })
                ])
                : el("div", { class: "char-avatar", style: { background: c.shirt, borderColor: c.hair } }, [
                    el("span", { text: c.short[0] })
                ]);

            charRow.appendChild(el("button", {
                class: "char-card" + (active ? " active" : ""),
                onclick: () => selectCharacter(c.id)
            }, [
                avatarNode,
                el("div", { class: "char-info" }, [
                    el("b", { text: c.name }),
                    el("span", { text: c.title + " · Row " + c.seatRow })
                ])
            ]));
        }

        const statBar = (label, val, col) => el("div", { class: "stat-pill" }, [
            el("span", { text: label }),
            el("div", { class: "stat-dots" }, [
                el("div", { class: "stat-fill", style: { width: (val * 10) + "%", background: col } })
            ]),
            el("b", { text: String(val) })
        ]);

        const charDetail = el("div", { class: "char-detail-box" }, [
            el("div", { class: "char-stats-row" }, [
                statBar("SPEED", ch.stats.speed, "#38bdf8"),
                statBar("STRENGTH", ch.stats.strength, "#f97316"),
                statBar("LUNGS", ch.stats.lungs, "#4ade80"),
                statBar("VOICE", ch.stats.voice, "#facc15")
            ]),
            el("div", { class: "char-perk", text: "★ " + ch.perk })
        ]);

        // 3-Slot Bag Loadout Picker with 2D Pixel-Art Item Sprites
        const bagRow = el("div", { class: "loadout-row" });
        selectedBag.forEach((itemId, idx) => {
            const item = CAT.itemById(itemId);
            const locked = idx < ch.kit.length;
            const isEditing = editingSlot === idx;
            const iconNode = (PRS.atlas && item.sprite)
                ? PRS.atlas.icon(item.sprite, 2, null, "slot-spr")
                : el("span", { class: "slot-icon", text: item.icon });

            bagRow.appendChild(el("button", {
                class: "loadout-slot" + (locked ? " locked" : "") + (isEditing ? " editing" : ""),
                onclick: () => {
                    if (locked) return;
                    editingSlot = editingSlot === idx ? null : idx;
                    showTitle();
                }
            }, [
                el("span", { class: "slot-num", text: locked ? "🔒 KIT" : "SLOT " + (idx + 1) }),
                iconNode,
                el("b", { text: item.short }),
                el("small", { text: locked ? "Character signature gear" : "Click to swap item" })
            ]));
        });

        let itemDrawer = null;
        if (editingSlot !== null) {
            const poolGrid = el("div", { class: "item-pool-grid" });
            for (const it of CAT.ITEMS.filter((i) => i.loadout)) {
                const inBag = selectedBag.indexOf(it.id) >= 0;
                const poolIcon = (PRS.atlas && it.sprite)
                    ? PRS.atlas.icon(it.sprite, 2, null, "pool-spr")
                    : el("span", { class: "pool-icon", text: it.icon });

                poolGrid.appendChild(el("button", {
                    class: "pool-item" + (inBag ? " in-bag" : ""),
                    onclick: () => pickBagItem(editingSlot, it.id)
                }, [
                    poolIcon,
                    el("div", { class: "pool-text" }, [
                        el("b", { text: it.name }),
                        el("small", { text: it.desc })
                    ])
                ]));
            }
            itemDrawer = el("div", { class: "item-drawer" }, [
                el("div", { class: "drawer-head" }, [
                    el("b", { text: "Choose Item for Carry-On Slot " + (editingSlot + 1) + " (Every item is useful!)" }),
                    el("button", { class: "btn-sm", text: "Close ×", onclick: () => { editingSlot = null; showTitle(); } })
                ]),
                poolGrid
            ]);
        }

        // Visual 4-Step First-Person 3D How-To-Play Strip
        const howToStrip = el("div", { class: "howto-grid" }, [
            el("div", { class: "howto-card" }, [
                el("span", { class: "howto-icon", text: "🔥➔🚰" }),
                el("b", { text: "1. Sink the Vape Case" }),
                el("small", { text: "Look up at Locker 9C. Cool or tape it, or grab the burning case [Right-Click / E] and dunk it in the Aft Lavatory Sink [Left-Click / F]!" })
            ]),
            el("div", { class: "howto-card" }, [
                el("span", { class: "howto-icon", text: "⬇️💨" }),
                el("b", { text: "2. Duck Smoke & Vault Carts" }),
                el("small", { text: "3D smoke fills from the ceiling down! Hold [C / Ctrl] to crouch in clean air, and press [Space] to jump runaway carts & suitcases." })
            ]),
            el("div", { class: "howto-card" }, [
                el("span", { class: "howto-icon", text: "👮📸" }),
                el("b", { text: "3. Flip the Seatbelt Police" }),
                el("small", { text: "Crew will chase & shove you while the Seatbelt Sign is on! Snap a Photo [Left-Click / F] or trigger the Lavatory Ceiling Smoke Alarm!" })
            ]),
            el("div", { class: "howto-card" }, [
                el("span", { class: "howto-icon", text: "🤝🚪" }),
                el("b", { text: "4. Rescue to Exit Doors" }),
                el("small", { text: "Carry frail souls [Right-Click / E] to Forward/Aft Exit Doors (L1/L2) and recruit Helpers [Left-Click / F] to haul the rest!" })
            ])
        ]);

        const card = el("div", { class: "title-panel" }, [
            el("div", { class: "title-header" }, [
                el("div", { class: "badge-row" }, [
                    el("span", { class: "pill pill-fire", text: "🔥 FIRST-PERSON 3D CABIN EMERGENCY" }),
                    el("span", { class: "pill pill-time", text: "⏱️ 3:00 REAL-TIME DESCENT" }),
                    el("button", {
                        class: "pill pill-sound",
                        text: PRS.audio.isEnabled() ? "🔊 SOUND ON" : "🔇 MUTED",
                        onclick: () => {
                            PRS.audio.unlock();
                            PRS.audio.setEnabled(!PRS.audio.isEnabled());
                            store.set("sound", PRS.audio.isEnabled());
                            showTitle();
                        }
                    })
                ]),
                el("h1", { text: "PLEASE REMAIN SEATED" }),
                el("p", { class: "subtitle", text: "There's a lithium vape fire in Overhead Locker 9C. Nobody believes you, the seatbelt sign is on, and the Flight Attendants have whistles." })
            ]),

            howToStrip,

            el("div", { class: "section-label", text: "CHOOSE YOUR PASSENGER" }),
            charRow,
            charDetail,

            el("div", { class: "section-label", text: "CARRY-ON LOADOUT (CLICK SLOT TO CUSTOMIZE)" }),
            bagRow,
            itemDrawer,

            el("div", { class: "launch-bar" }, [
                el("button", {
                    class: "btn-launch-primary",
                    onclick: () => startGame({ seed: customSeed || null })
                }, [
                    el("b", { text: "✈️ BOARD FLIGHT TN 447 (3D)" }),
                    el("small", { text: customSeed ? "Seed: " + customSeed : "Random Flight Seed · First-Person 3D" })
                ]),
                el("button", {
                    class: "btn-launch-daily",
                    onclick: () => startGame({ seed: CAT.dailySeedString(), isDaily: true })
                }, [
                    el("b", { text: "📅 TODAY'S DAILY FLIGHT" }),
                    el("small", { text: CAT.dailySeedString() + " · Same cabin for everyone" })
                ]),
                el("input", {
                    class: "seed-input",
                    type: "text",
                    placeholder: "Custom Seed (optional)",
                    value: customSeed,
                    oninput: (e) => { customSeed = e.target.value; }
                })
            ])
        ]);

        host.appendChild(bgCanvas);
        host.appendChild(bgOverlay);
        host.appendChild(card);

        lastTime = performance.now();
        function bgLoop(now) {
            rafId = requestAnimationFrame(bgLoop);
            const dt = Math.min(0.08, (now - lastTime) / 1000);
            lastTime = now;
            if (bgWorld.clock.landed) {
                bgWorld = PRS.world.createWorld({ charId: "volk", quiet: true });
            }
            PRS.world.stepBot(bgWorld, dt);
            PRS.render3d.drawScene3D(bgCanvas, bgOverlay, bgWorld, now, { backdropMode: true });
        }
        rafId = requestAnimationFrame(bgLoop);
    }

    // ------------------------------------------------- First-Person 3D Real-Time Play Screen ---
    function startGame(opts) {
        opts = opts || {};
        stopLoop();
        resetInputState();
        ensureValidLoadout();
        PRS.audio.unlock();
        PRS.audio.startRoar();
        PRS.audio.play("chime");

        S = PRS.world.createWorld({
            charId: selectedCharId,
            bag: selectedBag,
            seed: opts.seed || null,
            quiet: false
        });
        S.isDaily = !!opts.isDaily;
        paused = false;

        PRS.render3d.resetCamera(S.player.x);
        buildPlayDOM();

        lastTime = performance.now();
        rafId = requestAnimationFrame(playLoop);
    }

    let dom = {};

    function buildPlayDOM() {
        clear(host);
        host.className = "screen play-screen";

        // 1. Top HUD Bar
        const hud = el("div", { class: "play-hud" }, [
            el("div", { class: "hud-block hud-clock-block" }, [
                el("span", { class: "hud-kicker", id: "hud-descent-label", text: "TIME TO TOUCHDOWN" }),
                el("div", { class: "hud-clock", id: "hud-clock", text: "3:00" }),
                el("span", { class: "hud-seed", text: "SEED: " + S.seedStr })
            ]),

            el("div", { class: "hud-block hud-vitals-block" }, [
                el("div", { class: "vital-row" }, [
                    el("span", { text: "🫁 LUNGS" }),
                    el("div", { class: "vital-track" }, [
                        el("div", { class: "vital-fill fill-lungs", id: "bar-lungs", style: { width: "100%" } })
                    ]),
                    el("b", { id: "txt-lungs", text: "100%" })
                ]),
                el("div", { class: "vital-row" }, [
                    el("span", { text: "🔥 BURNS" }),
                    el("div", { class: "vital-track" }, [
                        el("div", { class: "vital-fill fill-burns", id: "bar-burns", style: { width: "0%" } })
                    ]),
                    el("b", { id: "txt-burns", text: "0%" })
                ]),
                el("div", { class: "vital-row" }, [
                    el("span", { text: "📢 CREDIBILITY" }),
                    el("div", { class: "vital-track" }, [
                        el("div", { class: "vital-fill fill-cred", id: "bar-cred", style: { width: "25%" } })
                    ]),
                    el("b", { id: "txt-cred", text: "25%" })
                ])
            ]),

            el("div", { class: "hud-block hud-status-block" }, [
                el("div", { class: "crew-status-pill", id: "hud-crew-pill" }),
                el("div", { class: "souls-counter", id: "hud-souls" })
            ]),

            el("div", { class: "hud-block hud-bag-block", id: "hud-bag" }),

            el("div", { class: "hud-block hud-btns-block" }, [
                el("button", {
                    class: "hud-btn",
                    title: "Toggle Sound (M)",
                    id: "btn-sound",
                    text: PRS.audio.isEnabled() ? "🔊" : "🔇",
                    onclick: () => {
                        PRS.audio.unlock();
                        PRS.audio.setEnabled(!PRS.audio.isEnabled());
                        store.set("sound", PRS.audio.isEnabled());
                        $("#btn-sound", host).textContent = PRS.audio.isEnabled() ? "🔊" : "🔇";
                    }
                }),
                el("button", {
                    class: "hud-btn",
                    title: "Restart Flight (R)",
                    text: "↻",
                    onclick: () => startGame({ seed: S.seedStr, isDaily: S.isDaily })
                }),
                el("button", {
                    class: "hud-btn",
                    title: "Boarding Pass / Loadout",
                    text: "✕",
                    onclick: () => showTitle()
                })
            ])
        ]);

        // 2. Full-Plane Radar Minimap Strip (shows 3D view cone + fire/smoke/crew)
        const minimapWrap = el("div", { class: "minimap-wrap" }, [
            el("canvas", {
                class: "minimap-canvas",
                id: "minimap-canvas",
                onclick: (ev) => {
                    if (!S || S.clock.landed) return;
                    const stX = PRS.render3d.hitTestMinimap(ev.currentTarget, ev.clientX);
                    // Face toward clicked station on radar
                    S.player.yaw = stX >= S.player.x ? 0 : Math.PI;
                }
            })
        ]);

        // 3. First-Person 3D Viewport (WebGL 3D Canvas + 2D HUD Overlay Canvas + Toasts)
        const toastLayer = el("div", { class: "toast-layer", id: "toast-layer" });
        const lookHint = el("div", {
            class: "look-lock-hint",
            id: "look-lock-hint",
            text: "🖱️ Click 3D View to Lock Mouse Look · Left-Click [F] Use · Right-Click [E] Grab · Q/E or Arrows also Turn Camera"
        });

        const glCanvas = el("canvas", {
            class: "cutaway-canvas fp3d-canvas",
            id: "fp3d-canvas",
            oncontextmenu: (ev) => ev.preventDefault(),
            onmousedown: (ev) => {
                if (!S || S.clock.landed) return;
                PRS.audio.unlock();

                const locked = (document.pointerLockElement === glCanvas);
                if (!locked && glCanvas.requestPointerLock) {
                    try { glCanvas.requestPointerLock(); } catch (_) {}
                }

                if (ev.button === 2) {
                    // Right-Click: Grab / Carry / Drop [E]
                    inputState.grabPressed = true;
                    ev.preventDefault();
                } else if (ev.button === 0) {
                    if (locked) {
                        // Left-Click while mouse-locked: Use / Interact [F], or fallback to Grab [E]
                        const prompts = PRS.world.getPrompts(S);
                        if (prompts.f || !prompts.e) {
                            inputState.usePressed = true;
                        } else {
                            inputState.grabPressed = true;
                        }
                    } else {
                        inputState.draggingLook = true;
                        const prompts = PRS.world.getPrompts(S);
                        if (prompts.f) inputState.usePressed = true;
                        else if (prompts.e) inputState.grabPressed = true;
                    }
                }
            },
            onmouseup: () => {
                inputState.draggingLook = false;
            },
            onmousemove: (ev) => {
                if (!S || S.clock.landed) return;
                if (document.pointerLockElement === glCanvas || inputState.draggingLook) {
                    inputState.lookYaw += (ev.movementX || 0) * 0.0025;
                    inputState.lookPitch -= (ev.movementY || 0) * 0.0022;
                }
            },
            onwheel: (ev) => {
                if (!S || S.clock.landed) return;
                const dir = ev.deltaY > 0 ? 1 : -1;
                S.player.activeSlot = (S.player.activeSlot + dir + 3) % 3;
                updateHUD(true);
                ev.preventDefault();
            }
        });

        const overlayCanvas = el("canvas", {
            class: "fp3d-overlay-canvas",
            id: "fp3d-overlay-canvas"
        });

        const viewport = el("div", { class: "cutaway-viewport" }, [
            toastLayer,
            lookHint,
            glCanvas,
            overlayCanvas
        ]);

        // 4. Bottom First-Person 3D Action & Controls Bar
        const actionBar = el("div", { class: "arcade-bar" }, [
            el("div", { class: "move-hints" }, [
                el("span", { class: "key-chip", text: "WASD" }),
                el("span", { text: "Move" }),
                el("span", { class: "key-chip", text: "Mouse / Q·◀ ▶" }),
                el("span", { text: "Look 3D" }),
                el("span", { class: "key-chip", text: "Space" }),
                el("span", { text: "Jump Cart/Bags" }),
                el("span", { class: "key-chip", text: "C / Ctrl" }),
                el("span", { text: "Crouch Smoke" }),
                el("span", { class: "key-chip", text: "1 2 3 / Wheel" }),
                el("span", { text: "Item" })
            ]),
            el("div", { class: "arcade-actions" }, [
                el("button", {
                    class: "arcade-btn btn-e",
                    id: "btn-action-e",
                    onclick: () => {
                        if (!S || S.clock.landed) return;
                        PRS.audio.unlock();
                        S.player.useAnim = 1.0;
                        PRS.world.performGrabOrDrop(S);
                    }
                }),
                el("button", {
                    class: "arcade-btn btn-f",
                    id: "btn-action-f",
                    onclick: () => {
                        if (!S || S.clock.landed) return;
                        PRS.audio.unlock();
                        S.player.useAnim = 1.0;
                        PRS.world.performInteract(S);
                    }
                })
            ])
        ]);

        host.appendChild(hud);
        host.appendChild(minimapWrap);
        host.appendChild(viewport);
        host.appendChild(actionBar);

        dom = {
            clock: $("#hud-clock", host),
            descentLabel: $("#hud-descent-label", host),
            barLungs: $("#bar-lungs", host),
            txtLungs: $("#txt-lungs", host),
            barBurns: $("#bar-burns", host),
            txtBurns: $("#txt-burns", host),
            barCred: $("#bar-cred", host),
            txtCred: $("#txt-cred", host),
            crewPill: $("#hud-crew-pill", host),
            souls: $("#hud-souls", host),
            bag: $("#hud-bag", host),
            toasts: $("#toast-layer", host),
            lookHint: $("#look-lock-hint", host),
            minimap: $("#minimap-canvas", host),
            glCanvas: $("#fp3d-canvas", host),
            overlayCanvas: $("#fp3d-overlay-canvas", host),
            btnE: $("#btn-action-e", host),
            btnF: $("#btn-action-f", host)
        };

        updateHUD(true);
    }

    let lastBagRenderKey = "";
    let lastToastRenderKey = "";

    function updateHUD(force) {
        if (!S || !dom.clock) return;
        const P = S.player;

        dom.clock.textContent = mmss(S.clock.remaining);
        dom.clock.className = "hud-clock" + (S.clock.remaining < 35 ? " urgent" : S.clock.remaining < 75 ? " warn" : "");
        dom.descentLabel.textContent = S.clock.declared ? "⚡ MAYDAY STEEP DESCENT" : "TIME TO TOUCHDOWN";

        const lungsPct = Math.round(clamp01(P.lungs / 100) * 100);
        const burnsPct = Math.round(clamp01(P.burns / 100) * 100);
        const credPct = Math.round(clamp01(S.credibility / 100) * 100);

        dom.barLungs.style.width = lungsPct + "%";
        dom.txtLungs.textContent = lungsPct + "%";
        dom.barBurns.style.width = burnsPct + "%";
        dom.txtBurns.textContent = burnsPct + "%";
        dom.barCred.style.width = credPct + "%";
        dom.txtCred.textContent = credPct + "%";

        if (dom.lookHint) {
            const locked = (document.pointerLockElement === dom.glCanvas);
            dom.lookHint.style.display = locked ? "none" : "block";
        }

        // Crew & Core status pill
        if (S.core.inSink) {
            dom.crewPill.className = "crew-status-pill pill-good";
            dom.crewPill.textContent = "🚰 VAPE CASE SUBMERGED IN SINK!";
        } else if (S.core.stage2Blue) {
            dom.crewPill.className = "crew-status-pill pill-bad";
            dom.crewPill.textContent = "🔵 STAGE 2 BLUE JET! DUNK CASE IN SINK!";
        } else if (S.crewAlerted) {
            dom.crewPill.className = "crew-status-pill pill-good";
            dom.crewPill.textContent = "🫡 CREW IN EMERGENCY MODE";
        } else {
            dom.crewPill.className = "crew-status-pill pill-warn";
            dom.crewPill.textContent = "👮 SEATBELT SIGN ON (Need Proof/Alarm)";
        }

        // Souls counter
        let safeCount = 0, helperCount = 0, aliveCount = 0;
        for (const p of S.pax) {
            if (p.state !== "dead") aliveCount++;
            if (p.state === "safe") safeCount++;
            if (p.helper) helperCount++;
        }
        dom.souls.textContent = "🚪 " + safeCount + " at Doors · 🤝 " + helperCount + " Helpers · ❤️ " + aliveCount + "/" + S.pax.length + " Alive";

        // 3-Slot Bag Bar
        const bagKey = P.activeSlot + ":" + P.hasPhoto + ":" + P.bag.map((s) => s ? s.id + "=" + s.uses : "empty").join(",");
        if (force || bagKey !== lastBagRenderKey) {
            lastBagRenderKey = bagKey;
            clear(dom.bag);
            P.bag.forEach((slot, idx) => {
                if (!slot) return;
                const isAct = idx === P.activeSlot;
                const badge = slot.def.passive ? "PASSIVE ON"
                    : (slot.id === "phone" && P.hasPhoto) ? "📸 PROOF!"
                    : (slot.id === "bin_liner" && slot.uses === 0) ? "EMPTY (Tap)"
                    : slot.uses !== null ? slot.uses + " left" : "READY";
                const sprName = (slot.uses === 0 && slot.def.emptySprite) ? slot.def.emptySprite : slot.def.sprite;
                const bagIconNode = (PRS.atlas && sprName)
                    ? PRS.atlas.icon(sprName, 2, null, "bag-spr")
                    : el("span", { class: "bag-icon", text: slot.def.icon });

                dom.bag.appendChild(el("button", {
                    class: "bag-slot-btn" + (isAct ? " active" : "") + (slot.uses === 0 ? " empty" : ""),
                    onclick: () => {
                        P.activeSlot = idx;
                        updateHUD(true);
                    }
                }, [
                    el("span", { class: "bag-key", text: String(idx + 1) }),
                    bagIconNode,
                    el("div", { class: "bag-meta" }, [
                        el("b", { text: slot.def.short }),
                        el("small", { text: badge })
                    ])
                ]));
            });
        }

        // Toasts
        const tKey = S.toasts.map((t) => t.text).join("|");
        if (force || tKey !== lastToastRenderKey) {
            lastToastRenderKey = tKey;
            clear(dom.toasts);
            for (const t of S.toasts.slice(0, 2)) {
                dom.toasts.appendChild(el("div", { class: "toast-banner toast-" + t.kind, text: t.text }));
            }
        }

        // Bottom Contextual [Right-Click / E] and [Left-Click / F] Arcade Buttons
        const prompts = PRS.world.getPrompts(S);
        if (prompts.e) {
            dom.btnE.disabled = false;
            dom.btnE.className = "arcade-btn btn-e" + (prompts.e.urgent ? " urgent" : "");
            dom.btnE.textContent = "[Right-Click / E] " + prompts.e.label;
        } else {
            dom.btnE.disabled = true;
            dom.btnE.className = "arcade-btn btn-e disabled";
            dom.btnE.textContent = "[Right-Click / E] Look at Case / Pax to Grab";
        }

        if (prompts.f) {
            dom.btnF.disabled = false;
            dom.btnF.className = "arcade-btn btn-f" + (prompts.f.urgent ? " urgent" : "");
            dom.btnF.textContent = "[Left-Click / F] " + prompts.f.label;
        } else {
            dom.btnF.disabled = true;
            dom.btnF.className = "arcade-btn btn-f disabled";
            dom.btnF.textContent = "[Left-Click / F] Move closer to Use / Interact";
        }
    }

    function playLoop(now) {
        rafId = requestAnimationFrame(playLoop);
        const dt = Math.min(0.08, (now - lastTime) / 1000);
        lastTime = now;

        if (!S) return;
        if (!paused && !S.clock.landed) {
            PRS.world.stepWorld(S, dt, {
                forward: inputState.forward,
                backward: inputState.backward,
                strafeLeft: inputState.strafeLeft,
                strafeRight: inputState.strafeRight,
                turnLeft: inputState.turnLeft,
                turnRight: inputState.turnRight,
                jump: inputState.jump,
                crouch: inputState.crouch,
                lookYaw: inputState.lookYaw,
                lookPitch: inputState.lookPitch,
                grabPressed: inputState.grabPressed,
                usePressed: inputState.usePressed,
                slot: inputState.slot
            });
            inputState.lookYaw = 0;
            inputState.lookPitch = 0;
            inputState.grabPressed = false;
            inputState.usePressed = false;
            inputState.slot = null;
        }

        updateHUD(false);
        PRS.render3d.drawMinimap(dom.minimap, S);
        PRS.render3d.drawScene3D(dom.glCanvas, dom.overlayCanvas, S, now);

        if (S.clock.landed && !S._reportShown) {
            S._reportShown = true;
            if (document.pointerLockElement && document.exitPointerLock) {
                document.exitPointerLock();
            }
            setTimeout(() => showReport(S), 900);
        }
    }

    // --------------------------------------------------------- Post-Flight Report Screen ---
    function showReport(state) {
        stopLoop();
        PRS.audio.stopRoar();
        clear(host);
        host.className = "screen report-screen";

        const R = state.report;
        const shareText = [
            "PLEASE REMAIN SEATED (3D) · Flight TN 447 · Seed " + state.seedStr,
            "Grade " + R.grade + " · " + R.aliveCount + "/" + R.totalPax + " Souls Survived (+" + R.savedOverBaseline + " vs. staying asleep)",
            "Character: " + state.character.name + " · Case in Sink: " + (state.core.inSink ? "YES 🚰" : "NO 🔥") + " · Helpers: " + state.stats.helpersRecruited
        ].join("\n");

        const medalsGrid = el("div", { class: "medals-grid" });
        if (R.medals.length === 0) {
            medalsGrid.appendChild(el("div", { class: "no-medals", text: "No special medals unlocked this run — try dunking the burning case in the Aft Lavatory Sink or going viral on an Influencer's stream!" }));
        } else {
            for (const m of R.medals) {
                medalsGrid.appendChild(el("div", { class: "medal-card" }, [
                    el("span", { class: "medal-icon", text: m.icon }),
                    el("div", {}, [
                        el("b", { text: m.name }),
                        el("small", { text: m.desc })
                    ])
                ]));
            }
        }

        const copyBtn = el("button", {
            class: "btn-secondary",
            text: "📋 Copy Competitive Result",
            onclick: () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareText);
                    copyBtn.textContent = "✅ Copied to Clipboard!";
                }
            }
        });

        const panel = el("div", { class: "report-panel" }, [
            el("div", { class: "report-top" }, [
                el("div", { class: "grade-circle grade-" + R.grade, text: R.grade }),
                el("div", { class: "report-headline" }, [
                    el("span", { class: "pill pill-time", text: "TOUCHDOWN · SEED " + state.seedStr }),
                    el("h2", {
                        text: !R.playerAlive
                            ? "You Collapsed Before Touchdown"
                            : R.aliveCount === R.totalPax
                                ? "Miracle Landing — Every Soul Saved!"
                                : R.aliveCount + " of " + R.totalPax + " Passengers Survived"
                    }),
                    el("p", {
                        text: "Staying asleep in your seat on this seed saves " + R.baselineAlive + " passengers. Your actions saved +" + R.savedOverBaseline + " extra souls!"
                    })
                ])
            ]),

            el("div", { class: "report-stats-grid" }, [
                el("div", { class: "r-stat" }, [
                    el("b", { text: R.aliveCount + " / " + R.totalPax }),
                    el("span", { text: "PASSENGERS ALIVE" })
                ]),
                el("div", { class: "r-stat" }, [
                    el("b", { text: "+" + R.savedOverBaseline }),
                    el("span", { text: "SAVED OVER BASELINE" })
                ]),
                el("div", { class: "r-stat" }, [
                    el("b", { text: state.core.inSink ? "SUNK 🚰" : (state.core.stage2Blue ? "BLUE JET 🔵" : "BURNING 🔥") }),
                    el("span", { text: "LITHIUM VAPE CASE" })
                ]),
                el("div", { class: "r-stat" }, [
                    el("b", { text: String(state.stats.helpersRecruited) }),
                    el("span", { text: "HELPERS RECRUITED" })
                ]),
                el("div", { class: "r-stat" }, [
                    el("b", { text: String(state.stats.savedAtDoors) }),
                    el("span", { text: "SECURED AT DOORS" })
                ])
            ]),

            el("div", { class: "section-label", text: "MEDALS & HIGHLIGHTS" }),
            medalsGrid,

            el("pre", { class: "share-box", text: shareText }),

            el("div", { class: "report-actions" }, [
                el("button", {
                    class: "btn-launch-primary",
                    onclick: () => startGame({ seed: state.seedStr, isDaily: state.isDaily })
                }, [
                    el("b", { text: "↻ FLY SAME SEED AGAIN" }),
                    el("small", { text: "Beat your score on Seed " + state.seedStr })
                ]),
                el("button", {
                    class: "btn-launch-daily",
                    onclick: () => startGame({})
                }, [
                    el("b", { text: "✈️ NEW RANDOM FLIGHT" }),
                    el("small", { text: "Fresh cabin & seed" })
                ]),
                copyBtn,
                el("button", {
                    class: "btn-secondary",
                    text: "👤 Change Character / Loadout",
                    onclick: () => showTitle()
                })
            ])
        ]);

        host.appendChild(panel);
    }

    function stopLoop() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
    }

    // --------------------------------------------------- First-Person 3D Keyboard Handling ---
    function onKeyDown(ev) {
        const tag = (ev.target && ev.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;

        const k = ev.key;
        if (k === "w" || k === "W" || k === "ArrowUp") { inputState.forward = true; ev.preventDefault(); }
        else if (k === "s" || k === "S" || k === "ArrowDown") { inputState.backward = true; ev.preventDefault(); }
        else if (k === "a" || k === "A") { inputState.strafeLeft = true; ev.preventDefault(); }
        else if (k === "d" || k === "D") { inputState.strafeRight = true; ev.preventDefault(); }
        else if (k === "q" || k === "Q" || k === "ArrowLeft") { inputState.turnLeft = true; ev.preventDefault(); }
        else if (k === "ArrowRight") { inputState.turnRight = true; ev.preventDefault(); }
        else if (k === " ") { inputState.jump = true; ev.preventDefault(); }
        else if (k === "c" || k === "C" || k === "Control" || k === "Shift") { inputState.crouch = true; ev.preventDefault(); }
        else if (k === "e" || k === "E" || k === "g" || k === "G") {
            if (!ev.repeat) inputState.grabPressed = true;
            ev.preventDefault();
        } else if (k === "f" || k === "F" || k === "Enter") {
            if (!ev.repeat) inputState.usePressed = true;
            ev.preventDefault();
        } else if (k === "1" || k === "2" || k === "3") {
            inputState.slot = Number(k) - 1;
            ev.preventDefault();
        } else if (k === "m" || k === "M") {
            PRS.audio.unlock();
            PRS.audio.setEnabled(!PRS.audio.isEnabled());
            store.set("sound", PRS.audio.isEnabled());
        } else if ((k === "r" || k === "R") && S && !S.clock.landed) {
            startGame({ seed: S.seedStr, isDaily: S.isDaily });
        }
    }

    function onKeyUp(ev) {
        const k = ev.key;
        if (k === "w" || k === "W" || k === "ArrowUp") inputState.forward = false;
        else if (k === "s" || k === "S" || k === "ArrowDown") inputState.backward = false;
        else if (k === "a" || k === "A") inputState.strafeLeft = false;
        else if (k === "d" || k === "D") inputState.strafeRight = false;
        else if (k === "q" || k === "Q" || k === "ArrowLeft") inputState.turnLeft = false;
        else if (k === "ArrowRight") inputState.turnRight = false;
        else if (k === " ") inputState.jump = false;
        else if (k === "c" || k === "C" || k === "Control" || k === "Shift") inputState.crouch = false;
    }

    function boot() {
        host = document.getElementById("app");
        if (!host) return;
        PRS.audio.setEnabled(store.get("sound", true) !== false);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        showTitle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    PRS.app = { boot, showTitle, startGame };
})(window);
