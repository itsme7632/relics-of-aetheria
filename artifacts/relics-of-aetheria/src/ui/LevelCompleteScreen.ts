import Phaser from 'phaser';

/**
 * LevelCompleteScreen
 *
 * M18: Full-viewport overlay shown when the player reaches the LevelExit.
 *
 * Displays:
 *   - "LEVEL COMPLETE" headline (or "WORLD COMPLETE" when no next level)
 *   - Session stats: crystals collected, damage taken, time elapsed
 *   - Action buttons: Next Level (if available) and Replay
 *
 * Usage:
 *   const s = new LevelCompleteScreen(scene, { onNext, onReplay });
 *   s.show({ hasNext, crystalsCollected, totalCrystals, damageTaken, timeSeconds });
 *   s.destroy();
 */

const DEPTH = 1500;
const FONT  = '"Courier New", Courier, monospace';

export interface LevelCompleteCallbacks {
  onNext:   () => void;
  onReplay: () => void;
}

export interface LevelCompleteStats {
  hasNext:           boolean;
  crystalsCollected: number;
  totalCrystals:     number;
  damageTaken:       number;
  timeSeconds:       number;
}

export class LevelCompleteScreen {
  private readonly _objs: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene:     Phaser.Scene,
    private readonly callbacks: LevelCompleteCallbacks,
  ) {
    // Built lazily in show() so stats are available.
  }

  show(stats: LevelCompleteStats): void {
    // Tear down any previous build (level restarts, etc.)
    this._destroyObjs();
    this._build(stats);

    // Fade in
    for (const o of this._objs) {
      (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
    }
    this.scene.tweens.add({
      targets: this._objs,
      alpha:   1,
      duration: 320,
      ease:    'Quad.easeOut',
      delay:   (_: unknown, i: number) => i * 30,
    });
  }

  hide(): void {
    for (const o of this._objs) {
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    }
  }

  destroy(): void {
    this._destroyObjs();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _build(stats: LevelCompleteStats): void {
    const { width, height } = this.scene.scale;
    const cx = width  / 2;
    const cy = height / 2;

    // Background
    this._objs.push(
      this.scene.add
        .rectangle(cx, cy, width, height, 0x000000, 0.78)
        .setScrollFactor(0).setDepth(DEPTH),
    );

    // Headline
    const headline = stats.hasNext ? 'LEVEL COMPLETE' : 'WORLD COMPLETE';
    const headColor = stats.hasNext ? '#ffee44'        : '#ffaa22';
    this._objs.push(
      this.scene.add
        .text(cx, cy - 110, headline, {
          fontSize: '46px', fontFamily: FONT,
          color: headColor, stroke: '#000000', strokeThickness: 6,
        })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),
    );

    // Stats panel
    const mins  = Math.floor(stats.timeSeconds / 60);
    const secs  = String(stats.timeSeconds % 60).padStart(2, '0');
    const timeStr = `${mins}:${secs}`;

    const statLines = [
      `Crystals   ${stats.crystalsCollected} / ${stats.totalCrystals}`,
      `Damage     ${stats.damageTaken} hit${stats.damageTaken !== 1 ? 's' : ''}`,
      `Time       ${timeStr}`,
    ];

    statLines.forEach((line, i) => {
      this._objs.push(
        this.scene.add
          .text(cx, cy - 44 + i * 26, line, {
            fontSize: '17px', fontFamily: FONT,
            color: '#ccddee', stroke: '#000000', strokeThickness: 3,
          })
          .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),
      );
    });

    // Buttons
    const btnY = cy + 56;
    if (stats.hasNext) {
      this._addButton(cx - 110, btnY, 'NEXT LEVEL', 190, this.callbacks.onNext);
      this._addButton(cx + 110, btnY, 'REPLAY',     190, this.callbacks.onReplay);
    } else {
      this._addButton(cx, btnY, 'REPLAY', 200, this.callbacks.onReplay);
    }
  }

  private _addButton(x: number, y: number, label: string, w: number, onClick: () => void): void {
    const h = 44;
    const bg = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._drawBtnBg(bg, x, y, w, h, false);
    this._objs.push(bg);

    this._objs.push(
      this.scene.add
        .text(x, y, label, { fontSize: '15px', fontFamily: FONT, color: '#ffffff' })
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
    const col    = hovered ? 0x556622 : 0x334411;
    const border = hovered ? 0xaabb44 : 0x778833;
    g.fillStyle(col, 0.90).fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.lineStyle(1.5, border, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
  }

  private _destroyObjs(): void {
    for (const o of this._objs) o.destroy();
    this._objs.length = 0;
  }
}
