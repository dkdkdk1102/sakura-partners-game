/* enemies.js — Izu critters with simple, readable AI. Stompable ones squish when
   the player lands on their head and bounce the player; spiky ones (urchin, coral,
   chestnut) and floaters that "sting" hurt on any contact. Hazards are static or
   periodic dangers. makeEnemy(type,...) is the factory levels use. */

class Enemy extends Entity {
  constructor(x, y, w, h, cfg) {
    super(x - w / 2, y - h, w, h); // spawn given foot-center (x = center, y = ground)
    Object.assign(this, {
      stompable: true, spiky: false, score: 200, floats: false,
      spriteH: h + 16, koSprite: null, defeatBounce: true,
    }, cfg);
    this.defeated = false; this.defeatT = 0; this.dir = cfg && cfg.dir ? cfg.dir : -1;
    this.facing = this.dir; this.spawnX = x; this.t = rand(0, 6.28);
    this.gravity = 2400;
  }
  isHazard() { return this.spiky; }

  // patrol horizontally, turn at walls and (optionally) ledges
  walk(dt, map, speed, edgeTurn = true) {
    this.vx = this.dir * speed;
    if (this.hitWall) this.dir *= -1;
    if (edgeTurn && this.onGround) {
      const aheadX = this.dir > 0 ? this.right + 2 : this.x - 2;
      const tx = Math.floor(aheadX / TILE), ty = Math.floor((this.bottom + 4) / TILE);
      if (!map.isSolid(tx, ty) && !map.isOneWay(tx, ty)) this.dir *= -1;
    }
    this.facing = this.dir;
  }

  update(dt, map) {
    this.t += dt;
    if (this.defeated) { this._defeatUpdate(dt, map); return; }
    if (this.ai) this.ai(dt, map);
    if (!this.floats) { this.applyGravity(dt); this.moveAndCollide(map, dt); }
    else { this.x += this.vx * dt; this.y += this.vy * dt; }
    if (this.anim) this.anim.update(dt);
  }

  _defeatUpdate(dt, map) {
    this.defeatT += dt;
    this.vy += 1800 * dt; this.y += this.vy * dt; this.x += this.vx * dt;
    this.spin = (this.spin || 0) + dt * 8;
    if (this.defeatT > 1.1) this.remove = true;
  }

  defeat(byStomp) {
    if (this.defeated) return;
    this.defeated = true; this.defeatT = 0; this.vy = -240; this.vx = rand(-60, 60);
    GAME.addScore(this.score, this.cx, this.y);
    GAME.particles.poof(this.cx, this.cy);
    if (this.koSprite) GAME.particles.sparkle(this.cx, this.cy, 'fx_sparkle', 4);
    Audio2.sfx('stomp');
  }

  render(ctx) {
    const name = this.koSprite && this.defeated ? this.koSprite : (this.anim ? this.anim.frame() : this.sprite);
    if (!name) return;
    const meta = Assets.size(name);
    const h = this.spriteH; const w = h * (meta.w / meta.h);
    const rot = this.defeated && !this.koSprite ? (this.spin || 0) : 0;
    drawSprite(ctx, name, this.cx, this.bottom + 3, { w, h, flip: this.facing > 0, ax: 0.5, ay: 1, rot, alpha: this.defeated ? clamp(1 - this.defeatT, 0.2, 1) : 1 });
  }
}

// ---- ground walkers --------------------------------------------------------
function crab(x, y) {
  const e = new Enemy(x, y, 48, 34, { score: 200, spriteH: 46, koSprite: null });
  e.anim = new Animator({ move: { frames: ['crab_0', 'crab_1', 'crab_2', 'crab_3'], fps: 8 } }); e.anim.play('move');
  e.ai = (dt, map) => e.walk(dt, map, 72);
  return e;
}
function snail(x, y) {
  const e = new Enemy(x, y, 46, 36, { score: 150, spriteH: 48, koSprite: 'snail_ko' });
  e.anim = new Animator({ move: { frames: ['snail_0', 'snail_1', 'snail_2', 'snail_3'], fps: 5 } }); e.anim.play('move');
  e.ai = (dt, map) => e.walk(dt, map, 34);
  return e;
}
function tanuki(x, y) {
  const e = new Enemy(x, y, 44, 50, { score: 250, spriteH: 60, koSprite: 'tanuki_ko' });
  e.anim = new Animator({ move: { frames: ['tanuki_stand', 'tanuki_run'], fps: 7 } }); e.anim.play('move');
  e.ai = (dt, map) => e.walk(dt, map, 92);
  return e;
}
function boar(x, y) {
  const e = new Enemy(x, y, 58, 44, { score: 300, spriteH: 54 });
  e.anim = new Animator({ move: { frames: ['boar_0', 'boar_1', 'boar_2'], fps: 9 } }); e.anim.play('move');
  e.charging = false;
  e.ai = (dt, map) => {
    const p = GAME.player;
    const near = p && Math.abs(p.cy - e.cy) < TILE * 1.4 && Math.abs(p.cx - e.cx) < TILE * 6;
    if (near && !e.charging) { e.charging = true; e.dir = sign(p.cx - e.cx) || e.dir; }
    const sp = e.charging ? 230 : 70;
    e.walk(dt, map, sp);
    if (e.charging && e.onGround && Math.random() < 0.3) GAME.particles.dust(e.cx - e.dir * 20, e.bottom);
    e.anim.clips.move.fps = e.charging ? 16 : 8;
  };
  return e;
}
function urchin(x, y) {
  const e = new Enemy(x, y, 42, 40, { score: 0, stompable: false, spiky: true, spriteH: 50 });
  e.anim = new Animator({ move: { frames: ['urchin_0', 'urchin_1', 'urchin_2', 'urchin_3'], fps: 7 } }); e.anim.play('move');
  e.ai = (dt, map) => e.walk(dt, map, 46);
  return e;
}

