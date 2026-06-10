/* fishing.js — 伊東の さかなつり minigame. Relaxed loop made for the waiting
   room: tap to cast → wait → "！" bite cue → tap in time → fish card with rarity
   stars and verified local facts (how to eat / local specialty / trivia). Caught
   species are saved to a collection (図鑑) in localStorage. Fish data lives in
   data/fish.js (window.FISH_DATA), art in sprites/fish_<id>.png. */

class FishingScene {
  enter() {
    this.t = 0; this.state = 'idle'; // idle | wait | bite | card | escape
    this.stT = 0; this.biteIn = 0; this.fish = null; this.session = 0;
    this.showDex = false;
    this.dex = Store.get('fish_dex', {});
    this.btnQuit = new Button('やめる', 0, 0, 150, 48, { color: '#cfcfe0', size: 18, text: '#555' });
    this.btnDex = new Button('ずかん', 0, 0, 150, 48, { color: '#cdb9ff', size: 18 });
    this.btnNext = new Button('もういっかい つる', 0, 0, 300, 62, { color: '#7fd6a0', size: 22 });
    this.layout(Engine.W, Engine.H);
    this.fx = new Particles();
    Audio2.ensure(); Audio2.stopSong(); Playlist.stop();
    if (Audio2.ctx && Audio2.ctx.state === 'running') Audio2.playSong(SONGS.coast);
  }
  exit() { Audio2.stopSong(); }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) {
    this.btnQuit.setCenter(W - 95, 40);
    this.btnDex.setCenter(W - 95, 100);
    this.btnNext.setCenter(W / 2, H * 0.86);
  }

  _pickFish() {
    const table = window.FISH_DATA || [];
    const total = table.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * total;
    for (const f of table) { r -= f.weight; if (r <= 0) return f; }
    return table[0];
  }
  _cast() {
    this.state = 'wait'; this.stT = 0;
    this.biteIn = rand(1.2, 3.8);
    this.fish = this._pickFish();
    Audio2.sfx('splash');
    this.fx.splash(this.floatX(), this.waterY() + 4);
  }
  _bite() { this.state = 'bite'; this.stT = 0; Audio2.sfx('bump'); }
  _catch() {
    this.state = 'card'; this.stT = 0;
    this.session += this.fish.rarity === 6 ? 10 : this.fish.rarity;
    this.dex[this.fish.id] = (this.dex[this.fish.id] || 0) + 1;
    Store.set('fish_dex', this.dex);
    this.fx.burst(this.floatX(), this.waterY() - 40);
    Audio2.sfx(this.fish.rarity >= 5 ? 'clear' : 'power');
  }
  _escape() { this.state = 'escape'; this.stT = 0; Audio2.sfx('splash'); this.fx.splash(this.floatX(), this.waterY()); }

  floatX() { return Engine.W * 0.62; }
  waterY() { return Engine.H * 0.66; }

  update(dt) {
    this.t += dt; this.stT += dt; this.fx.update(dt);
    // global buttons
    const tap = Pointer.consume();
    if (Input.pressed('pause')) { Engine.setScene(new MiniMenuScene()); return; }
    if (tap && this.btnQuit.contains(tap)) { Audio2.sfx('select'); Engine.setScene(new MiniMenuScene()); return; }
    if (tap && this.btnDex.contains(tap)) { this.showDex = !this.showDex; Audio2.sfx('select'); return; }
    if (this.showDex) { if (tap || Input.pressed('jump')) { this.showDex = false; Audio2.sfx('select'); } return; }

    const act = !!tap || Input.pressed('jump');
    switch (this.state) {
      case 'idle':
        if (act) this._cast();
        break;
      case 'wait':
        if (this.stT >= this.biteIn) { this._bite(); break; }
        if (act) { this.state = 'idle'; this.stT = 0; } // reel back in early
        break;
      case 'bite':
        if (act) { this._catch(); break; }
        if (this.stT > 0.9) this._escape();
        break;
      case 'card':
        if (this.stT > 0.5 && (act || (this.btnNext.contains && tap && this.btnNext.contains(tap)))) { this.state = 'idle'; this.stT = 0; }
        break;
      case 'escape':
        if (this.stT > 1.1) { this.state = 'idle'; this.stT = 0; }
        break;
    }
  }

  render(ctx) {
    const W = Engine.W, H = Engine.H;
    // sea backdrop: jogasaki art on top, water below
    const img = Assets.get('bg_jogasaki');
    if (img && img.width) {
      const dh = Math.max(H * 0.78, W / (img.width / img.height));
      ctx.drawImage(img, 0, 0, W, dh);
    } else { ctx.fillStyle = '#9fd8ff'; ctx.fillRect(0, 0, W, H); }
    const wy = this.waterY();
    const g = ctx.createLinearGradient(0, wy - 30, 0, H);
    g.addColorStop(0, 'rgba(70,160,210,0.85)'); g.addColorStop(1, 'rgba(20,80,140,0.95)');
    ctx.fillStyle = g; ctx.fillRect(0, wy - 10, W, H - wy + 10);
    // gentle waves
    ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#eafaff'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); const yy = wy + 8 + i * 24; for (let x = 0; x <= W; x += 24) ctx.lineTo(x, yy + Math.sin((x + this.t * 50 + i * 40) * 0.02) * 4); ctx.stroke(); }
    ctx.restore();

    // pier + rabbit + rod
    const px = W * 0.3;
    for (let i = 0; i < 4; i++) drawSprite(ctx, 't_wood', px - 96 - i * 62, wy - 6, { w: 64, h: 40, ax: 0.5, ay: 1 });
    drawSprite(ctx, 't_wood', px - 32, wy - 6, { w: 64, h: 40, ax: 0.5, ay: 1 });
    drawSprite(ctx, 'player_00', px - 60, wy - 44, { w: 74, h: 74, ax: 0.5, ay: 1 });
    drawSprite(ctx, 'rod', px - 18, wy - 78, { w: 90, h: 90, ax: 0.2, ay: 0.85, rot: this.state === 'bite' ? Math.sin(this.t * 40) * 0.06 : -0.1 });
    // line + float
    const fx = this.floatX();
    const dip = this.state === 'bite' ? Math.sin(this.stT * 26) * 7 + 6 : (this.state === 'wait' ? Math.sin(this.t * 2.4) * 3 : 0);
    if (this.state === 'wait' || this.state === 'bite') {
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px + 52, wy - 142); ctx.quadraticCurveTo((px + fx) / 2 + 30, wy - 130, fx, wy + dip - 14); ctx.stroke(); ctx.restore();
      drawSprite(ctx, 'float_buoy', fx, wy + dip, { w: 26, h: 38, ax: 0.5, ay: 0.8 });
      // fish shadow approaching as the bite nears
      if (this.state === 'wait' && this.stT > this.biteIn - 1.2) {
        const p = clamp((this.stT - (this.biteIn - 1.2)) / 1.2, 0, 1);
        drawSprite(ctx, `fish_${this.fish.id}`, fx + (1 - p) * 120, wy + 34, { w: 70, h: 46, ax: 0.5, ay: 0.5, alpha: 0.25 + p * 0.15, flip: true });
      }
    }
    if (this.state === 'bite') {
      const a = 0.7 + 0.3 * Math.sin(this.stT * 18);
      ctx.textAlign = 'center';
      ctx.font = `900 ${56}px ${FONT}`; ctx.lineWidth = 10; ctx.strokeStyle = '#fff';
      ctx.strokeText('！', fx, wy - 56);
      ctx.fillStyle = `rgba(235,60,80,${a.toFixed(2)})`; ctx.fillText('！', fx, wy - 56);
    }
    this.fx.render(ctx); this.fx.renderText(ctx);

    // header
    ctx.textAlign = 'center';
    ctx.font = `800 ${Math.min(26, W * 0.034)}px ${FONT}`;
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
    const dexN = Object.keys(this.dex).length, total = (window.FISH_DATA || []).length;
    const head = `🎣 いとうの さかなつり　ポイント ${this.session}　ずかん ${dexN}/${total}`;
    ctx.strokeText(head, W / 2, 38); ctx.fillStyle = '#1a5a8a'; ctx.fillText(head, W / 2, 38);
    if (this.state === 'idle') {
      const pa = 0.6 + 0.25 * Math.sin(this.t * 2.4);
      ctx.font = `700 ${20}px ${FONT}`; ctx.lineWidth = 5; ctx.strokeStyle = `rgba(255,255,255,${pa.toFixed(2)})`;
      ctx.strokeText('タップで うきを なげる', W / 2, H * 0.5);
      ctx.fillStyle = `rgba(30,90,140,${pa.toFixed(2)})`; ctx.fillText('タップで うきを なげる', W / 2, H * 0.5);
    } else if (this.state === 'wait') {
      ctx.font = `600 ${15}px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('「！」が でたら すぐタップ！', W / 2, H * 0.5);
    } else if (this.state === 'escape') {
      ctx.font = `800 ${24}px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
      ctx.strokeText('にげられた〜！', W / 2, H * 0.46);
      ctx.fillStyle = '#3a6a9a'; ctx.fillText('にげられた〜！', W / 2, H * 0.46);
    }
    this.btnQuit.draw(ctx); this.btnDex.draw(ctx);

    if (this.state === 'card') this._renderCard(ctx, W, H);
    if (this.showDex) this._renderDex(ctx, W, H);
  }

  _renderCard(ctx, W, H) {
    const f = this.fish;
    const a = clamp(this.stT / 0.25, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,30,50,0.55)'; ctx.fillRect(0, 0, W, H);
    const bw = Math.min(680, W * 0.9), bh = Math.min(400, H * 0.76), bx = (W - bw) / 2, by = H * 0.08;
    ctx.fillStyle = f.rarity >= 6 ? '#fff6d8' : '#f6fbff';
    roundRect(ctx, bx, by, bw, bh, 22); ctx.fill();
    ctx.strokeStyle = f.rarity >= 6 ? '#e0b040' : 'rgba(90,150,200,0.6)'; ctx.lineWidth = 3; ctx.stroke();
    // fish art (left)
    const meta = Assets.size(`fish_${f.id}`);
    const fw = Math.min(bw * 0.34, 220), fh = fw * (meta.h / meta.w);
    drawSprite(ctx, `fish_${f.id}`, bx + bw * 0.21, by + bh * 0.4 + Math.sin(this.t * 2.5) * 4, { w: fw, h: fh, ax: 0.5, ay: 0.5 });
    // text (right)
    const tx = bx + bw * 0.4, tw = bx + bw - tx - 24;
    ctx.textAlign = 'left';
    ctx.fillStyle = f.rarity >= 6 ? '#a07010' : '#1a5a8a';
    ctx.font = `900 ${Math.min(32, bw * 0.05)}px ${FONT}`;
    ctx.fillText((f.rarity >= 6 ? '👑 ' : '') + f.name, tx, by + 48);
    ctx.font = `600 ${14}px ${FONT}`; ctx.fillStyle = '#7a8a9a';
    ctx.fillText(f.reading, tx, by + 70);
    // rarity stars
    const stars = f.rarity >= 6 ? 'ヌシ ★★★★★' : '★'.repeat(f.rarity) + '☆'.repeat(5 - f.rarity);
    ctx.font = `800 ${20}px ${FONT}`; ctx.fillStyle = '#e8a020';
    ctx.fillText(stars, tx, by + 100);
    let y = by + 132;
    const row = (label, text, color) => {
      ctx.font = `800 ${14}px ${FONT}`; ctx.fillStyle = color; ctx.fillText(label, tx, y); y += 21;
      ctx.font = `500 ${14.5}px ${FONT}`; ctx.fillStyle = '#444f5a';
      y = wrapText(ctx, text, tx, y, tw, 20) + 9;
    };
    row('◆ たべかた', f.eat, '#c06030');
    row('◆ 伊豆・伊東では', f.meibutsu, '#2a7a4a');
    row('◆ まめちしき', f.koneta, '#6a5aa0');
    ctx.textAlign = 'center';
    ctx.font = `600 ${14}px ${FONT}`; ctx.fillStyle = 'rgba(90,110,130,0.85)';
    ctx.fillText('タップで つづける', bx + bw / 2, by + bh - 18);
    ctx.restore();
  }

  _renderDex(ctx, W, H) {
    ctx.fillStyle = 'rgba(16,26,42,0.78)'; ctx.fillRect(0, 0, W, H);
    const list = window.FISH_DATA || [];
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(30, W * 0.04)}px ${FONT}`; ctx.fillStyle = '#ffe9a8';
    ctx.fillText('🐟 さかな ずかん', W / 2, 52);
    const cols = 4, cw = Math.min(200, (W - 60) / cols), ch = Math.min(118, (H - 140) / 3);
    const x0 = (W - cols * cw) / 2, y0 = 84;
    list.forEach((f, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = x0 + c * cw + cw / 2, y = y0 + r * ch;
      const got = this.dex[f.id];
      ctx.fillStyle = got ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)';
      roundRect(ctx, x - cw / 2 + 6, y, cw - 12, ch - 10, 12); ctx.fill();
      const meta = Assets.size(`fish_${f.id}`);
      const fw = Math.min(cw * 0.52, 110), fh = fw * (meta.h / meta.w);
      drawSprite(ctx, `fish_${f.id}`, x, y + ch * 0.42, { w: fw, h: fh, ax: 0.5, ay: 0.5, alpha: got ? 1 : 0.16 });
      ctx.font = `700 ${13}px ${FONT}`;
      ctx.fillStyle = got ? '#fff' : 'rgba(255,255,255,0.4)';
      ctx.fillText(got ? `${f.name} ×${got}` : '？？？', x, y + ch - 20);
    });
    ctx.font = `600 ${14}px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('タップで とじる', W / 2, H - 22);
  }
}

window.FishingScene = FishingScene;
