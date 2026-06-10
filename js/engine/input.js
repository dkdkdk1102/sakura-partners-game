/* input.js — unified input from keyboard, on-screen touch buttons, and gamepad.
   Exposes a stable action set the game polls each frame:
     left, right, down, jump (held), run (held), pause
   plus edge helpers pressed()/released() that consume a one-frame press. */

const Input = {
  state: { left: false, right: false, down: false, jump: false, run: false, pause: false, any: false },
  prev: {},
  _touch: { left: false, right: false, down: false, jump: false, run: false },
  hadGesture: false,
  onGesture: null,

  init() {
    const KEY = {
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowDown: 'down', KeyS: 'down',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', KeyJ: 'jump',
      Enter: 'jump', // Enter acts as "confirm" in menus (jump in-game is harmless)
      ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run', KeyK: 'run',
      Escape: 'pause', KeyP: 'pause',
    };
    addEventListener('keydown', (e) => {
      // don't swallow keys when a top-bar DOM button is focused (Enter/Space activate it)
      if (e.target && e.target.closest && e.target.closest('.topbar')) return;
      if (KEY[e.code]) { this._keys[KEY[e.code]] = true; this._gesture(); e.preventDefault(); }
    }, { passive: false });
    addEventListener('keyup', (e) => { if (KEY[e.code]) this._keys[KEY[e.code]] = false; });
    // lose focus -> release all so the player doesn't run off forever
    addEventListener('blur', () => { for (const k in this._keys) this._keys[k] = false; });

    this._keys = {};
    this._bindTouch();
    this._bindGamepad();
  },

  _gesture() {
    if (!this.hadGesture) { this.hadGesture = true; this.onGesture && this.onGesture(); }
  },

  _bindTouch() {
    const map = [
      ['btn-left', 'left'], ['btn-right', 'right'], ['btn-down', 'down'],
      ['btn-jump', 'jump'], ['btn-run', 'run'],
    ];
    const set = (act, val) => { this._touch[act] = val; if (val) this._gesture(); };
    map.forEach(([id, act]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const down = (e) => { set(act, true); el.classList.add('active'); e.preventDefault(); };
      const up = (e) => { set(act, false); el.classList.remove('active'); e.preventDefault(); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  },

  _bindGamepad() {
    this._pads = false;
    addEventListener('gamepadconnected', () => { this._pads = true; });
  },

  _pollGamepad() {
    if (!this._pads || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (const p of pads) {
      if (!p) continue;
      const a = p.axes[0] || 0;
      const b = p.buttons;
      return {
        left: a < -0.4 || (b[14] && b[14].pressed),
        right: a > 0.4 || (b[15] && b[15].pressed),
        down: (p.axes[1] || 0) > 0.4 || (b[13] && b[13].pressed),
        jump: (b[0] && b[0].pressed) || (b[1] && b[1].pressed),
        run: (b[2] && b[2].pressed) || (b[3] && b[3].pressed) ||
             (b[5] && b[5].pressed) || (b[7] && b[7].pressed),
        pause: b[9] && b[9].pressed,
      };
    }
    return null;
  },

  update() {
    this.prev = { ...this.state };
    const gp = this._pollGamepad();
    const k = this._keys, t = this._touch;
    const s = this.state;
    s.left = !!(k.left || t.left || (gp && gp.left));
    s.right = !!(k.right || t.right || (gp && gp.right));
    s.down = !!(k.down || t.down || (gp && gp.down));
    s.jump = !!(k.jump || t.jump || (gp && gp.jump));
    s.run = !!(k.run || t.run || (gp && gp.run));
    s.pause = !!(k.pause || t.pause || (gp && gp.pause));
    s.any = s.left || s.right || s.down || s.jump || s.run || s.pause;
    if (gp && (gp.left || gp.right || gp.jump || gp.run)) this._gesture();
  },

  pressed(act) { return this.state[act] && !this.prev[act]; },
  released(act) { return !this.state[act] && this.prev[act]; },
};

window.Input = Input;
