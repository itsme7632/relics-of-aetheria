---
name: M14 environment architecture
description: How the M14 environment systems are wired and key gotchas to avoid.
---

## Rule
All environment preset types (BackgroundTheme, DecorationPreset, WeatherPreset, AnimatedTilePreset) live in `src/world/WorldEnvironment.ts`. LevelManifest fields stay as `string` (not typed unions) to avoid import coupling and keep the manifest as pure data.

**Why:** Tighter coupling between LevelManifest and WorldEnvironment would require both files to always be updated together, and breaks the "one file edit = one new level" design principle.

**How to apply:** When reading manifest fields in GameScene or engine systems, always cast through `buildEnvironmentConfig(entry)` which handles the string → typed conversion and fills in defaults.

## Phaser animated tile API
`Phaser.Tilemaps.Tileset` does NOT expose `addTileAnimationData` in its TypeScript definitions. The correct approach:
```typescript
const tileData = tileset.tileData as Record<number, { animation?: Array<{duration: number, tileid: number}> }>;
tileData[tileIndex] = { animation: frames };  // 0-based tileids relative to firstgid
```

**Why:** Phaser reads `tileData[i].animation` internally to drive animated tile rendering. This matches the Tiled JSON export format.

## M16 conditional tileset loading (BootScene)
BootScene.preload() always queues `load.image(TILESET_WORLD01, WORLD01_TILESET_PATHS.tileset)`. In create(), `textures.exists(TILESET_WORLD01)` distinguishes production (loaded) from procedural (404 → absent). Phaser logs "Failed to process file" for each missing PNG — this is expected dev behavior, not a bug. `TilesetRegistry.record()` captures source/dimensions/atlas flags for the F7 panel.
Phaser Tileset type uses `ts.total` (not `ts.tileCount`) for the tile count.

## Level1.json tileset metadata must match BootScene
The Tiled map JSON `tilesets[0]` entry must declare `columns:32`, `imagewidth:1024`, `tilecount:32` to match the 32-tile procedural texture BootScene generates. Wrong column count causes tiles above GID 8 to render from the wrong row (texture is only 32px tall). Always update when expanding the tileset.

## M15 parallax scroll factors (tuned for minimal distraction)
- Sky: 0.02, Cloud: 0.015, Far jungle: 0.06, Mid canopy: 0.14, Foreground: 0.28
- Keep all scroll factors ≤ 0.30; faster foreground is distracting on smaller screens.

## Tileset GID allocation (BootScene procedural tileset)
- GIDs 1–7: Structural (ground, platform, temple block, stone wall, cracked ruins, grass, moss)
- GIDs 8–22: Animated tile frames (water ×3, waterfall ×3, torch ×3, crystal ×3, leaves ×3)
- GIDs 23–30: Decoration (plant, flower, root, broken statue, skull, rock, temple carving, fallen pillar)
- GID 31: Wooden bridge
- GID 32: Reserved
- Texture width: 1024px (32 cols × 32px)

## Parallax layer counts by theme
- `default`: 3 layers (sky/stars, mountains, hills)
- `jungle_day` / `jungle_dusk` / `jungle_night`: 5 layers (sky, clouds, far jungle, mid canopy, foreground fronds)

## F7 debug panel
M14 adds an `[Env M14]` section below the existing asset stats showing: Tileset, BgTheme, BgLyrs, AnimTls, DecoSet, DecoTls.
