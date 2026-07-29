/**
 * AnimationKeys
 *
 * The single source of truth for every Phaser animation key used in the game.
 * No animation key strings should appear anywhere else — always reference
 * a constant from this file.
 *
 * Naming convention:
 *   <ENTITY>_<STATE>
 *
 * These keys are registered with scene.anims.create() by AnimationFactory.
 * They are safe to reference before artwork exists — AnimationFactory
 * will skip registration if the source texture is not yet loaded, and
 * register automatically once the artwork is delivered.
 */

// ── Player (Kai) animations ───────────────────────────────────────────────────

export const PLAYER_IDLE      = 'player_idle'      as const;
export const PLAYER_RUN       = 'player_run'        as const;
export const PLAYER_JUMP      = 'player_jump'       as const;
export const PLAYER_FALL      = 'player_fall'       as const;
export const PLAYER_LAND      = 'player_land'       as const;
export const PLAYER_CLIMB     = 'player_climb'      as const;
export const PLAYER_PUSH      = 'player_push'       as const;
export const PLAYER_HURT      = 'player_hurt'       as const;
export const PLAYER_CELEBRATE = 'player_celebrate'  as const;

// ── Crystal animations ────────────────────────────────────────────────────────

export const CRYSTAL_IDLE    = 'crystal_idle'    as const;
export const CRYSTAL_COLLECT = 'crystal_collect' as const;

// ── Enemy — Slime ─────────────────────────────────────────────────────────────

export const ENEMY_SLIME_IDLE   = 'enemy_slime_idle'   as const;
export const ENEMY_SLIME_MOVE   = 'enemy_slime_move'   as const;
export const ENEMY_SLIME_HURT   = 'enemy_slime_hurt'   as const;
export const ENEMY_SLIME_DEATH  = 'enemy_slime_death'  as const;

// ── Enemy — Goblin ────────────────────────────────────────────────────────────

export const ENEMY_GOBLIN_IDLE   = 'enemy_goblin_idle'   as const;
export const ENEMY_GOBLIN_MOVE   = 'enemy_goblin_move'   as const;
export const ENEMY_GOBLIN_ATTACK = 'enemy_goblin_attack' as const;
export const ENEMY_GOBLIN_HURT   = 'enemy_goblin_hurt'   as const;
export const ENEMY_GOBLIN_DEATH  = 'enemy_goblin_death'  as const;

// ── Enemy — Bat ───────────────────────────────────────────────────────────────

export const ENEMY_BAT_FLY   = 'enemy_bat_fly'   as const;
export const ENEMY_BAT_HURT  = 'enemy_bat_hurt'  as const;
export const ENEMY_BAT_DEATH = 'enemy_bat_death' as const;

// ── Effects ───────────────────────────────────────────────────────────────────

export const EFFECT_DUST_PUFF     = 'effect_dust_puff'     as const;
export const EFFECT_SPARKLE       = 'effect_sparkle'       as const;
export const EFFECT_COLLECT_BURST = 'effect_collect_burst' as const;

// ── Namespace object ──────────────────────────────────────────────────────────

export const AnimationKeys = {
  // Player
  PLAYER_IDLE,
  PLAYER_RUN,
  PLAYER_JUMP,
  PLAYER_FALL,
  PLAYER_LAND,
  PLAYER_CLIMB,
  PLAYER_PUSH,
  PLAYER_HURT,
  PLAYER_CELEBRATE,

  // Crystal
  CRYSTAL_IDLE,
  CRYSTAL_COLLECT,

  // Enemy — Slime
  ENEMY_SLIME_IDLE,
  ENEMY_SLIME_MOVE,
  ENEMY_SLIME_HURT,
  ENEMY_SLIME_DEATH,

  // Enemy — Goblin
  ENEMY_GOBLIN_IDLE,
  ENEMY_GOBLIN_MOVE,
  ENEMY_GOBLIN_ATTACK,
  ENEMY_GOBLIN_HURT,
  ENEMY_GOBLIN_DEATH,

  // Enemy — Bat
  ENEMY_BAT_FLY,
  ENEMY_BAT_HURT,
  ENEMY_BAT_DEATH,

  // Effects
  EFFECT_DUST_PUFF,
  EFFECT_SPARKLE,
  EFFECT_COLLECT_BURST,
} as const;

export type AnimationKey = (typeof AnimationKeys)[keyof typeof AnimationKeys];
