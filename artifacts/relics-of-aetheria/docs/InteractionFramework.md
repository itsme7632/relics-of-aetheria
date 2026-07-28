# Interaction Framework — Relics of Aetheria

Milestone 7 introduces a reusable gameplay interaction framework.  Any level can
trigger checkpoints, level exits, doors, and signs by placing named objects in
Tiled — no engine code changes required.

---

## Architecture

```
GameScene
 ├── EntityManager          managers/EntityManager.ts
 │    └── Crystal (collectibles)
 └── InteractionManager     managers/InteractionManager.ts
      ├── Checkpoint         entities/interactable/Checkpoint.ts
      ├── LevelExit          entities/interactable/LevelExit.ts
      ├── Door               entities/interactable/Door.ts
      └── Sign               entities/interactable/Sign.ts

Interactable (abstract)    entities/interactable/Interactable.ts
  └── extends Entity        entities/Entity.ts

InteractionEvents          events/InteractionEvents.ts
```

`InteractionManager` owns every `Interactable` in the level.  It handles
proximity detection, E-key dispatch, checkpoint tracking, and F6 debug
rendering.  `EntityManager` continues to own collectibles (Crystal).

---

## Interactable Base Class

`src/entities/interactable/Interactable.ts`

Every interactable has:

| Property / Method     | Type      | Description |
|-----------------------|-----------|-------------|
| `interactionRadius`   | `number`  | World-pixel radius for proximity detection |
| `autoActivate`        | `boolean` | If true, activates on physics overlap (no E press) |
| `isFocused`           | `boolean` | Set by InteractionManager each frame |
| `interact()`          | abstract  | Called when player presses E while focused |
| `activate()`          | abstract  | Called by overlap (auto) or external trigger |
| `deactivate()`        | abstract  | Reverse of activate() |
| `setFocused(bool)`    | method    | Called by InteractionManager; triggers `_onFocusChanged()` |
| `_onFocusChanged()`   | protected | Override for visual/audio feedback on focus change |
| `getZone()`           | method    | Returns physics Zone used for auto-activate overlap |

---

## Interaction Modes

### Auto-activate (Checkpoint)
- `autoActivate = true`
- `InteractionManager.initOverlaps()` registers a Phaser physics zone overlap.
- When the player touches the zone: `activate()` fires immediately.
- No E key required.

### E-press (LevelExit, Door, Sign)
- `autoActivate = false`
- `InteractionManager.update()` scans interactables by distance each frame.
- Nearest within `interactionRadius` becomes **focused**.
- On E key: `interact()` fires on the focused interactable.
- Focus is cleared when the player moves out of range.

---

## Entity Lifecycle

```
new Checkpoint(scene, w, h)    ← constructor; not active yet
  .spawn(x, y)                 ← creates visuals + physics zone; _active = true
  .activate()                  ← fires on overlap; emits CHECKPOINT_ACTIVATED
  .destroy()                   ← removes graphics + zone; called by InteractionManager.destroyAll()
```

All interactables follow the same four-step lifecycle inherited from `Entity`.

---

## InteractionEvents

`src/events/InteractionEvents.ts`

| Constant                  | Payload              | When fired |
|---------------------------|----------------------|------------|
| `CHECKPOINT_ACTIVATED`    | Checkpoint instance  | On first overlap |
| `LEVEL_COMPLETE`          | LevelExit instance   | When player presses E at exit |
| `INTERACTABLE_FOCUSED`    | Interactable         | When focus state enters true |
| `INTERACTABLE_UNFOCUSED`  | Interactable         | When focus state enters false |
| `DOOR_OPENED`             | Door instance        | When door.open() fires |
| `DOOR_CLOSED`             | Door instance        | When door.close() fires |
| `SIGN_READ`               | message: string      | When player reads sign |

Events fire on **both** the entity's own emitter and the **scene event bus**:

```ts
// Listen scene-wide
this.scene.events.on(InteractionEvents.LEVEL_COMPLETE, handler);

// Listen on a specific entity
checkpoint.on(InteractionEvents.CHECKPOINT_ACTIVATED, handler);
```

---

## Registration

Register new interactable types in `GameScene.create()` before calling
`spawnFromLayer` or `spawnLayerAsType`:

```ts
this.interactionManager.registerType(
  'Lever',
  (scene, _x, _y, data) => new Lever(scene, data.width ?? 16, data.height ?? 32),
);
```

Then spawn them:

```ts
// By object name (Objects layer)
this.interactionManager.spawnFromLayer(this.level.map, 'Objects');

// Entire layer as one type (dedicated layers)
this.interactionManager.spawnLayerAsType(
  this.level.map, 'Checkpoint',
  (scene, _x, _y, data) => new Checkpoint(scene, data.width ?? 32, data.height ?? 64),
);
```

---

## Adding a New Interactable

### 1. Create the class

```ts
// src/entities/interactable/Lever.ts
import { Interactable } from './Interactable';
import { InteractionEvents } from '../../events/InteractionEvents';

export class Lever extends Interactable {
  private _pulled = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 64, false); // radius=64, autoActivate=false
  }

  spawn(x: number, y: number): void {
    this._setPos(x, y);
    // create graphics...
    this._active = true;
  }

  interact(): void {
    this._pulled = !this._pulled;
    console.log(`[Lever] ${this._pulled ? 'pulled' : 'released'}`);
    // emit event, open door, etc.
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void { this._active = false; /* cleanup */ }
}
```

### 2. Register the type in GameScene

```ts
this.interactionManager.registerType(
  'Lever',
  (scene) => new Lever(scene),
);
```

### 3. Place in Tiled

- Layer: `Objects`
- Name: `Lever` (must match the registered key)
- Optional properties: any custom data readable from `data.properties`

No engine code changes after step 2.

---

## Tiled Workflow

### Layer conventions

| Layer name   | Spawn method          | Object name key |
|--------------|-----------------------|-----------------|
| `Objects`    | `spawnFromLayer()`    | Object's `name` field |
| `Checkpoint` | `spawnLayerAsType()`  | Ignored — entire layer = Checkpoint |
| `LevelExit`  | `spawnLayerAsType()`  | Ignored — entire layer = LevelExit |

### Required object data

| Field    | Used for |
|----------|----------|
| `x`, `y` | Spawn position (top-left corner of the object) |
| `width`, `height` | Zone and visual size |
| `name`   | Type lookup in `spawnFromLayer()` |
| `properties.message` (string) | Sign message text |

### Checkpoint

Place in the `Checkpoint` layer with any name.  Width × height sets the activation zone.

### LevelExit

Place in the `LevelExit` layer with any name.  Width × height sets the visual size and proximity threshold.

### Door / Sign

Place in the `Objects` layer named exactly `Door` or `Sign`.  Sign supports a custom `message` property.

---

## Level Complete Flow

```
Player reaches LevelExit → presses E
  → LevelExit.interact()
      → scene.events.emit(LEVEL_COMPLETE)
          → GameScene._onLevelComplete()
              → WorldManager.getNextEntry() ?
                  yes → cameraManager.effects.fadeOut → scene.restart({ levelId: next.id })
                  no  → show "LEVEL COMPLETE" text overlay
```

To wire a next level, set `nextLevel` in `LevelManifest.ts`:

```ts
{
  id: 'world01_level01',
  nextLevel: 'world01_level02',
  ...
}
```

---

## Debug Overlay (F6)

Press **F6** in-game to toggle interaction debug.

**Graphical overlays (world-space):**
- Grey circle — interaction radius of every interactable
- Yellow circle — focused interactable radius
- Yellow line — player → focused interactable
- Teal square — auto-activate marker (Checkpoint)
- Gold ring — active checkpoint

**HUD text (top-left panel):**
```
IActvs 2        ← total interactable count
Focus  LevelExit ← type of focused interactable (or "none")
CkptX  1232      ← active checkpoint world X
CkptY  608       ← active checkpoint world Y
```

---

## Future Hooks

| Feature | Where to add |
|---------|-------------|
| Respawn at checkpoint | Read `interactionManager.getActiveCheckpoint()` on player death |
| Locked door + key item | Add Key collectible; on collect call `door.unlock()` |
| NPC dialogue | Extend Sign into `NPC`; `interact()` triggers a dialogue scene |
| Lever → door link | Lever.interact() calls `door.open()` via scene event or direct ref |
| Completion requirements | Gate LevelExit.interact() on `entityManager.collectedCrystals >= required` |
