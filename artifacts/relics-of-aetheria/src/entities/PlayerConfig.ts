/**
 * PlayerConfig
 *
 * Single source of truth for every tunable value in the player controller.
 * Nothing in the player, state machine, or debug overlay should be hard-coded.
 */
export const PlayerConfig = {
  // ── Appearance ─────────────────────────────────────────────────────────────
  width: 32,
  height: 48,
  color: 0x7ecdf7,

  // ── Ground movement ────────────────────────────────────────────────────────
  /** Maximum horizontal speed (px/s). */
  maxSpeedX: 240,
  /** Horizontal acceleration while a direction key is held (px/s²). */
  acceleration: 1800,
  /** Horizontal deceleration when no direction key is held (px/s²). */
  deceleration: 2400,
  /** Multiplier applied to accel & decel while airborne (0–1). */
  airControl: 0.4,

  // ── Jump ───────────────────────────────────────────────────────────────────
  /** Initial upward velocity on jump (negative = up in Phaser). */
  jumpVelocity: -560,
  /**
   * If the jump key is released while rising faster than this, clamp vy here.
   * Must be negative (upward).  Controls short-press jump height.
   */
  minJumpVelocity: -200,
  /**
   * Gravity scale while the player is rising AND the jump key is held.
   * Values < 1 make the ascent float longer.
   */
  jumpHoldGravityMult: 0.45,
  /**
   * Gravity scale while the player is falling (vy ≥ 0).
   * Values > 1 produce a snappier fall arc.
   */
  fallGravityMult: 1.8,

  // ── Coyote time ────────────────────────────────────────────────────────────
  /** Milliseconds after leaving a ledge during which a jump is still allowed. */
  coyoteTime: 100,

  // ── Jump buffer ────────────────────────────────────────────────────────────
  /** Milliseconds before landing during which an early jump press is stored. */
  jumpBufferTime: 120,

  // ── Landing ────────────────────────────────────────────────────────────────
  /**
   * Minimum downward velocity (px/s, positive) at the moment of contact for
   * the "land" event to fire.  Prevents the event firing on micro-drops.
   */
  landVelocityThreshold: 50,

  // ── State resolution ───────────────────────────────────────────────────────
  /** |velX| below this is treated as "not moving" when resolving Idle vs Run. */
  runThreshold: 4,
} as const;
