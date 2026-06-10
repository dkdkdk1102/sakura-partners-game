/* store.js — tiny persistent storage shared by both games (adventure + shooter).
   Wraps localStorage with JSON + try/catch so it degrades silently on file://
   or when storage is unavailable. Keys are namespaced with "spg_". */

const Store = {
  get(k, def) { try { const v = localStorage.getItem('spg_' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem('spg_' + k, JSON.stringify(v)); } catch (e) {} },
};

window.Store = Store;
