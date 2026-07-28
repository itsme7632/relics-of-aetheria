import Phaser from 'phaser';
import { Interactable } from './Interactable';
import { InteractionEvents } from '../../events/InteractionEvents';

/**
 * Door
 *
 * Architecture-only implementation for Milestone 7.
 * Provides open/close/lock/unlock state machine with visual feedback.
 * No gameplay usage is wired yet — future milestones will connect keys,
 * switches, or scripted triggers to the Door API.
 *
 * States:
 *   closed  — default; blocks passage (future: add physics body)
 *   open    — passage allowed; visual shows open frame
 *   locked  — cannot be opened until unlock() is called
 *
 * Events emitted (entity bus + scene bus):
 *   DOOR_OPENED, DOOR_CLOSED
 *
 * Tiled setup:
 *   Layer:  Objects
 *   Name:   Door
 *   Size:   width × height (default 32×64)
 */
export class Door extends Interactable {
  private _isOpen   = false;
  private _isLocked = false;

  private readonly _w: number;
  private readonly _h: number;

  constructor(scene: Phaser.Scene, w = 32, h = 64) {
    super(scene, 64, false);
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
    this._drawVisual();

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

  interact(): void {
    if (this._isLocked) {
      console.log('[Door] The door is locked.');
      return;
    }
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  activate(): void { this.open(); }
  deactivate(): void { this.close(); }

  // ── Door-specific API ──────────────────────────────────────────────────────

  /** Open the door. No-op if already open or locked. */
  open(): void {
    if (this._isLocked || this._isOpen) return;
    this._isOpen = true;
    this._drawVisual();
    console.log('[Door] Opened.');
    this.emit(InteractionEvents.DOOR_OPENED, this);
    this.scene.events.emit(InteractionEvents.DOOR_OPENED, this);
  }

  /** Close the door. No-op if already closed. */
  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._drawVisual();
    console.log('[Door] Closed.');
    this.emit(InteractionEvents.DOOR_CLOSED, this);
    this.scene.events.emit(InteractionEvents.DOOR_CLOSED, this);
  }

  /** Prevent the door from being opened. */
  lock(): void {
    this._isLocked = true;
    this._drawVisual();
    console.log('[Door] Locked.');
  }

  /** Allow the door to be opened again. */
  unlock(): void {
    this._isLocked = false;
    this._drawVisual();
    console.log('[Door] Unlocked.');
  }

  get isOpen():   boolean { return this._isOpen;   }
  get isLocked(): boolean { return this._isLocked; }

  // ── Private ────────────────────────────────────────────────────────────────

  private _drawVisual(): void {
    const g = this.gfx;
    if (!g) return;
    g.clear();

    const cx = this.x;
    const cy = this.y;
    const hw = this._w / 2;
    const hh = this._h / 2;

    if (this._isLocked) {
      // Red — locked
      g.lineStyle(2, 0xff4444, 0.9);
      g.strokeRect(cx - hw, cy - hh, this._w, this._h);
      g.fillStyle(0xff4444, 0.15);
      g.fillRect(cx - hw, cy - hh, this._w, this._h);
      // Lock icon (simple cross)
      g.lineStyle(1.5, 0xff4444, 0.8);
      g.lineBetween(cx - 5, cy, cx + 5, cy);
      g.lineBetween(cx, cy - 5, cx, cy + 5);
    } else if (this._isOpen) {
      // Green — open (frame only, door panel swung aside)
      g.lineStyle(2, 0x44ff88, 0.9);
      g.strokeRect(cx - hw, cy - hh, this._w, this._h);
      // Open panel hint (shifted right)
      g.lineStyle(1, 0x44ff88, 0.4);
      g.lineBetween(cx + hw - 4, cy - hh, cx + hw - 4, cy + hh);
    } else {
      // Blue-grey — closed
      g.fillStyle(0x334466, 0.8);
      g.fillRect(cx - hw, cy - hh, this._w, this._h);
      g.lineStyle(2, 0x6688aa, 0.9);
      g.strokeRect(cx - hw, cy - hh, this._w, this._h);
      // Door handle
      g.fillStyle(0xaabbcc, 0.9);
      g.fillCircle(cx + hw - 8, cy, 3);
    }
  }
}
