# Camera System — Relics of Aetheria

Milestone 5 adds a professional platformer camera on top of the existing Phaser 3 + TypeScript foundation.

---

## Architecture

```
GameScene
 ├── CameraManager          managers/CameraManager.ts
 │    ├── CameraEffects     managers/CameraEffects.ts
 │    └── listens to Player 'land' event
 └── ParallaxLayer[]        systems/ParallaxLayer.ts
      └── buildParallaxLayers() factory
```

All three files were designed to have **no cross-dependencies** between effects and parallax. `CameraManager` owns the Phaser camera object and delegates all Phaser effect calls to `CameraEffects`.

---

## Dead Zone

```ts
// CameraManager constructor
this.camera.setDeadzone(cfg.deadZoneW, cfg.deadZoneH);
// defaults: 80 × 50 px
```

Phaser's built-in dead zone prevents the camera from reacting to micro-movements inside a central rectangle. The player must exit the rectangle before the camera starts following. This eliminates jitter on low-speed walking and idle bobbing.

**Tuning:** Increase `deadZoneW`/`deadZoneH` in `CameraConfig` for a more "locked" feel; decrease for tighter tracking.

---

## Look-Ahead

```ts
// CameraManager.update() — called every frame, zero allocations
const targetLookAheadX = vx !== 0
  ? Math.sign(vx) * cfg.lookAheadDist   // ±120 px default
  : 0;

this._lookAheadX = Phaser.Math.Linear(
  this._lookAheadX,
  targetLookAheadX,
  Phaser.Math.Clamp(cfg.lookAheadLerp * dt, 0, 1), // lerp rate 3.5/s
);

this.camera.setFollowOffset(-this._lookAheadX, this._bounceRef.y);
```

Each frame the system lerps a horizontal offset toward `±lookAheadDist` based on the player's movement direction. When the player stops, the offset smoothly returns to zero. The combined follow offset also carries the landing bounce Y value.

**Tuning:** `lookAheadDist` controls how far ahead the camera reveals; `lookAheadLerp` controls how snappily it responds.

---

## Landing Bounce

The `Player` class emits a `'land'` event with the downward velocity at impact:

```ts
// Player.ts — emitted when justLanded && velocity ≥ landVelocityThreshold
this.emit('land', impactVelocity);
```

`CameraManager` listens for this event and fires a short Phaser tween on a pre-allocated `{ y }` object:

```ts
private onLand(fallingVelocity: number): void {
  const t = Clamp((fallingVelocity - bounceMinVel) / (bounceMaxVel - bounceMinVel), 0, 1);
  const bounceAmt = t * bounceMaxPx;  // up to 18 px

  this.scene.tweens.add({
    targets: this._bounceRef,        // pre-allocated — no GC
    y: bounceAmt,
    duration: 90,
    ease: 'Quad.easeOut',
    yoyo: true,
  });
}
```

The tween moves `_bounceRef.y` from 0 → `bounceAmt` → 0 (yoyo). Every frame, `setFollowOffset` applies it as an additional downward shift, giving a subtle camera dip that reinforces the impact weight.

**Tuning:** `bounceMinVel` / `bounceMaxVel` set the velocity range that maps to the bounce; `bounceMaxPx` caps the maximum dip.

---

## Shake API

```ts
// From GameScene or any game system:
this.cameraManager.effects.shake(intensity, duration);
// or via the GameScene convenience method:
this.shakeCamera(250, 0.012);
```

Delegates directly to `Phaser.Cameras.Scene2D.Camera.shake()`. Intensity is expressed as a fraction of the camera size (0.01 = 1%).

---

## Zoom API

```ts
this.cameraManager.effects.zoomTo(scale, duration);
// or via GameScene:
this.setZoom(1.2, 300);
```

Uses `camera.zoomTo()` with linear easing by default.

---

## Camera Bounds

```ts
// CameraManager constructor — bounds derived from the loaded level
this.camera.setBounds(0, 0, level.widthInPixels, level.heightInPixels);
```

Bounds are set automatically from the `Level` object passed to `CameraManager`. No manual pixel counts required.

---

## Parallax

Three procedural layers drawn once at construction time (no per-frame redraw):

| Layer | Scroll X | Scroll Y | Depth | Content |
|-------|----------|----------|-------|---------|
| Sky   | 0.05     | 0.0      | −20   | Starfield + nebula blobs |
| Mountains | 0.15 | 0.03   | −15   | Mountain silhouette polygon |
| Hills | 0.35     | 0.08     | −10   | Foreground hill polygon |

Layers are built by `buildParallaxLayers(scene, levelW, levelH)` in `systems/ParallaxLayer.ts`. To add a new layer:

```ts
import { ParallaxLayer } from '../systems/ParallaxLayer';

const myLayer = new ParallaxLayer(scene, 0.6, 0.1, -5, (g) => {
  g.fillStyle(0x112233, 1);
  g.fillRect(0, 0, levelW, levelH);
  // ... draw content
});
```

Push it to `this.parallaxLayers` in `GameScene` so it is destroyed on shutdown.

---

## Pixel-Perfect Rendering

```ts
this.camera.setRoundPixels(true);
```

Rounds the camera scroll position to the nearest integer each frame, eliminating sub-pixel tile boundary jitter at the cost of a very slight position snap. This is the standard solution for pixel-art platformers.

---

## Camera Transitions

```ts
// Fade in (e.g. on scene start)
this.cameraManager.effects.fadeIn(400);

// Fade out (e.g. before level change)
this.cameraManager.effects.fadeOut(500, 0x000000, () => {
  this.scene.start('GameScene', { levelKey: 'level2' });
});

// Pan to a world position (e.g. cutscene)
this.cameraManager.effects.panTo(worldX, worldY, 1000, 'Sine.easeInOut', () => {
  // resume follow — call camera.startFollow() if needed
});
```

**Note on `panTo`:** Phaser's pan overrides `startFollow` while active. If you pan during gameplay and need tracking to resume, re-register `startFollow` in the completion callback.

---

## Debug Overlay (F5)

Press **F5** in-game to toggle the camera debug display.

**Visual overlays (graphical):**
- Cyan viewport border
- Yellow dead zone rectangle with corner ticks
- Orange look-ahead indicator line + dot

**HUD text (top-left panel):**
```
CamX   1024       ← camera.scrollX (integer)
CamY   320        ← camera.scrollY (integer)
Zoom   1.00       ← current zoom level
LookX  87         ← current look-ahead offset (px)
DZoneW 80         ← dead zone width
DZoneH 50         ← dead zone height
```

---

## Future Usage

| Goal | API |
|------|-----|
| Boss encounter zoom-in | `cameraManager.effects.zoomTo(1.3, 600)` |
| Explosion shake | `cameraManager.effects.shake(0.02, 400)` |
| Level transition | `cameraManager.effects.fadeOut(500, 0, callback)` |
| Cutscene pan | `cameraManager.effects.panTo(x, y, 1500, 'Sine.easeInOut')` |
| New background layer | `new ParallaxLayer(scene, scrollX, scrollY, depth, drawFn)` |
| Tighter dead zone | Pass `{ deadZoneW: 40, deadZoneH: 30 }` to `CameraManager` |
