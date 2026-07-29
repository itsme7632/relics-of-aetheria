/**
 * TouchButton
 *
 * A single circular on-screen button for touch controls.
 * Renders as a filled circle with a label. Supports multi-touch by
 * claiming a specific pointer ID on first contact.
 *
 * Key properties (read each frame by TouchManager):
 *   isDown       — true while finger is held on this button
 *   justPressed  — true only on the first frame of contact; call resetFrame() each frame
 *
 * Performance: Graphics drawn once in the constructor, never redrawn.
 * Repositioning uses setPosition() which mutates transform, not draw commands.
 * No allocations per frame.
 */

import Phaser from 'phaser';

// ── Visual constants ──────────────────────────────────────────────────────────

const IDLE_ALPHA    = 0.45;
const ACTIVE_ALPHA  = 0.85;
const PRESS_SCALE   = 0.82;
const NORMAL_SCALE  = 1.0;
const ALPHA_LERP    = 0.18;
const SCALE_LERP    = 0.22;

// ─── TouchButton ─────────────────────────────────────────────────────────────

export class TouchButton {
  // ── Public state (read by TouchManager) ──────────────────────────────────
  isDown      = false;
  justPressed = false;

  // ── Private ──────────────────────────────────────────────────────────────
  private readonly _scene:    Phaser.Scene;
  private readonly _bgGfx:   Phaser.GameObjects.Graphics;
  private readonly _label:   Phaser.GameObjects.Text;
  private readonly _radius:  number;
  private readonly _color:   number;

  private _cx:        number;
  private _cy:        number;
  private _pointerId: number = -1;

  /** Current rendered scale (lerped toward target each frame). */
  private _scale = NORMAL_SCALE;
  /** Current rendered alpha (lerped each frame). */
  private _alpha = IDLE_ALPHA;

  constructor(
    scene:  Phaser.Scene,
    cx:     number,
    cy:     number,
    radius: number,
    label:  string,
    color:  number,
  ) {
    this._scene  = scene;
    this._cx     = cx;
    this._cy     = cy;
    this._radius = radius;
    this._color  = color;

    // ── Background circle (drawn once at local origin) ──────────────────────
    this._bgGfx = scene.add.graphics();
    this._drawBg();
    this._bgGfx.setPosition(cx, cy);
    this._bgGfx.setScrollFactor(0);
    this._bgGfx.setDepth(2000);
    this._bgGfx.setAlpha(IDLE_ALPHA);

    // ── Label ──────────────────────────────────────────────────────────────
    this._label = scene.add.text(cx, cy, label, {
      fontSize:   `${Math.round(radius * 0.65)}px`,
      fontFamily: '"Courier New", Courier, monospace',
      color:      '#ffffff',
      fontStyle:  'bold',
    });
    this._label.setOrigin(0.5, 0.5);
    this._label.setScrollFactor(0);
    this._label.setDepth(2001);
    this._label.setAlpha(IDLE_ALPHA + 0.2);

    // ── Pointer listeners ──────────────────────────────────────────────────
    scene.input.on('pointerdown', this._onDown,  this);
    scene.input.on('pointermove', this._onMove,  this);
    scene.input.on('pointerup',   this._onUp,    this);
    scene.input.on('pointerout',  this._onUp,    this);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Call once per frame before reading isDown / justPressed.
   * Clears the one-frame-only justPressed flag.
   * Lerps visual state toward current logical state.
   */
  resetFrame(): void {
    this.justPressed = false;

    // Lerp scale + alpha toward targets
    const targetScale = this.isDown ? PRESS_SCALE  : NORMAL_SCALE;
    const targetAlpha = this.isDown ? ACTIVE_ALPHA  : IDLE_ALPHA;

    this._scale = Phaser.Math.Linear(this._scale, targetScale, SCALE_LERP);
    this._alpha = Phaser.Math.Linear(this._alpha, targetAlpha, ALPHA_LERP);

    this._bgGfx.setScale(this._scale);
    this._bgGfx.setAlpha(this._alpha);
    this._label.setScale(this._scale);
    this._label.setAlpha(Math.min(1, this._alpha + 0.2));
  }

  /** Reposition the button (called on resize). */
  setPosition(cx: number, cy: number): void {
    this._cx = cx;
    this._cy = cy;
    this._bgGfx.setPosition(cx, cy);
    this._label.setPosition(cx, cy);
  }

  setVisible(visible: boolean): void {
    this._bgGfx.setVisible(visible);
    this._label.setVisible(visible);
  }

  destroy(): void {
    this._scene.input.off('pointerdown', this._onDown,  this);
    this._scene.input.off('pointermove', this._onMove,  this);
    this._scene.input.off('pointerup',   this._onUp,    this);
    this._scene.input.off('pointerout',  this._onUp,    this);
    this._bgGfx.destroy();
    this._label.destroy();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _drawBg(): void {
    const g = this._bgGfx;
    const r = this._radius;
    g.clear();
    // Outer border ring
    g.lineStyle(2.5, 0xffffff, 0.6);
    g.strokeCircle(0, 0, r);
    // Filled background
    g.fillStyle(this._color, 0.7);
    g.fillCircle(0, 0, r - 2);
  }

  private _hitTest(px: number, py: number): boolean {
    const dx = px - this._cx;
    const dy = py - this._cy;
    const hitR = this._radius * 1.3;  // slightly generous hit area
    return dx * dx + dy * dy <= hitR * hitR;
  }

  private _onDown(pointer: Phaser.Input.Pointer): void {
    if (this._pointerId !== -1) return;          // already claimed by another finger
    if (!this._hitTest(pointer.x, pointer.y)) return;
    this._pointerId  = pointer.id;
    this.isDown      = true;
    this.justPressed = true;
  }

  private _onMove(_pointer: Phaser.Input.Pointer): void {
    // No drag behavior needed for buttons — state is locked to initial press
  }

  private _onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this._pointerId) return;
    this._pointerId = -1;
    this.isDown     = false;
  }
}
