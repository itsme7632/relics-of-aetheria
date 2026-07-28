import Phaser from 'phaser';
import { Entity } from '../entities/Entity';
import { Crystal } from '../entities/collectible/Crystal';
import { GameEvents } from '../events/GameEvents';
import type { Player } from '../entities/Player';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Function that produces an Entity given a scene, spawn coordinates, and the
 * raw Tiled object record.  Register one per entity type name.
 */
export type EntityFactory = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  data: Phaser.Types.Tilemaps.TiledObject,
) => Entity;

/** Snapshot consumed by DebugOverlay when entity debug is active (F4). */
export interface EntityDebugInfo {
  entityCount: number;
  activeCount: number;
  collectedCrystals: number;
}

// ─── EntityManager ────────────────────────────────────────────────────────────

/**
 * EntityManager
 *
 * Single source of truth for all in-world interactive entities.
 *
 * Responsibilities:
 *   - Maintain a type registry (name → factory function)
 *   - Spawn entities automatically from a Tiled object layer
 *   - Manage entity lifecycle (track, update, destroy)
 *   - Register player overlap callbacks for collectibles
 *   - Expose debug telemetry for the debug overlay
 *
 * GameScene is the only consumer; it must NOT instantiate entity classes
 * directly — always go through EntityManager.
 *
 * Usage:
 *   const em = new EntityManager(this);
 *   em.registerType('Crystal', (scene, x, y) => new Crystal(scene, x, y));
 *   em.spawnFromMap(this.level.map);       // after map load
 *   em.initOverlaps(this.player);          // after player creation
 *   // in update():
 *   em.update(delta);
 */
export class EntityManager {
  private readonly registry = new Map<string, EntityFactory>();
  private readonly entities = new Map<string, Entity>();
  private _collectedCrystals = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  // ── Registry ───────────────────────────────────────────────────────────────

  /**
   * Register a factory for a named entity type.
   * The name must match the object's `name` field in the Tiled Objects layer.
   */
  registerType(name: string, factory: EntityFactory): void {
    this.registry.set(name, factory);
  }

  // ── Spawning ───────────────────────────────────────────────────────────────

  /**
   * Read every object in `layerName` from `map` and spawn the matching entity.
   * Unknown type names are logged and skipped — they never throw.
   * Adding new objects in Tiled requires only a registered factory; no code changes.
   */
  spawnFromMap(map: Phaser.Tilemaps.Tilemap, layerName = 'Objects'): void {
    const layer = map.getObjectLayer(layerName);
    if (!layer) {
      console.warn(`[EntityManager] Object layer "${layerName}" not found in map — no entities spawned.`);
      return;
    }

    let spawned = 0;
    for (const obj of layer.objects) {
      const typeName = obj.name;
      const factory = this.registry.get(typeName);
      if (!factory) {
        console.warn(`[EntityManager] No factory for entity type "${typeName}" — skipping.`);
        continue;
      }

      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const entity = factory(this.scene, x, y, obj);
      entity.spawn(x, y);
      this.track(entity);
      spawned++;
    }

    console.log(`[EntityManager] Spawned ${spawned} entities from layer "${layerName}".`);
  }

  /**
   * Set up Arcade Physics overlaps between the player and every collectible
   * entity.  Call this after both the player and all entities have been created.
   */
  initOverlaps(player: Player): void {
    for (const entity of this.entities.values()) {
      if (entity instanceof Crystal) {
        // Capture entity in closure; collect() guards against double-collection
        const crystal = entity;
        this.scene.physics.add.overlap(
          player,
          crystal.getZone(),
          () => crystal.collect(),
        );
      }
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  /** Call every frame from GameScene.update(). */
  update(delta: number): void {
    for (const entity of this.entities.values()) {
      if (entity.isActive && entity.isEnabled) {
        entity.update(delta);
      }
    }
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  findById(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  findByType<T extends Entity>(Type: abstract new (...args: never[]) => T): T[] {
    return [...this.entities.values()].filter((e): e is T => e instanceof Type);
  }

  // ── Destroy ────────────────────────────────────────────────────────────────

  destroy(id: string): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.destroy();
      this.entities.delete(id);
    }
  }

  destroyAll(): void {
    for (const entity of this.entities.values()) {
      entity.destroy();
    }
    this.entities.clear();
  }

  // ── Debug ──────────────────────────────────────────────────────────────────

  get entityCount(): number {
    return this.entities.size;
  }

  get activeCount(): number {
    let n = 0;
    for (const e of this.entities.values()) if (e.isActive) n++;
    return n;
  }

  get collectedCrystals(): number {
    return this._collectedCrystals;
  }

  get debugInfo(): EntityDebugInfo {
    return {
      entityCount: this.entityCount,
      activeCount: this.activeCount,
      collectedCrystals: this._collectedCrystals,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private track(entity: Entity): void {
    this.entities.set(entity.id, entity);

    // When a collectible is picked up: increment counter, log, remove from map
    entity.once(GameEvents.CRYSTAL_COLLECTED, () => {
      this._collectedCrystals++;
      console.log(
        `[EntityManager] Crystal collected! Total: ${this._collectedCrystals}`,
      );
      // Entity handles its own visual cleanup; remove it from the active set
      this.entities.delete(entity.id);
    });
  }
}
