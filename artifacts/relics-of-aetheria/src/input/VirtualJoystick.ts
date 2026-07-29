/**
 * VirtualJoystick
 *
 * On-screen joystick with a fixed base and a draggable thumb.
 * Outputs a normalized horizontal axis value (moveX: -1 to 1).
 *
 * Features:
 *  - Fixed base circle (drawn once, never redrawn — only transform changes)
 *  - Thumb repositioned each frame (no redraw, no allocation)
 *  - Dead zone: inputs below DEAD_ZONE_FRACTION are clamped to 0
 *  - Radius clamp: thumb cannot exceed outer radius
 *  - Smooth opacity animation (lerp, no tween objects)
 *  - Multi-touch safe: claims a specific pointer ID on first contact
 *  - Auto-centers on pointer release
 */

import Phaser from 'phaser';

// ── Visual constants ──────────────────────────────────────────────────────────

const DEAD_ZONE_FRACTION = 0.18;   // 18% of radius is dead zone
const IDLE_ALPHA         = 0.30;
const ACTIVE_ALPHA       = 0.80;
const ALPHA_LERP         = 0.15;
const THUMB_RETURN_LERP  = 0.25;   // how quickly thumb snaps back on release

// ─── VirtualJoystick ─────────────────────────────────────────────────────────

export class VirtualJoystick {
  // ── Public output (read by TouchManager) ─────────────────────────────────
  /** Normalised horizontal axis [-1, 1]. 0 in dead zone. */
  moveX = 0;

  // ── Private ──────────────────────────────────────────────────────────────
  private readonly _scene:       Phaser.Scene;
  private readonly _baseGfx:    Phaser.GameObjects.Graphics;
  private readonly _thumbGfx:   Phaser.GameObjects.Graphics;
  private readonly _radius:     number;
  private readonly _thumbRadius: number;
  private readonly _deadZone:   number;

  private _cx:         number;
  private _cy:         number;
  private _pointerId:  number = -1;

  /** Current thumb offset from center (updated each frame). */
  private _offsetX = 0;
  private _offsetY = 0;

  /** Lerped alpha for the base ring. */
  private _alpha = IDLE_ALPHA;

