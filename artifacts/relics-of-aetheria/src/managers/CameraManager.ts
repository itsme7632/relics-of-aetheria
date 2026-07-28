import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Level } from '../systems/Level';
import { CameraEffects } from './CameraEffects';

// ─── Configuration ────────────────────────────────────────────────────────────

export interface CameraConfig {
  /** Follow lerp X (0–1). Lower = smoother lag. Default 0.08. */
  lerpX?: number;
  /** Follow lerp Y (0–1). Default 0.08. */
  lerpY?: number;
  /** Dead zone width in pixels. Camera ignores movement within this band. Default 80. */
  deadZoneW?: number;
  /** Dead zone height in pixels. Default 50. */
  deadZoneH?: number;
  /** Maximum look-ahead offset in world pixels. Default 120. */
  lookAheadDist?: number;
  /** Look-ahead interpolation rate per second (higher = snappier). Default 3.5. */
  lookAheadLerp?: number;
  /** Minimum landing velocity (px/s) that triggers a bounce. Default 300. */
  bounceMinVel?: number;
  /** Landing velocity mapped to maximum bounce (px/s). Default 900. */
  bounceMaxVel?: number;
  /** Maximum bounce offset in world pixels. Default 18. */
  bounceMaxPx?: number;
}

// ─── Debug info ───────────────────────────────────────────────────────────────

/** Snapshot for DebugOverlay when F5 camera debug is active. */
export interface CameraDebugInfo {
  scrollX: number;
  scrollY: number;
  zoom: number;
  lookAheadX: number;
  deadZoneW: number;
  deadZoneH: number;
}

// ─── CameraManager ────────────────────────────────────────────────────────────

/**
 * CameraManager
 *
 * Replaces the basic GameScene camera follow with professional platformer
 * camera behaviour:
 *
 *   1. Dead zone      — Phaser built-in; camera only moves when player exits.
 *   2. Look-ahead     — lerps a follow offset in the player's movement direction.
 *   3. Landing bounce — brief downward dip when the player lands hard.
 *   4. Shake API      — via CameraEffects.shake(intensity, duration).
 *   5. Zoom API       — via CameraEffects.zoomTo(scale, duration).
 *   6. Camera bounds  — auto-derived from level dimensions.
 *   7. Pixel-perfect  — setRoundPixels(true) prevents sub-pixel jitter.
 *   8. Transition API — via CameraEffects.fadeIn/fadeOut/panTo.
 *
 * Design: all per-frame state is pre-allocated (no heap allocations in update).
 */
export class CameraManager {
  /** Direct access to all reusable camera effects. */
  readonly effects: CameraEffects;

  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly cfg: Required<CameraConfig>;

  // ── Look-ahead state (pre-allocated) ──────────────────────────────────────
  private _lookAheadX = 0;

  // ── Bounce state — plain object tweened by Phaser, pre-allocated ──────────
  private readonly _bounceRef = { y: 0 };

