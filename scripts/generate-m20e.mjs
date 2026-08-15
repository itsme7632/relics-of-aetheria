/**
 * Relics of Aetheria — M20E Production Art Generator
 *
 * Generates all World 1 interactive production assets:
 *
 *  assets/objects/crystal.png           320×32  (10 frames 32×32)
 *  assets/effects/dust_puff.png         192×32  ( 6 frames 32×32)
 *  assets/effects/sparkle.png           256×32  ( 8 frames 32×32)
 *  assets/effects/collect_burst.png     256×32  ( 8 frames 32×32)
 *  assets/effects/particles/dust.png     64×16  ( 4 frames 16×16)
 *  assets/effects/particles/leaf.png     64×16  ( 4 frames 16×16)
 *  assets/effects/particles/spark.png    48×16  ( 3 frames 16×16)
 *  assets/effects/particles/crystal.png  64×16  ( 4 frames 16×16)
 *  assets/effects/particles/checkpoint.png 64×16 (4 frames 16×16)
 *  assets/effects/particles/damage.png   64×16  ( 4 frames 16×16)
 *  assets/ui/heart.png                   24×24  (plain image)
 *  assets/ui/heart_empty.png             24×24  (plain image)
 *  assets/ui/crystal_icon.png            16×16  (plain image)
 */

import { PNG } from 'pngjs';
import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_ROOT = path.resolve(__dirname, '../artifacts/relics-of-aetheria/assets');

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  // Crystal collectible
  CR_OUTLINE: [0x10,0x18,0x40], CR_DARK: [0x18,0x44,0x98], CR_MID: [0x28,0x70,0xC8],
  CR_LIGHT: [0x44,0x9C,0xE4], CR_BRIGHT: [0x88,0xD8,0xFF], CR_SHINE: [0xE4,0xF4,0xFF],
  CR_INNER: [0x30,0x7C,0xD8], CR_FACET: [0x20,0x54,0xB0], CR_GLOW: [0x58,0xA8,0xF0],
  // Heart
  HT_OUTLINE: [0x60,0x08,0x08], HT_DARK: [0x9C,0x10,0x10], HT_MID: [0xCC,0x22,0x22],
  HT_LIGHT: [0xF0,0x44,0x44], HT_SHINE: [0xFF,0xA0,0xA0],
  HT_EMPTY: [0x48,0x48,0x48], HT_EMPTY_DARK: [0x28,0x28,0x28], HT_EMPTY_OUTLINE: [0x50,0x18,0x18],
  // Particles – dust
  DUST_LIGHT: [0xE0,0xD8,0xC0], DUST_MID: [0xA8,0xA0,0x88], DUST_DARK: [0x78,0x70,0x58],
  // Particles – leaf
  LEAF_DARK: [0x28,0x5C,0x18], LEAF_MID: [0x3C,0x84,0x24], LEAF_LIGHT: [0x58,0xA8,0x38],
  LEAF_VEIN: [0x48,0x98,0x2C],
  // Particles – spark/checkpoint/damage
  GOLD_BRIGHT: [0xFF,0xEC,0x50], GOLD_MID: [0xF0,0xC0,0x20], GOLD_DARK: [0xC8,0x90,0x10],
  RED_BRIGHT: [0xFF,0x50,0x30], RED_MID: [0xE0,0x28,0x10], RED_DARK: [0xA0,0x18,0x08],
  ORG_MID: [0xFF,0x80,0x20],
  WHITE: [0xFF,0xFF,0xFF],
  // Effects
  PUFF_LIGHT: [0xD8,0xD0,0xBC], PUFF_MID: [0xA0,0x98,0x80], PUFF_DARK: [0x68,0x60,0x48],
  GREEN_BURST: [0x60,0xCC,0x30],
  CYAN_BURST: [0x40,0xEC,0xD8],
  YELLOW_BURST: [0xFF,0xE8,0x40],
};

// ── PNG utilities ─────────────────────────────────────────────────────────────
function makePng(w, h) {
  const p = new PNG({ width: w, height: h, colorType: 6, inputColorType: 6 });
  p.data.fill(0);
  return p;
}

