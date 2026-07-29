/**
 * TouchManager
 *
 * The single owner of all input — keyboard AND touch — for the game.
 * Produces a unified TouchInputState each frame that Player and GameScene
 * read from. Neither Player nor GameScene ever read keyboard or pointer
 * events directly.
 *
 * Touch layout:
 *   Bottom-left  — VirtualJoystick (horizontal movement)
 *   Bottom-right — Jump button
 *   Left of Jump — Interact button
 *
 * Auto-detect:
 *   Touch device  → controls visible
 *   Desktop mouse → controls hidden (still functional if touch fires)
 *
 * Debug (F8):
 *   Touch point circles, joystick vector line, button state indicators.
 *
 * Performance: no per-frame allocations. TouchInputState is mutated in place.
 */

import Phaser from 'phaser';
import { VirtualJoystick }     from './VirtualJoystick';
import { TouchButton }         from './TouchButton';
import {
  TouchInputState,
  createTouchInputState,
  resetTouchInputState,
} from './TouchInputState';

// ── Layout constants (in game pixels at 1280×720) ─────────────────────────────

const JOYSTICK_RADIUS  = 70;
const JOYSTICK_THUMB_R = 30;
const JOYSTICK_MARGIN  = 30;   // from left and bottom edge

const BTN_RADIUS       = 38;
const BTN_MARGIN_RIGHT = 40;   // from right edge
const BTN_MARGIN_BOT   = 60;   // from bottom edge
const BTN_SPACING      = 105;  // horizontal gap between interact and jump

// Button colours
const COLOR_JUMP     = 0x3355ff;
const COLOR_INTERACT = 0x33aa44;

// ── TouchDebugInfo (consumed by DebugOverlay) ─────────────────────────────────

export interface TouchDebugInfo {
  active:       boolean;
  visible:      boolean;
  touchCount:   number;
  moveX:        number;
  joystickAngle: number;
  jumpDown:     boolean;
  interactDown: boolean;
}

// ─── TouchManager ─────────────────────────────────────────────────────────────

export class TouchManager {
  // ── Unified input state (mutated each frame, never reallocated) ───────────
  private readonly _state: TouchInputState = createTouchInputState();

  // ── Controls ──────────────────────────────────────────────────────────────
  private readonly _joystick: VirtualJoystick;
  private readonly _jumpBtn:  TouchButton;
  private readonly _intBtn:   TouchButton;

  // ── Keyboard refs ─────────────────────────────────────────────────────────
  private readonly _cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly _wasd: {
    left:  Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up:    Phaser.Input.Keyboard.Key;
  };
  private readonly _eKey:     Phaser.Input.Keyboard.Key;
  private readonly _spaceKey: Phaser.Input.Keyboard.Key;

  // ── State ─────────────────────────────────────────────────────────────────
  private readonly _scene:    Phaser.Scene;
  private _visible = false;
  private _touchCount = 0;

  // ── Debug ─────────────────────────────────────────────────────────────────
  private _debugActive = false;
  private _debugGfx!:   Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this._scene = scene;

    // ── Keyboard setup ──────────────────────────────────────────────────────
    const kb = scene.input.keyboard!;
    this._cursors  = kb.createCursorKeys();
    this._wasd     = {
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };
    this._eKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this._spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // ── Compute initial layout positions ───────────────────────────────────
    const { jx, jy, jumpX, jumpY, intX, intY } = this._layoutPositions();

    // ── Create controls ────────────────────────────────────────────────────
    this._joystick = new VirtualJoystick(scene, jx, jy, JOYSTICK_RADIUS, JOYSTICK_THUMB_R);
    this._jumpBtn  = new TouchButton(scene, jumpX, jumpY, BTN_RADIUS, 'A', COLOR_JUMP);
    this._intBtn   = new TouchButton(scene, intX,  intY,  BTN_RADIUS, 'E', COLOR_INTERACT);

    // ── Auto-detect touch ──────────────────────────────────────────────────
    const isTouchDevice = scene.sys.game.device.input.touch;
    this._setVisible(isTouchDevice);

