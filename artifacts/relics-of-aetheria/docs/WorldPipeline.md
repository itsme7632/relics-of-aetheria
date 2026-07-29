# World Pipeline — Relics of Aetheria

M14 introduces the **Emerald Jungle Production Pack** — a full environment system that transforms World 1 from prototype placeholders into a production-quality environment foundation. Gameplay is unchanged; only presentation and content-support systems are added.

---

## Folder Layout

```
artifacts/relics-of-aetheria/
├── assets/
│   ├── maps/                                  # Legacy — level1.json stays here
│   └── worlds/
│       └── world01_jungle/                    # One folder per themed world
│           ├── maps/                          # New levels: Tiled JSON exports
│           ├── tilesets/                      # Tileset PNG sheets (production art)
│           └── objects/                       # Object templates / prefabs (future)
├── src/
│   ├── world/
│   │   ├── LevelManifest.ts                   # All level registrations — edit only here
│   │   ├── MapValidator.ts                    # Structural validation rules
│   │   ├── WorldManager.ts                    # Orchestration: preload → load → validate
│   │   └── WorldEnvironment.ts                # Environment preset types + factory (M14)
│   └── systems/
│       ├── Level.ts                           # Tilemap wrapper + layer name constants
│       ├── TilemapLoader.ts                   # Phaser layer creation + physics setup
│       ├── ParallaxLayer.ts                   # Parallax background themes (M14)
│       ├── AnimatedTileSystem.ts              # Data-driven animated tile engine (M14)
│       └── DecorationSystem.ts               # Decoration preset system (M14)
└── docs/
    ├── LevelPipeline.md                       # Level creation reference
    └── WorldPipeline.md                       # This file — environment systems
```

---

## Environment Pipeline

Each level in `LevelManifest.ts` declares a complete environment configuration through five fields:

```ts
{
  backgroundTheme:    'jungle_day',    // ParallaxLayer theme
  decorationPreset:   'jungle_ruins',  // DecorationSystem preset
  weatherPreset:      'none',          // Weather/atmosphere (future)
  animatedTilePreset: 'none',          // AnimatedTileSystem preset
  music:              'bgm_jungle',    // Optional BGM key
  ambientSound:       'sfx_jungle_ambient', // Optional ambient loop key
}
```

At runtime, `GameScene.create()` calls `buildEnvironmentConfig(entry)` which converts these strings into a typed `EnvironmentConfig` and passes it to each environment system:

```
GameScene.create()
  ├── buildEnvironmentConfig(manifestEntry)  →  EnvironmentConfig
  ├── buildParallaxLayers(scene, w, h, theme)
  ├── animatedTileSystem.apply(map, tilesetName, preset)
  └── decorationSystem.applyPreset(preset, map)
```

Each system is independently data-driven — adding a new theme, preset, or world requires **only data changes**, no engine modifications.

---

## Parallax Background System

Defined in `src/systems/ParallaxLayer.ts`.

### Themes

| Theme          | Layers | Description |
|----------------|--------|-------------|
| `default`      | 3      | Star-field + mountain silhouettes (pre-M14 placeholder) |
| `jungle_day`   | 5      | Sky gradient + clouds + far jungle + mid canopy + foreground fronds |
| `jungle_dusk`  | 5      | Same layout with warm orange palette (future — procedural pending) |
| `jungle_night` | 5      | Dark palette with stars + moon |

### Jungle Day Layer Stack

| Layer              | Scroll X | Depth | Description |
|--------------------|----------|-------|-------------|
| Sky gradient       | 0.02     | −25   | Gradient fill + sun disk + cloud wisps |
| Cloud / fog        | 0.02     | −22   | Semi-transparent fog ellipses |
| Far jungle         | 0.08     | −20   | Dark silhouette canopy mass |
| Mid jungle canopy  | 0.20     | −15   | Closer tree mass + leaf glints |
| Foreground fronds  | 0.45     | −5    | Large frond fans near bottom edge |

### Scroll Factor Guide

- **0.0** — pinned to camera (HUD layer)
- **0.02–0.1** — far / sky (barely moves)
- **0.2–0.4** — mid-distance
- **0.5–0.9** — close foreground
- **1.0** — moves with the world (same as terrain)

### Adding a New Theme

1. Add the new value to the `BackgroundTheme` union in `WorldEnvironment.ts`.
2. Add a `case` branch in `buildParallaxLayers()` in `ParallaxLayer.ts`.
3. Write the theme-specific layer builder function (follow `_buildJungleLayers` as a template).
4. Set `backgroundTheme: 'your_theme'` in the relevant manifest entry.

---

## Decoration System

Defined in `src/systems/DecorationSystem.ts`.

Decorations live exclusively in the `Decoration_Back` and `Decoration_Front` tile layers of each Tiled map. The decoration system **never touches the Collision layer** — decoration tiles have zero physics effect.

### Available Presets

| Preset            | Types (back)                             | Types (front) |
|-------------------|------------------------------------------|---------------|
| `none`            | —                                        | —             |
| `jungle_light`    | plants, flowers, roots                   | roots         |
| `jungle_ruins`    | broken statues, skulls, rocks, temple carvings | rocks   |
| `jungle_deep`     | plants, roots, rocks                     | fallen pillars |
| `temple_interior` | temple carvings                          | fallen pillars |

### Decoration Tile GID Reference

