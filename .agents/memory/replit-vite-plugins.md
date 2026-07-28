---
name: Replit Vite plugins incompatible with non-React artifacts
description: cartographer and runtime-error-modal require React; cannot be used in the Phaser game artifact
---

## Rule

Do not add `@replit/vite-plugin-cartographer` or `@replit/vite-plugin-runtime-error-modal` to `artifacts/relics-of-aetheria`. Both plugins render React components internally and will fail at runtime when React is not in the bundle.

**Why:** Relics of Aetheria is a pure Phaser artifact with no React dependency.

**How to apply:** Only `@replit/vite-plugin-dev-banner` is safe to use (it's plain DOM injection), though it's currently not included either.
