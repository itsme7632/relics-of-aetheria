import Phaser from 'phaser';
import { Interactable } from '../entities/interactable/Interactable';
import { Checkpoint }   from '../entities/interactable/Checkpoint';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Factory function that creates an Interactable from Tiled object data.
 * The same signature as EntityFactory — swap freely between the two registries.
 */
export type InteractableFactory = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  data: Phaser.Types.Tilemaps.TiledObject,
) => Interactable;

/** Snapshot consumed by DebugOverlay when interaction debug is active (F6). */
export interface InteractionDebugInfo {
  /** id of the currently focused interactable, or null. */
  focusedId:   string | null;
  /** Constructor name of the focused interactable (e.g. "LevelExit"), or null. */
  focusedType: string | null;
  /** World position of the last activated checkpoint, or null. */
  activeCheckpointPos: { x: number; y: number } | null;
  /** Total number of registered interactables. */
  interactableCount: number;
}

// ─── InteractionManager ───────────────────────────────────────────────────────

/**
 * InteractionManager — Milestone 7: Gameplay Interaction Framework
 *
 * Single owner of all world-placed Interactable objects.
 *
 * Responsibilities:
 *   1. Maintain a type registry (name → factory)
 *   2. Spawn interactables from Tiled object layers
 *   3. Register physics overlaps for auto-activate interactables (Checkpoint)
 *   4. Per-frame proximity scan → focus / unfocus the nearest interactable
 *   5. Dispatch E-press interactions to the focused interactable
 *   6. Track the active checkpoint for future respawn
 *   7. F6 graphical debug: radii + focus indicator
 *
 * GameScene usage:
 *   const im = new InteractionManager(this);
 *   im.registerType('Door',  (scene, x, y, data) => new Door(scene, ...));
 *   im.registerType('Sign',  (scene, x, y, data) => new Sign(scene, ...));
 *   im.spawnFromLayer(this.level.map, 'Objects');
 *   im.spawnLayerAsType(this.level.map, 'Checkpoint', (s,x,y,d) => new Checkpoint(s, d.width??32, d.height??64));
 *   im.spawnLayerAsType(this.level.map, 'LevelExit',  (s,x,y,d) => new LevelExit(s, d.width??32, d.height??64));
 *   im.initOverlaps(this.player);        // after player created
 *   // in update():
 *   im.update({ x: player.x, y: player.y }, Phaser.Input.Keyboard.JustDown(eKey));
 */
export class InteractionManager {
  private readonly registry     = new Map<string, InteractableFactory>();
  private readonly interactables: Interactable[] = [];

  private _focused: Interactable | null         = null;
  private _activeCheckpoint: Checkpoint | null  = null;

  // ── Debug ──────────────────────────────────────────────────────────────────
  private _debugGfx: Phaser.GameObjects.Graphics | null = null;

  // ── Pre-allocated debug info snapshot (zero-alloc per frame) ──────────────
  private readonly _debugInfo: InteractionDebugInfo = {
    focusedId:           null,
    focusedType:         null,
    activeCheckpointPos: null,
    interactableCount:   0,
  };

  constructor(private readonly scene: Phaser.Scene) {}

  // ── Registry ───────────────────────────────────────────────────────────────

  /**
   * Register a factory keyed by the Tiled object name.
   * Call before spawnFromLayer() so every name has a factory.
   */
  registerType(name: string, factory: InteractableFactory): void {
    this.registry.set(name, factory);
  }

  // ── Spawning ───────────────────────────────────────────────────────────────

  /**
   * Spawn interactables from a Tiled object layer, using each object's `name`
   * to look up a factory.  Unknown names are logged and skipped.
   */
  spawnFromLayer(
    map: Phaser.Tilemaps.Tilemap,
    layerName = 'Objects',
  ): void {
    const layer = map.getObjectLayer(layerName);
    if (!layer) return;

    let spawned = 0;
    for (const obj of layer.objects) {
      const factory = this.registry.get(obj.name ?? '');
      if (!factory) continue; // silently skip — EntityManager may handle it

      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const interactable = factory(this.scene, x, y, obj);
      interactable.spawn(x, y);
      this.interactables.push(interactable);
      spawned++;
    }

    if (spawned > 0) {
      console.log(
        `[InteractionManager] Spawned ${spawned} interactable(s) from layer "${layerName}".`,
      );
    }
  }

  /**
   * Spawn all objects in a dedicated layer using the same factory regardless
   * of each object's name.  Used for `Checkpoint` and `LevelExit` layers where
   * the type is implied by the layer name, not the object name.
   */
  spawnLayerAsType(
    map: Phaser.Tilemaps.Tilemap,
    layerName: string,
    factory: InteractableFactory,
  ): void {
    const layer = map.getObjectLayer(layerName);
    if (!layer) return;

    let spawned = 0;
    for (const obj of layer.objects) {
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const interactable = factory(this.scene, x, y, obj);
      interactable.spawn(x, y);
      this.interactables.push(interactable);
      spawned++;
    }

    if (spawned > 0) {
      console.log(
        `[InteractionManager] Spawned ${spawned} interactable(s) from layer "${layerName}" as type.`,
      );
    }
  }

