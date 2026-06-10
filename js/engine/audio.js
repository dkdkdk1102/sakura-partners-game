/* audio.js — all sound is synthesized with WebAudio, so the game needs no audio
   files. SFX are short enveloped tones; BGM is a tiny step-sequencer (lead+bass)
   that loops. The context is created/resumed on the first user gesture to satisfy
   browser autoplay policies. */

const Audio2 = {
  ctx: null, master: null, sfxGain: null, musicGain: null,
  muted: false, musicOn: true,
  _timer: null, _step: 0, _nextTime: 0, _song: null,

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.55; this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.28; this.musicGain.connect(this.master);
  },

  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  // generic enveloped oscillator note
  tone({ freq, dur = 0.15, type = 'square', vol = 0.5, attack = 0.005, slideTo = null, dest = null, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(dest || this.sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },

  noise({ dur = 0.2, vol = 0.4, hp = 600, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  },

  // ---- named SFX --------------------------------------------------------
  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump':   this.tone({ freq: 380, slideTo: 720, dur: 0.18, type: 'square', vol: 0.4 }); break;
      case 'bigjump':this.tone({ freq: 320, slideTo: 880, dur: 0.26, type: 'square', vol: 0.45 }); break;
      case 'coin':   this.tone({ freq: 988, dur: 0.08, type: 'square', vol: 0.4 });
                     this.tone({ freq: 1319, dur: 0.14, type: 'square', vol: 0.4, when: 0.07 }); break;
      case 'mikan':  this.tone({ freq: 784, dur: 0.07, type: 'triangle', vol: 0.45 });
                     this.tone({ freq: 1175, dur: 0.12, type: 'triangle', vol: 0.4, when: 0.06 }); break;
      case 'stomp':  this.tone({ freq: 220, slideTo: 90, dur: 0.14, type: 'square', vol: 0.45 });
                     this.noise({ dur: 0.1, vol: 0.25, hp: 400 }); break;
      case 'bump':   this.tone({ freq: 160, slideTo: 110, dur: 0.1, type: 'square', vol: 0.35 }); break;
      case 'spring': this.tone({ freq: 300, slideTo: 1200, dur: 0.3, type: 'sine', vol: 0.4 }); break;
      case 'power':  [0, 0.08, 0.16, 0.24].forEach((w, i) =>
                       this.tone({ freq: this.midi(67 + i * 4), dur: 0.12, type: 'square', vol: 0.4, when: w })); break;
      case 'house':  [0, 0.09, 0.18].forEach((w, i) =>
                       this.tone({ freq: this.midi(72 + i * 5), dur: 0.16, type: 'triangle', vol: 0.45, when: w })); break;
      case 'hurt':   this.tone({ freq: 440, slideTo: 130, dur: 0.4, type: 'sawtooth', vol: 0.4 });
                     this.noise({ dur: 0.25, vol: 0.2, hp: 300 }); break;
      case 'die':    [69, 65, 62, 57].forEach((m, i) =>
                       this.tone({ freq: this.midi(m), dur: 0.22, type: 'square', vol: 0.4, when: i * 0.16 })); break;
      case 'select': this.tone({ freq: 660, dur: 0.06, type: 'square', vol: 0.35 }); break;
      case 'confirm':this.tone({ freq: 660, dur: 0.07, type: 'square', vol: 0.4 });
                     this.tone({ freq: 990, dur: 0.12, type: 'square', vol: 0.4, when: 0.07 }); break;
      case 'pause':  this.tone({ freq: 520, dur: 0.08, type: 'sine', vol: 0.35 }); break;
      case 'ink':    this.tone({ freq: 200, slideTo: 80, dur: 0.22, type: 'sawtooth', vol: 0.3 }); break;
      case 'splash': this.noise({ dur: 0.3, vol: 0.3, hp: 800 }); break;
      case 'boss':   this.tone({ freq: 110, slideTo: 70, dur: 0.5, type: 'sawtooth', vol: 0.45 });
                     this.noise({ dur: 0.3, vol: 0.25, hp: 200 }); break;
      case 'clear':  [72, 76, 79, 84].forEach((m, i) =>
                       this.tone({ freq: this.midi(m), dur: 0.2, type: 'square', vol: 0.45, when: i * 0.13 })); break;
      // ---- shooter sfx ----
      case 'shot':   this.tone({ freq: 880, slideTo: 520, dur: 0.05, type: 'square', vol: 0.13 }); break;
      case 'tink':   this.tone({ freq: 1320, slideTo: 990, dur: 0.04, type: 'square', vol: 0.18 }); break;
      case 'blip':   this.tone({ freq: 340, slideTo: 220, dur: 0.08, type: 'sawtooth', vol: 0.16 }); break;
      case 'boom':   this.noise({ dur: 0.28, vol: 0.32, hp: 220 });
                     this.tone({ freq: 130, slideTo: 50, dur: 0.3, type: 'sawtooth', vol: 0.3 }); break;
      case 'bomb':   this.noise({ dur: 0.5, vol: 0.4, hp: 120 });
                     this.tone({ freq: 90, slideTo: 36, dur: 0.6, type: 'sawtooth', vol: 0.4 });
                     this.tone({ freq: 600, slideTo: 1400, dur: 0.4, type: 'sine', vol: 0.25 }); break;
    }
  },

  // ---- BGM step sequencer ----------------------------------------------
  playSong(song) {
    this.ensure();
    if (!this.ctx) return;
    this._song = song; this._step = 0;
    this._nextTime = this.ctx.currentTime + 0.05;
    if (!this._timer) this._timer = setInterval(() => this._sched(), 25);
  },
  stopSong() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._song = null;
  },
  _sched() {
    if (!this._song || !this.musicOn || this.muted) { this._nextTime = this.ctx.currentTime + 0.05; return; }
    // re-anchor if we fell behind (tab was backgrounded / context resumed) so the
    // sequencer doesn't fire a catch-up burst of notes all at once
    if (this._nextTime < this.ctx.currentTime) this._nextTime = this.ctx.currentTime + 0.05;
    const s = this._song;
    const spb = 60 / s.bpm / 4; // seconds per 16th step
    while (this._nextTime < this.ctx.currentTime + 0.12) {
      const i = this._step % s.lead.length;
      const lead = s.lead[i], bass = s.bass[i % s.bass.length];
      const when = this._nextTime - this.ctx.currentTime;
      if (lead) this.tone({ freq: this.midi(lead), dur: spb * (s.leadLen || 1.7), type: s.leadType || 'square', vol: 0.5, when, dest: this.musicGain });
      if (bass) this.tone({ freq: this.midi(bass), dur: spb * 1.9, type: s.bassType || 'triangle', vol: 0.6, when, dest: this.musicGain });
      if (s.arp && this._step % 2 === 0) this.tone({ freq: this.midi(s.arp[(this._step / 2) % s.arp.length] || lead || bass || 60), dur: spb * 0.8, type: 'square', vol: 0.18, when, dest: this.musicGain });
      this._nextTime += spb;
      this._step++;
    }
  },

  toggleMute() { this.muted = !this.muted; if (window.Playlist) Playlist.refresh(); return this.muted; },
  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (window.Playlist) Playlist.refresh();
    return this.musicOn;
  },
};

window.Audio2 = Audio2;
