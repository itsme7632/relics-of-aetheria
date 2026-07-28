import Phaser from 'phaser';
import { LEVELS, STARTING_LEVEL } from '../data/levels';

/**
 * BootScene
 *
 * Loads all registered map JSON files and generates the placeholder tileset
 * texture before handing off to GameScene.
 *
 * Future milestones: add this.load.image / this.load.audio calls here, then
 * show a progress bar using this.load.on('progress', ...).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load every map registered in src/data/levels.ts
    for (const config of Object.values(LEVELS)) {
      this.load.tilemapTiledJSON(config.key, config.mapPath);
    }
    // Future milestone: load real tileset image instead of the generated one
    // this.load.image('tiles', 'assets/tilesets/tileset.png');
  }

  create(): void {
    // Generate a procedural placeholder tileset so the map can render
    // without real art assets. Replace with a real PNG in a later milestone.
    this.generateTilesetTexture();

    this.scene.start('GameScene', { levelKey: STARTING_LEVEL });
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