// ---- flyers / floaters -----------------------------------------------------
function gull(x, y, opts = {}) {
  const e = new Enemy(x, y, 50, 34, { score: 200, floats: true, spriteH: 40 });
  e.baseY = e.y; e.amp = opts.amp || 46; e.speed = opts.speed || 90; e.dir = opts.dir || -1;
  e.anim = new Animator({ move: { frames: ['gull_0', 'gull_1', 'gull_2'], fps: 9 } }); e.anim.play('move');
  e.range = opts.range || TILE * 4; e.cxBase = x;
  e.ai = () => {
    e.vx = e.dir * e.speed;
    if (e.cx < e.cxBase - e.range || e.cx > e.cxBase + e.range) e.dir *= -1;
    e.facing = e.dir; e.vy = 0; e.y = e.baseY + Math.sin(e.t * 3) * e.amp;
  };
  return e;
}
function jelly(x, y, opts = {}) {
  const e = new Enemy(x, y, 40, 46, { score: 150, floats: true, spiky: true, stompable: false, spriteH: 56 });
  e.baseY = e.y; e.amp = opts.amp || 60;
  e.anim = new Animator({ move: { frames: ['jelly_0', 'jelly_1', 'jelly_2'], fps: 4 } }); e.anim.play('move');
  e.ai = () => { e.vx = 0; e.y = e.baseY + Math.sin(e.t * 1.8) * e.amp; };
  return e;
}
function cloud(x, y, opts = {}) {
  const e = new Enemy(x, y, 50, 38, { score: 150, floats: true, spriteH: 46 });
  e.baseY = e.y; e.dir = opts.dir || -1; e.speed = opts.speed || 50; e.cxBase = x; e.range = opts.range || TILE * 3;
  e.anim = new Animator({ move: { frames: ['cloud_0', 'cloud_1'], fps: 3 } }); e.anim.play('move');
  e.ai = () => { e.vx = e.dir * e.speed; if (e.cx < e.cxBase - e.range || e.cx > e.cxBase + e.range) e.dir *= -1; e.facing = e.dir; e.y = e.baseY + Math.sin(e.t * 2) * 14; };
  return e;
}
function ghost(x, y) {
  const e = new Enemy(x, y, 42, 46, { score: 0, floats: true, stompable: false, spiky: true, spriteH: 56 });
  e.anim = new Animator({ move: { frames: ['ghost_0', 'ghost_1', 'ghost_2'], fps: 4 } }); e.anim.play('move');
  e.ai = () => {
    const p = GAME.player; if (!p) return;
    const dx = p.cx - e.cx, dy = p.cy - e.cy, d = Math.hypot(dx, dy) || 1;
    const sp = 46;
    e.vx = (dx / d) * sp; e.vy = (dy / d) * sp; e.facing = sign(dx) || e.facing;
  };
  return e;
}
function octopus(x, y) {
  const e = new Enemy(x, y, 46, 42, { score: 300, spriteH: 50 });
  e.anim = new Animator({ move: { frames: ['octo_0', 'octo_1', 'octo_2', 'octo_3'], fps: 5 } }); e.anim.play('move');
  e.cool = rand(1.2, 2.2);
  e.ai = (dt) => {
    e.vx = 0; e.cool -= dt;
    const p = GAME.player;
    if (p) e.facing = sign(p.cx - e.cx) || e.facing;
    if (e.cool <= 0 && p && Math.abs(p.cx - e.cx) < TILE * 7 && Math.abs(p.cy - e.cy) < TILE * 3) {
      e.cool = rand(1.8, 2.8);
      GAME.spawnProjectile('ink', e.cx, e.cy - 6, e.facing * 240, -120);
      Audio2.sfx('ink');
    }
  };
  return e;
}
function serpent(x, y, opts = {}) {
  const e = new Enemy(x, y, 70, 60, { score: 0, floats: true, stompable: false, spiky: true, spriteH: 82 });
  e.baseY = e.y; e.dir = opts.dir || -1; e.speed = opts.speed || 60; e.cxBase = x; e.range = opts.range || TILE * 4;
  e.anim = new Animator({ move: { frames: ['serpent_0', 'serpent_1', 'serpent_2', 'serpent_3'], fps: 5 } }); e.anim.play('move');
  e.ai = () => { e.vx = e.dir * e.speed; if (e.cx < e.cxBase - e.range || e.cx > e.cxBase + e.range) e.dir *= -1; e.facing = e.dir; e.y = e.baseY + Math.sin(e.t * 1.5) * 26; };
  return e;
}

