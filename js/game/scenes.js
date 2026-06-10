/* scenes.js — non-gameplay screens and the campaign flow that strings stages
   together: Boot (loading) → Title → Difficulty → [stages] → StageClear (verified
   Izu trivia) → … → Ending (arrival in Ito + property gallery + branding).
   Game-over offers retry or title. All menus are tappable and key/▲-navigable. */

// shared decorative backdrop (sky + a row of Izu landmarks + drifting petals)
function drawScenicBg(ctx, W, H, t, tone) {
  const sky = tone || ['#bfe6ff', '#ffe9f1'];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff7da';
  ctx.beginPath(); ctx.arc(W * 0.8, H * 0.22, 64, 0, 6.29); ctx.fill(); ctx.restore();
  // landmark silhouette row
  const items = [['l_omuro_big', 0.16, 2.0], ['l_lighthouse', 0.42, 1.5], ['ryokan', 0.66, 1.4], ['l_omuro', 0.86, 2.2]];
  ctx.save(); ctx.globalAlpha = 0.92;
  for (const [name, fx, sc] of items) {
    const meta = Assets.size(name);
    drawSprite(ctx, name, W * fx, H * 0.9, { w: meta.w * sc, h: meta.h * sc, ax: 0.5, ay: 1, alpha: 0.9 });
  }
  ctx.restore();
  // ground band
  ctx.fillStyle = 'rgba(120,190,120,0.5)'; ctx.fillRect(0, H * 0.88, W, H * 0.12);
}

let _petals = [];
function petalsUpdate(dt, W) {
  if (_petals.length < 24) _petals.push({ x: rand(0, W), y: rand(-40, 0), vx: rand(-20, 6), vy: rand(20, 50), r: rand(0, 6), vr: rand(-2, 2), s: rand(16, 26), sp: pick(['fx_petal0', 'fx_petal1', 'fx_petal2', 'fx_petal3']) });
  for (const p of _petals) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; }
  _petals = _petals.filter((p) => p.y < 2000);
}
function petalsRender(ctx, W, H) {
  for (const p of _petals) { const yy = p.y % (H + 60); drawSprite(ctx, p.sp, p.x, yy, { w: p.s, h: p.s, ax: 0.5, ay: 0.5, rot: p.r, alpha: 0.9 }); }
}

// ---------------------------------------------------------------------------
class BootScene {
  enter() { this.p = 0; this.done = false; Assets.load((l, t) => { this.p = l / t; }, () => { this.done = true; }); }
  update() { if (this.done) Engine.setScene(new TitleScene()); }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    ctx.fillStyle = '#1b1430'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `800 ${28}px ${FONT}`;
    ctx.fillText('よみこみ中…', W / 2, H / 2 - 16);
    const bw = Math.min(420, W * 0.7), bx = (W - bw) / 2, by = H / 2 + 8;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(ctx, bx, by, bw, 16, 8); ctx.fill();
    ctx.fillStyle = '#ff8bb0'; roundRect(ctx, bx, by, bw * this.p, 16, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `600 ${14}px ${FONT}`;
    ctx.fillText('サクラパートナーズ', W / 2, H - 30);
  }
}