| GID | Decoration Type | Layer |
|-----|-----------------|-------|
| 23  | Plant / fern    | Back  |
| 24  | Flower          | Back  |
| 25  | Root            | Back + Front |
| 26  | Broken statue   | Back  |
| 27  | Skull           | Back  |
| 28  | Rock            | Back + Front |
| 29  | Temple carving  | Back  |
| 30  | Fallen pillar   | Front |

### Adding a New Decoration Preset

1. Add a new value to the `DecorationPreset` union in `WorldEnvironment.ts`.
2. Add an entry to `DECORATION_PRESETS` in `DecorationSystem.ts`.
3. Define the tile GIDs in the new entry (add new tileset tiles in BootScene if needed).
4. Set `decorationPreset: 'your_preset'` in the manifest entry.

---

## Animated Tile Workflow

Defined in `src/systems/AnimatedTileSystem.ts`.

Animated tiles use Phaser's native `Tileset.addTileAnimationData()` API. The renderer handles frame cycling automatically — no per-frame update loop needed.

### Available Presets

| Preset          | Animations |
|-----------------|------------|
| `none`          | — |
| `jungle_water`  | water_flow (GIDs 8–10), waterfall (GIDs 11–13) |
| `jungle_full`   | All above + torch_flame (14–16), crystal_shimmer (17–19), moving_leaves (20–22) |

### Animated Tile GID Reference

| GIDs   | Animation      | Frame count | Frame duration |
|--------|----------------|-------------|----------------|
| 8–10   | water_flow     | 4           | 200ms          |
| 11–13  | waterfall      | 4           | 150ms          |
| 14–16  | torch_flame    | 4           | 80–100ms       |
| 17–19  | crystal_shimmer | 4          | 250–300ms      |
| 20–22  | moving_leaves  | 4           | 200–250ms      |

### Adding a New Animated Tile Type

1. Add new tile frames to `generateTilesetTexture()` in `BootScene.ts` (expand the column count if needed; update `COLS`).
2. Add a new `AnimatedTileConfig` entry to an existing or new preset in `ANIMATED_TILE_PRESETS` in `AnimatedTileSystem.ts`.
3. Add the preset value to `AnimatedTilePreset` in `WorldEnvironment.ts` if creating a new preset.
4. Set `animatedTilePreset: 'your_preset'` in the manifest entry.

---

## Level Pipeline Reference

### Full Manifest Entry (all M14 fields)

```ts
{
  id:                 'world01_level02',
  displayName:        'Jungle Ruins — Deep',
  world:              'world01_jungle',
  mapFile:            'assets/worlds/world01_jungle/maps/level02.json',
  tilesetName:        'tileset',
  tilesetKey:         AssetKeys.TILESET_WORLD01,

  // ── M14 environment fields ──────────────────────────────────────────────
  backgroundTheme:    'jungle_day',       // BackgroundTheme
  decorationPreset:   'jungle_ruins',     // DecorationPreset
  weatherPreset:      'mist',             // WeatherPreset (future)
  animatedTilePreset: 'jungle_water',     // AnimatedTilePreset

  // ── Audio (future) ──────────────────────────────────────────────────────
  music:              'bgm_jungle',
  ambientSound:       'sfx_jungle_ambient',

  // ── Chain + completion ──────────────────────────────────────────────────
  nextLevel:          undefined,
  completionRequirements: { crystalsRequired: 3, reachExit: true },
}
```

### Required Tiled Layer Checklist

| Layer             | Type   | Required? |
|-------------------|--------|-----------|
| `Background`      | Tile   | Recommended |
| `Decoration_Back` | Tile   | Recommended |
| `Ground`          | Tile   | Recommended |
| `Platforms`       | Tile   | Recommended |
| `Collision`       | Tile   | **Required** |
| `Decoration_Front`| Tile   | Recommended |
| `PlayerSpawn`     | Object | **Required** (exactly 1 object) |
| `LevelExit`       | Object | Optional |
| `Checkpoint`      | Object | Optional |
| `Objects`         | Object | Optional |

---

## F7 Debug Overlay Reference

Press **F7** in-game to toggle the asset + environment debug panel.

### M14 Environment Section

```
[Env M14]
Tileset  tileset
BgTheme  jungle_day
BgLyrs   5
AnimTls  0 (none)
DecoSet  jungle_ruins
DecoTls  0 (broken_statues, skulls…)
```

| Field    | Source | Description |
|----------|--------|-------------|
| Tileset  | `level.map.tilesets` | Names of tilesets loaded in the current map |
| BgTheme  | `envConfig.backgroundTheme` | Active parallax theme |
| BgLyrs   | `parallaxLayers.length` | Number of parallax GameObjects active |
| AnimTls  | `animatedTileSystem.animatedTileCount` | Animated tile types registered |
| DecoSet  | `envConfig.decorationPreset` | Active decoration preset name |
| DecoTls  | `decorationSystem.decorationCount` | Non-empty tiles in Back + Front layers |

---

## Future Worlds

Every future world reuses the same pipeline:

1. Create a folder: `assets/worlds/<worldId>/`.
2. Add tileset PNG(s) to `assets/worlds/<worldId>/tilesets/`.
3. Register new `BackgroundTheme`, `DecorationPreset`, `AnimatedTilePreset` values as needed in `WorldEnvironment.ts`.
4. Add levels to `LevelManifest.ts`.
5. No engine code changes required.
