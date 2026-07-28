import Phaser from 'phaser';

/**
 * Entity
 *
 * Abstract base class for all interactive game objects (collectibles,
 * interactables, hazards, NPCs, etc.).
 *
 * Lifecycle:
 *   1. Instantiate  → constructor runs, entity is not yet active
 *   2. spawn(x, y)  → places the entity in the world, sets _active = true
 *   3. update(delta) → called every frame by EntityManager while active
 *   4. destroy()    → removes all scene objects, sets _active = false
 *
 * Enable/disable lets you pause update calls without destroying the entity.
 * Events are available via the inherited Phaser.Events.EventEmitter API.
 */
export abstract class Entity extends Phaser.Events.EventEmitter {
  /** Unique identifier, auto-assigned by the base constructor. */
  readonly id: string;

  /** Whether this entity has been spawned and not yet destroyed. */
  protected _active = false;

  /** Whether this entity should receive update() calls. */
  protected _enabled = true;

  private static _nextId = 0;

  constructor(protected readonly scene: Phaser.Scene) {
    super();
    this.id = `entity_${Entity._nextId++}`;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Place the entity into the world at (x, y).
   * Implementations must set `this._active = true` when ready.
   */
  abstract spawn(x: number, y: number): void;

  /**
   * Remove all scene objects created by this entity.
   * Implementations must set `this._active = false`.
   */
  abstract destroy(): void;

  /**
   * Per-frame logic.  Called by EntityManager only while isActive && isEnabled.
   * @param delta  Frame time in milliseconds.
   */
  abstract update(delta: number): void;

  // ── Enable / Disable ──────────────────────────────────────────────────────

  /** Resume update calls for this entity. */
  enable(): void {
    this._enabled = true;
  }

  /** Pause update calls without destroying the entity. */
  disable(): void {
    this._enabled = false;
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get isActive(): boolean {
    return this._active;
  }

  get isEnabled(): boolean {
    return this._enabled;
  }

  /** Current world X position (subclasses should override if they own a display object). */
  get x(): number {
    return 0;
  }

  /** Current world Y position (subclasses should override if they own a display object). */
  get y(): number {
    return 0;
  }
}
