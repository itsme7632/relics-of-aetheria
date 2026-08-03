---
name: M18 game flow architecture
description: Game-flow state machine, HUD, and UI screen patterns from M18 Player Experience milestone
---

## Flow state machine
`_flowState: 'playing' | 'paused' | 'gameover' | 'levelcomplete'` lives directly in `GameScene` (no separate manager). All gameplay updates are gated on `_flowState === 'playing'`. Physics pause/resume is called whenever leaving/returning to `playing`.

**Why:** Keeps flow transitions explicit and co-located with the rest of the scene wiring — no extra file to coordinate.

**How to apply:** To add a new state (e.g. `'cutscene'`), add it to the union in the field declaration in `GameScene.ts` and add a branch in `update()`.

## TypeScript cast pattern for Phaser components
Casting a `Phaser.GameObjects.GameObject` to a component interface (e.g. `Alpha`, `Visible`) requires a **double-cast through `unknown`**:
```ts
(o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
```
Direct cast (`o as Phaser.GameObjects.Components.Alpha`) is rejected by TypeScript because the two types don't share sufficient overlap. This affects `GameOverScreen`, `LevelCompleteScreen`, `PauseMenu`, and `SettingsMenu`.

**Why:** Phaser's `GameObject` base class doesn't declare component interfaces in its type signature, even though concrete subclasses implement them at runtime.

## Tween delay callback types
Phaser tween `delay` callbacks `(target, index) => number` need explicit parameter types or TS infers `any`:
```ts
delay: (_: unknown, i: number) => i * 30,
```

## UI depth order (M18)
| Layer | Depth |
|---|---|
| HUD (HudDisplay) | 990 |
| ScreenFlash | 998 |
| DebugOverlay | 1000 |
| GameOverScreen | 1500 |
| PauseMenu | 1510 |
| SettingsMenu | 1520 |
| LevelCompleteScreen | 1500 |

## Session stats
`_sessionStartTime` (Date.now()), `_sessionDamageTaken`, and `_totalCrystals` are reset in `init()` and populated in `create()`. `_totalCrystals = entityManager.entityCount` is captured **immediately after** `spawnFromMap()` before any crystals can be collected.

## Crystal count HUD wiring
`GameEvents.CRYSTAL_COLLECTED` event is listened on `this.events` (scene emitter); `Crystal.ts` emits it. The listener is cleaned up in SHUTDOWN via `this.events.off(GameEvents.CRYSTAL_COLLECTED)`.
