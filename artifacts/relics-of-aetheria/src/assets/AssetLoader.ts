/**
 * AssetLoader
 *
 * Reads ASSET_MANIFEST and registers each entry with Phaser's loader.
 * This is the ONLY place in the codebase that may call:
 *   scene.load.image()
 *   scene.load.spritesheet()
 *   scene.load.atlas()
 *   scene.load.audio()
 *   scene.load.bitmapFont()
 *
 * Game code (scenes, entities, managers) must never call these directly.
 * All asset loads flow through here so the manifest stays authoritative.
 *
 * Usage (BootScene.preload):
 *   AssetLoader.loadAll(this);
 *
 * After Phaser finishes loading (BootScene.create):
 *   AssetValidator.validate(this);   // checks cache, reports issues
 */

import Phaser from 'phaser';
import {
  ASSET_MANIFEST,
  AssetEntry,
  SpritesheetEntry,
  AtlasEntry,
  FontEntry,
} from './AssetManifest';

// ── Debug state (readable by DebugOverlay via GameScene) ──────────────────────

export interface AssetLoaderStats {
  /** Total entries in ASSET_MANIFEST. */
  manifestCount: number;
  /** Keys that were queued for loading (not optional-skipped). */
  queuedKeys: string[];
  /** Keys skipped because optional === true and the entry is pre-emptively
   *  excluded; actual load success/failure is determined by AssetValidator. */
  optionalKeys: string[];
}

// ─── AssetLoader ─────────────────────────────────────────────────────────────

export class AssetLoader {
  private static _stats: AssetLoaderStats = {
    manifestCount: 0,
    queuedKeys:    [],
    optionalKeys:  [],
  };

  /** Stats snapshot populated after loadAll() completes. */
  static get stats(): Readonly<AssetLoaderStats> {
    return this._stats;
  }

  /**
   * Queue every manifest entry with Phaser's loader.
   * Call this from BootScene.preload() — Phaser will execute the queue
   * before create() runs.
   *
   * Optional entries are still queued (Phaser handles 404s gracefully);
   * AssetValidator distinguishes missing vs loaded after the fact.
   */
  static loadAll(scene: Phaser.Scene): void {
    const queued: string[]   = [];
    const optional: string[] = [];

    // Detect duplicate keys before loading to surface config errors early.
    const seen = new Set<string>();
    for (const entry of ASSET_MANIFEST) {
      if (seen.has(entry.key)) {
        console.warn(`[AssetLoader] Duplicate key "${entry.key}" in ASSET_MANIFEST — skipping second occurrence.`);
        continue;
      }
      seen.add(entry.key);

      if (entry.optional) {
        optional.push(entry.key);
      } else {
        queued.push(entry.key);
      }

      // Only queue entries that have files on disk.
      // Optional entries are skipped until the file is delivered — at that
      // point, remove optional: true from the manifest and it loads automatically.
      // This prevents Phaser from logging 404 errors for placeholder slots.
      if (!entry.optional) {
        this._queueEntry(scene, entry);
      }
    }

    this._stats = {
      manifestCount: ASSET_MANIFEST.length,
      queuedKeys:    queued,
      optionalKeys:  optional,
    };

    console.log(
      `[AssetLoader] Queued ${ASSET_MANIFEST.length} asset(s) ` +
      `(${optional.length} optional, ${queued.length} required).`,
    );
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private static _queueEntry(scene: Phaser.Scene, entry: AssetEntry): void {
    try {
      switch (entry.type) {
        case 'image':
          scene.load.image(entry.key, entry.path);
          break;

        case 'spritesheet': {
          const ss = entry as SpritesheetEntry;
          scene.load.spritesheet(entry.key, entry.path, {
            frameWidth:  ss.frameWidth,
            frameHeight: ss.frameHeight,
          });
          break;
        }

        case 'atlas': {
          const at = entry as AtlasEntry;
          scene.load.atlas(entry.key, entry.path, at.atlasPath);
          break;
        }

        case 'audio':
          scene.load.audio(entry.key, entry.path);
          break;

        case 'font': {
          const ft = entry as FontEntry;
          scene.load.bitmapFont(entry.key, entry.path, ft.xmlPath);
          break;
        }

        default: {
          // TypeScript exhaustiveness — should never reach here
          const _exhaustive: never = entry;
          console.warn(`[AssetLoader] Unknown asset type for key "${(entry as AssetEntry).key}".`);
          void _exhaustive;
        }
      }
    } catch (err) {
      console.error(`[AssetLoader] Failed to queue "${entry.key}":`, err);
    }
  }
}
