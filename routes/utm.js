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
const BOT_UA_RE = /bot|crawl|spider|linkedin|whatsapp|facebookexternalhit|facebot|telegram|slack|twitter|discord|skypeuripreview|preview|pinterest|curl|wget|python|axios|node-fetch|go-http|headless|lighthouse|monitor|uptime/i;
function isBotUA(ua) { return BOT_UA_RE.test(String(ua || '')) || !String(ua || '').trim(); }

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
    res.json({ email, base: baseUrl(req) + '/go/', click_coins: UTM_CLICK_COINS, totais, links });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Redirect rastreado — loga o clique, credita coins e manda pro destino ──────
router.get('/go/:token', (req, res) => {
  const token = sanitizeSlug(req.params.token, 24);
  let link = null;
  try { link = db.prepare(`SELECT * FROM utm_links WHERE token=?`).get(token); } catch (e) {}
  if (!link) return res.redirect('/'); // token desconhecido → home

  const now = Date.now();
  const iph = ipHash(req);
  const ua = String(req.headers['user-agent'] || '').slice(0, 200);
  const bot = isBotUA(ua) ? 1 : 0;
  try {
    // HEAD de scrapers não conta; GET conta (bot marcado, humano credita coins).
    if (req.method === 'GET') {
      db.prepare(`INSERT INTO utm_clicks (token, ts, ref, ua, ip_hash, bot) VALUES (?,?,?,?,?,?)`)
        .run(token, now, String(req.headers['referer'] || '').slice(0, 200), ua, iph, bot);
      // Coins pro autor (SÓ clique humano): 1 crédito por clicker único / link /
      // dia (anti-farm via UNIQUE(email,evento,ref,dia); ref = token:hash-do-clicker).
      if (!bot) {
        db.prepare(`INSERT OR IGNORE INTO erp_coins (email, evento, ref, coins) VALUES (?,?,?,?)`)
          .run(link.email, 'utm_click', (token + ':' + iph).slice(0, 60), UTM_CLICK_COINS);
      }
    }
  } catch (e) { console.warn('[utm] click', e.message); }

  const target = appendUtm(link.dest, {
    source: link.source, medium: link.medium, campaign: link.campaign, content: token,
  });
  res.set('Cache-Control', 'no-store'); // proxy/CDN não pode "engolir" cliques
  res.redirect(302, target);
});

// ── Report (dono) ─────────────────────────────────────────────────────────────
router.get('/api/admin/utm', requireMkt, (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
    const since = Date.now() - days * 86400000;
    const one = (sql, ...a) => db.prepare(sql).get(...a).n;

    const summary = {
      links:    one(`SELECT COUNT(*) n FROM utm_links`),
      cliques:  one(`SELECT COUNT(*) n FROM utm_clicks WHERE ts>=? AND bot=0`, since),
      clickers: one(`SELECT COUNT(DISTINCT ip_hash) n FROM utm_clicks WHERE ts>=? AND bot=0`, since),
      bots:     one(`SELECT COUNT(*) n FROM utm_clicks WHERE ts>=? AND bot=1`, since),
      coins:    one(`SELECT COALESCE(SUM(coins),0) n FROM erp_coins WHERE evento='utm_click'`),
    };

    const por_usuario = db.prepare(`
      SELECT l.email AS email,
             COUNT(DISTINCT l.token) AS links,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token IN
                (SELECT token FROM utm_links WHERE email=l.email) AND c.ts>=? AND c.bot=0) AS cliques,
             (SELECT COALESCE(SUM(coins),0) FROM erp_coins e WHERE e.email=l.email AND e.evento='utm_click') AS coins,
             (SELECT u.name FROM users u WHERE u.email=l.email) AS nome,
             (SELECT u.role FROM users u WHERE u.email=l.email) AS role
      FROM utm_links l GROUP BY l.email ORDER BY cliques DESC LIMIT 500
    `).all(since);

    const por_campanha = db.prepare(`
      SELECT l.campaign AS campaign,
             COUNT(DISTINCT l.token) AS links,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token IN
                (SELECT token FROM utm_links WHERE campaign=l.campaign) AND c.ts>=? AND c.bot=0) AS cliques
      FROM utm_links l GROUP BY l.campaign ORDER BY cliques DESC LIMIT 100
    `).all(since);

    const links = db.prepare(`
      SELECT l.token, l.email, l.campaign, l.source, l.dest, l.created_at,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.ts>=? AND c.bot=0) AS cliques,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.ts>=? AND c.bot=1) AS bots
      FROM utm_links l ORDER BY cliques DESC LIMIT 200
    `).all(since, since);

    const recente = db.prepare(`
      SELECT c.ts, c.token, c.ref, c.bot, l.email, l.campaign
      FROM utm_clicks c LEFT JOIN utm_links l ON l.token=c.token
      WHERE c.ts>=? ORDER BY c.ts DESC LIMIT 200
    `).all(since);

    // Série diária de cliques humanos (p/ sparkline — mesmo formato do analytics).
    const porDia = db.prepare(`
      SELECT CAST((ts/86400000) AS INTEGER) AS dia, COUNT(*) AS n
      FROM utm_clicks WHERE ts>=? AND bot=0 GROUP BY dia ORDER BY dia ASC
    `).all(since).map(r => ({ dia: r.dia * 86400000, n: r.n }));

    res.json({ days, escopo: 'time-marketing', click_coins: UTM_CLICK_COINS, summary, por_usuario, por_campanha, links, recente, porDia });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Export CSV (time de Marketing) ────────────────────────────────────────────
router.get('/api/admin/utm/export.csv', requireMkt, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT l.token, l.email, l.campaign, l.source, l.medium, l.dest, l.created_at,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.bot=0) AS cliques,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.bot=1) AS bots
      FROM utm_links l ORDER BY cliques DESC
    `).all();
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = ['token,autor,campanha,origem,medium,destino,criado_em,cliques,bots']
      .concat(rows.map(r => [r.token, r.email, r.campaign, r.source, r.medium, r.dest, r.created_at, r.cliques, r.bots].map(q).join(',')))
      .join('\n');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="utm-links.csv"');
    res.send('﻿' + csv); // BOM p/ Excel abrir acentos certo
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