  // ── Debug ─────────────────────────────────────────────────────────────────
  private _debugGfx: Phaser.GameObjects.Graphics | null = null;
  private readonly _debugInfo: CameraDebugInfo = {
    scrollX: 0, scrollY: 0, zoom: 1, lookAheadX: 0, deadZoneW: 0, deadZoneH: 0,
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    level: Level,
    config: CameraConfig = {},
  ) {
    this.cfg = {
      lerpX:         config.lerpX         ?? 0.08,
      lerpY:         config.lerpY         ?? 0.08,
      deadZoneW:     config.deadZoneW     ?? 80,
      deadZoneH:     config.deadZoneH     ?? 50,
      lookAheadDist: config.lookAheadDist ?? 120,
      lookAheadLerp: config.lookAheadLerp ?? 3.5,
      bounceMinVel:  config.bounceMinVel  ?? 300,
      bounceMaxVel:  config.bounceMaxVel  ?? 900,
      bounceMaxPx:   config.bounceMaxPx   ?? 18,
    };

    this.camera = scene.cameras.main;
    this.effects = new CameraEffects(scene, this.camera);

    // ── Configure camera ────────────────────────────────────────────────────
    // Pixel-perfect: prevents sub-pixel jitter on tile boundaries.
    this.camera.setRoundPixels(true);

    // Bounds derived from the loaded tilemap.
    this.camera.setBounds(0, 0, level.widthInPixels, level.heightInPixels);

    // Phaser's built-in lerp follow; roundPixels=false since we set it above.
    this.camera.startFollow(player, false, this.cfg.lerpX, this.cfg.lerpY);

    // Dead zone: camera ignores micro-movements within this rectangle.
    this.camera.setDeadzone(this.cfg.deadZoneW, this.cfg.deadZoneH);

    // ── Landing bounce ──────────────────────────────────────────────────────
    player.on('land', this.onLand, this);
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  /**
   * Call every frame from GameScene.update().
   * Contains zero heap allocations.
   */
  update(delta: number): void {
    const dt = delta / 1000; // seconds

    // ── Look-ahead ──────────────────────────────────────────────────────────
    // Lerp toward ±lookAheadDist based on horizontal velocity direction.
    const vx = this.player.body.velocity.x;
    const targetLookAheadX = vx !== 0
      ? Math.sign(vx) * this.cfg.lookAheadDist
      : 0;

    this._lookAheadX = Phaser.Math.Linear(
      this._lookAheadX,
      targetLookAheadX,
      Phaser.Math.Clamp(this.cfg.lookAheadLerp * dt, 0, 1),
    );

    // Apply look-ahead (x) + landing bounce (y) as a combined follow offset.
    // setFollowOffset shifts the target the camera tracks:
    //   negative x → camera looks ahead in the movement direction
    //   positive y → camera dips down briefly after a hard landing
    this.camera.setFollowOffset(-this._lookAheadX, this._bounceRef.y);

    // ── Debug overlay ────────────────────────────────────────────────────────
    if (this._debugGfx) {
      this._drawDebug();
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  destroy(): void {
    this.player.off('land', this.onLand, this);
    this.hideDebug();
  }

  // ── Debug ──────────────────────────────────────────────────────────────────

  /**
   * Snapshot of current camera state consumed by DebugOverlay.
   * Mutates and returns the same pre-allocated object each call — no GC pressure.
   */
  get debugInfo(): CameraDebugInfo {
    const dz = this.camera.deadzone;
    this._debugInfo.scrollX    = Math.round(this.camera.scrollX);
    this._debugInfo.scrollY    = Math.round(this.camera.scrollY);
    this._debugInfo.zoom       = this.camera.zoom;
    this._debugInfo.lookAheadX = Math.round(this._lookAheadX);
    this._debugInfo.deadZoneW  = dz ? dz.width  : 0;
    this._debugInfo.deadZoneH  = dz ? dz.height : 0;
    return this._debugInfo;
  }

  /** Show graphical debug overlays (dead zone rect, look-ahead indicator). */
  showDebug(): void {
    if (this._debugGfx) return;
    this._debugGfx = this.scene.add.graphics();
    this._debugGfx.setScrollFactor(0);
    this._debugGfx.setDepth(998);
    this._drawDebug();
  }

  /** Remove graphical debug overlays. */
  hideDebug(): void {
    if (this._debugGfx) {
      this._debugGfx.destroy();
      this._debugGfx = null;
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /** Triggered by the Player's 'land' event. */
  private onLand(fallingVelocity: number): void {
    const { bounceMinVel, bounceMaxVel, bounceMaxPx } = this.cfg;
    if (fallingVelocity < bounceMinVel) return;

    const t = Phaser.Math.Clamp(
      (fallingVelocity - bounceMinVel) / (bounceMaxVel - bounceMinVel),
      0, 1,
    );
    const bounceAmt = t * bounceMaxPx;

    // Kill any in-progress bounce, then tween down → back to zero.
    // Re-uses the pre-allocated _bounceRef object — no allocation.
    this.scene.tweens.killTweensOf(this._bounceRef);
    this._bounceRef.y = 0;

    this.scene.tweens.add({
      targets:  this._bounceRef,
      y:        bounceAmt,
      duration: 90,
      ease:     'Quad.easeOut',
      yoyo:     true,
      onComplete: () => { this._bounceRef.y = 0; },
    });
  }

  /**
   * Redraws the debug graphics layer.
   * Called every frame while debug is active — Graphics.clear() + redraw.
   * Kept allocation-free: no new arrays or objects inside the hot path.
   */
  private _drawDebug(): void {
    const g   = this._debugGfx!;
    const cam = this.camera;
    const cx  = cam.width  / 2;
    const cy  = cam.height / 2;
    const dz  = cam.deadzone;

    g.clear();

    // ── Viewport outline ────────────────────────────────────────────────────
    g.lineStyle(1, 0x00ffff, 0.3);
    g.strokeRect(1, 1, cam.width - 2, cam.height - 2);

    // ── Dead zone rectangle (centred in viewport) ───────────────────────────
    if (dz) {
      g.lineStyle(1.5, 0xffff00, 0.75);
      g.strokeRect(cx - dz.width / 2, cy - dz.height / 2, dz.width, dz.height);

      // Corner ticks for clarity
      const tick = 6;
      const lx = cx - dz.width / 2;
      const rx = cx + dz.width / 2;
      const ty = cy - dz.height / 2;
      const by = cy + dz.height / 2;
      g.lineStyle(1, 0xffff00, 0.5);
      g.lineBetween(lx, ty, lx + tick, ty);
      g.lineBetween(lx, ty, lx, ty + tick);
      g.lineBetween(rx - tick, ty, rx, ty);
      g.lineBetween(rx, ty, rx, ty + tick);
      g.lineBetween(lx, by - tick, lx, by);
      g.lineBetween(lx, by, lx + tick, by);
      g.lineBetween(rx, by - tick, rx, by);
      g.lineBetween(rx - tick, by, rx, by);
    }

    // ── Look-ahead indicator — vertical line showing current offset ─────────
    const laScreenX = cx + this._lookAheadX; // positive offset = right
    g.lineStyle(1.5, 0xff8800, 0.8);
    g.lineBetween(laScreenX, cy - 28, laScreenX, cy + 28);
    // Crosshair dot at player's target position
    g.fillStyle(0xff8800, 0.8);
    g.fillCircle(laScreenX, cy, 3);
  }
}
