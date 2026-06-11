/* sgame.js — shooter scenes: boot, title, play (waves→boss→clear card with the
   same verified Izu facts), ending, game-over, ranking + kana name entry. The
   play scene publishes itself as window.SG for entities. */

// ---------------------------------------------------------------- difficulty -
/* multipliers applied across entities: bullet speed, enemy fire rate, boss HP,
   tough-foe HP, player hearts/bombs, extra spawns, and a score multiplier so
   harder runs rank higher. */
const SDIFFS = {
  easy:   { key: 'easy',   label: 'やさしい', bullet: 0.85, fire: 0.8,  bossHp: 0.85, hpAdd: 0, hearts: 4, bombs: 3, extraN: 0, scoreMul: 0.8 },
  normal: { key: 'normal', label: 'ノーマル', bullet: 1.15, fire: 1.25, bossHp: 1.1,  hpAdd: 0, hearts: 3, bombs: 2, extraN: 0, scoreMul: 1.0 },
  hard:   { key: 'hard',   label: 'ハード',   bullet: 1.45, fire: 1.7,  bossHp: 1.35, hpAdd: 1, hearts: 3, bombs: 2, extraN: 1, scoreMul: 1.4 },
};
window.SDIFF = SDIFFS.normal;

class SDifficulty {
  enter() {
    this.t = 0;
    this.bd = new SBackdrop(SSTAGES[0]);
    this.easy = new Button('やさしい', 0, 0, 320, 86, { color: '#7fd6a0', size: 30, sub: 'ハート4・ボム3。ゆったり' });
    this.normal = new Button('ノーマル', 0, 0, 320, 86, { color: '#ffb86b', size: 30, sub: '弾がはやい。歯ごたえあり' });
    this.hard = new Button('ハード', 0, 0, 320, 86, { color: '#ff8b9e', size: 30, sub: '弾幕も敵もパワーアップ！' });
    this.back = new Button('もどる', 0, 0, 160, 48, { color: '#cfcfe0', size: 17, text: '#555' });
    this.layout(Engine.W, Engine.H);
    Audio2.ensure(); Playlist.start();
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) {
    this.easy.setCenter(W / 2, H * 0.34);
    this.normal.setCenter(W / 2, H * 0.52);
    this.hard.setCenter(W / 2, H * 0.7);
    this.back.setCenter(W / 2, H * 0.87);
  }
  _go(d) { window.SDIFF = d; Audio2.sfx('confirm'); Engine.setScene(new SPlay(0)); }
  update(dt) {
    this.t += dt; this.bd.update(dt * 0.4);
    if (Input.pressed('jump')) { this._go(SDIFFS.easy); return; }
    if (Input.pressed('pause')) { Audio2.sfx('select'); Engine.setScene(new STitle()); return; }
    const tap = Pointer.consume(); if (!tap) return;
    if (this.easy.contains(tap)) this._go(SDIFFS.easy);
    else if (this.normal.contains(tap)) this._go(SDIFFS.normal);
    else if (this.hard.contains(tap)) this._go(SDIFFS.hard);
    else if (this.back.contains(tap)) { Audio2.sfx('select'); Engine.setScene(new STitle()); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    this.bd.render(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(40, W * 0.052)}px ${FONT}`;
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff';
    ctx.strokeText('むずかしさを えらぼう', W / 2, H * 0.18);
    ctx.fillStyle = '#2a6a9c'; ctx.fillText('むずかしさを えらぼう', W / 2, H * 0.18);
    this.easy.draw(ctx); this.normal.draw(ctx); this.hard.draw(ctx); this.back.draw(ctx);
  }
}

// ---------------------------------------------------------------- backdrop --
class SBackdrop {
  constructor(stage) { this.stage = stage; this.x = 0; this.t = 0; this.clouds = []; for (let i = 0; i < 10; i++) this.clouds.push({ x: rand(0, 2000), y: rand(30, Engine.H * 0.5), s: rand(0.5, 1.4), v: rand(30, 90) }); }
  update(dt) { this.t += dt; this.x += 60 * dt; for (const c of this.clouds) { c.x -= c.v * dt; if (c.x < -200) { c.x = Engine.W + 200; c.y = rand(30, Engine.H * 0.5); } } }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    const img = Assets.get(this.stage.bg);
    if (img && img.width) {
      const dh = Math.max(H, W / (img.width / img.height));
      const dw = dh * (img.width / img.height);
      // mirror-tile (normal, flipped, normal, …) so the loop is seamless —
      // the art's left and right edges don't match each other
      const off = this.x % (2 * dw);
      const y = (H - dh) * 0.5;
      for (let k = Math.floor(off / dw) - 1; (k * dw - off) < W; k++) {
        const x = k * dw - off;
        if (x + dw < 0) continue;
        if (((k % 2) + 2) % 2 === 0) ctx.drawImage(img, x, y, dw + 1, dh);
        else { ctx.save(); ctx.translate(x + dw, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, dw + 1, dh); ctx.restore(); }
      }
    } else { ctx.fillStyle = '#9fd8ff'; ctx.fillRect(0, 0, W, H); }
    if (this.stage.night) { ctx.fillStyle = 'rgba(18,16,52,0.42)'; ctx.fillRect(0, 0, W, H); }
    // (no sprite cloud layer — it doubled up against the painted clouds)
    // speed streaks (subtle, additive)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const y = ((i * 97 + 40) % H);
      const x = W - ((this.x * (1.6 + i * 0.13) + i * 230) % (W + 240)) + 120;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + i * 8, y); ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- boot ------
class SBoot {
  enter() { this.p = 0; this.done = false; Assets.load((l, t) => { this.p = l / t; }, () => { this.done = true; }); }
  update() { if (this.done) Engine.setScene(new STitle()); }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    ctx.fillStyle = '#101a30'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `800 ${26}px ${FONT}`;
    ctx.fillText('よみこみ中…', W / 2, H / 2 - 14);
    const bw = Math.min(420, W * 0.7);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(ctx, (W - bw) / 2, H / 2 + 8, bw, 14, 7); ctx.fill();
    ctx.fillStyle = '#7fd0ff'; roundRect(ctx, (W - bw) / 2, H / 2 + 8, bw * this.p, 14, 7); ctx.fill();
  }
}

// ---------------------------------------------------------------- title -----
class STitle {
  enter() {
    this.t = 0;
    this.bd = new SBackdrop(SSTAGES[0]);
    this.ship = new Ship(); this.ship.x = Engine.W * 0.5; this.ship.y = Engine.H * 0.56;
    this.start = new Button('はじめる', 0, 0, 300, 74, { color: '#7fd0ff', size: 29, text: '#16324a' });
    this.rank = new Button('ランキング', 0, 0, 196, 52, { color: '#cdb9ff', size: 19 });
    this.sound = new Button('♪ 音 ON', 0, 0, 196, 52, { color: '#ffd06b', size: 19 });
    this.adv = new Button('🐰 ぼうけんの ゲームへ', 0, 0, 300, 52, { color: '#a4e6b8', size: 18 });
    this.layout(Engine.W, Engine.H);
    Audio2.ensure(); Audio2.stopSong(); Playlist.start();
    Input.onGesture = () => { Audio2.ensure(); Playlist.start(); };
  }
  exit() { Input.onGesture = null; }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) {
    this.start.setCenter(W / 2, H * 0.66);
    this.rank.setCenter(W / 2 - 105, H * 0.795);
    this.sound.setCenter(W / 2 + 105, H * 0.795);
    this.adv.setCenter(W / 2, H * 0.91);
  }
  update(dt) {
    this.t += dt; this.bd.update(dt * 0.5);
    this.ship.t += dt;
    this.ship.y = Engine.H * 0.52 + Math.sin(this.t * 1.6) * 14;
    this.ship.bank = Math.sin(this.t * 1.6 + 1.2) * 0.1;
    const tap = Pointer.consume();
    if (this.t < 0.35) return;
    if ((tap && this.start.contains(tap)) || Input.pressed('jump')) { Audio2.sfx('confirm'); Engine.setScene(new SDifficulty()); return; }
    if (tap && this.rank.contains(tap)) { Audio2.sfx('confirm'); Engine.setScene(new SRankingS()); return; }
    if (tap && this.sound.contains(tap)) { const m = Audio2.toggleMute(); this.sound.label = m ? '🔇 音 OFF' : '♪ 音 ON'; Audio2.sfx('select'); }
    if (tap && this.adv.contains(tap)) { location.href = 'index.html'; }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    this.bd.render(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(0, 0, W, H);
    // logo
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(64, W * 0.085)}px ${FONT}`;
    ctx.lineWidth = 12; ctx.strokeStyle = '#fff';
    ctx.strokeText('うさメカ パトロール', W / 2, H * 0.2);
    const tg = ctx.createLinearGradient(0, H * 0.12, 0, H * 0.24);
    tg.addColorStop(0, '#2a9ae0'); tg.addColorStop(1, '#ff5e8a');
    ctx.fillStyle = tg; ctx.fillText('うさメカ パトロール', W / 2, H * 0.2);
    ctx.font = `800 ${Math.min(24, W * 0.032)}px ${FONT}`;
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
    ctx.strokeText('〜 伊豆の そらを まもれ！ 〜', W / 2, H * 0.28);
    ctx.fillStyle = '#3a5a7c'; ctx.fillText('〜 伊豆の そらを まもれ！ 〜', W / 2, H * 0.28);
    this.ship.render(ctx);
    ctx.font = `600 ${13}px ${FONT}`; ctx.fillStyle = 'rgba(40,60,90,0.85)';
    ctx.fillText('ゆびで ドラッグ（← → ↑ ↓）で いどう ・ ショットは じどう ・ Ｂ で ボム', W / 2, H * 0.74);
    this.start.draw(ctx); this.rank.draw(ctx); this.sound.draw(ctx); this.adv.draw(ctx);
    ctx.fillStyle = 'rgba(40,60,90,0.6)'; ctx.font = `600 ${13}px ${FONT}`;
    ctx.fillText('presented by サクラパートナーズ', W / 2, H - 14);
  }
}

// ---------------------------------------------------------------- play ------
class SPlay {
  constructor(stageIdx, carry) {
    this.stageIdx = stageIdx;
    this.carry = carry || null; // {score, power, bombs, hearts}
  }
  enter() {
    window.SG = this;
    const st = SSTAGES[this.stageIdx];
    this.stage = st;
    this.bd = new SBackdrop(st);
    this.ship = new Ship();
    if (this.carry) { this.ship.power = this.carry.power; this.ship.bombs = this.carry.bombs; this.ship.hearts = this.carry.hearts; }
    this.score = this.carry ? this.carry.score : 0;
    this.foes = []; this.pshots = []; this.eshots = []; this.pickups = [];
    this.fx = new SFX2();
    this.boss = null; this.bossWarnT = 0;
    this.timer = 0; this.waveIdx = 0;
    this.combo = 0; this.comboT = 0;
    this.state = 'play'; // play | warn | boss | clear | gameover
    this.clearT = 0; this.overT = 0; this.flash = 0;
    this.bombWave = 0; this.bombX = 0; this.bombY = 0;
    this.bannerT = 2.6; this.paused = false;
    this._lastPX = null; this._lastPY = null;
    this.pBtns = [new Button('つづける', 0, 0, 260, 60, { color: '#7fd6a0' }), new Button('タイトルへ', 0, 0, 260, 56, { color: '#ff9bb3', size: 20 })];
    Audio2.ensure(); Playlist.stop();
    Audio2.playSong(SSONGS[st.music]);
    document.body.classList.add('playing'); // shows the BOMB button
  }
  exit() { Audio2.stopSong(); window.SG = null; document.body.classList.remove('playing'); }
  handleResize(W, H) {
    if (this.paused) { this.pBtns[0].setCenter(W / 2, H * 0.46); this.pBtns[1].setCenter(W / 2, H * 0.6); }
    if (this.ship) { this.ship.x = clamp(this.ship.x, 36, W - 30); this.ship.y = clamp(this.ship.y, 40, H - 46); }
  }

