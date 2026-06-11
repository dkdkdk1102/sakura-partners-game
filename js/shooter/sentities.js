/* sentities.js — shooter entities: the rabbit mech (vector-drawn pod with the
   classic rabbit sprite as pilot), player/enemy bullets, Izu-themed foes with
   readable patterns, three bosses, and juicy FX. All collisions are circles.
   The play scene is exposed as window.SG (set by SPlay). */

// scale helper — design height 600
const SS = () => Engine.H / 600;

// ---------------------------------------------------------------- ship ------
class Ship {
  constructor() {
    const s = SS();
    this.x = Engine.W * 0.22; this.y = Engine.H * 0.5;
    this.vx = 0; this.vy = 0;
    this.r = 9 * s;              // forgiving hitbox (visual is bigger)
    this.speed = 420 * s;
    this.power = 1;              // 1..3
    this.hearts = SDIFF.hearts; this.maxHearts = SDIFF.hearts;
    this.bombs = SDIFF.bombs;
    this.iframes = 0; this.shotT = 0; this.muzzle = 0;
    this.t = 0; this.bank = 0;
    this.dead = false; this.deadT = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.dead) { this.deadT += dt; return; }
    if (this.iframes > 0) this.iframes -= dt;
    const s = SS();
    // keyboard
    let dx = 0, dy = 0;
    if (Input.state.left) dx -= 1;
    if (Input.state.right) dx += 1;
    if (Input.state.jump) dy -= 1;  // ↑/W/Space
    if (Input.state.down) dy += 1;
    if (dx || dy) { const m = Math.hypot(dx, dy); this.x += dx / m * this.speed * dt; this.y += dy / m * this.speed * dt; this.vy = dy / m * this.speed; }
    else this.vy = approach(this.vy, 0, 2000 * dt);
    // pointer drag (relative) — applied by SPlay via dragBy()
    this.x = clamp(this.x, 36 * s, Engine.W - 30 * s);
    this.y = clamp(this.y, 40 * s, Engine.H - 46 * s);
    this.bank = lerp(this.bank, clamp(this.vy / this.speed, -1, 1) * 0.22, 1 - Math.pow(0.001, dt));

