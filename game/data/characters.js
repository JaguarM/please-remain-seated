// Two people who could be in seat 9C. Five numbers each, one to ten, and every one of them is a
// multiplier on something the player will feel within thirty seconds of the first action:
//
//   strength  how long a carry takes, who can be carried at all, and at ten, two at once
//   speed     the cost of every step and most actions
//   lungs     how fast smoke fills you up
//   nerve     how fast your own panic rises
//   voice     whether anybody does what you say
//
// There are no perks. What a character can do is what the numbers say, and the two of them are
// the game's own fork: she can talk a row out of its seats and cannot lift the heavy ones; he can
// carry two adults at once and nobody listens to him. Both can play the whole game, and the best
// runs do both things.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    const CHARACTERS = [
        {
            id: "ansel",
            name: "Dr Priya Ansel",
            short: "Priya",
            age: 44,
            title: "Veterinary surgeon",
            blurb: "Small animals, mostly. Airways are airways, oxygen is oxygen, and she has " +
                   "resuscitated a great many things that were not people.",
            stats: { strength: 5, speed: 6, lungs: 6, nerve: 8, voice: 8 },
            lean: "Talks people out of their seats. Cannot lift the heavy ones.",
            hair: "#1d1712", longHair: true, skin: "#c08a5e", shirt: "#3f7d8a",
            open: "You have already worked out who on this aeroplane is going to die first.",
        },
        {
            id: "gordy",
            name: "Gordy Mach",
            short: "Gordy",
            age: 38,
            title: "Competitive strongman",
            blurb: "Fourth in Europe, twice. He can pick up two adults at once, and he is about " +
                   "to find out that this is the least of it.",
            stats: { strength: 10, speed: 5, lungs: 4, nerve: 6, voice: 5 },
            lean: "Carries two at a time, and nobody is too heavy. Nobody listens to him.",
            hair: "#4a3220", skin: "#e5b791", shirt: "#8a4526",
            open: "Everything on this aeroplane is lighter than your opener.",
        },
    ];

    function byId(id) {
        return CHARACTERS.filter((c) => c.id === id)[0] || CHARACTERS[0];
    }

    /** The one you are not. The report offers them as the other button. */
    function other(id) {
        return CHARACTERS.filter((c) => c.id !== id)[0] || CHARACTERS[1];
    }

    /** Everything derived from the five numbers, in one place so the tuning is visible. */
    function derive(ch) {
        const s = ch.stats;
        return {
            stats: s,
            // A step in the aisle for a 6-speed character is one second flat.
            moveMul: 1.55 - s.speed * 0.09,
            // A carry for a 6-strength character is about a second a kilo over twelve rows.
            carryMul: 1.75 - s.strength * 0.115,
            actionMul: 1.30 - s.speed * 0.05,
            smokeMul: 1.60 - s.lungs * 0.11,
            panicMul: 1.70 - s.nerve * 0.13,
            voiceMul: 0.40 + s.voice * 0.10,
            maxCarry: s.strength >= 10 ? 2 : 1,
            carryCap: s.strength >= 10 ? 999 : 40 + s.strength * 9,
        };
    }

    PRS.data = PRS.data || {};
    PRS.data.characters = { CHARACTERS, byId, other, derive };
})(window);
