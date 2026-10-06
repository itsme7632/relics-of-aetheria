/**
 * AssetCatalog
 *
 * M12: Production Asset Pipeline & World Foundation
 *
 * The game-level abstraction over AssetManifest.  Enriches every manifest
 * entry with a category, validation status, and per-entry error list.
 * AssetManifest / AssetLoader remain the Phaser-specific loading layer;
 * AssetCatalog is the production pipeline layer above them.
 *
 * Responsibilities:
 *   - Assign every asset a category (characters, enemies, tilesets, …)
 *   - Run static validation (duplicate keys/paths, bad extensions, bad metadata)
 *     once at construction time — no Phaser scene needed.
 *   - Run runtime validation after Phaser loads assets (updates validationStatus).
 *   - Expose grouped loading by category (loadByCategory).
 *   - Provide stats for the F7 debug overlay.
 *
 * Usage (BootScene.create, after AssetValidator.validate and AnimationFactory.registerAll):
 *   const catalog = AssetCatalog.instance;
 *   catalog.validateRuntime(this);
 *
 * Category-based loading (alternative to AssetLoader.loadAll):
 *   AssetCatalog.instance.loadByCategory(this, 'characters');
 *   AssetCatalog.instance.loadByCategory(this, 'ui');
 */

import Phaser from 'phaser';
import { ASSET_MANIFEST, AssetEntry, AssetType, SpritesheetEntry, AtlasEntry, FontEntry } from './AssetManifest';
import {
  PLAYER, CRYSTAL,
  ENEMY_SLIME, ENEMY_GOBLIN, ENEMY_BAT, ENEMY_SNAKE,
  EFFECT_DUST_PUFF, EFFECT_SPARKLE, EFFECT_COLLECT_BURST,
  OBJECT_CHECKPOINT, OBJECT_LEVEL_EXIT,
  UI_HEART, UI_HEART_EMPTY, UI_CRYSTAL_ICON, UI_PANEL, UI_BUTTON_NORMAL, UI_BUTTON_HOVER,
  AUDIO_BGM_JUNGLE, AUDIO_BGM_CAVE, AUDIO_BGM_RUINS,
  AUDIO_SFX_JUMP, AUDIO_SFX_LAND, AUDIO_SFX_CRYSTAL_COLLECT,
  AUDIO_SFX_CHECKPOINT, AUDIO_SFX_LEVEL_COMPLETE, AUDIO_SFX_HURT, AUDIO_SFX_DOOR_OPEN,
  FONT_HUD, FONT_TITLE,
  BG_WORLD01_SKY, BG_WORLD01_CLOUDS, BG_WORLD01_MOUNTAINS,
  BG_WORLD01_JUNGLE, BG_WORLD01_TREES, BG_WORLD01_VINES,
  BG_WORLD01_MIST, BG_WORLD01_SUNRAYS,
  PARTICLE_DUST, PARTICLE_LEAF, PARTICLE_SPARK,
  PARTICLE_CRYSTAL, PARTICLE_CHECKPOINT, PARTICLE_DAMAGE,
} from './AssetKeys';

// ─── Category ─────────────────────────────────────────────────────────────────

export type AssetCategory =
  | 'characters'
  | 'enemies'
  | 'tilesets'
  | 'backgrounds'
  | 'objects'
  | 'ui'
  | 'particles'
  | 'audio'
  | 'fonts';

export const ASSET_CATEGORIES: AssetCategory[] = [
  'characters', 'enemies', 'tilesets', 'backgrounds',
  'objects', 'ui', 'particles', 'audio', 'fonts',
];

// ─── Validation status ────────────────────────────────────────────────────────

export type ValidationStatus =
  | 'pending'           // not yet runtime-validated
  | 'loaded'            // confirmed in Phaser cache ✓
  | 'missing_optional'  // optional, not in cache (expected during dev)
  | 'missing_required'  // required, not in cache — error
  | 'frame_error'       // loaded but frame dimensions wrong
  | 'invalid';          // static validation failed (bad extension, missing field, etc.)