function sp(png, x, y, col, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = col[0]; png.data[i+1] = col[1];
  png.data[i+2] = col[2]; png.data[i+3] = a;
}

function getA(png, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return 0;
  return png.data[(y * png.width + x) * 4 + 3];
}

function circle(png, cx, cy, r, col, a = 255) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx*dx + dy*dy <= r*r) sp(png, cx+dx, cy+dy, col, a);
}

function ellipse(png, cx, cy, rx, ry, col, a = 255) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if ((dx*dx)/(rx*rx) + (dy*dy)/(ry*ry) <= 1) sp(png, cx+dx, cy+dy, col, a);
}

function fl(png, x1, y1, x2, y2, col, a = 255) {
  let dx = Math.abs(x2-x1), sx = x1 < x2 ? 1 : -1;
  let dy = -Math.abs(y2-y1), sy = y1 < y2 ? 1 : -1, err = dx+dy;
  let x = x1, y = y1;
  const lim = dx + Math.abs(y2-y1) + 4;
  for (let i = 0; i < lim; i++) {
    sp(png, x, y, col, a);
    if (x === x2 && y === y2) break;
    const e2 = 2*err;
    if (e2 > dy) { err += dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

// Filled polygon (scanline)
function fillPoly(png, pts, col, a = 255) {
  const ys = pts.map(p => p[1]);
  const minY = Math.max(0, Math.ceil(Math.min(...ys)));
  const maxY = Math.min(png.height - 1, Math.floor(Math.max(...ys)));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i+1) % pts.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + (y - ay) / (by - ay) * (bx - ax));
      }
    }
    xs.sort((a, b) => a - b);
    for (let j = 0; j < xs.length - 1; j += 2) {
      for (let x = Math.ceil(xs[j]); x <= Math.floor(xs[j+1]); x++)
        sp(png, x, y, col, a);
    }
  }
}

function save(png, relPath) {
  const abs = path.join(ASSET_ROOT, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const data = PNG.sync.write(png);
  fs.writeFileSync(abs, data);
  // Validate
  let solid = 0, trans = 0, total = png.width * png.height;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] > 100) solid++; else if (png.data[i] === 0) trans++;
  }
  const ok = solid > 0 && trans > 0;
  console.log(`${ok?'✓':'✗'} ${relPath.padEnd(52)} ${png.width}×${png.height}  ${(data.length/1024).toFixed(1)}KB  solid=${solid}/${total}`);
  return ok;
}

