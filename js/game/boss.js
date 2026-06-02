/* boss.js — one region-themed boss per stage. Config-driven so the same class
   covers ground chargers (tanuki/boar/crab), a stationary shooter (octopus), and
   flying divers (cloud/gull). All are beaten by stomping the head; each hit grants
   brief invulnerability and ramps the boss up. The boss stays dormant until the
   player enters its arena (armed), at which point boss music kicks in and the
   stage goal stays locked until it falls. */

const BOSS_CFG = {
  // ---- ground chargers ----
  tanuki: { frames: ['tanuki_run', 'tanuki_stand'], w: 60, h: 60, spriteH: 84, name: 'おおだぬき',
            mode: 'ground', speed: 86, chargeMul: 2.1, attack: 'none', jumps: true, hp: 2, tint: '#c98a4a' },
  boar:   { frames: ['boar_0', 'boar_1', 'boar_2'], w: 84, h: 58, spriteH: 76, name: '天城の猪王',
            mode: 'ground', speed: 104, chargeMul: 2.9, attack: 'none', hp: 3, tint: '#8a5a3a' },
  crab:   { frames: ['boss_crab_0', 'boss_crab_1'], w: 92, h: 64, spriteH: 88, name: 'カニ大将',
            mode: 'ground', speed: 82, chargeMul: 2.4, attack: 'bubble', hp: 4, crowned: true },
  urchin: { frames: ['boss_urchin_0', 'boss_urchin_1'], w: 84, h: 72, spriteH: 92, name: 'ウニ大魔王',
            mode: 'ground', speed: 70, chargeMul: 2.2, attack: 'bubble', hp: 4, crowned: true },
  // ---- stationary shooter ----
  octopus:{ frames: ['octo_0', 'octo_1', 'octo_2', 'octo_3'], w: 70, h: 60, spriteH: 76, name: 'おおダコ',
            mode: 'shooter', speed: 46, attack: 'ink', hp: 3, tint: '#cc4444' },
  // ---- flying divers ----
  cloud:  { frames: ['cloud_0', 'cloud_1', 'cloud_angry'], w: 74, h: 56, spriteH: 70, name: 'さくら雲の主',
            mode: 'fly', speed: 95, attack: 'none', amp: 2.4, freq: 1.1, hp: 3, tint: '#e9d6ff' },
  gull:   { frames: ['gull_0', 'gull_1', 'gull_2'], w: 78, h: 52, spriteH: 60, name: '大ガラス',
            mode: 'fly', speed: 150, attack: 'none', amp: 2.8, freq: 1.5, hp: 3, tint: '#c8d2e0' },
};

class Boss extends Entity {
  constructor(type, x, y, hp) {
    const c = BOSS_CFG[type] || BOSS_CFG.crab;
    super(x - c.w / 2, y - c.h, c.w, c.h);
    this.type = type; this.cfg = c; this.spriteH = c.spriteH;
    this.maxHp = hp || c.hp || 3; this.hp = this.maxHp;
    this.dir = -1; this.facing = -1; this.t = 0;
    this.iframes = 0; this.state = 'active'; this.deadT = 0;
    this.shootT = rand(1.4, 2.4); this.chargeT = rand(2, 3); this.charging = false;
    this.gravity = 2400;
    this.anim = new Animator({ move: { frames: c.frames, fps: 5 } }); this.anim.play('move');
    this.intro = 0; this.armed = false;
    this.groundY = y;                 // arena floor (px)
    this.hopT = rand(0.8, 1.6);
    if (c.mode === 'fly') {
      this.baseY = y - (3.4 * TILE);  // hover altitude (AABB top)
      this.y = this.baseY;
    }
    this.spawnX = this.x; this.spawnY = this.y;
  }
  // restore for a fair re-fight after the player dies (boss not yet defeated)
  reset() {
    this.hp = this.maxHp; this.armed = false; this.intro = 0; this.state = 'active';
    this.iframes = 0; this.charging = false; this.dir = -1; this.facing = -1;
    this.vx = 0; this.vy = 0; this.x = this.spawnX; this.y = this.spawnY;
    this.shootT = rand(1.4, 2.4); this.chargeT = rand(2, 3); this.hopT = rand(0.8, 1.6);
  }
  baseSpeed() { return this.cfg.speed + (this.maxHp - this.hp) * 22; }
  activateRange() { return (GAME.cam ? GAME.cam.viewW : 800) * 0.55; }

