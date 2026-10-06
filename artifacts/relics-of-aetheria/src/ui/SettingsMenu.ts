import Phaser from 'phaser';
import { AssetKeys } from '../assets/AssetKeys';
import { MenuArtImporter } from '../assets/MenuArtImporter';
import { GameSettings, GameSettingsData } from '../data/GameSettings';

/**
 * SettingsMenu
 *
 * M18: Simple settings overlay accessible from the Pause Menu.
 *
 * Options (each row shows a toggle button ON/OFF):
 *   Music      — placeholder for future BGM control
 *   SFX        — placeholder for future sound-effects control
 *   Vibration  — placeholder for future haptic feedback
 *
 * Values are persisted to localStorage via GameSettings on every toggle.
 *
 * Usage:
 *   const sm = new SettingsMenu(scene, { onClose });
 *   sm.show();
 *   sm.hide();
 *   sm.destroy();
 */

const DEPTH = 1520;
const FONT  = '"Courier New", Courier, monospace';

export interface SettingsMenuCallbacks {
  onClose: () => void;
}

type ToggleKey = keyof GameSettingsData;

export class SettingsMenu {
  private readonly _objs: Phaser.GameObjects.GameObject[] = [];
  private _settings: GameSettingsData = GameSettings.load();

  /** Graphics objects keyed by setting name — redrawn on toggle. */
  private readonly _toggleGfx: Map<ToggleKey, Phaser.GameObjects.Graphics> = new Map();
  /** Text objects for the ON/OFF labels — updated on toggle. */
  private readonly _toggleLbl: Map<ToggleKey, Phaser.GameObjects.Text>     = new Map();

  constructor(
    private readonly scene:     Phaser.Scene,
    private readonly callbacks: SettingsMenuCallbacks,
  ) {
    this._build();
    this._setVisible(false);
  }

  show(): void {
    // Re-load in case values changed externally
    this._settings = GameSettings.load();
    this._refreshAllToggles();
    this._setVisible(true);

    for (const o of this._objs.slice(1)) {
      (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
    }
    this.scene.tweens.add({
      targets: this._objs.slice(1),
      alpha: 1,
      duration: 200,
      ease: 'Quad.easeOut',
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
        .rectangle(cx, cy, width, height, 0x000000, 0.80)
        .setScrollFactor(0).setDepth(DEPTH),
    );

    // Phase 2H: Ancient stone panel
    if (MenuArtImporter.isPanelLoaded(this.scene)) {
      const panel = this.scene.add
        .nineslice(cx, cy + 10, AssetKeys.UI_PANEL, undefined, 320, 340, 16, 16, 16, 16)
        .setScrollFactor(0).setDepth(DEPTH);
      this._objs.push(panel);
    }

    // Title
    this._objs.push(
      this.scene.add
        .text(cx, cy - 110, 'SETTINGS', {
          fontSize: '44px', fontFamily: FONT,
          color: '#ccddff', stroke: '#000000', strokeThickness: 5,
        })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),
    );

    // Toggle rows
    const rows: [string, ToggleKey][] = [
      ['Music',     'musicOn'],
      ['SFX',       'sfxOn'],
      ['Vibration', 'vibrationOn'],
    ];
    rows.forEach(([label, key], i) => {
      this._addToggleRow(cx, cy - 30 + i * 54, label, key);
    });

    // Back button
    this._addBackButton(cx, cy + 130);
  }

  private _addToggleRow(cx: number, cy: number, label: string, key: ToggleKey): void {
    // Row label
    this._objs.push(
      this.scene.add
        .text(cx - 90, cy, label, {
          fontSize: '18px', fontFamily: FONT, color: '#aabbcc',
        })
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 1),
    );

    // Toggle background graphic
    const gfx = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._toggleGfx.set(key, gfx);
    this._objs.push(gfx);

    // ON/OFF text
    const lbl = this.scene.add
      .text(cx + 90, cy, '', { fontSize: '16px', fontFamily: FONT, color: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this._toggleLbl.set(key, lbl);
    this._objs.push(lbl);

    // Draw initial state
    this._drawToggle(key);

    // Hit zone
    const zone = this.scene.add
      .zone(cx + 90, cy, 80, 40)
      .setScrollFactor(0).setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      (this._settings[key] as boolean) = !this._settings[key];
      GameSettings.save(this._settings);
      this._drawToggle(key);
    });
    this._objs.push(zone);
  }

  private _drawToggle(key: ToggleKey): void {
    const gfx     = this._toggleGfx.get(key)!;
    const lbl     = this._toggleLbl.get(key)!;
    const on      = this._settings[key] as boolean;
    const cx      = lbl.x;
    const cy      = lbl.y;
    const bgColor = on ? 0x225533 : 0x332222;
    const border  = on ? 0x44bb66 : 0x663333;

    gfx.clear();
    gfx.fillStyle(bgColor, 0.90).fillRoundedRect(cx - 40, cy - 18, 80, 36, 8);
    gfx.lineStyle(1.5, border, 1).strokeRoundedRect(cx - 40, cy - 18, 80, 36, 8);

    lbl.setText(on ? 'ON' : 'OFF');
    lbl.setColor(on ? '#66ff88' : '#ff6666');
  }

  private _refreshAllToggles(): void {
    for (const key of this._toggleGfx.keys()) {
      this._drawToggle(key);
    }
  }

  private _addBackButton(x: number, y: number): void {
    const w = 160, h = 44;
    // Phase 2H: Use production button art when available
    if (MenuArtImporter.isButtonLoaded(this.scene)) {
      const btn = this.scene.add
        .nineslice(x, y, AssetKeys.UI_BUTTON_NORMAL, undefined, w, h, 12, 12, 0, 0)
        .setScrollFactor(0).setDepth(DEPTH + 1);
      this._objs.push(btn);
      this._objs.push(
        this.scene.add
          .text(x, y, '← BACK', { fontSize: '16px', fontFamily: FONT, color: '#ffffff' })
          .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2),
      );
      const zone = this.scene.add
        .zone(x, y, w, h)
        .setScrollFactor(0).setDepth(DEPTH + 3)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', this.callbacks.onClose);
      zone.on('pointerover', () => { btn.setTexture(AssetKeys.UI_BUTTON_HOVER); });
      zone.on('pointerout',  () => { btn.setTexture(AssetKeys.UI_BUTTON_NORMAL); });
      this._objs.push(zone);
    } else {
      const bg = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
      this._drawBtnBg(bg, x, y, w, h, false);
      this._objs.push(bg);
      this._objs.push(
        this.scene.add
          .text(x, y, '← BACK', { fontSize: '16px', fontFamily: FONT, color: '#ffffff' })
          .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2),
      );
      const zone = this.scene.add
        .zone(x, y, w, h)
        .setScrollFactor(0).setDepth(DEPTH + 3)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', this.callbacks.onClose);
      zone.on('pointerover', () => { bg.clear(); this._drawBtnBg(bg, x, y, w, h, true);  });
      zone.on('pointerout',  () => { bg.clear(); this._drawBtnBg(bg, x, y, w, h, false); });
      this._objs.push(zone);
    }
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
