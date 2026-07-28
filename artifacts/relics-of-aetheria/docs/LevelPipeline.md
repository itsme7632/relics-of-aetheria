# Level Pipeline — Relics of Aetheria

Milestone 6 introduces a formal production pipeline for building all future levels. Adding a new level requires **only one file edit** — no engine code changes.

---

## Folder Conventions

```
artifacts/relics-of-aetheria/
├── assets/
│   ├── maps/                          # Legacy location — level1.json lives here
│   └── worlds/
│       └── world01_jungle/            # World folder (one per themed world)
│           ├── maps/                  # New levels: .json Tiled exports go here
│           ├── tilesets/              # Tileset PNG sheets for this world
│           └── objects/               # Object templates / prefabs (future)
├── src/
│   └── world/
│       ├── LevelManifest.ts           # All level registrations live here
│       ├── MapValidator.ts            # Structural validation rules
│       └── WorldManager.ts            # Orchestration: preload → load → validate
└── docs/
    └── LevelPipeline.md               # This file
```

**Rule:** Every level in `world01_jungle` should have its map file at:
```
assets/worlds/world01_jungle/maps/<levelId>.json
```

The legacy `assets/maps/level1.json` path is kept for the existing level only.

---

## Layer Naming

All Tiled maps **must** follow these exact layer names. The engine uses them as string constants defined in `src/systems/Level.ts`.

### Tile Layers

| Layer Name         | Role                                      | Required? |
|--------------------|-------------------------------------------|-----------|
| `Background`       | Far background tiles (decorative)         | Warning if missing |
| `Ground`           | Main ground tiles (solid terrain)         | Warning if missing |
| `Platforms`        | Mid-air platforms                         | Warning if missing |
| `Collision`        | Physics collision tiles (invisible)       | **Error if missing** |
| `Decoration_Back`  | Decorative tiles behind the player        | Warning if missing |
| `Decoration_Front` | Decorative tiles in front of the player   | Warning if missing |

**`Collision`** is the only tile layer the engine requires to exist. All others are optional but expected for a complete level.

### Object Layers

| Layer Name    | Role                                        | Required? |
|---------------|---------------------------------------------|-----------|
| `PlayerSpawn` | Exactly one object: the player's start position | **Error if missing or empty** |
| `LevelExit`   | One or more exit trigger zones              | Optional |
| `Checkpoint`  | Mid-level save points                       | Optional |
| `Objects`     | Interactive entities (Crystals, etc.)       | Optional |

---

## Object Naming

Objects placed in the **`Objects`** layer must be named to match a registered factory in `EntityManager`. Unknown names generate a console warning at load time.

| Object Name | Entity Class          | Notes                          |
|-------------|-----------------------|--------------------------------|
| `Crystal`   | `Crystal`             | Hovering collectible gem       |

To add a new entity type:
1. Create the class in `src/entities/`.
2. Register it in `GameScene.create()`:
   ```ts
   this.entityManager.registerType('MyEntity', (scene) => new MyEntity(scene));
   ```
3. Place objects named `MyEntity` in the `Objects` layer of your Tiled map.

---

## Manifest Format

Every level is declared as a `LevelManifestEntry` in `src/world/LevelManifest.ts`:

```ts
{
  id:              'world01_level02',        // unique key — used everywhere
  displayName:     'Jungle Ruins — Deep',    // shown in menus / debug
  world:           'world01_jungle',         // which world folder
  mapFile:         'assets/worlds/world01_jungle/maps/level02.json',
  tilesetName:     'tileset',                // name inside the Tiled file
  tilesetKey:      'tiles',                  // Phaser texture cache key
  backgroundTheme: 'default',                // parallax set ('default' for now)
  nextLevel:       undefined,                // id of the next level, or omit
  completionRequirements: {
    crystalsRequired: 3,                     // player needs 3 crystals
    reachExit: true,                         // and must touch the exit
  },
}
```

Fields reference:

| Field                  | Type     | Required | Description |
|------------------------|----------|----------|-------------|
| `id`                   | string   | ✅        | Unique level key; also used as the Phaser asset-cache key |
| `displayName`          | string   | ✅        | Human-readable title |
| `world`                | string   | ✅        | World identifier (matches folder name) |
| `mapFile`              | string   | ✅        | Web-root-relative path to Tiled JSON |
| `tilesetName`          | string   | ✅        | Tileset name declared inside the .tmj file |
| `tilesetKey`           | string   | ✅        | Phaser texture key (must be pre-loaded in BootScene) |
| `music`                | string?  | —        | Phaser audio key for BGM (future milestone) |
| `backgroundTheme`      | string   | ✅        | Parallax theme; currently only `'default'` |
| `nextLevel`            | string?  | —        | id of the successor level |
| `completionRequirements` | object? | —       | Completion gate (see below) |

