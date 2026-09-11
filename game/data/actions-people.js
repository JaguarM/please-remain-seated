// Deck: PEOPLE. Each definition appears once per person you can reach, so in play this is the
// only deck that scales.
//
// The arithmetic, written down once: you can carry about fourteen people in nine hundred seconds.
// A recruited helper carries about nine. Four helpers is thirty-six. Nothing else in this game is
// worth a fraction of a helper, and the whole design is arranged so that the player has to work
// that out for themselves, from the log, while a man in 21F asks them to sit down.
//
// Nowhere makes a person safe. Putting somebody down puts them on the floor wherever you are
// standing, and the card says what the air is like there, because that is what they will be
// breathing when the doors open.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const P = PRS.pax;

    // ------------------------------------------------------------------------------ targeting ---

    function reach(S) {
        return st.reachable(S).map((p) => ({ key: p.id, p: p }));
    }
    function reachAwake(S) {
        return reach(S).filter((c) => c.p.state !== "down" && c.p.state !== "dead");
    }
    function carried(S) {
        return S.player.carrying.map((id) => ({ key: id, p: st.paxById(S, id) }))
                                .filter((c) => c.p);
    }
    function who(c) { return c.p.name; }

    // --------------------------------------------------------------------------- the carry ----

    function pickUp(S, p) {
        p.state = "carried";
        p.carriedBy = "player";
        p.belted = false;
        p.x = S.player.x; p.y = S.player.y;
        S.player.carrying.push(p.id);
        S.player.crouching = false;
        st.reindex(S);
        PRS.audio.play("grab");
    }

    /** The floor where you are standing, as somebody deciding to leave a person on it sees it. */
    function airHere(S) {
        const e = P.exposure(S, S.player.x, S.player.y);
        if (e < 8) return "Clear air, and a door right there. As good as this floor gets.";
        if (e < 18) return "Breathable, and not far from a door.";
        if (e < 32) return "The air here is going, and the door is a long way off.";
        return "This is where the fire is. On the floor here is still here.";
    }

    /**
     * Let go of somebody, wherever you are. A carry counts when it took them somewhere worth
     * taking them: a few rows, and a real difference in the air from the seat they were in.
     */
    function putDown(S, p) {
        S.player.carrying = S.player.carrying.filter((id) => id !== p.id);
        if (S.player.dragging === p.id) S.player.dragging = null;
        p.carriedBy = null;
        const before = P.exposure(S, p.homeX, p.homeY);
        P.shelter(S, p, S.player.x, S.player.y);
        st.reindex(S);
        const after = P.exposure(S, p.x, p.y);
        const where = cabin.placeName(p.x, p.y);
        if (before - after >= 6 && Math.abs(p.x - p.homeX) >= 3) {
            S.stats.carriesCompleted++;
            S.credibility = Math.min(100, S.credibility + 3);
            PRS.audio.play("secure");
            return { text: p.name + " is on the floor at " + where + ", out of the seats and " +
                "under the smoke. " + airHere(S) +
                (p.state === "down" ? " They do not know any of this yet." : ""), kind: "great" };
        }
        PRS.audio.play("drop");
        return { text: "You put " + p.name + " down at " + where + ". " +
            (after >= before ? "They are no better off than they were in " + p.seat + "."
                             : "It is a little better than " + p.seat + ", and not much."),
            kind: after >= before ? "bad" : "plain" };
    }

    // ------------------------------------------------------------------------------ speaking ---

    function say(S, p, line, opts) {
        opts = opts || {};
        const roll = P.convince(S, p, opts.bonus || 0);
        p.awareness = Math.min(100, p.awareness + (opts.awareness || 10));
        return roll;
    }

    A.register([
        // ------------------------------------------------------------------------- carrying ---
        {
            id: "people.carry", deck: "people", tags: ["carry", "hands"], danger: "good",
            targets: (S) => reach(S).filter((c) => c.p.state !== "carried" && !c.p.helper),
            when: (S, c) => P.canCarry(S, c.p),
            label: (S, c) => "Pick up " + who(c),
            detail: (S, c) => c.p.seat + " · " + c.p.kg + "kg · " + P.displayState(c.p) +
                              " · " + P.condition(c.p).label,
            cost: (S, c) => P.carryOverhead(S, c.p),
            run(S, c) {
                pickUp(S, c.p);
                return "You get " + c.p.name + " out of " + c.p.seat + " and into your arms. " +
                    "The nearest door is " + cabin.doorDistance(S.player.x) + " rows away. " +
                    (c.p.state === "down" ? "" : "“" + c.p.refuse.replace(/^“|”$/g, "") + "”");
            },
        },

        {
            id: "people.put_down", deck: "people", tags: ["carry"], danger: "good",
            targets: carried,
            label: (S, c) => "Put " + who(c) + " down here",
            detail: airHere,
            cost: (S, c) => 5 + c.p.kg * 0.05,
            run: (S, c) => putDown(S, c.p),
        },

        {
            id: "people.drag", deck: "people", tags: ["carry"], danger: "neutral",
            // Dragging is the answer to somebody you cannot lift, so it offers itself for the
            // unconscious, for the wheelchair users, and for anybody heavier than your arms.
            targets: (S) => reach(S).filter((c) => c.p.state === "down" ||
                                                   c.p.traits.indexOf("immobile") >= 0 ||
                                                   !P.canCarry(S, c.p)),
            when: (S, c) => !S.player.dragging && S.player.carrying.length === 0 &&
                            c.p.state !== "carried" && c.p.state !== "dead" && !c.p.helper,
            label: (S, c) => "Drag " + who(c) + " along the floor" +
                             (st.slotOf(S, "strap") ? " by the strap" : ""),
            detail: (S, c) => c.p.kg + "kg. Slower than carrying, and it works on people you " +
                              "cannot lift." + (st.slotOf(S, "strap") ? " The strap is a handle."
                                                : ""),
            cost: (S, c) => 8 + c.p.kg * 0.06,
            run(S, c) {
                S.player.dragging = c.p.id;
                S.player.crouching = false;
                c.p.state = "carried";
                c.p.carriedBy = "player";
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
            detail: airHere,
            cost: 4,
            run(S) {
                const p = st.paxById(S, S.player.dragging);
                if (!p) { S.player.dragging = null; return "Your hands are empty."; }
                return putDown(S, p);
            },
        },

        // ---------------------------------------------------------------------- recruitment ---
        {
            id: "people.recruit", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reachAwake(S).filter((c) => P.canHelp(c.p)),
            when: (S, c) => P.helperCap(S) > 0 && P.worthAsking(S, c.p, 6),
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
                const wet = (c.p.annoyed || 0) >= 30 ? " You have soaked them, and they remember." : "";
                return "They are " + odds + " say yes." + health + wet;
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
                    PRS.util.plural(st.helperCount(S), "person is", "people are") +
                    " now working the cabin as well as you.", kind: "great" };
            },
        },

        {
            id: "people.direct_helper", deck: "people", tags: ["social"], danger: "good",
            targets(S) {
                const out = [];
                for (const h of S.pax) {
                    if (!h.helper) continue;
                    for (const t of st.reachable(S)) {
                        if (t.helper || t.state === "dead" || t.state === "carried") continue;
                        out.push({ key: h.id + ">" + t.id, h: h, t: t });
                    }
                }
                return out.slice(0, 24);
            },
            label: (S, c) => "Send " + c.h.name + " for " + c.t.name,
            detail: (S, c) => c.t.seat + " · " + c.t.kg + "kg · " + P.condition(c.t).label,
            cost: 10,
            run(S, c) {
                const was = c.h.helperTarget && st.paxById(S, c.h.helperTarget);
                if (was && was.claimedBy === c.h.id) was.claimedBy = null;
                c.h.helperTarget = c.t.id;
                c.h.helperPhase = "carry";
                c.t.claimedBy = c.h.id;
                const r = P.refuge(S, c.t.x);
                const dist = Math.abs(c.t.x - c.h.x) + (r ? Math.abs(c.t.x - r.x) : 0);
                c.h.taskLeft = (10 + c.t.kg * 0.16 + dist * 1.5) * 1.5;
                return c.h.name + " goes for " + c.t.name + " in " + c.t.seat + " without asking " +
                    "you a single question about it.";
            },
        },

        // ------------------------------------------------------------------------- talking ---
        {
            id: "people.tell", deck: "people", tags: ["social"],
            targets: (S) => reachAwake(S).filter((c) => !c.p.helper),
            when: (S, c) => P.worthAsking(S, c.p, 0),
            label: (S, c) => "Tell " + who(c) + " there is a fire",
            detail: (S, c) => c.p.traits.indexOf("sceptic") >= 0
                ? "They want to see it, not hear about it."
                : c.p.trust > 30 ? "They are listening to you now."
                                 : "They are not going to believe you.",
            cost: 14,
            run(S, c) {
                const was = c.p.trust;
                const sceptic = c.p.traits.indexOf("sceptic") >= 0;
                const roll = say(S, c.p, "there is a fire", { awareness: 22 });
                if (roll.ok && sceptic) {
                    // Agreeing with you is not the same as believing you.
                    c.p.trust = Math.min(100, c.p.trust + 6);
                    return { text: c.p.name + ": “If you say so.” They do not believe you. They " +
                        "believe that you believe it.", kind: "plain" };
                }
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 18);
                    // Turning somebody is worth something to the room. Telling a believer is not.
                    if (was <= 30) S.credibility = Math.min(100, S.credibility + 3);
                    return { text: c.p.name + " looks up at the locker, then at you, then at the " +
                        "locker. “...Right. Right.”", kind: "good" };
                }
                return { text: c.p.name + ": " + P.speak(S, c.p), kind: "plain" };
            },
        },

        {
            id: "people.show_photo", item: "phone", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reachAwake(S).filter((c) => !c.p.helper),
            when: (S) => !!S.flags.havePhoto,
            label: (S, c) => "Show " + who(c) + " the photograph",
            detail: "Telling people is slow. Showing them is not.",
            cost: 9,
            run(S, c) {
                const was = c.p.trust;
                say(S, c.p, "look", { bonus: 30, awareness: 30 });
                c.p.trust = Math.min(100, c.p.trust + 30);
                if (was <= 30) S.credibility = Math.min(100, S.credibility + 4);
                return { text: c.p.name + " looks at your phone for two full seconds and then " +
                    "unbuckles their seatbelt without being asked.", kind: "good" };
            },
        },

        {
            id: "people.reassure", deck: "people", tags: ["social"],
            targets: reachAwake,
            label: (S, c) => "Calm " + who(c) + " down",
            detail: (S, c) => (c.p.annoyed || 0) >= P.GRAB_AT
                ? "They have had enough of you. Thirteen seconds of talking gets their hand off " +
                  "your arm."
                : "A panicking person is a person who cannot be asked to do anything.",
            cost: 13,
            run(S, c) {
                const drop = 22 + S.derived.voiceMul * 14;
                c.p.panic = Math.max(0, c.p.panic - drop);
                c.p.trust = Math.min(100, c.p.trust + 12);
                c.p.annoyed = Math.max(0, (c.p.annoyed || 0) - 45);
                if (c.p.state === "aisle" && c.p.panic < 50) {
                    c.p.state = P.looseState(c.p);
                    c.p.x = c.p.homeX; c.p.y = c.p.homeY;
                    st.reindex(S);
                }
                return c.p.name + "'s breathing comes down. It takes thirteen seconds and it is " +
                    "thirteen seconds well spent.";
            },
        },

        // ------------------------------------------------------------------------- the body ---

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
            id: "people.burn_gel", item: "first_aid", deck: "people", tags: ["hands"], danger: "good",
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
            id: "people.inhaler", item: "inhaler", deck: "people", tags: ["hands"], danger: "good",
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
            id: "people.wet_cloth", item: (S) => { const s = st.inventoryHas(S, "cloth"); return s ? s.id : null; }, deck: "people", tags: ["hands"], danger: "good",
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
            id: "people.floor", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reach(S).filter((c) => c.p.state !== "carried" && !c.p.helper &&
                                                   !c.p.braced),
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
            id: "people.give_water", item: "water_big", deck: "people", tags: ["hands"],
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

        // ------------------------------------------------------------------------- the ones ---

        {
            id: "people.follow", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reachAwake(S).filter((c) => !P.needsCarrying(c.p) && !c.p.helper &&
                                                        c.p.state !== "carried"),
            when: (S, c) => P.moveGain(S, c.p) >= 4 && P.worthAsking(S, c.p, 8),
            label: (S, c) => "Tell " + who(c) + " to get to a door and get down",
            detail: "The cheapest move there is, and it only works on the ones who can walk.",
            cost: 18,
            run(S, c) {
                const roll = P.convince(S, c.p, 8);
                if (!roll.ok) {
                    return { text: c.p.name + ": " + P.speak(S, c.p), kind: "bad" };
                }
                const p = c.p;
                const r = P.refuge(S, p.x);
                P.shelter(S, p, r.x, r.y);
                st.reindex(S);
                PRS.audio.play("secure");
                return { text: p.name + " gets up, walks to " + cabin.placeName(r.x, r.y) +
                    " and gets down on the floor there without being carried, which took eighteen " +
                    "seconds instead of fifty.", kind: "great" };
            },
        },
    ]);
})(window);
