# Production Art Pipeline — Relics of Aetheria

**Milestone M20A — Production Asset Pipeline & Core Art**

This document is the artist onboarding guide for the Relics of Aetheria production
art pipeline. It explains the folder layout, asset naming conventions, spritesheet
standards, the auto-fallback system, and the workflow for integrating new artwork.

---

## 1. Core Principle: Zero-Code Art Integration

Dropping a correctly named image file into the right folder is sufficient to upgrade
from procedural placeholder to production art.

No code change is needed — the engine detects the file at boot time, switches the
appropriate renderer, and reports the result in the F7 debug overlay.

If a file is absent the engine falls back to its procedural placeholder silently.
**There is never a crash for missing art.**

---

## 2. Folder Layout

```
assets/
├── characters/
│   └── kai/
│       ├── kai.png             ← Kai player spritesheet (32×48 px/frame, 22 frames)
│       └── kai.json            ← optional atlas JSON (if using TexturePacker)
│
├── enemies/
│   └── snake/
│       └── snake.png           ← Snake enemy spritesheet (32×32 px/frame, 18 frames)
│
├── worlds/
│   └── world01_jungle/
│       ├── tilesets/
│       │   ├── tileset.png     ← Main production tileset (32×32 px tiles)
│       │   ├── tileset_anim.png← Animated tile atlas (optional)
│       │   └── tileset_deco.png← Decorative tile atlas (optional)
│       └── backgrounds/
│           ├── sky.png         ← Background layer 0 (deepest)
│           ├── clouds.png      ← Background layer 1
│           ├── mountains.png   ← Background layer 2
│           ├── jungle.png      ← Background layer 3
│           ├── trees.png       ← Background layer 4
│           ├── vines.png       ← Background layer 5
│           ├── mist.png        ← Background layer 6 (overlay)
│           └── sunrays.png     ← Background layer 7 (overlay, frontmost)
│
├── effects/
│   └── particles/
│       ├── dust.png            ← Landing dust puff (16×16 px, 4 frames)
│       ├── leaf.png            ← Falling leaf (16×16 px, 4 frames)
│       ├── spark.png           ← Spark flash (16×16 px, 3 frames)
│       ├── crystal.png         ← Crystal collect glint (16×16 px, 4 frames)
│       ├── checkpoint.png      ← Checkpoint starburst (16×16 px, 4 frames)
│       └── damage.png          ← Player damage burst (16×16 px, 4 frames)
│
├── ui/
│   ├── heart.png               ← Full heart (24×24 px)
│   ├── heart_empty.png         ← Empty heart (24×24 px)
│   ├── crystal_icon.png        ← Crystal HUD icon (16×16 px)
│   ├── panel.png               ← 9-slice menu panel background
│   ├── button_normal.png       ← Button idle state
│   └── button_hover.png        ← Button hover/active state
│
├── audio/
│   ├── music/                  ← BGM (OGG format)
│   └── sfx/                    ← Sound effects (OGG format)
│
└── fonts/
    ├── hud.png + hud.xml       ← Bitmap font for HUD numbers
    └── title.png + title.xml   ← Bitmap font for title screens
```

---

## 3. Sprite Conventions

### Tile size
All gameplay tiles are **32 × 32 px**.

### Player (Kai)
- Frame size: **32 × 48 px** (width × height)
- Strip layout: horizontal, 22 frames total
- Animation layout:

| Frames | Clip         | FPS | Loop |
|--------|-------------|-----|------|
| 0–3    | idle        | 6   | yes  |
| 4–7    | run         | 10  | yes  |
| 8–9    | jump (rise) | 8   | no   |
| 10–11  | fall        | 8   | yes  |
| 12–13  | land        | 12  | no   |
| 14–15  | climb       | 8   | yes  |
| 16–17  | push        | 8   | yes  |
| 18–19  | hurt        | 10  | no   |
| 20–21  | celebrate   | 8   | no   |

