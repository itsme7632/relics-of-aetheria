import Phaser from 'phaser';
import { LAYER_NAMES, OBJECT_LAYER_NAMES } from '../systems/Level';

// Engine's known tile layer name set (all values from LAYER_NAMES)
const KNOWN_TILE_LAYERS: ReadonlySet<string> = new Set(Object.values(LAYER_NAMES));

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  valid: boolean;      // false if any error-level issue exists
  issues: ValidationIssue[];
}

export interface ValidatorOptions {
  /**
   * Entity type names expected in the "Objects" layer.
   * Any object whose `name` is not in this list generates a warning.
   * Default: [] (no check performed).
   */
  knownEntityTypes?: string[];
}

// ─── Required layer constants ─────────────────────────────────────────────────

/** Tile layers that MUST be present. Missing one is an error. */
const REQUIRED_TILE_LAYERS: readonly string[] = [
  LAYER_NAMES.COLLISION,
];

/** Tile layers that SHOULD be present. Missing one is a warning. */
const EXPECTED_TILE_LAYERS: readonly string[] = [
  LAYER_NAMES.BACKGROUND,
  LAYER_NAMES.GROUND,
  LAYER_NAMES.PLATFORMS,
  LAYER_NAMES.DECORATION_BACK,
  LAYER_NAMES.DECORATION_FRONT,
];

/** Object layers that MUST be present. Missing one is an error. */
const REQUIRED_OBJECT_LAYERS: readonly string[] = [
  OBJECT_LAYER_NAMES.PLAYER_SPAWN,
];

// ─── MapValidator ─────────────────────────────────────────────────────────────

/**
 * MapValidator
 *
 * Validates a Phaser Tilemap against the structural rules required by the
 * Relics of Aetheria engine.  All checks produce human-readable messages
 * and never throw — the caller decides what to do with errors vs warnings.
 *
 * Rules enforced:
 *   ERROR   — Collision tile layer missing
 *   ERROR   — PlayerSpawn object layer missing
 *   ERROR   — PlayerSpawn layer has zero objects (no spawn point)
 *   ERROR   — PlayerSpawn layer has more than one object (ambiguous spawn)
 *   WARNING — Expected tile layer missing (Background, Ground, etc.)
 *   WARNING — Unknown entity type in the Objects layer
 *
 * Usage:
 *   const result = MapValidator.validate(map, 'world01_level01', {
 *     knownEntityTypes: ['Crystal'],
 *   });
 *   if (!result.valid) { ... }
 */
