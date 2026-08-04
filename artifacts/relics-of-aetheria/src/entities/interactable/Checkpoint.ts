import Phaser from 'phaser';
import { Interactable } from './Interactable';
import { InteractionEvents } from '../../events/InteractionEvents';

/**
 * Checkpoint
 *
 * Auto-activates when the player enters the physics zone — no E press needed.
 * Draws a flag-post visual that changes from grey to gold on activation.
 * Emits CHECKPOINT_ACTIVATED on the entity bus and the scene event bus.
 *
 * InteractionManager stores the last activated Checkpoint so the respawn
 * system (future milestone) can read it via getActiveCheckpoint().
 *
 * Tiled setup:
 *   Layer: Checkpoint (dedicated object layer)
 *   Object size: width × height defines the activation zone (default 32×64)
 */
export class Checkpoint extends Interactable {
  private _activated = false;

  private readonly _w: number;
  private readonly _h: number;

  constructor(scene: Phaser.Scene, w = 32, h = 64) {
    // autoActivate = true → fires activate() on overlap, not E press
    super(scene, Math.max(w, h) * 0.6 + 16, true);
    this._w = w;
    this._h = h;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  spawn(x: number, y: number): void {
    const cx = x + this._w / 2;
    const cy = y + this._h / 2;
    this._setPos(cx, cy);

    // ── Visual ──────────────────────────────────────────────────────────────
    this.gfx = this.scene.add.graphics();
    this.gfx.setDepth(5);
    this._drawVisual();

    // ── Physics zone ────────────────────────────────────────────────────────
    this.zone = this.scene.add.zone(cx, cy, this._w, this._h);
    this.scene.physics.world.enable(this.zone);
    const body = this.zone.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    this._active = true;
  }

  destroy(): void {
    this._active = false;
    this.gfx?.destroy();
    this.zone?.destroy();
    this.gfx  = null;
    this.zone = null;
  }

  // ── Interaction API ────────────────────────────────────────────────────────

  /** Fired automatically on overlap — guards against double-activation. */
  activate(): void {
    if (this._activated) return;
    this._activated = true;
    this._drawVisual();
    console.log(
      `[Checkpoint] Activated at (${Math.round(this.x)}, ${Math.round(this.y)})`,
    );
    this.emit(InteractionEvents.CHECKPOINT_ACTIVATED, this);
    this.scene.events.emit(InteractionEvents.CHECKPOINT_ACTIVATED, this);
  }

  /** Not used — checkpoints auto-activate on overlap. */
  interact(): void {}

  deactivate(): void {
    this._activated = false;
    this._drawVisual();
  }

  get isActivated(): boolean {
    return this._activated;
  }

  /**
   * M19 — Ground-level Y for respawn positioning.
   * Returns the bottom edge of the activation zone, which corresponds to the
   * floor the player should stand on after respawning at this checkpoint.
   */
  get spawnY(): number {
    return this.y + this._h / 2;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _drawVisual(): void {
    const g = this.gfx;
    if (!g) return;
    g.clear();

    const cx = this.x;
    const cy = this.y;
    const ht = this._h / 2; // half height

    if (this._activated) {
      // Gold flag post
      g.fillStyle(0xffcc00, 1);
      g.fillRect(cx - 2, cy - ht, 4, this._h);
      // Gold flag pennant
      g.fillStyle(0xffee44, 1);
      g.fillTriangle(cx + 2, cy - ht, cx + 20, cy - ht + 10, cx + 2, cy - ht + 20);
      // Subtle glow ring
      g.lineStyle(1.5, 0xffdd88, 0.4);
      g.strokeCircle(cx, cy, this.interactionRadius * 0.4);
    } else {
      // Grey flag post
      g.fillStyle(0x999999, 0.85);
      g.fillRect(cx - 2, cy - ht, 4, this._h);
      g.fillStyle(0xbbbbbb, 0.85);
      g.fillTriangle(cx + 2, cy - ht, cx + 16, cy - ht + 8, cx + 2, cy - ht + 16);
    }
  }
}