  // ---- spawn helpers used by the wave table ----
  spawn(type, ry) { this.foes.push(FOES[type](RY(ry))); }
  spawnRow(type, rys, opts) {
    for (const ry of rys) this.foes.push(FOES[type](RY(ry), opts || {}));
    if (SDIFF.extraN > 0 && rys.length >= 2) this.foes.push(FOES[type](RY(0.5), opts || {})); // hard: one more
  }
  spawnV(type, ryC, n) {
    const total = n + SDIFF.extraN;
    for (let i = 0; i < total; i++) {
      const k = i - (total - 1) / 2;
      const f = FOES[type](RY(ryC) + k * 46 * SS());
      f.x += Math.abs(k) * 50 * SS();
      this.foes.push(f);
    }
  }
  drop(kind, ry) { this.pickups.push(new Pickup(Engine.W + 30, RY(ry), kind)); }

  // ---- entity callbacks ----
  onKill(foe) {
    this.combo++; this.comboT = 2;
    const mult = 1 + Math.min(this.combo, 20) * 0.1;
    const pts = Math.round(foe.score * mult * SDIFF.scoreMul);
    this.score += pts;
    this.fx.boomAt(foe.x, foe.y, foe.size / (52 * SS()));
    this.fx.text(foe.x, foe.y - 24, `+${pts}`, '#ffe9a8');
    if (this.combo >= 3) this.fx.text(foe.x, foe.y - 46, `×${this.combo} コンボ！`, '#7fd0ff');
    if (foe.burst) { // urchin mine spits 6 slow spikes — dodge!
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; this.eshots.push(new EShot(foe.x, foe.y, Math.cos(a) * 140 * SS(), Math.sin(a) * 140 * SS(), 'spike', 5)); }
    }
    if (Math.random() < 0.12) this.pickups.push(new Pickup(foe.x, foe.y, 'mikan'));
  }
  onBossDown(boss) {
    const pts = Math.round(5000 * SDIFF.scoreMul);
    this.score += pts;
    this.fx.text(boss.x, boss.y - boss.r, `+${fmt(pts)}`, '#ffd84a');
    Audio2.stopSong(); Audio2.sfx('clear');
    GAMECAM_shake(16, 0.8);
  }

