import Phaser from 'phaser';
import type { PlayerDebugInfo } from '../entities/Player';
import type { EntityDebugInfo } from '../managers/EntityManager';
import type { CameraDebugInfo } from '../managers/CameraManager';
import type { InteractionDebugInfo } from '../managers/InteractionManager';
import type { TouchDebugInfo } from '../input/TouchManager';
import type { KaiDebugInfo } from '../entities/player/Kai';
import type { EnemyDebugInfo } from '../entities/enemy/SnakeEnemy';

export interface AssetDebugInfo {
  loadedCount: number;
  missingRequired: string[];
  missingOptional: number;
  frameSizeWarnings: string[];
  registeredAnims: number;
  pendingAnims: number;
  pendingAnimKeys: string[];
  totalCatalogAssets: number;
  failedCatalogAssets: number;
  memoryEstimateMB: number | null;
  categoryStats: Partial<Record<string, { total: number; loaded: number; failed: number }>>;
  loadedTilesets: string[];
  animatedTileCount: number;
  animationNames: string[];
  decorationCount: number;
  decorationTypes: string[];
  backgroundTheme: string;
  decorationPreset: string;
  animatedTilePreset: string;
  worldPreset: string;
  levelDisplayName: string;
  tilesetSource: string;
  tilesetWidth: number;
  tilesetHeight: number;
  tilesetTileCount: number;
  animAtlasLoaded: boolean;
  decoAtlasLoaded: boolean;
}

export interface GameFlowDebugInfo {
  flowState: string;
  hp: number;
  maxHp: number;
  crystalsCollected: number;
  totalCrystals: number;
  checkpointPos: { x: number; y: number } | null;
  respawnCount: number;
  deathCount: number;
  transitionState: string;
  hitStopActive: boolean;
  particleCount: number;
}

export interface ProductionArtDebugInfo {
  totalCategories: number;
  loadedCategories: number;
  pendingCategories: number;
  categoryLines: string[];
}

/** Developer diagnostics. Hidden by default in the player build. */
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
    this.setVisible(false);
  }

  update(
    fps: number,
    playerX: number,
    playerY: number,
    debug?: PlayerDebugInfo,
    entityDebug?: EntityDebugInfo,
    enemyDebug?: EnemyDebugInfo,
    cameraDebug?: CameraDebugInfo,
    interactionDebug?: InteractionDebugInfo,
    assetDebug?: AssetDebugInfo,
    touchDebug?: TouchDebugInfo,
    kaiDebug?: KaiDebugInfo,
    gameFlowDebug?: GameFlowDebugInfo,
    prodArtDebug?: ProductionArtDebugInfo,
  ): void {
    const lines: string[] = [
      `FPS    ${Math.round(fps)}`,
      `X      ${Math.round(playerX)}`,
      `Y      ${Math.round(playerY)}`,
    ];
    if (debug) lines.push(`State  ${debug.state}`, `Gnd    ${debug.grounded ? 'yes' : 'no'}`, `VelX   ${debug.velocityX.toFixed(1)}`, `VelY   ${debug.velocityY.toFixed(1)}`);
    if (entityDebug) lines.push(`Entities ${entityDebug.entityCount}`, `Active   ${entityDebug.activeCount}`, `Crystals ${entityDebug.collectedCrystals}`);
    if (enemyDebug) lines.push(`Enemies ${enemyDebug.totalCount}`, `Active ${enemyDebug.activeCount}`, `Defeated ${enemyDebug.defeatedCount}`);
    if (cameraDebug) lines.push(`CamX ${cameraDebug.scrollX}`, `CamY ${cameraDebug.scrollY}`, `Zoom ${cameraDebug.zoom.toFixed(2)}`);
    if (interactionDebug) lines.push(`Interactables ${interactionDebug.interactableCount}`, `Focus ${interactionDebug.focusedType ?? 'none'}`);
    if (assetDebug) lines.push(`Assets ${assetDebug.loadedCount}/${assetDebug.totalCatalogAssets}`, `Failed ${assetDebug.failedCatalogAssets}`, `World ${assetDebug.worldPreset}`, `Level ${assetDebug.levelDisplayName}`, `Tileset ${assetDebug.tilesetSource}`);
    if (touchDebug) lines.push(`Touch ${touchDebug.touchCount}`, `MoveX ${touchDebug.moveX.toFixed(2)}`, `Jump ${touchDebug.jumpDown ? 'held' : 'up'}`);
    if (kaiDebug) lines.push(`Kai ${kaiDebug.animKey}`, `Frame ${kaiDebug.frameIndex}`, `Facing ${kaiDebug.facing}`);
    if (gameFlowDebug) lines.push(`Flow ${gameFlowDebug.flowState}`, `HP ${gameFlowDebug.hp}/${gameFlowDebug.maxHp}`, `Crystals ${gameFlowDebug.crystalsCollected}/${gameFlowDebug.totalCrystals}`, `Deaths ${gameFlowDebug.deathCount}`);
    if (prodArtDebug) lines.push(`Art ${prodArtDebug.loadedCategories}/${prodArtDebug.totalCategories}`, ...prodArtDebug.categoryLines);
    this.setText(lines);
  }
}
