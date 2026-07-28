import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DebugOverlay } from '../ui/DebugOverlay';
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../core/GameConfig';

/**
 * GameScene
 *
 * The main gameplay scene. Currently displays:
 *   - A dark background with a generated grid
 *   - A static floor platform
 *   - A physics-enabled rectangle representing the player
 *   - A debug overlay showing FPS and player coordinates
 *
 * Camera follows the player with smooth lerp and is bounded to the world.
 * Public methods `setZoom` and `shakeCamera` are stubbed for future use.
 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private floor!: Phaser.Physics.Arcade.StaticGroup;
  private debugOverlay!: DebugOverlay;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0d1a');

    this.createGrid();
    this.createFloor();

    this.player = new Player(this, 200, WORLD_HEIGHT - 120);

    this.physics.add.collider(this.player, this.floor);

    this.setupCamera();

    this.debugOverlay = new DebugOverlay(this);
  }

  update(): void {
    this.player.update();
    this.debugOverlay.update(
      this.game.loop.actualFps,
      this.player.x,
      this.player.y
    );
  }

  // ─── Camera ──────────────────────────────────────────────────────────────

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // Smooth follow via lerp (0 = instant, 1 = stiff)
    cam.startFollow(this.player, true, 0.08, 0.08);
  }

  /** Future milestone: smoothly zoom the camera. */
  setZoom(zoom: number, duration = 300): void {
    this.cameras.main.zoomTo(zoom, duration);
  }

  /** Future milestone: shake the camera on impact or explosion. */
  shakeCamera(duration = 250, intensity = 0.012): void {
    this.cameras.main.shake(duration, intensity);
  }

  // ─── World geometry ───────────────────────────────────────────────────────

  private createGrid(): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x1e2050, 0.7);

    for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
      g.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
      g.lineBetween(0, y, WORLD_WIDTH, y);
    }
  }

  private createFloor(): void {
    this.floor = this.physics.add.staticGroup();

    const floorHeight = 40;
    const floorY = WORLD_HEIGHT - floorHeight / 2;

    const floorRect = this.add.rectangle(
      WORLD_WIDTH / 2,
      floorY,
      WORLD_WIDTH,
      floorHeight,
      0x2a2a50
    );

    this.floor.add(floorRect);

    // Decorative top edge
    const edgeGraphics = this.add.graphics();
    edgeGraphics.lineStyle(2, 0x5a5aaa, 1);
    edgeGraphics.lineBetween(0, WORLD_HEIGHT - floorHeight, WORLD_WIDTH, WORLD_HEIGHT - floorHeight);
  }
}
