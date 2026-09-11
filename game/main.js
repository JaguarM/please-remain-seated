// Boot. Load the art into the atlas, check that every deck registered, and put the title up.
//
// Everything in this game is a classic script assigning to one global, because the whole thing
// has to run from a double-clicked index.html and a file:// page will not load an ES module or
// fetch a sibling JSON. The cost of that is the script order in index.html; the benefit is that
// the game is a folder you can open.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    function boot() {
        const n = PRS.atlas.boot();
        const host = document.getElementById("app");
        if (!host) return;

        const problems = selfCheck(n);
        if (problems.length) {
            host.innerHTML = "";
            host.className = "screen prose";
            const box = document.createElement("div");
            box.className = "prose-inner";
            box.innerHTML = "<h2>The aeroplane did not load</h2>";
            const ul = document.createElement("ul");
            for (const p of problems) {
                const li = document.createElement("li");
                li.textContent = p;
                ul.appendChild(li);
            }
            box.appendChild(ul);
            const hint = document.createElement("p");
            hint.textContent = "If you have just regenerated the art, run " +
                "`python pixel-workshop/make_cabin_textures.py` and reload.";
            box.appendChild(hint);
            host.appendChild(box);
            return;
        }

        console.log("PLEASE REMAIN SEATED — " + n + " sprites, " + PRS.actions.count() +
                    " action definitions across " +
                    Object.keys(PRS.actions.deckCounts()).length + " decks.");
        console.log(PRS.actions.deckCounts());

        // The sound setting outlives the tab. Everything else about a run does not.
        PRS.audio.setEnabled(PRS.util.store.get("sound", true) !== false);

        PRS.screens.mount(host);
        PRS.screens.title();
    }

    /** The things that would make the game a blank page, checked out loud instead. */
    function selfCheck(spriteCount) {
        const bad = [];
        if (!spriteCount) bad.push("No sprites loaded. game/art/*.js did not run.");
        for (const key of ["util", "atlas", "audio", "cabin", "fire", "state", "pax", "crew",
                           "actions", "scoring", "render", "hotspots", "play", "screens", "medals",
                           "endings", "events"]) {
            if (!PRS[key]) bad.push("Missing module: PRS." + key);
        }
        if (PRS.actions && PRS.actions.count() < 60) {
            bad.push("Only " + PRS.actions.count() + " actions registered; a deck failed to load.");
        }
        // Every action must have an id and a run, or it will fail in the player's hands and not
        // in mine.
        if (PRS.actions) {
            for (const def of PRS.actions.all()) {
                if (!def.id) bad.push("An action has no id.");
                if (typeof def.run !== "function") bad.push("Action " + def.id + " has no run().");
                if (def.label === undefined) bad.push("Action " + def.id + " has no label.");
            }
        }
        // Every action that names a thing in your bag must name a real one, or the bottle's card
        // will quietly not know about it.
        if (PRS.actions && PRS.data && PRS.data.items) {
            for (const def of PRS.actions.all()) {
                if (typeof def.item === "string" && !PRS.data.items.byId(def.item)) {
                    bad.push("Action " + def.id + " uses an item that does not exist: " + def.item + ".");
                }
            }
        }
        // The data modules the run cannot be built without.
        for (const key of ["characters", "outfits", "items", "passengers"]) {
            if (!PRS.data || !PRS.data[key]) bad.push("Missing data: PRS.data." + key + ".");
        }
        // Every item has to be packable or somewhere in the aeroplane, or nobody can ever hold it.
        if (PRS.data && PRS.data.items) {
            const homeless = PRS.data.items.ITEMS.filter((i) => !i.where && !i.pool);
            if (homeless.length) bad.push(homeless.length + " items are neither packable nor anywhere in the aeroplane.");
        }
        // Every sprite an item names must exist.
        if (PRS.data && PRS.data.items && PRS.atlas) {
            for (const item of PRS.data.items.ITEMS) {
                const name = String(item.sprite).split(":")[1];
                if (!PRS.atlas.has(name)) {
                    bad.push("Item " + item.id + " wants missing sprite " + name + ".");
                }
            }
        }
        // Every passenger's seat must exist in the cabin, and what is in their lap must exist.
        const taken = {};
        if (PRS.data && PRS.data.passengers && PRS.cabin) {
            for (const row of PRS.data.passengers.ROSTER) {
                const seat = row[1];
                taken[seat] = row[0];
                const x = PRS.cabin.xOfRow(parseInt(seat, 10));
                const y = PRS.cabin.yOfLetter(seat.replace(/[0-9]/g, ""));
                if (x === null || y === null) bad.push("Seat " + seat + " is not in this aircraft.");
                if (row[9] && !PRS.data.items.byId(row[9])) {
                    bad.push(row[0] + " is holding an item that does not exist: " + row[9] + ".");
                }
            }
        }
        // And every character's seat must be a real, empty one, with a bag of real things.
        if (PRS.data && PRS.data.characters && PRS.data.items && PRS.cabin) {
            for (const ch of PRS.data.characters.CHARACTERS) {
                const x = PRS.cabin.xOfRow(parseInt(ch.seat, 10));
                const y = PRS.cabin.yOfLetter(ch.seat.replace(/[0-9]/g, ""));
                if (x === null || y === null) bad.push(ch.name + " sits in " + ch.seat + ", which is not in this aircraft.");
                if (taken[ch.seat]) bad.push(ch.name + " sits in " + ch.seat + ", which is " + taken[ch.seat] + "'s.");
                for (const id of ch.bag) {
                    if (!PRS.data.items.byId(id)) bad.push(ch.name + " boards with an item that does not exist: " + id + ".");
                }
                for (const id of ch.kit) {
                    if (ch.bag.indexOf(id) < 0) bad.push(ch.name + "'s kit has " + id + " in it, and the bag does not.");
                }
                if (ch.unlock && typeof ch.unlock === "object" && PRS.medals &&
                    !PRS.medals.BY_ID[ch.unlock.medal]) {
                    bad.push(ch.name + " is locked behind '" + ch.unlock.medal + "', which no medal grants.");
                }
            }
        }
        return bad.slice(0, 12);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    PRS.boot = boot;
    PRS.selfCheck = selfCheck;
})(window);