  update(dt, map) {
    this.t += dt;
    if (this.state === 'dead') { this._dead(dt); return; }

    // dormant until the player enters the arena
    if (!this.armed) {
      const p = GAME.player;
      if (p && Math.abs(p.cx - this.cx) < this.activateRange()) {
        this.armed = true; this.intro = 1.1; GAME.onBossActivated(this);
      } else {
        if (this.cfg.mode === 'fly') this.y = this.baseY + Math.sin(this.t * 1.5) * 10;
        else { this.applyGravity(dt); this.moveAndCollide(map, dt); }
        this.anim.update(dt);
        return;
      }
    }

    if (this.intro > 0) {
      this.intro -= dt; this.vx = 0;
      if (this.cfg.mode !== 'fly') { this.applyGravity(dt); this.moveAndCollide(map, dt); }
      this.anim.update(dt); return;
    }
    if (this.iframes > 0) this.iframes -= dt;

    const p = GAME.player;
    if (p && p.state === 'play') this.dir = sign(p.cx - this.cx) || this.dir;
    this.facing = this.dir;

    if (this.cfg.mode === 'fly') this._fly(dt, p);
    else if (this.cfg.mode === 'shooter') this._shooter(dt, map, p);
    else this._ground(dt, map, p);

    this._attack(dt, p);
    this.anim.update(dt);
  }

  _ground(dt, map, p) {
    this.chargeT -= dt;
    if (this.chargeT <= 0) { this.charging = true; this.chargeEnd = this.t + 0.9; this.chargeT = rand(2.4, 3.6); }
    if (this.charging && this.t > this.chargeEnd) this.charging = false;
    const speed = this.charging ? this.baseSpeed() * (this.cfg.chargeMul || 2.2) : this.baseSpeed();
    this.vx = this.dir * speed;
    if (this.hitWall) this.dir *= -1;
    if (this.onGround) {
      const aheadX = this.dir > 0 ? this.right + 2 : this.x - 2;
      const tx = Math.floor(aheadX / TILE), ty = Math.floor((this.bottom + 4) / TILE);
      if (!map.isSolid(tx, ty)) this.dir *= -1;
    }
    // periodic hop (tanuki)
    if (this.cfg.jumps) {
      this.hopT -= dt;
      if (this.hopT <= 0 && this.onGround) { this.vy = -780; this.hopT = rand(1.0, 1.8); }
    }
    this.applyGravity(dt); this.moveAndCollide(map, dt);
    if (this.charging && this.onGround && Math.random() < 0.4) GAME.particles.dust(this.cx - this.dir * 30, this.bottom);
    this.anim.clips.move.fps = this.charging ? 12 : 6;
  }

  _shooter(dt, map, p) {
    // mostly holds ground, shuffles slightly toward the player
    this.vx = this.dir * this.cfg.speed * 0.5;
    if (this.hitWall) this.dir *= -1;
    if (this.onGround) {
      const aheadX = this.dir > 0 ? this.right + 2 : this.x - 2;
      const tx = Math.floor(aheadX / TILE), ty = Math.floor((this.bottom + 4) / TILE);
      if (!map.isSolid(tx, ty)) this.dir *= -1;
    }
    this.applyGravity(dt); this.moveAndCollide(map, dt);
    this.anim.clips.move.fps = 6;
  }

  _fly(dt, p) {
    const c = this.cfg;
    const targetX = p ? p.cx : this.cx;
    const sp = this.baseSpeed();
    this.x = approach(this.x + this.w / 2, targetX, sp * dt) - this.w / 2;
    // bob low enough to be stomped, high enough to threaten
    const lowLimit = this.groundY - this.h - TILE * 0.6;
    let y = this.baseY + Math.sin(this.t * c.freq) * (c.amp * TILE);
    this.y = Math.min(y, lowLimit);
    this.anim.clips.move.fps = 8;
  }

