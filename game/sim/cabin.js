// The aeroplane. A grid, nose at x=0 and tail at the far end, with the aisle across the middle
// of it: the left wall, the seats above the aisle, the aisle, the seats below it, the right
// wall. Everything else in the game addresses the cabin through here, so the layout can change
// without the fire or the passengers noticing.
//
// It changes twice now. There is more than one aeroplane in the game, and which one is on the
// screen is `PRS.cabin.use(id)` - so this file holds no shape of its own any more. It reads one
// out of `PRS.data.aircraft` and copies it onto itself.
//
// The copying is the point. Every other file in the game did `const cabin = PRS.cabin` at load
// and then read `cabin.W` through that reference, which means swapping the object out would
// leave forty files holding the old aeroplane. Writing the new numbers onto the same object
// leaves all forty of them right. So `use` mutates and never replaces, and the one rule for
// anybody adding to this file is that the export at the bottom is built once.
//
// Fuel is per-tile and it is what the fire eats: a seat is upholstery and foam and burns for a
// long time, an aisle is carpet over an aluminium floor and barely burns at all, and a galley is
// full of paper cups and spirit miniatures and burns like a birthday.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};
    const T = PRS.t, X = PRS.tx, K = PRS.k;

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

    // The aeroplane currently on the screen. Every geometry function below reads `A`, and `use`
    // is the only thing that writes it.
    let A = null;

    // -------------------------------------------------------------------------- the fleet ---

    /**
     * Put an aeroplane on the screen. Copies its numbers onto `PRS.cabin` itself rather than
     * handing back a new object, because everything in the game is already holding this one.
     *
     * Safe to call with the aeroplane that is already loaded; it is what starting a second
     * flight on the same aircraft does.
     */
    function use(id) {
        const ac = PRS.data.aircraft.byId(id);
        A = ac;
        const C = PRS.cabin;
        C.aircraft = ac;
        C.W = ac.W;
        C.H = ac.H;
        C.AISLE_Y = ac.AISLE_Y;
        C.WALL_TOP = 0;
        C.WALL_BOTTOM = ac.H - 1;
        C.SEAT_LETTERS = ac.SEAT_LETTERS;
        C.FWD_ROWS = ac.FWD_ROWS;
        C.AFT_ROWS = ac.AFT_ROWS;
        C.OVERWING_X = ac.OVERWING_X;
        C.FWD_CROSS_X = ac.FWD_CROSS_X;
        C.AFT_CROSS_X = ac.AFT_CROSS_X;
        C.FWD_GALLEY_X = ac.FWD_GALLEY_X;
        C.AFT_GALLEY_X = ac.AFT_GALLEY_X;
        C.LAV_LEFT_Y = ac.LAV_LEFT_Y;
        C.LAV_RIGHT_Y = ac.LAV_RIGHT_Y;
        C.ORIGIN = ac.ORIGIN;
        C.ceiling = ac.ceiling;
        // There are no safe zones. There are doors, and the floor in front of them: the service
        // end and the cross-aisle at each end, which is where anybody moving people puts them
        // down because the door is right there and the fire is not. Whether the air there is any
        // good by the time the gear comes down is the fire's business, and scoring.js asks the
        // fire, not this list. The overwing exits are doors too, a row or two from the locker
        // that is burning, so they count for how far a door is and nobody is put down there.
        //
        // On a small aeroplane the service end and the cross-aisle are the same column, so this
        // list has the same number in it twice. Everything that reads it uses indexOf.
        C.DOOR_ENDS = [ac.FWD_GALLEY_X, ac.FWD_CROSS_X, ac.AFT_CROSS_X, ac.AFT_GALLEY_X];
        return ac;
    }

    /** Which aeroplane is loaded. */
    function current() { return A; }

    // ------------------------------------------------------------------------- the columns ---

    function rowAt(x) {
        const F = A.FWD_ROWS, B = A.AFT_ROWS;
        if (x >= F.x0 && x <= F.x1) return F.first + (x - F.x0);
        if (x >= B.x0 && x <= B.x1) return B.first + (x - B.x0);
        return null;
    }

    function xOfRow(row) {
        const F = A.FWD_ROWS, B = A.AFT_ROWS;
        if (row >= F.first && row <= F.first + (F.x1 - F.x0)) return F.x0 + (row - F.first);
        if (row >= B.first && row <= B.first + (B.x1 - B.x0)) return B.x0 + (row - B.first);
        return null;
    }

    function seatLetter(y) {
        return A.SEAT_LETTERS[y - 1] || null;
    }

    function yOfLetter(letter) {
        const i = A.SEAT_LETTERS.indexOf(letter);
        return i < 0 ? null : i + 1;
    }

    /**
     * Where a seat is in its bank, as it sits on the screen. The art is one bank of seats cut
     * into tiles that join up, so the renderer needs this and not the letter: the top seat of
     * the upper bank is by the window and the top seat of the lower bank is by the aisle, and
     * the drawing is the same. Null for anything that is not a seat row.
     *
     * A bank of three is "top", "mid", "bot". A bank of one - which is what a nineteen-seat
     * turboprop has either side of its aisle - is "solo", which is its own piece of furniture
     * and not a third of somebody else's.
     */
    const BANKS = {
        1: ["solo"],
        2: ["top", "bot"],
        3: ["top", "mid", "bot"],
    };

    function seatPos(y) {
        if (y === A.AISLE_Y || y <= 0 || y >= A.H - 1) return null;
        const above = y < A.AISLE_Y;
        const size = above ? A.AISLE_Y - 1 : (A.H - 2) - A.AISLE_Y;
        const i = above ? y - 1 : y - A.AISLE_Y - 1;
        const bank = BANKS[size] || BANKS[3];
        return bank[i] || bank[bank.length - 1];
    }

    /** "14C" for a tile that is a seat, otherwise null. */
    function seatName(x, y) {
        const row = rowAt(x);
        const letter = seatLetter(y);
        if (row && letter) return row + letter;
        return null;
    }

    /** Which wall sides have a door at this column: "L" at the top, "R" at the bottom. */
    function doorSides(x) {
        const d = A.doors;
        if (!d) return ["L", "R"];
        return d[x] || [];
    }

    function kindAt(x, y) {
        if (x < 0 || y < 0 || x >= A.W || y >= A.H) return "wall";
        // An aeroplane may say that one particular tile is not what the columns say it is: the
        // closet in the corner where 1A would be on a Beechcraft is the only one so far.
        if (A.overrides) {
            const over = A.overrides[x + "," + y];
            if (over) return over;
        }
        const top = y === 0, bottom = y === A.H - 1;
        if (top || bottom) {
            // The doors are holes in the wall, at the cross-aisles and over the wing - but only
            // on the sides that aeroplane actually has one.
            if (x === A.FWD_CROSS_X || x === A.OVERWING_X || x === A.AFT_CROSS_X) {
                if (doorSides(x).indexOf(top ? "L" : "R") >= 0) return "exit";
            }
            return "wall";
        }
        if (x === 0) return y === A.AISLE_Y ? "cockpit" : "bulkhead";
        if (x === A.W - 1) return "bulkhead";
        if (x === A.FWD_GALLEY_X) return y === A.AISLE_Y ? "aisle" : "galley";
        if (x === A.AFT_GALLEY_X) {
            if (y === A.AISLE_Y) return "aisle";
            // One lavatory or two. The other side of the aft vestibule on a small aeroplane is
            // the baggage bay, which is a galley as far as the fire is concerned.
            //
            // The `!== null` is load-bearing rather than defensive: an aeroplane with one
            // lavatory says the second one is null, and `null === null` is true, so without
            // this a call with y=null - which is what `yOfLetter` returns for a letter this
            // aircraft has not got - comes back "lav" for a tile that does not exist.
            return (A.LAV_LEFT_Y !== null && y === A.LAV_LEFT_Y)
                || (A.LAV_RIGHT_Y !== null && y === A.LAV_RIGHT_Y) ? "lav" : "galley";
        }
        if (x === A.FWD_CROSS_X || x === A.OVERWING_X || x === A.AFT_CROSS_X) {
            return y === A.AISLE_Y ? "aisle" : "cross";
        }
        if (y === A.AISLE_Y) return "aisle";
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

    /** Which of the places this tile is, as something the two namers can switch on. */
    function placeKind(x, y) {
        const seat = seatName(x, y);
        if (seat) return { what: "seat", seat: seat };
        const kind = kindAt(x, y);
        if (kind === "cockpit") return { what: "cockpit" };
        if (kind === "exit") {
            // L1, R2: the door numbering is the aircraft's, and it is the same in every language.
            const side = y === 0 ? "L" : "R";
            const n = x === A.FWD_CROSS_X ? 1 : x === A.OVERWING_X ? 3 : 2;
            return { what: "door", door: side + n };
        }
        if (x === A.FWD_GALLEY_X) return { what: "fwdGalley" };
        if (x === A.AFT_GALLEY_X) {
            if (kind !== "lav") return { what: "aftGalley" };
            return { what: y === A.LAV_LEFT_Y ? "aftLavLeft" : "aftLav" };
        }
        if (kind === "aisle") {
            const row = rowAt(x);
            if (row) return { what: "row", row: row };
            if (x === A.FWD_CROSS_X) return { what: "fwdCross" };
            if (x === A.OVERWING_X) return { what: "overwing" };
            if (x === A.AFT_CROSS_X) return { what: "aftCross" };
            return { what: "aisle" };
        }
        if (kind === "cross") {
            if (x === A.FWD_CROSS_X) return { what: "fwdCross" };
            if (x === A.OVERWING_X) return { what: "overwing" };
            if (x === A.AFT_CROSS_X) return { what: "aftCross" };
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
            case "aftLav": return T("the right aft lavatory");
            case "aftLavLeft": return T("the left aft lavatory");
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
            case "aftLav": return X("the right aft lavatory", "as a destination");
            case "aftLavLeft": return X("the left aft lavatory", "as a destination");
            case "aftGalley": return X("the aft galley", "as a destination");
            case "row": return X("the aisle at row {row}", "as a destination", { row: p.row });
            case "fwdCross": return X("the forward cross-aisle", "as a destination");
            case "overwing": return X("the overwing exit row", "as a destination");
            case "aftCross": return X("the aft cross-aisle", "as a destination");
            case "aisle": return X("the aisle", "as a destination");
            default: return X("the cabin", "as a destination");
        }
    }

    function byTheDoors(x) {
        return PRS.cabin.DOOR_ENDS.indexOf(x) >= 0;
    }

    /** Columns from here to the nearest door at either end of the cabin. */
    function doorDistance(x) {
        return Math.min(Math.abs(x - A.FWD_CROSS_X), Math.abs(x - A.AFT_CROSS_X));
    }

    function solid(x, y) {
        return KIND[kindAt(x, y)].solid;
    }

    function inBounds(x, y) {
        return x >= 0 && y >= 0 && x < A.W && y < A.H;
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
        for (let x = 0; x < A.W; x++) {
            if (rowAt(x) === null) continue;
            for (let y = 1; y <= A.H - 2; y++) {
                if (y === A.AISLE_Y) continue;
                if (kindAt(x, y) !== "seat") continue;
                fn(x, y, rowAt(x), seatLetter(y));
            }
        }
    }

    /** Four-neighbourhood, in bounds. Fire and smoke both walk this. */
    function neighbours(x, y) {
        const out = [];
        if (x > 0) out.push([x - 1, y]);
        if (x < A.W - 1) out.push([x + 1, y]);
        if (y > 0) out.push([x, y - 1]);
        if (y < A.H - 1) out.push([x, y + 1]);
        return out;
    }

    const idx = (x, y) => y * A.W + x;
    const xOf = (i) => i % A.W;
    const yOf = (i) => Math.floor(i / A.W);

    // The overhead lockers run the length of the cabin over the seats either side. A bin belongs
    // to a row and a side, and it is a bin fire that started all this.
    function binOf(x, y) {
        const row = rowAt(x);
        if (row === null || y === A.AISLE_Y || y === 0 || y === A.H - 1) return null;
        if (kindAt(x, y) !== "seat") return null;
        return { row: row, x: x, side: y < A.AISLE_Y ? "left" : "right" };
    }

    function binKey(x, side) {
        return x + ":" + side;
    }

    /** The seat whose locker is on fire, as a tile. */
    function originTile() {
        return { x: xOfRow(A.ORIGIN.row), y: yOfLetter(A.ORIGIN.letter) };
    }

    // Built once, filled in by `use`. Nothing here may be rebuilt: forty files are holding it.
    PRS.cabin = {
        KIND, SEAT_LETTERS: null,
        use, current,
        rowAt, xOfRow, seatLetter, yOfLetter, seatPos, seatName, kindAt, placeName, placeTo,
        doorSides, byTheDoors, doorDistance, solid, inBounds, baseFuel, baseWalk, eachSeat,
        neighbours, idx, xOf, yOf, binOf, binKey, originTile,
    };

    // The game has to be able to ask the cabin about itself before anybody has chosen a flight -
    // the title screen does, and so does every tool that loads the files and starts measuring.
    use(PRS.data.aircraft.DEFAULT);
})(window);
