// Nine people who could be in seat 9C. Two are free; the rest unlock as the log book fills.
//
// Five numbers each, one to ten, and every one of them is a multiplier on something the player
// feels within a minute:
//
//   strength  how long a carry takes, who can be carried at all, and at ten, two at once
//   speed     the cost of every step and most actions
//   lungs     how fast smoke fills you up
//   nerve     how fast your own panic rises
//   voice     whether anybody does what you say
//
// There are no perks. What a character can do is what the numbers say, plus what is on them when
// they board and where they are sitting, and all three are data the rest of the game already
// understands. The retired fire officer is the slowest person in the cast and boards with gloves
// and tape; the eight-year-old cannot lift an adult and is unbelievable, and is fast and low.
//
//   kit     the things that are part of who they are, and stay in the bag whatever you repack
//   bag     the three things on them when they board, kit included, until you repack it
//   seat    where you start. The row decides how far the fire and the two galleys are.
//   unlock  the medal that turns the card over, and the sentence the locked card prints. The
//           conditions are chosen so that earning each one means playing a different way.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    const CHARACTERS = [
        {
            id: "ansel", name: "Dr Priya Ansel", short: "Priya", age: 44,
            title: "Veterinary surgeon",
            blurb: "Small animals, mostly. Airways are airways, oxygen is oxygen, and she has " +
                   "resuscitated a great many things that were not people.",
            stats: { strength: 5, speed: 6, lungs: 6, nerve: 8, voice: 8 },
            lean: "Talks people out of their seats, and treats the ones who are hurt. Cannot " +
                  "lift the heavy ones.",
            kit: ["first_aid"], bag: ["water_big", "phone", "first_aid"], seat: "9C",
            unlock: null,
            hair: "#1d1712", longHair: true, skin: "#c08a5e", shirt: "#3f7d8a",
            open: "You have already worked out who on this aeroplane is going to die first.",
        },
        {
            id: "gordy", name: "Gordy Mach", short: "Gordy", age: 38,
            title: "Competitive strongman",
            blurb: "Fourth in Europe, twice. He can pick up two adults at once, and he is about " +
                   "to find out that this is the least of it.",
            stats: { strength: 10, speed: 5, lungs: 4, nerve: 6, voice: 5 },
            lean: "Carries two at a time, and nobody is too heavy. Nobody listens to him.",
            kit: [], bag: ["water_big", "phone", "blanket"], seat: "9C", unlock: null,
            hair: "#4a3220", skin: "#e5b791", shirt: "#8a4526",
            open: "Everything on this aeroplane is lighter than your opener.",
        },
        {
            id: "volk", name: "Deidre Volk", short: "Deidre", age: 71,
            title: "Retired station officer",
            blurb: "Thirty-one years in the fire service, eleven of them on the aerodrome crew. " +
                   "She has done this before, on the ground, with a hose, with a team, and with " +
                   "her knees.",
            stats: { strength: 6, speed: 3, lungs: 9, nerve: 10, voice: 6 },
            lean: "Boards with gloves and tape and lungs that last. The slowest person in the " +
                  "cast.",
            kit: ["gloves", "tape"], bag: ["water_big", "gloves", "tape"], seat: "9C",
            unlock: { medal: "seen_it",
                      text: "Open the overhead locker and look at what is actually in it." },
            hair: "#dfe3e6", skin: "#e5b791", shirt: "#4f5a68",
            open: "You have smelled this before. Nobody else on this aeroplane has.",
        },
        {
            id: "miriam", name: "Sister Miriam-Claire", short: "Miriam", age: 62,
            title: "Sister of the Order of St Brigid",
            blurb: "Forty years of getting people to do things they do not want to do, in a " +
                   "voice that has never once been raised.",
            stats: { strength: 4, speed: 4, lungs: 6, nerve: 10, voice: 10 },
            lean: "Voice ten. Cannot lift most adults. Everything she achieves, she achieves " +
                  "through other people.",
            kit: [], bag: ["water_big", "phone", "wet_towel"], seat: "9C",
            unlock: { medal: "four_helpers", text: "Recruit four helpers in one flight." },
            hair: "#9aa0a6", longHair: true, skin: "#d9a279", shirt: "#232630",
            open: "You have buried more people than anyone else on board. It has not helped.",
        },
        {
            id: "kip", name: "Kip Halloran", short: "Kip", age: 19,
            title: "Energy drink athlete",
            blurb: "Four hundred thousand followers, a sponsorship with a taurine company, and " +
                   "the fastest hands in row 9.",
            stats: { strength: 4, speed: 10, lungs: 7, nerve: 4, voice: 5 },
            lean: "Speed ten: every step and most things cost him less. Frightens easily and " +
                  "cannot lift the heavy ones.",
            kit: [], bag: ["water_big", "phone", "wet_towel"], seat: "9C",
            unlock: { medal: "five_carry",
                      text: "Carry five people to a galley yourself, in one flight." },
            hair: "#d9b16a", skin: "#f2d0b4", shirt: "#2f3f7a",
            open: "This is the single greatest thing that has ever happened to your channel.",
        },
        {
            id: "rusk", name: "Captain Nell Rusk", short: "Nell", age: 58,
            title: "Deadheading captain",
            blurb: "Type rated on this airframe, in row 22, in a jumper, going home. It is not " +
                   "her aeroplane. She is about to make it her aeroplane.",
            stats: { strength: 5, speed: 5, lungs: 7, nerve: 9, voice: 8 },
            lean: "Starts in row 22: two rows from the aft galley, eight from the fire, and " +
                  "twenty from the front.",
            kit: [], bag: ["water_big", "phone", "blanket"], seat: "22B",
            unlock: { medal: "declared",
                      text: "Get the flight deck to declare an emergency inside five minutes." },
            hair: "#9aa0a6", skin: "#e5b791", shirt: "#1c2130",
            open: "You have flown this approach nine hundred times. Never from row 22.",
        },
        {
            id: "dale", name: "Dale Kowalczyk", short: "Dale", age: 46,
            title: "Air marshal",
            blurb: "Seat 20A, back to the bulkhead, eleven years of watching people, and a " +
                   "sidearm that is about to be of no use whatsoever.",
            stats: { strength: 8, speed: 6, lungs: 6, nerve: 8, voice: 7 },
            lean: "Strong, calm, and wearing the vest. Starts in row 20, six from the fire.",
            kit: ["hivis"], bag: ["water_big", "phone", "hivis"], seat: "20A",
            unlock: { medal: "jammed", text: "Be told to sit down by three different passengers." },
            hair: "#2b2118", skin: "#d9a279", shirt: "#4f5a68",
            open: "You have been watching seat 14C for an hour. For the wrong reasons.",
        },
        {
            id: "yuki", name: "Yuki Tanaka-Brandt", short: "Yuki", age: 8,
            title: "Unaccompanied minor",
            blurb: "A lanyard, a plastic wallet, and a flight attendant who was supposed to be " +
                   "checking on her every twenty minutes and has not, for fifty.",
            stats: { strength: 1, speed: 9, lungs: 8, nerve: 5, voice: 3 },
            lean: "Eight years old. Fast and low, cannot lift an adult, and nobody believes a " +
                  "word she says.",
            kit: [], bag: ["phone", "goggles", "blanket"], seat: "3C",
            unlock: { medal: "child_secured",
                      text: "Get a child out of the rows and down on the floor by a door." },
            hair: "#1d1712", longHair: true, skin: "#e5b791", shirt: "#b8617f",
            open: "The lady said she would come back and check on you. That was a long time ago.",
        },
        {
            id: "beverley", name: "Beverley Crane", short: "Beverley", age: 66,
            title: "Retired purser",
            blurb: "Thirty-eight years, four airlines, two evacuations and one thing in 1998 " +
                   "that she does not talk about. Travelling as a passenger for the first time " +
                   "since.",
            stats: { strength: 6, speed: 6, lungs: 8, nerve: 10, voice: 9 },
            lean: "Knows the aeroplane, the kit and how little time there is. Boards with a " +
                  "hood and the tool that opens the mask panels, in row 1.",
            kit: ["hood", "multitool"], bag: ["hood", "multitool", "water_big"], seat: "1B",
            unlock: { medal: "twentytwo_souls",
                      text: "Get fifty-two people off alive in one flight." },
            hair: "#dfe3e6", longHair: true, skin: "#c08a5e", shirt: "#c9c0aa",
            open: "You know where everything is. You know it will not be enough.",
        },
    ];

    function byId(id) {
        return CHARACTERS.filter((c) => c.id === id)[0] || CHARACTERS[0];
    }

    /** The character's five numbers with the outfit added, and everything derived from them. */
    function derive(ch, outfit) {
        const s = outfit && PRS.data.outfits ? PRS.data.outfits.apply(ch.stats, outfit) : ch.stats;
        return {
            stats: s,
            // A step in the aisle for a 6-speed character is one second flat.
            // Ten is a quarter faster than that and three a fifth slower; speed was worth more
            // than every other number put together until it was pulled in at both ends.
            moveMul: 1.39 - s.speed * 0.065,
            // A carry for a 6-strength character is about a second a kilo over twelve rows.
            carryMul: 1.75 - s.strength * 0.115,
            actionMul: 1.18 - s.speed * 0.03,
            smokeMul: 1.60 - s.lungs * 0.11,
            panicMul: 1.70 - s.nerve * 0.13,
            voiceMul: 0.40 + s.voice * 0.10,
            maxCarry: s.strength >= 10 ? 2 : 1,
            carryCap: s.strength >= 10 ? 999 : 40 + s.strength * 9,
        };
    }

    PRS.data = PRS.data || {};
    PRS.data.characters = { CHARACTERS, byId, derive };
})(window);