**Completion requirements:**

| Field              | Type    | Default | Description |
|--------------------|---------|---------|-------------|
| `crystalsRequired` | number? | 0       | Minimum crystals before exit activates |
| `reachExit`        | boolean?| true    | Whether touching a LevelExit object is required |

---

## Validation Rules

`MapValidator.validate()` runs automatically after every `WorldManager.loadLevel()` call. It never crashes the game — issues are written to the browser console.

| Severity | Condition |
|----------|-----------|
| **ERROR**   | `Collision` tile layer is missing |
| **ERROR**   | `PlayerSpawn` object layer is missing |
| **ERROR**   | `PlayerSpawn` layer has zero objects |
| **ERROR**   | `PlayerSpawn` layer has more than one object |
| **WARNING** | Any expected tile layer (`Background`, `Ground`, etc.) is missing |
| **WARNING** | An object in the `Objects` layer has an unregistered type name |
| **PASS**    | No issues → logs `validation passed ✓` |

---

## How to Create a New Level

### 1. Create the Tiled map

Open Tiled and create a new map with the following settings:
- **Orientation:** Orthogonal
- **Tile size:** 32 × 32 px
- **Map size:** Any (e.g. 80 × 22 tiles for the starter layout)

Add the required layers in this order (back → front):

```
Background        (Tile Layer)
Decoration_Back   (Tile Layer)
Ground            (Tile Layer)
Platforms         (Tile Layer)
Collision         (Tile Layer)    ← required
Decoration_Front  (Tile Layer)
PlayerSpawn       (Object Layer)  ← required; add exactly one object
LevelExit         (Object Layer)
Checkpoint        (Object Layer)
Objects           (Object Layer)  ← Crystal objects go here
```

Set the tileset name inside Tiled to `tileset` (must match `tilesetName` in the manifest).

### 2. Export the map

Export as **Tiled JSON** (`.json`). Place the file at:
```
assets/worlds/world01_jungle/maps/<levelId>.json
```

### 3. Add a manifest entry

Open `src/world/LevelManifest.ts` and append:

```ts
{
  id:              'world01_level02',
  displayName:     'Jungle Ruins — Deep',
  world:           'world01_jungle',
  mapFile:         'assets/worlds/world01_jungle/maps/level02.json',
  tilesetName:     'tileset',
  tilesetKey:      'tiles',
  backgroundTheme: 'default',
  nextLevel:       undefined,
},
```

Set the previous level's `nextLevel` to `'world01_level02'` to chain them.

### 4. Change the starting level (optional)

To start on the new level, update `STARTING_LEVEL_ID` in `LevelManifest.ts`:

```ts
export const STARTING_LEVEL_ID = 'world01_level02';
```

### 5. Verify

Run the dev server and open the preview. The browser console should show:
```
[MapManager] Loaded "world01_level02" — ...
[MapValidator] "world01_level02": validation passed ✓
```

No TypeScript errors. No engine changes required.

---

## Architecture Overview

```
BootScene.preload()
  └── WorldManager.preloadAll(scene)
        └── scene.load.tilemapTiledJSON(entry.id, entry.mapFile)
              for each entry in LEVEL_MANIFEST

GameScene.create()
  └── new WorldManager(scene)
        └── worldManager.loadLevel('world01_level01')
              ├── WorldManager.getEntry(id)         → LevelManifestEntry
              ├── WorldManager._toConfig(entry)     → LevelConfig
              ├── TilemapLoader.load(config)         → Level
              └── MapValidator.validate(level.map)   → ValidationResult (logged)
```

---

## Future Hooks

| Feature | Where to add |
|---------|-------------|
| Level transition | `GameScene.transitionToNextLevel()` — already wired, calls `WorldManager.getNextEntry()` |
| Save system | Serialise `WorldManager.getCurrentEntry().id` to localStorage |
| Multiple tileset themes | Add tileset PNG per world, expand `WorldManager.preloadTilesets()` |
| New parallax theme | Add a branch to `buildParallaxLayers()` keyed on `backgroundTheme` |
| BGM per level | Read `entry.music` in BootScene and load the audio file |
