/**
 * Relics of Aetheria — World 1 Jungle Production Tileset Generator
 *
 * Generates: assets/worlds/world01_jungle/tilesets/tileset.png
 * Size:      1024 × 32 px  (32 tiles × 32 px each, 1 row)
 * Format:    RGBA PNG, transparent where tile is a decoration/overlay
 *
 * GID map (1-based, column = GID-1):
 *   1  Ground      2  Platform    3  Temple block  4  Stone wall
 *   5  Cracked     6  Grass       7  Moss
 *   8  Water f1    9  Water f2    10 Water f3
 *   11 Wfall f1   12 Wfall f2    13 Wfall f3
 *   14 Torch f1   15 Torch f2    16 Torch f3
 *   17 Crystal f1 18 Crystal f2  19 Crystal f3
 *   20 Leaves f1  21 Leaves f2   22 Leaves f3
 *   23 Fern       24 Flower      25 Root
 *   26 Statue     27 Skull       28 Rock
 *   29 Carving    30 Pillar      31 Bridge
 *   32 Reserved
 */

import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const TILE = 32;
const COLS = 32;
const W = TILE * COLS; // 1024
const H = TILE;        // 32

const png = new PNG({ width: W, height: H, colorType: 6, inputColorType: 6 });
const buf = png.data; // RGBA, row-major

// ── Drawing helpers ───────────────────────────────────────────────────────────

/** Parse hex colour string #RRGGBB → [r,g,b] */
function hex(h) {
  const v = parseInt(h.replace('#', ''), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function idx(x, y) { return (y * W + x) * 4; }

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = idx(x, y);
  buf[i]   = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
}

function setPixelH(x, y, h, a = 255) {
  const [r, g, b] = hex(h);
  setPixel(x, y, r, g, b, a);
}

/** Fill a rectangle with a hex colour */
function fillRect(tx, y, w, h, colour, alpha = 255) {
  const [r, g, b] = hex(colour);
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(tx + dx, y + dy, r, g, b, alpha);
}

/** Fill tile column (0-based) with a solid colour */
function fillTile(col, colour, alpha = 255) {
  fillRect(col * TILE, 0, TILE, TILE, colour, alpha);
}

/** Outline a rect (1-px border) */
function outlineRect(tx, y, w, h, colour, alpha = 255) {
  const [r, g, b] = hex(colour);
  for (let dx = 0; dx < w; dx++) {
    setPixel(tx + dx, y,         r, g, b, alpha);
    setPixel(tx + dx, y + h - 1, r, g, b, alpha);
  }
  for (let dy = 0; dy < h; dy++) {
    setPixel(tx,         y + dy, r, g, b, alpha);
    setPixel(tx + w - 1, y + dy, r, g, b, alpha);
  }
}

/** Filled circle (scanline) */
function fillCircle(cx, cy, radius, colour, alpha = 255) {
  const [r, g, b] = hex(colour);
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      if (dx * dx + dy * dy <= r2)
        setPixel(cx + dx, cy + dy, r, g, b, alpha);
}

/** Filled ellipse */
function fillEllipse(cx, cy, rx, ry, colour, alpha = 255) {
  const [r, g, b] = hex(colour);
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1)
        setPixel(cx + dx, cy + dy, r, g, b, alpha);
}

/** Draw a horizontal line */
function hline(tx, y, w, colour, alpha = 255) {
  fillRect(tx, y, w, 1, colour, alpha);
}

/** Draw a vertical line */
function vline(tx, y, h, colour, alpha = 255) {
  fillRect(tx, y, 1, h, colour, alpha);
}

/** Bresenham line */
function drawLine(x0, y0, x1, y1, colour, alpha = 255) {
  const [r, g, b] = hex(colour);
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(x0, y0, r, g, b, alpha);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Filled triangle (scanline) */
function fillTriangle(x0, y0, x1, y1, x2, y2, colour, alpha = 255) {
  const [r, g, b] = hex(colour);
  const yMin = Math.max(0, Math.min(y0, y1, y2));
  const yMax = Math.min(H - 1, Math.max(y0, y1, y2));
  for (let y = yMin; y <= yMax; y++) {
    const xs = [];
    [[x0,y0,x1,y1],[x1,y1,x2,y2],[x2,y2,x0,y0]].forEach(([ax,ay,bx,by]) => {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(Math.round(ax + (y - ay) * (bx - ax) / (by - ay)));
      }
    });
    if (xs.length >= 2) {
      xs.sort((a, b) => a - b);
      for (let x = xs[0]; x <= xs[xs.length-1]; x++)
        setPixel(x, y, r, g, b, alpha);
    }
  }
}