    // auto-fire (combat only)
    this.shotT -= dt;
    if (this.shotT <= 0 && SG.state !== 'gameover' && SG.state !== 'clear') {
      this.shotT = this.power >= 3 ? 0.105 : 0.125;
      this.fire();
    }
    if (this.muzzle > 0) this.muzzle -= dt;
  }

  dragBy(dx, dy) { if (!this.dead) { this.x += dx; this.y += dy; this.vy = dy * 60; } }

  fire() {
    const s = SS();
    const x = this.x + 30 * s, y = this.y + 2 * s;
    const spd = 760 * s;
    SG.pshots.push(new PShot(x, y, spd, 0));
    if (this.power >= 2) { SG.pshots.push(new PShot(x - 8 * s, y - 12 * s, spd, 0)); SG.pshots.push(new PShot(x - 8 * s, y + 12 * s, spd, 0)); }
    if (this.power >= 3) { SG.pshots.push(new PShot(x - 14 * s, y - 6 * s, spd * 0.92, -150 * s)); SG.pshots.push(new PShot(x - 14 * s, y + 6 * s, spd * 0.92, 150 * s)); }
    this.muzzle = 0.05;
    Audio2.sfx('shot');
  }

  bomb() {
    if (this.bombs <= 0 || this.dead || SG.bombWave > 0) return false;
    if (SG.paused || SG.state === 'clear' || SG.state === 'gameover') return false;
    this.bombs--;
    SG.bombWave = 0.001; SG.bombX = this.x; SG.bombY = this.y;
    this.iframes = Math.max(this.iframes, 1.6);
    GAMECAM_shake(14, 0.5);
    Audio2.sfx('bomb');
    return true;
  }

  hit() {
    if (this.iframes > 0 || this.dead) return false;
    this.hearts--;
    Audio2.sfx('hurt');
    GAMECAM_shake(10, 0.35);
    SG.flash = 0.25;
    SG.fx.burstAt(this.x, this.y, '#ff8aa6', 14);
    if (this.hearts <= 0) { this.die(); return true; }
    this.iframes = 2.2;
    return true;
  }

  die() {
    this.dead = true; this.deadT = 0;
    SG.combo = 0;
    Audio2.sfx('die');
    SG.fx.bigBoom(this.x, this.y);
    GAMECAM_shake(18, 0.7);
  }

  render(ctx) {
    if (this.dead) return;
    const s = SS();
    const a = this.iframes > 0 ? 0.55 : 1;     // steady translucency, no strobe
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.bank);
    ctx.globalAlpha = a;
    const u = 1.05 * s; // unit scale

    // -- thruster flame (animated, additive) --
    const fl = (14 + Math.sin(this.t * 31) * 4 + Math.abs(this.vy) * 0.012) * u;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(-34 * u, 0, 2, -34 * u, 0, fl * 1.6);
    fg.addColorStop(0, 'rgba(255,210,120,0.9)'); fg.addColorStop(1, 'rgba(255,110,40,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(-34 * u, 0, fl * 1.6, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,70,0.95)';
    ctx.beginPath(); ctx.moveTo(-30 * u, -6 * u); ctx.lineTo(-30 * u - fl, 0); ctx.lineTo(-30 * u, 6 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,200,0.95)';
    ctx.beginPath(); ctx.moveTo(-30 * u, -3 * u); ctx.lineTo(-30 * u - fl * 0.55, 0); ctx.lineTo(-30 * u, 3 * u); ctx.closePath(); ctx.fill();
    ctx.restore();

    // -- wings (back-swept, sakura pink trim) --
    ctx.fillStyle = '#d8e4f0'; ctx.strokeStyle = '#3a4a5c'; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.moveTo(-8 * u, -10 * u); ctx.lineTo(-30 * u, -26 * u); ctx.lineTo(-26 * u, -6 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8 * u, 12 * u); ctx.lineTo(-30 * u, 28 * u); ctx.lineTo(-26 * u, 8 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9eb8';
    ctx.beginPath(); ctx.moveTo(-13 * u, -11 * u); ctx.lineTo(-26 * u, -21 * u); ctx.lineTo(-24 * u, -8 * u); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-13 * u, 13 * u); ctx.lineTo(-26 * u, 23 * u); ctx.lineTo(-24 * u, 10 * u); ctx.closePath(); ctx.fill();

    // -- pod body (capsule) --
    const bg = ctx.createLinearGradient(0, -20 * u, 0, 22 * u);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.55, '#e8eef6'); bg.addColorStop(1, '#b8c6d8');
    ctx.fillStyle = bg; ctx.strokeStyle = '#3a4a5c'; ctx.lineWidth = 2.4 * u;
    roundRect(ctx, -32 * u, -14 * u, 64 * u, 32 * u, 16 * u); ctx.fill(); ctx.stroke();
    // belly stripe + rivets
    ctx.fillStyle = '#ff7fa6'; roundRect(ctx, -28 * u, 8 * u, 52 * u, 7 * u, 4 * u); ctx.fill();
    ctx.fillStyle = '#9fb2c6';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc((-18 + i * 14) * u, 2 * u, 1.6 * u, 0, 6.29); ctx.fill(); }

    // -- pilot rabbit (open cockpit) --
    drawSprite(ctx, 'player_00', -2 * u, -8 * u, { w: 30 * u, h: 30 * u, ax: 0.5, ay: 1 });
    // windshield arc
    ctx.strokeStyle = 'rgba(140,200,240,0.95)'; ctx.lineWidth = 3.4 * u;
    ctx.beginPath(); ctx.arc(2 * u, -10 * u, 17 * u, -Math.PI * 0.92, -Math.PI * 0.18); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4 * u;
    ctx.beginPath(); ctx.arc(2 * u, -10 * u, 14.5 * u, -Math.PI * 0.85, -Math.PI * 0.45); ctx.stroke();

    // -- nose cannon --
    ctx.fillStyle = '#5a6a7e'; roundRect(ctx, 26 * u, -4 * u, 14 * u, 8 * u, 3 * u); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(36 * u, -2 * u, 4 * u, 4 * u);
    if (this.muzzle > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const mg = ctx.createRadialGradient(46 * u, 0, 1, 46 * u, 0, 14 * u);
      mg.addColorStop(0, 'rgba(255,255,200,0.95)'); mg.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(46 * u, 0, 14 * u, 0, 6.29); ctx.fill();
      ctx.restore();
    }

    // -- shield ring while invulnerable (steady) --
    if (this.iframes > 0) {
      ctx.strokeStyle = 'rgba(120,220,255,0.55)'; ctx.lineWidth = 2.5 * u;
      ctx.beginPath(); ctx.arc(0, -2 * u, 42 * u, 0, 6.29); ctx.stroke();
    }
    ctx.restore();
  }
}

