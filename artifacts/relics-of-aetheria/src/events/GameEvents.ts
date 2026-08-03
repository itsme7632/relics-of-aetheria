/**
 * GameEvents
 *
 * Central registry of event name constants used across the game.
 * Emit these via a Phaser.Events.EventEmitter (entity or scene bus);
 * never hard-code string literals in listeners.
 *
 * Scene-bus usage (scene-wide broadcast):
 *   this.scene.events.emit(GameEvents.CRYSTAL_COLLECTED, crystal);
 *
 * Entity-bus usage (direct entity listener):
 *   crystal.on(GameEvents.CRYSTAL_COLLECTED, handler);
 */
export const GameEvents = {
  /** Fired when a Crystal is collected by the player.
   *  Payload: the Crystal instance that was collected. */
  CRYSTAL_COLLECTED: 'crystal_collected',

  // ── M18 ───────────────────────────────────────────────────────────────────

  /** Fired (on scene bus) when the player successfully takes damage.
   *  Payload: { hp: number } — remaining HP after the hit. */
  PLAYER_DAMAGED: 'player_damaged',

  /** Fired (on scene bus) when the player's HP reaches zero. */
  PLAYER_DIED: 'player_died',
} as const;

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];
