/* main.js — bootstrap. Wires the canvas, input, pointer and DOM control buttons,
   then starts the engine on the Boot (loading) scene. Loaded last so every class
   above is already defined. */

(function () {
  function boot() {
    const canvas = document.getElementById('game');
    Engine.init(canvas);
    Input.init();
    Pointer.init(canvas);

    // top-bar buttons (pause / sound / music)
    const pauseBtn = document.getElementById('btn-pause');
    const soundBtn = document.getElementById('btn-sound');
    const musicBtn = document.getElementById('btn-music');
    // arm audio + fire the first-gesture hook so BGM can start from a top-bar tap too
    const gesture = () => { Audio2.ensure(); Input._gesture && Input._gesture(); };
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      gesture();
      if (Engine.scene && Engine.scene.togglePause) Engine.scene.togglePause();
    });
    if (soundBtn) soundBtn.addEventListener('click', () => {
      gesture();
      const muted = Audio2.toggleMute();
      soundBtn.textContent = muted ? '🔇' : '🔊';
    });
    if (musicBtn) musicBtn.addEventListener('click', () => {
      gesture();
      const on = Audio2.toggleMusic();
      musicBtn.textContent = on ? '♪' : '♪̸';
      musicBtn.classList.toggle('off', !on);
    });

    // fullscreen toggle (double-tap the title bar area) — optional convenience
    const fsBtn = document.getElementById('btn-fs');
    if (fsBtn) fsBtn.addEventListener('click', () => {
      gesture();
      if (!document.fullscreenElement) (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement);
      else document.exitFullscreen && document.exitFullscreen();
    });

    Engine.setScene(new BootScene());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
