// Draw a sprite defined as an ASCII map plus a palette, the way ProjectNauvis draws its item
// icons: one map, and a palette per colour variant. See sprites.json for every sprite the pack
// ships, and WORKSHOP-README.md for the conventions behind the maps.
//
//   import { drawSprite, spriteCanvas } from "./pixelmap.js";
//   import sprites from "./sprites.json" with { type: "json" };
//
//   const potion = spriteCanvas(sprites.automation_science_pack, 4);          // 64x64 canvas
//   const bluePotion = spriteCanvas(sprites.automation_science_pack, 4, {
//       c: "#3496de", b: "#8ed8fa", d: "#1a5698",                            // swap the liquid
//   });
//   drawSprite(ctx, sprites.pistol, x, y, 3);                                 // straight to a context
//
// A sprite is { rows: ["....", ...], palette: { d: "#262830", ... } }; "." is transparent and any
// character missing from the palette is drawn in magenta so the hole is seen, not hidden.

const MISSING = "#ff00ff";

/** Draw `sprite` onto `ctx` with its top-left at (x, y), each map cell `scale` pixels square. */
export function drawSprite(ctx, sprite, x, y, scale = 1, paletteOverride = {}) {
    const palette = { ...sprite.palette, ...paletteOverride };
    const rows = sprite.rows;
    for (let row = 0; row < rows.length; row++) {
        const line = rows[row];
        for (let col = 0; col < line.length; col++) {
            const key = line[col];
            if (key === ".") continue;
            ctx.fillStyle = palette[key] ?? MISSING;
            ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
        }
    }
}

/** A new canvas holding `sprite` at `scale`, for caching or for use as an image source. */
export function spriteCanvas(sprite, scale = 1, paletteOverride = {}) {
    const width = Math.max(...sprite.rows.map(line => line.length));
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = sprite.rows.length * scale;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    drawSprite(ctx, sprite, 0, 0, scale, paletteOverride);
    return canvas;
}

/** The same sprite with some palette keys replaced: one map, many items. */
export function recolour(sprite, paletteOverride) {
    return { rows: sprite.rows, palette: { ...sprite.palette, ...paletteOverride } };
}

/** Parse a map written as one multi-line string, blank leading and trailing lines dropped. */
export function parseMap(text) {
    const lines = text.split("\n");
    while (lines.length && lines[0].trim() === "") lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    return lines;
}
