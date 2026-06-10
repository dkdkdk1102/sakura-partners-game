/* game.js — the gameplay scene. Owns the level, player, all entities, the camera,
   and the HUD; resolves every collision; and tracks run state (score / hearts /
   lives / mikan / properties). It exposes itself as window.GAME so entities can
   call back (addScore, loseHeart, spawnProjectile, …). Stage transitions are
   delegated to the callbacks passed in `run` (set by scenes.js). */

const DIFF = {
  easy:   { lives: 5, maxHearts: 4, label: 'やさしい' },
  normal: { lives: 3, maxHearts: 3, label: 'ノーマル' },
};

const NPC_FRAMES = {
  cat: ['npc_cat_0', 'npc_cat_1'], shiba: ['npc_shiba_0', 'npc_shiba_1', 'npc_shiba_2'],
  woman: ['npc_woman_0', 'npc_woman_1'], fisher: ['npc_fisher_0', 'npc_fisher_1'],
  child: ['npc_child'], lantern: ['prop_lantern'],
};

class GameScene {
  constructor(run) { this.run = run; }

  enter() {
    window.GAME = this;
    const def = LEVELS[this.run.stageIndex];
    this.def = def;
    const b = new LevelBuilder(def.cols, def.theme);
    def.build(b);
    this.map = b.map; this.theme = def.theme; this.bg = new Background(def.theme, def.backdrop);
    this.items = b.items.slice(); this.enemies = b.enemies.slice(); this.hazards = b.hazards.slice();
    this.springs = b.springs; this.checkpoints = b.checkpoints; this.npcs = b.npcs; this.signs = b.signs;
    this.bgDecor = b.bgDecor; this.fgDecor = b.fgDecor; this.projectiles = [];
    this.goal = b.goal ? new Goal(b.goal.x, b.goal.y, b.goal.type) : null;
    this.boss = b.boss ? new Boss(b.boss.type, b.boss.x, b.boss.y, b.boss.hp) : null;
    this.particles = new Particles();

    // run state
    const d = DIFF[this.run.difficulty] || DIFF.normal;
    this.maxHearts = d.maxHearts; this.hearts = d.maxHearts;
    this.lives = this.run.lives != null ? this.run.lives : d.lives;
    this.score = this.run.score || 0; this.mikan = this.run.mikan || 0;
    this.properties = this.run.properties ? this.run.properties.slice() : [];
    // HUD denominator = whole-journey property total (so missed ones still count)
    this.totalProperties = this.run.campaignTotalProps != null ? this.run.campaignTotalProps
      : this._countProperties(b) + this.properties.length;

    // player
    this.checkpoint = { x: b.start.x, y: b.start.y + TILE };
    this.player = new Player(b.start.x, b.start.y);
    this.cam = new Camera(); this.cam.setScreen(Engine.W, Engine.H);
    this.cam.setBounds(this.map.widthPx(), this.map.heightPx());
    this.cam.snap(this.player.cx, this.player.cy);

    this.state = 'play'; this.paused = false; this.clearT = 0; this.gameoverT = 0;
    this.bossCleared = false; this.bossClearTimer = 0; this.hitstop = 0;
    this.stageNum = this.run.stageIndex + 1; this.stageName = def.name; this.stageSub = def.sub;
    this.stageBannerT = 3; this.ambT = 0; this.flash = 0;
    this._buttons();

    Audio2.ensure();
    if (window.Playlist) Playlist.stop(); // menu MP3 playlist off during gameplay
    // normal theme until the player reaches the boss arena (boss music starts then)
    Audio2.playSong(SONGS[THEME_SONG[def.theme]] || SONGS.field);
  }
  exit() {
    Audio2.stopSong();
    // restore the ducked pause volume so the next scene's music isn't quiet
    if (Audio2.musicGain) Audio2.musicGain.gain.value = 0.28;
  }

  _countProperties(b) {
    let n = b.items.filter((it) => it instanceof Property).length;
    for (const blk of b.map.blocks.values()) if (blk instanceof QBlock && blk.contains === 'property') n += blk.count;
    return n;
  }