  togglePause() {
    if (this.state === 'gameover' || this.state === 'clear') return;
    this.paused = !this.paused;
    if (this.paused) { this.pBtns[0].setCenter(Engine.W / 2, Engine.H * 0.46); this.pBtns[1].setCenter(Engine.W / 2, Engine.H * 0.6); }
    Audio2.sfx('pause');
  }

  update(dt) {
    if (this.paused) {
      if (Input.pressed('pause')) { this.togglePause(); return; }
      const tap = Pointer.consume(); if (!tap) return;
      if (this.pBtns[0].contains(tap)) this.togglePause();
      else if (this.pBtns[1].contains(tap)) { Audio2.sfx('select'); Engine.setScene(new STitle()); }
      return;
    }
    if (Input.pressed('pause') && this.state !== 'gameover') { this.togglePause(); return; }

    this.bd.update(dt); shakeUpdate(dt);
    if (this.flash > 0) this.flash -= dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    // pointer drag steering — only during combat; clear/gameover screens need
    // their taps to reach the handlers below
    const combat = this.state === 'play' || this.state === 'warn' || this.state === 'boss';
    if (combat) {
      if (Pointer.down) {
        if (this._lastPX != null) this.ship.dragBy((Pointer.x - this._lastPX) * 1.15, (Pointer.y - this._lastPY) * 1.15);
        this._lastPX = Pointer.x; this._lastPY = Pointer.y;
      } else { this._lastPX = null; this._lastPY = null; }
      Pointer.consume(); // taps aren't used in combat (drag + auto-fire)
      if (Input.pressed('run')) this.ship.bomb();
    }

    this.ship.update(dt);

    // wave timeline
    if (this.state === 'play') {
      this.timer += dt;
      const waves = this.stage.waves;
      while (this.waveIdx < waves.length && this.timer >= waves[this.waveIdx].t) { waves[this.waveIdx].f(this); this.waveIdx++; }
      if (this.timer >= this.stage.bossAt) { this.state = 'warn'; this.bossWarnT = 2.2; Audio2.stopSong(); Audio2.sfx('boss'); }
    } else if (this.state === 'warn') {
      this.bossWarnT -= dt;
      if (this.bossWarnT <= 0) { this.state = 'boss'; this.boss = new SBoss(this.stage.boss); Audio2.playSong(SSONGS.boss); }
    } else if (this.state === 'boss') {
      if (this.boss) this.boss.update(dt);
      if (this.boss && this.boss.dead && this.boss.deadT > 2.2) {
        this.boss = null; this.state = 'clear'; this.clearT = 0;
        this.eshots.length = 0; // leftover bullets can't sour the victory lap
        Audio2.playSong(SSONGS.clear);
      }
    } else if (this.state === 'clear') {
      this.clearT += dt;
      // consume only once the gate is open so an early tap stays buffered
      const tap2 = this.clearT > 1.2 ? Pointer.consume() : null;
      if (tap2 || (this.clearT > 1.2 && Input.pressed('jump'))) {
        const carry = { score: this.score, power: this.ship.power, bombs: Math.min(this.ship.bombs + 1, 4), hearts: Math.min(this.ship.hearts + 1, 3) };
        if (this.stageIdx + 1 < SSTAGES.length) Engine.setScene(new SPlay(this.stageIdx + 1, carry));
        else Engine.setScene(new SEnding(this.score));
        return;
      }
    } else if (this.state === 'gameover') {
      this.overT += dt;
      const tap3 = this.overT > 1.2 ? Pointer.consume() : null;
      if (tap3 || (this.overT > 1.2 && Input.pressed('jump'))) {
        if (SRank.qualifies(this.score)) Engine.setScene(new SNameEntryS(this.score));
        else Engine.setScene(new SRankingS());
        return;
      }
    }

    // bomb wave expansion (quiet damage ticks — no per-frame sfx buzz)
    if (this.bombWave > 0) {
      this.bombWave += dt * 1300 * SS();
      const r = this.bombWave;
      this.eshots = this.eshots.filter((b) => Math.hypot(b.x - this.bombX, b.y - this.bombY) > r);
      for (const f of this.foes) if (!f.dead && Math.hypot(f.x - this.bombX, f.y - this.bombY) < r) f.damage(15 * dt, true);
      if (this.boss && !this.boss.intro && Math.hypot(this.boss.x - this.bombX, this.boss.y - this.bombY) < r) this.boss.damage(8 * dt, true);
      if (r > Math.max(Engine.W, Engine.H) * 1.2) this.bombWave = 0;
    }

    // entities
    for (const f of this.foes) f.update(dt);
    for (const b of this.pshots) b.update(dt);
    for (const b of this.eshots) b.update(dt);
    for (const p of this.pickups) p.update(dt);
    this.fx.update(dt);

    // no combat resolution on the clear / game-over screens
    if (this.state !== 'clear' && this.state !== 'gameover') this._collide();

    this.foes = this.foes.filter((f) => !f.dead);
    this.pshots = this.pshots.filter((b) => !b.dead);
    this.eshots = this.eshots.filter((b) => !b.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);

    // ship death → game over (never from the clear screen)
    if (this.ship.dead && this.ship.deadT > 1.4 && this.state !== 'gameover' && this.state !== 'clear') { this.state = 'gameover'; this.overT = 0; Audio2.stopSong(); }
  }

