# Entity System — Relics of Aetheria

## Overview

The entity system provides a reusable, data-driven framework for all interactive game objects. Entities are spawned automatically from Tiled object layers; adding a new object to the level map requires **no code changes**.

---

## Entity Lifecycle

```
new EntitySubclass(scene)
      │
      ▼
  spawn(x, y)          ← EntityManager calls this after reading the Tiled layer
      │                   sets _active = true, creates scene objects
      ▼
  update(delta)         ← called every frame by EntityManager (while active & enabled)
      │
      ▼
  destroy() / collect() ← sets _active = false, removes scene objects
```

### Lifecycle Events

| Step | Flag state | update() called? |
|------|-----------|-----------------|
| Before `spawn()` | `_active=false` | No |
| After `spawn()` | `_active=true` | Yes |
| After `disable()` | `_enabled=false` | No |
| After `enable()` | `_enabled=true` | Yes |
| After `destroy()` | `_active=false` | No |
| During collect animation | `_active=false` | No (tween handles it) |

---

## How to Create a New Entity Type

### 1. Choose the right base class

| Base | Use when |
|------|---------|
| `Entity` | Generic interactive object (trigger, platform, NPC) |
| `Collectible` | One-time pickup that fires a GameEvent |

### 2. Create the class

```typescript
// src/entities/my-category/MyThing.ts
import { Entity } from '../Entity';

export class MyThing extends Entity {
  private visual!: Phaser.GameObjects.Graphics;
  private baseX = 0;
  private baseY = 0;

  spawn(x: number, y: number): void {
    this.baseX = x;
    this.baseY = y;
    this.visual = this.scene.add.graphics();
    // ... draw and position ...
    this._active = true;             // ← required
  }

  update(delta: number): void {
    if (!this._active || !this._enabled) return;
    // per-frame logic
  }

  destroy(): void {
    this._active = false;            // ← required
    this.visual?.destroy();
  }
}
```

For a **Collectible** subclass also implement `collect()`:

```typescript
collect(): void {
  if (this._collected) return;       // guard against double-fire
  this._collected = true;
  this._active = false;

  // emit event (entity bus + scene bus)
  this.emit(GameEvents.MY_EVENT, this);
  this.scene.events.emit(GameEvents.MY_EVENT, this);

  // visual cleanup / tween ...
}
```

---

## How to Register Entity Types

In `GameScene.create()`, register the type with `EntityManager` **before** calling `spawnFromMap()`:

```typescript
this.entityManager.registerType(
  'MyThing',                             // must match Tiled object name
  (scene, x, y) => new MyThing(scene, x, y),
);
```

If your entity type needs data from the Tiled object (custom properties, size, etc.), the factory receives the full `Phaser.Types.Tilemaps.TiledObject` as the fourth argument:

```typescript
this.entityManager.registerType(
  'Chest',
  (scene, x, y, tiledObj) => new Chest(scene, x, y, tiledObj.properties),
);
```

---

## How Tiled Spawns Entities

1. Open `assets/maps/level1.json` (or edit via Tiled).
2. In the **Objects** layer, create a point or rectangle object.
3. Set the object's **Name** to the registered entity type (e.g., `Crystal`).
4. Save the map. The EntityManager reads the layer at scene start and calls the matching factory.

```
Tiled "Objects" layer
  └── object  name="Crystal"  x=400  y=448
        │
        ▼
  EntityManager.spawnFromMap()
        │
        ▼
  crystalFactory(scene, 400, 448, tiledObj)
        │
        ▼
  new Crystal(scene, 400, 448)  →  crystal.spawn(400, 448)
```

**Rule:** object `name` must exactly match the string passed to `registerType()`. Unmatched names produce a console warning and are skipped.

---

## Adding a New Crystal (no code required)

1. In Tiled, select the **Objects** layer.
2. Place a point object anywhere in the level.
3. Set its **Name** to `Crystal`.
4. Save. The crystal will appear automatically on next run.

---

## Event System

Events are string constants defined in `src/events/GameEvents.ts`.

### Listening (scene-wide)

```typescript
this.scene.events.on(GameEvents.CRYSTAL_COLLECTED, (crystal: Crystal) => {
  // update HUD, save progress, play sound, etc.
});
```

### Listening (entity-specific)

```typescript
crystal.once(GameEvents.CRYSTAL_COLLECTED, () => { ... });
```

### Emitting (inside Crystal.collect())

```typescript
this.emit(GameEvents.CRYSTAL_COLLECTED, this);           // entity bus
this.scene.events.emit(GameEvents.CRYSTAL_COLLECTED, this); // scene bus
```

**Rule:** Never read or write UI, save data, or sound directly inside an entity. Use events only.

---

## Adding a New Event

1. Add a constant to `src/events/GameEvents.ts`:
   ```typescript
   export const GameEvents = {
     CRYSTAL_COLLECTED: 'crystal_collected',
     KEY_COLLECTED:     'key_collected',   // ← new
   } as const;
   ```
2. Emit it from the entity.
3. Listen for it wherever the effect should happen (HUD, SaveManager, SoundManager, etc.).

---

## Debug Mode (F4)

Press **F4** in-game to toggle the entity debug overlay, which shows:

| Field | Meaning |
|-------|---------|
| `Entities` | Total entities currently tracked (including mid-animation ones) |
| `Active` | Entities currently receiving `update()` calls |
| `Crystals` | Number of crystals collected this session |

---

## Performance Notes

- `EntityManager.update()` iterates only `active && enabled` entities — skipping inactive ones is O(n) but avoids unnecessary work.
- Crystals use a `Phaser.GameObjects.Graphics` object drawn **once** at spawn and then only repositioned/rotated each frame — no per-frame redraw.
- The physics hitbox is a lightweight `Zone` (no rendered pixels, minimal physics overhead).
- For hundreds of entities, consider spatial partitioning (only update entities near the camera). Hook into `EntityManager.update()` with a camera-bounds check on each entity's `x`/`y`.
