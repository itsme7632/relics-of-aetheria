# Asset Pipeline — Relics of Aetheria

This document covers all conventions for adding, naming, and loading game assets.

---

## Project Standards

| Standard          | Value          |
|-------------------|----------------|
| Tile size         | 32 × 32 px     |
| Player sprite     | 32 × 48 px     |
| Target resolution | 1280 × 720 px  |

---

## Folder Structure

```
assets/
├── sprites/
│   ├── kai/             ← Player (Kai) spritesheet(s)
│   ├── enemies/         ← Enemy spritesheets
│   ├── effects/         ← VFX spritesheets
│   └── objects/         ← Collectibles, interactables
├── tilesets/
│   ├── world01/         ← World 1 (Jungle Ruins) tileset PNG(s)
│   └── world02/         ← World 2 (reserved)
├── audio/
│   ├── music/           ← Background music (.ogg preferred)
│   └── sfx/             ← Sound effects (.ogg preferred)
├── ui/                  ← HUD images, buttons, panels
├── fonts/               ← Bitmap font PNG + XML pairs
└── maps/                ← Tiled JSON map exports
```

> **Note:** Map JSON files are registered by `WorldManager.preloadAll()` using the
> level id from `LevelManifest.ts`, not by `AssetLoader`. Keep maps in `assets/maps/`
> or `assets/worlds/<world>/maps/` as declared in the manifest.

---

## Naming Conventions

### Files

| Asset type       | Pattern                         | Example                    |
|------------------|---------------------------------|----------------------------|
| Player sheet     | `kai.png`                       | `sprites/kai/kai.png`      |
| Enemy sheet      | `<enemy>.png`                   | `sprites/enemies/slime.png`|
| Effect sheet     | `<effect_name>.png`             | `sprites/effects/dust_puff.png` |
| Object sheet     | `<object>.png`                  | `sprites/objects/crystal.png` |
| Tileset          | `<world_id>.png`                | `tilesets/world01/world01.png` |
| BGM              | `<area>.ogg`                    | `audio/music/jungle.ogg`   |
| SFX              | `<action>.ogg`                  | `audio/sfx/jump.ogg`       |
| UI image         | `<element>.png`                 | `ui/heart.png`             |
| Bitmap font      | `<name>.png` + `<name>.xml`     | `fonts/hud.png`, `fonts/hud.xml` |

### Code keys

All Phaser cache keys live in **`src/assets/AssetKeys.ts`**.  
All animation keys live in **`src/animation/AnimationKeys.ts`**.

Never use raw string literals for asset or animation keys in game code.

---

## Spritesheet Standards

### Player (Kai)

- **Frame size:** 32 × 48 px
- **Layout:** horizontal strip
- **Expected frame layout** (adjust when art is delivered):

| Frames | Animation       |
|--------|-----------------|
| 0–3    | Idle (4 frames) |
| 4–9    | Run (6 frames)  |
| 10     | Jump            |
| 11     | Fall            |
| 12     | Land            |
| 13–14  | Climb           |
| 15–16  | Push            |
| 17     | Hurt            |
| 18–21  | Celebrate       |

### Enemies / Objects

- **Frame size:** 32 × 32 px (most enemies), 32 × 48 px (Goblin)
- **Layout:** horizontal strip
- Adjust `frameStart` / `frameEnd` in `AnimationRegistry.ts` when the sheets are delivered.

### Tileset

- **Tile size:** 32 × 32 px
- **Width:** multiple of 32 (any number of columns)
- **Height:** 32 px (single row) or multiple of 32 (multiple rows)
- The tileset key in `LevelManifest.ts` must match `AssetKeys.TILESET_WORLD01` (or the
  relevant world constant).

---

## How to Add a New Asset

1. **Drop the file** into the correct `assets/` subfolder (see Folder Structure above).

2. **Add a key constant** to `src/assets/AssetKeys.ts`:
   ```ts
   export const MY_NEW_SPRITE = 'my_new_sprite' as const;
   ```
   and add it to the `AssetKeys` namespace object at the bottom of the file.

