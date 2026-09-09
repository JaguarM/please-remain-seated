// What is in your bag. Forty-one things, eight kilos of allowance, and the airline is going to
// enforce that allowance while its aeroplane is on fire.
//
// The joke the loadout screen is telling is that the correct answer is boring. Water, a wet
// towel, a blanket and a pair of welding gloves will get more people off this aeroplane than any
// clever combination, and almost nobody picks them, because next to them on the shelf there is a
// megaphone and an iguana.
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

        { id: "torch", name: "Small torch", kg: 0.2, sprite: "cabin:flashlight",
          uses: null, tags: ["light", "smoke", "signal"],
          blurb: "Aluminium, unreasonably bright, a present from your father.",
          note: "In smoke you cannot see through, this is how people find the door." },

        { id: "strap", name: "Luggage strap", kg: 0.3, sprite: "nauvis:copper_cable",
          uses: null, tags: ["strap", "drag", "tie"],
          blurb: "Bright orange, two metres, with a buckle that only goes one way.",
          note: "Dragging is slower than carrying and it works on people you cannot lift." },

        { id: "scissors", name: "Blunt-nosed scissors", kg: 0.1, sprite: "nauvis:iron_stick",
          uses: null, tags: ["cut", "belt"],
          blurb: "The permitted length. Barely.",
          note: "Cuts a belt. Slowly. Better than fingers." },

        // ----------------------------------------------- things that help in a stupider way ---
        { id: "hivis", name: "Hi-vis vest", kg: 0.2, sprite: "nauvis:light_armor",
          uses: null, tags: ["authority", "wear"],
          blurb: "From a warehouse job in 2016, in the bottom of the bag, for no reason.",
          note: "People obey a hi-vis vest. People have always obeyed a hi-vis vest." },

        { id: "clipboard", name: "Clipboard", kg: 0.4, sprite: "cabin:manual",
          uses: null, tags: ["authority", "hold"],
          blurb: "A4, aluminium, with a form on it about something else entirely.",
          note: "A hi-vis vest and a clipboard together are functionally a uniform." },

        { id: "lanyard", name: "Expired conference lanyard", kg: 0.05, sprite: "nauvis:battery",
          uses: null, tags: ["authority", "wear"],
          blurb: "AVIATION SAFETY EXPO 2023 — DELEGATE. You went for the free bag.",
          note: "Nobody reads a lanyard. Everybody obeys one." },

        { id: "megaphone", name: "Collapsible megaphone", kg: 1.1, sprite: "cabin:megaphone",
          uses: null, tags: ["loud", "voice", "authority"],
          blurb: "For a protest. You have not decided which one.",
          note: "You can be heard in every row at once. Whether that helps is up to you." },

        { id: "airhorn", name: "Compressed air horn", kg: 0.4, sprite: "nauvis:grenade",
          uses: 3, tags: ["loud", "wake", "panic"],
          blurb: "Novelty. Football. A hundred and twenty decibels in a metal tube.",
          note: "Wakes the whole cabin instantly. Every single person. All at once." },

        { id: "whistle", name: "Referee's whistle", kg: 0.05, sprite: "cabin:whistle",
          uses: null, tags: ["loud", "wake", "signal"],
          blurb: "On a cord, from a school sports day you were made to run.",
          note: "Cuts through smoke and noise without starting a stampede. Usually." },

        { id: "phone", name: "Your phone", kg: 0.2, sprite: "cabin:phone",
          uses: null, tags: ["phone", "film", "light", "evidence"],
          blurb: "Sixty-one per cent. No signal. A camera.",
          note: "Film the fire and people believe you. Show them and they believe you faster." },





        { id: "pretzels", name: "Bag of pretzels", kg: 0.15, sprite: "cabin:pretzels",
          uses: 1, tags: ["food", "bribe", "hazard"],
          blurb: "Salted. Airside price. You have been saving them.",
          note: "You can bribe a child with these. It works. It should not, but it works." },








        { id: "carrier", name: "Soft pet carrier (empty)", kg: 0.5, sprite: "cabin:pet_carrier",
          uses: null, tags: ["bag", "carry", "rescue"],
          blurb: "Gerald refuses to travel in it, so it travels empty, which is very Gerald.",
          note: "A child or an animal fits. Carrying one in this is faster than carrying one." },

        { id: "umbrella", name: "Telescopic umbrella", kg: 0.4, sprite: "nauvis:iron_stick",
          uses: null, tags: ["reach", "pry", "hazard"],
          blurb: "Wind-proof to sixty kilometres an hour, according to the tag.",
          note: "You can reach a bin latch from the aisle without standing under it." },



        // -------------------------------------------------------- things that make it worse ---
        { id: "gin", name: "Four duty-free miniatures", kg: 0.4, sprite: "cabin:mini_gin",
          uses: 4, agent: "spirits", tags: ["spirits", "bribe", "hazard", "drink"],
          blurb: "Gin, whisky, rum, and one you cannot identify. Forty per cent, all of them.",
          note: "Forty per cent alcohol is sixty per cent water and one hundred per cent a mistake." },



        { id: "thermos", name: "Thermos of coffee", kg: 0.9, sprite: "cabin:coffee_pot",
          uses: 2, agent: "coffee", tags: ["drink", "hot", "douse", "refillable"], refill: "tap",
          blurb: "Filled at six this morning. Still, somehow, scalding.",
          note: "Hot liquid on a fire is a worse idea than cold liquid and a better one than gin." },

        { id: "energy", name: "Four cans of energy drink", kg: 1.4, sprite: "cabin:soda_can",
          uses: 4, agent: "soda", tags: ["drink", "douse", "sugar"],
          blurb: "Sponsored. Sugar-free. The taste is a warning.",
          note: "It is mostly water. The rest of it caramelises, which smells appalling." },

        // Not in the bag screen and not on any passenger. It is in the aft lavatory waste bin,
        // and it is the only thing left in this game that does not help.
        { id: "vape", name: "A vape that is not yours", kg: 0.06, sprite: "cabin:vape",
          uses: null, tags: ["hazard", "battery", "irony"],
          blurb: "Found in a bin at the back. Same brand as the one in the locker. Same battery.",
          note: "It does nothing. Somebody put it there and said nothing, and now you know." },
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
        "torch", "hood", "goggles", "first_aid", "strap",
    ];

    // What is stowed somewhere in the aeroplane, for whoever goes and looks.
    const CABIN_POOL = ["binbag", "thermos", "scissors", "energy"];

    // Found, not packed, and it is the only thing left in the game that does nothing.
    const HIDDEN = ["vape"];

    // Everything else is in somebody's lap, and the only way to it is to ask them.
    for (const item of ITEMS) {
        item.where = BAG_POOL.indexOf(item.id) >= 0 ? "bag"
                   : CABIN_POOL.indexOf(item.id) >= 0 ? "cabin"
                   : HIDDEN.indexOf(item.id) >= 0 ? "hidden" : "pax";
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
          items: ["hood", "goggles", "torch"] },
        { id: "hands", name: "Two hands and a plan",
          note: "For getting people out of seats and along a floor, which is the whole job.",
          items: ["multitool", "strap", "first_aid"] },
        { id: "evidence", name: "Proving it",
          note: "Nobody believes you. These are for changing that, which is most of the game.",
          items: ["phone", "multitool", "water_big"] },

    ];

    PRS.data = PRS.data || {};
    PRS.data.items = { ITEMS, SLOTS, ALLOWANCE, PRESETS, BAG_POOL, CABIN_POOL, HIDDEN,
                       bagPool, byId, totalKg };
})(window);
