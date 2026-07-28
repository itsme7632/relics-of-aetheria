import { Entity } from '../Entity';

/**
 * Collectible
 *
 * Abstract base for all one-time pickup entities (crystals, keys, power-ups…).
 *
 * Subclasses must implement:
 *   - spawn(x, y)  — place the item in the world
 *   - destroy()    — clean up scene objects
 *   - update(delta) — per-frame animation / logic
 *   - collect()    — trigger the pickup sequence (guard against double-collect
 *                    with the _collected flag)
 *
 * The _collected flag is set to true the moment collection begins; this lets
 * the physics overlap callback fire safely even if it fires twice in one frame.
 */
export abstract class Collectible extends Entity {
  protected _collected = false;

  /** True from the moment collection begins (animation may still be playing). */
  get isCollected(): boolean {
    return this._collected;
  }

  /**
   * Begin the collection sequence for this item.
   * Implementations must:
   *   1. Guard with `if (this._collected) return;`
   *   2. Set `this._collected = true` and `this._active = false`
   *   3. Emit the appropriate GameEvent
   *   4. Run any visual / audio feedback
   */
  abstract collect(): void;
}
