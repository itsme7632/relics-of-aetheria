import Phaser from 'phaser';
import type { CameraEffects } from '../managers/CameraEffects';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Lifecycle state of a running transition.
 *   idle        — no transition running.
 *   fading_out  — screen fading to black.
 *   holding     — screen is fully black; mid-transition work happening.
 *   fading_in   — screen fading back from black to full visibility.
 */
export type TransitionState = 'idle' | 'fading_out' | 'holding' | 'fading_in';

// ── TransitionManager ─────────────────────────────────────────────────────────

/**
 * TransitionManager — M19
 *
 * Reusable coordinator for cross-fade transitions (respawn) and one-way fades
 * (level loads).  Delegates all visual work to CameraEffects so that this
 * class remains free of direct Phaser scene coupling except for the timer.
 *
 * Usage — respawn sequence:
 *   tm.crossfade(
 *     cameraEffects,
 *     400,                    // fade out ms
 *     () => doRespawn(),      // midpoint callback (screen is black)
 *     400,                    // hold-black ms
 *     400,                    // fade in ms
 *     () => resumePlay(),     // completion callback
 *   );
 *
 * Usage — level load:
 *   tm.fadeOut(cameraEffects, 500, () => scene.restart({ levelId }));
 */
export class TransitionManager {
  private _state: TransitionState = 'idle';

  constructor(private readonly scene: Phaser.Scene) {}

  // ── State ──────────────────────────────────────────────────────────────────

  get state(): TransitionState {
    return this._state;
  }

  /** True while any transition phase is in progress. */
  get isTransitioning(): boolean {
    return this._state !== 'idle';
  }

  // ── Transitions ───────────────────────────────────────────────────────────

  /**
   * Full bidirectional crossfade for respawn or checkpoint warp.
   *
   * Phase 1 — fade out over `outMs`.
   * Phase 2 — call `midCallback` (teleport / HP restore), hold black for `holdMs`.
   * Phase 3 — fade back in over `inMs`, then call `onComplete`.
   *
   * Re-entry is guarded: calling crossfade() while a transition is running
   * is a no-op.
   */
  crossfade(
    fx:          CameraEffects,
    outMs:       number,
    midCallback: () => void,
    holdMs:      number,
    inMs:        number,
    onComplete?: () => void,
  ): void {
    if (this._state !== 'idle') return;
    this._state = 'fading_out';

    fx.fadeOut(outMs, 0x000000, () => {
      // Screen is now fully black — safe to perform midpoint operations
      midCallback();
      this._state = 'holding';

      this.scene.time.delayedCall(holdMs, () => {
        this._state = 'fading_in';
        fx.fadeIn(inMs, 0x000000, () => {
          this._state = 'idle';
          onComplete?.();
        });
      });
    });
  }

  /**
   * One-way fade-out for level transitions.
   * The receiving scene is responsible for its own fade-in on startup.
   * @param callback  Called once the screen is fully black (safe to load/restart).
   */
  fadeOut(fx: CameraEffects, ms: number, callback: () => void): void {
    if (this._state !== 'idle') return;
    this._state = 'fading_out';
    fx.fadeOut(ms, 0x000000, () => {
      this._state = 'idle';
      callback();
    });
  }

  destroy(): void {
    // Nothing to clean up — timers are owned by the scene and die with it.
    this._state = 'idle';
  }
}
