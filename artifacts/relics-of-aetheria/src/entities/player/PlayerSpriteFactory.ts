/**
 * PlayerSpriteFactory
 *
 * Generates a procedural placeholder texture for Kai until real sprite artwork
 * is delivered.  Call createPlaceholderTexture() once in BootScene.create().
 *
 * The texture key is exported as KAI_PLACEHOLDER_KEY so KaiRenderer and
 * BootScene agree on the same string without duplication.
 *
 * Texture dimensions: 32 × 48 px — exactly matches PlayerConfig.width × height
 * so the sprite aligns with the physics body without any offset.
 *
 * Character layout (facing right):
 *   y  0– 6   Hair
 *   y  2–16   Head / face / eyes
 *   y 16–30   Tunic, arms, backpack
 *   y 30–32   Belt
 *   y 32–44   Pants / legs
 *   y 43–48   Boots
 *
 * Replacing with real art:
 *   1. Add the spritesheet to assets/ and register it in AssetManifest.ts.
 *   2. Remove the call to PlayerSpriteFactory.createPlaceholderTexture() in BootScene.
 *   3. In KaiRenderer, update the texture key from KAI_PLACEHOLDER_KEY to the
 *      real spritesheet key (e.g. AssetKeys.PLAYER_SHEET).
 *   4. In KaiAnimationController, uncomment the this._sprite.play(key) lines.
 */

import Phaser from 'phaser';

export const KAI_PLACEHOLDER_KEY = 'kai_placeholder' as const;

export class PlayerSpriteFactory {
  /**
   * Generates the 'kai_placeholder' texture and adds it to Phaser's texture cache.
   * Safe to call multiple times — returns immediately if already generated.
   */
  static createPlaceholderTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(KAI_PLACEHOLDER_KEY)) return;

    const W = 32;
    const H = 48;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);

    // ── Hair ────────────────────────────────────────────────────────────────
    g.fillStyle(0x3b2a1a);   // dark brown
    g.fillRect(8, 1, 16, 7);
    // small side bits
    g.fillRect(7, 5, 2, 5);
    g.fillRect(23, 5, 2, 5);

    // ── Head / face ─────────────────────────────────────────────────────────
    g.fillStyle(0xf5c89a);   // warm skin
    g.fillCircle(16, 10, 8);

    // ── Eyes ────────────────────────────────────────────────────────────────
    g.fillStyle(0x1a1a2e);   // near-black pupils
    g.fillCircle(13, 9, 1.5);
    g.fillCircle(19, 9, 1.5);
    // Eye whites
    g.fillStyle(0xffffff);
    g.fillCircle(12.5, 8.5, 0.8);
    g.fillCircle(18.5, 8.5, 0.8);

    // ── Mouth (slight smile) ─────────────────────────────────────────────────
    g.fillStyle(0xc0896a);
    g.fillRect(13, 13, 6, 1);

    // ── Neck ─────────────────────────────────────────────────────────────────
    g.fillStyle(0xf5c89a);
    g.fillRect(14, 17, 4, 3);

    // ── Tunic / body ─────────────────────────────────────────────────────────
    g.fillStyle(0x3a7a3a);   // forest green
    g.fillRect(10, 19, 12, 12);

    // ── Left arm ─────────────────────────────────────────────────────────────
    g.fillStyle(0x3a7a3a);
    g.fillRect(5, 19, 6, 8);
    // Left hand
    g.fillStyle(0xf5c89a);
    g.fillRect(5, 27, 6, 4);

    // ── Right arm ────────────────────────────────────────────────────────────
    g.fillStyle(0x3a7a3a);
    g.fillRect(21, 19, 6, 8);
    // Right hand
    g.fillStyle(0xf5c89a);
    g.fillRect(21, 27, 6, 4);

    // ── Backpack (left side — character's back when facing right) ────────────
    // Note: sprite faces RIGHT by default; flip on left movement
    g.fillStyle(0x8b6420);   // tanned leather
    g.fillRect(1, 18, 7, 13);
    // Backpack flap
    g.fillStyle(0xa07830);
    g.fillRect(1, 18, 7, 4);
    // Buckle
    g.fillStyle(0xddaa22);   // brass
    g.fillRect(3, 27, 3, 2);
    // Strap across chest (visible bit)
    g.fillStyle(0x7a5818);
    g.fillRect(8, 19, 3, 9);

    // ── Belt ─────────────────────────────────────────────────────────────────
    g.fillStyle(0x5c3317);   // dark leather
    g.fillRect(10, 31, 12, 3);
    // Buckle
    g.fillStyle(0xddaa22);
    g.fillRect(14, 31, 4, 3);

    // ── Legs / pants ─────────────────────────────────────────────────────────
    g.fillStyle(0x7a3a10);   // warm brown
    g.fillRect(10, 34, 5, 10);   // left leg
    g.fillRect(17, 34, 5, 10);   // right leg

    // ── Boots ─────────────────────────────────────────────────────────────────
    g.fillStyle(0x2e1a0e);   // very dark brown
    g.fillRect(9, 43, 7, 5);    // left boot (slightly wider for toe)
    g.fillRect(16, 43, 7, 5);   // right boot

    // ── Boot highlights ───────────────────────────────────────────────────────
    g.fillStyle(0x4a2e18);
    g.fillRect(10, 43, 5, 2);   // left boot sheen
    g.fillRect(17, 43, 5, 2);   // right boot sheen

    g.generateTexture(KAI_PLACEHOLDER_KEY, W, H);
    g.destroy();

    console.log(`[PlayerSpriteFactory] Generated placeholder texture '${KAI_PLACEHOLDER_KEY}' (${W}×${H}px)`);
  }
}
