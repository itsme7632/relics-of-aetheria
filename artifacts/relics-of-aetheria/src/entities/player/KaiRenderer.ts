/**
 * KaiRenderer
 *
 * Owns the visible representation of Kai — a Phaser Sprite that follows the
 * physics rectangle each frame.  All gameplay logic lives in Player (physics
 * body, velocity, state machine); this class only handles what the camera sees.
 *
 * Responsibilities:
 *   - Sprite creation (production texture when loaded, placeholder otherwise)
 *   - Position sync: setPosition(player.x, player.y) each frame
 *   - Facing: setFlipX based on horizontal velocity
 *   - Depth: renders above tile layers, below UI
 *
 * M13 — Production sprite integration:
 *   KaiRenderer now automatically selects the correct backing texture at
 *   construction time:
 *     • AssetKeys.PLAYER ('player')    — when kai.png is present in the cache
 *     • KAI_PLACEHOLDER_KEY            — procedural fallback when art is absent
 *
 *   No other code needs to change when kai.png is delivered:
 *     1. Drop kai.png into assets/characters/kai/
 *     2. Remove `optional: true` from the PLAYER entry in AssetManifest.ts
 *     3. Boot — KaiRenderer picks AssetKeys.PLAYER automatically, and
 *        KaiAnimationController.play() starts animating immediately.
 *
 * Performance: update() calls setPosition() and conditionally setFlipX() —
 * both are O(1) transform mutations.  No allocations.
 */

import Phaser from 'phaser';
import { PlayerConfig } from '../PlayerConfig';
import { KAI_PLACEHOLDER_KEY } from './PlayerSpriteFactory';
import { PlayerSpriteImporter } from './PlayerSpriteImporter';
import { AssetKeys } from '../../assets/AssetKeys';

// Depth above tile layers (≤100) but below UI (1000+) and touch controls (2000+)
const SPRITE_DEPTH = 5;

// ─── KaiRenderer ──────────────────────────────────────────────────────────────

export class KaiRenderer {
  /** The Phaser sprite — exposed for KaiAnimationController.play() calls. */
  readonly sprite: Phaser.GameObjects.Sprite;

  /** 1 = facing right (default), -1 = facing left. */
  private _facing: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // M13: auto-select texture.
    // When the real spritesheet is in the cache (kai.png has been loaded),
    // use AssetKeys.PLAYER so that KaiAnimationController can drive its frames.
    // Otherwise fall back to the procedural placeholder — gameplay is unaffected.
    const textureKey: string = PlayerSpriteImporter.isLoaded(scene)
      ? AssetKeys.PLAYER
      : KAI_PLACEHOLDER_KEY;

    this.sprite = scene.add.sprite(x, y, textureKey);
    this.sprite.setOrigin(0.5, 0.5);   // centre matches physics body centre
    this.sprite.setDepth(SPRITE_DEPTH);
    // Sprite is pixel-perfect at 32×48 — no scaling needed
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
