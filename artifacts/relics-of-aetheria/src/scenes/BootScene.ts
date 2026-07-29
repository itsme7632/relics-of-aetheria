import Phaser from 'phaser';
import { WorldManager } from '../world/WorldManager';
import { AssetLoader } from '../assets/AssetLoader';
import { AssetValidator } from '../assets/AssetValidator';
import { AssetCatalog } from '../assets/AssetCatalog';
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
 *   1. generateTilesetTexture   — procedural placeholder tileset (M14: expanded)
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
    // Generate the procedural placeholder tileset.
    // M14: Expanded from 8 → 32 tiles to support jungle environment asset types.
    // Replace this call with a real PNG load once artwork arrives.
    this.generateTilesetTexture();

    // Generate the procedural Kai placeholder sprite (32×48 px character).
    // Remove this call when the real spritesheet is added to the asset manifest.
    PlayerSpriteFactory.createPlaceholderTexture(this);

    // Validate what actually loaded; logs warnings for missing required assets.
    AssetValidator.validate(this);

    // Register animations for any textures that are already in the cache.
    // Animations whose textures are absent are queued as "pending artwork".
    AnimationFactory.registerAll(this);

    // M12: Enrich catalog entries with runtime validation status.
    // Updates each entry's validationStatus (loaded / missing_optional /
    // missing_required / frame_error) and populates per-category stats
    // for the F7 debug overlay.
    AssetCatalog.instance.validateRuntime(this);

    // Validate the Kai spritesheet if it has been delivered.
    // Safe no-op when the file is absent — logs success or warnings when present.
    PlayerSpriteImporter.validate(this);

    this.scene.start('GameScene', { levelId: WorldManager.startingLevelId });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  /**
   * M14: Expanded procedural placeholder tileset — 32 tiles at 32×32 px (1024×32).
   *
   * The texture key comes from AssetKeys.TILESET_WORLD01 ('tiles') which must
   * match the tilesetKey in LevelManifest.  Replace the generateTexture() call
   * with a real PNG load (scene.load.image) once production artwork arrives.
   *
   * Tile layout (GID = 1-based index):
   *   GID  1  — Ground/solid            (dark navy + top highlight)
   *   GID  2  — Platform                (lighter + thin top edge)
   *   GID  3  — Temple block            (stone grey)
   *   GID  4  — Stone wall              (dark stone)
   *   GID  5  — Cracked ruins           (brownish stone)
   *   GID  6  — Grass                   (mid green)
   *   GID  7  — Moss                    (dark green)
   *   GID  8  — Water frame 1           (animated — deep blue)
   *   GID  9  — Water frame 2           (animated — lighter ripple)
   *   GID 10  — Water frame 3           (animated — bright ripple)
   *   GID 11  — Waterfall frame 1       (animated)
   *   GID 12  — Waterfall frame 2       (animated)
   *   GID 13  — Waterfall frame 3       (animated)
   *   GID 14  — Torch flame frame 1     (animated — dark orange)
   *   GID 15  — Torch flame frame 2     (animated — bright orange)
   *   GID 16  — Torch flame frame 3     (animated — yellow peak)
   *   GID 17  — Crystal shimmer frame 1 (animated — cyan)
   *   GID 18  — Crystal shimmer frame 2 (animated — bright cyan)
   *   GID 19  — Crystal shimmer frame 3 (animated — white flash)
   *   GID 20  — Leaves frame 1          (animated — mid green)
   *   GID 21  — Leaves frame 2          (animated — light green)
   *   GID 22  — Leaves frame 3          (animated — pale green)
   *   GID 23  — Plant / fern            (decoration)
   *   GID 24  — Flower                  (decoration)
   *   GID 25  — Root                    (decoration)
   *   GID 26  — Broken statue           (decoration)
   *   GID 27  — Skull                   (decoration)
   *   GID 28  — Rock                    (decoration)
   *   GID 29  — Temple carving          (decoration)
   *   GID 30  — Fallen pillar           (decoration)
   *   GID 31  — Wooden bridge           (structural)
   *   GID 32  — Reserved                (near-black filler)
   */
  private generateTilesetTexture(): void {
    const TILE = 32;
    const COLS = 32;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Helper: draw a single tile at column col (0-based)
    const tx = (col: number) => col * TILE;

    // ── Structural tiles (GIDs 1–7) ──────────────────────────────────────────

    // GID 1: Ground tile
    g.fillStyle(0x1a1a40);
    g.fillRect(tx(0), 0, TILE, TILE);
    g.fillStyle(0x3a3a7a);
    g.fillRect(tx(0) + 1, 1, TILE - 2, 5);

    // GID 2: Platform tile
    g.fillStyle(0x252550);
    g.fillRect(tx(1), 0, TILE, TILE);
    g.fillStyle(0x5555aa);
    g.fillRect(tx(1) + 1, 1, TILE - 2, 3);

    // GID 3: Temple block
    g.fillStyle(0x6b6b7a);
    g.fillRect(tx(2), 0, TILE, TILE);
    g.fillStyle(0x8a8a9a);
    g.fillRect(tx(2) + 1, 1, TILE - 2, 4);
    g.fillStyle(0x4a4a58);
    g.fillRect(tx(2) + 1, TILE - 4, TILE - 2, 3);

    // GID 4: Stone wall
    g.fillStyle(0x404050);
    g.fillRect(tx(3), 0, TILE, TILE);
    g.fillStyle(0x303040);
    g.fillRect(tx(3), 16, TILE, 1);  // mortar line
    g.fillRect(tx(3) + 16, 0, 1, 16);
    g.fillRect(tx(3), 16, 16, 1);

    // GID 5: Cracked ruins
    g.fillStyle(0x7a6a50);
    g.fillRect(tx(4), 0, TILE, TILE);
    g.fillStyle(0x5a4a38);
    g.lineStyle(1, 0x3a2a1a, 0.9);
    g.beginPath();
    g.moveTo(tx(4) + 8, 4);
    g.lineTo(tx(4) + 14, 18);
    g.lineTo(tx(4) + 10, 28);
    g.strokePath();

    // GID 6: Grass
    g.fillStyle(0x3a7a2a);
    g.fillRect(tx(5), 0, TILE, TILE);
    g.fillStyle(0x4a9a38);
    g.fillRect(tx(5) + 1, 1, TILE - 2, 6);
    g.fillStyle(0x2a5a1a);
    g.fillRect(tx(5) + 1, 7, TILE - 2, TILE - 8);

    // GID 7: Moss
    g.fillStyle(0x2a5a20);
    g.fillRect(tx(6), 0, TILE, TILE);
    g.fillStyle(0x3a7a2a);
    for (let i = 0; i < 6; i++) {
      g.fillCircle(tx(6) + 4 + i * 5, 6 + (i % 2) * 3, 4);
    }

    // ── Water animation frames (GIDs 8–10) ───────────────────────────────────

    // GID 8: Water frame 1 (deep)
    g.fillStyle(0x1a4a8a);
    g.fillRect(tx(7), 0, TILE, TILE);
    g.fillStyle(0x2a5a9a, 0.6);
    g.fillRect(tx(7) + 2, 8, TILE - 4, 4);
    g.fillRect(tx(7) + 4, 18, TILE - 8, 3);

    // GID 9: Water frame 2 (ripple mid)
    g.fillStyle(0x1a5a9a);
    g.fillRect(tx(8), 0, TILE, TILE);
    g.fillStyle(0x3a7abf, 0.7);
    g.fillRect(tx(8),     6, TILE, 4);
    g.fillRect(tx(8) + 6, 16, TILE - 12, 3);

    // GID 10: Water frame 3 (bright ripple)
    g.fillStyle(0x2060aa);
    g.fillRect(tx(9), 0, TILE, TILE);
    g.fillStyle(0x50a0e0, 0.8);
    g.fillRect(tx(9) + 2, 4, TILE - 4, 5);
    g.fillRect(tx(9),    14, TILE,     3);
    g.fillRect(tx(9) + 4, 22, TILE - 8, 3);

    // ── Waterfall animation frames (GIDs 11–13) ──────────────────────────────

    // GID 11: Waterfall frame 1
    g.fillStyle(0x2050aa);
    g.fillRect(tx(10), 0, TILE, TILE);
    g.fillStyle(0x70b0f0, 0.8);
    g.fillRect(tx(10) + 6, 0, 4, TILE);
    g.fillRect(tx(10) + 18, 0, 4, TILE);

    // GID 12: Waterfall frame 2 (shifted)
    g.fillStyle(0x2050aa);
    g.fillRect(tx(11), 0, TILE, TILE);
    g.fillStyle(0x70b0f0, 0.8);
    g.fillRect(tx(11) + 4, 0, 4, TILE);
    g.fillRect(tx(11) + 20, 0, 4, TILE);

    // GID 13: Waterfall frame 3
    g.fillStyle(0x2050aa);
    g.fillRect(tx(12), 0, TILE, TILE);
    g.fillStyle(0x70b0f0, 0.8);
    g.fillRect(tx(12) + 8, 0, 4, TILE);
    g.fillRect(tx(12) + 16, 0, 4, TILE);

    // ── Torch flame animation frames (GIDs 14–16) ────────────────────────────

    // GID 14: Torch frame 1 (dark base)
    g.fillStyle(0x0d0d1a);
    g.fillRect(tx(13), 0, TILE, TILE);
    g.fillStyle(0x8a3000);
    g.fillTriangle(tx(13) + 16, 4, tx(13) + 8, 24, tx(13) + 24, 24);
    g.fillStyle(0x5a2000, 0.6);
    g.fillCircle(tx(13) + 16, 24, 6);

    // GID 15: Torch frame 2 (mid orange)
    g.fillStyle(0x0d0d1a);
    g.fillRect(tx(14), 0, TILE, TILE);
    g.fillStyle(0xcc5500);
    g.fillTriangle(tx(14) + 16, 2, tx(14) + 7, 22, tx(14) + 25, 22);
    g.fillStyle(0xaa4400, 0.7);
    g.fillCircle(tx(14) + 16, 22, 7);

    // GID 16: Torch frame 3 (bright peak)
    g.fillStyle(0x0d0d1a);
    g.fillRect(tx(15), 0, TILE, TILE);
    g.fillStyle(0xff8800);
    g.fillTriangle(tx(15) + 16, 0, tx(15) + 6, 20, tx(15) + 26, 20);
    g.fillStyle(0xffcc00, 0.8);
    g.fillTriangle(tx(15) + 16, 4, tx(15) + 11, 18, tx(15) + 21, 18);
    g.fillStyle(0xdd6600, 0.7);
    g.fillCircle(tx(15) + 16, 20, 8);

    // ── Crystal shimmer animation frames (GIDs 17–19) ────────────────────────

    // GID 17: Crystal frame 1 (base cyan)
    g.fillStyle(0x0a1520);
    g.fillRect(tx(16), 0, TILE, TILE);
    g.fillStyle(0x008888);
    g.fillTriangle(tx(16) + 16, 4, tx(16) + 8, 20, tx(16) + 24, 20);
    g.fillTriangle(tx(16) + 16, 28, tx(16) + 8, 20, tx(16) + 24, 20);

    // GID 18: Crystal frame 2 (bright cyan)
    g.fillStyle(0x0a1520);
    g.fillRect(tx(17), 0, TILE, TILE);
    g.fillStyle(0x00cccc);
    g.fillTriangle(tx(17) + 16, 3, tx(17) + 7, 19, tx(17) + 25, 19);
    g.fillTriangle(tx(17) + 16, 29, tx(17) + 7, 19, tx(17) + 25, 19);
    g.fillStyle(0x00ffff, 0.4);
    g.fillCircle(tx(17) + 16, 16, 10);

    // GID 19: Crystal frame 3 (white flash)
    g.fillStyle(0x0a1520);
    g.fillRect(tx(18), 0, TILE, TILE);
    g.fillStyle(0x88ffff);
    g.fillTriangle(tx(18) + 16, 2, tx(18) + 6, 18, tx(18) + 26, 18);
    g.fillTriangle(tx(18) + 16, 30, tx(18) + 6, 18, tx(18) + 26, 18);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(tx(18) + 16, 16, 8);

    // ── Leaves animation frames (GIDs 20–22) ─────────────────────────────────

    // GID 20: Leaves frame 1 (mid green)
    g.fillStyle(0x0a1a05);
    g.fillRect(tx(19), 0, TILE, TILE);
    g.fillStyle(0x287020);
    g.fillEllipse(tx(19) + 12, 12, 20, 12);
    g.fillEllipse(tx(19) + 22, 16, 16, 10);
    g.fillEllipse(tx(19) + 10, 22, 22, 10);

    // GID 21: Leaves frame 2 (light green — slight shift)
    g.fillStyle(0x0a1a05);
    g.fillRect(tx(20), 0, TILE, TILE);
    g.fillStyle(0x349028);
    g.fillEllipse(tx(20) + 13, 10, 20, 12);
    g.fillEllipse(tx(20) + 21, 17, 16, 10);
    g.fillEllipse(tx(20) + 11, 23, 22, 10);

    // GID 22: Leaves frame 3 (pale green)
    g.fillStyle(0x0a1a05);
    g.fillRect(tx(21), 0, TILE, TILE);
    g.fillStyle(0x40a830);
    g.fillEllipse(tx(21) + 11, 13, 20, 12);
    g.fillEllipse(tx(21) + 23, 15, 16, 10);
    g.fillEllipse(tx(21) +  9, 21, 22, 10);

    // ── Decoration tiles (GIDs 23–30) ────────────────────────────────────────

    // GID 23: Plant / fern
    g.fillStyle(0x0a1a05);
    g.fillRect(tx(22), 0, TILE, TILE);
    g.fillStyle(0x2a7020);
    g.fillRect(tx(22) + 15, 12, 2, 18);  // stem
    for (let i = 0; i < 4; i++) {
      const angle = (i / 3) * Math.PI - Math.PI / 2;
      g.fillEllipse(tx(22) + 16 + Math.cos(angle) * 8, 16 + Math.sin(angle) * 6, 12, 6);
    }

    // GID 24: Flower
    g.fillStyle(0x0a1a05);
    g.fillRect(tx(23), 0, TILE, TILE);
    g.fillStyle(0x2a7020);
    g.fillRect(tx(23) + 15, 14, 2, 16);
    g.fillStyle(0xf06090);
    g.fillCircle(tx(23) + 16, 10, 7);
    g.fillStyle(0xffee60);
    g.fillCircle(tx(23) + 16, 10, 3);

    // GID 25: Root
    g.fillStyle(0x0a0a05);
    g.fillRect(tx(24), 0, TILE, TILE);
    g.fillStyle(0x6a4a28);
    g.lineStyle(2, 0x6a4a28, 1);
    g.beginPath();
    g.moveTo(tx(24) + 16, 4);
    g.lineTo(tx(24) + 8, 16);
    g.lineTo(tx(24) + 12, 28);
    g.moveTo(tx(24) + 16, 4);
    g.lineTo(tx(24) + 24, 14);
    g.lineTo(tx(24) + 20, 28);
    g.strokePath();

    // GID 26: Broken statue
    g.fillStyle(0x1a1a1a);
    g.fillRect(tx(25), 0, TILE, TILE);
    g.fillStyle(0x8a8a8a);
    g.fillRect(tx(25) + 10, 6, 12, 14);  // body
    g.fillRect(tx(25) + 12, 20, 8, 8);   // base
    g.fillStyle(0x5a5a5a);
    g.fillRect(tx(25) + 10, 6, 12, 2);   // crack shadow

    // GID 27: Skull
    g.fillStyle(0x1a1a10);
    g.fillRect(tx(26), 0, TILE, TILE);
    g.fillStyle(0xd8d0b0);
    g.fillCircle(tx(26) + 16, 14, 9);
    g.fillRect(tx(26) + 11, 20, 10, 6);  // jaw
    g.fillStyle(0x1a1a10);
    g.fillCircle(tx(26) + 13, 13, 2);    // eye
    g.fillCircle(tx(26) + 19, 13, 2);

    // GID 28: Rock
    g.fillStyle(0x151510);
    g.fillRect(tx(27), 0, TILE, TILE);
    g.fillStyle(0x7a7060);
    g.fillEllipse(tx(27) + 16, 18, 24, 16);
    g.fillStyle(0x9a9080);
    g.fillEllipse(tx(27) + 14, 16, 16, 10);

    // GID 29: Temple carving
    g.fillStyle(0x7a6a50);
    g.fillRect(tx(28), 0, TILE, TILE);
    g.fillStyle(0x5a4a38);
    g.fillRect(tx(28) + 4, 4, 24, 24);   // carved recess
    g.fillStyle(0x9a8a70);
    g.fillRect(tx(28) + 8, 8, 16, 4);    // eye stripe
    g.fillRect(tx(28) + 12, 14, 8, 10);  // lower glyph

    // GID 30: Fallen pillar
    g.fillStyle(0x151515);
    g.fillRect(tx(29), 0, TILE, TILE);
    g.fillStyle(0x8a8a8a);
    g.fillRect(tx(29) + 2, 14, TILE - 4, 10);  // horizontal pillar
    g.fillStyle(0x6a6a6a);
    g.fillRect(tx(29) + 2, 24, TILE - 4, 2);   // shadow

    // ── Structural / other tiles (GIDs 31–32) ───────────────────────────────

    // GID 31: Wooden bridge
    g.fillStyle(0x1a1005);
    g.fillRect(tx(30), 0, TILE, TILE);
    g.fillStyle(0x7a5a28);
    g.fillRect(tx(30) + 1, 10, TILE - 2, 12);   // planks
    g.fillStyle(0x5a4018);
    for (let p = 0; p < 4; p++) {
      g.fillRect(tx(30) + 1 + p * 8, 10, 6, 12);
    }
    g.fillStyle(0x3a2a10);
    g.fillRect(tx(30) + 1, 10, TILE - 2, 2);    // top rail
    g.fillRect(tx(30) + 1, 20, TILE - 2, 2);    // bottom rail

    // GID 32: Reserved (near-black filler)
    g.fillStyle(0x0d0d1a);
    g.fillRect(tx(31), 0, TILE, TILE);

    g.generateTexture(AssetKeys.TILESET_WORLD01, TILE * COLS, TILE);
    g.destroy();
  }
}
