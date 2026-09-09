// Ten people who could be on this aeroplane, and two you have to earn.
//
// Five stats, one to ten, and every one of them is a multiplier on something the player will feel
// within thirty seconds of the first action:
//
//   strength  how long a carry takes, and whether a carry is possible at all
//   speed     the cost of every step and most actions
//   lungs     how fast smoke fills you up, and how long you last in the thick of it
//   nerve     how fast your own panic rises, and whether your hands work when it is high
//   voice     whether anybody does what you say
//
// The signature is a `perk` string that actions check by name. The flaw is not decoration: every
// character has something that makes their run genuinely worse, because a cast where one is
// strictly best is a cast of one.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    const CHARACTERS = [
        {
            id: "volk",
            name: "Deidre Volk",
            age: 71,
            title: "Retired station officer",
            blurb: "Thirty-one years in the fire service, eleven of them on the aerodrome crew. " +
                   "She has done this before, on the ground, with a hose, with a team, and with " +
                   "her knees.",
            stats: { strength: 6, speed: 3, lungs: 9, nerve: 10, voice: 6 },
            perks: ["firecraft", "reads_fire"],
            perkName: "Firecraft",
            perkText: "Every suppression does half again as much, you never waste an agent on the " +
                      "wrong thing, and you can see what the fire is actually doing.",
            flawName: "Seventy-one",
            flawText: "You are the slowest person in the cast. Every step and every carry costs " +
                      "you more than it costs anyone else.",
            hair: "#dfe3e6", skin: "#e5b791", shirt: "#4f5a68",
            open: "You have smelled this before. Nobody else on this aeroplane has.",
            locked: true,
            unlock: "Open the overhead locker and look at what is actually in it.",
            unlockKey: "seen_it",
        },
        {
            id: "kip",
            name: "Kip Halloran",
            age: 19,
            title: "Energy drink athlete",
            blurb: "Four hundred thousand followers, a sponsorship with a taurine company, and " +
                   "the fastest hands in row 9. He is going to film this. He knows he shouldn't.",
            stats: { strength: 4, speed: 10, lungs: 7, nerve: 4, voice: 5 },
            perks: ["fast_hands", "filming"],
            perkName: "Fast hands",
            perkText: "Everything that is not a carry costs you a quarter less. You move like the " +
                      "cabin is a corridor and not a problem.",
            flawName: "Content",
            flawText: "You have to keep filming. Every ninety seconds you do not, your panic " +
                      "climbs, and you cannot carry anybody heavier than you.",
            hair: "#d9b16a", skin: "#f2d0b4", shirt: "#2f3f7a",
            open: "This is the single greatest thing that has ever happened to your channel.",
        },
        {
            id: "ansel",
            name: "Dr Priya Ansel",
            age: 44,
            title: "Veterinary surgeon",
            blurb: "Small animals, mostly. Airways are airways, oxygen is oxygen, and she has " +
                   "resuscitated a great many things that were not people.",
            stats: { strength: 5, speed: 6, lungs: 6, nerve: 8, voice: 7 },
            perks: ["triage", "vitals"],
            perkName: "Triage",
            perkText: "You can bring back the unconscious, you can treat smoke and burns, and you " +
                      "can see exactly how badly each passenger is doing.",
            flawName: "Not a doctor",
            flawText: "Nobody takes a vet seriously on an aeroplane. Every crew action costs you " +
                      "extra credibility to land.",
            hair: "#1d1712", longHair: true, skin: "#c08a5e", shirt: "#3f7d8a",
            open: "You have already worked out who on this aeroplane is going to die first.",
            locked: true,
            unlock: "Be on board for five passengers going quiet.",
            unlockKey: "five_down",
        },
        {
            id: "gordy",
            name: "Gordy Mach",
            age: 38,
            title: "Competitive strongman",
            blurb: "Fourth in Europe, twice. He can pick up two adults and he is about to find " +
                   "out that this is the least of it.",
            stats: { strength: 10, speed: 5, lungs: 4, nerve: 6, voice: 4 },
            perks: ["two_up", "hoist", "brute"],
            perkName: "Two up",
            perkText: "You carry two people at once, you can throw one clear over the seats, and " +
                      "no passenger is too heavy for you. Nobody.",
            flawName: "Big lungs, small use",
            flawText: "You take in more air than anybody, and today that is exactly the wrong " +
                      "thing to be good at. The smoke fills you twice as fast.",
            hair: "#4a3220", skin: "#e5b791", shirt: "#8a4526",
            open: "Everything on this aeroplane is lighter than your opener.",
            locked: true,
            unlock: "Carry somebody who weighs more than ninety kilos.",
            unlockKey: "carried_heavy",
        },
        {
            id: "miriam",
            name: "Sister Miriam-Claire",
            age: 62,
            title: "Sister of the Order of St Brigid",
            blurb: "Forty years of getting people to do things they do not want to do, in a voice " +
                   "that has never once been raised.",
            stats: { strength: 4, speed: 4, lungs: 6, nerve: 10, voice: 10 },
            perks: ["flock", "calm_presence"],
            perkName: "The flock",
            perkText: "You persuade a whole row at once, helpers come to you twice as fast, and " +
                      "panic falls wherever you are standing.",
            flawName: "Four foot eleven",
            flawText: "You cannot carry an adult on your own. Ever. Everything you achieve, you " +
                      "achieve through other people.",
            hair: "#9aa0a6", longHair: true, skin: "#d9a279", shirt: "#232630",
            open: "You have buried more people than anyone else on board. It has not helped.",
        },
        {
            id: "ubel",
            name: "Terrence Ubel",
            age: 51,
            title: "Aviation liability counsel",
            blurb: "He has read the cabin crew manual for this aircraft type. Not this airline's " +
                   "manual. The manufacturer's. For a case. In 2019.",
            stats: { strength: 5, speed: 6, lungs: 6, nerve: 7, voice: 9 },
            perks: ["chapter_and_verse", "reads_fire", "knows_kit"],
            perkName: "Chapter and verse",
            perkText: "The crew cannot refuse you twice. You know where every extinguisher, hood " +
                      "and halon bottle on this aeroplane is stowed, and you can quote the page.",
            flawName: "Counsel",
            flawText: "You argue. It is what you are for, and it is slow. Every social action " +
                      "costs you eight seconds more than it costs anyone else.",
            hair: "#2b2118", skin: "#a06b42", shirt: "#1c2130",
            open: "You know the regulation. You know the case law. You know how this reads later.",
            locked: true,
            unlock: "Get cabin crew credibility above eighty.",
            unlockKey: "believed",
        },
        {
            id: "mo",
            name: "Mo Achterberg",
            age: 29,
            title: "Extremely nervous flyer",
            blurb: "He counts the rows to the exits before the doors close. He has done it on " +
                   "every flight of his life and today it is going to be worth it.",
            stats: { strength: 6, speed: 6, lungs: 5, nerve: 2, voice: 4 },
            perks: ["adrenaline", "counted_the_rows"],
            perkName: "Adrenaline",
            perkText: "Once your panic passes eighty, everything you do costs half. You already " +
                      "know the row numbers of all four exits by heart.",
            flawName: "Two out of ten",
            flawText: "You start frightened and you get worse. Below sixty panic you fumble; the " +
                      "game is played on the wrong side of your own nervous system.",
            hair: "#6b4423", skin: "#f2d0b4", shirt: "#4a5a86",
            open: "You have rehearsed this in your head four hundred times. None of them had a fire.",
            locked: true,
            unlock: "Let your own panic reach ninety and keep working.",
            unlockKey: "panicking",
        },
        {
            id: "rusk",
            name: "Captain Nell Rusk",
            age: 58,
            title: "Deadheading captain",
            blurb: "Type rated on this airframe, in row 22, in a jumper, going home. It is not " +
                   "her aeroplane. She is about to make it her aeroplane.",
            stats: { strength: 5, speed: 5, lungs: 7, nerve: 9, voice: 8 },
            perks: ["flight_deck", "reads_fire", "knows_kit"],
            perkName: "Four bars",
            perkText: "The flight deck will open for you. You can call for an emergency descent, " +
                      "and the crew will do what you tell them the first time you tell them.",
            flawName: "The descent is not free",
            flawText: "Getting down early puts the aeroplane on the ground sooner and the fire " +
                      "does not slow down to match. You will have less time, not more.",
            hair: "#9aa0a6", skin: "#e5b791", shirt: "#1c2130",
            open: "You have flown this approach nine hundred times. Never from row 22.",
            locked: true,
            unlock: "Get the flight deck to declare an emergency.",
            unlockKey: "declared",
        },
        {
            id: "yuki",
            name: "Yuki Tanaka-Brandt",
            age: 8,
            title: "Unaccompanied minor",
            blurb: "A lanyard, a plastic wallet, and a flight attendant who was supposed to be " +
                   "checking on her every twenty minutes and has not, for fifty.",
            stats: { strength: 2, speed: 9, lungs: 8, nerve: 5, voice: 3 },
            perks: ["small", "under_the_smoke", "invisible"],
            perkName: "Small",
            perkText: "You go under the seats and under the smoke. The aisle never jams for you " +
                      "and no adult on this aeroplane will physically stop you doing anything.",
            flawName: "Eight",
            flawText: "You cannot carry an adult. Not one. Not ever. Children, animals and things " +
                      "only, and nobody believes a word you say.",
            hair: "#1d1712", longHair: true, skin: "#e5b791", shirt: "#b8617f",
            open: "The lady said she would come back and check on you. That was a long time ago.",
            locked: true,
            unlock: "Get a child forward to a safe zone.",
            unlockKey: "child_secured",
        },
        {
            id: "dale",
            name: "Dale Kowalczyk",
            age: 46,
            title: "Air marshal",
            blurb: "Seat 20A, aisle side, back to the bulkhead, eleven years of watching people " +
                   "and a sidearm that is about to be of no use whatsoever.",
            stats: { strength: 8, speed: 6, lungs: 6, nerve: 8, voice: 7 },
            perks: ["authority", "restrain", "deferred"],
            perkName: "Authority",
            perkText: "The badge ends any argument instantly, and you can physically restrain the " +
                      "passengers who are getting in everyone's way.",
            flawName: "Deferred to",
            flawText: "A cabin with somebody in charge in it stops organising itself. People " +
                      "wait to be told, and then wait to be told again, so the helpers you " +
                      "recruit bring almost nobody else in.",
            hair: "#2b2118", skin: "#d9a279", shirt: "#4f5a68",
            open: "You have been watching seat 14C for an hour. For the wrong reasons.",
            locked: true,
            unlock: "See the aisle blocked in three places at once.",
            unlockKey: "jammed",
        },

        // ------------------------------------------------------------------------ unlockable ---
        {
            id: "nils",
            name: "Nils Ottersen",
            age: 44,
            title: "The man in 21F",
            blurb: "He has asked eleven times, politely, for someone to sit down. He was right " +
                   "about the last four things he was certain about. He is not right about this.",
            stats: { strength: 7, speed: 6, lungs: 6, nerve: 9, voice: 8 },
            perks: ["denial", "respected"],
            perkName: "Respected",
            perkText: "The cabin already believes you. Passengers do what you ask on the first " +
                      "attempt, because you are the sort of man people listen to.",
            flawName: "Denial",
            flawText: "You do not believe there is a fire. Until you have looked at it with your " +
                      "own eyes, every action about the fire costs you double and half of them " +
                      "are not in your list at all.",
            hair: "#4a3220", skin: "#f2d0b4", shirt: "#2c5137",
            open: "There is no fire. There is a smell. There is a difference and you know it.",
            locked: true,
            unlock: "Finish a run with three souls secured or fewer.",
            unlockKey: "nils",
        },
        {
            id: "beverley",
            name: "Beverley Crane",
            age: 66,
            title: "Retired purser",
            blurb: "Thirty-eight years, four airlines, two evacuations and one thing in 1998 that " +
                   "she does not talk about. Travelling as a passenger for the first time since.",
            stats: { strength: 6, speed: 6, lungs: 8, nerve: 10, voice: 9 },
            perks: ["knows_kit", "flock", "chapter_and_verse", "reads_fire"],
            perkName: "Thirty-eight years",
            perkText: "You know the aeroplane, the kit, the procedure and the people. There is no " +
                      "action in this game that is closed to you.",
            flawName: "Retired",
            flawText: "You have no authority at all any more, and you are the only person on " +
                      "board who understands exactly how little time there is.",
            hair: "#dfe3e6", longHair: true, skin: "#c08a5e", shirt: "#c9c0aa",
            open: "You know where everything is. You know it will not be enough.",
            locked: true,
            unlock: "Secure twenty-two souls or more in a single run.",
            unlockKey: "beverley",
        },
    ];

    function byId(id) {
        return CHARACTERS.filter((c) => c.id === id)[0] || CHARACTERS[0];
    }

    /**
     * Everything derived from the five numbers, in one place so the tuning is visible. The outfit
     * moves the numbers before anything is derived from them, which is the whole of what an
     * outfit does.
     */
    function derive(ch, outfit) {
        const s = outfit && PRS.data.outfits
            ? PRS.data.outfits.apply(ch.stats, outfit)
            : ch.stats;
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
            carryCap: s.strength >= 10 ? 999 : (s.strength <= 2 ? 34 : 40 + s.strength * 9),
        };
    }

    /** The two you start with, and the reason the character screen is not a wall. */
    const STARTERS = ["kip", "miriam"];

    function isUnlocked(ch) {
        if (!ch.locked) return true;
        return PRS.medals ? PRS.medals.unlocked(ch.unlockKey) : false;
    }

    /** Unlocked first, then the ones still to earn, so the screen opens on what you can play. */
    function inPickOrder() {
        const open = CHARACTERS.filter(isUnlocked);
        const shut = CHARACTERS.filter((c) => !isUnlocked(c));
        return open.concat(shut);
    }

    PRS.data = PRS.data || {};
    PRS.data.characters = { CHARACTERS, STARTERS, byId, derive, isUnlocked, inPickOrder };
})(window);
