// rd_fetch.js — busca dados do RD Station Marketing (API REST + OAuth2)
// Padrao igual ao ga4_fetch.js: popula public/api/rd-snapshot.json
// e server.js le esse arquivo (sincrono, quota-safe). Rodar via CLI ou cron.
//
// Uso CLI:
//   node scripts/integrations/rd_fetch.js exchange <code>     # troca code por refresh_token (1x)
//   node scripts/integrations/rd_fetch.js fetch              # busca dados e atualiza snapshot
//
// Credenciais:
//   RD_CLIENT_ID, RD_CLIENT_SECRET  -> do app criado em app.rdstation.com.br
//   RD_REFRESH_TOKEN                -> semente inicial (Railway env var). ATENÇÃO: o RD Station
//                                      rotaciona o refresh_token a cada uso — o token atualizado
//                                      é salvo em DATA_DIR/rd-tokens.json e tem prioridade sobre
//                                      a env var. Nunca sobrescrever a env var manualmente.
//   RD_REDIRECT_URI                 -> mesmo cadastrado no app
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');

const SNAPSHOT_PATH = path.join(__dirname, '..', '..', 'public', 'api', 'rd-snapshot.json');

// Tokens salvos no volume persistente (Railway: /data · local: localModules dir)
// Nunca em public/api/ — essa pasta é apagada a cada deploy.
const IS_LOCAL = !!process.env.LOCAL_MODULES_PATH;
const DATA_DIR  = IS_LOCAL
  ? (process.env.LOCAL_MODULES_PATH || '').replace(/[\\/]node_modules$/, '')
  : (process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'));
const TOKENS_PATH = path.join(DATA_DIR, 'rd-tokens.json');
// Caminho legado (pre-fix) — lido como fallback na migração
const TOKENS_PATH_LEGACY = path.join(__dirname, '..', '..', 'public', 'api', 'rd-tokens.json');

// ── HTTP helper (sem dep externa) ────────────────────────────────────────────
function httpRequest({ method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method, hostname: u.hostname, path: u.pathname + u.search, port: 443,
      headers: { 'Accept': 'application/json', ...(headers || {}) },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        } catch (e) { reject(new Error(`Parse: ${e.message} · raw: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ── OAuth2 ───────────────────────────────────────────────────────────────────
async function exchangeCodeForTokens(code) {
  const r = await httpRequest({
    method: 'POST',
    url: 'https://api.rd.services/auth/token',
    headers: { 'Content-Type': 'application/json' },
    body: {
      client_id: process.env.RD_CLIENT_ID,
      client_secret: process.env.RD_CLIENT_SECRET,
      code,
    },
  });
  return r; // { access_token, refresh_token, expires_in }
}

async function refreshAccessToken() {
  const stored = readTokens();
  // Arquivo tem prioridade: contém o refresh_token mais recente (rotacionado pelo RD).
  // Env var é apenas a semente inicial — usada só se o arquivo ainda não existir.
  const refresh_token = stored.refresh_token || process.env.RD_REFRESH_TOKEN;
  if (!refresh_token) throw new Error('RD_REFRESH_TOKEN nao definido. Rode: node rd_fetch.js exchange <code>');
  const r = await httpRequest({
    method: 'POST',
    url: 'https://api.rd.services/auth/token',
    headers: { 'Content-Type': 'application/json' },
    body: {
      client_id: process.env.RD_CLIENT_ID,
      client_secret: process.env.RD_CLIENT_SECRET,
      refresh_token,
    },
  });
  // RD Station rotaciona o refresh_token a cada chamada — salvar SEMPRE o novo.
  writeTokens({
    refresh_token: r.refresh_token || refresh_token,
    access_token: r.access_token,
    expires_in: r.expires_in,
    atualizado_em: new Date().toISOString(),
  });
  return r.access_token;
}

function readTokens() {
  // Tenta o caminho persistente primeiro; cai no legado (public/api/) se existir
  for (const p of [TOKENS_PATH, TOKENS_PATH_LEGACY]) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data.refresh_token) return data;
    } catch {}
  }
  return {};
}
function writeTokens(t) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(t, null, 2), 'utf8');
}

// ── Helpers de chamada API com auth ──────────────────────────────────────────
async function rdGet(endpoint, accessToken) {
  return httpRequest({
    method: 'GET',
    url: 'https://api.rd.services' + endpoint,
    headers: { 'Authorization': 'Bearer ' + accessToken },
  });
}

// ── Fetch principal ──────────────────────────────────────────────────────────
async function fetchRD() {
  const accessToken = await refreshAccessToken();
  const errors = [];
  const out = { fonte: 'RD Station Marketing API', atualizado_em: new Date().toISOString() };

  // 0. Account info
  try {
    out.account = await rdGet('/marketing/account_info', accessToken);
  } catch (e) { errors.push({ src: 'account', erro: e.message }); }

  // 1. Segmentations (listas) + tamanho via paginacao (RD max page_size=125)
  // Pagina ate MAX_PAGES por seg pra nao estourar quota; marca "+" se truncou
  const PAGE_SIZE = 125;
  try {
    const seg = await rdGet('/platform/segmentations', accessToken);
    const lista = (seg.segmentations || []);
    const top = lista.slice(0, 10);
    for (const s of top) {
      try {
        let total = 0, page = 1, truncado = false;
        // Se for a segmentacao principal de leads, paginamos ate 150 paginas (ate 18.750 contatos)
        // Para as outras segmentacoes, limitamos a 2 paginas (250 contatos) para poupar quota
        const isBaseLeads = /todos os contatos/i.test(s.name);
        const maxPagesForThisSeg = isBaseLeads ? 150 : 2;
        while (page <= maxPagesForThisSeg) {
          const c = await rdGet(`/platform/segmentations/${s.id}/contacts?page_size=${PAGE_SIZE}&page=${page}`, accessToken);
          const n = (c.contacts || []).length;
          total += n;
          if (n < PAGE_SIZE) break; // fim
          if (page === maxPagesForThisSeg) { truncado = true; break; }
          page++;
        }
        s._contatos = total;
        s._contatos_aprox = truncado;
      } catch { s._contatos = null; }
    }
    out.segmentations = {
      total: lista.length,
      top: top.map(s => ({
        id: s.id, name: s.name, standard: s.standard,
        contatos: s._contatos, contatos_aprox: s._contatos_aprox || false,
        created_at: s.created_at,
      })),
    };
  } catch (e) { errors.push({ src: 'segmentations', erro: e.message.slice(0, 120) }); }

  // 2. Workflows (automacoes) — status em configurations.status
  try {
    const wf = await rdGet('/platform/workflows', accessToken);
    const all = (wf.workflows || []);
    const isEnabled = (w) => (w.configurations?.status || '').toLowerCase() === 'enabled';
    out.workflows = {
      total: all.length,
      ativos: all.filter(isEnabled).length,
      lista_ativos: all.filter(isEnabled).slice(0, 20).map(w => ({
        id: w.id, name: w.name, updated_at: w.updated_at,
      })),
    };
  } catch (e) { errors.push({ src: 'workflows', erro: e.message }); }

  // 3. Funnel — endpoint instavel no RD (500 frequente). Tenta best-effort.
  try {
    const f = await rdGet('/platform/contacts/funnels/default', accessToken);
    out.funnel = f;
  } catch (e) { errors.push({ src: 'funnel', erro: e.message.slice(0, 120) }); }

  // 4. Landing pages — endpoint retorna ARRAY direto (sem envelope)
  try {
    const lp = await rdGet('/platform/landing_pages', accessToken);
    const arr = Array.isArray(lp) ? lp : (lp.landing_pages || []);
    out.landing_pages = {
      total: arr.length,
      publicadas: arr.filter(l => (l.status || '').toUpperCase() === 'PUBLISHED').length,
      lista_publicadas: arr.filter(l => (l.status || '').toUpperCase() === 'PUBLISHED')
        .slice(0, 10).map(l => ({ id: l.id, title: l.title, conversion_identifier: l.conversion_identifier })),
    };
  } catch (e) { errors.push({ src: 'landing_pages', erro: e.message.slice(0, 120) }); }

  // 5. Emails — payload usa { total, items } (nao { emails }) · max page_size=125
  try {
    const em = await rdGet('/platform/emails?page_size=125', accessToken);
    const items = em.items || em.emails || [];
    // RD usa "finished" (=enviado/concluido), "draft", "scheduled", "sending"
    const sentStatus = ['finished', 'sent', 'sending', 'scheduled'];
    const sent = items.filter(e => sentStatus.includes((e.status || '').toLowerCase()));
    const ymNow = new Date().toISOString().slice(0, 7);
    const enviadosNoMes = items.filter(e => {
      const d = e.send_at || e.sent_at || e.updated_at || e.created_at || '';
      return ((e.status || '').toLowerCase() === 'finished') && d.startsWith(ymNow);
    });
    out.emails = {
      total: em.total ?? items.length,
      total_enviados: sent.length,
      enviados_mes_atual: enviadosNoMes.length,
      mes_atual: ymNow,
      lista_recente: items.slice(0, 10).map(e => ({
        id: e.id, name: e.name, status: e.status, send_at: e.send_at, created_at: e.created_at,
      })),
    };
  } catch (e) { errors.push({ src: 'emails', erro: e.message.slice(0, 120) }); }

  if (errors.length) out.errors = errors;
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(out, null, 2), 'utf8');
  return out;
}

function readSnapshot() {
  try { return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')); } catch { return null; }
}

module.exports = { exchangeCodeForTokens, refreshAccessToken, fetchRD, readSnapshot, readTokens, writeTokens, SNAPSHOT_PATH, TOKENS_PATH };

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  // carrega .env off-repo se existir
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

  const cmd = process.argv[2];
  if (cmd === 'exchange') {
    const code = process.argv[3];
    if (!code) { console.error('Uso: node rd_fetch.js exchange <code>'); process.exit(1); }
    exchangeCodeForTokens(code).then(t => {
      writeTokens({ refresh_token: t.refresh_token, access_token: t.access_token, expires_in: t.expires_in, atualizado_em: new Date().toISOString() });
      console.log('OK — tokens salvos em:', TOKENS_PATH);
      console.log('refresh_token:', t.refresh_token);
      console.log('access_token (' + t.expires_in + 's):', (t.access_token || '').slice(0, 32) + '...');
      console.log('\nIMPORTANTE: adiciona no .env:');
      console.log('RD_REFRESH_TOKEN=' + t.refresh_token);
    }).catch(e => { console.error('ERRO:', e.message); process.exit(1); });
  } else if (cmd === 'fetch' || !cmd) {
    fetchRD().then(s => {
      console.log('RD snapshot gravado em:', SNAPSHOT_PATH);
      console.log('  segmentations:', s.segmentations?.total ?? '—');
      console.log('  workflows:', s.workflows?.total ?? '—', '(ativos:', s.workflows?.ativos ?? '—', ')');
      console.log('  forms:', s.forms?.total ?? '—');
      console.log('  landing_pages:', s.landing_pages?.total ?? '—');
      console.log('  emails:', s.emails?.total ?? '—');
      if (s.errors) console.log('  erros:', JSON.stringify(s.errors, null, 2));
    }).catch(e => { console.error('ERRO:', e.message); process.exit(1); });
  } else {
    console.error('Comando invalido. Use: exchange <code> | fetch');
    process.exit(1);
  }
}
