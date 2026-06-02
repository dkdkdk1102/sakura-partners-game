/* player.js — the pink rabbit. Tight platformer feel: separate walk/run speeds,
   variable-height jump, coyote time, jump buffering, stomp bounce, i-frames after
   a hit. Health is heart-based (no size powerup exists in the art); losing all
   hearts costs a life and respawns at the last checkpoint. Frame indices map to
   the sliced player_XX sprites verified earlier. */

const PLAYER_ANIM = {
  idle:   { frames: ['player_00', 'player_01', 'player_02'], fps: 3.5 },
  walk:   { frames: ['player_03', 'player_04', 'player_06', 'player_07'], fps: 10 },
  run:    { frames: ['player_10', 'player_11', 'player_12', 'player_13'], fps: 15 },
  jump:   { frames: ['player_15'], fps: 1 },
  fall:   { frames: ['player_22'], fps: 1 },
  crouch: { frames: ['player_16'], fps: 1 },
  skid:   { frames: ['player_17'], fps: 1 },
  hurt:   { frames: ['player_18'], fps: 1 },
  ko:     { frames: ['player_19'], fps: 1 },
  cheer:  { frames: ['player_20', 'player_21'], fps: 3 },
};

class Player extends Entity {
  constructor(x, y) {
    super(x, y, 36, 54);
    this.anim = new Animator(PLAYER_ANIM);
    this.anim.play('idle');
    this.facing = 1;
    this.walkSpeed = 232; this.runSpeed = 384;
    this.accel = 2600; this.airAccel = 1700; this.friction = 2400;
    this.jumpVel = 940; this.gravity = 2600; this.maxFall = 1500;
    this.coyote = 0; this.buffer = 0; this.jumpHeld = false; this.jumping = false;
    this.crouching = false;
    this.iframes = 0;       // invincibility timer after a hit
    this.hurtLock = 0;      // brief control lock + knockback
    this.state = 'play';    // play | hurt | dead | win
    this.spriteH = 92;      // drawn height in world px
    this.winT = 0;
  }

  hearts() { return GAME.hearts; }

  update(dt, map) {
    if (this.state === 'dead') { this._dead(dt, map); return; }
    if (this.state === 'win') { this._win(dt, map); return; }

    const In = Input.state;
    if (this.iframes > 0) this.iframes -= dt;
    let ctrl = this.hurtLock <= 0;
    if (this.hurtLock > 0) this.hurtLock -= dt;

    // ---- horizontal ----
    let dir = 0;
    if (ctrl) { if (In.left) dir -= 1; if (In.right) dir += 1; }
    this.crouching = ctrl && In.down && this.onGround;
    const wantRun = ctrl && In.run && !this.crouching;
    const top = wantRun ? this.runSpeed : this.walkSpeed;
    const target = this.crouching ? 0 : dir * top;
    // during the brief hurt lock, decay slowly so knockback isn't instantly cancelled
    const a = !ctrl ? 600 : (this.onGround ? (dir !== 0 ? this.accel : this.friction) : this.airAccel);
    this.vx = approach(this.vx, target, a * dt);
    if (ctrl && dir !== 0) this.facing = dir;

    // ---- drop through one-way platform ----
    if (ctrl && In.down && this.onGround && Input.pressed('jump')) {
      this.dropTimer = 0.16; this.onGround = false; this.coyote = 0; this.buffer = 0;
    }

    // ---- jump (coyote + buffer + variable height) ----
    this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
    if (ctrl && Input.pressed('jump')) this.buffer = 0.12; else this.buffer = Math.max(0, this.buffer - dt);
    if (this.buffer > 0 && this.coyote > 0 && !this.crouching) {
      this.vy = -this.jumpVel; this.jumping = true; this.coyote = 0; this.buffer = 0;
      this.onGround = false;
      GAME.dust(this.cx, this.bottom);
      Audio2.sfx('jump');
    }
    if (this.jumping && !In.jump && this.vy < 0) { this.vy *= 0.42; this.jumping = false; } // variable jump
    if (this.vy >= 0) this.jumping = false;

    this.applyGravity(dt, this.vy < 0 && In.jump ? 0.82 : 1); // floatier on the way up while held
    this.moveAndCollide(map, dt);

    if (this.hitCeiling) GAME.onHeadBump(this);

    this._animate();
    this.anim.update(dt);
  }

  _animate() {
    if (this.iframes > 0 && this.hurtLock > 0) { this.anim.play('hurt'); return; }
    if (!this.onGround) { this.anim.play(this.vy < -40 ? 'jump' : 'fall'); return; }
    if (this.crouching) { this.anim.play('crouch'); return; }
    const spd = Math.abs(this.vx);
    if (spd < 12) this.anim.play('idle');
    else if (this.vx * this.facing < -20) this.anim.play('skid'); // pressing opposite to motion
    else this.anim.play(spd > this.walkSpeed + 30 ? 'run' : 'walk');
  }

  // bounce after stomping an enemy / boss
  doBounce() { this.vy = -this.jumpVel * 0.8; this.jumping = true; }

  canStomp() { return this.vy > 60 && !this.onGround; }

  hurt(fromX) {
    if (this.iframes > 0 || this.state !== 'play') return false;
    GAME.loseHeart();
    if (GAME.hearts <= 0) { this.die(); return true; }
    this.iframes = 1.4; this.hurtLock = 0.45;
    const kx = fromX != null ? sign(this.cx - fromX) : -this.facing;
    this.vx = kx * 260; this.vy = -380;
    Audio2.sfx('hurt');
    GAME.cam.shake(8, 0.25);
    return true;
  }

  die() {
    if (this.state === 'dead') return;
    this.state = 'dead'; this.vx = 0; this.vy = -640; this.deadT = 0;
    this.anim.play('ko');
    Audio2.sfx('die');
    Audio2.stopSong();
  }
  _dead(dt) {
    this.deadT += dt;
    this.vy = Math.min(this.vy + this.gravity * dt, this.maxFall);
    this.y += this.vy * dt;
    this.anim.update(dt);
    if (this.deadT > 1.4) GAME.onPlayerDeath();
  }

  win() {
    if (this.state === 'win') return;
    this.state = 'win'; this.vx = 0; this.winT = 0; this.anim.play('cheer');
  }
  _win(dt, map) {
    this.winT += dt;
    this.vx = approach(this.vx, 0, this.friction * dt);
    this.applyGravity(dt);
    this.moveAndCollide(map, dt);
    this.anim.update(dt);
  }

  render(ctx) {
    const blink = this.iframes > 0 && Math.floor(this.iframes * 20) % 2 === 0;
    if (blink) return;
    const name = this.anim.frame();
    if (!name) return;
    const meta = Assets.size(name);
    const h = this.spriteH * (this.crouching ? 0.82 : 1);
    const w = h * (meta.w / meta.h);
    drawSprite(ctx, name, this.cx, this.bottom + 2, { w, h, flip: this.facing < 0, ax: 0.5, ay: 1 });
  }
}

window.Player = Player;
