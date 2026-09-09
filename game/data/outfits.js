// What you are wearing. Six of them, one pick, and they do nothing except move your five numbers.
//
// This exists because the loadout screen used to be the whole game's difficulty curve compressed
// into one decision with forty-three variables in it, made by somebody who had never played. A
// stat package is a choice you can make in ten seconds on your first flight and still be thinking
// about on your twentieth, because the numbers are load-bearing: two points of speed is a second
// off every step of nine hundred, and two points of voice is the difference between being
// listened to at minute four and at minute nine.
//
// Nothing here carries an item. Clothes are clothes.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    // Each is worth net +1 across the five, spent differently. `mod` is added to the character's
    // own stats and the total is clamped to 1..10, so a 10-speed character cannot go to 12 and a
    // 2-strength child cannot be reduced below being able to lift a bag.
    const OUTFITS = [
        {
            id: "gym",
            name: "Gym kit and trainers",
            blurb: "You were going to run at the other end. Shorts, a technical top, and the only " +
                   "shoes on this aeroplane you can actually sprint in.",
            mod: { speed: 2, voice: -1 },
            note: "Fastest in the cabin. Nobody in shorts has ever been believed about anything.",
        },
        {
            id: "suit",
            name: "The suit you flew in",
            blurb: "There is a meeting at four. There is not going to be a meeting at four. The " +
                   "jacket is on the hook by the door and the tie is still done up.",
            mod: { voice: 2, nerve: 1, speed: -2 },
            note: "People do what a suit says. A suit cannot climb over a row of seats.",
        },
        {
            id: "work",
            name: "Work clothes",
            blurb: "Steel toecaps, a hi-vis rolled into the side pocket, and hands that have " +
                   "already been burned once this year.",
            mod: { strength: 2, voice: 1, speed: -2 },
            note: "You can pick things up and people assume you are allowed to. Slow.",
        },
        {
            id: "comfort",
            name: "Dressed for a long flight",
            blurb: "Fleece, compression socks, an eye mask pushed up onto your forehead since " +
                   "somewhere over the Alps.",
            mod: { nerve: 2, lungs: 1, strength: -2 },
            note: "Nothing frightens you and you cannot lift anybody. Layers are a filter.",
        },
        {
            id: "hill",
            name: "Straight off a hill",
            blurb: "Boots, a hardshell, and a week at altitude that has left you with lungs that " +
                   "are going to matter in about four minutes.",
            mod: { lungs: 2, strength: 1, speed: -2 },
            note: "You will still be standing up when everybody else is on the floor.",
        },
        {
            id: "beach",
            name: "Shorts and flip-flops",
            blurb: "It was thirty-one degrees when you got on. You have not thought about your " +
                   "feet once and you are going to think about them a great deal shortly.",
            mod: { speed: 2, nerve: 1, strength: -1, lungs: -1 },
            note: "Quick, cheerful, and about to walk through something hot in flip-flops.",
        },
    ];

    const BY_ID = {};
    for (const o of OUTFITS) BY_ID[o.id] = o;

    function byId(id) { return BY_ID[id] || OUTFITS[0]; }

    /** The character's five numbers with the outfit added, clamped where they have to be. */
    function apply(stats, outfit) {
        const out = {};
        for (const key in stats) {
            const delta = (outfit && outfit.mod && outfit.mod[key]) || 0;
            out[key] = Math.max(1, Math.min(10, stats[key] + delta));
        }
        return out;
    }

    /** "+2 speed, −1 voice", for the card. */
    function summary(outfit) {
        const names = { strength: "strength", speed: "speed", lungs: "lungs",
                        nerve: "nerve", voice: "voice" };
        const bits = [];
        for (const key in outfit.mod) {
            const v = outfit.mod[key];
            bits.push((v > 0 ? "+" : "−") + Math.abs(v) + " " + names[key]);
        }
        return bits.join(", ");
    }

    PRS.data = PRS.data || {};
    PRS.data.outfits = { OUTFITS, byId, apply, summary };
})(window);
