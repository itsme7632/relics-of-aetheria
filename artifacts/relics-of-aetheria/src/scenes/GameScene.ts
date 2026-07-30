import Phaser from 'phaser';
import { Kai } from '../entities/player/Kai';
import { DebugOverlay } from '../ui/DebugOverlay';
import { EntityManager } from '../managers/EntityManager';
import { CameraManager } from '../managers/CameraManager';
import { InteractionManager } from '../managers/InteractionManager';
import { TouchManager } from '../input/TouchManager';
import { Crystal } from '../entities/collectible/Crystal';
import { Checkpoint } from '../entities/interactable/Checkpoint';
import { LevelExit } from '../entities/interactable/LevelExit';
import { Door } from '../entities/interactable/Door';
import { Sign } from '../entities/interactable/Sign';
import { InteractionEvents } from '../events/InteractionEvents';
import { Level } from '../systems/Level';
import { WorldManager } from '../world/WorldManager';
import { buildParallaxLayers, ParallaxLayer } from '../systems/ParallaxLayer';
import { AnimatedTileSystem } from '../systems/AnimatedTileSystem';
import { DecorationSystem } from '../systems/DecorationSystem';
import { buildEnvironmentConfig } from '../world/WorldEnvironment';
import { AssetValidator } from '../assets/AssetValidator';
import { AnimationFactory } from '../animation/AnimationFactory';
import { AssetCatalog } from '../assets/AssetCatalog';

/**
 * GameScene
 *
 * Wires together all milestones:
 *   M1-2  Engine + Tilemap
 *   M3    Player controller
 *   M4    Entity system (Crystal collectibles)
 *   M5    Camera + parallax
 *   M6    WorldManager (manifest → validation → Level)
 *   M7    InteractionManager (Checkpoint, LevelExit, Door, Sign)
 *   M8    Asset pipeline + Animation foundation
 *   M9    Mobile controls (TouchManager → TouchInputState)
 *   M10   Kai Character System (sprite renderer + animation controller)
 *   M14   Environment systems (parallax themes, animated tiles, decoration presets)
 *
 * Debug keys:
 *   F3 — collision tile overlay
 *   F4 — entity counts
 *   F5 — camera debug (dead zone, look-ahead)
 *   F6 — interaction debug (radii, focus, checkpoint)
 *   F7 — asset pipeline + M14 environment debug
 *   F8 — touch/input debug (touch count, joystick vector, button states)
 *   F9 — Kai character debug (anim key, facing, velocity, state)
 */
export class GameScene extends Phaser.Scene {
  private player!: Kai;
  private debugOverlay!: DebugOverlay;
  private worldManager!: WorldManager;
  private entityManager!: EntityManager;
  private cameraManager!: CameraManager;
  private interactionManager!: InteractionManager;
  private touchManager!: TouchManager;
  private level!: Level;
  private parallaxLayers: ParallaxLayer[] = [];

  // ── M14 — Environment systems ─────────────────────────────────────────────
  private animatedTileSystem!: AnimatedTileSystem;
  private decorationSystem!: DecorationSystem;

  // ── Level-complete overlay (shown when no next level exists) ──────────────
  private levelCompleteText: Phaser.GameObjects.Text | null = null;

  // ── Debug F-keys (input is owned by TouchManager, not GameScene) ──────────
  private debugKey!: Phaser.Input.Keyboard.Key;
  private entityDebugKey!: Phaser.Input.Keyboard.Key;
  private cameraDebugKey!: Phaser.Input.Keyboard.Key;
  private interactionDebugKey!: Phaser.Input.Keyboard.Key;
  private assetDebugKey!: Phaser.Input.Keyboard.Key;
  private touchDebugKey!: Phaser.Input.Keyboard.Key;
  private kaiDebugKey!:   Phaser.Input.Keyboard.Key;

