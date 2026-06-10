/* extras.js — waiting-room features: in-store ranking (localStorage), hiragana
   name entry, attract/demo mode (idle title → autoplay), and the onsen-manju
   catch minigame. Loaded after scenes.js (uses Button/drawScenicBg/GameScene). */

// (Store lives in engine/store.js — shared with the shooter)

// ---- ranking ----------------------------------------------------------------
const Ranking = {
  MAX: 10,
  list() { return Store.get('ranking', []); },
  qualifies(score) {
    if (score <= 0) return false;
    const l = this.list();
    return l.length < this.MAX || score > l[l.length - 1].score;
  },
  add(name, score, diff) {
    const l = this.list();
    const e = { name: name || 'うさぎ', score, diff: diff || 'easy', d: new Date().toLocaleDateString('ja-JP') };
    l.push(e);
    l.sort((a, b) => b.score - a.score);
    const cut = l.slice(0, this.MAX);
    Store.set('ranking', cut);
    return cut.indexOf(e); // rank index, -1 if pushed out
  },
};

// ---- hiragana name entry -----------------------------------------------------
const KANA_COLS = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの',
                   'はひふへほ', 'まみむめも', 'や　ゆ　よ', 'らりるれろ', 'わ　を　ん'];

class NameEntryScene {
  constructor(run) { this.run = run; this.name = ''; this.t = 0; }
  enter() {
    this.keys = [];
    this.btnDel = new Button('けす', 0, 0, 110, 52, { color: '#ffb0a0', size: 20 });
    this.btnOk = new Button('きめる', 0, 0, 140, 56, { color: '#7fd6a0', size: 22 });
    this.layout(Engine.W, Engine.H);
    Audio2.ensure(); Playlist.start();
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) {
    this.keys = [];
    const cols = KANA_COLS.length;
    const cell = Math.min(54, (W - 60) / cols, (H * 0.52) / 5.6);
    const gw = cols * cell;
    const x0 = (W - gw) / 2, y0 = H * 0.34;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < 5; r++) {
        const ch = KANA_COLS[c][r];
        if (!ch || ch === '　') continue;
        const b = new Button(ch, x0 + c * cell + 2, y0 + r * cell + 2, cell - 4, cell - 4, { color: '#fff0f6', size: Math.floor(cell * 0.46), text: '#704050' });
        b.ch = ch; this.keys.push(b);
      }
    }
    this.btnDel.setCenter(W / 2 - 90, y0 + 5 * cell + 44);
    this.btnOk.setCenter(W / 2 + 90, y0 + 5 * cell + 44);
  }
  _commit() {
    const rank = Ranking.add(this.name || 'うさぎ', this.run.score, this.run.difficulty);
    Audio2.sfx('clear');
    Engine.setScene(new RankingScene(rank));
  }
  update(dt) {
    this.t += dt; petalsUpdate(dt, Engine.W);
    if (Input.pressed('pause')) { this._commit(); return; }
    const tap = Pointer.consume(); if (!tap) return;
    for (const k of this.keys) {
      if (k.contains(tap)) {
        if (this.name.length < 4) { this.name += k.ch; Audio2.sfx('select'); }
        return;
      }
    }
    if (this.btnDel.contains(tap)) { this.name = this.name.slice(0, -1); Audio2.sfx('bump'); return; }
    if (this.btnOk.contains(tap)) { this._commit(); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    drawScenicBg(ctx, W, H, this.t, ['#cfe9ff', '#fff0f5']); petalsRender(ctx, W, H);
    ctx.textAlign = 'center';
    ctx.font = `800 ${Math.min(34, W * 0.045)}px ${FONT}`;
    ctx.lineWidth = 7; ctx.strokeStyle = '#fff';
    ctx.strokeText('ランキングに のる！ なまえを いれてね', W / 2, H * 0.12);
    ctx.fillStyle = '#5a3a66'; ctx.fillText('ランキングに のる！ なまえを いれてね', W / 2, H * 0.12);
    ctx.font = `700 ${18}px ${FONT}`; ctx.fillStyle = '#7a5a6a';
    ctx.fillText(`スコア ${fmt(this.run.score)}`, W / 2, H * 0.18);
    // name slots
    const disp = (this.name || '') + '＿'.repeat(Math.max(0, 4 - this.name.length));
    ctx.font = `800 ${Math.min(44, W * 0.06)}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(ctx, W / 2 - 150, H * 0.215, 300, 58, 14); ctx.fill();
    ctx.fillStyle = '#d3477a'; ctx.fillText(disp, W / 2, H * 0.215 + 30);
    for (const k of this.keys) k.draw(ctx);
    this.btnDel.draw(ctx); this.btnOk.draw(ctx);
  }
}

// ---- ranking board ------------------------------------------------------------
class RankingScene {
  constructor(highlight = -1) { this.hl = highlight; this.t = 0; }
  enter() {
    this.back = new Button('タイトルへ', 0, 0, 240, 60, { color: '#ff8bb0', size: 22 });
    this.layout(Engine.W, Engine.H);
    Audio2.ensure(); Playlist.start();
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) { this.back.setCenter(W / 2, H * 0.92); }
  update(dt) {
    this.t += dt; petalsUpdate(dt, Engine.W);
    if (Input.pressed('jump') || Input.pressed('pause')) { Audio2.sfx('confirm'); Engine.setScene(new TitleScene()); return; }
    const tap = Pointer.consume();
    if (tap && this.back.contains(tap)) { Audio2.sfx('confirm'); Engine.setScene(new TitleScene()); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    drawScenicBg(ctx, W, H, this.t, ['#bfe6ff', '#ffe9f1']); petalsRender(ctx, W, H);
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(42, W * 0.055)}px ${FONT}`;
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff';
    ctx.strokeText('🏆 店内ランキング', W / 2, H * 0.1);
    const tg = ctx.createLinearGradient(0, H * 0.05, 0, H * 0.13); tg.addColorStop(0, '#ff9a3c'); tg.addColorStop(1, '#ff5e8a');
    ctx.fillStyle = tg; ctx.fillText('🏆 店内ランキング', W / 2, H * 0.1);
    const list = Ranking.list();
    const bw = Math.min(620, W * 0.86), bx = (W - bw) / 2, by = H * 0.16, rh = Math.min(40, H * 0.064);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(ctx, bx, by, bw, rh * (Math.max(list.length, 1) + 0.6), 18); ctx.fill();
    if (!list.length) {
      ctx.fillStyle = '#9a8'; ctx.font = `600 ${18}px ${FONT}`;
      ctx.fillText('まだ きろくが ないよ。いちばんのりを めざそう！', W / 2, by + rh);
    }
    list.forEach((e, i) => {
      const y = by + rh * (i + 0.8);
      const isHl = i === this.hl;
      if (isHl) { ctx.fillStyle = 'rgba(255,216,74,0.35)'; roundRect(ctx, bx + 8, y - rh * 0.52, bw - 16, rh * 0.92, 10); ctx.fill(); }
      ctx.font = `800 ${Math.floor(rh * 0.5)}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? '#d49a00' : i === 1 ? '#888fa0' : i === 2 ? '#a06a40' : '#705a66';
      ctx.fillText(`${i + 1}`, bx + 26, y);
      ctx.fillStyle = '#5a3a50';
      ctx.fillText(e.name, bx + 70, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#d3477a';
      ctx.fillText(fmt(e.score), bx + bw - 96, y);
      ctx.font = `600 ${Math.floor(rh * 0.32)}px ${FONT}`; ctx.fillStyle = '#9a8a92';
      ctx.fillText(e.diff === 'normal' ? 'ノーマル' : 'やさしい', bx + bw - 22, y);
    });
    ctx.textAlign = 'center';
    this.back.draw(ctx);
  }
}

// ---- attract / demo mode -------------------------------------------------------
const DEMO = {
  active: false, timer: 0, stage: 0,
  start() {
    this.active = true; this.timer = 0;
    this.stage = pick([0, 2, 3]);
    const run = {
      stageIndex: this.stage, difficulty: 'easy', score: 0, lives: 2, mikan: 0, properties: [],
      campaignTotalProps: 9, demo: true,
      onClear: () => DEMO.exit(), onGameOver: () => DEMO.exit(), onRestart: () => DEMO.exit(), onQuit: () => DEMO.exit(),
    };
    Engine.setScene(new GameScene(run));
  },
  exit() {
    if (!this.active) return;
    this.active = false;
    Pointer.consume(); // swallow the waking tap so it doesn't hit a title button
    Engine.setScene(new TitleScene());
  },
};

// any real input ends the demo (capture phase, before game handlers)
addEventListener('pointerdown', () => { if (DEMO.active) DEMO.exit(); }, true);
addEventListener('keydown', () => { if (DEMO.active) DEMO.exit(); }, true);

// simple autopilot drives the demo: walk right, hop over gaps/walls/danger
(function installDemoPilot() {
  const orig = Input.update.bind(Input);
  let hold = -1;
  Input.update = function () {
    orig();
    if (!DEMO.active) { hold = -1; return; }
    const g = window.GAME; if (!g || !g.player || g.state !== 'play') return;
    const p = g.player, map = g.map, s = this.state, T = TILE;
    s.left = false; s.run = false; s.right = true; s.down = false; s.pause = false;
    const feetTy = Math.floor((p.bottom + 6) / T), aTx = Math.floor((p.right + 18) / T);
    const gap = !map.isSolid(aTx, feetTy) && !map.isOneWay(aTx, feetTy) && !map.isSolid(aTx, feetTy + 1);
    const wall = map.isSolid(aTx, Math.floor((p.y + p.h * 0.5) / T)) || map.isSolid(aTx, feetTy - 1);
    let danger = false;
    for (const h of g.hazards) { const hb = h.hitbox && h.hitbox(); if (hb && hb.x + hb.w > p.x && hb.x - p.right < T * 2.2 && hb.y + hb.h > p.y - T && hb.y < p.bottom + T) danger = true; }
    for (const e of g.enemies) { if (e.defeated) continue; if (e.cx > p.cx && e.cx - p.right < T * 1.9 && Math.abs(e.cy - p.cy) < T * 1.8) danger = true; }
    const stuck = p.onGround && Math.abs(p.vx) < 20;
    if (p.onGround && (gap || wall || danger || stuck) && hold <= -0.1) hold = 0.32;
    s.jump = hold > 0;
    hold = Math.max(hold - 1 / 60, -0.2);
  };
})();

// ---- onsen-manju catch minigame -------------------------------------------------
class ManjuScene {
  enter() {
    this.t = 0; this.timeLeft = 45; this.score = 0; this.over = false; this.overT = 0;
    this.bx = Engine.W / 2; this.items = []; this.spawnT = 0.5;
    this.fx = new Particles();
    this.best = Store.get('manju_best', 0);
    this.again = new Button('もういちど', 0, 0, 250, 60, { color: '#7fd6a0', size: 22 });
    this.back = new Button('タイトルへ', 0, 0, 250, 56, { color: '#ff9bb3', size: 20 });
    this.layout(Engine.W, Engine.H);
    Audio2.ensure(); Audio2.stopSong(); Playlist.stop();
    if (Audio2.ctx && Audio2.ctx.state === 'running') Audio2.playSong(SONGS.town);
  }
  exit() { Audio2.stopSong(); }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) { this.again.setCenter(W / 2, H * 0.62); this.back.setCenter(W / 2, H * 0.74); }
  _spawn() {
    const W = Engine.W;
    const r = Math.random();
    // manju 72% / golden 8% / urchin 20%
    const kind = r < 0.72 ? 'manju' : r < 0.8 ? 'gold' : 'urchin';
    this.items.push({ kind, x: rand(40, W - 40), y: -40, vy: rand(140, 220) + (45 - this.timeLeft) * 3, rot: rand(-2, 2) });
  }
  update(dt) {
    this.t += dt;
    if (this.over) {
      this.overT += dt;
      if (Input.pressed('jump')) { Engine.setScene(new ManjuScene()); return; }
      if (Input.pressed('pause')) { Engine.setScene(new TitleScene()); return; }
      const tap = Pointer.consume(); if (!tap) return;
      if (this.again.contains(tap)) { Audio2.sfx('confirm'); Engine.setScene(new ManjuScene()); }
      else if (this.back.contains(tap)) { Audio2.sfx('select'); Engine.setScene(new TitleScene()); }
      return;
    }
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.over = true; this.timeLeft = 0;
      if (this.score > this.best) { this.best = this.score; Store.set('manju_best', this.best); }
      Audio2.sfx('clear');
      return;
    }
    // basket follows pointer x; arrows also work
    const W = Engine.W, H = Engine.H;
    let target = Pointer.x || this.bx;
    if (Input.state.left) target = this.bx - 38;
    if (Input.state.right) target = this.bx + 38;
    this.bx = clamp(lerp(this.bx, target, 1 - Math.pow(0.0001, dt)), 50, W - 50);
    // spawn & fall
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this._spawn(); this.spawnT = rand(0.45, 0.8) - (45 - this.timeLeft) * 0.004; }
    const byTop = H - 96;
    for (const it of this.items) {
      it.y += it.vy * dt;
      // catch test
      if (!it.done && it.y > byTop - 18 && it.y < byTop + 36 && Math.abs(it.x - this.bx) < 56) {
        it.done = true;
        if (it.kind === 'urchin') {
          this.score = Math.max(0, this.score - 2); this.shake = 0.25;
          this.fx.poof(it.x, byTop); Audio2.sfx('hurt');
        } else {
          const v = it.kind === 'gold' ? 3 : 1;
          this.score += v;
          this.fx.sparkle(it.x, byTop, it.kind === 'gold' ? 'fx_star' : 'fx_sparkle', v * 2 + 2);
          this.fx.text(it.x, byTop - 30, '+' + v, it.kind === 'gold' ? '#ffd84a' : '#fff');
          Audio2.sfx(it.kind === 'gold' ? 'power' : 'mikan');
        }
      }
    }
    this.items = this.items.filter((it) => !it.done && it.y < H + 60);
    if (this.shake > 0) this.shake -= dt;
    this.fx.update(dt);
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    drawScenicBg(ctx, W, H, this.t, ['#ffe3c8', '#ffd7e8']);
    // onsen mood props
    drawSprite(ctx, 'l_onsen', W * 0.14, H * 0.9, { w: 150, h: 130, ax: 0.5, ay: 1, alpha: 0.95 });
    drawSprite(ctx, 'd_onsen_flag', W * 0.88, H * 0.9, { w: 70, h: 120, ax: 0.5, ay: 1, alpha: 0.95 });
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-5, 5), rand(-4, 4));
    // falling items
    for (const it of this.items) {
      const sp = it.kind === 'urchin' ? 'spike_urchin' : 'manju';
      const sz = it.kind === 'gold' ? 54 : 44;
      drawSprite(ctx, sp, it.x, it.y, { w: sz, h: sz, ax: 0.5, ay: 0.5, rot: it.rot * this.t });
      if (it.kind === 'gold') { // golden manju reads via twin sparkles (no ctx.filter — Safari compat)
        drawSprite(ctx, 'fx_star', it.x + 20, it.y - 18, { w: 20, h: 20, ax: 0.5, ay: 0.5, alpha: 0.95 });
        drawSprite(ctx, 'fx_sparkle', it.x - 18, it.y + 14, { w: 14, h: 14, ax: 0.5, ay: 0.5, alpha: 0.8 });
      }
    }
    // basket + rabbit
    const byTop = H - 96;
    drawSprite(ctx, 'player_00', this.bx, byTop + 58, { w: 64, h: 64, ax: 0.5, ay: 1 });
    drawSprite(ctx, 'basket', this.bx, byTop + 26, { w: 92, h: 64, ax: 0.5, ay: 1 });
    this.fx.render(ctx); this.fx.renderText(ctx);
    ctx.restore();
    // HUD
    ctx.textAlign = 'center';
    ctx.font = `800 ${Math.min(30, W * 0.04)}px ${FONT}`;
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
    const head = `のこり ${Math.ceil(this.timeLeft)}びょう　まんじゅう ${this.score}こ`;
    ctx.strokeText(head, W / 2, 40); ctx.fillStyle = '#8a4a2a'; ctx.fillText(head, W / 2, 40);
    ctx.font = `600 ${14}px ${FONT}`; ctx.fillStyle = 'rgba(120,80,60,0.75)';
    ctx.fillText('ゆびや ←→ で かごをうごかして、おんせんまんじゅうを キャッチ！ ウニは よけてね', W / 2, 66);
    if (this.over) {
      ctx.fillStyle = 'rgba(40,24,30,0.6)'; ctx.fillRect(0, 0, W, H);
      ctx.font = `900 ${Math.min(46, W * 0.06)}px ${FONT}`;
      ctx.lineWidth = 8; ctx.strokeStyle = '#fff';
      ctx.strokeText('おしまい！', W / 2, H * 0.3); ctx.fillStyle = '#ff8a5a'; ctx.fillText('おしまい！', W / 2, H * 0.3);
      ctx.font = `800 ${24}px ${FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(`まんじゅう ${this.score}こ　（さいこう ${this.best}こ）`, W / 2, H * 0.42);
      this.again.draw(ctx); this.back.draw(ctx);
    }
  }
}

// ---- minigame chooser ----------------------------------------------------------
class MiniMenuScene {
  enter() {
    this.t = 0;
    this.fish = new Button('🎣 いとうの さかなつり', 0, 0, 360, 78, { color: '#8fd0f0', size: 24 });
    this.manju = new Button('♨ まんじゅうキャッチ', 0, 0, 360, 78, { color: '#ffc98b', size: 24 });
    this.back = new Button('もどる', 0, 0, 170, 50, { color: '#cfcfe0', size: 18, text: '#555' });
    this.layout(Engine.W, Engine.H);
    Audio2.ensure(); Playlist.start();
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) {
    this.fish.setCenter(W / 2, H * 0.42);
    this.manju.setCenter(W / 2, H * 0.6);
    this.back.setCenter(W / 2, H * 0.78);
  }
  update(dt) {
    this.t += dt; petalsUpdate(dt, Engine.W);
    if (Input.pressed('pause')) { Audio2.sfx('select'); Engine.setScene(new TitleScene()); return; }
    const tap = Pointer.consume(); if (!tap) return;
    if (this.fish.contains(tap)) { Audio2.sfx('confirm'); Engine.setScene(new FishingScene()); }
    else if (this.manju.contains(tap)) { Audio2.sfx('confirm'); Engine.setScene(new ManjuScene()); }
    else if (this.back.contains(tap)) { Audio2.sfx('select'); Engine.setScene(new TitleScene()); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    drawScenicBg(ctx, W, H, this.t, ['#bfe6ff', '#fff0e0']); petalsRender(ctx, W, H);
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(40, W * 0.052)}px ${FONT}`;
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff';
    ctx.strokeText('ミニゲームで あそぶ', W / 2, H * 0.22);
    ctx.fillStyle = '#5a3a66'; ctx.fillText('ミニゲームで あそぶ', W / 2, H * 0.22);
    this.fish.draw(ctx); this.manju.draw(ctx); this.back.draw(ctx);
  }
}

window.Ranking = Ranking;
window.NameEntryScene = NameEntryScene; window.RankingScene = RankingScene;
window.DEMO = DEMO; window.ManjuScene = ManjuScene; window.MiniMenuScene = MiniMenuScene;
