import Phaser from 'phaser';
import type { PlayerDebugInfo } from '../entities/Player';
import type { EntityDebugInfo } from '../managers/EntityManager';
import type { CameraDebugInfo } from '../managers/CameraManager';
import type { InteractionDebugInfo } from '../managers/InteractionManager';
import type { TouchDebugInfo } from '../input/TouchManager';
import type { KaiDebugInfo } from '../entities/player/Kai';
import type { EnemyDebugInfo } from '../entities/enemy/SnakeEnemy';

/**
 * Shape used by the F7 asset/animation debug panel.
 * Built by GameScene._buildAssetDebugInfo() from AssetCatalog, AssetValidator,
 * AnimationFactory stats, and the M14 environment systems.
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

  // M12 — AssetCatalog stats
  /** Total entries in the catalog. */
  totalCatalogAssets: number;
  /** Entries with missing_required or frame_error status. */
  failedCatalogAssets: number;
  /** JS heap size in MB, or null if performance.memory is unavailable. */
  memoryEstimateMB: number | null;
  /** Per-category totals and loaded counts. */
  categoryStats: Partial<Record<string, { total: number; loaded: number; failed: number }>>;

  // M14 — Environment system stats
  /** Names of tilesets loaded in the current map. */
  loadedTilesets: string[];
  /** Number of animated tile types registered for the active preset. */
  animatedTileCount: number;
  /** Names of registered animated tile animations. */
  animationNames: string[];
  /** Number of non-empty tiles in Decoration_Back + Decoration_Front layers. */
  decorationCount: number;
  /** Names of decoration types in the active preset. */
  decorationTypes: string[];
  /** Number of parallax background layers active. */
  parallaxLayerCount: number;
  /** Active background theme identifier. */
  backgroundTheme: string;
  /** Active decoration preset identifier. */
  decorationPreset: string;
  /** Active animated tile preset identifier. */
  animatedTilePreset: string;
  // M15 — Level identity
  /** World identifier for the current level (e.g. 'world01_jungle'). */
  worldPreset: string;
  /** Human-readable level display name. */
  levelDisplayName: string;
  // M16 — Tileset pipeline
  /** 'production' if a real PNG was loaded; 'procedural' if BootScene generated it. */
  tilesetSource: string;
  /** Width of the tileset texture in pixels. */
  tilesetWidth: number;
  /** Height of the tileset texture in pixels. */
  tilesetHeight: number;
  /** Total number of tiles in the sheet. */
  tilesetTileCount: number;
  /** Whether the animated tile atlas was loaded from disk. */
  animAtlasLoaded: boolean;
  /** Whether the decorative tile atlas was loaded from disk. */
  decoAtlasLoaded: boolean;
}

/**
 * Snapshot consumed by DebugOverlay when F7 (asset debug) is also active.
 * Built by GameScene._buildGameFlowDebugInfo().
 * Updated M19: includes checkpoint, respawn, transition and particle fields.
 */
export interface GameFlowDebugInfo {
  // ── M18 fields ──────────────────────────────────────────────────────────
  /** Current game flow state string. */
  flowState:         string;
  /** Player current HP. */
  hp:                number;
  /** Player max HP. */
  maxHp:             number;
  /** Crystals collected this session. */
  crystalsCollected: number;
  /** Total crystals placed in the level. */
  totalCrystals:     number;

  // ── M19 fields ──────────────────────────────────────────────────────────
  /** World position of the last activated checkpoint, or null. */
  checkpointPos:   { x: number; y: number } | null;
  /** Number of times the player has respawned this session. */
  respawnCount:    number;
  /** Total deaths (same as respawnCount for now; separate for future lives). */
  deathCount:      number;
  /** TransitionManager state string. */
  transitionState: string;
  /** True while hit-stop timer is active. */
  hitStopActive:   boolean;
  /** Number of active particle graphics objects across all particle bursts. */
  particleCount:   number;
}

