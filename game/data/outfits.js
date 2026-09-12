// What you are wearing. Six of them, and they do nothing except move your five numbers.
//
// This is the second thing the log book unlocks. A stat package is a choice you can make in ten
// seconds on your first flight and still be thinking about on your twentieth, because the numbers
// are load-bearing: two points of speed is a second off every step of nine hundred, and two
// points of voice is the difference between being listened to at minute four and at minute nine.
// Nothing here carries an item. Clothes are clothes. "What you flew in" is no outfit at all.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, K = PRS.k;

    // Each is worth net +1 across the five, spent differently. `mod` is added to the character's
    // own stats and nothing is clamped: a purser with a voice of nine puts the suit on and reads
    // eleven, because a ten that was going to be a ten whatever you wore is an outfit that does
    // nothing and says it does something. Ten is the width of the bar, not the top of the scale.
    // `unlock` is the number of souls in the log
    // book, at which it hangs in the wardrobe. The book counts people your actions saved rather
    // than people who got off, which is about twenty on a good flight, so the first two are a
    // first flight and a third flight and the spacing widens from there: the wardrobe should
    // open while you are still working out what the aeroplane is, not once you have finished.
    const OUTFITS = [
        {
            id: "gym", name: K("Gym kit and trainers"), unlock: 10, sprite: "outfit_gym",
            blurb: K("You were going to run at the other end. Shorts, a technical top, and the " +
                   "only shoes on this aeroplane you can actually sprint in."),
            mod: { speed: 2, voice: -1 },
            note: K("Fastest in the cabin. Nobody in shorts has ever been believed about anything."),
        },
        {
            id: "suit", name: K("The suit you flew in"), unlock: 40, sprite: "outfit_suit",
            blurb: K("There is a meeting at four. There is not going to be a meeting at four. The " +
                   "jacket is on the hook by the door and the tie is still done up."),
            mod: { voice: 2, speed: -2 },
            note: K("People do what a suit says. A suit cannot climb over a row of seats."),
        },
        {
            id: "work", name: K("Work clothes"), unlock: 90, sprite: "outfit_work",
            blurb: K("Steel toecaps, sleeves rolled, and hands that have already been burned once " +
                   "this year."),
            mod: { strength: 2, voice: 1, speed: -2 },
            note: K("You can pick things up and people assume you are allowed to. Slow."),
        },
        {
            id: "comfort", name: K("Dressed for a long flight"), unlock: 180, sprite: "outfit_comfort",
            blurb: K("Fleece, compression socks, an eye mask pushed up onto your forehead since " +
                   "somewhere over the Alps."),
            mod: { lungs: 2, strength: -2 },
            note: K("You can breathe in there and you cannot lift anybody. Layers are a filter."),
        },
        {
            id: "hill", name: K("Straight off a hill"), unlock: 320, sprite: "outfit_hill",
            blurb: K("Boots, a hardshell, and a week at altitude that has left you with lungs that " +
                   "are going to matter in about four minutes."),
            mod: { lungs: 2, strength: 1, speed: -2 },
            note: K("You will still be standing up when everybody else is on the floor."),
        },
        {
            id: "beach", name: K("Shorts and flip-flops"), unlock: 500, sprite: "outfit_beach",
            blurb: K("It was thirty-one degrees when you got on. You have not thought about your " +
                   "feet once and you are going to think about them a great deal shortly."),
            mod: { speed: 2, strength: -1, lungs: -1 },
            note: K("Quick, cheerful, and about to walk through something hot in flip-flops."),
        },
    ];

    const BY_ID = {};
    for (const o of OUTFITS) BY_ID[o.id] = o;

    /** The outfit, or null for what you flew in. */
    function byId(id) { return BY_ID[id] || null; }

    /** The character's four numbers with the outfit added. No ceiling and no floor. */
    function apply(stats, outfit) {
        const out = {};
        for (const key in stats) {
            const delta = (outfit && outfit.mod && outfit.mod[key]) || 0;
            out[key] = stats[key] + delta;
        }
        return out;
    }

    /** The icon for an outfit, or for what a character flew in: the same top in their own shirt. */
    function icon(outfit, ch, scale) {
        if (outfit) return PRS.atlas.icon(outfit.sprite, scale || 3);
        const c = ch.shirt;
        return PRS.atlas.icon("outfit", scale || 3, { c: c, l: PRS.util.shade(c, 1.3) });
    }

    // The four, spelled out on a card rather than abbreviated on a bar.
    const STAT = {
        strength: () => T("strength"), speed: () => T("speed"), lungs: () => T("lungs"),
        voice: () => T("voice"),
    };

    /** "+2 speed, −1 voice", for the card. */
    function summary(outfit) {
        if (!outfit) return T("as you are");
        const bits = [];
        for (const key in outfit.mod) {
            const v = outfit.mod[key];
            bits.push((v > 0 ? "+" : "−") + Math.abs(v) + " " + STAT[key]());
        }
        return bits.join(", ");
    }

    PRS.data = PRS.data || {};
    PRS.data.outfits = { OUTFITS, byId, apply, summary, icon };
})(window);
