/**
 * LevelManifest
 *
 * The single source of truth for all levels in the game.
 * Adding a new level requires only one new entry in LEVEL_MANIFEST —
 * no engine code needs to change.
 *
 * Key concepts:
 *   id                  — unique string key used to reference this level everywhere
 *   world               — logical group (maps to an assets/worlds/<world>/ folder)
 *   mapFile             — path to the Tiled JSON export, relative to web root
 *   tilesetName         — tileset name declared inside the Tiled .tmj file
 *   tilesetKey          — Phaser texture cache key — use AssetKeys constants
 *   backgroundTheme     — which parallax set to build (BackgroundTheme)
 *   decorationPreset    — which decoration types populate the world (DecorationPreset)
 *   weatherPreset       — atmosphere / weather effect (WeatherPreset)
 *   animatedTilePreset  — which tile animations are active (AnimatedTilePreset)
 *   music               — optional Phaser audio key for background music
 *   ambientSound        — optional Phaser audio key for looping ambient sound
 *   nextLevel           — id of the level that follows this one, or undefined
 */

import { AssetKeys } from '../assets/AssetKeys';

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
  /** Phaser audio key for a looping ambient sound layer (wind, birds, water, etc.). */
  ambientSound?: string;
  /**
   * Parallax background theme identifier.
   * See BackgroundTheme in WorldEnvironment.ts for valid values.
   * 'default' = star-field + mountain silhouettes (procedural placeholder).
   * 'jungle_day' = multi-layer jungle canopy with cloud/fog.
   */
  backgroundTheme: string;
  /**
   * Decoration preset identifier.
   * See DecorationPreset in WorldEnvironment.ts for valid values.
   * Controls which decorative prop types are expected in Decoration_Back/Front layers.
   * Decorations never affect collision.
   */
  decorationPreset?: string;
  /**
   * Weather / atmosphere preset identifier.
   * See WeatherPreset in WorldEnvironment.ts for valid values.
   */
  weatherPreset?: string;
  /**
   * Animated tile preset identifier.
   * See AnimatedTilePreset in WorldEnvironment.ts for valid values.
   * Registers Phaser tile animations for water, flames, crystals, leaves.
   */
  animatedTilePreset?: string;
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
    id:                 'world01_level01',
    displayName:        'Jungle Ruins — Entry',
    world:              'world01_jungle',
    mapFile:            'assets/maps/level1.json',
    tilesetName:        'tileset',
    tilesetKey:         AssetKeys.TILESET_WORLD01,
    backgroundTheme:    'jungle_day',
    decorationPreset:   'jungle_ruins',
    weatherPreset:      'none',
    animatedTilePreset: 'none',
    nextLevel:          undefined,        // extend when level 2 is added
    completionRequirements: {
      reachExit: true,
    },
  },

  // ── How to add a new level ────────────────────────────────────────────────
  // {
  //   id:                 'world01_level02',
  //   displayName:        'Jungle Ruins — Deep',
  //   world:              'world01_jungle',
  //   mapFile:            'assets/worlds/world01_jungle/maps/level02.json',
  //   tilesetName:        'tileset',
  //   tilesetKey:         AssetKeys.TILESET_WORLD01,
  //   backgroundTheme:    'jungle_day',
  //   decorationPreset:   'jungle_deep',
  //   weatherPreset:      'mist',
  //   animatedTilePreset: 'jungle_water',
  //   nextLevel:          undefined,
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
