// Everything you can hold. Fourteen things, and every one of them does something that helps.
//
// Three are on you when you board. The rest are in the aeroplane: two in the galley drawers, two
// in the crew's own kit, and seven in other passengers' laps, which means the way you get equipped
// is by talking to people, and that is the same conversation that turns them into helpers.
//
// Fields
//   sprite    "cabin:name", a sprite in game/art/cabin-sprites.js
//   uses      charges; null for something that does not run out
//   agent     the entry in fire.AGENTS this thing puts on a fire, if any
//   tags      what actions look for: the decks ask for tags, never for item ids, so a new item is
//             playable the moment it is listed here
//   refill    where its charges come back from, if anywhere
//   where     bag | pax | galley | crew - where it starts, which passengers.js and the decks honour
//   note      the one line the log prints when you find it
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    const ITEMS = [
        // ------------------------------------------------------------------------ on you ---
        { id: "water_big", name: "1.5 litre bottle of still water", where: "bag",
          sprite: "cabin:water_bottle", uses: 3, agent: "water",
          tags: ["water", "douse", "drink", "refillable"], refill: "tap",
          note: "Three good pours. The lavatory tap fills it again in nine seconds." },

        { id: "phone", name: "Phone", where: "bag", sprite: "cabin:phone",
          uses: null, tags: ["phone", "evidence"],
          note: "Photograph the fire and people believe you. Show them and they believe you faster." },

        { id: "blanket", name: "Travel blanket", where: "bag", sprite: "cabin:blanket",
          uses: null, agent: "smother", tags: ["cloth", "smother", "wettable", "cover"],
          note: "Never runs out. Soak it in a lavatory and it becomes the second best thing here." },

        // ------------------------------------------------------- in other people's laps ---
        { id: "wet_towel", name: "Damp travel towel", where: "pax", sprite: "cabin:wet_towel",
          uses: 4, agent: "wetcloth", tags: ["cloth", "douse", "mask", "refillable"], refill: "tap",
          note: "Smothers without spreading, and tied over a face it buys somebody a minute." },

        { id: "gloves", name: "Welding gloves", where: "pax", sprite: "cabin:fire_gloves",
          uses: null, tags: ["gloves", "heat", "grip"],
          note: "You can touch things that are on fire. This turns out to be most things." },

        { id: "hood", name: "Escape smoke hood", where: "pax", sprite: "cabin:smoke_hood",
          uses: 1, tags: ["hood", "smoke", "self"],
          note: "Fifteen minutes of not breathing smoke. Fifteen minutes is the whole game." },

        { id: "multitool", name: "Multi-tool that should not have got through security",
          where: "pax", sprite: "cabin:multitool", uses: null, tags: ["tool", "cut", "pry", "belt"],
          note: "Cuts a seatbelt in two seconds instead of unbuckling it in six, and opens the " +
                "oxygen mask panels." },

        { id: "tape", name: "Roll of duct tape", where: "pax", sprite: "cabin:duct_tape",
          uses: 6, tags: ["tape", "seal", "tie", "pry"],
          note: "Seals the bin shut, and seals the vents in a row." },

        { id: "inhaler", name: "Salbutamol inhaler", where: "pax", sprite: "cabin:inhaler",
          uses: 3, tags: ["medical", "lungs", "self", "treat"],
          note: "Puts a set of lungs back in the game. Yours, or somebody who has stopped coughing." },

        { id: "hivis", name: "Hi-vis vest", where: "pax", sprite: "cabin:hivis",
          uses: null, tags: ["authority", "wear"],
          note: "People obey a hi-vis vest. People have always obeyed a hi-vis vest." },

        // ------------------------------------------------------------- in the galley drawers ---
        { id: "first_aid", name: "Compact first aid kit", where: "galley", sprite: "cabin:first_aid",
          uses: 4, tags: ["medical", "burn", "treat"],
          note: "Burn gel is the difference between a passenger who walks and one you carry." },

        { id: "binbag", name: "Roll of bin liners", where: "galley", sprite: "cabin:binbag",
          uses: 4, tags: ["bag", "water", "carry", "refillable"], refill: "tap",
          note: "The biggest volume of water you can move in one trip. Fiddly. Worth it." },

        // ------------------------------------------------------------------- the crew's kit ---
        { id: "halon_bottle", name: "BCF halon extinguisher", where: "crew",
          sprite: "cabin:extinguisher", uses: 1, agent: "halon", tags: ["extinguisher", "halon"],
          note: "One discharge. It works on the flame, which is not the fire." },

        { id: "water_ext", name: "Water extinguisher", where: "crew",
          sprite: "cabin:extinguisher_water", uses: 2, agent: "water",
          tags: ["extinguisher", "water"],
          note: "Nine litres under pressure, two discharges, and it weighs as much as a child." },
    ];

    /** What is on you when you board. Everything else is in the aeroplane. */
    const START_BAG = ITEMS.filter((i) => i.where === "bag").map((i) => i.id);

    function byId(id) {
        for (const item of ITEMS) if (item.id === id) return item;
        return null;
    }

    PRS.data = PRS.data || {};
    PRS.data.items = { ITEMS, START_BAG, byId };
})(window);
