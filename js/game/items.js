/* items.js — collectibles, interactive blocks, springs, checkpoints, goal.
   Collectibles encapsulate their own effect via collect(); tile-registered
   blocks (QBlock/Crate) react to a head-bump from below. Property pickups feed
   the ending gallery the real-estate office wanted. */

// ---- collectibles ----------------------------------------------------------
const COLLECT = {
  mikan:    { sprite: 'mikan', score: 100, sfx: 'mikan', kind: 'coin' },
  onsen:    { sprite: 'onsen_drop', score: 50, sfx: 'coin', kind: 'heal' },
  gem:      { sprite: 'gem', score: 1000, sfx: 'power', kind: 'score' },
  heart:    { sprite: 'heart', score: 0, sfx: 'power', kind: 'heart' },
  shell:    { sprite: 'shell', score: 300, sfx: 'coin', kind: 'score' },
  pearl:    { sprite: 'pearl', score: 500, sfx: 'coin', kind: 'score' },
  manju:    { sprite: 'manju', score: 200, sfx: 'mikan', kind: 'score' },
  kinme:    { sprite: 'kinme', score: 500, sfx: 'coin', kind: 'score' },
};

class Collectible {
  constructor(kind, x, y, opts = {}) {
    this.def = COLLECT[kind] || COLLECT.mikan;
    this.kind = kind;
    this.x = x; this.y = y;               // center
    const m = Assets.size(this.def.sprite);
    this.h = opts.h || 40; this.w = this.h * (m.w / m.h);
    this.baseY = y; this.t = rand(0, 6.28);
    this.collected = false; this.remove = false;
    this.vx = opts.vx || 0; this.vy = opts.vy || 0; this.physics = !!opts.physics;
    this.bob = opts.bob !== false;
  }
  get left() { return this.x - this.w / 2; }
  get top() { return this.y - this.h / 2; }
  aabb() { return { x: this.left, y: this.top, w: this.w, h: this.h }; }
  update(dt, map) {
    this.t += dt;
    if (this.physics) {
      this.vy = Math.min(this.vy + 2200 * dt, 1400);
      this.x += this.vx * dt; this.y += this.vy * dt;
      const ty = Math.floor((this.y + this.h / 2) / TILE), tx = Math.floor(this.x / TILE);
      if (map.isSolid(tx, ty) && this.vy > 0) { this.y = ty * TILE - this.h / 2; this.vy = 0; this.vx *= 0.7; this.physics = Math.abs(this.vx) > 4; this.baseY = this.y; }
    }
  }
  render(ctx) {
    const yoff = this.bob && !this.physics ? Math.sin(this.t * 3) * 5 : 0;
    drawSprite(ctx, this.def.sprite, this.x, this.y + yoff, { w: this.w, h: this.h, ax: 0.5, ay: 0.5 });
  }
  collect(player) {
    if (this.collected) return;
    this.collected = true; this.remove = true;
    const d = this.def;
    if (d.score) GAME.addScore(d.score, this.x, this.y - 20);
    if (d.kind === 'coin') GAME.addMikan(1);
    else if (d.kind === 'heal') GAME.healHeart();
    else if (d.kind === 'heart') GAME.addHeart();
    GAME.particles.sparkle(this.x, this.y, 'fx_star', 6);
    Audio2.sfx(d.sfx);
  }
}

// ---- property pickup (counts toward the ending gallery) ---------------------
const PROPERTIES = [
  { sprite: 'house_blue', name: '海が見える別荘' },
  { sprite: 'house_trad', name: '古民家リノベ住宅' },
  { sprite: 'house_western', name: '高原の洋館' },
  { sprite: 'ryokan', name: '温泉付き旅館物件' },
];

