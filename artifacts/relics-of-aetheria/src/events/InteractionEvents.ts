/**
 * InteractionEvents
 *
 * Event name constants for the Gameplay Interaction Framework.
 * Emit via an entity's own emitter or the scene bus — never use raw strings.
 *
 * Scene-bus (broadcast to all listeners):
 *   this.scene.events.emit(InteractionEvents.LEVEL_COMPLETE);
 *
 * Entity-bus (targeted listener):
 *   checkpoint.on(InteractionEvents.CHECKPOINT_ACTIVATED, handler);
 */
export const InteractionEvents = {
  /** Fired when a Checkpoint zone is entered by the player.
   *  Payload: the Checkpoint instance. */
  CHECKPOINT_ACTIVATED: 'checkpoint_activated',

  /** Fired when the player confirms exit at a LevelExit.
   *  Payload: the LevelExit instance. */
  LEVEL_COMPLETE: 'level_complete',

  /** Fired when an interactable enters focus (player is within range).
   *  Payload: the Interactable instance. */
  INTERACTABLE_FOCUSED: 'interactable_focused',

  /** Fired when an interactable loses focus (player moved away).
   *  Payload: the Interactable instance. */
  INTERACTABLE_UNFOCUSED: 'interactable_unfocused',

  /** Fired when a Door transitions to the open state.
   *  Payload: the Door instance. */
  DOOR_OPENED: 'door_opened',

  /** Fired when a Door transitions to the closed state.
   *  Payload: the Door instance. */
  DOOR_CLOSED: 'door_closed',

  /** Fired when the player reads a Sign.
   *  Payload: the sign message string. */
  SIGN_READ: 'sign_read',
} as const;

export type InteractionEventName =
  (typeof InteractionEvents)[keyof typeof InteractionEvents];
