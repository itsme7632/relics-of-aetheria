/**
 * AssetValidator
 *
 * Runs after Phaser's loader completes (call from BootScene.create).
 * Inspects the Phaser cache to determine which manifest entries loaded
 * successfully and which are missing, then prints a readable report.
 *
 * Rules:
 *   - Never throws — validation failures are warnings, not crashes.
 *   - Required assets (optional: false) that are missing produce a warning.
 *   - Optional assets that are missing are silently tracked.
 *   - Spritesheet frame-size mismatches produce a warning.
 *   - Duplicate keys in the manifest are reported (caught by AssetLoader too).
 *
 * Usage (BootScene.create, after loadAll):
 *   AssetValidator.validate(this);
 *   // then read AssetValidator.report for debug overlay
 */

import Phaser from 'phaser';
import { ASSET_MANIFEST, SpritesheetEntry } from './AssetManifest';

// ─── Report types ────────────────────────────────────────────────────────────

export interface AssetValidationReport {
  /** Keys that are confirmed present in the Phaser cache. */
  loadedKeys: string[];
  /** Required keys that failed to load (missing files). */
  missingRequired: string[];
  /** Optional keys that failed to load. */
  missingOptional: string[];
  /** Keys where the loaded texture dimensions don't match declared frame size. */
  frameSizeWarnings: string[];
}

// ─── AssetValidator ──────────────────────────────────────────────────────────

export class AssetValidator {
  private static _report: AssetValidationReport = {
    loadedKeys:        [],
    missingRequired:   [],
    missingOptional:   [],
    frameSizeWarnings: [],
  };

  /** The validation report produced by the last validate() call. */
  static get report(): Readonly<AssetValidationReport> {
    return this._report;
  }

  /**
   * Validate all manifest entries against the Phaser cache.
   * Call from BootScene.create() after the loader has finished.
   */
  static validate(scene: Phaser.Scene): void {
    const loaded: string[]            = [];
    const missingRequired: string[]   = [];
    const missingOptional: string[]   = [];
    const frameSizeWarnings: string[] = [];

    for (const entry of ASSET_MANIFEST) {
      const present = this._isInCache(scene, entry.key, entry.type);

      if (present) {
        loaded.push(entry.key);

        // ── Spritesheet frame-size validation ────────────────────────────────
        if (entry.type === 'spritesheet') {
          const ss   = entry as SpritesheetEntry;
          const tex  = scene.textures.get(entry.key);
          const src  = tex?.source?.[0];
          if (src) {
            const { width, height } = src;
            if (width % ss.frameWidth !== 0 || height % ss.frameHeight !== 0) {
              const msg =
                `[AssetValidator] Spritesheet "${entry.key}" size ${width}×${height}px ` +
                `is not evenly divisible by declared frame ${ss.frameWidth}×${ss.frameHeight}px.`;
              console.warn(msg);
              frameSizeWarnings.push(entry.key);
            }
          }
        }
      } else {
        if (entry.optional) {
          missingOptional.push(entry.key);
        } else {
          console.warn(
            `[AssetValidator] Required asset "${entry.key}" (${entry.path}) ` +
            `failed to load or was not found in cache.`,
          );
          missingRequired.push(entry.key);
        }
      }
    }

    this._report = { loadedKeys: loaded, missingRequired, missingOptional, frameSizeWarnings };

    // Summary log
    const totalMissing = missingRequired.length + missingOptional.length;
    if (missingRequired.length > 0) {
      console.warn(
        `[AssetValidator] ${missingRequired.length} required asset(s) missing: ` +
        missingRequired.join(', '),
      );
    }

    console.log(
      `[AssetValidator] Validation complete — ` +
      `${loaded.length} loaded, ` +
      `${missingRequired.length} missing (required), ` +
      `${missingOptional.length} missing (optional), ` +
      `${frameSizeWarnings.length} frame-size warning(s). ` +
      `${totalMissing === 0 ? '✓' : '⚠'}`,
    );
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private static _isInCache(
    scene: Phaser.Scene,
    key: string,
    type: string,
  ): boolean {
    switch (type) {
      case 'image':
      case 'spritesheet':
      case 'atlas':
        // textures.exists() returns true for both images and spritesheets
        return scene.textures.exists(key) && scene.textures.get(key).key !== '__MISSING';

      case 'audio':
        return scene.cache.audio.has(key);

      case 'font':
        return scene.cache.bitmapFont.has(key);

      default:
        return false;
    }
  }
}
