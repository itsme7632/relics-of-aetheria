import Phaser from 'phaser';
import type { PlayerDebugInfo } from '../entities/Player';
import type { EntityDebugInfo } from '../managers/EntityManager';
import type { CameraDebugInfo } from '../managers/CameraManager';
import type { InteractionDebugInfo } from '../managers/InteractionManager';

/**
 * DebugOverlay
 *
 * Fixed-position HUD text that displays game state for each active debug mode:
 *   Always   — FPS, player X/Y
 *   (always) — Player state, velocity, coyote, jump buffer
 *   F4       — Entity counts
 *   F5       — Camera scroll, zoom, look-ahead, dead zone
 *   F6       — Interaction focus, checkpoint, interactable count
 *
 * Pinned to the top-left of the viewport (scrollFactor 0).
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
    interactionDebug?: InteractionDebugInfo,
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

    if (interactionDebug) {
      const cp = interactionDebug.activeCheckpointPos;
      lines.push(
        `─────────────────`,
        `IActvs ${interactionDebug.interactableCount}`,
        `Focus  ${interactionDebug.focusedType ?? 'none'}`,
        `CkptX  ${cp ? cp.x : '—'}`,
        `CkptY  ${cp ? cp.y : '—'}`,
      );
    }

    this.setText(lines);
  }
}
