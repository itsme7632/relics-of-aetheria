# Tileset Pipeline — Relics of Aetheria

M16: Emerald Jungle Production Tileset Integration

This document covers the full lifecycle of tilesets in Relics of Aetheria — from folder layout to production import, validation rules, and the fallback workflow.

---

## Folder Structure

```
artifacts/relics-of-aetheria/
├── assets/
│   └── worlds/
│       └── world01_jungle/
│           └── tilesets/
│               ├── tileset.png          ← Main production tileset (32 cols × 1 row)
│               ├── tileset_anim.png     ← Animated tile atlas (future)
│               └── tileset_deco.png     ← Decorative tile atlas (future)
└── src/
    └── assets/
        ├── AssetKeys.ts                 ← Keys + paths (WORLD01_TILESET_PATHS)
        ├── TilesetRegistry.ts           ← Runtime state: source, dimensions, atlas flags
        └── AssetManifest.ts             ← Non-tileset assets only
```

**Rule**: The `assets/worlds/<world>/tilesets/` folder is the delivery target for production artwork. Drop the file, restart the dev server — the engine detects and loads it automatically with no code changes required.

---

## Tileset Requirements

### Main tileset (`tileset.png`)

| Property     | Required value           |
|--------------|--------------------------|
| Tile size    | 32 × 32 px               |
| Layout       | Horizontal strip, 1 row  |
| Columns      | 32                       |
| Total size   | 1024 × 32 px             |
| Format       | PNG (RGBA or RGB)        |
| Transparency | Supported                |

**GID layout** (must match `BootScene.generateTilesetTexture()` column order):

| GID | Tile              | Notes                                 |
|-----|-------------------|---------------------------------------|
| 1   | Ground / solid    | Main walkable surface                 |
| 2   | Platform          | Legacy — override with types below    |
| 3   | Temple block      | Primary structural stone              |
| 4   | Stone wall        | Boundary walls                        |
| 5   | Cracked ruins     | Worn surfaces                         |
| 6   | Grass             | Surface edges, platform tops          |
| 7   | Moss              | Overgrown platforms                   |
| 8   | Water frame 1     | Animation source tile                 |
| 9   | Water frame 2     | Animation frame                       |
| 10  | Water frame 3     | Animation frame                       |
| 11  | Waterfall frame 1 | Animation source tile                 |
| 12  | Waterfall frame 2 | Animation frame                       |
| 13  | Waterfall frame 3 | Animation frame                       |
| 14  | Torch frame 1     | Animation source tile                 |
| 15  | Torch frame 2     | Animation frame                       |
| 16  | Torch frame 3     | Animation frame                       |
| 17  | Crystal frame 1   | Animation source tile                 |
| 18  | Crystal frame 2   | Animation frame                       |
| 19  | Crystal frame 3   | Animation frame                       |
| 20  | Leaves frame 1    | Animation source tile                 |
| 21  | Leaves frame 2    | Animation frame                       |
| 22  | Leaves frame 3    | Animation frame                       |
| 23  | Plant / fern      | Decoration                            |
| 24  | Flower            | Decoration                            |
| 25  | Root              | Decoration                            |
| 26  | Broken statue     | Decoration                            |
| 27  | Skull             | Decoration                            |
| 28  | Rock              | Decoration                            |
| 29  | Temple carving    | Decoration                            |
| 30  | Fallen pillar     | Decoration                            |
| 31  | Wooden bridge     | Structural platform surface           |
| 32  | Reserved          | Leave transparent                     |

### Animated tile atlas (`tileset_anim.png`) — future

This atlas will hold multi-row animated frames once the animated tile artwork is delivered. Until then, `AnimatedTileSystem` uses GIDs 8–22 from the main tileset for procedurally-drawn animation frames.

### Decorative tile atlas (`tileset_deco.png`) — future

Reserved for a dedicated decoration sprite sheet when the decoration artwork is delivered. Until then, GIDs 23–30 from the main tileset provide the decoration visuals.

---

## Import Workflow

### Replacing the procedural tileset

1. Export your tileset from Aseprite / Photoshop / Tiled as a 1024×32 PNG.
2. Name it `tileset.png` and place it in:
   ```
   artifacts/relics-of-aetheria/assets/worlds/world01_jungle/tilesets/tileset.png
   ```
