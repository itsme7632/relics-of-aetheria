/**
 * Kai — Milestone 10: Kai Character System
 *
 * Extends Player with visual rendering while preserving every byte of gameplay
 * logic in the parent class.  The blue placeholder rectangle is hidden; a
 * KaiRenderer sprite takes its visual place.  Physics, collision, and input
 * handling are completely unchanged.
 *
 * M11 additions:
 *   - KaiDebugInfo extended with frame index, anim FPS, sprite dimensions,
 *     and texture-loaded status for the improved F9 overlay.
 *
 * Architecture:
 *   Player  — physics body, movement, state machine, input (unchanged)
 *   ↑ extends
 *   Kai     — hides rectangle, wires KaiRenderer + KaiAnimationController
 *     KaiRenderer            — Phaser Sprite, position sync, flip
 *     KaiAnimationController — state → anim key, drives sprite.play()
 *
 * Usage in GameScene:
 *   const player = new Kai(this, spawnX, spawnY);
 *   // All Player API (update, debugInfo, currentState, body, x, y) still works.
 *   // New: player.kaiDebugInfo for the F9 overlay.
 */

import Phaser from 'phaser';
import { Player } from '../Player';
import { PlayerState } from '../PlayerStateMachine';
import type { TouchInputState } from '../../input/TouchInputState';
import { KaiRenderer } from './KaiRenderer';
import { KaiAnimationController } from './KaiAnimationController';
import { PlayerSpriteImporter } from './PlayerSpriteImporter';

// ── KaiDebugInfo ──────────────────────────────────────────────────────────────

export interface KaiDebugInfo {
  /** Phaser animation key that maps to the current state. */
  animKey: string;
  /** Current PlayerStateMachine state. */
  state: PlayerState;
  /** Which direction the sprite is facing. */
  facing: 'left' | 'right';
  /** Current horizontal velocity (px/s). */
  velocityX: number;
  /** Current vertical velocity (px/s, positive = downward). */
  velocityY: number;

  // M11 — live animation / sprite data
  /** Current frame index within the playing animation (-1 when not playing). */
  frameIndex: number;
  /** Configured frameRate of the current animation (0 when not playing). */
  animFps: number;
  /** Display width of the sprite in pixels. */
  spriteWidth: number;
  /** Display height of the sprite in pixels. */
  spriteHeight: number;
  /** True when the real production spritesheet is loaded; false = placeholder. */
  textureLoaded: boolean;

  // M13 — expanded debug fields
  /** Actual Phaser texture key in use ('player' or 'kai_placeholder'). */
  textureKey: string;
  /** True when the current animation key is registered with scene.anims. */
  animLoaded: boolean;
}

// ─── Kai ──────────────────────────────────────────────────────────────────────

export class Kai extends Player {
  private readonly _renderer:       KaiRenderer;
  private readonly _animController: KaiAnimationController;

  /** Accumulator used to compute the flash phase during invulnerability. */
  private _flashTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Hide the blue rectangle — physics body remains active
    this.setVisible(false);
    this.setAlpha(0);

    // Create the visual layer (sprite follows physics rect each frame)
    this._renderer       = new KaiRenderer(scene, x, y);
    this._animController = new KaiAnimationController(this._renderer.sprite);
  }

  // ── Overridden update ─────────────────────────────────────────────────────

  /**
   * Physics and input are handled by super.update() — unchanged.
   * After physics runs, the renderer and animation controller are synced.
   *
   * No allocations: renderer.update() and animController.update() are pure
   * property mutations.
   */
  override update(delta: number, input: TouchInputState): void {
    // 1. Run all physics, state machine transitions, invulnerability timer
    super.update(delta, input);

    // 2. Sync animation state with state machine
    this._animController.update(this.currentState);

    // 3. Sync sprite position and facing with physics body
    this._renderer.update(this.x, this.y, this.body.velocity.x);

    // 4. M17 — flash the sprite during the invulnerability window.
    //    Toggles visibility every 120 ms so the player can tell they were hit
    //    without losing track of their character.
    if (this.isInvulnerable) {
      this._flashTimer += delta;
      this._renderer.setVisible(Math.floor(this._flashTimer / 120) % 2 === 0);
    } else {
      this._flashTimer = 0;
      this._renderer.setVisible(true);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Debug info for the F9 overlay.
   * Only allocated when F9 is active — not on the hot path.
   */
  get kaiDebugInfo(): KaiDebugInfo {
    const sprite   = this._renderer.sprite;
    const animKey  = this._animController.currentAnimKey;
    return {
      animKey,
      state:        this.currentState,
      facing:       this._renderer.facing === 1 ? 'right' : 'left',
      velocityX:    this.body.velocity.x,
      velocityY:    this.body.velocity.y,
      frameIndex:   sprite.anims.currentFrame?.index ?? -1,
      animFps:      sprite.anims.currentAnim?.frameRate ?? 0,
      spriteWidth:  sprite.width,
      spriteHeight: sprite.height,
      textureLoaded: PlayerSpriteImporter.isLoaded(this.scene),
      // M13 expanded fields
      textureKey:  sprite.texture.key,
      animLoaded:  this.scene.anims.exists(animKey),
    };
  }

  /**
   * Drive a controller-only animation state from outside (future: Hurt, Celebrate).
   * Call from GameScene when an external event triggers one of the extended states.
   */
  forceAnimState(state: 'Climb' | 'Push' | 'Hurt' | 'Celebrate'): void {
    this._animController.forceState(state);
  }

  /**
   * Preview a specific animation by key, bypassing the state machine.
   * Useful for debug/tooling — only plays if the animation is registered.
   */
  previewAnimation(key: string): void {
    this._animController.previewAnimation(key);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  override destroy(fromScene?: boolean): void {
    this._renderer.destroy();
    super.destroy(fromScene);
  }
}
