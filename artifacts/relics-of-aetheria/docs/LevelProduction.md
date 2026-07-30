# Level Production — Relics of Aetheria

M15: World 1 – Level 1 Production Build

This document describes the complete workflow for producing a level to production quality, using World 1 – Level 1 as the canonical example.

---

## World 1 Production Workflow

### Level Identity

| Field         | Value                        |
|---------------|------------------------------|
| ID            | `world01_level01`            |
| Display name  | Jungle Ruins — Entry         |
| World         | `world01_jungle`             |
| Map file      | `assets/maps/level1.json`    |
| Tileset key   | `TILESET_WORLD01` (= `tiles`)|

The level manifest entry at `src/world/LevelManifest.ts` is the single source of truth for all per-level settings.

### Environment Configuration (as of M15)

```ts
{
  backgroundTheme:    'jungle_day',      // 5-layer jungle parallax
  decorationPreset:   'jungle_ruins',    // broken statues, skulls, rocks, carvings
  weatherPreset:      'none',            // no weather effects yet
  animatedTilePreset: 'jungle_water',    // water flow + waterfall animations active
  // music / ambientSound: not yet wired (fields reserved for future audio pass)
}
```

---

## Level Art Guidelines

### Tile Layer Roles

| Layer            | Role                                    | Affects collision? |
|------------------|-----------------------------------------|--------------------|
| `Background`     | Sky fills, water pools, cave hints      | No                 |
| `Ground`         | Structural surface tiles (visual)       | No                 |
| `Platforms`      | Platform tiles (visual)                 | No                 |
| `Collision`      | Exact physics hitboxes — **DO NOT EDIT**| **Yes — only this**|
| `Decoration_Back`| Props rendered behind the player        | No                 |
| `Decoration_Front`| Props rendered in front of the player  | No                 |

**Rule**: Only the `Collision` layer drives physics. All other layers are purely visual.

### GID Reference (procedural tileset — BootScene)

| GID | Tile              | Use                                 |
|-----|-------------------|-------------------------------------|
| 1   | Ground (dark navy)| Legacy — replaced by types below    |
| 2   | Platform          | Legacy — replaced by types below    |
| 3   | Temple block      | Main structural stone               |
| 4   | Stone wall        | Boundary walls, left/right edges    |
| 5   | Cracked ruins     | Worn temple surfaces, cliff faces   |
| 6   | Grass             | Surface edges, platform tops        |
| 7   | Moss              | Overgrown surfaces, mid-zone platforms |
| 8–10| Water frames      | Animated — use via `AnimatedTileSystem` |
| 11–13| Waterfall frames | Animated — vertical water streams   |
| 14–16| Torch frames     | Animated — indoor torch effects     |
| 17–19| Crystal frames   | Animated — shrine glow effect       |
| 20–22| Leaves frames    | Animated — canopy leaf motion       |
| 23  | Plant / fern      | `Decoration_Back` — entrance zone   |
| 24  | Flower            | `Decoration_Back` — entrance zone   |
| 25  | Root              | `Decoration_Back` — below platforms |
| 26  | Broken statue     | `Decoration_Back` — ruins zone      |
| 27  | Skull             | `Decoration_Back` — temple zone     |
| 28  | Rock              | `Decoration_Back` or `_Front`       |
| 29  | Temple carving    | `Decoration_Back` — walls           |
| 30  | Fallen pillar     | `Decoration_Front` — ruins          |
| 31  | Wooden bridge     | `Platforms` — bridge surfaces       |
| 32  | Reserved          | Do not use                          |

### Environmental Zones (World 1 – Level 1)

```
Col  0- 25   Entrance zone      Grass + moss, plants, flowers, broken statues
Col 26- 54   Temple approach    Moss + cracked stone, roots hanging, waterfall A
Col 55- 79   Temple zone        Temple block + cracks, skulls, carvings, fallen pillars
```

### Parallax Layer Tuning (M15)

| Layer             | ScrollX | ScrollY | Depth |
|-------------------|---------|---------|-------|
| Sky / sun disk    | 0.02    | 0.0     | -25   |
| Cloud / fog wisps | 0.015   | 0.0     | -22   |
| Far jungle        | 0.06    | 0.01    | -20   |
| Mid canopy        | 0.14    | 0.03    | -15   |
| Foreground fronds | 0.28    | 0.04    | -5    |

**Rule**: Keep all parallax scroll factors below 0.30. Faster movement creates visual distraction on small screens. The foreground layer (depth -5) sits just in front of world tiles; its depth value must remain negative to stay behind the player and UI.

---

## Decoration Rules

1. **Never place decorations in the `Collision` layer.** Only visual layers receive decoration tiles.
2. **Decorations must not block critical navigation.** Avoid placing tiles in the row the player's feet occupy during a required movement (jumps, crouch passages).
3. **No overlapping decorations.** Each cell in `Decoration_Back` and `Decoration_Front` should hold at most one tile.
4. **Back vs Front**:
   - `Decoration_Back` — renders behind the player sprite. Use for ground-level props (rocks, plants, statues), wall decorations, and hanging roots.
   - `Decoration_Front` — renders in front of the player. Use sparingly; it can obscure the player. Only use for foreground elements (fallen pillars, large rocks) that add depth and are clearly out of the critical path.
