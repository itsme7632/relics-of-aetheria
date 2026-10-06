/**
 * AssetKeys
 *
 * The single source of truth for every Phaser asset cache key used in the game.
 * No string literals should appear elsewhere in game code — always reference
 * a constant from this file.
 *
 * Naming convention:
 *   TILESET_<WORLD>          — tileset images
 *   MAP_<WORLD>_<LEVEL>      — Tiled JSON maps (keys must match LevelManifest ids)
 *   PLAYER                   — Kai's spritesheet
 *   CRYSTAL                  — crystal collectible spritesheet
 *   ENEMY_<NAME>             — enemy spritesheets
 *   EFFECT_<NAME>            — VFX spritesheets / images
 *   UI_<NAME>                — HUD / menu images
 *   AUDIO_BGM_<NAME>         — background music
 *   AUDIO_SFX_<NAME>         — sound effects
 *   FONT_<NAME>              — bitmap fonts
 *
 * Project standards (locked):
 *   Tile size     : 32×32 px
 *   Player sprite : 32×48 px
 *   Resolution    : 1280×720 px
 */

// ── Tileset keys ─────────────────────────────────────────────────────────────
// These are the Phaser texture cache keys for tileset images.
// The value 'tiles' is the key used by BootScene.generateTilesetTexture()
// and must match the tilesetKey field in LevelManifest.

export const TILESET_WORLD01            = 'tiles'                as const;
export const TILESET_WORLD02            = 'tiles_world02'        as const;

// M16: Optional atlas slots for World 1 production artwork.
// These keys are reserved for future animated-tile and decorative-tile atlases.
// BootScene will attempt to load both; missing files fall back silently.
export const TILESET_WORLD01_ANIM_ATLAS = 'tiles_world01_anim'  as const;
export const TILESET_WORLD01_DECO_ATLAS = 'tiles_world01_deco'  as const;

// ── Production tileset paths (World 1) ───────────────────────────────────────
// Canonical disk paths for all World 1 tileset files.
// BootScene reads these; engine code must not hard-code the paths elsewhere.
export const WORLD01_TILESET_PATHS = {
  /** Main production tileset — 32×32 tiles, 32 columns, 1024×32 px minimum. */
  tileset:   'assets/worlds/world01_jungle/tilesets/tileset.png'      as const,
  /** Animated tile atlas (future delivery). */
  animAtlas: 'assets/worlds/world01_jungle/tilesets/tileset_anim.png' as const,
  /** Decorative tile atlas (future delivery). */
  decoAtlas: 'assets/worlds/world01_jungle/tilesets/tileset_deco.png' as const,
} as const;

// ── Map keys ─────────────────────────────────────────────────────────────────
// Must exactly match the LevelManifest entry ids — WorldManager.preloadAll()
// registers tilemaps using entry.id as the cache key.

export const MAP_WORLD01_LEVEL01 = 'world01_level01' as const;
export const MAP_WORLD01_LEVEL02 = 'world01_level02' as const;

// ── Player (Kai) ──────────────────────────────────────────────────────────────
// 32×48 px frames; exact column count determined by spritesheet layout.

export const PLAYER = 'player' as const;

// ── Collectibles ─────────────────────────────────────────────────────────────

export const CRYSTAL = 'crystal' as const;

// ── Enemies ───────────────────────────────────────────────────────────────────

export const ENEMY_SLIME   = 'enemy_slime'   as const;
export const ENEMY_GOBLIN  = 'enemy_goblin'  as const;
export const ENEMY_BAT     = 'enemy_bat'     as const;

// ── Effects ───────────────────────────────────────────────────────────────────

export const EFFECT_DUST_PUFF     = 'effect_dust_puff'     as const;
export const EFFECT_SPARKLE       = 'effect_sparkle'       as const;
export const EFFECT_COLLECT_BURST = 'effect_collect_burst' as const;

// ── Interactable objects (Phase 3A) ──────────────────────────────────────────

export const OBJECT_CHECKPOINT = 'object_checkpoint' as const;
export const OBJECT_LEVEL_EXIT = 'object_level_exit' as const;

// ── UI ────────────────────────────────────────────────────────────────────────

export const UI_HEART          = 'ui_heart'          as const;
export const UI_CRYSTAL_ICON   = 'ui_crystal_icon'   as const;
export const UI_PANEL          = 'ui_panel'          as const;
export const UI_BUTTON_NORMAL  = 'ui_button_normal'  as const;
export const UI_BUTTON_HOVER   = 'ui_button_hover'   as const;

// ── Audio — background music ──────────────────────────────────────────────────

export const AUDIO_BGM_JUNGLE  = 'bgm_jungle'  as const;
export const AUDIO_BGM_CAVE    = 'bgm_cave'    as const;
export const AUDIO_BGM_RUINS   = 'bgm_ruins'   as const;

// ── Audio — sound effects ─────────────────────────────────────────────────────

export const AUDIO_SFX_JUMP           = 'sfx_jump'           as const;
export const AUDIO_SFX_LAND          = 'sfx_land'           as const;
export const AUDIO_SFX_CRYSTAL_COLLECT = 'sfx_crystal_collect' as const;
export const AUDIO_SFX_CHECKPOINT    = 'sfx_checkpoint'     as const;
export const AUDIO_SFX_LEVEL_COMPLETE = 'sfx_level_complete' as const;
export const AUDIO_SFX_HURT          = 'sfx_hurt'           as const;
export const AUDIO_SFX_DOOR_OPEN     = 'sfx_door_open'      as const;

// ── Bitmap fonts ──────────────────────────────────────────────────────────────

