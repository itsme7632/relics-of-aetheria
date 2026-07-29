# Kai Character System — M10 / M11 Documentation

## Architecture

```
Player (src/entities/Player.ts)
│   Physics body, movement, coyote time, jump buffer,
│   state machine, TouchInputState consumption.
│   Unchanged from M3 / M9.
│
└── Kai (src/entities/player/Kai.ts)
    │   Hides the placeholder rectangle (setVisible(false)).
    │   Calls super.update() for all physics, then syncs visuals.
    │
    ├── KaiRenderer (src/entities/player/KaiRenderer.ts)
    │     Phaser.GameObjects.Sprite following the physics body.
    │     Handles position sync and horizontal flip.
    │
    └── KaiAnimationController (src/entities/player/KaiAnimationController.ts)
          Maps PlayerState → Phaser animation key.
          Calls sprite.play() when animation is registered.
          Safe no-op when spritesheet is absent.
```

**M11 additions:**

- `PlayerSpriteImporter` — spec constants, frame validation, animation clip listing
- `KaiDebugInfo` expanded with live animation data for the improved F9 overlay

---

## Files

| File | Role |
|------|------|
| `src/entities/player/Kai.ts` | Extends Player; wires renderer + controller |
| `src/entities/player/KaiRenderer.ts` | Sprite lifecycle, position, flip |
| `src/entities/player/KaiAnimationController.ts` | State → anim key, sprite.play() |
| `src/entities/player/PlayerSpriteFactory.ts` | Procedural 32×48 placeholder texture (removed when real art arrives) |
| `src/entities/player/PlayerSpriteImporter.ts` | **M11** Spritesheet spec, validation, frame counts |
| `src/entities/Player.ts` | **Not modified** — all physics logic intact |

---

## Spritesheet Specification

All values live in `KAI_SPRITE_SPEC` inside `PlayerSpriteImporter.ts`.
Change them there once; validation, F9 debug, and the pipeline all update automatically.

| Property | Value |
|---|---|
| Texture key | `player` (`AssetKeys.PLAYER`) |
| File path | `assets/sprites/kai/kai.png` |
| Frame width | 32 px |
| Frame height | 48 px |
| Total frames | 22 |
| Layout | Horizontal strip (22 columns × 1 row) |
| Format | PNG, transparent background |

### Folder structure

```
artifacts/relics-of-aetheria/
└── assets/
    └── sprites/
        └── kai/
            └── kai.png       ← drop the real spritesheet here
```

---

## Animation Clips

All frame ranges are defined in `src/animation/AnimationRegistry.ts`.
Adjust `frameStart` / `frameEnd` / `frameRate` there when the final art differs.

| Animation key | Frames | FPS | Repeat | State |
|---|---|---|---|---|
| `player_idle` | 0–3 | 6 | loop | Idle |
| `player_run` | 4–9 | 12 | loop | Run |
| `player_jump` | 10 | 1 | once | Jump |
| `player_fall` | 11 | 1 | once | Fall |
| `player_land` | 12 | 1 | once | Land |
| `player_climb` | 13–14 | 8 | loop | Climb* |
| `player_push` | 15–16 | 6 | loop | Push* |
| `player_hurt` | 17 | 1 | once | Hurt* |
| `player_celebrate` | 18–21 | 8 | loop | Celebrate* |

\* Extended states not yet in PlayerStateMachine. Triggered via `Kai.forceAnimState()`.

---

## Import Workflow

### Step 1 — Add the file

Place `kai.png` at:

```
artifacts/relics-of-aetheria/assets/sprites/kai/kai.png
```

### Step 2 — Mark the asset as required

In `src/assets/AssetManifest.ts`, remove `optional: true` from the `PLAYER` entry:

```ts
{
  key:         PLAYER,
  type:        'spritesheet',
  path:        'assets/sprites/kai/kai.png',
  frameWidth:  32,
  frameHeight: 48,
  frameCount:  22,
  // optional: true   ← remove this line
},
```

### Step 3 — Remove the placeholder texture

In `src/scenes/BootScene.ts`, remove:

```ts
PlayerSpriteFactory.createPlaceholderTexture(this);
```

### Step 4 — Update KaiRenderer to use the real texture

In `src/entities/player/KaiRenderer.ts`, change the constructor:

```ts
// Before:
this.sprite = scene.add.sprite(x, y, KAI_PLACEHOLDER_KEY);
// After:
this.sprite = scene.add.sprite(x, y, AssetKeys.PLAYER);
```

### Step 5 — Verify

Run the game. `KaiAnimationController` already calls `sprite.play()` — it will
start working the moment `AnimationFactory.registerAll()` finds the texture in cache.

Press **F9** to confirm: the `Tex` field shows `real`, `Frame` shows a live frame
index, and `FPS` shows the configured frame rate.

Run `pnpm --filter @workspace/relics-of-aetheria run typecheck` — expect 0 errors.

---

## Validation (M11)

`PlayerSpriteImporter.validate(scene)` is called from `BootScene.create()` after
`AnimationFactory.registerAll()`. It checks:

| Check | Outcome |
|---|---|
| Texture width divisible by frameWidth | Error if not |
| Texture height divisible by frameHeight | Error if not |
| Inferred frame count matches `KAI_SPRITE_SPEC.totalFrames` | Warning if different |
| Each clip's frameEnd within available frames | Error if out of range |
| frameStart ≤ frameEnd for every clip | Error if inverted |
| No duplicate animation keys in registry | Warning if found |
| All 9 expected Kai animations present | Warning if any missing |

When the spritesheet is absent, `validate()` returns immediately — no console noise.

---

## F9 Debug Panel (M11)

Press **F9** in-game to toggle the Kai character debug panel:

```
─────────────────
[Kai F9]
Anim   player_run       animation key (from AnimationRegistry)
State  Run              PlayerStateMachine state
Facing right            sprite flip direction
VelX   240.0            horizontal velocity (px/s)
VelY   0.0              vertical velocity (px/s)
Frame  2                current frame index (— when not animating)
FPS    12fps            configured frameRate (— when not animating)
Size   32×48            sprite display dimensions in pixels
Tex    placeholder      "real" once kai.png is loaded
```

The panel is only active when F9 is pressed; `kaiDebugInfo` is not computed otherwise.

---

## Animation Workflow

### KaiAnimationController

`update(state: PlayerState)` runs every frame:

1. Checks if state changed (no-op on same state — zero allocations).
2. Maps new state to an animation key via `stateToAnimKey()`.
3. Logs the transition: `[KaiAnimController] Idle → Run  (key: player_run)`
4. Calls `sprite.play(key, true)` if the animation is registered — safe no-op otherwise.

### Extended state (future)

Call `Kai.forceAnimState('Hurt')` from `GameScene` to drive Hurt / Climb / Push /
Celebrate. `KaiAnimationController.forceState()` handles the transition identically
to a normal state change.

### Preview helper

`Kai.previewAnimation(key)` (delegates to `KaiAnimationController.previewAnimation()`)
plays any registered animation by key without changing the state machine. Useful for
debug testing when the spritesheet is loaded.

---

## Renderer

`KaiRenderer` wraps a `Phaser.GameObjects.Sprite` at depth 5 (above tiles, below UI).

### Position sync

The sprite uses `setOrigin(0.5, 0.5)` and is repositioned to `(player.x, player.y)`
every frame. No offset needed — the sprite dimensions exactly match the physics
rectangle (32×48 px).

### Horizontal flip

- `velocityX > +runThreshold` → facing right, `setFlipX(false)`
- `velocityX < −runThreshold` → facing left, `setFlipX(true)`
- Within ±threshold → no change (prevents flicker during deceleration)

---

## Performance Notes

- `KaiRenderer.update()` — `setPosition()` + conditional `setFlipX()`. O(1), no alloc.
- `KaiAnimationController.update()` — identity comparison short-circuits on same state.
- `sprite.play()` — called only on state transitions, not every frame.
- `Kai.kaiDebugInfo` — allocates a small object, but only when F9 is active.
- `PlayerSpriteImporter.validate()` — runs once in BootScene, never per-frame.
