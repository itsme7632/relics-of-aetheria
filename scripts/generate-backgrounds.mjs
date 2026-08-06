/**
 * Relics of Aetheria — M20B World 1 Jungle Background Generator
 *
 * Generates 8 production-quality parallax background PNGs.
 * Style: Minish Cap / Owlboy / Celeste / Eastward — bright pixel-art jungle.
 *
 * Output: artifacts/relics-of-aetheria/assets/worlds/world01_jungle/backgrounds/
 *   sky.png        1280×704  solid     depth -25  scrollX 0.02
 *   clouds.png     1280×704  transparent bg  depth -22  scrollX 0.015
 *   mountains.png  1280×704  transparent bg  depth -20  scrollX 0.06
 *   jungle.png     1280×704  transparent bg  depth -15  scrollX 0.14
 *   trees.png      1280×704  transparent bg  depth -12  scrollX 0.20
 *   vines.png      1280×704  transparent bg  depth  -5  scrollX 0.28
 *   mist.png       1280×704  transparent bg  depth  -4  scrollX 0.10
 *   sunrays.png    1280×704  transparent bg  depth  -3  scrollX 0.05
 *
 * All images tile seamlessly horizontally.
 */

import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const W = 1280;
const H = 704;

const OUT_DIR = path.resolve(
  'artifacts/relics-of-aetheria/assets/worlds/world01_jungle/backgrounds',
);
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Low-level helpers ─────────────────────────────────────────────────────────

function mkPNG() {
  const png = new PNG({ width: W, height: H, colorType: 6, inputColorType: 6 });
  png.data.fill(0);   // fully transparent by default
  return png;
}

function setPixel(buf, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
}

/** Blend-over src onto existing pixel (standard Porter-Duff over) */
function blendPixel(buf, x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H || a === 0) return;
  const i = (y * W + x) * 4;
  const da = buf[i+3] / 255;
  const sa = a / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return;
  buf[i]   = Math.round((r * sa + buf[i]   * da * (1 - sa)) / oa);
  buf[i+1] = Math.round((g * sa + buf[i+1] * da * (1 - sa)) / oa);
  buf[i+2] = Math.round((b * sa + buf[i+2] * da * (1 - sa)) / oa);
  buf[i+3] = Math.round(oa * 255);
}

function fillRect(buf, x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      blendPixel(buf, x + dx, y + dy, r, g, b, a);
}

function fillRectSolid(buf, x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(buf, x + dx, y + dy, r, g, b, a);
}

function fillEllipse(buf, cx, cy, rx, ry, r, g, b, a = 255) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1)
        blendPixel(buf, cx + dx, cy + dy, r, g, b, a);
}

function fillCircle(buf, cx, cy, rad, r, g, b, a = 255) {
  fillEllipse(buf, cx, cy, rad, rad, r, g, b, a);
}

/** Linear interpolation */
const lerp = (a, b, t) => a + (b - a) * t;

/** Clamp */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Save PNG buffer to disk */
function savePNG(png, name) {
  const chunks = [];
  png.pack()
    .on('data', c => chunks.push(c))
    .on('end', () => {
      const data = Buffer.concat(chunks);
      const p = path.join(OUT_DIR, name);
      fs.writeFileSync(p, data);
      console.log(`✓ ${name.padEnd(20)} ${W}×${H}  ${(data.length/1024).toFixed(1)} KB`);
    });
}

// ── Palette ───────────────────────────────────────────────────────────────────
// Hex helpers
const hR = h => (h >> 16) & 0xff;
const hG = h => (h >> 8)  & 0xff;
const hB = h => h & 0xff;