// ════════════════════════════════════════════════════════════════════════════
// CRYSTAL  320×32  (10 frames × 32×32)
// ════════════════════════════════════════════════════════════════════════════
{
  const FW = 32, FH = 32, N = 10;
  const png = makePng(FW * N, FH);

  // Gem vertices (relative to frame center 16,16)
  // Classic pointed gem shape
  const GEM = [
    [0,-12],  // top point
    [-7,-5], [7,-5],  // upper shoulders
    [-9, 3], [9, 3],  // mid bulge
    [-6,10], [6,10],  // lower
    [0, 13],          // bottom point
  ];

  function gemAbs(fi, dx = 0, dy = 0) {
    return GEM.map(([x, y]) => [fi * FW + 16 + x + dx, 16 + y + dy]);
  }

  // Draw one crystal frame
  function drawCrystal(fi, shimmerX, shimmerY, shimmerR, glowA, collectPhase) {
    const OX = fi * FW;
    const cx = OX + 16, cy = 16;

    // Outer glow (subtle)
    if (glowA > 0) circle(png, cx, cy, 11, P.CR_GLOW, glowA);

    // Gem body – fill each facet differently
    // Main body
    fillPoly(png, gemAbs(fi), P.CR_MID);
    // Left dark facet
    fillPoly(png, [
      [OX+16, 4], [OX+7, 11], [OX+7, 19], [OX+16, 16]
    ], P.CR_FACET, 220);
    // Right light facet
    fillPoly(png, [
      [OX+16, 4], [OX+25, 11], [OX+25, 19], [OX+16, 16]
    ], P.CR_LIGHT, 200);
    // Bottom facet (darker)
    fillPoly(png, [
      [OX+16, 16], [OX+7, 19], [OX+16, 29], [OX+25, 19]
    ], P.CR_DARK, 220);
    // Top shine (bright highlight band)
    fillPoly(png, [
      [OX+16, 4], [OX+22, 8], [OX+18, 14], [OX+16, 12], [OX+14, 12], [OX+12, 9]
    ], P.CR_BRIGHT, 180);
    // Inner core glint
    circle(png, cx - 2, cy - 3, 2, P.CR_SHINE, 200);
    sp(png, cx - 2, cy - 4, P.CR_SHINE);

    // Shimmer highlight (moving)
    if (shimmerR > 0) {
      circle(png, OX + 16 + shimmerX, 16 + shimmerY, shimmerR, P.CR_SHINE, 220);
    }

    // Collect burst
    if (collectPhase > 0) {
      const r1 = collectPhase * 5;
      const r2 = collectPhase * 3;
      circle(png, cx, cy, Math.min(14, r1 + 3), P.CR_SHINE, Math.max(0, 200 - collectPhase * 50));
      // 4 sparkle rays
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI * 2 + collectPhase * 0.3;
        const rLen = 4 + collectPhase * 3;
        fl(png, cx, cy, Math.round(cx + Math.cos(ang)*rLen), Math.round(cy + Math.sin(ang)*rLen), P.CR_BRIGHT, 200);
      }
    }

    // Outline
    // Draw outline by tracing the polygon edges
    const pts = gemAbs(fi);
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i+1) % pts.length];
      fl(png, Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), P.CR_OUTLINE);
    }

    // Mask to gem shape (clear outside)
    // We do this by checking each pixel
    for (let y = 0; y < FH; y++) {
      for (let x = OX; x < OX + FW; x++) {
        if (getA(png, x, y) > 0) {
          // Check if inside gem polygon
          const lx = x - OX - 16, ly = y - 16;
          let inside = false;
          for (let i = 0, j = GEM.length - 1; i < GEM.length; j = i++) {
            const [xi, yi] = GEM[i], [xj, yj] = GEM[j];
            if (((yi > ly) !== (yj > ly)) &&
                (lx < (xj - xi) * (ly - yi) / (yj - yi) + xi))
              inside = !inside;
          }
          if (!inside) sp(png, x, y, [0,0,0], 0);
        }
      }
    }
  }

  // Idle frames 0-5: shimmer cycles
  const shimmerCycle = [
    [ 1,-4, 2, 15],  // shimmerX, shimmerY, shimmerR, glowA
    [ 3,-3, 2, 20],
    [ 2,-2, 3, 30],
    [-1,-4, 2, 20],
    [-3,-3, 2, 15],
    [ 0,-4, 1, 10],
  ];
  for (let f = 0; f < 6; f++) {
    const [sx, sy, sr, ga] = shimmerCycle[f];
    drawCrystal(f, sx, sy, sr, ga, 0);
  }
  // Collect frames 6-9: expanding burst
  for (let f = 0; f < 4; f++) {
    drawCrystal(6 + f, 0, -3, 0, 0, f + 1);
  }

  save(png, 'objects/crystal.png');
}

