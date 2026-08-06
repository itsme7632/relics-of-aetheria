/**
 * SnakeSpriteImporter — M20A
 *
 * Production asset spec and validator for the SnakeEnemy spritesheet.
 * SnakeEnemy reads isLoaded() at spawn time to choose between the
 * production Sprite path and the existing procedural Graphics fallback.
 *
 * Delivery spec:
 *   File  : assets/enemies/snake/snake.png
 *   Key   : AssetKeys.ENEMY_SNAKE  ('enemy_snake')
 *   Layout: horizontal strip, 32×32 px per frame
 *
 * Animation clip layout (18 total frames):
 *   idle    frames  0–3   (looping)
 *   crawl   frames  4–7   (looping)
 *   attack  frames  8–11  (one-shot)
 *   hurt    frames 12–13  (one-shot)
 *   death   frames 14–17  (one-shot)
 *
 * To deliver artwork:
 *   1. Drop snake.png at the path above.
 *   2. Remove optional: true from the ENEMY_SNAKE entry in AssetManifest.ts.
 *   3. SnakeEnemy will automatically switch to sprite rendering on next boot.
 */

import Phaser from 'phaser';
import { AssetKeys } from './AssetKeys';
import type { ArtCategoryStatus } from './ProductionArtRegistry';

export const SNAKE_SPRITE_SPEC = {
  textureKey:  AssetKeys.ENEMY_SNAKE,
  path:        'assets/enemies/snake/snake.png',
  frameWidth:  32,
  frameHeight: 32,
  totalFrames: 18,
  clips: {
    idle:   { key: 'snake_idle',   start: 0,  end: 3,  loop: true  },
    crawl:  { key: 'snake_crawl',  start: 4,  end: 7,  loop: true  },
    attack: { key: 'snake_attack', start: 8,  end: 11, loop: false },
    hurt:   { key: 'snake_hurt',   start: 12, end: 13, loop: false },
    death:  { key: 'snake_death',  start: 14, end: 17, loop: false },
  },
} as const;

export class SnakeSpriteImporter {
  /** True when the snake spritesheet is confirmed in the Phaser cache. */
  static isLoaded(scene: Phaser.Scene): boolean {
    return (
      scene.textures.exists(SNAKE_SPRITE_SPEC.textureKey) &&
      scene.textures.get(SNAKE_SPRITE_SPEC.textureKey).key !== '__MISSING'
    );
  }

  /**
   * Register snake animations if the spritesheet is present.
   * Safe no-op when the file is absent.
   * Call from BootScene.create() after AssetLoader finishes.
   */
  static registerAnimations(scene: Phaser.Scene): void {
    if (!this.isLoaded(scene)) return;

    let count = 0;
    for (const clip of Object.values(SNAKE_SPRITE_SPEC.clips)) {
      if (scene.anims.exists(clip.key)) continue;
      scene.anims.create({
        key:       clip.key,
        frames:    scene.anims.generateFrameNumbers(
          SNAKE_SPRITE_SPEC.textureKey,
          { start: clip.start, end: clip.end },
        ),
        frameRate: 8,
        repeat:    clip.loop ? -1 : 0,
      });
      count++;
    }
    if (count > 0) {
      console.log(`[SnakeSpriteImporter] ✓ Registered ${count} snake animation(s).`);
    }
  }

  /** Build a ProductionArtRegistry-compatible status entry. */
  static getStatus(scene: Phaser.Scene): ArtCategoryStatus {
    const loaded = this.isLoaded(scene);
    return {
      label:        'Snake Enemy',
      source:       loaded ? 'production' : 'procedural',
      loadedKeys:   loaded ? [SNAKE_SPRITE_SPEC.textureKey] : [],
      missingKeys:  loaded ? [] : [SNAKE_SPRITE_SPEC.textureKey],
      fallbackDesc: loaded ? '' : 'Procedural Graphics snake (green rounded rect)',
    };
  }
}
