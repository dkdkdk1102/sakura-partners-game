/* hud.js — screen-space overlay: hearts (current life's HP), spare lives, mikan
   count, score, properties found, and the stage banner. Also draws transient
   "toast" messages (e.g., trivia from a roadside sign). Pure canvas, friendly
   rounded look, scales a little with screen size. */

const HUD = {
  toast: null, toastT: 0, toastDur: 4,

  showToast(title, body, dur = 4) { this.toast = { title, body }; this.toastT = dur; this.toastDur = dur; },

  update(dt) { if (this.toastT > 0) this.toastT -= dt; },

  render(ctx, W, H, g) {
    const s = clamp(W / 1100, 0.8, 1.35); // ui scale
    ctx.save();
    ctx.textBaseline = 'middle';

    // ---- hearts + lives (top-left) ----
    const pad = 16 * s, hx = pad, hy = pad + 6 * s, hs = 30 * s;
    for (let i = 0; i < g.maxHearts; i++) {
      const filled = i < g.hearts;
      ctx.globalAlpha = filled ? 1 : 0.28;
      drawSprite(ctx, 'heart', hx + i * (hs + 4 * s) + hs / 2, hy + hs / 2, { w: hs, h: hs, ax: 0.5, ay: 0.5 });
    }
    ctx.globalAlpha = 1;
    // lives
    const ly = hy + hs + 10 * s;
    drawSprite(ctx, 'player_21', hx + 16 * s, ly + 16 * s, { w: 34 * s, h: 34 * s, ax: 0.5, ay: 0.5 });
    this._txt(ctx, `× ${g.lives}`, hx + 36 * s, ly + 16 * s, 22 * s, '#fff', 'left');

    // ---- mikan + score (top-left, below) ----
    const my = ly + 42 * s;
    drawSprite(ctx, 'mikan', hx + 16 * s, my + 16 * s, { w: 32 * s, h: 32 * s, ax: 0.5, ay: 0.5 });
    this._txt(ctx, `× ${g.mikan}`, hx + 36 * s, my + 16 * s, 22 * s, '#fff', 'left');
    this._txt(ctx, fmt(g.score), hx + 120 * s, my + 16 * s, 24 * s, '#ffe9a8', 'left');

    // ---- properties (top-right) ----
    const rx = W - pad;
    drawSprite(ctx, 'house_blue', rx - 18 * s, hy + 16 * s, { w: 38 * s, h: 38 * s, ax: 0.5, ay: 0.5 });
    this._txt(ctx, `物件 ${g.properties.length}/${g.totalProperties}`, rx - 40 * s, hy + 16 * s, 22 * s, '#bfeecb', 'right');

    // ---- stage banner (top-center) ----
    if (g.stageBannerT > 0) {
      const a = clamp(g.stageBannerT > 2.6 ? (3 - g.stageBannerT) / 0.4 : g.stageBannerT / 0.6, 0, 1);
      ctx.globalAlpha = a;
      const cx = W / 2, by = 70 * s;
      ctx.font = `800 ${34 * s}px ${FONT}`; ctx.textAlign = 'center';
      const txt = `${g.stageNum}. ${g.stageName}`;
      const w = ctx.measureText(txt).width + 60 * s;
      ctx.fillStyle = 'rgba(30,24,46,0.62)'; roundRect(ctx, cx - w / 2, by - 30 * s, w, 64 * s, 16 * s); ctx.fill();
      this._txt(ctx, txt, cx, by - 8 * s, 30 * s, '#fff', 'center');
      this._txt(ctx, g.stageSub, cx, by + 18 * s, 16 * s, '#ffd9ec', 'center');
      ctx.globalAlpha = 1;
    }

    // ---- mute indicator ----
    if (Audio2.muted || !Audio2.musicOn) {
      this._txt(ctx, Audio2.muted ? '🔇' : '♪×', W / 2, H - 22 * s, 20 * s, 'rgba(255,255,255,0.6)', 'center');
    }

    // ---- toast (trivia from signs) ----
    if (this.toastT > 0 && this.toast) {
      const a = clamp(this.toastT > 0.5 ? 1 : this.toastT / 0.5, 0, 1) * clamp((this.toastDur - this.toastT) / 0.4, 0, 1);
      ctx.globalAlpha = a;
      const bw = Math.min(W * 0.7, 560 * s), bx = (W - bw) / 2, by = H - 150 * s, bh = 92 * s;
      ctx.fillStyle = 'rgba(28,22,44,0.86)'; roundRect(ctx, bx, by, bw, bh, 16 * s); ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,120,0.7)'; ctx.lineWidth = 2; ctx.stroke();
      this._txt(ctx, this.toast.title, bx + 22 * s, by + 26 * s, 22 * s, '#ffd84a', 'left');
      ctx.font = `500 ${15 * s}px ${FONT}`; ctx.fillStyle = '#eee'; ctx.textAlign = 'left';
      this._wrap(ctx, this.toast.body, bx + 22 * s, by + 52 * s, bw - 44 * s, 21 * s);
      ctx.globalAlpha = 1;
    }

    // ---- branding watermark ----
    this._txt(ctx, 'サクラパートナーズ', W - pad, H - 18 * s, 13 * s, 'rgba(255,255,255,0.4)', 'right');
    ctx.restore();
  },

  _txt(ctx, t, x, y, size, color, align) {
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.textAlign = align || 'left';
    ctx.lineWidth = Math.max(3, size * 0.18); ctx.strokeStyle = 'rgba(40,30,30,0.8)';
    ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y);
  },
  _wrap(ctx, text, x, y, maxW, lh) {
    let line = '', yy = y;
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, yy); line = ch; yy += lh; }
      else line += ch;
    }
    if (line) ctx.fillText(line, x, yy);
  },
};

window.HUD = HUD;