// ════════════════════════════════════════════════════════════════════════════
// EFFECT DUST PUFF  192×32  (6 frames × 32×32)
// ════════════════════════════════════════════════════════════════════════════
{
  const FW = 32, FH = 32, N = 6;
  const png = makePng(FW * N, FH);

  const radii    = [4,  7, 10, 13, 15, 17];
  const alphas   = [220,200,170,130, 80, 40];
  const innerAlp = [180,160,130, 80, 40,  0];

  for (let f = 0; f < N; f++) {
    const cx = f * FW + 16, cy = 16;
    const r  = radii[f], a = alphas[f], ia = innerAlp[f];
    // Outer puff ring
    circle(png, cx, cy, r,     P.PUFF_LIGHT, a);
    circle(png, cx-2, cy-2, Math.max(2, r-3), P.PUFF_LIGHT, Math.min(255, a+20));
    // Mid tone
    circle(png, cx, cy, Math.max(1, r-2), P.PUFF_MID, a);
    // Inner (darker, hollow effect on later frames)
    if (ia > 0) {
      circle(png, cx, cy, Math.max(1, r-4), P.PUFF_DARK, ia);
    } else if (f >= 3) {
      // Hollow ring on late frames
      circle(png, cx, cy, Math.max(1, r-4), [0,0,0], 0);
    }
    // Sub-puffs (lobe bumps for cloud effect)
    if (f >= 1) {
      const lr = Math.max(2, Math.floor(r * 0.55));
      circle(png, cx - Math.floor(r*0.6), cy - Math.floor(r*0.3), lr, P.PUFF_LIGHT, a);
      circle(png, cx + Math.floor(r*0.55), cy - Math.floor(r*0.35), lr, P.PUFF_LIGHT, a);
      circle(png, cx, cy - Math.floor(r*0.65), Math.max(1, lr-1), P.PUFF_LIGHT, a);
    }
    // Slight outline on first frame only
    if (f === 0) {
      circle(png, cx, cy, r+1, P.PUFF_DARK, 60);
    }
  }

  save(png, 'effects/dust_puff.png');
}

// ════════════════════════════════════════════════════════════════════════════
// EFFECT SPARKLE  256×32  (8 frames × 32×32)
// ════════════════════════════════════════════════════════════════════════════
{
  const FW = 32, FH = 32, N = 8;
  const png = makePng(FW * N, FH);

  for (let f = 0; f < N; f++) {
    const cx = f * FW + 16, cy = 16;
    const t = f / (N - 1); // 0..1
    const r = 1 + f * 2;
    const a = f < 4 ? 220 + f * 8 : Math.max(20, 255 - (f - 4) * 70);

    if (f < 4) {
      // Growing star: center glow + 4 rays
      circle(png, cx, cy, Math.max(1, r - 1), P.GOLD_BRIGHT, a);
      circle(png, cx, cy, Math.max(1, r - 2), P.WHITE, Math.min(255, a + 20));
    }
    // 4-point star rays
    const rayLen = 2 + f * 2.5;
    for (let k = 0; k < 4; k++) {
      const ang = k * Math.PI / 2;
      for (let d = 0; d < rayLen; d++) {
        const alpha = a * (1 - d / rayLen);
        const col = d < rayLen * 0.4 ? P.WHITE : d < rayLen * 0.7 ? P.GOLD_BRIGHT : P.GOLD_MID;
        sp(png, Math.round(cx + Math.cos(ang)*d), Math.round(cy + Math.sin(ang)*d), col, alpha);
      }
    }
    // Diagonal rays (smaller, 45°)
    if (f >= 1) {
      const dRayLen = rayLen * 0.6;
      for (let k = 0; k < 4; k++) {
        const ang = k * Math.PI / 2 + Math.PI / 4;
        for (let d = 0; d < dRayLen; d++) {
          const alpha = a * 0.8 * (1 - d / dRayLen);
          sp(png, Math.round(cx + Math.cos(ang)*d), Math.round(cy + Math.sin(ang)*d), P.GOLD_MID, alpha);
        }
      }
    }
    // Late frames: add outer ring
    if (f >= 5) {
      circle(png, cx, cy, r + 1, P.GOLD_DARK, Math.max(10, a - 40));
    }
  }

  save(png, 'effects/sparkle.png');
}

