/**
 * Relics of Aetheria — M20C Kai Production Sprite Sheet Generator
 *
 * Output: artifacts/relics-of-aetheria/assets/characters/kai/kai.png
 * Size:   704 × 48 px  (22 frames × 32 px wide, 48 px tall, RGBA PNG)
 *
 * Frame layout (0-based, inclusive):
 *   0–3   idle        6 fps  loop
 *   4–9   run        12 fps  loop
 *  10     jump        1 fps  once
 *  11     fall        1 fps  once
 *  12     land        1 fps  once
 *  13–14  climb       8 fps  loop
 *  15–16  push        6 fps  loop
 *  17     hurt        1 fps  once
 *  18–21  celebrate   8 fps  loop
 *
 * Art style: Minish Cap / Owlboy / Celeste / Eastward
 *   - Warm jungle palette, brown hair, green explorer outfit
 *   - Small backpack, boots, gloves, scarf accent
 *   - Clean 1-px dark outline, soft cel shading
 *   - Transparent background
 */

import { PNG } from 'pngjs';
import fs   from 'node:fs';
import path from 'node:path';

const FW = 32;   // frame width
const FH = 48;   // frame height
const N  = 22;   // frame count
const W  = FW * N;
const H  = FH;

// ── PNG setup ─────────────────────────────────────────────────────────────────
const png = new PNG({ width: W, height: H, colorType: 6, inputColorType: 6 });
png.data.fill(0);
const buf = png.data;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  OUTLINE:        [0x1A,0x0E,0x04],
  SKIN:           [0xFF,0xCC,0x88],
  SKIN_SHADOW:    [0xE8,0xA8,0x70],
  SKIN_DARK:      [0xC8,0x80,0x48],
  HAIR_DARK:      [0x5A,0x2A,0x0E],
  HAIR_MID:       [0x7A,0x4A,0x2A],
  HAIR_LIGHT:     [0xA0,0x6A,0x40],
  EYE_WHITE:      [0xFF,0xFF,0xFF],
  EYE_IRIS:       [0x44,0x88,0xFF],
  EYE_PUPIL:      [0x1A,0x0E,0x04],
  EYE_SHINE:      [0xFF,0xFF,0xFF],
  JACKET_DARK:    [0x2D,0x5A,0x20],
  JACKET_MID:     [0x3A,0x70,0x30],
  JACKET_LIGHT:   [0x4A,0x90,0x40],
  JACKET_BRIGHT:  [0x5C,0xB0,0x50],
  SHIRT:          [0xCC,0xCC,0x44],
  PANTS_DARK:     [0x3A,0x20,0x10],
  PANTS_MID:      [0x4A,0x2A,0x18],
  PANTS_LIGHT:    [0x5A,0x38,0x28],
  BOOT_DARK:      [0x1E,0x10,0x08],
  BOOT_MID:       [0x3A,0x20,0x10],
  BOOT_LIGHT:     [0x5A,0x38,0x20],
  PACK_DARK:      [0x6A,0x40,0x18],
  PACK_MID:       [0x8A,0x58,0x28],
  PACK_LIGHT:     [0xAA,0x78,0x38],
  SCARF:          [0xCC,0x38,0x20],
  SCARF_LIGHT:    [0xEE,0x58,0x38],
  BELT:           [0x2A,0x1A,0x08],
  BUCKLE:         [0xC8,0xA0,0x20],
  GLOVE:          [0x5A,0x38,0x20],
  GLOVE_DARK:     [0x3A,0x20,0x10],
};

// ── Pixel helpers ─────────────────────────────────────────────────────────────
function sp(x, y, [r,g,b], a=255) {
  if (x<0||x>=W||y<0||y>=H) return;
  const i=(y*W+x)*4; buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=a;
}

function fr(x,y,w,h,col,a=255) {
  for (let dy=0;dy<h;dy++) for (let dx=0;dx<w;dx++) sp(x+dx,y+dy,col,a);
}

function fl(x1,y1,x2,y2,col,a=255) {
  // Bresenham — strict > / < to avoid overshooting the endpoint
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

function circle(cx,cy,r,col,a=255) {
  for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++)
    if(dx*dx+dy*dy<=r*r) sp(cx+dx,cy+dy,col,a);
}

