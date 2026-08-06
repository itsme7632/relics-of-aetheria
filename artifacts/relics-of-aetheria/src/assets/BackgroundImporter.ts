/**
 * BackgroundImporter — M20A
 *
 * Checks which World 1 jungle background layer images are present in the
 * Phaser cache.  buildParallaxLayers() reads isLayerLoaded() per key to
 * decide whether to use a production TileSprite or the procedural Graphics
 * fallback for each individual layer.
 *
 * Partial production support is intentional: you can deliver one layer
 * at a time and the engine will use production art for whichever layers
 * are present while keeping procedural for the rest.
 *
 * Delivery spec (folder: assets/worlds/world01_jungle/backgrounds/):
 *
 *   sky.png        full-width PNG, depth -25, scrollFactor X=0.02
 *   clouds.png     full-width PNG, depth -22, scrollFactor X=0.015
 *   mountains.png  full-width PNG, depth -20, scrollFactor X=0.06
 *   jungle.png     full-width PNG, depth -15, scrollFactor X=0.14
 *   trees.png      full-width PNG, depth -12, scrollFactor X=0.20
 *   vines.png      full-width PNG, depth  -5, scrollFactor X=0.28
 *   mist.png       full-width PNG, depth  -4, scrollFactor X=0.10  (overlay)
 *   sunrays.png    full-width PNG, depth  -3, scrollFactor X=0.05  (overlay)
 *
 * Each PNG is tiled horizontally to fill levelWidth + 1280 px.
 *
 * To deliver artwork:
 *   1. Drop the PNGs at the paths above (create the folder first).
 *   2. Remove optional: true from the matching entries in AssetManifest.ts.
 *   3. buildParallaxLayers() switches to TileSprite rendering automatically.
 */

import Phaser from 'phaser';
import { AssetKeys } from './AssetKeys';
import type { ArtCategoryStatus } from './ProductionArtRegistry';

/** All eight background layer keys, in back-to-front depth order. */
export const BG_LAYER_KEYS: readonly string[] = [
  AssetKeys.BG_WORLD01_SKY,
  AssetKeys.BG_WORLD01_CLOUDS,
  AssetKeys.BG_WORLD01_MOUNTAINS,
  AssetKeys.BG_WORLD01_JUNGLE,
  AssetKeys.BG_WORLD01_TREES,
  AssetKeys.BG_WORLD01_VINES,
  AssetKeys.BG_WORLD01_MIST,
  AssetKeys.BG_WORLD01_SUNRAYS,
];

export class BackgroundImporter {
  /** True when the named texture key is confirmed in the Phaser cache. */
  static isLayerLoaded(scene: Phaser.Scene, key: string): boolean {
    return scene.textures.exists(key) && scene.textures.get(key).key !== '__MISSING';
  }

  /** Build a ProductionArtRegistry-compatible status entry. */
  static getStatus(scene: Phaser.Scene): ArtCategoryStatus {
    const loadedKeys:  string[] = [];
    const missingKeys: string[] = [];
    for (const key of BG_LAYER_KEYS) {
      (this.isLayerLoaded(scene, key) ? loadedKeys : missingKeys).push(key);
    }
    const source: ArtCategoryStatus['source'] =
      loadedKeys.length === 0             ? 'procedural'
      : missingKeys.length === 0          ? 'production'
      : 'partial';
    return {
      label:        'Background Layers',
      source,
      loadedKeys,
      missingKeys,
      fallbackDesc: source !== 'production'
        ? `Procedural Graphics parallax (${missingKeys.length} layer(s) procedural)`
        : '',
    };
  }
}
