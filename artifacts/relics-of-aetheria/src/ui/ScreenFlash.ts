import Phaser from 'phaser';

/**
 * ScreenFlash
 *
 * M18: Full-viewport tinted overlay used for hit feedback.
 * Flashes to a solid colour then fades out in one tween.
 * Pinned to the viewport (scrollFactor 0, depth 998).
 *
 * Usage:
 *   const flash = new ScreenFlash(this);
 *   flash.flash();              // default red damage flash
 *   flash.flash(0xffffff, 0.5); // white flash for collect
 */
export class ScreenFlash {
  private readonly _rect: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this._rect = scene.add
      .rectangle(width / 2, height / 2, width, height, 0xff0000, 1)
      .setScrollFactor(0)
      .setDepth(998)
      .setAlpha(0);
  }

  /**
   * Trigger the flash.
   * @param color    Fill colour (default: red damage tint).
   * @param alpha    Peak opacity (default: 0.35 — noticeable but not blinding).
   * @param duration Fade-out duration in ms (default: 220 ms).
   */
  flash(color = 0xff2233, alpha = 0.35, duration = 220): void {
    this._rect.setFillStyle(color, 1).setAlpha(alpha);
    this._rect.scene.tweens.killTweensOf(this._rect);
    this._rect.scene.tweens.add({
      targets:  this._rect,
      alpha:    0,
      duration,
      ease:     'Quad.easeOut',
    });
  }

  destroy(): void {
    this._rect.destroy();
  }
}