3. Restart the dev server (`pnpm --filter @workspace/relics-of-aetheria run dev`).
4. The engine detects the file automatically — no code changes needed.
5. Verify via **F7 debug panel**: `TsSrc` should show `production`.

**No manifest entry is needed.** The tileset is loaded directly in `BootScene.preload()` via `WORLD01_TILESET_PATHS.tileset`.

### Delivering the animated tile atlas

1. Place `tileset_anim.png` in the same tilesets folder.
2. Restart the dev server.
3. F7 `AnimAk` will show `yes`.

### Delivering the decorative tile atlas

1. Place `tileset_deco.png` in the same tilesets folder.
2. Restart the dev server.
3. F7 `DecoAk` will show `yes`.

---

## Production Tileset Load Flow

```
BootScene.preload()
  ├── WorldManager.preloadAll()            — map JSONs
  ├── AssetLoader.loadAll()               — art / audio / fonts
  └── this.load.image('tiles', WORLD01_TILESET_PATHS.tileset)   ← always attempted
      this.load.image('tiles_world01_anim', ...)                ← atlas slot
      this.load.image('tiles_world01_deco', ...)                ← atlas slot

BootScene.create()
  ├── textures.exists('tiles')?
  │     YES → source = 'production'  (no procedural generation)
  │     NO  → source = 'procedural'  → generateTilesetTexture()
  └── TilesetRegistry.record({ source, width, height, tileCount, ... })
```

`TilesetRegistry` is a session-scoped singleton. `GameScene._buildAssetDebugInfo()` reads it to populate the F7 panel.

---

## Replacement Workflow

When production artwork replaces the procedural tileset, follow this checklist:

- [ ] Confirm tile size is 32×32 px
- [ ] Confirm sheet is exactly 1024×32 px (32 tiles × 1 row)
- [ ] Confirm column order matches the GID table above
- [ ] GIDs 8–22 should visually contain animation frame pairs that `AnimatedTileSystem` will drive (system replaces static appearance with animation at runtime)
- [ ] GIDs 23–30 should contain decoration tiles that match what `DecorationSystem` expects
- [ ] GID 32 (col 31) should be transparent / reserved
- [ ] Test by running the game and pressing F7 — verify `TsSrc: production`, correct dimensions, animation names show in `AnimTls`

---

## Validation Rules

`MapValidator.validate()` runs on every level load and reports:

| Check                     | Severity | Description                                                  |
|---------------------------|----------|--------------------------------------------------------------|
| Missing tileset           | error    | `map.tilesets` is empty                                      |
| Invalid tile dimensions   | warning  | Any tileset tile size ≠ 32×32 px                             |
| Invalid map dimensions    | error    | `map.width ≤ 0` or `map.height ≤ 0`                         |
| GID out of range          | warning  | Tile index ≥ tileset.tileCount (references a non-existent tile) |
| Unknown tile layer        | warning  | Tile layer in map is not in the engine's expected layer list  |
| Missing required layer    | error    | `Collision` layer absent                                     |
| Missing expected layer    | warning  | `Background`, `Ground`, `Platforms`, `Decoration_*` absent   |
| Missing PlayerSpawn       | error    | `PlayerSpawn` object layer absent                            |
| Spawn count ≠ 1           | error    | Zero or multiple spawn objects                               |
| Unknown entity type       | warning  | Object name not registered with `EntityManager`              |

Warnings are logged but never crash the game. Errors will still allow the game to run (validator does not halt execution), but the level may behave incorrectly.

---

## F7 Debug Reference (M16)

Press **F7** in-game to toggle the environment/tileset debug panel.

| Label  | Field             | Description                               |
|--------|-------------------|-------------------------------------------|
| TsSrc  | `tilesetSource`   | `production` or `procedural`              |
| TsDim  | `tilesetWidth` × `tilesetHeight` | Texture dimensions in pixels  |
| TsCnt  | `tilesetTileCount`| Total tile count (cols × rows)            |
| AnimAk | `animAtlasLoaded` | Whether tileset_anim.png is in cache      |
| DecoAk | `decoAtlasLoaded` | Whether tileset_deco.png is in cache      |

These appear in the `[Env M15]` section of the F7 panel, after the decoration count.
