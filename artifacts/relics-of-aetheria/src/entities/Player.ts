import Phaser from 'phaser';
import { PlayerConfig } from './PlayerConfig';
import { PlayerState, PlayerStateMachine } from './PlayerStateMachine';

/** Shape returned by Player.debugInfo — consumed by DebugOverlay. */
export interface PlayerDebugInfo {
  state: PlayerState;
  grounded: boolean;
  velocityX: number;
  velocityY: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
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
 * The `declare body` override tells TypeScript the body is an Arcade physics
 * body (not a StaticBody) without emitting a redundant runtime assignment.
 */
export class Player extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;

  // ── Input ──────────────────────────────────────────────────────────────────
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: {
    left:  Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up:    Phaser.Input.Keyboard.Key;
  };

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

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Current state machine state — readable by GameScene / DebugOverlay. */
  get currentState(): PlayerState {
    return this.stateMachine.state;
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
    };
  }

  /**
   * Main update — called every frame from GameScene.update().
   * @param delta  Frame time in milliseconds (from Phaser's update callback).
   */
  update(delta: number): void {
    const body      = this.body;
    const onGround  = body.blocked.down;
    const worldGravity = (this.scene as Phaser.Scene).physics.world.gravity.y;

    // ── Read input ──────────────────────────────────────────────────────────
    const goLeft   = this.cursors.left.isDown  || this.wasd.left.isDown;
    const goRight  = this.cursors.right.isDown || this.wasd.right.isDown;
    const jumpDown = this.cursors.up.isDown    || this.cursors.space.isDown || this.wasd.up.isDown;
    const jumpJust =
      Phaser.Input.Keyboard.JustDown(this.cursors.up)    ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up);

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
    const canJump  = this.coyoteTimer > 0;  // includes the on-ground case via timer reset
    const wantsJump = this.jumpBufferTimer > 0;

    if (wantsJump && canJump) {
      body.setVelocityY(PlayerConfig.jumpVelocity);
      this.jumpHeld        = true;
      this.jumpBufferTimer = 0;
      this.coyoteTimer     = 0;   // consume coyote window so it can't fire twice
    }

    // ── Variable jump height ────────────────────────────────────────────────
    // On release: if still rising faster than the minimum, cut velocity.
    if (this.jumpHeld && !jumpDown) {
      if (body.velocity.y < PlayerConfig.minJumpVelocity) {
        body.setVelocityY(PlayerConfig.minJumpVelocity);
      }
      this.jumpHeld = false;
    }
    // Also clear jumpHeld once the player touches the ground (edge case: teleport-reset)
    if (onGround) {
      this.jumpHeld = false;
    }

    // ── Gravity shaping ─────────────────────────────────────────────────────
    // body.setGravityY adds to the world gravity, so the formula is:
    //   effectiveGravity = worldGravity + bodyGravityY
    // To achieve a target multiplier: bodyGravityY = (mult - 1) * worldGravity
    const rising = body.velocity.y < 0;

    if (rising && this.jumpHeld) {
      // Float upward — apply reduced gravity while holding jump
      body.setGravityY((PlayerConfig.jumpHoldGravityMult - 1) * worldGravity);
    } else if (!onGround && !rising) {
      // Snappy fall arc
      body.setGravityY((PlayerConfig.fallGravityMult - 1) * worldGravity);
    } else {
      // Default world gravity
      body.setGravityY(0);
    }

    // ── Horizontal movement (manual acceleration / deceleration) ────────────
    const accelScale = onGround ? 1 : PlayerConfig.airControl;
    const accel = PlayerConfig.acceleration * accelScale;
    const decel = PlayerConfig.deceleration * accelScale;
    const dt    = delta / 1000; // seconds

    let vx = body.velocity.x;
    if (goLeft || goRight) {
      const targetVX = goRight ? PlayerConfig.maxSpeedX : -PlayerConfig.maxSpeedX;
      const diff     = targetVX - vx;
      const step     = accel * dt;
      vx = Math.abs(diff) <= step ? targetVX : vx + Math.sign(diff) * step;
    } else {
      // No input — decelerate toward zero
      const step = decel * dt;
      vx = Math.abs(vx) <= step ? 0 : vx - Math.sign(vx) * step;
    }
    vx = Phaser.Math.Clamp(vx, -PlayerConfig.maxSpeedX, PlayerConfig.maxSpeedX);
    body.setVelocityX(vx);

    // ── State machine ───────────────────────────────────────────────────────
    const justLanded    = !this.wasOnGround && onGround;
    const justLeftGround = this.wasOnGround && !onGround;
    this.wasOnGround     = onGround;

    // Invalidate coyote window when an intentional jump sends us airborne,
    // but don't invalidate it when we simply walk off an edge (justLeftGround).
    // (The coyoteTimer was already set to coyoteTime while we were grounded,
    //  and the jump clears it itself when it fires.)

    this.updateState(onGround, justLanded, justLeftGround, body.velocity.y);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private updateState(
    onGround: boolean,
    justLanded: boolean,
    _justLeftGround: boolean,
    vy: number,
  ): void {
    const sm      = this.stateMachine;
    const absVX   = Math.abs(this.body.velocity.x);
    const moving  = absVX > PlayerConfig.runThreshold;

    if (justLanded) {
      // Always transition through Land; fire event if falling fast enough
      if (sm.transition(PlayerState.Land)) {
        const impactVelocity = vy; // vy at the moment of contact (positive = downward)
        if (impactVelocity >= PlayerConfig.landVelocityThreshold) {
          this.emit('land', impactVelocity);
        }
      }
    } else if (sm.is(PlayerState.Land)) {
      // Land is a single-frame transient state — resolve to Idle or Run
      sm.transition(moving ? PlayerState.Run : PlayerState.Idle);
    } else if (!onGround) {
      sm.transition(vy < 0 ? PlayerState.Jump : PlayerState.Fall);
    } else {
      sm.transition(moving ? PlayerState.Run : PlayerState.Idle);
    }
  }
}
