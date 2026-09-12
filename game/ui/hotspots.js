// What is on the screen, and what you can do to it.
//
// The action engine answers one question: everything that is possible right now, as a flat
// list. This file answers the one a player actually asks, which is "what can I do with *that*" -
// and there are three thats. A person. The fire. Yourself. Everything else on the aeroplane is
// floor, and clicking floor walks you to it.
//
// It answers for things that are out of reach too, by working out where you would have to stand
// and asking the engine from there. A click on somebody at the far end of the cabin is not a dead
// click: it is a walk, a price, and the list of what you could do once you arrived.
//
// Nothing here changes the world. previewAt() moves the player, asks, and puts them back.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};
    const cabin = PRS.cabin;
    const T = PRS.t;
    const st = PRS.state;
    const A = PRS.actions;
    const P = PRS.pax;

    // ------------------------------------------------------------------------ which thing ---

    /**
     * The hotspots an entry belongs to. Most belong to one. An action that uses a thing in your
     * bag on somebody is filed under them, so "give Odette the water" is on Odette's card; a
     * thing in your bag used on nobody in particular - the hood, the tap - is on yours.
     *
     *   person:<id>   crew:<id>   fire   you   here   crew
     */
    function keysOf(e) {
        const c = e.ctx || {};
        if (c.h && c.t) return ["person:" + c.t.id];
        if (c.p) return ["person:" + c.p.id];
        if (c.c) return ["crew:" + c.c.id];
        if (e.deck === "fire") return ["fire"];
        if (e.deck === "self" || e.deck === "move") return ["you"];
        if (e.deck === "crew") return ["here", "crew"];
        return ["here"];
    }

    // The things a card puts first. Everything else is sorted by how good it looks and how much
    // it costs, and folded under "more", because a card with nineteen rows on it is the list
    // again with a border round it.
    const FIRST = {};
    ["people.put_down", "people.stop_drag", "people.carry", "people.drag",
     "extra.child_carry_pair", "people.follow", "people.recruit", "people.show_photo",
     "people.direct_helper", "loot.ask_carrying", "loot.ask_for", "loot.take_down",
     "fire.douse", "fire.smother", "fire.close_bin", "fire.tape_bin", "fire.photograph",
     "fire.halon", "fire.water_ext", "fire.case_to_lav", "fire.case_in_sink",
     "crew.show_photo", "crew.show_burn", "crew.lead", "crew.tell", "crew.move_trolley",
     "cabin.fill_bottle", "cabin.wet_blanket", "cabin.trigger_detector",
     "cabin.stow_trolley", "cabin.galley_drawer",
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
    // A thing is what a click means: a person, a member of crew, the fire, or yourself. It
    // carries ids rather than objects, because undo replaces every object in the world and a
    // card that held on to the old Odette would be a card about somebody who no longer exists.

    function personThing(p) {
        return { kind: "person", key: "person:" + p.id, id: p.id, x: p.x, y: p.y,
                 name: p.name, short: p.name.split(" ")[0] };
    }
    function crewThing(c) {
        return { kind: "crew", key: "crew:" + c.id, id: c.id, x: c.x, y: c.y,
                 name: c.name, short: c.name.split(" ")[0] };
    }
    function fireThing(x, y) {
        return { kind: "fire", key: "fire", x: x, y: y,
                 name: T("The fire"), short: T("the fire") };
    }
    function youThing(S) {
        return { kind: "you", key: "you", x: S.player.x, y: S.player.y,
                 name: S.character.name, short: T("you") };
    }

    /** Is there a fire on this tile worth clicking. Embers count; a warm carpet does not. */
    function fireAt(S, x, y) {
        return S.fire.intensity[cabin.idx(x, y)] > 3;
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
        if (fireAt(S, x, y)) out.push(fireThing(x, y));
        return out;
    }

    // How far inside a body a click has to land on a burning tile before it counts as the
    // person rather than the fire. The fire is the harder of the two to hit, so it gets the
    // edges of the body as well as everything round it.
    const BODY_INSET_IN_FIRE = 2;

    /**
     * What a click at a point would open. The point matters: a person no longer fills their
     * tile, so on a burning seat the body is the person and the flames round it are the fire.
     * On a tile with nothing burning, anywhere on it is the person, because there is nothing
     * else it could mean. The floor is a walk, and the hull is nothing.
     *
     *   { kind: person|crew|you|fire|walk|none, thing, fig, box, siblings }
     *
     * `fig` is the figure as the renderer draws it - its sprite, its offset in a stack, and
     * `box`, where the body is in sprite pixels - for the light drawn round it. `siblings` is
     * everything else on the tile, for the card's tabs, with the target first.
     */
    function targetAt(S, x, y, fx, fy) {
        if (!cabin.inBounds(x, y)) return { kind: "none" };
        const things = thingsAt(S, x, y);
        const burning = fireAt(S, x, y);
        let fig = PRS.render.figureAt(S, x, y, fx === undefined ? 0.5 : fx,
                                      fy === undefined ? 0.5 : fy,
                                      burning ? BODY_INSET_IN_FIRE : -1);
        let thing = null;
        if (fig) thing = things.filter((t) => t.kind === fig.kind && t.id === fig.id)[0] || null;
        if (!thing && burning) { thing = things.filter((t) => t.kind === "fire")[0]; fig = null; }
        if (!thing && things.length) {
            thing = things[0];
            fig = PRS.render.figures(S, x, y).filter((g) => g.id === thing.id)[0] || null;
        }
        if (thing) {
            const rest = things.filter((t) => t !== thing);
            return { kind: thing.kind, thing: thing, fig: fig, box: fig ? fig.box : null,
                     siblings: [thing].concat(rest) };
        }
        if (cabin.solid(x, y)) return { kind: "none" };
        return { kind: "walk" };
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
            if (p.state === "dead") {
                R.empty = T("There is nothing more to be done for {who}.", { who: p.name });
                return R;
            }
            let now = groups[thing.key] || [];
            if (S.player.dragging === p.id) {
                now = now.concat((groups.here || []).filter((e) => e.id === "people.stop_drag"));
            }
            R.near = p.state === "carried" || st.reachable(S).indexOf(p) >= 0;
            const then = R.near ? [] : remote(S, R, p.x, p.y, [thing.key], now,
                { avoidSelf: true, label: T("Walk over to {who}", { who: thing.short }) });
            split(R, now, then);
            if (!now.length && !R.walk) {
                R.empty = T("Nothing you can do for {who} from here.", { who: p.name });
            }
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
                traits: c.hasSeenIt ? T("has seen the locker") : null,
            };
            const now = pick(groups, [thing.key, "crew"]);
            R.near = PRS.crew.adjacentCrew(S).some((q) => q.id === c.id);
            const then = R.near ? [] : remote(S, R, c.x, c.y, [thing.key, "crew"], now,
                { avoidSelf: true, label: T("Walk over to {who}", { who: thing.short }) });
            split(R, now, then);
            if (!now.length && !R.walk) {
                R.empty = T("You cannot get to {who} from here.", { who: c.name });
            }
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
                { avoidSelf: true, label: T("Walk to the fire") });
            split(R, now, then);
            if (!now.length && !R.walk) R.empty = T("You cannot get near it from here.");
            return R;
        }

        if (thing.kind === "you") {
            // The biggest card, on purpose. Yourself, then everything about the place you are
            // standing in - the tap, the drawer, the trolley, the lockers - then where the
            // things in your bag would be worth carrying.
            thing.x = S.player.x; thing.y = S.player.y;
            R.header = youHeader(S);
            const you = groups.you || [];
            const here = groups.here || [];
            const prim = here.filter((e) => rank(e) <= 1);
            const rest = here.filter((e) => rank(e) > 1);
            // Whoever is in your arms comes first, because putting them down is the thing you
            // walked here to do.
            const arms = S.player.carrying.concat(S.player.dragging ? [S.player.dragging] : []);
            const held = [];
            for (const id of arms) {
                for (const e of groups["person:" + id] || []) {
                    if (e.id === "people.put_down" || e.id === "people.stop_drag") held.push(e);
                }
            }
            if (held.length) R.sections.push({ title: T("In your arms"), rows: held });
            if (you.length) R.sections.push({ title: T("Yourself"), rows: you });
            if (prim.length) R.sections.push({ title: T("Here"), rows: prim });
            if (rest.length) {
                R.sections.push(prim.length ? { title: T("More"), rows: rest, more: true }
                                            : { title: T("Here"), rows: rest });
            }
            for (const sec of bagHints(S, you.concat(here))) R.sections.push(sec);
            if (!R.sections.length) R.empty = T("Nothing here but you.");
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
                   label: opts.label || T("Walk there"), detail: cabin.placeName(ap.x, ap.y) };
        const seen = {};
        for (const e of now) seen[e.key] = true;
        return pick(group(previewAt(S, ap.x, ap.y)), keys).filter((e) => !seen[e.key]);
    }

    /**
     * The first few, the rest folded, and then the walk with what comes after it. A card with
     * nothing but a fold on it is a card that says nothing, so if there is nothing to put first
     * the rest is simply shown.
     */
    function split(R, now, then) {
        const prim = now.filter((e) => rank(e) <= 1).slice(0, PRIMARY);
        const rest = now.filter((e) => prim.indexOf(e) < 0);
        if (prim.length) R.sections.push({ rows: prim });
        if (rest.length) R.sections.push({ title: prim.length ? T("More") : null, rows: rest,
                                           more: prim.length > 0 });
        if (R.walk) R.sections.push(walkSection(R.walk, then));
    }

    /** A walk, priced, and what would be possible at the end of it. */
    function walkSection(walk, then) {
        return { title: then.length ? T("Walk there, then") : T("Out of reach"),
                 walk: walk, then: true,
                 rows: then.slice(0, PRIMARY), hidden: Math.max(0, then.length - PRIMARY) };
    }

    /**
     * Where the things in your bag would be useful: the fire, and the tap. Each is a walk and
     * what the bag could do at the end of it, minus anything it can already do from here, so a
     * full bottle at row 9 says "walk to the fire, then pour it", an empty one says "walk to the
     * lavatory, then fill it", and the phone says "walk to the fire, then photograph it". One
     * section per place, whatever is in the bag, so two things that both want the tap are one
     * walk and not two.
     */
    function bagHints(S, now) {
        const out = [];
        const seen = {};
        for (const e of now) seen[e.key] = true;
        const wantsFire = S.inventory.some((s) => !s.spent && !(s.uses !== null && s.uses <= 0));
        const wantsTap = S.inventory.some(function (s) {
            const it = s.item;
            const empty = s.spent || (s.uses !== null && s.uses <= 0);
            return (it.refill === "tap" && (empty || (s.uses !== null && s.uses < it.uses))) ||
                   (it.tags.indexOf("wettable") >= 0 && !s.wet);
        });
        const stops = [];
        const h = hottest(S);
        if (h && wantsFire) {
            stops.push({ x: h.x, y: h.y, label: T("Walk to the fire"), avoidSelf: true });
        }
        if (wantsTap) {
            stops.push({ x: cabin.AFT_GALLEY_X, y: 7, label: T("Walk to the aft lavatory"),
                         exact: true, detail: T("There is a tap in there.") });
        }
        for (const stop of stops) {
            const ap = approach(S, stop.x, stop.y, stop);
            if (!ap || ap.here) continue;
            // Only what the bag could do there: the rows that name a thing you are carrying.
            const rows = previewAt(S, ap.x, ap.y)
                .filter((e) => e.item && st.slotOf(S, e.item) && !seen[e.key] &&
                               !(e.ctx && (e.ctx.p || e.ctx.c || e.ctx.t)))
                .sort(compare);
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
            sub: T("{seat} · {kg}kg · {state} · {condition}",
                   { seat: p.seat, kg: p.kg, state: P.displayState(p),
                     condition: T(cond.label) }),
            traits: p.traits.length
                ? p.traits.map(PRS.data.passengers.traitName).join(", ") : null,
            flag: p.helper ? T("working with you")
                : p.state === "carried" ? T("in your arms")
                : dist > 1 ? T("{n} tiles away", { n: dist }) : null,
        };
    }

    function fireHeader(S, x, y) {
        const c = S.fire.core;
        const i = cabin.idx(x, y);
        const seat = c.inSink
            ? T("The case is in the lavatory basin, under water.")
            : T("The seat of it is the locker above {seat}.",
                { seat: cabin.ORIGIN.row + cabin.ORIGIN.letter }) +
              (c.exposed ? T(" You have seen inside it.") : T(" Nobody has looked inside it."));
        return {
            icon: PRS.fire.fireSprite(Math.max(S.fire.intensity[i], 1)) || "ember", iconScale: 2,
            title: T("The fire"),
            sub: T("{fire} · {where} · smoke {smoke}",
                   { fire: PRS.fire.describe(S.fire, x, y), where: cabin.placeName(x, y),
                     smoke: PRS.fire.describeSmoke(S.fire.smoke[i]) }),
            traits: seat,
        };
    }

    function youHeader(S) {
        const Pl = S.player;
        const face = !Pl.alive ? "pax_down" : Pl.smokeDose > 40 ? "pax_afraid"
                   : Pl.smokeDose > 15 ? "pax_worried" : "pax";
        const lungs = Pl.smokeDose > 70 ? T("lungs failing") : Pl.smokeDose > 40 ? T("lungs bad")
                    : Pl.smokeDose > 15 ? T("coughing") : T("breathing fine");
        const i = cabin.idx(Pl.x, Pl.y);
        const bits = [cabin.placeName(Pl.x, Pl.y), lungs];
        if (S.fire.intensity[i] > 0.5) {
            bits.push(T("fire {what}", { what: PRS.fire.describe(S.fire, Pl.x, Pl.y) }));
        }
        if (S.fire.smoke[i] > 6) {
            bits.push(T("smoke {what}", { what: PRS.fire.describeSmoke(S.fire.smoke[i]) }));
        }
        if (Pl.burns > 15) bits.push(T("burned"));
        if (Pl.carrying.length) bits.push(T("carrying {n}", { n: Pl.carrying.length }));
        if (Pl.dragging) bits.push(T("dragging somebody"));
        // What you have on, by the name of the thing rather than its id.
        const worn = Object.keys(Pl.wearing).filter((k) => Pl.wearing[k])
            .map((k) => { const it = PRS.data.items.byId(k); return T(it ? it.name : k); });
        return {
            icon: face, palette: P.palette(S.character), iconScale: 2,
            title: T("{name} — you", { name: S.character.name }), sub: bits.join(" · "),
            traits: worn.length ? T("wearing {what}", { what: worn.join(", ") }) : null,
        };
    }

    /** The sprite for a thing in your bag, allowing for it being empty or wet. */
    function itemSprite(slot) {
        const name = String(slot.item.sprite).split(":")[1];
        const empty = slot.spent || (slot.uses !== null && slot.uses <= 0);
        if (empty && PRS.atlas.has(name + "_empty")) return name + "_empty";
        if (slot.wet && PRS.atlas.has(name + "_wet")) return name + "_wet";
        return name;
    }

    PRS.hotspots = {
        keysOf, rank, group, pick, previewAt, approach, hottest, thingsAt, targetAt, fireAt,
        personThing, crewThing, fireThing, youThing, itemSprite, resolve,
    };
})(window);
