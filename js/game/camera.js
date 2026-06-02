/* camera.js — follows the player. The view always shows VIEW_H world px tall
   (so gameplay feels identical on any screen); width follows the aspect ratio.
   Horizontal follow uses a deadzone biased left (player sits ~40% in), vertical
   eases toward the target, and everything clamps to the level bounds. */

const VIEW_H = 9 * TILE; // world px visible vertically (~9 tiles)

class Camera {
  constructor() {
    this.x = 0; this.y = 0;       // world coords of top-left of view
    this.scale = 1;
    this.viewW = 0; this.viewH = VIEW_H;
    this.level = { w: 10000, h: VIEW_H };
    this.shakeT = 0; this.shakeMag = 0;
    this.ox = 0; this.oy = 0;     // shake offset
  }
  setScreen(W, H) {
    this.scale = H / VIEW_H;
    this.viewW = W / this.scale;
    this.viewH = VIEW_H;
  }
  setBounds(w, h) { this.level = { w, h }; }

  snap(tx, ty) {
    this.x = tx - this.viewW * 0.4;
    this.y = ty - this.viewH * 0.55;
    this._clamp();
  }

  follow(target, dt) {
    // horizontal: keep target inside a deadzone biased toward the left third
    // (use center coords so the resting target matches snap(cx,cy) — no start drift)
    const desiredX = target.cx - this.viewW * 0.4;
    this.x = lerp(this.x, desiredX, 1 - Math.pow(0.0008, dt));
    // vertical: ease, but look a little below when falling fast
    const lookY = target.cy - this.viewH * 0.55 + clamp(target.vy * 0.12, -60, 140);
    this.y = lerp(this.y, lookY, 1 - Math.pow(0.0015, dt));
    this._clamp();
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * (this.shakeT > 0 ? this.shakeT / this.shakeDur : 0);
      this.ox = rand(-m, m); this.oy = rand(-m, m);
    } else { this.ox = 0; this.oy = 0; }
  }

  shake(mag, dur = 0.3) { this.shakeMag = mag; this.shakeDur = dur; this.shakeT = dur; }

  _clamp() {
    const maxX = Math.max(0, this.level.w - this.viewW);
    const maxY = Math.max(0, this.level.h - this.viewH);
    this.x = clamp(this.x, 0, maxX);
    this.y = clamp(this.y, 0, maxY);
  }

  // apply world transform to ctx (call inside save/restore)
  apply(ctx) {
    ctx.scale(this.scale, this.scale);
    ctx.translate(-(this.x + this.ox), -(this.y + this.oy));
  }
  worldToScreenX(wx) { return (wx - this.x) * this.scale; }
  visibleLeft() { return this.x - TILE; }
  visibleRight() { return this.x + this.viewW + TILE; }
}

window.Camera = Camera;
window.VIEW_H = VIEW_H;
