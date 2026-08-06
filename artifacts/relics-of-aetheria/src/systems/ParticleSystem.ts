import Phaser from 'phaser';
import {
  PARTICLE_DUST,
  PARTICLE_CHECKPOINT,
  PARTICLE_DAMAGE,
} from '../assets/AssetKeys';

/**
 * ParticleSystem — M19
 *
 * Reusable procedural particle helpers. Each method creates a burst of small
 * Graphics objects that tween outward and fade. No texture atlas required —
 * the architecture supports swapping the internals for Phaser ParticleEmitter
 * calls once production artwork is available.
 *
 * Usage:
 *   ParticleSystem.checkpointBurst(this, x, y);
 *   ParticleSystem.playerDamage(this, x, y);
 *   ParticleSystem.landingDust(this, x, y);
 */
export class ParticleSystem {
  // ── Active-particle counter (debug) ────────────────────────────────────────
  private static _activeCount = 0;

  /** Number of particle graphics objects currently alive in all scenes. */
  static get activeParticleCount(): number {
    return ParticleSystem._activeCount;
  }

  // ── Public helpers ─────────────────────────────────────────────────────────

  /** Gold starburst — fires when a checkpoint is activated. */
  static checkpointBurst(scene: Phaser.Scene, x: number, y: number): void {
    if (!ParticleSystem._spriteParticle(scene, PARTICLE_CHECKPOINT, 'ptcl_checkpoint', x, y)) {
      ParticleSystem._burst(scene, x, y, [0xffcc00, 0xffee88, 0xffffff], 10, 72, 4, 380);
    }
  }

  /** Red scatter — fires when the player takes damage. */
  static playerDamage(scene: Phaser.Scene, x: number, y: number): void {
    if (!ParticleSystem._spriteParticle(scene, PARTICLE_DAMAGE, 'ptcl_damage', x, y)) {
      ParticleSystem._burst(scene, x, y, [0xff2233, 0xff6655], 7, 52, 3, 300);
    }
  }

  /**
   * Grey puff — fires when the player lands after a significant fall.
   * Particles spread mostly sideways to sell the dust-cloud feel.
   */
  static landingDust(scene: Phaser.Scene, x: number, y: number): void {
    // M20A: try production sprite path first
    if (ParticleSystem._spriteParticle(scene, PARTICLE_DUST, 'ptcl_dust', x, y)) return;

    // Procedural fallback
    const count = 6;
    for (let i = 0; i < count; i++) {
      const g = scene.add.graphics().setDepth(6);
      const col = i % 2 === 0 ? 0x998877 : 0xbbaa99;
      g.fillStyle(col, 0.75);
      g.fillCircle(0, 0, 3 + Math.random() * 2);
      g.setPosition(x + (Math.random() - 0.5) * 22, y);
      ParticleSystem._activeCount++;

      const spread = (Math.random() - 0.5) * 68;
      scene.tweens.add({
        targets:  g,
        x:        g.x + spread,
        y:        g.y - 10 - Math.random() * 12,
        alpha:    0,
        scale:    0.2,
        duration: 260 + Math.random() * 120,
        ease:     'Quad.easeOut',
        onComplete: () => { g.destroy(); ParticleSystem._activeCount--; },
      });
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * M20A: Attempt to emit one animated sprite particle.
   * Returns true and spawns a Sprite if the texture + animation both exist;
   * returns false so the caller falls back to procedural Graphics.
   */
  private static _spriteParticle(
    scene:   Phaser.Scene,
    texKey:  string,
    animKey: string,
    x:       number,
    y:       number,
  ): boolean {
    if (
      !scene.textures.exists(texKey) ||
      scene.textures.get(texKey).key === '__MISSING' ||
      !scene.anims.exists(animKey)
    ) return false;

    ParticleSystem._activeCount++;
    const spr = scene.add.sprite(x, y, texKey).setDepth(20).play(animKey);

    scene.tweens.add({
      targets:  spr,
      alpha:    0,
      duration: 280,
      ease:     'Quad.easeOut',
      onComplete: () => { spr.destroy(); ParticleSystem._activeCount--; },
    });
    return true;
  }

  // ── Internal burst engine ──────────────────────────────────────────────────

  /**
   * Core burst: spawns `count` small coloured circles that radiate outward.
   *
   * @param scene    Scene to add objects to.
   * @param x,y      World position of the burst origin.
   * @param colors   Array of colours, cycled through.
   * @param count    Number of particles.
   * @param speed    Radial travel distance in pixels.
   * @param radius   Particle radius in pixels.
   * @param duration Tween duration in ms.
   */
  private static _burst(
    scene:    Phaser.Scene,
    x:        number,
    y:        number,
    colors:   number[],
    count:    number,
    speed:    number,
    radius:   number,
    duration: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist  = speed * (0.55 + Math.random() * 0.9);
      const col   = colors[i % colors.length];

      const g = scene.add.graphics().setDepth(20);
      g.fillStyle(col, 1.0);
      g.fillCircle(0, 0, radius);
      g.setPosition(x, y);
      ParticleSystem._activeCount++;

      scene.tweens.add({
        targets:  g,
        x:        x + Math.cos(angle) * dist,
        y:        y + Math.sin(angle) * dist,
        alpha:    0,
        scale:    0.15,
        duration: duration + Math.random() * 100,
        ease:     'Quad.easeOut',
        onComplete: () => { g.destroy(); ParticleSystem._activeCount--; },
      });
    }
  }
}