  // ── Overlaps ───────────────────────────────────────────────────────────────

  /**
   * Register Arcade Physics overlaps for auto-activate interactables.
   * Must be called after the player and all interactables have been spawned.
   */
  initOverlaps(player: Phaser.GameObjects.GameObject): void {
    for (const interactable of this.interactables) {
      if (!interactable.autoActivate) continue;

      const zone = interactable.getZone();
      if (!zone) continue;

      // Capture in closure — safe because we iterate once
      const target = interactable;
      this.scene.physics.add.overlap(player, zone, () => {
        target.activate();

        // Track active checkpoint for respawn (future)
        if (target instanceof Checkpoint) {
          this._activeCheckpoint = target;
        }
      });
    }
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  /**
   * Call every frame from GameScene.update().
   * Scans for the nearest in-range non-auto-activate interactable, updates
   * focus state, and dispatches E-press interactions.
   * Zero heap allocations in the hot path.
   *
   * @param playerPos  Current player world position.
   * @param eJustDown  True on the frame the E key is first pressed.
   */
  update(playerPos: { x: number; y: number }, eJustDown: boolean): void {
    const px = playerPos.x;
    const py = playerPos.y;

    let nearest: Interactable | null = null;
    let nearestDist = Infinity;

    for (const interactable of this.interactables) {
      if (!interactable.isActive || interactable.autoActivate) continue;

      const dx = interactable.x - px;
      const dy = interactable.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy); // cheap enough at ~10 entities

      if (dist <= interactable.interactionRadius && dist < nearestDist) {
        nearest     = interactable;
        nearestDist = dist;
      }
    }

    // ── Update focus ────────────────────────────────────────────────────────
    if (nearest !== this._focused) {
      this._focused?.setFocused(false);
      nearest?.setFocused(true);
      this._focused = nearest;
    }

    // ── E key dispatch ──────────────────────────────────────────────────────
    if (eJustDown && this._focused) {
      this._focused.interact();
    }

    // ── Debug overlay ────────────────────────────────────────────────────────
    if (this._debugGfx) {
      this._drawDebug(px, py);
    }
  }

  // ── Active checkpoint ──────────────────────────────────────────────────────

  /** Returns the last activated Checkpoint, or null (for future respawn). */
  getActiveCheckpoint(): Checkpoint | null {
    return this._activeCheckpoint;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  destroyAll(): void {
    for (const i of this.interactables) i.destroy();
    this.interactables.length = 0;
    this._focused = null;
    this._activeCheckpoint = null;
    this.hideDebug();
  }

  // ── Debug ──────────────────────────────────────────────────────────────────

  /** Show graphical debug overlays (F6 toggle). */
  showDebug(): void {
    if (this._debugGfx) return;
    this._debugGfx = this.scene.add.graphics();
    this._debugGfx.setDepth(997);
  }

  /** Remove graphical debug overlays. */
  hideDebug(): void {
    this._debugGfx?.destroy();
    this._debugGfx = null;
  }

  /**
   * Snapshot for DebugOverlay. Mutates and returns the pre-allocated object.
   */
  get debugInfo(): InteractionDebugInfo {
    const cp = this._activeCheckpoint;
    this._debugInfo.focusedId           = this._focused?.id ?? null;
    this._debugInfo.focusedType         = this._focused
      ? this._focused.constructor.name
      : null;
    this._debugInfo.activeCheckpointPos = cp
      ? { x: Math.round(cp.x), y: Math.round(cp.y) }
      : null;
    this._debugInfo.interactableCount   = this.interactables.length;
    return this._debugInfo;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /** Redraws the debug graphics layer each frame. Allocation-free. */
  private _drawDebug(px: number, py: number): void {
    const g = this._debugGfx!;
    g.clear();

    for (const i of this.interactables) {
      if (!i.isActive) continue;

      const isFocused = i === this._focused;

      // Interaction radius circle
      g.lineStyle(1, isFocused ? 0xffff00 : 0x888888, isFocused ? 0.8 : 0.3);
      g.strokeCircle(i.x, i.y, i.interactionRadius);

      // Centre dot
      g.fillStyle(isFocused ? 0xffff00 : 0x888888, isFocused ? 1 : 0.4);
      g.fillCircle(i.x, i.y, 3);

      // Auto-activate marker (teal square)
      if (i.autoActivate) {
        g.lineStyle(1, 0x00ffcc, 0.5);
        g.strokeRect(i.x - 6, i.y - 6, 12, 12);
      }
    }

    // Line from player to focused interactable
    if (this._focused) {
      g.lineStyle(1, 0xffff00, 0.5);
      g.lineBetween(px, py, this._focused.x, this._focused.y);
    }

    // Active checkpoint marker
    const cp = this._activeCheckpoint;
    if (cp) {
      g.lineStyle(2, 0xffcc00, 0.7);
      g.strokeCircle(cp.x, cp.y, cp.interactionRadius * 0.5);
    }
  }
}
