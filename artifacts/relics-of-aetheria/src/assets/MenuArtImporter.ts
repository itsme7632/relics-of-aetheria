/**
 * MenuArtImporter — M20A
 *
 * Checks which menu / UI panel textures are present.  Menu screens
 * (PauseMenu, GameOverScreen, LevelCompleteScreen, SettingsMenu) read
 * isPanelLoaded() / isButtonLoaded() to decide Graphics vs. Image rendering.
 *
 * Delivery spec:
 *   assets/ui/panel.png         — 9-slice panel background  (key: UI_PANEL)
 *   assets/ui/button_normal.png — button idle state         (key: UI_BUTTON_NORMAL)
 *   assets/ui/button_hover.png  — button hover/active state (key: UI_BUTTON_HOVER)
 *
 * To deliver artwork:
 *   1. Drop PNGs at the paths above.
 *   2. Remove optional: true from matching entries in AssetManifest.ts.
 *   3. Menu screens switch to Image-based rendering automatically.
 */

import Phaser from 'phaser';
import { AssetKeys } from './AssetKeys';
import type { ArtCategoryStatus } from './ProductionArtRegistry';

const MENU_KEYS: readonly string[] = [
  AssetKeys.UI_PANEL,
  AssetKeys.UI_BUTTON_NORMAL,
  AssetKeys.UI_BUTTON_HOVER,
];

export class MenuArtImporter {
  static isKeyLoaded(scene: Phaser.Scene, key: string): boolean {
    return scene.textures.exists(key) && scene.textures.get(key).key !== '__MISSING';
  }

  /** True when the panel background image is available. */
  static isPanelLoaded(scene: Phaser.Scene): boolean {
    return this.isKeyLoaded(scene, AssetKeys.UI_PANEL);
  }

  /** True when both button states are available. */
  static isButtonLoaded(scene: Phaser.Scene): boolean {
    return (
      this.isKeyLoaded(scene, AssetKeys.UI_BUTTON_NORMAL) &&
      this.isKeyLoaded(scene, AssetKeys.UI_BUTTON_HOVER)
    );
  }

  /** Build a ProductionArtRegistry-compatible status entry. */
  static getStatus(scene: Phaser.Scene): ArtCategoryStatus {
    const loadedKeys:  string[] = [];
    const missingKeys: string[] = [];
    for (const key of MENU_KEYS) {
      (this.isKeyLoaded(scene, key) ? loadedKeys : missingKeys).push(key);
    }
    const source: ArtCategoryStatus['source'] =
      loadedKeys.length === 0    ? 'procedural'
      : missingKeys.length === 0 ? 'production'
      : 'partial';
    return {
      label:        'Menu Art',
      source,
      loadedKeys,
      missingKeys,
      fallbackDesc: source !== 'production' ? 'Procedural Graphics panels + buttons' : '',
    };
  }
}