// camera shake shim (screen-space)
let _shakeT = 0, _shakeDur = 0, _shakeMag = 0;
function GAMECAM_shake(mag, dur) { _shakeMag = mag; _shakeDur = dur; _shakeT = dur; }
function shakeUpdate(dt) { if (_shakeT > 0) _shakeT -= dt; }
function shakeOffset() {
  if (_shakeT <= 0) return [0, 0];
  const m = _shakeMag * (_shakeT / _shakeDur);
  return [rand(-m, m), rand(-m, m)];
}

// ---------------------------------------------------------------- bullets ---
class PShot {
  constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.r = 5 * SS(); this.dead = false; }
  update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; if (this.x > Engine.W + 40) this.dead = true; }
  render(ctx) {
    const s = SS();
    const g = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 10 * s);
    g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.45, 'rgba(255,210,90,0.9)'); g.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(this.x, this.y, 13 * s, 6 * s, 0, 0, 6.29); ctx.fill();
  }
}

class EShot {
  // kind: 'bubble' (sprite) | 'spike' (glow dot) | 'pearl' (white glow)
  constructor(x, y, vx, vy, kind = 'spike', r = 6) {
    this.x = x; this.y = y;
    this.vx = vx * SDIFF.bullet; this.vy = vy * SDIFF.bullet;
    this.kind = kind; this.r = r * SS(); this.t = rand(0, 6); this.dead = false;
  }
  update(dt) {
    this.t += dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const m = 60;
    if (this.x < -m || this.x > Engine.W + m || this.y < -m || this.y > Engine.H + m) this.dead = true;
  }
  render(ctx) {
    const s = SS();
    if (this.kind === 'bubble') {
      drawSprite(ctx, 'bubble_0', this.x, this.y, { w: this.r * 3.4, h: this.r * 3.4, ax: 0.5, ay: 0.5, alpha: 0.95 });
      return;
    }
    const col = this.kind === 'pearl' ? ['rgba(255,255,255,1)', 'rgba(200,230,255,0.85)', 'rgba(140,180,255,0)']
                                      : ['rgba(255,240,240,1)', 'rgba(255,90,120,0.9)', 'rgba(180,30,80,0)'];
    const g = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, this.r * 2.4);
    g.addColorStop(0, col[0]); g.addColorStop(0.4, col[1]); g.addColorStop(1, col[2]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 2.2, 0, 6.29); ctx.fill();
  }
}

// ---------------------------------------------------------------- enemies ---
/* base foe: sprite-driven, hp, score, pattern via update fn. Spawned offscreen
   right (or top), dead when off left or hp<=0. */
class Foe {
  constructor(o) {
    Object.assign(this, {
      x: Engine.W + 60, y: Engine.H / 2, vx: -120, vy: 0, hp: 1, score: 100,
      sprite: 'gull_0', frames: null, fps: 8, size: 52, r: 24, t: rand(0, 6),
      shootT: rand(1, 2.4), dead: false, flash: 0, ground: false,
    }, o);
    this.size *= SS(); this.r *= SS();
    if (this.hp >= 2) this.hp += SDIFF.hpAdd;
    this.x0 = this.x; this.y0 = this.y;
  }
  damage(n, quiet) {
    this.hp -= n; this.flash = 0.08;
    if (this.hp <= 0 && !this.dead) { this.dead = true; SG.onKill(this); }
    else if (!quiet) Audio2.sfx('tink');
  }
  update(dt) {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.ai) this.ai(dt);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.x < -120 || this.y < -160 || this.y > Engine.H + 160) this.dead = true;
  }
  aimAtShip(speed) {
    const sh = SG.ship;
    const dx = sh.x - this.x, dy = sh.y - this.y, d = Math.hypot(dx, dy) || 1;
    return [dx / d * speed, dy / d * speed];
  }
  frame() {
    if (!this.frames) return this.sprite;
    return this.frames[Math.floor(this.t * this.fps) % this.frames.length];
  }
  render(ctx) {
    const name = this.frame();
    const meta = Assets.size(name);
    const w = this.size, h = w * (meta.h / meta.w);
    drawSprite(ctx, name, this.x, this.y, { w, h, ax: 0.5, ay: 0.5, flip: this.flip });
    if (this.flash > 0) { // white hit flash overlay (brief, additive)
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
      drawSprite(ctx, name, this.x, this.y, { w, h, ax: 0.5, ay: 0.5, flip: this.flip });
      ctx.restore();
    }
  }
}

