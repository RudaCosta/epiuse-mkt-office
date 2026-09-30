/**
 * sync_calendario_editorial.js — Módulo 25
 * Lê a planilha "EPI-USE Calendário Editorial" (3 abas) e sincroniza com o Office.
 *
 *   Aba 💡 Insights          → tabela edt_insights   (3 tabelas de BI, JSON)
 *   Aba 📅 Calendário         → tabela edt_calendario (semana a semana)
 *   Aba Sugestão de Pautas   → tabela edt_pautas     (pipeline de pautas)
 *
 * FONTE (Fase 1): cópia local em vault/00-contexto/conteudo/ ou OneDrive sincronizado.
 * FONTE (Fase 2): Microsoft Graph puxa da nuvem (scripts/integrations/graph_fetch.js).
 *
 * Uso:
 *   node scripts/sync/sync_calendario_editorial.js --dry-run   (mostra o parse, não grava)
 *   node scripts/sync/sync_calendario_editorial.js             (POST pro Office local)
 *   node scripts/sync/sync_calendario_editorial.js --graph     (baixa da nuvem via Graph, depois sincroniza)
 */

// ── Resolve módulos (worktree não tem node_modules; usa checkout principal) ──
const _fs0 = require('fs');
const _os0 = require('os');
const _path0 = require('path');
const _winUser = _os0.userInfo().username;
const _localCandidates = [
  _path0.join(__dirname, '../../node_modules'),
  'C:/epiuse-mkt-office/node_modules',
  `C:/Users/${_winUser}/.epiuse-optimizer/node_modules`,
  'C:/Users/Ruds/.epiuse-optimizer/node_modules',
];
const _localModules = _localCandidates.find(p => { try { return _fs0.existsSync(_path0.join(p, 'xlsx')); } catch { return false; } }) || '';
if (_localModules) {
  const Module = require('module');
  const _origPaths = Module._nodeModulePaths.bind(Module);
  Module._nodeModulePaths = (from) => {
    const paths = _origPaths(from);
    if (!paths.includes(_localModules)) paths.unshift(_localModules);
    return paths;
  };
}
const _req = (m) => require(_localModules ? _path0.join(_localModules, m) : m);

const XLSX = _req('xlsx');
const path = require('path');
const fs   = require('fs');
try { _req('dotenv').config({ path: path.join(__dirname, '../../.env') }); } catch {}

// ── CONFIG ───────────────────────────────────────────────────────────────────
const XLSX_PATHS = [
  // OneDrive sincronizado na máquina do Office (preencher quando a Fase 2 não estiver ativa)
  "C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/EPI-USE_Calendario_Editorial.xlsx",
  // Cópia no vault (fallback / Fase 1)
  path.join(__dirname, '../../vault/00-contexto/conteudo/calendario-editorial-marketing.xlsx'),
];
const OFFICE_URL   = process.env.OFFICE_URL || 'http://localhost:3000';
const EDITOR_TOKEN = process.env.EDITOR_TOKEN || 'eubr-voices-edit-2026';
const FONTE        = 'planilha-editorial';
const DRY_RUN      = process.argv.includes('--dry-run');
const USE_GRAPH    = process.argv.includes('--graph');

// ── HELPERS ──────────────────────────────────────────────────────────────────
const clean = (v) => (v == null ? '' : String(v).replace(/\r/g, '').trim());
const norm  = (s) => clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const slug  = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const isBlankRow = (row) => !row || row.every(c => clean(c) === '');

function toISODate(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v)) {
    // corrige o offset pra não voltar 1 dia
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())).toISOString().slice(0, 10);
  }
  const s = clean(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);          // 2026-08-03 00:00:00
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);       // DD/MM/AAAA
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  return '';
}

function readSheetRows(wb, matcher) {
  const name = wb.SheetNames.find(n => matcher(norm(n)));
  if (!name) return null;
  const ws = wb.Sheets[name];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
}