/**
 * DebugOverlay
 *
 * Fixed-position HUD text that displays game state for each active debug mode:
 *   Always   — FPS, player X/Y, player state
 *   F4       — Entity counts
 *   F5       — Camera scroll, zoom, look-ahead, dead zone
 *   F6       — Interaction focus, checkpoint, interactable count
 *   F7       — Asset pipeline + M14 environment systems
 *   F8       — Touch / virtual control state
 *   F9       — Kai character state and animation data
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
    enemyDebug?: EnemyDebugInfo,
    cameraDebug?: CameraDebugInfo,
    interactionDebug?: InteractionDebugInfo,
    assetDebug?: AssetDebugInfo,
    touchDebug?: TouchDebugInfo,
    kaiDebug?: KaiDebugInfo,
    gameFlowDebug?: GameFlowDebugInfo,
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
        `Invul  ${debug.isInvulnerable ? 'yes' : 'no'}`,
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

    if (enemyDebug) {
      lines.push(
        `─────────────────`,
        `[Enemies F4]`,
        `Total    ${enemyDebug.totalCount}`,
        `Active   ${enemyDebug.activeCount}`,
        `Sleeping ${enemyDebug.sleepingCount}`,
        `Defeated ${enemyDebug.defeatedCount}`,
      );
      // Show patrol state for each snake (truncate at 6)
      const states = enemyDebug.patrolStates.slice(0, 6);
      for (let i = 0; i < states.length; i++) {
        lines.push(`  #${i + 1} ${states[i]}`);
      }
      if (enemyDebug.patrolStates.length > 6) {
        lines.push(`  …+${enemyDebug.patrolStates.length - 6} more`);
      }
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
      const memStr = assetDebug.memoryEstimateMB !== null
        ? `${assetDebug.memoryEstimateMB}MB` : '—';

      lines.push(
        `─────────────────`,
        `[Assets F7]`,
        `Total   ${assetDebug.totalCatalogAssets}`,
        `Loaded  ${assetDebug.loadedCount}`,
        `Failed  ${assetDebug.failedCatalogAssets === 0 ? '✓ 0' : `⚠ ${assetDebug.failedCatalogAssets}`}`,
        `MissReq ${missingReq === 0 ? '✓ 0' : `⚠ ${missingReq}`}`,
        `MissOpt ${assetDebug.missingOptional}`,
        `FrmWarn ${assetDebug.frameSizeWarnings.length === 0 ? '✓ 0' : `⚠ ${assetDebug.frameSizeWarnings.length}`}`,
        `Mem     ${memStr}`,
        `─────────────────`,
        `Anims   ${assetDebug.registeredAnims}`,
        `Pending ${assetDebug.pendingAnims}`,
      );
      if (assetDebug.missingRequired.length > 0) {
        lines.push(`Miss: ${assetDebug.missingRequired.slice(0, 3).join(', ')}`);
      }
      if (assetDebug.pendingAnimKeys.length > 0) {
        const preview = assetDebug.pendingAnimKeys
          .slice(0, 3)
          .map((k) => k.replace(/^(player_|enemy_|effect_)/, ''))
          .join(', ');
        lines.push(`Pend: ${preview}${assetDebug.pendingAnimKeys.length > 3 ? '…' : ''}`);
      }
      // Per-category summary (non-zero totals only)
      const cats = Object.entries(assetDebug.categoryStats) as [string, { total: number; loaded: number; failed: number }][];
      if (cats.length > 0) {
        lines.push(`─────────────────`);
        for (const [cat, s] of cats) {
          const short  = cat.slice(0, 4);
          const status = s.failed > 0 ? `⚠` : s.loaded === s.total ? `✓` : `·`;
          lines.push(`${status} ${short.padEnd(5)} ${s.loaded}/${s.total}`);
        }
      }

      // ── M15: Environment systems ────────────────────────────────────────
      lines.push(
        `─────────────────`,
        `[Env M15]`,
      );

      // Level identity (M15)
      lines.push(`World   ${assetDebug.worldPreset}`);
      lines.push(`Level   ${assetDebug.levelDisplayName}`);

      // Tilesets
      const tsStr = assetDebug.loadedTilesets.length > 0
        ? assetDebug.loadedTilesets.join(', ')
        : '—';
      lines.push(`Tileset ${tsStr}`);

      // Parallax layers
      lines.push(`BgTheme ${assetDebug.backgroundTheme}`);
      lines.push(`BgLyrs  ${assetDebug.parallaxLayerCount}`);

      // Animated tiles
      lines.push(`AnimTls ${assetDebug.animatedTileCount > 0
        ? `${assetDebug.animatedTileCount} (${assetDebug.animationNames.slice(0, 2).join(', ')}${assetDebug.animationNames.length > 2 ? '…' : ''})`
        : `0 (${assetDebug.animatedTilePreset})`}`);

      // Decoration
      lines.push(`DecoSet ${assetDebug.decorationPreset}`);
      lines.push(`DecoTls ${assetDebug.decorationCount}${
        assetDebug.decorationTypes.length > 0
          ? ` (${assetDebug.decorationTypes.slice(0, 2).join(', ')}${assetDebug.decorationTypes.length > 2 ? '…' : ''})`
          : ''}`);

      // ── M16: Tileset pipeline ────────────────────────────────────────────
      const srcLabel = assetDebug.tilesetSource === 'production' ? '✓ prod' : '· proc';
      lines.push(`TsSrc   ${srcLabel}`);
      lines.push(`TsDim   ${assetDebug.tilesetWidth}×${assetDebug.tilesetHeight} (${assetDebug.tilesetTileCount} tiles)`);
      lines.push(`AnimAk  ${assetDebug.animAtlasLoaded ? '✓ yes' : '· no'}`);
      lines.push(`DecoAk  ${assetDebug.decoAtlasLoaded ? '✓ yes' : '· no'}`);
    }

    if (touchDebug) {
      lines.push(
        `─────────────────`,
        `Touch  ${touchDebug.touchCount}`,
        `Vis    ${touchDebug.visible ? 'yes' : 'no'}`,
        `MoveX  ${touchDebug.moveX.toFixed(2)}`,
        `JstkAng ${touchDebug.joystickAngle}°`,
        `Jump   ${touchDebug.jumpDown ? '▼ held' : 'up'}`,
        `Iact   ${touchDebug.interactDown ? '▼ held' : 'up'}`,
      );
    }

    if (kaiDebug) {
      const frameStr  = kaiDebug.frameIndex >= 0 ? String(kaiDebug.frameIndex) : '—';
      const fpsStr    = kaiDebug.animFps > 0     ? `${kaiDebug.animFps}fps`    : '—';
      const sizeStr   = `${kaiDebug.spriteWidth}×${kaiDebug.spriteHeight}`;
      const animOkStr = kaiDebug.animLoaded       ? '✓ yes'                    : '· no (pending)';
      lines.push(
        `─────────────────`,
        `[Kai F9]`,
        `Anim   ${kaiDebug.animKey}`,
        `AnimOk ${animOkStr}`,
        `State  ${kaiDebug.state}`,
        `Facing ${kaiDebug.facing}`,
        `VelX   ${kaiDebug.velocityX.toFixed(1)}`,
        `VelY   ${kaiDebug.velocityY.toFixed(1)}`,
        `Frame  ${frameStr}`,
        `FPS    ${fpsStr}`,
        `Size   ${sizeStr}`,
        `Tex    ${kaiDebug.textureKey}`,
      );
    }

    if (gameFlowDebug) {
      const cp = gameFlowDebug.checkpointPos;
      lines.push(
        `─────────────────`,
        `[GameFlow M19]`,
        `State    ${gameFlowDebug.flowState}`,
        `HP       ${gameFlowDebug.hp}/${gameFlowDebug.maxHp}`,
        `Crystals ${gameFlowDebug.crystalsCollected}/${gameFlowDebug.totalCrystals}`,
        `CkptX    ${cp ? cp.x : '—'}`,
        `CkptY    ${cp ? cp.y : '—'}`,
        `Respawns ${gameFlowDebug.respawnCount}`,
        `Deaths   ${gameFlowDebug.deathCount}`,
        `Transit  ${gameFlowDebug.transitionState}`,
        `HitStop  ${gameFlowDebug.hitStopActive ? 'yes' : 'no'}`,
        `Ptcls    ${gameFlowDebug.particleCount}`,
      );
    }

    this.setText(lines);
  }
}
