import Phaser from 'phaser';
import { PlayerConfig } from './PlayerConfig';
import { PlayerState, PlayerStateMachine } from './PlayerStateMachine';
import type { TouchInputState } from '../input/TouchInputState';

/** Shape returned by Player.debugInfo — consumed by DebugOverlay. */
export interface PlayerDebugInfo {
  state: PlayerState;
  grounded: boolean;
  velocityX: number;
  velocityY: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  /** M17 — true while post-damage invulnerability window is active. */
  isInvulnerable: boolean;
}

/**
 * Player — Milestone 3: Professional Player Controller
 *
 * Features implemented:
 *  - PlayerStateMachine (Idle / Run / Jump / Fall / Land)
 *  - Variable jump height (short press = small jump, hold = full jump)
 *  - Coyote time (jump window after leaving a ledge)
 *  - Jump buffer (early press stored and consumed on landing)
 *  - Smooth acceleration / deceleration (ground & air separately)
 *  - Air control (reduced influence while airborne)
 *  - Better gravity (separate multipliers for rising vs falling)
 *  - Landing event — emits 'land' (fallingVelocity: number)
 *  - All tunable values live in PlayerConfig; nothing is hard-coded here.
 *
 * M9 (Mobile Controls):
 *  - Keyboard and touch input is unified by TouchManager into TouchInputState.
 *  - Player.update() now accepts a TouchInputState instead of reading
 *    keyboard events directly.  All gameplay logic is unchanged.
 *
 * The `declare body` override tells TypeScript the body is an Arcade physics
 * body (not a StaticBody) without emitting a redundant runtime assignment.
 */
