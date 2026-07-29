/**
 * AnimationRegistry
 *
 * Typed configuration records for every animation in the game.
 * AnimationFactory reads this registry and calls scene.anims.create()
 * for each entry whose source texture is present in the cache.
 *
 * How to add a new animation:
 *  1. Add a key constant to AnimationKeys.ts
 *  2. Add a config entry to ANIMATION_REGISTRY below
 *  3. AnimationFactory will register it automatically on next boot
 *
 * Frame ranges use start/end (inclusive) to stay independent of
 * the exact total frame count — easy to adjust when art changes.
 *
 * repeat: -1  = loop forever
 * repeat:  0  = play once
 * repeat:  N  = play N+1 times total
 */

import { AssetKeys } from '../assets/AssetKeys';
import { AnimationKeys } from './AnimationKeys';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnimationConfig {
  /** Phaser animation key — must match a constant from AnimationKeys.ts. */
  key: string;
  /** Texture/spritesheet key — must match a constant from AssetKeys.ts. */
  textureKey: string;
  /** First frame index (0-based, inclusive). */
  frameStart: number;
  /** Last frame index (0-based, inclusive). */
  frameEnd: number;
  /** Frames per second. */
  frameRate: number;
  /**
   * -1 = loop forever, 0 = play once, N = repeat N times after first play.
   */
  repeat: number;
  /**
   * If true, plays the animation in reverse when it loops back.
   * Useful for idle breathing-style anims.
   */
  yoyo?: boolean;
  /**
   * If true, AnimationFactory will not register this animation even if the
   * texture is present. Use to temporarily disable WIP animations.
   */
  disabled?: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * All animations in the game.
 *
 * Frame layout assumptions (to be confirmed when art is delivered):
 *
 * Player spritesheet (kai.png) — 32×48 px frames, horizontal strip:
 *   0       Idle frame 0
 *   1–3     Idle frames 1–3          (4-frame idle loop)
 *   4–9     Run frames               (6-frame run loop)
 *   10      Jump (ascent)
 *   11      Fall (descent)
 *   12      Land (single squash frame)
 *   13–14   Climb (2-frame ladder loop)
 *   15–16   Push (2-frame push loop)
 *   17      Hurt (single flash frame)
 *   18–21   Celebrate (4-frame win loop)
 *
 * Adjust frameStart / frameEnd when the real spritesheet is delivered.
 */
export const ANIMATION_REGISTRY: AnimationConfig[] = [

  // ── Player ─────────────────────────────────────────────────────────────────

  {
    key:        AnimationKeys.PLAYER_IDLE,
    textureKey: AssetKeys.PLAYER,
    frameStart: 0,
    frameEnd:   3,
    frameRate:  6,
    repeat:     -1,
    yoyo:       false,
  },
  {
    key:        AnimationKeys.PLAYER_RUN,
    textureKey: AssetKeys.PLAYER,
    frameStart: 4,
    frameEnd:   9,
    frameRate:  12,
    repeat:     -1,
  },
  {
    key:        AnimationKeys.PLAYER_JUMP,
    textureKey: AssetKeys.PLAYER,
    frameStart: 10,
    frameEnd:   10,
    frameRate:  1,
    repeat:     0,
  },
  {
    key:        AnimationKeys.PLAYER_FALL,
    textureKey: AssetKeys.PLAYER,
    frameStart: 11,
    frameEnd:   11,
    frameRate:  1,
    repeat:     0,
  },
  {
    key:        AnimationKeys.PLAYER_LAND,
    textureKey: AssetKeys.PLAYER,
    frameStart: 12,
    frameEnd:   12,
    frameRate:  1,
    repeat:     0,
  },
  {
    key:        AnimationKeys.PLAYER_CLIMB,
    textureKey: AssetKeys.PLAYER,
    frameStart: 13,
    frameEnd:   14,
    frameRate:  8,
    repeat:     -1,
  },
  {
    key:        AnimationKeys.PLAYER_PUSH,
    textureKey: AssetKeys.PLAYER,
    frameStart: 15,
    frameEnd:   16,
    frameRate:  6,
    repeat:     -1,
  },
  {
    key:        AnimationKeys.PLAYER_HURT,
    textureKey: AssetKeys.PLAYER,
    frameStart: 17,
    frameEnd:   17,
    frameRate:  1,
    repeat:     0,
  },
  {
    key:        AnimationKeys.PLAYER_CELEBRATE,
    textureKey: AssetKeys.PLAYER,
    frameStart: 18,
    frameEnd:   21,
    frameRate:  8,
    repeat:     -1,
  },

  // ── Crystal ────────────────────────────────────────────────────────────────

  {
    key:        AnimationKeys.CRYSTAL_IDLE,
    textureKey: AssetKeys.CRYSTAL,
    frameStart: 0,
    frameEnd:   5,
    frameRate:  8,
    repeat:     -1,
  },
  {
    key:        AnimationKeys.CRYSTAL_COLLECT,
    textureKey: AssetKeys.CRYSTAL,
    frameStart: 6,
    frameEnd:   9,
    frameRate:  16,
    repeat:     0,
  },

  // ── Enemy — Slime ──────────────────────────────────────────────────────────

  {
    key:        AnimationKeys.ENEMY_SLIME_IDLE,
    textureKey: AssetKeys.ENEMY_SLIME,
    frameStart: 0,
    frameEnd:   3,
    frameRate:  5,
    repeat:     -1,
    yoyo:       true,
  },
  {
    key:        AnimationKeys.ENEMY_SLIME_MOVE,
    textureKey: AssetKeys.ENEMY_SLIME,
    frameStart: 4,
    frameEnd:   7,
    frameRate:  8,
    repeat:     -1,
  },
  {
    key:        AnimationKeys.ENEMY_SLIME_HURT,
    textureKey: AssetKeys.ENEMY_SLIME,
    frameStart: 8,
    frameEnd:   9,
    frameRate:  10,
    repeat:     0,
  },
  {
    key:        AnimationKeys.ENEMY_SLIME_DEATH,
    textureKey: AssetKeys.ENEMY_SLIME,
    frameStart: 10,
    frameEnd:   13,
    frameRate:  8,
    repeat:     0,
  },

  // ── Enemy — Goblin ─────────────────────────────────────────────────────────

  {
    key:        AnimationKeys.ENEMY_GOBLIN_IDLE,
    textureKey: AssetKeys.ENEMY_GOBLIN,
    frameStart: 0,
    frameEnd:   3,
    frameRate:  6,
    repeat:     -1,
  },
  {
    key:        AnimationKeys.ENEMY_GOBLIN_MOVE,
    textureKey: AssetKeys.ENEMY_GOBLIN,
    frameStart: 4,
    frameEnd:   9,
    frameRate:  10,
    repeat:     -1,
  },
  {
    key:        AnimationKeys.ENEMY_GOBLIN_ATTACK,
    textureKey: AssetKeys.ENEMY_GOBLIN,
    frameStart: 10,
    frameEnd:   14,
    frameRate:  12,
    repeat:     0,
  },
  {
    key:        AnimationKeys.ENEMY_GOBLIN_HURT,
    textureKey: AssetKeys.ENEMY_GOBLIN,
    frameStart: 15,
    frameEnd:   16,
    frameRate:  10,
    repeat:     0,
  },
  {
    key:        AnimationKeys.ENEMY_GOBLIN_DEATH,
    textureKey: AssetKeys.ENEMY_GOBLIN,
    frameStart: 17,
    frameEnd:   21,
    frameRate:  8,
    repeat:     0,
  },

  // ── Enemy — Bat ────────────────────────────────────────────────────────────

  {
    key:        AnimationKeys.ENEMY_BAT_FLY,
    textureKey: AssetKeys.ENEMY_BAT,
    frameStart: 0,
    frameEnd:   3,
    frameRate:  10,
    repeat:     -1,
  },
  {
    key:        AnimationKeys.ENEMY_BAT_HURT,
    textureKey: AssetKeys.ENEMY_BAT,
    frameStart: 4,
    frameEnd:   5,
    frameRate:  10,
    repeat:     0,
  },
  {
    key:        AnimationKeys.ENEMY_BAT_DEATH,
    textureKey: AssetKeys.ENEMY_BAT,
    frameStart: 6,
    frameEnd:   9,
    frameRate:  8,
    repeat:     0,
  },

  // ── Effects ────────────────────────────────────────────────────────────────

  {
    key:        AnimationKeys.EFFECT_DUST_PUFF,
    textureKey: AssetKeys.EFFECT_DUST_PUFF,
    frameStart: 0,
    frameEnd:   5,
    frameRate:  16,
    repeat:     0,
  },
  {
    key:        AnimationKeys.EFFECT_SPARKLE,
    textureKey: AssetKeys.EFFECT_SPARKLE,
    frameStart: 0,
    frameEnd:   7,
    frameRate:  16,
    repeat:     0,
  },
  {
    key:        AnimationKeys.EFFECT_COLLECT_BURST,
    textureKey: AssetKeys.EFFECT_COLLECT_BURST,
    frameStart: 0,
    frameEnd:   7,
    frameRate:  24,
    repeat:     0,
  },
];
