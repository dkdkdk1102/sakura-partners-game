/* level.js — themed parallax background + a tile-coordinate LevelBuilder used by
   levels.js to lay out terrain, items, enemies, decor and the goal. Backgrounds
   layer a sky gradient, drifting clouds, distant landmark silhouettes, an optional
   sea band, and ambient petals/bubbles so each Izu area reads at a glance. */

const ROWS = 14;            // map height in tiles (≈2 tiles of earth show below the surface)
const GROUND = 12;          // default ground surface row

const THEMES = {
  spring: {
    sky: ['#bfe6ff', '#fde9f1'], tiles: { top: 't_grass', fill: 't_dirt', oneway: 't_wood' },
    far: { name: 'l_omuro_big', scale: 2.6, gap: 9, baseY: 0.78, factor: 0.25, alpha: 0.9 },
    mid: { name: 'd_bush', scale: 1.8, gap: 4, baseY: 0.86, factor: 0.5, alpha: 0.95 },
    clouds: true, ambiance: 'petal', sea: false,
  },
  mountain: {
    sky: ['#a9dcff', '#e8f6e0'], tiles: { top: 't_grass', fill: 't_stone_fill', oneway: 't_wood' },
    far: { name: 'l_omuro_big', scale: 3.2, gap: 11, baseY: 0.82, factor: 0.22, alpha: 0.8 },
    mid: { name: 'd_pine', scale: 1.7, gap: 3, baseY: 0.88, factor: 0.5, alpha: 1 },
    clouds: true, ambiance: null, sea: false,
  },
  coast: {
    sky: ['#8fd3ff', '#d8f3ff'], tiles: { top: 't_sand', fill: 't_sand_fill', oneway: 't_wood' },
    far: { name: 'l_lighthouse', scale: 2.4, gap: 13, baseY: 0.66, factor: 0.28, alpha: 0.95 },
    mid: { name: 'l_rockisle', scale: 1.9, gap: 6, baseY: 0.74, factor: 0.5, alpha: 0.9 },
    clouds: true, ambiance: 'bubble', sea: true,
  },
  volcano: {
    sky: ['#cfe9ff', '#fff0d6'], tiles: { top: 't_grass', fill: 't_dirt', oneway: 't_wood' },
    far: { name: 'l_omuro_big', scale: 4.4, gap: 16, baseY: 0.82, factor: 0.18, alpha: 0.95 },
    mid: { name: 'd_bush', scale: 1.6, gap: 4, baseY: 0.88, factor: 0.5, alpha: 0.95 },
    clouds: true, ambiance: null, sea: false,
  },
  port: { // 下田・ペリーロード（石畳の港町）
    sky: ['#9fd8ff', '#eaf6ff'], tiles: { top: 't_stone', fill: 't_stone_fill', oneway: 't_wood' },
    far: { name: 'l_lighthouse', scale: 2.0, gap: 12, baseY: 0.68, factor: 0.28, alpha: 0.9 },
    mid: { name: 'l_rockisle', scale: 1.6, gap: 6, baseY: 0.74, factor: 0.5, alpha: 0.9 },
    clouds: true, ambiance: 'bubble', sea: true,
  },
  town: {
    sky: ['#ffd7a8', '#ffe9c7'], tiles: { top: 't_stone', fill: 't_stone_fill', oneway: 't_wood' },
    far: { name: 'ryokan', scale: 2.2, gap: 7, baseY: 0.8, factor: 0.3, alpha: 0.95 },
    mid: { name: 'l_house_blue', scale: 1.7, gap: 4, baseY: 0.86, factor: 0.55, alpha: 1 },
    clouds: true, ambiance: 'petal', sea: false,
  },
};

class Background {
  constructor(theme, backdrop = null) {
    this.th = THEMES[theme] || THEMES.spring;
    this.backdrop = backdrop;
    this.t = 0; this.clouds = [];
    this._seed();
  }
  _seed() {
    for (let i = 0; i < 14; i++) this.clouds.push({ x: rand(0, 4000), y: rand(40, 260), s: rand(0.7, 1.7), v: rand(6, 16) });
  }
  update(dt) { this.t += dt; for (const c of this.clouds) { c.x -= c.v * dt; if (c.x < -200) c.x += 4400; } }

