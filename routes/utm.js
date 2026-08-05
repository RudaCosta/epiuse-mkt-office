// ════════════════════════════════════════════════════════════════════════════
// routes/utm.js — Sistema de UTM / links rastreados (Módulo 18)
// Mede o que cada usuário compartilha PRA FORA da plataforma e credita ERP Coins
// por CLIQUE REAL (não só intenção). Como não dá pra medir cliques num link cru
// do LinkedIn, a peça central é um link rastreado próprio:
//   office.epiuse.com.br/go/<token>  →  loga o clique (atribuído a quem
//   compartilhou) → 302 pro destino real com os parâmetros UTM anexados.
// Report em /admin/utm — restrito ao dono. Coins fluem pro ledger erp_coins
// (evento 'utm_click') → aparecem no detalhe por usuário do /admin/analytics.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const { db, requireEditorToken } = require('../server-context');

const OWNER_EMAIL = (process.env.ANALYTICS_OWNER_EMAIL || 'ruda.costa@epiuse.com.br').toLowerCase();
const UTM_CLICK_COINS = parseInt(process.env.UTM_CLICK_COINS, 10) || 5; // coins por clique único/dia
const CLICK_SALT = process.env.SESSION_SECRET || 'eubr-utm-salt';

db.exec(`
  CREATE TABLE IF NOT EXISTS utm_links (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT UNIQUE,          -- código curto do link /go/<token>
    email      TEXT,                 -- quem compartilhou (dono da atribuição)
    campaign   TEXT,                 -- id da campanha / conteúdo
    source     TEXT,                 -- utm_source (linkedin, whatsapp, email…)
    medium     TEXT,                 -- utm_medium
    dest       TEXT,                 -- URL de destino real
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_utm_links_email ON utm_links(email);
  CREATE TABLE IF NOT EXISTS utm_clicks (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    token   TEXT,
    ts      INTEGER,
    ref     TEXT,                    -- referer
    ua      TEXT,
    ip_hash TEXT                     -- hash do IP (não guarda IP cru)
  );
  CREATE INDEX IF NOT EXISTS idx_utm_clicks_token ON utm_clicks(token);
  CREATE INDEX IF NOT EXISTS idx_utm_clicks_ts ON utm_clicks(ts);
`);
// Flag de bot (v0.77.0): cliques de crawlers/preview (LinkedInBot, WhatsApp…)
// são logados com bot=1 e NÃO contam nas métricas nem creditam coins (regra 7 —
// clique de máquina não é clique real). Migração idempotente; histórico fica 0.
try { db.exec(`ALTER TABLE utm_clicks ADD COLUMN bot INTEGER DEFAULT 0`); } catch (_e) { /* já existe */ }

// Migração v0.82.4: marca retroativamente cliques de email-security-scanners como
// bot=1. Heurística: tokens que receberam 10+ cliques de IPs distintos em janelas
// de 5 min são burst de scanner (SafeLinks, Proofpoint…). Roda 1x (idempotente).
try {
  const migKey = 'utm_bot_backfill_v1';
  const already = db.prepare(`SELECT 1 FROM erp_coins WHERE evento=? AND ref=? LIMIT 1`).get('_migration', migKey);
  if (!already) {
    const bursts = db.prepare(`
      SELECT c1.token, c1.ts AS window_start,
             COUNT(DISTINCT c1.ip_hash) AS distinct_ips,
             COUNT(*) AS total
      FROM utm_clicks c1
      JOIN utm_clicks c2 ON c2.token = c1.token
        AND c2.ts BETWEEN c1.ts AND c1.ts + 300000
        AND c2.bot = 0
      WHERE c1.bot = 0
      GROUP BY c1.token, CAST(c1.ts / 300000 AS INTEGER)
      HAVING distinct_ips >= 10
    `).all();
    if (bursts.length) {
      const markBot = db.prepare(`UPDATE utm_clicks SET bot = 1 WHERE token = ? AND bot = 0 AND ts BETWEEN ? AND ? + 300000`);
      const tx = db.transaction(() => {
        for (const b of bursts) markBot.run(b.token, b.window_start, b.window_start);
      });
      tx();
      const total = bursts.reduce((s, b) => s + b.total, 0);
      console.log(`[utm] backfill: ${total} cliques de scanner marcados como bot em ${bursts.length} janela(s)`);
    }
    db.prepare(`INSERT OR IGNORE INTO erp_coins (email, evento, ref, coins) VALUES (?,?,?,?)`).run('_system', '_migration', migKey, 0);
  }
} catch (e) { console.warn('[utm] backfill migration:', e.message); }

