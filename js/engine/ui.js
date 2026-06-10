/* ui.js — pointer tap tracking + tappable canvas buttons for menus (title, pause,
   clear, game-over, ending). Coordinates are CSS pixels matching Engine.W/H.
   Pointer.tap holds the latest unconsumed tap; scenes consume it on a hit. */

const Pointer = {
  x: 0, y: 0, tap: null, down: false,
  init(canvas) {
    const rect = () => canvas.getBoundingClientRect();
    const pos = (e) => { const r = rect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('pointerdown', (e) => {
      const p = pos(e); this.x = p.x; this.y = p.y; this.down = true; this.tap = { x: p.x, y: p.y };
      if (Input) Input._gesture && Input._gesture();
    });
    canvas.addEventListener('pointermove', (e) => { const p = pos(e); this.x = p.x; this.y = p.y; });
    // release on window so a mouse-up over a DOM button / outside the window
    // can't leave down=true stuck (which made the ship follow the bare cursor)
    addEventListener('pointerup', () => { this.down = false; });
    addEventListener('pointercancel', () => { this.down = false; });
  },
  consume() { const t = this.tap; this.tap = null; return t; },
};

class Button {
  constructor(label, x, y, w, h, opts = {}) {
    this.label = label; this.x = x; this.y = y; this.w = w; this.h = h;
    this.color = opts.color || '#ff8bb0'; this.text = opts.text || '#3a2030';
    this.size = opts.size || 26; this.icon = opts.icon || null; this.hover = false;
    this.sub = opts.sub || null;
  }
  setCenter(cx, cy) { this.x = cx - this.w / 2; this.y = cy - this.h / 2; return this; }
  contains(p) { return p && p.x >= this.x && p.x <= this.x + this.w && p.y >= this.y && p.y <= this.y + this.h; }
  draw(ctx, t = 0) {
    const hov = this.contains(Pointer);
    const pop = hov ? 1.04 : 1;
    const w = this.w * pop, h = this.h * pop, x = this.x - (w - this.w) / 2, y = this.y - (h - this.h) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
    roundRect(ctx, x, y, w, h, h * 0.32);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, this.color); g.addColorStop(1, shade(this.color, -0.18));
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = this.text; ctx.font = `800 ${this.size}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x + this.w / 2, this.y + this.h / 2 + (this.sub ? -8 : 0));
    if (this.sub) { ctx.font = `600 ${this.size * 0.5}px ${FONT}`; ctx.fillStyle = 'rgba(58,32,48,0.8)'; ctx.fillText(this.sub, this.x + this.w / 2, this.y + this.h / 2 + 16); }
    ctx.restore();
  }
}

function shade(hex, amt) {
  const m = hex.replace('#', '');
  let r = parseInt(m.substr(0, 2), 16), g = parseInt(m.substr(2, 2), 16), b = parseInt(m.substr(4, 2), 16);
  r = clamp(Math.round(r + r * amt), 0, 255); g = clamp(Math.round(g + g * amt), 0, 255); b = clamp(Math.round(b + b * amt), 0, 255);
  return `rgb(${r},${g},${b})`;
}

window.Pointer = Pointer; window.Button = Button; window.shade = shade;