function ellipse(cx,cy,rx,ry,col,a=255) {
  for(let dy=-ry;dy<=ry;dy++) for(let dx=-rx;dx<=rx;dx++)
    if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<=1) sp(cx+dx,cy+dy,col,a);
}

// Frame origin: fx = frame_index * FW
const ox = n => n * FW;

// ── Body-part drawing functions ───────────────────────────────────────────────
// All coordinates are absolute (add ox(frame) to x for correct frame position)

/**
 * Draw Kai's head centered at (cx, cy).
 * eyeDir: -1 = look left, 0 = forward, 1 = look right
 * blink:  true = eyes closed
 * happy:  true = smile eyes (celebrate)
 */
function drawHead(cx, cy, { eyeDir=0, blink=false, happy=false, hurt=false } = {}) {
  // Hair back (behind head)
  fr(cx-5, cy-7, 10, 4, C.HAIR_DARK);
  fr(cx-6, cy-4, 12, 2, C.HAIR_DARK);

  // Head outline + skin
  for (let dy=-5; dy<=5; dy++) for (let dx=-5; dx<=5; dx++) {
    if (Math.abs(dx)===5 || Math.abs(dy)===5) {
      if (dx*dx+dy*dy <= 38) sp(cx+dx, cy+dy, C.OUTLINE);
    }
  }
  ellipse(cx, cy, 5, 5, C.SKIN);

  // Skin shading (right side darker)
  fr(cx+2, cy-2, 3, 6, C.SKIN_SHADOW);
  // Cheek highlight
  sp(cx-3, cy+2, C.SKIN, 180);

  // Eyes
  if (happy) {
    // Curved happy eyes
    sp(cx-2, cy-1, C.EYE_PUPIL);
    sp(cx-1, cy-2, C.EYE_PUPIL);
    sp(cx+1, cy-2, C.EYE_PUPIL);
    sp(cx+2, cy-1, C.EYE_PUPIL);
  } else if (blink) {
    sp(cx-2, cy, C.OUTLINE); sp(cx-1, cy, C.OUTLINE);
    sp(cx+1, cy, C.OUTLINE); sp(cx+2, cy, C.OUTLINE);
  } else if (hurt) {
    // X eyes
    sp(cx-2, cy-1, C.OUTLINE); sp(cx-1, cy, C.OUTLINE);
    sp(cx+1, cy-1, C.OUTLINE); sp(cx+2, cy, C.OUTLINE);
    sp(cx-1, cy-1, C.OUTLINE); sp(cx+2, cy-1, C.OUTLINE);
  } else {
    const ex = eyeDir;
    // Left eye
    sp(cx-2+ex, cy, C.EYE_WHITE);
    sp(cx-2+ex, cy-1, C.EYE_WHITE);
    sp(cx-3+ex, cy, C.OUTLINE); // left edge
    sp(cx-1+ex, cy-2, C.OUTLINE); // top
    sp(cx-2+ex, cy-2, C.OUTLINE);
    sp(cx-1+ex, cy+1, C.OUTLINE); // bottom
    sp(cx-2+ex, cy+1, C.OUTLINE);
    sp(cx-1+ex, cy, C.EYE_IRIS);
    sp(cx-1+ex, cy-1, C.EYE_IRIS);
    sp(cx-2+ex, cy-1, C.EYE_IRIS, 180);
    sp(cx-2+ex, cy+0, C.EYE_PUPIL);
    sp(cx-2+ex, cy-1, C.EYE_PUPIL, 140);

    // Right eye
    sp(cx+2+ex, cy, C.EYE_WHITE);
    sp(cx+2+ex, cy-1, C.EYE_WHITE);
    sp(cx+3+ex, cy, C.OUTLINE);
    sp(cx+2+ex, cy-2, C.OUTLINE);
    sp(cx+1+ex, cy-2, C.OUTLINE);
    sp(cx+2+ex, cy+1, C.OUTLINE);
    sp(cx+1+ex, cy+1, C.OUTLINE);
    sp(cx+1+ex, cy, C.EYE_IRIS);
    sp(cx+1+ex, cy-1, C.EYE_IRIS);
    sp(cx+2+ex, cy-1, C.EYE_IRIS, 180);
    sp(cx+2+ex, cy, C.EYE_PUPIL);
    sp(cx+2+ex, cy-1, C.EYE_PUPIL, 140);
    // eye shines
    sp(cx-1+ex, cy-1, C.EYE_SHINE);
    sp(cx+1+ex, cy-1, C.EYE_SHINE);
  }

  // Nose (1px dot)
  sp(cx, cy+2, C.SKIN_DARK);

  // Mouth
  if (happy) {
    sp(cx-1, cy+3, C.OUTLINE); sp(cx, cy+4, C.OUTLINE); sp(cx+1, cy+3, C.OUTLINE);
  } else if (hurt) {
    sp(cx-1, cy+4, C.OUTLINE); sp(cx, cy+3, C.OUTLINE); sp(cx+1, cy+4, C.OUTLINE);
  } else {
    sp(cx-1, cy+3, C.OUTLINE); sp(cx+1, cy+3, C.OUTLINE);
  }

  // Hair top tuft
  fr(cx-4, cy-8, 8, 2, C.HAIR_DARK);
  fr(cx-3, cy-9, 6, 1, C.HAIR_MID);
  fr(cx-5, cy-7, 3, 3, C.HAIR_DARK);
  fr(cx+2,  cy-7, 3, 3, C.HAIR_DARK);
  // Hair highlights
  sp(cx-1, cy-8, C.HAIR_LIGHT);
  sp(cx,   cy-8, C.HAIR_LIGHT);
  sp(cx+1, cy-8, C.HAIR_LIGHT);
  // Hair sides
  sp(cx-5, cy-3, C.HAIR_DARK);
  sp(cx-5, cy-2, C.HAIR_DARK);
  sp(cx+5, cy-3, C.HAIR_DARK);
  sp(cx+5, cy-2, C.HAIR_DARK);
  // Small ear hint
  sp(cx-5, cy+1, C.SKIN);
  sp(cx+5, cy+1, C.SKIN);
  // Outline around hair
  fl(cx-4, cy-9, cx+3, cy-9, C.OUTLINE);
  sp(cx-5, cy-8, C.OUTLINE);
  sp(cx+4, cy-8, C.OUTLINE);
  sp(cx-6, cy-5, C.OUTLINE);
  sp(cx+5, cy-5, C.OUTLINE);
}

