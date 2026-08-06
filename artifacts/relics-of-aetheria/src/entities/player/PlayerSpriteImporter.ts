/**
 * PlayerSpriteImporter
 *
 * M11: Production Sprite Integration Framework
 *
 * The single source of truth for Kai's spritesheet specification.
 * Validates dimensions, frame counts, and animation ranges when the real
 * spritesheet is present.  When the spritesheet is absent the validator is
 * a safe no-op — the placeholder continues to render normally.
 *
 * Dropping the real spritesheet in requires zero code changes elsewhere:
 *   1. Add kai.png to assets/sprites/kai/
 *   2. Remove `optional: true` from the PLAYER entry in AssetManifest.ts
 *   3. KaiAnimationController will start calling sprite.play() automatically
 *
 * Usage (BootScene.create, after AnimationFactory.registerAll):
 *   PlayerSpriteImporter.validate(this);
 */

import Phaser from 'phaser';
import { AssetKeys } from '../../assets/AssetKeys';
import { ANIMATION_REGISTRY } from '../../animation/AnimationRegistry';
import { AnimationKeys } from '../../animation/AnimationKeys';

// ─── Spritesheet specification ─────────────────────────────────────────────────

/**
 * Authoritative spec for the Kai player spritesheet.
 * Changing these values propagates to validation, F9 debug, and all
 * pipeline code without modifying gameplay or animation logic.
 */
export const KAI_SPRITE_SPEC = {
  /** Phaser texture cache key. */
  textureKey:   AssetKeys.PLAYER,
  /** Path relative to the web root (must match AssetManifest.ts). */
  path:         'assets/characters/kai/kai.png',
  /** Width of one animation frame in pixels. */
  frameWidth:   32,
  /** Height of one animation frame in pixels. */
  frameHeight:  48,
  /**
   * Expected total frames in the strip (update when final art is delivered
   * and frame layout changes from the placeholder layout in AnimationRegistry).
   */
  totalFrames:  22,
} as const;

// ─── Import status ─────────────────────────────────────────────────────────────

/** Snapshot returned by PlayerSpriteImporter.validate(). */
export interface SpriteImportStatus {
  /** True if the texture is present in the Phaser cache. */
  loaded: boolean;
  /** Actual texture width in px (0 if not loaded). */
  textureWidth: number;
  /** Actual texture height in px (0 if not loaded). */
  textureHeight: number;
  /** Frame count inferred from texture size ÷ frame spec. */
  inferredFrameCount: number;
  /** Non-blocking issues (wrong frame count, duplicate keys, etc.). */
  warnings: string[];
  /** Blocking issues (invalid dimensions, out-of-range frame refs). */
  errors: string[];
}

// ─── PlayerSpriteImporter ─────────────────────────────────────────────────────

export class PlayerSpriteImporter {

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Validate the Kai spritesheet against KAI_SPRITE_SPEC.
   *
   * When the spritesheet is absent this returns immediately with
   * `{ loaded: false, warnings: [], errors: [] }` — no noise in the console.
   * When present, every check runs and warnings/errors are logged.
   *
   * Call from BootScene.create() after AnimationFactory.registerAll().
   */
  static validate(scene: Phaser.Scene): SpriteImportStatus {
    const status = this._buildStatus(scene);

    if (!status.loaded) return status;

    for (const w of status.warnings) {
      console.warn(`[PlayerSpriteImporter] ⚠  ${w}`);
    }
    for (const e of status.errors) {
      console.error(`[PlayerSpriteImporter] ✖  ${e}`);
    }
    if (status.warnings.length === 0 && status.errors.length === 0) {
      console.log(
        `[PlayerSpriteImporter] ✓ Spritesheet valid — ` +
        `${status.textureWidth}×${status.textureHeight}px, ` +
        `${status.inferredFrameCount} frames ` +
        `(${KAI_SPRITE_SPEC.frameWidth}×${KAI_SPRITE_SPEC.frameHeight} per frame).`,
      );
    }

    return status;
  }

  /**
   * M20A: Build a ProductionArtRegistry-compatible status entry for Kai.
   */
  static getStatus(scene: Phaser.Scene): import('../../assets/ProductionArtRegistry').ArtCategoryStatus {
    const loaded = this.isLoaded(scene);
    const key    = KAI_SPRITE_SPEC.textureKey;
    return {
      label:        'Kai Character',
      source:       loaded ? 'production' : 'procedural',
      loadedKeys:   loaded ? [key] : [],
      missingKeys:  loaded ? [] : [key],
      fallbackDesc: loaded ? '' : 'Procedural placeholder texture (PlayerSpriteFactory)',
    };
  }

  /**
   * Quick check — is the real Kai spritesheet in the texture cache?
   * Returns false when only the procedural placeholder is present.
   */
  static isLoaded(scene: Phaser.Scene): boolean {
    return (
      scene.textures.exists(KAI_SPRITE_SPEC.textureKey) &&
      scene.textures.get(KAI_SPRITE_SPEC.textureKey).key !== '__MISSING'
    );
  }

