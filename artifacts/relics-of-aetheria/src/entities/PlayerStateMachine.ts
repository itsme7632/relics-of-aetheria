/**
 * PlayerStateMachine
 *
 * Lightweight state machine for the player controller.
 * Tracks the current state and exposes a single transition() method.
 * The caller is responsible for deciding when and where to transition —
 * this class only stores state and enforces the no-op rule on self-transitions.
 */

export enum PlayerState {
  Idle = 'Idle',
  Run  = 'Run',
  Jump = 'Jump',
  Fall = 'Fall',
  Land = 'Land',
}

export class PlayerStateMachine {
  private _state: PlayerState = PlayerState.Fall;

  /** The currently active state. */
  get state(): PlayerState {
    return this._state;
  }

  /** Returns true if the machine is currently in the given state. */
  is(s: PlayerState): boolean {
    return this._state === s;
  }

  /**
   * Attempt a transition to `next`.
   * Returns `true` when the state actually changed, `false` on a self-transition.
   */
  transition(next: PlayerState): boolean {
    if (this._state === next) return false;
    this._state = next;
    return true;
  }
}
