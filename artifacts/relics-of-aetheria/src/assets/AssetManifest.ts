/**
 * AssetManifest
 *
 * Central registry of all loadable art, audio, and font assets.
 * AssetLoader reads this file and calls the appropriate scene.load.*
 * method for each entry.
 *
 * Rules:
 *  - Every asset that gets loaded through Phaser MUST have an entry here.
 *  - Keys MUST come from AssetKeys — never inline strings.
 *  - Tilemaps (JSON) are NOT listed here; they are handled by
 *    WorldManager.preloadAll() because they are tied to the level manifest.
 *  - Procedurally-generated textures (tileset, debug shapes) are NOT listed
 *    here; they are created in BootScene.generateTilesetTexture().
 *  - Set optional: true for assets whose files do not exist yet.
 *    AssetValidator will silently skip them rather than printing warnings.
 *
 * How to add a new asset:
 *  1. Add a key constant to AssetKeys.ts
 *  2. Drop the file into the correct assets/ subfolder
 *  3. Add an entry to ASSET_MANIFEST below
 *  4. Remove optional: true once the file is confirmed present
 */

import {
  PLAYER,
  CRYSTAL,
  ENEMY_SLIME,
  ENEMY_GOBLIN,
  ENEMY_BAT,
  ENEMY_SNAKE,
  EFFECT_DUST_PUFF,
  EFFECT_SPARKLE,
  EFFECT_COLLECT_BURST,
  UI_HEART,
  UI_HEART_EMPTY,
  UI_CRYSTAL_ICON,
  UI_PANEL,
  UI_BUTTON_NORMAL,
  UI_BUTTON_HOVER,
  AUDIO_BGM_JUNGLE,
  AUDIO_BGM_CAVE,
  AUDIO_BGM_RUINS,
  AUDIO_SFX_JUMP,
  AUDIO_SFX_LAND,
  AUDIO_SFX_CRYSTAL_COLLECT,
  AUDIO_SFX_CHECKPOINT,
  AUDIO_SFX_LEVEL_COMPLETE,
  AUDIO_SFX_HURT,
  AUDIO_SFX_DOOR_OPEN,
  FONT_HUD,
  FONT_TITLE,
  BG_WORLD01_SKY,
  BG_WORLD01_CLOUDS,
  BG_WORLD01_MOUNTAINS,
  BG_WORLD01_JUNGLE,
  BG_WORLD01_TREES,
  BG_WORLD01_VINES,
  BG_WORLD01_MIST,
  BG_WORLD01_SUNRAYS,
  WORLD01_BG_PATHS,
  ENEMY_SNAKE_PATHS,
  PARTICLE_DUST,
  PARTICLE_LEAF,
  PARTICLE_SPARK,
  PARTICLE_CRYSTAL,
  PARTICLE_CHECKPOINT,
  PARTICLE_DAMAGE,
} from './AssetKeys';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Discriminated union of asset entry types. */
export type AssetType = 'image' | 'spritesheet' | 'atlas' | 'audio' | 'font';

/** Base fields shared by all asset entries. */
interface AssetEntryBase {
  /** Phaser cache key — must match a constant from AssetKeys.ts. */
  key: string;
  type: AssetType;
  /** Path relative to the web root (public/ or project root, as Vite serves). */
  path: string;
  /**
   * When true, AssetValidator will not emit a warning for a missing file.
   * Use for assets that are planned but whose files do not exist yet.
   */
  optional?: boolean;
}

export interface ImageEntry extends AssetEntryBase {
  type: 'image';
}

export interface SpritesheetEntry extends AssetEntryBase {
  type: 'spritesheet';
  /** Width of a single frame in pixels. */
  frameWidth: number;
  /** Height of a single frame in pixels. */
  frameHeight: number;
  /** Total number of frames (used by AssetValidator). */
  frameCount?: number;
}

export interface AtlasEntry extends AssetEntryBase {
  type: 'atlas';
  /** Path to the JSON atlas descriptor (relative to web root). */
  atlasPath: string;
}

export interface AudioEntry extends AssetEntryBase {
  type: 'audio';
}

export interface FontEntry extends AssetEntryBase {
  type: 'font';
  /** Path to the bitmap font XML descriptor. */
  xmlPath: string;
}

export type AssetEntry =
  | ImageEntry
  | SpritesheetEntry
  | AtlasEntry
  | AudioEntry
  | FontEntry;