// Tileset-complementary jungle palette
const PAL = {
  // Sky gradient
  skyTop:      0x1A4A8C,
  skyMid:      0x3A7AC8,
  skyHorizon:  0x7AB8E8,
  skyHaze:     0xB0D8F5,

  // Sun
  sunCore:     0xFFF0A0,
  sunGlow1:    0xFFD878,
  sunGlow2:    0xFFB040,

  // Clouds
  cloudBright: 0xF0F8FF,
  cloudMid:    0xD8EAF8,
  cloudShadow: 0xA8C8E0,

  // Mountains
  mtFar:       0x6878B8,
  mtMid:       0x4A5A98,
  mtSnow:      0xE8F0FF,
  mtSnowShadow:0xC8D8EE,

  // Far jungle canopy
  jungleFar1:  0x1E3C18,
  jungleFar2:  0x2A5020,
  jungleFar3:  0x345C28,

  // Mid trees
  treeDark:    0x1E4E14,
  treeMid:     0x2D6A1C,
  treeLight:   0x3E8828,
  treeTrunk:   0x4A2C10,

  // Foreground vines
  vineDark:    0x1A4010,
  vineMid:     0x2A6018,
  vineLight:   0x3A8028,
  vineLeaf:    0x50A040,

  // Mist
  mistColor:   0xC8E8F8,

  // Sun rays
  rayColor:    0xFFEE88,
};

// ── Noise / shape helpers ─────────────────────────────────────────────────────

/**
 * A simple pseudo-random height profile that tiles seamlessly at period=W.
 * Built from a sum of cosines — each term is periodic at W, so the sum is too.
 */
function seamlessProfile(x, terms) {
  // terms: array of [amplitude, frequency, phase]
  let h = 0;
  for (const [amp, freq, phase] of terms) {
    h += amp * Math.cos((2 * Math.PI * freq * x) / W + phase);
  }
  return h;
}

/**
 * Soft noise for organic variation (not seamless — used for textures within shapes).
 */
function noise1d(x, seed) {
  const s = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453123;
  return s - Math.floor(s);
}

function noise2d(x, y, seed = 0) {
  return noise1d(x + y * 37.0, seed);
}

// ── 1. sky.png ────────────────────────────────────────────────────────────────
{
  const png = mkPNG();
  const buf = png.data;

  // Vertical gradient: skyTop at top → skyHorizon at 70% → skyHaze at bottom
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    let r, g, b;
    if (t < 0.5) {
      const s = t / 0.5;
      r = Math.round(lerp(hR(PAL.skyTop), hR(PAL.skyMid), s));
      g = Math.round(lerp(hG(PAL.skyTop), hG(PAL.skyMid), s));
      b = Math.round(lerp(hB(PAL.skyTop), hB(PAL.skyMid), s));
    } else {
      const s = (t - 0.5) / 0.5;
      r = Math.round(lerp(hR(PAL.skyMid), hR(PAL.skyHaze), s));
      g = Math.round(lerp(hG(PAL.skyMid), hG(PAL.skyHaze), s));
      b = Math.round(lerp(hB(PAL.skyMid), hB(PAL.skyHaze), s));
    }
    // Dither the gradient slightly for pixel-art feel (every other row is 1 step lighter)
    const dither = (y % 2 === 0 && noise1d(y, 7) > 0.7) ? 4 : 0;
    for (let x = 0; x < W; x++)
      setPixel(buf, x, y, clamp(r+dither,0,255), clamp(g+dither,0,255), clamp(b+dither,0,255), 255);
  }

  // Sun disc (upper-right quadrant)
  const sunX = Math.floor(W * 0.72);
  const sunY = Math.floor(H * 0.12);
  // outer glow
  fillCircle(buf, sunX, sunY, 38, hR(PAL.sunGlow2), hG(PAL.sunGlow2), hB(PAL.sunGlow2), 60);
  fillCircle(buf, sunX, sunY, 28, hR(PAL.sunGlow1), hG(PAL.sunGlow1), hB(PAL.sunGlow1), 120);
  fillCircle(buf, sunX, sunY, 18, hR(PAL.sunCore),  hG(PAL.sunCore),  hB(PAL.sunCore),  220);
  fillCircle(buf, sunX, sunY, 12, 255, 255, 240, 255);

  // Horizon shimmer — slight warm tint near bottom
  for (let y = H - 80; y < H; y++) {
    const a = Math.round(((y - (H - 80)) / 80) * 40);
    for (let x = 0; x < W; x++)
      blendPixel(buf, x, y, 255, 220, 160, a);
  }

  savePNG(png, 'sky.png');
}

