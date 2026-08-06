/**
 * ProductionArtRegistry — M20A
 *
 * Central singleton that aggregates the load status of every visual category
 * across the game's production art pipeline.
 *
 * Each subsystem importer (SnakeSpriteImporter, BackgroundImporter, …)
 * calls register() during BootScene.create().  GameScene reads report()
 * to populate the F7 production-art debug panel.
 *
 * Categories registered by BootScene:
 *   kai          — Kai player character spritesheet
 *   snake        — Snake enemy spritesheet
 *   tileset      — World tileset (procedural fallback or production PNG)
 *   backgrounds  — Per-theme background layer images (8 layers)
 *   hud          — Heart / crystal / HUD button sprites
 *   menus        — Panel, button, and border UI images
 *   particles    — Dust, leaf, spark, crystal, checkpoint, damage effects
 */

export type ArtSource = 'production' | 'procedural' | 'partial' | 'pending';

/** Status snapshot for a single visual category. */
export interface ArtCategoryStatus {
  /** Human-readable label shown in the F7 overlay. */
  label:        string;
  /** Whether all, some, or none of the category's textures loaded. */
  source:       ArtSource;
  /** Texture cache keys confirmed present in Phaser. */
  loadedKeys:   string[];
  /** Expected keys that are absent (triggering procedural fallback). */
  missingKeys:  string[];
  /** One-line description of the active fallback when source !== 'production'. */
  fallbackDesc: string;
}

export interface ProductionArtReport {
  byCategory:   ArtCategoryStatus[];
  /** Total texture keys confirmed loaded across all categories. */
  totalLoaded:  number;
  /** Total texture keys expected but absent. */
  totalMissing: number;
  /** JS heap size in MB — Chrome only; null elsewhere. */
  memoryMB:     number | null;
}

export class ProductionArtRegistry {
  private static _inst: ProductionArtRegistry | null = null;
  private readonly _cats = new Map<string, ArtCategoryStatus>();

  static get instance(): ProductionArtRegistry {
    if (!ProductionArtRegistry._inst) {
      ProductionArtRegistry._inst = new ProductionArtRegistry();
    }
    return ProductionArtRegistry._inst;
  }

  /**
   * Clear all registrations.
   * Call at the start of BootScene.create() before populating.
   */
  reset(): void {
    this._cats.clear();
  }

  /**
   * Register (or overwrite) a category status entry.
   * @param id      Stable identifier (e.g. 'kai', 'snake', 'hud').
   * @param status  Status snapshot from the subsystem importer.
   */
  register(id: string, status: ArtCategoryStatus): void {
    this._cats.set(id, status);
    const tag = status.source === 'production' ? '✓'
              : status.source === 'partial'    ? '·'
              : '○';
    console.log(
      `[ProductionArtRegistry] ${tag} ${status.label}: ` +
      `${status.loadedKeys.length} loaded, ${status.missingKeys.length} missing ` +
      `(${status.source})`,
    );
  }

  get(id: string): ArtCategoryStatus | undefined {
    return this._cats.get(id);
  }

  /** Aggregated report — consumed by GameScene._buildProductionArtDebugInfo(). */
  get report(): ProductionArtReport {
    const cats = Array.from(this._cats.values());
    let totalLoaded  = 0;
    let totalMissing = 0;
    for (const c of cats) {
      totalLoaded  += c.loadedKeys.length;
      totalMissing += c.missingKeys.length;
    }
    const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
    return {
      byCategory:   cats,
      totalLoaded,
      totalMissing,
      memoryMB: mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null,
    };
  }
}
