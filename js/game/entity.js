/* entity.js — base for everything that moves with gravity and collides with the
   tilemap. Position (x,y) is the top-left of the AABB (w,h). Collision resolves
   per-axis against solid tiles; one-way platforms only stop a downward fall when
   the feet were above the platform top. After moveY, `headCells` lists tiles the
   head struck (so the gameplay layer can bump ? blocks). */

class Entity {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.onGround = false; this.wasOnGround = false;
    this.hitCeiling = false; this.hitWall = 0; // -1 left, 1 right
    this.dead = false; this.remove = false;
    this.facing = 1; // 1 right, -1 left
    this.headCells = []; this.groundCells = []; this.landImpact = 0;
    this.gravity = 2600; this.maxFall = 1500;
    this.dropTimer = 0; // >0 means ignore one-way platforms (dropping through)
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get bottom() { return this.y + this.h; }
  get right() { return this.x + this.w; }

  overlaps(o) { return aabb(this.x, this.y, this.w, this.h, o.x, o.y, o.w, o.h); }

  applyGravity(dt, scale = 1) {
    this.vy = Math.min(this.vy + this.gravity * scale * dt, this.maxFall);
  }

  // integrate velocity with per-axis tile resolution
  moveAndCollide(map, dt) {
    this.wasOnGround = this.onGround;
    this.hitCeiling = false; this.hitWall = 0;
    this.headCells = []; this.groundCells = [];
    if (this.dropTimer > 0) this.dropTimer -= dt;
    this._moveX(map, dt);
    this._moveY(map, dt);
  }

  _moveX(map, dt) {
    const dx = this.vx * dt;
    if (dx === 0) return;
    this.x += dx;
    const top = Math.floor(this.y / TILE);
    const bot = Math.floor((this.y + this.h - 1) / TILE);
    if (dx > 0) {
      const tx = Math.floor((this.x + this.w - 1) / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (map.isSolid(tx, ty)) { this.x = tx * TILE - this.w - 0.01; this.vx = 0; this.hitWall = 1; break; }
      }
    } else {
      const tx = Math.floor(this.x / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (map.isSolid(tx, ty)) { this.x = (tx + 1) * TILE + 0.01; this.vx = 0; this.hitWall = -1; break; }
      }
    }
  }

  _moveY(map, dt) {
    const dy = this.vy * dt;
    this.onGround = false;
    this.landImpact = 0;
    this.y += dy;
    const left = Math.floor(this.x / TILE);
    const rightC = Math.floor((this.x + this.w - 1) / TILE);
    if (dy >= 0) {
      // falling — land on solids, and on one-way platforms if feet crossed the top.
      // NOTE: use floor(feet/TILE) (no -1) and snap feet exactly to the tile top
      // (no -0.01). Together these keep a resting body detecting the same ground
      // tile every frame, so onGround stays steady instead of oscillating — which
      // had been re-triggering landing dust every frame (visible flicker).
      const feet = this.y + this.h;
      const ty = Math.floor(feet / TILE);
      const prevFeet = feet - dy;
      for (let tx = left; tx <= rightC; tx++) {
        if (map.isSolid(tx, ty)) {
          this.landImpact = this.vy; this.y = ty * TILE - this.h; this.vy = 0; this.onGround = true;
          this.groundCells.push({ tx, ty });
        } else if (this.dropTimer <= 0 && map.isOneWay(tx, ty)) {
          const platTop = ty * TILE;
          if (prevFeet <= platTop + 2) {
            this.landImpact = this.vy; this.y = platTop - this.h; this.vy = 0; this.onGround = true;
            this.groundCells.push({ tx, ty, oneway: true });
          }
        }
      }
    } else {
      // rising — bonk solids overhead
      const ty = Math.floor(this.y / TILE);
      for (let tx = left; tx <= rightC; tx++) {
        if (map.isSolid(tx, ty)) {
          this.y = (ty + 1) * TILE + 0.01; this.vy = 0; this.hitCeiling = true;
          this.headCells.push({ tx, ty });
        }
      }
    }
  }
}

window.Entity = Entity;