  constructor(
    scene:       Phaser.Scene,
    cx:          number,
    cy:          number,
    radius:      number,
    thumbRadius: number,
  ) {
    this._scene       = scene;
    this._cx          = cx;
    this._cy          = cy;
    this._radius      = radius;
    this._thumbRadius = thumbRadius;
    this._deadZone    = radius * DEAD_ZONE_FRACTION;

    // ── Base ring (drawn once at local origin, repositioned on resize) ──────
    this._baseGfx = scene.add.graphics();
    this._drawBase();
    this._baseGfx.setPosition(cx, cy);
    this._baseGfx.setScrollFactor(0);
    this._baseGfx.setDepth(2000);
    this._baseGfx.setAlpha(IDLE_ALPHA);

    // ── Thumb (drawn once at local origin, repositioned each frame) ─────────
    this._thumbGfx = scene.add.graphics();
    this._drawThumb();
    this._thumbGfx.setPosition(cx, cy);
    this._thumbGfx.setScrollFactor(0);
    this._thumbGfx.setDepth(2001);

    // ── Pointer listeners ──────────────────────────────────────────────────
    scene.input.on('pointerdown', this._onDown, this);
    scene.input.on('pointermove', this._onMove, this);
    scene.input.on('pointerup',   this._onUp,   this);
    scene.input.on('pointerout',  this._onUp,   this);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Call once per frame. Lerps the thumb toward current offset and
   * animates the base opacity. Computes and stores moveX.
   */
  update(): void {
    const active = this._pointerId !== -1;

    // Lerp base alpha
    const targetAlpha = active ? ACTIVE_ALPHA : IDLE_ALPHA;
    this._alpha = Phaser.Math.Linear(this._alpha, targetAlpha, ALPHA_LERP);
    this._baseGfx.setAlpha(this._alpha);

    // On release, lerp offset back to (0, 0)
    if (!active) {
      this._offsetX = Phaser.Math.Linear(this._offsetX, 0, THUMB_RETURN_LERP);
      this._offsetY = Phaser.Math.Linear(this._offsetY, 0, THUMB_RETURN_LERP);
    }

    // Reposition thumb graphics object (no redraw needed)
    this._thumbGfx.setPosition(this._cx + this._offsetX, this._cy + this._offsetY);

    // Compute normalized axis with dead zone
    const absX    = Math.abs(this._offsetX);
    const deadR   = this._deadZone;
    const maxR    = this._radius;

    if (absX < deadR) {
      this.moveX = 0;
    } else {
      // Remap [deadR, maxR] → [0, 1] so the full range feels responsive
      const sign  = Math.sign(this._offsetX);
      const range = maxR - deadR;
      this.moveX  = Phaser.Math.Clamp(sign * (absX - deadR) / range, -1, 1);
    }
  }

  /** Reposition base and reset thumb (called on resize). */
  setCenter(cx: number, cy: number): void {
    this._cx = cx;
    this._cy = cy;
    this._baseGfx.setPosition(cx, cy);
    this._thumbGfx.setPosition(cx, cy);
    this._offsetX = 0;
    this._offsetY = 0;
    this.moveX    = 0;
    this._pointerId = -1;
  }

  setVisible(visible: boolean): void {
    this._baseGfx.setVisible(visible);
    this._thumbGfx.setVisible(visible);
  }

  destroy(): void {
    this._scene.input.off('pointerdown', this._onDown, this);
    this._scene.input.off('pointermove', this._onMove, this);
    this._scene.input.off('pointerup',   this._onUp,   this);
    this._scene.input.off('pointerout',  this._onUp,   this);
    this._baseGfx.destroy();
    this._thumbGfx.destroy();
  }

  // ── Accessors (for debug overlay) ─────────────────────────────────────────

  get cx(): number { return this._cx; }
  get cy(): number { return this._cy; }
  get offsetX(): number { return this._offsetX; }
  get offsetY(): number { return this._offsetY; }
  get radius(): number { return this._radius; }
  get isActive(): boolean { return this._pointerId !== -1; }

  // ── Private ───────────────────────────────────────────────────────────────

  private _drawBase(): void {
    const g = this._baseGfx;
    const r = this._radius;
    g.clear();
    // Outer ring
    g.lineStyle(3, 0xffffff, 0.7);
    g.strokeCircle(0, 0, r);
    // Inner guide ring (shows dead zone boundary)
    g.lineStyle(1, 0xffffff, 0.25);
    g.strokeCircle(0, 0, this._deadZone);
    // Centre dot
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(0, 0, 4);
  }

  private _drawThumb(): void {
    const g = this._thumbGfx;
    const r = this._thumbRadius;
    g.clear();
    // Filled thumb
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(0, 0, r);
    // Thumb ring
    g.lineStyle(2, 0xaaaaff, 0.9);
    g.strokeCircle(0, 0, r);
  }

  private _hitTest(px: number, py: number): boolean {
    const dx   = px - this._cx;
    const dy   = py - this._cy;
    const hitR = this._radius * 1.4;   // generous pick-up area
    return dx * dx + dy * dy <= hitR * hitR;
  }

  private _clampToRadius(dx: number, dy: number): { x: number; y: number } {
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= this._radius) return { x: dx, y: dy };
    const scale = this._radius / dist;
    return { x: dx * scale, y: dy * scale };
  }

  private _onDown(pointer: Phaser.Input.Pointer): void {
    if (this._pointerId !== -1) return;
    if (!this._hitTest(pointer.x, pointer.y)) return;
    this._pointerId = pointer.id;
    this._updateOffset(pointer.x, pointer.y);
  }

  private _onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this._pointerId) return;
    this._updateOffset(pointer.x, pointer.y);
  }

  private _onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this._pointerId) return;
    this._pointerId = -1;
    // offset lerps back to (0,0) in update()
  }

  private _updateOffset(px: number, py: number): void {
    const raw = this._clampToRadius(px - this._cx, py - this._cy);
    this._offsetX = raw.x;
    this._offsetY = raw.y;
  }
}
