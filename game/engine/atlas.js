// The sprite atlas: pixelmap.js's drawSprite, plus the cache the cabin needs to draw two hundred
// and seventy tiles sixty times a second without repainting a thousand fillRects each frame.
//
// The maps come from two places and neither knows about the other:
//   window.PRS_ART.cabin    make_cabin_textures.py     seats, people, fire, the loadout
//   window.PRS_ART.nauvis   pixel-workshop/sprites.json  the modpack's item icons, reused
//
// A passenger is one map and a palette override, so `key(name, override)` has to be cheap and
// stable: it is the sprite name and the overridden colours in key order, and every distinct
// combination is rendered once into an offscreen canvas and then blitted.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};
    const MISSING = "#ff00ff";

    const sheets = {};
    const cache = new Map();
    let cacheHits = 0, cacheMisses = 0;

    function register(bundle) {
        if (!bundle) return;
        for (const name in bundle) sheets[name] = bundle[name];
    }

    function boot() {
        register(global.PRS_ART && global.PRS_ART.nauvis);
        register(global.PRS_ART && global.PRS_ART.cabin);
        return Object.keys(sheets).length;
    }

    function get(name) {
        return sheets[name] || null;
    }

    function has(name) {
        return Object.prototype.hasOwnProperty.call(sheets, name);
    }

    function names() {
        return Object.keys(sheets).sort();
    }

    /** Straight to a context, the way pixelmap.js does it. For one-offs and for the editor. */
    function draw(ctx, name, x, y, scale, override) {
        const sprite = sheets[name];
        if (!sprite) return false;
        const palette = override ? Object.assign({}, sprite.palette, override) : sprite.palette;
        const rows = sprite.rows;
        scale = scale || 1;
        for (let r = 0; r < rows.length; r++) {
            const line = rows[r];
            let c = 0;
            while (c < line.length) {
                const ch = line[c];
                if (ch === ".") { c++; continue; }
                // Runs of one colour become one fillRect. Airline seats are mostly flat, so this
                // is the difference between four thousand rects a frame and four hundred.
                let end = c + 1;
                while (end < line.length && line[end] === ch) end++;
                ctx.fillStyle = palette[ch] || MISSING;
                ctx.fillRect(x + c * scale, y + r * scale, (end - c) * scale, scale);
                c = end;
            }
        }
        return true;
    }

    function cacheKey(name, scale, override) {
        if (!override) return name + "@" + scale;
        let k = name + "@" + scale;
        const keys = Object.keys(override).sort();
        for (const key of keys) k += "|" + key + override[key];
        return k;
    }

    /** A canvas holding the sprite, made once and kept. Everything on screen goes through here. */
    function stamp(name, scale, override) {
        const key = cacheKey(name, scale, override);
        const hit = cache.get(key);
        if (hit) { cacheHits++; return hit; }
        cacheMisses++;
        const sprite = sheets[name];
        const w = sprite ? Math.max.apply(null, sprite.rows.map((r) => r.length)) : 16;
        const h = sprite ? sprite.rows.length : 16;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, w * scale);
        canvas.height = Math.max(1, h * scale);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        if (!sprite) {
            // A missing sprite is drawn as the checker, not skipped, so it is impossible to ship.
            ctx.fillStyle = MISSING;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
            ctx.fillRect(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);
        } else {
            draw(ctx, name, 0, 0, scale, override);
        }
        cache.set(key, canvas);
        return canvas;
    }

    /** Blit a cached stamp. The hot path: called a few hundred times a frame. */
    function blit(ctx, name, x, y, scale, override) {
        ctx.drawImage(stamp(name, scale, override), x | 0, y | 0);
    }

    /** Blit with alpha, for smoke and for the ghost of a passenger you are carrying. */
    function blitAlpha(ctx, name, x, y, scale, alpha, override) {
        if (alpha <= 0.004) return;
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * Math.min(1, alpha);
        ctx.drawImage(stamp(name, scale, override), x | 0, y | 0);
        ctx.globalAlpha = prev;
    }

    /** An <img>-able data URL, for the DOM screens: character portraits, the item grid. */
    const urlCache = new Map();
    function dataUrl(name, scale, override) {
        const key = cacheKey(name, scale, override);
        let url = urlCache.get(key);
        if (!url) {
            url = stamp(name, scale, override).toDataURL();
            urlCache.set(key, url);
        }
        return url;
    }

    /** A DOM node showing a sprite, which is most of what the menus are made of. */
    function icon(name, scale, override, className) {
        const img = document.createElement("img");
        img.src = dataUrl(name, scale || 2, override);
        img.className = "spr " + (className || "");
        img.alt = "";
        img.draggable = false;
        return img;
    }

    function stats() {
        return { sprites: Object.keys(sheets).length, stamps: cache.size,
                 hits: cacheHits, misses: cacheMisses };
    }

    PRS.atlas = { boot, register, get, has, names, draw, stamp, blit, blitAlpha, dataUrl, icon,
                  stats, MISSING };
})(window);