  _buttons() {
    this.pauseBtns = [
      new Button('つづける', 0, 0, 280, 64, { color: '#7fd6a0' }),
      new Button('ステージ最初から', 0, 0, 280, 60, { color: '#ffcf66', size: 22 }),
      new Button('タイトルへ', 0, 0, 280, 60, { color: '#ff9bb3', size: 22 }),
    ];
    this._layoutPauseBtns(Engine.W, Engine.H);
  }
  _layoutPauseBtns(W, H) {
    const cx = W / 2; let y = H * 0.42;
    this.pauseBtns[0].setCenter(cx, y); y += 84;
    this.pauseBtns[1].setCenter(cx, y); y += 76;
    this.pauseBtns[2].setCenter(cx, y);
  }
  handleResize(W, H) { if (this.cam) this.cam.setScreen(W, H); if (this.pauseBtns) this._layoutPauseBtns(W, H); }

  // ---- callbacks used by entities ---------------------------------------
  addScore(n, x, y) { this.score += n; if (x != null) this.particles.text(x, y, '+' + n, '#ffe9a8'); }
  addMikan(n) {
    this.mikan += n;
    while (this.mikan >= 100) { this.mikan -= 100; this.lives++; this.particles.text(this.player.cx, this.player.y - 30, '1UP!', '#7fe0a0'); Audio2.sfx('power'); }
  }
  loseHeart() { this.hearts = Math.max(0, this.hearts - 1); this.flash = 0.2; }
  healHeart() { if (this.hearts < this.maxHearts) { this.hearts++; this.particles.text(this.player.cx, this.player.y - 30, '+♥', '#ff8aa6'); } else this.addScore(200, this.player.cx, this.player.y - 30); }
  addHeart() { this.healHeart(); }
  addProperty(def) { this.properties.push(def); }
  spawnProperty(x, y) { this.items.push(new Property(x, y, randInt(0, PROPERTIES.length - 1))); }
  spawnProjectile(type, x, y, vx, vy) { this.projectiles.push(new Projectile(type, x, y, vx, vy)); }
  dust(x, y) { this.particles.landDust(x, y); }
  bubbleBurst(x, y) { this.particles.sparkle(x, y, 'fx_bubble', 6); }
  setCheckpoint(x, y) { this.checkpoint = { x, y }; }
  onHeadBump(player) {
    for (const c of player.headCells) {
      const blk = this.map.block(c.tx, c.ty);
      if (blk && blk.bumpFromBelow) blk.bumpFromBelow(player);
      else Audio2.sfx('bump');
    }
  }
  onReachGoal() {
    if (this.state !== 'play') return;
    this.state = 'cleared'; this.clearT = 0; this.player.win();
    Audio2.stopSong(); Audio2.sfx('clear');
    // tally bonuses
    this.clearBonus = { mikan: this.mikan, time: 0, lives: this.lives };
    this.particles.burst(this.player.cx, this.player.cy - 20);
  }
  onBossActivated(boss) {
    Audio2.playSong(SONGS.boss);
    HUD.showToast(`ボス「${boss.cfg.name}」とうじょう！`, '上から ふんづけて やっつけよう！', 4);
  }
  onBossDefeated() {
    this.bossCleared = true; this.bossClearTimer = 1.5;
    this.particles.text(this.player.cx, this.player.y - 50, 'やったー！', '#ffe066');
    Audio2.playSong(SONGS[THEME_SONG[this.theme]] || SONGS.field);
    const msg = this.def.final ? '右へすすんで、ゴールのお店から伊東に到着しよう！' : 'ゴールが開いた！この先のゴールへ進もう！';
    HUD.showToast('ボスをやっつけた！', msg, 6);
  }
  onPlayerDeath() {
    this.lives--;
    if (this.lives <= 0) { this.state = 'gameover'; this.gameoverT = 0; return; }
    // respawn at checkpoint; reset the (undefeated) boss so the fight restarts fair
    this.player = new Player(this.checkpoint.x, this.checkpoint.y - TILE);
    this.player.iframes = 1.6; this.hearts = this.maxHearts;
    this.cam.snap(this.player.cx, this.player.cy);
    if (this.boss && !this.bossCleared && this.boss.reset) this.boss.reset();
    this._goalHinted = false;
    Audio2.playSong(SONGS[THEME_SONG[this.theme]] || SONGS.field);
  }