// ── PARSER: 💡 INSIGHTS (3 sub-tabelas) ───────────────────────────────────────
// Cada sub-tabela começa numa linha "N. TÍTULO", a linha seguinte é o cabeçalho,
// e as linhas seguintes são dados até uma linha em branco.
function parseInsights(rows) {
  if (!rows) return null;
  const titulo   = clean(rows[0]?.[0]);
  const subtitle = clean(rows[1]?.[0]);
  const tables = [];
  for (let i = 0; i < rows.length; i++) {
    const c0 = clean(rows[i]?.[0]);
    const m = c0.match(/^(\d+)\.\s+(.+)/);
    if (!m) continue;
    const tableTitle = m[2];
    const headerRow = rows[i + 1] || [];
    let cols = headerRow.map(clean);
    while (cols.length && cols[cols.length - 1] === '') cols.pop();
    if (!cols.length) continue;
    const data = [];
    for (let r = i + 2; r < rows.length; r++) {
      const row = rows[r];
      if (isBlankRow(row)) break;
      if (clean(row[0]).match(/^\d+\.\s+/)) break; // próxima tabela
      data.push(cols.map((_, ci) => clean(row[ci])));
    }
    tables.push({ titulo: tableTitle, columns: cols, rows: data });
    i++; // pula o header
  }
  return { titulo, subtitle, tables };
}

// ── PARSER: 📅 CALENDÁRIO (semana a semana) ───────────────────────────────────
function parseCalendario(rows) {
  if (!rows) return [];
  // Acha a linha de cabeçalho (contém "Data" e "Título")
  let headerIdx = rows.findIndex(r => {
    const j = r.map(norm).join('|');
    return j.includes('data') && (j.includes('titulo') || j.includes('tema')) && j.includes('formato');
  });
  if (headerIdx < 0) headerIdx = 1;
  const H = rows[headerIdx].map(norm);
  const col = (frag) => H.findIndex(h => h.includes(frag));
  const IDX = {
    num:       col('#') >= 0 ? col('#') : 0,
    data:      col('data'),
    dia:       col('dia'),
    tipo:      H.findIndex(h => h.includes('tipo')),
    titulo:    H.findIndex(h => h.includes('titulo') || h.includes('tema')),
    lob:       H.findIndex(h => h === 'lob' || h.includes('lob')),
    solucao:   H.findIndex(h => h.includes('solucao')),
    narrativa: H.findIndex(h => h.includes('narrativa')),
    formato:   H.findIndex(h => h.includes('formato')),
    cta:       H.findIndex(h => h.includes('cta')),
    copy:      H.findIndex(h => h.includes('copy') || h.includes('abertura')),
    status:    H.findIndex(h => h.includes('status')),
  };
  const get = (row, k) => (IDX[k] >= 0 ? clean(row[IDX[k]]) : '');
  const getRaw = (row, k) => (IDX[k] >= 0 ? row[IDX[k]] : ''); // preserva Date do xlsx

  const items = [];
  let semana = '';
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (isBlankRow(row)) continue;
    const c0 = clean(row[0]);
    const cAll = row.map(norm).join(' ');
    // Marcador de semana
    const sm = cAll.match(/semana\s+\d+/);
    if (sm && !get(row, 'data')) { semana = clean(row.find(c => norm(c).includes('semana'))) .split('·')[0].trim(); continue; }
    // Linha-modelo (instruções: "DD/MM", "Escolha da lista")
    if (cAll.includes('escolha da lista') || cAll.includes('dd/mm')) continue;

    const dataISO = toISODate(getRaw(row, 'data'));
    if (!dataISO) continue;

    const item = {
      external_id: `edt-cal-${dataISO}`,
      fonte: FONTE,
      semana,
      data: dataISO,
      dia:       get(row, 'dia'),
      tipo:      get(row, 'tipo'),
      titulo:    get(row, 'titulo'),
      lob:       get(row, 'lob'),
      solucao:   get(row, 'solucao'),
      narrativa: get(row, 'narrativa'),
      formato:   get(row, 'formato'),
      cta:       get(row, 'cta'),
      copy:      get(row, 'copy'),
      status:    get(row, 'status') || (get(row, 'titulo') || get(row, 'tipo') ? 'Planejado' : ''),
    };
    // Só entra se tiver algum conteúdo além da data
    const temConteudo = ['tipo','titulo','narrativa','formato','copy','status','lob']
      .some(k => item[k] && item[k] !== 'Planejado');
    if (temConteudo || item.titulo || item.tipo) items.push(item);
  }
  return items;
}

