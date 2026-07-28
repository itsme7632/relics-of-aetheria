# Relics of Aetheria

A commercial-quality Android adventure game built with **Phaser 3**, **TypeScript**, **Vite**, and **Capacitor**.

This repository is the long-term project foundation. Each milestone adds one focused system on top of the last.

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (workspace package manager)
- Android Studio (for Android builds only)

### Install

```bash
pnpm install
```

### Run in browser (dev)

```bash
pnpm --filter @workspace/relics-of-aetheria run dev
```

Open the preview URL. The Phaser canvas appears immediately.

### Type-check

```bash
pnpm --filter @workspace/relics-of-aetheria run typecheck
```

### Lint / Format

```bash
pnpm --filter @workspace/relics-of-aetheria run lint
pnpm --filter @workspace/relics-of-aetheria run format
```

---

## Build

### Web bundle

```bash
pnpm --filter @workspace/relics-of-aetheria run build
# Output: artifacts/relics-of-aetheria/dist/public/
```

### Android (Capacitor)

```bash
pnpm --filter @workspace/relics-of-aetheria run build
npx cap add android          # first time only
pnpm --filter @workspace/relics-of-aetheria run cap:sync
pnpm --filter @workspace/relics-of-aetheria run cap:android
```

---

## Controls

| Action | Keys |
|--------|------|
| Move left | `←` or `A` |
| Move right | `→` or `D` |
| Jump | `↑`, `W`, or `Space` |
| Toggle collision debug | `F3` |

---

## Project Structure

```
artifacts/relics-of-aetheria/
├── src/
│   ├── main.ts                   # Entry point — boots Phaser
│   ├── core/
│   │   └── GameConfig.ts         # Phaser config
│   ├── data/
│   │   └── levels.ts             # Level registry — only file to edit to add a level
│   ├── scenes/
│   │   ├── BootScene.ts          # Asset loading → GameScene
│   │   └── GameScene.ts          # Main gameplay scene
│   ├── entities/
│   │   └── Player.ts             # Physics rectangle (arrow keys + WASD)
│   ├── systems/
│   │   ├── Level.ts              # Loaded tilemap + collision layer + spawn objects
│   │   └── TilemapLoader.ts      # Builds a Level from a LevelConfig
│   ├── managers/
│   │   └── MapManager.ts         # Public API: loadLevel(key) → Level
│   └── ui/
│       └── DebugOverlay.ts       # FPS / X / Y HUD
├── assets/
│   ├── maps/
│   │   └── level1.json           # Tiled JSON map (80×22 tiles)
│   ├── tilesets/                 # Tileset images (placeholder generated at runtime)
│   ├── sprites/                  # Future: character spritesheets
│   ├── audio/                    # Future: music and SFX
│   └── fonts/                    # Future: bitmap fonts
├── docs/
│   └── TilemapEngine.md          # Tilemap system documentation
├── capacitor.config.json         # Capacitor / Android configuration
├── eslint.config.js              # ESLint 9 flat config
├── .prettierrc                   # Prettier formatting rules
└── vite.config.ts                # Vite build configuration
```

---

## Switching Levels

Change one value in `src/data/levels.ts`:

```ts
export const STARTING_LEVEL = 'level2';   // was 'level1'
```

No engine code changes needed. See `docs/TilemapEngine.md` for full tilemap documentation.

---

## Milestone Status

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Project foundation (Phaser + TS + Vite + Capacitor + ESLint + Prettier) | ✅ |
| 2 | Tilemap engine (TilemapLoader, MapManager, Level, TMX layer support, F3 debug) | ✅ |
| 3 | Animated player sprite (walk/idle/jump animations from spritesheet) | — |
| 4 | Audio manager (BGM + SFX, pause/resume, scene-aware) | — |
| 5 | Enemies & combat | — |
| 6 | UI & HUD (health bar, inventory, pause menu) | — |
| 7 | Android polish (touch controls, icons, splash) | — |

---

## What's Running (Milestone 2)

| Feature | Detail |
|---------|--------|
| TMX level loading | Tiled JSON export via `this.load.tilemapTiledJSON` |
| Tile layers | Background, Ground, Platforms, Collision, Decoration_Back, Decoration_Front |
| Object layers | PlayerSpawn, LevelExit, Checkpoint |
| Collision | Arcade Physics on the `Collision` layer only |
| Camera bounds | Derived from map dimensions (`level.widthInPixels × heightInPixels`) |
| Player spawn | Read from `PlayerSpawn` object in the map |
| F3 debug toggle | Orange outlines on all colliding tiles |
| Map hot-swap | Change `STARTING_LEVEL` in `src/data/levels.ts` — zero engine edits |
| Zero TS errors | Strict mode clean |

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| Phaser 3 | ^3.88 | Game engine |
| TypeScript | ~5.9 | Strict type safety |
| Vite | ^6 | Dev server + bundler |
| Capacitor | ^6 (config only) | Android packaging |
| ESLint 9 | ^9 | Linting |
| Prettier | ^3 | Formatting |
