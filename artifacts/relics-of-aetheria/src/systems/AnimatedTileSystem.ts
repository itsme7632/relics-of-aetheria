/**
 * AnimatedTileSystem
 *
 * M14: Data-driven animated tile engine.
 *
 * Registers tile animation data on a loaded Phaser Tilemap based on a preset.
 * Uses Phaser's built-in Tileset.addTileAnimationData() API so the renderer
 * handles frame playback automatically — no per-frame update loop needed.
 *
 * The system is fully data-driven: adding new animated tile types requires
 * only a new entry in ANIMATED_TILE_PRESETS — no engine code changes.
 *
 * Supported animation types:
 *   jungle_water  — flowing water + waterfalls
 *   jungle_full   — water + torch flames + crystal shimmer + moving leaves
 *
 * Usage:
 *   const ats = new AnimatedTileSystem();
 *   ats.apply(level.map, entry.tilesetName, 'jungle_water');
 *   console.log(ats.animatedTileCount); // for F7 debug
 */

import Phaser from 'phaser';
import type { AnimatedTilePreset } from '../world/WorldEnvironment';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single animation frame for a tile. */
export interface TileAnimFrame {
  /** Tile GID (1-based global ID from the tileset). */
  tileid: number;
  /** Display duration for this frame in milliseconds. */
  duration: number;
}

/** Configuration for one animated tile entry. */
export interface AnimatedTileConfig {
  /** Descriptive name for debug output. */
  name: string;
  /** GID of the source tile that triggers this animation. */
  sourceTileGid: number;
  /** Ordered animation frames. */
  frames: TileAnimFrame[];
}

// ─── Preset data ─────────────────────────────────────────────────────────────

/**
 * All animated tile preset definitions.
 * GIDs reference the expanded procedural tileset generated in BootScene:
 *   GIDs 8–10  → water flow frames
 *   GIDs 11–13 → waterfall frames
 *   GIDs 14–16 → torch flame frames
 *   GIDs 17–19 → crystal shimmer frames
 *   GIDs 20–22 → moving leaf frames
 */
const ANIMATED_TILE_PRESETS: Record<AnimatedTilePreset, AnimatedTileConfig[]> = {
  none: [],

  jungle_water: [
    {
      name:          'water_flow',
      sourceTileGid: 8,
      frames: [
        { tileid: 8,  duration: 200 },
        { tileid: 9,  duration: 200 },
        { tileid: 10, duration: 200 },
        { tileid: 9,  duration: 200 },
      ],
    },
    {
      name:          'waterfall',
      sourceTileGid: 11,
      frames: [
        { tileid: 11, duration: 150 },
        { tileid: 12, duration: 150 },
        { tileid: 13, duration: 150 },
        { tileid: 12, duration: 150 },
      ],
    },
  ],

  jungle_full: [
    {
      name:          'water_flow',
      sourceTileGid: 8,
      frames: [
        { tileid: 8,  duration: 200 },
        { tileid: 9,  duration: 200 },
        { tileid: 10, duration: 200 },
        { tileid: 9,  duration: 200 },
      ],
    },
    {
      name:          'waterfall',
      sourceTileGid: 11,
      frames: [
        { tileid: 11, duration: 150 },
        { tileid: 12, duration: 150 },
        { tileid: 13, duration: 150 },
        { tileid: 12, duration: 150 },
      ],
    },
    {
      name:          'torch_flame',
      sourceTileGid: 14,
      frames: [
        { tileid: 14, duration: 100 },
        { tileid: 15, duration: 80  },
        { tileid: 16, duration: 100 },
        { tileid: 15, duration: 80  },
      ],
    },
    {
      name:          'crystal_shimmer',
      sourceTileGid: 17,
      frames: [
        { tileid: 17, duration: 300 },
        { tileid: 18, duration: 250 },
        { tileid: 19, duration: 300 },
        { tileid: 18, duration: 250 },
      ],
    },
    {
      name:          'moving_leaves',
      sourceTileGid: 20,
      frames: [
        { tileid: 20, duration: 250 },
        { tileid: 21, duration: 200 },
        { tileid: 22, duration: 250 },
        { tileid: 21, duration: 200 },
      ],
    },
  ],
};

// ─── AnimatedTileSystem ───────────────────────────────────────────────────────

export class AnimatedTileSystem {
  private _registeredCount  = 0;
  private _activeConfigs: AnimatedTileConfig[] = [];

  /**
   * Apply an animated tile preset to a loaded tilemap.
   * Call after TilemapLoader has created the map and tileset.
   *
   * @param map          Loaded Phaser Tilemap.
   * @param tilesetName  Tileset name as declared in the Tiled file.
   * @param preset       Which animated tile preset to apply.
   */
  apply(
    map: Phaser.Tilemaps.Tilemap,
    tilesetName: string,
    preset: AnimatedTilePreset,
  ): void {
    this._registeredCount = 0;
    this._activeConfigs   = [];

    const configs = ANIMATED_TILE_PRESETS[preset];
    if (!configs || configs.length === 0) return;

    const tileset = map.getTileset(tilesetName);
    if (!tileset) {
      console.warn(
        `[AnimatedTileSystem] Tileset "${tilesetName}" not found in map; ` +
        `preset "${preset}" not applied.`,
      );
      return;
    }

    for (const config of configs) {
      // Phaser expects a 0-based tile index within the tileset
      const tileIndex = config.sourceTileGid - tileset.firstgid;
      if (tileIndex < 0) {
        console.warn(
          `[AnimatedTileSystem] "${config.name}": GID ${config.sourceTileGid} ` +
          `is below tileset firstgid ${tileset.firstgid}; skipping.`,
        );
        continue;
      }

      // Phaser's animation format mirrors the Tiled export:
      //   tileset.tileData[tileIndex] = { animation: [{ duration, tileid }, ...] }
      // where tileid is 0-based relative to the tileset's firstgid.
      const phaserFrames = config.frames.map((f) => ({
        duration: f.duration,
        tileid:   f.tileid - tileset.firstgid,
      }));

      // tileData is typed as `object` in Phaser's TS defs — cast to a mutable record.
      const tileData = tileset.tileData as Record<number, { animation?: typeof phaserFrames }>;
      if (!tileData[tileIndex]) tileData[tileIndex] = {};
      tileData[tileIndex].animation = phaserFrames;

      this._activeConfigs.push(config);
      this._registeredCount++;
    }

    if (this._registeredCount > 0) {
      console.log(
        `[AnimatedTileSystem] Registered ${this._registeredCount} animated tile ` +
        `type(s) for preset "${preset}": ` +
        `${this._activeConfigs.map((c) => c.name).join(', ')}.`,
      );
    }
  }

  /** Number of animated tile types registered for the active preset. */
  get animatedTileCount(): number {
    return this._registeredCount;
  }

  /** Names of all registered animated tile animations (for F7 debug). */
  get animationNames(): string[] {
    return this._activeConfigs.map((c) => c.name);
  }
}
