// Deck: PEOPLE. Sixty-odd definitions, each of which appears once per person you can reach, so
// in play this is several hundred entries and it is the only deck that scales.
//
// The arithmetic, written down once: you can carry about fourteen people in nine hundred seconds.
// A recruited helper carries about nine. Four helpers is thirty-six. Nothing else in this game is
// worth a fraction of a helper, and the whole design is arranged so that the player has to work
// that out for themselves, from the log, while a man in 21F asks them to sit down.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const P = PRS.pax;
    const clamp = PRS.util.clamp;

    // ------------------------------------------------------------------------------ targeting ---

    function reach(S) {
        return st.reachable(S).map((p) => ({ key: p.id, p: p }));
    }
    function reachAwake(S) {
        return reach(S).filter((c) => c.p.state !== "down" && c.p.state !== "dead");
    }
    function reachDown(S) {
        return reach(S).filter((c) => c.p.state === "down");
    }
    function carried(S) {
        return S.player.carrying.map((id) => ({ key: id, p: st.paxById(S, id) }))
                                .filter((c) => c.p);
    }
    function who(c) { return c.p.name; }
    function seatOf(c) { return c.p.seat; }

    // --------------------------------------------------------------------------- the carry ----

    function pickUp(S, p) {
        p.state = "carried";
        p.carriedBy = "player";
        p.belted = false;
        p.x = S.player.x; p.y = S.player.y;
        S.player.carrying.push(p.id);
        if (!S.flags.firstCarry) {
            st.setFlag(S, "firstCarry", p.id);
            if (P.isChild(p)) st.setFlag(S, "firstCarryChild");
        }
        st.reindex(S);
        PRS.audio.play("grab");
    }

    function putDown(S, p, silent) {
        S.player.carrying = S.player.carrying.filter((id) => id !== p.id);
        p.carriedBy = null;
        p.x = S.player.x; p.y = S.player.y;
        const safe = cabin.isSafeZone(S.player.x, S.player.y);
        if (safe) {
            p.state = "secured";
            p.securedAt = S.clock.elapsed;
            p.braced = true;
            S.stats.carriesCompleted++;
            S.credibility = Math.min(100, S.credibility + 3);
            PRS.audio.play("secure");
        } else {
            p.state = p.smokeDose > P.DOWN_AT ? "down" : P.looseState(p);
            PRS.audio.play("drop");
        }
        st.reindex(S);
        return safe;
    }

    function distanceToSafe(S) {
        return Math.min(
            Math.abs(S.player.x - cabin.FWD_CROSS_X),
            Math.abs(S.player.x - cabin.OVERWING_X),
            Math.abs(S.player.x - cabin.AFT_CROSS_X));
    }

    // ------------------------------------------------------------------------------ speaking ---

    function say(S, p, line, opts) {
        opts = opts || {};
        const roll = P.convince(S, p, opts.bonus || 0);
        S.stats.wordsSpoken += (line || "").split(" ").length;
        p.awareness = Math.min(100, p.awareness + (opts.awareness || 10));
        return roll;
    }

    A.register([
        // ------------------------------------------------------------------------- carrying ---
        {
            id: "people.carry", deck: "people", tags: ["carry", "hands"], danger: "good",
            targets: (S) => reach(S).filter((c) => c.p.state !== "carried" &&
                                                   c.p.state !== "secured"),
            when: (S, c) => P.canCarry(S, c.p),
            label: (S, c) => "Pick up " + who(c),
            detail: (S, c) => c.p.seat + " · " + c.p.kg + "kg · " + P.displayState(c.p) +
                              " · " + P.condition(c.p).label,
            cost: (S, c) => P.carryOverhead(S, c.p),
            run(S, c) {
                pickUp(S, c.p);
                const d = distanceToSafe(S);
                return "You get " + c.p.name + " out of " + c.p.seat + " and into your arms. " +
                    "The nearest safe zone is " + d + " rows away. " +
                    (c.p.state === "down" ? "" : "“" + c.p.refuse.replace(/^“|”$/g, "") + "”");
            },
        },

        {
            id: "people.put_down", deck: "people", tags: ["carry"], danger: "good",
            targets: carried,
            label: (S, c) => cabin.isSafeZone(S.player.x, S.player.y)
                ? "Put " + who(c) + " down here — this is a safe zone"
                : "Put " + who(c) + " down",
            detail: (S) => cabin.isSafeZone(S.player.x, S.player.y)
                ? "They are accounted for."
                : "They are not accounted for. This is not a safe zone.",
            cost: (S, c) => 5 + c.p.kg * 0.05,
            run(S, c) {
                const safe = putDown(S, c.p);
                if (safe) {
                    const smoke = S.fire.smoke[cabin.idx(S.player.x, S.player.y)];
                    return { text: c.p.name + " is down, low and out of the seats at " +
                        cabin.safeZoneName(S.player.x) + ". That is one soul accounted for. " +
                        st.securedCount(S) + " of 61." +
                        (smoke > 30 ? " The air here is not what it was, and being accounted for " +
                                      "is not the same thing as being all right." : ""),
                        kind: "great" };
                }
                return { text: "You put " + c.p.name + " down in " +
                    cabin.placeName(S.player.x, S.player.y) + ", which is not a safe zone, and " +
                    "they are exactly as badly off as they were.", kind: "bad" };
            },
        },

        {
            id: "people.drag", deck: "people", tags: ["carry"], danger: "neutral",
            // Dragging is the answer to somebody you cannot lift, so it offers itself for the
            // unconscious, for the wheelchair users, and for anybody heavier than your arms.
            targets: (S) => reach(S).filter((c) => c.p.state === "down" ||
                                                   c.p.traits.indexOf("immobile") >= 0 ||
                                                   !P.canCarry(S, c.p)),
            when: (S, c) => !S.player.dragging && S.player.carrying.length === 0 &&
                            c.p.state !== "secured" && c.p.state !== "dead",
            label: (S, c) => "Drag " + who(c) + " along the floor",
            detail: (S, c) => c.p.kg + "kg. Slower than carrying, and it works on people you " +
                              "cannot lift.",
            cost: (S, c) => 8 + c.p.kg * 0.06,
            run(S, c) {
                S.player.dragging = c.p.id;
                c.p.state = "carried";
                c.p.carriedBy = "player";
                if (c.p.kg > 90) st.setFlag(S, "carriedHeavy");
                st.reindex(S);
                return "You get " + c.p.name + " under the arms and start dragging. It is " +
                    "undignified, it is slow, and it is under the smoke.";
            },
        },

        {
            id: "people.stop_drag", deck: "people", tags: ["carry"],
            when: (S) => !!S.player.dragging,
            label: (S) => { const p = st.paxById(S, S.player.dragging);
                            return "Stop dragging " + (p ? p.name : "them"); },
            cost: 4,
            run(S) {
                const p = st.paxById(S, S.player.dragging);
                S.player.dragging = null;
                if (!p) return "Your hands are empty.";
                p.carriedBy = null;
                const safe = cabin.isSafeZone(S.player.x, S.player.y);
                p.state = safe ? "secured" : "down";
                if (safe) { p.securedAt = S.clock.elapsed; S.stats.carriesCompleted++; }
                st.reindex(S);
                return safe
                    ? { text: p.name + " is at " + cabin.safeZoneName(S.player.x) + ". " +
                              st.securedCount(S) + " of 61.", kind: "great" }
                    : "You let go of " + p.name + " at " + cabin.placeName(S.player.x, S.player.y) + ".";
            },
        },

        {
            id: "people.hoist", deck: "people", tags: ["carry"], danger: "bad",
            targets: (S) => reach(S).filter((c) => c.p.state !== "secured" && c.p.state !== "carried"),
            when: (S, c) => st.hasPerk(S, "hoist"),
            label: (S, c) => "Throw " + who(c) + " over the seats toward the front",
            detail: "It covers four rows in one second. They will not enjoy it.",
            cost: 12,
            run(S, c) {
                const p = c.p;
                const nx = Math.max(cabin.FWD_CROSS_X, p.x - 5);
                p.x = nx; p.y = cabin.AISLE_Y;
                p.burns += 2;
                p.trust -= 25;
                p.panic = Math.min(100, p.panic + 30);
                if (cabin.isSafeZone(nx, cabin.AISLE_Y)) {
                    p.state = "secured";
                    p.securedAt = S.clock.elapsed;
                    S.stats.carriesCompleted++;
                    st.reindex(S);
                    return { text: "You throw " + p.name + " five rows up the cabin and they land " +
                        "in the forward cross-aisle, on a person, alive and accounted for. The " +
                        "cabin has never been quieter.", kind: "great" };
                }
                p.state = P.looseState(p);
                st.reindex(S);
                return { text: "You throw " + p.name + " five rows up the cabin. They land badly, " +
                    "in the aisle, at row " + (cabin.rowAt(nx) || "?") + ", and they are five " +
                    "rows better off and furious.", kind: "bad" };
            },
        },

        {
            id: "people.pass_forward", deck: "people", tags: ["carry", "social"], danger: "good",
            targets: (S) => reach(S).filter((c) => c.p.state !== "secured" && c.p.state !== "carried"),
            when: (S, c) => st.helperCount(S) >= 2 || S.credibility > 55,
            label: (S, c) => "Pass " + who(c) + " forward, hand to hand",
            detail: "Down the aisle over the heads of everybody who is still sitting down.",
            cost: 26,
            run(S, c) {
                const p = c.p;
                const roll = P.convince(S, p, 15);
                if (!roll.ok && p.state !== "down") {
                    return { text: p.name + " will not go and the four people you needed to pass " +
                        "them to have gone back to looking out of the window.", kind: "bad" };
                }
                p.x = cabin.FWD_CROSS_X; p.y = cabin.AISLE_Y;
                p.state = "secured";
                p.securedAt = S.clock.elapsed;
                S.stats.carriesCompleted++;
                st.reindex(S);
                PRS.audio.play("secure");
                return { text: p.name + " goes forward over eleven rows of raised hands and " +
                    "arrives at the forward galley in nineteen seconds. That is four times faster " +
                    "than you can walk it. " + st.securedCount(S) + " of 61.", kind: "great" };
            },
        },

        // ---------------------------------------------------------------------- recruitment ---
        {
            id: "people.recruit", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reachAwake(S).filter((c) => !c.p.helper),
            label: (S, c) => "Ask " + who(c) + " to help you",
            detail: (S, c) => {
                const r = P.resistance(S, c.p);
                const v = P.persuasion(S);
                const odds = r > v + 20 ? "not going to" : r > v ? "unlikely to"
                           : r > v - 25 ? "probably going to" : "going to";
                const cond = P.condition(c.p);
                // A helper who is already full of smoke will be on the floor inside a minute,
                // and the list has to say so, because "recruit everybody" is not the lesson.
                const health = cond.tier >= 2
                    ? " They are " + cond.label + " and they will not last long on their feet."
                    : cond.tier === 1 ? " They are already coughing." : "";
                return "They are " + odds + " say yes." + health;
            },
            cost: 22,
            run(S, c) {
                const p = c.p;
                const roll = say(S, p, "help", { bonus: 6, awareness: 16 });
                if (!roll.ok) {
                    PRS.audio.play("refuse");
                    return { text: p.name + ": " + P.speak(S, p) + " (Ask again. It gets easier " +
                        "every time, and it gets easier faster if they can see the fire.)",
                        kind: "bad" };
                }
                P.recruit(S, p, "They are going to work the cabin until this ends.");
                return { text: p.name + " unbuckles, stands up, and asks who is next. " +
                    st.helperCount(S) + " people are now doing this instead of one.", kind: "great" };
            },
        },

        {
            id: "people.recruit_row", deck: "people", tags: ["social"], danger: "good",
            when: (S) => st.hasPerk(S, "flock") && cabin.rowAt(S.player.x) !== null,
            label: (S) => "Ask the whole of row " + cabin.rowAt(S.player.x) + " to help",
            detail: "Six people at once. This is what the perk is for.",
            cost: 34,
            run(S) {
                const row = cabin.rowAt(S.player.x);
                const here = S.pax.filter((p) => p.row === row && !p.helper &&
                    p.state !== "down" && p.state !== "secured" && p.state !== "dead");
                let n = 0;
                for (const p of here) {
                    const roll = P.convince(S, p, 10);
                    if (roll.ok) { P.recruit(S, p); n++; }
                }
                if (!n) return { text: "Row " + row + " looks at you. Row " + row + " looks away.",
                                 kind: "bad" };
                return { text: n + " of row " + row + " get up at the same time. There is a moment " +
                    "where the whole row moves together and it is the first time this aeroplane " +
                    "has done anything as a group.", kind: "great" };
            },
        },

        {
            id: "people.direct_helper", deck: "people", tags: ["social"], danger: "good",
            targets(S) {
                const out = [];
                for (const h of S.pax) {
                    if (!h.helper) continue;
                    for (const t of st.reachable(S)) {
                        if (t.helper || t.state === "secured" || t.state === "dead") continue;
                        out.push({ key: h.id + ">" + t.id, h: h, t: t });
                    }
                }
                return out.slice(0, 24);
            },
            label: (S, c) => "Send " + c.h.name + " for " + c.t.name,
            detail: (S, c) => c.t.seat + " · " + c.t.kg + "kg · " + P.condition(c.t).label,
            cost: 10,
            run(S, c) {
                c.h.helperTarget = c.t.id;
                c.h.helperPhase = "carry";
                c.t.claimedBy = c.h.id;
                const dist = Math.abs(c.t.x - c.h.x) + Math.abs(c.t.x - P.nearestSafeX(c.t.x));
                c.h.taskLeft = (10 + c.t.kg * 0.16 + dist * 1.5) * 1.5;
                return c.h.name + " goes for " + c.t.name + " in " + c.t.seat + " without asking " +
                    "you a single question about it.";
            },
        },

        {
            id: "people.thank_helper", deck: "people", tags: ["social"],
            targets: (S) => reach(S).filter((c) => c.p.helper),
            label: (S, c) => "Tell " + who(c) + " they are doing well",
            detail: "It costs eight seconds and it is not nothing.",
            cost: 8,
            run(S, c) {
                c.p.trust = Math.min(100, c.p.trust + 15);
                c.p.panic = Math.max(0, c.p.panic - 18);
                c.p.taskLeft = Math.max(0, (c.p.taskLeft || 0) - 5);
                return c.p.name + " does not answer. " + c.p.name + " nods once and goes back " +
                    "for the next one, slightly faster.";
            },
        },

        // ------------------------------------------------------------------------- talking ---
        {
            id: "people.tell", deck: "people", tags: ["social"],
            targets: reachAwake,
            label: (S, c) => "Tell " + who(c) + " there is a fire",
            detail: (S, c) => c.p.trust > 30 ? "They are listening to you now."
                                             : "They are not going to believe you.",
            cost: 14,
            run(S, c) {
                const roll = say(S, c.p, "there is a fire", { awareness: 22 });
                S.credibility = Math.min(100, S.credibility + (roll.ok ? 3 : 1));
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 18);
                    return { text: c.p.name + " looks up at the locker, then at you, then at the " +
                        "locker. “...Right. Right.”", kind: "good" };
                }
                return { text: c.p.name + ": " + P.speak(S, c.p), kind: "plain" };
            },
        },

        {
            id: "people.show_photo", deck: "people", tags: ["social"], danger: "good",
            targets: reachAwake,
            when: (S) => !!S.flags.havePhoto,
            label: (S, c) => "Show " + who(c) + " the photograph",
            detail: "Telling people is slow. Showing them is not.",
            cost: 9,
            run(S, c) {
                const roll = say(S, c.p, "look", { bonus: 30, awareness: 30 });
                c.p.trust = Math.min(100, c.p.trust + 30);
                S.credibility = Math.min(100, S.credibility + 4);
                return { text: c.p.name + " looks at your phone for two full seconds and then " +
                    "unbuckles their seatbelt without being asked.", kind: "good" };
            },
        },

        {
            id: "people.point_at_it", deck: "people", tags: ["social"],
            targets: reachAwake,
            label: (S, c) => "Make " + who(c) + " look at the bin",
            detail: "Physically turn their head if you have to.",
            cost: 11,
            run(S, c) {
                const visible = PRS.fire.worst(S.fire) > 12;
                c.p.awareness = Math.min(100, c.p.awareness + (visible ? 40 : 14));
                if (visible) {
                    c.p.trust = Math.min(100, c.p.trust + 25);
                    return { text: c.p.name + " sees it. There is a particular noise a person " +
                        "makes and " + c.p.name + " makes it.", kind: "good" };
                }
                return c.p.name + " looks at the bin. The bin looks like a bin.";
            },
        },

        {
            id: "people.lie", deck: "people", tags: ["social"], danger: "neutral",
            targets: reachAwake,
            label: (S, c) => "Tell " + who(c) + " the crew asked you to move them",
            detail: "It is not true. It works about half the time and it costs you later.",
            cost: 12,
            run(S, c) {
                const roll = say(S, c.p, "the crew asked me", { bonus: 26 });
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 26);
                    c.p.belted = false;
                    c.p.state = c.p.state === "seated" ? "standing" : c.p.state;
                    st.setFlag(S, "toldALie");
                    return { text: "“Oh — well, if the crew said.” " + c.p.name + " is out of " +
                        "the seat in four seconds, which is faster than the truth has managed " +
                        "all afternoon.", kind: "good" };
                }
                c.p.trust -= 20;
                S.credibility = Math.max(0, S.credibility - 6);
                return { text: "“I'll wait for them to tell me themselves, thank you.” That is " +
                    "going to be harder next time.", kind: "bad" };
            },
        },

        {
            id: "people.truth", deck: "people", tags: ["social"],
            targets: reachAwake,
            label: (S, c) => "Tell " + who(c) + " exactly how bad it is",
            detail: "No softening. The number of cells, the smoke, the time.",
            cost: 20,
            run(S, c) {
                const roll = say(S, c.p, "the truth", { bonus: st.hasPerk(S, "reads_fire") ? 22 : 4,
                                                        awareness: 34 });
                c.p.panic = Math.min(100, c.p.panic + 22);
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 34);
                    return { text: c.p.name + " takes it. Actually takes it. “What do you want me " +
                        "to do.”", kind: "great" };
                }
                return { text: c.p.name + " does not want it and you have just made them much " +
                    "more frightened without making them any more useful.", kind: "bad" };
            },
        },

        {
            id: "people.reassure", deck: "people", tags: ["social"],
            targets: reachAwake,
            label: (S, c) => "Calm " + who(c) + " down",
            detail: "A panicking person is a person who cannot be asked to do anything.",
            cost: 13,
            run(S, c) {
                const drop = 22 + S.derived.voiceMul * 14 + (st.hasPerk(S, "calm_presence") ? 20 : 0);
                c.p.panic = Math.max(0, c.p.panic - drop);
                c.p.trust = Math.min(100, c.p.trust + 12);
                if (c.p.state === "aisle" && c.p.panic < 50) {
                    c.p.state = P.looseState(c.p);
                    c.p.x = c.p.homeX; c.p.y = c.p.homeY;
                    st.reindex(S);
                }
                return c.p.name + "'s breathing comes down. It takes thirteen seconds and it is " +
                    "thirteen seconds well spent.";
            },
        },

        {
            id: "people.shout_at", deck: "people", tags: ["social"], danger: "bad",
            targets: reachAwake,
            label: (S, c) => "Shout at " + who(c),
            cost: 7,
            run(S, c) {
                const roll = say(S, c.p, "MOVE", { bonus: -10, awareness: 24 });
                c.p.panic = Math.min(100, c.p.panic + 20);
                S.cabinPanic = Math.min(100, S.cabinPanic + 4);
                if (roll.ok) {
                    c.p.belted = false;
                    c.p.state = P.looseState(c.p);
                    return { text: c.p.name + " gets up because you shouted, which will work " +
                        "exactly once.", kind: "plain" };
                }
                c.p.trust -= 14;
                return { text: c.p.name + " shouts back. Three other people join in on their side.",
                         kind: "bad" };
            },
        },

        {
            id: "people.threaten", deck: "people", tags: ["social"], danger: "bad",
            targets: reachAwake,
            label: (S, c) => "Threaten " + who(c),
            when: (S, c) => c.p.traits.indexOf("hostile") >= 0 || S.player.panic > 60,
            cost: 10,
            run(S, c) {
                const roll = say(S, c.p, "threat", { bonus: st.hasPerk(S, "authority") ? 30 : -14 });
                if (roll.ok) {
                    c.p.belted = false;
                    c.p.state = P.looseState(c.p);
                    return { text: c.p.name + " believes you, gets up, and is going to describe " +
                        "you very accurately to an investigator in about six weeks.", kind: "plain" };
                }
                c.p.trust -= 30;
                S.credibility = Math.max(0, S.credibility - 8);
                return { text: c.p.name + " calls for the cabin crew. Loudly. By name.", kind: "bad" };
            },
        },

        {
            id: "people.badge", deck: "people", tags: ["social"], danger: "good",
            targets: reachAwake,
            when: (S) => st.hasPerk(S, "authority"),
            label: (S, c) => "Show " + who(c) + " the badge",
            detail: "Ends the conversation. That is what it is for.",
            cost: 6,
            run(S, c) {
                c.p.trust = 80;
                c.p.belted = false;
                c.p.state = P.looseState(c.p);
                c.p.awareness = Math.min(100, c.p.awareness + 30);
                S.credibility = Math.min(100, S.credibility + 5);
                return { text: c.p.name + " reads the badge, goes very slightly grey, and does " +
                    "exactly what you say for the rest of the flight.", kind: "good" };
            },
        },

        {
            id: "people.restrain", deck: "people", tags: ["social"], danger: "neutral",
            targets: (S) => reachAwake(S).filter((c) => c.p.state === "aisle" ||
                                                        c.p.traits.indexOf("hostile") >= 0),
            when: (S) => st.hasPerk(S, "restrain"),
            label: (S, c) => "Restrain " + who(c),
            detail: "They are in the aisle and the aisle is the whole game.",
            cost: 18,
            run(S, c) {
                const p = c.p;
                p.state = "seated";
                p.x = p.homeX; p.y = p.homeY;
                p.belted = true;
                p.trust = -40;
                delete S.cabinFlags.aisleBlocked[p.homeX];
                st.reindex(S);
                return { text: "You put " + p.name + " back in " + p.seat + " with a wrist lock " +
                    "and a cable tie. The aisle at row " + p.row + " is clear.", kind: "good" };
            },
        },

        {
            id: "people.tape_to_seat", deck: "people", tags: ["social", "fiddly"], danger: "bad",
            targets: (S) => reachAwake(S).filter((c) => c.p.state === "aisle"),
            when: (S) => !!st.slotOf(S, "tape") && st.slotOf(S, "tape").uses > 0,
            label: (S, c) => "Tape " + who(c) + " into a seat",
            cost: 24,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "tape"));
                const p = c.p;
                p.state = "seated"; p.x = p.homeX; p.y = p.homeY; p.belted = true;
                p.trust = -60;
                delete S.cabinFlags.aisleBlocked[p.homeX];
                st.reindex(S);
                S.credibility = Math.max(0, S.credibility - 10);
                return { text: "You duct tape a member of the public into seat " + p.seat + ". " +
                    "The aisle is clear. There is going to be a paragraph about this.", kind: "bad" };
            },
        },

        // ------------------------------------------------------------------------- the body ---
        {
            id: "people.unbuckle", deck: "people", tags: ["hands", "fiddly"],
            targets: (S) => reach(S).filter((c) => c.p.belted),
            label: (S, c) => "Unbuckle " + who(c),
            cost: 6,
            run(S, c) { c.p.belted = false;
                        return "The buckle comes up. " + c.p.name + " is loose."; },
        },

        {
            id: "people.cut_belt", deck: "people", tags: ["hands"],
            targets: (S) => reach(S).filter((c) => c.p.belted),
            when: (S) => !!st.inventoryHas(S, "cut"),
            label: (S, c) => "Cut " + who(c) + "'s seatbelt",
            detail: "Two seconds instead of six, and it cannot be done up again.",
            cost: 3,
            run(S, c) { c.p.belted = false;
                        return "You cut the belt off " + c.p.name + ". Nobody is putting them " +
                               "back in that seat now."; },
        },

        {
            id: "people.shake", deck: "people", tags: ["hands"],
            targets: (S) => reach(S).filter((c) => c.p.state === "asleep"),
            label: (S, c) => "Shake " + who(c) + " awake",
            cost: 9,
            run(S, c) {
                c.p.state = "seated";
                c.p.awareness = Math.min(100, c.p.awareness + 40);
                return c.p.name + " comes up out of it badly. " + c.p.refuse;
            },
        },

        {
            id: "people.revive", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reachDown(S),
            when: (S) => st.hasPerk(S, "triage"),
            label: (S, c) => "Bring " + who(c) + " round",
            detail: "Airway, oxygen, and a great deal of shouting.",
            cost: 30,
            run(S, c) {
                const p = c.p;
                p.smokeDose = Math.max(0, p.smokeDose - 26);
                if (p.smokeDose < P.DOWN_AT) {
                    p.state = P.looseState(p);
                    S.stats.revives++;
                    PRS.audio.play("good");
                    return { text: p.name + " comes back. Coughing, grey, appalled, and upright. " +
                        "This is a thing almost nobody on this aeroplane can do.", kind: "great" };
                }
                return { text: "You get some air into " + p.name + " and they do not come round. " +
                    "They are better off than they were.", kind: "plain" };
            },
        },

        {
            id: "people.burn_gel", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reach(S).filter((c) => c.p.burns > 8),
            when: (S) => { const s = st.slotOf(S, "first_aid"); return s && s.uses > 0; },
            label: (S, c) => "Put burn gel on " + who(c),
            cost: 20,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "first_aid"));
                c.p.burns = Math.max(0, c.p.burns - 22);
                c.p.trust = Math.min(100, c.p.trust + 20);
                return { text: "Burn gel and a dressing on " + c.p.name + ". It will not stop them " +
                    "being in hospital tonight. It will stop them being in hospital for a month.",
                    kind: "good" };
            },
        },

        {
            id: "people.inhaler", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reach(S).filter((c) => c.p.smokeDose > 20),
            when: (S) => { const s = st.slotOf(S, "inhaler"); return s && s.uses > 0; },
            label: (S, c) => "Give " + who(c) + " the inhaler",
            cost: 10,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "inhaler"));
                c.p.smokeDose = Math.max(0, c.p.smokeDose - 16);
                if (c.p.state === "down" && c.p.smokeDose < P.DOWN_AT) c.p.state = P.looseState(c.p);
                return { text: "Two puffs and a spacer made out of a paper cup. " + c.p.name +
                    " gets a breath in that goes all the way down.", kind: "good" };
            },
        },

        {
            id: "people.mask", deck: "people", tags: ["hands"],
            targets: (S) => reach(S).filter((c) => !c.p.masked),
            when: (S) => S.cabinFlags.masksDropped,
            label: (S, c) => "Put the oxygen mask on " + who(c),
            detail: "It is not oxygen for smoke. It is better than smoke.",
            cost: 11,
            run(S, c) {
                c.p.masked = true;
                return c.p.name + " has a mask on. It is a chemical oxygen generator designed for " +
                    "a decompression and it is going to help anyway.";
            },
        },

        {
            id: "people.wet_cloth", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reach(S).filter((c) => !c.p.masked),
            when: (S) => !!st.inventoryHas(S, "cloth"),
            label: (S, c) => "Tie something wet over " + who(c) + "'s face",
            detail: "Not as good as a mask. Available now, which a mask is not.",
            cost: 13,
            run(S, c) {
                const s = st.inventoryHas(S, "cloth");
                st.useCharge(S, s);
                c.p.masked = true;
                return { text: "You tie " + s.item.name.toLowerCase() + " over " + c.p.name +
                    "'s nose and mouth. They can breathe through it, which is the entire " +
                    "specification.", kind: "good" };
            },
        },

        {
            id: "people.headphones_off", deck: "people", tags: ["hands"],
            targets: (S) => reach(S).filter((c) => c.p.traits.indexOf("headphones") >= 0 &&
                                                   !c.p.deafened),
            label: (S, c) => "Take " + who(c) + "'s headphones off",
            detail: "They have not heard one word of any of this.",
            cost: 5,
            run(S, c) {
                c.p.deafened = true;
                c.p.traits = c.p.traits.filter((t) => t !== "headphones");
                c.p.awareness = Math.min(100, c.p.awareness + 26);
                return "You lift " + c.p.name + "'s headphones off. The cabin arrives all at once " +
                    "and their face does something complicated.";
            },
        },

        {
            id: "people.brace", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reach(S).filter((c) => !c.p.braced),
            label: (S, c) => "Show " + who(c) + " the brace position",
            detail: "Head down, hands over, feet back. It is worth doing and it is on the card.",
            cost: 14,
            run(S, c) {
                c.p.braced = true;
                c.p.panic = Math.max(0, c.p.panic - 12);
                return { text: c.p.name + " gets into the brace position properly, which almost " +
                    "nobody on any aeroplane ever does. It is worth about four seconds of smoke.",
                    kind: "good" };
            },
        },

        {
            id: "people.floor", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reach(S).filter((c) => c.p.state !== "secured" && c.p.state !== "carried"),
            label: (S, c) => "Get " + who(c) + " down onto the floor",
            detail: "The smoke is at the ceiling. A person on the floor is in different air.",
            cost: 12,
            run(S, c) {
                c.p.braced = true;
                c.p.smokeDose = Math.max(0, c.p.smokeDose - 4);
                return { text: c.p.name + " gets down between the seat rows, under the layer. " +
                    "Nothing about their situation has improved except the only thing that " +
                    "matters.", kind: "good" };
            },
        },

        // -------------------------------------------------------------------------- giving ---
        {
            id: "people.give_water", deck: "people", tags: ["hands"],
            targets: reachAwake,
            when: (S) => { const s = st.slotOf(S, "water_big"); return s && s.uses > 0; },
            label: (S, c) => "Give " + who(c) + " some water",
            cost: 8,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "water_big"));
                c.p.smokeDose = Math.max(0, c.p.smokeDose - 5);
                c.p.trust = Math.min(100, c.p.trust + 22);
                c.p.panic = Math.max(0, c.p.panic - 14);
                return c.p.name + " drinks it and hands the bottle back and is, from this moment, " +
                    "on your side.";
            },
        },

        {
            id: "people.give_gin", deck: "people", tags: ["hands"],
            targets: reachAwake,
            when: (S) => { const s = st.slotOf(S, "gin"); return s && s.uses > 0; },
            label: (S, c) => "Give " + who(c) + " a miniature",
            detail: "It is a terrible idea and it will absolutely work.",
            cost: 6,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "gin"));
                c.p.panic = Math.max(0, c.p.panic - 34);
                c.p.trust = Math.min(100, c.p.trust + 28);
                c.p.awareness = Math.max(0, c.p.awareness - 10);
                return c.p.name + " drinks fifty millilitres of gin at eleven thousand feet and " +
                    "becomes noticeably easier to work with and noticeably worse at everything.";
            },
        },

        {
            id: "people.give_pretzels", deck: "people", tags: ["hands"],
            targets: (S) => reachAwake(S).filter((c) => P.isChild(c.p)),
            when: (S) => { const s = st.slotOf(S, "pretzels"); return s && s.uses > 0; },
            label: (S, c) => "Give " + who(c) + " the pretzels",
            cost: 5,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "pretzels"));
                c.p.trust = 90;
                c.p.panic = Math.max(0, c.p.panic - 40);
                return { text: c.p.name + " will now follow you anywhere in the world. It cost a " +
                    "bag of pretzels. Nothing else in this game has this exchange rate.",
                    kind: "good" };
            },
        },

        {
            id: "people.give_torch", deck: "people", tags: ["hands"],
            targets: reachAwake,
            when: (S) => !!st.slotOf(S, "torch"),
            label: (S, c) => "Give " + who(c) + " the torch",
            detail: "Somebody at the front needs to be able to see the door.",
            cost: 6,
            run(S, c) {
                c.p.trust = Math.min(100, c.p.trust + 25);
                st.setFlag(S, "torchGiven");
                return c.p.name + " has the torch. When the smoke gets to the floor there is now " +
                    "one light in this cabin that is pointing at a door.";
            },
        },

        // ------------------------------------------------------------------------- the ones ---

        {
            id: "people.follow", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reachAwake(S).filter((c) => !P.needsCarrying(c.p) &&
                                                        c.p.state !== "secured"),
            label: (S, c) => "Tell " + who(c) + " to walk forward on their own",
            detail: "The cheapest save there is, and it only works on the ones who can walk.",
            cost: 18,
            run(S, c) {
                const roll = P.convince(S, c.p, 8);
                if (!roll.ok) {
                    return { text: c.p.name + ": " + P.speak(S, c.p), kind: "bad" };
                }
                const p = c.p;
                p.x = P.nearestSafeX(p.x); p.y = cabin.AISLE_Y;
                p.state = "secured";
                p.securedAt = S.clock.elapsed;
                st.reindex(S);
                PRS.audio.play("secure");
                return { text: p.name + " gets up and walks to " + cabin.safeZoneName(p.x) +
                    " without being carried, which took eleven seconds instead of fifty. " +
                    st.securedCount(S) + " of 61.", kind: "great" };
            },
        },

        {
            id: "people.chain", deck: "people", tags: ["social"], danger: "good",
            when: (S) => cabin.rowAt(S.player.x) !== null && S.credibility > 48,
            label: (S) => "Get row " + cabin.rowAt(S.player.x) + " to hold onto each other and go",
            detail: "Hands on shoulders. A line. It is how you move a whole row at once.",
            cost: 62,
            run(S) {
                const row = cabin.rowAt(S.player.x);
                const here = S.pax.filter((p) => p.row === row && p.state !== "secured" &&
                    p.state !== "dead" && !P.needsCarrying(p));
                let n = 0;
                for (const p of here) {
                    const roll = P.convince(S, p, 14);
                    if (!roll.ok) continue;
                    p.x = P.nearestSafeX(p.x); p.y = cabin.AISLE_Y;
                    p.state = "secured";
                    p.securedAt = S.clock.elapsed;
                    S.stats.carriesCompleted++;
                    n++;
                }
                st.reindex(S);
                if (!n) return { text: "Nobody in row " + row + " takes anybody's shoulder.",
                                 kind: "bad" };
                PRS.audio.play("secure");
                return { text: n + " people leave row " + row + " in a line, each with their hands " +
                    "on the shoulders of the one in front, in forty seconds. " +
                    st.securedCount(S) + " of 61.", kind: "great" };
            },
        },

        {
            id: "people.count_rows", deck: "people", tags: ["social"], danger: "good",
            targets: reachAwake,
            when: (S) => st.hasPerk(S, "counted_the_rows"),
            label: (S, c) => "Tell " + who(c) + " how many rows to the exit",
            detail: "You counted them before the doors closed. Everybody should. Nobody does.",
            cost: 9,
            run(S, c) {
                c.p.trust = Math.min(100, c.p.trust + 30);
                c.p.panic = Math.max(0, c.p.panic - 24);
                c.p.knowsRows = true;
                return { text: "“Four rows forward, then it's on your left. Four. Say it.” " +
                    c.p.name + " says it. In smoke you cannot see through, that is the difference " +
                    "between a person who gets out and a person who does not.", kind: "good" };
            },
        },
    ]);
})(window);
