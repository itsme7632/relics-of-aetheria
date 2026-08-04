import Phaser from 'phaser';
import { InteractionEvents } from '../events/InteractionEvents';
import { GameEvents } from '../events/GameEvents';
import type { Checkpoint } from '../entities/interactable/Checkpoint';
import type { ScreenFlash } from '../ui/ScreenFlash';
import type { HudDisplay } from '../ui/HudDisplay';
import type { CameraEffects } from '../managers/CameraEffects';
import { ParticleSystem } from './ParticleSystem';

// ── CheckpointData ─────────────────────────────────────────────────────────────

/** Snapshot of an activated checkpoint, stored for the respawn system. */
export interface CheckpointData {
  /** Unique id of the Checkpoint entity (from Entity.id). */
  id:          string;
  /** World X of the checkpoint centre (used as respawn X). */
  x:           number;
  /**
   * Ground Y of the checkpoint zone — the bottom edge of the activation zone.
   * Used to position the player's feet on respawn.
   */
  spawnY:      number;
  /** Unix timestamp (Date.now()) when the checkpoint was activated. */
  activatedAt: number;
}

// ── CheckpointSystem ──────────────────────────────────────────────────────────

/**
 * CheckpointSystem — M19
 *
 * Listens for CHECKPOINT_ACTIVATED on the scene event bus and orchestrates all
 * feedback for that event:
 *   1. Gold screen flash
 *   2. Gold particle burst
 *   3. Brief camera zoom pulse
 *   4. HUD "Checkpoint Reached" notification
 *
 * Also stores the last activated checkpoint position so GameScene can read it
 * for the respawn sequence.
 *
 * Usage:
 *   const cs = new CheckpointSystem(scene, screenFlash, hud, cameraEffects);
 *   cs.init();                         // call once, after create()
 *   const pt = cs.getRespawnPoint();   // null until a checkpoint is hit
 *   cs.destroy();                      // call in SHUTDOWN
 */
export class CheckpointSystem {
  private _active: CheckpointData | null = null;

  constructor(
    private readonly scene:  Phaser.Scene,
    private readonly flash:  ScreenFlash,
    private readonly hud:    HudDisplay,
    private readonly camFx:  CameraEffects,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Subscribe to scene events.  Must be called after create() — not in the
   * constructor — so the scene event bus is fully initialised.
   */
  init(): void {
    this.scene.events.on(
      InteractionEvents.CHECKPOINT_ACTIVATED,
      this._onActivated,
      this,
    );
  }

  destroy(): void {
    this.scene.events.off(
      InteractionEvents.CHECKPOINT_ACTIVATED,
      this._onActivated,
      this,
    );
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Snapshot of the last activated checkpoint, or null if none hit yet. */
  get activeData(): CheckpointData | null {
    return this._active;
  }

  /** True once at least one checkpoint has been activated this session. */
  get hasCheckpoint(): boolean {
    return this._active !== null;
  }

  /**
   * Returns the world position the player should respawn at, or null if no
   * checkpoint has been activated in this level session.
   */
  getRespawnPoint(): { x: number; y: number } | null {
    if (!this._active) return null;
    return { x: this._active.x, y: this._active.spawnY };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _onActivated(cp: Checkpoint): void {
    // Store data immediately so even if effects fail the respawn still works
    this._active = {
      id:          cp.id,
      x:           cp.x,
      spawnY:      cp.spawnY,
      activatedAt: Date.now(),
    };

    // ── Feedback effects ─────────────────────────────────────────────────────
    this.flash.flashGold();

    ParticleSystem.checkpointBurst(this.scene, cp.x, cp.y);

    this.hud.showNotification('Checkpoint Reached', 0xffcc00);

    // Tiny zoom-in pulse then snap back
    const cam = this.scene.cameras.main;
    this.scene.tweens.add({
      targets:    cam,
      zoom:       cam.zoom + 0.06,
      duration:   140,
      ease:       'Quad.easeOut',
      yoyo:       true,
      onComplete: () => { cam.zoom = 1.0; },
    });

    // Broadcast so other systems can react (audio, save, etc.)
    this.scene.events.emit(GameEvents.CHECKPOINT_REACHED, this._active);

    console.log(
      `[CheckpointSystem] Activated at (${Math.round(cp.x)}, ${Math.round(cp.spawnY)})`,
    );
  }
}