// ---------------------------------------------------------------------------
class TitleScene {
  enter() {
    this.t = 0; this.showHelp = false;
    this.start = new Button('はじめる', 0, 0, 300, 76, { color: '#ff8bb0', size: 30 });
    this.help = new Button('あそびかた', 0, 0, 200, 54, { color: '#9fd3ff', size: 20 });
    this.sound = new Button('♪ 音 ON', 0, 0, 200, 54, { color: '#ffd06b', size: 20 });
    this.layout(Engine.W, Engine.H);
    // main-screen BGM = the MP3 playlist (random, auto-advancing); no synth here
    Audio2.ensure(); Audio2.stopSong();
    Playlist.start();
    Input.onGesture = () => { Audio2.ensure(); Playlist.start(); };
  }
  exit() { Input.onGesture = null; }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) {
    this.start.setCenter(W / 2, H * 0.62);
    this.help.setCenter(W / 2 - 110, H * 0.78);
    this.sound.setCenter(W / 2 + 110, H * 0.78);
  }
  update(dt) {
    this.t += dt; petalsUpdate(dt, Engine.W);
    const tap = Pointer.consume();
    if (this.showHelp) { if (tap || Input.pressed('jump') || Input.pressed('pause')) { this.showHelp = false; Audio2.sfx('select'); } return; }
    if ((tap && this.start.contains(tap)) || Input.pressed('jump') || Input.pressed('pause')) { Audio2.sfx('confirm'); Engine.setScene(new DifficultyScene()); return; }
    if (tap && this.help.contains(tap)) { this.showHelp = true; Audio2.sfx('select'); }
    if (tap && this.sound.contains(tap)) { const m = Audio2.toggleMute(); this.sound.label = m ? '🔇 音 OFF' : '♪ 音 ON'; Audio2.sfx('select'); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    drawScenicBg(ctx, W, H, this.t, ['#bfe6ff', '#ffe3ef']);
    petalsRender(ctx, W, H);
    // hero rabbit
    const bob = Math.sin(this.t * 2) * 8;
    drawSprite(ctx, 'player_21', W / 2, H * 0.5 + bob, { w: 150, h: 150, ax: 0.5, ay: 1 });
    // title
    ctx.textAlign = 'center';
    ctx.save();
    ctx.font = `900 ${Math.min(74, W * 0.09)}px ${FONT}`;
    ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.strokeText('伊豆の旅', W / 2, H * 0.2);
    const tg = ctx.createLinearGradient(0, H * 0.1, 0, H * 0.24);
    tg.addColorStop(0, '#ff5e8a'); tg.addColorStop(1, '#ff9a5a');
    ctx.fillStyle = tg; ctx.fillText('伊豆の旅', W / 2, H * 0.2);
    ctx.font = `800 ${Math.min(30, W * 0.038)}px ${FONT}`;
    ctx.lineWidth = 7; ctx.strokeStyle = '#fff'; ctx.strokeText('〜 うさぎと、伊東をめざして 〜', W / 2, H * 0.285);
    ctx.fillStyle = '#5a3a66'; ctx.fillText('〜 うさぎと、伊東をめざして 〜', W / 2, H * 0.285);
    ctx.restore();
    this.start.draw(ctx, this.t); this.help.draw(ctx); this.sound.draw(ctx);
    ctx.fillStyle = 'rgba(90,60,80,0.7)'; ctx.font = `600 ${14}px ${FONT}`;
    ctx.fillText('presented by サクラパートナーズ', W / 2, H - 18);
    if (this.showHelp) this._help(ctx, W, H);
  }
  _help(ctx, W, H) {
    ctx.fillStyle = 'rgba(20,16,32,0.72)'; ctx.fillRect(0, 0, W, H);
    const bw = Math.min(640, W * 0.86), bh = Math.min(420, H * 0.8), bx = (W - bw) / 2, by = (H - bh) / 2;
    ctx.fillStyle = '#fff6fb'; roundRect(ctx, bx, by, bw, bh, 24); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#d3477a'; ctx.font = `800 ${30}px ${FONT}`;
    ctx.fillText('あそびかた', W / 2, by + 46);
    ctx.textAlign = 'left'; ctx.fillStyle = '#4a3340'; ctx.font = `600 ${19}px ${FONT}`;
    const lines = [
      '◆ タッチ：画面左下の ◀ ▶ で移動、右下の ⤴ でジャンプ、Ｂ でダッシュ',
      '◆ キーボード：← → 移動 / ↑・スペースでジャンプ / Shift ダッシュ',
      '◆ 敵は上から踏むとやっつけられる（トゲのある敵はよけよう）',
      '◆ みかんを集めて100個で1UP、温泉♨でハート回復',
      '◆ 道中に隠れた「物件」を見つけて伊東を目指そう！',
      '◆ 旗のチェックポイントを通ると、やられても再開できる',
    ];
    let y = by + 92; for (const l of lines) { wrapText(ctx, l, bx + 34, y, bw - 68, 28); y += 50; }
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(120,80,100,0.8)'; ctx.font = `600 ${16}px ${FONT}`;
    ctx.fillText('タップで とじる', W / 2, by + bh - 22);
  }
}