// ── Tile shorthand: offset X for column ──────────────────────────────────────
const tx = col => col * TILE;

// Initialise fully transparent
buf.fill(0);

// ── GID 1: Jungle Ground / Solid ─────────────────────────────────────────────
{
  const x = tx(0);
  fillRect(x, 0, TILE, TILE, '#3E1F00');        // dark soil base
  fillRect(x, 0, TILE, 6,    '#2D6A1C');        // grass top
  fillRect(x, 6, TILE, 3,    '#5A2E00');        // dark soil band
  // surface detail — lighter soil streaks
  for (let i = 2; i < 30; i += 5)
    fillRect(x + i, 9, 3, 2, '#7A4218');
  // grass blades
  for (let i = 1; i < 31; i += 4) {
    const h = (i % 8 === 1) ? 3 : 2;
    fillRect(x + i, 0, 1, h, '#64CC52');
  }
  outlineRect(x, 0, TILE, TILE, '#1E0E00');
}

// ── GID 2: Platform (lighter stone + top edge) ───────────────────────────────
{
  const x = tx(1);
  fillRect(x, 0, TILE, TILE, '#5A5A6E');        // stone base
  fillRect(x, 0, TILE, 4,    '#8888A0');        // bright top
  fillRect(x, 4, TILE, 2,    '#6E6E82');        // mid strip
  // brick lines
  hline(x, 14, TILE, '#4A4A5E');
  for (let b = 0; b < 2; b++) {
    const off = b === 0 ? 0 : 8;
    vline(x + 8 + off,  0, 14, '#4A4A5E');
    vline(x + 24 + off, 0, 14, '#4A4A5E');
  }
  for (let b = 0; b < 3; b++)
    vline(x + 4 + b * 12, 14, 18, '#4A4A5E');
  outlineRect(x, 0, TILE, TILE, '#2A2A3A');
}

// ── GID 3: Temple Block ───────────────────────────────────────────────────────
{
  const x = tx(2);
  fillRect(x, 0, TILE, TILE, '#6E6E82');        // stone grey
  fillRect(x, 0, TILE, 3,    '#9090A4');        // top highlight
  fillRect(x, TILE-3, TILE, 3, '#3E3E50');     // bottom shadow
  // carved horizontal groove
  hline(x, 10, TILE, '#5A5A6E');
  hline(x, 21, TILE, '#5A5A6E');
  // carved indent
  fillRect(x+4, 12, TILE-8, 8, '#4E4E62');
  fillRect(x+5, 13, TILE-10, 6, '#3E3E50');
  outlineRect(x, 0, TILE, TILE, '#2A2A3A');
}

// ── GID 4: Stone Wall (brick pattern) ────────────────────────────────────────
{
  const x = tx(3);
  fillRect(x, 0, TILE, TILE, '#4A4A5E');        // base stone
  // mortar lines
  hline(x, 8,  TILE, '#2A2A3A');
  hline(x, 17, TILE, '#2A2A3A');
  hline(x, 26, TILE, '#2A2A3A');
  // vertical mortar — alternating rows
  vline(x+16, 0,  8,  '#2A2A3A');              // row 0
  vline(x+8,  9,  8,  '#2A2A3A');              // row 1
  vline(x+24, 9,  8,  '#2A2A3A');
  vline(x+16, 18, 8,  '#2A2A3A');              // row 2
  vline(x+8,  27, 5,  '#2A2A3A');              // row 3
  vline(x+24, 27, 5,  '#2A2A3A');
  // brick highlights (top-left of each brick)
  fillRect(x+1,  1,  14, 2, '#6E6E82');
  fillRect(x+17, 1,  14, 2, '#6E6E82');
  fillRect(x+1,  10, 6,  2, '#6E6E82');
  fillRect(x+9,  10, 14, 2, '#6E6E82');
  fillRect(x+25, 10, 6,  2, '#6E6E82');
  outlineRect(x, 0, TILE, TILE, '#1E1E2A');
}