// ─── Manifest ─────────────────────────────────────────────────────────────────

/**
 * All game assets that AssetLoader will register with Phaser's loader.
 *
 * Player sprite standard : 32×48 px per frame
 * Tile size standard     : 32×32 px per frame
 */
export const ASSET_MANIFEST: AssetEntry[] = [

  // ── Player (Kai) — assets/characters/ ──────────────────────────────────────
  // 32×48 px frames — horizontal strip, 22 frames total (see AnimationRegistry)
  {
    key:         PLAYER,
    type:        'spritesheet',
    path:        'assets/characters/kai/kai.png',
    frameWidth:  32,
    frameHeight: 48,
    frameCount:  22,
  },

  // ── Collectibles — assets/objects/ ───────────────────────────────────────────
  {
    key:         CRYSTAL,
    type:        'spritesheet',
    path:        'assets/objects/crystal.png',
    frameWidth:  32,
    frameHeight: 32,
  },

  // ── Enemies — assets/enemies/ ────────────────────────────────────────────────
  {
    key:         ENEMY_SLIME,
    type:        'spritesheet',
    path:        'assets/enemies/slime.png',
    frameWidth:  32,
    frameHeight: 32,
    optional:    true,
  },
  {
    key:         ENEMY_GOBLIN,
    type:        'spritesheet',
    path:        'assets/enemies/goblin.png',
    frameWidth:  32,
    frameHeight: 48,
    optional:    true,
  },
  {
    key:         ENEMY_BAT,
    type:        'spritesheet',
    path:        'assets/enemies/bat.png',
    frameWidth:  32,
    frameHeight: 32,
    optional:    true,
  },

  // ── Effects — assets/effects/ ────────────────────────────────────────────────
  {
    key:         EFFECT_DUST_PUFF,
    type:        'spritesheet',
    path:        'assets/effects/dust_puff.png',
    frameWidth:  32,
    frameHeight: 32,
  },
  {
    key:         EFFECT_SPARKLE,
    type:        'spritesheet',
    path:        'assets/effects/sparkle.png',
    frameWidth:  32,
    frameHeight: 32,
  },
  {
    key:         EFFECT_COLLECT_BURST,
    type:        'spritesheet',
    path:        'assets/effects/collect_burst.png',
    frameWidth:  32,
    frameHeight: 32,
  },

  // ── UI — assets/ui/ ───────────────────────────────────────────────────────────
  {
    key:      UI_HEART,
    type:     'image',
    path:     'assets/ui/heart.png',
  },
  {
    key:      UI_CRYSTAL_ICON,
    type:     'image',
    path:     'assets/ui/crystal_icon.png',
  },
  {
    key:      UI_PANEL,
    type:     'image',
    path:     'assets/ui/panel.png',
    optional: true,
  },
  {
    key:      UI_BUTTON_NORMAL,
    type:     'image',
    path:     'assets/ui/button_normal.png',
    optional: true,
  },
  {
    key:      UI_BUTTON_HOVER,
    type:     'image',
    path:     'assets/ui/button_hover.png',
    optional: true,
  },

  // ── Audio — background music — assets/audio/music/ ───────────────────────────
  {
    key:      AUDIO_BGM_JUNGLE,
    type:     'audio',
    path:     'assets/audio/music/jungle.ogg',
    optional: true,
  },
  {
    key:      AUDIO_BGM_CAVE,
    type:     'audio',
    path:     'assets/audio/music/cave.ogg',
    optional: true,
  },
  {
    key:      AUDIO_BGM_RUINS,
    type:     'audio',
    path:     'assets/audio/music/ruins.ogg',
    optional: true,
  },

  // ── Audio — sound effects — assets/audio/sfx/ ───────────────────────────────
  {
    key:      AUDIO_SFX_JUMP,
    type:     'audio',
    path:     'assets/audio/sfx/jump.ogg',
    optional: true,
  },
  {
    key:      AUDIO_SFX_LAND,
    type:     'audio',
    path:     'assets/audio/sfx/land.ogg',
    optional: true,
  },
  {
    key:      AUDIO_SFX_CRYSTAL_COLLECT,
    type:     'audio',
    path:     'assets/audio/sfx/crystal_collect.ogg',
    optional: true,
  },
  {
    key:      AUDIO_SFX_CHECKPOINT,
    type:     'audio',
    path:     'assets/audio/sfx/checkpoint.ogg',
    optional: true,
  },
  {
    key:      AUDIO_SFX_LEVEL_COMPLETE,
    type:     'audio',
    path:     'assets/audio/sfx/level_complete.ogg',
    optional: true,
  },
  {
    key:      AUDIO_SFX_HURT,
    type:     'audio',
    path:     'assets/audio/sfx/hurt.ogg',
    optional: true,
  },
  {
    key:      AUDIO_SFX_DOOR_OPEN,
    type:     'audio',
    path:     'assets/audio/sfx/door_open.ogg',
    optional: true,
  },

  // ── Bitmap fonts — assets/fonts/ ─────────────────────────────────────────────
  {
    key:      FONT_HUD,
    type:     'font',
    path:     'assets/fonts/hud.png',
    xmlPath:  'assets/fonts/hud.xml',
    optional: true,
  },
  {
    key:      FONT_TITLE,
    type:     'font',
    path:     'assets/fonts/title.png',
    xmlPath:  'assets/fonts/title.xml',
    optional: true,
  },

  // ── M20D: Snake enemy spritesheet — assets/enemies/snake/ ────────────────────
  // 32×32 px frames, 18 total — see SnakeSpriteImporter.SNAKE_SPRITE_SPEC
  {
    key:         ENEMY_SNAKE,
    type:        'spritesheet',
    path:        ENEMY_SNAKE_PATHS.spritesheet,
    frameWidth:  32,
    frameHeight: 32,
    frameCount:  18,
  },

  // ── M20B: Background layers — assets/worlds/world01_jungle/backgrounds/ ───────
  // optional: true removed — production PNGs delivered
  { key: BG_WORLD01_SKY,       type: 'image', path: WORLD01_BG_PATHS.sky       },
  { key: BG_WORLD01_CLOUDS,    type: 'image', path: WORLD01_BG_PATHS.clouds    },
  { key: BG_WORLD01_MOUNTAINS, type: 'image', path: WORLD01_BG_PATHS.mountains },
  { key: BG_WORLD01_JUNGLE,    type: 'image', path: WORLD01_BG_PATHS.jungle    },
  { key: BG_WORLD01_TREES,     type: 'image', path: WORLD01_BG_PATHS.trees     },
  { key: BG_WORLD01_VINES,     type: 'image', path: WORLD01_BG_PATHS.vines     },
  { key: BG_WORLD01_MIST,      type: 'image', path: WORLD01_BG_PATHS.mist      },
  { key: BG_WORLD01_SUNRAYS,   type: 'image', path: WORLD01_BG_PATHS.sunrays   },

  // ── M20E: HUD extras — assets/ui/ ────────────────────────────────────────────
  { key: UI_HEART_EMPTY, type: 'image', path: 'assets/ui/heart_empty.png' },

  // ── M20E: Particle sprites — assets/effects/particles/ ───────────────────────
  // All 16×16 px horizontal strips; frame counts in ParticleArtImporter.PARTICLE_ANIM_DEFS
  { key: PARTICLE_DUST,       type: 'spritesheet', path: 'assets/effects/particles/dust.png',       frameWidth: 16, frameHeight: 16, frameCount: 4 },
  { key: PARTICLE_LEAF,       type: 'spritesheet', path: 'assets/effects/particles/leaf.png',       frameWidth: 16, frameHeight: 16, frameCount: 4 },
  { key: PARTICLE_SPARK,      type: 'spritesheet', path: 'assets/effects/particles/spark.png',      frameWidth: 16, frameHeight: 16, frameCount: 3 },
  { key: PARTICLE_CRYSTAL,    type: 'spritesheet', path: 'assets/effects/particles/crystal.png',    frameWidth: 16, frameHeight: 16, frameCount: 4 },
  { key: PARTICLE_CHECKPOINT, type: 'spritesheet', path: 'assets/effects/particles/checkpoint.png', frameWidth: 16, frameHeight: 16, frameCount: 4 },
  { key: PARTICLE_DAMAGE,     type: 'spritesheet', path: 'assets/effects/particles/damage.png',     frameWidth: 16, frameHeight: 16, frameCount: 4 },
];

/** Total number of entries in the manifest (convenience for debug display). */
export const MANIFEST_COUNT = ASSET_MANIFEST.length;
