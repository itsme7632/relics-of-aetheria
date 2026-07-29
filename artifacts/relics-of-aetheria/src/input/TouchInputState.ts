/**
 * TouchInputState
 *
 * The unified input API consumed by Player and GameScene.
 * Both keyboard and touch controls write into this object each frame.
 * Neither Player nor GameScene ever reads keyboard or pointer events directly.
 *
 * Updated by TouchManager.update() once per frame.
 * Read by: Player.update(delta, input) and GameScene for interact.
 *
 * No per-frame allocation: the same object is mutated every frame.
 */

export interface TouchInputState {
  /**
   * Horizontal movement axis.
   *  -1.0  = full left
   *   0.0  = no horizontal input
   *  +1.0  = full right
   * From joystick: continuous -1 to 1 with dead zone.
   * From keyboard: hard -1 / 0 / +1.
   */
  moveX: number;

  /** True while the jump button or up/space key is being held. */
  jumpDown: boolean;

  /**
   * True only on the single frame jump was first pressed.
   * Reset to false at the start of each TouchManager.update() call.
   * Drives the jump buffer in Player.
   */
  jumpJust: boolean;

  /**
   * True only on the single frame the interact button or E key was first pressed.
   * Reset to false at the start of each TouchManager.update() call.
   * Consumed by InteractionManager.
   */
  interactJust: boolean;
}

/** Allocate a zeroed TouchInputState (call once, never per-frame). */
export function createTouchInputState(): TouchInputState {
  return {
    moveX:        0,
    jumpDown:     false,
    jumpJust:     false,
    interactJust: false,
  };
}

/** Zero all fields in place — no allocation. Called at the top of each update. */
export function resetTouchInputState(state: TouchInputState): void {
  state.moveX        = 0;
  state.jumpDown     = false;
  state.jumpJust     = false;
  state.interactJust = false;
}