// ── GID 5: Cracked Ruins ──────────────────────────────────────────────────────
{
  const x = tx(4);
  fillRect(x, 0, TILE, TILE, '#7A6A50');        // brownish stone
  fillRect(x, 0, TILE, 3,    '#9A8A70');        // top highlight
  fillRect(x, TILE-3, TILE, 3, '#4A3A28');     // bottom shadow
  // horizontal mortar
  hline(x, 11, TILE, '#5A4A38');
  hline(x, 22, TILE, '#5A4A38');
  // crack
  drawLine(x+10, 1,  x+14, 10, '#3A2A18');
  drawLine(x+14, 10, x+8,  22, '#3A2A18');
  drawLine(x+8,  22, x+12, 31, '#3A2A18');
  drawLine(x+14, 10, x+18, 18, '#3A2A18');
  // moss spots
  fillRect(x+2, 14, 3, 2, '#3A5C28');
  fillRect(x+20, 25, 4, 2, '#3A5C28');
  outlineRect(x, 0, TILE, TILE, '#2A1E0E');
}

// ── GID 6: Grass Surface ──────────────────────────────────────────────────────
{
  const x = tx(5);
  fillRect(x, 0, TILE, TILE, '#2D6A1C');        // mid green base
  // layered grass
  fillRect(x, 0, TILE, 5,    '#3E9830');        // bright surface
  fillRect(x, 5, TILE, 5,    '#2D7820');        // transition
  fillRect(x,10, TILE, TILE-10, '#1E5010');     // dark soil below
  // grass blades (varying heights)
  const heights = [4, 2, 5, 3, 4, 2, 5, 4];
  for (let i = 0; i < 8; i++) {
    const bx = x + i * 4 + 1;
    fillRect(bx,   0, 1, heights[i],   '#64CC52');
    fillRect(bx+1, 0, 1, heights[i]-1, '#3E9830');
  }
  // soil streaks
  for (let i = 2; i < 30; i += 6)
    fillRect(x+i, 12, 2, 1, '#3A2008');
  outlineRect(x, 0, TILE, TILE, '#1A3A10');
}

// ── GID 7: Moss ───────────────────────────────────────────────────────────────
{
  const x = tx(6);
  fillRect(x, 0, TILE, TILE, '#283C1C');        // dark moss base
  fillRect(x, 0, TILE, 4,    '#3A5828');        // moss surface
  // moss bumps (clusters)
  const bumps = [3,7,11,16,20,25,29];
  bumps.forEach((bx, i) => {
    const by = (i % 2 === 0) ? 1 : 2;
    fillCircle(x + bx, by + 1, 3, '#4A6834');
    fillCircle(x + bx, by + 1, 2, '#5A7840');
    setPixelH(x + bx, by, '#6A8850');
  });
  // hanging moss strands
  for (let i = 3; i < 30; i += 7) {
    const len = 4 + (i % 3) * 2;
    for (let j = 4; j < 4 + len && j < TILE; j += 2)
      setPixelH(x + i, j, '#3A5828');
  }
  outlineRect(x, 0, TILE, TILE, '#1A2810');
}

// ── GID 8: Water Frame 1 (deep, calm) ────────────────────────────────────────
{
  const x = tx(7);
  fillRect(x, 0, TILE, TILE, '#102848');        // deep water
  fillRect(x, 0, TILE, 3,    '#183860');        // surface
  // ripple lines
  hline(x+2, 5,  24, '#1E4878');
  hline(x+4, 12, 20, '#1E4878');
  hline(x+2, 19, 24, '#1E4878');
  hline(x+6, 26, 16, '#1E4878');
  // foam flecks
  setPixelH(x+5,  5,  '#A0D0F0');
  setPixelH(x+18, 12, '#A0D0F0');
  setPixelH(x+9,  19, '#A0D0F0');
  outlineRect(x, 0, TILE, TILE, '#081830');
}