function sessionEmail(req) {
  const e = req.session && req.session.user && req.session.user.email;
  return e ? String(e).toLowerCase() : null;
}
function sessionRole(req) {
  return req.session && req.session.user && req.session.user.role;
}
// Report do UTM é ferramenta do time de Marketing (não exclusivo do dono).
const MKT_ROLES = new Set(['head', 'intelligence', 'growth', 'field', 'pipeline', 'brand', 'conteudo']);
function requireMkt(req, res, next) {
  if (MKT_ROLES.has(sessionRole(req))) return next();
  const t = req.query.token || req.headers['x-editor-token'];
  if (t) return requireEditorToken(req, res, next);
  if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'forbidden' });
  return res.status(403).send('Acesso restrito ao time de Marketing.');
}
function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  return crypto.createHash('sha256').update(ip + '|' + CLICK_SALT).digest('hex').slice(0, 16);
}
function isHttpUrl(u) { return /^https?:\/\/.+/i.test(String(u || '')); }
function newToken() { return crypto.randomBytes(6).toString('hex'); } // 12 chars
function baseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
  return proto + '://' + req.get('host');
}
// Slug legível: lowercase, espaços/underscores viram hífen, colapsa hífens.
// Ex.: "SAP NOW 2026" → "sap-now-2026" (antes virava "SAPNOW2026").
function sanitizeSlug(s, max) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max || 60);
}

// Bots/crawlers de preview (LinkedInBot, WhatsApp, facebookexternalhit, Telegram,
// Slack, curl…) — recebem o redirect normal (precisam do 302 pro preview), mas o
// clique é marcado bot=1 e não credita coins nem entra nas contagens.
const BOT_UA_RE = /bot|crawl|spider|linkedin|whatsapp|facebookexternalhit|facebot|telegram|slack|twitter|discord|skypeuripreview|preview|pinterest|curl|wget|python|axios|node-fetch|go-http|headless|lighthouse|monitor|uptime|safelinks|urldefense|barracuda|mimecast|proofpoint|googleimageproxy|ms-office|bing|jakarta|scanner|fetch|phishguard|mailguard|security|clickprotect|antivirus|fortinet|sophos/i;
function isBotUA(ua) { return BOT_UA_RE.test(String(ua || '')) || !String(ua || '').trim(); }

// HMAC para JS challenge — garante que /go/:token/c só funciona via JS da página
function clickHmac(token, ts) {
  return crypto.createHmac('sha256', CLICK_SALT).update(token + '|' + ts).digest('hex').slice(0, 16);
}

// ── Janela cega de cliques (v0.82.4 → v0.84.0) ────────────────────────────────
// O JS challenge anti-scanner entrou com a URL de confirmação HTML-escapada
// dentro do <script>: o navegador pedia "?t=…&amp;h=…", o Express lia o
// parâmetro como "amp;h", o HMAC nunca batia e o clique humano era descartado
// em silêncio (o usuário chegava no destino normalmente, então nada parecia
// quebrado). Resultado: NENHUM clique humano foi registrado nesse intervalo.
// Esses cliques não são recuperáveis — nunca chegaram a ser gravados.
// Regra 7: número incompleto não pode se passar por número real, então quem
// olhar um período que cruza essa janela é avisado na tela.
const CLICK_GAP = {
  inicio: Date.parse('2026-07-27T21:41:29Z'), // deploy do challenge com o bug
  fim:    Date.parse('2026-08-05T15:22:13Z'), // deploy do fix (v0.84.0)
  de_label: '27/jul', ate_label: '05/ago',
  texto: 'Entre 27/jul e 05/ago os cliques humanos não foram registrados — um bug no redirect anti-bot descartava o clique em silêncio (o link funcionava normalmente pra quem clicava). Os números desse intervalo estão SUBESTIMADOS e não são recuperáveis. Corrigido na v0.84.0.',
};
function gapOverlap(inicio, fim) {
  return (inicio <= CLICK_GAP.fim && fim >= CLICK_GAP.inicio) ? CLICK_GAP : null;
}

// utm_medium padrão por canal (sobrescritível via body.medium).
const MEDIUM_BY_SOURCE = {
  linkedin: 'employee_advocacy', whatsapp: 'employee_advocacy',
  email: 'email', evento: 'offline', impresso: 'offline', site: 'referral',
};

// Anexa os parâmetros UTM na URL de destino (preserva query existente).
function appendUtm(dest, { source, medium, campaign, content }) {
  try {
    const u = new URL(dest);
    if (source)   u.searchParams.set('utm_source', source);
    if (medium)   u.searchParams.set('utm_medium', medium);
    if (campaign) u.searchParams.set('utm_campaign', campaign);
    if (content)  u.searchParams.set('utm_content', content);
    return u.toString();
  } catch (e) { return dest; }
}