### Snake Enemy
- Frame size: **32 × 32 px**
- Strip layout: horizontal, 18 frames total

| Frames | Clip   | FPS | Loop |
|--------|--------|-----|------|
| 0–3    | idle   | 8   | yes  |
| 4–7    | crawl  | 8   | yes  |
| 8–11   | attack | 10  | no   |
| 12–13  | hurt   | 12  | no   |
| 14–17  | death  | 8   | no   |

### Particles
- Frame size: **16 × 16 px**
- Strip layout: horizontal, 3–4 frames per effect
- All particle animations are one-shot (no loop), frameRate 12

### Background Layers
- PNG images, any height (the engine tiles them horizontally to fill the level width)
- Recommended height: match the level viewport (704 px for World 1)
- Recommended minimum width: 1280 px (one full viewport)
- Layers are tiled with `TileSprite`; use seamlessly tileable images

---

## 4. The Fallback System

Each visual category has an **importer** class that detects whether the
production texture is in the Phaser cache after loading:

| Category    | Importer class          | Fallback                             |
|-------------|------------------------|--------------------------------------|
| Kai         | `PlayerSpriteImporter`  | Procedural 32×48 placeholder sprite  |
| Snake       | `SnakeSpriteImporter`   | Procedural Graphics snake            |
| Tileset     | `TilesetRegistry`       | Procedural 32-tile texture           |
| Backgrounds | `BackgroundImporter`    | Procedural Graphics parallax layers  |
| HUD         | `HudArtImporter`        | Procedural Graphics hearts + Text    |
| Menus       | `MenuArtImporter`       | Procedural Graphics panels           |
| Particles   | `ParticleArtImporter`   | Procedural Graphics circles          |

All fallbacks are fully playable.  Production art only enhances visuals.

---

## 5. How to Deliver a New Asset

1. **Drop the file** into the folder specified in Section 2.
2. **Find the manifest entry** in `src/assets/AssetManifest.ts`.
3. **Remove `optional: true`** from that entry.
4. Restart the game — the engine loads the file and logs the result.
5. Open the **F7 debug overlay** in-game to confirm the production status.

---

## 6. F7 Debug Overlay — Production Art Panel

Press **F7** in-game to see the combined asset + production-art debug panel.

The `[ProdArt M20A]` section shows:

```
[ProdArt M20A]
ProdLoaded  N
ProdMissing M
─────────────────
○ Kai Character      procedural
○ Snake Enemy        procedural
· Backgrounds        partial (3/8)
✓ HUD Art            production
```

Legend:
- `✓` production — all textures in this category loaded
- `·` partial    — some textures loaded, some still procedural
- `○` procedural — no production textures for this category yet

---

## 7. AssetManifest Registration

Every new asset key must have:

1. A constant in `src/assets/AssetKeys.ts`
2. A category mapping in `src/assets/AssetCatalog.ts` (`KEY_CATEGORY`)
3. A manifest entry in `src/assets/AssetManifest.ts` (with `optional: true` until delivered)

The importer classes handle the detection and fallback logic; you do not need to
modify any renderer code when artwork arrives.

---

## 8. Skin / Palette Extension Points

### Kai future skins
Additional Kai skins can be registered by dropping an alternate spritesheet and
pointing `KaiRenderer` at the new key.  The `PlayerSpriteImporter` spec
(`KAI_SPRITE_SPEC`) defines the authoritative frame layout; skins must match it.

### Snake variants
Additional snake variants (different colours, sizes) follow the same clip layout as
`SNAKE_SPRITE_SPEC` in `SnakeSpriteImporter.ts`.

---

## 9. Audio

Audio assets use the same optional-manifest pattern.  OGG is the primary format.
Add `['.mp3']` as a fallback in the load call if cross-platform support is needed.

All audio keys live in `AssetKeys.ts` under `AUDIO_BGM_*` and `AUDIO_SFX_*`.
