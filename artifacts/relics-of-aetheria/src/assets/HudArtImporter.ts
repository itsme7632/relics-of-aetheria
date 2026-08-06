/**
 * HudArtImporter — M20A
 *
 * Checks which HUD sprite textures are present.  HudDisplay reads
 * isHeartSpriteLoaded() and isCrystalIconLoaded() to decide whether to
 * draw with procedural Graphics or production Image sprites.
 *
 * Delivery spec:
 *   assets/ui/heart.png        — full red heart,  24×24 px  (key: UI_HEART)
 *   assets/ui/heart_empty.png  — grey empty heart, 24×24 px  (key: UI_HEART_EMPTY)
 *   assets/ui/crystal_icon.png — crystal icon,    16×16 px  (key: UI_CRYSTAL_ICON)
 *   assets/ui/panel.png        — 9-slice panel bg            (key: UI_PANEL)
 *   assets/ui/button_normal.png— button idle state           (key: UI_BUTTON_NORMAL)
 *   assets/ui/button_hover.png — button hover state          (key: UI_BUTTON_HOVER)
 *
 * To deliver artwork:
 *   1. Drop the PNGs at the paths above.
 *   2. Remove optional: true from each entry in AssetManifest.ts.
 *   3. HudDisplay switches to sprite hearts / icon automatically.
 */

import Phaser from 'phaser';
import { AssetKeys } from './AssetKeys';
import type { ArtCategoryStatus } from './ProductionArtRegistry';

const HUD_KEYS: readonly string[] = [
  AssetKeys.UI_HEART,
  AssetKeys.UI_HEART_EMPTY,
  AssetKeys.UI_CRYSTAL_ICON,
  AssetKeys.UI_PANEL,
  AssetKeys.UI_BUTTON_NORMAL,
  AssetKeys.UI_BUTTON_HOVER,
];

export class HudArtImporter {
  static isKeyLoaded(scene: Phaser.Scene, key: string): boolean {
    return scene.textures.exists(key) && scene.textures.get(key).key !== '__MISSING';
  }

  /**
   * True when both heart variants are present.
   * HudDisplay uses Image sprites for hearts when this returns true.
   */
  static isHeartSpriteLoaded(scene: Phaser.Scene): boolean {
    return (
      this.isKeyLoaded(scene, AssetKeys.UI_HEART) &&
      this.isKeyLoaded(scene, AssetKeys.UI_HEART_EMPTY)
    );
  }

  /**
   * True when the crystal icon sprite is available.
   * HudDisplay shows an Image prefix when this returns true.
   */
  static isCrystalIconLoaded(scene: Phaser.Scene): boolean {
    return this.isKeyLoaded(scene, AssetKeys.UI_CRYSTAL_ICON);
  }

  /** Build a ProductionArtRegistry-compatible status entry. */
  static getStatus(scene: Phaser.Scene): ArtCategoryStatus {
    const loadedKeys:  string[] = [];
    const missingKeys: string[] = [];
    for (const key of HUD_KEYS) {
      (this.isKeyLoaded(scene, key) ? loadedKeys : missingKeys).push(key);
    }
    const source: ArtCategoryStatus['source'] =
      loadedKeys.length === 0    ? 'procedural'
      : missingKeys.length === 0 ? 'production'
      : 'partial';
    return {
      label:        'HUD Art',
      source,
      loadedKeys,
      missingKeys,
      fallbackDesc: source !== 'production' ? 'Procedural Graphics hearts + Text counter' : '',
    };
  }
}
