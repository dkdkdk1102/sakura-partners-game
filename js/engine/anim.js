/* anim.js — frame-sequence animator. An Animator plays named clips; each clip is
   { frames:[spriteName...], fps, loop }. play(name) restarts only on change. */

class Animator {
  constructor(clips) {
    this.clips = clips;          // { name: {frames, fps, loop} }
    this.current = null;
    this.t = 0;
    this.index = 0;
    this.done = false;
  }
  play(name, restart = false) {
    if (this.current === name && !restart) return;
    if (!this.clips[name]) return;
    this.current = name;
    this.t = 0;
    this.index = 0;
    this.done = false;
  }
  update(dt) {
    const clip = this.clips[this.current];
    if (!clip) return;
    const fps = clip.fps || 8;
    this.t += dt;
    const adv = Math.floor(this.t * fps);
    if (adv > 0) {
      this.t -= adv / fps;
      this.index += adv;
      if (this.index >= clip.frames.length) {
        if (clip.loop === false) {
          this.index = clip.frames.length - 1;
          this.done = true;
        } else {
          this.index %= clip.frames.length;
        }
      }
    }
  }
  frame() {
    const clip = this.clips[this.current];
    if (!clip) return null;
    return clip.frames[Math.min(this.index, clip.frames.length - 1)];
  }
}

window.Animator = Animator;
