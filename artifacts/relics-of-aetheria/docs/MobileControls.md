# Mobile Controls — M9 Documentation

## Architecture

The mobile controls system introduces a **unified input layer** that abstracts keyboard and touch into a single `TouchInputState` object. No game code (Player, GameScene, InteractionManager) ever reads raw keyboard or pointer events — they all consume `TouchInputState`.

```
┌──────────────┐   ┌──────────────┐
│  Keyboard    │   │  Touch input  │
│  (Phaser KB) │   │  (Pointers)  │
└──────┬───────┘   └──────┬───────┘
       │                  │
       ▼                  ▼
┌──────────────────────────────────┐
│          TouchManager            │
│  • Reads keyboard each frame     │
│  • Reads VirtualJoystick.moveX   │
│  • Reads TouchButton.isDown /    │
│    .justPressed                  │
│  • Merges into TouchInputState   │
└──────────────────┬───────────────┘
                   │ currentState (readonly)
       ┌───────────┼────────────┐
       ▼           ▼            ▼
  Player.update  InteractionManager  DebugOverlay
```

### Files

| File | Responsibility |
|------|---------------|
| `src/input/TouchInputState.ts` | Plain data shape + zero/allocate helpers |
| `src/input/VirtualJoystick.ts` | On-screen joystick: base ring, draggable thumb, dead zone, clamp |
| `src/input/TouchButton.ts`     | Single circular button: press animation, pointer claim |
| `src/input/TouchManager.ts`    | Owns all input; merges keyboard + touch; auto-detect; F8 debug |

---

## Touch Flow

Each frame proceeds in this order:

1. **`GameScene.update()`** calls `touchManager.update()` first.
2. **`TouchManager.update()`**:
   a. Calls `resetTouchInputState(state)` — zeroes all fields in place (no allocation).
   b. Calls `jumpBtn.resetFrame()` and `intBtn.resetFrame()` — clears one-frame `justPressed` flags and lerps visual state.
   c. Calls `joystick.update()` — lerps thumb position back to centre on release; recomputes `moveX`.
   d. Reads keyboard state (cursor keys + WASD + E + Space) via Phaser's cached key objects.
   e. Merges keyboard and joystick into `state.moveX` (keyboard overrides with hard ±1).
   f. Merges keyboard and button into `state.jumpDown`, `state.jumpJust`, `state.interactJust`.
   g. If F8 debug is active, redraws the debug graphics layer.
3. **`GameScene`** reads `touchManager.currentState` and passes it to `player.update(delta, input)` and `interactionManager.update(pos, input.interactJust)`.

---

## Joystick Math

### Layout

The joystick base is pinned to screen space (scrollFactor 0) at:

```
cx = JOYSTICK_MARGIN + JOYSTICK_RADIUS   (= 100px from left)
cy = screenH - JOYSTICK_MARGIN - JOYSTICK_RADIUS
```

Constants are in `TouchManager.ts`:

```
JOYSTICK_RADIUS  = 70    // outer ring radius in game pixels
JOYSTICK_THUMB_R = 30    // thumb disc radius
JOYSTICK_MARGIN  = 30    // distance from screen edge
```

### Pointer claim

On `pointerdown`, the joystick checks a generous hit radius (`radius × 1.4`) and claims the pointer ID. It only responds to `pointermove` / `pointerup` events that match that ID — this is how multi-touch is supported without cross-talk between the joystick and buttons.

### Clamping

Thumb offset is clamped to the outer radius before storage:

```ts
const dist = Math.sqrt(dx*dx + dy*dy);
if (dist > radius) {
  offsetX = (dx / dist) * radius;
  offsetY = (dy / dist) * radius;
}
```

### Dead zone

Only the horizontal axis (`offsetX`) produces `moveX`. A fraction of the radius is treated as dead zone:

```
DEAD_ZONE_FRACTION = 0.18   (18% of radius = ~12.6 px)
```

The live range `[deadZone, radius]` is remapped to `[0, 1]` so the full output range is reachable without hitting the physical clamp:

```ts
const sign  = Math.sign(offsetX);
const range = radius - deadZone;
moveX = clamp(sign * (absX - deadZone) / range, -1, 1);
```

