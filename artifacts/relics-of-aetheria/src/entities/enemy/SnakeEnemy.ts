import Phaser from 'phaser';
import { Entity } from '../Entity';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Patrol behaviour states. */
export type PatrolState = 'moving' | 'idle';

/**
 * Snapshot consumed by DebugOverlay when F4 enemy debug is active.
 * Built by GameScene._buildEnemyDebugInfo().
 */
export interface EnemyDebugInfo {
  /** Total snakes placed in the level (includes defeated). */
  totalCount: number;
  /** Snakes that are alive and within the wake radius. */
  activeCount: number;
  /** Snakes alive but outside the wake radius — update() paused. */
  sleepingCount: number;
  /** Snakes that have been stomped and destroyed. */
  defeatedCount: number;
  /** One-line patrol summary per snake: "move→", "idle(200ms)", "sleeping", "defeated". */
  patrolStates: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SNAKE_W       = 28;   // physics body width (px)
const SNAKE_H       = 14;   // physics body height (px)
const IDLE_DURATION = 420;  // ms pause before reversing direction
const TILE          = 32;   // tile size used for platform-edge check

// ─── SnakeEnemy ───────────────────────────────────────────────────────────────

/**
 * SnakeEnemy
 *
 * M17: First production enemy — a patrolling ground snake.
 *
 * Behaviour:
 *   - Patrols left↔right between startX ± patrolDistance/2
 *   - Turns around at patrol limits, platform edges, and walls
 *   - Idles IDLE_DURATION ms before each direction reversal
 *   - Gravity-affected; collides with the tilemap Collision layer
 *   - Dormant (disabled) when the player is outside the wake radius —
 *     EntityManager will not call update(); physics still applies gravity
 *
 * Tiled object custom properties:
 *   patrolDistance  number   Total patrol width px    default 160
 *   facing         "left"|"right"  Initial facing      default "right"
 *   speed           number   Move speed px/s            default 64
 *
 * Player interaction (overlaps wired in GameScene):
 *   Stomp  — player falling, body bottom ≤ snake top+margin → defeat()
 *   Touch  — all other overlaps → player.takeDamage()
 */
export class SnakeEnemy extends Entity {
  // ── Scene objects ──────────────────────────────────────────────────────────
  private _rect!: Phaser.GameObjects.Rectangle;
  private _gfx!:  Phaser.GameObjects.Graphics;

  // ── Tuning (read from Tiled properties) ────────────────────────────────────
  private readonly _speed:          number;
  private readonly _patrolDistance: number;
  private          _direction:      1 | -1;

  // ── Patrol bookkeeping ─────────────────────────────────────────────────────
  private _leftLimit:    number = 0;
  private _rightLimit:   number = 0;
  private _patrolState:  PatrolState = 'moving';
  private _idleTimer:    number = 0;

  // ── Status flags ───────────────────────────────────────────────────────────
  private _defeated:   boolean = false;
  private _lastDir:    1 | -1  = 1;   // tracks last-drawn direction for flip

  // ── Dependency injected ────────────────────────────────────────────────────
  private readonly _collisionLayer: Phaser.Tilemaps.TilemapLayer;

