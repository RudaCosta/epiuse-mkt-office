// ga4_fetch.js — busca metricas do Google Analytics 4 (Data API) e grava snapshot
// Padrao igual ao Apollo: este script popula public/api/ga4-snapshot.json
// e o server.js le esse arquivo (sincrono, quota-safe). Rodar via CLI ou cron.
//
// Uso CLI:  node scripts/integrations/ga4_fetch.js [YYYY-MM]
//           (sem argumento = mes atual)
//
// Credenciais (Railway-safe):
//   - GA4_SA_JSON          = JSON inteiro do Service Account (1 linha) [preferido em prod]
//   - GOOGLE_APPLICATION_CREDENTIALS = caminho do arquivo .json [dev local]
//   - GA4_PROPERTY_ID      = ex "properties/123456789" ou só "123456789"
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Resolve googleapis em local-dev (modulos off-repo) ou Railway (node_modules) ──
function resolveGoogle() {
  const winUser = os.userInfo().username;
  const candidates = [
    'googleapis', // node_modules normal (Railway + se rodar da raiz do projeto)
    path.join(__dirname, '..', '..', 'node_modules', 'googleapis'),
    `C:/Users/${winUser}/.epiuse-optimizer/node_modules/googleapis`,
    'C:/Users/Ruds/.epiuse-optimizer/node_modules/googleapis',
  ];
  for (const c of candidates) {
    try { return require(c).google; } catch { /* tenta o proximo */ }
  }
  throw new Error('googleapis nao encontrado. Rode `npm install googleapis` na raiz do projeto.');
}

// ── Credenciais ────────────────────────────────────────────────────────────────
function buildAuth(google) {
  const scopes = ['https://www.googleapis.com/auth/analytics.readonly'];
  if (process.env.GA4_SA_JSON) {
    let creds;
    try { creds = JSON.parse(process.env.GA4_SA_JSON); }
    catch (e) { throw new Error('GA4_SA_JSON nao e um JSON valido: ' + e.message); }
    return new google.auth.GoogleAuth({ credentials: creds, scopes });
  }
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFile && fs.existsSync(keyFile)) {
    return new google.auth.GoogleAuth({ keyFile, scopes });
  }
  throw new Error('Sem credenciais GA4: defina GA4_SA_JSON (prod) ou GOOGLE_APPLICATION_CREDENTIALS (dev).');
}

function propertyResource() {
  const raw = process.env.GA4_PROPERTY_ID || '';
  if (!raw) throw new Error('GA4_PROPERTY_ID nao definido (ex: properties/123456789).');
  return raw.startsWith('properties/') ? raw : `properties/${raw}`;
}

