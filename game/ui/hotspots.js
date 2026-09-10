// What is on the screen, and what you can do to it.
//
// The action engine answers one question: everything that is possible right now, as a flat
// list. This file answers the one a player actually asks, which is "what can I do with *that*" -
// that person, that door, the fire, the bottle in my bag - and it answers it for things that are
// out of reach too, by working out where you would have to stand and asking the engine from
// there. A click on somebody at the far end of the cabin is not a dead click: it is a walk, a
// price, and the list of what you could do once you arrived.
//
// Nothing here changes the world. previewAt() moves the player, asks, and puts them back.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const st = PRS.state;
    const A = PRS.actions;
    const P = PRS.pax;

    // ------------------------------------------------------------------------ which thing ---

    /**
     * The hotspots an entry belongs to. Most belong to one. An action that uses a thing in your
     * bag on somebody belongs to both ends, so "give Odette the water" is under Odette and under
     * the bottle, and a player who clicks either finds it.
     *
     *   person:<id>   crew:<id>   fire   you   here   crew   item:<id>
     */
    function keysOf(e) {
        const c = e.ctx || {};
        const keys = [];
        if (c.h && c.t) keys.push("person:" + c.t.id);
        else if (c.p) keys.push("person:" + c.p.id);
        else if (c.c) keys.push("crew:" + c.c.id);
        else if (e.deck === "fire") keys.push("fire");
        else if (e.deck === "self" || e.deck === "move") keys.push("you");
        else if (e.deck === "crew") keys.push("here", "crew");
        else keys.push("here");
        if (typeof e.item === "string") keys.push("item:" + e.item);
        return keys;
    }

    // The things a card puts first. Everything else is sorted by how good it looks and how much
    // it costs, and folded under "more", because a card with nineteen rows on it is the list
    // again with a border round it.
    const FIRST = {};
    ["people.put_down", "people.stop_drag", "people.carry", "people.drag", "items.strap_drag",
     "items.carrier_child", "extra.child_carry_pair", "extra.pet", "people.follow",
     "people.recruit", "people.pass_forward", "people.show_photo", "people.direct_helper",
     "people.revive", "loot.ask_carrying", "loot.ask_for", "loot.take_down",
     "fire.douse", "fire.smother", "fire.close_bin", "fire.tape_bin", "fire.photograph",
     "fire.halon", "fire.halon_bursts", "fire.water_ext", "fire.case_to_lav", "fire.case_in_sink",
     "crew.show_photo", "crew.show_burn", "crew.lead", "crew.tell", "crew.move_trolley",
     "cabin.fill_bottle", "cabin.wet_blanket", "cabin.fill_sink", "cabin.trigger_detector",
     "cabin.stow_trolley", "cabin.galley_drawer", "loot.lav_cabinet",
     "self.hood", "self.gloves", "self.goggles",
    ].forEach((id) => { FIRST[id] = true; });

    function rank(e) {
        if (e.danger === "bad") return 5;
        if (FIRST[e.id]) return 0;
        if (e.id.indexOf("extra.") === 0 && e.ctx && e.ctx.p) return 1;   // the one true thing
        if (e.danger === "good") return 1;
        if (e.tags.indexOf("hands") >= 0) return 2;
        if (e.tags.indexOf("social") >= 0) return 3;
        return 4;
    }

    function compare(a, b) {
        const ra = rank(a), rb = rank(b);
        if (ra !== rb) return ra - rb;
        if (a.cost !== b.cost) return a.cost - b.cost;
        return a.label < b.label ? -1 : 1;
    }

    /** Every entry, filed under every hotspot it belongs to. */
    function group(entries) {
        const out = {};
        for (const e of entries) {
            for (const k of keysOf(e)) (out[k] = out[k] || []).push(e);
        }
        for (const k in out) out[k].sort(compare);
        return out;
    }

    /** The union of several hotspots, once each, best first. */
    function pick(groups, keys) {
        const seen = {}, out = [];
        for (const k of keys) {
            for (const e of groups[k] || []) {
                if (seen[e.key]) continue;
                seen[e.key] = true;
                out.push(e);
            }
        }
        return out.sort(compare);
    }

    // ------------------------------------------------------------------ standing elsewhere ---

    /**
     * Everything that would be possible if you were standing on (x, y). The player is moved,
     * the engine is asked, and the player is put back, along with the cached route field, so
     * nothing about the world is different afterwards. Costs come out as they would be there:
     * an action in smoke costs more, and this says so before you walk into it.
     */
    function previewAt(S, x, y) {
        const Pl = S.player;
        const was = { x: Pl.x, y: Pl.y, field: S._field, stamp: S._fieldStamp };
        Pl.x = x; Pl.y = y;
        S._field = null; S._fieldStamp = null;
        let list;
        try { list = A.available(S); } catch (err) { list = []; }
        Pl.x = was.x; Pl.y = was.y;
        S._field = was.field; S._fieldStamp = was.stamp;
        return list;
    }

    /**
     * Where you would stand to deal with a thing at (x, y): the tile itself or one beside it,
     * whichever is cheapest to reach, with a preference for the aisle over a seat and for
     * standing next to a person rather than on them.
     */
    function approach(S, x, y, opts) {
        opts = opts || {};
        const cands = opts.exact ? [[x, y]] : [[x, y]].concat(cabin.neighbours(x, y));
        let best = null;
        for (const [cx, cy] of cands) {
            if (!cabin.inBounds(cx, cy) || cabin.solid(cx, cy)) continue;
            if (cx === S.player.x && cy === S.player.y) {
                return { x: cx, y: cy, cost: 0, path: [], here: true };
            }
            const r = A.route(S, cx, cy);
            if (!r) continue;
            let score = r.cost;
            if (cy === cabin.AISLE_Y) score -= 2;
            if (opts.avoidSelf && cx === x && cy === y) score += 6;
            if (!best || score < best.score) {
                best = { x: cx, y: cy, cost: Math.max(1, Math.round(r.cost)), score: score,
                         path: r.path.map((i) => [cabin.xOf(i), cabin.yOf(i)]) };
            }
        }
        if (!best && opts.exact) return approach(S, x, y, Object.assign({}, opts, { exact: false }));
        return best;
    }

    /** The worst tile in the aeroplane, which is what "the fire" means from a distance. */
    function hottest(S) {
        let best = null, v = 3;
        for (let i = 0; i < cabin.W * cabin.H; i++) {
            if (S.fire.intensity[i] > v) { v = S.fire.intensity[i]; best = { x: cabin.xOf(i), y: cabin.yOf(i) }; }
        }
        return best;
    }

    // --------------------------------------------------------------------------- the things ---
    //
    // A thing is what a click means: a person, a member of crew, the fire, yourself, a fixture
    // of the aeroplane, or something in your bag. It carries ids rather than objects, because
    // undo replaces every object in the world and a card that held on to the old Odette would
    // be a card about somebody who no longer exists.

    function personThing(p) {
        return { kind: "person", key: "person:" + p.id, id: p.id, x: p.x, y: p.y,
                 name: p.name, short: p.name.split(" ")[0] };
    }
    function crewThing(c) {
        return { kind: "crew", key: "crew:" + c.id, id: c.id, x: c.x, y: c.y,
                 name: c.name, short: c.name.split(" ")[0] };
    }
    function fireThing(x, y) {
        return { kind: "fire", key: "fire", x: x, y: y, name: "The fire", short: "the fire" };
    }
    function youThing(S) {
        return { kind: "you", key: "you", x: S.player.x, y: S.player.y,
                 name: S.character.name, short: "you" };
    }
    function itemThing(S, id) {
        const s = st.slotOf(S, id);
        return { kind: "item", key: "item:" + id, id: id, name: s ? s.item.name : id, short: "bag" };
    }

    const BLURB = {
        lav: "A tap, a basin, a waste bin, a smoke detector, and a door that shuts.",
        galley: "Steel, drawers, the crew's kit, and the safest floor on board.",
        exit: "Nobody is opening it at thirty thousand feet. The floor beside it is the best " +
              "there is.",
        cockpit: "Locked. There is an interphone on the bulkhead beside it.",
        trolley: "Two hundred kilos across the aisle, with the brake on.",
        bins: "Bags, coats, blankets in plastic, and somebody's duty free.",
    };

    function place(x, y, dx, dy, sub, name, icon) {
        return { kind: "place", key: "place:" + x + "," + y, x: x, y: y, dest: { x: dx, y: dy },
                 sub: sub, name: name, icon: icon, short: name.replace(/^the /, "") };
    }

    /** The fixture on a tile, if it is one: a door, a galley, the lavatory, the trolley, a bin. */
    function placeAt(S, x, y) {
        const kind = cabin.kindAt(x, y);
        if (kind === "lav") return place(x, y, x, y, "lav", "the aft lavatory", "lav_door");
        if (kind === "galley") return place(x, y, x, y, "galley", cabin.placeName(x, y), "galley");
        if (kind === "exit") return place(x, y, x, y, "exit", cabin.placeName(x, y), "exit_door");
        if (kind === "cockpit") {
            return place(x, y, 1, cabin.AISLE_Y, "cockpit", "the flight deck door", "cockpit_door");
        }
        if (S.cabinFlags.cartOut && x === S.cabinFlags.cartX && y === cabin.AISLE_Y) {
            const side = S.player.x < x ? x - 1 : x + 1;
            return place(x, y, side, cabin.AISLE_Y, "trolley", "the trolley", "drink_cart");
        }
        if ((y === cabin.WALL_TOP || y === cabin.WALL_BOTTOM) && cabin.rowAt(x) !== null) {
            const row = cabin.rowAt(x);
            const p = place(x, y, x, cabin.AISLE_Y, "bins", "the lockers above row " + row,
                            "bin_closed");
            p.short = "row " + row;
            return p;
        }
        return null;
    }

    /** Everything a click on a tile could mean, most likely first. Empty means "walk there". */
    function thingsAt(S, x, y) {
        if (!cabin.inBounds(x, y)) return [];
        const out = [];
        for (const p of st.paxAt(S, x, y)) out.push(personThing(p));
        for (const c of S.crew) if (c.x === x && c.y === y) out.push(crewThing(c));
        if (x === S.player.x && y === S.player.y) {
            out.push(youThing(S));
            // Whoever is in your arms is on your tile too, and putting them down is theirs.
            for (const id of S.player.carrying.concat(S.player.dragging ? [S.player.dragging] : [])) {
                const p = st.paxById(S, id);
                if (p) out.push(personThing(p));
            }
        }
        if (S.fire.intensity[cabin.idx(x, y)] > 3) out.push(fireThing(x, y));
        const fixture = placeAt(S, x, y);
        if (fixture) out.push(fixture);
        return out;
    }

    // ------------------------------------------------------------------------------ the card ---

    const PRIMARY = 6;

    /**
     * Everything the card needs about one thing: who or what it is, whether you can touch it
     * from here, where you would stand if not, and what you could do - now, and once you were
     * there. Returns null if the thing has stopped existing.
     */
    function resolve(S, thing, entries) {
        const groups = group(entries);
        const R = { thing: thing, header: null, near: true, walk: null, sections: [], empty: null };

        if (thing.kind === "person") {
            const p = st.paxById(S, thing.id);
            if (!p || p.state === "gone") return null;
            thing.x = p.x; thing.y = p.y;
            R.header = personHeader(S, p);
            if (p.state === "secured") {
                R.empty = p.name + " is at " + cabin.safeZoneName(p.x) + ", accounted for.";
                return R;
            }
            if (p.state === "dead") {
                R.empty = "There is nothing more to be done for " + p.name + ".";
                return R;
            }
            let now = groups[thing.key] || [];
            if (S.player.dragging === p.id) {
                now = now.concat((groups.here || []).filter((e) => e.id === "people.stop_drag"));
            }
            R.near = p.state === "carried" || st.reachable(S).indexOf(p) >= 0;
            const then = R.near ? [] : remote(S, R, p.x, p.y, [thing.key], now,
                { avoidSelf: true, label: "Walk over to " + thing.short });
            split(R, now, then);
            if (!now.length && !R.walk) R.empty = "Nothing you can do for " + p.name + " from here.";
            return R;
        }

        if (thing.kind === "crew") {
            const c = PRS.crew.byId(S, thing.id);
            if (!c) return null;
            thing.x = c.x; thing.y = c.y;
            R.header = {
                icon: c.sprite || "crew", palette: P.palette(c), iconScale: 2, title: c.name,
                sub: c.role + (c.refusals ? " · has said no " + c.refusals +
                               (c.refusals === 1 ? " time" : " times") : ""),
                traits: c.hasSeenIt ? "has seen the locker" : null,
            };
            const now = pick(groups, [thing.key, "crew"]);
            R.near = PRS.crew.adjacentCrew(S).some((q) => q.id === c.id);
            const then = R.near ? [] : remote(S, R, c.x, c.y, [thing.key, "crew"], now,
                { avoidSelf: true, label: "Walk over to " + thing.short });
            split(R, now, then);
            if (!now.length && !R.walk) R.empty = "You cannot get to " + c.name + " from here.";
            return R;
        }

        if (thing.kind === "fire") {
            if (S.fire.intensity[cabin.idx(thing.x, thing.y)] <= 0.5) {
                const h = hottest(S);
                if (!h) return null;
                thing.x = h.x; thing.y = h.y;
            }
            R.header = fireHeader(S, thing.x, thing.y);
            const now = groups.fire || [];
            R.near = Math.abs(thing.x - S.player.x) + Math.abs(thing.y - S.player.y) <= 1;
            const then = R.near ? [] : remote(S, R, thing.x, thing.y, ["fire"], now,
                { avoidSelf: true, label: "Walk to the fire" });
            split(R, now, then);
            if (!now.length && !R.walk) R.empty = "You cannot get near it from here.";
            return R;
        }

        if (thing.kind === "you") {
            thing.x = S.player.x; thing.y = S.player.y;
            R.header = youHeader(S);
            const you = groups.you || [];
            const here = groups.here || [];
            const prim = here.filter((e) => rank(e) <= 1);
            const rest = here.filter((e) => rank(e) > 1);
            if (you.length) R.sections.push({ title: "Yourself", rows: you });
            if (prim.length) R.sections.push({ title: "Around you", rows: prim });
            if (rest.length) R.sections.push({ title: "More", rows: rest, more: true });
            if (!you.length && !here.length) R.empty = "Nothing here but you.";
            return R;
        }

        if (thing.kind === "place") {
            R.header = placeHeader(S, thing);
            const d = thing.dest;
            R.near = (S.player.x === d.x && S.player.y === d.y) || samePlace(S, thing);
            // What is possible here already is not worth walking there for, so it is filtered
            // out of the "then" even when it is not shown: the head count is the same head
            // count in the lavatory.
            const here = pick(groups, ["here", "fire"]);
            const now = R.near ? here : [];
            const then = R.near ? [] : remote(S, R, d.x, d.y, ["here", "fire"], here,
                { exact: true, label: "Walk to " + thing.name });
            split(R, now, then);
            if (!now.length && !R.walk) {
                R.empty = R.near ? "Nothing to do here right now." : "You cannot get there from here.";
            }
            return R;
        }

        if (thing.kind === "item") {
            const slot = st.slotOf(S, thing.id);
            if (!slot) return null;
            R.header = itemHeader(S, slot);
            const now = groups[thing.key] || [];
            split(R, now, []);
            for (const sec of itemHints(S, slot, thing.key, now)) R.sections.push(sec);
            // The generic actions take the best thing of a kind first - the towel before the
            // wipes - so a spare can be honestly idle without being useless.
            if (!R.sections.length) R.empty = "Nothing calls for it right now.";
            return R;
        }
        return null;
    }

    /** Work out the walk, and what would be possible at the end of it. */
    function remote(S, R, x, y, keys, now, opts) {
        const ap = approach(S, x, y, opts);
        if (!ap) return [];
        if (ap.here) { R.near = true; return []; }
        R.walk = { x: ap.x, y: ap.y, cost: ap.cost, path: ap.path,
                   label: opts.label || "Walk there", detail: cabin.placeName(ap.x, ap.y) };
        const seen = {};
        for (const e of now) seen[e.key] = true;
        return pick(group(previewAt(S, ap.x, ap.y)), keys).filter((e) => !seen[e.key]);
    }

    /** The first few, the rest folded, and then the walk with what comes after it. */
    function split(R, now, then) {
        const prim = now.filter((e) => rank(e) <= 1).slice(0, PRIMARY);
        const rest = now.filter((e) => prim.indexOf(e) < 0);
        if (prim.length) R.sections.push({ rows: prim });
        if (rest.length) R.sections.push({ title: "More", rows: rest, more: true });
        if (R.walk) R.sections.push(walkSection(R.walk, then));
    }

    /** A walk, priced, and what would be possible at the end of it. */
    function walkSection(walk, then) {
        return { title: then.length ? "Walk there, then" : "Out of reach", walk: walk, then: true,
                 rows: then.slice(0, PRIMARY), hidden: Math.max(0, then.length - PRIMARY) };
    }

    function samePlace(S, thing) {
        if (thing.sub !== "lav" && thing.sub !== "galley") return false;
        return S.player.x === thing.dest.x && cabin.kindAt(S.player.x, S.player.y) === thing.sub;
    }

    /**
     * Where else a thing in your bag would be useful: the fire, and the tap. Each is a walk and
     * what the thing could do at the end of it, minus anything it can already do from here, so
     * a full bottle at row 9 says "walk to the fire, then pour it" and an empty one says "walk to
     * the lavatory, then fill it", and the phone says "walk to the fire, then photograph it".
     */
    function itemHints(S, slot, key, now) {
        const it = slot.item;
        const out = [];
        const seen = {};
        for (const e of now) seen[e.key] = true;
        const empty = slot.spent || (slot.uses !== null && slot.uses <= 0);
        const stops = [];
        const h = hottest(S);
        if (h && !empty) stops.push({ x: h.x, y: h.y, label: "Walk to the fire", avoidSelf: true });
        const wantsTap = (it.refill === "tap" && (empty || (slot.uses !== null && slot.uses < it.uses))) ||
                         (it.tags.indexOf("wettable") >= 0 && !slot.wet);
        if (wantsTap) {
            stops.push({ x: cabin.AFT_GALLEY_X, y: 7, label: "Walk to the aft lavatory",
                         exact: true, detail: "There is a tap in there." });
        }
        for (const stop of stops) {
            const ap = approach(S, stop.x, stop.y, stop);
            if (!ap || ap.here) continue;
            const rows = pick(group(previewAt(S, ap.x, ap.y)), [key]).filter((e) => !seen[e.key]);
            if (!rows.length) continue;
            for (const e of rows) seen[e.key] = true;
            out.push(walkSection({ x: ap.x, y: ap.y, cost: ap.cost, path: ap.path, label: stop.label,
                                   detail: stop.detail || cabin.placeName(ap.x, ap.y) }, rows));
        }
        return out;
    }

    // ----------------------------------------------------------------------------- headers ---

    function personHeader(S, p) {
        const cond = P.condition(p);
        const dist = Math.abs(p.x - S.player.x) + Math.abs(p.y - S.player.y);
        return {
            icon: P.face(p), palette: P.palette(p), iconScale: 2, title: p.name,
            sub: p.seat + " · " + p.kg + "kg · " + P.displayState(p) + " · " + cond.label,
            traits: p.traits.length ? p.traits.join(", ") : null,
            flag: p.helper ? "working with you" : p.state === "carried" ? "in your arms"
                : dist > 1 ? dist + " tiles away" : null,
        };
    }

    function fireHeader(S, x, y) {
        const c = S.fire.core;
        const i = cabin.idx(x, y);
        const seat = c.inSink ? "The case is in the lavatory basin, under water."
            : "The seat of it is the locker above " + cabin.ORIGIN.row + cabin.ORIGIN.letter + "." +
              (c.exposed ? " You have seen inside it." : " Nobody has looked inside it.");
        return {
            icon: PRS.fire.fireSprite(Math.max(S.fire.intensity[i], 1)) || "ember", iconScale: 2,
            title: "The fire",
            sub: PRS.fire.describe(S.fire, x, y) + " · " + cabin.placeName(x, y) +
                 " · smoke " + PRS.fire.describeSmoke(S.fire.smoke[i]),
            traits: seat,
        };
    }

    function youHeader(S) {
        const Pl = S.player;
        const fear = Pl.panic + Pl.smokeDose * 0.55;
        const face = !Pl.alive ? "pax_down" : fear > 62 ? "pax_afraid" : fear > 27 ? "pax_worried" : "pax";
        const lungs = Pl.smokeDose > 70 ? "lungs failing" : Pl.smokeDose > 40 ? "lungs bad"
                    : Pl.smokeDose > 15 ? "coughing" : "breathing fine";
        const bits = [cabin.placeName(Pl.x, Pl.y), lungs];
        if (Pl.burns > 15) bits.push("burned");
        if (Pl.carrying.length) bits.push("carrying " + Pl.carrying.length);
        if (Pl.dragging) bits.push("dragging somebody");
        const worn = Object.keys(Pl.wearing).filter((k) => Pl.wearing[k]);
        return {
            icon: face, palette: P.palette(S.character), iconScale: 2,
            title: S.character.name + " — you", sub: bits.join(" · "),
            traits: worn.length ? "wearing " + worn.map((k) => k.replace(/_/g, " ")).join(", ") : null,
        };
    }

    function placeHeader(S, thing) {
        const d = thing.dest;
        const i = cabin.idx(d.x, d.y);
        const air = [];
        if (S.fire.intensity[i] > 0.5) air.push(PRS.fire.describe(S.fire, d.x, d.y));
        if (S.fire.smoke[i] > 6) air.push("smoke " + PRS.fire.describeSmoke(S.fire.smoke[i]));
        let blurb = BLURB[thing.sub] || null;
        if (thing.sub === "bins" && thing.x === S.fire.core.x && !S.fire.core.inSink) {
            blurb = "The locker the fire is in.";
        }
        const name = thing.name.charAt(0).toUpperCase() + thing.name.slice(1);
        return { icon: thing.icon, iconScale: 2, title: name,
                 sub: air.length ? air.join(" · ") : "clear air", traits: blurb };
    }

    function itemHeader(S, slot) {
        const it = slot.item;
        const bits = [];
        if (slot.spent || (slot.uses !== null && slot.uses <= 0)) bits.push("empty");
        else if (slot.uses !== null) bits.push(slot.uses + " left");
        if (slot.wet) bits.push("wet");
        if (st.wearing(S, slot.id)) bits.push("on you");
        return { icon: itemSprite(slot), iconScale: 3, title: it.name,
                 sub: bits.join(" · ") || null, traits: it.note };
    }

    /** The sprite for a thing in your bag, allowing for it being empty or wet. */
    function itemSprite(slot) {
        const name = String(slot.item.sprite).split(":")[1];
        const empty = slot.spent || (slot.uses !== null && slot.uses <= 0);
        if (empty && PRS.atlas.has(name + "_empty")) return name + "_empty";
        if (slot.wet && PRS.atlas.has(name + "_wet")) return name + "_wet";
        return name;
    }

    // ------------------------------------------------------------------------------ what now ---

    /**
     * Three things worth doing from where you are standing, each with the reason. Not an
     * autopilot: it says what is in front of you, it does not say what the game is about, and a
     * player who follows it every turn will do fine and no better.
     */
    function suggest(S, entries, all) {
        if (S.clock.landed) return [];
        const out = [];
        const add = (e, why) => {
            if (!e || out.length >= 3 || out.some((o) => o.entry.key === e.key)) return;
            out.push({ entry: e, why: why });
        };
        const find = (pred) => entries.filter(pred).sort((a, b) => a.cost - b.cost)[0];
        const walk = (x, y) => all.filter((e) => e.id === "move.walk" && e.ctx.x === x && e.ctx.y === y)[0];
        const Pl = S.player;
        const hands = Pl.carrying.length || Pl.dragging;
        const safe = cabin.isSafeZone(Pl.x, Pl.y);

        if (hands && safe) {
            add(find((e) => e.id === "people.put_down" || e.id === "people.stop_drag"),
                "This is a safe zone. They count once they are down.");
        }
        if (hands && !safe) {
            add(walk(P.nearestSafeX(Pl.x), cabin.AISLE_Y),
                "The nearest safe zone. Nobody counts until they are in one.");
        }
        add(find((e) => (e.id === "people.carry" || e.id === "people.drag" ||
                         e.id === "items.strap_drag") && e.ctx && e.ctx.p && P.needsCarrying(e.ctx.p)),
            "They cannot get out of that seat on their own.");
        if (S.clock.elapsed < 600) {
            add(find((e) => e.id === "people.recruit" && P.condition(e.ctx.p).tier < 2 &&
                            P.resistance(S, e.ctx.p) < P.persuasion(S) + 20),
                "One more pair of hands, for the rest of the flight.");
        }
        add(find((e) => e.id === "people.follow"), "The cheapest save there is.");
        if (!S.flags.havePhoto) {
            add(find((e) => e.id === "fire.photograph"),
                "Nobody believes you yet. This is what changes that.");
        }
        add(find((e) => e.id === "crew.show_photo" || e.id === "crew.show_burn"),
            "Evidence beats an account of evidence.");
        add(find((e) => e.id === "fire.close_bin" || e.id === "fire.tape_bin"),
            "Air is what it wants. Take the air away.");
        add(find((e) => e.id === "cabin.stow_trolley" || e.id === "crew.move_trolley"),
            "The trolley is the biggest thing in your way.");
        add(find((e) => e.id === "loot.ask_carrying"),
            "Most of the useful things on board are in somebody's lap.");
        add(find((e) => e.id === "people.carry"), "Somebody within reach.");
        add(find((e) => e.id === "fire.douse"), "Buys seconds. It does not put it out.");

        if (out.length < 2) {
            // Nobody within reach: go where the people are, or go and look at the thing.
            const rows = all.filter((e) => e.id === "move.to_row");
            rows.sort((a, b) => (b.ctx.down * 6 + b.ctx.stuck * 4 + b.ctx.n) -
                                (a.ctx.down * 6 + a.ctx.stuck * 4 + a.ctx.n));
            if (rows[0]) add(rows[0], rows[0].detail);
            add(all.filter((e) => e.id === "move.to_fire")[0], "See what you are dealing with.");
        }
        return out;
    }

    PRS.hotspots = {
        keysOf, rank, group, pick, previewAt, approach, hottest, thingsAt, placeAt,
        personThing, crewThing, fireThing, youThing, itemThing, itemSprite, resolve, suggest,
    };
})(window);
