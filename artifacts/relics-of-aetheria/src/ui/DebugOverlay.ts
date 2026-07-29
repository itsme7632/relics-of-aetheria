import Phaser from 'phaser';
import type { PlayerDebugInfo } from '../entities/Player';
import type { EntityDebugInfo } from '../managers/EntityManager';
import type { CameraDebugInfo } from '../managers/CameraManager';
import type { InteractionDebugInfo } from '../managers/InteractionManager';

/**
 * Shape used by the F7 asset/animation debug panel.
 * Built by GameScene._buildAssetDebugInfo() from AssetValidator + AnimationFactory stats.
 */
export interface AssetDebugInfo {
  /** Number of assets confirmed present in the Phaser cache. */
  loadedCount: number;
  /** Required asset keys that failed to load. */
  missingRequired: string[];
  /** Count of optional assets that are not yet present (expected during dev). */
  missingOptional: number;
  /** Spritesheet keys where frame dimensions don't evenly divide the image. */
  frameSizeWarnings: string[];
  /** Number of animations successfully registered with scene.anims. */
  registeredAnims: number;
  /** Number of animations awaiting artwork before they can be registered. */
  pendingAnims: number;
  /** Keys of pending animations (shown in the overlay list). */
  pendingAnimKeys: string[];
}

/**
 * DebugOverlay
 *
 * Fixed-position HUD text that displays game state for each active debug mode:
 *   Always   — FPS, player X/Y, player state
 *   F4       — Entity counts
 *   F5       — Camera scroll, zoom, look-ahead, dead zone
 *   F6       — Interaction focus, checkpoint, interactable count
 *   F7       — Asset pipeline: loaded, missing, registered animations
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
    assetDebug?: AssetDebugInfo,
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

    if (assetDebug) {
      const missingReq = assetDebug.missingRequired.length;
      lines.push(
        `─────────────────`,
        `Loaded  ${assetDebug.loadedCount}`,
        `MissReq ${missingReq === 0 ? '✓ 0' : `⚠ ${missingReq}`}`,
        `MissOpt ${assetDebug.missingOptional}`,
        `FrmWarn ${assetDebug.frameSizeWarnings.length === 0 ? '✓ 0' : `⚠ ${assetDebug.frameSizeWarnings.length}`}`,
        `─────────────────`,
        `Anims   ${assetDebug.registeredAnims}`,
        `Pending ${assetDebug.pendingAnims}`,
      );
      if (assetDebug.missingRequired.length > 0) {
        lines.push(`Miss: ${assetDebug.missingRequired.slice(0, 3).join(', ')}`);
      }
      if (assetDebug.pendingAnimKeys.length > 0) {
        // Show first 3 pending anim keys truncated
        const preview = assetDebug.pendingAnimKeys
          .slice(0, 3)
          .map((k) => k.replace(/^(player_|enemy_|effect_)/, ''))
          .join(', ');
        lines.push(`Pend: ${preview}${assetDebug.pendingAnimKeys.length > 3 ? '…' : ''}`);
      }
    }

    this.setText(lines);
  }
}