// ── 2. clouds.png ─────────────────────────────────────────────────────────────
{
  const png = mkPNG();
  const buf = png.data;

  // Cloud definitions: [cx, cy, main_rx, main_ry]
  // Spread across 0..W so they tile. Keep left and right margins clear.
  const clouds = [
    [140, 80,  90, 42],
    [420, 60,  70, 32],
    [650, 100, 110, 48],
    [900, 70,  80, 36],
    [1100,90,  65, 30],
    // wrap-around cloud at W+140 mirrors the first cloud for seamless tiling
    [-140+1280, 80, 90, 42],
  ];

  function drawCloud(bx, by, rx, ry) {
    // shadow layer
    fillEllipse(buf, bx, by+8,      rx,   ry,   hR(PAL.cloudShadow), hG(PAL.cloudShadow), hB(PAL.cloudShadow), 160);
    fillEllipse(buf, bx-rx*0.4, by+4, rx*0.65, ry*0.8, hR(PAL.cloudShadow), hG(PAL.cloudShadow), hB(PAL.cloudShadow), 120);
    fillEllipse(buf, bx+rx*0.4, by+4, rx*0.65, ry*0.8, hR(PAL.cloudShadow), hG(PAL.cloudShadow), hB(PAL.cloudShadow), 120);
    // mid layer
    fillEllipse(buf, bx, by,        rx,   ry,   hR(PAL.cloudMid), hG(PAL.cloudMid), hB(PAL.cloudMid), 210);
    fillEllipse(buf, bx-rx*0.4, by-4, rx*0.65, ry*0.8, hR(PAL.cloudMid), hG(PAL.cloudMid), hB(PAL.cloudMid), 200);
    fillEllipse(buf, bx+rx*0.4, by-4, rx*0.65, ry*0.8, hR(PAL.cloudMid), hG(PAL.cloudMid), hB(PAL.cloudMid), 200);
    // bright top
    fillEllipse(buf, bx, by,        rx-8, ry-8, hR(PAL.cloudBright), hG(PAL.cloudBright), hB(PAL.cloudBright), 240);
    fillEllipse(buf, bx-rx*0.3, by-8, rx*0.45, ry*0.55, hR(PAL.cloudBright), hG(PAL.cloudBright), hB(PAL.cloudBright), 230);
    fillEllipse(buf, bx+rx*0.3, by-8, rx*0.45, ry*0.55, hR(PAL.cloudBright), hG(PAL.cloudBright), hB(PAL.cloudBright), 230);
    // highlight pixel row
    for (let dx = -Math.floor(rx*0.6); dx <= Math.floor(rx*0.6); dx++)
      blendPixel(buf, bx+dx, by - ry + 2, 255, 255, 255, 180);
  }

  for (const [cx, cy, rx, ry] of clouds)
    drawCloud(cx, cy, rx, ry);

  // small wispy clouds in mid-area
  const wispy = [[200,150,40,14],[550,130,50,16],[800,160,36,12],[1050,140,44,14]];
  for (const [cx,cy,rx,ry] of wispy) {
    fillEllipse(buf, cx, cy, rx, ry, hR(PAL.cloudBright), hG(PAL.cloudBright), hB(PAL.cloudBright), 140);
    fillEllipse(buf, cx-rx*0.4, cy-4, rx*0.5, ry, hR(PAL.cloudBright), hG(PAL.cloudBright), hB(PAL.cloudBright), 100);
    fillEllipse(buf, cx+rx*0.4, cy-4, rx*0.5, ry, hR(PAL.cloudBright), hG(PAL.cloudBright), hB(PAL.cloudBright), 100);
  }

  savePNG(png, 'clouds.png');
}

