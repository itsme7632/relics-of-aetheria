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
import { TilesetRegistry } from '../assets/TilesetRegistry';
import { SnakeEnemy } from '../entities/enemy/SnakeEnemy';
import type { EnemyDebugInfo } from '../entities/enemy/SnakeEnemy';
import { Player } from '../entities/Player';
import { HudDisplay } from '../ui/HudDisplay';
import { GameOverScreen } from '../ui/GameOverScreen';
import { LevelCompleteScreen } from '../ui/LevelCompleteScreen';
import { PauseMenu } from '../ui/PauseMenu';
import { SettingsMenu } from '../ui/SettingsMenu';
import { ScreenFlash } from '../ui/ScreenFlash';
import { GameEvents } from '../events/GameEvents';

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
 *   M17   Snake enemy system
 *   M18   Player experience: HUD (HP hearts, crystal counter), screen flash,
 *         hit-stop, game-over / level-complete / pause / settings screens
 *
 * Debug keys:
 *   F3 — collision tile overlay
 *   F4 — entity counts
 *   F5 — camera debug (dead zone, look-ahead)
 *   F6 — interaction debug (radii, focus, checkpoint)
 *   F7 — asset pipeline + M14 environment + M18 game-flow debug
 *   F8 — touch/input debug (touch count, joystick vector, button states)
 *   F9 — Kai character debug (anim key, facing, velocity, state)
 *   ESC — toggle pause
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

  // ── M18 — Game flow ───────────────────────────────────────────────────────
  /** Current game flow state — controls which updates run each frame. */
  private _flowState: 'playing' | 'paused' | 'gameover' | 'levelcomplete' = 'playing';
  /** Remaining hit-stop duration (ms) — skips gameplay updates while > 0. */
  private _hitStopTimer = 0;

  // ── M18 — Session stats (for Level Complete screen) ───────────────────────
  private _sessionStartTime   = 0;   // Date.now() at level create()
  private _sessionDamageTaken = 0;   // incremented per successful hit
  private _totalCrystals      = 0;   // total crystals spawned this level

  // ── M18 — UI instances ────────────────────────────────────────────────────
  private hudDisplay!:          HudDisplay;
  private screenFlash!:         ScreenFlash;
  private gameOverScreen!:      GameOverScreen;
  private levelCompleteScreen!: LevelCompleteScreen;
  private pauseMenu!:           PauseMenu;
  private settingsMenu!:        SettingsMenu;

  // ── M18 — Pause key (ESC) ─────────────────────────────────────────────────
  private pauseKey!: Phaser.Input.Keyboard.Key;

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

  /** M17: Cached snake references for wake/sleep management and debug. */
  private snakes: SnakeEnemy[] = [];

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
    // M18 — reset flow state and session stats each restart
    this._flowState          = 'playing';
    this._hitStopTimer       = 0;
    this._sessionDamageTaken = 0;
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
    // M18: record total crystals placed in this level for the stats screen
    this._totalCrystals = this.entityManager.entityCount;

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

    // ── M17: Snake enemies ─────────────────────────────────────────────────
    this._spawnSnakes();

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

    // ── M18: ESC pause key ────────────────────────────────────────────────────
    this.pauseKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // ── M18: Session tracking ──────────────────────────────────────────────────
    this._sessionStartTime = Date.now();

    // ── M18: HUD ──────────────────────────────────────────────────────────────
    const levelEntry = this.worldManager.getCurrentEntry();
    this.hudDisplay = new HudDisplay(
      this,
      Player.MAX_HP,
      levelEntry?.displayName ?? '',
      () => { if (this._flowState === 'playing') this._pauseGame(); },
    );
    this.hudDisplay.setHp(Player.MAX_HP, Player.MAX_HP);

    // ── M18: Screen flash ──────────────────────────────────────────────────────
    this.screenFlash = new ScreenFlash(this);

    // ── M18: Game Over screen ──────────────────────────────────────────────────
    this.gameOverScreen = new GameOverScreen(this, {
      onRetry: () => { this.scene.restart({ levelId: this.levelId }); },
      onExit:  () => { console.log('[GameScene] Exit to menu — not yet implemented.'); },
    });

    // ── M18: Level Complete screen ─────────────────────────────────────────────
    this.levelCompleteScreen = new LevelCompleteScreen(this, {
      onNext:   () => { this.transitionToNextLevel(); },
      onReplay: () => { this.scene.restart({ levelId: this.levelId }); },
    });

    // ── M18: Settings + Pause menus (settings created first; pause opens it) ────
    this.settingsMenu = new SettingsMenu(this, {
      onClose: () => { this.settingsMenu.hide(); this.pauseMenu.show(); },
    });
    this.pauseMenu = new PauseMenu(this, {
      onResume:   () => this._resumeGame(),
      onRestart:  () => { this.scene.restart({ levelId: this.levelId }); },
      onSettings: () => { this.pauseMenu.hide(); this.settingsMenu.show(); },
      onExit:     () => { console.log('[GameScene] Exit to menu — not yet implemented.'); },
    });

    // ── M18: Crystal collected → update HUD counter ────────────────────────────
    this.events.on(GameEvents.CRYSTAL_COLLECTED, () => {
      this.hudDisplay.setCrystals(this.entityManager.collectedCrystals);
    });

    // ── Shutdown cleanup ─────────────────────────────────────────────────────
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(InteractionEvents.LEVEL_COMPLETE, this._onLevelComplete, this);
      this.events.off(GameEvents.CRYSTAL_COLLECTED);
      this.worldManager.destroy();
      this.entityManager.destroyAll();
      this.interactionManager.destroyAll();
      this.cameraManager.destroy();
      for (const layer of this.parallaxLayers) layer.destroy();
      this.parallaxLayers = [];
      for (const snake of this.snakes) snake.destroy();
      this.snakes = [];
      // M18 UI
      this.hudDisplay.destroy();
      this.screenFlash.destroy();
      this.gameOverScreen.destroy();
      this.levelCompleteScreen.destroy();
      this.pauseMenu.destroy();
      this.settingsMenu.destroy();
    });
  }

  update(_time: number, delta: number): void {
    // TouchManager must be updated first — it produces the unified input state
    // that Player and InteractionManager consume this frame.
    this.touchManager.update();
    const input = this.touchManager.currentState;

    // ── ESC: pause toggle (works in 'playing' and 'paused') ───────────────
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      if      (this._flowState === 'playing') this._pauseGame();
      else if (this._flowState === 'paused')  this._resumeGame();
    }

    // ── Debug key toggles (always active regardless of flow state) ────────
    if (Phaser.Input.Keyboard.JustDown(this.debugKey))            this.toggleCollisionDebug();
    if (Phaser.Input.Keyboard.JustDown(this.entityDebugKey))      this.entityDebugActive = !this.entityDebugActive;
    if (Phaser.Input.Keyboard.JustDown(this.cameraDebugKey))      this.toggleCameraDebug();
    if (Phaser.Input.Keyboard.JustDown(this.interactionDebugKey)) this.toggleInteractionDebug();
    if (Phaser.Input.Keyboard.JustDown(this.assetDebugKey))       this.assetDebugActive = !this.assetDebugActive;
    if (Phaser.Input.Keyboard.JustDown(this.touchDebugKey))       this.toggleTouchDebug();
    if (Phaser.Input.Keyboard.JustDown(this.kaiDebugKey))         this.kaiDebugActive = !this.kaiDebugActive;

    // ── Non-playing states: skip gameplay, still render debug overlay ─────
    if (this._flowState !== 'playing') {
      this._updateDebugOverlay();
      return;
    }

    // ── Hit-stop: brief freeze after taking damage ─────────────────────────
    if (this._hitStopTimer > 0) {
      this._hitStopTimer = Math.max(0, this._hitStopTimer - delta);
      this.cameraManager.update(delta);
      this._updateDebugOverlay();
      return;
    }

    // ── Normal gameplay ───────────────────────────────────────────────────
    this.player.update(delta, input);
    this.entityManager.update(delta);

    // ── M17: Snake enemy updates ───────────────────────────────────────────
    for (const snake of this.snakes) {
      if (!snake.isDefeated) snake.update(delta);
    }

    this.cameraManager.update(delta);

    // Interact is driven by the unified input state (E key OR touch interact button)
    this.interactionManager.update(
      { x: this.player.x, y: this.player.y },
      input.interactJust,
    );

    this._updateDebugOverlay();
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
    if (this._flowState !== 'playing') return; // guard: fire only once
    this._flowState = 'levelcomplete';
    this.physics.world.pause();

    const hasNext    = !!this.worldManager.getNextEntry();
    const elapsed    = Math.floor((Date.now() - this._sessionStartTime) / 1000);

    this.levelCompleteScreen.show({
      hasNext,
      crystalsCollected: this.entityManager.collectedCrystals,
      totalCrystals:     this._totalCrystals,
      damageTaken:       this._sessionDamageTaken,
      timeSeconds:       elapsed,
    });

    console.log('[GameScene] Level complete!');
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

  // ── M17: Snake enemy helpers ──────────────────────────────────────────────

  /**
   * Reads the "Enemies" object layer from the Tiled map and spawns a
   * SnakeEnemy for every object named "Snake".  Each snake receives its own
   * overlap registrations immediately after spawning.
   */
  private _spawnSnakes(): void {
    const enemyLayer = this.level.map.getObjectLayer('Enemies');
    if (!enemyLayer) return; // layer is optional — no enemies in this level is fine

    for (const obj of enemyLayer.objects) {
      if (obj.name !== 'Snake') continue;

      const snake = new SnakeEnemy(this, obj, this.level.collisionLayer);
      // Tiled rectangle x,y is the top-left corner; obj.x / obj.y are the
      // world coordinates of the spawn point placed in the editor.
      snake.spawn(obj.x ?? 0, obj.y ?? 0);
      this.snakes.push(snake);
      this._wireSnakeOverlap(snake);
    }

    console.log(`[GameScene] M17 — spawned ${this.snakes.length} snake(s).`);
  }

  /**
   * Registers stomp and touch overlap callbacks for a single snake.
   *
   * Stomp  — player is falling AND player bottom is near or above snake top →
   *   defeat the snake, bounce the player upward.
   * Touch  — any other overlap → deal one point of damage with horizontal
   *   knockback pushing the player away from the snake.
   */
  private _wireSnakeOverlap(snake: SnakeEnemy): void {
    this.physics.add.overlap(
      this.player,
      snake.physicsRect,
      () => {
        if (snake.isDefeated) return;

        const playerBottom  = this.player.y + this.player.height  / 2;
        const snakeTop      = snake.physicsRect.y - snake.physicsRect.height / 2;
        const playerFalling = this.player.body.velocity.y > 50;

        if (playerFalling && playerBottom <= snakeTop + 14) {
          // ── Stomp ────────────────────────────────────────────────────────
          snake.defeat();
          this.player.body.setVelocityY(-360);   // bounce the player up
        } else {
          // ── Touch damage ─────────────────────────────────────────────────
          const knockDir = this.player.x <= snake.x ? -1 : 1;
          const hit = this.player.takeDamage(knockDir * 260, -300);
          if (hit) {
            this.shakeCamera(120, 0.006);
            this._hitStopTimer = 50;                    // 50 ms freeze
            this.screenFlash.flash();                   // red flash
            this.hudDisplay.setHp(this.player.hp, Player.MAX_HP);
            this._sessionDamageTaken++;
            if (this.player.hp <= 0) this._showGameOver();
          }
        }
      },
    );
  }

  // ── M18: Game-flow helpers ────────────────────────────────────────────────

  private _pauseGame(): void {
    this._flowState = 'paused';
    this.physics.world.pause();
    this.pauseMenu.show();
  }

  private _resumeGame(): void {
    this._flowState = 'playing';
    this.physics.world.resume();
    this.pauseMenu.hide();
    this.settingsMenu.hide();
  }

  private _showGameOver(): void {
    if (this._flowState !== 'playing') return;
    this._flowState = 'gameover';
    this.physics.world.pause();
    this.gameOverScreen.show();
  }

  /** Extracted debug-overlay call — runs from all update() exit paths. */
  private _updateDebugOverlay(): void {
    this.debugOverlay.update(
      this.game.loop.actualFps,
      this.player.x,
      this.player.y,
      this.player.debugInfo,
      this.entityDebugActive      ? this.entityManager.debugInfo      : undefined,
      this.entityDebugActive      ? this._buildEnemyDebugInfo()        : undefined,
      this.cameraDebugActive      ? this.cameraManager.debugInfo      : undefined,
      this.interactionDebugActive ? this.interactionManager.debugInfo : undefined,
      this.assetDebugActive       ? this._buildAssetDebugInfo()        : undefined,
      this.touchDebugActive       ? this.touchManager.debugInfo       : undefined,
      this.kaiDebugActive         ? this.player.kaiDebugInfo          : undefined,
      this.assetDebugActive       ? this._buildGameFlowDebugInfo()     : undefined,
    );
  }

  private _buildGameFlowDebugInfo() {
    return {
      flowState:         this._flowState,
      hp:                this.player.hp,
      maxHp:             Player.MAX_HP,
      crystalsCollected: this.entityManager.collectedCrystals,
      totalCrystals:     this._totalCrystals,
    };
  }

  /** Snapshot consumed by DebugOverlay when F4 enemy debug is active. */
  private _buildEnemyDebugInfo(): EnemyDebugInfo {
    const totalCount    = this.snakes.length;
    const defeatedCount = this.snakes.filter((s) => s.isDefeated).length;
    const alive         = this.snakes.filter((s) => !s.isDefeated);
    const activeCount   = alive.filter((s) =>  s.isEnabled).length;
    const sleepingCount = alive.filter((s) => !s.isEnabled).length;
    const patrolStates  = this.snakes.map((s) => s.getPatrolSummary());
    return { totalCount, activeCount, sleepingCount, defeatedCount, patrolStates };
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

      // ── M16 tileset pipeline fields ─────────────────────────────────────
      tilesetSource:     TilesetRegistry.info.source,
      tilesetWidth:      TilesetRegistry.info.width,
      tilesetHeight:     TilesetRegistry.info.height,
      tilesetTileCount:  TilesetRegistry.info.tileCount,
      animAtlasLoaded:   TilesetRegistry.info.animAtlasLoaded,
      decoAtlasLoaded:   TilesetRegistry.info.decoAtlasLoaded,
    };
  }
}