3. **Add a manifest entry** to `src/assets/AssetManifest.ts`:
   ```ts
   {
     key:         AssetKeys.MY_NEW_SPRITE,
     type:        'spritesheet',
     path:        'assets/sprites/objects/my_new_sprite.png',
     frameWidth:  32,
     frameHeight: 32,
     // Remove optional: true once the file is confirmed present
   },
   ```

4. **Remove `optional: true`** once the file is on disk and confirmed loading.

5. **Boot** — `AssetLoader` picks up the entry automatically. No other code changes needed.

---

## How to Register a New Animation

1. **Add a key constant** to `src/animation/AnimationKeys.ts`:
   ```ts
   export const MY_ENTITY_ACTION = 'my_entity_action' as const;
   ```
   and add it to the `AnimationKeys` namespace object.

2. **Add a registry entry** to `src/animation/AnimationRegistry.ts`:
   ```ts
   {
     key:        AnimationKeys.MY_ENTITY_ACTION,
     textureKey: AssetKeys.MY_NEW_SPRITE,
     frameStart: 0,
     frameEnd:   3,
     frameRate:  8,
     repeat:     -1,   // -1 = loop, 0 = once
   },
   ```

3. **Boot** — `AnimationFactory.registerAll()` picks it up automatically.
   If the texture is not yet loaded, the animation is silently queued as "pending artwork"
   and will register as soon as the file is present.

4. **Use in code:**
   ```ts
   sprite.play(AnimationKeys.MY_ENTITY_ACTION);
   ```

---

## Asset Loading Pipeline

```
BootScene.preload()
  └─ WorldManager.preloadAll(this)   ← registers map JSON files
  └─ AssetLoader.loadAll(this)       ← registers all ASSET_MANIFEST entries

BootScene.create()
  └─ generateTilesetTexture()        ← procedural tileset (until real art arrives)
  └─ AssetValidator.validate(this)   ← checks cache; warns on missing required assets
  └─ AnimationFactory.registerAll(this) ← registers anims whose textures are loaded
  └─ scene.start('GameScene', ...)
```

**Rule:** Game code (scenes, entities, managers) must never call `scene.load.*` directly.
All loads go through `AssetLoader`. All animation registrations go through `AnimationFactory`.

---

## Debug — F7 Overlay

Press **F7** in-game to toggle the asset debug panel:

| Field    | Meaning                                     |
|----------|---------------------------------------------|
| Loaded   | Assets confirmed present in Phaser cache    |
| MissReq  | Required assets that failed to load (⚠)    |
| MissOpt  | Optional assets not yet on disk (expected)  |
| FrmWarn  | Spritesheets with frame-size mismatches (⚠) |
| Anims    | Animations registered with scene.anims      |
| Pending  | Animations waiting on artwork               |
| Pend:    | Names of first 3 pending animations         |

---

## Performance Guidelines

- **No duplicate loads** — `AssetLoader` checks for duplicate manifest keys and skips them.
- **Reuse textures** — never create a new load for a key that is already in the manifest.
- **Texture atlases** — when the entity count grows, batch sprites into atlases
  (`type: 'atlas'` in the manifest + JSON atlas descriptor). The manifest already
  supports this via the `AtlasEntry` type.
- **No per-entity loads** — all load calls happen in BootScene; entities reference
  the cache by key only.
- **60 FPS target** — the placeholder procedural tileset generates once and is cached;
  no per-frame texture generation.

---

## Audio Guidelines

- **Format:** `.ogg` preferred (broad browser support; Phaser handles fallbacks).
- **BGM:** loop-ready files with clean loop points.
- **SFX:** short (< 2 s) for jump, collect, hurt; medium (2–5 s) for checkpoint, level complete.
- Register BGM keys in `AUDIO_BGM_*` constants; SFX in `AUDIO_SFX_*` constants.
- The audio manager (future milestone) will reference these keys directly.