// ---- foe factories (Izu critters as an air force) --------------------------
const FOES = {
  // seagull — sine swooper
  gull(y, opts = {}) {
    const s = SS();
    return new Foe({
      y, vx: -(170 + (opts.spd || 0)) * s, hp: 1, score: 100, size: 56,
      frames: ['gull_0', 'gull_1', 'gull_2'], r: 22,
      amp: (opts.amp != null ? opts.amp : 70) * s, frq: opts.frq || 2.6,
      ai(dt) { this.vy = Math.cos(this.t * this.frq) * this.amp * this.frq; },
    });
  },
  // pink fish — fast dart, slight homing at spawn
  fish(y) {
    const s = SS();
    return new Foe({
      y, vx: -300 * s, hp: 1, score: 80, size: 46, r: 18,
      frames: ['fish_0', 'fish_1', 'fish_2'], fps: 10,
    });
  },
  // jellyfish — slow float, aimed bubble
  jelly(y) {
    const s = SS();
    return new Foe({
      y, vx: -85 * s, hp: 2, score: 150, size: 54, r: 22,
      frames: ['jelly_0', 'jelly_1', 'jelly_2'], fps: 5,
      ai(dt) {
        this.vy = Math.sin(this.t * 1.8) * 40 * s;
        this.shootT -= dt * SDIFF.fire;
        if (this.shootT <= 0 && this.x < Engine.W - 60) {
          this.shootT = rand(2.2, 3.2);
          const [vx, vy] = this.aimAtShip(190 * s);
          SG.eshots.push(new EShot(this.x, this.y + 10, vx, vy, 'bubble', 7));
          Audio2.sfx('blip');
        }
      },
    });
  },
  // urchin mine — drifts; explodes into 6 spikes when destroyed
  mine(y) {
    const s = SS();
    return new Foe({
      y, vx: -110 * s, hp: 2, score: 200, size: 50, r: 22,
      sprite: 'spike_urchin', burst: true,
      ai(dt) { this.vy = Math.sin(this.t * 1.2) * 26 * s; this.spin = this.t * 1.5; },
      render(ctx) {
        drawSprite(ctx, 'spike_urchin', this.x, this.y, { w: this.size, h: this.size, ax: 0.5, ay: 0.5, rot: this.spin || 0 });
        if (this.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; drawSprite(ctx, 'spike_urchin', this.x, this.y, { w: this.size, h: this.size, ax: 0.5, ay: 0.5, rot: this.spin || 0 }); ctx.restore(); }
      },
    });
  },
  // octopus turret — holds at right, lobs 3-spread ink
  octo(y) {
    const s = SS();
    return new Foe({
      y, vx: -60 * s, hp: 5, score: 350, size: 64, r: 26,
      frames: ['octo_0', 'octo_1', 'octo_2', 'octo_3'], fps: 5, flip: true,
      ai(dt) {
        if (this.x < Engine.W * 0.78) this.vx = -26 * s;
        this.shootT -= dt * SDIFF.fire;
        if (this.shootT <= 0) {
          this.shootT = rand(1.7, 2.4);
          const [vx, vy] = this.aimAtShip(210 * s);
          for (const a of [-0.3, 0, 0.3]) {
            const c = Math.cos(a), sn = Math.sin(a);
            SG.eshots.push(new EShot(this.x - 14, this.y, vx * c - vy * sn, vx * sn + vy * c, 'spike', 6));
          }
          Audio2.sfx('ink');
        }
      },
    });
  },
  // onsen ghost — weaves toward ship (stage 3). Fixed draw box: the ghost frames
  // have wildly different aspect ratios and were size-strobing every 0.25s.
  ghost(y) {
    const s = SS();
    return new Foe({
      y, vx: -120 * s, hp: 2, score: 180, size: 52, r: 22,
      frames: ['ghost_1', 'ghost_2'], fps: 4,
      ai(dt) {
        const sh = SG.ship;
        this.vy = approach(this.vy, sign(sh.y - this.y) * 90 * s, 220 * s * dt);
      },
      render(ctx) {
        const name = this.frame();
        drawSprite(ctx, name, this.x, this.y, { w: this.size, h: this.size * 1.05, ax: 0.5, ay: 0.5 });
        if (this.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; drawSprite(ctx, name, this.x, this.y, { w: this.size, h: this.size * 1.05, ax: 0.5, ay: 0.5 }); ctx.restore(); }
      },
    });
  },
  // lantern drone — hangs, drops pearls downward / aimed (stage 3)
  lantern(y) {
    const s = SS();
    return new Foe({
      y, vx: -95 * s, hp: 3, score: 220, size: 46, r: 20,
      sprite: 'prop_lantern',
      ai(dt) {
        this.vy = Math.sin(this.t * 2.2) * 30 * s;
        this.shootT -= dt * SDIFF.fire;
        if (this.shootT <= 0) {
          this.shootT = rand(1.8, 2.6);
          const [vx, vy] = this.aimAtShip(180 * s);
          SG.eshots.push(new EShot(this.x, this.y, vx, vy, 'pearl', 6));
          Audio2.sfx('blip');
        }
      },
    });
  },
  // boss minion — tiny gull
  chick(y, vy) {
    const s = SS();
    return new Foe({
      y, vx: -240 * s, vy: (vy || 0) * s, hp: 1, score: 60, size: 40, r: 16,
      frames: ['gull_0', 'gull_1', 'gull_2'], fps: 10,
    });
  },
};