class Property {
  constructor(x, y, idx) {
    this.idx = idx != null ? idx : randInt(0, PROPERTIES.length - 1);
    this.def = PROPERTIES[this.idx % PROPERTIES.length];
    this.x = x; this.y = y; this.t = rand(0, 6);
    this.h = 64; const m = Assets.size(this.def.sprite); this.w = this.h * (m.w / m.h);
    this.remove = false;
  }
  get left() { return this.x - this.w / 2; } get top() { return this.y - this.h / 2; }
  aabb() { return { x: this.left, y: this.top, w: this.w, h: this.h }; }
  update(dt) { this.t += dt; }
  render(ctx) {
    const y = this.y + Math.sin(this.t * 2.2) * 4;
    // glow ring
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(this.t * 4) * 0.18;
    drawSprite(ctx, 'fx_star', this.x, y - this.h * 0.1, { w: this.w * 1.5, h: this.w * 1.5, ax: 0.5, ay: 0.5, alpha: 0.35 });
    ctx.restore();
    drawSprite(ctx, this.def.sprite, this.x, y + this.h / 2, { w: this.w, h: this.h, ax: 0.5, ay: 1 });
  }
  collect() {
    if (this.remove) return;
    this.remove = true;
    GAME.addProperty(this.def);
    GAME.addScore(2000, this.x, this.y - 40);
    GAME.particles.burst(this.x, this.y);
    GAME.particles.text(this.x, this.y - 50, '物件GET!', '#ffd84a');
    Audio2.sfx('house');
  }
}

// ---- interactive blocks (registered in the tilemap) -------------------------
class QBlock {
  constructor(tx, ty, contains = 'mikan', count = 1) {
    this.tx = tx; this.ty = ty; this.contains = contains; this.count = count;
    this.x = tx * TILE; this.y = ty * TILE;
    this.used = false; this.bounce = 0; this.sprite = contains === 'mikan' ? 'qbox_mikan' : 'qbox_onsen';
  }
  update(dt) { if (this.bounce > 0) this.bounce = Math.max(0, this.bounce - dt * 4); }
  bumpFromBelow() {
    if (this.used) { Audio2.sfx('bump'); return; }
    this.bounce = 1;
    this.count--;
    const cx = this.x + TILE / 2, cy = this.y - 6;
    if (this.contains === 'property') {
      GAME.spawnProperty(cx, this.y - TILE * 0.6);
    } else {
      const c = new Collectible(this.contains, cx, this.y - TILE * 0.5, { physics: false });
      c.vy = -260; c.physics = true; c.baseY = c.y;
      GAME.items.push(c);
      GAME.particles.sparkle(cx, cy, 'fx_sparkle', 4);
      Audio2.sfx('coin');
    }
    if (this.count <= 0) this.used = true;
  }
  render(ctx) {
    const off = Math.sin(this.bounce * Math.PI) * 12;
    const s = this.used ? 'brick' : this.sprite;
    drawSprite(ctx, s, this.x, this.y - off, { w: TILE, h: TILE, ax: 0, ay: 0, alpha: this.used ? 0.95 : 1 });
  }
}

class Crate {
  constructor(tx, ty, contains) {
    this.tx = tx; this.ty = ty; this.x = tx * TILE; this.y = ty * TILE;
    this.contains = contains || null; this.broken = false; this.bounce = 0;
  }
  update(dt) { if (this.bounce > 0) this.bounce = Math.max(0, this.bounce - dt * 4); }
  bumpFromBelow() {
    this.bounce = 1;
    GAME.map.clearCell(this.tx, this.ty);
    GAME.particles.poof(this.x + TILE / 2, this.y + TILE / 2);
    Audio2.sfx('stomp');
    if (this.contains) {
      const c = new Collectible(this.contains, this.x + TILE / 2, this.y, { physics: true });
      c.vy = -300; GAME.items.push(c);
    } else {
      GAME.addScore(50, this.x + TILE / 2, this.y);
    }
    this.broken = true; this.remove = true;
  }
  render(ctx) {
    if (this.broken) return;
    const off = Math.sin(this.bounce * Math.PI) * 6;
    drawSprite(ctx, 'crate', this.x, this.y - off, { w: TILE, h: TILE, ax: 0, ay: 0 });
  }
}

