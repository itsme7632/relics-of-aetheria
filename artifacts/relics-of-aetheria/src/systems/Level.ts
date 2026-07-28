import Phaser from 'phaser';

// ─── Layer name constants ─────────────────────────────────────────────────────

export const LAYER_NAMES = {
  BACKGROUND: 'Background',
  GROUND: 'Ground',
  PLATFORMS: 'Platforms',
  COLLISION: 'Collision',
  DECORATION_BACK: 'Decoration_Back',
  DECORATION_FRONT: 'Decoration_Front',
} as const;

export const OBJECT_LAYER_NAMES = {
  PLAYER_SPAWN: 'PlayerSpawn',
  LEVEL_EXIT: 'LevelExit',
  CHECKPOINT: 'Checkpoint',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpawnPoint {
  x: number;
  y: number;
}

export interface LevelObjects {
  /** Where the player should appear on scene start. */
  playerSpawn: SpawnPoint;
  /** All objects in the LevelExit layer. */
  exits: Phaser.Types.Tilemaps.TiledObject[];
  /** All objects in the Checkpoint layer. */
  checkpoints: Phaser.Types.Tilemaps.TiledObject[];
}

// ─── Level ────────────────────────────────────────────────────────────────────

/**
 * Level
 *
 * Owns a loaded Phaser tilemap and exposes the collision layer, object
 * spawn data, and helpers for debug visualization.  Created by
 * TilemapLoader and managed by MapManager.
 */
export class Level {
  readonly map: Phaser.Tilemaps.Tilemap;
  readonly collisionLayer: Phaser.Tilemaps.TilemapLayer;
  readonly objects: LevelObjects;

  private debugGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(
    map: Phaser.Tilemaps.Tilemap,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    objects: LevelObjects,
  ) {
    this.map = map;
    this.collisionLayer = collisionLayer;
    this.objects = objects;
  }

  /** Total level width in pixels. */
  get widthInPixels(): number {
    return this.map.widthInPixels;
  }

  /** Total level height in pixels. */
  get heightInPixels(): number {
    return this.map.heightInPixels;
  }

  /**
   * Render collision-tile outlines using Phaser's built-in debug helper.
   * Call once per toggle — the result is a static graphics draw that scrolls
   * correctly with the camera.
   */
  showCollisionDebug(scene: Phaser.Scene): void {
    this.hideCollisionDebug();
    this.debugGraphics = scene.add.graphics();
    this.collisionLayer.renderDebug(this.debugGraphics, {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 160),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    });
  }

  /** Remove the collision-debug overlay. */
  hideCollisionDebug(): void {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
  }

  /** Release the tilemap and all related graphics. */
  destroy(): void {
    this.hideCollisionDebug();
    this.map.destroy();
  }
}