// ── GID 9: Water Frame 2 (ripple offset) ─────────────────────────────────────
{
  const x = tx(8);
  fillRect(x, 0, TILE, TILE, '#102848');
  fillRect(x, 0, TILE, 3,    '#205070');        // brighter surface
  hline(x,   6,  TILE, '#1E4878');
  hline(x+3, 13, 24,   '#2060A0');
  hline(x,   20, TILE, '#1E4878');
  hline(x+4, 27, 20,   '#2060A0');
  // foam
  setPixelH(x+12, 6,  '#B0D8F0');
  setPixelH(x+3,  13, '#B0D8F0');
  setPixelH(x+22, 20, '#B0D8F0');
  outlineRect(x, 0, TILE, TILE, '#081830');
}

// ── GID 10: Water Frame 3 (bright ripple) ────────────────────────────────────
{
  const x = tx(9);
  fillRect(x, 0, TILE, TILE, '#183860');        // lighter base
  fillRect(x, 0, TILE, 4,    '#2878B0');        // bright surface
  hline(x+1, 7,  28, '#3080C0');
  hline(x+3, 14, 24, '#2060A0');
  hline(x,   21, TILE,'#3080C0');
  hline(x+5, 28, 18, '#2060A0');
  // bright foam
  fillRect(x+8, 7, 2, 1, '#C0E8FF');
  fillRect(x+20,21,2, 1, '#C0E8FF');
  outlineRect(x, 0, TILE, TILE, '#081830');
}

// ── GID 11: Waterfall Frame 1 ────────────────────────────────────────────────
{
  const x = tx(10);
  fillRect(x, 0, TILE, TILE, '#142050');        // dark bg
  // vertical streams
  fillRect(x+4,  0, 4, TILE, '#2858A0');
  fillRect(x+14, 0, 3, TILE, '#3068B0');
  fillRect(x+22, 0, 4, TILE, '#2858A0');
  // foam streaks inside streams
  for (let y = 2; y < TILE; y += 6) {
    setPixelH(x+5,  y, '#80C0F0');
    setPixelH(x+15, y+2, '#80C0F0');
    setPixelH(x+23, y+1, '#80C0F0');
  }
  outlineRect(x, 0, TILE, TILE, '#081830');
}

// ── GID 12: Waterfall Frame 2 (shifted) ──────────────────────────────────────
{
  const x = tx(11);
  fillRect(x, 0, TILE, TILE, '#142050');
  fillRect(x+2,  0, 4, TILE, '#2858A0');
  fillRect(x+12, 0, 3, TILE, '#3068B0');
  fillRect(x+24, 0, 4, TILE, '#2858A0');
  for (let y = 0; y < TILE; y += 6) {
    setPixelH(x+3,  y+2, '#80C0F0');
    setPixelH(x+13, y,   '#80C0F0');
    setPixelH(x+25, y+3, '#80C0F0');
  }
  outlineRect(x, 0, TILE, TILE, '#081830');
}

// ── GID 13: Waterfall Frame 3 ────────────────────────────────────────────────
{
  const x = tx(12);
  fillRect(x, 0, TILE, TILE, '#142050');
  fillRect(x+6,  0, 4, TILE, '#3878C0');        // brighter streams
  fillRect(x+16, 0, 3, TILE, '#4888C8');
  fillRect(x+26, 0, 4, TILE, '#3878C0');
  for (let y = 1; y < TILE; y += 5) {
    setPixelH(x+7,  y,   '#A0D8FF');
    setPixelH(x+17, y+2, '#A0D8FF');
    setPixelH(x+27, y+1, '#A0D8FF');
  }
  outlineRect(x, 0, TILE, TILE, '#081830');
}

// ── GID 14: Torch Frame 1 (dark/base flame) ──────────────────────────────────
{
  const x = tx(13);
  fillRect(x, 0, TILE, TILE, '#0E0A05', 255);   // dark bg (solid, not transparent for inline tiles)
  // torch bracket (stone/iron)
  fillRect(x+13, 22, 6, 10, '#4A3A28');
  fillRect(x+14, 21, 4, 2,  '#6A5A40');
  // dark base flame
  fillTriangle(x+16, 6, x+9, 22, x+23, 22, '#600800');
  fillTriangle(x+16, 10, x+12, 20, x+20, 20, '#A02000');
  // inner glow
  fillCircle(x+16, 18, 4, '#C04000');
  outlineRect(x, 0, TILE, TILE, '#050302');
}

