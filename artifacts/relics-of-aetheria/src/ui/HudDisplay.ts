import Phaser from 'phaser';

/**
 * HudDisplay
 *
 * M18: Permanent in-game HUD.
 * M19: Animated HP loss/restore, animated crystal counter, checkpoint notification.
 *
 * Layout (all elements pinned to viewport, scrollFactor 0):
 *   Top-left  — HP hearts (3 max, future-proof for half-hearts)
 *   Below hearts — crystal counter (◆ N)
 *   Below counter — current level name (small)
 *   Top-right — pause button (touch-friendly, 40×40 hit area)
 *
 * Usage:
 *   const hud = new HudDisplay(scene, Player.MAX_HP, entry.displayName, () => pause());
 *   hud.setHp(2, 3);
 *   hud.animateHpLoss(2, 3);        // M19: animated heart loss
 *   hud.animateHpRestore(3, 3);     // M19: animated full heal
 *   hud.setCrystals(4);             // M19: animated crystal pop
 *   hud.showNotification('text', 0xffcc00); // M19: slide-in banner
 *   hud.destroy();
 */

const HUD_DEPTH  = 990;
const HEART_GAP  = 28;  // px between heart centres
const FONT       = '"Courier New", Courier, monospace';

export class HudDisplay {
  private readonly _scene:       Phaser.Scene;
  private readonly _hearts:      Phaser.GameObjects.Graphics;
  private readonly _crystalText: Phaser.GameObjects.Text;
  private readonly _levelText:   Phaser.GameObjects.Text;
  private readonly _pauseGfx:    Phaser.GameObjects.Graphics;
  private readonly _pauseZone:   Phaser.GameObjects.Zone;

  constructor(
    scene:     Phaser.Scene,
    maxHp:     number,
    levelName: string,
    onPause:   () => void,
  ) {
    this._scene = scene;
    const { width } = scene.scale;

    // ── Hearts ────────────────────────────────────────────────────────────
    this._hearts = scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH);
    this._drawHearts(maxHp, maxHp);