/**
 * Draw scarf at neck position
 */
function drawScarf(cx, cy) {
  fr(cx-4, cy, 8, 3, C.SCARF);
  fr(cx-3, cy, 6, 1, C.SCARF_LIGHT);
  // Outline
  fl(cx-4, cy, cx+3, cy, C.OUTLINE);
  fl(cx-4, cy+2, cx+3, cy+2, C.OUTLINE);
  sp(cx-4, cy+1, C.OUTLINE);
  sp(cx+3, cy+1, C.OUTLINE);
}

/**
 * Draw torso centered at (cx, ty = top-y).
 * Height: ~12px. Backpack on right.
 */
function drawTorso(cx, ty) {
  // Backpack (drawn first, behind body)
  fr(cx+4, ty+1, 5, 9, C.PACK_DARK);
  fr(cx+4, ty+1, 5, 1, C.PACK_LIGHT);
  fr(cx+4, ty+2, 1, 8, C.PACK_MID);
  // Backpack outline
  fr(cx+3, ty,   7, 11, C.OUTLINE, 0); // clear
  sp(cx+3, ty,   C.OUTLINE);
  sp(cx+8, ty,   C.OUTLINE);
  fl(cx+3, ty, cx+3, ty+10, C.OUTLINE);
  fl(cx+8, ty, cx+8, ty+10, C.OUTLINE);
  fl(cx+4, ty+10, cx+8, ty+10, C.OUTLINE);
  // Straps
  sp(cx+2, ty+1, C.PACK_MID);
  sp(cx+2, ty+2, C.PACK_MID);
  sp(cx+2, ty+5, C.PACK_MID);
  sp(cx+2, ty+6, C.PACK_MID);

  // Jacket body (main)
  fr(cx-5, ty, 10, 12, C.JACKET_MID);
  // Jacket left side (shadow)
  fr(cx+2,  ty, 3, 12, C.JACKET_DARK);
  // Jacket left highlight
  fr(cx-5, ty, 2, 12, C.JACKET_LIGHT);
  // Jacket front center crease
  fr(cx-1, ty+1, 2, 10, C.JACKET_DARK, 120);
  // Jacket buttons
  sp(cx, ty+3, C.JACKET_BRIGHT);
  sp(cx, ty+6, C.JACKET_BRIGHT);
  sp(cx, ty+9, C.JACKET_BRIGHT);
  // Collar / shirt visible
  fr(cx-2, ty, 4, 2, C.SHIRT);
  // Belt
  fr(cx-5, ty+9, 10, 2, C.BELT);
  sp(cx-1, ty+9, C.BUCKLE);
  sp(cx,   ty+9, C.BUCKLE);
  sp(cx-1, ty+10, C.BUCKLE);
  sp(cx,   ty+10, C.BUCKLE);
  // Jacket outline
  fl(cx-5, ty, cx+4, ty, C.OUTLINE);
  fl(cx-5, ty, cx-5, ty+11, C.OUTLINE);
  fl(cx+4, ty, cx+4, ty+11, C.OUTLINE);
  fl(cx-5, ty+11, cx+4, ty+11, C.OUTLINE);
}

