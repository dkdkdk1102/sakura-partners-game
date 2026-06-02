/* particles.js — lightweight visual FX: sprite puffs (dust/sparkle/petal/burst),
   and floating score text. The Particles container is owned by the Game scene. */

class Particle {
  constructor(o) {
    this.x = o.x; this.y = o.y; this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.life = o.life || 0.5; this.t = 0;
    this.sprite = o.sprite; this.size = o.size || 28; this.endSize = o.endSize != null ? o.endSize : this.size;
    this.grav = o.grav || 0; this.rot = o.rot || 0; this.vr = o.vr || 0;
    this.fadeIn = o.fadeIn || 0; this.drag = o.drag != null ? o.drag : 1;
    this.alpha0 = o.alpha != null ? o.alpha : 1; // peak opacity (softer puffs)
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.life) { this.dead = true; return; }
    this.vy += this.grav * dt;
    this.vx *= Math.pow(this.drag, dt * 60 / 60);
    this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.vr * dt;
  }
  render(ctx) {
    const p = this.t / this.life;
    let a = 1 - p;
    if (this.fadeIn > 0 && this.t < this.fadeIn) a = this.t / this.fadeIn;
    const s = lerp(this.size, this.endSize, p);
    if (this.sprite) drawSprite(ctx, this.sprite, this.x, this.y, { w: s, h: s, ax: 0.5, ay: 0.5, alpha: a * this.alpha0, rot: this.rot });
  }
}

class FloatText {
  constructor(x, y, text, color) {
    this.x = x; this.y = y; this.text = text; this.color = color || '#fff';
    this.t = 0; this.life = 0.9; this.dead = false;
  }
  update(dt) { this.t += dt; this.y -= 36 * dt; if (this.t >= this.life) this.dead = true; }
  render(ctx, cam) {
    const a = 1 - this.t / this.life;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `800 26px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(40,30,20,0.85)';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class Particles {
  constructor() { this.items = []; this.texts = []; }
  add(p) { if (this.items.length > 400) this.items.shift(); this.items.push(p); } // backstop cap
  text(x, y, t, c) { this.texts.push(new FloatText(x, y, t, c)); }

  dust(x, y, n = 3) {
    for (let i = 0; i < n; i++) this.add(new Particle({
      x: x + rand(-8, 8), y: y - 4, vx: rand(-60, 60), vy: rand(-40, -80),
      grav: 240, sprite: 'fx_dust', size: rand(18, 28), endSize: rand(32, 44), life: rand(0.3, 0.5), alpha: 0.55,
    }));
  }
  landDust(x, y) {
    for (let i = 0; i < 3; i++) this.add(new Particle({
      x: x + rand(-12, 12), y: y - 2, vx: rand(-110, 110), vy: rand(-20, -55),
      grav: 200, sprite: 'fx_dust', size: rand(16, 26), endSize: rand(30, 42), life: rand(0.25, 0.42), alpha: 0.5,
    }));
  }
  sparkle(x, y, sprite = 'fx_sparkle', n = 6) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 160);
      this.add(new Particle({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, grav: 120,
        sprite, size: rand(16, 30), endSize: 4, life: rand(0.4, 0.7), vr: rand(-6, 6),
      }));
    }
  }
  burst(x, y) {
    this.add(new Particle({ x, y, sprite: 'fx_burst', size: 30, endSize: 96, life: 0.32, fadeIn: 0.04 }));
    this.sparkle(x, y, 'fx_star', 8);
  }
  splash(x, y) {
    this.add(new Particle({ x, y, sprite: 'fx_splash', size: 30, endSize: 70, life: 0.4 }));
    for (let i = 0; i < 6; i++) this.add(new Particle({
      x, y, vx: rand(-120, 120), vy: rand(-260, -120), grav: 700,
      sprite: 'fx_bubble', size: rand(10, 20), endSize: 6, life: rand(0.4, 0.7),
    }));
  }
  petal(x, y) {
    this.add(new Particle({
      x, y, vx: rand(-30, 10), vy: rand(20, 55), sprite: pick(['fx_petal0', 'fx_petal1', 'fx_petal2', 'fx_petal3']),
      size: rand(16, 26), endSize: rand(16, 26), life: rand(3.5, 6), vr: rand(-3, 3), grav: 0, drag: 1,
    }));
  }
  poof(x, y) {
    for (let i = 0; i < 7; i++) this.add(new Particle({
      x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-90, 90), vy: rand(-90, 40),
      grav: 120, sprite: 'fx_dust', size: rand(24, 40), endSize: rand(44, 64), life: rand(0.3, 0.55),
    }));
  }

  update(dt) {
    for (const p of this.items) p.update(dt);
    for (const t of this.texts) t.update(dt);
    this.items = this.items.filter((p) => !p.dead);
    this.texts = this.texts.filter((t) => !t.dead);
  }
  render(ctx) { for (const p of this.items) p.render(ctx); }
  renderText(ctx) { for (const t of this.texts) t.render(ctx); }
}

window.Particle = Particle; window.Particles = Particles; window.FloatText = FloatText;
