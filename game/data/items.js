// Everything you can hold. Sixteen things, and every one of them does something that helps.
//
// Nine of them can be packed. The bag is three slots; each character boards with their own three
// (see `bag` and `kit` in characters.js), and any slot that is not part of who they are can be
// swapped for anything in the pool. The rest are in the aeroplane: two in the galley drawers,
// two in the crew's own kit, and seven in other passengers' laps, which means the way you get
// equipped in flight is by talking to people, and that is the same conversation that turns them
// into helpers.
//
// Fields
//   sprite    "cabin:name", a sprite in game/art/cabin-sprites.js
//   uses      charges; null for something that does not run out
//   agent     the entry in fire.AGENTS this thing puts on a fire, if any
//   tags      what actions look for: the decks ask for tags, never for item ids, so a new item is
//             playable the moment it is listed here
//   refill    where its charges come back from, if anywhere
//   pool      true if it can be packed before boarding
//   where     pax | galley | crew - where it is found in the aeroplane, if it is
//   note      the one line the log prints when you find it, and the menu prints when you pack it
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    const ITEMS = [
        // -------------------------------------------------------------- things you can pack ---
        { id: "water_big", name: "Bottle of water", pool: true,
          sprite: "cabin:water_bottle", uses: 3, agent: "water",
          tags: ["water", "douse", "drink", "refillable"], refill: "tap",
          note: "Three good pours. The lavatory tap fills it again in nine seconds." },

        { id: "phone", name: "Phone", pool: true, sprite: "cabin:phone",
          uses: null, tags: ["phone", "evidence"],
          note: "Photograph the fire and people believe you. Show them and they believe you faster." },

        { id: "blanket", name: "Travel blanket", pool: true, sprite: "cabin:blanket",
          uses: null, agent: "smother", tags: ["cloth", "smother", "wettable", "cover"],
          note: "Never runs out. Soak it in a lavatory and it becomes the second best thing here." },

        { id: "wet_towel", name: "Damp travel towel", pool: true, where: "pax",
          sprite: "cabin:wet_towel", uses: 4, agent: "wetcloth",
          tags: ["cloth", "douse", "mask", "refillable"], refill: "tap",
          note: "Smothers without spreading, and tied over a face it buys somebody a minute." },

        { id: "hood", name: "Smoke hood", pool: true, where: "pax",
          sprite: "cabin:smoke_hood", uses: 1, tags: ["hood", "smoke", "self"],
          note: "Fifteen minutes of not breathing smoke. Fifteen minutes is the whole game." },

        { id: "goggles", name: "Swimming goggles", pool: true, sprite: "cabin:goggles",
          uses: null, tags: ["eyes", "smoke", "self"],
          note: "Eyes open in smoke that shuts everyone else's: it does not slow you, and it " +
                "frightens you less." },

        { id: "multitool", name: "Multi-tool that should not have got through security",
          pool: true, where: "pax", sprite: "cabin:multitool", uses: null,
          tags: ["tool", "cut", "pry", "belt"],
          note: "Cuts a seatbelt in two seconds instead of unbuckling it in six, and opens the " +
                "oxygen mask panels." },

        { id: "first_aid", name: "First aid kit", pool: true, where: "galley",
          sprite: "cabin:first_aid", uses: 4, tags: ["medical", "burn", "treat"],
          note: "Burn gel is the difference between a passenger who walks and one you carry." },

        { id: "strap", name: "Luggage strap", pool: true, sprite: "cabin:strap",
          uses: null, tags: ["strap", "drag", "tie"],
          note: "Under the arms and buckled at the back, dragging somebody has a handle: half " +
                "again as fast, and it works on people you cannot lift." },

        // ------------------------------------------------------- in other people's laps ---
        { id: "gloves", name: "Welding gloves", where: "pax", sprite: "cabin:fire_gloves",
          uses: null, tags: ["gloves", "heat", "grip"],
          note: "You can touch things that are on fire. This turns out to be most things." },

        { id: "tape", name: "Roll of duct tape", where: "pax", sprite: "cabin:duct_tape",
          uses: 6, tags: ["tape", "seal", "tie", "pry"],
          note: "Seals the bin shut, and seals the vents in a row." },

        { id: "inhaler", name: "Inhaler", where: "pax", sprite: "cabin:inhaler",
          uses: 3, tags: ["medical", "lungs", "self", "treat"],
          note: "Puts a set of lungs back in the game. Yours, or somebody who has stopped coughing." },

        { id: "hivis", name: "Hi-vis vest", where: "pax", sprite: "cabin:hivis",
          uses: null, tags: ["authority", "wear"],
          note: "People obey a hi-vis vest. People have always obeyed a hi-vis vest." },

        // ------------------------------------------------------------- in the galley drawers ---
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

    /** The bag is three things. That is the cabin baggage allowance, still being enforced. */
    const SLOTS = 3;

    function byId(id) {
        for (const item of ITEMS) if (item.id === id) return item;
        return null;
    }

    /** The nine the bag can hold, in the order they are listed above. */
    function pool() {
        return ITEMS.filter((i) => i.pool);
    }

    PRS.data = PRS.data || {};
    PRS.data.items = { ITEMS, SLOTS, byId, pool };
})(window);
