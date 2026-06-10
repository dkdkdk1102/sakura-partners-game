/* assets.js — preloads every named sprite (from data/atlas.js) as an Image and
   provides draw helpers with horizontal flip + bottom-center anchoring. Works
   from file:// because <img> loading is not subject to fetch/CORS rules. */

const Assets = {
  images: {},
  total: 0,
  loaded: 0,
  ready: false,

  // load all sprites listed in window.ATLAS, calling onProgress(loaded,total)
  load(onProgress, onDone) {
    const names = Object.keys(window.ATLAS || {});
    this.total = names.length;
    if (this.total === 0) { this.ready = true; onDone && onDone(); return; }
    names.forEach((name) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        this.loaded++;
        onProgress && onProgress(this.loaded, this.total);
        if (this.loaded >= this.total) { this.ready = true; onDone && onDone(); }
      };
      img.src = `assets/sprites/${name}.png`;
      this.images[name] = img;
    });
  },

  get(name) { return this.images[name]; },
  size(name) { const m = window.ATLAS[name]; return m ? m : { w: TILE, h: TILE }; },
};

/* Draw a sprite into the world. (ctx already translated/scaled by the camera.)
   x,y is the anchor point in world px; anchor defaults to bottom-center so
   characters/props sit naturally on the ground. dw/dh override draw size. */
function drawSprite(ctx, name, x, y, opts = {}) {
  const img = Assets.get(name);
  if (!img || !img.width) return;
  const meta = Assets.size(name);
  const dw = opts.w != null ? opts.w : meta.w;
  const dh = opts.h != null ? opts.h : meta.h;
  const ax = opts.ax != null ? opts.ax : 0.5; // anchor x (0=left,1=right)
  const ay = opts.ay != null ? opts.ay : 1.0; // anchor y (0=top,1=bottom)
  const flip = opts.flip ? -1 : 1;
  const alpha = opts.alpha != null ? opts.alpha : 1;
  // fast path: no rotation/flip/scale/alpha → a single drawImage, no state churn
  // (terrain tiles go through here ~100×/frame)
  if (!opts.rot && !opts.flip && (!opts.scale || opts.scale === 1) && alpha === 1) {
    ctx.drawImage(img, x - dw * ax, y - dh * ay, dw, dh);
    return;
  }
  ctx.save();
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  if (opts.scale && opts.scale !== 1) ctx.scale(opts.scale, opts.scale);
  ctx.scale(flip, 1);
  ctx.drawImage(img, -dw * ax, -dh * ay, dw, dh);
  ctx.restore();
}

window.Assets = Assets;
window.drawSprite = drawSprite;
