# Relics of Aetheria

A commercial-quality Android adventure game built on Phaser 3 + TypeScript + Vite + Capacitor.

## Run & Operate

- `pnpm --filter @workspace/relics-of-aetheria run dev` — run the game (browser preview)
- `pnpm --filter @workspace/relics-of-aetheria run typecheck` — type-check the game source
- `pnpm --filter @workspace/relics-of-aetheria run lint` — ESLint
- `pnpm --filter @workspace/relics-of-aetheria run format` — Prettier
- `pnpm --filter @workspace/relics-of-aetheria run build` — Vite production bundle → `dist/public/`
- `pnpm --filter @workspace/api-server run dev` — run the shared API server (port 8080)

## Stack

- Game engine: Phaser 3 (^3.88)
- Language: TypeScript 5.9, strict mode
- Bundler: Vite
- Android packaging: Capacitor 6 (config in `artifacts/relics-of-aetheria/capacitor.config.json`)
- Linting: ESLint 9 (flat config: `eslint.config.js`)
- Formatting: Prettier 3

## Where things live

- Game entry: `artifacts/relics-of-aetheria/src/main.ts`
- Phaser config + world constants: `artifacts/relics-of-aetheria/src/core/GameConfig.ts`
- Scenes: `artifacts/relics-of-aetheria/src/scenes/`
- Entities: `artifacts/relics-of-aetheria/src/entities/`
- UI (HUD): `artifacts/relics-of-aetheria/src/ui/`
- Capacitor config: `artifacts/relics-of-aetheria/capacitor.config.json`
- Game assets: `artifacts/relics-of-aetheria/assets/`
- Detailed README: `artifacts/relics-of-aetheria/README.md`

## Architecture decisions

- React/Tailwind/Radix fully stripped — pure Phaser canvas, zero HTML UI
- `Player` extends `Phaser.GameObjects.Rectangle` with `declare body` override for strict TS
- `DebugOverlay` uses `setScrollFactor(0)` to pin to camera regardless of scroll
- `GameScene.setZoom()` and `GameScene.shakeCamera()` are stubbed for future milestones
- Capacitor config uses JSON (not TS) to avoid `@capacitor/cli` subdep firewall block

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do not add `@capacitor/cli` or `@capacitor/android` as workspace deps — they pull in `tar@6.2.1` which is blocked by the pnpm package firewall. Install them globally when doing Android builds.
- Vite plugins `@replit/vite-plugin-runtime-error-modal` and `@replit/vite-plugin-cartographer` require React internally — do not add them to this artifact.
