/**
 * A slot's base: the drawing a new canvas starts from instead of being empty. A slot names it with
 * `"base": { "from": "<slot id>", "at": [x, y] }`: every pet state starts from icon.tomato at (4,4),
 * where the pet classes put the tomato, in every frame of a strip. The base is the founder's own
 * pixels copied in at whole pixels, never drawn, scaled or recoloured here.
 *
 * A canvas that is still exactly its base passes every check but has nothing new on it, so it counts
 * as not started (`isBaseOnly`): the queue, the desk, `tf watch`, the pre-commit hook and the app's
 * copier all treat it like an empty scaffold, never as a finished drawing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canvasOf, parsePNG } from './validate.mjs';
import { blankIndexed, encodeIndexedPNG, encodePNG } from './png.mjs';

/** The canvas's pixels with the base placed (RGBA, row by row), or null: no base, or it is not drawn. */
export async function basePixels(slot, cls, dir = '.') {
  const b = slot.base;
  if (!b?.from) return null;
  const file = join(dir, 'art', `${b.from}@1x.png`);
  if (!existsSync(file)) return null;
  const P = await parsePNG(new Uint8Array(readFileSync(file)));
  if (!P.px) return null;
  const { w, h } = canvasOf(cls);
  const frames = cls.strip ? cls.frames : 1;
  const fh = h / frames;
  const [ax, ay] = b.at ?? [0, 0];
  const px = new Uint8Array(w * h * 4);
  for (let f = 0; f < frames; f++) {
    for (let y = 0; y < P.meta.h; y++) {
      for (let x = 0; x < P.meta.w; x++) {
        const s = (y * P.meta.w + x) * 4;
        const tx = ax + x, ty = ay + y;
        if (P.px[s + 3] === 0 || tx < 0 || ty < 0 || tx >= w || ty >= fh) continue;
        px.set(P.px.subarray(s, s + 4), ((f * fh + ty) * w + tx) * 4);
      }
    }
  }
  return { w, h, px };
}

/**
 * A new canvas for the slot: indexed with the master palette built in, as a scaffold always is, and
 * the base placed when it has one (any colour of the base's not on the palette is added after it).
 */
export async function newCanvas(slot, cls, palette, dir = '.') {
  const { w, h } = canvasOf(cls);
  const base = await basePixels(slot, cls, dir);
  if (!base) return blankIndexed(w, h, palette);
  const pal = [...palette];
  const at = new Map(pal.map((c, i) => [c, i + 1]));
  for (let i = 0; i < base.px.length; i += 4) {
    const a = base.px[i + 3];
    // A half-transparent pixel cannot be indexed with one transparent swatch: keep every pixel exact, in RGBA.
    if (a !== 0 && a !== 255) return encodePNG(w, h, (x, y) => [...base.px.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)]);
    const c = (base.px[i] << 16) | (base.px[i + 1] << 8) | base.px[i + 2];
    if (a && !at.has(c)) { pal.push(c); at.set(c, pal.length); }
  }
  if (pal.length > 255) return encodePNG(w, h, (x, y) => [...base.px.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)]);
  return encodeIndexedPNG(w, h, pal, (x, y) => {
    const o = (y * w + x) * 4;
    return base.px[o + 3] ? at.get((base.px[o] << 16) | (base.px[o + 1] << 8) | base.px[o + 2]) : 0;
  });
}

/** True when these PNG bytes are still exactly the slot's base: placed, and nothing drawn yet. */
export async function isBaseOnly(bytes, slot, cls, dir = '.') {
  const base = await basePixels(slot, cls, dir);
  if (!base) return false;
  const P = await parsePNG(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  if (!P.px || P.meta.w !== base.w || P.meta.h !== base.h) return false;
  for (let i = 0; i < base.px.length; i += 4) {
    const a = P.px[i + 3];
    if (a !== base.px[i + 3]) return false;
    if (a && (P.px[i] !== base.px[i] || P.px[i + 1] !== base.px[i + 1] || P.px[i + 2] !== base.px[i + 2])) return false;
  }
  return true;
}