// ---------------------------------------------------------------- bosses ----
const SBOSS_CFG = {
  octo: {
    name: 'おおダコ提督', sprites: ['octo_0', 'octo_1', 'octo_2', 'octo_3'], fps: 5,
    size: 170, r: 70, hp: 55, flip: true,
  },
  gull: {
    name: 'とっこう隊長・大カモメ', sprites: ['gull_0', 'gull_1', 'gull_2'], fps: 9,
    size: 180, r: 66, hp: 60, flip: false,
  },
  urchin: {
    name: 'ウニ大魔王', sprites: ['boss_urchin_0', 'boss_urchin_1'], fps: 4,
    size: 200, r: 84, hp: 75, flip: false, final: true,
  },
};

class SBoss {
  constructor(type) {
    const c = SBOSS_CFG[type]; this.type = type; this.cfg = c;
    const s = SS();
    this.x = Engine.W + 140; this.y = Engine.H * 0.5;
    this.size = c.size * s; this.r = c.r * s;
    this.hp = Math.round(c.hp * SDIFF.bossHp); this.maxHp = this.hp;
    this.t = 0; this.patT = 0; this.pat = 0; this.intro = true;
    this.dead = false; this.deadT = 0; this.flash = 0;
    this.vx = 0; this.vy = 0;
  }
  damage(n, quiet) {
    if (this.intro || this.dead) return;
    this.hp -= n; this.flash = 0.07;
    if (this.hp <= 0) { this.dead = true; this.deadT = 0; SG.onBossDown(this); }
    else if (!quiet && Math.random() < 0.3) Audio2.sfx('tink');
  }
  rage() { return this.hp / this.maxHp < 0.35; }