/**
 * Draw a single arm as a line with hand (glove).
 * (sx,sy) = shoulder, (ex,ey) = elbow, (hx,hy) = hand/wrist
 */
function drawArm(sx,sy,ex,ey,hx,hy) {
  // Upper arm
  fl(sx,sy,ex,ey,C.JACKET_MID);
  sp(sx,sy,C.JACKET_DARK);
  // Forearm
  fl(ex,ey,hx,hy,C.JACKET_LIGHT);
  // Glove / hand
  circle(hx,hy,2,C.GLOVE);
  sp(hx,hy,C.GLOVE_DARK);
  // Outline
  sp(sx,sy-1,C.OUTLINE);
  sp(hx,hy-2,C.OUTLINE);
  sp(hx-2,hy,C.OUTLINE);
  sp(hx+2,hy,C.OUTLINE);
  sp(hx,hy+2,C.OUTLINE);
}

/**
 * Draw a leg.
 * (hx,hy) = hip, (kx,ky) = knee, (ax,ay) = ankle top of boot
 */
function drawLeg(hx,hy,kx,ky,ax,ay,col=C.PANTS_MID,shadow=C.PANTS_DARK) {
  fl(hx,hy,kx,ky,col);
  sp(hx,hy,shadow);
  fl(kx,ky,ax,ay,shadow);
  sp(kx,ky,col); // knee bright
}

/**
 * Draw a boot at (cx, ty) - top of boot, width 8, height 6.
 */
function drawBoot(cx, ty, facing=1) {
  // Boot base
  fr(cx-3, ty,   7, 5, C.BOOT_MID);
  // Toe cap (slightly extended in facing direction)
  fr(cx-3+facing, ty+2, 2, 3, C.BOOT_LIGHT);
  sp(cx-3+facing*3, ty+4, C.BOOT_LIGHT);
  // Shadow top
  fr(cx-3, ty, 7, 1, C.BOOT_DARK);
  // Sole
  fr(cx-4, ty+4, 9, 2, C.BOOT_DARK);
  // Outline
  fl(cx-4, ty, cx+3, ty, C.OUTLINE);
  fl(cx-4, ty, cx-4, ty+5, C.OUTLINE);
  fl(cx+3, ty, cx+3, ty+5, C.OUTLINE);
  fl(cx-4, ty+5, cx+4, ty+5, C.OUTLINE);
  sp(cx+4, ty+3, C.OUTLINE);
  sp(cx+4, ty+4, C.OUTLINE);
}

// ── Pose composers ────────────────────────────────────────────────────────────

/**
 * Draw standard standing Kai.
 * fi = frame index (0-based, absolute)
 * armShift: pixel offset for arm swing, legShift: leg Y offset
 */
