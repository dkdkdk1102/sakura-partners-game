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

const UpdateNotice = {
  version: '2026-06-11-major',
  title: '大型アップデート',
  date: '2026/06/11',
  lead: '伊豆の旅が、さらににぎやかになりました！',
  sections: [
    { title: '新しく遊べること', items: ['下田・ペリーロードの新ステージ', '伊東のさかなつり＋魚図鑑', 'うさメカ パトロール公開'] },
    { title: '見た目・演出', items: ['伊豆各地の背景をリニューアル', 'サクラパートナーズのゴール演出', '冒険ボス5体を専用イラスト化'] },
    { title: '音・遊びやすさ', items: ['シューティングBGM 4曲を追加', '敵・アイテム・クラゲ素材を強化', 'スマホ・タブレット対応を整備'] },
  ],
  active: false,
  auto: false,
  close: null,
  open(auto = false) {
    this.active = true; this.auto = auto;
    if (!this.close) this.close = new Button('とじる', 0, 0, 180, 52, { color: '#ff8bb0', size: 20 });
    this.layout(Engine.W, Engine.H);
  },
  shouldAutoShow() {
    return window.Store ? !Store.get('update_seen_' + this.version, false) : true;
  },
  dismiss() {
    this.active = false;
    if (window.Store) Store.set('update_seen_' + this.version, true);
  },
  layout(W, H) {
    if (!this.close) return;
    const box = this._box(W, H);
    this.close.setCenter(W / 2, box.y + box.h - Math.max(36, Math.min(44, box.h * 0.1)));
  },
  handleInput(tap) {
    if (!this.active) return false;
    if ((tap && this.close && this.close.contains(tap)) || Input.pressed('jump') || Input.pressed('pause')) {
      this.dismiss(); Audio2.sfx('select'); return true;
    }
    return !!tap;
  },
  _box(W, H) {
    const w = Math.min(860, W * 0.9);
    const h = Math.min(450, H * 0.86);
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  },
  render(ctx) {
    if (!this.active) return;
    const W = Engine.W, H = Engine.H;
    const box = this._box(W, H);
    const compact = box.h < 390 || box.w < 720;
    ctx.save();
    ctx.fillStyle = 'rgba(20,16,32,0.74)'; ctx.fillRect(0, 0, W, H);
    ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#fff8fc'; roundRect(ctx, box.x, box.y, box.w, box.h, 24); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,139,176,0.55)'; ctx.lineWidth = 3; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#d3477a'; ctx.font = `900 ${compact ? 27 : 34}px ${FONT}`;
    ctx.fillText(this.title, W / 2, box.y + (compact ? 38 : 48));
    ctx.fillStyle = '#6a4a5a'; ctx.font = `700 ${compact ? 14 : 17}px ${FONT}`;
    ctx.fillText(`${this.date}　${this.lead}`, W / 2, box.y + (compact ? 62 : 78));

    const pad = compact ? 26 : 34;
    const top = box.y + (compact ? 92 : 118);
    const colGap = compact ? 14 : 22;
    const colW = (box.w - pad * 2 - colGap * 2) / 3;
    this.sections.forEach((sec, i) => {
      const x = box.x + pad + i * (colW + colGap);
      let y = top;
      ctx.textAlign = 'left';
      ctx.fillStyle = ['#2a9ae0', '#d3477a', '#d28a22'][i];
      ctx.font = `900 ${compact ? 15 : 18}px ${FONT}`;
      ctx.fillText(sec.title, x, y);
      y += compact ? 23 : 30;
      ctx.fillStyle = '#4a3340'; ctx.font = `700 ${compact ? 12 : 15}px ${FONT}`;
      for (const item of sec.items) {
        y = wrapText(ctx, '・' + item, x, y, colW, compact ? 18 : 22) + (compact ? 3 : 6);
      }
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(90,60,80,0.72)';
    ctx.font = `600 ${compact ? 12 : 14}px ${FONT}`;
    ctx.fillText('あとからタイトル画面の「更新情報」でも見られます', W / 2, box.y + box.h - (compact ? 68 : 78));
    this.close.draw(ctx);
    ctx.restore();
  },
};

function shade(hex, amt) {
  const m = hex.replace('#', '');
  let r = parseInt(m.substr(0, 2), 16), g = parseInt(m.substr(2, 2), 16), b = parseInt(m.substr(4, 2), 16);
  r = clamp(Math.round(r + r * amt), 0, 255); g = clamp(Math.round(g + g * amt), 0, 255); b = clamp(Math.round(b + b * amt), 0, 255);
  return `rgb(${r},${g},${b})`;
}

window.Pointer = Pointer; window.Button = Button; window.UpdateNotice = UpdateNotice; window.shade = shade;