// ════════════════════════════════════════════════════════════════════════════
// EFFECT COLLECT BURST  256×32  (8 frames × 32×32)
// ════════════════════════════════════════════════════════════════════════════
{
  const FW = 32, FH = 32, N = 8;
  const png = makePng(FW * N, FH);

  const burstCols = [P.WHITE, P.CR_BRIGHT, P.GOLD_BRIGHT, P.GREEN_BURST, P.CYAN_BURST];

  for (let f = 0; f < N; f++) {
    const cx = f * FW + 16, cy = 16;
    const r = 2 + f * 2;
    const a = f === 0 ? 250 : f < 4 ? 220 : Math.max(15, 200 - (f-4)*55);

    if (f === 0) {
      // Initial flash
      circle(png, cx, cy, 6, P.WHITE, 240);
      circle(png, cx, cy, 3, P.CR_SHINE, 255);
    } else {
      // Expanding ring
      const ringOuter = r;
      const ringInner = Math.max(0, r - 3);
      for (let dy = -ringOuter; dy <= ringOuter; dy++) {
        for (let dx = -ringOuter; dx <= ringOuter; dx++) {
          const d2 = dx*dx + dy*dy;
          if (d2 <= ringOuter*ringOuter && d2 >= ringInner*ringInner) {
            const ang = Math.atan2(dy, dx);
            const segIdx = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * burstCols.length);
            sp(png, cx+dx, cy+dy, burstCols[segIdx % burstCols.length], a);
          }
        }
      }
      // Sparkle dots at ring edge
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2 + f * 0.2;
        const sx = Math.round(cx + Math.cos(ang) * r);
        const sy = Math.round(cy + Math.sin(ang) * r);
        sp(png, sx, sy, P.WHITE, Math.min(255, a + 30));
        sp(png, sx, sy - 1, P.WHITE, Math.min(255, a));
      }
    }
  }

  save(png, 'effects/collect_burst.png');
}

// ════════════════════════════════════════════════════════════════════════════
// PARTICLE STRIPS  16×16/frame
// ════════════════════════════════════════════════════════════════════════════

// ── dust  (4 frames) ──────────────────────────────────────────────────────────
{
  const N = 4, FW = 16, FH = 16;
  const png = makePng(FW * N, FH);
  const radii = [2, 4, 5, 6], alphas = [200, 170, 110, 50];
  for (let f = 0; f < N; f++) {
    const cx = f * FW + 8, cy = 8;
    circle(png, cx, cy, radii[f], P.DUST_LIGHT, alphas[f]);
    circle(png, cx, cy, Math.max(1, radii[f]-1), P.DUST_MID, alphas[f]);
    if (f < 3) circle(png, cx, cy, Math.max(1, radii[f]-2), P.DUST_DARK, alphas[f]);
    // Sub-puff lumps
    if (f >= 1) {
      const lr = Math.max(1, radii[f]-2);
      circle(png, cx-2, cy-2, lr, P.DUST_LIGHT, alphas[f]-20);
      circle(png, cx+2, cy-2, lr, P.DUST_LIGHT, alphas[f]-20);
    }
  }
  save(png, 'effects/particles/dust.png');
}

// ── leaf  (4 frames) ──────────────────────────────────────────────────────────
{
  const N = 4, FW = 16, FH = 16;
  const png = makePng(FW * N, FH);
  // Leaf: small ellipse rotated + fading
  const angles = [0.1, 0.5, 1.0, 1.6];
  const alphas = [220, 180, 120, 60];
  const ys     = [7, 8, 9, 10];
  for (let f = 0; f < N; f++) {
    const cx = f * FW + 8, cy = ys[f];
    const ang = angles[f];
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const a = alphas[f];
    // Leaf shape: 5 wide, 3 tall rotated
    for (let dy = -3; dy <= 3; dy++) for (let dx = -5; dx <= 5; dx++) {
      if ((dx*dx)/25 + (dy*dy)/9 <= 1) {
        const rx = Math.round(cx + dx * cos - dy * sin);
        const ry = Math.round(cy + dx * sin + dy * cos);
        sp(png, rx, ry, P.LEAF_MID, a);
      }
    }
    // Vein line
    fl(png, Math.round(cx - 4*cos), Math.round(cy - 4*sin),
           Math.round(cx + 4*cos), Math.round(cy + 4*sin), P.LEAF_VEIN, Math.min(255, a+20));
    // Outline edge
    for (let dy = -3; dy <= 3; dy++) for (let dx = -5; dx <= 5; dx++) {
      if (Math.abs((dx*dx)/25 + (dy*dy)/9 - 1) < 0.35) {
        const rx = Math.round(cx + dx * cos - dy * sin);
        const ry = Math.round(cy + dx * sin + dy * cos);
        sp(png, rx, ry, P.LEAF_DARK, a);
      }
    }
  }
  save(png, 'effects/particles/leaf.png');
}