// ── GID 15: Torch Frame 2 (mid-intensity) ────────────────────────────────────
{
  const x = tx(14);
  fillRect(x, 0, TILE, TILE, '#0E0A05', 255);
  fillRect(x+13, 22, 6, 10, '#4A3A28');
  fillRect(x+14, 21, 4, 2,  '#6A5A40');
  fillTriangle(x+16, 4, x+8, 22, x+24, 22, '#A02000');
  fillTriangle(x+16, 7, x+11, 20, x+21, 20, '#D04400');
  fillCircle(x+16, 17, 4, '#F06800');
  setPixelH(x+16, 8, '#FFB000');
  outlineRect(x, 0, TILE, TILE, '#050302');
}

// ── GID 16: Torch Frame 3 (bright peak) ──────────────────────────────────────
{
  const x = tx(15);
  fillRect(x, 0, TILE, TILE, '#0E0A05', 255);
  fillRect(x+13, 22, 6, 10, '#4A3A28');
  fillRect(x+14, 21, 4, 2,  '#6A5A40');
  fillTriangle(x+16, 2, x+7, 22, x+25, 22, '#CC3000');
  fillTriangle(x+16, 5, x+10, 20, x+22, 20, '#F06000');
  fillTriangle(x+16, 8, x+12, 18, x+20, 18, '#FF9800');
  fillCircle(x+16, 15, 4, '#FFB000');
  fillCircle(x+16, 12, 2, '#FFE000');
  outlineRect(x, 0, TILE, TILE, '#050302');
}

// ── GID 17: Crystal Frame 1 (base teal) ──────────────────────────────────────
{
  const x = tx(16);
  fillRect(x, 0, TILE, TILE, '#061414', 255);
  // crystal gem shape (diamond)
  fillTriangle(x+16, 4,  x+7, 16, x+25, 16, '#006060');
  fillTriangle(x+16, 28, x+7, 16, x+25, 16, '#004848');
  // facets
  fillTriangle(x+16, 4,  x+7, 16, x+16, 16, '#008080');
  drawLine(x+7, 16, x+25, 16, '#00A0A0');
  drawLine(x+16, 4, x+25, 16, '#004848');
  outlineRect(x, 0, TILE, TILE, '#020A0A');
}

// ── GID 18: Crystal Frame 2 (bright) ─────────────────────────────────────────
{
  const x = tx(17);
  fillRect(x, 0, TILE, TILE, '#061414', 255);
  fillTriangle(x+16, 3,  x+6, 15, x+26, 15, '#00A0A0');
  fillTriangle(x+16, 29, x+6, 15, x+26, 15, '#006060');
  fillTriangle(x+16, 3,  x+6, 15, x+16, 15, '#00CCCC');
  fillCircle(x+16, 14, 3, '#40EEEE', 180);
  drawLine(x+6, 15, x+26, 15, '#00CCCC');
  outlineRect(x, 0, TILE, TILE, '#020A0A');
}

// ── GID 19: Crystal Frame 3 (white flash) ────────────────────────────────────
{
  const x = tx(18);
  fillRect(x, 0, TILE, TILE, '#061414', 255);
  fillTriangle(x+16, 2,  x+5, 14, x+27, 14, '#00CCCC');
  fillTriangle(x+16, 30, x+5, 14, x+27, 14, '#008080');
  fillTriangle(x+16, 2,  x+5, 14, x+16, 14, '#80FFFF');
  fillCircle(x+16, 13, 5, '#C0FFFF', 200);
  fillCircle(x+16, 13, 2, '#FFFFFF');
  drawLine(x+5, 14, x+27, 14, '#80FFFF');
  outlineRect(x, 0, TILE, TILE, '#020A0A');
}

