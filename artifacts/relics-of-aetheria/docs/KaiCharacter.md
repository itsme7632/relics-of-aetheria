# Kai Character System — M10 Documentation

## Architecture

M10 introduces a three-layer split for the player character:

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
          Logs transitions. Drives sprite.play() when artwork exists.
```

`PlayerSpriteFactory` (src/entities/player/PlayerSpriteFactory.ts) is a static utility called once in BootScene to generate the procedural placeholder texture.

---

## Files

| File | Role |
|------|------|
| `src/entities/player/Kai.ts` | Extends Player; wires renderer + controller |
| `src/entities/player/KaiRenderer.ts` | Sprite lifecycle, position, flip |
| `src/entities/player/KaiAnimationController.ts` | State → anim key, transition logging |
| `src/entities/player/PlayerSpriteFactory.ts` | Procedural 32×48 placeholder texture |
| `src/entities/Player.ts` | **Not modified** — all physics logic intact |

---

## Renderer

`KaiRenderer` wraps a `Phaser.GameObjects.Sprite` created with `scene.add.sprite()`.

### Position sync

The physics body centre is `player.x, player.y` (Phaser Arcade body is centred on the game object). The sprite uses `setOrigin(0.5, 0.5)` and is repositioned to `(player.x, player.y)` every frame via `setPosition()`. No offset is needed — the sprite dimensions exactly match the physics rectangle (32×48 px).

### Horizontal flip

`update(x, y, velocityX)` checks velocityX against `PlayerConfig.runThreshold`:

- `velocityX > +threshold` → facing right, `setFlipX(false)`
- `velocityX < −threshold` → facing left, `setFlipX(true)`
- Within ±threshold → no change (prevents flicker during deceleration)

The current facing direction is stored in `_facing: 1 | -1` and exposed for the debug overlay.

### Depth

`SPRITE_DEPTH = 5` places Kai above tile layers (~0) but below UI (1000+) and touch controls (2000+).

---

## Animation Controller

`KaiAnimationController` maps every `PlayerState` value to its animation key, logging each transition.

### State → animation key

| PlayerState | Animation key |
|-------------|--------------|
| Idle | `player_idle` |
| Run | `player_run` |
| Jump | `player_jump` |
| Fall | `player_fall` |
| Land | `player_land` |
| Climb* | `player_climb` |
| Push* | `player_push` |
| Hurt* | `player_hurt` |
| Celebrate* | `player_celebrate` |

\* Not in PlayerStateMachine yet; driven via `Kai.forceAnimState()` from GameScene.

### Transition logic

`update(state: PlayerState)` is called each frame. It short-circuits immediately on no-change (identity comparison, no allocation). On change, it logs and calls `_playAnim()`.

```ts
private _playAnim(from, to): void {
  const key = stateToAnimKey(to);
  console.log(`[KaiAnimController] ${from} → ${to}  (key: ${key})`);
  // Uncomment when artwork is registered:
  // this._sprite.play(key, true);
}
```

---

## Procedural Placeholder Texture

`PlayerSpriteFactory.createPlaceholderTexture(scene)` draws Kai using Phaser Graphics commands and converts to a cached texture with `generateTexture('kai_placeholder', 32, 48)`.

Character design (facing right, 32×48 px):

```
y  0– 6   Dark brown hair (rectangle, side bits)
y  2–16   Skin-tone head circle, dark eyes, subtle mouth
y 16–31   Forest-green tunic + arms; tanned leather backpack (left side)
y 31–33   Dark leather belt with brass buckle
y 32–44   Warm brown pants, two legs
y 43–48   Very dark brown boots with toe highlights
```

The backpack appears on the left side of the sprite (the character's back when facing right). It flips to the right side when the sprite is mirrored for left movement — consistent for a placeholder.

---

## State Transitions

The controller only transitions on actual state changes (no-op on same-state calls). Transition log format:

```
[KaiAnimController] Idle → Run  (key: player_run)
[KaiAnimController] Run → Jump  (key: player_jump)
[KaiAnimController] Jump → Fall  (key: player_fall)
[KaiAnimController] Fall → Land  (key: player_land)
[KaiAnimController] Land → Idle  (key: player_idle)
```

---

## F9 Debug Panel

Press **F9** in-game to toggle the Kai character debug panel in the HUD:

```
─────────────────
Anim   player_run       animation key
Facing right            sprite direction
VelX   240.0            horizontal velocity (px/s)
VelY   0.0              vertical velocity (px/s)
State  Run              PlayerStateMachine state
```

The panel is only active when F9 is pressed; `kaiDebugInfo` is not computed otherwise (no allocation on hot path).

---

## Replacing with a Real Spritesheet

When the Kai spritesheet is ready:

### 1. Add the asset

Register the spritesheet in `src/assets/AssetManifest.ts`:

```ts
{
  key:       AssetKeys.PLAYER_SHEET,
  type:      'spritesheet',
  path:      'sprites/kai.png',
  frameWidth:  48,
  frameHeight: 64,
  required:  true,
}
```

### 2. Remove the placeholder

In `src/scenes/BootScene.ts`, remove:
```ts
PlayerSpriteFactory.createPlaceholderTexture(this);
```

### 3. Update KaiRenderer

Change the constructor texture key:
```ts
// Before:
this.sprite = scene.add.sprite(x, y, KAI_PLACEHOLDER_KEY);
// After:
this.sprite = scene.add.sprite(x, y, AssetKeys.PLAYER_SHEET);
```

### 4. Enable animations in KaiAnimationController

In `_playAnim()`, uncomment:
```ts
this._sprite.play(key, true);
```

### 5. Adjust physics body if frame size changed

If the new spritesheet frames differ from 32×48, update `PlayerConfig.width / height` and adjust the `KaiRenderer` origin offset if needed.

---

## Performance Notes

- `KaiRenderer.update()` — two `setPosition()` calls and one conditional `setFlipX()`. O(1), no allocations.
- `KaiAnimationController.update()` — identity comparison on same-state (no-op). Transition log only fires on state changes.
- `Kai.kaiDebugInfo` — allocates a small object, but only evaluated when F9 is active.
- The placeholder texture is generated once in BootScene and cached. No per-frame graphics operations.