export const FONT_HUD   = 'font_hud'   as const;
export const FONT_TITLE = 'font_title' as const;

// ── M20A: Snake enemy spritesheet ─────────────────────────────────────────────
export const ENEMY_SNAKE = 'enemy_snake' as const;

/** Canonical disk path for the snake enemy spritesheet. */
export const ENEMY_SNAKE_PATHS = {
  spritesheet: 'assets/enemies/snake/snake.png',
} as const;

// ── M20A: Background layers — World 1 Jungle ──────────────────────────────────
export const BG_WORLD01_SKY       = 'bg_w01_sky'       as const;
export const BG_WORLD01_CLOUDS    = 'bg_w01_clouds'    as const;
export const BG_WORLD01_MOUNTAINS = 'bg_w01_mountains' as const;
export const BG_WORLD01_JUNGLE    = 'bg_w01_jungle'    as const;
export const BG_WORLD01_TREES     = 'bg_w01_trees'     as const;
export const BG_WORLD01_VINES     = 'bg_w01_vines'     as const;
export const BG_WORLD01_MIST      = 'bg_w01_mist'      as const;
export const BG_WORLD01_SUNRAYS   = 'bg_w01_sunrays'   as const;

/** Canonical disk paths for World 1 background layer images. */
export const WORLD01_BG_PATHS = {
  sky:       'assets/worlds/world01_jungle/backgrounds/sky.png'       as const,
  clouds:    'assets/worlds/world01_jungle/backgrounds/clouds.png'    as const,
  mountains: 'assets/worlds/world01_jungle/backgrounds/mountains.png' as const,
  jungle:    'assets/worlds/world01_jungle/backgrounds/jungle.png'    as const,
  trees:     'assets/worlds/world01_jungle/backgrounds/trees.png'     as const,
  vines:     'assets/worlds/world01_jungle/backgrounds/vines.png'     as const,
  mist:      'assets/worlds/world01_jungle/backgrounds/mist.png'      as const,
  sunrays:   'assets/worlds/world01_jungle/backgrounds/sunrays.png'   as const,
} as const;

// ── M20A: HUD extras ──────────────────────────────────────────────────────────
/** Grey empty-heart sprite (companion to UI_HEART). */
export const UI_HEART_EMPTY = 'ui_heart_empty' as const;

// ── M20A: Particle sprites ────────────────────────────────────────────────────
export const PARTICLE_DUST        = 'particle_dust'        as const;
export const PARTICLE_LEAF        = 'particle_leaf'        as const;
export const PARTICLE_SPARK       = 'particle_spark'       as const;
export const PARTICLE_CRYSTAL     = 'particle_crystal'     as const;
export const PARTICLE_CHECKPOINT  = 'particle_checkpoint'  as const;
export const PARTICLE_DAMAGE      = 'particle_damage'      as const;

// ── Namespace object (optional convenience import) ────────────────────────────
// Import as: import { AssetKeys } from '../assets/AssetKeys';
// Usage: AssetKeys.PLAYER, AssetKeys.TILESET_WORLD01, etc.

export const AssetKeys = {
  // Tilesets
  TILESET_WORLD01,
  TILESET_WORLD02,
  TILESET_WORLD01_ANIM_ATLAS,
  TILESET_WORLD01_DECO_ATLAS,

  // Production tileset paths (M16)
  WORLD01_TILESET_PATHS,

  // Maps
  MAP_WORLD01_LEVEL01,
  MAP_WORLD01_LEVEL02,

  // Player
  PLAYER,

  // Collectibles
  CRYSTAL,

  // Enemies
  ENEMY_SLIME,
  ENEMY_GOBLIN,
  ENEMY_BAT,
  ENEMY_SNAKE,           // M20A
  ENEMY_SNAKE_PATHS,     // M20A

  // Effects
  EFFECT_DUST_PUFF,
  EFFECT_SPARKLE,
  EFFECT_COLLECT_BURST,

  // Interactable objects (Phase 3A)
  OBJECT_CHECKPOINT,
  OBJECT_LEVEL_EXIT,

  // UI
  UI_HEART,
  UI_HEART_EMPTY,        // M20A
  UI_CRYSTAL_ICON,
  UI_PANEL,
  UI_BUTTON_NORMAL,
  UI_BUTTON_HOVER,

  // BGM
  AUDIO_BGM_JUNGLE,
  AUDIO_BGM_CAVE,
  AUDIO_BGM_RUINS,

  // SFX
  AUDIO_SFX_JUMP,
  AUDIO_SFX_LAND,
  AUDIO_SFX_CRYSTAL_COLLECT,
  AUDIO_SFX_CHECKPOINT,
  AUDIO_SFX_LEVEL_COMPLETE,
  AUDIO_SFX_HURT,
  AUDIO_SFX_DOOR_OPEN,

  // Fonts
  FONT_HUD,
  FONT_TITLE,

  // M20A: Background layers
  BG_WORLD01_SKY,
  BG_WORLD01_CLOUDS,
  BG_WORLD01_MOUNTAINS,
  BG_WORLD01_JUNGLE,
  BG_WORLD01_TREES,
  BG_WORLD01_VINES,
  BG_WORLD01_MIST,
  BG_WORLD01_SUNRAYS,
  WORLD01_BG_PATHS,

  // M20A: Particles
  PARTICLE_DUST,
  PARTICLE_LEAF,
  PARTICLE_SPARK,
  PARTICLE_CRYSTAL,
  PARTICLE_CHECKPOINT,
  PARTICLE_DAMAGE,
} as const;

export type AssetKey = (typeof AssetKeys)[keyof typeof AssetKeys];
