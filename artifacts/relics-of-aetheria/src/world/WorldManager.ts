import Phaser from 'phaser';
import {
  LevelManifestEntry,
  LEVEL_MANIFEST,
  STARTING_LEVEL_ID,
  buildManifestIndex,
} from './LevelManifest';
import { MapValidator, ValidatorOptions } from './MapValidator';
import { TilemapLoader } from '../systems/TilemapLoader';
import { LevelConfig } from '../data/levels';
import { Level } from '../systems/Level';

// ─── WorldManager ─────────────────────────────────────────────────────────────

/**
 * WorldManager — Milestone 6: World Builder & Level Production Pipeline
 *
 * The high-level orchestrator for the level loading pipeline.
 * Replaces direct MapManager usage in GameScene and BootScene.
 *
 * Responsibilities:
 *   1. Expose manifest metadata (entries, next level, start level)
 *   2. Translate manifest entries → LevelConfig objects (internal)
 *   3. Load, validate, and return Level instances
 *   4. Provide BootScene with everything it needs to preload
 *   5. Lay groundwork for future world transitions and save system
 *
 * GameScene usage:
 *   const wm = new WorldManager(this);
 *   const level = wm.loadLevel('world01_level01');
 *
 * BootScene usage (static, no instance needed):
 *   WorldManager.preloadAll(this);          // in preload()
 *   this.scene.start('GameScene', { levelId: WorldManager.startingLevelId });
 *
 * Future hooks (not yet wired):
 *   wm.getCurrentEntry()    — serialise to a save slot
 *   wm.getNextLevel(id)     — trigger transition on exit
 *   wm.getCompletionReqs(id)— gate the LevelExit on requirements
 */
export class WorldManager {
  // ── Manifest index ─────────────────────────────────────────────────────────
  private static readonly _index = buildManifestIndex(LEVEL_MANIFEST);

  // ── Static API (safe to call from BootScene without an instance) ───────────

  /** The level id that should be loaded on a fresh game start. */
  static get startingLevelId(): string {
    return STARTING_LEVEL_ID;
  }

  /**
   * Register all map JSON files with Phaser's loader.
   * Call this from BootScene.preload() before any other load calls.
   */
  static preloadAll(scene: Phaser.Scene): void {
    for (const entry of LEVEL_MANIFEST) {
      scene.load.tilemapTiledJSON(entry.id, entry.mapFile);
    }
  }

  /**
   * Register tileset images with the loader.
   * Currently a no-op because tilesets are generated procedurally;
   * replace the body when real art assets are introduced.
   *
   * @example
   *   WorldManager.preloadTilesets(this);
   *   // future: scene.load.image(entry.tilesetKey, `assets/worlds/${entry.world}/tilesets/${entry.tilesetKey}.png`)
   */
  static preloadTilesets(_scene: Phaser.Scene): void {
    // Placeholder — tilesets are generated at runtime by BootScene.
    // When real tileset PNGs are added, iterate LEVEL_MANIFEST here.
  }

  /**
   * Return the manifest entry for a level id, or throw if it does not exist.
   * Safe to call from any context (no scene required).
   */
  static getEntry(levelId: string): LevelManifestEntry {
    const entry = WorldManager._index.get(levelId);
    if (!entry) {
      throw new Error(
        `WorldManager: unknown level id "${levelId}". ` +
        `Register it in src/world/LevelManifest.ts.`,
      );
    }
    return entry;
  }

  /**
   * Return the manifest entry for the level that follows the given one,
   * or null if the level has no successor.
   */
  static getNextEntry(levelId: string): LevelManifestEntry | null {
    const entry = WorldManager.getEntry(levelId);
    if (!entry.nextLevel) return null;
    return WorldManager.getEntry(entry.nextLevel);
  }

  // ── Instance API (requires a scene — use in GameScene) ────────────────────

  private readonly loader: TilemapLoader;
  private _current: Level | null = null;
  private _currentEntry: LevelManifestEntry | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.loader = new TilemapLoader(scene);
  }

  /**
   * Load, validate, and return a Level for the given manifest id.
   * Destroys the previously loaded level first.
   *
   * Validation runs after the Phaser tilemap is built and logs issues
   * to the console, but never crashes — the Level is returned even if
   * warnings are present.  An error-level validation failure will still
   * produce a Level (TilemapLoader throws before this if Collision is
   * missing, so the validator's error is informational for other checks).
   *
   * @param levelId       Manifest level id.
   * @param validators    Optional override for known entity types.
   */
  loadLevel(levelId: string, validators?: ValidatorOptions): Level {
    const entry = WorldManager.getEntry(levelId);
    const config = WorldManager._toConfig(entry);

    // Tear down the previous level
    this._current?.destroy();

    // Build the level (TilemapLoader handles Phaser layer creation)
    const level = this.loader.load(config);

    // Validate the loaded map
    MapValidator.validate(level.map, levelId, {
      knownEntityTypes: validators?.knownEntityTypes ?? ['Crystal'],
      ...validators,
    });

    this._current      = level;
    this._currentEntry = entry;

    return level;
  }

  /** The currently loaded Level, or null if none has been loaded yet. */
  getCurrentLevel(): Level | null {
    return this._current;
  }

  /** Manifest entry for the currently loaded level (for menus, save, transitions). */
  getCurrentEntry(): LevelManifestEntry | null {
    return this._currentEntry;
  }

  /**
   * Convenience: manifest entry for the level that follows the current one.
   * Returns null if the current level is the last one or none is loaded.
   */
  getNextEntry(): LevelManifestEntry | null {
    if (!this._currentEntry) return null;
    return WorldManager.getNextEntry(this._currentEntry.id);
  }

  /** Release all Phaser resources. Call from the scene's SHUTDOWN event. */
  destroy(): void {
    this._current?.destroy();
    this._current      = null;
    this._currentEntry = null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Translate a LevelManifestEntry into the LevelConfig shape that
   * TilemapLoader expects.  Note: the cache key used for loading the tilemap
   * JSON in BootScene must match entry.id (WorldManager.preloadAll uses id).
   */
  private static _toConfig(entry: LevelManifestEntry): LevelConfig {
    return {
      key:         entry.id,
      mapPath:     entry.mapFile,
      tilesetName: entry.tilesetName,
      tilesetKey:  entry.tilesetKey,
    };
  }
}
