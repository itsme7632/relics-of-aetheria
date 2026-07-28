import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DebugOverlay } from '../ui/DebugOverlay';
import { MapManager } from '../managers/MapManager';
import { EntityManager } from '../managers/EntityManager';
import { CameraManager } from '../managers/CameraManager';
import { Crystal } from '../entities/collectible/Crystal';
import { Level } from '../systems/Level';
import { STARTING_LEVEL } from '../data/levels';
import { buildParallaxLayers, ParallaxLayer } from '../systems/ParallaxLayer';

/**
 * GameScene
 *
 * Loads a TMX level via MapManager and wires up:
 *   - Player spawned at the map-defined PlayerSpawn object
 *   - Arcade Physics collision against the Collision tile layer only
 *   - CameraManager (dead zone, look-ahead, landing bounce, parallax, effects)
 *   - Parallax background layers (3 procedural layers)
 *   - Debug overlay (FPS / X / Y) + F3 collision / F4 entity / F5 camera debug
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private debugOverlay!: DebugOverlay;
  private mapManager!: MapManager;
  private entityManager!: EntityManager;
  private cameraManager!: CameraManager;
  private level!: Level;
  private parallaxLayers: ParallaxLayer[] = [];

  // ── Debug keys ────────────────────────────────────────────────────────────
  private debugKey!: Phaser.Input.Keyboard.Key;
  private entityDebugKey!: Phaser.Input.Keyboard.Key;
  private cameraDebugKey!: Phaser.Input.Keyboard.Key;

  private collisionDebugActive = false;
  private entityDebugActive    = false;
  private cameraDebugActive    = false;

  private levelKey = STARTING_LEVEL;

  constructor() {
    super({ key: 'GameScene' });
  }

  /** Receives the level key passed by BootScene (or any scene transition). */
  init(data: { levelKey?: string }): void {
    this.levelKey            = data.levelKey ?? STARTING_LEVEL;
    this.collisionDebugActive = false;
    this.entityDebugActive    = false;
    this.cameraDebugActive    = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // ── Load map ────────────────────────────────────────────────────────────
    this.mapManager = new MapManager(this);
    this.level = this.mapManager.loadLevel(this.levelKey);

    // ── Parallax background layers (behind all tile layers) ─────────────────
    // Must be created before the tilemap layers so they sit behind them.
    this.parallaxLayers = buildParallaxLayers(
      this,
      this.level.widthInPixels,
      this.level.heightInPixels,
    );

    // ── Entity system ────────────────────────────────────────────────────────
    this.entityManager = new EntityManager(this);
    this.entityManager.registerType('Crystal', (scene) => new Crystal(scene));
    this.entityManager.spawnFromMap(this.level.map);

    // ── Player ──────────────────────────────────────────────────────────────
    const { x, y } = this.level.objects.playerSpawn;
    this.player = new Player(this, x, y);

    // Collide only with the Collision layer
    this.physics.add.collider(this.player, this.level.collisionLayer);

    // Wire collectible overlaps now that both player and entities exist
    this.entityManager.initOverlaps(this.player);

    // ── Camera Manager (replaces bare cameras.main calls) ───────────────────
    // CameraManager: sets bounds, startFollow, dead zone, pixel-perfect,
    // and listens to the player 'land' event for landing bounce.
    this.cameraManager = new CameraManager(this, this.player, this.level);

    // Fade in on scene start
    this.cameraManager.effects.fadeIn(400);

    // ── HUD & input ─────────────────────────────────────────────────────────
    this.debugOverlay = new DebugOverlay(this);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const kb = this.input.keyboard!;
    this.debugKey       = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
    this.entityDebugKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F4);
    this.cameraDebugKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F5);

    // Clean up on scene shutdown (e.g. restart)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.mapManager.destroy();
      this.entityManager.destroyAll();
      this.cameraManager.destroy();
      for (const layer of this.parallaxLayers) layer.destroy();
      this.parallaxLayers = [];
    });
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);
    this.entityManager.update(delta);

    // CameraManager must update every frame for look-ahead and debug overlay
    this.cameraManager.update(delta);

    // ── Debug key toggles ────────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.toggleCollisionDebug();
    }

    if (Phaser.Input.Keyboard.JustDown(this.entityDebugKey)) {
      this.entityDebugActive = !this.entityDebugActive;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cameraDebugKey)) {
      this.toggleCameraDebug();
    }

    // ── HUD update ───────────────────────────────────────────────────────────
    this.debugOverlay.update(
      this.game.loop.actualFps,
      this.player.x,
      this.player.y,
      this.player.debugInfo,
      this.entityDebugActive   ? this.entityManager.debugInfo    : undefined,
      this.cameraDebugActive   ? this.cameraManager.debugInfo    : undefined,
    );
  }

  // ── Camera API (public for use by game systems) ───────────────────────────

  /** Smoothly zoom to a target zoom level. */
  setZoom(zoom: number, duration = 300): void {
    this.cameraManager.effects.zoomTo(zoom, duration);
  }

  /** Shake the camera (e.g. on landing impact or explosion). */
  shakeCamera(duration = 250, intensity = 0.012): void {
    this.cameraManager.effects.shake(intensity, duration);
  }

  // ── Debug ─────────────────────────────────────────────────────────────────

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
}
