/* smain.js — shooter bootstrap: canvas/engine/input wiring, top bar, the BOMB
   touch button, then boot. */

(function () {
  function boot() {
    const canvas = document.getElementById('game');
    Engine.init(canvas);
    Input.init();
    Pointer.init(canvas);

    const gesture = () => { Audio2.ensure(); Input._gesture && Input._gesture(); };
    const pauseBtn = document.getElementById('btn-pause');
    const soundBtn = document.getElementById('btn-sound');
    const musicBtn = document.getElementById('btn-music');
    const fsBtn = document.getElementById('btn-fs');
    const homeBtn = document.getElementById('btn-home');
    if (pauseBtn) pauseBtn.addEventListener('click', () => { gesture(); if (Engine.scene && Engine.scene.togglePause) Engine.scene.togglePause(); });
    if (soundBtn) soundBtn.addEventListener('click', () => { gesture(); soundBtn.textContent = Audio2.toggleMute() ? '🔇' : '🔊'; });
    if (musicBtn) musicBtn.addEventListener('click', () => { gesture(); const on = Audio2.toggleMusic(); musicBtn.textContent = on ? '♪' : '♪̸'; musicBtn.classList.toggle('off', !on); });
    if (fsBtn) fsBtn.addEventListener('click', () => {
      gesture();
      if (!document.fullscreenElement) (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement);
      else document.exitFullscreen && document.exitFullscreen();
    });
    if (homeBtn) homeBtn.addEventListener('click', () => { location.href = 'index.html'; });

    // BOMB touch button
    const bombBtn = document.getElementById('btn-bomb');
    if (bombBtn) {
      const fire = (e) => { gesture(); if (window.SG && SG.ship) SG.ship.bomb(); e.preventDefault(); };
      bombBtn.addEventListener('pointerdown', fire);
      bombBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    Engine.setScene(new SBoot());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