    // ── Crystal counter ───────────────────────────────────────────────────
    this._crystalText = scene.add
      .text(16, 46, '◆ 0', {
        fontSize:        '14px',
        fontFamily:      FONT,
        color:           '#33ccff',
        stroke:          '#001122',
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    // ── Level name ────────────────────────────────────────────────────────
    this._levelText = scene.add
      .text(16, 66, levelName, {
        fontSize:        '11px',
        fontFamily:      FONT,
        color:           '#9999bb',
        stroke:          '#000011',
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    // ── Pause button (top-right) ──────────────────────────────────────────
    const bx = width - 36;
    const by = 24;

    this._pauseGfx = scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH);
    this._drawPauseIcon(bx, by, false);

    this._pauseZone = scene.add
      .zone(bx, by, 40, 40)
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 1)
      .setInteractive({ useHandCursor: true });

    this._pauseZone.on('pointerdown', onPause);
    this._pauseZone.on('pointerover', () => this._drawPauseIcon(bx, by, true));
    this._pauseZone.on('pointerout',  () => this._drawPauseIcon(bx, by, false));
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Update heart display (instant, no animation). Call whenever HP changes. */
  setHp(hp: number, maxHp: number): void {
    this._drawHearts(hp, maxHp);
  }

  /**
   * M19: Animate a heart loss — redraws hearts then shakes the hearts row.
   * Call instead of setHp() when the player takes damage.
   */
  animateHpLoss(hp: number, maxHp: number): void {
    this._drawHearts(hp, maxHp);
    // Small horizontal shake to sell the impact
    this._scene.tweens.killTweensOf(this._hearts);
    this._scene.tweens.add({
      targets:  this._hearts,
      x:        5,
      duration: 35,
      yoyo:     true,
      repeat:   3,
      ease:     'Linear',
      onComplete: () => { this._hearts.x = 0; },
    });
  }

  /**
   * M19: Animate a full HP restore — redraws hearts then pulses scale up/down.
   * Call during the respawn sequence.
   */
  animateHpRestore(hp: number, maxHp: number): void {
    this._drawHearts(hp, maxHp);
    this._scene.tweens.killTweensOf(this._hearts);
    this._scene.tweens.add({
      targets:  this._hearts,
      scaleX:   1.35,
      scaleY:   1.35,
      duration: 160,
      yoyo:     true,
      ease:     'Back.easeOut',
      onComplete: () => {
        this._hearts.setScale(1);
        this._hearts.x = 0;
      },
    });
  }

  /**
   * M19: Update the crystal counter with a pop animation.
   * Replaces the plain setCrystals() for collect events.
   */
  setCrystals(count: number): void {
    this._crystalText.setText(`◆ ${count}`);
    this._scene.tweens.killTweensOf(this._crystalText);
    this._scene.tweens.add({
      targets:  this._crystalText,
      scaleX:   1.45,
      scaleY:   1.45,
      duration: 90,
      yoyo:     true,
      ease:     'Back.easeOut',
      onComplete: () => { this._crystalText.setScale(1); },
    });
  }

  /**
   * M19: Show a slide-in notification banner at the top-centre of the viewport.
   * Auto-dismisses after 2 s.
   * @param text   Label to display.
   * @param color  Text colour as a Phaser hex number (e.g. 0xffcc00 for gold).
   */
  showNotification(text: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const { width } = this._scene.scale;

    const notif = this._scene.add
      .text(width / 2, -40, text, {
        fontSize:        '16px',
        fontFamily:      FONT,
        color:           hex,
        stroke:          '#000000',
        strokeThickness: 4,
        backgroundColor: 'rgba(0,0,0,0.70)',
        padding:         { x: 18, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 5)
      .setOrigin(0.5, 0);

    // Slide in from above
    this._scene.tweens.add({
      targets:  notif,
      y:        42,
      duration: 300,
      ease:     'Back.easeOut',
      onComplete: () => {
        // Hold 2 seconds, then fade+slide out
        this._scene.time.delayedCall(2000, () => {
          this._scene.tweens.add({
            targets:  notif,
            y:        -60,
            alpha:    0,
            duration: 280,
            ease:     'Quad.easeIn',
            onComplete: () => notif.destroy(),
          });
        });
      },
    });
  }

  destroy(): void {
    this._hearts.destroy();
    this._crystalText.destroy();
    this._levelText.destroy();
    this._pauseGfx.destroy();
    this._pauseZone.destroy();
  }

  // ── Private drawing ───────────────────────────────────────────────────────

  private _drawHearts(hp: number, maxHp: number): void {
    this._hearts.clear();
    for (let i = 0; i < maxHp; i++) {
      this._drawHeart(20 + i * HEART_GAP, 20, i < hp);
    }
  }

  /**
   * Draw a single heart at (cx, cy).
   * Shape: two overlapping circles (upper lobes) + downward triangle (point).
   * Filled = red; empty = dark grey with low opacity.
   */
  private _drawHeart(cx: number, cy: number, filled: boolean): void {
    const g = this._hearts;
    const col   = filled ? 0xff2244 : 0x553344;
    const alpha = filled ? 1.0      : 0.35;

    g.fillStyle(col, alpha);
    g.fillCircle(cx - 5, cy - 3, 6);             // left lobe
    g.fillCircle(cx + 5, cy - 3, 6);             // right lobe
    g.fillTriangle(cx - 11, cy + 1, cx + 11, cy + 1, cx, cy + 12); // point

    // Subtle highlight on the left lobe when filled
    if (filled) {
      g.fillStyle(0xff7799, 0.60);
      g.fillCircle(cx - 3, cy - 5, 2.5);
    }
  }

  private _drawPauseIcon(cx: number, cy: number, hovered: boolean): void {
    const g = this._pauseGfx;
    g.clear();

    // Rounded square background
    g.fillStyle(hovered ? 0x555577 : 0x222233, hovered ? 0.90 : 0.70);
    g.fillRoundedRect(cx - 18, cy - 18, 36, 36, 6);

    // Two vertical bars (∥)
    g.fillStyle(0xddddff, 1.0);
    g.fillRect(cx - 8, cy - 8, 5, 16);
    g.fillRect(cx + 3, cy - 8, 5, 16);
  }
}