export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  // ── State ──────────────────────────────────────────────────────────────────
  private readonly stateMachine = new PlayerStateMachine();

  // ── Jump internals ─────────────────────────────────────────────────────────
  /** True from the frame a jump fires until the jump key is released. */
  private jumpHeld = false;
  /** Countdown (ms) during which a jump is still valid after leaving a ledge. */
  private coyoteTimer = 0;
  /** Countdown (ms) during which a recently pressed jump key is remembered. */
  private jumpBufferTimer = 0;
  /** Track previous-frame grounded so we can detect the landing transition. */
  private wasOnGround = true;

  // ── M17: Damage & invulnerability ─────────────────────────────────────────
  /** Starting hit points. */
  static readonly MAX_HP = 3;
  /** How long (ms) the player is invulnerable after taking damage. */
  static readonly INVUL_DURATION = 1500;

  private _hp         = Player.MAX_HP;
  /** Counts down from INVUL_DURATION to 0 after taking damage. */
  protected _invulTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene, x, y,
      PlayerConfig.width,
      PlayerConfig.height,
      PlayerConfig.color,
    );

    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocityX(PlayerConfig.maxSpeedX);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Current state machine state — readable by GameScene / DebugOverlay. */
  get currentState(): PlayerState {
    return this.stateMachine.state;
  }

  /** Current hit points. */
  get hp(): number { return this._hp; }

  /** True while the post-damage invulnerability window is active. */
  get isInvulnerable(): boolean { return this._invulTimer > 0; }

  /**
   * Apply one hit of damage to the player.
   * Ignored when the invulnerability window is active (prevents damage-spam).
   *
   * @param knockbackVX  Horizontal knockback velocity (px/s, signed).
   * @param knockbackVY  Vertical knockback velocity (px/s, negative = up).
   * @returns  true if damage was applied; false if blocked by invulnerability.
   */
  takeDamage(knockbackVX: number, knockbackVY: number): boolean {
    if (this._invulTimer > 0) return false;

    this._hp = Math.max(0, this._hp - 1);
    this.body.setVelocityX(knockbackVX);
    this.body.setVelocityY(knockbackVY);
    this._invulTimer = Player.INVUL_DURATION;
    this.emit('hurt');
    return true;
  }

  /** Snapshot of internal state for the debug overlay. */
  get debugInfo(): PlayerDebugInfo {
    return {
      state:           this.stateMachine.state,
      grounded:        this.body.blocked.down,
      velocityX:       this.body.velocity.x,
      velocityY:       this.body.velocity.y,
      coyoteTimer:     this.coyoteTimer,
      jumpBufferTimer: this.jumpBufferTimer,
      isInvulnerable:  this.isInvulnerable,
    };
  }

  /**
   * Main update — called every frame from GameScene.update().
   * @param delta  Frame time in milliseconds (from Phaser's update callback).
   * @param input  Unified input state produced by TouchManager this frame.
   *               Merges keyboard and touch — Player never reads either directly.
   */
  update(delta: number, input: TouchInputState): void {
    // ── M17: Invulnerability countdown ──────────────────────────────────────
    if (this._invulTimer > 0) {
      this._invulTimer = Math.max(0, this._invulTimer - delta);
    }

    const body         = this.body;
    const onGround     = body.blocked.down;
    const worldGravity = (this.scene as Phaser.Scene).physics.world.gravity.y;

    // ── Read unified input (keyboard + touch, merged by TouchManager) ───────
    const goLeft   = input.moveX < -0.2;
    const goRight  = input.moveX >  0.2;
    const jumpDown = input.jumpDown;
    const jumpJust = input.jumpJust;

    // ── Coyote time ─────────────────────────────────────────────────────────
    if (onGround) {
      this.coyoteTimer = PlayerConfig.coyoteTime;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    }

    // ── Jump buffer ─────────────────────────────────────────────────────────
    if (jumpJust) {
      this.jumpBufferTimer = PlayerConfig.jumpBufferTime;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);
    }

    // ── Jump execution ──────────────────────────────────────────────────────
    const canJump   = this.coyoteTimer > 0;
    const wantsJump = this.jumpBufferTimer > 0;

    if (wantsJump && canJump) {
      body.setVelocityY(PlayerConfig.jumpVelocity);
      this.jumpHeld        = true;
      this.jumpBufferTimer = 0;
      this.coyoteTimer     = 0;
    }

    // ── Variable jump height ────────────────────────────────────────────────
    if (this.jumpHeld && !jumpDown) {
      if (body.velocity.y < PlayerConfig.minJumpVelocity) {
        body.setVelocityY(PlayerConfig.minJumpVelocity);
      }
      this.jumpHeld = false;
    }
    if (onGround) {
      this.jumpHeld = false;
    }

    // ── Gravity shaping ─────────────────────────────────────────────────────
    const rising = body.velocity.y < 0;

    if (rising && this.jumpHeld) {
      body.setGravityY((PlayerConfig.jumpHoldGravityMult - 1) * worldGravity);
    } else if (!onGround && !rising) {
      body.setGravityY((PlayerConfig.fallGravityMult - 1) * worldGravity);
    } else {
      body.setGravityY(0);
    }

    // ── Horizontal movement (manual acceleration / deceleration) ────────────
    const accelScale = onGround ? 1 : PlayerConfig.airControl;
    const accel = PlayerConfig.acceleration * accelScale;
    const decel = PlayerConfig.deceleration * accelScale;
    const dt    = delta / 1000;

    let vx = body.velocity.x;
    if (goLeft || goRight) {
      const targetVX = goRight ? PlayerConfig.maxSpeedX : -PlayerConfig.maxSpeedX;
      const diff     = targetVX - vx;
      const step     = accel * dt;
      vx = Math.abs(diff) <= step ? targetVX : vx + Math.sign(diff) * step;
    } else {
      const step = decel * dt;
      vx = Math.abs(vx) <= step ? 0 : vx - Math.sign(vx) * step;
    }
    vx = Phaser.Math.Clamp(vx, -PlayerConfig.maxSpeedX, PlayerConfig.maxSpeedX);
    body.setVelocityX(vx);

    // ── State machine ───────────────────────────────────────────────────────
    const justLanded     = !this.wasOnGround && onGround;
    const justLeftGround = this.wasOnGround && !onGround;
    this.wasOnGround     = onGround;

    this.updateState(onGround, justLanded, justLeftGround, body.velocity.y);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private updateState(
    onGround: boolean,
    justLanded: boolean,
    _justLeftGround: boolean,
    vy: number,
  ): void {
    const sm     = this.stateMachine;
    const absVX  = Math.abs(this.body.velocity.x);
    const moving = absVX > PlayerConfig.runThreshold;

    if (justLanded) {
      if (sm.transition(PlayerState.Land)) {
        const impactVelocity = vy;
        if (impactVelocity >= PlayerConfig.landVelocityThreshold) {
          this.emit('land', impactVelocity);
        }
      }
    } else if (sm.is(PlayerState.Land)) {
      sm.transition(moving ? PlayerState.Run : PlayerState.Idle);
    } else if (!onGround) {
      sm.transition(vy < 0 ? PlayerState.Jump : PlayerState.Fall);
    } else {
      sm.transition(moving ? PlayerState.Run : PlayerState.Idle);
    }
  }
}