// ── 3. mountains.png ─────────────────────────────────────────────────────────
{
  const png = mkPNG();
  const buf = png.data;

  // Mountain silhouette: seamless periodic height function
  // h(x) = base + sum of cosines
  const baseY = Math.floor(H * 0.55);  // horizon line
  const mtTerms = [
    [90,  1, 0.4],   // long ridge
    [60,  2, 1.2],   // medium peaks
    [40,  3, 2.1],
    [25,  5, 0.8],
    [15,  7, 1.7],
    [10, 11, 3.0],
  ];

  // Two mountain ridges for depth
  function drawMtRidge(terms, baseLineY, color1, color2, snowColor, snowShadow, heightScale) {
    for (let x = 0; x < W; x++) {
      const profile = seamlessProfile(x, terms);
      const peakY = Math.round(baseLineY - profile * heightScale);
      const snowLine = Math.round(peakY + (baseLineY - peakY) * 0.25);

      for (let y = peakY; y < baseLineY; y++) {
        // Snow cap
        if (y < snowLine) {
          const t = (y - peakY) / Math.max(1, snowLine - peakY);
          if (t < 0.5) {
            blendPixel(buf, x, y, hR(snowColor), hG(snowColor), hB(snowColor), 255);
          } else {
            blendPixel(buf, x, y, hR(snowShadow), hG(snowShadow), hB(snowShadow), 255);
          }
        } else {
          // Mountain body — slight gradient
          const t = (y - snowLine) / Math.max(1, baseLineY - snowLine);
          const r = Math.round(lerp(hR(color1), hR(color2), t));
          const g = Math.round(lerp(hG(color1), hG(color2), t));
          const b = Math.round(lerp(hB(color1), hB(color2), t));
          blendPixel(buf, x, y, r, g, b, 255);
        }
      }
    }
  }

  // Far ridge (blue-purple, smaller)
  const farTerms = [
    [70,  1, 1.8],
    [45,  2, 0.3],
    [30,  4, 2.8],
    [18,  6, 1.1],
    [10,  9, 2.4],
  ];
  drawMtRidge(farTerms, Math.floor(H * 0.65),
    0x5868A8, 0x4858A0,
    0xD8E8FF, 0xB8C8EE, 0.65);

  // Near ridge (darker, taller)
  drawMtRidge(mtTerms, baseY,
    PAL.mtFar, PAL.mtMid,
    PAL.mtSnow, PAL.mtSnowShadow, 0.9);

  // Atmospheric haze at the very base of mountains (fades into transparency)
  for (let x = 0; x < W; x++) {
    const profile = seamlessProfile(x, mtTerms);
    const peakY = Math.round(baseY - profile * 0.9);
    for (let y = baseY; y < baseY + 30 && y < H; y++) {
      const a = Math.round(180 * (1 - (y - baseY) / 30));
      blendPixel(buf, x, y, hR(PAL.skyHaze), hG(PAL.skyHaze), hB(PAL.skyHaze), a);
    }
    (void peakY);
  }

  savePNG(png, 'mountains.png');
}

