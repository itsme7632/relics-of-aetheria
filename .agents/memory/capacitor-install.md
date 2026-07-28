---
name: Capacitor install blocked
description: @capacitor/cli and @capacitor/android cannot be pnpm-installed in this workspace
---

## Rule

Do NOT add `@capacitor/cli` or `@capacitor/android` to `artifacts/relics-of-aetheria/package.json`. They pull in `tar@6.2.1` which is blocked by the pnpm package firewall (403 Forbidden).

**Why:** The workspace minimumReleaseAge policy combined with the firewall blocks that subdependency.

**How to apply:** Use `capacitor.config.json` (plain JSON) instead of `capacitor.config.ts` (which needs @capacitor/cli for types). Install Capacitor CLI globally when doing actual Android builds.
