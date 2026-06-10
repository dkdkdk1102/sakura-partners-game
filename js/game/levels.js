/* levels.js — the six-stage journey across Izu, ending in Ito. Each level is laid
   out in tile coordinates through the LevelBuilder. Difficulty rises gently: stage
   1 teaches, the coast/volcano add hazards and verticality, and Ito hosts the boss
   before arrival. factId links to verified trivia shown on the clear screen. */

const LEVELS = [
  // ===== 1. 修善寺温泉 =====================================================
  {
    name: '修善寺温泉', sub: 'しゅぜんじ・伊豆市', theme: 'spring', backdrop: 'bg_shuzenji', cols: 100,
    factId: 'shuzenji', clearSprite: 'l_onsen',
    build(b) {
      // tutorial stage — continuous ground (no pits); challenge from enemies and
      // optional overhead bonuses reachable by jump / spring.
      b.startAt(3);
      b.ground(0, 100);
      b.decor('d_shrine', 5, GROUND, { scale: 0.9 }); b.npc('cat', 7);
      b.decor('d_lantern', 9, GROUND, { scale: 0.8 });
      b.sign(11, 'shuzenji');
      b.decor('d_flowerP', 14, GROUND, { scale: 0.7 }); b.decor('d_tuft', 17, GROUND, { scale: 0.7 });
      b.coinRow(13, 4, GROUND - 2);
      b.enemy('snail', 9); b.enemy('snail', 19);
      b.qbox(21, GROUND - 3, 'mikan', 3); b.coinArc(18, GROUND - 4, 5);
      b.enemy('crab', 26);
      b.decor('d_pine', 30, GROUND, { scale: 1.1, fg: true });
      b.checkpoint(33);
      b.crate(38, GROUND - 1, 'mikan'); b.crate(39, GROUND - 1, null); b.crate(38, GROUND - 2, null);
      b.enemy('tanuki', 46); b.enemy('crab', 52);
      b.qbox(43, GROUND - 3, 'onsen', 1);
      b.coinRow(48, 5, GROUND - 2);
      // optional: bounce up to a property on a one-way platform (safe ground below)
      b.spring(58, GROUND); b.plat(60, 65, GROUND - 4, true); b.prop(62, GROUND - 5, 0);
      b.coinArc(60, GROUND - 6, 5); b.decor('d_hlantern', 61, GROUND - 4, { scale: 0.7, fg: true });
      b.enemy('snail', 72); b.qbox(70, GROUND - 3, 'mikan', 3);
      b.checkpoint(80); b.coinRow(82, 4, GROUND - 2);
      // ご当地ボス：おおだぬき（化け狸の親玉）— 跳ねて突進。最初なので控えめ
      b.decor('l_footbath', 92, GROUND, { scale: 1.0 });
      b.addBoss('tanuki', 87, 2);
      b.decor('d_onsen_flag', 94, GROUND, { scale: 0.9, fg: true });
      b.setGoal(97, 'flag');
    },
  },

  // ===== 2. 浄蓮の滝・天城路 ================================================
  {
    name: '浄蓮の滝', sub: 'じょうれんのたき・天城', theme: 'mountain', backdrop: 'bg_joren', cols: 112,
    factId: 'joren', clearSprite: 'd_pine',
    build(b) {
      // a mountain climb made of 1-tile steps on continuous ground (walkable, no
      // bottomless ravine); hazards + boars provide the challenge.
      b.startAt(3);
      b.ground(0, 112);
      b.sign(6, 'joren'); b.decor('d_pine', 9, GROUND, { scale: 1.2 }); b.decor('d_flowerY', 12, GROUND, { scale: 0.7 });
      b.enemy('boar', 16); b.coinRow(10, 4, GROUND - 2);
      // rising staircase: each segment is one tile higher than the last
      b.ground(20, 28, GROUND - 1); b.ground(28, 36, GROUND - 2); b.ground(36, 70, GROUND - 3);
      b.coinArc(22, GROUND - 3, 4); b.coinArc(30, GROUND - 4, 4);
      b.enemy('snail', 32, GROUND - 2); b.qbox(33, GROUND - 5, 'mikan', 4);
      b.checkpoint(40, GROUND - 3);
      b.hazard('chestnut', 44, GROUND - 3); b.hazard('chestnut', 52, GROUND - 3);
      b.enemy('boar', 58, GROUND - 3); b.enemy('tanuki', 64, GROUND - 3);
      b.crate(48, GROUND - 4, 'onsen');
      b.decor('d_pine', 62, GROUND - 3, { scale: 1.3, fg: true }); b.decor('d_tuft', 68, GROUND - 3, { scale: 0.7 });
      // optional property on a low one-way ledge above the plateau
      b.plat(55, 60, GROUND - 5, true); b.prop(57, GROUND - 6, 1); b.coinRow(55, 4, GROUND - 7);
      b.hazard('fallrock', 50, GROUND - 9, { w: 40, h: 40 });
      // descending staircase back to the valley
      b.ground(70, 80, GROUND - 2); b.ground(80, 90, GROUND - 1); b.ground(90, 112, GROUND);
      b.hazard('fallrock', 74, GROUND - 8, { w: 40, h: 40 });
      b.enemy('boar', 86); b.qbox(84, GROUND - 3, 'mikan', 5); b.coinRow(93, 4, GROUND - 2);
      b.checkpoint(98);
      // ご当地ボス：天城の猪王 — 高速チャージで突っ込む
      b.addBoss('boar', 104, 3);
      b.decor('d_shrine', 107, GROUND, { scale: 0.9 });
      b.setGoal(110, 'flag');
    },
  },

  // ===== 3. 河津桜の里 =====================================================
  {
    name: '河津桜の里', sub: 'かわづざくら・河津町', theme: 'spring', backdrop: 'bg_kawazu', cols: 108,
    factId: 'kawazu', clearSprite: 'd_bush',
    build(b) {
      b.startAt(3);
      b.ground(0, 40);
      b.sign(6, 'kawazu');
      for (let i = 4; i < 38; i += 5) b.decor('d_bush', i, GROUND, { scale: 1.1, alpha: 0.95 });
      for (let i = 8; i < 38; i += 7) b.decor('d_flowerP', i, GROUND, { scale: 0.7, fg: true });
      b.npc('woman', 9); b.npc('child', 30);
      b.coinRow(12, 6, GROUND - 2); b.coinArc(20, GROUND - 3, 6);
      b.enemy('snail', 16); b.enemy('tanuki', 24); b.enemy('crab', 33);
      b.qbox(14, GROUND - 3, 'mikan', 3); b.qbox(15, GROUND - 3, 'property', 1);
      b.checkpoint(20);
      // continuous ground; one-way platforms float above as an optional coin route
      b.ground(40, 108);
      b.plat(42, 47, GROUND - 2, true); b.plat(50, 55, GROUND - 3, true); b.plat(58, 63, GROUND - 2, true);
      b.coinRow(42, 4, GROUND - 3); b.coinRow(58, 4, GROUND - 3); b.prop(52, GROUND - 4, 0);
      b.flyer('gull', 52, (GROUND - 6) * TILE, { range: TILE * 4 });
      b.enemy('crab', 46); b.enemy('tanuki', 60);
      b.spring(70, GROUND); b.plat(72, 76, GROUND - 4, true); b.coinArc(72, GROUND - 5, 5);
      b.crate(80, GROUND - 1, 'onsen'); b.crate(81, GROUND - 1, 'mikan'); b.crate(80, GROUND - 2, null);
      b.qbox(86, GROUND - 3, 'mikan', 5); b.coinRow(90, 6, GROUND - 2);
      b.checkpoint(91);
      b.decor('d_bush', 94, GROUND, { scale: 1.2 }); b.decor('d_bush', 103, GROUND, { scale: 1.2 });
      // ご当地ボス：さくら雲の主 — 空を漂い急降下する飛行型
      b.addBoss('cloud', 99, 3);
      b.decor('d_onsen_flag', 102, GROUND, { scale: 0.9, fg: true });
      b.setGoal(105, 'flag');
    },
  },

  // ===== 4. 下田・ペリーロード ==============================================
  {
    name: '下田ペリーロード', sub: 'しもだ・下田市', theme: 'port', backdrop: 'bg_shimoda', cols: 112,
    factId: 'shimoda', clearSprite: 'black_ship',
    build(b) {
      // stone-paved canal town: namako-kabe storehouses, willows, gas lamps, and
      // the black ship at the docks. Two gentle 2-tile canal hops, otherwise flat.
      b.startAt(3);
      b.ground(0, 40);
      b.sign(6, 'shimoda');
      b.decor('namako_kura', 10, GROUND, { scale: 0.5 });
      b.decor('willow_tree', 15, GROUND, { scale: 0.42, fg: true });
      b.decor('gas_lamp', 19, GROUND, { scale: 0.32 });
      b.npc('woman', 12); b.npc('cat', 23);
      b.coinRow(13, 5, GROUND - 2);
      b.enemy('crab', 17); b.enemy('snail', 26);
      b.qbox(21, GROUND - 3, 'mikan', 3);
      b.decor('namako_kura', 28, GROUND, { scale: 0.55 });
      b.decor('gas_lamp', 33, GROUND, { scale: 0.32 });
      b.checkpoint(36);
      // canal hop #1 (2 tiles) onto the dock boards — keep the hop itself safe,
      // the jelly floats further in over solid ground
      b.ground(42, 68);
      b.coinArc(43, GROUND - 3, 4);
      b.flyer('jelly', 46, (GROUND - 3) * TILE);
      // the docks: black ship moored in the bay, plank walkways
      b.decor('black_ship', 56, GROUND, { scale: 0.55 });
      b.plat(48, 53, GROUND - 3, true); b.coinRow(48, 4, GROUND - 4); b.prop(50, GROUND - 4, 0);
      b.flyer('gull', 52, (GROUND - 6) * TILE, { range: TILE * 4 });
      b.enemy('crab', 60); b.hazard('coral', 64, GROUND);
      b.qbox(58, GROUND - 3, 'onsen', 1);
      // canal hop #2, then the lamp-lined promenade
      b.ground(70, 96);
      b.coinArc(70, GROUND - 3, 4);
      b.decor('willow_tree', 74, GROUND, { scale: 0.42, fg: true });
      b.decor('gas_lamp', 79, GROUND, { scale: 0.32 });
      b.decor('namako_kura', 85, GROUND, { scale: 0.5 });
      b.enemy('snail', 78); b.enemy('crab', 88);
      b.spring(82, GROUND); b.plat(84, 88, GROUND - 4, true); b.prop(86, GROUND - 5, 2);
      b.coinArc(84, GROUND - 6, 4);
      b.npc('fisher', 92);
      b.checkpoint(94);
      // harbor boss: the sea serpent guards the bay
      b.ground(96, 112);
      b.decor('gas_lamp', 98, GROUND, { scale: 0.32 });
      b.addBoss('serpent', 104, 3);
      b.setGoal(109, 'flag');
    },
  },

  // ===== 5. 城ヶ崎海岸 =====================================================
  {
    name: '城ヶ崎海岸', sub: 'じょうがさき・伊東市', theme: 'coast', backdrop: 'bg_jogasaki', cols: 120,
    factId: 'jogasaki', clearSprite: 'l_lighthouse2',
    build(b) {
      b.startAt(3);
      b.ground(0, 24);
      b.sign(6, 'jogasaki');
      b.decor('l_umbrella', 9, GROUND, { scale: 1.0 }); b.decor('l_chair', 11, GROUND, { scale: 0.9, fg: true });
      b.npc('fisher', 13);
      b.coinRow(14, 5, GROUND - 2);
      b.enemy('crab', 16); b.enemy('crab', 20);
      b.hazard('coral', 18, GROUND);
      // rocky stepping outcrops over the sea — gentle 2-tile gaps (casual-friendly)
      b.ground(26, 31); b.ground(33, 38); b.ground(40, 45); b.ground(47, 50);
      b.coinArc(26, GROUND - 3, 4); b.coinArc(33, GROUND - 3, 4); b.coinArc(40, GROUND - 3, 4);
      b.decor('l_rockisle', 28, GROUND, { scale: 0.8, fg: true });
      b.flyer('gull', 32, (GROUND - 6) * TILE, { range: TILE * 4 });
      b.flyer('gull', 41, (GROUND - 7) * TILE, { range: TILE * 3, dir: 1 });
      b.checkpoint(48);
      // jelly + octopus shore (continuous up to the lighthouse)
      b.ground(50, 78);
      b.enemy('octopus', 58); b.enemy('crab', 66);
      b.flyer('jelly', 54, (GROUND - 4) * TILE); b.flyer('jelly', 62, (GROUND - 5) * TILE);
      b.hazard('coral', 70, GROUND);
      b.qbox(56, GROUND - 3, 'onsen', 1); b.qbox(57, GROUND - 3, 'mikan', 3);
      b.coinRow(60, 6, GROUND - 2);
      // optional bounce up to a property (safe ground below)
      b.spring(68, GROUND); b.plat(70, 74, GROUND - 4, true); b.prop(72, GROUND - 5, 0);
      b.coinArc(70, GROUND - 6, 4);
      b.decor('l_rockisle', 52, GROUND, { scale: 1.0, fg: false });
      // lighthouse landmark, then continuous shore with a geyser to time
      b.decor('l_lighthouse2', 76, GROUND, { scale: 1.2 });
      b.ground(78, 120);    // continuous shore all the way to the boss cove (no gap)
      b.coinRow(80, 4, GROUND - 2);
      b.plat(81, 85, GROUND - 2, true); b.prop(83, GROUND - 3, 3); b.coinArc(81, GROUND - 4, 4);
      b.hazard('geyser', 90, GROUND, { period: 2.6, up: TILE * 2.2 });
      b.enemy('crab', 95);
      b.flyer('gull', 88, (GROUND - 6) * TILE, { range: TILE * 5 });
      b.checkpoint(104);
      // ご当地ボス：おおダコ — その場で墨を吐く射撃タイプ
      b.addBoss('octopus', 110, 3);
      b.decor('d_buoy', 106, GROUND, { scale: 0.8, fg: true });
      b.setGoal(117, 'flag');
    },
  },

  // ===== 5. 大室山 =========================================================
  {
    name: '大室山', sub: 'おおむろやま・伊東市', theme: 'volcano', backdrop: 'bg_omuro', cols: 124,
    factId: 'omuro', clearSprite: 'l_omuro_big',
    build(b) {
      b.startAt(3);
      b.ground(0, 20);
      b.sign(6, 'omuro'); b.decor('d_tuft', 10, GROUND, { scale: 0.8 }); b.decor('d_tuft', 14, GROUND, { scale: 0.8 });
      b.enemy('urchin', 12); b.enemy('crab', 17);
      b.coinRow(8, 5, GROUND - 2);
      // ascending the grassy cone — stair-step ground rising
      let top = GROUND;
      for (let x = 20; x < 70; x += 6) { top = Math.max(6, top - 1); b.ground(x, x + 6, top); b.coinArc(x + 1, top - 2, 4); }
      b.enemy('urchin', 30, GROUND - 2);
      b.flyer('cloud', 34, (GROUND - 6) * TILE, { range: TILE * 4 });
      b.flyer('cloud', 46, (GROUND - 8) * TILE, { range: TILE * 4, dir: 1 });
      b.flyer('gull', 40, (GROUND - 9) * TILE, { range: TILE * 5 });
      b.qbox(38, GROUND - 7, 'mikan', 4); b.checkpoint(42, GROUND - 4);
      b.hazard('chestnut', 50, GROUND - 5); b.hazard('chestnut', 56, GROUND - 6);
      b.prop(64, GROUND - 9, 1);
      // crater rim plateau at the top
      b.ground(70, 92, 6); b.decor('l_crater', 80, 6, { scale: 1.4 });
      b.enemy('urchin', 76, 6); b.flyer('cloud', 84, 4 * TILE, { range: TILE * 4 });
      b.coinRow(72, 8, 4); b.qbox(88, 3, 'property', 1);
      b.checkpoint(82, 6);
      b.spring(90, 6);
      // descending to the lift station
      b.plat(94, 97, 8, true); b.plat(99, 102, 9, true); b.plat(104, 107, 10, true);
      b.coinRow(94, 3, 7); b.coinRow(104, 3, 9);
      b.ground(109, 124, GROUND - 1);
      b.decor('l_tower', 111, GROUND - 1, { scale: 1.1 }); b.decor('l_gondola', 109, GROUND - 5, { scale: 0.9, fg: true });
      b.checkpoint(112, GROUND - 1);
      // ご当地ボス：大ガラス — 旋回しながら急襲する飛行型
      b.addBoss('gull', 116, 3, GROUND - 1);
      b.setGoal(121, 'flag', GROUND - 1);
    },
  },

  // ===== 6. 伊東温泉（ゴール・ボス） ========================================
  {
    name: '伊東温泉', sub: 'いとう・ゴール！', theme: 'town', backdrop: 'bg_ito_onsen', cols: 104,
    factId: 'ito_onsen', clearSprite: 'ryokan', final: true,
    build(b) {
      b.startAt(3);
      b.ground(0, 58);
      b.sign(6, 'ito_onsen');
      b.decor('d_lamp', 9, GROUND, { scale: 1.0 }); b.decor('d_lamp', 19, GROUND, { scale: 1.0 });
      b.decor('l_house_blue', 13, GROUND, { scale: 1.0 }); b.decor('ryokan', 26, GROUND, { scale: 1.1 });
      b.decor('d_hlantern', 16, GROUND - 3, { scale: 0.7, fg: true });
      b.npc('woman', 11); b.npc('cat', 22); b.npc('fisher', 34);
      b.coinRow(8, 5, GROUND - 2);
      b.enemy('crab', 18); b.enemy('tanuki', 28); b.enemy('snail', 40);
      b.qbox(14, GROUND - 4, 'mikan', 3); b.qbox(30, GROUND - 4, 'onsen', 1);
      b.crate(36, GROUND - 1, 'mikan'); b.crate(37, GROUND - 1, null);
      b.prop(45, GROUND - 1, 3); b.coinRow(46, 6, GROUND - 2);
      b.decor('d_onsen_flag', 50, GROUND, { scale: 0.9, fg: true });
      b.checkpoint(52);
      // ---- boss arena (open; the goal stays locked until the boss falls, so no
      //      walls are needed — the King Crab just chases the player) ----
      b.ground(58, 96);
      b.decor('l_noren', 92, GROUND, { scale: 1.1 });
      b.decor('d_lantern', 62, GROUND, { scale: 0.9 }); b.decor('d_lantern', 90, GROUND, { scale: 0.9 });
      b.qbox(60, GROUND - 5, 'onsen', 1); b.qbox(94, GROUND - 5, 'onsen', 1);
      b.addBoss('crab', 78, 5);
      // ---- after the boss: arrival ----
      b.ground(96, 104);
      b.decor('l_footbath', 99, GROUND, { scale: 1.0 }); b.npc('shiba', 101);
      b.setGoal(101, 'sakura_partners');
    },
  },
];

window.LEVELS = LEVELS;
