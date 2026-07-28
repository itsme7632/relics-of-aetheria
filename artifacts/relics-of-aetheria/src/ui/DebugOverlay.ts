import Phaser from 'phaser';

/**
 * DebugOverlay
 *
 * A fixed-position HUD text object that displays:
 *   - Current FPS
 *   - Player world X coordinate
 *   - Player world Y coordinate
 *
 * Pinned to the top-left of the viewport (scroll factor 0).
 */
export class DebugOverlay extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene) {
    super(scene, 12, 12, '', {
      fontSize: '13px',
      fontFamily: '"Courier New", Courier, monospace',
      color: '#88ffaa',
      backgroundColor: 'rgba(0,0,0,0.55)',
      padding: { x: 10, y: 8 },
    });

    scene.add.existing(this);
    // Fix to camera — always visible regardless of scroll position
    this.setScrollFactor(0);
    this.setDepth(1000);
  }

  update(fps: number, playerX: number, playerY: number): void {
    this.setText([
      `FPS  ${Math.round(fps)}`,
      `X    ${Math.round(playerX)}`,
      `Y    ${Math.round(playerY)}`,
    ]);
  }
}
