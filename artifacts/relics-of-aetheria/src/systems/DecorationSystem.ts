/**
 * DecorationSystem
 *
 * M14: Decoration preset system.
 *
 * Maps declare a decoration preset; the engine activates the corresponding
 * preset configuration, which describes which decoration types are expected
 * in the map's Decoration_Back and Decoration_Front tile layers.
 *
 * Decorations NEVER affect collision — the Collision layer is the sole
 * source of physics collision data.
 *
 * The system is data-driven: new decoration types require only a new entry
 * in DECORATION_PRESETS — no engine code changes.
 *
 * In M14, this system is informational:
 *   - Registers the preset and exposes metadata for debug / validation.
 *   - Counts decoration tiles already placed in the map's Back/Front layers.
 *
 * Future milestones may use this system for:
 *   - Asset loading hints (load only the decoration tiles needed by the preset).
 *   - Procedural decoration placement (sparse fill of empty Back/Front cells).
 *
 * Usage:
 *   const ds = new DecorationSystem();
 *   ds.applyPreset('jungle_ruins', level.map);
 *   console.log(ds.decorationCount); // for F7 debug
 */

import Phaser from 'phaser';
import type { DecorationPreset } from '../world/WorldEnvironment';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Configuration for a single decoration type within a preset. */
export interface DecorationTypeConfig {
  /** Human-readable name for debug output. */
  name: string;
  /** Tile GID that represents this decoration type in the tileset. */
  tileGid: number;
  /** Appears in the Decoration_Back layer (behind player). */
  inBackLayer: boolean;
  /** Appears in the Decoration_Front layer (in front of player). */
  inFrontLayer: boolean;
}

/** Full configuration for a named decoration preset. */
export interface DecorationPresetConfig {
  readonly name:  string;
  readonly types: readonly DecorationTypeConfig[];
}

// ─── Preset data ─────────────────────────────────────────────────────────────

/**
 * All decoration preset definitions.
 * GIDs reference the expanded procedural tileset (BootScene):
 *   GIDs 23–22  → plant, flower, roots
 *   GIDs 26–30  → broken statue, skull, rock, temple carving, fallen pillar
 */
const DECORATION_PRESETS: Record<DecorationPreset, DecorationPresetConfig> = {
  none: {
    name:  'none',
    types: [],
  },

  jungle_light: {
    name: 'jungle_light',
    types: [
      { name: 'plants',  tileGid: 23, inBackLayer: true,  inFrontLayer: false },
      { name: 'flowers', tileGid: 24, inBackLayer: true,  inFrontLayer: false },
      { name: 'roots',   tileGid: 25, inBackLayer: true,  inFrontLayer: true  },
    ],
  },

  jungle_ruins: {
    name: 'jungle_ruins',
    types: [
      { name: 'broken_statues',  tileGid: 26, inBackLayer: true,  inFrontLayer: false },
      { name: 'skulls',          tileGid: 27, inBackLayer: true,  inFrontLayer: false },
      { name: 'rocks',           tileGid: 28, inBackLayer: true,  inFrontLayer: true  },
      { name: 'temple_carvings', tileGid: 29, inBackLayer: true,  inFrontLayer: false },
    ],
  },

  jungle_deep: {
    name: 'jungle_deep',
    types: [
      { name: 'plants',         tileGid: 23, inBackLayer: true,  inFrontLayer: false },
      { name: 'roots',          tileGid: 25, inBackLayer: true,  inFrontLayer: true  },
      { name: 'rocks',          tileGid: 28, inBackLayer: true,  inFrontLayer: false },
      { name: 'fallen_pillars', tileGid: 30, inBackLayer: false, inFrontLayer: true  },
    ],
  },

  temple_interior: {
    name: 'temple_interior',
    types: [
      { name: 'temple_carvings', tileGid: 29, inBackLayer: true,  inFrontLayer: false },
      { name: 'fallen_pillars',  tileGid: 30, inBackLayer: false, inFrontLayer: true  },
    ],
  },
};

// ─── DecorationSystem ─────────────────────────────────────────────────────────

export class DecorationSystem {
  private _activePreset:   DecorationPresetConfig = DECORATION_PRESETS.none;
  private _decorationCount = 0;

  /**
   * Activate a decoration preset for the current level.
   * Counts placed decoration tiles in the map's Back/Front layers.
   *
   * @param preset  Which preset to activate.
   * @param map     Loaded Phaser Tilemap (used to count existing decoration tiles).
   */
  applyPreset(preset: DecorationPreset, map: Phaser.Tilemaps.Tilemap): void {
    this._activePreset   = DECORATION_PRESETS[preset];
    this._decorationCount = this._countDecorationTiles(map);

    if (this._activePreset.types.length > 0) {
      console.log(
        `[DecorationSystem] Preset "${preset}" active — ` +
        `${this._activePreset.types.length} type(s): ` +
        `${this._activePreset.types.map((t) => t.name).join(', ')}. ` +
        `${this._decorationCount} decoration tile(s) placed in map.`,
      );
    }
  }

  /** Number of non-empty tiles in the map's Decoration_Back + Decoration_Front layers. */
  get decorationCount(): number {
    return this._decorationCount;
  }

  /** Active preset configuration (read-only). */
  get activePreset(): DecorationPresetConfig {
    return this._activePreset;
  }

  /** Names of all decoration types in the active preset (for F7 debug). */
  get typeNames(): string[] {
    return [...this._activePreset.types.map((t) => t.name)];
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  /** Count all non-empty tiles in Decoration_Back and Decoration_Front layers. */
  private _countDecorationTiles(map: Phaser.Tilemaps.Tilemap): number {
    let count = 0;
    const layerNames = ['Decoration_Back', 'Decoration_Front'];

    for (const name of layerNames) {
      const layer = map.getLayer(name);
      if (!layer) continue;
      for (const row of layer.data) {
        for (const tile of row) {
          if (tile.index > 0) count++;
        }
      }
    }

    return count;
  }
}
