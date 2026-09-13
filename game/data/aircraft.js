// The fleet. An aeroplane is a grid, a list of landmarks down it, and who is on it.
//
// There was one aeroplane for a long time and its shape was written into `cabin.js` as
// constants, which was honest while there was one. This file is those constants lifted out and
// given a name, plus a second aeroplane that is not a smaller version of the first: it is a
// nineteen-seat turboprop with one seat either side of the aisle, one lavatory, one basin, and
// nobody on board whose job is any of this.
//
// What an aeroplane says about itself
// -----------------------------------
//   W, H              the grid. Nose at x=0, tail at x=W-1.
//   AISLE_Y           the row of the aisle. Seats above it and below it.
//   SEAT_LETTERS      by y-1, with null where the aisle is: ["A","B","C",null,"D","E","F"].
//   FWD_ROWS/AFT_ROWS which columns are seat rows and what the first row in each is called.
//   OVERWING_X        the clear column mid-cabin with a door in each wall.
//   FWD_/AFT_CROSS_X  the cross-aisles, which are where the main doors are. On a small
//                     aeroplane these are the same column as the galley, and that is allowed:
//                     the door is a hole in the wall and the galley is what is under it.
//   FWD_/AFT_GALLEY_X the service ends. The aft one has the basin in it, which matters more
//                     than anything else on this list.
//   LAV_LEFT_Y        the second lavatory, or null on an aeroplane that has one.
//   ORIGIN            the seat whose locker is on fire.
//   ceiling           metres, cabin floor to cabin ceiling. Smoke fills from the top down, so
//                     this is how long you have before the layer is at head height.
//   crewModel         "cabin" for an aeroplane with cabin crew, "flightdeck" for one without.
//   rosterKey         which roster in `passengers.js` is on board. Read late, because that file
//                     loads after this one.
//
// Adding a third aeroplane is this object and a roster. Nothing else in the game knows how many
// there are.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const K = PRS.k;

    // ------------------------------------------------------------------ Transnational 447 ---
    //
    // The aeroplane the game was written on, unchanged: a single-aisle narrowbody, twenty-three
    // rows of six, sixty souls and three cabin crew. Every number below was a `const` in
    // cabin.js and is the same number.
    //
    //   x=0   flight deck bulkhead, and the locked door at the aisle
    //   x=1   forward galley: steel, and the furthest floor in the aeroplane from the fire
    //   x=2   the forward cross-aisle, doors L1 and R1
    //   x=3..14   rows 1 to 12
    //   x=15  the overwing exit row, doors L3 and R3
    //   x=16..26  rows 13 to 23
    //   x=27  the aft cross-aisle, doors L2 and R2
    //   x=28  the aft galley and the two lavatories, and a sink, which matters
    //   x=29  the tail bulkhead
    const TN447 = {
        id: "tn447",
        name: K("Transnational 447"),
        type: K("Single-aisle narrowbody"),
        flightNo: "TN 447",
        tag: "TN447-",
        blurb: K("Sixty-one souls, twenty-three rows and three cabin crew. Fifteen minutes."),

        W: 30, H: 9, AISLE_Y: 4,
        SEAT_LETTERS: ["A", "B", "C", null, "D", "E", "F"],
        FWD_ROWS: { x0: 3, x1: 14, first: 1 },
        AFT_ROWS: { x0: 16, x1: 26, first: 13 },
        OVERWING_X: 15,
        FWD_CROSS_X: 2, AFT_CROSS_X: 27,
        FWD_GALLEY_X: 1, AFT_GALLEY_X: 28,
        LAV_LEFT_Y: 1, LAV_RIGHT_Y: 7,
        overrides: null,
        // Null means every door column has a door in both walls, which is what a narrowbody
        // has and what the game did before there was anything else.
        doors: null,

        // 14C: aft of the wing, aisle side, left bank of bins. The furthest point in the
        // aeroplane from both galleys, so every carry is long.
        ORIGIN: { row: 14, letter: "C" },

        ceiling: 2.2,
        crewModel: "cabin",
        rosterKey: "ROSTER",
        crewKey: "CREW",
        seconds: 900,
        cartRow: 11,
        defaultSeat: "9C",
        // The line the log opens on. Kept word for word as it was written, because it is a
        // translation key and every catalogue in the game already has it.
        // What is written down the side of each service end. On a narrowbody they are both
        // galleys; on a turboprop the forward one is a closet and the aft one is where the bags
        // go, and calling either of them a galley would be the picture telling a small lie.
        fwdGalleyWord: K("GALLEY"), aftGalleyWord: K("GALLEY"),
        opening: K("Transnational 447, thirty-one thousand feet, beginning the descent. " +
                   "Sixty-one souls. There is something burning in the locker above {seat} " +
                   "and you are the only person on this aeroplane who has noticed."),
    };

    // ------------------------------------------------------------------- Coastal Link 2231 ---
    //
    // A Beechcraft 1900D: pressurised twin turboprop, nineteen seats, one either side of the
    // aisle, and a cabin you can stand up in - just. Six foot even, floor to ceiling, against a
    // narrowbody's seven and a bit, and that foot is the whole difference: smoke fills from the
    // ceiling down and there is less ceiling to fill.
    //
    // What it has instead of the things it has not got:
    //   - No cabin crew. Two pilots, a locked door, and an interphone. Nobody is coming.
    //   - One lavatory, one basin. On the big aeroplane the basin is a choice between two. Here
    //     it is the only place in the aircraft to put the thing down, and it is at the back.
    //   - Ten rows, four of them aft of the wing. Every carry is short, which sounds like mercy
    //     and is not: the fire is short of everywhere too.
    //
    //   x=0   flight deck bulkhead, and the door at the aisle
    //   x=1   forward vestibule: the airstair door at L1, a closet opposite
    //   x=2..7    rows 1 to 6
    //   x=8   the overwing exit row, a door in each wall
    //   x=9..12   rows 7 to 10
    //   x=13  aft vestibule: the lavatory on the right, the baggage bay on the left, door R2
    //   x=14  the tail bulkhead
    //
    // Row 1 has no A seat: that corner is the closet by the airstair, which is why nineteen
    // people fit in what looks like twenty seats.
    const BE1900D = {
        id: "be1900d",
        name: K("Coastal Link 2231"),
        type: K("Beechcraft 1900D"),
        flightNo: "CL 2231",
        tag: "CL2231-",
        blurb: K("Nineteen seats, one lavatory, and no cabin crew. You are what this " +
                 "aeroplane has."),

        W: 15, H: 5, AISLE_Y: 2,
        SEAT_LETTERS: ["A", null, "C"],
        FWD_ROWS: { x0: 2, x1: 7, first: 1 },
        AFT_ROWS: { x0: 9, x1: 12, first: 7 },
        OVERWING_X: 8,
        // The vestibules are the cross-aisles. A door is a hole in the wall at that column and
        // the galley is what stands under it, which on an aeroplane this size is the same
        // column twice rather than two columns.
        FWD_CROSS_X: 1, AFT_CROSS_X: 13,
        FWD_GALLEY_X: 1, AFT_GALLEY_X: 13,
        // One lavatory. The other side of the aft vestibule is the baggage bay, which burns.
        LAV_LEFT_Y: null, LAV_RIGHT_Y: 3,
        // The closet forward left, in the corner where seat 1A would be.
        overrides: { "2,1": "galley" },
        // Three doors on a nineteen-seater, and no two of them on the same side: the airstair
        // forward left, the overwing emergency exit on the right, the aft door back left. Which
        // means there is no such thing as "the near door" here - every choice is a side as well
        // as an end, and the one in the middle is the one the fire is sitting next to.
        doors: { 1: ["L"], 8: ["R"], 13: ["L"] },

        // 7C: one row aft of the overwing exit, aisle side, the same reasoning as 14C on the
        // big aeroplane and four tiles from the only basin on board.
        ORIGIN: { row: 7, letter: "C" },

        ceiling: 1.8,
        crewModel: "flightdeck",
        rosterKey: "ROSTER_BE19",
        crewKey: "CREW_BE19",
        // Ten minutes, not fifteen. Not a difficulty knob: the same fire in a box this size
        // fills it half as far into the flight, and a regional sector is short anyway. Flown at
        // fifteen the aeroplane is not a game - doing nothing saves one person in nineteen and
        // doing everything right saves fourteen. At ten the bots land in the same order they do
        // on the narrowbody, which is the shape this game is supposed to have.
        seconds: 600,
        // No trolley on a nineteen-seater. Nothing is blocking the aisle but people.
        cartRow: null,
        defaultSeat: "9C",
        fwdGalleyWord: K("CLOSET"), aftGalleyWord: K("BAGS"),
        opening: K("Coastal Link 2231, eleven thousand feet, island to mainland, nineteen " +
                   "souls and no cabin crew. There is something burning in the locker above " +
                   "{seat}. The flight deck is a locked door and everyone else on board is " +
                   "older than you or asleep."),
    };

    const ALL = [TN447, BE1900D];
    const BY_ID = {};
    for (const a of ALL) BY_ID[a.id] = a;

    const DEFAULT = TN447.id;

    function byId(id) { return BY_ID[id] || BY_ID[DEFAULT]; }

    /** Every aircraft id, sorted, for the share code's stamp. */
    function ids() { return ALL.map((a) => a.id).sort(); }

    /** The tags a share code can start with, longest first so a prefix match is unambiguous. */
    function tags() { return ALL.map((a) => a.tag).sort((a, b) => b.length - a.length); }

    PRS.data = PRS.data || {};
    PRS.data.aircraft = { ALL, DEFAULT, byId, ids, tags, TN447, BE1900D };
})(window);
