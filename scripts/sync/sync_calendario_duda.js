/**
 * sync_calendario_duda.js
 * Lê CALENDÁRIO EDITORIAL EPI-USE (1).xlsx do OneDrive da Duda
 * Parseia o grid visual mensal → array de itens editorial
 * POST para /api/inbound/calendar com EDITOR_TOKEN
 *
 * Uso:
 *   node scripts/sync/sync_calendario_duda.js
 *   node scripts/sync/sync_calendario_duda.js --dry-run   (mostra itens sem POST)
 *   node scripts/sync/sync_calendario_duda.js --local      (salva cópia em vault/)
 */

// Resolve modules from optimizer path (mesmo pattern do server.js)
const _fs0 = require('fs');
const _os0 = require('os');
const _winUser = _os0.userInfo().username;
const _localCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/node_modules`,
  'C:/Users/Ruds/.epiuse-optimizer/node_modules',
];
const _localModules = _localCandidates.find(p => _fs0.existsSync(p)) || '';
if (_localModules) {
  const Module = require('module');
  const _origPaths = Module._nodeModulePaths.bind(Module);
  Module._nodeModulePaths = (from) => {
    const paths = _origPaths(from);
    if (!paths.includes(_localModules)) paths.unshift(_localModules);
    return paths;
  };
}

const _dotenvPath = _localModules ? require('path').join(_localModules, 'dotenv') : 'dotenv';
require(_dotenvPath).config({ path: require('path').join(__dirname, '../../.env') });
const XLSX = require(_localModules ? require('path').join(_localModules, 'xlsx') : 'xlsx');
const path = require('path');
const fs   = require('fs');

// ── CONFIG ─────────────────────────────────────────────────────────────────
const XLSX_PATHS = [
  // OneDrive Rudá (primário)
  "C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/Inbound/Conteúdo/CALENDÁRIO EDITORIAL EPI-USE (1).xlsx",
  // Cópia vault (fallback)
  path.join(__dirname, '../../vault/00-contexto/conteudo/calendario-editorial-duda.xlsx'),
];

const LOCAL_COPY_PATH = path.join(__dirname, '../../vault/00-contexto/conteudo/calendario-editorial-duda.xlsx');
const OFFICE_URL      = process.env.OFFICE_URL || 'http://localhost:3000';
const EDITOR_TOKEN    = process.env.EDITOR_TOKEN || 'eubr-voices-edit-2026';
const DRY_RUN         = process.argv.includes('--dry-run');
const SAVE_LOCAL      = process.argv.includes('--local');

// Nomes dos meses PT-BR → número
const MESES = {
  JANEIRO:1, FEVEREIRO:2, 'MARÇO':3, MARCO:3, ABRIL:4, MAIO:5, JUNHO:6,
  JULHO:7, AGOSTO:8, SETEMBRO:9, OUTUBRO:10, NOVEMBRO:11, DEZEMBRO:12
};

// ── RESOLVER PATH ──────────────────────────────────────────────────────────
function resolvePath() {
  for (const p of XLSX_PATHS) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}

// ── DETECTAR MÊS/ANO DO HEADER ─────────────────────────────────────────────
function detectMonthYear(header, fileMtime) {
  const s = String(header || '').toUpperCase().trim();
  for (const [nome, num] of Object.entries(MESES)) {
    if (s.includes(nome)) {
      // Determina ano pelo mtime do arquivo (se mtime < Jun = 2025, senão 2026)
      const mtime = new Date(fileMtime);
      const year  = s.includes('26') ? 2026 : (mtime.getFullYear() || 2026);
      return { month: num, year };
    }
  }
  return null;
}

// ── PARSER DO GRID VISUAL ──────────────────────────────────────────────────
// Estrutura do grid:
//   Row N:   ['JUNHO', ...]                       ← cabeçalho do mês
//   Row N+1: ['Domingo','Segunda-feira',...]       ← nomes dos dias (7 colunas)
//   Row N+2: ['', 1, 2, 3, 4, 5, 6, ...]         ← números dos dias da semana 1
//   Row N+3: ['', conteudo1, conteudo2, ...]       ← conteúdo por dia da semana 1
//   Row N+4: [7, 8, 9, ...]                        ← números semana 2
//   Row N+5: ['', conteudo, ...]                   ← conteúdo semana 2
//   ... (repete para cada semana)
function parseGrid(rows, monthStart, month, year) {
  const items = [];

  // row monthStart = mês, monthStart+1 = dias-da-semana
  // a partir de monthStart+2: pares (números, conteúdo)
  let r = monthStart + 2;

  while (r < rows.length) {
    const numRow = rows[r];
    if (!numRow || numRow.every(c => String(c || '').trim() === '')) break;

    // Verifica se é linha de números (tem pelo menos um número inteiro entre 1-31)
    const hasNumbers = numRow.some(c => {
      const n = parseInt(c, 10);
      return !isNaN(n) && n >= 1 && n <= 31;
    });
    if (!hasNumbers) break;

    const contentRow = rows[r + 1] || [];

    // Mapeia cols 0-6 → dia da semana (Dom=0 … Sáb=6)
    for (let col = 0; col < 7; col++) {
      const dayNum = parseInt(numRow[col], 10);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

      let raw = String(contentRow[col] || '').trim();
      // Ignora linhas escritas pelo proprio Rax (raccoon_to_xlsx) para evitar
      // round-trip duplicado: prod -> xlsx -> prod. O item ja existe como fonte=raccoon.
      raw = raw.split('\n').filter(l => !/^\s*Rax:/i.test(l)).join('\n').trim();
      if (!raw) continue;

      // Monta data ISO
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;

      // Inferências simples de canal/pilar do texto
      const titulo = raw.slice(0, 300);
      const canal  = inferCanal(raw);
      const pilar  = inferPilar(raw);

      items.push({
        external_id: `duda-${dateStr}-${col}`,
        fonte: 'planilha-duda',
        data: dateStr,
        canal,
        autor: 'Duda',
        titulo,
        resumo: '',
        pilar,
        status: 'planned',
        url_post: '',
      });
    }

    r += 2; // próxima semana
  }

  return items;
}

function inferCanal(text) {
  const t = text.toLowerCase();
  if (t.includes('instagram') || t.includes('reels')) return 'instagram';
  if (t.includes('youtube') || t.includes('vídeo') || t.includes('video')) return 'youtube';
  if (t.includes('blog') || t.includes('artigo')) return 'blog';
  if (t.includes('email') || t.includes('e-mail')) return 'email';
  return 'linkedin';
}

function inferPilar(text) {
  const t = text.toLowerCase();
  if (t.includes('sap') || t.includes('s/4') || t.includes('erp')) return 'produto';
  if (t.includes('case') || t.includes('sucesso')) return 'case';
  if (t.includes('rh') || t.includes('successfactors') || t.includes('hcm')) return 'rh';
  if (t.includes('servicenow')) return 'servicenow';
  if (t.includes('elefante') || t.includes('erp.ngo') || t.includes('propósito')) return 'institucional';
  if (t.includes('copa') || t.includes('futebol') || t.includes('jogo')) return 'cultural';
  return 'conteudo';
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  const srcPath = resolvePath();
  if (!srcPath) {
    console.error('[duda-sync] Arquivo nao encontrado. Paths tentados:');
    XLSX_PATHS.forEach(p => console.error('  ' + p));
    process.exit(1);
  }
  console.log('[duda-sync] Lendo:', srcPath);

  const fileMtime = fs.statSync(srcPath).mtime;
  const wb = XLSX.readFile(srcPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Salva cópia local se pedido
  if (SAVE_LOCAL || !fs.existsSync(LOCAL_COPY_PATH)) {
    fs.mkdirSync(path.dirname(LOCAL_COPY_PATH), { recursive: true });
    fs.copyFileSync(srcPath, LOCAL_COPY_PATH);
    console.log('[duda-sync] Cópia salva em:', LOCAL_COPY_PATH);
  }

  // Encontra todos os meses no sheet
  const allItems = [];
  for (let i = 0; i < rows.length; i++) {
    const parsed = detectMonthYear(rows[i]?.[0], fileMtime);
    if (parsed) {
      console.log(`[duda-sync] Mês encontrado: ${rows[i][0]} (${parsed.month}/${parsed.year}) na row ${i}`);
      const items = parseGrid(rows, i, parsed.month, parsed.year);
      console.log(`[duda-sync]   → ${items.length} itens parseados`);
      allItems.push(...items);
    }
  }

  if (!allItems.length) {
    console.error('[duda-sync] Nenhum item encontrado. Verifique a estrutura do arquivo.');
    process.exit(1);
  }

  console.log(`[duda-sync] Total: ${allItems.length} itens`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN ---');
    allItems.forEach(it => console.log(`  ${it.data} [${it.canal}/${it.pilar}] ${it.titulo.slice(0,80)}`));
    return;
  }

  // POST para o servidor local
  const url = `${OFFICE_URL}/api/inbound/calendar`;
  console.log(`[duda-sync] POST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-editor-token': EDITOR_TOKEN,
    },
    body: JSON.stringify({ items: allItems }),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error('[duda-sync] Erro:', json);
    process.exit(1);
  }

  console.log(`[duda-sync] OK — ${json.inserted || json.n || allItems.length} itens sincronizados`);
  console.log('[duda-sync] Calendário disponível em: /inbound/calendar');
}

main().catch(e => { console.error(e); process.exit(1); });
