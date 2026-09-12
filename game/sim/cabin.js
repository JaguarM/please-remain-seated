// The aeroplane. A grid, nose at x=0 and tail at x=29, nine cells deep: the left wall, seats
// A B C, the aisle, seats D E F, and the right wall. Everything else in the game addresses the
// cabin through here, so the layout can change without the fire or the passengers noticing.
//
//   x=0   flight deck bulkhead, and the locked door at the aisle
//   x=1   forward galley: steel, and the furthest floor in the aeroplane from the fire.
//   x=2   the forward cross-aisle, doors L1 and R1.
//   x=3..14   rows 1 to 12
//   x=15  the overwing exit row, doors L3 and R3: a clear column of floor two rows from the
//         locker that is burning.
//   x=16..26  rows 13 to 23
//   x=27  the aft cross-aisle, doors L2 and R2.
//   x=28  the aft galley and the two lavatories, and a sink, which matters.
//
// None of it is safe. Some of it has better air in it than the rest, for a while.
//   x=29  the tail bulkhead
//
// Fuel is per-tile and it is what the fire eats: a seat is upholstery and foam and burns for a
// long time, an aisle is carpet over an aluminium floor and barely burns at all, and a galley is
// full of paper cups and spirit miniatures and burns like a birthday.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, X = PRS.tx, K = PRS.k;

    const W = 30;
    const H = 9;

    const SEAT_LETTERS = ["A", "B", "C", null, "D", "E", "F"];  // by y-1, aisle is null
    const AISLE_Y = 4;
    const WALL_TOP = 0;
    const WALL_BOTTOM = 8;

    // Tile kinds. `walk` is the base cost in seconds for an average person to cross the tile.
    const KIND = {
        wall:    { walk: Infinity, fuel: 0.05, solid: true,  label: K("hull") },
        seat:    { walk: 3.4,      fuel: 1.00, solid: false, label: K("seat") },
        aisle:   { walk: 1.0,      fuel: 0.18, solid: false, label: K("aisle") },
        cross:   { walk: 1.0,      fuel: 0.14, solid: false, label: K("cross-aisle") },
        galley:  { walk: 1.6,      fuel: 0.75, solid: false, label: K("galley") },
        lav:     { walk: 2.2,      fuel: 0.55, solid: false, label: K("lavatory") },
        exit:    { walk: 1.4,      fuel: 0.10, solid: false, label: K("exit door") },
        cockpit: { walk: Infinity, fuel: 0.10, solid: true,  label: K("flight deck door") },
        bulkhead:{ walk: Infinity, fuel: 0.20, solid: true,  label: K("bulkhead") },
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

    /**
     * Where a seat is in its bank of three, as it sits on the screen: "top", "mid" or "bot".
     * The art is one bank cut into three tiles that join up, so the renderer needs this and
     * not the letter: the top seat of the left bank is by the window and the top seat of the
     * right bank is by the aisle, and the drawing is the same. Null for anything not a seat row.
     */
    function seatPos(y) {
        if (y === AISLE_Y || y <= WALL_TOP || y >= WALL_BOTTOM) return null;
        return ["top", "mid", "bot"][y < AISLE_Y ? y - 1 : y - AISLE_Y - 1];
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

    /**
     * The name a human would use for a place on this aeroplane. The HUD says this constantly.
     *
     * `towards` asks for the form that follows "go to" rather than the one that follows "you
     * are at". In English they are the same words and the second argument changes nothing; in
     * German they are not, because standing somewhere takes the dative and going there takes
     * the accusative - "im Gang" against "in den Gang" - and a sentence built out of the wrong
     * one reads like a translation. So both forms are keys, told apart by a note, and a
     * language that does not need the distinction simply writes the same line twice.
     */
    function placeName(x, y, towards) {
        return towards ? placeTo(x, y) : placeAt(x, y);
    }

    /** Which of the nine places this tile is, as something the two namers can switch on. */
    function placeKind(x, y) {
        const seat = seatName(x, y);
        if (seat) return { what: "seat", seat: seat };
        const kind = kindAt(x, y);
        if (kind === "cockpit") return { what: "cockpit" };
        if (kind === "exit") {
            // L1, R2: the door numbering is the aircraft's, and it is the same in every language.
            const side = y === WALL_TOP ? "L" : "R";
            const n = x === FWD_CROSS_X ? 1 : x === OVERWING_X ? 3 : 2;
            return { what: "door", door: side + n };
        }
        if (x === FWD_GALLEY_X) return { what: "fwdGalley" };
        if (x === AFT_GALLEY_X) return { what: kind === "lav" ? "aftLav" : "aftGalley" };
        if (kind === "aisle") {
            const row = rowAt(x);
            if (row) return { what: "row", row: row };
            if (x === FWD_CROSS_X) return { what: "fwdCross" };
            if (x === OVERWING_X) return { what: "overwing" };
            if (x === AFT_CROSS_X) return { what: "aftCross" };
            return { what: "aisle" };
        }
        if (kind === "cross") {
            if (x === FWD_CROSS_X) return { what: "fwdCross" };
            if (x === OVERWING_X) return { what: "overwing" };
            if (x === AFT_CROSS_X) return { what: "aftCross" };
        }
        return { what: "cabin" };
    }

    /** Somewhere to be: "You are at the aisle at row 14". */
    function placeAt(x, y) {
        const p = placeKind(x, y);
        switch (p.what) {
            case "seat": return T("seat {seat}", { seat: p.seat });
            case "cockpit": return T("the flight deck door");
            case "door": return T("door {door}", { door: p.door });
            case "fwdGalley": return T("the forward galley");
            case "aftLav": return T("the aft lavatory");
            case "aftGalley": return T("the aft galley");
            case "row": return T("the aisle at row {row}", { row: p.row });
            case "fwdCross": return T("the forward cross-aisle");
            case "overwing": return T("the overwing exit row");
            case "aftCross": return T("the aft cross-aisle");
            case "aisle": return T("the aisle");
            default: return T("the cabin");
        }
    }

    /**
     * Somewhere to go: "Go to the aisle at row 14". The same words in English and the reason
     * this function exists is that they are not the same words in German, so every line is a
     * key of its own with a note saying which of the two it is.
     */
    function placeTo(x, y) {
        // The note is written out at every one of them, because tools/i18n_scan.js reads
        // literals and a note held in a variable is a key it cannot see.
        const p = placeKind(x, y);
        switch (p.what) {
            case "seat": return X("seat {seat}", "as a destination", { seat: p.seat });
            case "cockpit": return X("the flight deck door", "as a destination");
            case "door": return X("door {door}", "as a destination", { door: p.door });
            case "fwdGalley": return X("the forward galley", "as a destination");
            case "aftLav": return X("the aft lavatory", "as a destination");
            case "aftGalley": return X("the aft galley", "as a destination");
            case "row": return X("the aisle at row {row}", "as a destination", { row: p.row });
            case "fwdCross": return X("the forward cross-aisle", "as a destination");
            case "overwing": return X("the overwing exit row", "as a destination");
            case "aftCross": return X("the aft cross-aisle", "as a destination");
            case "aisle": return X("the aisle", "as a destination");
            default: return X("the cabin", "as a destination");
        }
    }

    // There are no safe zones. There are doors, and the floor in front of them: the galley and
    // the cross-aisle at each end, which is where anybody moving people puts them down because
    // the door is right there and the fire is not. Whether the air there is any good by the time
    // the gear comes down is the fire's business, and scoring.js asks the fire, not this list.
    // The overwing exits are doors too, two rows from the locker that is burning, so they count
    // for how far a door is and nobody is put down in front of them.
    const DOOR_ENDS = [FWD_GALLEY_X, FWD_CROSS_X, AFT_CROSS_X, AFT_GALLEY_X];

    function byTheDoors(x) {
        return DOOR_ENDS.indexOf(x) >= 0;
    }

    /** Columns from here to the nearest door at either end of the cabin. */
    function doorDistance(x) {
        return Math.min(Math.abs(x - FWD_CROSS_X), Math.abs(x - AFT_CROSS_X));
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
        rowAt, xOfRow, seatLetter, yOfLetter, seatPos, seatName, kindAt, placeName, placeTo,
        DOOR_ENDS, byTheDoors, doorDistance, solid, inBounds, baseFuel, baseWalk, eachSeat, neighbours,
        idx, xOf, yOf, binOf, binKey,
    };
})(window);
