import Phaser from 'phaser';
import { WorldManager } from '../world/WorldManager';
import { AssetLoader } from '../assets/AssetLoader';
import { AssetValidator } from '../assets/AssetValidator';
import { AnimationFactory } from '../animation/AnimationFactory';
import { AssetKeys } from '../assets/AssetKeys';
import { PlayerSpriteFactory } from '../entities/player/PlayerSpriteFactory';
import { PlayerSpriteImporter } from '../entities/player/PlayerSpriteImporter';

/**
 * BootScene
 *
 * Preloads all assets and generates placeholder textures before handing
 * off to GameScene.
 *
 * Load order:
 *   1. WorldManager.preloadAll  — registers all Tiled map JSON files
 *   2. AssetLoader.loadAll      — registers all art/audio/font assets
 *      (all entries currently optional; no crashes if files are absent)
 *
 * Create order:
 *   1. generateTilesetTexture   — procedural placeholder tileset
 *   2. AssetValidator.validate  — checks cache, reports missing assets
 *   3. AnimationFactory.registerAll — registers anims whose textures exist
 *   4. scene.start('GameScene') — begin gameplay
 *
 * Future: add a progress bar using this.load.on('progress', ...) here.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Register every map JSON file declared in LevelManifest
    WorldManager.preloadAll(this);

    // Register all art, audio, and font assets from the central manifest.
    // Files that don't exist yet are silently tolerated (optional: true).
    AssetLoader.loadAll(this);
  }

  create(): void {
    // Generate the procedural placeholder tileset so maps render without
    // real art.  Replace this call with a real PNG load once artwork arrives.
    this.generateTilesetTexture();

    // Generate the procedural Kai placeholder sprite (32×48 px character).
    // Remove this call when the real spritesheet is added to the asset manifest.
    PlayerSpriteFactory.createPlaceholderTexture(this);

    // Validate what actually loaded; logs warnings for missing required assets.
    AssetValidator.validate(this);

    // Register animations for any textures that are already in the cache.
    // Animations whose textures are absent are queued as "pending artwork".
    AnimationFactory.registerAll(this);

    // Validate the Kai spritesheet if it has been delivered.
    // Safe no-op when the file is absent — logs success or warnings when present.
    PlayerSpriteImporter.validate(this);

    this.scene.start('GameScene', { levelId: WorldManager.startingLevelId });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  /**
   * Creates the tileset texture procedurally (256×32, 8 tiles of 32×32).
   *
   * The texture key comes from AssetKeys.TILESET_WORLD01 ('tiles') which
   * must match the tilesetKey field in LevelManifest for world01 levels.
   *
   * GID 1 = ground/solid tile   (dark navy with top highlight)
   * GID 2 = platform tile       (lighter with thin top edge)
   * GIDs 3-8 = reserved         (near-black filler)
   */
  private generateTilesetTexture(): void {
    const TILE = 32;
    const COLS = 8;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // GID 1: Ground tile — dark navy with a top highlight
    g.fillStyle(0x1a1a40);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x3a3a7a);
    g.fillRect(1, 1, TILE - 2, 5);

    // GID 2: Platform tile — slightly lighter with a thin top edge
    g.fillStyle(0x252550);
    g.fillRect(TILE, 0, TILE, TILE);
    g.fillStyle(0x5555aa);
    g.fillRect(TILE + 1, 1, TILE - 2, 3);

    // GIDs 3–8: Reserved (near-black filler)
    g.fillStyle(0x0d0d1a);
    for (let i = 2; i < COLS; i++) {
      g.fillRect(i * TILE, 0, TILE, TILE);
    }

    g.generateTexture(AssetKeys.TILESET_WORLD01, TILE * COLS, TILE);
    g.destroy();
  }
}
