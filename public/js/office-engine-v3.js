/* ═══════════════════════════════════════════════════════════════════
   EPI-USE OFFICE ENGINE 3.0 — Marketing EPI-USE Brasil · jul/2026
   Engine 2D compartilhado: /game (mundo MKT) e /game-hub (colaborador).
   Pixel-art procedural · zero assets externos · vanilla JS.

   A página define window.WORLD antes deste script:
   {
     id:'mkt'|'hub', hudTitle, backHref, backLabel, verLabel, welcome,
     rooms:{key:{c0,r0,c1,r1,rug,nome}},        // shell 60×36 fixo
     furniture(P, g),                            // painters estáticos
     solids:[[c,r,w,h]],                         // colisão de móveis
     animDecor:[{type:'plant'|'tv'|'steam'|'cooler'|'butterflies'|'leaves',...}],
     zones:[...], team:[...],                    // ver mundos
     quest:{titulo, targets:[{type:'room'|'zone', key, label}], doneTitle, doneBody},
     eventsBoard:{x,y,w},                        // post-its de eventos reais
     spawn:{x,y}
   }

   Novidades v3: canvas DPR + zoom (+/−/pinch) · iluminação por hora real
   (?hora=NN pra testar) · mundo vivo (partículas, TVs animadas, plantas,
   borboletas) · NPCs com rotina por horário + balões de fala · dados
   REAIS nas estações (events.json, changelog.json, datas-especiais,
   team.json, office-desks.json) · spawn SSO-aware · emotes (1-4) ·
   quest de exploração · presença multiplayer (/api/game/presence) ·
   sons procedurais WebAudio (toggle, off por padrão).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
'use strict';
const W = window.WORLD;
if (!W) { console.error('[engine] window.WORLD não definido'); return; }

// ── CONSTANTES ─────────────────────────────────────────────────────
const COLS = 60, ROWS = 36, TS = 32;
const WW = COLS * TS, WH = ROWS * TS;
const PLAYER_SPEED = 200, NPC_SPEED = 62;
const qs = new URLSearchParams(location.search);
const HOUR_OVERRIDE = qs.has('hora') ? parseFloat(qs.get('hora')) : null;
const nowHour = () => HOUR_OVERRIDE != null ? HOUR_OVERRIDE : (new Date().getHours() + new Date().getMinutes() / 60);
const strHash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// ── TILES / MAPA (shell compartilhado 60×36) ───────────────────────
const T = { GRASS:0, PATH:1, FLOOR:2, WALL:3, RUG_BLUE:5, RUG_GREEN:6, RUG_VIOLET:7, RUG_SKY:8, RUG_NAVY:9, RUG_SAND:10, RUG_AMBER:11, RUG_PURPLE:12, RUG_WARM:13, RUG_RED:14, GARDEN:15 };
const RUG_COLORS = {
  [T.RUG_BLUE]:   { a:'#cfe0f5', b:'#c2d6ef', edge:'#9db9dd' },
  [T.RUG_GREEN]:  { a:'#d2ecd6', b:'#c5e5ca', edge:'#9ccaa4' },
  [T.RUG_VIOLET]: { a:'#e4dcf5', b:'#dbd1f0', edge:'#b9a8df' },
  [T.RUG_SKY]:    { a:'#d4e9f7', b:'#c7e1f3', edge:'#99c4e3' },
  [T.RUG_NAVY]:   { a:'#d6dce8', b:'#cad2e1', edge:'#a3afc8' },
  [T.RUG_SAND]:   { a:'#f1e7d4', b:'#ecdfc8', edge:'#d4bf99' },
  [T.RUG_AMBER]:  { a:'#fbe9cc', b:'#f8e1bb', edge:'#e3bf85' },
  [T.RUG_PURPLE]: { a:'#e9def2', b:'#e1d2ed', edge:'#c3a6d6' },
  [T.RUG_WARM]:   { a:'#f3e3d3', b:'#eedac5', edge:'#d6b18d' },
  [T.RUG_RED]:    { a:'#f6dde0', b:'#f2d1d6', edge:'#dfa3ac' },
};
window.T = T; // exposto pros mundos declararem rugs

const ROOMS = W.rooms;
const mapTiles = new Uint8Array(COLS * ROWS).fill(T.GRASS);
const mapSolid = new Uint8Array(COLS * ROWS);

function fill(c, r, w, h, tile, solid) {
  for (let row = r; row < r + h && row < ROWS; row++)
    for (let col = c; col < c + w && col < COLS; col++) {
      const i = row * COLS + col;
      if (tile != null) mapTiles[i] = tile;
      if (solid != null) mapSolid[i] = solid ? 1 : 0;
    }
}
function wallH(c0, c1, r, doors) {
  for (let c = c0; c <= c1; c++) {
    if (doors && doors.includes(c)) continue;
    mapTiles[r * COLS + c] = T.WALL; mapSolid[r * COLS + c] = 1;
  }
}
function wallV(r0, r1, c, doors) {
  for (let r = r0; r <= r1; r++) {
    if (doors && doors.includes(r)) continue;
    mapTiles[r * COLS + c] = T.WALL; mapSolid[r * COLS + c] = 1;
  }
}

(function buildMap() {
  fill(3, 3, 54, 30, T.FLOOR);
  for (const k in ROOMS) {
    const R = ROOMS[k];
    if (R.rug === T.GARDEN) fill(R.c0, R.r0, R.c1-R.c0+1, R.r1-R.r0+1, T.GARDEN);
    else fill(R.c0+1, R.r0+1, R.c1-R.c0-1, R.r1-R.r0-1, R.rug);
  }
  fill(28, 33, 4, 3, T.PATH);                 // entrada sul
  wallH(2, 57, 2);
  wallH(2, 57, 33, [28,29,30,31]);
  wallV(2, 33, 2); wallV(2, 33, 57);
  wallH(3, 56, 11, [8,9, 20,21, 32,33, 47,48]);
  wallV(3, 10, 14); wallV(3, 10, 26); wallV(3, 10, 38);
  wallV(12, 22, 17, [16,17]);
  wallV(12, 22, 41, [13,14, 19,20]);
  wallH(42, 56, 17, [48,49]);
  wallH(3, 56, 23, [9,10, 28,29, 49,50]);
  wallV(24, 32, 16, [27,28]);
  wallV(24, 32, 41, [27,28]);
})();

// ── ITENS DE MESA (pixel-art ~10px) ────────────────────────────────
const ITEM_LABELS = {
  caneca:'☕ caneca', caneca_vermelha:'☕ caneca vermelha', planta:'🪴 plantinha', livros:'📚 livros',
  fones:'🎧 fones', foto:'🖼️ porta-retrato', trofeu:'🏆 troféu', violao:'🎸 violão', mate:'🧉 chimarrão',
  notebook:'💻 notebook', monitor_duplo:'🖥️🖥️ monitor duplo', gato:'🐈 gato dorminhoco', bola:'⚽ bolinha', cafe:'☕ café espresso',
  funko_tini:'👱‍♀️ Funko Pop da Tini', funko_deadpool:'🔴 Funko do Deadpool', caderno_erpngo:'🐘 caderno ERP.ngo',
  tarot:'🔮 livro de tarot', switch:'🎮 Nintendo Switch', ae86:'🚗 miniatura Toyota AE86', ps5:'🎮 PS5',
  pc_gamer:'🖥️ PC gamer', luminaria:'💡 luminária', ganesha:'🐘 mini Ganesha',
  garrafa_agua:'💧 garrafa de água', gloss:'💄 gloss', oculos:'👓 óculos de grau',
  caneca_office:'☕ caneca "World\'s Best Boss"'
};
function drawItem(g, id, x, y) {
  switch(id) {
    case 'caneca': g.fillStyle='#3b82f6'; g.fillRect(x,y+3,7,6); g.fillRect(x+7,y+4,2,3); g.fillStyle='#93c5fd'; g.fillRect(x+1,y+4,5,1); break;
    case 'caneca_vermelha': g.fillStyle='#cd1543'; g.fillRect(x,y+3,7,6); g.fillRect(x+7,y+4,2,3); g.fillStyle='#f9a8b4'; g.fillRect(x+1,y+4,5,1); break;
    case 'cafe': g.fillStyle='#fff'; g.fillRect(x,y+4,6,5); g.fillStyle='#78350f'; g.fillRect(x+1,y+5,4,1); g.fillStyle='#d6d3d1'; g.fillRect(x+6,y+5,2,2); break;
    case 'planta': g.fillStyle='#b45309'; g.fillRect(x+2,y+5,6,4); g.fillStyle='#16a34a'; g.fillRect(x+3,y,4,5); g.fillRect(x+1,y+2,3,3); g.fillRect(x+6,y+2,3,3); break;
    case 'livros': g.fillStyle='#dc2626'; g.fillRect(x,y+6,9,2); g.fillStyle='#2563eb'; g.fillRect(x+1,y+4,8,2); g.fillStyle='#16a34a'; g.fillRect(x,y+2,8,2); break;
    case 'fones': g.fillStyle='#0f172a'; g.fillRect(x+1,y,8,2); g.fillRect(x,y+1,2,6); g.fillRect(x+8,y+1,2,6); g.fillStyle='#475569'; g.fillRect(x,y+5,3,4); g.fillRect(x+7,y+5,3,4); break;
    case 'foto': g.fillStyle='#92400e'; g.fillRect(x+1,y,8,9); g.fillStyle='#fef3c7'; g.fillRect(x+2,y+1,6,7); g.fillStyle='#60a5fa'; g.fillRect(x+3,y+2,4,3); break;
    case 'trofeu': g.fillStyle='#fbbf24'; g.fillRect(x+2,y,6,4); g.fillRect(x+4,y+4,2,3); g.fillRect(x+1,y+7,8,2); g.fillStyle='#fef3c7'; g.fillRect(x+3,y+1,2,2); break;
    case 'violao': g.fillStyle='#92400e'; g.fillRect(x+3,y+4,6,5); g.fillRect(x+5,y,2,5); g.fillStyle='#451a03'; g.fillRect(x+5,y+6,2,2); break;
    case 'mate': g.fillStyle='#65a30d'; g.fillRect(x+2,y+3,6,6); g.fillStyle='#a3e635'; g.fillRect(x+3,y+4,4,1); g.fillStyle='#a8a29e'; g.fillRect(x+5,y,2,4); break;
    case 'notebook': g.fillStyle='#334155'; g.fillRect(x,y+4,10,5); g.fillStyle='#0f172a'; g.fillRect(x+1,y,8,4); g.fillStyle='#38bdf8'; g.fillRect(x+2,y+1,6,2); break;
    case 'monitor_duplo': g.fillStyle='#1e293b'; g.fillRect(x,y,5,6); g.fillRect(x+6,y,5,6); g.fillStyle='#7dd3fc'; g.fillRect(x+1,y+1,3,3); g.fillStyle='#86efac'; g.fillRect(x+7,y+1,3,3); g.fillStyle='#475569'; g.fillRect(x+2,y+6,1,2); g.fillRect(x+8,y+6,1,2); break;
    case 'gato': g.fillStyle='#f97316'; g.fillRect(x+1,y+4,8,4); g.fillRect(x+7,y+2,3,3); g.fillStyle='#fdba74'; g.fillRect(x+2,y+5,5,2); g.fillStyle='#0f172a'; g.fillRect(x+8,y+3,1,1); break;
    case 'bola': g.fillStyle='#fff'; g.fillRect(x+2,y+2,6,6); g.fillRect(x+3,y+1,4,8); g.fillRect(x+1,y+3,8,4); g.fillStyle='#0f172a'; g.fillRect(x+4,y+4,2,2); break;
    case 'funko_tini': g.fillStyle='#fde047'; g.fillRect(x+2,y,6,5); g.fillStyle='#f5cfa6'; g.fillRect(x+3,y+2,4,3); g.fillStyle='#0f172a'; g.fillRect(x+3,y+3,1,1); g.fillRect(x+6,y+3,1,1); g.fillStyle='#ec4899'; g.fillRect(x+3,y+5,4,4); break;
    case 'funko_deadpool': g.fillStyle='#b91c1c'; g.fillRect(x+2,y,6,5); g.fillStyle='#fff'; g.fillRect(x+3,y+2,1,2); g.fillRect(x+6,y+2,1,2); g.fillStyle='#7f1d1d'; g.fillRect(x+3,y+5,4,4); g.fillStyle='#0f172a'; g.fillRect(x+4,y+6,2,2); break;
    case 'caderno_erpngo': g.fillStyle='#15803d'; g.fillRect(x+1,y+1,8,8); g.fillStyle='#fff'; g.fillRect(x+2,y+2,6,6); g.fillStyle='#9ca3af'; g.fillRect(x+3,y+3,4,3); g.fillRect(x+6,y+5,2,2); break;
    case 'tarot': g.fillStyle='#581c87'; g.fillRect(x+1,y+2,8,7); g.fillStyle='#7c3aed'; g.fillRect(x+2,y+3,6,5); g.fillStyle='#fbbf24'; g.fillRect(x+4,y+4,2,2); g.fillRect(x+3,y+6,1,1); g.fillRect(x+6,y+6,1,1); break;
    case 'switch': g.fillStyle='#dc2626'; g.fillRect(x,y+3,3,6); g.fillStyle='#2563eb'; g.fillRect(x+7,y+3,3,6); g.fillStyle='#0f172a'; g.fillRect(x+3,y+3,4,6); g.fillStyle='#38bdf8'; g.fillRect(x+4,y+4,2,4); break;
    case 'ae86': g.fillStyle='#f8fafc'; g.fillRect(x,y+4,10,4); g.fillStyle='#0f172a'; g.fillRect(x+2,y+2,6,3); g.fillRect(x+1,y+8,2,2); g.fillRect(x+7,y+8,2,2); g.fillStyle='#fbbf24'; g.fillRect(x+9,y+5,1,1); break;
    case 'ps5': g.fillStyle='#f8fafc'; g.fillRect(x+2,y,2,9); g.fillRect(x+6,y,2,9); g.fillStyle='#0f172a'; g.fillRect(x+4,y+1,2,8); g.fillStyle='#3b82f6'; g.fillRect(x+4,y+2,2,1); break;
    case 'pc_gamer': g.fillStyle='#0f172a'; g.fillRect(x,y,8,14); g.fillStyle='#1e293b'; g.fillRect(x+1,y+1,6,12); g.fillStyle='#22d3ee'; g.fillRect(x+2,y+2,4,1); g.fillStyle='#a78bfa'; g.fillRect(x+2,y+5,4,1); g.fillStyle='#4ade80'; g.fillRect(x+2,y+8,4,1); g.fillStyle='#f472b6'; g.fillRect(x+2,y+11,4,1); break;
    case 'luminaria': g.fillStyle='#475569'; g.fillRect(x+4,y+4,2,5); g.fillRect(x+2,y+8,6,2); g.fillStyle='#fbbf24'; g.fillRect(x+1,y,8,4); g.fillStyle='#fef3c7'; g.fillRect(x+2,y+1,6,2); break;
    case 'ganesha': g.fillStyle='#f59e0b'; g.fillRect(x+2,y+1,6,4); g.fillRect(x+3,y+5,4,4); g.fillStyle='#d97706'; g.fillRect(x+4,y+4,2,3); g.fillStyle='#fbbf24'; g.fillRect(x+1,y+2,2,2); g.fillRect(x+7,y+2,2,2); g.fillStyle='#0f172a'; g.fillRect(x+3,y+2,1,1); g.fillRect(x+6,y+2,1,1); break;
    case 'garrafa_agua': g.fillStyle='#38bdf8'; g.fillRect(x+3,y+2,4,7); g.fillStyle='#bae6fd'; g.fillRect(x+4,y+3,1,5); g.fillStyle='#0284c7'; g.fillRect(x+3,y,4,2); break;
    case 'gloss': g.fillStyle='#ec4899'; g.fillRect(x+4,y+3,3,6); g.fillStyle='#f9a8d4'; g.fillRect(x+4,y+4,1,4); g.fillStyle='#831843'; g.fillRect(x+4,y+1,3,2); break;
    case 'oculos': g.fillStyle='#0f172a'; g.fillRect(x,y+3,4,4); g.fillRect(x+6,y+3,4,4); g.fillRect(x+4,y+4,2,1); g.fillStyle='#bae6fd'; g.fillRect(x+1,y+4,2,2); g.fillRect(x+7,y+4,2,2); break;
    case 'caneca_office': g.fillStyle='#fff'; g.fillRect(x,y+3,7,6); g.fillRect(x+7,y+4,2,3); g.fillStyle='#0f172a'; g.fillRect(x+1,y+4,5,1); g.fillRect(x+1,y+6,4,1); break;
  }
}

// ── SPRITES DE PERSONAGEM (12×16 procedurais, 4 frames + blink) ────
const BODY = {
  down: [
    "....HHHH....","...HHHHHH...","...HHHHHH...","...SSSSSS...","...SESSES...","...SSSSSS...","....SSSS....",
    "..TTTTTTTT..",".TTTTTTTTTT.",".STTTTTTTTS.",".STTTTTTTTS.","..TTTTTTTT..",
  ],
  up: [
    "....HHHH....","...HHHHHH...","...HHHHHH...","...HHHHHH...","...SHHHHS...","...SSSSSS...","....SSSS....",
    "..TTTTTTTT..",".TTTTTTTTTT.",".STTTTTTTTS.",".STTTTTTTTS.","..TTTTTTTT..",
  ],
  side: [
    "....HHHH....","...HHHHHH...","...HHHHHH...","...SSSSH....","...SESSH....","...SSSSS....","....SSS.....",
    "...TTTTTT...","..TTTTTTT...","..TTTTTTS...","..TTTTTTS...","...TTTTT....",
  ],
};
const LEGS = {
  idle:  ["...PPPPPP...","...PP..PP...","...OO..OO...",""],
  a:     ["...PPPPPP...","..PP....PP..","..OO....OO..",""],
  b:     ["...PPPPPP...","...PP..PP...","..OO....OO..",""],
  sideIdle: ["...PPPP.....","...P..P.....","...O..O.....",""],
  sideA:    ["...PPPP.....","..P....P....","..O....O....",""],
  sideB:    ["...PPPP.....","....PP......","....OO......",""],
};
const spriteCache = new Map();
function charSprite(pal, dir, frame, blink) {
  const key = pal.hair+pal.skin+pal.shirt+pal.pants+dir+frame+(blink?'b':'');
  if (spriteCache.has(key)) return spriteCache.get(key);
  const flip = dir === 'right';
  const base = BODY[dir === 'up' ? 'up' : (dir === 'down' ? 'down' : 'side')];
  const legSet = (dir === 'left' || dir === 'right')
    ? [LEGS.sideIdle, LEGS.sideA, LEGS.sideB][frame]
    : [LEGS.idle, LEGS.a, LEGS.b][frame];
  const rows = base.concat(legSet.slice(0,3));
  const cv = document.createElement('canvas'); cv.width = 24; cv.height = 32;
  const g = cv.getContext('2d');
  const cmap = { H:pal.hair, S:pal.skin, E:(blink ? pal.skin : '#1e293b'), T:pal.shirt, P:pal.pants, O:'#3f3f46' };
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < 12; c++) {
      const ch = row[flip ? 11 - c : c];
      if (ch && ch !== '.') { g.fillStyle = cmap[ch] || '#000'; g.fillRect(c*2, r*2, 2, 2); }
    }
  }
  spriteCache.set(key, cv);
  return cv;
}
// Sprite alternativo: elefantinho (mascote — NPC recepcionista do hub).
// kit=true veste a camisa 10 da seleção 🇧🇷 (campanha Gol de Placa ativa).
const elephantSprites = new Map();
function elephantSprite(dir, frame, kit) {
  const key = dir + frame + (kit ? 'k' : '');
  if (elephantSprites.has(key)) return elephantSprites.get(key);
  const cv = document.createElement('canvas'); cv.width = 24; cv.height = 32;
  const g = cv.getContext('2d');
  const bob = frame === 1 ? 1 : (frame === 2 ? -1 : 0);
  const flip = dir === 'left';
  const X = x => flip ? 24 - x - 2 : x; // espelha blocos 2px
  g.fillStyle = '#9ca3af';
  g.fillRect(4, 8 + bob, 16, 14);                    // corpo
  if (kit) {                                          // camisa amarela + calção verde
    g.fillStyle = '#fbbf24'; g.fillRect(4, 10 + bob, 16, 9);
    g.fillStyle = '#16a34a'; g.fillRect(4, 19 + bob, 16, 3);
    g.fillStyle = '#0f172a'; g.font = 'bold 7px Inter'; g.textAlign = 'center';
    g.fillText('10', 12, 17 + bob);
  }
  g.fillStyle = '#9ca3af';
  g.fillRect(X(14), 2 + bob, 8, 10);                 // cabeça
  g.fillRect(X(20), 10 + bob, 3, 10);                // tromba
  g.fillStyle = '#6b7280';
  g.fillRect(X(12), 4 + bob, 4, 7);                  // orelha
  g.fillStyle = '#d1d5db'; g.fillRect(X(19), 11 + bob, 2, 2); // presa
  g.fillStyle = '#1f2937'; g.fillRect(X(17), 5 + bob, 2, 2);  // olho
  g.fillStyle = '#6b7280';
  g.fillRect(6, 22, 4, 8 - bob); g.fillRect(14, 22, 4, 8 + bob); // patas
  elephantSprites.set(key, cv);
  return cv;
}

const SHIRT_CHOICES = ['#cd1543','#001844','#10b981','#7c3aed','#f59e0b','#0d9488'];
// Tons de pele — gama completa e inclusiva (claro → retinto), representando todo o time
const SKINS = ['#ffe0bd','#f5cfa6','#e8b58a','#d9a06b','#c98e62','#9c6644','#7a4b2b','#5c3a21','#3d2817'];
const HAIRS = ['#0a0a0a','#27190e','#0f172a','#5b3a1e','#7c5a3a','#3b2f2f','#94a3b8'];
function palFor(seed, shirt, skin, hair) {
  const h = strHash(seed);
  return {
    hair: hair || HAIRS[h % HAIRS.length],
    skin: skin || SKINS[h % SKINS.length],
    shirt: shirt || SHIRT_CHOICES[h % SHIRT_CHOICES.length],
    pants: ['#334155','#1e3a5f','#44403c'][h % 3]
  };
}

// ── PAINTERS DE MÓVEIS (P — passado pro WORLD.furniture) ───────────
let DESKS = {};
function pDesk(g, x, y, ownerId) {
  g.fillStyle = '#a16207'; g.fillRect(x, y+30, 64, 4);
  g.fillStyle = '#d6a35c'; g.fillRect(x, y, 64, 30);
  g.fillStyle = '#c2924e'; g.fillRect(x, y, 64, 4);
  g.fillStyle = '#e7bd7e'; g.fillRect(x+3, y+6, 58, 2);
  g.fillStyle = '#1e293b'; g.fillRect(x+6, y+5, 16, 11);
  g.fillStyle = '#7dd3fc'; g.fillRect(x+8, y+7, 12, 7);
  g.fillStyle = '#475569'; g.fillRect(x+12, y+16, 4, 3);
  g.fillStyle = '#cbd5e1'; g.fillRect(x+8, y+21, 14, 5);
  const cfg = DESKS[ownerId];
  if (cfg && cfg.itens) {
    const SPECIAL = { monitor_duplo: [26, 5], pc_gamer: [25, 3] };
    const hasSpecial = cfg.itens.some(i => SPECIAL[i]);
    const slots = hasSpecial ? [[37,13],[48,13],[26,20]] : [[28,13],[39,13],[50,13],[26,20]];
    let si = 0;
    for (const item of cfg.itens) {
      if (SPECIAL[item]) { drawItem(g, item, x + SPECIAL[item][0], y + SPECIAL[item][1]); continue; }
      if (si >= slots.length) break;
      const [ox, oy] = slots[si++];
      drawItem(g, item, x + ox, y + oy);
    }
  }
}
function pChair(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x+2, y+18, 16, 4);
  g.fillStyle = '#334155'; g.fillRect(x+2, y+2, 16, 16);
  g.fillStyle = '#475569'; g.fillRect(x+4, y+4, 12, 12);
  g.fillStyle = '#1e293b'; g.fillRect(x, y, 20, 4);
}
function pMicBooth(g, x, y) {
  g.fillStyle = '#1e3a5f'; g.fillRect(x, y, 64, 34);
  g.fillStyle = '#2c4f7c'; g.fillRect(x+3, y+3, 58, 28);
  g.fillStyle = '#16263d';
  for (let i = 0; i < 7; i++) g.fillRect(x+6+i*8, y+5, 5, 5);
  g.fillStyle = '#cbd5e1'; g.fillRect(x+28, y+14, 8, 10); g.fillStyle = '#94a3b8'; g.fillRect(x+30, y+24, 4, 6);
  g.fillStyle = '#fbbf24'; g.fillRect(x+29, y+15, 6, 3);
}
function pPlant(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x+6, y+26, 18, 4);
  g.fillStyle = '#b45309'; g.fillRect(x+9, y+18, 14, 10);
  g.fillStyle = '#92400e'; g.fillRect(x+9, y+18, 14, 3);
  g.fillStyle = '#15803d'; g.fillRect(x+12, y+2, 8, 17);
  g.fillStyle = '#16a34a'; g.fillRect(x+5, y+6, 9, 9); g.fillRect(x+18, y+6, 9, 9);
  g.fillStyle = '#4ade80'; g.fillRect(x+13, y+4, 4, 4);
}
function pTree(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x+8, y+52, 28, 6);
  g.fillStyle = '#7c4a1e'; g.fillRect(x+18, y+36, 10, 18);
  g.fillStyle = '#2e7d32'; g.fillRect(x+4, y+10, 38, 30);
  g.fillStyle = '#388e3c'; g.fillRect(x+10, y+2, 26, 16);
  g.fillStyle = '#66bb6a'; g.fillRect(x+12, y+6, 10, 8); g.fillRect(x+26, y+16, 10, 8);
}
function pSofa(g, x, y, w) {
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x+2, y+26, w-4, 4);
  g.fillStyle = '#c2410c'; g.fillRect(x, y, w, 26);
  g.fillStyle = '#ea580c'; g.fillRect(x+4, y+8, w-8, 14);
  g.fillStyle = '#9a3412'; g.fillRect(x, y, w, 6);
  g.fillStyle = '#fb923c'; g.fillRect(x+6, y+10, (w-16)/2, 4); g.fillRect(x+w/2+2, y+10, (w-16)/2, 4);
}
function pCoffeeMachine(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x+2, y+40, 26, 5);
  g.fillStyle = '#44403c'; g.fillRect(x, y, 30, 42);
  g.fillStyle = '#292524'; g.fillRect(x+3, y+4, 24, 12);
  g.fillStyle = '#dc2626'; g.fillRect(x+5, y+6, 6, 4);
  g.fillStyle = '#4ade80'; g.fillRect(x+13, y+6, 4, 4);
  g.fillStyle = '#57534e'; g.fillRect(x+8, y+18, 14, 10);
  g.fillStyle = '#fff'; g.fillRect(x+12, y+26, 7, 7);
  g.fillStyle = '#78350f'; g.fillRect(x+13, y+28, 5, 2);
}
function pCounter(g, x, y, w) {
  g.fillStyle = '#9f6b3f'; g.fillRect(x, y+22, w, 8);
  g.fillStyle = '#d6a35c'; g.fillRect(x, y, w, 24);
  g.fillStyle = '#e7bd7e'; g.fillRect(x+2, y+3, w-4, 3);
}
function pTV(g, x, y, w, accent) {
  g.fillStyle = '#0f172a'; g.fillRect(x, y, w, 38);
  g.fillStyle = accent; g.fillRect(x+4, y+4, w-8, 30);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(x+10, y+10, w*0.3, 4); g.fillRect(x+10, y+18, w*0.5, 3); g.fillRect(x+10, y+25, w*0.4, 3);
}
function pCork(g, x, y, w) {
  g.fillStyle = '#92400e'; g.fillRect(x, y, w, 34);
  g.fillStyle = '#d9a866'; g.fillRect(x+3, y+3, w-6, 28);
  const notes = ['#fde047','#86efac','#93c5fd','#f9a8d4','#fdba74'];
  for (let i = 0; i < Math.floor((w-12)/16); i++) {
    g.fillStyle = notes[i % notes.length];
    g.fillRect(x+7+i*16, y+6+(i%2)*9, 12, 12);
  }
}
function pBookshelf(g, x, y) {
  g.fillStyle = '#7c4a1e'; g.fillRect(x, y, 30, 44);
  g.fillStyle = '#5c3613'; g.fillRect(x+3, y+4, 24, 10); g.fillRect(x+3, y+18, 24, 10); g.fillRect(x+3, y+32, 24, 9);
  const bs = ['#dc2626','#2563eb','#16a34a','#f59e0b','#7c3aed'];
  for (let s = 0; s < 3; s++) for (let i = 0; i < 5; i++) {
    g.fillStyle = bs[(s+i) % 5]; g.fillRect(x+4+i*4.5, y+5+s*14, 4, 8 - (s===2?1:0));
  }
}
function pMeetTable(g, x, y, w, h) {
  g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x+3, y+h-3, w-6, 5);
  g.fillStyle = '#8a5a2b'; g.fillRect(x, y, w, h);
  g.fillStyle = '#a8743e'; g.fillRect(x+4, y+4, w-8, h-8);
  g.fillStyle = '#c79055'; g.fillRect(x+6, y+6, w-12, 3);
}
function pElephant(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x+4, y+40, 52, 6);
  g.fillStyle = '#9ca3af';
  g.fillRect(x+10, y+10, 34, 24); g.fillRect(x+38, y+4, 18, 18);
  g.fillRect(x+50, y+20, 6, 14);
  g.fillRect(x+12, y+32, 7, 10); g.fillRect(x+26, y+32, 7, 10); g.fillRect(x+36, y+32, 7, 10);
  g.fillStyle = '#6b7280'; g.fillRect(x+36, y+6, 8, 12); g.fillRect(x+50, y+30, 6, 4);
  g.fillStyle = '#d1d5db'; g.fillRect(x+44, y+20, 5, 4);
  g.fillStyle = '#1f2937'; g.fillRect(x+48, y+9, 3, 3);
}
// 🥚 filhote de elefante — easter egg (escondido atrás de uma árvore)
function pBabyElephant(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x+2, y+20, 26, 3);
  g.fillStyle = '#b0b7c3';
  g.fillRect(x+4, y+6, 16, 11);  g.fillRect(x+17, y+3, 9, 9);      // corpo + cabeça
  g.fillRect(x+23, y+10, 3, 7);                                     // tromba
  g.fillRect(x+5, y+16, 4, 5); g.fillRect(x+13, y+16, 4, 5);        // patas
  g.fillStyle = '#8b93a3'; g.fillRect(x+16, y+4, 4, 6);             // orelha
  g.fillStyle = '#1f2937'; g.fillRect(x+22, y+5, 2, 2);             // olho
}
// Faixa de torcida (ex.: VEM HEXA! na Diretoria)
function pBanner(g, x, y, w, text) {
  g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x+3, y+24, w-6, 3);
  g.fillStyle = '#15803d'; g.fillRect(x, y, w, 24);                  // faixa verde
  g.fillStyle = '#fde047'; g.fillRect(x, y, w, 3); g.fillRect(x, y+21, w, 3); // bordas amarelas
  g.fillStyle = '#fde047';                                           // pontas
  g.beginPath(); g.moveTo(x, y); g.lineTo(x-8, y+12); g.lineTo(x, y+24); g.fill();
  g.beginPath(); g.moveTo(x+w, y); g.lineTo(x+w+8, y+12); g.lineTo(x+w, y+24); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 13px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x + w/2, y + 13);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
}
function pReception(g, x, y, label) {
  g.fillStyle = '#9f1239'; g.fillRect(x, y+24, 96, 8);
  g.fillStyle = '#cd1543'; g.fillRect(x, y, 96, 26);
  g.fillStyle = '#e11d48'; g.fillRect(x+3, y+3, 90, 4);
  g.fillStyle = '#fff'; g.font = 'bold 11px Inter'; g.textAlign = 'center';
  g.fillText(label || 'EPI-USE', x+48, y+18);
}
function pWaterCooler(g, x, y) {
  g.fillStyle = '#e2e8f0'; g.fillRect(x+4, y+14, 16, 26);
  g.fillStyle = '#bfdbfe'; g.fillRect(x+6, y, 12, 16);
  g.fillStyle = '#93c5fd'; g.fillRect(x+8, y+4, 8, 8);
}
// Trave de gol (campanha Gol de Placa 🇧🇷) — a BOLA é dinâmica (chutável
// com E): pintada por drawGoals() a cada frame, animada por kickGoal().
const goals = [];
function pGoal(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 2, y + 44, 92, 5);        // sombra
  g.fillStyle = '#f8fafc';
  g.fillRect(x, y, 4, 46); g.fillRect(x + 92, y, 4, 46); g.fillRect(x, y, 96, 4); // postes + travessão
  g.strokeStyle = 'rgba(226,232,240,0.75)'; g.lineWidth = 1;                 // rede
  for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(x + 4 + i * 11, y + 4); g.lineTo(x + 4 + i * 11, y + 44); g.stroke(); }
  for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(x + 4, y + 4 + j * 8); g.lineTo(x + 92, y + 4 + j * 8); g.stroke(); }
  if (!goals.some(gl => gl.x === x && gl.y === y)) goals.push({ x, y, phase: 'rest', t: 0, shake: 0 });
}
// NOVO v3: estande de exposição (mundo do colaborador)
function pStand(g, x, y, emoji, accent) {
  g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(x+4, y+52, 56, 6);       // sombra
  g.fillStyle = '#64748b'; g.fillRect(x+26, y+30, 12, 24);              // pedestal
  g.fillStyle = '#475569'; g.fillRect(x+26, y+30, 12, 4);
  g.fillStyle = '#0f172a'; g.fillRect(x, y, 64, 34);                    // painel
  g.fillStyle = accent || '#1e3a5f'; g.fillRect(x+3, y+3, 58, 28);
  g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x+3, y+3, 58, 8);  // brilho
  g.font = '17px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji || '⭐', x+32, y+18);
  g.textBaseline = 'alphabetic';
}
const P = { TS, drawItem, pDesk, pChair, pMicBooth, pPlant, pTree, pSofa, pCoffeeMachine, pCounter, pTV, pCork, pBookshelf, pMeetTable, pElephant, pBabyElephant, pBanner, pReception, pWaterCooler, pStand, pGoal };

// ── PRERENDER DO MUNDO (camada estática) ───────────────────────────
const world = document.createElement('canvas'); world.width = WW; world.height = WH;
let worldReady = false;

function prerenderWorld() {
  const g = world.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = mapTiles[r * COLS + c], x = c * TS, y = r * TS;
    if (t === T.GRASS || t === T.GARDEN) {
      g.fillStyle = ((r + c) % 2) ? '#7ec850' : '#83cd55'; g.fillRect(x, y, TS, TS);
      if ((r*7 + c*13) % 9 === 0) { g.fillStyle = '#6ab63f'; g.fillRect(x+8, y+10, 3, 3); g.fillRect(x+20, y+22, 3, 3); }
      if ((r*5 + c*11) % 13 === 0) { g.fillStyle = '#fef08a'; g.fillRect(x+14, y+6, 3, 3); }
    } else if (t === T.PATH) {
      g.fillStyle = '#dcc9a3'; g.fillRect(x, y, TS, TS);
      g.fillStyle = '#cdb88f'; g.fillRect(x+4, y+6, 10, 7); g.fillRect(x+18, y+18, 11, 8);
    } else if (t === T.FLOOR) {
      g.fillStyle = ((r + c) % 2) ? '#e8d5b5' : '#e2cda9'; g.fillRect(x, y, TS, TS);
      g.fillStyle = 'rgba(160,120,70,0.18)'; g.fillRect(x, y + TS - 2, TS, 1);
      if (c % 4 === 0) g.fillRect(x, y, 1, TS);
    } else if (t === T.WALL) {
      g.fillStyle = '#8a93a6'; g.fillRect(x, y, TS, TS);
      g.fillStyle = '#aab3c5'; g.fillRect(x, y, TS, 10);
      g.fillStyle = '#6e7789'; g.fillRect(x, y + TS - 5, TS, 5);
    } else if (RUG_COLORS[t]) {
      const rc = RUG_COLORS[t];
      g.fillStyle = ((r + c) % 2) ? rc.a : rc.b; g.fillRect(x, y, TS, TS);
    }
  }
  for (const k in ROOMS) {
    const R = ROOMS[k]; if (R.rug === T.GARDEN || !RUG_COLORS[R.rug]) continue;
    const rc = RUG_COLORS[R.rug];
    g.strokeStyle = rc.edge; g.lineWidth = 2;
    g.strokeRect((R.c0+1)*TS+1, (R.r0+1)*TS+1, (R.c1-R.c0-1)*TS-2, (R.r1-R.r0-1)*TS-2);
  }
  if (typeof W.furniture === 'function') W.furniture(P, g);
  // árvores externas (grama) — todas os mundos
  const TREES = [[0.3,0.3],[5,0.1],[12,0.2],[22,0.1],[33,0.2],[44,0.1],[52,0.3],[57.6,0.2],
                 [0.3,8],[0.3,16],[0.3,24],[0.3,31],[57.6,8],[57.6,16],[57.6,24],[57.6,31],
                 [3,33.6],[12,33.8],[20,33.7],[38,33.8],[46,33.6],[54,33.7]];
  for (const [tc, tr] of TREES) pTree(g, tc*TS, tr*TS);
  // tapete de entrada
  g.fillStyle = '#cd1543'; g.fillRect(28*TS+6, 32.2*TS, 4*TS-12, 18);
  g.fillStyle = '#fff'; g.font = 'bold 10px Inter'; g.textAlign = 'center';
  g.fillText('BEM-VINDO', 30*TS, 32.2*TS+13);
  // post-its de eventos REAIS no quadro (se o mundo tiver e os dados chegaram)
  if (W.eventsBoard && eventsNext.length) {
    const B = W.eventsBoard;
    const cols = ['#fde047','#86efac','#93c5fd'];
    g.textAlign = 'left';
    eventsNext.slice(0, 3).forEach((ev, i) => {
      const px = B.x + 8 + i * ((B.w - 16) / 3), py = B.y + 5, pw = (B.w - 16) / 3 - 6;
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(px+2, py+2, pw, 24);
      g.fillStyle = cols[i % 3]; g.fillRect(px, py, pw, 24);
      g.fillStyle = '#422006'; g.font = 'bold 8px Inter';
      g.fillText(ev.quando, px + 4, py + 10, pw - 8);
      g.font = '8px Inter';
      g.fillText(ev.n.slice(0, 14), px + 4, py + 19, pw - 8);
    });
  }
  worldReady = true;
}

// móveis sólidos do mundo
(function furnitureSolids() {
  for (const [c, r, w2, h2] of (W.solids || [])) fill(Math.floor(c), Math.floor(r), Math.ceil(w2), Math.ceil(h2), null, true);
})();

// ── DADOS REAIS (fetch — tudo de fonte real, nada inventado) ───────
let eventsNext = [];          // /api/events.json (calendário oficial)
let officeVersion = '';       // /api/changelog.json
let specialToday = null;      // /api/datas-especiais-2026.json
let teamMeta = {};            // /api/team.json — foco/aniversário por primeiro nome
let ssoUser = null;           // /api/auth/status
let golplacaKit = false;      // campanha Gol de Placa ativa → mascote de camisa 10 🇧🇷

fetch('/api/office-desks.json').then(r => r.json()).then(d => { DESKS = d.mesas || {}; prerenderWorld(); }).catch(()=>{});
fetch('/api/changelog.json').then(r => r.json()).then(d => { officeVersion = d.current || ''; }).catch(()=>{});
fetch('/api/events.json').then(r => r.json()).then(d => {
  const now = new Date(); const curM = now.getMonth() + 1, curD = now.getDate();
  const all = [];
  for (const aba of Object.values(d.abas || {})) {
    for (const ev of (aba.eventos || [])) {
      const dEnd = parseInt(String(ev.d).split(/[-–]/).pop(), 10) || 31;
      if (ev.m > curM || (ev.m === curM && dEnd >= curD)) {
        all.push({ m: ev.m, dStart: parseInt(ev.d, 10) || 1, n: ev.n, quando: ev.d + '/' + String(ev.m).padStart(2,'0'), local: ev.local || '' });
      }
    }
  }
  all.sort((a, b) => (a.m - b.m) || (a.dStart - b.dStart));
  eventsNext = all;
  if (W.eventsBoard) prerenderWorld();   // redesenha o quadro com os post-its
}).catch(()=>{});
fetch('/api/datas-especiais-2026.json').then(r => r.json()).then(d => {
  const hoje = new Date().toISOString().slice(0, 10);
  specialToday = (d.itens || []).find(i => i.data === hoje) || null;
}).catch(()=>{});
fetch('/api/campanhas-ativas.json').then(r => r.json()).then(d => {
  golplacaKit = (d.campanhas || []).some(c => c.id === 'golplaca' && c.ativa);
}).catch(()=>{});
fetch('/api/team.json').then(r => r.json()).then(d => {
  const put = (nome, info) => { if (nome) teamMeta[nome.split(' ')[0].toLowerCase()] = info; };
  for (const p of (d.lideranca || [])) put(p.nome, { aniversario: p.aniversario, foco: p.papel, cargo: p.cargo });
  for (const a of (d.areas || [])) {
    const r = a.responsavel || {};
    put(r.nome, { aniversario: r.aniversario, foco: a.foco, cargo: a.nome });
  }
}).catch(()=>{});

// ── INPUT (teclado + joystick + zoom) ──────────────────────────────
const keysHeld = {}; const keysJust = new Set();
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (!keysHeld[e.code]) keysJust.add(e.code);
  keysHeld[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') { closeModal(); closeInfo(); }
});
document.addEventListener('keyup', e => { keysHeld[e.code] = false; });
const isHeld = c => !!keysHeld[c];
const UP = () => isHeld('KeyW') || isHeld('ArrowUp');
const DOWN = () => isHeld('KeyS') || isHeld('ArrowDown');
const LEFT = () => isHeld('KeyA') || isHeld('ArrowLeft');
const RIGHT = () => isHeld('KeyD') || isHeld('ArrowRight');
const ACT = () => keysJust.has('KeyE') || keysJust.has('Space');

// zoom (+/− teclado · pinch mobile) — persiste
let Z = parseFloat(localStorage.getItem('office.zoom') || '1') || 1;
function setZoom(z) { Z = Math.max(0.7, Math.min(1.4, z)); localStorage.setItem('office.zoom', String(Z.toFixed(2))); }

// joystick
const joy = { active:false, dx:0, dy:0 };
const joyEl = document.getElementById('joy'), stickEl = document.getElementById('joy-stick');
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) {
  joyEl.classList.add('on');
  document.getElementById('btn-act').classList.add('on');
  const em = document.getElementById('emotes'); if (em) em.classList.add('on');
}
joyEl.addEventListener('touchstart', joyMove, {passive:false});
joyEl.addEventListener('touchmove', joyMove, {passive:false});
joyEl.addEventListener('touchend', () => { joy.active = false; joy.dx = joy.dy = 0; stickEl.style.left = '34px'; stickEl.style.top = '34px'; });
function joyMove(e) {
  e.preventDefault();
  const t = e.touches[0], rect = joyEl.getBoundingClientRect();
  let dx = t.clientX - rect.left - 60, dy = t.clientY - rect.top - 60;
  const m = Math.hypot(dx, dy) || 1, lim = Math.min(m, 40);
  dx = dx / m * lim; dy = dy / m * lim;
  joy.active = true; joy.dx = dx / 40; joy.dy = dy / 40;
  stickEl.style.left = (34 + dx) + 'px'; stickEl.style.top = (34 + dy) + 'px';
}
let actTouch = false;
document.getElementById('btn-act').addEventListener('touchstart', e => { e.preventDefault(); actTouch = true; });

// pinch zoom (2 dedos fora do joystick)
let pinchD = 0;
document.addEventListener('touchstart', e => { if (e.touches.length === 2) pinchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, {passive:true});
document.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && pinchD) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    setZoom(Z * (d / pinchD)); pinchD = d;
  }
}, {passive:true});
document.addEventListener('touchend', () => { pinchD = 0; }, {passive:true});

// ── PATHFINDING (BFS) ──────────────────────────────────────────────
function walkable(c, r) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  return !mapSolid[r * COLS + c];
}
function findPath(c0, r0, c1, r1) {
  if (!walkable(c1, r1) || (c0 === c1 && r0 === r1)) return null;
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  const q = [r0 * COLS + c0]; prev[r0 * COLS + c0] = r0 * COLS + c0;
  const target = r1 * COLS + c1;
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++];
    if (cur === target) break;
    const cc = cur % COLS, cr = (cur / COLS) | 0;
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nc = cc + dc, nr = cr + dr, ni = nr * COLS + nc;
      if (walkable(nc, nr) && prev[ni] === -1) { prev[ni] = cur; q.push(ni); }
    }
  }
  if (prev[target] === -1) return null;
  const path = [];
  let cur = target;
  while (cur !== r0 * COLS + c0) { path.push([cur % COLS, (cur / COLS) | 0]); cur = prev[cur]; }
  return path.reverse();
}

// ── PLAYER ─────────────────────────────────────────────────────────
const sp = W.spawn || { x: 29.5*TS, y: 31*TS };
const player = { x: sp.x, y: sp.y, dir:'up', walkF:0, walkT:0, walkPhase:0, moving:false, name:'', pal:null, path:null, blinkT: 3, blink:false, emote:null };

function solidAtPx(x, y, w, h) {
  for (const [px, py] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]) {
    const c = Math.floor(px / TS), r = Math.floor(py / TS);
    if (!walkable(c, r)) return true;
  }
  return false;
}

function stepWalkAnim(ent, dt, rate) {
  // ciclo 4 fases (a → idle → b → idle) — passo mais natural que o 2-frame da v1
  ent.walkT += dt;
  if (ent.walkT > rate) {
    ent.walkPhase = (ent.walkPhase + 1) % 4;
    ent.walkF = [1, 0, 2, 0][ent.walkPhase];
    ent.walkT = 0;
    return true; // trocou de frame (hook do som de passo)
  }
  return false;
}

function movePlayer(dt) {
  if (modalOpen || infoOpen) return;
  let dx = 0, dy = 0;
  if (UP()) dy -= 1; if (DOWN()) dy += 1; if (LEFT()) dx -= 1; if (RIGHT()) dx += 1;
  if (joy.active && (Math.abs(joy.dx) > 0.18 || Math.abs(joy.dy) > 0.18)) { dx = joy.dx; dy = joy.dy; }

  if (dx || dy) player.path = null;
  else if (player.path && player.path.length) {
    const [tc, tr] = player.path[0];
    const tx = tc * TS + TS/2 - 12, ty = tr * TS + TS/2 - 20;
    const ddx = tx - player.x, ddy = ty - player.y, dist = Math.hypot(ddx, ddy);
    if (dist < 4) { player.path.shift(); }
    else { dx = ddx / dist; dy = ddy / dist; }
  }

  if (dx && dy && Math.abs(dx) === 1 && Math.abs(dy) === 1) { dx *= 0.707; dy *= 0.707; }
  player.moving = !!(dx || dy);
  if (player.moving) {
    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
    else player.dir = dy > 0 ? 'down' : 'up';
  }

  const HB = 13, HOX = 5, HOY = 18;
  const nx = player.x + dx * PLAYER_SPEED * dt;
  const ny = player.y + dy * PLAYER_SPEED * dt;
  if (!solidAtPx(nx + HOX, player.y + HOY, HB, HB)) player.x = nx;
  if (!solidAtPx(player.x + HOX, ny + HOY, HB, HB)) player.y = ny;

  if (player.moving) { if (stepWalkAnim(player, dt, 0.12)) sfx('step'); }
  else { player.walkF = 0; player.walkPhase = 0; }

  // blink
  player.blinkT -= dt;
  if (player.blinkT <= 0) { player.blink = !player.blink; player.blinkT = player.blink ? 0.14 : 2.5 + Math.random() * 3; }
}

// click-to-move (coords ajustadas por zoom)
const gc = document.getElementById('gc');
gc.addEventListener('pointerdown', e => {
  if (modalOpen || infoOpen || !spawned) return;
  const wx = e.clientX / Z + cam.x, wy = e.clientY / Z + cam.y;
  const z = zoneAt(wx, wy);
  if (z && Math.hypot(z.px - (player.x+12), z.py - (player.y+16)) < z.r + 10) { runAction(z); return; }
  const tc = Math.floor(wx / TS), tr = Math.floor(wy / TS);
  const pc = Math.floor((player.x + 12) / TS), pr = Math.floor((player.y + 20) / TS);
  const path = findPath(pc, pr, tc, tr);
  if (path) player.path = path;
});
function zoneAt(wx, wy) {
  for (const z of (W.zones || [])) if (Math.hypot(z.px - wx, z.py - wy) < z.r * 0.7) return z;
  return null;
}

// ── NPCs com ROTINA POR HORÁRIO + FALAS ────────────────────────────
// Rotina padrão (hora real): café de manhã, mesa, almoço, mesa, lobby no
// fim do dia. Fora do expediente o NPC "vai pra casa" (some) — exceto
// rotina:false (fixo, ex. mascote) e os "late workers" determinísticos.
function scheduledRoom(npc, h) {
  if (npc.rotina === false) return npc.room;
  const hash = strHash(npc.id);
  if (h < 8 || h >= 19) return (h >= 19 && h < 23 && hash % 3 === 0) ? npc.room : null;
  if (h < 9.5)  return ROOMS.coffee ? 'coffee' : npc.room;
  if (h < 12)   return npc.room;
  if (h < 13.5) return (hash % 2 ? 'coffee' : 'lobby');
  if (h < 17)   return npc.room;
  if (h < 18.5) return ROOMS.lobby ? 'lobby' : npc.room;
  return npc.room;
}

const npcs = [];
function setupNPCs() {
  // primeiro nome de quem está jogando — do nome digitado E do login SSO
  // (assim um membro do time nunca vê um clone de si mesmo, mesmo com nome custom)
  const selfNames = [];
  if (player.name) selfNames.push(player.name.toLowerCase().split(' ')[0]);
  if (ssoUser) {
    const g = (ssoUser.given || ssoUser.name || '').toLowerCase().split(' ')[0];
    if (g) selfNames.push(g);
  }
  for (const t of (W.team || [])) {
    const meta = DESKS[t.id] || {};
    const nome = t.nome || meta.nome || t.id;
    const nomeLC = nome.toLowerCase();
    if (selfNames.some(n => n && (nomeLC.startsWith(n) || t.id === n))) continue;
    npcs.push({
      id: t.id, nome, area: (t.area || meta.area || ''),
      x: t.px * TS, y: t.py * TS, dir: 'down', walkF: 0, walkT: 0, walkPhase: 0, moving: false,
      pal: t.pal, sprite: t.sprite || 'char', room: t.room, rotina: t.rotina, card: t.card,
      falas: t.falas || [], falaIdx: strHash(t.id) % Math.max(1, (t.falas || []).length),
      path: null, idleT: Math.random() * 4 + 1,
      assignedRoom: t.room, off: false,
      bubble: null, bubbleCd: 2 + Math.random() * 3,
      blinkT: 2 + Math.random() * 4, blink: false, bday: false,
    });
  }
  // aniversário REAL (team.json) — chapéu + fala
  setTimeout(() => {
    const hoje = new Date(), dm = String(hoje.getDate()).padStart(2,'0') + '/' + String(hoje.getMonth()+1).padStart(2,'0');
    for (const n of npcs) {
      const meta = teamMeta[n.nome.split(' ')[0].toLowerCase()];
      if (meta && meta.aniversario === dm) {
        n.bday = true;
        n.falas = ['🎉 hoje é meu aniversário!'].concat(n.falas);
        toast('🎂 Hoje é aniversário de ' + n.nome.split(' ')[0] + '! Passa lá pra dar parabéns.');
      }
    }
  }, 1200);
}

function pathToRoom(n, roomKey) {
  const R = ROOMS[roomKey]; if (!R) return;
  for (let tries = 0; tries < 10; tries++) {
    const tc = R.c0 + 1 + Math.floor(Math.random() * (R.c1 - R.c0 - 1));
    const tr = R.r0 + 1 + Math.floor(Math.random() * (R.r1 - R.r0 - 1));
    if (!walkable(tc, tr)) continue;
    const pc = Math.floor((n.x+12)/TS), pr = Math.floor((n.y+20)/TS);
    const p = findPath(pc, pr, tc, tr);
    if (p && p.length < 220) { n.path = p; return; }
  }
}

function moveNPC(n, dt) {
  const h = nowHour();
  const target = scheduledRoom(n, h);
  if (target === null) { n.off = true; return; }   // fora do expediente
  n.off = false;
  if (target !== n.assignedRoom) { n.assignedRoom = target; pathToRoom(n, target); }

  if (n.path && n.path.length) {
    const [tc, tr] = n.path[0];
    const tx = tc*TS + TS/2 - 12, ty = tr*TS + TS/2 - 20;
    const dx = tx - n.x, dy = ty - n.y, dist = Math.hypot(dx, dy);
    if (dist < 3) { n.path.shift(); if (!n.path.length) { n.moving = false; n.idleT = 2 + Math.random()*5; } }
    else {
      n.moving = true;
      n.x += dx/dist * NPC_SPEED * dt; n.y += dy/dist * NPC_SPEED * dt;
      n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      stepWalkAnim(n, dt, 0.16);
    }
  } else {
    n.moving = false; n.walkF = 0;
    n.idleT -= dt;
    if (n.idleT <= 0) {
      const R = ROOMS[n.assignedRoom];
      if (R) {
        for (let tries = 0; tries < 8; tries++) {
          const tc = R.c0 + 1 + Math.floor(Math.random() * (R.c1 - R.c0 - 1));
          const tr = R.r0 + 1 + Math.floor(Math.random() * (R.r1 - R.r0 - 1));
          if (!walkable(tc, tr)) continue;
          const pc = Math.floor((n.x+12)/TS), pr = Math.floor((n.y+20)/TS);
          const p = findPath(pc, pr, tc, tr);
          if (p && p.length < 26) { n.path = p; break; }
        }
      }
      n.idleT = 3 + Math.random() * 6;
    }
  }
  // blink
  n.blinkT -= dt;
  if (n.blinkT <= 0) { n.blink = !n.blink; n.blinkT = n.blink ? 0.14 : 2.5 + Math.random() * 4; }
  // balão de fala quando o player chega perto
  n.bubbleCd -= dt;
  const near = Math.hypot(n.x - player.x, n.y - player.y) < 110;
  if (near && n.bubbleCd <= 0 && n.falas.length) {
    let txt = n.falas[n.falaIdx % n.falas.length];
    if (h >= 19 && n.rotina !== false) txt = 'só terminando um deck… 🌙';
    n.falaIdx++;
    n.bubble = { text: txt, until: performance.now() + 3400 };
    n.bubbleCd = 7 + Math.random() * 4;
  }
  if (n.bubble && performance.now() > n.bubble.until) n.bubble = null;
}

// ── PRESENÇA MULTIPLAYER (/api/game/presence) ──────────────────────
const others = new Map();     // id → {x,y,tx,ty,dir,moving,name,shirt,pal,emote,emoteT}
let onlineCount = 1;
let anonId = localStorage.getItem('office.anon') || '';
if (!anonId) { anonId = Math.random().toString(36).slice(2, 12); localStorage.setItem('office.anon', anonId); }

async function presenceTick() {
  if (!spawned) return;
  try {
    const r = await fetch('/api/game/presence', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        world: W.id, anonId,
        x: Math.round(player.x), y: Math.round(player.y),
        dir: player.dir, moving: player.moving, name: player.name,
        shirt: player.pal ? player.pal.shirt : '#cd1543',
        emote: player.emote ? player.emote.e : null,
        emoteT: player.emote ? player.emote.at : 0,
      })
    });
    if (!r.ok) return;
    const d = await r.json();
    onlineCount = (d.others ? d.others.length : 0) + 1;
    const seen = new Set();
    for (const o of (d.others || [])) {
      seen.add(o.id);
      let e = others.get(o.id);
      if (!e) { e = { x: o.x, y: o.y, walkF: 0, walkT: 0, walkPhase: 0 }; others.set(o.id, e); }
      e.tx = o.x; e.ty = o.y; e.dir = o.dir || 'down'; e.moving = !!o.moving;
      e.name = o.name || '?'; e.pal = palFor(o.name || o.id, o.shirt);
      e.emote = o.emote; e.emoteT = o.emoteT || 0;
    }
    for (const k of others.keys()) if (!seen.has(k)) others.delete(k);
    const pill = document.getElementById('hud-online');
    if (pill) pill.textContent = '👥 ' + onlineCount + (onlineCount === 1 ? ' (só você)' : ' online');
  } catch {}
}
setInterval(presenceTick, 2000);
addEventListener('pagehide', () => {
  try { navigator.sendBeacon('/api/game/presence', new Blob([JSON.stringify({ world: W.id, anonId, bye: true })], { type: 'application/json' })); } catch {}
});

function updateOthers(dt) {
  for (const e of others.values()) {
    if (e.tx == null) continue;
    const k = Math.min(1, dt * 4);
    e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k;
    const moving = Math.hypot(e.tx - e.x, e.ty - e.y) > 2;
    if (moving) stepWalkAnim(e, dt, 0.14); else { e.walkF = 0; }
    e.movingNow = moving;
  }
}

// ── EMOTES ─────────────────────────────────────────────────────────
const EMOTES = ['👋','❤️','😄','🎉'];
function doEmote(i) {
  const e = EMOTES[i]; if (!e || !spawned) return;
  player.emote = { e, at: Date.now() };
  sfx('emote');
  presenceTick(); // replica na hora
}
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const m = e.code.match(/^Digit([1-4])$/);
  if (m) doEmote(parseInt(m[1], 10) - 1);
});
(function bindEmoteButtons() {
  document.querySelectorAll('.em-btn').forEach((b, i) => {
    b.addEventListener('touchstart', ev => { ev.preventDefault(); doEmote(i); }, {passive:false});
    b.addEventListener('click', () => doEmote(i));
  });
})();
function drawEmote(sx, sy, e, at) {
  const age = (Date.now() - at) / 1000;
  if (age > 2.2) return;
  const rise = Math.min(age * 18, 22), fade = age > 1.6 ? 1 - (age - 1.6) / 0.6 : 1;
  ctx.globalAlpha = Math.max(0, fade);
  ctx.font = '18px Inter'; ctx.textAlign = 'center';
  ctx.fillText(e, sx, sy - 20 - rise);
  ctx.globalAlpha = 1;
}

// ── CÂMERA ─────────────────────────────────────────────────────────
const cam = { x: 0, y: 0 };
function updateCamera(vw, vh) {
  const tx = Math.max(0, Math.min(player.x + 12 - vw/2, WW - vw));
  const ty = Math.max(0, Math.min(player.y + 16 - vh/2, WH - vh));
  cam.x += (tx - cam.x) * 0.10;
  cam.y += (ty - cam.y) * 0.10;
}

// ── MODAL / INFO / TOAST ───────────────────────────────────────────
let modalOpen = false, infoOpen = false;
const modalEl = document.getElementById('modal'), frameEl = document.getElementById('modal-frame');
function openModal(url) { frameEl.src = url; modalEl.classList.add('on'); modalOpen = true; }
function closeModal() { modalEl.classList.remove('on'); frameEl.src = 'about:blank'; modalOpen = false; }
document.getElementById('modal-x').addEventListener('click', closeModal);
modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });

const infoEl = document.getElementById('info'), infoCard = document.getElementById('info-card');
function openInfo(html) { infoCard.innerHTML = html; infoEl.classList.add('on'); infoOpen = true; }
function closeInfo() { infoEl.classList.remove('on'); infoOpen = false; }
window.closeInfo = closeInfo;
infoEl.addEventListener('click', e => { if (e.target === infoEl) closeInfo(); });

let toastT = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function runAction(z) {
  const a = z.action;
  sfx('blip');
  questVisit('zone', z.id);
  // registro silencioso de participação em campanha (nada é exibido)
  if (a.coinsEvento) {
    try { fetch('/api/game/coins', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ evento: a.coinsEvento, ref: z.id }), keepalive:true }).catch(()=>{}); } catch {}
  }
  if (a.type === 'iframe') openModal(a.url);
  else if (a.type === 'info') {
    openInfo(`
      <div class="info-head"><div class="info-ava">${a.emoji || 'ℹ️'}</div>
        <div><div class="info-title">${escH(a.title)}</div><div class="info-sub">${escH(a.sub || '')}</div></div></div>
      <div class="info-body">${escH(a.body)}</div>
      <div class="info-actions"><button class="info-btn pri" onclick="closeInfo()">Fechar</button></div>`);
  }
  else if (a.type === 'confirm-external') openConfirmExternal(a);
  else if (a.type === 'goal') kickGoal(z, a);   // ⚽ chuta a bola pro gol, depois abre o card
  else if (a.type === 'egg') foundEgg();        // 🐘 easter egg do filhote
  else if (a.type === 'person') showPerson(a.id);
}

// 🥚 EASTER EGG — filhote de elefante escondido → conquista "Guardião dos
// Elefantes". Na 1ª descoberta o server registra e avisa o time por email.
function foundEgg() {
  const k = 'office.egg.elefantes';
  let again = false;
  try { again = !!localStorage.getItem(k); localStorage.setItem(k, new Date().toISOString()); } catch {}
  if (!again) {
    sfx('win'); confettiBurst();
    try { fetch('/api/game/egg', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ world: W.id }), keepalive:true }).catch(()=>{}); } catch {}
  }
  openInfo(`
    <div class="info-head"><div class="info-ava">🐘</div>
      <div><div class="info-title">${again ? 'Vocês já se conhecem 🐾' : '🏆 Conquista desbloqueada!'}</div>
      <div class="info-sub">Guardião dos Elefantes · ERP.ngo</div></div></div>
    <div class="info-body">${again
      ? 'O filhote continua aqui, seguro atrás da árvore — graças a você. 💚'
      : 'Você achou o filhote de elefante escondido no jardim! 🐘\n\nNa vida real é assim também: o grupo groupelephant.com destina 1% da receita global pra conservação de elefantes e rinocerontes e combate à pobreza rural na África.\n\nPouca gente acha esse cantinho — o time já foi avisado da sua descoberta. 😉'}</div>
    <div class="info-actions"><button class="info-btn pri" onclick="closeInfo()">${again ? 'Até mais 🐾' : 'Demais! 🎉'}</button></div>`);
}

function openConfirmExternal(a) {
  openInfo(`
    <div class="info-head"><div class="info-ava">${a.emoji || '↗'}</div>
      <div><div class="info-title">${escH(a.title)}</div><div class="info-sub">${escH(a.sub || 'abre em nova aba')}</div></div></div>
    <div class="info-body">${escH(a.body)}</div>
    <div class="info-actions">
      <button class="info-btn sec" onclick="closeInfo()">Agora não</button>
      <button class="info-btn pri" data-url="${escH(a.url)}" onclick="window.open(this.dataset.url,'_blank');closeInfo()">Abrir ↗</button>
    </div>`);
}

function showPerson(id) {
  const m = DESKS[id] || {};
  const meta = teamMeta[(m.nome || id).split(' ')[0].toLowerCase()] || {};
  const itens = (m.itens || []).map(i => `<span class="info-item">${ITEM_LABELS[i] || i}</span>`).join('');
  const flag = m.padrao ? `<div class="info-flag">📝 Itens padrão — personalização real da mesa pendente (manda os itens reais pro Rudá que ele atualiza o office-desks.json)</div>` : '';
  const foco = meta.foco ? `<div class="info-body" style="margin-top:10px"><b>Foco:</b> ${escH(meta.foco)}</div>` : '';
  const nasc = meta.aniversario ? `<span class="info-item ok">🎂 ${escH(meta.aniversario)}</span>` : '';
  openInfo(`
    <div class="info-head"><div class="info-ava" style="--ac:${m.cor || '#001844'}">👤</div>
      <div><div class="info-title">${escH(m.nome || id)}</div><div class="info-sub">${escH(meta.cargo || m.area || '')}</div></div></div>
    ${foco}
    <div class="info-body" style="margin-top:10px">Na mesa:</div>
    <div class="info-items">${itens || '<span class="info-item">— sem itens ainda</span>'}${nasc}</div>
    ${flag}
    <div class="info-actions"><button class="info-btn pri" onclick="closeInfo()">Fechar</button></div>`);
}

// NPC interativo: E perto de um NPC abre o cartão da pessoa
function npcNear() {
  let best = null, bd = 1e9;
  for (const n of npcs) {
    if (n.off) continue;
    const d = Math.hypot(n.x - player.x, n.y - player.y);
    if (d < 52 && d < bd) { best = n; bd = d; }
  }
  return best;
}

// ── QUEST DE EXPLORAÇÃO ────────────────────────────────────────────
const quest = W.quest || null;
const questKey = 'office.quest.' + W.id;
let questSet = new Set();
try { questSet = new Set(JSON.parse(localStorage.getItem(questKey) || '[]')); } catch {}
let questDone = quest ? questSet.size >= quest.targets.length : false;

function questVisit(type, key) {
  if (!quest || questDone) return;
  const t = quest.targets.find(t => t.type === type && t.key === key);
  if (!t || questSet.has(t.key)) return;
  questSet.add(t.key);
  localStorage.setItem(questKey, JSON.stringify([...questSet]));
  updateQuestPill();
  if (questSet.size >= quest.targets.length) {
    questDone = true;
    confettiBurst();
    sfx('win');
    // registro silencioso de participação (nada é exibido ao jogador)
    try { fetch('/api/game/coins', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ evento:'quest', ref: W.id }), keepalive:true }).catch(()=>{}); } catch {}
    setTimeout(() => openInfo(`
      <div class="info-head"><div class="info-ava">🏅</div>
        <div><div class="info-title">${escH(quest.doneTitle)}</div><div class="info-sub">${escH(quest.titulo)}</div></div></div>
      <div class="info-body">${escH(quest.doneBody)}</div>
      <div class="info-actions"><button class="info-btn pri" onclick="closeInfo()">🎉 Aê!</button></div>`), 600);
  } else {
    toast('📋 ' + t.label + ' ✓ (' + questSet.size + '/' + quest.targets.length + ')');
  }
}
function updateQuestPill() {
  const el = document.getElementById('hud-quest');
  if (!el || !quest) return;
  el.textContent = '📋 ' + Math.min(questSet.size, quest.targets.length) + '/' + quest.targets.length;
  if (questDone) el.classList.add('done');
}
(function bindQuestPill() {
  const el = document.getElementById('hud-quest');
  if (!el || !quest) { if (el) el.style.display = 'none'; return; }
  el.addEventListener('click', () => {
    const rows = quest.targets.map(t =>
      `<span class="info-item ${questSet.has(t.key) ? 'ok' : ''}">${questSet.has(t.key) ? '✓ ' : ''}${escH(t.label)}</span>`).join('');
    openInfo(`
      <div class="info-head"><div class="info-ava">📋</div>
        <div><div class="info-title">${escH(quest.titulo)}</div><div class="info-sub">${questSet.size}/${quest.targets.length} concluído</div></div></div>
      <div class="info-items">${rows}</div>
      <div class="info-actions"><button class="info-btn pri" onclick="closeInfo()">Fechar</button></div>`);
  });
})();

// confetti (screen-space)
const confetti = [];
function confettiBurst() {
  const cols = ['#cd1543','#fbbf24','#10b981','#3b82f6','#a78bfa','#f472b6'];
  for (let i = 0; i < 120; i++) {
    confetti.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 220, y: -14 - Math.random() * 140,
      vx: (Math.random() - 0.5) * 130, vy: 90 + Math.random() * 160,
      w: 5 + Math.random() * 5, h: 3 + Math.random() * 4,
      c: cols[i % cols.length], rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 7,
    });
  }
}
function drawConfetti(dt) {
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
    if (c.y > innerHeight + 20) { confetti.splice(i, 1); continue; }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = c.c; ctx.fillRect(-c.w/2, -c.h/2, c.w, c.h);
    ctx.restore();
  }
}

// ── PARTÍCULAS + DECOR ANIMADO ─────────────────────────────────────
const particles = [];
let decorT = 0;
const butterflies = [];
(function initButterflies() {
  if (!(W.animDecor || []).some(d => d.type === 'butterflies')) return;
  for (let i = 0; i < 3; i++) {
    butterflies.push({
      x: Math.random() * WW, y: (Math.random() < 0.5 ? 1 : 34.5) * TS,
      a: Math.random() * Math.PI * 2, t: 0, c: ['#f9a8d4','#fde047','#93c5fd'][i],
    });
  }
})();

function updateDecor(dt) {
  decorT += dt;
  for (const d of (W.animDecor || [])) {
    if (d.type === 'steam' && Math.random() < dt * 3) {
      particles.push({ x: d.x + Math.random()*6 - 3, y: d.y, vx: (Math.random()-0.5)*4, vy: -13 - Math.random()*6, life: 0, max: 1.6, type: 'steam' });
    }
    if (d.type === 'cooler' && Math.random() < dt * 1.2) {
      particles.push({ x: d.x + 2 + Math.random()*8, y: d.y + 12, vx: 0, vy: -9, life: 0, max: 1.1, type: 'bubble' });
    }
    if (d.type === 'leaves' && Math.random() < dt * 0.7) {
      particles.push({ x: d.x + Math.random()*d.w, y: d.y, vx: 8 + Math.random()*8, vy: 14 + Math.random()*8, life: 0, max: 3.2, type: 'leaf' });
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life > p.max) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt + (p.type === 'leaf' ? Math.sin(p.life * 5) * 14 * dt : 0);
    p.y += p.vy * dt;
  }
  for (const b of butterflies) {
    b.t += dt;
    b.a += (Math.random() - 0.5) * dt * 3;
    b.x += Math.cos(b.a) * 26 * dt; b.y += Math.sin(b.a) * 18 * dt;
    // mantém na faixa de grama (fora do prédio)
    if (b.x < 8 || b.x > WW - 8) b.a = Math.PI - b.a;
    if (b.y < 8) { b.y = 8; b.a = -b.a; }
    if (b.y > WH - 8) { b.y = WH - 8; b.a = -b.a; }
    if (b.y > 2.2*TS && b.y < 33.5*TS && b.x > 2*TS && b.x < 57.5*TS) b.y = b.y < 17*TS ? 1.4*TS : 34.4*TS;
  }
  updateGoals(dt);
}

// ── GOL DE PLACA: bola chutável ────────────────────────────────────
// rest = bola parada na marca do pênalti · fly = voando pro gol ·
// net = balançando a rede; depois volta sozinha pro pênalti.
const KICK_FLY = 0.55, KICK_NET = 1.6;
function updateGoals(dt) {
  for (const gl of goals) {
    if (gl.phase === 'fly') {
      gl.t += dt;
      if (gl.t >= KICK_FLY) { gl.phase = 'net'; gl.t = 0; gl.shake = 1; }
    } else if (gl.phase === 'net') {
      gl.t += dt; gl.shake = Math.max(0, gl.shake - dt * 0.8);
      if (gl.t >= KICK_NET) { gl.phase = 'rest'; gl.t = 0; }
    }
  }
}
function drawGoals() {
  for (const gl of goals) {
    let bx = gl.x + 48, by = gl.y + 56, r = 7;
    if (gl.phase === 'fly') {
      const k = Math.min(1, gl.t / KICK_FLY);
      by = gl.y + 56 - 34 * k - Math.sin(k * Math.PI) * 12;  // sobe até a rede com arco
      r = 7 - 2.5 * k;                                        // "afasta" (perspectiva)
    } else if (gl.phase === 'net') {
      bx += Math.sin(gl.t * 26) * gl.shake * 2.5;
      by = gl.y + 22; r = 4.5;
    }
    const x = bx - cam.x, y = by - cam.y;
    if (x < -30 || x > gc.clientWidth / Z + 30 || y < -30 || y > gc.clientHeight / Z + 30) continue;
    if (gl.phase === 'rest') { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - 6, y + 6, 13, 3); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a';
    const s = r / 7;
    ctx.fillRect(x - 3 * s, y - 3 * s, 4 * s, 4 * s); ctx.fillRect(x + 2 * s, y + 1 * s, 3 * s, 3 * s);
  }
}
function kickGoal(z, a) {
  let g0 = null, bd = 1e9;
  for (const gl of goals) {
    const d = Math.hypot(gl.x + 48 - z.px, gl.y + 56 - z.py);
    if (d < bd) { bd = d; g0 = gl; }
  }
  if (!g0) { openConfirmExternal(a); return; }       // mundo sem trave — vai direto pro card
  if (g0.phase !== 'rest') return;                    // bola ainda voltando — segura o replay
  g0.phase = 'fly'; g0.t = 0;
  setTimeout(() => {
    sfx('win'); confettiBurst();
    toast('⚽ GOOOOL DE PLACA! Agora manda teu elogio 🇧🇷');
  }, KICK_FLY * 1000);
  setTimeout(() => { if (!modalOpen && !infoOpen) openConfirmExternal(a); }, 1500);
}

function drawDecor() {
  // plantas com sway (2 frames)
  const sway = Math.sin(decorT * 1.8) > 0 ? 1 : 0;
  for (const d of (W.animDecor || [])) {
    if (d.type === 'plant') {
      const x = d.x - cam.x, y = d.y - cam.y;
      if (x < -40 || x > gc.clientWidth / Z + 40 || y < -40 || y > gc.clientHeight / Z + 40) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x+6, y+26, 18, 4);
      ctx.fillStyle = '#b45309'; ctx.fillRect(x+9, y+18, 14, 10);
      ctx.fillStyle = '#92400e'; ctx.fillRect(x+9, y+18, 14, 3);
      ctx.fillStyle = '#15803d'; ctx.fillRect(x+12, y+2, 8, 17);
      ctx.fillStyle = '#16a34a'; ctx.fillRect(x+5-sway, y+6, 9, 9); ctx.fillRect(x+18+sway, y+6, 9, 9);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(x+13, y+4-sway, 4, 4);
    }
    if (d.type === 'tv' && d.content) drawTVContent(d);
  }
  // partículas
  for (const p of particles) {
    const x = p.x - cam.x, y = p.y - cam.y, k = 1 - p.life / p.max;
    if (p.type === 'steam') { ctx.fillStyle = `rgba(255,255,255,${0.45*k})`; const s = 3 + p.life*4; ctx.fillRect(x-s/2, y-s/2, s, s); }
    else if (p.type === 'bubble') { ctx.fillStyle = `rgba(255,255,255,${0.7*k})`; ctx.fillRect(x, y, 3, 3); }
    else if (p.type === 'leaf') { ctx.fillStyle = `rgba(101,163,13,${0.85*k})`; ctx.fillRect(x, y, 5, 4); }
  }
  // borboletas
  for (const b of butterflies) {
    const x = b.x - cam.x, y = b.y - cam.y;
    const wing = Math.sin(b.t * 14) > 0 ? 3 : 1;
    ctx.fillStyle = b.c;
    ctx.fillRect(x - wing - 2, y - 2, wing + 2, 4); ctx.fillRect(x + 1, y - 2, wing + 2, 4);
    ctx.fillStyle = '#44403c'; ctx.fillRect(x - 1, y - 3, 2, 6);
  }
  drawGoals();
}

// TV com conteúdo REAL ciclando (versão · eventos · data especial · online)
function drawTVContent(d) {
  const x = d.x + 4 - cam.x, y = d.y + 4 - cam.y, w = d.w - 8, h = 30;
  if (x < -w || x > gc.clientWidth / Z || y < -h || y > gc.clientHeight / Z) return;
  const panels = [];
  panels.push({ t1: 'EPI-USE OFFICE', t2: officeVersion ? 'v' + officeVersion : '' });
  if (eventsNext[0]) panels.push({ t1: '📅 ' + eventsNext[0].quando, t2: eventsNext[0].n.slice(0, 24) });
  if (eventsNext[1]) panels.push({ t1: '📅 ' + eventsNext[1].quando, t2: eventsNext[1].n.slice(0, 24) });
  if (specialToday) panels.push({ t1: '✨ hoje', t2: specialToday.nome.slice(0, 24) });
  if (onlineCount > 1) panels.push({ t1: '👥 ' + onlineCount + ' online', t2: 'no escritório agora' });
  const p = panels[Math.floor(decorT / 4) % panels.length];
  ctx.fillStyle = 'rgba(2,8,26,0.88)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#7dd3fc'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'left';
  ctx.fillText(p.t1, x + 8, y + 13, w - 14);
  ctx.fillStyle = '#e2e8f0'; ctx.font = '9px Inter';
  ctx.fillText(p.t2, x + 8, y + 24, w - 14);
  // scanline sutil
  ctx.fillStyle = 'rgba(125,211,252,0.10)';
  ctx.fillRect(x, y + ((decorT * 18) % h), w, 2);
}

// ── ILUMINAÇÃO POR HORA REAL ───────────────────────────────────────
const lightCv = document.createElement('canvas');
function lightPhase(h) {
  if (h >= 6 && h < 9) return 'manha';
  if (h >= 9 && h < 17) return 'dia';
  if (h >= 17 && h < 19) return 'tarde';
  return 'noite';
}
function drawLighting(vw, vh) {
  const ph = lightPhase(nowHour());
  if (ph === 'dia') return;
  if (ph === 'manha') { ctx.fillStyle = 'rgba(255,196,110,0.09)'; ctx.fillRect(0, 0, vw, vh); return; }
  if (ph === 'tarde') { ctx.fillStyle = 'rgba(255,126,54,0.14)'; ctx.fillRect(0, 0, vw, vh); return; }
  // noite: escuridão com poças de luz nas salas e TVs
  if (lightCv.width !== gc.width) { lightCv.width = gc.width; lightCv.height = gc.height; }
  const lg = lightCv.getContext('2d');
  lg.setTransform(1, 0, 0, 1, 0, 0);
  lg.clearRect(0, 0, lightCv.width, lightCv.height);
  lg.setTransform(DPR * Z, 0, 0, DPR * Z, 0, 0);
  lg.fillStyle = 'rgba(7,13,40,0.52)';
  lg.fillRect(0, 0, vw, vh);
  lg.globalCompositeOperation = 'destination-out';
  const pool = (wx, wy, r) => {
    const sx = wx - cam.x, sy = wy - cam.y;
    if (sx < -r || sx > vw + r || sy < -r || sy > vh + r) return;
    const grad = lg.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
    grad.addColorStop(0, 'rgba(0,0,0,0.9)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = grad;
    lg.beginPath(); lg.arc(sx, sy, r, 0, Math.PI * 2); lg.fill();
  };
  for (const k in ROOMS) {
    const R = ROOMS[k];
    pool((R.c0 + R.c1 + 1) / 2 * TS, (R.r0 + R.r1 + 1) / 2 * TS, Math.max(R.c1 - R.c0, 6) * TS * 0.72);
  }
  for (const d of (W.animDecor || [])) if (d.type === 'tv') pool(d.x + d.w / 2, d.y + 20, 130);
  pool(player.x + 12, player.y + 16, 120);   // lanterna do player
  lg.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lightCv, 0, 0);
  ctx.setTransform(DPR * Z, 0, 0, DPR * Z, 0, 0);
}

// ── SONS PROCEDURAIS (WebAudio · off por padrão) ───────────────────
let audioOn = localStorage.getItem('office.sound') === '1';
let AC = null;
function ensureAC() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } return AC; }
function sfx(kind) {
  if (!audioOn || !ensureAC()) return;
  const t = AC.currentTime;
  if (kind === 'step') {
    const buf = AC.createBuffer(1, 800, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < 800; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / 800) * 0.25;
    const src = AC.createBufferSource(); src.buffer = buf;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const gn = AC.createGain(); gn.gain.value = 0.35;
    src.connect(f); f.connect(gn); gn.connect(AC.destination); src.start(t);
  } else if (kind === 'blip' || kind === 'emote') {
    const o = AC.createOscillator(), gn = AC.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(kind === 'blip' ? 520 : 720, t);
    o.frequency.exponentialRampToValueAtTime(kind === 'blip' ? 780 : 980, t + 0.07);
    gn.gain.setValueAtTime(0.10, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(gn); gn.connect(AC.destination); o.start(t); o.stop(t + 0.15);
  } else if (kind === 'win') {
    [523, 659, 784, 1047].forEach((fq, i) => {
      const o = AC.createOscillator(), gn = AC.createGain();
      o.type = 'triangle'; o.frequency.value = fq;
      gn.gain.setValueAtTime(0.12, t + i * 0.12); gn.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
      o.connect(gn); gn.connect(AC.destination); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.32);
    });
  }
}
(function bindSound() {
  const el = document.getElementById('hud-sound');
  if (!el) return;
  const paint = () => { el.textContent = audioOn ? '🔊' : '🔇'; };
  paint();
  el.addEventListener('click', () => {
    audioOn = !audioOn; localStorage.setItem('office.sound', audioOn ? '1' : '0');
    if (audioOn) { ensureAC(); if (AC && AC.state === 'suspended') AC.resume(); sfx('blip'); }
    paint();
  });
})();

// ── HUD helpers ────────────────────────────────────────────────────
const hudZone = document.getElementById('hud-zone');
const promptEl = document.getElementById('prompt'), promptTxt = document.getElementById('prompt-txt');

function roomOf(px, py) {
  const c = Math.floor(px / TS), r = Math.floor(py / TS);
  for (const k in ROOMS) {
    const R = ROOMS[k];
    if (c >= R.c0 && c <= R.c1 && r >= R.r0 && r <= R.r1) return { key: k, ...R };
  }
  return null;
}

// ── RENDER ─────────────────────────────────────────────────────────
const ctx = gc.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
function resize() {
  gc.width = Math.round(innerWidth * DPR); gc.height = Math.round(innerHeight * DPR);
  gc.style.width = innerWidth + 'px'; gc.style.height = innerHeight + 'px';
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x+r, y); g.arcTo(x+w, y, x+w, y+h, r); g.arcTo(x+w, y+h, x, y+h, r);
  g.arcTo(x, y+h, x, y, r); g.arcTo(x, y, x+w, y, r); g.closePath();
}

function drawChar(c) {
  const x = c.x, y = c.y;
  const spr = c.sprite === 'elephant'
    ? elephantSprite(c.dir, c.f, golplacaKit)
    : charSprite(c.pal, c.dir, c.f, c.blink);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x - cam.x + 12, y - cam.y + 31, 9, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.drawImage(spr, Math.round(x - cam.x), Math.round(y - cam.y));
  const sx = x - cam.x + 12;
  // chapéu de aniversário (dado real do team.json)
  if (c.bday) {
    ctx.fillStyle = '#f472b6'; ctx.beginPath();
    ctx.moveTo(sx - 5, y - cam.y + 1); ctx.lineTo(sx + 5, y - cam.y + 1); ctx.lineTo(sx, y - cam.y - 8); ctx.fill();
    ctx.fillStyle = '#fde047'; ctx.fillRect(sx - 1.5, y - cam.y - 10, 3, 3);
  }
  if (c.name) {
    const sy = y - cam.y - 8 + (c.moving ? Math.sin(performance.now() / 90) * 0.8 : 0);
    ctx.font = '700 10px Inter';
    const w = ctx.measureText(c.name).width + 16;
    ctx.fillStyle = c.pl ? 'rgba(0,24,68,0.92)' : (c.remote ? 'rgba(220,252,231,0.95)' : 'rgba(255,255,255,0.94)');
    rr(ctx, sx - w/2, sy - 7, w, 15, 8); ctx.fill();
    ctx.fillStyle = c.pl ? '#fff' : (c.remote ? '#166534' : '#1e293b');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.name, sx, sy + 0.5);
    ctx.textBaseline = 'alphabetic';
  }
  if (c.bubble) drawBubble(sx, y - cam.y - 18, c.bubble.text);
  if (c.emote && c.emoteAt) drawEmote(sx, y - cam.y, c.emote, c.emoteAt);
}

function drawBubble(sx, sy, text) {
  ctx.font = '600 10px Inter';
  const w = Math.min(ctx.measureText(text).width + 18, 220);
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  rr(ctx, sx - w/2, sy - 20, w, 20, 9); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx, sy + 5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,24,68,0.12)'; ctx.lineWidth = 1;
  rr(ctx, sx - w/2, sy - 20, w, 20, 9); ctx.stroke();
  ctx.fillStyle = '#1e293b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, sx, sy - 9.5, w - 12);
  ctx.textBaseline = 'alphabetic';
}

function drawRoomLabels(vw, vh) {
  ctx.font = '700 11px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const k in ROOMS) {
    const R = ROOMS[k];
    const cx = (R.c0 + R.c1 + 1) / 2 * TS - cam.x;
    const cy = R.r0 * TS + 18 - cam.y;
    if (cx < -150 || cx > vw + 150 || cy < -40 || cy > vh + 40) continue;
    const w = ctx.measureText(R.nome).width + 20;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    rr(ctx, cx - w/2, cy - 10, w, 20, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(0,24,68,0.10)'; ctx.lineWidth = 1; rr(ctx, cx - w/2, cy - 10, w, 20, 10); ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.fillText(R.nome, cx, cy + 0.5);
  }
  ctx.textBaseline = 'alphabetic';
}

function drawZoneHints(near) {
  if (!near) return;
  const sx = near.px - cam.x, sy = near.py - cam.y;
  const pulse = 4 + Math.sin(performance.now() / 280) * 2;
  ctx.strokeStyle = 'rgba(205,21,67,0.65)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(sx, sy, 22 + pulse, 0, Math.PI*2); ctx.stroke();
}

// minimapa
const mini = document.getElementById('mini'), mg = mini.getContext('2d');
function drawMini() {
  const sx = mini.width / WW, sy = mini.height / WH;
  mg.fillStyle = '#7ec850'; mg.fillRect(0, 0, mini.width, mini.height);
  mg.fillStyle = '#e8d5b5'; mg.fillRect(3*TS*sx, 3*TS*sy, 54*TS*sx, 30*TS*sy);
  for (const k in ROOMS) {
    const R = ROOMS[k], rc = RUG_COLORS[R.rug];
    mg.fillStyle = rc ? rc.edge : '#5cb83c';
    mg.fillRect((R.c0+1)*TS*sx, (R.r0+1)*TS*sy, (R.c1-R.c0-1)*TS*sx, (R.r1-R.r0-1)*TS*sy);
  }
  for (const n of npcs) { if (n.off) continue; mg.fillStyle = n.pal ? n.pal.shirt : '#9ca3af'; mg.fillRect(n.x*sx - 1.5, n.y*sy - 1.5, 3.5, 3.5); }
  for (const o of others.values()) { mg.fillStyle = '#16a34a'; mg.fillRect(o.x*sx - 2, o.y*sy - 2, 4, 4); }
  mg.fillStyle = '#cd1543'; mg.fillRect(player.x*sx - 2.5, player.y*sy - 2.5, 5, 5);
  mg.strokeStyle = '#fff'; mg.lineWidth = 1; mg.strokeRect(player.x*sx - 2.5, player.y*sy - 2.5, 5, 5);
}

// ── GAME LOOP ──────────────────────────────────────────────────────
let spawned = false, last = 0, miniT = 0, lastRoomKey = null;
document.addEventListener('visibilitychange', () => { last = performance.now(); });

function loop(ts) {
  requestAnimationFrame(loop);
  if (document.hidden) { last = ts; return; }
  const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
  if (!spawned || !worldReady) return;

  // teclas de zoom
  if (keysJust.has('Equal') || keysJust.has('NumpadAdd')) setZoom(Z + 0.1);
  if (keysJust.has('Minus') || keysJust.has('NumpadSubtract')) setZoom(Z - 0.1);
  if (keysJust.has('Digit0')) setZoom(1);

  const vw = innerWidth / Z, vh = innerHeight / Z;
  movePlayer(dt);
  for (const n of npcs) moveNPC(n, dt);
  updateOthers(dt);
  updateDecor(dt);
  updateCamera(vw, vh);

  // quest por sala + toast de entrada (ex.: VEM HEXA! na Diretoria)
  const room = roomOf(player.x + 12, player.y + 16);
  if (room && room.key !== lastRoomKey) {
    lastRoomKey = room.key; questVisit('room', room.key);
    if (W.roomToasts && W.roomToasts[room.key]) toast(W.roomToasts[room.key]);
  }

  // ── render ──
  ctx.setTransform(DPR * Z, 0, 0, DPR * Z, 0, 0);
  ctx.fillStyle = '#7ec850'; ctx.fillRect(0, 0, vw, vh);
  ctx.drawImage(world, -Math.round(cam.x), -Math.round(cam.y));

  drawDecor();
  drawRoomLabels(vw, vh);

  // chars (NPCs + remotos + player), depth-sorted
  const chars = [];
  for (const n of npcs) {
    if (n.off) continue;
    chars.push({ x:n.x, y:n.y, dir:n.dir, f:n.moving ? n.walkF : 0, moving:n.moving, pal:n.pal, sprite:n.sprite, name:n.nome.split(' ')[0], pl:false, blink:n.blink, bubble:n.bubble, bday:n.bday });
  }
  for (const o of others.values()) {
    if (o.tx == null) continue;
    chars.push({ x:o.x, y:o.y, dir:o.dir || 'down', f:o.movingNow ? o.walkF : 0, moving:o.movingNow, pal:o.pal, name:o.name, pl:false, remote:true,
                 emote: (o.emote && Date.now() - o.emoteT < 2500) ? o.emote : null, emoteAt: o.emoteT });
  }
  chars.push({ x:player.x, y:player.y, dir:player.dir, f:player.moving ? player.walkF : 0, moving:player.moving, pal:player.pal, name:player.name, pl:true, blink:player.blink,
               emote: player.emote ? player.emote.e : null, emoteAt: player.emote ? player.emote.at : 0 });
  chars.sort((a, b) => a.y - b.y);
  for (const c of chars) drawChar(c);

  // zona/NPC próximos + prompt
  let near = null, nd = 1e9;
  for (const z of (W.zones || [])) {
    const d = Math.hypot(z.px - (player.x+12), z.py - (player.y+16));
    if (d < z.r && d < nd) { near = z; nd = d; }
  }
  const nearNpc = npcNear();
  drawZoneHints(near);
  if (near) { promptTxt.textContent = near.name + ' — ' + near.tip; promptEl.classList.add('on'); }
  else if (nearNpc) { promptTxt.textContent = nearNpc.nome.split(' ')[0] + ' — conhecer'; promptEl.classList.add('on'); }
  else promptEl.classList.remove('on');

  if ((ACT() || actTouch) && !modalOpen && !infoOpen) {
    if (near) runAction(near);
    else if (nearNpc) { sfx('blip'); if (nearNpc.card) openInfo(nearNpc.card()); else showPerson(nearNpc.id); }
  }
  actTouch = false;

  drawLighting(vw, vh);

  // player emote expira
  if (player.emote && Date.now() - player.emote.at > 2400) player.emote = null;

  // confetti (screen space)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawConfetti(dt);

  keysJust.clear();

  hudZone.textContent = room ? room.nome : '🌳 Área externa';
  miniT += dt;
  if (miniT > 0.25) { drawMini(); miniT = 0; }
}
requestAnimationFrame(loop);

// ── SPAWN (SSO-aware) ──────────────────────────────────────────────
let selShirt = SHIRT_CHOICES[0], selSkin = null, selHair = null;
function buildSwatchRow(elId, choices, cur, onSel) {
  const wrap = document.getElementById(elId);
  if (!wrap) return;
  choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'sg-sw' + (c === cur ? ' sel' : ''); b.style.setProperty('--c', c);
    b.addEventListener('click', () => {
      onSel(c);
      wrap.querySelectorAll('.sg-sw').forEach(el => el.classList.remove('sel'));
      b.classList.add('sel');
    });
    wrap.appendChild(b);
  });
}
buildSwatchRow('sg-swatches', SHIRT_CHOICES, selShirt, c => selShirt = c);
buildSwatchRow('sg-skins', SKINS, null, c => selSkin = c);
buildSwatchRow('sg-hairs', HAIRS, null, c => selHair = c);

const nameInput = document.getElementById('sg-name');
const AVATAR_KEY = () => 'office.avatar.' + ((ssoUser && ssoUser.email) || 'anon');
try {
  const saved = JSON.parse(localStorage.getItem('office.user') || 'null');
  if (saved && saved.nome) nameInput.value = saved.nome;
  else if (typeof saved === 'string') nameInput.value = saved;
} catch {}

// SSO: preenche o nome real e destaca o botão
fetch('/api/auth/status').then(r => r.json()).then(s => {
  if (s && s.authenticated && s.user) {
    ssoUser = s.user;
    const given = s.user.given || (s.user.name || '').split(' ')[0] || '';
    if (given) {
      nameInput.value = given;
      const btn = document.getElementById('sg-go');
      if (btn) btn.textContent = 'Entrar como ' + given + ' →';
      const tag = document.getElementById('sg-sso');
      if (tag) { tag.textContent = '🔒 conectado via SSO como ' + (s.user.email || given); tag.classList.add('on'); }
    }
    try {
      const av = JSON.parse(localStorage.getItem(AVATAR_KEY()) || 'null');
      if (av) {
        selShirt = av.shirt || selShirt; selSkin = av.skin || null; selHair = av.hair || null;
        document.querySelectorAll('#sg-swatches .sg-sw').forEach(el => el.classList.toggle('sel', el.style.getPropertyValue('--c') === selShirt));
        if (selSkin) document.querySelectorAll('#sg-skins .sg-sw').forEach(el => el.classList.toggle('sel', el.style.getPropertyValue('--c') === selSkin));
        if (selHair) document.querySelectorAll('#sg-hairs .sg-sw').forEach(el => el.classList.toggle('sel', el.style.getPropertyValue('--c') === selHair));
      }
    } catch {}
  }
}).catch(()=>{});

function spawn() {
  const nome = nameInput.value.trim() || 'Visitante';
  player.name = nome.split(' ')[0];
  player.pal = palFor(nome, selShirt, selSkin, selHair);
  try {
    const prev = JSON.parse(localStorage.getItem('office.user') || '{}');
    localStorage.setItem('office.user', JSON.stringify({ ...(typeof prev === 'object' && prev ? prev : {}), nome }));
    localStorage.setItem(AVATAR_KEY(), JSON.stringify({ shirt: selShirt, skin: selSkin, hair: selHair }));
  } catch {}
  setupNPCs();
  document.getElementById('spawn').style.display = 'none';
  document.getElementById('hud').classList.add('on');
  document.getElementById('hud-name').textContent = player.name;
  document.getElementById('hud-user').style.setProperty('--uc', selShirt);
  updateQuestPill();
  spawned = true;
  presenceTick();
  const h = nowHour();
  if (h >= 19 || h < 8) toast('🌙 Fora do expediente — o escritório tá quase vazio. ' + (W.welcome || ''));
  else toast(W.welcome || '🎮 Bem-vindo!');
}
document.getElementById('sg-go').addEventListener('click', spawn);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') spawn(); });

// hook de teste E2E (?debug=1) — sem efeito em uso normal
if (new URLSearchParams(location.search).has('debug')) window.__game = { player, cam, npcs, goals };
})();
