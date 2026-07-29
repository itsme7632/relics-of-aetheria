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
