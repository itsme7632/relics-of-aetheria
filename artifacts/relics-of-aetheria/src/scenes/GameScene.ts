import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DebugOverlay } from '../ui/DebugOverlay';
import { MapManager } from '../managers/MapManager';
import { Level } from '../systems/Level';
import { STARTING_LEVEL } from '../data/levels';

/**
 * GameScene
 *
 * Loads a TMX level via MapManager and wires up:
 *   - Player spawned at the map-defined PlayerSpawn object
 *   - Arcade Physics collision against the Collision tile layer only
 *   - Camera bounds derived from the map dimensions
 *   - Debug overlay (FPS / X / Y) + F3 toggle for collision tile overlay
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private debugOverlay!: DebugOverlay;
  private mapManager!: MapManager;
  private level!: Level;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private collisionDebugActive = false;
  private levelKey = STARTING_LEVEL;

  constructor() {
    super({ key: 'GameScene' });
  }

  /** Receives the level key passed by BootScene (or any scene transition). */
  init(data: { levelKey?: string }): void {
    this.levelKey = data.levelKey ?? STARTING_LEVEL;
    this.collisionDebugActive = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // ── Load map ────────────────────────────────────────────────────────────
    this.mapManager = new MapManager(this);
    this.level = this.mapManager.loadLevel(this.levelKey);

    // ── Player ──────────────────────────────────────────────────────────────
    const { x, y } = this.level.objects.playerSpawn;
    this.player = new Player(this, x, y);

    // Collide only with the Collision layer
    this.physics.add.collider(this.player, this.level.collisionLayer);

    // ── Camera ──────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(
      0, 0,
      this.level.widthInPixels,
      this.level.heightInPixels,
    );
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // ── HUD & input ─────────────────────────────────────────────────────────
    this.debugOverlay = new DebugOverlay(this);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.debugKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F3);

    // Clean up MapManager when the scene shuts down (e.g. on restart)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.mapManager.destroy());
  }

  update(): void {
    this.player.update();

    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.toggleCollisionDebug();
    }

    this.debugOverlay.update(
      this.game.loop.actualFps,
      this.player.x,
      this.player.y,
    );
  }

  // ─── Camera helpers (future milestones) ──────────────────────────────────

  /** Smoothly zoom to a target zoom level. */
  setZoom(zoom: number, duration = 300): void {
    this.cameras.main.zoomTo(zoom, duration);
  }

  /** Shake the camera (e.g. on landing impact or explosion). */
  shakeCamera(duration = 250, intensity = 0.012): void {
    this.cameras.main.shake(duration, intensity);
  }

  // ─── Debug ───────────────────────────────────────────────────────────────

  private toggleCollisionDebug(): void {
    this.collisionDebugActive = !this.collisionDebugActive;
    if (this.collisionDebugActive) {
      this.level.showCollisionDebug(this);
    } else {
      this.level.hideCollisionDebug();
    }
  }
}
