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
                "`python pixel-workshop/make_cabin_textures.py` and " +
                "`python tools/bundle_nauvis_sprites.py` and reload.";
            box.appendChild(hint);
            host.appendChild(box);
            return;
        }

        console.log("PLEASE REMAIN SEATED — " + n + " sprites, " + PRS.actions.count() +
                    " action definitions across " +
                    Object.keys(PRS.actions.deckCounts()).length + " decks.");
        console.log(PRS.actions.deckCounts());

        PRS.screens.mount(host);
        PRS.screens.title();
    }

    /** The things that would make the game a blank page, checked out loud instead. */
    function selfCheck(spriteCount) {
        const bad = [];
        if (!spriteCount) bad.push("No sprites loaded. game/art/*.js did not run.");
        for (const key of ["util", "atlas", "audio", "cabin", "fire", "state", "pax", "crew",
                           "actions", "scoring", "render", "play", "screens", "medals",
                           "endings", "events"]) {
            if (!PRS[key]) bad.push("Missing module: PRS." + key);
        }
        if (PRS.actions && PRS.actions.count() < 100) {
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
        // The data modules the run cannot be built without.
        for (const key of ["characters", "outfits", "items", "passengers"]) {
            if (!PRS.data || !PRS.data[key]) bad.push("Missing data: PRS.data." + key + ".");
        }
        // Every item has to live somewhere, or the bag screen and the aeroplane disagree.
        if (PRS.data && PRS.data.items) {
            const homeless = PRS.data.items.ITEMS.filter((i) => !i.where);
            if (homeless.length) bad.push(homeless.length + " items have no `where`.");
        }
        // Every character's unlock has to be a key some medal actually grants.
        if (PRS.data && PRS.data.characters && PRS.medals) {
            const granted = {};
            for (const m of PRS.medals.MEDALS) if (m.unlocks) granted[m.unlocks] = true;
            for (const ch of PRS.data.characters.CHARACTERS) {
                if (ch.locked && !granted[ch.unlockKey]) {
                    bad.push(ch.name + " is locked behind '" + ch.unlockKey +
                             "', which no medal grants.");
                }
            }
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
        // Every passenger's seat must exist in the cabin.
        if (PRS.data && PRS.data.passengers && PRS.cabin) {
            for (const row of PRS.data.passengers.ROSTER) {
                const seat = row[1];
                const x = PRS.cabin.xOfRow(parseInt(seat, 10));
                const y = PRS.cabin.yOfLetter(seat.replace(/[0-9]/g, ""));
                if (x === null || y === null) bad.push("Seat " + seat + " is not in this aircraft.");
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
