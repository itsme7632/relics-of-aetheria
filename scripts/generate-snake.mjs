/**
 * Relics of Aetheria — M20D Production Snake Enemy Sprite Sheet Generator
 *
 * Output : artifacts/relics-of-aetheria/assets/enemies/snake/snake.png
 * Size   : 576 × 32 px  (18 frames × 32 px wide, 32 px tall, RGBA PNG)
 *
 * Frame layout (matches SnakeSpriteImporter.ts):
 *   0–3   snake_idle     8 fps  loop
 *   4–7   snake_crawl    8 fps  loop
 *   8–11  snake_attack   8 fps  once
 *  12–13  snake_hurt     8 fps  once
 *  14–17  snake_death    8 fps  once
 *
 * Art style: Cute-dangerous jungle snake, Minish Cap / Eastward palette
 *   Green body, bright yellow belly, red tongue, yellow eyes, dark outline.
 */

import { PNG } from 'pngjs';
import fs   from 'node:fs';
import path from 'node:path';

const FW = 32;
const FH = 32;
const N  = 18;
const W  = FW * N;
const H  = FH;

const png  = new PNG({ width: W, height: H, colorType: 6, inputColorType: 6 });
png.data.fill(0);
const buf = png.data;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  OUTLINE:      [0x0E,0x1A,0x04],
  BODY_DARK:    [0x22,0x50,0x14],
  BODY_MID:     [0x2E,0x6E,0x1A],
  BODY_LIGHT:   [0x42,0x94,0x28],
  BODY_BRIGHT:  [0x54,0xB0,0x34],
  SCALE:        [0x22,0x60,0x16],
  BELLY:        [0xCC,0xC0,0x5C],
  BELLY_LIGHT:  [0xE4,0xD8,0x78],
  BELLY_DARK:   [0xA0,0x98,0x40],
  EYE_Y:        [0xF0,0xC8,0x20],
  EYE_PUPIL:    [0x0A,0x08,0x02],
  EYE_SHINE:    [0xFF,0xFF,0xE0],
  TONGUE:       [0xCC,0x20,0x20],
  TONGUE_TIP:   [0xFF,0x44,0x44],
  HURT_FLASH:   [0xFF,0xFF,0xFF],
};

// ── Pixel helpers ─────────────────────────────────────────────────────────────
function sp(x, y, col, a=255) {
  x=Math.round(x); y=Math.round(y);
  if (x<0||x>=W||y<0||y>=H) return;
  const i=(y*W+x)*4;
  buf[i]=col[0]; buf[i+1]=col[1]; buf[i+2]=col[2]; buf[i+3]=a;
}

function getA(x, y) {
  x=Math.round(x); y=Math.round(y);
  if (x<0||x>=W||y<0||y>=H) return 0;
  return buf[(y*W+x)*4+3];
}

function circle(cx,cy,r,col,a=255) {
  for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++)
    if(dx*dx+dy*dy<=r*r) sp(cx+dx,cy+dy,col,a);
}

function fl(x1,y1,x2,y2,col,a=255) {
  let dx=Math.abs(x2-x1), sx=x1<x2?1:-1;
  let dy=-Math.abs(y2-y1), sy=y1<y2?1:-1, err=dx+dy;
  let x=x1,y=y1;
  const limit=dx+Math.abs(y2-y1)+4;
  for(let i=0;i<limit;i++){
    sp(x,y,col,a);
    if(x===x2&&y===y2) break;
    const e2=2*err;
    if(e2>dy){err+=dy;x+=sx;}
    if(e2<dx){err+=dx;y+=sy;}
  }
}

// ── Spline interpolation ──────────────────────────────────────────────────────
function catmull(p0,p1,p2,p3,t) {
  const t2=t*t, t3=t*t*t;
  return [
    0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
    0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3),
  ];
}

function splinePoints(ctrl, steps=4) {
  const out=[], n=ctrl.length;
  for(let i=0;i<n-1;i++){
    const p0=ctrl[Math.max(0,i-1)], p1=ctrl[i], p2=ctrl[i+1], p3=ctrl[Math.min(n-1,i+2)];
    for(let j=0;j<steps;j++) out.push(catmull(p0,p1,p2,p3,j/steps));
  }
  out.push(ctrl[n-1]);
  return out;
}

// ── Snake drawing ─────────────────────────────────────────────────────────────
/**
 * Draw a snake into frame slot `fi`.
 * ctrl: control points [[x,y],...] head → tail (frame-local coords)
 * headDir: 'r' right, 'l' left
 * hurt: bool — add white flash overlay
 * dead: 0-3 — 0=normal, 1=slight droop, 2=more, 3=flat
 * tongue: bool
 * openMouth: bool
 */
