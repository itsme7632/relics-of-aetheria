# Relics of Aetheria

A commercial-quality Android adventure game built with **Phaser 3**, **TypeScript**, **Vite**, and **Capacitor**.

This repository is the long-term project foundation. The first milestone establishes a clean, extensible structure — no gameplay systems yet, just a solid base to build on.

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (workspace package manager)
- Android Studio (for Android builds)

### Install

```bash
pnpm install
```

### Run in browser (dev)

```bash
pnpm --filter @workspace/relics-of-aetheria run dev
```

Open the preview URL. You should see the Phaser canvas immediately.

### Type-check

```bash
pnpm --filter @workspace/relics-of-aetheria run typecheck
```

### Lint

```bash
pnpm --filter @workspace/relics-of-aetheria run lint
```

### Format

```bash
pnpm --filter @workspace/relics-of-aetheria run format
```

---

## Build

### Web bundle

```bash
pnpm --filter @workspace/relics-of-aetheria run build
```

Output goes to `artifacts/relics-of-aetheria/dist/public/`.

### Android (Capacitor)

```bash
# 1. Build the web bundle
pnpm --filter @workspace/relics-of-aetheria run build

# 2. Add the Android platform (first time only)
npx cap add android

# 3. Sync web assets into the native project
pnpm --filter @workspace/relics-of-aetheria run cap:sync

# 4. Open in Android Studio
pnpm --filter @workspace/relics-of-aetheria run cap:android
```

---

## Controls

| Action | Keys |
|--------|------|
| Move left | `←` or `A` |
| Move right | `→` or `D` |
| Jump | `↑`, `W`, or `Space` |

---

## Project Structure

```
artifacts/relics-of-aetheria/
├── src/
│   ├── main.ts              # Entry point — boots Phaser
│   ├── core/
│   │   └── GameConfig.ts    # Phaser config + world constants
│   ├── scenes/
│   │   ├── BootScene.ts     # Asset loading → hands off to GameScene
│   │   └── GameScene.ts     # Main gameplay scene
│   ├── entities/
│   │   └── Player.ts        # Physics-enabled player rectangle
│   ├── ui/
│   │   └── DebugOverlay.ts  # FPS / X / Y HUD
│   ├── systems/             # Future: combat, AI, physics helpers
│   ├── managers/            # Future: audio, scene, save-state managers
│   ├── utils/               # Future: math, pooling, tween helpers
│   └── data/                # Future: item tables, config JSON
├── assets/
│   ├── sprites/             # Spritesheets and character art
│   ├── audio/               # Music and SFX
│   ├── maps/                # Tiled TMX map files
│   ├── tilesets/            # Tileset images referenced by maps
│   └── fonts/               # Bitmap fonts
├── docs/                    # Design docs and milestone notes
├── capacitor.config.ts      # Capacitor / Android configuration
├── eslint.config.js         # ESLint 9 flat config
├── .prettierrc              # Prettier formatting rules
└── vite.config.ts           # Vite build configuration
```

---

## What's Running

| Feature | Status |
|---------|--------|
| Phaser 3 canvas | ✅ |
| Arcade physics + gravity | ✅ |
| Static floor | ✅ |
| Movable player rectangle | ✅ |
| Arrow key + WASD input | ✅ |
| Jump | ✅ |
| Smooth camera follow | ✅ |
| Camera world bounds | ✅ |
| Generated tile grid | ✅ |
| Debug overlay (FPS, X, Y) | ✅ |
| TypeScript strict mode | ✅ |
| ESLint + Prettier | ✅ |
| Capacitor config | ✅ |

---

## Future Milestones

### Milestone 2 — Tilemap & World
- Load Tiled TMX maps via `this.make.tilemap`
- Replace placeholder rectangle with animated sprite
- Multiple platforms and static obstacles

### Milestone 3 — Game Systems
- Camera zones and trigger areas
- Scene manager with pause / resume
- Audio manager (BGM + SFX)

### Milestone 4 — Enemies & Combat
- Enemy base class with simple patrol AI
- Melee attack system
- Health and damage system

### Milestone 5 — UI & HUD
- Health bar, inventory slots
- Pause menu
- Scene transitions

### Milestone 6 — Android
- Capacitor touch controls overlay
- Performance profiling on device
- App icon and splash screen

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| Phaser 3 | ^3.88 | Game engine |
| TypeScript | ~5.9 | Type safety |
| Vite | ^6 | Dev server + bundler |
| Capacitor | ^6 | Android packaging |
| ESLint 9 | ^9 | Linting |
| Prettier | ^3 | Formatting |
