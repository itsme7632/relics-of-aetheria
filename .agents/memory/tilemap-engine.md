---
name: Tilemap engine conventions
description: Layer names, collision setup, tileset generation, and object layer parsing for Relics of Aetheria
---

## Rules

- Tile layer names are enforced constants in `src/systems/Level.ts → LAYER_NAMES`
- Object layer names are in `OBJECT_LAYER_NAMES`
- Only the `Collision` layer drives Arcade Physics (`setCollisionByExclusion([-1])`)
- All other layers (Ground, Platforms, etc.) are purely visual
- Tileset texture key `'tiles'` is generated procedurally in `BootScene.generateTilesetTexture()` using `this.make.graphics({x,y}, false)` — note: `add: false` inside the options object is a TS error; pass `false` as the second argument
- Maps are loaded in `BootScene.preload()` via `this.load.tilemapTiledJSON`
- `MapManager.loadLevel(key)` is the only public API scenes should use
- Adding a new level = add entry to `src/data/levels.ts` + change `STARTING_LEVEL`; no engine code changes

**Why:** modularity requirement from milestone 2 spec — changing maps must require only a config change.

**How to apply:** any scene that loads a map calls `new MapManager(this).loadLevel(key)`, receives a `Level`, and uses `level.collisionLayer` for physics + `level.objects.playerSpawn` for spawn position.
