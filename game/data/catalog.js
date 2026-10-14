// Game catalog: Playable Characters, All-Useful Competitive Items, Passenger Archetypes,
// Cabin Layout Constants, Medals, and Daily Seed helpers.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};

    // 17 stations along the 2.5D fuselage cutaway (x = 0 .. 16)
    // x=0: Cockpit Door
    // x=1: Forward Exit Door (L1 Refuge) & Forward Galley (Tap + Halon + Drawer)
    // x=2..6: Forward Cabin Rows 1..5 (2 seats per row: Window & Aisle = 10 seats)
    // x=7: Overwing Exit Row & Beverage Cart Parking
    // x=8..14: Aft Cabin Rows 6..12 (2 seats per row = 14 seats; Row 9 is at x=11, Fire Origin!)
    // x=15: Aft Exit Door (L2 Refuge) & Aft Galley (Water Extinguisher + PA Interphone)
    // x=16: Aft Lavatory (Sink Basin + Running Tap + Ceiling Smoke Detector)
    const CABIN = {
        STATIONS: 17,
        STATION_W: 112, // world units per station
        COCKPIT_X: 0,
        FWD_EXIT_X: 1,
        OVERWING_X: 7,
        ORIGIN_X: 11,   // Row 9 overhead locker!
        ORIGIN_ROW: 9,
        AFT_EXIT_X: 15,
        LAV_X: 16,
        ROW_TO_X: {
            1: 2, 2: 3, 3: 4, 4: 5, 5: 6,
            6: 8, 7: 9, 8: 10, 9: 11, 10: 12, 11: 13, 12: 14
        },
        X_TO_ROW: {
            2: 1, 3: 2, 4: 3, 5: 4, 6: 5,
            8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: 12
        }
    };

    // Register additional 16x16 pixel-art sprites into window.PRS_ART.cabin so every item & 3D prop
    // uses the exact same 16x16 ASCII + palette pixel-art system from game/art/cabin-sprites.js.
    global.PRS_ART = global.PRS_ART || {};
    global.PRS_ART.cabin = Object.assign(global.PRS_ART.cabin || {}, {
        leaf_blower: {
            palette: { k: "#1e2024", o: "#f97316", h: "#fdba74", d: "#334155", c: "#38bdf8" },
            rows: [
                "................",
                "....kkkkkk......",
                "...khhhhhhk.....",
                "..kooooooook....",
                "..kooccccookkk..",
                "..kooooooookddk.",
                "...kooooookdddk.",
                "....kkkkkkddddk.",
                ".....kddk..kdddk",
                ".....kddk...kddk",
                "......kk.....kkk",
                "................",
                "................",
                "................",
                "................",
                "................"
            ]
        },
        air_horn: {
            palette: { k: "#1e2024", r: "#e11d48", h: "#fda4af", w: "#f8fafc", y: "#facc15" },
            rows: [
                "...........kkk..",
                ".........kkyyyk.",
                ".......kkyyyyyk.",
                ".....kkyyyyyyyk.",
                "....khrrrrrrrrk.",
                "....kkkkkkkkkkk.",
                "......kwwwwwwk..",
                "......krrrrrrk..",
                "......krrhhrrk..",
                "......krrrrrrk..",
                "......kwwwwwwk..",
                "......krrrrrrk..",
                "......krrrrrrk..",
                "......kkkkkkkk..",
                "................",
                "................"
            ]
        },
        vape_case: {
            palette: { k: "#171a20", d: "#334155", o: "#ff7a10", y: "#ffd02a", w: "#fff4b0" },
            rows: [
                "................",
                "....oo....y.....",
                "...oywo..oyo....",
                "..kkkkkkkkkkkk..",
                ".kddddddddddddk.",
                ".kdooyywwyyoodk.",
                ".kdoywwwwwwyodk.",
                ".kdooyywwyyoodk.",
                ".kddddddddddddk.",
                ".kkkkkkkkkkkkkk.",
                "..kddddddddddk..",
                "...kkkkkkkkkk...",
                "................",
                "................",
                "................",
                "................"
            ]
        },
        vape_case_blue: {
            palette: { k: "#101c5c", d: "#1e293b", o: "#1e56c8", y: "#3fa8ff", w: "#e8f8ff" },
            rows: [
                "......y..w......",
                "....oywo.yw.....",
                "...oywwwoywo....",
                "..kkkkkkkkkkkk..",
                ".kddddddddddddk.",
                ".kdooyywwyyoodk.",
                ".kdoywwwwwwyodk.",
                ".kdooyywwyyoodk.",
                ".kddddddddddddk.",
                ".kkkkkkkkkkkkkk.",
                "..kddddddddddk..",
                "...kkkkkkkkkk...",
                "................",
                "................",
                "................",
                "................"
            ]
        },
        suitcase: {
            palette: { k: "#1e2024", m: "#94a3b8", b: "#d97706", h: "#fbbf24", d: "#78350f" },
            rows: [
                ".....kkkkkk.....",
                ".....kmmmmk.....",
                ".....k....k.....",
                "...kkkkkkkkkk...",
                "..khhhhhhhhhhk..",
                "..kbbbbbbbbbbk..",
                "..kbddddddddbk..",
                "..kbbbbbbbbbbk..",
                "..kbddddddddbk..",
                "..kbbbbbbbbbbk..",
                "..kbddddddddbk..",
                "..kbbbbbbbbbbk..",
                "..kddddddddddk..",
                "...kkkkkkkkkk...",
                "...kk......kk...",
                "................"
            ]
        }
    });

    if (PRS.atlas && PRS.atlas.boot) {
        PRS.atlas.boot();
    }

    // Every single item is helpful and distinct — zero trap items, no alcohol/fuel.
    const ITEMS = [
        {
            id: "water_bottle",
            name: "1.5L Water Bottle",
            short: "Water Bottle",
            icon: "💧",
            sprite: "water_bottle",
            emptySprite: "water_bottle_empty",
            color: "#4db8ff",
            uses: 3,
            maxUses: 3,
            refillable: true,
            loadout: true,
            desc: "Pour on flames or cool the lithium case (+14s before next cell pop). Refill at Galley or Lavatory tap!"
        },
        {
            id: "phone",
            name: "Smartphone",
            short: "Phone",
            icon: "📱",
            sprite: "phone",
            color: "#a78bfa",
            uses: null,
            loadout: true,
            desc: "Snap a photo of the fire [F], then show it to Flight Attendants, Sceptics, or Cockpit to prove the emergency!"
        },
        {
            id: "gloves",
            name: "Welding Gloves",
            short: "Weld Gloves",
            icon: "🧤",
            sprite: "fire_gloves",
            color: "#f59e0b",
            uses: null,
            passive: true,
            loadout: true,
            desc: "Should not be in carry-on! Lets you grab the burning lithium vape case and hot bins with ZERO hand burns."
        },
        {
            id: "tape",
            name: "Heavy Duct Tape",
            short: "Duct Tape",
            icon: "🧻",
            sprite: "duct_tape",
            color: "#94a3b8",
            uses: 3,
            maxUses: 3,
            loadout: true,
            desc: "Tape the burning overhead bin shut (-70% oxygen), seal row vents against smoke, or lock the runaway cart!"
        },
        {
            id: "leaf_blower",
            name: "Cordless Leaf-Blower",
            short: "Leaf-Blower",
            icon: "💨",
            sprite: "leaf_blower",
            color: "#22d3ee",
            uses: 5,
            maxUses: 5,
            loadout: true,
            desc: "Why did TSA allow this?! Blasts ceiling smoke away from 4 rows and shoves blocking bags/carts down the aisle!"
        },
        {
            id: "air_horn",
            name: "Stadium Air Horn",
            short: "Air Horn",
            icon: "📢",
            sprite: "air_horn",
            color: "#fb7185",
            uses: 3,
            maxUses: 3,
            loadout: true,
            desc: "HONK! Wakes all heavy sleepers in 4 rows, stuns chasing Flight Attendants, and clears aisle blockers!"
        },
        {
            id: "multitool",
            name: "Tactical Multi-Tool",
            short: "Multi-Tool",
            icon: "🔧",
            sprite: "multitool",
            color: "#cbd5e1",
            uses: null,
            loadout: true,
            desc: "Pops open ceiling Oxygen Mask panels [F] in any row so seated passengers breathe safely through thick smoke!"
        },
        {
            id: "bin_liner",
            name: "9L Bin Liner Bag",
            short: "Water Bag",
            icon: "🗑️",
            sprite: "binbag",
            color: "#38bdf8",
            uses: 1,
            maxUses: 1,
            refillable: true,
            startsEmpty: true,
            loadout: true,
            desc: "Fill at any sink tap to create a massive 9-Litre Water Bomb that douses 3 rows and deeply cools the battery!"
        },
        {
            id: "hood",
            name: "Crew Smoke Hood",
            short: "Smoke Hood",
            icon: "🥽",
            sprite: "smoke_hood",
            color: "#facc15",
            uses: null,
            passive: true,
            loadout: true,
            desc: "Silver foil PBE hood. Blocks 90% of smoke inhalation even when sprinting upright through black smoke!"
        },
        {
            id: "first_aid",
            name: "Burn Gel & Inhaler",
            short: "Medkit",
            icon: "🧰",
            sprite: "first_aid",
            color: "#4ade80",
            uses: 4,
            maxUses: 4,
            loadout: true,
            desc: "Heals your burns & lungs, or revives a downed/coughing passenger on the spot and recruits them to help!"
        },
        {
            id: "halon",
            name: "Halon Extinguisher",
            short: "Halon BCF",
            icon: "🧯",
            sprite: "extinguisher",
            color: "#ef4444",
            uses: 4,
            maxUses: 4,
            loadout: false,
            desc: "Found in Forward Galley. Smothers open orange flames across adjacent rows in one blast!"
        },
        {
            id: "water_ext",
            name: "Pressurized Water Can",
            short: "Water Ext.",
            icon: "🚿",
            sprite: "extinguisher_water",
            color: "#3b82f6",
            uses: 5,
            maxUses: 5,
            loadout: false,
            desc: "Found in Aft Galley. High-pressure water jet that knocks down fire AND cools the lithium cells!"
        }
    ];

    const ITEM_BY_ID = {};
    for (const it of ITEMS) ITEM_BY_ID[it.id] = it;

    const CHARACTERS = [
        {
            id: "ansel",
            name: "Dr. Priya Ansel",
            short: "Priya",
            title: "Veterinary Surgeon",
            seatRow: 5,
            stats: { speed: 7, strength: 6, lungs: 7, voice: 8 },
            kit: ["first_aid"],
            defaultBag: ["water_bottle", "phone", "first_aid"],
            hair: "#1e1b18",
            skin: "#c68b59",
            shirt: "#2dd4bf",
            perk: "High persuasion & starts with Medkit; revives & recruits passengers fast."
        },
        {
            id: "gordy",
            name: "Gordy Mach",
            short: "Gordy",
            title: "Pro Strongman",
            seatRow: 6,
            stats: { speed: 6, strength: 10, lungs: 6, voice: 4 },
            kit: [],
            defaultBag: ["water_bottle", "air_horn", "bin_liner"],
            hair: "#5c3a21",
            skin: "#eab68c",
            shirt: "#ea580c",
            perk: "STRENGTH 10: Can carry TWO passengers at once without slowing down!"
        },
        {
            id: "volk",
            name: "Deidre Volk",
            short: "Deidre",
            title: "Retired Fire Officer",
            seatRow: 7,
            stats: { speed: 5, strength: 7, lungs: 10, voice: 7 },
            kit: ["gloves", "tape"],
            defaultBag: ["gloves", "tape", "water_bottle"],
            hair: "#e2e8f0",
            skin: "#e5b791",
            shirt: "#f59e0b",
            perk: "Boards with Welding Gloves & Duct Tape. Iron lungs and fireproof hands."
        },
        {
            id: "kip",
            name: "Kip Halloran",
            short: "Kip",
            title: "Extreme Sports Streamer",
            seatRow: 4,
            stats: { speed: 10, strength: 5, lungs: 8, voice: 6 },
            kit: ["leaf_blower"],
            defaultBag: ["leaf_blower", "phone", "water_bottle"],
            hair: "#facc15",
            skin: "#f3d2b8",
            shirt: "#6366f1",
            perk: "SPEED 10: Sprints & vaults 40% faster and boards with a Cordless Leaf-Blower!"
        },
        {
            id: "miriam",
            name: "Sister Miriam",
            short: "Miriam",
            title: "Headmistress Nun",
            seatRow: 3,
            stats: { speed: 6, strength: 5, lungs: 7, voice: 10 },
            kit: [],
            defaultBag: ["phone", "multitool", "water_bottle"],
            hair: "#cbd5e1",
            skin: "#d9a279",
            shirt: "#334155",
            perk: "VOICE 10: Flight Attendants & stubborn passengers obey her almost immediately."
        },
        {
            id: "dale",
            name: "Dale Kowalczyk",
            short: "Dale",
            title: "Undercover Air Marshal",
            seatRow: 10,
            stats: { speed: 7, strength: 8, lungs: 7, voice: 7 },
            kit: ["air_horn"],
            defaultBag: ["air_horn", "multitool", "gloves"],
            hair: "#27272a",
            skin: "#d6a17c",
            shirt: "#475569",
            perk: "Starts in Row 10 right behind the fire with an Air Horn & heavy carry strength."
        }
    ];

    // 24 Named Passengers across the 12 rows (2 per row: A = Window/Back, B = Aisle/Front)
    // Archetypes:
    // - culprit: Chip Vanterpool (Row 9A, right under the burning bin! Confesses immediately!)
    // - expert: Wilbur Ansty (Row 8B, 86yo former Vulcan pilot: frail, gives +25 Cred & sink tip)
    // - influencer: Jumps into aisle filming with selfie stick; [F] goes viral (+35 Credibility!)
    // - hoarder: Panics and pulls huge suitcase into aisle blocking movement; [F] shove bag or [W] jump!
    // - sceptic: Refuses talk ("Just condensation!") until shown Photo or smoke; then becomes fast Helper!
    // - snitch: Yells "ATTENDANT! UNBUCKLED!" when you pass at low cred, luring Crew to chase you!
    // - sleeper: Wearing huge noise-cancelling headphones ("Zzz"); [F] yank headphones off to wake!
    // - frail / child / pet: Cannot become helpers; high priority to carry [E] or drop oxygen mask for!
    // - able: Can be recruited [F] into autonomous Helpers who rescue frail/downed passengers!
    const PASSENGERS = [
        { row: 1, seat: "1A", name: "Maya Lin", role: "able", kg: 62, hair: "#18181b", shirt: "#38bdf8",
          line: "Tell me who needs lifting!" },
        { row: 1, seat: "1B", name: "Baby Theo & Clare", role: "frail", kg: 58, hair: "#92400e", shirt: "#f472b6",
          line: "Please! Help us to the door!" },

        { row: 2, seat: "2A", name: "Little Yuki (8)", role: "child", kg: 28, hair: "#09090b", shirt: "#fb7185",
          line: "The flight attendant forgot about me!" },
        { row: 2, seat: "2B", name: "DJ BassDrop", role: "sleeper", kg: 78, hair: "#a855f7", shirt: "#1e293b",
          line: "Zzz... *untz untz*... Huh?! Why's it smoky?!" },

        { row: 3, seat: "3A", name: "Coach Tanya", role: "able", kg: 74, hair: "#b45309", shirt: "#22c55e",
          line: "Alright team, let's haul people to the exits!" },
        { row: 3, seat: "3B", name: "Pamela 'Karen' Trout", role: "snitch", kg: 68, hair: "#fde047", shirt: "#ec4899",
          line: "STEWARDESS! This maniac is out of their seat!" },

        { row: 4, seat: "4A", name: "Bruno the Pug", role: "pet", kg: 14, hair: "#d97706", shirt: "#78350f",
          line: "*YIP! YIP! SNORT!*" },
        { row: 4, seat: "4B", name: "Clive Barker-Smythe", role: "sceptic", kg: 84, hair: "#64748b", shirt: "#3b82f6",
          line: "It's water vapour from the air conditioning. Sit down." },

        { row: 5, seat: "5A", name: "Arthur Pendelton", role: "hoarder", kg: 88, hair: "#94a3b8", shirt: "#a855f7",
          line: "I am NOT leaving without my 40-kilo carry-on!" },
        { row: 5, seat: "5B", name: "Nana Dot (84)", role: "frail", kg: 52, hair: "#f1f5f9", shirt: "#c084fc",
          line: "My knees won't make it down the aisle, dearie..." },

        { row: 6, seat: "6A", name: "Kevin Snooze", role: "sleeper", kg: 82, hair: "#475569", shirt: "#0ea5e9",
          line: "Zzz... wake me when they serve the pretzels..." },
        { row: 6, seat: "6B", name: "Dr. H. Grimsby", role: "sceptic", kg: 76, hair: "#334155", shirt: "#14b8a6",
          line: "Unless you have photographic proof, stop causing a scene." },

        { row: 7, seat: "7A", name: "Trixie 'VibeCheck'", role: "influencer", kg: 56, hair: "#f43f5e", shirt: "#f97316",
          line: "OMG CHAT IS THE PLANE ON FIRE?! SMASH SUBSCRIBE!" },
        { row: 7, seat: "7B", name: "Marco Rossi", role: "able", kg: 80, hair: "#1c1917", shirt: "#10b981",
          line: "Point me at the fire or the passengers — I'm ready!" },

        { row: 8, seat: "8A", name: "Brenda Stubbs", role: "hoarder", kg: 79, hair: "#7c2d12", shirt: "#eab308",
          line: "Wait! My duty-free Toblerones are in the locker!" },
        { row: 8, seat: "8B", name: "Wilbur Ansty (86)", role: "expert", kg: 64, hair: "#f8fafc", shirt: "#64748b",
          line: "Lithium battery! Cool it or dunk the case in the Lavatory Sink!" },

        { row: 9, seat: "9A", name: "Chip Vanterpool", role: "culprit", kg: 75, hair: "#ca8a04", shirt: "#ef4444",
          line: "Okay! OKAY! It's my vape in the bin! It got wet in Málaga!" },
        { row: 9, seat: "9B", name: "Mrs. Gable (79)", role: "frail", kg: 55, hair: "#e2e8f0", shirt: "#f43f5e",
          line: "*Cough! Cough!* The bin right above us is glowing!" },

        { row: 10, seat: "10A", name: "Nigel Finch", role: "snitch", kg: 72, hair: "#3f3f46", shirt: "#8b5cf6",
          line: "CABIN CREW! Arrest this person! The seatbelt sign is ON!" },
        { row: 10, seat: "10B", name: "Zack 'StreamGod'", role: "influencer", kg: 68, hair: "#06b6d4", shirt: "#ec4899",
          line: "BRO DO SOMETHING CRAZY FOR THE THUMBNAIL!" },

        { row: 11, seat: "11A", name: "Piotr Gregorski", role: "hoarder", kg: 92, hair: "#451a03", shirt: "#0284c7",
          line: "Nobody touches my golf bag! Back off!" },
        { row: 11, seat: "11B", name: "Meredith Vane", role: "sceptic", kg: 66, hair: "#713f12", shirt: "#6366f1",
          line: "I fly 200,000 miles a year. Planes don't catch fire." },

        { row: 12, seat: "12A", name: "Nurse Samira", role: "able", kg: 65, hair: "#0f172a", shirt: "#06b6d4",
          line: "Get people low to the floor by the doors! I'll help carry!" },
        { row: 12, seat: "12B", name: "Sleepy Stu", role: "sleeper", kg: 85, hair: "#52525b", shirt: "#84cc16",
          line: "Zzz... noise cancellation at 100%..." }
    ];

    const MEDALS = [
        { id: "sink_dunk", icon: "🚰", name: "Plumber's Special",
          desc: "Hauled the burning lithium vape case into the Aft Lavatory Sink with the tap running." },
        { id: "zero_casualties", icon: "🏆", name: "Miracle on Flight 447",
          desc: "Landed with every single soul on board alive." },
        { id: "viral_proof", icon: "📸", name: "Went Viral at 30,000 Feet",
          desc: "Used an Influencer's livestream or Smartphone photo to convince the cabin." },
        { id: "crew_flipped", icon: "🫡", name: "Look at Me, I'm the Purser Now",
          desc: "Turned the overzealous Flight Attendants from chasing you into full Emergency Mode." },
        { id: "declared_fast", icon: "⚡", name: "Priority Vector",
          desc: "Got the Cockpit to declare a Mayday and cut 45s off the descent within 60 seconds." },
        { id: "squad_goals", icon: "🤝", name: "Bucket Brigade",
          desc: "Recruited at least 3 passenger Helpers in a single flight." },
        { id: "pug_saved", icon: "🐶", name: "Good Boy Secured",
          desc: "Carried Bruno the Pug safely to an exit door refuge." }
    ];

    function dailySeedString() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return "DAILY-" + yyyy + "-" + mm + "-" + dd;
    }

    PRS.catalog = {
        CABIN,
        ITEMS,
        ITEM_BY_ID,
        CHARACTERS,
        PASSENGERS,
        MEDALS,
        dailySeedString,
        charById(id) { return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]; },
        itemById(id) { return ITEM_BY_ID[id] || null; }
    };
})(window);