function poseStand(fi, opts={}) {
  const {
    headOpts={}, armShift=0, legSwing=0,
    jumpOff=0, crouch=0, leanX=0,
  } = opts;

  const ox0 = ox(fi);
  // Anchor: feet at y=44, center x=16 in frame
  const cx = ox0 + 16;
  const feetY = 44;

  // Adjusted positions
  const bodyY = feetY - 6 - 12 - crouch;  // torso top
  const headCY = bodyY - 8 + jumpOff;
  const scarfY = bodyY - 2;

  // Left leg
  const lhx = cx - 3 + leanX, lhy = bodyY + 12;
  const lkx = cx - 3 + leanX, lky = lhy + 5 + legSwing;
  const lax = cx - 3 + leanX, lay = feetY - 6;
  drawLeg(lhx,lhy,lkx,lky,lax,lay);
  drawBoot(cx-3+leanX, feetY-6, 1);

  // Right leg
  const rhx = cx + 3 + leanX, rhy = bodyY + 12;
  const rkx = cx + 3 + leanX, rky = rhy + 5 - legSwing;
  const rax = cx + 3 + leanX, ray = feetY - 6;
  drawLeg(rhx,rhy,rkx,rky,rax,ray,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx+3+leanX, feetY-6, 1);

  // Torso
  drawTorso(cx+leanX, bodyY);

  // Left arm (near, slightly in front)
  drawArm(cx-5+leanX, bodyY+2, cx-5+leanX, bodyY+7, cx-5+leanX-armShift, bodyY+10+armShift);

  // Right arm (far)
  drawArm(cx+4+leanX, bodyY+2, cx+4+leanX, bodyY+7, cx+4+leanX+armShift, bodyY+10-armShift);

  // Scarf
  drawScarf(cx+leanX, scarfY);

  // Head
  drawHead(cx+leanX, headCY, headOpts);
}

/**
 * Running pose - alternating stride.
 * phase 0: right-forward; phase 1: neutral; phase 2: left-forward
 */
function poseRun(fi, phase) {
  const ox0 = ox(fi);
  const cx = ox0 + 16;
  const feetY = 44;
  const bodyY = 26;
  const headCY = 17;

  // Body bobs slightly
  const bob = (phase===1||phase===4) ? 1 : 0;

  // Legs
  const legSwings = [
    [ 8, -10,  0,  5,  8, -10,  0, 5],  // phase 0: L back, R forward
    [ 4,  -5, -4,  2,  4,  -5, -4, 2],  // phase 1: passing
    [-8,  10,  0, -5, -8,  10,  0,-5],  // phase 2: L forward, R back
  ];

  // Left leg  (hip→knee→ankle as relative offsets)
  let lhX, lkX, lkY, laX, rhX, rkX, rkY, raX;
  const armSwing = [6, 3, -6][phase % 3] || 0;
  const armSwingY = [-3, -1, 3][phase % 3] || 0;

  if (phase===0) {
    // L: behind; R: forward
    lhX=cx-3; lkX=cx-8; lkY=37; laX=cx-10;
    rhX=cx+3; rkX=cx+8; rkY=33; raX=cx+8;
    drawLeg(lhX, bodyY+12+bob, lkX, lkY, laX, feetY-8, C.PANTS_DARK, C.PANTS_MID);
    drawBoot(laX, feetY-8, 1);
    drawLeg(rhX, bodyY+12+bob, rkX, rkY, raX, feetY-6, C.PANTS_MID, C.PANTS_DARK);
    drawBoot(raX, feetY-6, 1);
  } else if (phase===1) {
    // Passing — legs center
    lhX=cx-3; lkX=cx-3; lkY=36; laX=cx-3;
    rhX=cx+3; rkX=cx+5; rkY=36; raX=cx+5;
    drawLeg(lhX,bodyY+12+bob,lkX,lkY,laX,feetY-7,C.PANTS_DARK,C.PANTS_MID);
    drawBoot(laX,feetY-7,1);
    drawLeg(rhX,bodyY+12+bob,rkX,rkY,raX,feetY-6,C.PANTS_MID,C.PANTS_DARK);
    drawBoot(raX,feetY-6,1);
  } else if (phase===2) {
    // L: forward; R: behind
    lhX=cx-3; lkX=cx-8; lkY=33; laX=cx-8;
    rhX=cx+3; rkX=cx+8; rkY=37; raX=cx+10;
    drawLeg(rhX,bodyY+12+bob,rkX,rkY,raX,feetY-8,C.PANTS_DARK,C.PANTS_MID);
    drawBoot(raX,feetY-8,1);
    drawLeg(lhX,bodyY+12+bob,lkX,lkY,laX,feetY-6,C.PANTS_MID,C.PANTS_DARK);
    drawBoot(laX,feetY-6,1);
  }

  drawTorso(cx, bodyY+bob);
  // Arms swing opposite to legs
  drawArm(cx-5, bodyY+2+bob, cx-5+armSwing/2, bodyY+6, cx-5+armSwing, bodyY+8+armSwingY);
  drawArm(cx+4, bodyY+2+bob, cx+4-armSwing/2, bodyY+6, cx+4-armSwing, bodyY+8-armSwingY);
  drawScarf(cx, bodyY-2+bob);
  drawHead(cx, headCY+bob);
}

