---
name: M9 input architecture
description: TouchManager owns all keyboard and touch input; game objects only read TouchInputState
---

## Rule

All input flows through `TouchManager`. Player, GameScene, and InteractionManager must never read keyboard or pointer events directly. They only consume `TouchInputState` (the return of `touchManager.currentState`).

**Why:** Unified input allows keyboard + touch to coexist without duplication, and makes it trivial to add new input sources (gamepad, virtual D-pad, etc.) in one place.

**How to apply:**
- `GameScene.update()` calls `touchManager.update()` first, then reads `currentState`.
- `player.update(delta, input)` receives the state — never raw keys.
- `interactionManager.update(pos, input.interactJust)` — interact is unified too.
- F-keys (F3–F8) are registered on the raw keyboard in GameScene because they are dev-only toggles, not gameplay input. This is the only acceptable exception.
- Adding a new gameplay action: add a field to `TouchInputState`, write into it in `TouchManager.update()`, read it downstream — never add a new `addKey` to Player or GameScene.

## Key file map (as of M9)
- Input state shape: `src/input/TouchInputState.ts`
- Joystick: `src/input/VirtualJoystick.ts`
- Button: `src/input/TouchButton.ts`
- Orchestrator: `src/input/TouchManager.ts`
- Wiring point: `GameScene.create()` instantiates TouchManager; `GameScene.update()` drives it
