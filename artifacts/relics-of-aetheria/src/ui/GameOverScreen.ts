import Phaser from 'phaser';

/**
 * GameOverScreen
 *
 * M18: Full-viewport overlay displayed when the player's HP reaches zero.
 * All elements are viewport-fixed (scrollFactor 0).
 *
 * Usage:
 *   const screen = new GameOverScreen(scene, { onRetry, onExit });
 *   screen.show();
 *   screen.destroy(); // in SHUTDOWN
 */

const DEPTH = 1500;
const FONT  = '"Courier New", Courier, monospace';

export interface GameOverCallbacks {
  onRetry: () => void;
  onExit:  () => void;
}

export class GameOverScreen {
  /** All owned scene objects — used for bulk show/hide/destroy. */
  private readonly _objs: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly callbacks: GameOverCallbacks,
  ) {
    this._build();
    this._setVisible(false);
  }

  show(): void {
    this._setVisible(true);

    // Fade in non-background elements from alpha 0
    const elements = this._objs.slice(1); // skip the bg
    for (const o of elements) {
      (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
    }
    this.scene.tweens.add({
      targets: elements,
      alpha:   1,
      duration: 280,
      ease:    'Quad.easeOut',
    });
  }

  hide(): void {
    this._setVisible(false);
  }

  destroy(): void {
    for (const o of this._objs) o.destroy();
    this._objs.length = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _build(): void {
    const { width, height } = this.scene.scale;
    const cx = width  / 2;
    const cy = height / 2;

    // Darkened background
    const bg = this.scene.add
      .rectangle(cx, cy, width, height, 0x000000, 0.78)
      .setScrollFactor(0).setDepth(DEPTH);
    this._objs.push(bg);

    // Title
    this._objs.push(
      this.scene.add
        .text(cx, cy - 90, 'GAME OVER', {
          fontSize: '54px', fontFamily: FONT,
          color: '#ff3355', stroke: '#000000', strokeThickness: 6,
        })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),
    );

    // Subtitle
    this._objs.push(
      this.scene.add
        .text(cx, cy - 30, 'You were defeated…', {
          fontSize: '18px', fontFamily: FONT,
          color: '#cc8899', stroke: '#000000', strokeThickness: 3,
        })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),
    );

    // Buttons
    this._addButton(cx, cy + 30,  'RETRY LEVEL',  200, this.callbacks.onRetry);
    this._addButton(cx, cy + 82,  'EXIT TO MENU', 200, this.callbacks.onExit);
  }

  private _addButton(x: number, y: number, label: string, w: number, onClick: () => void): void {
    const h = 44;
    const bg = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._drawBtnBg(bg, x, y, w, h, false);
    this._objs.push(bg);

    this._objs.push(
      this.scene.add
        .text(x, y, label, { fontSize: '16px', fontFamily: FONT, color: '#ffffff' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2),
    );

    const zone = this.scene.add
      .zone(x, y, w, h)
      .setScrollFactor(0).setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', onClick);
    zone.on('pointerover', () => { bg.clear(); this._drawBtnBg(bg, x, y, w, h, true);  });
    zone.on('pointerout',  () => { bg.clear(); this._drawBtnBg(bg, x, y, w, h, false); });
    this._objs.push(zone);
  }

  private _drawBtnBg(
    g:       Phaser.GameObjects.Graphics,
    x: number, y: number,
    w: number, h: number,
    hovered: boolean,
  ): void {
    const col    = hovered ? 0x664444 : 0x442233;
    const border = hovered ? 0xff7788 : 0x994466;
    g.fillStyle(col, 0.90).fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.lineStyle(1.5, border, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
  }

  private _setVisible(v: boolean): void {
    for (const o of this._objs) {
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(v);
    }
  }
}