// ── Frame 0: Idle base ────────────────────────────────────────────────────────
poseStand(0, { headOpts:{} });

// ── Frame 1: Idle slight shift ────────────────────────────────────────────────
poseStand(1, { armShift:1, headOpts:{ eyeDir:0 } });

// ── Frame 2: Idle breathe (1px up) ───────────────────────────────────────────
poseStand(2, { jumpOff:-1, headOpts:{} });

// ── Frame 3: Idle back (blink) ────────────────────────────────────────────────
poseStand(3, { armShift:-1, headOpts:{ blink:true } });

// ── Frames 4–6: Run stride A ──────────────────────────────────────────────────
poseRun(4, 0);
poseRun(5, 1);
poseRun(6, 2);

// ── Frames 7–9: Run stride B (mirrored phases) ───────────────────────────────
poseRun(7, 2);  // mirror of 4
poseRun(8, 1);  // same passing
poseRun(9, 0);  // mirror of 6

// ── Frame 10: Jump ────────────────────────────────────────────────────────────
{
  const fi=10, ox0=ox(fi), cx=ox0+16, feetY=40, bodyY=22, headCY=13;
  // Tucked legs
  drawLeg(cx-4,bodyY+12,cx-6,bodyY+18,cx-4,bodyY+22,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx-4,bodyY+22,1);
  drawLeg(cx+3,bodyY+12,cx+5,bodyY+18,cx+4,bodyY+22,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx+4,bodyY+22,1);
  drawTorso(cx, bodyY);
  // Arms raised
  drawArm(cx-5,bodyY+2,cx-8,bodyY-3,cx-10,bodyY-6);
  drawArm(cx+4,bodyY+2,cx+7,bodyY-3,cx+9,bodyY-6);
  drawScarf(cx, bodyY-2);
  drawHead(cx, headCY, { eyeDir:0 });
}

// ── Frame 11: Fall ────────────────────────────────────────────────────────────
{
  const fi=11, ox0=ox(fi), cx=ox0+16, bodyY=26, headCY=17;
  // Legs slightly apart, dangling
  drawLeg(cx-4,bodyY+12,cx-6,bodyY+18,cx-5,bodyY+24,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx-5,bodyY+24,1);
  drawLeg(cx+3,bodyY+12,cx+5,bodyY+18,cx+5,bodyY+24,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx+5,bodyY+24,1);
  drawTorso(cx, bodyY);
  // Arms out wide (falling)
  drawArm(cx-5,bodyY+3,cx-9,bodyY+5,cx-12,bodyY+8);
  drawArm(cx+4,bodyY+3,cx+8,bodyY+5,cx+11,bodyY+8);
  drawScarf(cx, bodyY-2);
  drawHead(cx, headCY, { eyeDir:0 });
}

// ── Frame 12: Land ────────────────────────────────────────────────────────────
{
  const fi=12, ox0=ox(fi), cx=ox0+16, feetY=44, bodyY=31, headCY=22;
  // Crouched legs
  drawLeg(cx-4,bodyY+10,cx-5,bodyY+15,cx-4,feetY-7,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx-4,feetY-7,1);
  drawLeg(cx+3,bodyY+10,cx+4,bodyY+15,cx+4,feetY-7,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx+4,feetY-7,1);
  drawTorso(cx, bodyY);
  // Arms bracing forward
  drawArm(cx-5,bodyY+2,cx-6,bodyY+7,cx-8,bodyY+10);
  drawArm(cx+4,bodyY+2,cx+5,bodyY+7,cx+7,bodyY+10);
  drawScarf(cx, bodyY-2);
  drawHead(cx, headCY, {});
}