  _attack(dt, p) {
    if (this.cfg.attack === 'none' || !p) return;
    this.shootT -= dt;
    if (this.shootT > 0) return;
    if (this.cfg.attack === 'bubble') {
      this.shootT = rand(1.6, 2.6) - (this.maxHp - this.hp) * 0.2;
      const n = this.hp <= 1 ? 3 : 2;
      for (let i = 0; i < n; i++) GAME.spawnProjectile('bubble', this.cx, this.y + 8, this.facing * rand(120, 200), -260 - i * 60);
      Audio2.sfx('boss');
    } else if (this.cfg.attack === 'ink') {
      this.shootT = rand(1.3, 2.1);
      if (Math.abs(p.cy - this.cy) < TILE * 4) {
        GAME.spawnProjectile('ink', this.cx, this.cy - 6, this.facing * 250, -150);
        Audio2.sfx('ink');
      }
    }
  }

  onStomp(player) {
    if (!this.armed || this.intro > 0) { player.doBounce(); return; } // safe during the entrance
    if (this.state !== 'active') { player.doBounce(); return; }
    if (this.iframes > 0) { player.doBounce(); return; }
    this.hp--; this.iframes = 1.3; player.doBounce();
    GAME.cam.shake(12, 0.4); GAME.particles.burst(this.cx, this.y);
    GAME.addScore(1500, this.cx, this.y - 30);
    Audio2.sfx('boss'); GAME.bubbleBurst(this.cx, this.cy);
    if (this.hp <= 0) this.die();
  }
  die() {
    this.state = 'dead'; this.deadT = 0; this.vy = -520; this.vx = this.facing * -120;
    GAME.addScore(5000, this.cx, this.y - 40);
    Audio2.sfx('clear');
    GAME.onBossDefeated(this);
  }
  _dead(dt) {
    this.deadT += dt; this.vy += 1600 * dt; this.y += this.vy * dt; this.x += this.vx * dt;
    this.spin = (this.spin || 0) + dt * 6;
    if (this.deadT > 0.4 && Math.random() < 0.4) GAME.particles.sparkle(this.cx + rand(-30, 30), this.cy + rand(-20, 20), 'fx_star', 2);
    if (this.deadT > 2.2) this.remove = true;
  }

  render(ctx) {
    // boss aura so scaled-up critters read as bosses
    if (this.armed && this.state !== 'dead' && !this.cfg.crowned) {
      const r = this.spriteH * 0.6 * (1 + Math.sin(this.t * 4) * 0.05);
      const g = ctx.createRadialGradient(this.cx, this.bottom - this.spriteH * 0.4, r * 0.2, this.cx, this.bottom - this.spriteH * 0.4, r);
      g.addColorStop(0, 'rgba(255,90,120,0.22)'); g.addColorStop(1, 'rgba(255,90,120,0)');
      ctx.save(); ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(this.cx, this.bottom - this.spriteH * 0.4, r, 0, 6.29); ctx.fill(); ctx.restore();
    }
    const flash = this.iframes > 0 && Math.floor(this.iframes * 12) % 2 === 0;
    const name = this.anim.frame();
    const meta = Assets.size(name); const h = this.spriteH; const w = h * (meta.w / meta.h);
    const rot = this.state === 'dead' ? (this.spin || 0) : 0;
    drawSprite(ctx, name, this.cx, this.bottom + 3, { w, h, flip: this.facing > 0, ax: 0.5, ay: 1, rot, alpha: flash ? 0.4 : 1 });
    // a little crown for non-crowned bosses
    if (this.armed && this.state !== 'dead' && !this.cfg.crowned) {
      drawSprite(ctx, 'fx_star', this.cx, this.bottom - h + 4, { w: 22, h: 22, ax: 0.5, ay: 0.5, alpha: 0.9 });
    }
    if (this.armed && this.state !== 'dead' && this.intro <= 0) this._hpbar(ctx);
  }
  _hpbar(ctx) {
    const w = 96, x = this.cx - w / 2, y = this.bottom - this.spriteH - 16;
    ctx.save();
    ctx.fillStyle = 'rgba(20,16,30,0.7)'; ctx.fillRect(x - 2, y - 2, w + 4, 12);
    for (let i = 0; i < this.maxHp; i++) {
      ctx.fillStyle = i < this.hp ? '#ff6b8a' : '#5a4a55';
      ctx.fillRect(x + i * (w / this.maxHp) + 1, y, w / this.maxHp - 2, 8);
    }
    ctx.restore();
  }
}

window.Boss = Boss; window.BOSS_CFG = BOSS_CFG;
