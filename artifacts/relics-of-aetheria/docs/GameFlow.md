# Game Flow — Relics of Aetheria

Implemented in **M18** (Player Experience, HUD & Game Flow).

---

## HUD Architecture

The HUD is a permanent overlay rendered above all gameplay objects (depth 990).
It is entirely Phaser-native canvas — no HTML/CSS/React.

**File:** `src/ui/HudDisplay.ts`

| Element | Position | Updated by |
|---|---|---|
| HP hearts (× 3) | Top-left (x 16, y 20) | `hud.setHp(hp, maxHp)` — called on damage |
| Crystal counter | Below hearts (x 16, y 46) | `hud.setCrystals(n)` — called on `CRYSTAL_COLLECTED` |
| Level name | Below counter (x 16, y 66) | Set once in `create()` |
| Pause button | Top-right (width − 36, y 24) | Interactive Zone — calls `onPause` callback |

Hearts are drawn procedurally (two circles + triangle) using `Phaser.GameObjects.Graphics`.
An empty heart renders at 35% opacity in a dark colour; filled hearts are red with a
highlight dot. The design is intentionally replaceable by sprite sheets.

---

## Game Flow States

`GameScene` tracks a private `_flowState` field:

| State | Physics | Gameplay updates | Screen shown |
|---|---|---|---|
| `'playing'` | running | yes | HUD |
| `'paused'` | paused | no | PauseMenu |
| `'gameover'` | paused | no | GameOverScreen |
| `'levelcomplete'` | paused | no | LevelCompleteScreen |

Transitions:

```
playing ──ESC / pause btn──► paused ──Resume──► playing
playing ──HP = 0──────────► gameover ──Retry──► (scene restart)
playing ──LevelExit E──────► levelcomplete ──Next / Replay──► (next level / restart)
```

State changes live in `GameScene`:
- `_pauseGame()` / `_resumeGame()`
- `_showGameOver()`
- `_onLevelComplete()` (replaces the old simple text overlay)

---

## Player Damage Feedback

When `player.takeDamage()` returns `true` (damage was applied):

1. **Camera shake** — `shakeCamera(120, 0.006)`
2. **Hit-stop** — `_hitStopTimer = 50` ms; gameplay updates skip until it expires
3. **Screen flash** — `screenFlash.flash()` → red tint fades over 220 ms
4. **Kai flash** — existing Kai invulnerability flicker (120 ms cycle, 1 500 ms duration)
5. **HUD update** — `hudDisplay.setHp(hp, MAX_HP)`
6. **Death check** — if `player.hp <= 0` → `_showGameOver()`

---

## Game Over Flow

**File:** `src/ui/GameOverScreen.ts`

1. `_showGameOver()` in GameScene: sets `_flowState = 'gameover'`, pauses physics, calls `gameOverScreen.show()`.
2. The screen fades in with a red "GAME OVER" title.
3. **Retry Level** → `scene.restart({ levelId })` — restarts with all state reset.
4. **Exit to Menu** → placeholder (`console.log`); will navigate to a MainMenu scene in a future milestone.

---

## Level Complete Flow

**File:** `src/ui/LevelCompleteScreen.ts`

1. `LEVEL_COMPLETE` interaction event fires (LevelExit activated).
2. `_onLevelComplete()` in GameScene: sets `_flowState = 'levelcomplete'`, pauses physics.
3. Session stats are collected:
   - **Crystals** — `entityManager.collectedCrystals` / `_totalCrystals`
   - **Damage** — `_sessionDamageTaken` (incremented on each successful hit)
   - **Time** — `Date.now() − _sessionStartTime` (set at the top of `create()`)
4. `levelCompleteScreen.show(stats)` builds and fades in the screen.
5. **Next Level** (if exists) → `transitionToNextLevel()`.
6. **Replay** → `scene.restart({ levelId })`.
7. If no next level: headline reads "WORLD COMPLETE"; only Replay is shown.

---

## Pause Flow

**File:** `src/ui/PauseMenu.ts`

| Trigger | Platform |
|---|---|
| ESC key | Desktop |
| Pause icon button (HUD top-right) | Mobile + Desktop |

Buttons:
- **Resume** → `_resumeGame()`
- **Restart** → `scene.restart({ levelId })`
- **Settings** → PauseMenu hides, SettingsMenu shows
- **Exit** → placeholder

---

## Settings Persistence

**Files:** `src/ui/SettingsMenu.ts`, `src/data/GameSettings.ts`

Settings are stored in `localStorage` under the key `roa_settings` as a JSON object:

```json
{ "musicOn": true, "sfxOn": true, "vibrationOn": true }
```

`GameSettings.load()` merges stored values with defaults (safe for first run).
`GameSettings.save(data)` is called on every toggle in `SettingsMenu`.
All three settings are currently **placeholders** — the actual audio and haptic
systems will be wired in a future milestone.

---

## Future Expansion

- **Main Menu scene** — wire the "Exit" placeholder buttons.
- **Audio Manager** — consume `sfxOn` / `musicOn` from `GameSettings`.
- **Haptics** — consume `vibrationOn` via the Web Vibration API on damage.
- **Save System** — persist `crystalsCollected` and level progress.
- **Animated hearts** — replace procedural Graphics with a sprite-sheet when art ships.
- **Multiple lives / continues** — GameOverScreen can show a life counter.