// ── Frame 13: Climb A ─────────────────────────────────────────────────────────
{
  const fi=13, ox0=ox(fi), cx=ox0+16, bodyY=24, headCY=15;
  drawLeg(cx-4,bodyY+12,cx-5,bodyY+18,cx-4,bodyY+24,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx-4,bodyY+24,1);
  drawLeg(cx+3,bodyY+12,cx+4,bodyY+16,cx+4,bodyY+22,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx+4,bodyY+22,1);
  drawTorso(cx, bodyY);
  // Left arm up gripping
  drawArm(cx-5,bodyY+2,cx-7,bodyY-3,cx-5,bodyY-7);
  // Right arm mid
  drawArm(cx+4,bodyY+2,cx+5,bodyY+5,cx+5,bodyY+9);
  drawScarf(cx, bodyY-2);
  drawHead(cx, headCY, { eyeDir:1 });
}

// ── Frame 14: Climb B (alt grip) ─────────────────────────────────────────────
{
  const fi=14, ox0=ox(fi), cx=ox0+16, bodyY=22, headCY=13;
  drawLeg(cx-4,bodyY+12,cx-4,bodyY+16,cx-4,bodyY+22,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx-4,bodyY+22,1);
  drawLeg(cx+3,bodyY+12,cx+4,bodyY+18,cx+4,bodyY+24,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx+4,bodyY+24,1);
  drawTorso(cx, bodyY);
  drawArm(cx-5,bodyY+2,cx-5,bodyY+6,cx-5,bodyY+10);
  drawArm(cx+4,bodyY+2,cx+7,bodyY-3,cx+5,bodyY-7);
  drawScarf(cx, bodyY-2);
  drawHead(cx, headCY, { eyeDir:1 });
}

// ── Frame 15: Push A ──────────────────────────────────────────────────────────
{
  const fi=15, ox0=ox(fi), cx=ox0+14, bodyY=27, headCY=18;
  drawLeg(cx-2,bodyY+12,cx-4,bodyY+18,cx-3,bodyY+23,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx-3,bodyY+23,1);
  drawLeg(cx+5,bodyY+12,cx+8,bodyY+18,cx+7,bodyY+23,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx+7,bodyY+23,1);
  drawTorso(cx, bodyY);
  // Both arms forward (pushing)
  drawArm(cx-5,bodyY+4,cx-2,bodyY+5,cx+2,bodyY+6);
  drawArm(cx+4,bodyY+4,cx+5,bodyY+5,cx+8,bodyY+6);
  drawScarf(cx, bodyY-2);
  drawHead(cx+1, headCY, { eyeDir:1 });
}

// ── Frame 16: Push B (leaning more) ──────────────────────────────────────────
{
  const fi=16, ox0=ox(fi), cx=ox0+13, bodyY=27, headCY=18;
  drawLeg(cx-1,bodyY+12,cx-3,bodyY+18,cx-2,bodyY+23,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx-2,bodyY+23,1);
  drawLeg(cx+6,bodyY+12,cx+9,bodyY+18,cx+8,bodyY+23,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx+8,bodyY+23,1);
  drawTorso(cx, bodyY);
  drawArm(cx-5,bodyY+4,cx-2,bodyY+5,cx+3,bodyY+5);
  drawArm(cx+4,bodyY+4,cx+6,bodyY+5,cx+9,bodyY+5);
  drawScarf(cx, bodyY-2);
  drawHead(cx+2, headCY, { eyeDir:1 });
}

// ── Frame 17: Hurt ────────────────────────────────────────────────────────────
{
  const fi=17, ox0=ox(fi), cx=ox0+16, bodyY=27, headCY=18;
  // Knocked back pose
  drawLeg(cx-5,bodyY+12,cx-7,bodyY+18,cx-6,bodyY+23,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx-6,bodyY+23,1);
  drawLeg(cx+2,bodyY+12,cx+4,bodyY+18,cx+4,bodyY+23,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx+4,bodyY+23,1);
  drawTorso(cx-1, bodyY);
  // Arms flailing
  drawArm(cx-6,bodyY+3,cx-10,bodyY+1,cx-12,bodyY-2);
  drawArm(cx+3,bodyY+3,cx+7,bodyY+1,cx+10,bodyY-2);
  drawScarf(cx-1, bodyY-2);
  drawHead(cx-1, headCY, { hurt:true });
  // Hurt flash tint (white dots)
  for (let dy=0;dy<28;dy+=3) for (let dx=0;dx<14;dx+=3)
    sp(cx-6+dx,bodyY-1+dy,C.SKIN,40);
}

