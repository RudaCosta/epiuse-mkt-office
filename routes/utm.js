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
function sanitizeSlug(s, max) { return String(s || '').replace(/[^a-z0-9._-]/gi, '').slice(0, max || 60); }

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
// Idempotente por (email, campaign, source): o mesmo usuário reusa o token.
router.post('/api/utm/link', express.json({ limit: '2kb' }), (req, res) => {
  const email = sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const b = req.body || {};
  const dest = String(b.dest || '').trim();
  if (!isHttpUrl(dest)) return res.status(400).json({ error: 'dest_invalido' });
  const campaign = sanitizeSlug(b.campaign, 60) || 'geral';
  const source = sanitizeSlug(b.source, 30) || 'linkedin';
  const medium = sanitizeSlug(b.medium, 30) || 'employee_advocacy';
  try {
    let row = db.prepare(`SELECT token, dest FROM utm_links WHERE email=? AND campaign=? AND source=?`)
                .get(email, campaign, source);
    let token;
    if (row) {
      token = row.token;
      if (row.dest !== dest) db.prepare(`UPDATE utm_links SET dest=? WHERE token=?`).run(dest, token);
    } else {
      token = newToken();
      db.prepare(`INSERT INTO utm_links (token, email, campaign, source, medium, dest) VALUES (?,?,?,?,?,?)`)
        .run(token, email, campaign, source, medium, dest);
    }
    const url = baseUrl(req) + '/go/' + token;
    res.json({ token, url, dest: appendUtm(dest, { source, medium, campaign, content: token }) });
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
  try {
    db.prepare(`INSERT INTO utm_clicks (token, ts, ref, ua, ip_hash) VALUES (?,?,?,?,?)`)
      .run(token, now, String(req.headers['referer'] || '').slice(0, 200),
           String(req.headers['user-agent'] || '').slice(0, 200), iph);
    // Coins pro autor: 1 crédito por clicker único / link / dia (anti-farm via
    // UNIQUE(email,evento,ref,dia) do erp_coins; ref = token:hash-do-clicker).
    db.prepare(`INSERT OR IGNORE INTO erp_coins (email, evento, ref, coins) VALUES (?,?,?,?)`)
      .run(link.email, 'utm_click', (token + ':' + iph).slice(0, 60), UTM_CLICK_COINS);
  } catch (e) { console.warn('[utm] click', e.message); }

  const target = appendUtm(link.dest, {
    source: link.source, medium: link.medium, campaign: link.campaign, content: token,
  });
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
      cliques:  one(`SELECT COUNT(*) n FROM utm_clicks WHERE ts>=?`, since),
      clickers: one(`SELECT COUNT(DISTINCT ip_hash) n FROM utm_clicks WHERE ts>=?`, since),
      coins:    one(`SELECT COALESCE(SUM(coins),0) n FROM erp_coins WHERE evento='utm_click'`),
    };

    const por_usuario = db.prepare(`
      SELECT l.email AS email,
             COUNT(DISTINCT l.token) AS links,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token IN
                (SELECT token FROM utm_links WHERE email=l.email) AND c.ts>=?) AS cliques,
             (SELECT COALESCE(SUM(coins),0) FROM erp_coins e WHERE e.email=l.email AND e.evento='utm_click') AS coins,
             (SELECT u.name FROM users u WHERE u.email=l.email) AS nome,
             (SELECT u.role FROM users u WHERE u.email=l.email) AS role
      FROM utm_links l GROUP BY l.email ORDER BY cliques DESC LIMIT 500
    `).all(since);

    const por_campanha = db.prepare(`
      SELECT l.campaign AS campaign,
             COUNT(DISTINCT l.token) AS links,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token IN
                (SELECT token FROM utm_links WHERE campaign=l.campaign) AND c.ts>=?) AS cliques
      FROM utm_links l GROUP BY l.campaign ORDER BY cliques DESC LIMIT 100
    `).all(since);

    const links = db.prepare(`
      SELECT l.token, l.email, l.campaign, l.source, l.dest, l.created_at,
             (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.ts>=?) AS cliques
      FROM utm_links l ORDER BY cliques DESC LIMIT 200
    `).all(since);

    const recente = db.prepare(`
      SELECT c.ts, c.token, c.ref, l.email, l.campaign
      FROM utm_clicks c LEFT JOIN utm_links l ON l.token=c.token
      WHERE c.ts>=? ORDER BY c.ts DESC LIMIT 200
    `).all(since);

    res.json({ days, escopo: 'time-marketing', click_coins: UTM_CLICK_COINS, summary, por_usuario, por_campanha, links, recente });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/utm', requireMkt, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-utm.html'));
});

module.exports = router;
module.exports.OWNER_EMAIL = OWNER_EMAIL;