function drawSnake(fi, ctrl, {
  headDir='r', hurt=false, dead=0,
  tongue=true, openMouth=false,
  attackStretch=false
}={}) {
  const OX = fi * FW;

  // Translate ctrl to absolute coords
  const abs = ctrl.map(([x,y])=>[OX+x, y]);

  // Interpolate smooth spine
  const spine = splinePoints(abs, 5);
  const SN = spine.length;

  // --- Body radius taper ---
  function bodyR(t) {
    if (t < 0.05) return 4.5;          // head bulge
    if (t < 0.2)  return 3.8;          // neck
    const mid = Math.sin(t * Math.PI); // widest in middle, taper at tail
    return 2.5 + mid * 1.2;
  }

  // --- 1. Outline pass (1px larger circle, dark) ---
  for(let i=SN-1;i>=0;i--){
    const t=i/(SN-1), [sx,sy]=spine[i];
    const r=bodyR(t);
    circle(sx, sy, r+1.2, C.OUTLINE);
  }

  // --- 2. Body fill (back→front, dark to light) ---
  for(let i=SN-1;i>=0;i--){
    const t=i/(SN-1), [sx,sy]=spine[i];
    const r=bodyR(t);
    // Base body
    circle(sx, sy, r, C.BODY_MID);
    // Upper highlight (top 40%)
    circle(sx, sy-1, Math.max(1,r-1.5), C.BODY_LIGHT, 200);
    sp(sx, sy-Math.floor(r*0.6), C.BODY_BRIGHT);
    // Scale pattern (every 4th segment)
    if (i%4===0 && r>2) {
      sp(sx, sy, C.SCALE, 140);
      sp(sx+1, sy-1, C.SCALE, 100);
    }
  }

  // --- 3. Belly (underside of spine) ---
  // Draw belly along bottom of each segment
  for(let i=SN-1;i>=0;i--){
    const t=i/(SN-1), [sx,sy]=spine[i];
    const r=bodyR(t);
    if (r < 2) continue;
    // Belly = semi-ellipse on underside
    const bw = Math.max(1, Math.floor(r * 0.7));
    const bh = Math.max(1, Math.floor(r * 0.4));
    for(let dy=0;dy<=bh;dy++) for(let dx=-bw;dx<=bw;dx++){
      if ((dx*dx)/(bw*bw)+(dy*dy)/(bh*bh)<=1)
        sp(sx+dx, sy+dy, dy===0 ? C.BELLY_LIGHT : dy===bh ? C.BELLY_DARK : C.BELLY);
    }
  }

  // --- 4. Head details ---
  const [hx, hy] = spine[0];
  const dir = headDir === 'r' ? 1 : -1;

  // Snout bulge
  const snoutX = hx + dir * 4;
  circle(snoutX, hy+1, 2, C.BODY_MID);
  circle(snoutX, hy+1, 1, C.BODY_LIGHT);
  sp(snoutX, hy+2, C.OUTLINE);
  sp(snoutX+dir, hy+2, C.OUTLINE);

  // Open mouth (attack)
  if (openMouth) {
    const mX = hx + dir*5;
    fl(mX, hy, mX+dir*2, hy+3, C.OUTLINE);
    fl(mX, hy+3, mX+dir*2, hy+3, C.OUTLINE);
    fr2(mX+Math.min(0,dir), hy+1, 2, 2, C.BELLY);
    // Fangs
    sp(mX+dir, hy+3, C.BELLY_LIGHT);
    sp(mX, hy+3, C.BELLY_LIGHT);
  }

  // Eye
  const eyeX = hx + dir*2;
  const eyeY = hy - 2;
  circle(eyeX, eyeY, 2, C.EYE_Y);
  sp(eyeX, eyeY, C.EYE_PUPIL);
  sp(eyeX - dir, eyeY-1, C.EYE_SHINE);

  // Tongue (flicking)
  if (tongue) {
    const tx = snoutX + dir*2;
    sp(tx,       hy+1, C.TONGUE);
    sp(tx+dir,   hy,   C.TONGUE_TIP);
    sp(tx+dir,   hy+2, C.TONGUE_TIP);
    sp(tx+dir*2, hy-1, C.TONGUE_TIP);
    sp(tx+dir*2, hy+3, C.TONGUE_TIP);
  }

  // --- 5. Hurt flash overlay ---
  if (hurt) {
    for(let y=0;y<FH;y++) for(let x=OX;x<OX+FW;x++){
      const a=buf[(y*W+x)*4+3];
      if(a>80) sp(x,y,C.HURT_FLASH,180);
    }
  }

  // --- 6. Dead eyes (X) ---
  if (dead >= 2) {
    sp(eyeX-1, eyeY-1, C.OUTLINE); sp(eyeX+1, eyeY+1, C.OUTLINE);
    sp(eyeX+1, eyeY-1, C.OUTLINE); sp(eyeX-1, eyeY+1, C.OUTLINE);
    // erase pupils/iris
    sp(eyeX, eyeY, C.EYE_Y);
  }
}