// ── 4. jungle.png (far jungle canopy) ────────────────────────────────────────
{
  const png = mkPNG();
  const buf = png.data;

  const baseY = Math.floor(H * 0.52);   // canopy sits in lower half
  const terms = [
    [55,  1, 0.7],
    [35,  2, 2.3],
    [22,  3, 1.0],
    [14,  5, 0.5],
    [9,   7, 2.8],
    [5,  11, 1.5],
  ];

  for (let x = 0; x < W; x++) {
    const profile = seamlessProfile(x, terms);
    const topY = Math.round(baseY - profile);

    // draw tree canopy shape (rounded bumps)
    const bumpH = 18 + Math.round(noise1d(x, 3) * 10);
    for (let y = topY; y < H; y++) {
      const t = clamp((y - topY) / (H - topY), 0, 1);
      let r, g, b;
      if (t < 0.3) {
        // Top canopy — lighter highlight
        const s = t / 0.3;
        r = Math.round(lerp(hR(PAL.jungleFar3), hR(PAL.jungleFar2), s));
        g = Math.round(lerp(hG(PAL.jungleFar3), hG(PAL.jungleFar2), s));
        b = Math.round(lerp(hB(PAL.jungleFar3), hB(PAL.jungleFar2), s));
      } else {
        r = hR(PAL.jungleFar1); g = hG(PAL.jungleFar1); b = hB(PAL.jungleFar1);
      }
      setPixel(buf, x, y, r, g, b, 255);
    }

    // Soft canopy edge — feathered top
    for (let dy = 0; dy < 6; dy++) {
      const a = Math.round(255 * (dy / 6) * (dy / 6));
      blendPixel(buf, x, topY + dy, hR(PAL.jungleFar3), hG(PAL.jungleFar3), hB(PAL.jungleFar3), a);
    }

    // Rounded tree crown bumps on the silhouette
    if (Math.floor(x) % 28 === 0) {
      const cr = 16 + Math.round(noise1d(x, 9) * 8);
      fillCircle(buf, x, topY + 6, cr, hR(PAL.jungleFar2), hG(PAL.jungleFar2), hB(PAL.jungleFar2), 255);
      fillCircle(buf, x, topY + 2, cr - 6, hR(PAL.jungleFar3), hG(PAL.jungleFar3), hB(PAL.jungleFar3), 255);
    }
    (void bumpH);
  }

  savePNG(png, 'jungle.png');
}

// ── 5. trees.png (mid-distance trees) ────────────────────────────────────────
{
  const png = mkPNG();
  const buf = png.data;

  // Draw individual trees at regular intervals for a forest look
  const treeSpacing = 52;
  const treeOffsets = [];
  for (let tx = 0; tx < W + treeSpacing; tx += treeSpacing) {
    const jitter = Math.round((noise1d(tx, 5) - 0.5) * 20);
    treeOffsets.push(tx + jitter);
  }

  // Base ground fill (dark shadow under trees)
  const groundY = Math.floor(H * 0.72);
  for (let x = 0; x < W; x++) {
    for (let y = groundY; y < H; y++) {
      const t = (y - groundY) / (H - groundY);
      const r = Math.round(lerp(hR(PAL.treeDark), 8,  t));
      const g = Math.round(lerp(hG(PAL.treeDark), 18, t));
      const b = Math.round(lerp(hB(PAL.treeDark), 8,  t));
      setPixel(buf, x, y, r, g, b, 255);
    }
  }

  function drawTree(cx, groundY2) {
    const trunkH = 60 + Math.round(noise1d(cx, 2) * 30);
    const trunkW = 6 + Math.round(noise1d(cx, 3) * 4);
    const canopyR = 30 + Math.round(noise1d(cx, 4) * 16);
    const ty = groundY2 - trunkH;

    // Trunk
    fillRect(buf, cx - trunkW/2, ty, trunkW, trunkH,
      hR(PAL.treeTrunk), hG(PAL.treeTrunk), hB(PAL.treeTrunk), 255);
    // Trunk highlight
    fillRect(buf, cx - trunkW/2 + 1, ty + 4, 2, trunkH - 8,
      hR(PAL.treeTrunk)+30, hG(PAL.treeTrunk)+18, hB(PAL.treeTrunk)+8, 200);

    // Canopy layers (bottom dark → top bright)
    fillCircle(buf, cx, ty, canopyR + 6, hR(PAL.treeDark), hG(PAL.treeDark), hB(PAL.treeDark), 255);
    fillCircle(buf, cx, ty - 4, canopyR, hR(PAL.treeMid), hG(PAL.treeMid), hB(PAL.treeMid), 255);
    fillCircle(buf, cx - 6, ty - 10, canopyR - 8, hR(PAL.treeLight), hG(PAL.treeLight), hB(PAL.treeLight), 240);
    fillCircle(buf, cx + 8, ty - 6,  canopyR - 10, hR(PAL.treeLight), hG(PAL.treeLight), hB(PAL.treeLight), 220);
    // Bright highlight cluster
    fillCircle(buf, cx - 4, ty - 14, 10, 0x52, 0xC8, 0x38, 200);

    // Small leaf cluster bumps on edge
    for (let a = 0; a < Math.PI * 2; a += 0.8) {
      const lx = Math.round(cx + Math.cos(a) * (canopyR - 4));
      const ly = Math.round(ty + Math.sin(a) * (canopyR - 4));
      fillCircle(buf, lx, ly, 6, hR(PAL.treeMid), hG(PAL.treeMid), hB(PAL.treeMid), 200);
    }
  }

  for (const tx of treeOffsets)
    drawTree(tx, groundY + Math.round((noise1d(tx, 7) - 0.5) * 20));

  savePNG(png, 'trees.png');
}

