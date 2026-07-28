import Phaser from 'phaser';
import { Interactable } from './Interactable';
import { InteractionEvents } from '../../events/InteractionEvents';

/**
 * Sign
 *
 * A simple interactable that logs its message when the player presses E.
 * Validates the E-press interaction framework and serves as the foundation
 * for future NPC dialogue systems.
 *
 * Message source (in order of priority):
 *   1. Tiled custom property  `message`  (string) on the object
 *   2. Constructor argument
 *   3. Default: "An ancient inscription..."
 *
 * Events emitted (entity bus + scene bus):
 *   SIGN_READ — payload: message string
 *
 * Tiled setup:
 *   Layer:    Objects
 *   Name:     Sign
 *   Property: message (string) — the text to display
 */
export class Sign extends Interactable {
  private readonly _message: string;
  private readonly _w: number;
  private readonly _h: number;

  constructor(scene: Phaser.Scene, message = 'An ancient inscription...', w = 24, h = 32) {
    super(scene, 64, false);
    this._message = message;
    this._w       = w;
    this._h       = h;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  spawn(x: number, y: number): void {
    const cx = x + this._w / 2;
    const cy = y + this._h / 2;
    this._setPos(cx, cy);

    this.gfx = this.scene.add.graphics();
    this.gfx.setDepth(5);
    this._drawVisual();

    this._active = true;
  }

  destroy(): void {
    this._active = false;
    this.gfx?.destroy();
    this.gfx = null;
  }

  // ── Interaction API ────────────────────────────────────────────────────────

  interact(): void {
    console.log(`[Sign] "${this._message}"`);
    this.emit(InteractionEvents.SIGN_READ, this._message);
    this.scene.events.emit(InteractionEvents.SIGN_READ, this._message);
  }

  activate(): void {}
  deactivate(): void {}

  protected override _onFocusChanged(focused: boolean): void {
    this._drawVisual();
    if (focused) {
      console.log('[Sign] Press E to read');
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _drawVisual(): void {
    const g = this.gfx;
    if (!g) return;
    g.clear();

    const cx = this.x;
    const cy = this.y;
    const hw = this._w / 2;
    const hh = this._h / 2;

    const boardCol = this._focused ? 0xffe066 : 0xcc9944;
    const postCol  = 0x885522;

    // Post
    g.fillStyle(postCol, 1);
    g.fillRect(cx - 2, cy - hh, 4, this._h + 8);

    // Board
    g.fillStyle(boardCol, 0.92);
    g.fillRect(cx - hw, cy - hh, this._w, this._h * 0.65);
    g.lineStyle(1.5, 0xffffff, this._focused ? 0.9 : 0.4);
    g.strokeRect(cx - hw, cy - hh, this._w, this._h * 0.65);

    // Dot lines (text suggestion)
    g.lineStyle(1, 0x442200, 0.7);
    g.lineBetween(cx - hw + 4, cy - hh + 6, cx + hw - 4, cy - hh + 6);
    g.lineBetween(cx - hw + 4, cy - hh + 11, cx + hw - 4, cy - hh + 11);
  }
}
