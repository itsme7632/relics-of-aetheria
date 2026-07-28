/**
 * Level registry — the single place to add, rename, or reorder maps.
 *
 * To load a different map, change STARTING_LEVEL.
 * To add a new level, add an entry to LEVELS pointing at its JSON file.
 * No engine code needs to change.
 */

export interface LevelConfig {
  /** Phaser asset-cache key used for this map. */
  key: string;
  /** Path to the Tiled JSON export (relative to the web root). */
  mapPath: string;
  /** Name of the tileset as declared inside the Tiled map file. */
  tilesetName: string;
  /** Phaser texture key to map the tileset onto (must be pre-loaded). */
  tilesetKey: string;
}

export const LEVELS: Record<string, LevelConfig> = {
  level1: {
    key: 'level1',
    mapPath: 'assets/maps/level1.json',
    tilesetName: 'tileset',
    tilesetKey: 'tiles',
  },
  // Add future levels here, e.g.:
  // level2: { key: 'level2', mapPath: 'assets/maps/level2.json', tilesetName: 'tileset', tilesetKey: 'tiles' },
};

/** The level loaded on game start. Change this value to start on a different map. */
export const STARTING_LEVEL = 'level1';
