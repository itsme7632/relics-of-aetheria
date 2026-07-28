import Phaser from 'phaser';

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

// ─── Procedural background factory ───────────────────────────────────────────

/**
 * Build the three default background parallax layers for a level.
 * Layers are drawn once; the returned array should be stored and
 * destroyed on scene shutdown.
 *
 * @param scene       Active Phaser scene.
 * @param levelW      Level width in pixels.
 * @param levelH      Level height in pixels.
 */
export function buildParallaxLayers(
  scene: Phaser.Scene,
  levelW: number,
  levelH: number,
): ParallaxLayer[] {
  // Draw a little wider than the level to guarantee no visible edge at any
  // scroll position.
  const drawW = levelW + 1280;
  const drawH = levelH;

  // ── Layer 0 — deep sky with stars (barely moves) ──────────────────────────
  const sky = new ParallaxLayer(scene, 0.05, 0.0, -20, (g) => {
    // Solid sky fill
    g.fillStyle(0x0a0a16, 1);
    g.fillRect(0, 0, drawW, drawH);

    // Deterministic star field — no allocations, no Math.random()
    for (let i = 0; i < 260; i++) {
      const sx = (i * 137 + 11) % drawW;
      const sy = (i * 89  + 31) % (drawH * 0.85); // stars in upper 85%
      const alpha = 0.25 + (i % 7) * 0.07;         // 0.25–0.67
      const radius = i % 9 === 0 ? 1.5 : 1;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(sx, sy, radius);
    }

    // Subtle nebula blobs — two faint ellipses
    g.fillStyle(0x1a0a3a, 0.18);
    g.fillEllipse(drawW * 0.3, drawH * 0.25, 500, 160);
    g.fillStyle(0x0a1a30, 0.15);
    g.fillEllipse(drawW * 0.75, drawH * 0.35, 380, 120);
  });

  // ── Layer 1 — far mountain silhouettes ────────────────────────────────────
  const mountains = new ParallaxLayer(scene, 0.15, 0.03, -15, (g) => {
    // Mountain fill colour — dark purple
    g.fillStyle(0x150d2a, 1);

    // Build a closed mountain polygon using deterministic heights
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    pts.push({ x: 0, y: drawH });

    const step = 220;
    for (let x = 0; x <= drawW; x += step) {
      // Use prime-multiplied x to get varying peak heights without Math.random
      const peakH = 120 + ((x * 17 + 3) % 180);   // 120–300 px
      pts.push({ x, y: drawH - peakH });
      // Add mid-point to break up regularity
      if (x + step <= drawW) {
        const midH = 60 + ((x * 11 + 7) % 80);     // 60–140 px
        pts.push({ x: x + step / 2, y: drawH - midH });
      }
    }

    pts.push({ x: drawW, y: drawH });
    g.fillPoints(pts, true);

    // Thin highlight rim along the peaks — lighter purple
    g.lineStyle(1, 0x2a1850, 0.5);
    g.strokePoints(pts.slice(1, pts.length - 1), false);
  });

  // ── Layer 2 — mid hills ───────────────────────────────────────────────────
  const hills = new ParallaxLayer(scene, 0.35, 0.08, -10, (g) => {
    // Hill fill — dark teal
    g.fillStyle(0x091b22, 1);

    const pts: Phaser.Types.Math.Vector2Like[] = [];
    pts.push({ x: 0, y: drawH });

    const step = 160;
    for (let x = 0; x <= drawW; x += step) {
      const peakH = 50 + ((x * 23 + 5) % 100);   // 50–150 px
      pts.push({ x, y: drawH - peakH });
      if (x + step <= drawW) {
        const midH = 30 + ((x * 13 + 9) % 50);    // 30–80 px
        pts.push({ x: x + step / 2, y: drawH - midH });
      }
    }

    pts.push({ x: drawW, y: drawH });
    g.fillPoints(pts, true);
  });

  return [sky, mountains, hills];
}