// ── Helpers de data ──────────────────────────────────────────────────────────────
function monthRange(mes) {
  // mes = "YYYY-MM" → { start: "YYYY-MM-01", end: "YYYY-MM-<ultimo dia>" }
  const [y, m] = mes.split('-').map(Number);
  const last = new Date(y, m, 0).getDate(); // dia 0 do mes seguinte = ultimo do atual
  const pad = n => String(n).padStart(2, '0');
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` };
}
function prevMonth(mes) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1); // m-2 pq mes e 1-based e Date e 0-based
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const SNAPSHOT_PATH = path.join(__dirname, '..', '..', 'public', 'api', 'ga4-snapshot.json');

// ── Fetch principal ──────────────────────────────────────────────────────────────
async function fetchGA4(mes) {
  mes = mes || new Date().toISOString().slice(0, 7);
  const google = resolveGoogle();
  const auth = buildAuth(google);
  const data = google.analyticsdata({ version: 'v1beta', auth });
  const property = propertyResource();

  const cur  = monthRange(mes);
  const prev = monthRange(prevMonth(mes));

  const metrics = [
    { name: 'activeUsers' },
    { name: 'screenPageViews' },
    { name: 'sessions' },
    { name: 'averageSessionDuration' },
  ];

  const res = await data.properties.runReport({
    property,
    requestBody: {
      dateRanges: [
        { startDate: cur.start,  endDate: cur.end,  name: 'atual' },
        { startDate: prev.start, endDate: prev.end, name: 'anterior' },
      ],
      metrics,
    },
  });

  // rows[0] = range atual, rows[1] = anterior (ordem dos dateRanges)
  const rows = res.data.rows || [];
  const grab = (rangeIdx) => {
    const row = rows.find(r => Number(r.dimensionValues?.[0]?.value ?? r.dateRangeIndex ?? -1) === rangeIdx)
             || rows[rangeIdx];
    const v = (row && row.metricValues) ? row.metricValues.map(x => Number(x.value)) : [0, 0, 0, 0];
    return { usuarios: v[0], visualizacoes: v[1], sessoes: v[2], duracao_sessao_s: Math.round(v[3]) };
  };
  const atual    = grab(0);
  const anterior = grab(1);
  const mom = (a, b) => (a != null && b) ? Math.round(100 * (a - b) / b * 100) / 100 : null;

  return {
    mes,
    property_id: property,
    usuarios: atual.usuarios,
    visualizacoes: atual.visualizacoes,
    sessoes: atual.sessoes,
    duracao_sessao_s: atual.duracao_sessao_s,
    usuarios_mom_pct: mom(atual.usuarios, anterior.usuarios),
    visualizacoes_mom_pct: mom(atual.visualizacoes, anterior.visualizacoes),
    sessoes_mom_pct: mom(atual.sessoes, anterior.sessoes),
    anterior,
    fonte: 'GA4 Data API',
    atualizado_em: new Date().toISOString(),
  };
}

// ── Cache (snapshot keyed por mes) ────────────────────────────────────────────────
function readSnapshot() {
  try { return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')); }
  catch { return { meses: {}, atualizado_em: null }; }
}
function writeSnapshot(snap) {
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap, null, 2), 'utf8');
}

async function refreshAndCache(mes) {
  const result = await fetchGA4(mes);
  const snap = readSnapshot();
  snap.meses = snap.meses || {};
  snap.meses[result.mes] = result;
  snap.atualizado_em = result.atualizado_em;
  writeSnapshot(snap);
  return result;
}

// ── FY helpers (EPI-USE: ano fiscal jul→jun) ───────────────────────────────
// FY26 = jul/2025 → jun/2026 · FY27 = jul/2026 → jun/2027
function fyMonths(fy) {
  const startYear = 2000 + fy - 1;
  const meses = [];
  for (let m = 7; m <= 12; m++) meses.push(`${startYear}-${String(m).padStart(2, '0')}`);
  for (let m = 1; m <= 6; m++) meses.push(`${startYear + 1}-${String(m).padStart(2, '0')}`);
  return meses;
}

// Busca todos os meses do FY (pula meses futuros) e popula o cache.
// Retorna { fy, label, meses_fy, meses_obtidos, totais, erros }
async function refreshFY(fy, { force = false } = {}) {
  const meses = fyMonths(fy);
  const hoje = new Date().toISOString().slice(0, 7);
  const elegiveis = meses.filter(m => m <= hoje);
  const snap = readSnapshot();
  snap.meses = snap.meses || {};
  const obtidos = [];
  const erros = [];
  for (const m of elegiveis) {
    if (!force && snap.meses[m] && snap.meses[m].usuarios != null) {
      obtidos.push(m);
      continue;
    }
    try {
      const r = await fetchGA4(m);
      snap.meses[m] = r;
      obtidos.push(m);
    } catch (e) {
      erros.push({ mes: m, erro: e.message });
    }
  }
  snap.atualizado_em = new Date().toISOString();
  writeSnapshot(snap);
  // Totais agregados do FY (real data only — soma só dos meses obtidos)
  const sumKey = (k) => obtidos.reduce((a, m) => a + (snap.meses[m]?.[k] ?? 0), 0);
  const totais = {
    usuarios: sumKey('usuarios'),
    visualizacoes: sumKey('visualizacoes'),
    sessoes: sumKey('sessoes'),
    meses_com_dado: obtidos.length,
    meses_total_fy: meses.length,
    meses_elegiveis: elegiveis.length,
    fonte: 'GA4 Data API',
    atualizado_em: snap.atualizado_em,
  };
  return {
    fy,
    label: `FY${fy} (jul/${String(2000 + fy - 1).slice(-2)} → jun/${String(2000 + fy).slice(-2)})`,
    meses_fy: meses,
    meses_obtidos: obtidos,
    totais,
    erros,
  };
}

module.exports = { fetchGA4, refreshAndCache, readSnapshot, SNAPSHOT_PATH, fyMonths, refreshFY };

// ── CLI ───────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  // carrega .env off-repo se existir (mesma logica do server, simplificada)
  (function loadEnv() {
    const winUser = os.userInfo().username;
    const cands = [
      `C:/Users/${winUser}/.epiuse-optimizer/.env`,
      'C:/Users/Ruds/.epiuse-optimizer/.env',
      path.resolve(__dirname, '..', '..', '.env'),
    ];
    for (const ep of cands) {
      if (fs.existsSync(ep)) {
        fs.readFileSync(ep, 'utf8').split('\n').forEach(l => {
          const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
          if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
        });
        break;
      }
    }
  })();

  const mes = process.argv[2] || new Date().toISOString().slice(0, 7);
  refreshAndCache(mes)
    .then(r => {
      console.log('GA4 snapshot gravado para', r.mes);
      console.log(`  usuarios=${r.usuarios} (${r.usuarios_mom_pct ?? '—'}% MoM)`);
      console.log(`  visualizacoes=${r.visualizacoes}  sessoes=${r.sessoes}  duracao=${r.duracao_sessao_s}s`);
      console.log('  arquivo:', SNAPSHOT_PATH);
    })
    .catch(e => { console.error('ERRO GA4:', e.message); process.exit(1); });
}
