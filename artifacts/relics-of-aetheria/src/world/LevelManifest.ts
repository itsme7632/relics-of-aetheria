/**
 * LevelManifest
 *
 * The single source of truth for all levels in the game.
 * Adding a new level requires only one new entry in LEVEL_MANIFEST —
 * no engine code needs to change.
 *
 * Key concepts:
 *   id              — unique string key used to reference this level everywhere
 *   world           — logical group (maps to an assets/worlds/<world>/ folder)
 *   mapFile         — path to the Tiled JSON export, relative to web root
 *   tilesetName     — tileset name declared inside the Tiled .tmj file
 *   tilesetKey      — Phaser texture cache key (must match what BootScene loads)
 *   backgroundTheme — which parallax set to build ('default' | future themes)
 *   nextLevel       — id of the level that follows this one, or undefined
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompletionRequirements {
  /** Minimum crystals the player must collect before the exit activates. */
  crystalsRequired?: number;
  /** Whether the player must reach a LevelExit object. Default true. */
  reachExit?: boolean;
}

export interface LevelManifestEntry {
  /** Unique level identifier used as a Phaser asset-cache key and route token. */
  id: string;
  /** Human-readable name shown in menus and the debug overlay. */
  displayName: string;
  /** World this level belongs to. Maps to assets/worlds/<world>/. */
  world: string;
  /** Path to the Tiled JSON map export, relative to the web root. */
  mapFile: string;
  /** Tileset name as declared inside the Tiled map file. */
  tilesetName: string;
  /** Phaser texture key for the tileset image (pre-loaded by BootScene). */
  tilesetKey: string;
  /** Phaser audio key for background music (loaded by BootScene when present). */
  music?: string;
  /**
   * Parallax background theme identifier.
   * 'default' = star-field + mountain silhouettes (current procedural layers).
   * Future themes can be added to buildParallaxLayers().
   */
  backgroundTheme: string;
  /** id of the next level, or undefined if this is the final level. */
  nextLevel?: string;
  /** Optional completion gate. No requirements = exit always active. */
  completionRequirements?: CompletionRequirements;
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

/**
 * All levels registered in the game, in play order.
 * To add a new level: append an entry and set the previous level's nextLevel.
 */
export const LEVEL_MANIFEST: LevelManifestEntry[] = [
  {
    id:              'world01_level01',
    displayName:     'Jungle Ruins — Entry',
    world:           'world01_jungle',
    mapFile:         'assets/maps/level1.json',
    tilesetName:     'tileset',
    tilesetKey:      'tiles',
    backgroundTheme: 'default',
    nextLevel:       undefined,        // extend when level 2 is added
    completionRequirements: {
      reachExit: true,
    },
  },

  // ── How to add a new level ────────────────────────────────────────────────
  // {
  //   id:              'world01_level02',
  //   displayName:     'Jungle Ruins — Deep',
  //   world:           'world01_jungle',
  //   mapFile:         'assets/worlds/world01_jungle/maps/level02.json',
  //   tilesetName:     'tileset',
  //   tilesetKey:      'tiles',
  //   backgroundTheme: 'default',
  //   nextLevel:       undefined,
  //   completionRequirements: { crystalsRequired: 3, reachExit: true },
  // },
];

/** The level that loads on game start. Change this to skip to any level. */
export const STARTING_LEVEL_ID = 'world01_level01';

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Build a fast id → entry map from the manifest array. */
export function buildManifestIndex(
  manifest: LevelManifestEntry[],
): Map<string, LevelManifestEntry> {
  return new Map(manifest.map((e) => [e.id, e]));
}
