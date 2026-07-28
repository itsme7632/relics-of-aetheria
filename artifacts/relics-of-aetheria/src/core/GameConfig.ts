import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';

// World dimensions
export const WORLD_WIDTH = 4096;
export const WORLD_HEIGHT = 720;
export const TILE_SIZE = 64;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 900 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  input: {
    keyboard: true,
  },
};