// ── GID 20: Leaves Frame 1 (mid-green, calm) ─────────────────────────────────
{
  const x = tx(19);
  fillRect(x, 0, TILE, TILE, '#0A180A', 255);
  // leaves cluster
  fillEllipse(x+12, 10, 9, 6, '#2A5020');
  fillEllipse(x+22, 12, 7, 5, '#2A5020');
  fillEllipse(x+10, 20, 10,5, '#2A5020');
  fillEllipse(x+20, 22, 8, 5, '#2A5020');
  // highlights
  fillEllipse(x+10, 8,  5, 3, '#3A7030');
  fillEllipse(x+22, 10, 4, 2, '#3A7030');
  outlineRect(x, 0, TILE, TILE, '#050A05');
}

// ── GID 21: Leaves Frame 2 (slight shift/rustle) ─────────────────────────────
{
  const x = tx(20);
  fillRect(x, 0, TILE, TILE, '#0A180A', 255);
  fillEllipse(x+13, 9,  9, 6, '#2D5A22');
  fillEllipse(x+21, 13, 7, 5, '#2D5A22');
  fillEllipse(x+9,  21, 10,5, '#2D5A22');
  fillEllipse(x+21, 21, 8, 5, '#2D5A22');
  fillEllipse(x+11, 7,  5, 3, '#3E8030');
  fillEllipse(x+21, 11, 4, 2, '#3E8030');
  outlineRect(x, 0, TILE, TILE, '#050A05');
}

// ── GID 22: Leaves Frame 3 (brightest, mid-rustle) ───────────────────────────
{
  const x = tx(21);
  fillRect(x, 0, TILE, TILE, '#0A180A', 255);
  fillEllipse(x+11, 11, 9, 6, '#3A7030');
  fillEllipse(x+23, 11, 7, 5, '#3A7030');
  fillEllipse(x+11, 21, 10,5, '#3A7030');
  fillEllipse(x+21, 23, 8, 5, '#3A7030');
  fillEllipse(x+9,  9,  5, 3, '#50904A');
  fillEllipse(x+23, 9,  4, 2, '#50904A');
  outlineRect(x, 0, TILE, TILE, '#050A05');
}

// ── GID 23: Plant / Fern (decoration — transparent bg) ───────────────────────
{
  const x = tx(22);
  // transparent background (already clear)
  // stem
  vline(x+15, 10, 22, '#2A6018');
  vline(x+16, 10, 22, '#3A8028');
  // fern fronds (left)
  for (let i = 0; i < 4; i++) {
    const sy = 10 + i * 5;
    drawLine(x+15, sy, x+4,  sy-2, '#2A7020');
    drawLine(x+15, sy, x+5,  sy-1, '#3A9030');
    fillEllipse(x+6, sy-2, 4, 2,   '#3A9030');
  }
  // fern fronds (right)
  for (let i = 0; i < 4; i++) {
    const sy = 12 + i * 5;
    drawLine(x+16, sy, x+27, sy-2, '#2A7020');
    fillEllipse(x+25, sy-2, 4, 2,  '#3A9030');
  }
  // tip
  fillEllipse(x+15, 8, 2, 3, '#50A040');
}

// ── GID 24: Flower (decoration — transparent bg) ─────────────────────────────
{
  const x = tx(23);
  // stem
  vline(x+15, 14, 18, '#2A6018');
  vline(x+16, 14, 18, '#3A8028');
  // leaves on stem
  fillEllipse(x+10, 22, 5, 3, '#2A7020');
  fillEllipse(x+22, 25, 5, 3, '#2A7020');
  // petals
  fillCircle(x+16, 9,  4, '#D04080');
  fillCircle(x+10, 10, 3, '#C83070');
  fillCircle(x+22, 10, 3, '#C83070');
  fillCircle(x+16, 15, 3, '#C83070');
  fillCircle(x+13, 13, 3, '#D04080');
  fillCircle(x+19, 13, 3, '#D04080');
  // centre
  fillCircle(x+16, 11, 3, '#FFD020');
  setPixelH(x+16, 10, '#FFFFFF');
}

