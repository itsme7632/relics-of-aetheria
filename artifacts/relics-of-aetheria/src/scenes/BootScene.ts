import Phaser from 'phaser';

/**
 * BootScene
 *
 * Loads the minimal set of assets required to show a loading state, then
 * hands off to GameScene immediately. Future milestones will load heavier
 * assets (spritesheets, tilemaps, audio) here and show a progress bar.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Add asset loading for future milestones here, e.g.:
    //   this.load.image('player', 'assets/sprites/player.png');
    //   this.load.tilemapTiledJSON('level1', 'assets/maps/level1.json');
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