// ── spark  (3 frames) ─────────────────────────────────────────────────────────
{
  const N = 3, FW = 16, FH = 16;
  const png = makePng(FW * N, FH);
  const sizes  = [3, 6, 4];
  const alphas = [255, 200, 100];
  for (let f = 0; f < N; f++) {
    const cx = f * FW + 8, cy = 8;
    const s = sizes[f], a = alphas[f];
    // Bright center
    circle(png, cx, cy, Math.max(1, s-2), P.WHITE, a);
    // 4 rays
    for (let k = 0; k < 4; k++) {
      const ang = k * Math.PI / 2;
      for (let d = 0; d <= s; d++) {
        const ra = a * (1 - d / s);
        sp(png, Math.round(cx + Math.cos(ang)*d), Math.round(cy + Math.sin(ang)*d),
           d < s*0.5 ? P.WHITE : P.GOLD_BRIGHT, ra);
      }
    }
    sp(png, cx, cy, P.WHITE, a);
  }
  save(png, 'effects/particles/spark.png');
}

// ── crystal particle  (4 frames) ─────────────────────────────────────────────
{
  const N = 4, FW = 16, FH = 16;
  const png = makePng(FW * N, FH);
  const radii  = [2, 4, 5, 6];
  const alphas = [220, 190, 130, 60];
  for (let f = 0; f < N; f++) {
    const cx = f * FW + 8, cy = 8;
    const r = radii[f], a = alphas[f];
    circle(png, cx, cy, r, P.CR_LIGHT, a);
    circle(png, cx, cy, Math.max(1, r-1), P.CR_BRIGHT, a);
    if (f < 2) circle(png, cx, cy, Math.max(1, r-2), P.CR_SHINE, a);
    // Small diamond sparkle
    sp(png, cx, cy - r,   P.CR_SHINE, Math.min(255, a+30));
    sp(png, cx, cy + r,   P.CR_SHINE, Math.min(255, a+20));
    sp(png, cx - r, cy,   P.CR_SHINE, Math.min(255, a+20));
    sp(png, cx + r, cy,   P.CR_SHINE, Math.min(255, a+30));
  }
  save(png, 'effects/particles/crystal.png');
}

// ── checkpoint particle  (4 frames) — gold starburst ─────────────────────────
{
  const N = 4, FW = 16, FH = 16;
  const png = makePng(FW * N, FH);
  const sizes  = [3, 5, 6, 5];
  const alphas = [255, 230, 160, 70];
  for (let f = 0; f < N; f++) {
    const cx = f * FW + 8, cy = 8;
    const s = sizes[f], a = alphas[f];
    // Center glow
    circle(png, cx, cy, Math.max(1, s-2), P.GOLD_BRIGHT, a);
    sp(png, cx, cy, P.WHITE, a);
    // 8-point star
    for (let k = 0; k < 8; k++) {
      const ang = k * Math.PI / 4;
      const rLen = k % 2 === 0 ? s : Math.ceil(s * 0.6);
      for (let d = 0; d <= rLen; d++) {
        const ra = a * (1 - d / rLen);
        const col = d < rLen * 0.4 ? P.WHITE : d < rLen * 0.7 ? P.GOLD_BRIGHT : P.GOLD_MID;
        sp(png, Math.round(cx + Math.cos(ang)*d), Math.round(cy + Math.sin(ang)*d), col, ra);
      }
    }
  }
  save(png, 'effects/particles/checkpoint.png');
}

// ── damage particle  (4 frames) — red burst ──────────────────────────────────
{
  const N = 4, FW = 16, FH = 16;
  const png = makePng(FW * N, FH);
  const radii  = [2, 4, 5, 6];
  const alphas = [240, 200, 140, 60];
  for (let f = 0; f < N; f++) {
    const cx = f * FW + 8, cy = 8;
    const r = radii[f], a = alphas[f];
    // Outer ring
    circle(png, cx, cy, r, P.RED_MID, a);
    // Inner glow
    circle(png, cx, cy, Math.max(1, r-1), P.RED_BRIGHT, a);
    if (f < 2) circle(png, cx, cy, Math.max(1, r-2), P.WHITE, Math.min(255, a+20));
    // 4 spike rays
    for (let k = 0; k < 4; k++) {
      const ang = k * Math.PI / 2 + 0.4;
      const d = r + 1;
      sp(png, Math.round(cx + Math.cos(ang)*d), Math.round(cy + Math.sin(ang)*d), P.ORG_MID, a);
    }
    // Hollow center on late frames
    if (f >= 3) circle(png, cx, cy, Math.max(1, r-3), [0,0,0], 0);
  }
  save(png, 'effects/particles/damage.png');
}