// ---- spring (bounce pad) ----------------------------------------------------
class Spring {
  constructor(x, y) { this.x = x; this.y = y; this.w = 56; this.h = 40; this.t = 0; this.fire = 0; }
  get left() { return this.x - this.w / 2; } get top() { return this.y - this.h; }
  aabb() { return { x: this.left, y: this.top, w: this.w, h: this.h }; }
  update(dt) { if (this.fire > 0) this.fire = Math.max(0, this.fire - dt * 5); }
  trigger(player) {
    // jumping=false so the variable-jump cut in Player.update doesn't shave the launch
    this.fire = 1; player.vy = -player.jumpVel * 1.42; player.jumping = false; player.onGround = false;
    Audio2.sfx('spring'); GAME.particles.dust(this.x, this.y);
  }
  render(ctx) {
    const sq = Math.sin(this.fire * Math.PI);
    drawSprite(ctx, 'spring', this.x, this.y, { w: this.w, h: this.h * (1 - sq * 0.35), ax: 0.5, ay: 1 });
  }
}

// ---- checkpoint flag --------------------------------------------------------
class Checkpoint {
  constructor(x, groundY) { this.x = x; this.y = groundY; this.active = false; this.t = 0; }
  get left() { return this.x - 24; } get top() { return this.y - 120; }
  aabb() { return { x: this.left, y: this.top, w: 48, h: 120 }; }
  update(dt) { if (this.active) this.t += dt; }
  trigger(player) {
    if (this.active) return;
    this.active = true;
    GAME.setCheckpoint(this.x, this.y);
    GAME.particles.sparkle(this.x, this.y - 90, 'fx_star', 10);
    GAME.particles.text(this.x, this.y - 120, 'チェックポイント', '#7fe0a0');
    Audio2.sfx('confirm');
  }
  render(ctx) {
    const wave = this.active ? Math.sin(this.t * 6) * 0.12 : 0;
    drawSprite(ctx, 'd_marker', this.x, this.y, { w: 34, h: 90, ax: 0.5, ay: 1, alpha: 0.9 });
    drawSprite(ctx, 'flag', this.x + 6, this.y - 70, { w: 46, h: 54, ax: 0.2, ay: 0.5, rot: wave, alpha: this.active ? 1 : 0.55 });
  }
}

// ---- goal (stage exit) ------------------------------------------------------
class Goal {
  constructor(x, groundY, type = 'flag') {
    this.x = x; this.y = groundY; this.type = type; this.t = 0; this.reached = false; this.spawnAcc = 0;
  }
  get left() { return this.x - 46; } get top() { return this.y - 200; }
  aabb() { return { x: this.left, y: this.top, w: 92, h: 200 }; }
  update(dt) {
    this.t += dt; this.spawnAcc += dt;
    // dt-based sparkle rate (independent of frame rate, bounded)
    if (this.spawnAcc >= 0.11) {
      this.spawnAcc = 0;
      GAME.particles.add(new Particle({ x: this.x + rand(-40, 40), y: this.y - rand(20, 180), sprite: 'fx_sparkle', size: rand(14, 22), endSize: 4, life: 0.6 }));
    }
  }
  render(ctx) {
    const wave = Math.sin(this.t * 4) * 0.1;
    if (this.type === 'sakura_partners') {
      drawSprite(ctx, 'goal_sakura_partners', this.x, this.y, { w: 220, h: 150, ax: 0.5, ay: 1 });
      return;
    }
    if (this.type === 'torii' || this.type === 'gate') {
      drawSprite(ctx, 'l_gate', this.x, this.y, { w: 150, h: 150, ax: 0.5, ay: 1 });
    } else {
      // noren banner backdrop + tall onsen flag pole
      drawSprite(ctx, 'l_noren', this.x, this.y, { w: 120, h: 150, ax: 0.5, ay: 1, alpha: 0.96 });
    }
    drawSprite(ctx, 'flag', this.x + 44, this.y - 150, { w: 50, h: 60, ax: 0.2, ay: 0.5, rot: wave });
  }
}

window.Collectible = Collectible; window.Property = Property; window.PROPERTIES = PROPERTIES;
window.QBlock = QBlock; window.Crate = Crate; window.Spring = Spring; window.Checkpoint = Checkpoint;
window.Goal = Goal;