// ── GID 25: Root (decoration — transparent bg) ───────────────────────────────
{
  const x = tx(24);
  // main root arching
  drawLine(x+16, 2, x+6,  12, '#6A4A28');
  drawLine(x+6,  12, x+4, 28, '#6A4A28');
  drawLine(x+16, 2, x+26, 14, '#6A4A28');
  drawLine(x+26, 14, x+28,28, '#6A4A28');
  // secondary
  drawLine(x+10, 8, x+8, 26, '#5A3A20');
  drawLine(x+22, 8, x+24,26, '#5A3A20');
  // root tips (fibrous)
  for (let i = 0; i < 4; i++) {
    const rx2 = 3 + i * 7;
    drawLine(x+rx2, 26, x+rx2-2, 31, '#4A2A18');
    drawLine(x+rx2, 26, x+rx2+2, 31, '#4A2A18');
  }
  // bark texture dots
  setPixelH(x+8,  10, '#8A6040');
  setPixelH(x+24, 12, '#8A6040');
  setPixelH(x+6,  20, '#8A6040');
}

// ── GID 26: Broken Statue (decoration — transparent bg) ──────────────────────
{
  const x = tx(25);
  // base/plinth
  fillRect(x+8, 26, 16, 6, '#6E6E82');
  fillRect(x+7, 25, 18, 2, '#8888A0');
  // body (broken at top)
  fillRect(x+11, 10, 10, 15, '#6E6E82');
  fillRect(x+10, 9,  12, 2,  '#5A5A6E');  // break edge
  fillRect(x+11, 10, 10, 2,  '#8888A0');
  // head fragment (tilted/broken off)
  fillEllipse(x+22, 7, 5, 5, '#6E6E82');
  fillRect(x+18, 9, 4, 2, '#5A5A6E');     // neck break
  // moss on statue
  fillRect(x+11, 12, 3, 2, '#3A5C28');
  fillRect(x+17, 20, 4, 2, '#3A5C28');
  outlineRect(x+8,  26, 16, 6, '#4A4A5E');
  outlineRect(x+11, 10, 10, 15,'#4A4A5E');
}

// ── GID 27: Skull (decoration — transparent bg) ──────────────────────────────
{
  const x = tx(26);
  // cranium
  fillEllipse(x+16, 13, 9, 8, '#D8D0B0');
  fillRect(x+11, 18, 10, 5, '#D8D0B0');
  // jaw
  fillRect(x+10, 22, 12, 6, '#C0B89A');
  // eye sockets
  fillEllipse(x+12, 13, 3, 3, '#1A1A10');
  fillEllipse(x+20, 13, 3, 3, '#1A1A10');
  // nose cavity
  fillRect(x+15, 17, 2, 2, '#1A1A10');
  // teeth
  for (let i = 0; i < 4; i++)
    fillRect(x+11 + i*3, 23, 2, 4, '#1A1A10');
  // cracks
  drawLine(x+16, 6, x+19, 14, '#B0A890');
  outlineRect(x+10, 22, 12, 6, '#9A9070');
}

// ── GID 28: Rock (decoration — transparent bg) ───────────────────────────────
{
  const x = tx(27);
  // large rock body
  fillEllipse(x+16, 20, 13, 9, '#7A7060');
  fillEllipse(x+15, 19, 12, 8, '#8A8070');
  // highlight
  fillEllipse(x+11, 16, 5, 4,  '#9A9080');
  setPixelH(x+10, 15, '#AEAA98');
  // shadow
  fillEllipse(x+20, 23, 5, 3,  '#5A5040');
  // small rock
  fillEllipse(x+25, 23, 4, 3,  '#7A7060');
  fillEllipse(x+24, 22, 3, 2,  '#8A8070');
  // outline
  outlineRect(x+3, 11, 26, 18, '#1A1A14', 0); // invisible outline anchor
  drawLine(x+3,  20, x+8,  12, '#5A5040');
  drawLine(x+8,  12, x+22, 12, '#5A5040');
  drawLine(x+22, 12, x+29, 20, '#5A5040');
}