  constructor(
    scene: Phaser.Scene,
    data: Phaser.Types.Tilemaps.TiledObject,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
  ) {
    super(scene);
    this._collisionLayer = collisionLayer;

    // ── Parse Tiled custom properties (with safe defaults) ─────────────────
    const props    = data.properties as Array<{ name: string; value: unknown }> | undefined;
    const getProp  = (name: string): unknown => props?.find((p) => p.name === name)?.value;

    this._speed          = Number(getProp('speed')          ?? 64);
    this._patrolDistance = Number(getProp('patrolDistance') ?? 160);
    const facingStr      = String(getProp('facing')         ?? 'right');
    this._direction      = facingStr === 'left' ? -1 : 1;
    this._lastDir        = this._direction;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  spawn(x: number, y: number): void {
    this._leftLimit  = x - this._patrolDistance / 2;
    this._rightLimit = x + this._patrolDistance / 2;

    // ── Physics rectangle (invisible; Graphics draws the visual) ──────────
    this._rect = this.scene.add.rectangle(x, y, SNAKE_W, SNAKE_H);
    this._rect.setVisible(false);
    this.scene.physics.world.enable(this._rect);

    const body = this._rect.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setMaxVelocityX(this._speed * 1.5);

    // Tile collision — snake stays on platforms
    this.scene.physics.add.collider(this._rect, this._collisionLayer);

    // ── Graphics (drawn facing right; setScale flips for left direction) ──
    this._gfx = this.scene.add.graphics();
    this._gfx.setDepth(4);
    this._drawSnake();
    this._gfx.setScale(this._direction, 1);
    this._gfx.setPosition(x, y);

    this._active = true;
  }

  update(delta: number): void {
    if (!this._active || this._defeated) return;

    const body = this._rect.body as Phaser.Physics.Arcade.Body;

    if (this._patrolState === 'idle') {
      // ── Idle: stand still, count down, then resume ─────────────────────
      body.setVelocityX(0);
      this._idleTimer -= delta;
      if (this._idleTimer <= 0) {
        this._patrolState = 'moving';
      }
    } else {
      // ── Patrol limit checks ────────────────────────────────────────────
      if (this._direction === 1 && this._rect.x >= this._rightLimit) {
        this._startIdle(-1);
      } else if (this._direction === -1 && this._rect.x <= this._leftLimit) {
        this._startIdle(1);
      }
      // ── Platform edge + wall checks (only when grounded) ──────────────
      else if (body.blocked.down) {
        // Cast a point one tile below the leading foot
        const leadX  = this._rect.x + this._direction * (SNAKE_W / 2 + 2);
        const floorY = this._rect.y + SNAKE_H / 2 + TILE * 0.55;
        const tile   = this._collisionLayer.getTileAtWorldXY(leadX, floorY);

        if (!tile) {
          // No ground ahead — reverse to avoid falling off the edge
          this._startIdle((-this._direction) as 1 | -1);
        } else if (
          (this._direction ===  1 && body.blocked.right) ||
          (this._direction === -1 && body.blocked.left)
        ) {
          // Wall in the way — reverse
          this._startIdle((-this._direction) as 1 | -1);
        }
      }

      if (this._patrolState === 'moving') {
        body.setVelocityX(this._direction * this._speed);
      }
    }

    // ── Sync graphics to physics body centre ──────────────────────────────
    this._gfx.setPosition(this._rect.x, this._rect.y);

    // ── Flip graphic when direction changes (no redraw needed) ────────────
    if (this._direction !== this._lastDir) {
      this._gfx.setScale(this._direction, 1);
      this._lastDir = this._direction;
    }
  }

  /**
   * Defeat the snake (called on stomp by GameScene).
   * Squish-animates, then destroys all owned scene objects.
   */
  defeat(): void {
    if (this._defeated) return;
    this._defeated = true;
    this._active   = false;

    const body = this._rect.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);
    body.setAllowGravity(false);

    // Squish + fade out
    this.scene.tweens.add({
      targets:  this._gfx,
      scaleX:   Math.abs(this._lastDir) * 1.9,
      scaleY:   0.12,
      alpha:    0,
      duration: 280,
      ease:     'Quad.easeOut',
      onComplete: () => { this.destroy(); },
    });

    // ── M18: Particle burst on defeat ─────────────────────────────────────
    const px = this._rect.x;
    const py = this._rect.y;
    for (let i = 0; i < 6; i++) {
      const p = this.scene.add.graphics().setDepth(5);
      p.fillStyle(i % 2 === 0 ? 0x5aab2a : 0x99ee44, 1.0);
      p.fillCircle(0, 0, 2.5 + Math.random() * 2);
      p.setPosition(px, py);
      const angle = (i / 6) * Math.PI * 2;
      const dist  = 30 + Math.random() * 30;
      this.scene.tweens.add({
        targets:  p,
        x:        px + Math.cos(angle) * dist,
        y:        py + Math.sin(angle) * dist - 15,
        alpha:    0,
        scaleX:   0.2,
        scaleY:   0.2,
        duration: 320 + Math.random() * 140,
        ease:     'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  destroy(): void {
    this._active = false;
    this._rect?.destroy();
    this._gfx?.destroy();
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  override get x(): number { return this._rect?.x ?? 0; }
  override get y(): number { return this._rect?.y ?? 0; }

  get isDefeated(): boolean { return this._defeated; }

  /**
   * Expose the Arcade-physics-enabled rectangle for external collider/overlap
   * registration in GameScene.
   */
  get physicsRect(): Phaser.GameObjects.Rectangle { return this._rect; }

  /** One-line status string for the F4 enemy debug panel. */
  getPatrolSummary(): string {
    if (this._defeated)             return 'defeated';
    if (!this._enabled)             return 'sleeping';
    const arrow = this._direction === 1 ? '→' : '←';
    if (this._patrolState === 'idle') {
      return `idle(${Math.ceil(this._idleTimer)}ms)`;
    }
    return `move${arrow}`;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _startIdle(nextDir: 1 | -1): void {
    this._patrolState = 'idle';
    this._idleTimer   = IDLE_DURATION;
    this._direction   = nextDir;
  }

  /**
   * Draw the snake visual centred at (0,0), oriented facing RIGHT.
   * Direction is applied via setScale(dir, 1) — no redraw on turn.
   *
   * Visual (facing right):
   *   • Dark-green rounded body (28×14)
   *   • Lighter head on right end
   *   • Three scale-stripe details on the body
   *   • White sclera + black pupil eye
   *   • Red forked tongue extending from the nose
   *   • Dark outline
   */
  private _drawSnake(): void {
    const g  = this._gfx;
    const hw = SNAKE_W / 2;
    const hh = SNAKE_H / 2;

    // ── Body ────────────────────────────────────────────────────────────
    g.fillStyle(0x3a8a1a, 1.0);
    g.fillRoundedRect(-hw, -hh, SNAKE_W, SNAKE_H, 5);

    // ── Scale stripes ─────────────────────────────────────────────────
    g.fillStyle(0x275510, 0.7);
    for (let i = 0; i < 3; i++) {
      g.fillRoundedRect(-hw + 3 + i * 7, -hh + 3, 4, SNAKE_H - 6, 2);
    }

    // ── Head (right segment) ──────────────────────────────────────────
    g.fillStyle(0x4caa22, 1.0);
    g.fillRoundedRect(hw - 11, -hh, 11, SNAKE_H, 4);

    // ── Eye: sclera ───────────────────────────────────────────────────
    g.fillStyle(0xffffff, 1.0);
    g.fillCircle(hw - 4, -hh + 4, 3.0);

    // ── Eye: pupil ────────────────────────────────────────────────────
    g.fillStyle(0x111111, 1.0);
    g.fillCircle(hw - 3, -hh + 4, 1.8);

    // ── Forked tongue ─────────────────────────────────────────────────
    g.lineStyle(1.5, 0xff3333, 1.0);
    g.beginPath();
    g.moveTo(hw, 1);
    g.lineTo(hw + 5, -3);
    g.moveTo(hw, 1);
    g.lineTo(hw + 5,  4);
    g.strokePath();

    // ── Body outline ──────────────────────────────────────────────────
    g.lineStyle(1, 0x1a4a0a, 0.85);
    g.strokeRoundedRect(-hw, -hh, SNAKE_W, SNAKE_H, 5);
  }
}
