import Phaser from 'phaser';
import { LevelConfig } from '../data/levels';
import { Level, LAYER_NAMES, OBJECT_LAYER_NAMES, LevelObjects, SpawnPoint } from './Level';

/** Fallback spawn position used when the map has no PlayerSpawn object. */
const DEFAULT_SPAWN: SpawnPoint = { x: 100, y: 300 };

/**
 * TilemapLoader
 *
 * Accepts a LevelConfig and returns a fully constructed Level.
 * Responsibilities:
 *   - Build the Phaser Tilemap from the cache
 *   - Create every named tile layer in the correct render order
 *   - Enable Arcade Physics collision on the Collision layer only
 *   - Parse all object layers into typed data structures
 *
 * Visual layers are created even if absent from the map (Phaser returns null,
 * which is silently ignored).  Only the Collision layer is required.
 */
export class TilemapLoader {
  constructor(private readonly scene: Phaser.Scene) {}

  load(config: LevelConfig): Level {
    const map = this.scene.make.tilemap({ key: config.key });

    const tileset = map.addTilesetImage(config.tilesetName, config.tilesetKey);
    if (!tileset) {
      throw new Error(
        `TilemapLoader: could not add tileset "${config.tilesetName}" ` +
        `(texture key: "${config.tilesetKey}"). ` +
        `Make sure the texture is loaded in BootScene before GameScene starts.`,
      );
    }

    // ── Visual layers (back → front) ─────────────────────────────────────
    this.tryCreateLayer(map, tileset, LAYER_NAMES.BACKGROUND);
    this.tryCreateLayer(map, tileset, LAYER_NAMES.DECORATION_BACK);
    this.tryCreateLayer(map, tileset, LAYER_NAMES.GROUND);
    this.tryCreateLayer(map, tileset, LAYER_NAMES.PLATFORMS);

    // ── Collision layer (physics only, hidden by default) ─────────────────
    const collisionLayer = map.createLayer(LAYER_NAMES.COLLISION, tileset, 0, 0);
    if (!collisionLayer) {
      throw new Error(
        `TilemapLoader: map "${config.key}" is missing the required ` +
        `"${LAYER_NAMES.COLLISION}" tile layer.`,
      );
    }
    // Collide with every non-empty tile (-1 = empty in Phaser's internal representation)
    collisionLayer.setCollisionByExclusion([-1]);
    // Hidden at startup; toggled via F3
    collisionLayer.setAlpha(0);

    // Decoration_Front renders above the player
    const frontDeco = this.tryCreateLayer(map, tileset, LAYER_NAMES.DECORATION_FRONT);
    if (frontDeco) frontDeco.setDepth(10);

    // ── Object layers ─────────────────────────────────────────────────────
    const objects = this.parseObjects(map);

    console.log(
      `[MapManager] Loaded "${config.key}" — ` +
      `${map.widthInPixels}×${map.heightInPixels}px, ` +
      `spawn at (${Math.round(objects.playerSpawn.x)}, ${Math.round(objects.playerSpawn.y)})`,
    );

    return new Level(map, collisionLayer, objects);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Create a layer if it exists in the map; silently returns null if not. */
  private tryCreateLayer(
    map: Phaser.Tilemaps.Tilemap,
    tileset: Phaser.Tilemaps.Tileset,
    name: string,
  ): Phaser.Tilemaps.TilemapLayer | null {
    if (!map.getLayer(name)) return null;
    return map.createLayer(name, tileset, 0, 0);
  }

  /** Extract typed game objects from all object layers. */
  private parseObjects(map: Phaser.Tilemaps.Tilemap): LevelObjects {
    const spawnLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.PLAYER_SPAWN);
    const exitLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.LEVEL_EXIT);
    const checkpointLayer = map.getObjectLayer(OBJECT_LAYER_NAMES.CHECKPOINT);

    const rawSpawn = spawnLayer?.objects[0];
    const playerSpawn: SpawnPoint = rawSpawn
      ? { x: rawSpawn.x ?? DEFAULT_SPAWN.x, y: rawSpawn.y ?? DEFAULT_SPAWN.y }
      : DEFAULT_SPAWN;

    return {
      playerSpawn,
      exits: exitLayer?.objects ?? [],
      checkpoints: checkpointLayer?.objects ?? [],
    };
  }
}
