// The aeroplane. A grid, nose at x=0 and tail at x=29, nine cells deep: the left wall, seats
// A B C, the aisle, seats D E F, and the right wall. Everything else in the game addresses the
// cabin through here, so the layout can change without the fire or the passengers noticing.
//
//   x=0   flight deck bulkhead, and the locked door at the aisle
//   x=1   forward galley. A safe zone, because it is steel and it is furthest from the fire.
//   x=2   the forward cross-aisle, doors L1 and R1. Safe.
//   x=3..14   rows 1 to 12
//   x=15  the overwing exit row, doors L3 and R3. Counts as a zone, and is not a galley: it is
//         two rows from the locker that is burning, and it is on the list because without it
//         the middle of this aeroplane is unplayable rather than because it is a nice place.
//   x=16..26  rows 13 to 23
//   x=27  the aft cross-aisle, doors L2 and R2. Safe.
//   x=28  the aft galley and the two lavatories. Safe, and it has a sink, which matters.
//   x=29  the tail bulkhead
//
// Fuel is per-tile and it is what the fire eats: a seat is upholstery and foam and burns for a
// long time, an aisle is carpet over an aluminium floor and barely burns at all, and a galley is
// full of paper cups and spirit miniatures and burns like a birthday.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};

    const W = 30;
    const H = 9;

    const SEAT_LETTERS = ["A", "B", "C", null, "D", "E", "F"];  // by y-1, aisle is null
    const AISLE_Y = 4;
    const WALL_TOP = 0;
    const WALL_BOTTOM = 8;

    // Tile kinds. `walk` is the base cost in seconds for an average person to cross the tile.
    const KIND = {
        wall:    { walk: Infinity, fuel: 0.05, solid: true,  label: "hull" },
        seat:    { walk: 3.4,      fuel: 1.00, solid: false, label: "seat" },
        aisle:   { walk: 1.0,      fuel: 0.18, solid: false, label: "aisle" },
        cross:   { walk: 1.0,      fuel: 0.14, solid: false, label: "cross-aisle" },
        galley:  { walk: 1.6,      fuel: 0.75, solid: false, label: "galley" },
        lav:     { walk: 2.2,      fuel: 0.55, solid: false, label: "lavatory" },
        exit:    { walk: 1.4,      fuel: 0.10, solid: false, label: "exit door" },
        cockpit: { walk: Infinity, fuel: 0.10, solid: true,  label: "flight deck door" },
        bulkhead:{ walk: Infinity, fuel: 0.20, solid: true,  label: "bulkhead" },
    };

    // Where the rows are. Row 13 is the first one aft of the wing, which is why 14C is where it
    // is: one row back from the overwing exit, in the bin, over the aisle seat.
    const FWD_ROWS = { x0: 3, x1: 14, first: 1 };    // rows 1..12
    const AFT_ROWS = { x0: 16, x1: 26, first: 13 };  // rows 13..23
    const OVERWING_X = 15;
    const FWD_CROSS_X = 2;
    const AFT_CROSS_X = 27;
    const FWD_GALLEY_X = 1;
    const AFT_GALLEY_X = 28;

    function rowAt(x) {
        if (x >= FWD_ROWS.x0 && x <= FWD_ROWS.x1) return FWD_ROWS.first + (x - FWD_ROWS.x0);
        if (x >= AFT_ROWS.x0 && x <= AFT_ROWS.x1) return AFT_ROWS.first + (x - AFT_ROWS.x0);
        return null;
    }

    function xOfRow(row) {
        if (row >= FWD_ROWS.first && row <= FWD_ROWS.first + (FWD_ROWS.x1 - FWD_ROWS.x0)) {
            return FWD_ROWS.x0 + (row - FWD_ROWS.first);
        }
        if (row >= AFT_ROWS.first && row <= AFT_ROWS.first + (AFT_ROWS.x1 - AFT_ROWS.x0)) {
            return AFT_ROWS.x0 + (row - AFT_ROWS.first);
        }
        return null;
    }

    function seatLetter(y) {
        return SEAT_LETTERS[y - 1] || null;
    }

    function yOfLetter(letter) {
        const i = SEAT_LETTERS.indexOf(letter);
        return i < 0 ? null : i + 1;
    }

    /** "14C" for a tile that is a seat, otherwise a name for the place. */
    function seatName(x, y) {
        const row = rowAt(x);
        const letter = seatLetter(y);
        if (row && letter) return row + letter;
        return null;
    }

    function kindAt(x, y) {
        if (x < 0 || y < 0 || x >= W || y >= H) return "wall";
        if (y === WALL_TOP || y === WALL_BOTTOM) {
            // The doors are holes in the wall, at the three cross-aisles.
            if (x === FWD_CROSS_X || x === OVERWING_X || x === AFT_CROSS_X) return "exit";
            return "wall";
        }
        if (x === 0) return y === AISLE_Y ? "cockpit" : "bulkhead";
        if (x === W - 1) return "bulkhead";
        if (x === FWD_GALLEY_X) return y === AISLE_Y ? "aisle" : "galley";
        if (x === AFT_GALLEY_X) {
            if (y === AISLE_Y) return "aisle";
            return (y === 1 || y === 7) ? "lav" : "galley";
        }
        if (x === FWD_CROSS_X || x === OVERWING_X || x === AFT_CROSS_X) {
            return y === AISLE_Y ? "aisle" : "cross";
        }
        if (y === AISLE_Y) return "aisle";
        return rowAt(x) === null ? "cross" : "seat";
    }

    /** The name a human would use for where you are standing. The HUD says this constantly. */
    function placeName(x, y) {
        const seat = seatName(x, y);
        if (seat) return "seat " + seat;
        const kind = kindAt(x, y);
        if (kind === "cockpit") return "the flight deck door";
        if (kind === "exit") {
            const side = y === WALL_TOP ? "L" : "R";
            const n = x === FWD_CROSS_X ? 1 : x === OVERWING_X ? 3 : 2;
            return "door " + side + n;
        }
        if (x === FWD_GALLEY_X) return "the forward galley";
        if (x === AFT_GALLEY_X) return kind === "lav" ? "the aft lavatory" : "the aft galley";
        if (kind === "aisle") {
            const row = rowAt(x);
            if (row) return "the aisle at row " + row;
            if (x === FWD_CROSS_X) return "the forward cross-aisle";
            if (x === OVERWING_X) return "the overwing exit row";
            if (x === AFT_CROSS_X) return "the aft cross-aisle";
            return "the aisle";
        }
        if (kind === "cross") {
            if (x === FWD_CROSS_X) return "the forward cross-aisle";
            if (x === OVERWING_X) return "the overwing exit row";
            if (x === AFT_CROSS_X) return "the aft cross-aisle";
        }
        return "the cabin";
    }

    // The zones. A passenger left in one at touchdown is out of the seats, low, next to a door
    // and - at either end - next to a member of crew, which is as good as this day is going to
    // get for them. The middle one is an exit row over the wing rather than a galley, so how
    // good it is depends entirely on what is in the air there by the time the gear comes down;
    // scoring.js charges for that, and the cabin shows it going amber and then red.
    function isSafeZone(x, y) {
        if (kindAt(x, y) === "wall" || kindAt(x, y) === "bulkhead") return false;
        return x <= FWD_CROSS_X + 0 || x >= AFT_CROSS_X || x === OVERWING_X;
    }

    function safeZoneName(x) {
        if (x <= FWD_CROSS_X) return "the forward galley";
        if (x === OVERWING_X) return "the overwing exits";
        return "the aft galley";
    }

    function solid(x, y) {
        return KIND[kindAt(x, y)].solid;
    }

    function inBounds(x, y) {
        return x >= 0 && y >= 0 && x < W && y < H;
    }

    /** Base fuel load of a tile before anything has burned. Feeds fire.js. */
    function baseFuel(x, y) {
        return KIND[kindAt(x, y)].fuel;
    }

    /** Base seconds to walk into this tile, before stats, smoke, crowd and cargo. */
    function baseWalk(x, y) {
        return KIND[kindAt(x, y)].walk;
    }

    /** Every tile that has a seat in it, front to back and window to window. */
    function eachSeat(fn) {
        for (let x = 0; x < W; x++) {
            const row = rowAt(x);
            if (row === null) continue;
            for (let y = 1; y <= 7; y++) {
                if (y === AISLE_Y) continue;
                fn(x, y, row, seatLetter(y));
            }
        }
    }

    /** Four-neighbourhood, in bounds. Fire and smoke both walk this. */
    function neighbours(x, y) {
        const out = [];
        if (x > 0) out.push([x - 1, y]);
        if (x < W - 1) out.push([x + 1, y]);
        if (y > 0) out.push([x, y - 1]);
        if (y < H - 1) out.push([x, y + 1]);
        return out;
    }

    const idx = (x, y) => y * W + x;
    const xOf = (i) => i % W;
    const yOf = (i) => Math.floor(i / W);

    // The overhead bins run the length of the cabin over rows A-C and D-F. A bin belongs to a row
    // and a side, and it is a bin fire that started all this.
    function binOf(x, y) {
        const row = rowAt(x);
        if (row === null || y === AISLE_Y || y === 0 || y === 8) return null;
        return { row: row, x: x, side: y < AISLE_Y ? "left" : "right" };
    }

    function binKey(x, side) {
        return x + ":" + side;
    }

    // The seat of the fire. 14C: aft of the wing, aisle side, left bank of bins. Chosen because
    // it is the furthest point in the aeroplane from both galleys, so every carry is long.
    const ORIGIN = { row: 14, letter: "C" };

    function originTile() {
        return { x: xOfRow(ORIGIN.row), y: yOfLetter(ORIGIN.letter) };
    }

    PRS.cabin = {
        W, H, AISLE_Y, WALL_TOP, WALL_BOTTOM, KIND, SEAT_LETTERS,
        FWD_ROWS, AFT_ROWS, OVERWING_X, FWD_CROSS_X, AFT_CROSS_X, FWD_GALLEY_X, AFT_GALLEY_X,
        ORIGIN, originTile,
        rowAt, xOfRow, seatLetter, yOfLetter, seatName, kindAt, placeName,
        isSafeZone, safeZoneName, solid, inBounds, baseFuel, baseWalk, eachSeat, neighbours,
        idx, xOf, yOf, binOf, binKey,
    };
})(window);
