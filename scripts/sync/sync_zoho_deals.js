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
const EDITOR_TOKEN = process.env.EDITOR_TOKEN;
if (!EDITOR_TOKEN) { console.error('ERRO: variável de ambiente EDITOR_TOKEN não definida.'); process.exit(1); }
const DRY_RUN      = process.argv.includes('--dry-run');
const FROM_FILE    = process.argv.includes('--from-file')
  ? process.argv[process.argv.indexOf('--from-file') + 1]
  : null;

// Campo Zoho para Opportunity Source (Marketing Intelligence)
// Nome API pode variar — testar com getFields se necessário
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
    Marketing_Intelligence__Opportunity_Source
  FROM Deals
  WHERE Marketing_Intelligence__Opportunity_Source IS NOT NULL
  LIMIT 200
`;

function mapDeal(d) {
  const src = d['Marketing_Intelligence__Opportunity_Source'] || d.Marketing_Intelligence || '';
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
    solution:           String(d.Solution || d['Solution__s'] || ''),
    deal_scope:         String(d.Deal_Scope || d['Deal_Scope__s'] || ''),
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

  // Modo: REST API direta com OAuth2 (requer ZOHO_REFRESH_TOKEN no .env)
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const clientId     = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    console.error('[zoho-sync] Credenciais OAuth2 não encontradas no .env.');
    console.error('  Defina: ZOHO_REFRESH_TOKEN, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET');
    console.error('  Ou use: node sync_zoho_deals.js --from-file <payload.json>');
    console.error('  (payload.json gerado pelo Claude via MCP executeCOQLQuery)');
    process.exit(1);
  }

  // Refresh access token
  const tokenRes = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`,
    { method: 'POST' }
  );
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    console.error('[zoho-sync] Falha ao obter access_token:', tokenJson);
    process.exit(1);
  }
  const token = tokenJson.access_token;
  console.log('[zoho-sync] Token OAuth2 obtido.');

  // COQL query
  const coqlRes = await fetch('https://www.zohoapis.com/crm/v7/coql', {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ select_query: COQL.trim().replace(/\s+/g, ' ') }),
  });
  const coqlJson = await coqlRes.json();
  if (!coqlRes.ok || !coqlJson.data) {
    console.error('[zoho-sync] Erro COQL:', JSON.stringify(coqlJson).slice(0, 300));
    process.exit(1);
  }
  console.log(`[zoho-sync] ${coqlJson.data.length} deals retornados do Zoho.`);
  const deals = coqlJson.data.map(mapDeal);
  await syncFromPayload(deals);
}

main().catch(e => { console.error(e); process.exit(1); });
