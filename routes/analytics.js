// ════════════════════════════════════════════════════════════════════════════
// routes/analytics.js — Analytics de uso da plataforma (Módulo 17)
// Mede: QUEM acessou (email SSO), QUE páginas, QUANDO e QUANTO TEMPO ficaram.
//  - Navegação de página: logada server-side (middleware logPageView) → cobre
//    TODAS as páginas, com ou sem JS no cliente.
//  - Tempo na página: enviado pelo cliente (office-nav.js) via sendBeacon no
//    pagehide/visibilitychange → evento kind='dur' com dur_ms.
// Report em /admin/analytics — acesso restrito ao dono (ruda.costa@epiuse.com.br).
// Persiste no SQLite (volume Railway /data) como o resto das tabelas.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const { db, requireEditorToken } = require('../server-context');

const OWNER_EMAIL = (process.env.ANALYTICS_OWNER_EMAIL || 'ruda.costa@epiuse.com.br').toLowerCase();

db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    sid    TEXT,                 -- id da sessão (agrupa a visita)
    email  TEXT,                 -- email SSO ou 'anon'
    path   TEXT,                 -- rota da página
    kind   TEXT,                 -- 'view' (navegação) | 'dur' (tempo na página)
    dur_ms INTEGER DEFAULT 0,    -- tempo ativo na página (só kind='dur')
    ua     TEXT,                 -- user-agent (resumido)
    ts     INTEGER               -- epoch ms
  );
  CREATE INDEX IF NOT EXISTS idx_an_ts    ON analytics_events(ts);
  CREATE INDEX IF NOT EXISTS idx_an_email ON analytics_events(email);
  CREATE INDEX IF NOT EXISTS idx_an_kind  ON analytics_events(kind);