// ── Gera (ou reusa) um link rastreado pro usuário logado ──────────────────────
// Reusa o token quando (email, campaign, source, dest) baterem TODOS. Se o
// destino for diferente, cria token NOVO — nunca sobrescreve o destino de um
// link já compartilhado/impresso (QR em material físico não pode quebrar).
router.post('/api/utm/link', express.json({ limit: '2kb' }), (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const b = req.body || {};
  const dest = String(b.dest || '').trim().slice(0, 500);
  if (!isHttpUrl(dest)) return res.status(400).json({ error: 'dest_invalido' });
  // Anti-loop: destino não pode ser o próprio Office /go/ (nem o host atual).
  try {
    const du = new URL(dest);
    if (du.pathname.startsWith('/go/') || du.host === req.get('host')) {
      return res.status(400).json({ error: 'dest_invalido', motivo: 'destino não pode ser o próprio Office' });
    }
  } catch (e) { return res.status(400).json({ error: 'dest_invalido' }); }
  const campaign = sanitizeSlug(b.campaign, 60) || 'geral';
  const source = sanitizeSlug(b.source, 30) || 'linkedin';
  const medium = sanitizeSlug(b.medium, 30) || MEDIUM_BY_SOURCE[source] || 'employee_advocacy';
  try {
    const row = db.prepare(`SELECT token FROM utm_links WHERE email=? AND campaign=? AND source=? AND dest=?`)
                  .get(email, campaign, source, dest);
    let token, reused = false;
    if (row) { token = row.token; reused = true; }
    else {
      token = newToken();
      db.prepare(`INSERT INTO utm_links (token, email, campaign, source, medium, dest) VALUES (?,?,?,?,?,?)`)
        .run(token, email, campaign, source, medium, dest);
    }
    const url = baseUrl(req) + '/go/' + token;
    res.json({ token, url, reused, campaign, source, medium,
               dest: appendUtm(dest, { source, medium, campaign, content: token }) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Meus links (self-service) — o usuário logado vê SÓ os próprios ────────────
router.get('/api/utm/mine', (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  try {
    const since7 = Date.now() - 7 * 86400000;
    const links = db.prepare(`
      SELECT l.token, l.campaign, l.source, l.medium, l.dest, l.created_at,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.bot=0) AS cliques,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.bot=0 AND c.ts>=?) AS cliques_7d,
             (SELECT COALESCE(SUM(coins),0) FROM erp_coins e
                WHERE e.email=l.email AND e.evento='utm_click' AND e.ref LIKE l.token || ':%') AS coins
      FROM utm_links l WHERE l.email=? ORDER BY cliques DESC, l.created_at DESC LIMIT 200
    `).all(since7, email);
    const totais = {
      links: links.length,
      cliques: links.reduce((a, l) => a + l.cliques, 0),
      coins: links.reduce((a, l) => a + l.coins, 0),
    };
    // Os totais aqui são vitalícios, então sempre carregam a janela cega.
    res.json({ email, base: baseUrl(req) + '/go/', click_coins: UTM_CLICK_COINS,
               aviso_gap: CLICK_GAP, totais, links });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Renomear a campanha de um link do próprio usuário ─────────────────────────
// Só muda o rótulo (utm_campaign nos próximos cliques). Token/QR NÃO mudam — o
// destino e o link continuam os mesmos. Só o dono edita.
router.patch('/api/utm/link/:token', express.json({ limit: '1kb' }), (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const token = sanitizeSlug(req.params.token, 24);
  const campaign = sanitizeSlug((req.body || {}).campaign, 60);
  if (!campaign) return res.status(400).json({ error: 'campaign_invalida' });
  try {
    const link = db.prepare(`SELECT email FROM utm_links WHERE token=?`).get(token);
    if (!link) return res.status(404).json({ error: 'nao_encontrado' });
    if (String(link.email).toLowerCase() !== email) return res.status(403).json({ error: 'nao_e_seu' });
    db.prepare(`UPDATE utm_links SET campaign=? WHERE token=?`).run(campaign, token);
    res.json({ success: true, campaign });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Excluir um link do próprio usuário ────────────────────────────────────────
// Só o dono apaga. Remove o link + seus cliques (limpa o report); os ERP Coins
// já creditados NÃO são estornados (participação real já aconteceu). Depois disto
// o /go/<token> volta a cair no redirect pra '/' (link/QR impresso para).
router.delete('/api/utm/link/:token', (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const token = sanitizeSlug(req.params.token, 24);
  try {
    const link = db.prepare(`SELECT email FROM utm_links WHERE token=?`).get(token);
    if (!link) return res.status(404).json({ error: 'nao_encontrado' });
    if (String(link.email).toLowerCase() !== email) return res.status(403).json({ error: 'nao_e_seu' });
    db.transaction(() => {
      db.prepare(`DELETE FROM utm_clicks WHERE token=?`).run(token);
      db.prepare(`DELETE FROM utm_links WHERE token=?`).run(token);
    })();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Redirect rastreado — JS challenge filtra bots de segurança de email ────────
// Bots de UA conhecida (social previews) → 302 direto + bot=1.
// Demais requests → página HTML com JS redirect. Bots de email (SafeLinks,
// Proofpoint…) NÃO executam JS, então nunca chegam no /go/:token/c que é onde
// o clique humano real é contado. Delay imperceptível pra humanos (~50ms).
router.get('/go/:token', (req, res) => {
  const token = sanitizeSlug(req.params.token, 24);
  let link = null;
  try { link = db.prepare(`SELECT * FROM utm_links WHERE token=?`).get(token); } catch (e) {}
  if (!link) return res.redirect('/');

  const ua = String(req.headers['user-agent'] || '').slice(0, 200);
  const bot = isBotUA(ua) ? 1 : 0;
  const target = appendUtm(link.dest, {
    source: link.source, medium: link.medium, campaign: link.campaign, content: token,
  });

  if (bot) {
    // Bot de UA conhecida: loga como bot, 302 pro destino (link preview precisa)
    try {
      db.prepare(`INSERT INTO utm_clicks (token, ts, ref, ua, ip_hash, bot) VALUES (?,?,?,?,?,?)`)
        .run(token, Date.now(), String(req.headers['referer'] || '').slice(0, 200), ua, ipHash(req), 1);
    } catch (e) { console.warn('[utm] bot-click', e.message); }
    res.set('Cache-Control', 'no-store');
    return res.redirect(302, target);
  }

  // Potencial humano OU bot de email (UA genérica): servir JS challenge
  const now = Date.now();
  const hmac = clickHmac(token, now);
  const confirmUrl = '/go/' + token + '/c?t=' + now + '&h=' + hmac;
  const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  // ⚠️ O conteúdo de <script> é raw text: o parser NÃO decodifica entidades.
  // HTML-escapar a URL aqui gerava "…&amp;h=<hmac>", então o navegador pedia
  // ?t=…&amp;h=… → o Express lia o parâmetro como "amp;h", `h` vinha vazio, o
  // HMAC nunca batia e TODO clique humano era descartado (bug v0.82.4).
  // Contexto JS pede escape de JS: JSON.stringify. O esc() de HTML continua
  // certo no href do <noscript>, que é contexto de atributo HTML.
  const confirmUrlJs = JSON.stringify(confirmUrl).replace(/</g, '\\u003c');
  res.set('Cache-Control', 'no-store');
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecionando...</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a1426;color:#e8f0ff}
.box{text-align:center}.spinner{width:28px;height:28px;border:3px solid rgba(255,255,255,.15);border-top-color:#cd1543;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 14px}
@keyframes spin{to{transform:rotate(360deg)}}a{color:#60a5fa}</style></head>
<body><div class="box"><div class="spinner"></div><p>Redirecionando...</p>
<noscript><p style="margin-top:16px"><a href="${esc(target)}">Clique aqui para continuar</a></p></noscript></div>
<script>window.location.replace(${confirmUrlJs})</script></body></html>`);
});

// ── Confirmação JS — aqui o clique humano real é contado ──────────────────────
// Só chega aqui quem executou o JS da página acima (humano real). O HMAC impede
// acesso direto sem passar pela challenge page.
router.get('/go/:token/c', (req, res) => {
  const token = sanitizeSlug(req.params.token, 24);
  let link = null;
  try { link = db.prepare(`SELECT * FROM utm_links WHERE token=?`).get(token); } catch (e) {}
  if (!link) return res.redirect('/');

  const t = parseInt(req.query.t, 10) || 0;
  const h = String(req.query.h || '');
  // Validar HMAC e janela de tempo (5 min)
  if (h !== clickHmac(token, t) || Math.abs(Date.now() - t) > 300000) {
    const target = appendUtm(link.dest, {
      source: link.source, medium: link.medium, campaign: link.campaign, content: token,
    });
    return res.redirect(302, target);
  }

  const now = Date.now();
  const iph = ipHash(req);
  const ua = String(req.headers['user-agent'] || '').slice(0, 200);
  try {
    db.prepare(`INSERT INTO utm_clicks (token, ts, ref, ua, ip_hash, bot) VALUES (?,?,?,?,?,?)`)
      .run(token, now, String(req.headers['referer'] || '').slice(0, 200), ua, iph, 0);
    // Coins pro autor: 1 crédito por clicker único / link / dia
    db.prepare(`INSERT OR IGNORE INTO erp_coins (email, evento, ref, coins) VALUES (?,?,?,?)`)
      .run(link.email, 'utm_click', (token + ':' + iph).slice(0, 60), UTM_CLICK_COINS);
    // Marcos de cliques (v0.82.0)
    const humanos = db.prepare(`SELECT COUNT(*) n FROM utm_clicks WHERE token=? AND bot=0`).get(token).n;
    if (humanos >= 50) {
      db.prepare(`INSERT OR IGNORE INTO erp_coins (email, evento, ref, coins) VALUES (?,?,?,?)`)
        .run(link.email, 'marco', ('marco50:' + token).slice(0, 60), 25);
    }
    if (humanos >= 100) {
      db.prepare(`INSERT OR IGNORE INTO erp_coins (email, evento, ref, coins) VALUES (?,?,?,?)`)
        .run(link.email, 'marco', ('marco100:' + token).slice(0, 60), 50);
    }
  } catch (e) { console.warn('[utm] click', e.message); }

  const target = appendUtm(link.dest, {
    source: link.source, medium: link.medium, campaign: link.campaign, content: token,
  });
  res.set('Cache-Control', 'no-store');
  res.redirect(302, target);
});

// ══════════════════════════════════════════════════════════════════════════════
// REPORT — período (preset ou intervalo), filtros e agregação por data/hora
// ══════════════════════════════════════════════════════════════════════════════
const DAY_MS = 86400000;

// Fuso do CLIENTE (getTimezoneOffset em minutos; BRT = 180). Todas as agregações
// de dia/hora usam o fuso local de quem olha — senão o pico real das 9h da manhã
// apareceria às 12h (UTC) no histograma. Default 180 (time é do Brasil).
function tzOffMs(q) {
  const n = parseInt(q.tzoff, 10);
  return (isNaN(n) ? 180 : Math.max(-840, Math.min(840, n))) * 60000;
}
function parseDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const ts = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return isNaN(ts) ? null : ts;
}
// Período: intervalo custom (de/ate, YYYY-MM-DD no fuso do cliente) tem
// precedência; senão cai no preset de dias (compatível com a versão anterior).
function resolvePeriodo(q) {
  const off = tzOffMs(q);
  const de = parseDay(q.de), ate = parseDay(q.ate);
  if (de != null && ate != null && ate >= de) {
    return {
      inicio: de + off, fim: ate + DAY_MS - 1 + off, off,
      custom: true, dias: Math.round((ate - de) / DAY_MS) + 1,
      de: q.de, ate: q.ate,
    };
  }
  const days = Math.max(1, Math.min(365, parseInt(q.days, 10) || 30));
  const fim = Date.now();
  return { inicio: fim - days * DAY_MS, fim, off, custom: false, dias: days, days };
}

// Filtros de link (autor · campanha · origem · busca livre). Devolve o pedaço de
// SQL + params na ordem, pra compor com qualquer query que faça JOIN em utm_links.
function linkFilters(q) {
  const w = [], p = [];
  const email = String(q.email || '').toLowerCase().trim().slice(0, 120);
  if (email) { w.push('LOWER(l.email)=?'); p.push(email); }
  const campaign = sanitizeSlug(q.campaign, 60);
  if (campaign) { w.push('l.campaign=?'); p.push(campaign); }
  const source = sanitizeSlug(q.source, 30);
  if (source) { w.push('l.source=?'); p.push(source); }
  const txt = String(q.q || '').toLowerCase().trim().slice(0, 80);
  if (txt) {
    w.push('(LOWER(l.email) LIKE ? OR LOWER(l.campaign) LIKE ? OR LOWER(l.dest) LIKE ? OR l.token LIKE ?)');
    const t = '%' + txt + '%'; p.push(t, t, t, t);
  }
  return { sql: w.length ? ' AND ' + w.join(' AND ') : '', params: p,
           ativos: { email, campaign, source, q: txt } };
}

// Rótulo curto do dispositivo a partir do user-agent (dado real do clique).
function deviceOf(ua, bot) {
  const s = String(ua || '');
  if (bot) return 'bot';
  if (!s.trim()) return 'desconhecido';
  if (/ipad|tablet/i.test(s)) return 'tablet';
  if (/android|iphone|ipod|mobile/i.test(s)) return 'mobile';
  return 'desktop';
}

router.get('/api/admin/utm', requireMkt, (req, res) => {
  try {
    const P = resolvePeriodo(req.query);
    const F = linkFilters(req.query);
    const incluiBots = String(req.query.bots || '') === '1';
    const all = (sql, ...a) => db.prepare(sql).all(...a);
    const one = (sql, ...a) => db.prepare(sql).get(...a);

    // Base de cliques do período, sempre atrelada a um link existente (clique
    // órfão não é atribuível a ninguém).
    const CLICKS = `FROM utm_clicks c JOIN utm_links l ON l.token=c.token
                    WHERE c.ts>=? AND c.ts<=?`;
    const cp = [P.inicio, P.fim, ...F.params];

    // ── Cards ────────────────────────────────────────────────────────────────
    const hum = one(`SELECT COUNT(*) n, COUNT(DISTINCT c.ip_hash) p, MIN(c.ts) pri, MAX(c.ts) ult
                     ${CLICKS} AND c.bot=0 ${F.sql}`, ...cp);
    const bots = one(`SELECT COUNT(*) n ${CLICKS} AND c.bot=1 ${F.sql}`, ...cp).n;
    const linksTotal = one(`SELECT COUNT(*) n FROM utm_links l WHERE 1=1 ${F.sql}`, ...F.params).n;
    const linksNovos = one(`SELECT COUNT(*) n FROM utm_links l
                            WHERE l.created_at >= datetime(?/1000,'unixepoch')
                              AND l.created_at <= datetime(?/1000,'unixepoch') ${F.sql}`,
                           P.inicio, P.fim, ...F.params).n;

    // Tokens que o filtro alcança → base pra somar os coins do ledger. Os coins
    // seguem o filtro (ao olhar uma campanha, o número é o daquela campanha —
    // não o acumulado da pessoa, que seria enganoso).
    const tokens = new Set(all(`SELECT l.token FROM utm_links l WHERE 1=1 ${F.sql}`, ...F.params).map(r => r.token));
    const coinsPorEmail = new Map();
    let coinsCliques = 0, coinsMarcos = 0;
    try {
      for (const r of all(`SELECT email, evento, ref, coins FROM erp_coins WHERE evento IN ('utm_click','marco')`)) {
        const ref = String(r.ref || '');
        // utm_click → "<token>:<hash>" · marco → "marco50:<token>"
        const tok = r.evento === 'utm_click' ? ref.split(':')[0] : ref.split(':')[1];
        if (!tokens.has(tok)) continue;
        if (r.evento === 'utm_click') coinsCliques += (r.coins || 0); else coinsMarcos += (r.coins || 0);
        coinsPorEmail.set(r.email, (coinsPorEmail.get(r.email) || 0) + (r.coins || 0));
      }
    } catch (e) { /* ledger pode não existir em ambiente isolado */ }

    const summary = {
      links: linksTotal,               // links que batem no filtro (histórico)
      links_novos: linksNovos,         // criados dentro do período
      cliques: hum.n,                  // cliques humanos no período
      clickers: hum.p,                 // pessoas distintas (hash de IP)
      bots,                            // cliques de bot filtrados
      taxa_bot: (hum.n + bots) ? Math.round(bots / (hum.n + bots) * 100) : 0,
      coins: coinsCliques,
      coins_marcos: coinsMarcos,
      primeiro: hum.pri || null,
      ultimo: hum.ult || null,
    };

    // ── Séries temporais (no fuso do cliente) ────────────────────────────────
    const porDia = all(`SELECT CAST(((c.ts - ?)/86400000) AS INTEGER) AS dia, COUNT(*) AS n
                        ${CLICKS} AND c.bot=0 ${F.sql} GROUP BY dia ORDER BY dia ASC`,
                       P.off, ...cp)
                   .map(r => ({ dia: r.dia * DAY_MS + P.off, n: r.n }));

    const horaRaw = all(`SELECT CAST((((c.ts - ?)/3600000) % 24) AS INTEGER) AS hora, COUNT(*) AS n
                         ${CLICKS} AND c.bot=0 ${F.sql} GROUP BY hora`, P.off, ...cp);
    const porHora = Array.from({ length: 24 }, (_, h) => ({ hora: h, n: 0 }));
    horaRaw.forEach(r => { if (r.hora >= 0 && r.hora < 24) porHora[r.hora].n = r.n; });

    // Dia da semana (0=domingo, como o getDay do JS). +4 porque a época
    // (01/01/1970) caiu numa quinta-feira.
    const dowRaw = all(`SELECT CAST(((((c.ts - ?)/86400000) + 4) % 7) AS INTEGER) AS dow, COUNT(*) AS n
                        ${CLICKS} AND c.bot=0 ${F.sql} GROUP BY dow`, P.off, ...cp);
    const porDiaSemana = Array.from({ length: 7 }, (_, d) => ({ dow: d, n: 0 }));
    dowRaw.forEach(r => { if (r.dow >= 0 && r.dow < 7) porDiaSemana[r.dow].n = r.n; });

    // ── Agregações (2 queries por dimensão + merge em JS: sem N+1) ───────────
    const mergeBy = (base, stats, key) => {
      const m = new Map(stats.map(s => [s[key], s]));
      return base.map(b => Object.assign({ cliques: 0, pessoas: 0, ultimo: null, primeiro: null },
                                          m.get(b[key]) || {}, b));
    };

    const usuariosBase = all(`
      SELECT l.email AS email, COUNT(DISTINCT l.token) AS links,
             MAX(l.created_at) AS ultimo_link,
             (SELECT u.name FROM users u WHERE u.email=l.email) AS nome,
             (SELECT u.role FROM users u WHERE u.email=l.email) AS role
      FROM utm_links l WHERE 1=1 ${F.sql} GROUP BY l.email`, ...F.params);
    const usuariosStats = all(`
      SELECT l.email AS email, COUNT(*) AS cliques, COUNT(DISTINCT c.ip_hash) AS pessoas,
             MAX(c.ts) AS ultimo, MIN(c.ts) AS primeiro
      ${CLICKS} AND c.bot=0 ${F.sql} GROUP BY l.email`, ...cp);
    const por_usuario = mergeBy(usuariosBase, usuariosStats, 'email')
      .map(u => Object.assign(u, { coins: coinsPorEmail.get(u.email) || 0 }))
      .sort((a, b) => b.cliques - a.cliques || b.links - a.links)
      .slice(0, 500);

    const campBase = all(`
      SELECT l.campaign AS campaign, COUNT(DISTINCT l.token) AS links,
             MIN(l.created_at) AS criada_em
      FROM utm_links l WHERE 1=1 ${F.sql} GROUP BY l.campaign`, ...F.params);
    const campStats = all(`
      SELECT l.campaign AS campaign, COUNT(*) AS cliques, COUNT(DISTINCT c.ip_hash) AS pessoas,
             MAX(c.ts) AS ultimo, MIN(c.ts) AS primeiro
      ${CLICKS} AND c.bot=0 ${F.sql} GROUP BY l.campaign`, ...cp);
    const por_campanha = mergeBy(campBase, campStats, 'campaign')
      .sort((a, b) => b.cliques - a.cliques || b.links - a.links).slice(0, 200);

    const origemBase = all(`
      SELECT l.source AS source, COUNT(DISTINCT l.token) AS links
      FROM utm_links l WHERE 1=1 ${F.sql} GROUP BY l.source`, ...F.params);
    const origemStats = all(`
      SELECT l.source AS source, COUNT(*) AS cliques, COUNT(DISTINCT c.ip_hash) AS pessoas,
             MAX(c.ts) AS ultimo
      ${CLICKS} AND c.bot=0 ${F.sql} GROUP BY l.source`, ...cp);
    const por_origem = mergeBy(origemBase, origemStats, 'source')
      .sort((a, b) => b.cliques - a.cliques);

    // ── Links (com data de criação e último clique) ──────────────────────────
    const linksBase = all(`
      SELECT l.token, l.email, l.campaign, l.source, l.medium, l.dest, l.created_at
      FROM utm_links l WHERE 1=1 ${F.sql} ORDER BY l.created_at DESC LIMIT 500`, ...F.params);
    const perTokenPeriodo = new Map(all(`
      SELECT c.token,
             SUM(CASE WHEN c.bot=0 THEN 1 ELSE 0 END) AS cliques,
             SUM(CASE WHEN c.bot=1 THEN 1 ELSE 0 END) AS bots,
             MAX(CASE WHEN c.bot=0 THEN c.ts END) AS ultimo
      FROM utm_clicks c WHERE c.ts>=? AND c.ts<=? GROUP BY c.token`, P.inicio, P.fim)
      .map(r => [r.token, r]));
    const perTokenTotal = new Map(all(`
      SELECT token, SUM(CASE WHEN bot=0 THEN 1 ELSE 0 END) AS total, MAX(ts) AS ultimo_geral
      FROM utm_clicks GROUP BY token`).map(r => [r.token, r]));
    const links = linksBase.map(l => {
      const p = perTokenPeriodo.get(l.token) || {}, t = perTokenTotal.get(l.token) || {};
      return Object.assign({}, l, {
        cliques: p.cliques || 0, bots: p.bots || 0,
        ultimo: p.ultimo || null,
        cliques_total: t.total || 0, ultimo_geral: t.ultimo_geral || null,
      });
    }).sort((a, b) => b.cliques - a.cliques || (b.ultimo || 0) - (a.ultimo || 0));

    // ── Cliques recentes (paginado, com data/hora completa e dispositivo) ────
    const limit = Math.max(10, Math.min(500, parseInt(req.query.limit, 10) || 100));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const botSql = incluiBots ? '' : ' AND c.bot=0';
    const recenteTotal = one(`SELECT COUNT(*) n ${CLICKS} ${botSql} ${F.sql}`, ...cp).n;
    const recente = all(`
      SELECT c.ts, c.token, c.ref, c.bot, c.ua, l.email, l.campaign, l.source, l.dest
      ${CLICKS} ${botSql} ${F.sql} ORDER BY c.ts DESC LIMIT ? OFFSET ?`,
      ...cp, limit, offset)
      .map(r => ({
        ts: r.ts, token: r.token, ref: r.ref, bot: r.bot,
        email: r.email, campaign: r.campaign, source: r.source, dest: r.dest,
        device: deviceOf(r.ua, r.bot),
      }));

    // ── Opções dos filtros (sempre o universo completo, não o filtrado) ──────
    const filtros = {
      usuarios:  all(`SELECT l.email AS email, COUNT(*) AS links,
                             (SELECT u.name FROM users u WHERE u.email=l.email) AS nome
                      FROM utm_links l GROUP BY l.email ORDER BY links DESC`),
      campanhas: all(`SELECT campaign, COUNT(*) AS links FROM utm_links
                      GROUP BY campaign ORDER BY links DESC LIMIT 200`),
      origens:   all(`SELECT source, COUNT(*) AS links FROM utm_links
                      GROUP BY source ORDER BY links DESC`),
    };

    res.json({
      escopo: 'time-marketing', click_coins: UTM_CLICK_COINS,
      gerado_em: Date.now(),
      periodo: { inicio: P.inicio, fim: P.fim, dias: P.dias, custom: P.custom,
                 de: P.de || null, ate: P.ate || null, days: P.days || null, tzoff_min: P.off / 60000 },
      filtros_ativos: F.ativos, inclui_bots: incluiBots,
      aviso_gap: gapOverlap(P.inicio, P.fim), // null quando o período não cruza a janela cega
      summary, porDia, porHora, porDiaSemana,
      por_usuario, por_campanha, por_origem, links,
      recente, recente_total: recenteTotal, recente_limit: limit, recente_offset: offset,
      filtros,
      // compat: o campo antigo `days` seguia sendo lido por integrações externas
      days: P.dias,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Detalhe de UM link (drill-down: todos os cliques com data/hora) ───────────
router.get('/api/admin/utm/link/:token', requireMkt, (req, res) => {
  try {
    const token = sanitizeSlug(req.params.token, 24);
    const link = db.prepare(`SELECT * FROM utm_links WHERE token=?`).get(token);
    if (!link) return res.status(404).json({ error: 'nao_encontrado' });
    const off = tzOffMs(req.query);
    const one = (sql, ...a) => db.prepare(sql).get(...a);
    const all = (sql, ...a) => db.prepare(sql).all(...a);

    const r = one(`SELECT
        SUM(CASE WHEN bot=0 THEN 1 ELSE 0 END) AS humanos,
        SUM(CASE WHEN bot=1 THEN 1 ELSE 0 END) AS bots,
        COUNT(DISTINCT CASE WHEN bot=0 THEN ip_hash END) AS pessoas,
        MIN(CASE WHEN bot=0 THEN ts END) AS primeiro,
        MAX(CASE WHEN bot=0 THEN ts END) AS ultimo
      FROM utm_clicks WHERE token=?`, token);

    const porDia = all(`SELECT CAST(((ts - ?)/86400000) AS INTEGER) AS dia, COUNT(*) AS n
                        FROM utm_clicks WHERE token=? AND bot=0 GROUP BY dia ORDER BY dia ASC`, off, token)
                   .map(x => ({ dia: x.dia * DAY_MS + off, n: x.n }));

    const cliques = all(`SELECT ts, ref, ua, bot FROM utm_clicks WHERE token=?
                         ORDER BY ts DESC LIMIT 500`, token)
      .map(c => ({ ts: c.ts, ref: c.ref, bot: c.bot, device: deviceOf(c.ua, c.bot) }));

    let coins = 0;
    try {
      coins = all(`SELECT ref, coins, evento FROM erp_coins WHERE evento IN ('utm_click','marco')`)
        .filter(x => (x.evento === 'utm_click' ? String(x.ref).split(':')[0] : String(x.ref).split(':')[1]) === token)
        .reduce((a, x) => a + (x.coins || 0), 0);
    } catch (e) {}

    res.json({
      link: {
        token: link.token, email: link.email, campaign: link.campaign, source: link.source,
        medium: link.medium, dest: link.dest, created_at: link.created_at,
        destino_final: appendUtm(link.dest, { source: link.source, medium: link.medium, campaign: link.campaign, content: token }),
      },
      resumo: {
        humanos: r.humanos || 0, bots: r.bots || 0, pessoas: r.pessoas || 0,
        primeiro: r.primeiro || null, ultimo: r.ultimo || null, coins,
      },
      porDia, cliques,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Export CSV (time de Marketing) — respeita período e filtros ──────────────
router.get('/api/admin/utm/export.csv', requireMkt, (req, res) => {
  try {
    const P = resolvePeriodo(req.query);
    const F = linkFilters(req.query);
    const modo = String(req.query.modo || 'links') === 'cliques' ? 'cliques' : 'links';
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    // Data/hora legível no fuso de quem exportou (não em UTC cru).
    const dt = (ts) => ts ? new Date(+ts - P.off).toISOString().slice(0, 19).replace('T', ' ') : '';
    let head, rows;

    if (modo === 'cliques') {
      head = 'quando,token,autor,campanha,origem,dispositivo,bot,referer,destino';
      rows = db.prepare(`
        SELECT c.ts, c.token, c.ref, c.ua, c.bot, l.email, l.campaign, l.source, l.dest
        FROM utm_clicks c JOIN utm_links l ON l.token=c.token
        WHERE c.ts>=? AND c.ts<=? ${F.sql} ORDER BY c.ts DESC LIMIT 20000`)
        .all(P.inicio, P.fim, ...F.params)
        .map(r => [dt(r.ts), r.token, r.email, r.campaign, r.source,
                   deviceOf(r.ua, r.bot), r.bot ? 'sim' : 'nao', r.ref, r.dest].map(q).join(','));
    } else {
      head = 'token,autor,campanha,origem,medium,destino,criado_em,cliques_periodo,bots_periodo,cliques_total,ultimo_clique';
      rows = db.prepare(`
        SELECT l.token, l.email, l.campaign, l.source, l.medium, l.dest, l.created_at,
               (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.bot=0 AND c.ts>=? AND c.ts<=?) AS cliques,
               (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.bot=1 AND c.ts>=? AND c.ts<=?) AS bots,
               (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.bot=0) AS total,
               (SELECT MAX(ts) FROM utm_clicks c WHERE c.token=l.token AND c.bot=0) AS ultimo
        FROM utm_links l WHERE 1=1 ${F.sql} ORDER BY cliques DESC`)
        .all(P.inicio, P.fim, P.inicio, P.fim, ...F.params)
        .map(r => [r.token, r.email, r.campaign, r.source, r.medium, r.dest, r.created_at,
                   r.cliques, r.bots, r.total, dt(r.ultimo)].map(q).join(','));
    }

    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="utm-${modo}-${P.dias}d.csv"`);
    res.send('﻿' + [head].concat(rows).join('\n')); // BOM p/ Excel abrir acentos certo
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/utm', requireMkt, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-utm.html'));
});

// Página self-service "Meus Links" (qualquer usuário logado; enforcement cuida do login).
router.get('/meus-links', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/meus-links.html'));
});

module.exports = router;
module.exports.OWNER_EMAIL = OWNER_EMAIL;
