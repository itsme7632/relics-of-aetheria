import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DebugOverlay } from '../ui/DebugOverlay';
import { EntityManager } from '../managers/EntityManager';
import { CameraManager } from '../managers/CameraManager';
import { Crystal } from '../entities/collectible/Crystal';
import { Level } from '../systems/Level';
import { WorldManager } from '../world/WorldManager';
import { buildParallaxLayers, ParallaxLayer } from '../systems/ParallaxLayer';

/**
 * GameScene
 *
 * Loads a level through WorldManager (manifest → validation → Level) and wires up:
 *   - Player spawned at the map-defined PlayerSpawn object
 *   - Arcade Physics collision against the Collision tile layer only
 *   - CameraManager (dead zone, look-ahead, landing bounce, parallax, effects)
 *   - Parallax background layers (3 procedural layers)
 *   - Debug overlay (FPS / X / Y) + F3 collision / F4 entity / F5 camera debug
 *
 * To change the starting level: edit STARTING_LEVEL_ID in LevelManifest.ts.
 * To transition levels at runtime: use WorldManager.getNextEntry() and restart
 * the scene with the new levelId.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private debugOverlay!: DebugOverlay;
  private worldManager!: WorldManager;
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

  private levelId = WorldManager.startingLevelId;

  constructor() {
    super({ key: 'GameScene' });
  }

  /** Receives the level id passed by BootScene (or any scene transition). */
  init(data: { levelId?: string }): void {
    this.levelId              = data.levelId ?? WorldManager.startingLevelId;
    this.collisionDebugActive = false;
    this.entityDebugActive    = false;
    this.cameraDebugActive    = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // ── World Manager (manifest → validation → Level) ────────────────────────
    this.worldManager = new WorldManager(this);
    this.level = this.worldManager.loadLevel(this.levelId, {
      knownEntityTypes: ['Crystal'],
    });

    // ── Parallax background layers (behind all tile layers) ─────────────────
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

    // ── Camera Manager ───────────────────────────────────────────────────────
    this.cameraManager = new CameraManager(this, this.player, this.level);
    this.cameraManager.effects.fadeIn(400);

    // ── HUD & input ─────────────────────────────────────────────────────────
    this.debugOverlay = new DebugOverlay(this);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const kb = this.input.keyboard!;
    this.debugKey       = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
    this.entityDebugKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F4);
    this.cameraDebugKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F5);

    // Clean up on scene shutdown (e.g. restart or level transition)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.worldManager.destroy();
      this.entityManager.destroyAll();
      this.cameraManager.destroy();
      for (const layer of this.parallaxLayers) layer.destroy();
      this.parallaxLayers = [];
    });
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);
    this.entityManager.update(delta);
    this.cameraManager.update(delta);

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

    // ── HUD update ────────────────────────────────────────────────────────
    this.debugOverlay.update(
      this.game.loop.actualFps,
      this.player.x,
      this.player.y,
      this.player.debugInfo,
      this.entityDebugActive ? this.entityManager.debugInfo  : undefined,
      this.cameraDebugActive ? this.cameraManager.debugInfo  : undefined,
    );
  }

  // ── Camera API (public for use by game systems) ──────────────────────────

  /** Smoothly zoom to a target zoom level. */
  setZoom(zoom: number, duration = 300): void {
    this.cameraManager.effects.zoomTo(zoom, duration);
  }

  /** Shake the camera (e.g. on landing impact or explosion). */
  shakeCamera(duration = 250, intensity = 0.012): void {
    this.cameraManager.effects.shake(intensity, duration);
  }

  // ── Level transition (future) ─────────────────────────────────────────────

  /**
   * Transition to the next level defined in the manifest.
   * Fades out, then restarts the scene with the new levelId.
   * No-op if the current level has no successor.
   */
  transitionToNextLevel(): void {
    const next = this.worldManager.getNextEntry();
    if (!next) return;

    this.cameraManager.effects.fadeOut(500, 0x000000, () => {
      this.scene.restart({ levelId: next.id });
    });
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