// simple filled rect helper
function fr2(x,y,w,h,col,a=255){
  for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) sp(x+dx,y+dy,col,a);
}

// ── Frame definitions ─────────────────────────────────────────────────────────
// Control points: [x_in_frame, y_in_frame] — head first, tail last
// Snake rests in lower half; frame is 32×32

// IDLE 0–3 — relaxed S-curve, facing right
const IDLE_BASE = [[26,14],[22,12],[17,11],[12,14],[8,18],[5,21],[3,23]];

// Frame 0: base idle
drawSnake(0, IDLE_BASE, { headDir:'r', tongue:true });

// Frame 1: head slightly raised
drawSnake(1, [[26,13],[22,11],[17,11],[12,14],[8,18],[5,21],[3,23]], { headDir:'r', tongue:false });

// Frame 2: body slightly puffed (breathing in)
drawSnake(2, [[26,14],[22,11],[17,10],[12,13],[8,17],[5,20],[3,22]], { headDir:'r', tongue:true });

// Frame 3: back toward base, tongue out
drawSnake(3, [[26,14],[22,12],[17,12],[12,15],[8,18],[5,21],[3,23]], { headDir:'r', tongue:false });

// CRAWL 4–7 — undulating slither forward, facing right
// S-curve shifts position to simulate forward motion
drawSnake(4, [[27,14],[23,12],[18,10],[13,13],[8,17],[4,20],[2,22]], { headDir:'r', tongue:true });
drawSnake(5, [[27,15],[23,14],[18,13],[13,13],[8,13],[4,16],[2,18]], { headDir:'r', tongue:false });
drawSnake(6, [[27,14],[23,16],[18,18],[13,15],[8,12],[4,15],[2,17]], { headDir:'r', tongue:true });
drawSnake(7, [[27,13],[23,12],[18,12],[13,14],[8,17],[4,19],[2,21]], { headDir:'r', tongue:false });

// ATTACK 8–11 — strike, facing right, head rears up then lunges
drawSnake(8, [[25,10],[21,9],[17,11],[13,15],[9,19],[6,21],[3,23]], { headDir:'r', tongue:false });
drawSnake(9, [[28,12],[24,9],[19,10],[14,14],[9,18],[5,21],[2,23]], { headDir:'r', tongue:false, openMouth:true });
drawSnake(10,[[29,14],[25,10],[20,9],[15,13],[10,17],[6,20],[2,22]], { headDir:'r', tongue:false, openMouth:true });
drawSnake(11,[[26,13],[22,10],[17,10],[12,13],[8,17],[5,20],[3,22]], { headDir:'r', tongue:false });

// HURT 12–13 — recoil flash
drawSnake(12,[[23,16],[19,14],[15,12],[11,15],[7,18],[4,21],[2,23]], { headDir:'r', tongue:false, hurt:true });
drawSnake(13,[[25,15],[21,13],[16,11],[12,14],[8,17],[5,20],[3,22]], { headDir:'r', tongue:false });

// DEATH 14–17 — topple and go flat
drawSnake(14,[[26,16],[22,15],[18,15],[14,17],[10,19],[6,21],[3,23]], { headDir:'r', tongue:false, dead:1 });
drawSnake(15,[[26,19],[22,18],[18,18],[14,20],[10,22],[6,23],[3,24]], { headDir:'r', tongue:false, dead:2 });
drawSnake(16,[[26,22],[22,22],[18,22],[14,23],[10,23],[6,24],[3,24]], { headDir:'r', tongue:false, dead:3 });
drawSnake(17,[[26,24],[22,24],[18,24],[14,24],[10,24],[6,25],[3,25]], { headDir:'r', tongue:false, dead:3 });

// ── Save ──────────────────────────────────────────────────────────────────────
const outDir = path.resolve('artifacts/relics-of-aetheria/assets/enemies/snake');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'snake.png');
const data = PNG.sync.write(png);
fs.writeFileSync(outPath, data);

console.log(`✓ Written: ${outPath}`);
console.log(`  Dimensions : ${W} × ${H} px`);
console.log(`  Frames     : ${N} × ${FW}×${FH} px each`);
console.log(`  File size  : ${(data.length/1024).toFixed(1)} KB`);

let ok=true;
for(let f=0;f<N;f++){
  let solid=0, transparent=0;
  for(let y=0;y<H;y++) for(let x=f*FW;x<(f+1)*FW;x++){
    const a=buf[(y*W+x)*4+3];
    if(a>100) solid++; else if(a===0) transparent++;
  }
  if(!solid)      { console.log(`  ✗ Frame ${f}: no solid pixels!`);       ok=false; }
  if(!transparent){ console.log(`  ✗ Frame ${f}: no transparent pixels!`); ok=false; }
}
if(ok) console.log(`  All ${N} frames have solid content + transparency ✓`);