// ─── CatalogEntry ─────────────────────────────────────────────────────────────

export interface CatalogEntry {
  /** Phaser cache key (from AssetKeys). */
  readonly key:      string;
  /** Production asset category. */
  readonly category: AssetCategory;
  /** File path relative to web root. */
  readonly path:     string;
  /** Asset type (drives which Phaser load call is used). */
  readonly type:     AssetType;
  /** When true the entry is expected to be absent; missing produces no error. */
  readonly optional: boolean;
  // Spritesheet metadata
  readonly frameWidth?:  number;
  readonly frameHeight?: number;
  readonly frameCount?:  number;
  // Atlas / font metadata
  readonly atlasPath?: string;
  readonly xmlPath?:   string;

  /** Updated by validateRuntime(). 'pending' until then. */
  validationStatus: ValidationStatus;
  /** Human-readable issues found during static or runtime validation. */
  validationErrors: string[];
}

// ─── Validation reports ───────────────────────────────────────────────────────

export interface StaticValidationResult {
  duplicateKeys:          string[];
  duplicatePaths:         string[];
  unsupportedExtensions:  string[];
  invalidMetadata:        string[];
  warnings:               string[];
}

export interface CatalogStats {
  total:     number;
  loaded:    number;
  failed:    number;  // missing_required count
  pending:   number;  // not yet runtime-validated
  byCategory: Partial<Record<AssetCategory, { total: number; loaded: number; failed: number }>>;
  /** JS heap size in MB, or null if performance.memory is unavailable. */
  memoryEstimateMB: number | null;
}

// ─── Supported extensions by type ────────────────────────────────────────────

const SUPPORTED_EXTENSIONS: Record<AssetType, string[]> = {
  image:       ['.png', '.jpg', '.jpeg', '.webp'],
  spritesheet: ['.png', '.jpg', '.jpeg'],
  atlas:       ['.png'],
  audio:       ['.ogg', '.mp3', '.wav', '.m4a'],
  font:        ['.png'],
};

// ─── Key → category map ───────────────────────────────────────────────────────

const KEY_CATEGORY: Record<string, AssetCategory> = {
  [PLAYER]:               'characters',

  [ENEMY_SLIME]:          'enemies',
  [ENEMY_GOBLIN]:         'enemies',
  [ENEMY_BAT]:            'enemies',
  [ENEMY_SNAKE]:          'enemies',      // M20A

  [CRYSTAL]:              'objects',

  [UI_HEART]:             'ui',
  [UI_HEART_EMPTY]:       'ui',           // M20A
  [UI_CRYSTAL_ICON]:      'ui',
  [UI_PANEL]:             'ui',
  [UI_BUTTON_NORMAL]:     'ui',
  [UI_BUTTON_HOVER]:      'ui',

  [EFFECT_DUST_PUFF]:     'particles',
  [EFFECT_SPARKLE]:       'particles',
  [EFFECT_COLLECT_BURST]: 'particles',

  [OBJECT_CHECKPOINT]:    'objects',
  [OBJECT_LEVEL_EXIT]:    'objects',

  // M20A: particle sprites
  [PARTICLE_DUST]:        'particles',
  [PARTICLE_LEAF]:        'particles',
  [PARTICLE_SPARK]:       'particles',
  [PARTICLE_CRYSTAL]:     'particles',
  [PARTICLE_CHECKPOINT]:  'particles',
  [PARTICLE_DAMAGE]:      'particles',

  // M20A: background layers
  [BG_WORLD01_SKY]:       'backgrounds',
  [BG_WORLD01_CLOUDS]:    'backgrounds',
  [BG_WORLD01_MOUNTAINS]: 'backgrounds',
  [BG_WORLD01_JUNGLE]:    'backgrounds',
  [BG_WORLD01_TREES]:     'backgrounds',
  [BG_WORLD01_VINES]:     'backgrounds',
  [BG_WORLD01_MIST]:      'backgrounds',
  [BG_WORLD01_SUNRAYS]:   'backgrounds',

  [AUDIO_BGM_JUNGLE]:          'audio',
  [AUDIO_BGM_CAVE]:            'audio',
  [AUDIO_BGM_RUINS]:           'audio',
  [AUDIO_SFX_JUMP]:            'audio',
  [AUDIO_SFX_LAND]:            'audio',
  [AUDIO_SFX_CRYSTAL_COLLECT]: 'audio',
  [AUDIO_SFX_CHECKPOINT]:      'audio',
  [AUDIO_SFX_LEVEL_COMPLETE]:  'audio',
  [AUDIO_SFX_HURT]:            'audio',
  [AUDIO_SFX_DOOR_OPEN]:       'audio',

  [FONT_HUD]:   'fonts',
  [FONT_TITLE]: 'fonts',
};

