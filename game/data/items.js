// What is in your bag, and what is in the aeroplane. Fourteen things, and every one of them does
// something that helps: there used to be forty-one, and the megaphone and the iguana were funnier
// than the water bottle and did less.
//
// Fields
//   kg        against the eight-kilo allowance
//   sprite    "cabin:name" or "nauvis:name" - the modpack's icons are reused where the mismatch
//             is funnier than a new drawing would be
//   uses      charges; null for something that does not run out
//   agent     the entry in fire.AGENTS this thing puts on a fire, if any
//   tags      what actions look for: the action decks ask for tags, never for item ids, so a new
//             item is playable the moment it is listed here
//   refill    where its charges come back from, if anywhere
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    const ITEMS = [
        // --------------------------------------------------------------- things that help ---
        { id: "water_big", name: "1.5 litre bottle of still water", kg: 1.5,
          sprite: "cabin:water_bottle", uses: 3, agent: "water",
          tags: ["water", "douse", "drink", "refillable"], refill: "tap",
          blurb: "Bought airside for six euros. It is the single most useful object you own.",
          note: "Three good pours. The lavatory tap fills it again in nine seconds." },

        { id: "wet_towel", name: "Damp travel towel", kg: 0.4, sprite: "cabin:wet_towel",
          uses: 4, agent: "wetcloth", tags: ["cloth", "douse", "mask", "refillable"], refill: "tap",
          blurb: "Microfibre, packs to nothing, smells faintly of a hotel in Lisbon.",
          note: "Smothers without spreading, and tied over a face it buys somebody a minute." },

        { id: "blanket", name: "Your own travel blanket", kg: 0.7, sprite: "cabin:blanket",
          uses: null, agent: "smother", tags: ["cloth", "smother", "wettable", "cover"],
          blurb: "Because the airline's are thin and you are not an animal.",
          note: "Never runs out. Soak it in a lavatory and it becomes the second best thing here." },

        { id: "gloves", name: "Welding gloves", kg: 0.5, sprite: "cabin:fire_gloves",
          uses: null, tags: ["gloves", "heat", "grip"],
          blurb: "You do stained glass. You were not going to check a bag for these.",
          note: "You can touch things that are on fire. This turns out to be most things." },

        { id: "hood", name: "Escape smoke hood", kg: 0.6, sprite: "cabin:smoke_hood",
          uses: 1, tags: ["hood", "smoke", "self"],
          blurb: "You bought it after a documentary. Your family have not stopped mentioning it.",
          note: "Fifteen minutes of not breathing smoke. Fifteen minutes is the whole game." },

        { id: "goggles", name: "Swimming goggles", kg: 0.1, sprite: "nauvis:light_armor",
          uses: null, tags: ["eyes", "smoke", "self"],
          blurb: "Mirrored. For the pool at the hotel. You look ridiculous.",
          note: "You can keep your eyes open in smoke that shuts everyone else's." },

        { id: "multitool", name: "Multi-tool that should not have got through security", kg: 0.3,
          sprite: "nauvis:repair_pack", uses: null, tags: ["tool", "cut", "pry", "belt"],
          blurb: "It has a blade, a driver and a small saw, and it went through Gatwick in a shoe.",
          note: "Cuts a seatbelt in two seconds instead of unbuckling it in six." },

        { id: "tape", name: "Roll of duct tape", kg: 0.4, sprite: "cabin:duct_tape",
          uses: 6, tags: ["tape", "seal", "tie", "pry"],
          blurb: "Flattened, wound round a pencil. You are that sort of person.",
          note: "Seals a bin, seals a vent, and tapes a panicking man to a seat." },

        { id: "binbag", name: "Roll of bin liners", kg: 0.2, sprite: "nauvis:plastic_bar",
          uses: 4, tags: ["bag", "water", "carry", "refillable"], refill: "tap",
          blurb: "For wet swimming things. Nine litres each, if you are quick and you are lucky.",
          note: "The biggest volume of water you can move in one trip. Fiddly. Worth it." },

        { id: "first_aid", name: "Compact first aid kit", kg: 0.6, sprite: "cabin:first_aid",
          uses: 4, tags: ["medical", "burn", "treat"],
          blurb: "Burn gel, a foil blanket, plasters nobody will need and a pair of shears.",
          note: "Burn gel is the difference between a passenger who walks and one you carry." },

        { id: "inhaler", name: "Salbutamol inhaler", kg: 0.05, sprite: "nauvis:water_barrel",
          uses: 3, tags: ["medical", "lungs", "self", "treat"],
          blurb: "Your sister's, technically, from a holiday in 2019.",
          note: "Puts a set of lungs back in the game. Yours or somebody else's." },

        { id: "strap", name: "Luggage strap", kg: 0.3, sprite: "nauvis:copper_cable",
          uses: null, tags: ["strap", "drag", "tie"],
          blurb: "Bright orange, two metres, with a buckle that only goes one way.",
          note: "Dragging is slower than carrying and it works on people you cannot lift." },

        // ----------------------------------------------- things that help in a stupider way ---
        { id: "hivis", name: "Hi-vis vest", kg: 0.2, sprite: "nauvis:light_armor",
          uses: null, tags: ["authority", "wear"],
          blurb: "From a warehouse job in 2016, in the bottom of the bag, for no reason.",
          note: "People obey a hi-vis vest. People have always obeyed a hi-vis vest." },

        { id: "phone", name: "Your phone", kg: 0.2, sprite: "cabin:phone",
          uses: null, tags: ["phone", "film", "light", "evidence"],
          blurb: "Sixty-one per cent. No signal. A camera.",
          note: "Film the fire and people believe you. Show them and they believe you faster." },



        // -------------------------------------------------------- things that make it worse ---
    ];

    // ------------------------------------------------------------------ where a thing lives ---
    //
    // The loadout screen used to be forty-three items against an eight-kilo allowance, which is a
    // decision with more states than a chess opening, made by somebody who has never seen the
    // aeroplane. So the bag is now three things out of twelve, and everything else was moved into
    // the aircraft: into the galley and the lavatory and the seat pockets, and above all into
    // other people's hands.
    //
    // That last part is the point. The way you get equipped is by talking to passengers, which is
    // the thing the game already wanted you to spend your fifteen minutes doing.

    /** Three. That is the cabin baggage allowance and it is still being enforced. */
    const SLOTS = 3;

    // What a person plausibly has on them or in the seat pocket in front of them.
    const BAG_POOL = [
        "water_big", "wet_towel", "blanket", "phone", "multitool",
        "hood", "goggles", "first_aid", "strap",
    ];

    // What is stowed in the galley drawers, for whoever goes and looks.
    const CABIN_POOL = ["binbag"];

    // Everything else is in somebody's lap, and the only way to it is to ask them.
    for (const item of ITEMS) {
        item.where = BAG_POOL.indexOf(item.id) >= 0 ? "bag"
                   : CABIN_POOL.indexOf(item.id) >= 0 ? "cabin" : "pax";
    }

    /** The twelve the bag screen offers, in the order they are listed above. */
    function bagPool() {
        return BAG_POOL.map(byId).filter(Boolean);
    }

    const ALLOWANCE = 8.0;   // kept for the report's arithmetic; the bag is counted in slots now

    function byId(id) {
        for (const item of ITEMS) if (item.id === id) return item;
        return null;
    }

    /** Weight of a chosen list, against the allowance the airline is still enforcing. */
    function totalKg(ids) {
        let kg = 0;
        for (const id of ids) { const it = byId(id); if (it) kg += it.kg; }
        return Math.round(kg * 100) / 100;
    }

    /** A few loadouts with names, for players who do not want to read forty blurbs. */
    /** Four one-click answers, so a first-time player can skip the screen entirely. */
    const PRESETS = [
        { id: "sensible", name: "The sensible three",
          note: "What somebody who has thought about this would carry. It is not a fun bag.",
          items: ["water_big", "wet_towel", "blanket"] },
        { id: "documentary", name: "The one who saw the documentary",
          note: "Everything for surviving it yourself and nothing at all for anybody else.",
          items: ["hood", "goggles", "wet_towel"] },
        { id: "hands", name: "Two hands and a plan",
          note: "For getting people out of seats and along a floor, which is the whole job.",
          items: ["multitool", "strap", "first_aid"] },
        { id: "evidence", name: "Proving it",
          note: "Nobody believes you. These are for changing that, which is most of the game.",
          items: ["phone", "multitool", "water_big"] },

    ];

    PRS.data = PRS.data || {};
    PRS.data.items = { ITEMS, SLOTS, ALLOWANCE, PRESETS, BAG_POOL, CABIN_POOL,
                       bagPool, byId, totalKg };
})(window);