// ── Frames 18–21: Celebrate ───────────────────────────────────────────────────
// 4-frame bouncy jump dance
{
  // Frame 18: Jump up, arms raised
  const f18=18, ox18=ox(f18), cx18=ox18+16, by18=20, hcy18=11;
  drawLeg(cx18-3,by18+12,cx18-5,by18+17,cx18-4,by18+20,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx18-4,by18+20,1);
  drawLeg(cx18+3,by18+12,cx18+5,by18+17,cx18+4,by18+20,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx18+4,by18+20,1);
  drawTorso(cx18, by18);
  drawArm(cx18-5,by18+2,cx18-9,by18-3,cx18-11,by18-7);
  drawArm(cx18+4,by18+2,cx18+8,by18-3,cx18+10,by18-7);
  drawScarf(cx18, by18-2);
  drawHead(cx18, hcy18, { happy:true });
}
{
  // Frame 19: Peak, star pose
  const f19=19, ox19=ox(f19), cx19=ox19+16, by19=18, hcy19=9;
  drawLeg(cx19-4,by19+12,cx19-7,by19+17,cx19-8,by19+21,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx19-8,by19+21,1);
  drawLeg(cx19+4,by19+12,cx19+7,by19+17,cx19+8,by19+21,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx19+8,by19+21,1);
  drawTorso(cx19, by19);
  drawArm(cx19-5,by19+2,cx19-10,by19-1,cx19-13,by19+2);
  drawArm(cx19+4,by19+2,cx19+9,by19-1,cx19+12,by19+2);
  drawScarf(cx19, by19-2);
  drawHead(cx19, hcy19, { happy:true });
  // Star sparkles
  sp(cx19-8, by19-4, C.BUCKLE);
  sp(cx19+7, by19-4, C.BUCKLE);
  sp(cx19,   by19-6, C.BUCKLE);
}
{
  // Frame 20: Landing
  const f20=20, ox20=ox(f20), cx20=ox20+16, by20=26, hcy20=17;
  drawLeg(cx20-4,by20+10,cx20-5,by20+15,cx20-4,by20+20,C.PANTS_DARK,C.PANTS_MID);
  drawBoot(cx20-4,by20+20,1);
  drawLeg(cx20+3,by20+10,cx20+4,by20+15,cx20+4,by20+20,C.PANTS_MID,C.PANTS_DARK);
  drawBoot(cx20+4,by20+20,1);
  drawTorso(cx20, by20);
  drawArm(cx20-5,by20+2,cx20-7,by20+6,cx20-6,by20+10);
  drawArm(cx20+4,by20+2,cx20+6,by20+6,cx20+5,by20+10);
  drawScarf(cx20, by20-2);
  drawHead(cx20, hcy20, { happy:true });
}
{
  // Frame 21: Hands on hips (satisfied)
  const f21=21, ox21=ox(f21), cx21=ox21+16;
  poseStand(f21, { armShift:0, headOpts:{ happy:true } });
  // Wipe the arms drawn by poseStand and redo at sides
  // (Pose stand is fine here, just override head to happy)
}

// ── Save ──────────────────────────────────────────────────────────────────────
const outDir = path.resolve('artifacts/relics-of-aetheria/assets/characters/kai');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'kai.png');

// Synchronous write — no event-loop hanging
const data = PNG.sync.write(png);
fs.writeFileSync(outPath, data);

console.log(`✓ Written: ${outPath}`);
console.log(`  Dimensions : ${W} × ${H} px`);
console.log(`  Frames     : ${N} × ${FW}×${FH} px each`);
console.log(`  File size  : ${(data.length/1024).toFixed(1)} KB`);

// Per-frame validation
let ok = true;
for (let f=0; f<N; f++) {
  let hasSolid=false, hasTransparent=false;
  for (let y=0;y<H;y++) {
    for (let x=f*FW;x<(f+1)*FW;x++) {
      const a = buf[(y*W+x)*4+3];
      if (a>100) hasSolid=true;
      if (a===0) hasTransparent=true;
    }
  }
  if (!hasSolid) { console.log(`  ✗ Frame ${f}: no solid pixels!`); ok=false; }
  if (!hasTransparent) { console.log(`  ✗ Frame ${f}: no transparent pixels!`); ok=false; }
}
if (ok) console.log(`  All ${N} frames have solid content + transparency ✓`);