  update(dt) {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.dead) {
      this.deadT += dt;
      this.x += 60 * dt; this.y += Math.sin(this.deadT * 9) * 2;
      // one boom per tick (6/s) — not per frame (was a 30/s strobe + sfx buzz)
      const tick = Math.floor(this.deadT * 6);
      if (tick !== this._boomTick) { this._boomTick = tick; SG.fx.boomAt(this.x + rand(-this.r, this.r), this.y + rand(-this.r, this.r), 0.7); }
      return;
    }
    const s = SS();
    if (this.intro) {
      this.x = approach(this.x, Engine.W * 0.78, 160 * s * dt);
      if (this.x <= Engine.W * 0.78 + 1) { this.intro = false; this.patT = 0; }
      return;
    }
    this.patT += dt;
    const sh = SG.ship;
    const M = this[`pat_${this.type}`];
    if (M) M.call(this, dt, s, sh);
  }

  // --- patterns per boss ---
  pat_octo(dt, s, sh) {
    // weave vertically, 3-way ink + occasional aimed burst; rage: 5-way
    this.y = Engine.H * 0.5 + Math.sin(this.t * 0.9) * Engine.H * 0.26;
    this.shoot1 = (this.shoot1 || 0) - dt * SDIFF.fire;
    if (this.shoot1 <= 0) {
      this.shoot1 = this.rage() ? 1.1 : 1.6;
      const [vx, vy] = aimFrom(this.x - this.r * 0.5, this.y, sh, 230 * s);
      const arcs = this.rage() ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.35, 0, 0.35];
      for (const a of arcs) { const c = Math.cos(a), sn = Math.sin(a); SG.eshots.push(new EShot(this.x - this.r * 0.5, this.y, vx * c - vy * sn, vx * sn + vy * c, 'spike', 6)); }
      Audio2.sfx('ink');
    }
    this.shoot2 = (this.shoot2 || 3) - dt * SDIFF.fire;
    if (this.shoot2 <= 0) {
      this.shoot2 = 4.2;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; SG.eshots.push(new EShot(this.x, this.y, Math.cos(a) * 150 * s, Math.sin(a) * 150 * s, 'bubble', 6)); }
      Audio2.sfx('boss');
    }
  }
  pat_gull(dt, s, sh) {
    // figure-8 sweeps + feather fans + summons chicks
    this.y = Engine.H * 0.5 + Math.sin(this.t * 1.5) * Engine.H * 0.3;
    this.x = Engine.W * 0.74 + Math.sin(this.t * 0.75) * Engine.W * 0.13;
    this.shoot1 = (this.shoot1 || 1) - dt * SDIFF.fire;
    if (this.shoot1 <= 0) {
      this.shoot1 = this.rage() ? 0.9 : 1.3;
      const base = Math.atan2(sh.y - this.y, sh.x - this.x);
      const n = this.rage() ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.22;
        SG.eshots.push(new EShot(this.x - 20, this.y, Math.cos(a) * 250 * s, Math.sin(a) * 250 * s, 'pearl', 5));
      }
      Audio2.sfx('blip');
    }
    this.summon = (this.summon || 4) - dt * SDIFF.fire;
    if (this.summon <= 0) { this.summon = this.rage() ? 4.5 : 6; SG.foes.push(FOES.chick(this.y - 60 * s, -40)); SG.foes.push(FOES.chick(this.y + 60 * s, 40)); Audio2.sfx('boss'); }
  }
  pat_urchin(dt, s, sh) {
    // slow drift + spiral rings; rage: faster spiral + aimed spreads
    this.y = Engine.H * 0.5 + Math.sin(this.t * 0.6) * Engine.H * 0.22;
    this.spA = (this.spA || 0) + dt * (this.rage() ? 3.4 : 2.2);
    this.shoot1 = (this.shoot1 || 0.4) - dt * SDIFF.fire;
    if (this.shoot1 <= 0) {
      this.shoot1 = this.rage() ? 0.16 : 0.24;
      const a = this.spA;
      for (const o of [0, Math.PI]) SG.eshots.push(new EShot(this.x, this.y, Math.cos(a + o) * 170 * s, Math.sin(a + o) * 170 * s, 'spike', 5));
    }
    this.shoot2 = (this.shoot2 || 2.5) - dt * SDIFF.fire;
    if (this.shoot2 <= 0) {
      this.shoot2 = this.rage() ? 2.2 : 3.4;
      const [vx, vy] = aimFrom(this.x, this.y, sh, 240 * s);
      for (const a of [-0.18, 0, 0.18]) { const c = Math.cos(a), sn = Math.sin(a); SG.eshots.push(new EShot(this.x, this.y, vx * c - vy * sn, vx * sn + vy * c, 'pearl', 6)); }
      Audio2.sfx('boss');
    }
  }

  render(ctx) {
    const c = this.cfg;
    const name = c.sprites[Math.floor(this.t * c.fps) % c.sprites.length];
    const meta = Assets.size(name);
    const w = this.size, h = w * (meta.h / meta.w);
    const a = this.dead ? clamp(1 - this.deadT / 2.2, 0, 1) : 1;
    drawSprite(ctx, name, this.x, this.y, { w, h, ax: 0.5, ay: 0.5, flip: c.flip, alpha: a, rot: this.dead ? this.deadT * 1.5 : 0 });
    if (this.flash > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
      drawSprite(ctx, name, this.x, this.y, { w, h, ax: 0.5, ay: 0.5, flip: c.flip });
      ctx.restore();
    }
  }
}