// ── 6. vines.png ─────────────────────────────────────────────────────────────
{
  const png = mkPNG();
  const buf = png.data;

  const vineCount = 18;
  const step = Math.floor(W / vineCount);

  for (let i = 0; i < vineCount; i++) {
    const vx = i * step + Math.round((noise1d(i, 1) - 0.5) * 30);
    const len = Math.floor(H * 0.4 + noise1d(i, 2) * H * 0.35);
    const sway = (noise1d(i, 3) - 0.5) * 28;   // horizontal drift
    const thick = 1 + (noise1d(i, 5) > 0.7 ? 1 : 0);
    const col = noise1d(i, 4) > 0.5 ? PAL.vineMid : PAL.vineDark;

    // Draw the vine stem with gentle S-curve
    for (let y = 0; y < len; y++) {
      const t = y / len;
      // S-curve: eases in and out of sway
      const st = Math.sin(t * Math.PI) * sway;
      const x = Math.round(vx + st);
      for (let d = 0; d < thick; d++)
        blendPixel(buf, x + d, y, hR(col), hG(col), hB(col), 220);
    }

    // Leaf pairs every ~18px along the vine
    for (let y = 12; y < len; y += 18 + Math.round(noise1d(i * 100 + y, 6) * 8)) {
      const t = y / len;
      const x = Math.round(vx + Math.sin(t * Math.PI) * sway);
      const leafSize = 4 + Math.round(noise1d(i + y, 7) * 3);
      const lc = noise1d(i + y, 8) > 0.5 ? PAL.vineLight : PAL.vineMid;

      // Left leaf
      fillEllipse(buf, x - leafSize - 1, y, leafSize, Math.ceil(leafSize * 0.5),
        hR(lc), hG(lc), hB(lc), 220);
      // Right leaf
      fillEllipse(buf, x + leafSize + 1, y, leafSize, Math.ceil(leafSize * 0.5),
        hR(lc), hG(lc), hB(lc), 220);
      // Leaf highlight
      blendPixel(buf, x - leafSize, y - 1, hR(PAL.vineLeaf), hG(PAL.vineLeaf), hB(PAL.vineLeaf), 160);
      blendPixel(buf, x + leafSize, y - 1, hR(PAL.vineLeaf), hG(PAL.vineLeaf), hB(PAL.vineLeaf), 160);
    }
  }

  savePNG(png, 'vines.png');
}

