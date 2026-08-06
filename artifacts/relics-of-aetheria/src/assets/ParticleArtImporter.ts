/**
 * ParticleArtImporter — M20A
 *
 * Checks which particle sprite textures are present.  ParticleSystem reads
 * isTextureLoaded() to choose between Sprite-based and procedural
 * Graphics-circle particles for each effect type.
 *
 * Delivery spec (all spritesheets, 16×16 px frames, horizontal strip):
 *   assets/effects/particles/dust.png        — dust puff,       4 frames
 *   assets/effects/particles/leaf.png        — falling leaf,    4 frames
 *   assets/effects/particles/spark.png       — spark flash,     3 frames
 *   assets/effects/particles/crystal.png     — crystal glint,   4 frames
 *   assets/effects/particles/checkpoint.png  — starburst,       4 frames
 *   assets/effects/particles/damage.png      — red burst,       4 frames
 *
 * To deliver artwork:
 *   1. Create assets/effects/particles/ and drop PNGs there.
 *   2. Remove optional: true from the matching entries in AssetManifest.ts.
 *   3. ParticleSystem uses sprite animations automatically.
 */

import Phaser from 'phaser';
import { AssetKeys } from './AssetKeys';
import type { ArtCategoryStatus } from './ProductionArtRegistry';

/** Animation definitions registered when sprites are present. */
export const PARTICLE_ANIM_DEFS = [
  { animKey: 'ptcl_dust',       texKey: AssetKeys.PARTICLE_DUST,       frames: 4, loop: false },
  { animKey: 'ptcl_leaf',       texKey: AssetKeys.PARTICLE_LEAF,       frames: 4, loop: false },
  { animKey: 'ptcl_spark',      texKey: AssetKeys.PARTICLE_SPARK,      frames: 3, loop: false },
  { animKey: 'ptcl_crystal',    texKey: AssetKeys.PARTICLE_CRYSTAL,    frames: 4, loop: false },
  { animKey: 'ptcl_checkpoint', texKey: AssetKeys.PARTICLE_CHECKPOINT, frames: 4, loop: false },
  { animKey: 'ptcl_damage',     texKey: AssetKeys.PARTICLE_DAMAGE,     frames: 4, loop: false },
] as const;

const PARTICLE_KEYS: readonly string[] = PARTICLE_ANIM_DEFS.map(d => d.texKey);

export class ParticleArtImporter {
  /** True when the named particle texture is confirmed in the Phaser cache. */
  static isTextureLoaded(scene: Phaser.Scene, key: string): boolean {
    return scene.textures.exists(key) && scene.textures.get(key).key !== '__MISSING';
  }

  /**
   * Register per-particle one-shot animations for every texture that is present.
   * Safe no-op for any missing texture — existing procedural code handles those.
   * Call from BootScene.create() after AssetLoader finishes.
   */
  static registerAnimations(scene: Phaser.Scene): void {
    let count = 0;
    for (const def of PARTICLE_ANIM_DEFS) {
      if (!this.isTextureLoaded(scene, def.texKey)) continue;
      if (scene.anims.exists(def.animKey)) continue;
      scene.anims.create({
        key:       def.animKey,
        frames:    scene.anims.generateFrameNumbers(def.texKey, {
          start: 0,
          end:   def.frames - 1,
        }),
        frameRate: 12,
        repeat:    0,
      });
      count++;
    }
    if (count > 0) {
      console.log(`[ParticleArtImporter] Registered ${count} particle animation(s).`);
    }
  }

  /** Build a ProductionArtRegistry-compatible status entry. */
  static getStatus(scene: Phaser.Scene): ArtCategoryStatus {
    const loadedKeys:  string[] = [];
    const missingKeys: string[] = [];
    for (const key of PARTICLE_KEYS) {
      (this.isTextureLoaded(scene, key) ? loadedKeys : missingKeys).push(key);
    }
    const source: ArtCategoryStatus['source'] =
      loadedKeys.length === 0    ? 'procedural'
      : missingKeys.length === 0 ? 'production'
      : 'partial';
    return {
      label:        'Particles',
      source,
      loadedKeys,
      missingKeys,
      fallbackDesc: source !== 'production'
        ? `Procedural Graphics circles (${missingKeys.length} effect(s) procedural)`
        : '',
    };
  }
}