`);

const _insEvent = db.prepare(
  `INSERT INTO analytics_events (sid, email, path, kind, dur_ms, ua, ts) VALUES (?,?,?,?,?,?,?)`
);

// Só rotas de PÁGINA entram no analytics (não assets, api, auth).
function isTrackablePath(p) {
  if (!p || p.length > 200) return false;
  if (p.startsWith('/api/') || p.startsWith('/auth/')) return false;
  if (/\.(css|js|mjs|png|jpe?g|svg|webp|gif|ico|woff2?|ttf|eot|map|json|mp4|webm|mp3|pdf|xml|txt|zip|csv|xlsx?)$/i.test(p)) return false;
  return true;
}

function sessionEmail(req) {
  const e = req.session && req.session.user && req.session.user.email;
  return e ? String(e).toLowerCase() : 'anon';
}
function shortSid(req) { return String(req.sessionID || '').slice(0, 40); }

// ── Middleware: loga navegação de página (montar após session/enforce/hub-lock)
function logPageView(req, res, next) {
  try {
    if (req.method === 'GET' &&
        isTrackablePath(req.path) &&
        String(req.headers['accept'] || '').includes('text/html')) {
      _insEvent.run(
        shortSid(req), sessionEmail(req), req.path.slice(0, 200), 'view', 0,
        String(req.headers['user-agent'] || '').slice(0, 200), Date.now()
      );
    }
  } catch (e) { /* analytics nunca quebra a request */ }
  next();
}

// ── Beacon do cliente: tempo na página ────────────────────────────────────────
// Body: { path, dur_ms }. Aceita sessão anônima; email vem da sessão (não do body).
router.post('/api/analytics/track', express.json({ limit: '2kb' }), (req, res) => {
  try {
    const b = req.body || {};
    let p = String(b.path || '/').slice(0, 200);
    if (!isTrackablePath(p)) return res.json({ ok: false });
    const dur = Math.max(0, Math.min(6 * 60 * 60 * 1000, parseInt(b.dur_ms, 10) || 0)); // cap 6h
    if (dur < 1000) return res.json({ ok: false }); // ignora < 1s (ruído)
    _insEvent.run(
      shortSid(req), sessionEmail(req), p, 'dur', dur,
      String(req.headers['user-agent'] || '').slice(0, 200), Date.now()
    );
    res.json({ ok: true });
  } catch (e) { res.status(200).json({ ok: false }); }
});

// ── Gate do dono ──────────────────────────────────────────────────────────────
// Apenas o dono (ruda.costa@epiuse.com.br). Fallback por editor token p/ export
// programático/local (token é segredo, não é conta de usuário).
function requireOwner(req, res, next) {
  if (sessionEmail(req) === OWNER_EMAIL) return next();
  const t = req.query.token || req.headers['x-editor-token'];
  if (t) return requireEditorToken(req, res, next);
  if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'forbidden' });
  return res.status(403).send('Acesso restrito.');
}

// ── API do report ─────────────────────────────────────────────────────────────
router.get('/api/admin/analytics', requireOwner, (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
    const since = Date.now() - days * 86400000;

    const summary = {
      usuarios: db.prepare(`SELECT COUNT(DISTINCT email) n FROM analytics_events WHERE kind='view' AND ts>=? AND email!='anon'`).get(since).n,
      sessoes:  db.prepare(`SELECT COUNT(DISTINCT sid) n FROM analytics_events WHERE kind='view' AND ts>=?`).get(since).n,
      visitas:  db.prepare(`SELECT COUNT(*) n FROM analytics_events WHERE kind='view' AND ts>=?`).get(since).n,
      tempo_ms: db.prepare(`SELECT COALESCE(SUM(dur_ms),0) n FROM analytics_events WHERE kind='dur' AND ts>=?`).get(since).n,
      anon:     db.prepare(`SELECT COUNT(*) n FROM analytics_events WHERE kind='view' AND ts>=? AND email='anon'`).get(since).n,
    };

    const usuarios = db.prepare(`
      SELECT v.email AS email,
             COUNT(*) AS visitas,
             COUNT(DISTINCT v.sid) AS sessoes,
             COUNT(DISTINCT v.path) AS paginas,
             MAX(v.ts) AS ultimo,
             MIN(v.ts) AS primeiro,
             (SELECT COALESCE(SUM(dur_ms),0) FROM analytics_events d
                WHERE d.kind='dur' AND d.email=v.email AND d.ts>=?) AS tempo_ms,
             (SELECT u.name FROM users u WHERE u.email=v.email) AS nome,
             (SELECT u.role FROM users u WHERE u.email=v.email) AS role,
             (SELECT COALESCE(SUM(c.coins),0) FROM erp_coins c WHERE c.email=v.email) AS coins
      FROM analytics_events v
      WHERE v.kind='view' AND v.ts>=? AND v.email!='anon'
      GROUP BY v.email
      ORDER BY ultimo DESC
      LIMIT 500
    `).all(since, since);

    const paginas = db.prepare(`
      SELECT v.path AS path,
             COUNT(*) AS visitas,
             COUNT(DISTINCT v.email) AS usuarios,
             (SELECT COALESCE(AVG(dur_ms),0) FROM analytics_events d
                WHERE d.kind='dur' AND d.path=v.path AND d.ts>=? AND d.dur_ms>0) AS media_ms
      FROM analytics_events v
      WHERE v.kind='view' AND v.ts>=?
      GROUP BY v.path
      ORDER BY visitas DESC
      LIMIT 100
    `).all(since, since);

    const recente = db.prepare(`
      SELECT email, path, ts FROM analytics_events
      WHERE kind='view' AND ts>=?
      ORDER BY ts DESC LIMIT 200
    `).all(since);

    // Série diária de visitas (p/ mini-gráfico)
    const porDiaRaw = db.prepare(`
      SELECT CAST((ts/86400000) AS INTEGER) AS dia, COUNT(*) AS n
      FROM analytics_events WHERE kind='view' AND ts>=?
      GROUP BY dia ORDER BY dia ASC
    `).all(since);
    const porDia = porDiaRaw.map(r => ({ dia: r.dia * 86400000, n: r.n }));

    res.json({ days, owner: OWNER_EMAIL, summary, usuarios, paginas, recente, porDia });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Detalhe de UM usuário (drill-down) ────────────────────────────────────────
router.get('/api/admin/analytics/user', requireOwner, (req, res) => {
  try {
    const email = String(req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'email_obrigatorio' });
    const days = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
    const since = Date.now() - days * 86400000;

    let meta = null;
    try { meta = db.prepare(`SELECT email, name, role, persona, active, created_at FROM users WHERE email=?`).get(email); } catch (e) {}
    meta = meta || { email, name: '', role: null, persona: null, active: null, created_at: null };

    const one = (sql, ...args) => db.prepare(sql).get(...args).n;
    const resumo = {
      visitas:  one(`SELECT COUNT(*) n FROM analytics_events WHERE kind='view' AND email=? AND ts>=?`, email, since),
      sessoes:  one(`SELECT COUNT(DISTINCT sid) n FROM analytics_events WHERE kind='view' AND email=? AND ts>=?`, email, since),
      paginas:  one(`SELECT COUNT(DISTINCT path) n FROM analytics_events WHERE kind='view' AND email=? AND ts>=?`, email, since),
      tempo_ms: one(`SELECT COALESCE(SUM(dur_ms),0) n FROM analytics_events WHERE kind='dur' AND email=? AND ts>=?`, email, since),
      primeiro: one(`SELECT COALESCE(MIN(ts),0) n FROM analytics_events WHERE email=? AND ts>=?`, email, since),
      ultimo:   one(`SELECT COALESCE(MAX(ts),0) n FROM analytics_events WHERE email=? AND ts>=?`, email, since),
    };

    const paginas = db.prepare(`
      SELECT v.path AS path, COUNT(*) AS visitas,
             (SELECT COALESCE(SUM(dur_ms),0) FROM analytics_events d
                WHERE d.kind='dur' AND d.email=? AND d.path=v.path AND d.ts>=?) AS tempo_ms,
             MAX(v.ts) AS ultimo
      FROM analytics_events v
      WHERE v.kind='view' AND v.email=? AND v.ts>=?
      GROUP BY v.path ORDER BY visitas DESC LIMIT 200
    `).all(email, since, email, since);

    // Tempo ativo por sessão (1 query) → mapa sid -> ms
    const durBySid = {};
    db.prepare(`SELECT sid, COALESCE(SUM(dur_ms),0) t FROM analytics_events
                WHERE kind='dur' AND email=? AND ts>=? GROUP BY sid`).all(email, since)
      .forEach(r => { durBySid[r.sid] = r.t; });

    const sessoes = db.prepare(`
      SELECT sid, MIN(ts) AS inicio, MAX(ts) AS fim, COUNT(*) AS visitas
      FROM analytics_events
      WHERE kind='view' AND email=? AND ts>=?
      GROUP BY sid ORDER BY inicio DESC LIMIT 100
    `).all(email, since).map(s => ({
      inicio: s.inicio, fim: s.fim, visitas: s.visitas,
      span_ms: Math.max(0, s.fim - s.inicio),
      tempo_ms: durBySid[s.sid] || 0,
    }));

    const timeline = db.prepare(`
      SELECT path, ts FROM analytics_events
      WHERE kind='view' AND email=? AND ts>=? ORDER BY ts DESC LIMIT 300
    `).all(email, since);

    // Conquistas & ERP Coins (lifetime — não filtra por período).
    let coins = [], coins_total = 0;
    try {
      coins = db.prepare(`SELECT evento, ref, coins, dia, created_at
                          FROM erp_coins WHERE email=? ORDER BY id DESC`).all(email);
      coins_total = coins.reduce((a, r) => a + (r.coins || 0), 0);
    } catch (e) { /* tabela pode não existir em ambiente isolado */ }

    res.json({ email, meta, days, resumo, paginas, sessoes, timeline, coins, coins_total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Página do report
router.get('/admin/analytics', requireOwner, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-analytics.html'));
});

module.exports = router;
module.exports.logPageView = logPageView;
module.exports.OWNER_EMAIL = OWNER_EMAIL;