// ════════════════════════════════════════════════════════════════════════════
// UI HEART  24×24  (full)
// ════════════════════════════════════════════════════════════════════════════
{
  const png = makePng(24, 24);
  // Heart shape spans: [rowY, x_start, x_end] (inclusive)
  const SPANS = [
    [4,  3,8,  13,18],
    [5,  2,10, 12,20],
    [6,  1,21],
    [7,  1,21],
    [8,  1,21],
    [9,  1,21],
    [10, 2,20],
    [11, 3,19],
    [12, 4,18],
    [13, 5,17],
    [14, 6,16],
    [15, 7,15],
    [16, 8,14],
    [17, 9,13],
    [18, 10,12],
    [19, 11,11],
  ];

  for (const span of SPANS) {
    const y = span[0];
    if (span.length === 5) {
      // Two separate lobes
      for (let x = span[1]; x <= span[2]; x++) sp(png, x, y, P.HT_MID);
      for (let x = span[3]; x <= span[4]; x++) sp(png, x, y, P.HT_MID);
    } else {
      for (let x = span[1]; x <= span[2]; x++) sp(png, x, y, P.HT_MID);
    }
  }

  // Highlights (top-left of each lobe)
  for (const [x, y] of [[4,6],[5,6],[4,7],[5,7],[3,7],[14,6],[15,6],[14,7],[15,7]]) sp(png, x, y, P.HT_LIGHT);
  for (const [x, y] of [[5,5],[6,5],[15,5],[16,5]]) sp(png, x, y, P.HT_SHINE);

  // Outline: trace using dark color
  for (const span of SPANS) {
    const y = span[0];
    if (span.length === 5) {
      sp(png, span[1]-1, y, P.HT_OUTLINE); sp(png, span[2]+1, y, P.HT_OUTLINE);
      sp(png, span[3]-1, y, P.HT_OUTLINE); sp(png, span[4]+1, y, P.HT_OUTLINE);
    } else {
      sp(png, span[1]-1, y, P.HT_OUTLINE); sp(png, span[2]+1, y, P.HT_OUTLINE);
    }
  }
  // Top row outlines
  for (const [x, y] of [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[13,3],[14,3],[15,3],[16,3],[17,3],[18,3]])
    sp(png, x, y, P.HT_OUTLINE);
  for (const [x, y] of [[2,4],[9,4],[11,4],[12,4],[19,4]]) sp(png, x, y, P.HT_OUTLINE);
  sp(png, 10, 4, P.HT_OUTLINE); sp(png, 11, 4, P.HT_OUTLINE);
  // Bottom outline
  sp(png, 10, 20, P.HT_OUTLINE); sp(png, 11, 20, P.HT_OUTLINE); sp(png, 12, 20, P.HT_OUTLINE);

  // Shadow (bottom-right)
  for (const [x, y] of [[17,9],[18,9],[19,9],[17,10],[18,10],[17,11],[16,12]])
    if (getA(png, x, y) > 100) sp(png, x, y, P.HT_DARK);

  save(png, 'ui/heart.png');
}

