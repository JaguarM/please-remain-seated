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
    const T = PRS.t, K = PRS.k;
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const P = PRS.pax;

    // ------------------------------------------------------------------------------ targeting ---

    function reach(S) {
        return st.reachable(S).map((p) => ({ key: p.id, p: p }));
    }
    // Bruno is a dog in a bag. He is a person for the purposes of carrying him out and for
    // nothing else: you cannot tell him about the fire, calm him down, hand him a bottle of
    // water or fit him with a chemical oxygen generator. Everything that talks to somebody or
    // treats somebody goes through here, and the two things that only need hands - lifting the
    // bag, and putting something wet over the grille - use `reach` directly.
    function reachPeople(S) {
        return reach(S).filter((c) => !P.isPet(c.p));
    }
    function reachAwake(S) {
        return reachPeople(S).filter((c) => c.p.state !== "down" && c.p.state !== "dead");
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
        if (e < 8) return T("Clear air, and a door right there. As good as this floor gets.");
        if (e < 18) return T("Breathable, and not far from a door.");
        if (e < 32) return T("The air here is going, and the door is a long way off.");
        return T("This is where the fire is. On the floor here is still here.");
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
            return { text: T("{who} is on the floor at {where}, out of the seats and under " +
                             "the smoke. {air}",
                             { who: p.name, where: where, air: airHere(S) }) +
                (p.state === "down" ? T(" They do not know any of this yet.") : ""),
                kind: "great" };
        }
        PRS.audio.play("drop");
        return { text: T("You put {who} down at {where}. ", { who: p.name, where: where }) +
            (after >= before
                ? T("They are no better off than they were in {seat}.", { seat: p.seat })
                : T("It is a little better than {seat}, and not much.", { seat: p.seat })),
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
            label: (S, c) => T("Pick up {who}", { who: who(c) }),
            detail: (S, c) => T("{seat} · {kg}kg · {state} · {condition}",
                                { seat: c.p.seat, kg: c.p.kg, state: P.displayState(c.p),
                                  condition: T(P.condition(c.p).label) }),
            cost: (S, c) => P.carryOverhead(S, c.p),
            run(S, c) {
                pickUp(S, c.p);
                return T("You get {who} out of {seat} and into your arms. The nearest door " +
                         "is {rows} rows away. ",
                         { who: c.p.name, seat: c.p.seat,
                           rows: cabin.doorDistance(S.player.x) }) +
                    (c.p.state === "down" ? "" : T(c.p.refuse));
            },
        },

        {
            id: "people.put_down", deck: "people", tags: ["carry"], danger: "good",
            targets: carried,
            label: (S, c) => T("Put {who} down here", { who: who(c) }),
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
            label: (S, c) => st.slotOf(S, "strap")
                ? T("Drag {who} along the floor by the strap", { who: who(c) })
                : T("Drag {who} along the floor", { who: who(c) }),
            detail: (S, c) => T("{kg}kg. Slower than carrying, and it works on people you " +
                                "cannot lift.", { kg: c.p.kg }) +
                              (st.slotOf(S, "strap") ? T(" The strap is a handle.") : ""),
            cost: (S, c) => 8 + c.p.kg * 0.06,
            run(S, c) {
                S.player.dragging = c.p.id;
                S.player.crouching = false;
                c.p.state = "carried";
                c.p.carriedBy = "player";
                st.reindex(S);
                return T("You get {who} under the arms and start dragging. It is " +
                         "undignified, it is slow, and it is under the smoke.",
                         { who: c.p.name });
            },
        },

        {
            id: "people.stop_drag", deck: "people", tags: ["carry"],
            when: (S) => !!S.player.dragging,
            label: (S) => { const p = st.paxById(S, S.player.dragging);
                            return T("Stop dragging {who}",
                                     { who: p ? p.name : T("them") }); },
            detail: airHere,
            cost: 4,
            run(S) {
                const p = st.paxById(S, S.player.dragging);
                if (!p) { S.player.dragging = null; return T("Your hands are empty."); }
                return putDown(S, p);
            },
        },

        // ---------------------------------------------------------------------- recruitment ---
        {
            id: "people.recruit", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reachAwake(S).filter((c) => P.canHelp(c.p)),
            when: (S, c) => P.helperCap(S) > 0 && P.worthAsking(S, c.p, 6),
            label: (S, c) => T("Ask {who} to help you", { who: who(c) }),
            detail: (S, c) => {
                const r = P.resistance(S, c.p);
                const v = P.persuasion(S);
                const cond = P.condition(c.p);
                // A helper who is already full of smoke will be on the floor inside a minute,
                // and the list has to say so, because "recruit everybody" is not the lesson.
                const odds = r > v + 20 ? T("They are not going to say yes.")
                           : r > v ? T("They are unlikely to say yes.")
                           : r > v - 25 ? T("They are probably going to say yes.")
                           : T("They are going to say yes.");
                const health = cond.tier >= 2
                    ? T(" They are {condition} and they will not last long on their feet.",
                        { condition: T(cond.label) })
                    : cond.tier === 1 ? T(" They are already coughing.") : "";
                const wet = (c.p.annoyed || 0) >= 30
                    ? T(" You have soaked them, and they remember.") : "";
                // The sceptic line is the whole shape of the deck: talking at this person is
                // thirty wasted seconds, and showing them something is not.
                const blind = c.p.traits.indexOf("sceptic") >= 0 && !P.hasSeen(c.p)
                    ? T(" They do not believe there is a fire and they are not going to be " +
                        "talked into it. Show them something.") : "";
                return odds + blind + health + wet;
            },
            cost: 22,
            run(S, c) {
                const p = c.p;
                const roll = say(S, p, "help", { bonus: 6, awareness: 16 });
                if (!roll.ok) {
                    PRS.audio.play("refuse");
                    if (p.traits.indexOf("sceptic") >= 0 && !P.hasSeen(p)) {
                        return { text: T("{who}: {said} (Asking again will not do it. This one " +
                                         "has to see it.)",
                                         { who: p.name, said: P.speak(S, p) }), kind: "bad" };
                    }
                    return { text: T("{who}: {said} (Ask again. It gets easier the second time, " +
                                     "and easier still if they can see the fire.)",
                                     { who: p.name, said: P.speak(S, p) }), kind: "bad" };
                }
                P.recruit(S, p, T("They are going to work the cabin until this ends."));
                return { text: T("{who} unbuckles, stands up, and asks who is next. {n} now " +
                                 "working the cabin as well as you.",
                                 { who: p.name,
                                   n: PRS.util.plural(st.helperCount(S), K("person is"),
                                                      K("people are")) }), kind: "great" };
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
            label: (S, c) => T("Send {who} for {whom}", { who: c.h.name, whom: c.t.name }),
            detail: (S, c) => T("{seat} · {kg}kg · {condition}",
                                { seat: c.t.seat, kg: c.t.kg,
                                  condition: T(P.condition(c.t).label) }),
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
                return T("{who} goes for {whom} in {seat} without asking you a single " +
                         "question about it.",
                         { who: c.h.name, whom: c.t.name, seat: c.t.seat });
            },
        },

        // ------------------------------------------------------------------------- talking ---
        {
            id: "people.tell", deck: "people", tags: ["social"],
            targets: (S) => reachAwake(S).filter((c) => !c.p.helper),
            when: (S, c) => P.worthAsking(S, c.p, 0),
            label: (S, c) => T("Tell {who} there is a fire", { who: who(c) }),
            detail: (S, c) => c.p.traits.indexOf("sceptic") >= 0
                ? T("They want to see it, not hear about it.")
                : c.p.trust > 30 ? T("They are listening to you now.")
                                 : T("They are not going to believe you."),
            cost: 14,
            run(S, c) {
                const was = c.p.trust;
                const sceptic = c.p.traits.indexOf("sceptic") >= 0;
                const roll = say(S, c.p, "there is a fire", { awareness: 22 });
                if (roll.ok && sceptic) {
                    // Agreeing with you is not the same as believing you.
                    c.p.trust = Math.min(100, c.p.trust + 6);
                    return { text: T("{who}: “If you say so.” They do not believe you. They " +
                                     "believe that you believe it.", { who: c.p.name }),
                             kind: "plain" };
                }
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 18);
                    // Turning somebody is worth something to the room. Telling a believer is not.
                    if (was <= 30) S.credibility = Math.min(100, S.credibility + 3);
                    return { text: T("{who} looks up at the locker, then at you, then at the " +
                                     "locker. “...Right. Right.”", { who: c.p.name }),
                             kind: "good" };
                }
                return { text: T("{who}: {said}", { who: c.p.name, said: P.speak(S, c.p) }),
                         kind: "plain" };
            },
        },

        {
            id: "people.show_photo", item: "phone", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reachAwake(S).filter((c) => !c.p.helper),
            when: (S) => !!S.flags.havePhoto,
            once: "target",
            label: (S, c) => T("Show {who} the photograph", { who: who(c) }),
            detail: (S, c) => c.p.traits.indexOf("sceptic") >= 0 && !P.hasSeen(c.p)
                ? K("This one is not going to take your word for it, and you have one photograph " +
                    "and one showing of it.")
                : K("Telling people is slow. Showing them is not. Once each: nobody looks at the " +
                    "same photograph twice."),
            cost: 9,
            run(S, c) {
                const was = c.p.trust;
                P.saw(S, c.p);
                say(S, c.p, "look", { bonus: 30, awareness: 30 });
                c.p.trust = Math.min(100, c.p.trust + 30);
                if (was <= 30) S.credibility = Math.min(100, S.credibility + 4);
                return { text: T("{who} looks at your phone for two full seconds and then " +
                                 "unbuckles their seatbelt without being asked.",
                                 { who: c.p.name }), kind: "good" };
            },
        },

        {
            id: "people.reassure", deck: "people", tags: ["social"],
            targets: reachAwake,
            label: (S, c) => T("Calm {who} down", { who: who(c) }),
            detail: (S, c) => (c.p.annoyed || 0) >= P.GRAB_AT
                ? T("They have had enough of you. Thirteen seconds of talking gets their hand " +
                    "off your arm.")
                : T("A panicking person is a person who cannot be asked to do anything."),
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
                return T("{who}'s breathing comes down. It takes thirteen seconds and it is " +
                         "thirteen seconds well spent.", { who: c.p.name });
            },
        },

        // ------------------------------------------------------------------------- the body ---

        {
            id: "people.shake", deck: "people", tags: ["hands"],
            targets: (S) => reachPeople(S).filter((c) => c.p.state === "asleep"),
            label: (S, c) => T("Shake {who} awake", { who: who(c) }),
            cost: 9,
            run(S, c) {
                P.wakeUp(c.p);
                c.p.awareness = Math.min(100, c.p.awareness + 40);
                return T("{who} comes up out of it badly. {said}",
                         { who: c.p.name, said: T(c.p.refuse) });
            },
        },

        {
            id: "people.burn_gel", item: "first_aid", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reachPeople(S).filter((c) => c.p.burns > 8),
            when: (S) => { const s = st.slotOf(S, "first_aid"); return s && s.uses > 0; },
            label: (S, c) => T("Put burn gel on {who}", { who: who(c) }),
            cost: 20,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "first_aid"));
                c.p.burns = Math.max(0, c.p.burns - 22);
                c.p.trust = Math.min(100, c.p.trust + 20);
                return { text: T("Burn gel and a dressing on {who}. It will not stop them " +
                                 "being in hospital tonight. It will stop them being in " +
                                 "hospital for a month.", { who: c.p.name }), kind: "good" };
            },
        },

        {
            id: "people.inhaler", item: "inhaler", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reachPeople(S).filter((c) => c.p.smokeDose > 20),
            when: (S) => { const s = st.slotOf(S, "inhaler"); return s && s.uses > 0; },
            label: (S, c) => T("Give {who} the inhaler", { who: who(c) }),
            cost: 10,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "inhaler"));
                c.p.smokeDose = Math.max(0, c.p.smokeDose - 16);
                if (c.p.state === "down" && c.p.smokeDose < P.DOWN_AT) c.p.state = P.looseState(c.p);
                return { text: T("Two puffs and a spacer made out of a paper cup. {who} gets " +
                                 "a breath in that goes all the way down.", { who: c.p.name }),
                         kind: "good" };
            },
        },

        {
            id: "people.mask", deck: "people", tags: ["hands"],
            targets: (S) => reachPeople(S).filter((c) => !c.p.masked),
            when: (S) => S.cabinFlags.masksDropped,
            label: (S, c) => T("Put the oxygen mask on {who}", { who: who(c) }),
            detail: K("It is not oxygen for smoke. It is better than smoke."),
            cost: 11,
            run(S, c) {
                c.p.masked = true;
                return T("{who} has a mask on. It is a chemical oxygen generator designed " +
                         "for a decompression and it is going to help anyway.",
                         { who: c.p.name });
            },
        },

        {
            id: "people.wet_cloth", item: (S) => { const s = st.inventoryHas(S, "cloth"); return s ? s.id : null; }, deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reach(S).filter((c) => !c.p.masked),
            when: (S) => !!st.inventoryHas(S, "cloth"),
            label: (S, c) => T("Tie something wet over {who}'s face", { who: who(c) }),
            detail: K("Not as good as a mask. Available now, which a mask is not."),
            cost: 13,
            run(S, c) {
                const s = st.inventoryHas(S, "cloth");
                st.useCharge(S, s);
                c.p.masked = true;
                return { text: T("You tie {what} over {who}'s nose and mouth. They can " +
                                 "breathe through it, which is the entire specification.",
                                 { what: T(s.item.name).toLowerCase(), who: c.p.name }),
                         kind: "good" };
            },
        },

        {
            id: "people.headphones_off", deck: "people", tags: ["hands"],
            targets: (S) => reachPeople(S).filter((c) => c.p.traits.indexOf("headphones") >= 0 &&
                                                   !c.p.deafened),
            label: (S, c) => T("Take {who}'s headphones off", { who: who(c) }),
            detail: K("They have not heard one word of any of this."),
            cost: 5,
            run(S, c) {
                c.p.deafened = true;
                c.p.traits = c.p.traits.filter((t) => t !== "headphones");
                c.p.awareness = Math.min(100, c.p.awareness + 26);
                return T("You lift {who}'s headphones off. The cabin arrives all at once and " +
                         "their face does something complicated.", { who: c.p.name });
            },
        },

        {
            id: "people.floor", deck: "people", tags: ["hands"], danger: "good",
            targets: (S) => reachPeople(S).filter((c) => c.p.state !== "carried" && !c.p.helper &&
                                                   !c.p.braced),
            label: (S, c) => T("Get {who} down onto the floor", { who: who(c) }),
            detail: K("The smoke is at the ceiling. A person on the floor is in different air."),
            cost: 12,
            run(S, c) {
                c.p.braced = true;
                c.p.smokeDose = Math.max(0, c.p.smokeDose - 4);
                return { text: T("{who} gets down between the seat rows, under the layer. " +
                                 "Nothing about their situation has improved except the only " +
                                 "thing that matters.", { who: c.p.name }), kind: "good" };
            },
        },

        // -------------------------------------------------------------------------- giving ---
        {
            id: "people.give_water", item: "water_big", deck: "people", tags: ["hands"],
            targets: reachAwake,
            when: (S) => { const s = st.slotOf(S, "water_big"); return s && s.uses > 0; },
            label: (S, c) => T("Give {who} some water", { who: who(c) }),
            cost: 8,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "water_big"));
                c.p.smokeDose = Math.max(0, c.p.smokeDose - 5);
                c.p.trust = Math.min(100, c.p.trust + 22);
                c.p.panic = Math.max(0, c.p.panic - 14);
                return T("{who} drinks it and hands the bottle back and is, from this " +
                         "moment, on your side.", { who: c.p.name });
            },
        },

        // ------------------------------------------------------------------------- the ones ---

        {
            id: "people.follow", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reachAwake(S).filter((c) => !P.needsCarrying(c.p) && !c.p.helper &&
                                                        c.p.state !== "carried"),
            when: (S, c) => P.moveGain(S, c.p) >= 4 && P.worthAsking(S, c.p, 8),
            label: (S, c) => T("Tell {who} to get to a door and get down", { who: who(c) }),
            detail: K("The cheapest move there is, and it only works on the ones who can walk."),
            cost: 18,
            run(S, c) {
                const roll = P.convince(S, c.p, 8);
                if (!roll.ok) {
                    return { text: T("{who}: {said}",
                                     { who: c.p.name, said: P.speak(S, c.p) }), kind: "bad" };
                }
                const p = c.p;
                const r = P.refuge(S, p.x);
                P.shelter(S, p, r.x, r.y);
                st.reindex(S);
                PRS.audio.play("secure");
                return { text: T("{who} gets up, walks to {where} and gets down on the floor " +
                                 "there without being carried, which took eighteen seconds " +
                                 "instead of fifty.",
                                 { who: p.name, where: cabin.placeTo(r.x, r.y) }),
                         kind: "great" };
            },
        },
    ]);
})(window);
