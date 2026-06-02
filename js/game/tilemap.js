/* tilemap.js — terrain grid + collision + autotiled rendering.
   Cells: 0 empty, 1 solid, 2 one-way platform. Interactive solids (? blocks,
   crates, bricks) live in `blocks` keyed by cell index; they collide like solids
   but the gameplay layer reacts when bumped/stood-on. Rendering autotiles by
   showing the theme's `top` sprite where nothing solid sits above, else `fill`. */

const EMPTY = 0, SOLID = 1, ONEWAY = 2;

class Tilemap {
  constructor(cols, rows, theme) {
    this.cols = cols; this.rows = rows;
    this.cell = new Uint8Array(cols * rows);
    this.theme = theme || { top: 't_grass', fill: 't_dirt', oneway: 't_wood' };
    this.blocks = new Map();
  }
  idx(tx, ty) { return ty * this.cols + tx; }
  inB(tx, ty) { return tx >= 0 && tx < this.cols && ty >= 0 && ty < this.rows; }
  get(tx, ty) { return this.inB(tx, ty) ? this.cell[this.idx(tx, ty)] : EMPTY; }
  set(tx, ty, v) { if (this.inB(tx, ty)) this.cell[this.idx(tx, ty)] = v; }

  block(tx, ty) { return this.blocks.get(this.idx(tx, ty)); }
  setBlock(tx, ty, obj) {
    this.blocks.set(this.idx(tx, ty), obj);
    this.set(tx, ty, SOLID);
  }
  // turn a broken/emptied block cell back into empty space
  clearCell(tx, ty) { this.set(tx, ty, EMPTY); this.blocks.delete(this.idx(tx, ty)); }

  isSolid(tx, ty) {
    if (tx < 0 || tx >= this.cols) return true;   // walls left/right of level
    if (ty < 0) return false;                      // open sky
    if (ty >= this.rows) return false;             // open pit (death handled elsewhere)
    return this.cell[this.idx(tx, ty)] === SOLID;
  }
  isOneWay(tx, ty) { return this.inB(tx, ty) && this.cell[this.idx(tx, ty)] === ONEWAY; }

  widthPx() { return this.cols * TILE; }
  heightPx() { return this.rows * TILE; }

  render(ctx, cam) {
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const x1 = Math.min(this.cols, Math.ceil((cam.x + cam.viewW) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const y1 = Math.min(this.rows, Math.ceil((cam.y + cam.viewH) / TILE) + 1);
    const th = this.theme;
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const c = this.cell[this.idx(tx, ty)];
        if (c === EMPTY) continue;
        const wx = tx * TILE, wy = ty * TILE;
        if (this.blocks.has(this.idx(tx, ty))) continue; // block draws itself
        if (c === SOLID) {
          const above = ty > 0 ? this.cell[this.idx(tx, ty - 1)] : EMPTY;
          const sprite = (above === SOLID) ? th.fill : th.top;
          drawSprite(ctx, sprite, wx, wy, { w: TILE + 1, h: TILE + 1, ax: 0, ay: 0 });
        } else if (c === ONEWAY) {
          drawSprite(ctx, th.oneway, wx, wy - 2, { w: TILE + 1, h: TILE * 0.6, ax: 0, ay: 0 });
        }
      }
    }
  }
}

window.Tilemap = Tilemap;
window.TILE_EMPTY = EMPTY; window.TILE_SOLID = SOLID; window.TILE_ONEWAY = ONEWAY;