5. **Decoration density guide**:
   - Entrance zone: light coverage (plants, flowers, 1–2 statues)
   - Temple approach: medium (roots, rocks, 2–3 statues)
   - Temple zone: heavy (skulls, carvings, fallen pillars)

### Positions to Avoid

Always check against game object positions before placing decoration tiles:

| Col | Row | Object            |
|-----|-----|-------------------|
| 3   | 18  | Player spawn      |
| 10  | 17  | Crystal 1         |
| 24  | 11  | Crystal 2         |
| 38  | 15  | Crystal 3         |
| 38  | 18  | Checkpoint        |
| 52  | 11  | Crystal 4         |
| 70  | 17  | Crystal 5         |
| 76–78| 18 | Level exit        |

---

## Visual Consistency Rules

1. **Surface tiles must match the zone.** Use grass/moss for the entrance zone, moss/cracks for the approach, stone/cracks for the temple zone (see Environmental Zones above).
2. **Platform type must reflect height.** Low platforms = wood bridge. Mid platforms = moss or stone. High platforms = cracked stone (more worn from exposure).
3. **Left boundary**: Column 0 always uses GID 4 (stone wall) as the level border.
4. **Sub-floor**: Rows 20–21 always use GID 3 (temple block) as the underground layer.
5. **Water placement**: Water tiles (GIDs 8–11) go in the `Background` layer only — they are never placed in the `Collision` layer. They create a visual impression of pools/waterfalls without affecting physics.
6. **Waterfall columns**: Always accompany a water pool below. Use GID 11 (waterfall) in the column directly above the pool, starting from the row below the platform or ceiling.

---

## Animated Environment Workflow

### Enabling Animated Tiles

1. Set `animatedTilePreset` in the manifest entry:
   - `'none'` — no tile animation
   - `'jungle_water'` — water flow + waterfall animations
   - `'jungle_full'` — water + torch + crystal + leaves
2. Place the matching source tiles in a visible tile layer (usually `Background`):
   - Water pool: GID 8 (first water frame — `AnimatedTileSystem` registers the 3-frame loop)
   - Waterfall: GID 11 (first waterfall frame — system registers 3-frame loop)
   - Torch: GID 14 (first flame frame)
   - Crystal shrine: GID 17 (first shimmer frame)
3. Verify in-game via **F7 debug panel** → `AnimTls` should show the count and animation names.

### Animation Frame Durations

| Type          | Frames | Duration each |
|---------------|--------|---------------|
| Water flow    | 3      | 200 ms        |
| Waterfall     | 3      | 150 ms        |
| Torch flame   | 3      | 80–100 ms     |
| Crystal shimmer| 3     | 250–300 ms    |
| Moving leaves | 3      | 200–250 ms    |

---

## Level Flow Reference

```
[SPAWN] ──► [Platform 1] ──► [Crystal 1] ──► [Platform 2] ──► [Crystal 2]
  col 3       row 15           col 10           row 12           col 24

──► [Waterfall A] ──► [Platform 3] ──► [Checkpoint] ──► [Crystal 3]
      col 30           row 9             col 38           col 38

──► [Crystal 4] ──► [Platform 4] ──► [Waterfall B] ──► [Crystal 5] ──► [EXIT]
      col 52           row 6             col 62           col 70         col 76
```

### Zone Purposes

| Area                   | Cols   | Purpose                                      |
|------------------------|--------|----------------------------------------------|
| Entrance               | 0–15   | Tutorial movement, first crystal             |
| Climbing section       | 16–30  | Ascending platforms, Waterfall A visual      |
| Midpoint               | 31–45  | Checkpoint, crystal near checkpoint          |
| High run               | 46–61  | High platform challenge, crystal jump        |
| Temple exit            | 62–79  | Waterfall B, final crystal, level exit       |

### Hidden Areas

- **Waterfall A** (col 30, rows 13–18): the waterfall visual hints at a hidden passage. Future maps can add a cave tile layer here.
- **Cave entrance** (behind exit area, cols 72–74): flagged for future secret room development.

---

## F7 Debug Reference (M15)

Press **F7** in-game to toggle the environment debug panel.

| Label     | Field               | Description                             |
|-----------|---------------------|-----------------------------------------|
| World     | `worldPreset`       | World identifier from manifest          |
| Level     | `levelDisplayName`  | Human-readable level name               |
| Tileset   | `loadedTilesets`    | Tileset names loaded by the current map |
| BgTheme   | `backgroundTheme`   | Active parallax theme                   |
| BgLyrs    | `parallaxLayerCount`| Number of parallax layers active        |
| AnimTls   | `animatedTileCount` | Animated tile types + names             |
| DecoSet   | `decorationPreset`  | Active decoration preset name           |
| DecoTls   | `decorationCount`   | Non-empty decoration tiles in Back+Front|
