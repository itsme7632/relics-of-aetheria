/**
 * KaiRenderer
 *
 * Owns the visible representation of Kai — a Phaser Sprite that follows the
 * physics rectangle each frame.  All gameplay logic lives in Player (physics
 * body, velocity, state machine); this class only handles what the camera sees.
 *
 * Responsibilities:
 *   - Sprite creation (using the procedural placeholder texture)
 *   - Position sync: setPosition(player.x, player.y) each frame
 *   - Facing: setFlipX based on horizontal velocity
 *   - Depth: renders above tile layers, below UI
 *
 * Why Sprite instead of Image:
 *   Sprite extends Image and adds frame / animation support.  When real
 *   spritesheet frames arrive, KaiAnimationController calls sprite.play()
 *   directly on this object — no refactoring needed.
 *
 * Replacing with real art:
 *   1. Remove KAI_PLACEHOLDER_KEY usage below.
 *   2. Pass the real spritesheet key (e.g. AssetKeys.PLAYER_SHEET).
 *   3. Enable animation calls in KaiAnimationController.
 *
 * Performance: update() calls setPosition() and conditionally setFlipX() —
 * both are O(1) transform mutations.  No allocations.
 */

import Phaser from 'phaser';
import { PlayerConfig } from '../PlayerConfig';
import { KAI_PLACEHOLDER_KEY } from './PlayerSpriteFactory';

// Depth above tile layers (≤100) but below UI (1000+) and touch controls (2000+)
const SPRITE_DEPTH = 5;

// ─── KaiRenderer ──────────────────────────────────────────────────────────────

export class KaiRenderer {
  /** The Phaser sprite — expose for KaiAnimationController.play() calls. */
  readonly sprite: Phaser.GameObjects.Sprite;

  /** 1 = facing right (default), -1 = facing left. */
  private _facing: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.sprite(x, y, KAI_PLACEHOLDER_KEY);
    this.sprite.setOrigin(0.5, 0.5);   // centre matches physics body centre
    this.sprite.setDepth(SPRITE_DEPTH);
    // Sprite is pixel-perfect at 32×48 — no scaling needed for the placeholder
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Sync the sprite to the physics body each frame.
   * @param x         player.x (centre of physics rectangle)
   * @param y         player.y (centre of physics rectangle)
   * @param velocityX Current horizontal velocity — drives flip direction.
   */
  update(x: number, y: number, velocityX: number): void {
    this.sprite.setPosition(x, y);

    // Only change facing when velocity clearly exceeds the run threshold.
    // This prevents flickering while decelerating through zero.
    if (velocityX < -PlayerConfig.runThreshold) {
      if (this._facing !== -1) {
        this._facing = -1;
        this.sprite.setFlipX(true);
      }
    } else if (velocityX > PlayerConfig.runThreshold) {
      if (this._facing !== 1) {
        this._facing = 1;
        this.sprite.setFlipX(false);
      }
    }
    // velocityX within ±runThreshold → keep current facing
  }

  /** 1 = right, -1 = left. */
  get facing(): 1 | -1 {
    return this._facing;
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
