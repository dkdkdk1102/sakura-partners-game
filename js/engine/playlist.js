/* playlist.js — menu BGM from real MP3 files (window.MUSIC). Uses a single HTML5
   <audio> element: shuffles the tracks, plays one, and advances to the next when
   it ends (so short songs chain back-to-back, in random order). Needs a user
   gesture to begin (browser autoplay policy) and honors the mute / music toggles. */

const Playlist = {
  el: null, order: [], idx: 0, started: false, wanted: false, last: null,

  init() {
    if (this.el || !window.MUSIC || !window.MUSIC.length) return;
    const a = new Audio();
    a.preload = 'auto';
    a.addEventListener('ended', () => this._next());
    a.addEventListener('error', () => this._next()); // skip a missing/bad file
    this.el = a;
    this._reshuffle();
  },

  // Fisher–Yates shuffle; avoid immediately repeating the last-played track
  _reshuffle() {
    const list = (window.MUSIC || []).slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = list[i]; list[i] = list[j]; list[j] = t;
    }
    if (this.last && list.length > 1 && list[0] === this.last) {
      const t = list[0]; list[0] = list[1]; list[1] = t;
    }
    this.order = list; this.idx = 0;
  },

  // begin / ensure playback (idempotent) — call on a gesture or menu entry
  start() {
    this.init();
    if (!this.el) return;
    this.wanted = true;
    if (!this._playable()) { this.el.pause(); return; }
    if (!this.started || this.el.paused) this._play();
  },

  _play() {
    if (!this.order.length) this._reshuffle();
    const want = this.order[this.idx];
    if (!want) return;
    if (!this.el.src || !this.el.src.endsWith(want)) this.el.src = want;
    this.el.volume = 0.6;
    this.started = true; this.last = want;
    const p = this.el.play();
    if (p && p.catch) p.catch(() => {}); // autoplay blocked → retry on next gesture
  },

  _next() {
    this.idx++;
    if (this.idx >= this.order.length) this._reshuffle();
    if (this.wanted && this._playable()) this._play();
  },

  // stop for gameplay (the stages use the synth engine music instead)
  stop() { this.wanted = false; if (this.el) this.el.pause(); },

  // re-evaluate after a mute / music toggle
  refresh() {
    if (!this.el) return;
    if (this.wanted && this._playable()) { this.el.volume = 0.6; if (this.el.paused) this._play(); }
    else this.el.pause();
  },

  _playable() { return !(window.Audio2 && (Audio2.muted || Audio2.musicOn === false)); },
};

window.Playlist = Playlist;