  _collide() {
    const sh = this.ship;
    // player shots → foes/boss
    for (const b of this.pshots) {
      if (b.dead) continue;
      for (const f of this.foes) {
        if (f.dead) continue;
        if (Math.hypot(b.x - f.x, b.y - f.y) < f.r + b.r) { b.dead = true; f.damage(1); break; }
      }
      if (!b.dead && this.boss && !this.boss.dead && !this.boss.intro && Math.hypot(b.x - this.boss.x, b.y - this.boss.y) < this.boss.r + b.r) { b.dead = true; this.boss.damage(1); }
    }
    if (sh.dead) return;
    // foes / boss ram
    for (const f of this.foes) {
      if (f.dead) continue;
      if (Math.hypot(sh.x - f.x, sh.y - f.y) < f.r + sh.r) { f.damage(2); sh.hit(); break; }
    }
    if (this.boss && !this.boss.dead && !this.boss.intro && Math.hypot(sh.x - this.boss.x, sh.y - this.boss.y) < this.boss.r * 0.85 + sh.r) sh.hit();
    // enemy shots
    for (const b of this.eshots) {
      if (b.dead) continue;
      if (Math.hypot(sh.x - b.x, sh.y - b.y) < b.r + sh.r) { b.dead = true; sh.hit(); break; }
    }
    // pickups
    for (const p of this.pickups) {
      if (p.dead) continue;
      if (Math.hypot(sh.x - p.x, sh.y - p.y) < p.r + sh.r + 10 * SS()) {
        p.dead = true;
        if (p.kind === 'power') { if (sh.power < 3) { sh.power++; this.fx.text(sh.x, sh.y - 40, 'パワーアップ！', '#7fd0ff'); } else { this.score += 500; this.fx.text(sh.x, sh.y - 40, '+500', '#ffe9a8'); } Audio2.sfx('power'); }
        else if (p.kind === 'bomb') { sh.bombs = Math.min(sh.bombs + 1, 4); this.fx.text(sh.x, sh.y - 40, 'ボム +1', '#ffd06b'); Audio2.sfx('power'); }
        else if (p.kind === 'heart') { sh.hearts = Math.min(sh.hearts + 1, sh.maxHearts); this.fx.text(sh.x, sh.y - 40, '+♥', '#ff8aa6'); Audio2.sfx('power'); }
        else { this.score += 300; this.fx.text(sh.x, sh.y - 30, '+300', '#ffe9a8'); Audio2.sfx('mikan'); }
      }
    }
  }