    // Also show controls on first actual touch (catches desktops with touch screens)
    if (!isTouchDevice) {
      scene.input.once('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.wasTouch) {
          this._setVisible(true);
        }
      });
    }

    // ── Track active pointer count (for debug overlay) ─────────────────────
    scene.input.on('pointerdown', () => { this._touchCount++; });
    scene.input.on('pointerup',   () => { this._touchCount = Math.max(0, this._touchCount - 1); });

    // ── Resize handler ─────────────────────────────────────────────────────
    scene.scale.on('resize', this._onResize, this);

    // ── Debug graphics (created but hidden until F8) ───────────────────────
    this._debugGfx = scene.add.graphics();
    this._debugGfx.setScrollFactor(0);
    this._debugGfx.setDepth(3000);
    this._debugGfx.setVisible(false);

    // ── Cleanup on shutdown ────────────────────────────────────────────────
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Call once per frame (from GameScene.update) before reading currentState.
   * 1. Reset per-frame flags
   * 2. Update joystick + button visuals
   * 3. Read keyboard
   * 4. Merge into _state
   * 5. Refresh debug graphics if active
   */
  update(): void {
    resetTouchInputState(this._state);

    // ── Snapshot button state BEFORE resetFrame() clears justPressed ────────
    // Phaser fires pointerdown events before scene.update(), so by the time
    // we reach here the _onDown handler has already set justPressed = true.
    // resetFrame() must run for visual lerping, but it zeroes justPressed —
    // so we capture the values first, then let resetFrame() clear the flag.
    const btnJumpDown  = this._jumpBtn.isDown;
    const btnJumpJust  = this._jumpBtn.justPressed;
    const btnIntJust   = this._intBtn.justPressed;

    // Per-frame visual lerp + clear justPressed for the NEXT frame
    this._jumpBtn.resetFrame();
    this._intBtn.resetFrame();

    // Update joystick (lerps thumb, computes moveX)
    this._joystick.update();

    // ── Read keyboard ───────────────────────────────────────────────────────
    const kbLeft   = this._cursors.left.isDown  || this._wasd.left.isDown;
    const kbRight  = this._cursors.right.isDown || this._wasd.right.isDown;
    const kbJumpDown = this._cursors.up.isDown  || this._spaceKey.isDown || this._wasd.up.isDown;
    const kbJumpJust =
      Phaser.Input.Keyboard.JustDown(this._cursors.up)   ||
      Phaser.Input.Keyboard.JustDown(this._spaceKey)      ||
      Phaser.Input.Keyboard.JustDown(this._wasd.up);
    const kbInteract = Phaser.Input.Keyboard.JustDown(this._eKey);

    // ── Merge keyboard + touch ──────────────────────────────────────────────
    // moveX: keyboard wins on hard input; joystick provides analogue
    let moveX = this._joystick.moveX;
    if (kbLeft  && !kbRight) moveX = -1;
    if (kbRight && !kbLeft)  moveX =  1;
    if (kbLeft  && kbRight)  moveX =  0;

    this._state.moveX        = moveX;
    this._state.jumpDown     = kbJumpDown || btnJumpDown;
    this._state.jumpJust     = kbJumpJust || btnJumpJust;
    this._state.interactJust = kbInteract || btnIntJust;

    // ── Debug overlay update ────────────────────────────────────────────────
    if (this._debugActive) {
      this._drawDebug();
    }
  }

  /** The unified input state for this frame. Valid after update() is called. */
  get currentState(): Readonly<TouchInputState> {
    return this._state;
  }

  /** Information for the F8 debug text panel. */
  get debugInfo(): TouchDebugInfo {
    const jx = this._joystick.offsetX;
    const jy = this._joystick.offsetY;
    return {
      active:        this._joystick.isActive || this._jumpBtn.isDown || this._intBtn.isDown,
      visible:       this._visible,
      touchCount:    this._touchCount,
      moveX:         this._state.moveX,
      joystickAngle: Math.round(Math.atan2(jy, jx) * (180 / Math.PI)),
      jumpDown:      this._jumpBtn.isDown,
      interactDown:  this._intBtn.isDown,
    };
  }

  showDebug(): void {
    this._debugActive = true;
    this._debugGfx.setVisible(true);
  }

  hideDebug(): void {
    this._debugActive = false;
    this._debugGfx.setVisible(false);
    this._debugGfx.clear();
  }

  destroy(): void {
    this._scene.scale.off('resize', this._onResize, this);
    this._joystick.destroy();
    this._jumpBtn.destroy();
    this._intBtn.destroy();
    this._debugGfx.destroy();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _layoutPositions(): {
    jx: number; jy: number;
    jumpX: number; jumpY: number;
    intX: number; intY: number;
  } {
    const W = this._scene.scale.width;
    const H = this._scene.scale.height;

    return {
      jx:    JOYSTICK_MARGIN + JOYSTICK_RADIUS,
      jy:    H - JOYSTICK_MARGIN - JOYSTICK_RADIUS,
      jumpX: W - BTN_MARGIN_RIGHT - BTN_RADIUS,
      jumpY: H - BTN_MARGIN_BOT  - BTN_RADIUS,
      intX:  W - BTN_MARGIN_RIGHT - BTN_RADIUS - BTN_SPACING,
      intY:  H - BTN_MARGIN_BOT  - BTN_RADIUS,
    };
  }

  private _setVisible(visible: boolean): void {
    this._visible = visible;
    this._joystick.setVisible(visible);
    this._jumpBtn.setVisible(visible);
    this._intBtn.setVisible(visible);
  }

  private _onResize(): void {
    const { jx, jy, jumpX, jumpY, intX, intY } = this._layoutPositions();
    this._joystick.setCenter(jx, jy);
    this._jumpBtn.setPosition(jumpX, jumpY);
    this._intBtn.setPosition(intX, intY);
  }

  private _drawDebug(): void {
    const g = this._debugGfx;
    g.clear();

    // ── Joystick debug ─────────────────────────────────────────────────────
    const jcx = this._joystick.cx;
    const jcy = this._joystick.cy;
    const jR  = this._joystick.radius;

    // Outer radius ring
    g.lineStyle(1, 0xffff00, 0.6);
    g.strokeCircle(jcx, jcy, jR);

    // Vector line from center to current thumb
    const ox = this._joystick.offsetX;
    const oy = this._joystick.offsetY;
    if (Math.abs(ox) > 2 || Math.abs(oy) > 2) {
      g.lineStyle(2, 0xffff00, 0.9);
      g.beginPath();
      g.moveTo(jcx, jcy);
      g.lineTo(jcx + ox, jcy + oy);
      g.strokePath();
      // Arrow tip
      g.fillStyle(0xffff00, 0.9);
      g.fillCircle(jcx + ox, jcy + oy, 5);
    }

    // moveX label (draw as a tiny bar)
    const barW = jR * 2;
    const barH = 6;
    const barX = jcx - jR;
    const barY = jcy + jR + 12;
    g.fillStyle(0x444444, 0.7);
    g.fillRect(barX, barY, barW, barH);
    if (this._state.moveX !== 0) {
      const fillW = Math.abs(this._state.moveX) * (barW / 2);
      const fillX = this._state.moveX > 0 ? jcx : jcx - fillW;
      g.fillStyle(0xffff00, 0.9);
      g.fillRect(fillX, barY, fillW, barH);
    }
    // Centre mark
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(jcx - 1, barY, 2, barH);

    // ── Button states ──────────────────────────────────────────────────────
    const W = this._scene.scale.width;
    const H = this._scene.scale.height;
    const jumpX = W - BTN_MARGIN_RIGHT - BTN_RADIUS;
    const jumpY = H - BTN_MARGIN_BOT  - BTN_RADIUS;
    const intX  = jumpX - BTN_SPACING;
    const intY  = jumpY;

    if (this._jumpBtn.isDown) {
      g.lineStyle(3, 0xffff00, 0.9);
      g.strokeCircle(jumpX, jumpY, BTN_RADIUS + 4);
    }
    if (this._intBtn.isDown) {
      g.lineStyle(3, 0xffff00, 0.9);
      g.strokeCircle(intX, intY, BTN_RADIUS + 4);
    }

    // ── Active touch point count ───────────────────────────────────────────
    // (Phaser doesn't easily expose all active pointers in a list, so we
    //  just show the count which is tracked in _touchCount)
  }
}
