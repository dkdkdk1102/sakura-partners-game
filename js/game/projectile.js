/* projectile.js — hostile projectiles (octopus ink, boss bubbles). They hurt the
   player on contact and pop on terrain or after their lifetime. */

const PROJ = {
  ink:    { frames: ['ink_0', 'ink_1'], fps: 8, size: 26, grav: 700, life: 3, splat: 'ink_splat' },
  bubble: { frames: ['bubble_0', 'bubble_1', 'bubble_2'], fps: 6, size: 34, grav: 420, life: 5, splat: null },
};

class Projectile {
  constructor(type, x, y, vx, vy) {
    this.type = type; this.def = PROJ[type] || PROJ.ink;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.size = this.def.size; this.w = this.size * 0.7; this.h = this.size * 0.7;
    this.t = 0; this.frame = 0; this.remove = false;
  }
  aabb() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  update(dt, map) {
    this.t += dt;
    this.vy += this.def.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.frame = Math.floor(this.t * this.def.fps) % this.def.frames.length;
    const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    if (map.isSolid(tx, ty) || this.t > this.def.life) {
      if (this.def.splat) GAME.particles.add(new Particle({ x: this.x, y: this.y, sprite: this.def.splat, size: this.size, endSize: this.size * 1.4, life: 0.25 }));
      this.remove = true;
    }
  }
  render(ctx) {
    drawSprite(ctx, this.def.frames[this.frame], this.x, this.y, { w: this.size, h: this.size, ax: 0.5, ay: 0.5 });
  }
}

window.Projectile = Projectile;
