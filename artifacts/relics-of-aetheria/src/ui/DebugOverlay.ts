import Phaser from 'phaser';
import type { PlayerDebugInfo } from '../entities/Player';
import type { EntityDebugInfo } from '../managers/EntityManager';
import type { CameraDebugInfo } from '../managers/CameraManager';

/**
 * DebugOverlay
 *
 * A fixed-position HUD text object that displays:
 *   - Current FPS
 *   - Player world X / Y coordinates
 *   - Player state machine state (when enabled)
 *   - Grounded flag, velocity, coyote timer, jump buffer
 *   - Entity counts (F4 toggle)
 *   - Camera state: scroll, zoom, look-ahead, dead zone (F5 toggle)
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

  update(
    fps: number,
    playerX: number,
    playerY: number,
    debug?: PlayerDebugInfo,
    entityDebug?: EntityDebugInfo,
    cameraDebug?: CameraDebugInfo,
  ): void {
    const lines: string[] = [
      `FPS    ${Math.round(fps)}`,
      `X      ${Math.round(playerX)}`,
      `Y      ${Math.round(playerY)}`,
    ];

    if (debug) {
      lines.push(
        `State  ${debug.state}`,
        `Gnd    ${debug.grounded ? 'yes' : 'no'}`,
        `VelX   ${debug.velocityX.toFixed(1)}`,
        `VelY   ${debug.velocityY.toFixed(1)}`,
        `Coyote ${Math.ceil(debug.coyoteTimer)}ms`,
        `JmpBuf ${Math.ceil(debug.jumpBufferTimer)}ms`,
      );
    }

    if (entityDebug) {
      lines.push(
        `─────────────────`,
        `Entities ${entityDebug.entityCount}`,
        `Active   ${entityDebug.activeCount}`,
        `Crystals ${entityDebug.collectedCrystals}`,
      );
    }

    if (cameraDebug) {
      lines.push(
        `─────────────────`,
        `CamX   ${cameraDebug.scrollX}`,
        `CamY   ${cameraDebug.scrollY}`,
        `Zoom   ${cameraDebug.zoom.toFixed(2)}`,
        `LookX  ${cameraDebug.lookAheadX}`,
        `DZoneW ${cameraDebug.deadZoneW}`,
        `DZoneH ${cameraDebug.deadZoneH}`,
      );
    }

    this.setText(lines);
  }
}
