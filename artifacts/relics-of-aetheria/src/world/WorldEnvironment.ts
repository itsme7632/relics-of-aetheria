/**
 * WorldEnvironment
 *
 * M14: Emerald Jungle Production Pack
 *
 * Typed configuration for environment presets used by the level pipeline.
 * Maps declare a background preset, decoration preset, weather preset, and
 * animated tile preset.  The engine reads these at load time to configure
 * the appropriate systems without per-level code changes.
 *
 * Future worlds reuse the same system by registering new preset values here.
 */

import type { LevelManifestEntry } from './LevelManifest';

// ─── Preset type unions ───────────────────────────────────────────────────────

/** Background parallax theme identifiers. */
export type BackgroundTheme =
  | 'default'       // Star-field + mountain silhouettes (pre-M14 placeholder)
  | 'jungle_day'    // Far/mid jungle canopy layers + foreground vegetation + clouds
  | 'jungle_dusk'   // Warmer orange-toned jungle at dusk (future)
  | 'jungle_night'; // Dark jungle with firefly particles (future)

/** Decoration preset identifiers. Controls which decorative prop types populate the world. */
export type DecorationPreset =
  | 'none'
  | 'jungle_light'     // Plants, flowers, roots
  | 'jungle_ruins'     // Broken statues, skulls, rocks, temple carvings
  | 'jungle_deep'      // Dense foliage, fallen pillars, rocks
  | 'temple_interior'; // Stone carvings, torches (no organic decoration)

/** Atmosphere / weather preset identifiers. */
export type WeatherPreset =
  | 'none'
  | 'light_rain'
  | 'heavy_rain'
  | 'fog'
  | 'mist';

/** Animated tile preset identifiers. */
export type AnimatedTilePreset =
  | 'none'
  | 'jungle_water'  // Flowing water + waterfalls
  | 'jungle_full';  // Water + torch flames + crystal shimmer + moving leaves

// ─── EnvironmentConfig ────────────────────────────────────────────────────────

/**
 * Full environment configuration for a level.
 * Built from the LevelManifestEntry by buildEnvironmentConfig().
 */
export interface EnvironmentConfig {
  backgroundTheme:    BackgroundTheme;
  decorationPreset:   DecorationPreset;
  weatherPreset:      WeatherPreset;
  animatedTilePreset: AnimatedTilePreset;
  music?:             string;
  ambientSound?:      string;
}

// ─── Default ─────────────────────────────────────────────────────────────────

export const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  backgroundTheme:    'default',
  decorationPreset:   'none',
  weatherPreset:      'none',
  animatedTilePreset: 'none',
};

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Build a typed EnvironmentConfig from a manifest entry.
 * Falls back to DEFAULT_ENVIRONMENT for any unspecified field.
 *
 * @param entry  LevelManifestEntry (or null for a safe default).
 */
export function buildEnvironmentConfig(
  entry: LevelManifestEntry | null,
): EnvironmentConfig {
  if (!entry) return { ...DEFAULT_ENVIRONMENT };

  return {
    backgroundTheme:    (entry.backgroundTheme   as BackgroundTheme)    ?? DEFAULT_ENVIRONMENT.backgroundTheme,
    decorationPreset:   (entry.decorationPreset  as DecorationPreset)   ?? DEFAULT_ENVIRONMENT.decorationPreset,
    weatherPreset:      (entry.weatherPreset      as WeatherPreset)      ?? DEFAULT_ENVIRONMENT.weatherPreset,
    animatedTilePreset: (entry.animatedTilePreset as AnimatedTilePreset) ?? DEFAULT_ENVIRONMENT.animatedTilePreset,
    music:              entry.music,
    ambientSound:       entry.ambientSound,
  };
}
