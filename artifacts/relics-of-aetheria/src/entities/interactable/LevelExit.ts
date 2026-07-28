import Phaser from 'phaser';
import { Interactable } from './Interactable';
import { InteractionEvents } from '../../events/InteractionEvents';

/**
 * LevelExit
 *
 * When the player is within interaction radius, InteractionManager focuses it
 * and a "Press E to exit" message is logged once.  Pressing E emits
 * LEVEL_COMPLETE on the scene event bus; GameScene handles the transition.
 *
 * Visual: a pulsing green doorway drawn with procedural graphics.
 *
 * Tiled setup:
 *   Layer:  LevelExit (dedicated object layer)
 *   Name:   exit (or any; the factory ignores it)
 *   Size:   width × height defines the visual + proximity zone
 */
export class LevelExit extends Interactable {
  private readonly _w: number;
  private readonly _h: number;

  /** Running time for pulse animation (ms). Pre-allocated, zero-alloc update. */
  private _pulseTime = 0;

  constructor(scene: Phaser.Scene, w = 32, h = 64) {
    super(scene, Math.max(w, h) * 0.75 + 24, false);
    this._w = w;
    this._h = h;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  spawn(x: number, y: number): void {
    const cx = x + this._w / 2;
    const cy = y + this._h / 2;
    this._setPos(cx, cy);

    this.gfx = this.scene.add.graphics();
    this.gfx.setDepth(5);
    this._drawVisual(1.0);

    // Zone kept for potential future overlap queries
    this.zone = this.scene.add.zone(cx, cy, this._w, this._h);
    this.scene.physics.world.enable(this.zone);
    const body = this.zone.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    this._active = true;
  }

  override update(delta: number): void {
    this._pulseTime += delta;
    // Pulse between 0.45 and 1.0 alpha
    const alpha = 0.725 + Math.sin(this._pulseTime / 450) * 0.275;
    this._drawVisual(alpha);
  }

  destroy(): void {
    this._active = false;
    this.gfx?.destroy();
    this.zone?.destroy();
    this.gfx  = null;
    this.zone = null;
  }

  // ── Interaction API ────────────────────────────────────────────────────────

  interact(): void {
    console.log('[LevelExit] Level complete!');
    this.emit(InteractionEvents.LEVEL_COMPLETE, this);
    this.scene.events.emit(InteractionEvents.LEVEL_COMPLETE, this);
  }

  activate(): void {}   // E-press type — no auto-activation
  deactivate(): void {}

  protected override _onFocusChanged(focused: boolean): void {
    if (focused) {
      console.log('[LevelExit] Press E to exit');
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _drawVisual(alpha: number): void {
    const g = this.gfx;
    if (!g) return;
    g.clear();

    const cx = this.x;
    const cy = this.y;
    const hw = this._w / 2;
    const hh = this._h / 2;

    // Focused: brighter cyan tint
    const colour = this._focused ? 0x44ffcc : 0x00ff88;

    // Fill
    g.fillStyle(colour, alpha * 0.22);
    g.fillRect(cx - hw, cy - hh, this._w, this._h);

    // Outline
    g.lineStyle(2, colour, alpha);
    g.strokeRect(cx - hw, cy - hh, this._w, this._h);

    // Vertical centre beam
    g.lineStyle(1, 0xccffee, alpha * 0.7);
    g.lineBetween(cx, cy - hh + 5, cx, cy + hh - 5);

    // "E" prompt dots when focused
    if (this._focused) {
      g.fillStyle(0xffffff, alpha * 0.9);
      g.fillCircle(cx - 5, cy - hh - 10, 2);
      g.fillCircle(cx,     cy - hh - 10, 2);
      g.fillCircle(cx + 5, cy - hh - 10, 2);
    }
  }
}
