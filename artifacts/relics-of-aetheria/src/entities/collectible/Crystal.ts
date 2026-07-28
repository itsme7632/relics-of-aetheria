import Phaser from 'phaser';
import { Collectible } from './Collectible';
import { GameEvents } from '../../events/GameEvents';

/**
 * Crystal
 *
 * A collectible pickup that:
 *   - Renders as a gem/diamond shape using Phaser.GameObjects.Graphics
 *   - Hovers up and down via a sine wave
 *   - Slowly rotates
 *   - Uses a physics Zone as a hitbox for player overlap detection
 *   - Plays a scale+fade collect animation, then emits CRYSTAL_COLLECTED
 *
 * Adding a new Crystal to the level requires only placing a "Crystal" named
 * object in the Tiled "Objects" layer — no code changes needed.
 *
 * Hooks available (listen on scene.events or the crystal instance):
 *   scene.events.on(GameEvents.CRYSTAL_COLLECTED, (crystal: Crystal) => { ... })
 *   crystal.on(GameEvents.CRYSTAL_COLLECTED, (crystal: Crystal) => { ... })
 */
export class Crystal extends Collectible {
  /** Graphics object that renders the gem shape. */
  private gem!: Phaser.GameObjects.Graphics;

  /** Invisible physics zone used for overlap detection. */
  private zone!: Phaser.GameObjects.Zone;

  private baseX = 0;
  private baseY = 0;

  /** Running time accumulator for hover sine wave (ms, offset randomly per crystal). */
  private hoverTime = 0;

  /** Current rotation angle in degrees. */
  private gemAngle = 0;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  spawn(x: number, y: number): void {
    this.baseX = x;
    this.baseY = y;

    // Stagger hover phase so crystals placed near each other don't move in sync
    this.hoverTime = Math.random() * Math.PI * 2 * 1000;

    // ── Visual ────────────────────────────────────────────────────────────
    this.gem = this.scene.add.graphics();
    this.gem.setDepth(5);
    this.gem.setPosition(x, y);
    this.drawGem();

    // ── Physics hitbox ────────────────────────────────────────────────────
    // Zone has no visual — it exists solely for physics overlap detection.
    this.zone = this.scene.add.zone(x, y, 28, 28);
    this.scene.physics.world.enable(this.zone);
    const body = this.zone.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    this._active = true;
  }

  update(delta: number): void {
    if (!this._active || !this._enabled) return;

    this.hoverTime += delta;
    this.gemAngle += 28 * (delta / 1000); // ~28 °/s

    const hoverY = this.baseY + Math.sin(this.hoverTime / 900) * 6;

    this.gem.setPosition(this.baseX, hoverY);
    this.gem.setAngle(this.gemAngle);

    // Keep the physics body in sync with the animated visual position
    (this.zone.body as Phaser.Physics.Arcade.Body).reset(this.baseX, hoverY);
  }

  collect(): void {
    if (this._collected) return;
    this._collected = true;
    this._active = false;

    // Remove physics body immediately so no further overlaps fire
    this.zone.destroy();

    // Notify listeners (EntityManager + future sound/save hooks)
    this.emit(GameEvents.CRYSTAL_COLLECTED, this);
    this.scene.events.emit(GameEvents.CRYSTAL_COLLECTED, this);

    // ── Collect animation: scale up + float up + fade out ─────────────────
    this.scene.tweens.add({
      targets: this.gem,
      alpha: 0,
      scaleX: 2.8,
      scaleY: 2.8,
      y: this.gem.y - 24,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.gem.destroy();
      },
    });
  }

  destroy(): void {
    this._active = false;
    this.gem?.destroy();
    // Zone may already be destroyed (post-collect); guard against double-destroy
    if (!this._collected) {
      this.zone?.destroy();
    }
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  override get x(): number {
    return this.baseX;
  }

  override get y(): number {
    return this.baseY;
  }

  /**
   * Expose the physics zone so EntityManager can register a player overlap.
   * Only valid between spawn() and collect().
   */
  getZone(): Phaser.GameObjects.Zone {
    return this.zone;
  }

  // ── Private drawing ────────────────────────────────────────────────────────

  /**
   * Draws a faceted gem shape in local space centred at (0, 0).
   * Re-drawing every frame is wasteful, so this is called once in spawn().
   * The Graphics object is then rotated/repositioned each frame without
   * clearing or redrawing.
   */
  private drawGem(): void {
    const g = this.gem;
    g.clear();

    // Main body — cyan with slight transparency
    g.fillStyle(0x33ccff, 0.92);
    g.fillTriangle(0, -14, -9, 0, 9, 0);   // upper half
    g.fillTriangle(-9, 0, 9, 0, 0, 11);    // lower half

    // Inner highlight — lighter, smaller triangle at the top facet
    g.fillStyle(0xaaeeff, 0.65);
    g.fillTriangle(0, -14, -4, -5, 4, -5);

    // Outline
    g.lineStyle(1.5, 0xffffff, 0.85);
    g.strokeTriangle(0, -14, -9, 0, 9, 0);
    g.strokeTriangle(-9, 0, 9, 0, 0, 11);

    // Centre sparkle dot
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(0, -3, 1.5);
  }
}