// ── 7. mist.png ───────────────────────────────────────────────────────────────
{
  const png = mkPNG();
  const buf = png.data;

  // Multiple horizontal mist bands at different heights — each seamless
  const bands = [
    { yCenter: Math.floor(H * 0.60), height: 80,  alpha: 90,  phase: 0.3 },
    { yCenter: Math.floor(H * 0.72), height: 100, alpha: 120, phase: 1.8 },
    { yCenter: Math.floor(H * 0.85), height: 130, alpha: 150, phase: 0.9 },
    { yCenter: Math.floor(H * 0.95), height: 80,  alpha: 100, phase: 2.5 },
  ];

  const [mr, mg, mb] = [hR(PAL.mistColor), hG(PAL.mistColor), hB(PAL.mistColor)];

  for (const { yCenter, height, alpha, phase } of bands) {
    // The mist band has a sinusoidal top/bottom edge for organic feel
    const topTerms = [[14, 2, phase], [8, 4, phase + 1.1], [5, 7, phase + 0.3]];

    for (let x = 0; x < W; x++) {
      const edgeWobble = Math.round(seamlessProfile(x, topTerms));
      const bandTop = yCenter - height / 2 + edgeWobble;
      const bandBot = yCenter + height / 2 + edgeWobble;

      for (let y = Math.max(0, bandTop - 20); y < Math.min(H, bandBot + 20); y++) {
        // Soft feathering: gaussian-ish falloff from band centre
        const dist = Math.abs(y - (bandTop + bandBot) / 2);
        const halfH = (bandBot - bandTop) / 2 + 20;
        const fade = clamp(1 - (dist / halfH) ** 2, 0, 1);
        // Horizontal density variation using noise
        const density = 0.6 + 0.4 * noise2d(x / 80, y / 40, 11);
        const a = Math.round(alpha * fade * density);
        if (a > 0)
          blendPixel(buf, x, y, mr, mg, mb, a);
      }
    }
  }

  savePNG(png, 'mist.png');
}

// ── 8. sunrays.png ────────────────────────────────────────────────────────────
{
  const png = mkPNG();
  const buf = png.data;

  // Light beams radiating from a point source above-right (sun position matches sky.png)
  const srcX = Math.floor(W * 0.72);
  const srcY = -80;  // above the image

  const [rr, rg, rb] = [hR(PAL.rayColor), hG(PAL.rayColor), hB(PAL.rayColor)];

  // Define rays as angular spans
  const rays = [
    { angle: Math.PI * 0.52, width: 0.028, alpha: 45 },
    { angle: Math.PI * 0.60, width: 0.020, alpha: 35 },
    { angle: Math.PI * 0.68, width: 0.032, alpha: 50 },
    { angle: Math.PI * 0.75, width: 0.018, alpha: 30 },
    { angle: Math.PI * 0.82, width: 0.025, alpha: 40 },
    { angle: Math.PI * 0.90, width: 0.015, alpha: 25 },
    { angle: Math.PI * 0.42, width: 0.022, alpha: 38 },
    { angle: Math.PI * 0.35, width: 0.016, alpha: 28 },
  ];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - srcX;
      const dy = y - srcY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const distFade = clamp(1 - len / (H * 2.2), 0, 1);

      // Sum contribution of all rays
      let totalA = 0;
      for (const ray of rays) {
        const diff = Math.abs(((angle - ray.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff < ray.width * 6) {
          const t = clamp(1 - diff / (ray.width * 6), 0, 1);
          totalA += ray.alpha * t * t * distFade;
        }
      }

      if (totalA > 0) {
        // Add gentle noise for volumetric feel
        const n = 0.7 + 0.3 * noise2d(x / 120, y / 120, 13);
        const a = Math.round(clamp(totalA * n, 0, 80));
        if (a > 0) blendPixel(buf, x, y, rr, rg, rb, a);
      }
    }
  }

  savePNG(png, 'sunrays.png');
}

console.log('\nAll 8 background layers generated successfully.');
console.log('Drop them in assets/worlds/world01_jungle/backgrounds/ — done!');
