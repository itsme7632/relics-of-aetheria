import Phaser from 'phaser';

/**
 * PauseMenu
 *
 * M18: Overlay shown when the player presses ESC or the mobile pause button.
 *
 * Buttons:
 *   Resume    — return to gameplay
 *   Restart   — reload the current level
 *   Settings  — open SettingsMenu (PauseMenu hides itself first via callback)
 *   Exit      — placeholder for future main-menu navigation
 *
 * Usage:
 *   const menu = new PauseMenu(scene, { onResume, onRestart, onSettings, onExit });
 *   menu.show();
 *   menu.hide();
 *   menu.destroy();
 */

const DEPTH = 1510;
const FONT  = '"Courier New", Courier, monospace';

export interface PauseMenuCallbacks {
  onResume:   () => void;
  onRestart:  () => void;
  onSettings: () => void;
  onExit:     () => void;
}

export class PauseMenu {
  private readonly _objs: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene:     Phaser.Scene,
    private readonly callbacks: PauseMenuCallbacks,
  ) {
    this._build();
    this._setVisible(false);
  }

  show(): void {
    this._setVisible(true);

    for (const o of this._objs.slice(1)) {
      (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
    }
    this.scene.tweens.add({
      targets: this._objs.slice(1),
      alpha:   1,
      duration: 220,
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

    // Background
    this._objs.push(
      this.scene.add
        .rectangle(cx, cy, width, height, 0x000000, 0.72)
        .setScrollFactor(0).setDepth(DEPTH),
    );

    // Title
    this._objs.push(
      this.scene.add
        .text(cx, cy - 110, 'PAUSED', {
          fontSize: '50px', fontFamily: FONT,
          color: '#ccddff', stroke: '#000000', strokeThickness: 5,
        })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),
    );

    // Subtitle hint
    this._objs.push(
      this.scene.add
        .text(cx, cy - 58, 'ESC to resume', {
          fontSize: '14px', fontFamily: FONT, color: '#7788aa',
        })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),
    );

    // Buttons (stacked)
    const btns: [string, () => void][] = [
      ['RESUME',   this.callbacks.onResume],
      ['RESTART',  this.callbacks.onRestart],
      ['SETTINGS', this.callbacks.onSettings],
      ['EXIT',     this.callbacks.onExit],
    ];
    btns.forEach(([label, cb], i) => {
      this._addButton(cx, cy - 8 + i * 54, label, 220, cb);
    });
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
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    hovered: boolean,
  ): void {
    const col    = hovered ? 0x334466 : 0x1a2233;
    const border = hovered ? 0x8899cc : 0x445577;
    g.fillStyle(col, 0.90).fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.lineStyle(1.5, border, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
  }

  private _setVisible(v: boolean): void {
    for (const o of this._objs) {
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(v);
    }
  }
}
