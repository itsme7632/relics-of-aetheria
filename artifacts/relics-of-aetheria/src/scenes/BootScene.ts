import Phaser from 'phaser';
import { WorldManager } from '../world/WorldManager';

/**
 * BootScene
 *
 * Preloads all assets registered in the level manifest and generates the
 * placeholder tileset texture before handing off to GameScene.
 *
 * Asset registration is now centralised in WorldManager — BootScene no longer
 * imports level data directly.  To add new levels, edit LevelManifest.ts;
 * BootScene picks them up automatically.
 *
 * Future milestones: show a progress bar using this.load.on('progress', ...)
 * and call WorldManager.preloadTilesets(this) when real art assets are added.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Register every map JSON file declared in LevelManifest
    WorldManager.preloadAll(this);

    // Future: WorldManager.preloadTilesets(this);
    // Future: this.load.audio(...) per manifest entry
  }

  create(): void {
    // Generate a procedural placeholder tileset so maps can render
    // without real art assets. Replace with a real PNG in a later milestone.
    this.generateTilesetTexture();

    this.scene.start('GameScene', { levelId: WorldManager.startingLevelId });
  }

  /**
   * Creates the 'tiles' texture (256×32, 8 tiles of 32×32) programmatically.
   * GID 1 = ground/solid, GID 2 = platform, GIDs 3-8 = reserved.
   */
  private generateTilesetTexture(): void {
    const TILE = 32;
    const COLS = 8;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // GID 1: Ground tile — dark navy with a top highlight
    g.fillStyle(0x1a1a40);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x3a3a7a);
    g.fillRect(1, 1, TILE - 2, 5);

    // GID 2: Platform tile — slightly lighter with a thin top edge
    g.fillStyle(0x252550);
    g.fillRect(TILE, 0, TILE, TILE);
    g.fillStyle(0x5555aa);
    g.fillRect(TILE + 1, 1, TILE - 2, 3);

    // GIDs 3–8: Reserved (near-black filler)
    g.fillStyle(0x0d0d1a);
    for (let i = 2; i < COLS; i++) {
      g.fillRect(i * TILE, 0, TILE, TILE);
    }

    g.generateTexture('tiles', TILE * COLS, TILE);
    g.destroy();
  }
}