// ════════════════════════════════════════════════════════════════════════════
// UI HEART EMPTY  24×24
// ════════════════════════════════════════════════════════════════════════════
{
  const png = makePng(24, 24);
  const SPANS = [
    [4,  3,8,  13,18],
    [5,  2,10, 12,20],
    [6,  1,21],
    [7,  1,21],
    [8,  1,21],
    [9,  1,21],
    [10, 2,20],
    [11, 3,19],
    [12, 4,18],
    [13, 5,17],
    [14, 6,16],
    [15, 7,15],
    [16, 8,14],
    [17, 9,13],
    [18, 10,12],
    [19, 11,11],
  ];

  for (const span of SPANS) {
    const y = span[0];
    if (span.length === 5) {
      for (let x = span[1]; x <= span[2]; x++) sp(png, x, y, P.HT_EMPTY);
      for (let x = span[3]; x <= span[4]; x++) sp(png, x, y, P.HT_EMPTY);
    } else {
      for (let x = span[1]; x <= span[2]; x++) sp(png, x, y, P.HT_EMPTY);
    }
  }
  // Slight inner shadow variation
  for (const span of SPANS) {
    const y = span[0];
    if (span.length === 5) {
      sp(png, span[1], y, P.HT_EMPTY_DARK); sp(png, span[2], y, P.HT_EMPTY_DARK);
      sp(png, span[3], y, P.HT_EMPTY_DARK); sp(png, span[4], y, P.HT_EMPTY_DARK);
    } else if (span[1] !== span[2]) {
      sp(png, span[1], y, P.HT_EMPTY_DARK); sp(png, span[2], y, P.HT_EMPTY_DARK);
    }
  }
  // Outline
  for (const span of SPANS) {
    const y = span[0];
    if (span.length === 5) {
      sp(png, span[1]-1, y, P.HT_EMPTY_OUTLINE); sp(png, span[2]+1, y, P.HT_EMPTY_OUTLINE);
      sp(png, span[3]-1, y, P.HT_EMPTY_OUTLINE); sp(png, span[4]+1, y, P.HT_EMPTY_OUTLINE);
    } else {
      sp(png, span[1]-1, y, P.HT_EMPTY_OUTLINE); sp(png, span[2]+1, y, P.HT_EMPTY_OUTLINE);
    }
  }
  for (const [x, y] of [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[13,3],[14,3],[15,3],[16,3],[17,3],[18,3]])
    sp(png, x, y, P.HT_EMPTY_OUTLINE);
  for (const [x, y] of [[2,4],[9,4],[10,4],[11,4],[12,4],[19,4]]) sp(png, x, y, P.HT_EMPTY_OUTLINE);
  sp(png, 10, 20, P.HT_EMPTY_OUTLINE); sp(png, 11, 20, P.HT_EMPTY_OUTLINE); sp(png, 12, 20, P.HT_EMPTY_OUTLINE);

  save(png, 'ui/heart_empty.png');
}

// ════════════════════════════════════════════════════════════════════════════
// UI CRYSTAL ICON  16×16
// ════════════════════════════════════════════════════════════════════════════
{
  const png = makePng(16, 16);
  const cx = 8, cy = 8;

  // Mini gem at 16×16 — polygon
  const GEM_S = [[0,-6],[-4,-2],[-5,2],[-3,5],[0,6],[3,5],[5,2],[4,-2]];
  fillPoly(png, GEM_S.map(([x,y])=>[cx+x,cy+y]), P.CR_MID);
  fillPoly(png, [
    [cx,cy-6],[cx+4,cy-2],[cx+2,cy+2],[cx,cy]
  ], P.CR_LIGHT, 200);
  fillPoly(png, [
    [cx,cy],[cx-4,cy-2],[cx-5,cy+2],[cx,cy+2]
  ], P.CR_FACET, 200);
  fillPoly(png, [
    [cx,cy],[cx-3,cy+5],[cx,cy+6],[cx+3,cy+5]
  ], P.CR_DARK, 220);
  // Top shine
  circle(png, cx-1, cy-3, 1, P.CR_SHINE, 200);
  sp(png, cx-1, cy-4, P.CR_SHINE);
  // Outline
  for (let i = 0; i < GEM_S.length; i++) {
    const [ax, ay] = GEM_S[i], [bx, by] = GEM_S[(i+1)%GEM_S.length];
    fl(png, cx+ax, cy+ay, cx+bx, cy+by, P.CR_OUTLINE);
  }

  save(png, 'ui/crystal_icon.png');
}

console.log('\nM20E generation complete.');