### Animated thumb

The thumb is a separate `Graphics` object repositioned each frame. On release (pointer up), the offset lerps back to `(0, 0)` using `Phaser.Math.Linear` with `THUMB_RETURN_LERP = 0.25` — no tween objects are created.

The base ring alpha lerps between `IDLE_ALPHA = 0.30` and `ACTIVE_ALPHA = 0.80` using `ALPHA_LERP = 0.15`.

---

## Button Mapping

| Button | Position | Color | Keyboard equivalent |
|--------|----------|-------|---------------------|
| **A** (Jump) | Bottom-right corner | Blue `0x3355ff` | `↑` / `W` / `Space` |
| **E** (Interact) | Left of Jump, same row | Green `0x33aa44` | `E` |

Layout constants (in `TouchManager.ts`):

```
BTN_RADIUS       = 38
BTN_MARGIN_RIGHT = 40
BTN_MARGIN_BOT   = 60
BTN_SPACING      = 105   // horizontal distance between Interact and Jump
```

### Press animation

`TouchButton.resetFrame()` lerps `scale` and `alpha` each frame:

| State | Scale | Alpha |
|-------|-------|-------|
| Idle | 1.0 | 0.45 |
| Pressed | 0.82 | 0.85 |

Both `_bgGfx` and `_label` are scaled together so the shrink looks physically accurate.

---

## Auto-detect

On construction, `TouchManager` checks `scene.sys.game.device.input.touch`. If true the controls are shown immediately. On a desktop with a touchscreen that Phaser doesn't detect at boot, a one-time `pointerdown` listener shows the controls on the first actual touch (`pointer.wasTouch`).

---

## Resize

`TouchManager` listens to `scene.scale.on('resize', ...)`. On resize it recomputes all layout positions and calls `joystick.setCenter()` / `button.setPosition()` so controls stay anchored to the screen corners.

---

## Adding a Future Button

1. In `TouchButton.ts` — no changes needed.
2. In `TouchManager.ts`:
   - Declare `private readonly _myBtn: TouchButton;`
   - In `_layoutPositions()`, compute and return its `x/y`.
   - In the constructor, `new TouchButton(scene, x, y, BTN_RADIUS, 'label', COLOR)`.
   - In `_setVisible()`, call `this._myBtn.setVisible(visible)`.
   - In `_onResize()`, call `this._myBtn.setPosition(x, y)`.
   - In `destroy()`, call `this._myBtn.destroy()`.
   - In `update()`, OR the button's `justPressed` / `isDown` into a new field on `TouchInputState`.
3. In `TouchInputState.ts`:
   - Add the new field (e.g. `attackJust: boolean`).
   - Zero it in `resetTouchInputState()`.
   - Allocate it as `false` in `createTouchInputState()`.
4. In `Player.ts` or wherever the action is consumed, read `input.attackJust`.

---

## F8 Debug Mode

Press **F8** in-game to toggle the touch debug overlay. This activates two panels simultaneously:

### Graphics layer (TouchManager._drawDebug)

- **Yellow circle** — joystick outer radius
- **Yellow line + dot** — current joystick offset vector
- **Yellow bar** — `moveX` magnitude (left half = negative, right half = positive; centre mark shows zero)
- **Yellow ring** — drawn around the Jump or Interact button while it is held

### Text panel (DebugOverlay, top-left HUD)

```
─────────────────
Touch  <count>         active pointer count
Vis    yes/no          whether controls are visible
MoveX  <-1.00..1.00>   unified horizontal axis
JstkAng <deg>°         joystick angle in degrees
Jump   ▼ held / up     jump button state
Iact   ▼ held / up     interact button state
```

---

## Performance Notes

- **No per-frame allocations.** `TouchInputState` is created once and mutated in place.
- `VirtualJoystick` repositions its `_thumbGfx` via `setPosition()` — no `clear()`/`fillCircle()` calls per frame.
- `TouchButton` repositions and rescales via `setPosition()` / `setScale()` — drawn once in the constructor.
- `TouchManager._debugGfx` is only cleared and redrawn when F8 debug is active.
- All pointer listeners are bound as named methods (not lambdas) so they can be cleanly removed in `destroy()`.