  render(ctx, cam, W, H) {
    const th = this.th;
    // sky gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    this._backdrop(ctx, cam, W, H);
    // soft sun
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.2, 70, 0, 6.29); ctx.fill(); ctx.restore();
    // drifting clouds (screen-space-ish with slight parallax) — subtler over a
    // painted backdrop so they don't fight its own clouds
    if (th.clouds) {
      ctx.save(); ctx.globalAlpha = this.backdrop ? 0.5 : 0.85;
      for (const c of this.clouds) {
        const sx = (c.x - cam.x * 0.15) % (W + 400); const x = sx < -200 ? sx + W + 400 : sx;
        drawSprite(ctx, 'cloud_plat', x, c.y, { w: 120 * c.s, h: 64 * c.s, ax: 0.5, ay: 0.5, alpha: 0.8 });
      }
      ctx.restore();
    }
    // tiled landmark layers only when there is no painted backdrop — repeating
    // the same motifs (lighthouses, domes) over the artwork read as a glitch
    if (!this.backdrop) {
      this._layer(ctx, cam, W, H, th.far, 1);
      if (th.sea) this._sea(ctx, cam, W, H);
      this._layer(ctx, cam, W, H, th.mid, 1);
    } else if (th.sea) {
      this._sea(ctx, cam, W, H);
    }
  }

  _backdrop(ctx, cam, W, H) {
    if (!this.backdrop) return;
    const img = Assets.get(this.backdrop);
    if (!img || !img.width) return;
    const ratio = img.width / img.height;
    const drawH = Math.max(H, (W * 1.08) / ratio);
    const drawW = drawH * ratio;
    const dpr = Engine.dpr || 1;
    // resample + soften once into an offscreen canvas (the per-frame full-screen
    // high-quality rescale was the single biggest cost on low-GPU tablets);
    // regenerate only when the screen size / dpr changes
    if (!this._bdCache || this._bdW !== drawW || this._bdH !== drawH || this._bdDpr !== dpr) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(drawW * dpr); c.height = Math.ceil(drawH * dpr);
      const cc = c.getContext('2d');
      cc.imageSmoothingEnabled = true; cc.imageSmoothingQuality = 'high';
      cc.globalAlpha = 0.88;
      cc.drawImage(img, 0, 0, c.width, c.height);
      cc.fillStyle = 'rgba(255,255,255,0.08)';
      cc.fillRect(0, 0, c.width, c.height);
      this._bdCache = c; this._bdW = drawW; this._bdH = drawH; this._bdDpr = dpr;
    }
    const maxCamX = Math.max(1, cam.level.w - cam.viewW);
    const progress = clamp(cam.x / maxCamX, 0, 1);
    // round to whole device pixels so the copy hits the fast 1:1 blit path
    const x = Math.round(-(drawW - W) * progress * dpr) / dpr;
    const y = (H - drawH) * 0.38;
    ctx.drawImage(this._bdCache, x, y, drawW, drawH);
  }

  _layer(ctx, cam, W, H, L, alphaScale = 1) {
    if (!L) return;
    const meta = Assets.size(L.name);
    const dw = meta.w * L.scale, dh = meta.h * L.scale;
    const spacing = dw + L.gap * TILE * 0.0 + L.gap * 16;
    const baseY = H * L.baseY;
    const offset = (cam.x * L.factor) % spacing;
    ctx.save(); ctx.globalAlpha = (L.alpha != null ? L.alpha : 1) * alphaScale;
    for (let x = -offset - spacing; x < W + spacing; x += spacing) {
      drawSprite(ctx, L.name, x + dw / 2, baseY, { w: dw, h: dh, ax: 0.5, ay: 1 });
    }
    ctx.restore();
  }

  _sea(ctx, cam, W, H) {
    const y = H * 0.7;
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, 'rgba(86,180,224,0.55)'); g.addColorStop(1, 'rgba(40,120,180,0.75)');
    ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
    ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#eafaff'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const yy = y + 16 + i * 26;
      for (let x = 0; x <= W; x += 24) ctx.lineTo(x, yy + Math.sin((x + this.t * 60 + i * 40) * 0.02) * 4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
class LevelBuilder {
  constructor(cols, theme) {
    this.cols = cols; this.rows = ROWS;
    this.map = new Tilemap(cols, ROWS, THEMES[theme] ? THEMES[theme].tiles : null);
    this.theme = theme;
    this.items = []; this.enemies = []; this.hazards = []; this.springs = [];
    this.checkpoints = []; this.bgDecor = []; this.fgDecor = []; this.npcs = [];
    this.signs = []; this.goal = null; this.boss = null;
    this.start = { x: 2 * TILE, y: (GROUND - 1) * TILE };
  }
  // terrain ---------------------------------------------------------------
  ground(x0, x1, topTy = GROUND) {
    for (let tx = x0; tx < x1; tx++) for (let ty = topTy; ty < this.rows; ty++) this.map.set(tx, ty, TILE_SOLID);
    return this;
  }
  rect(x0, y0, x1, y1) {
    for (let tx = x0; tx < x1; tx++) for (let ty = y0; ty < y1; ty++) this.map.set(tx, ty, TILE_SOLID);
    return this;
  }
  plat(x0, x1, ty, oneway = true) {
    for (let tx = x0; tx < x1; tx++) this.map.set(tx, ty, oneway ? TILE_ONEWAY : TILE_SOLID);
    return this;
  }
  step(x, ty0, ty1) { // a vertical pillar column from ty0 to ty1
    for (let ty = ty0; ty < ty1; ty++) this.map.set(x, ty, TILE_SOLID); return this;
  }
  // objects (tile coords; y is the tile the object's base sits on) ---------
  qbox(tx, ty, contains = 'mikan', count = 1) { this.map.setBlock(tx, ty, new QBlock(tx, ty, contains, count)); return this; }
  crate(tx, ty, contains = null) { this.map.setBlock(tx, ty, new Crate(tx, ty, contains)); return this; }
  coin(tx, ty, kind = 'mikan') { this.items.push(new Collectible(kind, tx * TILE + TILE / 2, ty * TILE + TILE / 2)); return this; }
  coinRow(tx, count, ty, kind = 'mikan') { for (let i = 0; i < count; i++) this.coin(tx + i, ty, kind); return this; }
  coinArc(tx, ty, n = 5, kind = 'mikan') {
    for (let i = 0; i < n; i++) { const dx = i - (n - 1) / 2; this.coin(tx + i, ty - Math.round(2 - dx * dx * 0.35), kind); }
    return this;
  }
  prop(tx, ty, idx) { this.items.push(new Property(tx * TILE + TILE / 2, ty * TILE + TILE / 2, idx)); return this; }
  chest(tx, ty) { this.items.push(new Property(tx * TILE + TILE / 2, ty * TILE - 6, randInt(0, 3))); return this; } // chest = guaranteed property
  enemy(type, tx, ty = GROUND, opts) { this.enemies.push(makeEnemy(type, tx * TILE + TILE / 2, ty * TILE, opts)); return this; }
  flyer(type, tx, tyPx, opts) { this.enemies.push(makeEnemy(type, tx * TILE + TILE / 2, tyPx, opts)); return this; }
  hazard(type, tx, ty = GROUND, opts) { this.hazards.push(new Hazard(type, tx * TILE + TILE / 2, ty * TILE, opts)); return this; }
  spring(tx, ty = GROUND) { this.springs.push(new Spring(tx * TILE + TILE / 2, ty * TILE)); return this; }
  checkpoint(tx, ty = GROUND) { this.checkpoints.push(new Checkpoint(tx * TILE + TILE / 2, ty * TILE)); return this; }
  npc(type, tx, ty = GROUND) { this.npcs.push({ type, x: tx * TILE + TILE / 2, y: ty * TILE, t: rand(0, 6), dir: -1 }); return this; }
  sign(tx, factId, ty = GROUND) { this.signs.push({ x: tx * TILE + TILE / 2, y: ty * TILE, factId, shown: false }); this.decor('d_sign', tx, ty, { scale: 0.9 }); return this; }
  decor(name, tx, ty, opts = {}) {
    const d = { name, x: tx * TILE + (opts.cx != null ? opts.cx : TILE / 2), y: ty * TILE, scale: opts.scale || 1, ax: opts.ax != null ? opts.ax : 0.5, ay: opts.ay != null ? opts.ay : 1, alpha: opts.alpha != null ? opts.alpha : 1 };
    (opts.fg ? this.fgDecor : this.bgDecor).push(d); return this;
  }
  startAt(tx, ty = GROUND) { this.start = { x: tx * TILE, y: (ty - 1) * TILE }; return this; }
  setGoal(tx, type = 'flag', ty = GROUND) { this.goal = { x: tx * TILE + TILE / 2, y: ty * TILE, type }; return this; }
  addBoss(type, tx, hp, ty = GROUND) { this.boss = { type, x: tx * TILE + TILE / 2, y: ty * TILE, hp }; return this; }
}

window.LevelBuilder = LevelBuilder; window.Background = Background;
window.THEMES = THEMES; window.ROWS = ROWS; window.GROUND = GROUND;