  get over() { return this.state === 'gameover'; }

  render(ctx) {
    const W = Engine.W, H = Engine.H;
    const [ox, oy] = shakeOffset();
    ctx.save(); ctx.translate(ox, oy);
    this.bd.render(ctx);
    for (const p of this.pickups) p.render(ctx);
    for (const f of this.foes) f.render(ctx);
    if (this.boss) this.boss.render(ctx);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of this.eshots) b.render(ctx);
    ctx.restore();
    this.ship.render(ctx);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of this.pshots) b.render(ctx);
    ctx.restore();
    // bomb ring
    if (this.bombWave > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(160,230,255,0.85)'; ctx.lineWidth = 14 * SS();
      ctx.beginPath(); ctx.arc(this.bombX, this.bombY, this.bombWave, 0, 6.29); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4 * SS();
      ctx.beginPath(); ctx.arc(this.bombX, this.bombY, this.bombWave * 0.92, 0, 6.29); ctx.stroke();
      ctx.restore();
    }
    this.fx.render(ctx);
    ctx.restore();

    if (this.flash > 0) { ctx.fillStyle = `rgba(255,80,110,${(this.flash * 0.8).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
    this._hud(ctx, W, H);

    if (this.state === 'warn') this._warn(ctx, W, H);
    if (this.state === 'clear') this._clearCard(ctx, W, H);
    if (this.state === 'gameover') this._gameover(ctx, W, H);
    if (this.paused) {
      ctx.fillStyle = 'rgba(16,22,40,0.62)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `800 ${40}px ${FONT}`;
      ctx.fillText('ポーズ', W / 2, H * 0.3);
      this.pBtns[0].draw(ctx); this.pBtns[1].draw(ctx);
    }
  }

  _hud(ctx, W, H) {
    const s = SS();
    ctx.save();
    // panel
    ctx.fillStyle = 'rgba(16,24,40,0.42)'; roundRect(ctx, 10, 10, 250 * s, 64 * s, 12); ctx.fill();
    for (let i = 0; i < this.ship.maxHearts; i++) {
      drawSprite(ctx, 'heart', 32 + i * 30 * s, 30 * s, { w: 24 * s, h: 24 * s, ax: 0.5, ay: 0.5, alpha: i < this.ship.hearts ? 1 : 0.25 });
    }
    for (let i = 0; i < this.ship.bombs; i++) drawSprite(ctx, 'manju', 32 + i * 26 * s, 58 * s, { w: 22 * s, h: 22 * s, ax: 0.5, ay: 0.5 });
    // power pips
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < this.ship.power ? '#7fd0ff' : 'rgba(255,255,255,0.25)'; roundRect(ctx, 150 * s + i * 26 * s, 50 * s, 20 * s, 10 * s, 4); ctx.fill(); }
    // score
    ctx.textAlign = 'right'; ctx.font = `800 ${24 * s}px ${FONT}`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,30,50,0.8)';
    ctx.strokeText(fmt(this.score), W - 18, 34 * s);
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(fmt(this.score), W - 18, 34 * s);
    if (this.combo >= 3) {
      ctx.font = `800 ${17 * s}px ${FONT}`;
      ctx.strokeText(`コンボ ×${this.combo}`, W - 18, 60 * s);
      ctx.fillStyle = '#7fd0ff'; ctx.fillText(`コンボ ×${this.combo}`, W - 18, 60 * s);
    }
    // stage banner
    if (this.bannerT > 0 && this.state === 'play') {
      const a = clamp(this.bannerT > 2.2 ? (2.6 - this.bannerT) / 0.4 : this.bannerT / 0.6, 0, 1);
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.font = `900 ${Math.min(38, W * 0.05)}px ${FONT}`;
      ctx.lineWidth = 8; ctx.strokeStyle = '#fff';
      ctx.strokeText(`ステージ${this.stageIdx + 1}　${this.stage.name}`, W / 2, H * 0.3);
      ctx.fillStyle = '#2a6a9c'; ctx.fillText(`ステージ${this.stageIdx + 1}　${this.stage.name}`, W / 2, H * 0.3);
      ctx.font = `700 ${16}px ${FONT}`; ctx.fillStyle = '#3a7aac';
      ctx.lineWidth = 5; ctx.strokeText(this.stage.sub, W / 2, H * 0.36); ctx.fillText(this.stage.sub, W / 2, H * 0.36);
      ctx.globalAlpha = 1;
    }
    // boss HP bar
    if (this.boss && !this.boss.intro && !this.boss.dead) {
      const bw = Math.min(W * 0.6, 520), bx = (W - bw) / 2, by = 16;
      ctx.fillStyle = 'rgba(16,24,40,0.6)'; roundRect(ctx, bx - 4, by - 4, bw + 8, 22, 10); ctx.fill();
      const k = clamp(this.boss.hp / this.boss.maxHp, 0, 1);
      const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, '#ff6b8a'); grad.addColorStop(1, '#ffd06b');
      ctx.fillStyle = grad; roundRect(ctx, bx, by, bw * k, 14, 7); ctx.fill();
      ctx.textAlign = 'center'; ctx.font = `800 ${14}px ${FONT}`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,30,50,0.8)';
      ctx.strokeText(this.boss.cfg.name, W / 2, by + 34);
      ctx.fillStyle = '#fff'; ctx.fillText(this.boss.cfg.name, W / 2, by + 34);
    }
    ctx.restore();
  }

  _warn(ctx, W, H) {
    const a = 0.55 + 0.3 * Math.sin(this.bossWarnT * 6);
    ctx.save(); ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(180,30,50,${(a * 0.25).toFixed(2)})`; ctx.fillRect(0, H * 0.4, W, H * 0.2);
    ctx.font = `900 ${Math.min(54, W * 0.08)}px ${FONT}`;
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff';
    ctx.strokeText('！ WARNING ！', W / 2, H * 0.52);
    ctx.fillStyle = `rgba(220,40,70,${a.toFixed(2)})`; ctx.fillText('！ WARNING ！', W / 2, H * 0.52);
    ctx.restore();
  }

  _clearCard(ctx, W, H) {
    const a = clamp(this.clearT / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(14,24,44,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(46, W * 0.06)}px ${FONT}`;
    ctx.lineWidth = 9; ctx.strokeStyle = '#fff';
    ctx.strokeText('ステージクリア！', W / 2, H * 0.18);
    ctx.fillStyle = '#ffd84a'; ctx.fillText('ステージクリア！', W / 2, H * 0.18);
    const f = (window.IZU_FACTS || []).find((x) => x.id === this.stage.factId);
    const bw = Math.min(640, W * 0.88), bx = (W - bw) / 2, by = H * 0.25, bh = H * 0.46;
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; roundRect(ctx, bx, by, bw, bh, 18); ctx.fill();
    drawSprite(ctx, this.stage.clearSprite, bx + bw * 0.18, by + bh * 0.58, { w: Math.min(150, bw * 0.26), h: Math.min(150, bw * 0.26), ax: 0.5, ay: 0.5 });
    if (f) {
      const tx = bx + bw * 0.36;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#d3477a'; ctx.font = `800 ${Math.min(26, bw * 0.042)}px ${FONT}`;
      ctx.fillText(f.name, tx, by + 44);
      ctx.fillStyle = '#9a8'; ctx.font = `600 ${13}px ${FONT}`;
      ctx.fillText(`${f.reading}　／　${f.city}`, tx, by + 66);
      ctx.fillStyle = '#5a4450'; ctx.font = `700 ${15}px ${FONT}`;
      let y = wrapText(ctx, f.tagline, tx, by + 96, bx + bw - tx - 22, 22) + 8;
      ctx.fillStyle = '#6a5560'; ctx.font = `500 ${13.5}px ${FONT}`;
      wrapText(ctx, '※ ' + f.trivia, tx, y, bx + bw - tx - 22, 20);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = `700 ${18}px ${FONT}`;
    ctx.fillText(`スコア ${fmt(this.score)}`, W / 2, by + bh + 34);
    const pa = 0.65 + 0.2 * Math.sin(this.clearT * 2.5);
    ctx.fillStyle = `rgba(255,255,255,${pa.toFixed(2)})`; ctx.font = `600 ${15}px ${FONT}`;
    ctx.fillText('タップで つぎへ', W / 2, by + bh + 62);
    ctx.restore();
  }

  _gameover(ctx, W, H) {
    const a = clamp(this.overT / 0.5, 0, 0.7);
    ctx.fillStyle = `rgba(20,14,30,${a.toFixed(2)})`; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(50, W * 0.07)}px ${FONT}`;
    ctx.lineWidth = 9; ctx.strokeStyle = '#fff';
    ctx.strokeText('ゲームオーバー', W / 2, H * 0.42);
    ctx.fillStyle = '#ff8ba0'; ctx.fillText('ゲームオーバー', W / 2, H * 0.42);
    ctx.font = `700 ${20}px ${FONT}`; ctx.fillStyle = '#fff';
    ctx.fillText(`スコア ${fmt(this.score)}`, W / 2, H * 0.52);
    if (this.overT > 1) {
      const pa = 0.65 + 0.2 * Math.sin(this.overT * 2.5);
      ctx.font = `600 ${16}px ${FONT}`; ctx.fillStyle = `rgba(255,255,255,${pa.toFixed(2)})`;
      ctx.fillText('タップで すすむ', W / 2, H * 0.62);
    }
  }
}