function aimFrom(x, y, sh, speed) {
  const dx = sh.x - x, dy = sh.y - y, d = Math.hypot(dx, dy) || 1;
  return [dx / d * speed, dy / d * speed];
}

// ---------------------------------------------------------------- pickups ---
class Pickup {
  // kind: power (onsen) | bomb (manju) | heart | mikan(score)
  constructor(x, y, kind) {
    this.x = x; this.y = y; this.kind = kind; this.t = rand(0, 6);
    this.vx = -70 * SS(); this.r = 18 * SS(); this.dead = false;
    this.sprite = kind === 'power' ? 'onsen_drop' : kind === 'bomb' ? 'manju' : kind === 'heart' ? 'heart' : 'mikan';
  }
  update(dt) {
    this.t += dt; this.x += this.vx * dt;
    this.y += Math.sin(this.t * 3) * 22 * dt;
    // gentle magnet toward the ship
    const sh = SG.ship;
    const d = Math.hypot(sh.x - this.x, sh.y - this.y);
    if (d < 150 * SS()) { this.x += (sh.x - this.x) * 3.4 * dt; this.y += (sh.y - this.y) * 3.4 * dt; }
    if (this.x < -40) this.dead = true;
  }
  render(ctx) {
    const s = 36 * SS() + Math.sin(this.t * 4) * 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, 26 * SS());
    g.addColorStop(0, 'rgba(255,255,210,0.5)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, 26 * SS(), 0, 6.29); ctx.fill();
    ctx.restore();
    drawSprite(ctx, this.sprite, this.x, this.y, { w: s, h: s, ax: 0.5, ay: 0.5 });
  }
}

// ---------------------------------------------------------------- FX --------
class SFX2 {
  constructor() { this.parts = []; this.texts = []; }
  boomAt(x, y, scale = 1) {
    Audio2.sfx('boom');
    for (let i = 0; i < 10 * scale; i++) {
      const a = rand(0, 6.29), sp = rand(60, 320) * scale;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(0.25, 0.6), r: rand(3, 7) * scale * SS(), col: pick(['#ffd84a', '#ff9a3c', '#ff6a5a', '#fff2c0']) });
    }
    this.parts.push({ x, y, vx: 0, vy: 0, t: 0, life: 0.3, ring: true, r: 10 * SS(), grow: 220 * scale * SS(), col: 'rgba(255,230,150,0.9)' });
  }
  bigBoom(x, y) { for (let i = 0; i < 3; i++) setTimeout(() => this.boomAt(x + rand(-30, 30), y + rand(-30, 30), 1.4), i * 120); this.boomAt(x, y, 1.8); }
  burstAt(x, y, col, n = 10) {
    for (let i = 0; i < n; i++) { const a = rand(0, 6.29), sp = rand(80, 260); this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(0.3, 0.5), r: rand(2.5, 5) * SS(), col }); }
  }
  text(x, y, str, col) { this.texts.push({ x, y, str, col, t: 0, life: 0.8 }); }
  update(dt) {
    for (const p of this.parts) { p.t += dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.vy != null && !p.ring) p.vy += 300 * dt; }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const t of this.texts) { t.t += dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter((t) => t.t < t.life);
  }
  render(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      const k = 1 - p.t / p.life;
      if (p.ring) {
        ctx.strokeStyle = p.col; ctx.globalAlpha = k; ctx.lineWidth = 3 * SS();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - k) * p.grow, 0, 6.29); ctx.stroke(); ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.col; ctx.globalAlpha = k;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k + 1, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    for (const t of this.texts) {
      const a = 1 - t.t / t.life;
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.font = `800 ${18 * SS()}px ${FONT}`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,20,40,0.8)'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.col || '#fff'; ctx.fillText(t.str, t.x, t.y);
      ctx.restore();
    }
  }
}

window.Ship = Ship; window.PShot = PShot; window.EShot = EShot;
window.Foe = Foe; window.FOES = FOES; window.SBoss = SBoss; window.SBOSS_CFG = SBOSS_CFG;
window.Pickup = Pickup; window.SFX2 = SFX2; window.SS = SS;
window.GAMECAM_shake = GAMECAM_shake; window.shakeUpdate = shakeUpdate; window.shakeOffset = shakeOffset;
