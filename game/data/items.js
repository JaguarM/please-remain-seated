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

        { id: "powerbank", name: "Power bank", kg: 0.4, sprite: "cabin:power_bank",
          uses: null, tags: ["battery", "hazard"],
          blurb: "Twenty thousand milliamp hours of exactly the thing that started this.",
          note: "You are carrying the same fire that is in the bin. Do not lose track of it." },

        { id: "laptop", name: "Work laptop", kg: 1.7, sprite: "cabin:laptop",
          uses: null, tags: ["shield", "hazard", "battery"],
          blurb: "It has the deck on it. The deck no longer matters.",
          note: "A heavy flat thing you can hold in front of your face. Also a second battery." },

        { id: "pillow", name: "Memory foam neck pillow", kg: 0.3, sprite: "cabin:neck_pillow",
          uses: null, tags: ["cushion", "cover", "wettable"],
          blurb: "Grey, slightly damp, the shape of a horseshoe and of regret.",
          note: "Wet, held over a mouth, it is a filter. Dry, it is fuel." },

        { id: "wipes", name: "Packet of wet wipes", kg: 0.2, sprite: "nauvis:plastic_bar",
          uses: 6, agent: "wetcloth", tags: ["cloth", "mask", "douse"],
          blurb: "Aloe. Forty of them. Individually useless, collectively not.",
          note: "Six small wet things. Each one buys one person one breath." },

        { id: "pretzels", name: "Bag of pretzels", kg: 0.15, sprite: "cabin:pretzels",
          uses: 1, tags: ["food", "bribe", "hazard"],
          blurb: "Salted. Airside price. You have been saving them.",
          note: "You can bribe a child with these. It works. It should not, but it works." },

        { id: "crossword", name: "Book of cryptic crosswords", kg: 0.3, sprite: "cabin:crossword",
          uses: null, tags: ["calm", "bribe", "paper", "hazard"],
          blurb: "Half done, in pen, badly.",
          note: "Hand it to a panicking person and they will stop panicking to be annoyed by it." },

        { id: "rosary", name: "Rosary", kg: 0.05, sprite: "cabin:rosary",
          uses: null, tags: ["calm", "faith"],
          blurb: "Olive wood, from a shop near a basilica, bought for somebody who died.",
          note: "It does nothing. It does a great deal. Both of these are true." },

        { id: "harmonica", name: "Harmonica in C", kg: 0.1, sprite: "cabin:harmonica",
          uses: null, tags: ["calm", "loud", "absurd"],
          blurb: "You are learning. You are not good. You are learning.",
          note: "Playing it in a burning cabin is one of the twelve endings." },

        { id: "headphones", name: "Noise cancelling headphones", kg: 0.3, sprite: "cabin:headphones",
          uses: null, tags: ["ears", "calm", "hazard"],
          blurb: "Over-ear. The good ones. The reason you have not heard anything all flight.",
          note: "Wearing them calms you and deafens you. Choose a moment." },

        { id: "earplugs", name: "Foam earplugs", kg: 0.02, sprite: "nauvis:sulfur",
          uses: null, tags: ["ears", "calm", "absurd"],
          blurb: "Orange. In a tiny plastic barrel. Free from a hotel.",
          note: "You cannot hear anyone telling you to sit down. This is a real advantage." },

        { id: "goldfish", name: "Emotional support iguana", kg: 1.4, sprite: "cabin:iguana",
          uses: null, tags: ["animal", "chaos", "absurd", "rescue"],
          blurb: "His name is Gerald and the airline has a letter about him.",
          note: "Release him and the cabin will believe something is wrong, for the wrong reason." },

        { id: "carrier", name: "Soft pet carrier (empty)", kg: 0.5, sprite: "cabin:pet_carrier",
          uses: null, tags: ["bag", "carry", "rescue"],
          blurb: "Gerald refuses to travel in it, so it travels empty, which is very Gerald.",
          note: "A child or an animal fits. Carrying one in this is faster than carrying one." },

        { id: "umbrella", name: "Telescopic umbrella", kg: 0.4, sprite: "nauvis:iron_stick",
          uses: null, tags: ["reach", "pry", "hazard"],
          blurb: "Wind-proof to sixty kilometres an hour, according to the tag.",
          note: "You can reach a bin latch from the aisle without standing under it." },

        { id: "ball", name: "Cricket ball", kg: 0.16, sprite: "nauvis:solid_fuel",
          uses: null, tags: ["throw", "absurd", "reach"],
          blurb: "For your nephew. Red, seamed, heavier than it looks.",
          note: "You can hit a call button, a smoke detector or a person from eleven rows away." },

        { id: "laser", name: "Laser pointer", kg: 0.03, sprite: "nauvis:battery",
          uses: null, tags: ["point", "absurd", "light"],
          blurb: "Green, from a conference, banned in several countries.",
          note: "You can point at the exact bin from your seat. Nobody will look at it." },

        // -------------------------------------------------------- things that make it worse ---
        { id: "gin", name: "Four duty-free miniatures", kg: 0.4, sprite: "cabin:mini_gin",
          uses: 4, agent: "spirits", tags: ["spirits", "bribe", "hazard", "drink"],
          blurb: "Gin, whisky, rum, and one you cannot identify. Forty per cent, all of them.",
          note: "Forty per cent alcohol is sixty per cent water and one hundred per cent a mistake." },

        { id: "perfume", name: "Duty-free perfume, 100ml", kg: 0.4, sprite: "cabin:perfume",
          uses: 2, agent: "perfume", tags: ["hazard", "bribe", "gift"],
          blurb: "For your mother. In the bag. In the box. In the other bag.",
          note: "Eighty per cent ethanol in an aerosol. Please do not." },

        { id: "sanitiser", name: "Large hand sanitiser", kg: 0.5, sprite: "cabin:sanitiser",
          uses: 3, agent: "sanitiser", tags: ["hazard", "clean"],
          blurb: "Five hundred millilitres, seventy per cent alcohol, since 2020.",
          note: "It is a gel that burns with a flame you cannot see. Genuinely, do not." },

        { id: "thermos", name: "Thermos of coffee", kg: 0.9, sprite: "cabin:coffee_pot",
          uses: 2, agent: "coffee", tags: ["drink", "hot", "douse", "refillable"], refill: "tap",
          blurb: "Filled at six this morning. Still, somehow, scalding.",
          note: "Hot liquid on a fire is a worse idea than cold liquid and a better one than gin." },

        { id: "energy", name: "Four cans of energy drink", kg: 1.4, sprite: "cabin:soda_can",
          uses: 4, agent: "soda", tags: ["drink", "douse", "sugar"],
          blurb: "Sponsored. Sugar-free. The taste is a warning.",
          note: "It is mostly water. The rest of it caramelises, which smells appalling." },

        { id: "vape", name: "Your own vape", kg: 0.06, sprite: "cabin:vape",
          uses: null, tags: ["hazard", "battery", "absurd", "irony"],
          blurb: "Identical to the one in the bin. Same brand. Same battery. Same everything.",
          note: "You are carrying the murder weapon. There is an ending about this." },
    ];

    const ALLOWANCE = 8.0;

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
    const PRESETS = [
        { id: "sensible", name: "The sensible bag",
          note: "What a person who has thought about this would bring. It is not a fun bag.",
          items: ["water_big", "wet_towel", "blanket", "gloves", "multitool", "first_aid",
                  "torch", "strap"] },
        { id: "prepper", name: "The one who saw the documentary",
          note: "Everything for surviving it yourself, and very little for anybody else.",
          items: ["hood", "goggles", "gloves", "torch", "inhaler", "multitool", "tape", "whistle"] },
        { id: "authority", name: "Command presence",
          note: "You have no authority. You have the appearance of authority, which is most of it.",
          items: ["hivis", "clipboard", "lanyard", "megaphone", "whistle", "water_big",
                  "wet_towel", "tape"] },
        { id: "dutyfree", name: "Duty free",
          note: "Every item in this bag makes the fire bigger. Every single one.",
          items: ["gin", "perfume", "sanitiser", "energy", "vape", "powerbank", "laptop",
                  "pretzels"] },
        { id: "chaos", name: "Absolutely no plan at all",
          note: "The bag of a person who packed in nine minutes and has never been afraid.",
          items: ["goldfish", "harmonica", "airhorn", "laser", "ball", "crossword", "earplugs",
                  "pretzels"] },
    ];

    PRS.data = PRS.data || {};
    PRS.data.items = { ITEMS, ALLOWANCE, PRESETS, byId, totalKg };
})(window);
