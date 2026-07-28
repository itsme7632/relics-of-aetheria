# Tilemap Engine — Relics of Aetheria

This document explains how the tilemap system works, how to create new levels in Tiled, and how layer and object naming conventions map to engine behaviour.

---

## Folder Layout

```
artifacts/relics-of-aetheria/
├── assets/
│   ├── maps/
│   │   └── level1.json        ← Tiled map exported as JSON
│   └── tilesets/
│       └── tileset.png        ← Tileset image referenced by all maps
│
└── src/
    ├── data/
    │   └── levels.ts          ← Level registry (only file to edit to add a level)
    ├── systems/
    │   ├── Level.ts           ← Holds loaded tilemap + collision layer + objects
    │   └── TilemapLoader.ts   ← Builds a Level from a LevelConfig
    └── managers/
        └── MapManager.ts      ← Public API: loadLevel(key) → Level
```

---

## Adding a New Level

1. Design the map in Tiled with the required layers (see below).
2. Export as **JSON** (`File → Export As → JSON map files (.json)`).
3. Place the file in `assets/maps/`.
4. Open `src/data/levels.ts` and add one entry:

```ts
export const LEVELS: Record<string, LevelConfig> = {
  level1: { ... },             // existing
  level2: {
    key:          'level2',
    mapPath:      'assets/maps/level2.json',
    tilesetName:  'tileset',   // must match the name in Tiled's tileset list
    tilesetKey:   'tiles',     // Phaser texture key generated in BootScene
  },
};
```

5. Change `STARTING_LEVEL` to `'level2'` to start on it, or call `mapManager.loadLevel('level2')` from a scene transition.

**That's it — no engine code changes required.**

---

## Tile Layer Naming

All tile layer names are enforced in `src/systems/Level.ts → LAYER_NAMES`.

| Layer name        | Required | Role |
|-------------------|----------|------|
| `Background`      | No  | Distant scenery; rendered behind everything else |
| `Decoration_Back` | No  | Mid-background props (barrels, torches) |
| `Ground`          | No  | Main visual floor and solid-block tiles |
| `Platforms`       | No  | Floating platform tiles |
| `Collision`       | **Yes** | Physics mask — must contain all tiles the player collides with. Hidden at runtime; visible in F3 debug mode |
| `Decoration_Front` | No | Foreground props that render *above* the player (depth 10) |

**Rules:**
- Spell layer names exactly — Phaser's layer lookup is case-sensitive.
- The `Collision` layer drives all Arcade Physics. Other layers are purely visual.
- Optional layers (`Background`, `Decoration_*`, etc.) may be omitted; the loader skips them silently.

---

## Object Layer Naming

| Layer name    | Object semantics |
|---------------|-----------------|
| `PlayerSpawn` | First object = player start position `(x, y)`. Falls back to `(100, 300)` if the layer is missing. |
| `LevelExit`   | Objects trigger level transitions (not yet implemented; stored in `Level.objects.exits`). |
| `Checkpoint`  | Objects save the respawn position (not yet implemented; stored in `Level.objects.checkpoints`). |

Objects may have any `name` value — the engine uses layer name, not object name, to find spawn data.

---

## Tileset Conventions

- Tile size: **32 × 32 px**
- The placeholder tileset (`'tiles'`) is generated at runtime in `BootScene.generateTilesetTexture()`.
  - **GID 1** — Ground tile (dark navy, top highlight)
  - **GID 2** — Platform tile (slightly lighter, thin top edge)
  - GIDs 3–8 — Reserved

To use a real PNG tileset:
1. Place `tileset.png` in `assets/tilesets/`.
2. In `BootScene.preload()` add: `this.load.image('tiles', 'assets/tilesets/tileset.png');`
3. Remove the `generateTilesetTexture()` call from `BootScene.create()`.

---

## F3 Debug Mode

Press **F3** during gameplay to toggle a collision-tile overlay.  
Orange outlines = tiles with collision enabled.  
Press F3 again to hide it.

---

## How a Level Loads

```
BootScene.preload()
  └─ this.load.tilemapTiledJSON('level1', 'assets/maps/level1.json')

BootScene.create()
  ├─ generateTilesetTexture()   → adds 'tiles' texture to Phaser cache
  └─ this.scene.start('GameScene', { levelKey: 'level1' })

GameScene.create()
  ├─ MapManager.loadLevel('level1')
  │    └─ TilemapLoader.load(config)
  │         ├─ make.tilemap({ key: 'level1' })
  │         ├─ addTilesetImage('tileset', 'tiles')
  │         ├─ createLayer(Background, Ground, Platforms, …)
  │         ├─ createLayer(Collision) → setCollisionByExclusion([-1])
  │         └─ parseObjects() → { playerSpawn, exits, checkpoints }
  ├─ new Player(scene, playerSpawn.x, playerSpawn.y)
  ├─ physics.add.collider(player, level.collisionLayer)
  └─ cameras.main.setBounds(0, 0, level.widthInPixels, level.heightInPixels)
```