export class MapValidator {
  /**
   * Validate a loaded Phaser tilemap.
   * @param map             The Phaser tilemap to inspect.
   * @param levelId         Level identifier used in log messages.
   * @param options         Optional configuration (see ValidatorOptions).
   */
  static validate(
    map: Phaser.Tilemaps.Tilemap,
    levelId: string,
    options: ValidatorOptions = {},
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const tag = `[MapValidator] "${levelId}"`;

    // ── M16: Missing tileset ────────────────────────────────────────────────
    if (map.tilesets.length === 0) {
      issues.push({
        severity: 'error',
        message: `${tag}: map has no tilesets defined.`,
      });
    }

    // ── M16: Invalid tile dimensions ────────────────────────────────────────
    for (const ts of map.tilesets) {
      if (ts.tileWidth !== 32 || ts.tileHeight !== 32) {
        issues.push({
          severity: 'warning',
          message:
            `${tag}: tileset "${ts.name}" has tile size ${ts.tileWidth}×${ts.tileHeight}px — ` +
            `engine standard is 32×32px.`,
        });
      }
    }

    // ── M16: Invalid map dimensions ─────────────────────────────────────────
    if (map.width <= 0 || map.height <= 0) {
      issues.push({
        severity: 'error',
        message:
          `${tag}: map has invalid dimensions ${map.width}×${map.height} tiles — ` +
          `both width and height must be greater than zero.`,
      });
    }

    // ── M16: GID out-of-range tiles ─────────────────────────────────────────
    // tile.index in Phaser is the 0-based tileset-relative index (GID − firstgid).
    // Valid range: [0, tileCount − 1]. Empty tiles have index === −1.
    for (const ts of map.tilesets) {
      const maxIndex   = ts.total - 1; // ts.total = rows × columns in Phaser's Tileset type
      const badGids    = new Set<number>();
      const allLayers  = [
        ...(REQUIRED_TILE_LAYERS as readonly string[]),
        ...(EXPECTED_TILE_LAYERS  as readonly string[]),
      ];

      for (const layerName of allLayers) {
        const ld = map.getLayer(layerName);
        if (!ld) continue;
        for (const row of ld.data) {
          for (const tile of row) {
            if (tile.index < 0) continue; // empty
            if (tile.index > maxIndex) {
              badGids.add(tile.index + ts.firstgid); // report as global GID
            }
          }
        }
      }

      if (badGids.size > 0) {
        const sample = [...badGids].slice(0, 5).join(', ');
        issues.push({
          severity: 'warning',
          message:
            `${tag}: ${badGids.size} tile(s) reference GID(s) outside ` +
            `tileset "${ts.name}" range (max GID ${ts.firstgid + ts.total - 1}): ` +
            `${sample}${badGids.size > 5 ? ' …' : ''}.`,
        });
      }
    }

    // ── M16: Unknown tile layers ─────────────────────────────────────────────
    for (const layerData of map.layers) {
      if (!KNOWN_TILE_LAYERS.has(layerData.name)) {
        issues.push({
          severity: 'warning',
          message:
            `${tag}: tile layer "${layerData.name}" is not used by the engine ` +
            `and will be ignored.`,
        });
      }
    }

    // ── Required tile layers ────────────────────────────────────────────────
    for (const name of REQUIRED_TILE_LAYERS) {
      if (!map.getLayer(name)) {
        issues.push({
          severity: 'error',
          message: `${tag}: required tile layer "${name}" is missing.`,
        });
      }
    }

    // ── Expected tile layers (warnings) ────────────────────────────────────
    for (const name of EXPECTED_TILE_LAYERS) {
      if (!map.getLayer(name)) {
        issues.push({
          severity: 'warning',
          message: `${tag}: expected tile layer "${name}" not found — it will be skipped.`,
        });
      }
    }

    // ── Required object layers ──────────────────────────────────────────────
    for (const name of REQUIRED_OBJECT_LAYERS) {
      if (!map.getObjectLayer(name)) {
        issues.push({
          severity: 'error',
          message: `${tag}: required object layer "${name}" is missing.`,
        });
      }
    }

    // ── PlayerSpawn count ──────────────────────────────────────────────────
    const spawnLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.PLAYER_SPAWN);
    if (spawnLayer) {
      const spawnCount = spawnLayer.objects.length;
      if (spawnCount === 0) {
        issues.push({
          severity: 'error',
          message: `${tag}: PlayerSpawn layer exists but contains no objects.`,
        });
      } else if (spawnCount > 1) {
        issues.push({
          severity: 'error',
          message:
            `${tag}: PlayerSpawn layer has ${spawnCount} objects — ` +
            `exactly one is required. The first object will be used.`,
        });
      }
    }

    // ── Unknown entity types in the Objects layer ──────────────────────────
    const knownTypes = options.knownEntityTypes ?? [];
    if (knownTypes.length > 0) {
      const objectsLayer = map.getObjectLayer('Objects');
      if (objectsLayer) {
        for (const obj of objectsLayer.objects) {
          const name = obj.name ?? '';
          if (name && !knownTypes.includes(name)) {
            issues.push({
              severity: 'warning',
              message:
                `${tag}: unknown entity type "${name}" in Objects layer — ` +
                `no factory is registered for it. Register one with EntityManager.registerType().`,
            });
          }
        }
      }
    }

    // ── Emit to console ────────────────────────────────────────────────────
    const errors   = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');

    for (const w of warnings) console.warn(w.message);
    for (const e of errors)   console.error(e.message);

    if (errors.length === 0 && warnings.length === 0) {
      console.log(`${tag}: validation passed ✓`);
    }

    return {
      valid: errors.length === 0,
      issues,
    };
  }
}
