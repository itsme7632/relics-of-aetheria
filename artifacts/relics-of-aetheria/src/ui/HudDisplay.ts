import Phaser from 'phaser';

/**
 * HudDisplay
 *
 * M18: Permanent in-game HUD.
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
 *   hud.setCrystals(4);
 *   hud.destroy();
 */

const HUD_DEPTH  = 990;
const HEART_GAP  = 28;  // px between heart centres
const FONT       = '"Courier New", Courier, monospace';

export class HudDisplay {
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

  /** Update heart display. Call whenever HP changes. */
  setHp(hp: number, maxHp: number): void {
    this._drawHearts(hp, maxHp);
  }

  /** Update the crystal counter label. */
  setCrystals(count: number): void {
    this._crystalText.setText(`◆ ${count}`);
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
