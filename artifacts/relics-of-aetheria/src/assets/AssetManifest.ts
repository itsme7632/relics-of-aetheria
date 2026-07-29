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
  EFFECT_DUST_PUFF,
  EFFECT_SPARKLE,
  EFFECT_COLLECT_BURST,
  UI_HEART,
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

  // ── Player (Kai) ────────────────────────────────────────────────────────────
  // 32×48 px frames — exact column count depends on delivered spritesheet
  {
    key:         PLAYER,
    type:        'spritesheet',
    path:        'assets/sprites/kai/kai.png',
    frameWidth:  32,
    frameHeight: 48,
    optional:    true,   // artwork not yet delivered
  },

  // ── Collectibles ─────────────────────────────────────────────────────────────
  {
    key:         CRYSTAL,
    type:        'spritesheet',
    path:        'assets/sprites/objects/crystal.png',
    frameWidth:  32,
    frameHeight: 32,
    optional:    true,
  },

  // ── Enemies ──────────────────────────────────────────────────────────────────
  {
    key:         ENEMY_SLIME,
    type:        'spritesheet',
    path:        'assets/sprites/enemies/slime.png',
    frameWidth:  32,
    frameHeight: 32,
    optional:    true,
  },
  {
    key:         ENEMY_GOBLIN,
    type:        'spritesheet',
    path:        'assets/sprites/enemies/goblin.png',
    frameWidth:  32,
    frameHeight: 48,
    optional:    true,
  },
  {
    key:         ENEMY_BAT,
    type:        'spritesheet',
    path:        'assets/sprites/enemies/bat.png',
    frameWidth:  32,
    frameHeight: 32,
    optional:    true,
  },

  // ── Effects ───────────────────────────────────────────────────────────────────
  {
    key:         EFFECT_DUST_PUFF,
    type:        'spritesheet',
    path:        'assets/sprites/effects/dust_puff.png',
    frameWidth:  32,
    frameHeight: 32,
    optional:    true,
  },
  {
    key:         EFFECT_SPARKLE,
    type:        'spritesheet',
    path:        'assets/sprites/effects/sparkle.png',
    frameWidth:  32,
    frameHeight: 32,
    optional:    true,
  },
  {
    key:         EFFECT_COLLECT_BURST,
    type:        'spritesheet',
    path:        'assets/sprites/effects/collect_burst.png',
    frameWidth:  32,
    frameHeight: 32,
    optional:    true,
  },

  // ── UI ────────────────────────────────────────────────────────────────────────
  {
    key:      UI_HEART,
    type:     'image',
    path:     'assets/ui/heart.png',
    optional: true,
  },
  {
    key:      UI_CRYSTAL_ICON,
    type:     'image',
    path:     'assets/ui/crystal_icon.png',
    optional: true,
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

  // ── Audio — background music ──────────────────────────────────────────────────
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

  // ── Audio — sound effects ─────────────────────────────────────────────────────
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

  // ── Bitmap fonts ──────────────────────────────────────────────────────────────
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
];

/** Total number of entries in the manifest (convenience for debug display). */
export const MANIFEST_COUNT = ASSET_MANIFEST.length;