// ---- hazards (static / periodic) -------------------------------------------
class Hazard {
  constructor(type, x, y, opts = {}) {
    this.type = type; this.x = x; this.y = y; this.opts = opts; this.t = rand(0, 6);
    this.w = opts.w || 44; this.h = opts.h || 40; this.remove = false; this.active = true;
    if (type === 'geyser') { this.period = opts.period || 2.4; this.up = opts.up || TILE * 2.6; this.phase = opts.phase || 0; }
    if (type === 'fallrock') { this.fell = false; this.vy = 0; this.startY = y; }
  }
  // returns the current danger AABB (or null if currently safe)
  hitbox() {
    if (this.type === 'geyser') {
      const ph = (this.t + this.phase) % this.period;
      const on = ph < this.period * 0.5;
      if (!on) return null;
      const grow = Math.sin((ph / (this.period * 0.5)) * Math.PI);
      const hh = this.up * grow;
      return { x: this.x - 20, y: this.y - hh, w: 40, h: hh };
    }
    if (this.type === 'fallrock' && !this.fell) return null;
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  }
  update(dt, map) {
    this.t += dt;
    if (this.type === 'fallrock') {
      const p = GAME.player;
      if (!this.fell && p && Math.abs(p.cx - this.x) < TILE * 0.7 && p.cy > this.y) this.fell = true;
      if (this.fell) {
        this.vy = Math.min(this.vy + 2200 * dt, 1600); this.y += this.vy * dt;
        const tx = Math.floor(this.x / TILE), ty = Math.floor((this.y + this.h / 2) / TILE);
        if (map.isSolid(tx, ty)) { GAME.particles.poof(this.x, this.y); GAME.cam.shake(6, 0.2); Audio2.sfx('bump'); this.remove = true; }
      }
    }
  }
  render(ctx) {
    if (this.type === 'geyser') {
      drawSprite(ctx, 'd_step', this.x, this.y, { w: 56, h: 22, ax: 0.5, ay: 0.5, alpha: 0.9 });
      const hb = this.hitbox();
      if (hb) drawSprite(ctx, 'geyser', this.x, this.y + 6, { w: 56, h: hb.h + 30, ax: 0.5, ay: 1, alpha: 0.92 });
    } else if (this.type === 'coral') {
      drawSprite(ctx, 'coral', this.x, this.y, { w: this.w + 10, h: this.h + 14, ax: 0.5, ay: 1 });
    } else if (this.type === 'chestnut') {
      drawSprite(ctx, 'chestnut', this.x, this.y, { w: this.w + 8, h: this.h + 6, ax: 0.5, ay: 1, rot: Math.sin(this.t * 4) * 0.05 });
    } else if (this.type === 'spike') {
      drawSprite(ctx, 'spike_urchin', this.x, this.y, { w: this.w + 6, h: this.h + 6, ax: 0.5, ay: 1 });
    } else if (this.type === 'fallrock') {
      drawSprite(ctx, 'fallrock', this.x, this.y, { w: this.w, h: this.h, ax: 0.5, ay: 0.5 });
    }
  }
}

const ENEMY_FACTORY = { crab, snail, tanuki, boar, urchin, gull, jelly, cloud, ghost, octopus, serpent };
function makeEnemy(type, x, y, opts) {
  const f = ENEMY_FACTORY[type];
  return f ? f(x, y, opts) : crab(x, y);
}

window.Enemy = Enemy; window.Hazard = Hazard; window.makeEnemy = makeEnemy;
