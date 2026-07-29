import Phaser from 'phaser';
import type { BackgroundTheme } from '../world/WorldEnvironment';

/**
 * ParallaxLayer
 *
 * A procedurally drawn background layer that scrolls at a fraction of the
 * camera speed, producing the illusion of depth.
 *
 * Layers are drawn once at construction time (no per-frame redraw) using a
 * supplied draw callback.  Position is always (0, 0); scroll offset is
 * handled entirely by Phaser's scrollFactor system.
 *
 * Usage:
 *   const far = new ParallaxLayer(scene, 0.15, 0.05, -15, (g) => {
 *     g.fillStyle(0x1a1040, 1);
 *     // draw mountain shapes...
 *   });
 *
 * To add a new background layer:
 *   1. Decide scrollFactorX (0 = fixed, 1 = moves with world).
 *   2. Pick a depth below all tile layers (tilemap layers default to 0).
 *   3. Supply a draw callback.  Draw in world coordinates starting at (0, 0).
 */
export class ParallaxLayer {
  private readonly gfx: Phaser.GameObjects.Graphics;

  /**
   * @param scene          Active Phaser scene.
   * @param scrollFactorX  Horizontal scroll speed relative to camera (0–1).
   * @param scrollFactorY  Vertical scroll speed relative to camera (0–1).
   * @param depth          Render depth (use negative values to sit behind tiles).
   * @param draw           Callback that performs all Graphics draw calls.
   *                       The Graphics object is pre-positioned at (0, 0) and
   *                       cleared before the callback runs.
   */
  constructor(
    scene: Phaser.Scene,
    scrollFactorX: number,
    scrollFactorY: number,
    depth: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ) {
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(scrollFactorX, scrollFactorY);
    this.gfx.setDepth(depth);
    draw(this.gfx);
  }

  destroy(): void {
    this.gfx.destroy();
  }
}

// ─── Theme dispatcher ─────────────────────────────────────────────────────────

/**
 * Build background parallax layers for a level.
 * Theme is supplied from the level manifest's backgroundTheme field.
 * The returned array must be stored and destroyed on scene shutdown.
 *
 * @param scene   Active Phaser scene.
 * @param levelW  Level width in pixels.
 * @param levelH  Level height in pixels.
 * @param theme   Background theme identifier (default: 'default').
 */
export function buildParallaxLayers(
  scene: Phaser.Scene,
  levelW: number,
  levelH: number,
  theme: BackgroundTheme = 'default',
): ParallaxLayer[] {
  switch (theme) {
    case 'jungle_day':
    case 'jungle_dusk':
    case 'jungle_night':
      return _buildJungleLayers(scene, levelW, levelH, theme);
    case 'default':
    default:
      return _buildDefaultLayers(scene, levelW, levelH);
  }
}

// ─── Default theme ────────────────────────────────────────────────────────────

/**
 * Original star-field + mountain silhouettes theme (3 layers).
 * Kept intact from M5 — used as a fallback and non-jungle worlds.
 */
function _buildDefaultLayers(
  scene: Phaser.Scene,
  levelW: number,
  levelH: number,
): ParallaxLayer[] {
  const drawW = levelW + 1280;
  const drawH = levelH;

  // ── Layer 0 — deep sky with stars (barely moves) ──────────────────────────
  const sky = new ParallaxLayer(scene, 0.05, 0.0, -20, (g) => {
    g.fillStyle(0x0a0a16, 1);
    g.fillRect(0, 0, drawW, drawH);

    for (let i = 0; i < 260; i++) {
      const sx    = (i * 137 + 11) % drawW;
      const sy    = (i * 89  + 31) % (drawH * 0.85);
      const alpha = 0.25 + (i % 7) * 0.07;
      const radius = i % 9 === 0 ? 1.5 : 1;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(sx, sy, radius);
    }

    g.fillStyle(0x1a0a3a, 0.18);
    g.fillEllipse(drawW * 0.3, drawH * 0.25, 500, 160);
    g.fillStyle(0x0a1a30, 0.15);
    g.fillEllipse(drawW * 0.75, drawH * 0.35, 380, 120);
  });

  // ── Layer 1 — far mountain silhouettes ────────────────────────────────────
  const mountains = new ParallaxLayer(scene, 0.15, 0.03, -15, (g) => {
    g.fillStyle(0x150d2a, 1);

    const pts: Phaser.Types.Math.Vector2Like[] = [];
    pts.push({ x: 0, y: drawH });

    const step = 220;
    for (let x = 0; x <= drawW; x += step) {
      const peakH = 120 + ((x * 17 + 3) % 180);
      pts.push({ x, y: drawH - peakH });
      if (x + step <= drawW) {
        const midH = 60 + ((x * 11 + 7) % 80);
        pts.push({ x: x + step / 2, y: drawH - midH });
      }
    }

    pts.push({ x: drawW, y: drawH });
    g.fillPoints(pts, true);
    g.lineStyle(1, 0x2a1850, 0.5);
    g.strokePoints(pts.slice(1, pts.length - 1), false);
  });

  // ── Layer 2 — mid hills ───────────────────────────────────────────────────
  const hills = new ParallaxLayer(scene, 0.35, 0.08, -10, (g) => {
    g.fillStyle(0x091b22, 1);

    const pts: Phaser.Types.Math.Vector2Like[] = [];
    pts.push({ x: 0, y: drawH });

    const step = 160;
    for (let x = 0; x <= drawW; x += step) {
      const peakH = 50 + ((x * 23 + 5) % 100);
      pts.push({ x, y: drawH - peakH });
      if (x + step <= drawW) {
        const midH = 30 + ((x * 13 + 9) % 50);
        pts.push({ x: x + step / 2, y: drawH - midH });
      }
    }

    pts.push({ x: drawW, y: drawH });
    g.fillPoints(pts, true);
  });

  return [sky, mountains, hills];
}