// ---------------------------------------------------------------- ending ----
class SEnding {
  constructor(score) { this.score = score; }
  enter() {
    this.t = 0;
    this.ship = new Ship(); this.ship.x = Engine.W * 0.5; this.ship.y = Engine.H * 0.4;
    this.bd = new SBackdrop(SSTAGES[2]);
    this.next = new Button('すすむ', 0, 0, 240, 62, { color: '#7fd0ff', size: 24, text: '#16324a' });
    this.next.setCenter(Engine.W / 2, Engine.H * 0.84);
    Audio2.playSong(SSONGS.clear);
  }
  handleResize(W, H) { if (this.next) this.next.setCenter(W / 2, H * 0.84); }
  update(dt) {
    this.t += dt; this.bd.update(dt * 0.4);
    this.ship.t += dt; this.ship.y = Engine.H * 0.4 + Math.sin(this.t * 1.4) * 12;
    const tap = Pointer.consume();
    if (this.t > 1 && ((tap && this.next.contains(tap)) || Input.pressed('jump'))) {
      Audio2.sfx('confirm');
      if (SRank.qualifies(this.score)) Engine.setScene(new SNameEntryS(this.score));
      else Engine.setScene(new SRankingS());
    }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    this.bd.render(ctx);
    ctx.fillStyle = 'rgba(255,250,240,0.25)'; ctx.fillRect(0, 0, W, H);
    this.ship.render(ctx);
    drawSprite(ctx, 'player_21', W / 2 + 90 * SS(), H * 0.42 + Math.sin(this.t * 2) * 8, { w: 60 * SS(), h: 60 * SS(), ax: 0.5, ay: 1 });
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(52, W * 0.07)}px ${FONT}`;
    ctx.lineWidth = 10; ctx.strokeStyle = '#fff';
    ctx.strokeText('伊豆の そらに へいわが もどった！', W / 2, H * 0.18);
    const tg = ctx.createLinearGradient(0, H * 0.1, 0, H * 0.22); tg.addColorStop(0, '#2a9ae0'); tg.addColorStop(1, '#ff5e8a');
    ctx.fillStyle = tg; ctx.fillText('伊豆の そらに へいわが もどった！', W / 2, H * 0.18);
    ctx.font = `800 ${26}px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
    ctx.strokeText(`さいしゅうスコア ${fmt(this.score)}`, W / 2, H * 0.6);
    ctx.fillStyle = '#3a5a7c'; ctx.fillText(`さいしゅうスコア ${fmt(this.score)}`, W / 2, H * 0.6);
    ctx.font = `600 ${15}px ${FONT}`; ctx.fillStyle = 'rgba(40,60,90,0.8)';
    ctx.fillText('伊豆・伊東の おうちさがしは サクラパートナーズへ', W / 2, H * 0.7);
    this.next.draw(ctx);
  }
}