// ── PARSER: SUGESTÃO DE PAUTAS ────────────────────────────────────────────────
function parsePautas(rows) {
  if (!rows) return [];
  let headerIdx = rows.findIndex(r => {
    const j = r.map(norm).join('|');
    return j.includes('editoria') && j.includes('tema') && j.includes('keyword');
  });
  if (headerIdx < 0) return [];
  const H = rows[headerIdx].map(norm);
  const col = (frag) => H.findIndex(h => h.includes(frag));
  const IDX = {
    editoria:   col('editoria'),
    tema:       H.findIndex(h => h === 'tema' || h.includes('tema')),
    volumetria: col('volumetria'),
    keyword:    col('keyword'),
    resumo:     col('resumo'),
    fontes:     col('fontes'),
    link_doc:   H.findIndex(h => h === 'link'),
    link_artigo:H.findIndex(h => h.includes('versao artigo') || h.includes('artigo linkedin')),
    chamada:    H.findIndex(h => h.includes('chamada')),
  };
  const get = (row, k) => (IDX[k] >= 0 ? clean(row[IDX[k]]) : '');
  const items = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (isBlankRow(row)) continue;
    const tema = get(row, 'tema');
    const editoria = get(row, 'editoria');
    if (!tema && !editoria) continue;
    items.push({
      external_id: `edt-pauta-${slug(editoria + '-' + tema)}`,
      fonte: FONTE,
      editoria,
      tema,
      volumetria:  get(row, 'volumetria'),
      keyword:     get(row, 'keyword'),
      resumo:      get(row, 'resumo'),
      fontes:      get(row, 'fontes'),
      link_doc:    get(row, 'link_doc'),
      link_artigo: get(row, 'link_artigo'),
      chamada:     get(row, 'chamada'),
    });
  }
  return items;
}

// ── RESOLVER FONTE ────────────────────────────────────────────────────────────
async function resolveSource() {
  if (USE_GRAPH) {
    const { fetchEditorialXlsx } = require('../integrations/graph_fetch');
    const dest = XLSX_PATHS[1];
    await fetchEditorialXlsx(dest); // baixa da nuvem por cima da cópia local
    return dest;
  }
  for (const p of XLSX_PATHS) { try { if (fs.existsSync(p)) return p; } catch {} }
  return null;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const src = await resolveSource();
  if (!src) {
    console.error('[editorial] Arquivo não encontrado. Paths tentados:');
    XLSX_PATHS.forEach(p => console.error('  ' + p));
    process.exit(1);
  }
  console.log('[editorial] Lendo:', src);
  const wb = XLSX.readFile(src, { cellDates: true });

  const insights   = parseInsights(readSheetRows(wb, n => n.includes('insight')));
  const calendario = parseCalendario(readSheetRows(wb, n => n.includes('calend')));
  const pautas     = parsePautas(readSheetRows(wb, n => n.includes('paut')));

  console.log(`[editorial] Insights: ${insights?.tables?.length || 0} tabelas`);
  console.log(`[editorial] Calendário: ${calendario.length} posts`);
  console.log(`[editorial] Pautas: ${pautas.length} pautas`);

  if (DRY_RUN) {
    console.log('\n════════ INSIGHTS ════════');
    console.log('Título:', insights?.titulo);
    console.log('Sub:', insights?.subtitle);
    (insights?.tables || []).forEach(t => {
      console.log(`\n▸ ${t.titulo}`);
      console.log('  cols:', t.columns.join(' | '));
      t.rows.slice(0, 3).forEach(r => console.log('   -', r.join(' | ')));
      if (t.rows.length > 3) console.log(`   … +${t.rows.length - 3} linhas`);
    });
    console.log('\n════════ CALENDÁRIO ════════');
    calendario.forEach(it => console.log(`  ${it.data} [${it.semana}] ${it.tipo || '—'} · ${it.titulo || '(sem título)'} · ${it.formato || ''} · ${it.status}`));
    console.log('\n════════ PAUTAS ════════');
    pautas.forEach(p => console.log(`  [${p.editoria}] ${p.tema.slice(0, 70)} · vol:${p.volumetria} · kw:${p.keyword}`));
    return;
  }

  // POST pro Office
  const url = `${OFFICE_URL}/api/editorial/sync`;
  console.log(`[editorial] POST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-editor-token': EDITOR_TOKEN },
    body: JSON.stringify({ insights, calendario, pautas }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { console.error('[editorial] Erro:', json); process.exit(1); }
  console.log('[editorial] OK —', JSON.stringify(json));
}

main().catch(e => { console.error(e); process.exit(1); });
