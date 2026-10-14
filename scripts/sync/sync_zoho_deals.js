/**
 * sync_zoho_deals.js
 * Lê deals do Zoho CRM via COQL (campo Opportunity Source = MKT ou SDR)
 * e faz POST pra /api/zoho/sync do Office local.
 *
 * Este script é destinado a rodar DENTRO de uma sessão Claude (via MCP),
 * pois o Zoho MCP connector já está autenticado no Claude Directory.
 *
 * Para automação futura sem Claude, setar no .env:
 *   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
 *
 * Uso:
 *   node scripts/sync/sync_zoho_deals.js [--dry-run]
 *   node scripts/sync/sync_zoho_deals.js --from-file payload.json
 */

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

const path   = require('path');
const OFFICE_URL   = process.env.OFFICE_URL || 'http://localhost:3000';
const EDITOR_TOKEN = require('../lib/editor-token')();
const DRY_RUN      = process.argv.includes('--dry-run');
const FROM_FILE    = process.argv.includes('--from-file')
  ? process.argv[process.argv.indexOf('--from-file') + 1]
  : null;

// Origem da oportunidade no Zoho = campo "Opportunity Source" (API Origem_da_Oportunidade).
// O nome antigo (Marketing_Intelligence__Opportunity_Source) não existe mais e a
// consulta voltava INVALID_QUERY — conferido no Zoho em 14/out/2026. Entram só as
// originadas pelo Marketing da EPI-USE e pelo SDR (Valcann é outra empresa do grupo).
const COQL = `
  SELECT
    id,
    Deal_Name,
    Account_Name,
    Amount,
    Stage,
    Lead_Source,
    Closing_Date,
    Created_Time,
    Origem_da_Oportunidade,
    Solution_new,
    Escopo2
  FROM Deals
  WHERE Origem_da_Oportunidade in ('MKT (EPI-USE)', 'SDR')
  LIMIT 2000
`;

function mapDeal(d) {
  const src = d.Origem_da_Oportunidade || d['Marketing_Intelligence__Opportunity_Source'] || '';
  const lista = (v) => Array.isArray(v) ? v.join(', ') : String(v || '');
  // Só importa deals de origem MKT ou SDR
  if (!src.includes('MKT') && !src.includes('SDR') && src !== '') {
    // aceitar qualquer valor mas logar
  }
  const created = d.Created_Time
    ? String(d.Created_Time).slice(0, 10)
    : '';
  const closing = d.Closing_Date
    ? String(d.Closing_Date).slice(0, 10)
    : '';
  return {
    deal_id:            String(d.id || ''),
    conta:              String(d.Account_Name?.name || d.Account_Name || ''),
    nome_deal:          String(d.Deal_Name || ''),
    valor:              parseFloat(d.Amount || 0) || 0,
    stage:              String(d.Stage || ''),
    campanha:           String(d.Lead_Source || ''),
    solution:           lista(d.Solution_new || d.Solution || d['Solution__s']),
    deal_scope:         lista(d.Escopo2 || d.Deal_Scope || d['Deal_Scope__s']),
    opportunity_source: String(src),
    data_criacao:       created,
    data_fechamento:    closing,
  };
}

async function syncFromPayload(deals) {
  console.log(`[zoho-sync] ${deals.length} deals para sincronizar`);
  if (DRY_RUN) {
    console.log('\n--- DRY RUN ---');
    deals.forEach(d => console.log(`  [${d.opportunity_source}] ${d.data_criacao} ${d.conta} — R$ ${d.valor.toLocaleString('pt-BR')} — ${d.nome_deal.slice(0, 60)}`));
    return;
  }

  const res = await fetch(`${OFFICE_URL}/api/zoho/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-editor-token': EDITOR_TOKEN },
    body: JSON.stringify({ deals }),
  });
  const json = await res.json();
  if (!res.ok) { console.error('[zoho-sync] Erro:', json); process.exit(1); }
  console.log(`[zoho-sync] OK — ${json.upserted}/${json.total} upsertados`);
}

async function main() {
  // Modo: carregar de arquivo JSON (payload exportado pelo Claude via MCP)
  if (FROM_FILE) {
    if (!_fs0.existsSync(FROM_FILE)) {
      console.error('[zoho-sync] Arquivo não encontrado:', FROM_FILE);
      process.exit(1);
    }
    const raw = JSON.parse(_fs0.readFileSync(FROM_FILE, 'utf8'));
    const deals = Array.isArray(raw) ? raw.map(mapDeal) : raw.deals || [];
    return syncFromPayload(deals);
  }

  // Modo: REST API direta com OAuth2 (ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN + ZOHO_DC).
  // É o que o servidor roda sozinho pela Central de Fontes (Módulo 36).
  const { zohoToken, coql } = require('../lib/zoho-api');
  let coqlJson;
  try { coqlJson = await coql(await zohoToken(), COQL); }
  catch (e) {
    console.error('[zoho-sync]', e.message);
    console.error('  Ou use: node sync_zoho_deals.js --from-file <payload.json> (gerado pelo Claude via MCP executeCOQLQuery)');
    process.exit(1);
  }
  console.log(`[zoho-sync] ${(coqlJson.data || []).length} deals retornados do Zoho.`);
  const deals = (coqlJson.data || []).map(mapDeal);
  await syncFromPayload(deals);
}

main().catch(e => { console.error(e); process.exit(1); });
