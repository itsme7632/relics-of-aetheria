/**
 * KaiAnimationController
 *
 * M10: Maps PlayerState transitions to Phaser animation keys and drives the sprite.
 * M11: Removed placeholder logic — sprite.play() is always called when the
 *      animation is registered.  When the spritesheet is absent the call is a
 *      safe no-op (animation simply doesn't exist in scene.anims yet).
 *
 * When the real Kai spritesheet is added:
 *   1. AnimationFactory.registerAll() will register the player animations.
 *   2. sprite.play() calls here start working automatically — no code changes needed.
 *
 * Supported states:
 *   Core (PlayerStateMachine): Idle, Run, Jump, Fall, Land
 *   Extended (not in SM yet):  Climb, Push, Hurt, Celebrate
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

export type KaiAnimState =
  | PlayerState
  | 'Climb'
  | 'Push'
  | 'Hurt'
  | 'Celebrate';

// ── State → animation key map ─────────────────────────────────────────────────

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
  private _state: KaiAnimState = PlayerState.Idle;
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

  /**
   * Preview a specific animation by key, bypassing the state machine.
   * Useful for debug/tooling. Only plays if the animation is registered.
   */
  previewAnimation(key: string): void {
    if (this._sprite.scene.anims.exists(key)) {
      this._sprite.play(key, true);
    }
  }

  /** The Phaser animation key that corresponds to the current state. */
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

    // Play if registered — safe no-op when spritesheet is not yet loaded.
    if (this._sprite.scene.anims.exists(key)) {
      this._sprite.play(key, true);
    }
  }
}
