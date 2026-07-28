import Phaser from 'phaser';
import { LEVELS, LevelConfig } from '../data/levels';
import { TilemapLoader } from '../systems/TilemapLoader';
import { Level } from '../systems/Level';

/**
 * MapManager
 *
 * The single entry point for loading and switching levels at runtime.
 * Scene code should never touch TilemapLoader or LevelConfig directly —
 * it calls MapManager.loadLevel(key) and receives a ready Level.
 *
 * To swap maps, change STARTING_LEVEL in src/data/levels.ts, or call
 * loadLevel() with any key defined there.
 */
export class MapManager {
  private readonly loader: TilemapLoader;
  private current: Level | null = null;

  constructor(scene: Phaser.Scene) {
    this.loader = new TilemapLoader(scene);
  }

  /**
   * Load a level by its registry key.
   * Destroys the currently loaded level first to free tilemap memory.
   */
  loadLevel(key: string): Level {
    const config: LevelConfig | undefined = LEVELS[key];
    if (!config) {
      throw new Error(
        `MapManager: unknown level key "${key}". ` +
        `Register it in src/data/levels.ts.`,
      );
    }

    // Tear down the previous level before creating the next
    this.current?.destroy();
    this.current = this.loader.load(config);
    return this.current;
  }

  /** Returns the active Level, or null if none has been loaded yet. */
  getCurrentLevel(): Level | null {
    return this.current;
  }

  /** Release all resources. Call from the scene's shutdown / destroy event. */
  destroy(): void {
    this.current?.destroy();
    this.current = null;
  }
}
