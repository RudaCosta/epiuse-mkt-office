/**
 * sync_redatoria_to_calendar.js
 * Lê abas 2026 do cronograma Redatoria e POSTa pra editorial_calendar
 * com fonte='redatoria'.
 *
 * Uso:
 *   node scripts/sync/sync_redatoria_to_calendar.js
 *   node scripts/sync/sync_redatoria_to_calendar.js --dry-run
 */

// Resolve modules do optimizer (mesmo padrão dos outros scripts)
const _fs0 = require('fs');
const _os0 = require('os');
const _winUser = _os0.userInfo().username;
const _localCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/node_modules`,
  'C:/Users/Ruds/.epiuse-optimizer/node_modules',
];
const _localModules = _localCandidates.find(p => _fs0.existsSync(p)) || '';

const _dotenvPath = _localModules ? require('path').join(_localModules, 'dotenv') : 'dotenv';
require(_dotenvPath).config({ path: require('path').join(__dirname, '../../.env') });
const XLSX = require(_localModules ? require('path').join(_localModules, 'xlsx') : 'xlsx');
const path = require('path');
const fs   = require('fs');

const XLSX_PATH   = path.join(__dirname, '../../vault/00-contexto/conteudo/cronograma-redatoria-2025.xlsx');
const OFFICE_URL  = process.env.OFFICE_URL || 'http://localhost:3000';
const EDITOR_TOKEN = process.env.EDITOR_TOKEN || 'eubr-voices-edit-2026';
const DRY_RUN     = process.argv.includes('--dry-run');

// Abas 2026 no arquivo
const SHEETS_2026 = ['Jan26', 'Fev26', 'Mar26', 'Abr26', 'Jun26'];

// Excel serial → ISO date (ex: 46023 → "2026-01-01")
function serialToDate(serial) {
  const n = Number(serial);
  if (!n || isNaN(n) || n < 40000) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86400 * 1000);
  const y = d.getUTCFullYear();
  if (y < 2020 || y > 2030) return null;
  return d.toISOString().slice(0, 10);
}

function editoriaToPilar(editoria) {
  const e = String(editoria || '').toLowerCase();
  if (e.includes('successfactors') || e.includes('hcm')) return 'rh';
  if (e.includes('servicenow'))                           return 'servicenow';
  if (e.includes('institucional') || e.includes('executiv')) return 'institucional';
  if (e.includes('processo') || e.includes('signavio'))   return 'produto';
  return 'produto';
}

// LOB canônico (taxonomia v1.1 — public/api/taxonomia-conteudo.json).
// Diferente do pilar legado: retorna slug estável; sem sinal claro → '' (reclassificar).
function editoriaToLob(editoria) {
  const e = String(editoria || '').toLowerCase();
  if (e.includes('successfactors') || e.includes('hcm') || e.includes('rh')) return 'hcm';
  if (e.includes('servicenow'))                            return 'servicenow';
  if (e.includes('institucional') || e.includes('executiv')) return 'institucional';
  if (e.includes('processo') || e.includes('signavio') || e.includes('leanix')) return 'btm';
  if (e.includes('s/4') || e.includes('s4hana') || e.includes('erp') || e.includes('fiscal')) return 'erp';
  if (e.includes('btp'))                                   return 'tech';
  return '';
}

function parseSheet(ws, sheetName) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const items = [];

  // Localizar linha de cabeçalho: procura célula exata "ENTREGA" ou "EDITORIA"
  // (evita falso positivo em "Temas EPI-USE Brasil" que contém "TEMA")
  let headerRow = 2;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const r = rows[i].map(c => String(c).toUpperCase().trim());
    if (r.some(c => c === 'ENTREGA' || c === 'EDITORIA')) { headerRow = i; break; }
  }

  const hdrs = rows[headerRow].map(c => String(c).toUpperCase().trim());
  const cE  = hdrs.findIndex(h => h.includes('ENTREGA'));
  const cP  = hdrs.findIndex(h => h.includes('POSTAGEM'));
  const cLob = hdrs.findIndex(h => h.includes('EDITORIA'));
  const cT  = hdrs.findIndex(h => h.includes('TEMA'));
  const cK  = hdrs.findIndex(h => h.includes('KEYWORD'));
  const cR  = hdrs.findIndex(h => h.includes('RESUMO'));

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const tema = String(row[cT >= 0 ? cT : 4] || '').trim();
    if (!tema || tema.length < 5) continue;
    // Pular linhas de seção (SEMANA 1, etc.)
    if (/^(SEMANA|SEMANAS|SEção|SECTION)/i.test(tema)) continue;

    const dateStr = serialToDate(row[cP >= 0 ? cP : 2]) ||
                    serialToDate(row[cE >= 0 ? cE : 1]);
    if (!dateStr) continue;

    const editoria = String(row[cLob >= 0 ? cLob : 3] || '').trim();
    const keyword  = String(row[cK >= 0 ? cK : 6] || '').trim();
    const resumo   = String(row[cR >= 0 ? cR : 7] || '').trim();

    items.push({
      external_id: `redatoria-${sheetName}-r${r}`,
      fonte: 'redatoria',
      data: dateStr,
      canal: 'blog',
      autor: 'Lisiane',
      titulo: tema,
      resumo: resumo || keyword,
      pilar: editoriaToPilar(editoria),
      lob: editoriaToLob(editoria),
      status: 'planned',
      url_post: '',
    });
  }

  return items;
}

async function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error('[redatoria-cal] Arquivo não encontrado:', XLSX_PATH);
    console.error('  Rode: node scripts/sync/sync_cronograma_redatoria.js');
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const allItems = [];

  for (const sheetName of SHEETS_2026) {
    if (!wb.SheetNames.includes(sheetName)) {
      console.warn(`[redatoria-cal] Sheet "${sheetName}" não encontrada. Disponíveis: ${wb.SheetNames.join(', ')}`);
      continue;
    }
    const items = parseSheet(wb.Sheets[sheetName], sheetName);
    console.log(`[redatoria-cal] ${sheetName}: ${items.length} itens`);
    allItems.push(...items);
  }

  console.log(`[redatoria-cal] Total: ${allItems.length} itens`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN ---');
    allItems.forEach(it => console.log(`  ${it.data} [${it.pilar}] ${it.titulo.slice(0, 80)}`));
    return;
  }

  const res = await fetch(`${OFFICE_URL}/api/inbound/calendar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-editor-token': EDITOR_TOKEN },
    body: JSON.stringify({ items: allItems }),
  });

  const json = await res.json();
  if (!res.ok) { console.error('[redatoria-cal] Erro:', json); process.exit(1); }
  console.log(`[redatoria-cal] OK — ${json.upserted} itens sincronizados`);
}

main().catch(e => { console.error(e); process.exit(1); });