// ------------------------------------------------------ shooter ranking -----
const SRank = {
  MAX: 10,
  list() { return Store.get('shooter_ranking', []); },
  qualifies(score) { if (score <= 0) return false; const l = this.list(); return l.length < this.MAX || score > l[l.length - 1].score; },
  add(name, score) {
    const l = this.list();
    const e = { name: name || 'うさメカ', score, diff: SDIFF.label, d: new Date().toLocaleDateString('ja-JP') };
    l.push(e); l.sort((a, b) => b.score - a.score);
    const cut = l.slice(0, this.MAX); Store.set('shooter_ranking', cut);
    return cut.indexOf(e);
  },
};

class SNameEntryS {
  constructor(score) { this.score = score; this.name = ''; this.t = 0; }
  enter() {
    this.keys = [];
    this.btnDel = new Button('けす', 0, 0, 110, 50, { color: '#ffb0a0', size: 19 });
    this.btnOk = new Button('きめる', 0, 0, 140, 54, { color: '#7fd6a0', size: 21 });
    this.layout(Engine.W, Engine.H);
    Audio2.ensure(); Audio2.stopSong(); Playlist.start(); // stop the synth so the MP3 doesn't double up
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) {
    this.keys = [];
    const cols = KANA_COLS.length;
    const cell = Math.min(52, (W - 60) / cols, (H * 0.5) / 5.6);
    const x0 = (W - cols * cell) / 2, y0 = H * 0.32;
    for (let c = 0; c < cols; c++) for (let r = 0; r < 5; r++) {
      const ch = KANA_COLS[c][r]; if (!ch || ch === '　') continue;
      const b = new Button(ch, x0 + c * cell + 2, y0 + r * cell + 2, cell - 4, cell - 4, { color: '#eef6ff', size: Math.floor(cell * 0.46), text: '#2a4a66' });
      b.ch = ch; this.keys.push(b);
    }
    this.btnDel.setCenter(W / 2 - 90, y0 + 5 * cell + 42);
    this.btnOk.setCenter(W / 2 + 90, y0 + 5 * cell + 42);
  }
  _commit() { const rk = SRank.add(this.name || 'うさメカ', this.score); Audio2.sfx('clear'); Engine.setScene(new SRankingS(rk)); }
  update(dt) {
    this.t += dt;
    if (Input.pressed('pause')) { this._commit(); return; }
    const tap = Pointer.consume(); if (!tap) return;
    for (const k of this.keys) if (k.contains(tap)) { if (this.name.length < 4) { this.name += k.ch; Audio2.sfx('select'); } return; }
    if (this.btnDel.contains(tap)) { this.name = this.name.slice(0, -1); Audio2.sfx('bump'); return; }
    if (this.btnOk.contains(tap)) this._commit();
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    ctx.fillStyle = '#10203a'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `800 ${Math.min(30, W * 0.04)}px ${FONT}`; ctx.fillStyle = '#ffe9a8';
    ctx.fillText('ランクイン！ なまえを いれてね', W / 2, H * 0.1);
    ctx.font = `700 ${17}px ${FONT}`; ctx.fillStyle = '#9fc0e0';
    ctx.fillText(`スコア ${fmt(this.score)}`, W / 2, H * 0.16);
    const disp = (this.name || '') + '＿'.repeat(Math.max(0, 4 - this.name.length));
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(ctx, W / 2 - 140, H * 0.2, 280, 54, 12); ctx.fill();
    ctx.font = `800 ${40}px ${FONT}`; ctx.fillStyle = '#7fd0ff'; ctx.fillText(disp, W / 2, H * 0.2 + 28);
    for (const k of this.keys) k.draw(ctx);
    this.btnDel.draw(ctx); this.btnOk.draw(ctx);
  }
}