  // ── Debug state ───────────────────────────────────────────────────────────
  private collisionDebugActive    = false;
  private entityDebugActive       = false;
  private cameraDebugActive       = false;
  private interactionDebugActive  = false;
  private assetDebugActive        = false;
  private touchDebugActive        = false;
  private kaiDebugActive          = false;

  private levelId = WorldManager.startingLevelId;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelId?: string }): void {
    this.levelId                 = data.levelId ?? WorldManager.startingLevelId;
    this.collisionDebugActive    = false;
    this.entityDebugActive       = false;
    this.cameraDebugActive       = false;
    this.interactionDebugActive  = false;
    this.assetDebugActive        = false;
    this.touchDebugActive        = false;
    this.kaiDebugActive          = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // ── World Manager ────────────────────────────────────────────────────────
    this.worldManager = new WorldManager(this);
    this.level = this.worldManager.loadLevel(this.levelId, {
      knownEntityTypes: ['Crystal', 'Door', 'Sign'],
    });

    // ── M14: Build typed environment config from manifest entry ──────────────
    const envConfig = buildEnvironmentConfig(this.worldManager.getCurrentEntry());

    // ── Parallax background layers (theme-driven) ────────────────────────────
    this.parallaxLayers = buildParallaxLayers(
      this,
      this.level.widthInPixels,
      this.level.heightInPixels,
      envConfig.backgroundTheme,
    );

    // ── M14: Animated tile system ────────────────────────────────────────────
    this.animatedTileSystem = new AnimatedTileSystem();
    this.animatedTileSystem.apply(
      this.level.map,
      this.worldManager.getCurrentEntry()?.tilesetName ?? 'tileset',
      envConfig.animatedTilePreset,
    );

    // ── M14: Decoration system ────────────────────────────────────────────────
    this.decorationSystem = new DecorationSystem();
    this.decorationSystem.applyPreset(envConfig.decorationPreset, this.level.map);

    // ── Entity system (collectibles) ─────────────────────────────────────────
    this.entityManager = new EntityManager(this);
    this.entityManager.registerType('Crystal', (scene) => new Crystal(scene));
    this.entityManager.spawnFromMap(this.level.map);

    // ── Interaction system ───────────────────────────────────────────────────
    this.interactionManager = new InteractionManager(this);

    // Register E-press types by Tiled object name (Objects layer)
    this.interactionManager.registerType(
      'Door',
      (scene, _x, _y, data) => new Door(scene, data.width ?? 32, data.height ?? 64),
    );
    this.interactionManager.registerType(
      'Sign',
      (scene, _x, _y, data) => {
        const msgProp = (data.properties as Array<{ name: string; value: unknown }> | undefined)
          ?.find((p) => p.name === 'message');
        const message = typeof msgProp?.value === 'string'
          ? msgProp.value
          : 'An ancient inscription...';
        return new Sign(scene, message, data.width ?? 24, data.height ?? 32);
      },
    );

    // Spawn Door/Sign from Objects layer
    this.interactionManager.spawnFromLayer(this.level.map, 'Objects');

    // Spawn Checkpoints from dedicated layer (auto-activate)
    this.interactionManager.spawnLayerAsType(
      this.level.map,
      'Checkpoint',
      (scene, _x, _y, data) => new Checkpoint(scene, data.width ?? 32, data.height ?? 64),
    );

    // Spawn LevelExits from dedicated layer (E-press)
    this.interactionManager.spawnLayerAsType(
      this.level.map,
      'LevelExit',
      (scene, _x, _y, data) => new LevelExit(scene, data.width ?? 32, data.height ?? 64),
    );

    // ── Player (Kai — M10 sprite character) ──────────────────────────────────
    const { x, y } = this.level.objects.playerSpawn;
    this.player = new Kai(this, x, y);

    this.physics.add.collider(this.player, this.level.collisionLayer);
    this.entityManager.initOverlaps(this.player);
    this.interactionManager.initOverlaps(this.player);

    // ── Camera Manager ───────────────────────────────────────────────────────
    this.cameraManager = new CameraManager(this, this.player, this.level);
    this.cameraManager.effects.fadeIn(400);

    // ── Level complete listener ──────────────────────────────────────────────
    this.events.on(InteractionEvents.LEVEL_COMPLETE, this._onLevelComplete, this);

    // ── Input — TouchManager owns all gameplay input (keyboard + touch) ───────
    // It must be created before DebugOverlay so the F8 key doesn't conflict.
    this.touchManager = new TouchManager(this);

    // ── HUD & debug F-keys ────────────────────────────────────────────────────
    this.debugOverlay = new DebugOverlay(this);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const kb = this.input.keyboard!;
    this.debugKey             = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
    this.entityDebugKey       = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F4);
    this.cameraDebugKey       = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F5);
    this.interactionDebugKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F6);
    this.assetDebugKey        = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F7);
    this.touchDebugKey        = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F8);
    this.kaiDebugKey          = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F9);

    // ── Shutdown cleanup ─────────────────────────────────────────────────────
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(InteractionEvents.LEVEL_COMPLETE, this._onLevelComplete, this);
      this.worldManager.destroy();
      this.entityManager.destroyAll();
      this.interactionManager.destroyAll();
      this.cameraManager.destroy();
      for (const layer of this.parallaxLayers) layer.destroy();
      this.parallaxLayers = [];
    });
  }

  update(_time: number, delta: number): void {
    // TouchManager must be updated first — it produces the unified input state
    // that Player and InteractionManager consume this frame.
    this.touchManager.update();
    const input = this.touchManager.currentState;

    this.player.update(delta, input);
    this.entityManager.update(delta);
    this.cameraManager.update(delta);

    // Interact is driven by the unified input state (E key OR touch interact button)
    this.interactionManager.update(
      { x: this.player.x, y: this.player.y },
      input.interactJust,
    );

    // ── Debug key toggles ─────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.toggleCollisionDebug();
    }
    if (Phaser.Input.Keyboard.JustDown(this.entityDebugKey)) {
      this.entityDebugActive = !this.entityDebugActive;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cameraDebugKey)) {
      this.toggleCameraDebug();
    }
    if (Phaser.Input.Keyboard.JustDown(this.interactionDebugKey)) {
      this.toggleInteractionDebug();
    }
    if (Phaser.Input.Keyboard.JustDown(this.assetDebugKey)) {
      this.assetDebugActive = !this.assetDebugActive;
    }
    if (Phaser.Input.Keyboard.JustDown(this.touchDebugKey)) {
      this.toggleTouchDebug();
    }
    if (Phaser.Input.Keyboard.JustDown(this.kaiDebugKey)) {
      this.kaiDebugActive = !this.kaiDebugActive;
    }

    // ── HUD update ────────────────────────────────────────────────────────
    this.debugOverlay.update(
      this.game.loop.actualFps,
      this.player.x,
      this.player.y,
      this.player.debugInfo,
      this.entityDebugActive      ? this.entityManager.debugInfo        : undefined,
      this.cameraDebugActive      ? this.cameraManager.debugInfo        : undefined,
      this.interactionDebugActive ? this.interactionManager.debugInfo   : undefined,
      this.assetDebugActive       ? this._buildAssetDebugInfo()          : undefined,
      this.touchDebugActive       ? this.touchManager.debugInfo         : undefined,
      this.kaiDebugActive         ? this.player.kaiDebugInfo            : undefined,
    );
  }

  // ── Camera API ────────────────────────────────────────────────────────────

  setZoom(zoom: number, duration = 300): void {
    this.cameraManager.effects.zoomTo(zoom, duration);
  }

  shakeCamera(duration = 250, intensity = 0.012): void {
    this.cameraManager.effects.shake(intensity, duration);
  }

  // ── Level transition ──────────────────────────────────────────────────────

  transitionToNextLevel(): void {
    const next = this.worldManager.getNextEntry();
    if (!next) return;
    this.cameraManager.effects.fadeOut(500, 0x000000, () => {
      this.scene.restart({ levelId: next.id });
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _onLevelComplete(): void {
    const next = this.worldManager.getNextEntry();
    if (next) {
      this.transitionToNextLevel();
    } else {
      this._showLevelCompleteOverlay();
    }
  }

  private _showLevelCompleteOverlay(): void {
    if (this.levelCompleteText) return; // guard against multiple calls

    const cam = this.cameras.main;
    this.levelCompleteText = this.add.text(
      cam.width  / 2,
      cam.height / 2,
      'LEVEL COMPLETE',
      {
        fontSize:   '52px',
        fontFamily: '"Courier New", Courier, monospace',
        color:      '#ffff44',
        stroke:     '#000000',
        strokeThickness: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 24, y: 14 },
      },
    );
    this.levelCompleteText
      .setScrollFactor(0)
      .setDepth(1001)
      .setOrigin(0.5);

    console.log('[GameScene] Level complete! No next level configured.');
  }

  private toggleCollisionDebug(): void {
    this.collisionDebugActive = !this.collisionDebugActive;
    if (this.collisionDebugActive) {
      this.level.showCollisionDebug(this);
    } else {
      this.level.hideCollisionDebug();
    }
  }

  private toggleCameraDebug(): void {
    this.cameraDebugActive = !this.cameraDebugActive;
    if (this.cameraDebugActive) {
      this.cameraManager.showDebug();
    } else {
      this.cameraManager.hideDebug();
    }
  }

  private toggleInteractionDebug(): void {
    this.interactionDebugActive = !this.interactionDebugActive;
    if (this.interactionDebugActive) {
      this.interactionManager.showDebug();
    } else {
      this.interactionManager.hideDebug();
    }
  }

  private toggleTouchDebug(): void {
    this.touchDebugActive = !this.touchDebugActive;
    if (this.touchDebugActive) {
      this.touchManager.showDebug();
    } else {
      this.touchManager.hideDebug();
    }
  }

  private _buildAssetDebugInfo() {
    const valReport    = AssetValidator.report;
    const animStats    = AnimationFactory.stats;
    const catalogStats = AssetCatalog.instance.stats;
    const entry        = this.worldManager.getCurrentEntry();
    const envConfig    = buildEnvironmentConfig(entry);

    // Collect loaded tileset names from the current map
    const loadedTilesets = this.level.map.tilesets.map((ts) => ts.name);

    return {
      // ── Existing (M8/M12) fields ────────────────────────────────────────
      loadedCount:         valReport.loadedKeys.length,
      missingRequired:     valReport.missingRequired,
      missingOptional:     valReport.missingOptional.length,
      frameSizeWarnings:   valReport.frameSizeWarnings,
      registeredAnims:     animStats.registeredKeys.length,
      pendingAnims:        animStats.pendingKeys.length,
      pendingAnimKeys:     animStats.pendingKeys,
      totalCatalogAssets:  catalogStats.total,
      failedCatalogAssets: catalogStats.failed,
      memoryEstimateMB:    catalogStats.memoryEstimateMB,
      categoryStats:       catalogStats.byCategory,

      // ── M14 environment fields ──────────────────────────────────────────
      loadedTilesets,
      animatedTileCount:  this.animatedTileSystem.animatedTileCount,
      animationNames:     this.animatedTileSystem.animationNames,
      decorationCount:    this.decorationSystem.decorationCount,
      decorationTypes:    this.decorationSystem.typeNames,
      parallaxLayerCount: this.parallaxLayers.length,
      backgroundTheme:    envConfig.backgroundTheme,
      decorationPreset:   envConfig.decorationPreset,
      animatedTilePreset: envConfig.animatedTilePreset,

      // ── M15 level identity fields ───────────────────────────────────────
      worldPreset:       entry?.world        ?? '—',
      levelDisplayName:  entry?.displayName  ?? '—',
    };
  }
}
