/**
 * KaiAnimationController
 *
 * Maps PlayerState transitions to Phaser animation keys and drives the sprite.
 *
 * Current behaviour (placeholder mode — no spritesheet):
 *   - Tracks state transitions and logs each change to the console.
 *   - Exposes currentAnimKey so DebugOverlay (F9) can display the intended animation.
 *   - sprite.play() calls are written but commented out until real frames exist.
 *
 * Enabling real animations (when spritesheet arrives):
 *   1. Ensure AnimationFactory.registerAll() has registered the player animations.
 *   2. Uncomment the this._sprite.play(key) line in _playAnim().
 *   3. Remove the console.log in _playAnim() (or keep it for dev logging).
 *
 * Supported states:
 *   Core (PlayerStateMachine): Idle, Run, Jump, Fall, Land
 *   Future (not in SM yet):    Climb, Push, Hurt, Celebrate
 *   Unknown states fall back to PLAYER_IDLE.
 */

import Phaser from 'phaser';
import { PlayerState } from '../PlayerStateMachine';
import {
  PLAYER_IDLE,
  PLAYER_RUN,
  PLAYER_JUMP,
  PLAYER_FALL,
  PLAYER_LAND,
  PLAYER_CLIMB,
  PLAYER_PUSH,
  PLAYER_HURT,
  PLAYER_CELEBRATE,
} from '../../animation/AnimationKeys';

// ── Extended state enum used for controller-only states ───────────────────────
// These mirror PlayerState for active SM states, and add future ones.
export type KaiAnimState =
  | PlayerState
  | 'Climb'
  | 'Push'
  | 'Hurt'
  | 'Celebrate';

// ── State → animation key map ──────────────────────────────────────────────────
function stateToAnimKey(state: KaiAnimState): string {
  switch (state) {
    case PlayerState.Idle: return PLAYER_IDLE;
    case PlayerState.Run:  return PLAYER_RUN;
    case PlayerState.Jump: return PLAYER_JUMP;
    case PlayerState.Fall: return PLAYER_FALL;
    case PlayerState.Land: return PLAYER_LAND;
    case 'Climb':          return PLAYER_CLIMB;
    case 'Push':           return PLAYER_PUSH;
    case 'Hurt':           return PLAYER_HURT;
    case 'Celebrate':      return PLAYER_CELEBRATE;
    default:               return PLAYER_IDLE;
  }
}

// ─── KaiAnimationController ───────────────────────────────────────────────────

export class KaiAnimationController {
  private _state:   KaiAnimState = PlayerState.Idle;
  /** Direct reference to the sprite — used when real animations are enabled. */
  private readonly _sprite: Phaser.GameObjects.Sprite;

  constructor(sprite: Phaser.GameObjects.Sprite) {
    this._sprite = sprite;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Call once per frame (after super.update() in Kai).
   * Transitions the animation state when PlayerState changes.
   * No-ops on same-state calls — zero allocations.
   */
  update(state: PlayerState): void {
    if ((state as KaiAnimState) === this._state) return;
    const prev = this._state;
    this._state = state as KaiAnimState;
    this._playAnim(prev, this._state);
  }

  /**
   * Force a controller-only state (Climb, Push, Hurt, Celebrate).
   * Call from Kai when the game triggers these events externally.
   */
  forceState(state: KaiAnimState): void {
    if (state === this._state) return;
    const prev = this._state;
    this._state = state;
    this._playAnim(prev, state);
  }

  /** The animation key that is currently intended to play. */
  get currentAnimKey(): string {
    return stateToAnimKey(this._state);
  }

  /** The raw KaiAnimState (for debug display). */
  get currentState(): KaiAnimState {
    return this._state;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _playAnim(from: KaiAnimState, to: KaiAnimState): void {
    const key = stateToAnimKey(to);
    console.log(`[KaiAnimController] ${from} → ${to}  (key: ${key})`);

    // Uncomment when real spritesheet is registered with AnimationFactory:
    // this._sprite.play(key, true);   // true = ignore if already playing
  }
}