// ─── AssetCatalog ─────────────────────────────────────────────────────────────

export class AssetCatalog {

  // ── Singleton ────────────────────────────────────────────────────────────────

  private static _instance: AssetCatalog | null = null;

  static get instance(): AssetCatalog {
    if (!AssetCatalog._instance) {
      AssetCatalog._instance = new AssetCatalog();
    }
    return AssetCatalog._instance;
  }

  // ── Instance fields ───────────────────────────────────────────────────────────

  private readonly _entries:         CatalogEntry[];
  private readonly _staticResult:    StaticValidationResult;
  private          _runtimeValidated = false;

  private constructor() {
    this._entries      = this._buildEntries();
    this._staticResult = this._runStaticValidation();
    this._logStaticResult();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  /** All catalog entries (read-only view). */
  get entries(): readonly CatalogEntry[] { return this._entries; }

  /** Result of the static validation (populated at construction). */
  get staticResult(): Readonly<StaticValidationResult> { return this._staticResult; }

  /** Returns entries for a specific category. */
  getByCategory(category: AssetCategory): CatalogEntry[] {
    return this._entries.filter(e => e.category === category);
  }

  /**
   * Queue all entries for a given category with Phaser's loader.
   * Respects optional — only required assets are queued; remove optional: true
   * from an entry's AssetManifest record when the file is ready.
   *
   * Call from BootScene.preload() as an alternative to AssetLoader.loadAll().
   */
  loadByCategory(scene: Phaser.Scene, category: AssetCategory): void {
    const entries = this.getByCategory(category).filter(e => !e.optional);
    for (const entry of entries) {
      this._queueOne(scene, entry);
    }
    console.log(
      `[AssetCatalog] Queued ${entries.length} "${category}" asset(s) for loading.`,
    );
  }

  /**
   * Validate every catalog entry against the Phaser cache.
   * Updates validationStatus on each entry.
   * Call from BootScene.create() after Phaser's loader has finished.
   */
  validateRuntime(scene: Phaser.Scene): void {
    this._runtimeValidated = true;

    for (const entry of this._entries) {
      if (entry.validationStatus === 'invalid') continue; // already marked bad

      const inCache = this._isInCache(scene, entry.key, entry.type);

      if (!inCache) {
        entry.validationStatus = entry.optional ? 'missing_optional' : 'missing_required';
        if (!entry.optional) {
          entry.validationErrors.push(`Required asset not in Phaser cache.`);
          console.warn(`[AssetCatalog] Required "${entry.key}" (${entry.path}) not loaded.`);
        }
        continue;
      }

      // Spritesheet frame-size check
      if (entry.type === 'spritesheet' && entry.frameWidth && entry.frameHeight) {
        const tex = scene.textures.get(entry.key);
        const src = tex?.source?.[0];
        if (src) {
          const { width, height } = src;
          if (width % entry.frameWidth !== 0 || height % entry.frameHeight !== 0) {
            entry.validationStatus = 'frame_error';
            const msg = `Texture ${width}×${height}px not divisible by frame ${entry.frameWidth}×${entry.frameHeight}px.`;
            entry.validationErrors.push(msg);
            console.warn(`[AssetCatalog] "${entry.key}" frame error: ${msg}`);
            continue;
          }
        }
      }

      entry.validationStatus = 'loaded';
    }

    const s = this.stats;
    console.log(
      `[AssetCatalog] Runtime validation complete — ` +
      `${s.loaded}/${s.total} loaded, ` +
      `${s.failed} required missing.`,
    );
  }

  /** Aggregate stats across all entries. */
  get stats(): CatalogStats {
    const byCategory: Partial<Record<AssetCategory, { total: number; loaded: number; failed: number }>> = {};

    let loaded = 0;
    let failed = 0;
    let pending = 0;

    for (const entry of this._entries) {
      const cat = entry.category;
      if (!byCategory[cat]) byCategory[cat] = { total: 0, loaded: 0, failed: 0 };
      byCategory[cat]!.total++;

      switch (entry.validationStatus) {
        case 'loaded':            loaded++;              byCategory[cat]!.loaded++; break;
        case 'missing_required':  failed++;              byCategory[cat]!.failed++; break;
        case 'frame_error':       failed++;              byCategory[cat]!.failed++; break;
        case 'pending':           pending++;             break;
        default: break;
      }
    }

    // Memory estimate — Chrome only; safely absent elsewhere
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const memoryEstimateMB = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null;

    return {
      total: this._entries.length,
      loaded,
      failed,
      pending,
      byCategory,
      memoryEstimateMB,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private _buildEntries(): CatalogEntry[] {
    return ASSET_MANIFEST.map((e: AssetEntry): CatalogEntry => {
      const ss = e.type === 'spritesheet' ? e as SpritesheetEntry : undefined;
      const at = e.type === 'atlas'       ? e as AtlasEntry       : undefined;
      const ft = e.type === 'font'        ? e as FontEntry        : undefined;

      return {
        key:         e.key,
        category:    KEY_CATEGORY[e.key] ?? 'objects',
        path:        e.path,
        type:        e.type,
        optional:    e.optional ?? false,
        frameWidth:  ss?.frameWidth,
        frameHeight: ss?.frameHeight,
        frameCount:  ss?.frameCount,
        atlasPath:   at?.atlasPath,
        xmlPath:     ft?.xmlPath,
        validationStatus: 'pending',
        validationErrors: [],
      };
    });
  }

  private _runStaticValidation(): StaticValidationResult {
    const duplicateKeys:         string[] = [];
    const duplicatePaths:        string[] = [];
    const unsupportedExtensions: string[] = [];
    const invalidMetadata:       string[] = [];
    const warnings:              string[] = [];

    const seenKeys  = new Map<string, number>();
    const seenPaths = new Map<string, string>();

    for (const entry of this._entries) {
      // Duplicate key check
      seenKeys.set(entry.key, (seenKeys.get(entry.key) ?? 0) + 1);

      // Duplicate path check
      if (seenPaths.has(entry.path)) {
        duplicatePaths.push(`"${entry.key}" shares path "${entry.path}" with "${seenPaths.get(entry.path)}"`);
        entry.validationStatus = 'invalid';
        entry.validationErrors.push(`Duplicate path: ${entry.path}`);
      } else {
        seenPaths.set(entry.path, entry.key);
      }

      // Extension check
      const ext = this._ext(entry.path);
      const allowed = SUPPORTED_EXTENSIONS[entry.type];
      if (allowed && !allowed.includes(ext)) {
        unsupportedExtensions.push(
          `"${entry.key}" (${entry.type}): extension "${ext}" not in [${allowed.join(', ')}]`,
        );
        entry.validationStatus = 'invalid';
        entry.validationErrors.push(`Unsupported extension "${ext}" for type "${entry.type}".`);
      }

      // Metadata validation
      if (entry.type === 'spritesheet' && (!entry.frameWidth || !entry.frameHeight)) {
        invalidMetadata.push(`"${entry.key}": spritesheet missing frameWidth or frameHeight.`);
        entry.validationStatus = 'invalid';
        entry.validationErrors.push('Spritesheet missing frameWidth/frameHeight.');
      }
      if (entry.type === 'font' && !entry.xmlPath) {
        invalidMetadata.push(`"${entry.key}": font missing xmlPath.`);
        entry.validationStatus = 'invalid';
        entry.validationErrors.push('Font missing xmlPath.');
      }
      if (entry.type === 'atlas' && !entry.atlasPath) {
        invalidMetadata.push(`"${entry.key}": atlas missing atlasPath.`);
        entry.validationStatus = 'invalid';
        entry.validationErrors.push('Atlas missing atlasPath.');
      }

      // Empty path
      if (!entry.path || entry.path.trim() === '') {
        invalidMetadata.push(`"${entry.key}": empty path.`);
        entry.validationStatus = 'invalid';
        entry.validationErrors.push('Path is empty.');
      }
    }

    // Duplicate key report (after full scan)
    for (const [key, count] of seenKeys) {
      if (count > 1) duplicateKeys.push(`"${key}" appears ${count} times`);
    }

    if (warnings.length === 0 && duplicateKeys.length === 0 &&
        duplicatePaths.length === 0 && unsupportedExtensions.length === 0 &&
        invalidMetadata.length === 0) {
      warnings.push('No static validation issues found.');
    }

    return { duplicateKeys, duplicatePaths, unsupportedExtensions, invalidMetadata, warnings };
  }

  private _logStaticResult(): void {
    const r = this._staticResult;
    const issues = [
      ...r.duplicateKeys,
      ...r.duplicatePaths,
      ...r.unsupportedExtensions,
      ...r.invalidMetadata,
    ];

    if (issues.length === 0) {
      console.log(`[AssetCatalog] Static validation ✓ — ${this._entries.length} entries, no issues.`);
      return;
    }

    console.warn(
      `[AssetCatalog] Static validation — ${this._entries.length} entries, ` +
      `${issues.length} issue(s):`,
    );
    for (const issue of issues) {
      console.warn(`  ⚠  ${issue}`);
    }
  }

  private _isInCache(scene: Phaser.Scene, key: string, type: AssetType): boolean {
    switch (type) {
      case 'image':
      case 'spritesheet':
      case 'atlas':
        return scene.textures.exists(key) && scene.textures.get(key).key !== '__MISSING';
      case 'audio':
        return scene.cache.audio.has(key);
      case 'font':
        return scene.cache.bitmapFont.has(key);
      default:
        return false;
    }
  }

  private _queueOne(scene: Phaser.Scene, entry: CatalogEntry): void {
    try {
      switch (entry.type) {
        case 'image':
          scene.load.image(entry.key, entry.path);
          break;
        case 'spritesheet':
          scene.load.spritesheet(entry.key, entry.path, {
            frameWidth:  entry.frameWidth!,
            frameHeight: entry.frameHeight!,
          });
          break;
        case 'atlas':
          scene.load.atlas(entry.key, entry.path, entry.atlasPath!);
          break;
        case 'audio':
          scene.load.audio(entry.key, entry.path);
          break;
        case 'font':
          scene.load.bitmapFont(entry.key, entry.path, entry.xmlPath!);
          break;
      }
    } catch (err) {
      console.error(`[AssetCatalog] Failed to queue "${entry.key}":`, err);
    }
  }

  private _ext(path: string): string {
    const dot = path.lastIndexOf('.');
    return dot >= 0 ? path.slice(dot).toLowerCase() : '';
  }
}
