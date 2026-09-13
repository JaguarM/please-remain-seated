# Please Remain Seated — pixel art brief

A cabin fire on a narrowbody, seen top-down. The player is a passenger. Sprites must read at
16×16 on a moving, smoke-covered grid — **silhouette and state legibility beat detail every
time.** If a sprite is beautiful but the player cannot tell a frightened passenger from a
sleeping one at a glance, it has failed.

This brief covers three groups: **the palette contract**, **fire and smoke**, and **passengers**.

---

## 0. Format — read this first

Sprites are not PNGs. Each is an ASCII grid plus a colour map:

```json
"pax": {
  "palette": { "h": "#2b2118", "s": "#d9a279", "c": "#4a5a86", "e": "#413024" },
  "rows": [
    "................",
    ".....hhhhhh.....",
    "....hssssssh...."
  ]
}
```

One character per pixel. `.` is transparent. Any other character indexes `palette`.

**You may deliver indexed PNGs or Aseprite files** — we convert. But the work must be authored
*as indexed colour*, one palette slot per meaning. A flat RGBA export loses the thing the whole
renderer is built on (see §1). Aseprite indexed mode with a locked palette is the way.

- Canvas: **16×16**, no exceptions in these three groups.
- Colour budget: **4–8 slots per sprite.** `pax` uses 8, `smoke_2` uses 1.
- No anti-aliasing, no partial alpha. A pixel is one palette slot or transparent.
- Sprites are drawn on a dark cabin and often under a smoke overlay. Keep a dark outline or a
  hard value break at the edge so nothing dissolves into the floor.

---

## 1. The palette contract (most important section)

Passengers are **not** individually drawn. There is one `pax` sprite, and the game swaps its
palette per person at draw time — hundreds of distinct-looking people from one 16×16 map. The
letters are a fixed API. Draw with these meanings or the recolour produces nonsense:

| Slot | Meaning | Set by |
|---|---|---|
| `h` | hair | roster (any hue) |
| `s` | skin | roster (any hue) |
| `c` | shirt / clothing | roster (any hue) |
| `g` | long hair if they have it, otherwise skin | derived — **must work as either** |
| `e` | eyes | skin darkened 30% |
| `b` | brow | skin darkened 46% |
| `m` | mouth | skin darkened 40% |
| `l` | eyelids | skin darkened 72% |

Three consequences to design around:

1. **`h`, `s`, `c` are arbitrary at runtime.** Dark hair on dark skin, a navy shirt against a navy
   seat. Do not rely on the specific hex values in the current sprites for contrast — rely on
   *shape*. The colours quoted in this brief are one sample of the roster, not the design.
2. **`e`/`b`/`m`/`l` are computed from skin, not chosen.** You cannot pick a mouth colour. You
   choose *where the mouth pixels go*. All facial expression is geometry.
3. **`g` is drawn as hair on some people and as skin on others.** Any pixel you mark `g` must look
   right both ways — it is the side-of-head area. Getting this wrong is the most common failure.

**Any letter not in that table keeps the colour you drew it in, permanently.** Use this
deliberately: an outline slot `k`, a shoe slot, a seatbelt slot. Those are yours and are never
overridden.

Dead passengers reuse the same map with every slot darkened 62%. Nothing extra to draw — but
check your shapes still read when the whole sprite is muddy and low-contrast.

---

## 2. Fire and smoke

### Fire intensity ladder

Fire is one number per tile. The sprite is picked by threshold:

| Intensity | Sprite | Should read as |
|---|---|---|
| 0.5 – 6 | `ember` | Something is wrong here. Sparse, dark, mostly transparent. |
| 6 – 20 | `fire_1` | A seat cushion has caught. Small, low, contained. |
| 20 – 45 | `fire_2` | Established. Fills the tile, clear flame shapes. |
| 45 – 72 | `fire_3` | Bad. Dense, white-hot core appearing. |
| 72+ | `fire_4` | Unsurvivable. Near-solid, white core. |

**The ladder must be readable as a ladder.** A player glancing at the cabin needs to rank burning
tiles by threat instantly. Escalate on all three of: coverage (how much of the 16×16 is opaque),
value (how much white-hot core), and density (how few gaps). Do not escalate on hue alone.

Current `fire_2` palette as a reference for the scale — `r` #7a2408 dark, `o` #e8641a orange,
`y` #ffa32a amber, `w` #ffd860 hot. You may revise these; keep four steps.

### The `b` variants

Every fire level needs an alternate: `fire_1b`, `fire_2b`, `fire_3b`, `fire_4b`. The renderer
picks between `fire_N` and `fire_Nb` by tile parity, **not** by time — so a row of burning seats
is not a row of identical stamps. These are not animation frames. They are the *same intensity,
differently shaped*: mirror the flame masses, move the gaps, shift the core off-centre. Same
coverage, same value range, different silhouette.