  // ---- update ------------------------------------------------------------
  update(dt) {
    HUD.update(dt);
    if (this.flash > 0) this.flash -= dt;
    if (this.stageBannerT > 0) this.stageBannerT -= dt;

    if (this.paused) { this._pauseUpdate(); return; }
    if (Input.pressed('pause') && this.state === 'play') { this.togglePause(); return; }

    if (this.state === 'play') { this._snapshotPrev(); this._play(dt); }
    else if (this.state === 'cleared') { this._snapshotPrev(); this._clearedUpdate(dt); }
    else if (this.state === 'gameover') this._gameoverUpdate(dt);
  }

  // record positions before a physics step so render can interpolate between
  // the previous and current step (smooth motion at any refresh rate)
  _snapshotPrev() {
    const s = (o) => { if (o) { o.prevX = o.x; o.prevY = o.y; } };
    s(this.player);
    for (const e of this.enemies) s(e);
    for (const it of this.items) s(it);
    for (const pr of this.projectiles) s(pr);
    for (const h of this.hazards) s(h);
    s(this.boss);
    this.cam.prevX = this.cam.x; this.cam.prevY = this.cam.y;
  }
  // draw an object at its interpolated position, then restore (render reads x/y)
  _drawI(ctx, o, A, fn) {
    const ox = o.x, oy = o.y;
    if (o.prevX != null) { o.x = o.prevX + (ox - o.prevX) * A; o.y = o.prevY + (oy - o.prevY) * A; }
    fn();
    o.x = ox; o.y = oy;
  }

  togglePause() {
    if (this.state !== 'play') return;
    this.paused = !this.paused;
    if (this.paused) this._layoutPauseBtns(Engine.W, Engine.H);
    Audio2.sfx('pause');
    if (this.paused) Audio2.musicGain && (Audio2.musicGain.gain.value = 0.12);
    else Audio2.musicGain && (Audio2.musicGain.gain.value = 0.28);
  }
  _pauseUpdate() {
    if (Input.pressed('pause')) { this.togglePause(); return; }
    const tap = Pointer.consume();
    if (!tap) return;
    if (this.pauseBtns[0].contains(tap)) { this.togglePause(); }
    else if (this.pauseBtns[1].contains(tap)) { Audio2.sfx('confirm'); this.run.onRestart && this.run.onRestart(); }
    else if (this.pauseBtns[2].contains(tap)) { Audio2.sfx('confirm'); this.run.onQuit && this.run.onQuit(); }
  }

  _play(dt) {
    // brief hit-stop after a boss stomp: freeze the world a few frames for impact
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.bg.update(dt);
    this._ambiance(dt);
    const p = this.player;
    p.update(dt, this.map);

    for (const e of this.enemies) if (this._near(e, 1400)) e.update(dt, this.map);
    for (const it of this.items) it.update(dt, this.map);
    for (const h of this.hazards) h.update(dt, this.map);
    for (const pr of this.projectiles) pr.update(dt, this.map);
    for (const s of this.springs) s.update(dt);
    for (const c of this.checkpoints) c.update(dt);
    for (const blk of this.map.blocks.values()) blk.update && blk.update(dt);
    for (const n of this.npcs) n.t += dt;
    if (this.goal) this.goal.update(dt);
    if (this.boss) this.boss.update(dt, this.map);
    this.particles.update(dt);

    this._collisions();
    this._cleanup();

    // fall into a pit
    if (p.state === 'play' && p.y > this.map.heightPx() + 60) p.die();

    // boss defeated: the goal gate unlocks; the player walks right to it to arrive
    if (this.bossCleared && this.bossClearTimer > 0) this.bossClearTimer -= dt;

    this.cam.follow(p, dt);

    // landing dust — only on a genuine fall (gated by impact speed), so resting
    // or tiny steps never puff
    if (p.onGround && !p.wasOnGround && p.state === 'play' && p.landImpact > 420) this.particles.landDust(p.cx, p.bottom);
  }

