import Phaser from 'phaser';
import { Entity } from '../Entity';

/**
 * Interactable
 *
 * Abstract base for all world-placed interaction points (checkpoints, exits,
 * doors, signs, NPCs, …).
 *
 * Lifecycle (extends Entity lifecycle):
 *   1. Instantiate → constructor; not yet active
 *   2. spawn(x, y)  → creates visuals + physics zone, sets _active = true
 *   3. update(delta) → per-frame logic (e.g. animations); no-op by default
 *   4. destroy()    → removes all scene objects
 *
 * Two interaction modes:
 *   autoActivate = true  → activate() fires immediately on player overlap
 *   autoActivate = false → player must press E while focused to call interact()
 *
 * Focus is managed by InteractionManager, which calls setFocused() each frame.
 * Subclasses override _onFocusChanged() for visual feedback.
 *
 * All per-frame code is allocation-free: position is cached in _posX/_posY.
 */
export abstract class Interactable extends Entity {
  /**
   * World-space radius (pixels) used for E-press proximity detection.
   * For auto-activate interactables, this is the physics zone half-size.
   */
  readonly interactionRadius: number;

  /**
   * When true, the interactable fires activate() automatically on physics
   * zone overlap (Checkpoint behaviour).
   * When false, the player must press E while focused (LevelExit, Door, Sign).
   */
  readonly autoActivate: boolean;

  protected _focused = false;

  /** Pre-allocated position cache — keeps proximity checks allocation-free. */
  private _posX = 0;
  private _posY = 0;

  protected gfx: Phaser.GameObjects.Graphics | null = null;
  protected zone: Phaser.GameObjects.Zone | null = null;

  constructor(
    scene: Phaser.Scene,
    interactionRadius = 80,
    autoActivate = false,
  ) {
    super(scene);
    this.interactionRadius = interactionRadius;
    this.autoActivate      = autoActivate;
  }

  // ── Entity abstract implementations ───────────────────────────────────────

  /** Per-frame logic. No-op by default; override in animated subclasses. */
  update(_delta: number): void {}

  // ── Interaction API ────────────────────────────────────────────────────────

  /** Called when the player presses E while this interactable is focused. */
  abstract interact(): void;

  /** Activate the interactable (auto-activate types call this on overlap). */
  abstract activate(): void;

  /** Deactivate the interactable. */
  abstract deactivate(): void;

  // ── Focus state (managed by InteractionManager) ────────────────────────────

  /** Called by InteractionManager when the player enters or leaves range. */
  setFocused(focused: boolean): void {
    if (this._focused === focused) return;
    this._focused = focused;
    this._onFocusChanged(focused);
  }

  get isFocused(): boolean {
    return this._focused;
  }

  /**
   * Called exactly once when focus state changes.
   * Override in subclasses for visual feedback or console prompts.
   */
  protected _onFocusChanged(_focused: boolean): void {}

  // ── Position ───────────────────────────────────────────────────────────────

  override get x(): number { return this._posX; }
  override get y(): number { return this._posY; }

  /** Store world centre position. Call from spawn() implementations. */
  protected _setPos(x: number, y: number): void {
    this._posX = x;
    this._posY = y;
  }

  /** Physics zone used for auto-activate overlap detection. May be null. */
  getZone(): Phaser.GameObjects.Zone | null {
    return this.zone;
  }
}