### The blue family

When the extinguisher pack itself ignites it burns as a jet, not a fire, and it is off the orange
scale entirely. Five sprites, all of which already exist and are being replaced like the rest:

`fire_blue`, `fire_blueb`, and the seat composites `seat_{top,mid,bot}_fire_blue`.

It must read as categorically different from the orange ladder at a glance — the player needs to
know instantly that this tile is not a furnishing burning. Cool blues and whites, hard-edged and
directional rather than licking. It should look like pressurised chemistry. There is no intensity
ladder here: blue is blue, one level, plus the usual parity variant (`fire_blueb`) so two adjacent
blue tiles are not identical stamps.

### Smoke

`smoke_1`, `smoke_2`, `smoke_3` at intensity 6 / 26 / 58. These overlay everything, including
passengers, so they are **holes, not clouds** — the current sprites are a single grey with
scattered transparent pixels, and the density of the holes is the entire effect. `smoke_1` should
leave the tile mostly legible; `smoke_3` should nearly erase it. One or two colour slots. Resist
the urge to render volume; this is an occlusion mask.

### Seat-fire composites

`seat_{top,mid,bot}_fire_{1,2,3,4}` — 12 sprites. A seat is drawn in three horizontal slices, and
when it burns the fire is composited into the slice rather than drawn over it. Fire in `_top`
should sit differently than in `_bot`. Also needed: `_scorched` and `_burnt` per slice (6 more)
for after the fire passes — scorched is survivable damage, burnt is a write-off.

---

## 3. Passengers

One base body, many states. All 16×16, all obeying §1.

### Adults (`pax` family)

| Sprite | When | Must read as |
|---|---|---|
| `pax` | default | Upright, seated, composed |
| `pax_relieved` | someone is helping them | Calm — visibly better than `pax` |
| `pax_worried` | fear 27+ | Tense but functional |
| `pax_afraid` | fear 62+ | Panicking |
| `pax_asleep` | asleep | Eyes closed, head tipped — **not** the same as unconscious |
| `pax_low` | being carried, or a helper has hold | Horizontal / crouched |
| `pax_down` | unconscious | Slumped, unmistakably not upright |
| `pax_gone` | dead | Slumped, eyes **not** crossed — see note |

**The four-step expression ladder (relieved → default → worried → afraid) is the hardest thing in
this brief.** You have geometry only: `e` eyes, `b` brow, `m` mouth, `l` eyelids, positioned in
roughly a 6×3 pixel area, in colours you do not control. Brow angle and mouth width are your main
instruments. Each step must be distinguishable from its neighbours at 1× on a smoky screen.

**On `pax_gone`:** the flight does not know who it has lost. Nobody in the cabin wears a death
face. Draw them slumped and ambiguous — the report tells the player, the sprite does not. No
crossed eyes, no X eyes. This is deliberate and non-negotiable.

**`pax_down`, `pax_asleep` and `pax_low`** are three different horizontals and players confuse
them. Give each a distinct posture, not merely a different face.

### Children (`child` family)

`child`, `child_worried`, `child_afraid`, `child_asleep`, `child_relieved`, `child_gone`.

Same states, same palette contract, smaller frame. Must be identifiable as a child from silhouette
alone at a glance — the player makes triage decisions on this. Note there is no `child_down` or
`child_low`; children fall back to the adult sprites when carried.

### Carried

`carried`, `carried_b`, `carried_pet` — a body across the player's chest, head to one side and
feet the other. `carried_b` is the same body reversed, so when the player has two people the heads
sit at opposite ends and both stay visible. These draw in the carried person's own palette, over
the player, so they need a strong outline against an arbitrary shirt colour.

### Crew

Crew reuse `pax`, `pax_worried` and `pax_afraid` with a crew palette. There are separate `crew`
and `purser` sprites for the roster UI. Nothing extra to draw for the cabin itself.

---

## 4. Deliverable

Per sprite: an indexed PNG or Aseprite frame, 16×16, palette slots named per §1 where the sprite
is palette-driven. A single Aseprite file with one tagged frame per sprite is ideal.

Please deliver **`pax` plus the four expression states first**, as a paid test — that exercises
the palette contract, the `g` slot and the expression ladder in one go. If those work, the rest is
straightforward.

Priority order after that: fire ladder → smoke → remaining passenger states → seat composites →
the blue family.

Total in scope for this brief: **100 sprites**, of which roughly 45 are original designs and the
rest are state and parity variants derived from them.
