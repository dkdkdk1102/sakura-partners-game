/* core.js — canvas setup, DPR-aware resize, fixed-timestep loop, scene manager.
   A "scene" is any object with optional enter()/update(dt)/render(ctx)/exit()/
   handleResize(). Engine.setScene swaps them. dt is fixed at 1/60s; the loop
   accumulates real time so physics stay deterministic regardless of refresh rate. */

const Engine = {
  canvas: null, ctx: null,
  W: 960, H: 540, dpr: 1,
  scene: null, _next: null,
  _acc: 0, _last: 0, _raf: 0,
  DT: 1 / 60, MAX_FRAME: 0.1,
  time: 0, paused: false,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    this.resize();
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(240, window.innerHeight);
    this.dpr = dpr; this.W = w; this.H = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    if (this.scene && this.scene.handleResize) this.scene.handleResize(w, h);
  },

  setScene(scene) { this._next = scene; },

  _swap() {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.scene = this._next; this._next = null;
    if (this.scene.enter) this.scene.enter();
    if (this.scene.handleResize) this.scene.handleResize(this.W, this.H);
  },

  _frame(now) {
    this._raf = requestAnimationFrame((t) => this._frame(t));
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > this.MAX_FRAME) dt = this.MAX_FRAME; // clamp after tab-out/lag
    if (this._next) this._swap();

    this._acc += dt;
    let steps = 0;
    while (this._acc >= this.DT && steps < 5) {
      this.time += this.DT;
      Input.update(); // refresh edge state per step so pressed() is never dropped on high-Hz displays
      if (this.scene && this.scene.update) this.scene.update(this.DT);
      this._acc -= this.DT;
      steps++;
    }
    if (steps === 5) this._acc = 0; // avoid spiral of death
    if (steps === 0) Input.update(); // keep input fresh on sub-step frames (menus poll every frame)

    // interpolation factor for smooth rendering between fixed steps (0..1)
    this.alpha = clamp(this._acc / this.DT, 0, 1);

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    // 'medium' keeps mip-filtered downscaling (no shimmer) at a fraction of the
    // cost of 'high'; the backdrop is pre-resampled at 'high' into its cache
    ctx.imageSmoothingQuality = 'medium';
    if (this.scene && this.scene.render) this.scene.render(ctx);
  },
};

window.Engine = Engine;