class SRankingS {
  constructor(hl = -1) { this.hl = hl; this.t = 0; }
  enter() { this.back = new Button('タイトルへ', 0, 0, 240, 58, { color: '#7fd0ff', size: 21, text: '#16324a' }); this.back.setCenter(Engine.W / 2, Engine.H * 0.92); Audio2.ensure(); Audio2.stopSong(); Playlist.start(); }
  handleResize(W, H) { if (this.back) this.back.setCenter(W / 2, H * 0.92); }
  update(dt) {
    this.t += dt;
    if (Input.pressed('jump') || Input.pressed('pause')) { Engine.setScene(new STitle()); return; }
    const tap = Pointer.consume();
    if (tap && this.back.contains(tap)) { Audio2.sfx('confirm'); Engine.setScene(new STitle()); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    ctx.fillStyle = '#10203a'; ctx.fillRect(0, 0, W, H);
    // faint stars
    for (let i = 0; i < 40; i++) { const x = (i * 173 + 60) % W, y = (i * 97 + 30) % (H * 0.9); ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 5) * 0.1})`; ctx.fillRect(x, y, 2, 2); }
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.min(38, W * 0.05)}px ${FONT}`; ctx.fillStyle = '#ffd84a';
    ctx.fillText('🚀 うさメカ ランキング', W / 2, H * 0.1);
    const list = SRank.list();
    const bw = Math.min(600, W * 0.84), bx = (W - bw) / 2, by = H * 0.16, rh = Math.min(38, H * 0.062);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(ctx, bx, by, bw, rh * (Math.max(list.length, 1) + 0.6), 16); ctx.fill();
    if (!list.length) { ctx.fillStyle = '#9fc0e0'; ctx.font = `600 ${17}px ${FONT}`; ctx.fillText('まだ きろくが ないよ。いちばんのりを めざそう！', W / 2, by + rh); }
    list.forEach((e, i) => {
      const y = by + rh * (i + 0.8);
      if (i === this.hl) { ctx.fillStyle = 'rgba(127,208,255,0.22)'; roundRect(ctx, bx + 6, y - rh * 0.52, bw - 12, rh * 0.9, 8); ctx.fill(); }
      ctx.font = `800 ${Math.floor(rh * 0.5)}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? '#ffd84a' : i === 1 ? '#c0d0e0' : i === 2 ? '#d09a60' : '#8aa6c4';
      ctx.fillText(`${i + 1}`, bx + 24, y);
      ctx.fillStyle = '#e6f0fa'; ctx.fillText(e.name, bx + 66, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#7fd0ff'; ctx.fillText(fmt(e.score), bx + bw - 96, y);
      ctx.font = `600 ${Math.floor(rh * 0.32)}px ${FONT}`; ctx.fillStyle = '#8aa6c4';
      ctx.fillText(e.diff || '', bx + bw - 20, y);
    });
    ctx.textAlign = 'center';
    this.back.draw(ctx);
  }
}

// kana grid shared with the adventure (duplicated constant to stay self-contained)
const KANA_COLS = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの',
                   'はひふへほ', 'まみむめも', 'や　ゆ　よ', 'らりるれろ', 'わ　を　ん'];

window.SBoot = SBoot; window.STitle = STitle; window.SPlay = SPlay; window.SDifficulty = SDifficulty;
window.SDIFFS = SDIFFS;
window.SEnding = SEnding; window.SRank = SRank; window.SNameEntryS = SNameEntryS; window.SRankingS = SRankingS;
window.SBackdrop = SBackdrop;