  _near(e, d) { return Math.abs((e.cx != null ? e.cx : e.x) - this.player.cx) < d; }

  _ambiance(dt) {
    this.ambT -= dt;
    if (this.ambT > 0) return;
    this.ambT = 0.18;
    const amb = this.bg.th.ambiance;
    if (this.particles.items.length > 220) return;
    if (amb === 'petal') { const x = this.cam.x + rand(0, this.cam.viewW); this.particles.petal(x, this.cam.y - 20); }
    else if (amb === 'bubble') { const x = this.cam.x + rand(0, this.cam.viewW); this.particles.add(new Particle({ x, y: this.cam.y + this.cam.viewH + 10, vx: rand(-10, 10), vy: rand(-50, -90), sprite: 'fx_bubble', size: rand(10, 22), endSize: rand(8, 16), life: rand(2, 3.4), grav: 0, drag: 1 })); }
  }

  _collisions() {
    const p = this.player;
    if (p.state === 'dead') return;
    const pb = { x: p.x, y: p.y, w: p.w, h: p.h };

    // collectibles
    for (const it of this.items) {
      if (it.remove) continue;
      if (aabb(pb.x, pb.y, pb.w, pb.h, it.left, it.top, it.w, it.h)) {
        if (it instanceof Property) it.collect(); else it.collect(p);
      }
    }
    // springs
    for (const s of this.springs) {
      const a = s.aabb();
      if (p.vy > 0 && aabb(pb.x, pb.y, pb.w, pb.h, a.x, a.y, a.w, a.h) && p.bottom < a.y + a.h * 0.7) s.trigger(p);
    }
    // checkpoints
    for (const c of this.checkpoints) { const a = c.aabb(); if (!c.active && aabb(pb.x, pb.y, pb.w, pb.h, a.x, a.y, a.w, a.h)) c.trigger(p); }
    // signs (trivia)
    for (const sg of this.signs) {
      if (!sg.shown && Math.abs(p.cx - sg.x) < TILE * 1.1) {
        sg.shown = true;
        const f = (window.IZU_FACTS || []).find((x) => x.id === sg.factId);
        if (f) HUD.showToast(`${f.name}（${f.city}）`, f.trivia, 5);
      }
    }
    // enemies
    if (p.state === 'play') {
      // stomp test uses last frame's feet position so a max-speed fall (25px/step)
      // can't tunnel past the head zone and register as a side hit
      const prevBottom = p.bottom - Math.max(0, p.vy) * (1 / 60);
      for (const e of this.enemies) {
        if (e.defeated || e.remove) continue;
        if (!aabb(pb.x, pb.y, pb.w, pb.h, e.x, e.y, e.w, e.h)) continue;
        const stomp = p.vy > 40 && (prevBottom - e.y) < e.h * 0.6;
        if (stomp && e.stompable && !e.spiky) { e.defeat(true); p.doBounce(); this.particles.sparkle(e.cx, e.y, 'fx_star', 5); }
        else p.hurt(e.cx);
      }
      // hazards
      for (const h of this.hazards) {
        const a = h.hitbox(); if (!a) continue;
        if (aabb(pb.x, pb.y, pb.w, pb.h, a.x, a.y, a.w, a.h)) p.hurt(h.x);
      }
      // projectiles
      for (const pr of this.projectiles) {
        if (pr.remove) continue; const a = pr.aabb();
        if (aabb(pb.x, pb.y, pb.w, pb.h, a.x, a.y, a.w, a.h)) { pr.remove = true; p.hurt(pr.x); }
      }
      // boss (only once it has woken up)
      if (this.boss && this.boss.armed && this.boss.state !== 'dead' && aabb(pb.x, pb.y, pb.w, pb.h, this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
        const stomp = p.vy > 40 && (prevBottom - this.boss.y) < this.boss.h * 0.55;
        if (stomp) this.boss.onStomp(p);
        // while the boss reels from a stomp (iframes), contact is harmless —
        // otherwise the player still overlapping on the bounce-up took damage
        else if (this.boss.iframes <= 0) p.hurt(this.boss.cx);
      }
      // goal — locked until the stage boss is defeated
      if (this.goal) {
        const a = this.goal.aabb();
        if (aabb(pb.x, pb.y, pb.w, pb.h, a.x, a.y, a.w, a.h)) {
          if (!this.boss || this.bossCleared) this.onReachGoal();
          else if (!this._goalHinted) { this._goalHinted = true; HUD.showToast('ゴールは閉じている', 'ボスをやっつけると開くよ！', 3); }
        }
      }
    }
  }

  _cleanup() {
    this.items = this.items.filter((it) => !it.remove);
    this.enemies = this.enemies.filter((e) => !e.remove);
    this.hazards = this.hazards.filter((h) => !h.remove);
    this.projectiles = this.projectiles.filter((p) => !p.remove);
    if (this.boss && this.boss.remove) this.boss = null;
  }

  _clearedUpdate(dt) {
    this.clearT += dt;
    this.bg.update(dt);
    this.player.update(dt, this.map);
    this.particles.update(dt);
    this.cam.follow(this.player, dt);
    if (this.clearT > 0.4 && Math.random() < 0.25) this.particles.sparkle(this.player.cx + rand(-120, 120), this.player.cy - rand(0, 120), 'fx_star', 2);
    const tap = Pointer.consume();
    if (this.clearT > 1.4 && (tap || Input.pressed('jump') || Input.pressed('pause'))) {
      this.run.onClear && this.run.onClear(this._runState());
    }
  }
  _gameoverUpdate(dt) {
    this.gameoverT += dt;
    this.particles.update(dt);
    const tap = Pointer.consume();
    if (this.gameoverT > 1.2 && (tap || Input.pressed('jump') || Input.pressed('pause'))) {
      this.run.onGameOver && this.run.onGameOver(this._runState());
    }
  }
  _runState() {
    return { score: this.score, lives: this.lives, mikan: this.mikan, properties: this.properties, difficulty: this.run.difficulty, stageIndex: this.run.stageIndex };
  }

  // ---- render ------------------------------------------------------------
  render(ctx) {
    const W = Engine.W, H = Engine.H;
    const A = Engine.alpha != null ? Engine.alpha : 1;
    const cam = this.cam;
    // interpolate the camera between steps so the whole world scrolls smoothly
    const crx = cam.x, cry = cam.y;
    if (cam.prevX != null) { cam.x = cam.prevX + (crx - cam.prevX) * A; cam.y = cam.prevY + (cry - cam.prevY) * A; }

    this.bg.render(ctx, cam, W, H);

    ctx.save();
    cam.apply(ctx);
    for (const d of this.bgDecor) if (this._inView(d.x, 400)) this._decor(ctx, d);
    this.map.render(ctx, cam);
    for (const blk of this.map.blocks.values()) { const wx = blk.x; if (this._inView(wx, 200)) blk.render(ctx); }
    for (const s of this.springs) if (this._inView(s.x, 200)) s.render(ctx);
    for (const c of this.checkpoints) if (this._inView(c.x, 300)) c.render(ctx);
    for (const n of this.npcs) if (this._inView(n.x, 300)) this._npc(ctx, n);
    for (const it of this.items) if (this._inView(it.x, 200)) this._drawI(ctx, it, A, () => it.render(ctx));
    for (const h of this.hazards) if (this._inView(h.x, 200)) this._drawI(ctx, h, A, () => h.render(ctx));
    if (this.goal) this.goal.render(ctx);
    for (const e of this.enemies) if (this._inView(e.cx, 200)) this._drawI(ctx, e, A, () => e.render(ctx));
    if (this.boss) this._drawI(ctx, this.boss, A, () => this.boss.render(ctx));
    for (const pr of this.projectiles) this._drawI(ctx, pr, A, () => pr.render(ctx));
    this._drawI(ctx, this.player, A, () => this.player.render(ctx));
    this.particles.render(ctx);
    for (const d of this.fgDecor) if (this._inView(d.x, 400)) this._decor(ctx, d);
    this.particles.renderText(ctx, this.cam);
    ctx.restore();
    cam.x = crx; cam.y = cry; // restore real camera position for next step's logic

    if (this.flash > 0) { ctx.save(); ctx.globalAlpha = this.flash; ctx.fillStyle = '#ff5a6e'; ctx.fillRect(0, 0, W, H); ctx.restore(); }

    HUD.render(ctx, W, H, this);

    // attract-mode banner (gentle sine pulse, no strobe)
    if (this.run && this.run.demo) {
      const a = 0.75 + 0.18 * Math.sin(Engine.time * 2.2);
      ctx.save(); ctx.textAlign = 'center';
      ctx.font = `900 ${Math.min(34, W * 0.045)}px ${FONT}`;
      ctx.lineWidth = 8; ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      ctx.strokeText('▶ デモプレイちゅう — タッチして あそぶ！', W / 2, H * 0.88);
      ctx.fillStyle = `rgba(230,60,110,${a.toFixed(2)})`;
      ctx.fillText('▶ デモプレイちゅう — タッチして あそぶ！', W / 2, H * 0.88);
      ctx.restore();
    }

    if (this.paused) this._renderPause(ctx, W, H);
    else if (this.state === 'cleared') this._renderClear(ctx, W, H);
    else if (this.state === 'gameover') this._renderGameOver(ctx, W, H);
  }

  _inView(wx, m) { return wx > this.cam.x - m && wx < this.cam.x + this.cam.viewW + m; }
  _decor(ctx, d) {
    const meta = Assets.size(d.name);
    drawSprite(ctx, d.name, d.x, d.y, { w: meta.w * d.scale, h: meta.h * d.scale, ax: d.ax, ay: d.ay, alpha: d.alpha });
  }
  _npc(ctx, n) {
    const fr = NPC_FRAMES[n.type] || NPC_FRAMES.cat;
    const name = fr[Math.floor(n.t * 2.2) % fr.length];
    const meta = Assets.size(name); const h = 58; const w = h * (meta.w / meta.h);
    const bob = Math.sin(n.t * 2) * 3;
    drawSprite(ctx, name, n.x, n.y + bob, { w, h, ax: 0.5, ay: 1, flip: n.dir > 0 });
  }

  _overlay(ctx, W, H, a = 0.55) { ctx.fillStyle = `rgba(20,16,32,${a})`; ctx.fillRect(0, 0, W, H); }
  _renderPause(ctx, W, H) {
    this._overlay(ctx, W, H, 0.6);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `800 ${44}px ${FONT}`;
    ctx.fillText('ポーズ', W / 2, H * 0.26);
    for (const btn of this.pauseBtns) btn.draw(ctx);
  }
  _renderClear(ctx, W, H) {
    this._overlay(ctx, W, H, clamp(this.clearT * 0.5, 0, 0.5));
    if (this.clearT < 0.6) return;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe066'; ctx.font = `800 ${52}px ${FONT}`;
    ctx.fillText('クリア！', W / 2, H * 0.4);
    ctx.fillStyle = '#fff'; ctx.font = `700 ${24}px ${FONT}`;
    ctx.fillText(`${this.stageName} を こえた！`, W / 2, H * 0.5);
    { const pa = (0.65 + 0.2 * Math.sin(this.clearT * 2.5)).toFixed(2); ctx.font = `600 ${18}px ${FONT}`; ctx.fillStyle = `rgba(255,255,255,${pa})`; ctx.fillText('タップ / ジャンプで つぎへ', W / 2, H * 0.62); }
  }
  _renderGameOver(ctx, W, H) {
    this._overlay(ctx, W, H, clamp(this.gameoverT * 0.6, 0, 0.7));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8ba0'; ctx.font = `800 ${50}px ${FONT}`;
    ctx.fillText('ゲームオーバー', W / 2, H * 0.42);
    if (this.gameoverT > 1) { const pa = (0.65 + 0.2 * Math.sin(this.gameoverT * 2.5)).toFixed(2); ctx.font = `600 ${18}px ${FONT}`; ctx.fillStyle = `rgba(255,255,255,${pa})`; ctx.fillText('タップ / ジャンプ で つづける', W / 2, H * 0.56); }
  }
}

window.GameScene = GameScene; window.DIFF = DIFF;
