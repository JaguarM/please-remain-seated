// Deck: where the equipment actually is.
//
// The bag holds three things. Everything else in items.js is somewhere in this aeroplane: two
// things in the galley drawers, and four in other people's laps.
//
// That is a deliberate swap. It used to be that a player made forty-three decisions on a screen
// before they had seen the cabin, and then spent the flight with a bag they could not remember
// packing. Now the flight is where the bag gets packed, and the way you get equipped is by asking
// passengers what they have — which is the same conversation that recruits them, so the two best
// things you can do to a person are one action apart.
//
// Nothing here is gated behind progress. It is all in the aeroplane on the first flight; it is
// just in the aeroplane rather than on a menu.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const P = PRS.pax;

    const D = () => PRS.data.items;
    const holding = (S, id) => !!st.slotOf(S, id);

    /**
     * Talking distance, which is one seat further than arm's reach: from the aisle you can ask
     * B, C, D and E a question, and the window seats still mean climbing in.
     */
    function nearby(S) {
        return st.withinEarshot(S, 1).filter((p) => p.state !== "dead" && p.state !== "secured");
    }

    /** Anybody in talking distance who has something and has not told you about it. */
    function unrevealed(S) {
        return nearby(S)
            .filter((p) => p.carries && !p.revealed)
            .map((p) => ({ key: p.id, p: p }));
    }

    /** Anybody in talking distance whose thing you know about and have not got yet. */
    function revealed(S) {
        return nearby(S)
            .filter((p) => p.carries && p.revealed && !holding(S, p.carries))
            .map((p) => ({ key: p.id, p: p, item: D().byId(p.carries) }))
            .filter((c) => c.item);
    }

    function reveal(S, p) {
        p.revealed = true;
        S.stats.itemsSeen = (S.stats.itemsSeen || 0) + 1;
    }

    A.register([
        // ---------------------------------------------------------------- finding out ---------
        {
            id: "loot.ask_carrying", deck: "people", tags: ["reveal", "social"], danger: "good",
            targets: (S) => unrevealed(S).filter((c) => c.p.state !== "down"),
            label: (S, c) => "Ask " + c.p.name + " what they have got",
            detail: "Seven seconds. Most of the useful objects on this aeroplane are in a lap.",
            cost: 7,
            run(S, c) {
                reveal(S, c.p);
                const item = D().byId(c.p.carries);
                c.p.trust = Math.min(100, c.p.trust + 8);
                return { text: c.p.name + " has " + article(item.name) + ". " + item.note,
                         kind: "good" };
            },
        },

        // ---------------------------------------------------------------- getting hold of it ---
        {
            id: "loot.ask_for", deck: "people", tags: ["reveal", "social"], danger: "good",
            targets: (S) => revealed(S).filter((c) => c.p.state !== "down" &&
                                                      P.worthAsking(S, c.p, 24)),
            label: (S, c) => "Ask " + c.p.name + " for the " + short(c.item.name),
            detail: (S, c) => c.item.note,
            cost: 13,
            run(S, c) {
                const roll = P.convince(S, c.p, 24);
                if (!roll.ok) {
                    PRS.audio.play("refuse");
                    return { text: "“It's mine.” " + c.p.name + " is not being unreasonable and " +
                        "it is not going to feel that way.", kind: "bad" };
                }
                st.give(S, c.p.carries);
                c.p.carries = null;
                c.p.trust = Math.min(100, c.p.trust + 20);
                PRS.audio.play("good");
                return { text: c.p.name + " hands it over without being asked twice. " +
                    "You have " + article(c.item.name) + ".", kind: "great" };
            },
        },

        {
            id: "loot.take_down", deck: "people", tags: ["reveal", "hands"], danger: "good",
            targets: (S) => revealed(S).filter((c) => c.p.state === "down" && inReach(S, c.p)),
            label: (S, c) => "Take the " + short(c.item.name) + " from " + c.p.name,
            detail: "They are not using it and they are not going to mind.",
            cost: 6,
            run(S, c) {
                st.give(S, c.p.carries);
                c.p.carries = null;
                return { text: "You take it out of " + c.p.name + "'s hands. They do not react, " +
                    "which is the whole reason you are allowed to.", kind: "good" };
            },
        },

        {
            id: "loot.ask_anyone", deck: "people", tags: ["reveal", "social"], danger: "good",
            label: (S) => "Ask out loud whether anybody has anything useful",
            detail: "One question to four rows. It is how you find the things you did not pack.",
            when: (S) => S.credibility > 25 &&
                         st.withinEarshot(S, 3).some((p) => p.carries && P.worthAsking(S, p, 10)),
            cost: 20,
            run(S) {
                const offered = [];
                for (const p of st.withinEarshot(S, 3)) {
                    if (!p.carries) continue;
                    reveal(S, p);
                    if (P.convince(S, p, 10).ok) {
                        st.give(S, p.carries);
                        offered.push(D().byId(p.carries).name.toLowerCase());
                        p.carries = null;
                    }
                }
                if (!offered.length) {
                    return { text: "Four rows of people look at you and at each other and nobody " +
                        "says anything, which is what four rows of people do.", kind: "bad" };
                }
                PRS.audio.play("good");
                return { text: "Hands go up. You come away with " +
                    PRS.util.listSentence(offered) + ", none of which you would have thought to " +
                    "pack.", kind: "great" };
            },
        },

        // -------------------------------------------------------------- searching the cabin ---

        {
            id: "loot.galley_drawer", deck: "cabin", tags: ["reveal", "hands"], danger: "good",
            label: "Go through the galley drawers",
            detail: "Nobody has told you that you cannot and nobody is going to.",
            when: (S) => cabin.kindAt(S.player.x, S.player.y) === "galley" &&
                         (S.stash ? S.stash.galley.length > 0 : false),
            cost: 13,
            run(S) {
                const got = takeFromStash(S, "galley");
                if (!got) return "Cups, napkins, a hundred and forty sachets of sugar.";
                return { text: "In the second drawer down: " + article(got.name) + ". " + got.note,
                         kind: "great" };
            },
        },
    ]);

    // ------------------------------------------------------------------------------ helpers ---

    /** Take the next thing out of one of the cabin's stashes, or nothing if it is empty. */
    function takeFromStash(S, where) {
        if (!S.stash || !S.stash[where] || !S.stash[where].length) return null;
        const id = S.stash[where].shift();
        st.give(S, id);
        return D().byId(id);
    }

    /** Arm's reach: the tile you are on and the four next to it. */
    function inReach(S, p) {
        return st.reachable(S).indexOf(p) >= 0;
    }

    /**
     * "a smoke hood", "an inhaler", "welding gloves" — the log reads like a sentence or it reads
     * like a database. Half the item names are plural, and "a welding gloves" is the sort of
     * thing that makes a player stop believing the writing.
     */
    /**
     * The head noun decides the article, and the head noun is the first word when the name has an
     * "of" in it and the last word otherwise: a roll of bin liners, but welding gloves. Half the
     * item names are plural and "a welding gloves" is the sort of thing that makes a reader stop
     * believing the rest of the writing.
     */
    function article(name) {
        const lower = (name.charAt(0).toLowerCase() + name.slice(1)).split(",")[0].trim();
        if (/^(a |an |the |four |your |two |some )/i.test(lower)) return lower;
        const words = lower.split(" ");
        const head = lower.indexOf(" of ") > 0 ? words[0] : words[words.length - 1];
        if (/s$/i.test(head) && !/(ss|us|gas)$/i.test(head)) return lower;
        return ("aeiou".indexOf(lower[0]) >= 0 ? "an " : "a ") + lower;
    }

    /** The short form for a button label: the first few words of the item's name. */
    function short(name) {
        const lower = name.charAt(0).toLowerCase() + name.slice(1);
        return lower.split(",")[0].split(" that ")[0];
    }

    PRS.loot = { article, short, takeFromStash };
})(window);