// ── GID 29: Temple Carving (decoration on stone block) ───────────────────────
{
  const x = tx(28);
  fillRect(x, 0, TILE, TILE, '#7A6A50');        // stone background
  fillRect(x, 0, TILE, 3,    '#9A8A70');
  // carved recess
  fillRect(x+3, 3, TILE-6, TILE-6, '#4E3E2A');
  // carved face/glyph (simplified temple deity face)
  // brow ridge
  fillRect(x+6, 5, TILE-12, 4, '#3A2A18');
  // eyes (almond shape)
  fillEllipse(x+11, 11, 3, 2, '#6E5E40');
  fillEllipse(x+21, 11, 3, 2, '#6E5E40');
  fillEllipse(x+11, 11, 1, 1, '#1A1008');
  fillEllipse(x+21, 11, 1, 1, '#1A1008');
  // nose
  vline(x+15, 13, 5, '#3A2A18');
  vline(x+16, 13, 5, '#3A2A18');
  fillRect(x+13, 17, 6, 2, '#3A2A18');
  // mouth
  hline(x+9, 22, TILE-18, '#3A2A18');
  hline(x+10,23, TILE-20, '#2A1A0A');
  outlineRect(x, 0, TILE, TILE, '#2A1E0E');
}

// ── GID 30: Fallen Pillar (decoration — transparent bg) ──────────────────────
{
  const x = tx(29);
  // pillar body (horizontal)
  fillRect(x+1, 13, TILE-2, 10, '#8080943');
  fillRect(x+1, 13, TILE-2, 10, '#808094');
  fillRect(x+1, 13, TILE-2, 2,  '#9898AC');    // top highlight
  fillRect(x+1, 21, TILE-2, 2,  '#5E5E72');    // shadow bottom
  // pillar fluting (vertical grooves on surface)
  for (let i = 0; i < 5; i++)
    vline(x+4 + i*6, 15, 6, '#6E6E82');
  // capital (broken end, right)
  fillRect(x+26, 11, 5, 14, '#9898AC');
  fillRect(x+26, 11, 5, 2,  '#AAAABE');
  // crack
  drawLine(x+10, 15, x+14, 21, '#5E5E72');
  // moss
  fillRect(x+4,  17, 5, 2, '#3A5C28');
  fillRect(x+18, 15, 4, 3, '#3A5C28');
  outlineRect(x+1, 13, TILE-2, 10, '#4A4A5E');
}

// ── GID 31: Wooden Bridge (structural) ───────────────────────────────────────
{
  const x = tx(30);
  fillRect(x, 0, TILE, TILE, '#1A1005');        // dark bg (below bridge)
  // plank bed
  fillRect(x+1, 10, TILE-2, 14, '#7A5028');
  // individual planks (with gaps)
  for (let p = 0; p < 4; p++) {
    const px = x + 1 + p * 8;
    fillRect(px, 10, 7, 14, '#8A6030');
    fillRect(px, 10, 7, 2,  '#A07840');         // plank top highlight
    fillRect(px, 22, 7, 2,  '#5A3818');         // plank bottom shadow
    // wood grain
    hline(px+1, 14, 5, '#6A4A20');
    hline(px+1, 18, 5, '#6A4A20');
  }
  // side rails
  fillRect(x+1, 8,  TILE-2, 3, '#5A3818');
  fillRect(x+1, 23, TILE-2, 3, '#5A3818');
  // rope/chain
  hline(x+1, 9,  TILE-2, '#3A2810');
  hline(x+1, 25, TILE-2, '#3A2810');
  outlineRect(x, 10, TILE, 14, '#3A2008');
}

// ── GID 32: Reserved (transparent) ───────────────────────────────────────────
// GID 32 column (index 31) stays fully transparent — already done (buf.fill(0))

// ── Write PNG ─────────────────────────────────────────────────────────────────

const outDir = path.resolve('artifacts/relics-of-aetheria/assets/worlds/world01_jungle/tilesets');
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'tileset.png');
const chunks = [];
png.pack().on('data', c => chunks.push(c)).on('end', () => {
  const data = Buffer.concat(chunks);
  fs.writeFileSync(outPath, data);
  console.log(`✓ Written: ${outPath}`);
  console.log(`  Dimensions : ${png.width} × ${png.height} px`);
  console.log(`  Tile size  : ${TILE} × ${TILE} px`);
  console.log(`  Tile count : ${COLS}`);
  console.log(`  File size  : ${(data.length / 1024).toFixed(1)} KB`);
});