// ---------------------------------------------------------------------------
class DifficultyScene {
  enter() {
    this.t = 0;
    this.easy = new Button('やさしい', 0, 0, 320, 96, { color: '#7fd6a0', size: 32, sub: 'ハート4・残機5。だれでも安心' });
    this.normal = new Button('ノーマル', 0, 0, 320, 96, { color: '#ffb86b', size: 32, sub: 'ハート3・残機3。歯ごたえあり' });
    this.back = new Button('もどる', 0, 0, 160, 50, { color: '#cfcfe0', size: 18, text: '#555' });
    this.layout(Engine.W, Engine.H);
    Playlist.start(); // keep the menu playlist going into the difficulty screen
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) { this.easy.setCenter(W / 2, H * 0.44); this.normal.setCenter(W / 2, H * 0.62); this.back.setCenter(W / 2, H * 0.8); }
  update(dt) {
    this.t += dt; petalsUpdate(dt, Engine.W);
    // keyboard fallback: jump = やさしい (recommended), pause = もどる
    if (Input.pressed('jump')) { Audio2.sfx('confirm'); Campaign.start('easy'); return; }
    if (Input.pressed('pause')) { Audio2.sfx('select'); Engine.setScene(new TitleScene()); return; }
    const tap = Pointer.consume(); if (!tap) return;
    if (this.easy.contains(tap)) { Audio2.sfx('confirm'); Campaign.start('easy'); }
    else if (this.normal.contains(tap)) { Audio2.sfx('confirm'); Campaign.start('normal'); }
    else if (this.back.contains(tap)) { Audio2.sfx('select'); Engine.setScene(new TitleScene()); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    drawScenicBg(ctx, W, H, this.t, ['#cfe9ff', '#fff0f5']); petalsRender(ctx, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#5a3a66'; ctx.font = `800 ${Math.min(40, W * 0.05)}px ${FONT}`;
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.strokeText('むずかしさを えらぼう', W / 2, H * 0.24);
    ctx.fillText('むずかしさを えらぼう', W / 2, H * 0.24);
    this.easy.draw(ctx); this.normal.draw(ctx); this.back.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
class StageClearScene {
  constructor(run) { this.run = run; this.fact = (window.IZU_FACTS || []).find((f) => f.id === LEVELS[run.stageIndex].factId); }
  enter() {
    this.t = 0;
    this.next = new Button('つぎへ すすむ', 0, 0, 300, 70, { color: '#ff8bb0', size: 26 });
    this.layout(Engine.W, Engine.H);
    Audio2.playSong(SONGS.title);
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) { this.next.setCenter(W / 2, H * 0.86); }
  update(dt) {
    this.t += dt; petalsUpdate(dt, Engine.W);
    const tap = Pointer.consume();
    if (this.t > 0.6 && ((tap && this.next.contains(tap)) || Input.pressed('jump'))) {
      Audio2.sfx('confirm'); Campaign.advance(this.run);
    }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    drawScenicBg(ctx, W, H, this.t, ['#bfe6ff', '#fff0e6']); petalsRender(ctx, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff7a3c'; ctx.font = `900 ${Math.min(48, W * 0.06)}px ${FONT}`;
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff';
    ctx.strokeText('ステージ クリア！', W / 2, H * 0.16); ctx.fillText('ステージ クリア！', W / 2, H * 0.16);

    const f = this.fact;
    const bw = Math.min(700, W * 0.9), bx = (W - bw) / 2, by = H * 0.24, bh = H * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; roundRect(ctx, bx, by, bw, bh, 22); ctx.fill();
    ctx.strokeStyle = 'rgba(255,140,170,0.6)'; ctx.lineWidth = 3; ctx.stroke();
    // landmark image
    const sp = LEVELS[this.run.stageIndex].clearSprite || 'l_lighthouse';
    drawSprite(ctx, sp, bx + bw * 0.2, by + bh * 0.55, { w: Math.min(180, bw * 0.3), h: Math.min(180, bw * 0.3), ax: 0.5, ay: 0.5 });
    if (f) {
      const tx = bx + bw * 0.4;
      ctx.textAlign = 'left'; ctx.fillStyle = '#d3477a'; ctx.font = `800 ${Math.min(30, bw * 0.045)}px ${FONT}`;
      ctx.fillText(f.name, tx, by + 50);
      ctx.fillStyle = '#9a7'; ctx.font = `600 ${15}px ${FONT}`;
      ctx.fillText(`${f.reading}　／　${f.city}`, tx, by + 76);
      ctx.fillStyle = '#5a4450'; ctx.font = `700 ${17}px ${FONT}`;
      let y = by + 112; y = wrapText(ctx, f.tagline, tx, y, bx + bw - tx - 24, 25) + 12;
      ctx.fillStyle = '#6a5560'; ctx.font = `500 ${15}px ${FONT}`;
      y = wrapText(ctx, '※ ' + f.trivia, tx, y, bx + bw - tx - 24, 23) + 8;
      if (f.season) { ctx.fillStyle = '#cf7a3a'; ctx.font = `700 ${14}px ${FONT}`; ctx.fillText('◆ 見頃・旬：' + f.season, tx, y + 6); }
    }
    // totals
    ctx.textAlign = 'center'; ctx.fillStyle = '#5a3a50'; ctx.font = `700 ${18}px ${FONT}`;
    ctx.fillText(`スコア ${fmt(this.run.score)}　みかん ${this.run.mikan}　物件 ${this.run.properties.length}`, W / 2, by + bh + 34);
    this.next.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
class GameOverScene {
  constructor(run) { this.run = run; this.entry = Campaign.entry; }
  enter() {
    this.t = 0;
    this.retry = new Button('もういちど', 0, 0, 300, 70, { color: '#7fd6a0', size: 26 });
    this.title = new Button('タイトルへ', 0, 0, 300, 60, { color: '#ff9bb3', size: 22 });
    this.layout(Engine.W, Engine.H);
    Audio2.sfx('die');
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) { this.retry.setCenter(W / 2, H * 0.52); this.title.setCenter(W / 2, H * 0.66); }
  update(dt) {
    this.t += dt;
    // keyboard fallback: jump = もういちど, pause = タイトルへ
    if (Input.pressed('jump')) { Audio2.sfx('confirm'); Campaign.retry(); return; }
    if (Input.pressed('pause')) { Audio2.sfx('select'); Engine.setScene(new TitleScene()); return; }
    const tap = Pointer.consume(); if (!tap) return;
    if (this.retry.contains(tap)) { Audio2.sfx('confirm'); Campaign.retry(); }
    else if (this.title.contains(tap)) { Audio2.sfx('select'); Engine.setScene(new TitleScene()); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    ctx.fillStyle = '#2a1830'; ctx.fillRect(0, 0, W, H);
    drawSprite(ctx, 'player_19', W / 2, H * 0.36, { w: 120, h: 120, ax: 0.5, ay: 1, alpha: 0.95 });
    ctx.textAlign = 'center'; ctx.fillStyle = '#ff8ba0'; ctx.font = `900 ${Math.min(50, W * 0.07)}px ${FONT}`;
    ctx.fillText('ゲームオーバー', W / 2, H * 0.42);
    this.retry.draw(ctx); this.title.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
class EndingScene {
  constructor(run) { this.run = run; }
  enter() {
    this.t = 0;
    this.again = new Button('タイトルへ', 0, 0, 280, 64, { color: '#ff8bb0', size: 24 });
    this.layout(Engine.W, Engine.H);
    Audio2.playSong(SONGS.town);
    // gallery: unique properties with counts
    const m = new Map();
    for (const p of this.run.properties) { const k = p.name; m.set(k, (m.get(k) || 0) + 1); }
    this.gallery = [...m.entries()].map(([name, n]) => ({ name, n, sprite: (PROPERTIES.find((x) => x.name === name) || PROPERTIES[0]).sprite }));
  }
  handleResize(W, H) { this.layout(W, H); }
  layout(W, H) { this.again.setCenter(W / 2, H * 0.94); }
  update(dt) {
    this.t += dt; petalsUpdate(dt, Engine.W);
    const tap = Pointer.consume();
    if (this.t > 1 && ((tap && this.again.contains(tap)) || Input.pressed('pause') || Input.pressed('jump'))) { Audio2.sfx('confirm'); Engine.setScene(new TitleScene()); }
  }
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    drawScenicBg(ctx, W, H, this.t, ['#ffd7a8', '#ffe9d0']); petalsRender(ctx, W, H);
    ctx.textAlign = 'center';

    // ---- title + score ----
    ctx.font = `900 ${Math.min(52, W * 0.066)}px ${FONT}`; ctx.lineWidth = 9; ctx.strokeStyle = '#fff';
    ctx.strokeText('伊東に とうちゃく！', W / 2, H * 0.13);
    const tg = ctx.createLinearGradient(0, H * 0.06, 0, H * 0.16); tg.addColorStop(0, '#ff5e8a'); tg.addColorStop(1, '#ff9a3c');
    ctx.fillStyle = tg; ctx.fillText('伊東に とうちゃく！', W / 2, H * 0.13);
    ctx.fillStyle = '#5a3a4a'; ctx.font = `700 ${Math.min(18, W * 0.024)}px ${FONT}`;
    ctx.fillText(`さいしゅうスコア ${fmt(this.run.score)}　みかん ${this.run.mikan}個`, W / 2, H * 0.2);

    // ---- hero: Sakura Partners storefront + cheering rabbit ----
    const sh = Math.min(210, H * 0.3), sw = sh * (220 / 150), sy = H * 0.55;
    drawSprite(ctx, 'goal_sakura_partners', W / 2, sy, { w: sw, h: sh, ax: 0.5, ay: 1 });
    const bob = Math.sin(this.t * 3) * 6;
    drawSprite(ctx, 'player_20', W / 2 - sw * 0.62, sy + bob, { w: sh * 0.42, h: sh * 0.42, ax: 0.5, ay: 1, flip: true });
    // a few sparkles over the sign
    for (let i = 0; i < 3; i++) { const a = this.t * 2 + i * 2.1; drawSprite(ctx, 'fx_star', W / 2 + Math.cos(a) * sw * 0.5, sy - sh * 0.8 + Math.sin(a * 1.3) * 14, { w: 22, h: 22, ax: 0.5, ay: 0.5, alpha: 0.8 }); }

    // ---- property gallery strip ----
    const bw = Math.min(760, W * 0.92), bx = (W - bw) / 2, by = H * 0.6, bh = H * 0.24;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; roundRect(ctx, bx, by, bw, bh, 18); ctx.fill();
    ctx.fillStyle = '#d3477a'; ctx.font = `800 ${Math.min(22, W * 0.028)}px ${FONT}`;
    ctx.fillText(`見つけた物件　${this.run.properties.length} 件`, W / 2, by + 30);
    if (this.gallery.length === 0) {
      ctx.fillStyle = '#9a8'; ctx.font = `600 ${15}px ${FONT}`;
      ctx.fillText('次はぜひ、道中の「物件」も集めてみてね', W / 2, by + bh * 0.62);
    } else {
      const n = this.gallery.length, cw = Math.min(150, (bw - 40) / Math.max(n, 1));
      const sx = W / 2 - (n - 1) * cw / 2;
      this.gallery.forEach((gp, i) => {
        const x = sx + i * cw, y = by + bh * 0.74;
        drawSprite(ctx, gp.sprite, x, y, { w: cw * 0.62, h: cw * 0.52, ax: 0.5, ay: 1 });
        ctx.fillStyle = '#5a4450'; ctx.font = `700 ${Math.min(13, cw * 0.1)}px ${FONT}`;
        wrapText(ctx, gp.name + (gp.n > 1 ? ` ×${gp.n}` : ''), x, y + 16, cw - 8, 15, true);
      });
    }
    // ---- branding closing + button ----
    ctx.fillStyle = '#6a4a5a'; ctx.font = `700 ${Math.min(16, W * 0.022)}px ${FONT}`;
    ctx.fillText('伊豆・伊東のお住まい探しは「サクラパートナーズ」へ', W / 2, by + bh + 24);
    this.again.draw(ctx);
  }
}

// ---------------------------------------------------------------------------
// total properties placed across every stage (for the HUD denominator)
function countAllProperties() {
  let n = 0;
  for (const def of LEVELS) {
    const b = new LevelBuilder(def.cols, def.theme);
    def.build(b);
    n += b.items.filter((it) => it instanceof Property).length;
    for (const blk of b.map.blocks.values()) if (blk instanceof QBlock && blk.contains === 'property') n += blk.count;
  }
  return n;
}

const Campaign = {
  entry: null, current: 0, totalProps: 0,
  start(difficulty) {
    this.entry = { score: 0, lives: DIFF[difficulty].lives, mikan: 0, properties: [], difficulty };
    this.totalProps = countAllProperties();
    this.startStage(0);
  },
  startStage(i) {
    this.current = i;
    const e = this.entry;
    const run = {
      stageIndex: i, difficulty: e.difficulty, score: e.score, lives: e.lives, mikan: e.mikan, properties: e.properties.slice(),
      campaignTotalProps: this.totalProps,
      onClear: (st) => { if (LEVELS[i].final) Engine.setScene(new EndingScene(st)); else Engine.setScene(new StageClearScene(st)); },
      onGameOver: (st) => Engine.setScene(new GameOverScene(st)),
      onRestart: () => this.startStage(i),
      onQuit: () => Engine.setScene(new TitleScene()),
    };
    Engine.setScene(new GameScene(run));
  },
  advance(st) {
    // carry state forward to the next stage
    this.entry = { score: st.score, lives: st.lives, mikan: st.mikan, properties: st.properties, difficulty: st.difficulty };
    const next = st.stageIndex + 1;
    if (next >= LEVELS.length) Engine.setScene(new EndingScene(st));
    else this.startStage(next);
  },
  retry() { this.startStage(this.current); },
};

// helper used by several scenes
function wrapText(ctx, text, x, y, maxW, lh, centered) {
  let line = '', yy = y; const lines = [];
  for (const ch of text) { if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch; }
  if (line) lines.push(line);
  for (const l of lines) { ctx.fillText(l, x, yy); yy += lh; }
  return yy;
}

window.BootScene = BootScene; window.TitleScene = TitleScene; window.DifficultyScene = DifficultyScene;
window.StageClearScene = StageClearScene; window.GameOverScene = GameOverScene; window.EndingScene = EndingScene;
window.Campaign = Campaign; window.wrapText = wrapText; window.drawScenicBg = drawScenicBg;
