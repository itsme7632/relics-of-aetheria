/**
 * AnimationFactory
 *
 * Registers animations from ANIMATION_REGISTRY with the Phaser animation
 * manager.  This is the ONLY place that calls scene.anims.create().
 *
 * Design rules:
 *   - Never crashes — if a source texture is missing, the animation is
 *     skipped and recorded in the "pending" list for the debug overlay.
 *   - Idempotent — calling registerAll() twice is safe (Phaser ignores
 *     duplicate keys when skipIfExists: true).
 *   - Config-driven — adding a new animation requires only a registry entry,
 *     not a code change here.
 *
 * Usage (BootScene.create, after AssetValidator.validate):
 *   AnimationFactory.registerAll(this);
 *
 * Debug info for F7 overlay:
 *   AnimationFactory.stats
 */

import Phaser from 'phaser';
import { ANIMATION_REGISTRY, AnimationConfig } from './AnimationRegistry';

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface AnimationFactoryStats {
  /** Animation keys successfully registered with scene.anims. */
  registeredKeys: string[];
  /** Animation keys skipped because the source texture was missing. */
  pendingKeys: string[];
  /** Animation keys skipped because disabled: true in registry. */
  disabledKeys: string[];
}

// ─── AnimationFactory ────────────────────────────────────────────────────────

export class AnimationFactory {
  private static _stats: AnimationFactoryStats = {
    registeredKeys: [],
    pendingKeys:    [],
    disabledKeys:   [],
  };

  /** Stats snapshot populated after the last registerAll() call. */
  static get stats(): Readonly<AnimationFactoryStats> {
    return this._stats;
  }

  /**
   * Register all enabled animations whose source textures are present.
   * Call from BootScene.create() after AssetValidator.validate().
   *
   * Animations whose textures are absent are recorded as "pending" — they
   * will register correctly once the artwork files are delivered and loaded.
   */
  static registerAll(scene: Phaser.Scene): void {
    const registered: string[] = [];
    const pending:    string[] = [];
    const disabled:   string[] = [];

    for (const config of ANIMATION_REGISTRY) {
      if (config.disabled) {
        disabled.push(config.key);
        continue;
      }

      // Skip if source texture is not in cache yet
      if (!scene.textures.exists(config.textureKey) ||
          scene.textures.get(config.textureKey).key === '__MISSING') {
        pending.push(config.key);
        continue;
      }

      try {
        this._registerOne(scene, config);
        registered.push(config.key);
      } catch (err) {
        console.warn(`[AnimationFactory] Failed to register "${config.key}":`, err);
        pending.push(config.key);
      }
    }

    this._stats = { registeredKeys: registered, pendingKeys: pending, disabledKeys: disabled };

    const total = ANIMATION_REGISTRY.length;
    console.log(
      `[AnimationFactory] Registered ${registered.length}/${total} animation(s). ` +
      `${pending.length} pending artwork. ` +
      `${disabled.length} disabled.`,
    );

    if (pending.length > 0) {
      console.log(`[AnimationFactory] Pending (awaiting artwork): ${pending.join(', ')}`);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private static _registerOne(scene: Phaser.Scene, config: AnimationConfig): void {
    // Build the frame range from the spritesheet
    const frames = scene.anims.generateFrameNumbers(config.textureKey, {
      start: config.frameStart,
      end:   config.frameEnd,
    });

    // Guard: if already registered (e.g. scene restart), skip silently.
    if (scene.anims.exists(config.key)) return;

    scene.anims.create({
      key:       config.key,
      frames,
      frameRate: config.frameRate,
      repeat:    config.repeat,
      yoyo:      config.yoyo ?? false,
    });
  }
}