  /**
   * Returns every Kai-specific animation config from the registry.
   * Used for validation, preview, and tooling — avoids re-filtering the
   * full registry at call sites.
   */
  static getKaiAnimationClips() {
    const kaiKeys = new Set<string>([
      AnimationKeys.PLAYER_IDLE,
      AnimationKeys.PLAYER_RUN,
      AnimationKeys.PLAYER_JUMP,
      AnimationKeys.PLAYER_FALL,
      AnimationKeys.PLAYER_LAND,
      AnimationKeys.PLAYER_CLIMB,
      AnimationKeys.PLAYER_PUSH,
      AnimationKeys.PLAYER_HURT,
      AnimationKeys.PLAYER_CELEBRATE,
    ]);
    return ANIMATION_REGISTRY.filter(c => kaiKeys.has(c.key));
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private static _buildStatus(scene: Phaser.Scene): SpriteImportStatus {
    if (!this.isLoaded(scene)) {
      return { loaded: false, textureWidth: 0, textureHeight: 0,
               inferredFrameCount: 0, warnings: [], errors: [] };
    }

    const tex = scene.textures.get(KAI_SPRITE_SPEC.textureKey);
    const src = tex.getSourceImage() as HTMLImageElement;
    const textureWidth  = src.naturalWidth  ?? src.width  ?? 0;
    const textureHeight = src.naturalHeight ?? src.height ?? 0;

    const warnings: string[] = [];
    const errors:   string[] = [];

    // ── Dimension divisibility ───────────────────────────────────────────────
    if (textureWidth > 0 && textureWidth % KAI_SPRITE_SPEC.frameWidth !== 0) {
      errors.push(
        `Texture width ${textureWidth}px is not a multiple of ` +
        `frameWidth ${KAI_SPRITE_SPEC.frameWidth}px.`,
      );
    }
    if (textureHeight > 0 && textureHeight % KAI_SPRITE_SPEC.frameHeight !== 0) {
      errors.push(
        `Texture height ${textureHeight}px is not a multiple of ` +
        `frameHeight ${KAI_SPRITE_SPEC.frameHeight}px.`,
      );
    }

    // ── Frame count ──────────────────────────────────────────────────────────
    const cols = KAI_SPRITE_SPEC.frameWidth  > 0 ? Math.floor(textureWidth  / KAI_SPRITE_SPEC.frameWidth)  : 0;
    const rows = KAI_SPRITE_SPEC.frameHeight > 0 ? Math.floor(textureHeight / KAI_SPRITE_SPEC.frameHeight) : 0;
    const inferredFrameCount = cols * rows;

    if (inferredFrameCount !== KAI_SPRITE_SPEC.totalFrames) {
      warnings.push(
        `Expected ${KAI_SPRITE_SPEC.totalFrames} total frames but inferred ` +
        `${inferredFrameCount} (${cols} col${cols !== 1 ? 's' : ''} × ` +
        `${rows} row${rows !== 1 ? 's' : ''}). ` +
        `Update KAI_SPRITE_SPEC.totalFrames or AnimationRegistry frame ranges if layout changed.`,
      );
    }

    // ── Per-clip frame range validation ──────────────────────────────────────
    const clips = this.getKaiAnimationClips();
    const seenKeys = new Set<string>();

    for (const clip of clips) {
      // Duplicate key detection
      if (seenKeys.has(clip.key)) {
        warnings.push(`Duplicate animation key "${clip.key}" in AnimationRegistry.`);
      }
      seenKeys.add(clip.key);

      // frameStart ≤ frameEnd
      if (clip.frameStart > clip.frameEnd) {
        errors.push(
          `"${clip.key}": frameStart (${clip.frameStart}) > frameEnd (${clip.frameEnd}).`,
        );
      }

      // Frames within texture bounds
      if (inferredFrameCount > 0 && clip.frameEnd >= inferredFrameCount) {
        errors.push(
          `"${clip.key}": frameEnd=${clip.frameEnd} exceeds available ` +
          `range 0–${inferredFrameCount - 1}.`,
        );
      }
    }

    // ── Missing animation check ───────────────────────────────────────────────
    const expectedKeys = new Set<string>([
      AnimationKeys.PLAYER_IDLE,
      AnimationKeys.PLAYER_RUN,
      AnimationKeys.PLAYER_JUMP,
      AnimationKeys.PLAYER_FALL,
      AnimationKeys.PLAYER_LAND,
      AnimationKeys.PLAYER_CLIMB,
      AnimationKeys.PLAYER_PUSH,
      AnimationKeys.PLAYER_HURT,
      AnimationKeys.PLAYER_CELEBRATE,
    ]);
    for (const key of expectedKeys) {
      if (!clips.some(c => c.key === key)) {
        warnings.push(`Expected Kai animation "${key}" is missing from AnimationRegistry.`);
      }
    }

    return { loaded: true, textureWidth, textureHeight, inferredFrameCount, warnings, errors };
  }
}