// ─── Jungle themes ────────────────────────────────────────────────────────────

/** Sky palette per jungle variant. */
const JUNGLE_SKY: Record<string, { top: number; bottom: number; haze: number }> = {
  jungle_day:   { top: 0x4a8fbf, bottom: 0x7abf6a, haze: 0x9fd4a0 },
  jungle_dusk:  { top: 0x7a3a1a, bottom: 0xbf6a30, haze: 0xd4a070 },
  jungle_night: { top: 0x04080f, bottom: 0x0a1a0f, haze: 0x0f2a15 },
};

/**
 * Jungle parallax theme (4 layers + 1 cloud/fog layer = 5 total).
 *
 * Scroll factors:
 *   Cloud / fog      0.02  depth -25  (barely moves — almost sky-fixed)
 *   Far jungle       0.08  depth -20  (distant canopy silhouette)
 *   Mid jungle       0.20  depth -15  (mid-ground tree mass)
 *   Foreground veg   0.45  depth  -5  (large fronds in front, slightly above tiles)
 */
function _buildJungleLayers(
  scene: Phaser.Scene,
  levelW: number,
  levelH: number,
  theme: string,
): ParallaxLayer[] {
  const drawW = levelW + 1280;
  const drawH = levelH;
  const pal   = JUNGLE_SKY[theme] ?? JUNGLE_SKY['jungle_day'];

  // ── Layer 0 — sky gradient ────────────────────────────────────────────────
  const sky = new ParallaxLayer(scene, 0.02, 0.0, -25, (g) => {
    // Gradient approximation: fill rects top → bottom
    const bands = 16;
    const bandH = drawH / bands;
    for (let i = 0; i < bands; i++) {
      const t    = i / (bands - 1);
      const r    = _lerp((pal.top >> 16) & 0xff, (pal.bottom >> 16) & 0xff, t);
      const gv   = _lerp((pal.top >> 8)  & 0xff, (pal.bottom >> 8)  & 0xff, t);
      const b    = _lerp((pal.top)       & 0xff, (pal.bottom)       & 0xff, t);
      const col  = (r << 16) | (gv << 8) | b;
      g.fillStyle(col, 1);
      g.fillRect(0, i * bandH, drawW, Math.ceil(bandH) + 1);
    }

    // Sun / moon disk — deterministic position
    if (theme === 'jungle_day') {
      g.fillStyle(0xfff8cc, 0.9);
      g.fillCircle(drawW * 0.72, drawH * 0.12, 38);
      g.fillStyle(0xfffff0, 0.4);
      g.fillCircle(drawW * 0.72, drawH * 0.12, 52);
    } else if (theme === 'jungle_dusk') {
      g.fillStyle(0xff8833, 0.95);
      g.fillCircle(drawW * 0.18, drawH * 0.28, 52);
      g.fillStyle(0xff6600, 0.3);
      g.fillCircle(drawW * 0.18, drawH * 0.28, 72);
    } else {
      // night — pale moon
      g.fillStyle(0xe8e8cc, 0.85);
      g.fillCircle(drawW * 0.82, drawH * 0.10, 26);
      for (let i = 0; i < 140; i++) {
        const sx    = (i * 211 + 7)   % drawW;
        const sy    = (i * 137 + 19)  % (drawH * 0.8);
        const alpha = 0.2 + (i % 5) * 0.08;
        g.fillStyle(0xffffff, alpha);
        g.fillCircle(sx, sy, i % 11 === 0 ? 1.5 : 0.8);
      }
    }
  });

  // ── Layer 1 — cloud / fog band ────────────────────────────────────────────
  const clouds = new ParallaxLayer(scene, 0.02, 0.0, -22, (g) => {
    const fogAlpha = theme === 'jungle_night' ? 0.08 : 0.13;
    g.fillStyle(pal.haze, fogAlpha);
    // Irregular fog wisps using ellipses — deterministic positions
    const count = Math.ceil(drawW / 260) + 2;
    for (let i = 0; i < count; i++) {
      const cx = (i * 260) + ((i * 113 + 5) % 120) - 60;
      const cy = drawH * (0.06 + (i % 4) * 0.04);
      const rx = 220 + (i * 37 + 11) % 180;
      const ry = 28  + (i * 17 + 3)  % 22;
      g.fillEllipse(cx, cy, rx, ry);
    }
    // Second lighter wisp layer
    g.fillStyle(pal.haze, fogAlpha * 0.6);
    for (let i = 0; i < count; i++) {
      const cx = (i * 260) + 130 + ((i * 79 + 23) % 100) - 50;
      const cy = drawH * (0.09 + (i % 3) * 0.03);
      const rx = 160 + (i * 41 + 7) % 120;
      const ry = 20  + (i * 13 + 9) % 16;
      g.fillEllipse(cx, cy, rx, ry);
    }
  });

  // ── Layer 2 — far jungle silhouette ──────────────────────────────────────
  const farJungle = new ParallaxLayer(scene, 0.08, 0.02, -20, (g) => {
    // Dark canopy mass — rounded treetop silhouettes
    const fillCol = theme === 'jungle_night' ? 0x040e06 : 0x1a3a1a;
    g.fillStyle(fillCol, 1);

    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: drawH }];
    const step = 80;
    for (let x = 0; x <= drawW + step; x += step) {
      const baseH = 110 + ((x * 19 + 7) % 140);
      pts.push({ x, y: drawH - baseH });
      // Rounded canopy blobs
      if (x + step <= drawW + step) {
        const bumpH = baseH + 30 + ((x * 13 + 3) % 60);
        pts.push({ x: x + step * 0.4, y: drawH - bumpH });
        pts.push({ x: x + step * 0.6, y: drawH - bumpH + 8 });
      }
    }
    pts.push({ x: drawW + step, y: drawH });
    g.fillPoints(pts, true);

    // Highlight rim
    const rimCol = theme === 'jungle_night' ? 0x0a1a0a : 0x2a5a2a;
    g.lineStyle(1.5, rimCol, 0.6);
    g.strokePoints(pts.slice(1, pts.length - 1), false);
  });

  // ── Layer 3 — mid jungle canopy ───────────────────────────────────────────
  const midJungle = new ParallaxLayer(scene, 0.20, 0.04, -15, (g) => {
    const fillCol = theme === 'jungle_night' ? 0x071207 : 0x163016;
    g.fillStyle(fillCol, 1);

    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: drawH }];
    const step = 60;
    for (let x = 0; x <= drawW + step; x += step) {
      const baseH = 70 + ((x * 23 + 11) % 100);
      pts.push({ x, y: drawH - baseH });
      if (x + step <= drawW + step) {
        const bumpH = baseH + 20 + ((x * 17 + 5) % 50);
        pts.push({ x: x + step * 0.35, y: drawH - bumpH });
        pts.push({ x: x + step * 0.65, y: drawH - bumpH + 5 });
      }
    }
    pts.push({ x: drawW + step, y: drawH });
    g.fillPoints(pts, true);

    // Scattered bright leaf glints
    const leafCol = theme === 'jungle_night' ? 0x0f2a0f : 0x3a6a2a;
    g.fillStyle(leafCol, 0.7);
    for (let i = 0; i < 40; i++) {
      const lx = (i * 193 + 17) % drawW;
      const ly = drawH - 60 - ((i * 37 + 11) % 80);
      g.fillRect(lx, ly, 6 + (i % 4) * 2, 3);
    }
  });

  // ── Layer 4 — foreground vegetation ──────────────────────────────────────
  const foreground = new ParallaxLayer(scene, 0.45, 0.06, -5, (g) => {
    // Large frond silhouettes near bottom — slightly in front of world tiles
    const fillCol = theme === 'jungle_night' ? 0x050f05 : 0x0f200f;
    g.fillStyle(fillCol, 0.85);

    // Tall plant masses
    const clumpCount = Math.ceil(drawW / 340) + 2;
    for (let i = 0; i < clumpCount; i++) {
      const cx = i * 340 + ((i * 127 + 41) % 200) - 100;
      const baseY = drawH - 8;

      // Draw a fan of 5–7 frond segments
      const fronds = 5 + (i % 3);
      for (let f = 0; f < fronds; f++) {
        const angle = -0.6 + (f / (fronds - 1)) * 1.2;  // spread ~±34°
        const len   = 90 + ((i * 31 + f * 19) % 70);
        const ex    = cx + Math.sin(angle) * len;
        const ey    = baseY - Math.cos(angle) * len;
        const wx    = Math.cos(angle) * (6 + f % 3);
        const wy    = Math.sin(angle) * (6 + f % 3);

        g.fillTriangle(
          cx - wx, baseY + wy,
          cx + wx, baseY - wy,
          ex, ey,
        );
      }
    }
  });

  return [sky, clouds, farJungle, midJungle, foreground];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Linear interpolation between two values (0–255 channel). */
function _lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t) & 0xff;
}
