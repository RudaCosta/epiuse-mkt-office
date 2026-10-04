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

// ── Passos do Onboarding (Módulo 26) ─────────────────────────────────────────
// Mesmo beacon e mesma tabela: kind='onb', path='/onboarding' e o passo em
// `meta` (ex.: 'e2.slide.3/9', 'e2.quiz.q1.ok', 'e2.quiz.result.4/4.pass',
// 'kit.acc.rd.on', 'cert.download'). Coluna adicionada sem perder dados.
try {
  const cols = db.prepare(`PRAGMA table_info(analytics_events)`).all().map(c => c.name);
  if (!cols.includes('meta')) db.exec(`ALTER TABLE analytics_events ADD COLUMN meta TEXT`);
} catch (e) { console.warn('[analytics] coluna meta:', e.message); }
const _insOnb = db.prepare(
  `INSERT INTO analytics_events (sid, email, path, kind, dur_ms, ua, ts, meta) VALUES (?,?,'/onboarding','onb',0,?,?,?)`
);
const ONB_STEP = /^[a-z0-9]+(?:\.[a-z0-9\/_-]+){0,5}$/;

// ── Áreas com "quem viu o quê" (Módulos 27 Intelligence · 28 Eventos · 29 Pipeline · 30 Brand) ──
// Mesmo beacon: kind=<chave da área>, path=<página> e o passo em `meta`.
// Passos: 'sec.<id>' (seção apareceu na tela) · 'tempo.<id>.<seg>' (tempo na
// seção, também em dur_ms) · 'scroll.<25|50|75|100>' · 'tool.<slug>' (abriu
// ferramenta) · demais '<tipo>.<id>' = interações (node/aba/evento/filtro...).
// O "quem abriu a página" já vem do logPageView (kind='view') e o tempo total
// do beacon do office-nav (kind='dur'). Painel: /admin/<area> (só o dono).
const AREA_TRACK = {
  intel:   { path: '/area/intelligence', painel: '/admin/intelligence' },
  eventos: { path: '/area/eventos',      painel: '/admin/eventos' },
  pipeline:{ path: '/area/pipeline',     painel: '/admin/pipeline' },
  brand:   { path: '/area/brand',        painel: '/admin/brand' },
};
const AREA_KINDS = Object.keys(AREA_TRACK);
const AREA_RE = AREA_KINDS.join('|');
const areaPaths = (k) => [AREA_TRACK[k].path, AREA_TRACK[k].path + '/']; // com e sem barra final
const AREA_STEP = /^[a-z]+(?:\.[a-z0-9_-]{1,40}){1,3}$/;
const _insArea = db.prepare(
  `INSERT INTO analytics_events (sid, email, path, kind, dur_ms, ua, ts, meta) VALUES (?,?,?,?,?,?,?,?)`
);

// Resumo por pessoa (lifetime): kit, etapas (telas vistas, quiz), certificado.
function onbResumo() {
  let rows = [];
  try { rows = db.prepare(`SELECT email, meta, ts FROM analytics_events WHERE kind='onb' AND email!='anon' ORDER BY ts ASC, id ASC`).all(); }
  catch (e) { return []; }
  const by = {};
  for (const r of rows) {
    const p = by[r.email] || (by[r.email] = { email: r.email, kit: {}, etapas: {}, cert: {}, passos: 0, primeiro: r.ts, ultimo: r.ts, ultimo_passo: '' });
    p.passos++; p.ultimo = r.ts; p.ultimo_passo = r.meta || '';
    const s = String(r.meta || '').split('.');
    if (s[0] === 'kit' && s[1] === 'acc' && s[2]) p.kit[s[2]] = s[3] === 'on';
    else if (/^e[1-4]$/.test(s[0])) {
      const e = p.etapas[s[0]] || (p.etapas[s[0]] = { telas: 0, total: 0, tentativas: 0, melhor: null, de: 0, aprovado: false });
      if (s[1] === 'slide' && s[2]) { const [i, n] = s[2].split('/').map(Number); if (i > e.telas) e.telas = i; if (n) e.total = n; }
      if (s[1] === 'quiz' && s[2] === 'result' && s[3]) {
        const [sc, n] = s[3].split('/').map(Number); e.tentativas++; e.de = n || e.de;
        if (e.melhor == null || sc > e.melhor) e.melhor = sc; if (s[4] === 'pass') e.aprovado = true;
      }
    } else if (s[0] === 'cert' && s[1]) p.cert[s.slice(1).join('.')] = r.ts;
  }
  const nomeDe = (() => { try { return db.prepare(`SELECT name FROM users WHERE email=?`); } catch (e) { return null; } })();
  const conqDe = (() => { try { return db.prepare(`SELECT ref FROM erp_coins WHERE email=? AND evento='onboarding'`); } catch (e) { return null; } })();
  return Object.values(by).map(p => ({
    ...p,
    kit: Object.values(p.kit).filter(Boolean).length,
    nome: nomeDe ? ((nomeDe.get(p.email) || {}).name || '') : '',
    conquistas: conqDe ? conqDe.all(p.email).map(x => x.ref) : [],
  })).sort((a, b) => b.ultimo - a.ultimo);
}

// ── BACKFILL RETROATIVO (kind='login') ────────────────────────────────────────
// O tracking de páginas só existe a partir do deploy do Módulo 17. Mas quem já
// logou via SSO ANTES disso deixou rastro REAL na tabela users (azure_oid é
// preenchido só no login; created_at = 1º registro, updated_at = última
// atividade). Trazemos essas pessoas pro report como eventos 'login' (acesso
// comprovado) — SEM inventar quais páginas visitaram nem quanto tempo ficaram
// (esse dado nunca existiu). Idempotente: só insere quem ainda não tem 'login'.
try {
  const toMs = (s) => { if (!s) return null; const t = Date.parse(String(s).replace(' ', 'T') + 'Z'); return isNaN(t) ? null : t; };
  const already = new Set(
    db.prepare(`SELECT DISTINCT email FROM analytics_events WHERE kind='login'`).all().map(r => r.email)
  );
  let rows = [];
  try {
    rows = db.prepare(`SELECT email, created_at, updated_at FROM users
                       WHERE azure_oid IS NOT NULL AND azure_oid <> ''`).all();
  } catch (e) { /* tabela users pode não existir em ambiente isolado */ }
  const insLogin = db.prepare(`INSERT INTO analytics_events (sid, email, path, kind, dur_ms, ua, ts) VALUES ('backfill', ?, '(login SSO)', 'login', 0, 'backfill', ?)`);
  const tx = db.transaction(() => {
    let n = 0;
    for (const u of rows) {
      const em = String(u.email || '').toLowerCase();
      if (!em || already.has(em)) continue;
      const first = toMs(u.created_at), last = toMs(u.updated_at);
      if (first) { insLogin.run(em, first); n++; }
      if (last && last !== first) { insLogin.run(em, last); n++; }
    }
    return n;
  });
  const inserted = tx();
  if (inserted) console.log(`[analytics] backfill retroativo: ${inserted} eventos de login inseridos`);
} catch (e) { console.warn('[analytics] backfill:', e.message); }

// Só rotas de PÁGINA entram no analytics (não assets, api, auth).
function isTrackablePath(p) {
  if (!p || p.length > 200) return false;
  if (p.startsWith('/api/') || p.startsWith('/auth/') || p.startsWith('/go/')) return false;
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
    if (AREA_KINDS.includes(b.kind)) { // áreas com tracking (Módulos 27/28) — aceita lote
      const kind = b.kind, pg = AREA_TRACK[kind].path;
      const steps = (Array.isArray(b.steps) ? b.steps : [b.step]).slice(0, 40);
      const sid = shortSid(req), em = sessionEmail(req), now = Date.now();
      const ua = String(req.headers['user-agent'] || '').slice(0, 200);
      let n = 0;
      for (const raw of steps) {
        const step = String(raw || '').slice(0, 80);
        if (!AREA_STEP.test(step)) continue;
        const t = /^tempo\.[a-z0-9_-]+\.(\d{1,5})$/.exec(step); // tempo na seção (s)
        const ms = t ? Math.min(6 * 3600, parseInt(t[1], 10)) * 1000 : 0;
        _insArea.run(sid, em, pg, kind, ms, ua, now, step); n++;
      }
      return res.json({ ok: n > 0, n });
    }
    if (b.kind === 'onb') {   // passo do onboarding (Módulo 26)
      const step = String(b.step || '').slice(0, 60);
      if (!ONB_STEP.test(step)) return res.json({ ok: false });
      _insOnb.run(shortSid(req), sessionEmail(req), String(req.headers['user-agent'] || '').slice(0, 200), Date.now(), step);
      return res.json({ ok: true });
    }
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
      // usuários únicos = quem navegou OU logou (inclui retroativo)
      usuarios: db.prepare(`SELECT COUNT(DISTINCT email) n FROM analytics_events WHERE kind IN ('view','login') AND ts>=? AND email!='anon'`).get(since).n,
      sessoes:  db.prepare(`SELECT COUNT(DISTINCT sid) n FROM analytics_events WHERE kind='view' AND ts>=?`).get(since).n,
      visitas:  db.prepare(`SELECT COUNT(*) n FROM analytics_events WHERE kind='view' AND ts>=?`).get(since).n,
      tempo_ms: db.prepare(`SELECT COALESCE(SUM(dur_ms),0) n FROM analytics_events WHERE kind='dur' AND ts>=?`).get(since).n,
      anon:     db.prepare(`SELECT COUNT(*) n FROM analytics_events WHERE kind='view' AND ts>=? AND email='anon'`).get(since).n,
    };

    // Inclui eventos 'login' (retroativo) pra o usuário APARECER e ter primeiro/
    // último acesso reais; visitas/sessões/páginas contam só navegação ('view').
    const usuarios = db.prepare(`
      SELECT v.email AS email,
             SUM(CASE WHEN v.kind='view' THEN 1 ELSE 0 END) AS visitas,
             COUNT(DISTINCT CASE WHEN v.kind='view' THEN v.sid END) AS sessoes,
             COUNT(DISTINCT CASE WHEN v.kind='view' THEN v.path END) AS paginas,
             MAX(v.ts) AS ultimo,
             MIN(v.ts) AS primeiro,
             (SELECT COALESCE(SUM(dur_ms),0) FROM analytics_events d
                WHERE d.kind='dur' AND d.email=v.email AND d.ts>=?) AS tempo_ms,
             (SELECT u.name FROM users u WHERE u.email=v.email) AS nome,
             (SELECT u.role FROM users u WHERE u.email=v.email) AS role,
             (SELECT COALESCE(SUM(c.coins),0) FROM erp_coins c WHERE c.email=v.email) AS coins
      FROM analytics_events v
      WHERE v.kind IN ('view','login') AND v.ts>=? AND v.email!='anon'
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

    res.json({ days, owner: OWNER_EMAIL, summary, usuarios, paginas, recente, porDia, onboarding: onbResumo() });
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
      WHERE kind IN ('view','login') AND email=? AND ts>=? ORDER BY ts DESC LIMIT 300
    `).all(email, since);

    // Conquistas & ERP Coins (lifetime — não filtra por período).
    let coins = [], coins_total = 0;
    try {
      coins = db.prepare(`SELECT evento, ref, coins, dia, created_at
                          FROM erp_coins WHERE email=? ORDER BY id DESC`).all(email);
      coins_total = coins.reduce((a, r) => a + (r.coins || 0), 0);
    } catch (e) { /* tabela pode não existir em ambiente isolado */ }

    // Onboarding passo a passo (lifetime) — Módulo 26
    let onboarding = [];
    try { onboarding = db.prepare(`SELECT meta, ts FROM analytics_events WHERE kind='onb' AND email=? ORDER BY ts DESC, id DESC LIMIT 400`).all(email); } catch (e) {}

    res.json({ email, meta, days, resumo, paginas, sessoes, timeline, coins, coins_total, onboarding });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Export CSV dos usuários (dono) ────────────────────────────────────────────
router.get('/api/admin/analytics/export.csv', requireOwner, (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
    const since = Date.now() - days * 86400000;
    const rows = db.prepare(`
      SELECT v.email AS email,
             SUM(CASE WHEN v.kind='view' THEN 1 ELSE 0 END) AS visitas,
             COUNT(DISTINCT CASE WHEN v.kind='view' THEN v.sid END) AS sessoes,
             COUNT(DISTINCT CASE WHEN v.kind='view' THEN v.path END) AS paginas,
             MAX(v.ts) AS ultimo, MIN(v.ts) AS primeiro,
             (SELECT COALESCE(SUM(dur_ms),0) FROM analytics_events d WHERE d.kind='dur' AND d.email=v.email AND d.ts>=?) AS tempo_ms,
             (SELECT u.name FROM users u WHERE u.email=v.email) AS nome,
             (SELECT u.role FROM users u WHERE u.email=v.email) AS role,
             (SELECT COALESCE(SUM(c.coins),0) FROM erp_coins c WHERE c.email=v.email) AS coins
      FROM analytics_events v
      WHERE v.kind IN ('view','login') AND v.ts>=? AND v.email!='anon'
      GROUP BY v.email ORDER BY ultimo DESC
    `).all(since, since);
    const iso = (ts) => ts ? new Date(ts).toISOString().slice(0, 16).replace('T', ' ') : '';
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = ['email,nome,area,visitas,sessoes,paginas,tempo_min,coins,primeiro_acesso,ultimo_acesso']
      .concat(rows.map(r => [r.email, r.nome, r.role, r.visitas, r.sessoes, r.paginas,
        Math.round((r.tempo_ms || 0) / 60000), r.coins, iso(r.primeiro), iso(r.ultimo)].map(q).join(',')))
      .join('\n');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="analytics-usuarios-${days}d.csv"`);
    res.send('﻿' + csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADOÇÃO: time cadastrado × quem realmente usa ──────────────────────────────
// Responde "a galera usa o Office?": cruza a tabela `users` (quem está cadastrado)
// com `analytics_events` (quem de fato aparece). Revela quem sumiu, quem nunca
// entrou, e quais features ninguém abre. 100% dado real (regra 7).
const ADOCAO_FEATURES = [
  { path: '/',                label: '🏠 Home' },
  { path: '/hub',            label: '🏢 Marketing Hub' },
  { path: '/campanhas',      label: '📣 Campanhas' },
  { path: '/meus-links',     label: '🔗 Meus Links & QR' },
  { path: '/loja',           label: '🏪 Loja de Coins' },
  { path: '/ranking',        label: '🏆 Ranking' },
  { path: '/voices',         label: '🎙️ Voices' },
  { path: '/cases',          label: '🤝 Cases' },
  { path: '/artigos',        label: '📚 Artigos' },
  { path: '/design',         label: '🎨 Design System' },
  { path: '/brand',          label: '🖼️ Brand Assets' },
  { path: '/optimizer',      label: '🪪 LinkedIn Optimizer' },
  { path: '/game',           label: '🎮 Game (MKT)' },
  { path: '/game-hub',       label: '🎮 Game (Colaborador)' },
  { path: '/jarvis',         label: '🤖 JARVIS' },
  { path: '/area/pipeline',  label: '📞 Biz Dev / Pipeline' },
  { path: '/area/eventos',   label: '📍 Field Marketing & Eventos' },
  { path: '/area/brand',     label: '🎨 Brand Experience / Voices' },
  { path: '/admin/utm',      label: '🔗 UTM & Links (admin)' },
  { path: '/relatorio',      label: '📈 Relatório Mensal' },
];

router.get('/api/admin/analytics/adocao', requireOwner, (req, res) => {
  try {
    const now = Date.now();
    const DAY = 86400000;
    const win = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
    const sinceWin = now - win * DAY;

    // Roster: todo mundo cadastrado e ativo. last_seen = último rastro REAL
    // (view OU login), lifetime — não filtra por período (queremos "há quantos
    // dias essa pessoa não aparece"). visitas_janela = navegação no período.
    let roster = [];
    try {
      roster = db.prepare(`
        SELECT u.email AS email, u.name AS nome, u.role AS role, u.created_at AS cadastro,
               (SELECT MAX(ts) FROM analytics_events e
                  WHERE e.email=u.email AND e.kind IN ('view','login')) AS ultimo,
               (SELECT COUNT(*) FROM analytics_events e
                  WHERE e.email=u.email AND e.kind='view' AND e.ts>=?) AS visitas,
               (SELECT COUNT(DISTINCT sid) FROM analytics_events e
                  WHERE e.email=u.email AND e.kind='view' AND e.ts>=?) AS sessoes,
               (SELECT COALESCE(SUM(coins),0) FROM erp_coins c WHERE c.email=u.email) AS coins
        FROM users u
        WHERE u.active=1
        ORDER BY u.role, u.name
      `).all(sinceWin, sinceWin);
    } catch (e) { /* users pode não existir em ambiente isolado */ }

    const statusOf = (ultimo) => {
      if (!ultimo) return 'never';                       // nunca apareceu
      const dias = (now - ultimo) / DAY;
      if (dias < 7)  return 'ativo';                     // 🟢
      if (dias <= 30) return 'esfriando';                // 🟡
      return 'sumido';                                   // 🔴
    };
    roster = roster.map(u => {
      const st = statusOf(u.ultimo);
      return {
        email: u.email, nome: u.nome || u.email.split('@')[0], role: u.role,
        cadastro: u.cadastro || null,
        ultimo: u.ultimo || null,
        dias_desde: u.ultimo ? Math.floor((now - u.ultimo) / DAY) : null,
        visitas: u.visitas || 0, sessoes: u.sessoes || 0, coins: u.coins || 0,
        status: st,
      };
    });

    const total = roster.length;
    const cont = (s) => roster.filter(u => u.status === s).length;
    const resumo = {
      total,
      ativos:    cont('ativo'),         // <7d
      esfriando: cont('esfriando'),     // 7-30d
      sumidos:   cont('sumido'),        // >30d
      nunca:     cont('never'),         // nunca acessou
      // % do time que apareceu nos últimos 7 / 30 dias
      pct_ativos_7d:  total ? Math.round(cont('ativo') / total * 100) : 0,
      pct_ativos_30d: total ? Math.round((cont('ativo') + cont('esfriando')) / total * 100) : 0,
    };

    // Adoção por feature: quantas pessoas DISTINTAS (cadastradas, não-anon)
    // abriram cada página — lifetime + no período. Mostra o que ninguém usa.
    const rosterEmails = new Set(roster.map(u => u.email));
    const features = ADOCAO_FEATURES.map(f => {
      let allTime = 0, janela = 0, ultimo = null;
      try {
        allTime = db.prepare(`SELECT COUNT(DISTINCT email) n FROM analytics_events
                              WHERE kind='view' AND path=? AND email!='anon'`).get(f.path).n;
        janela = db.prepare(`SELECT COUNT(DISTINCT email) n FROM analytics_events
                             WHERE kind='view' AND path=? AND email!='anon' AND ts>=?`).get(f.path, sinceWin).n;
        ultimo = db.prepare(`SELECT MAX(ts) n FROM analytics_events
                             WHERE kind='view' AND path=?`).get(f.path).n;
      } catch (e) {}
      return {
        path: f.path, label: f.label,
        usuarios: allTime, usuarios_janela: janela,
        ultimo: ultimo || null,
        pct_time: total ? Math.round(allTime / total * 100) : 0,
      };
    }).sort((a, b) => b.usuarios - a.usuarios);

    res.json({ days: win, gerado_em: now, resumo, roster, features });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Página do report
router.get('/admin/analytics', requireOwner, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-analytics.html'));
});

// ── ÁREAS — quem viu o quê (Módulos 27 e 28) ────────────────────────────────
// Só o dono. O painel (um HTML para todas as áreas) fica FORA de public/
// (private/) pra nem o HTML ser servido pelo express.static a quem não é o dono.
router.get('/api/analytics/owner', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ owner: sessionEmail(req) === OWNER_EMAIL });
});

router.get(AREA_KINDS.map(k => AREA_TRACK[k].painel), requireOwner, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '../private/admin-area-tracking.html'));
});

// Agrega views (logPageView) + tempo (beacon office-nav) + passos da área.
// `eu=1` inclui os acessos do próprio dono (padrão: fora, pra não poluir).
router.get(`/api/admin/analytics/:area(${AREA_RE})`, requireOwner, (req, res) => {
  try {
    const kind = req.params.area, paths = areaPaths(kind);
    const days = Math.max(1, Math.min(365, parseInt(req.query.days, 10) || 30));
    const since = Date.now() - days * 86400000;
    const skip = req.query.eu === '1' ? '' : OWNER_EMAIL; // email ignorado ('' = ninguém)

    const views = db.prepare(`SELECT email, sid, ts FROM analytics_events
      WHERE kind='view' AND path IN (?,?) AND ts>=? AND email!=? ORDER BY ts ASC`).all(...paths, since, skip);
    const durs = db.prepare(`SELECT email, sid, dur_ms, ts FROM analytics_events
      WHERE kind='dur' AND path IN (?,?) AND ts>=? AND email!=?`).all(...paths, since, skip);
    const steps = db.prepare(`SELECT email, sid, meta, dur_ms, ts FROM analytics_events
      WHERE kind=? AND ts>=? AND email!=? ORDER BY ts ASC, id ASC`).all(kind, since, skip);

    let nomeDe = null;
    try { nomeDe = db.prepare(`SELECT name, role FROM users WHERE email=?`); } catch (e) {}
    const who = {};
    const info = (email) => {
      if (!who[email]) { const u = nomeDe ? nomeDe.get(email) : null; who[email] = { nome: (u && u.name) || '', role: (u && u.role) || null }; }
      return who[email];
    };

    const P = {};   // por pessoa
    const pes = (email) => P[email] || (P[email] = {
      email, visitas: 0, sessoes: new Set(), tempo_ms: 0, primeiro: null, ultimo: null,
      secoes: {}, ferramentas: {}, acoes: 0, scroll: 0,
    });
    const touch = (p, ts) => { if (p.primeiro == null || ts < p.primeiro) p.primeiro = ts; if (p.ultimo == null || ts > p.ultimo) p.ultimo = ts; };

    const S = {};   // por seção
    const sec = (id) => S[id] || (S[id] = { id, vistas: 0, pessoas: new Set(), tempo_ms: 0 });
    const T = {};   // por ferramenta
    const A = {};   // outras interações (node/achado/tab)
    const scrollMax = {};
    const porDia = {};
    let anon = 0;

    for (const v of views) {
      const d = Math.floor(v.ts / 86400000) * 86400000; porDia[d] = (porDia[d] || 0) + 1;
      if (v.email === 'anon') { anon++; continue; }
      const p = pes(v.email); p.visitas++; p.sessoes.add(v.sid); touch(p, v.ts);
    }
    for (const d of durs) {
      if (d.email === 'anon') continue;
      const p = pes(d.email); p.tempo_ms += d.dur_ms || 0; touch(p, d.ts);
    }
    for (const s of steps) {
      const parts = String(s.meta || '').split('.');
      const k = parts[0], id = parts[1] || '';
      const known = s.email !== 'anon';
      const p = known ? pes(s.email) : null;
      if (p) touch(p, s.ts);
      if (k === 'sec') {
        const x = sec(id); x.vistas++; if (known) { x.pessoas.add(s.email); p.secoes[id] = p.secoes[id] || 0; }
      } else if (k === 'tempo') {
        const x = sec(id); x.tempo_ms += s.dur_ms || 0;
        if (p) p.secoes[id] = (p.secoes[id] || 0) + (s.dur_ms || 0);
      } else if (k === 'scroll') {
        const n = parseInt(id, 10) || 0;
        if (known && n > (scrollMax[s.email] || 0)) scrollMax[s.email] = n;
      } else if (k === 'tool') {
        const x = T[id] || (T[id] = { id, cliques: 0, pessoas: new Set() });
        x.cliques++; if (known) { x.pessoas.add(s.email); p.ferramentas[id] = (p.ferramentas[id] || 0) + 1; p.acoes++; }
      } else {
        const key = k + '.' + id;
        const x = A[key] || (A[key] = { id: key, vezes: 0, pessoas: new Set() });
        x.vezes++; if (known) { x.pessoas.add(s.email); p.acoes++; }
      }
    }

    const pessoas = Object.values(P).map(p => ({
      email: p.email, ...info(p.email),
      visitas: p.visitas, sessoes: p.sessoes.size, tempo_ms: p.tempo_ms,
      primeiro: p.primeiro, ultimo: p.ultimo,
      secoes: p.secoes, ferramentas: p.ferramentas, acoes: p.acoes,
      scroll: scrollMax[p.email] || 0,
    })).sort((a, b) => (b.ultimo || 0) - (a.ultimo || 0));

    const tempoTotal = durs.reduce((a, d) => a + (d.dur_ms || 0), 0);
    const visitasComTempo = durs.filter(d => (d.dur_ms || 0) > 0).length;
    const resumo = {
      pessoas: pessoas.length,
      visitas: views.length,
      anon,
      tempo_ms: tempoTotal,
      tempo_medio_ms: visitasComTempo ? Math.round(tempoTotal / visitasComTempo) : 0,
      cliques_ferramentas: Object.values(T).reduce((a, t) => a + t.cliques, 0),
      interacoes: steps.filter(s => !/^(sec|tempo|scroll)\./.test(s.meta || '')).length,
    };
    const scrollFunil = [25, 50, 75, 100].map(n => ({ n, pessoas: Object.values(scrollMax).filter(v => v >= n).length }));

    const recente = steps.filter(s => !/^tempo\./.test(s.meta || '')).map(s => ({ email: s.email, meta: s.meta, ts: s.ts }))
      .concat(views.map(v => ({ email: v.email, meta: 'view', ts: v.ts })))
      .sort((a, b) => b.ts - a.ts).slice(0, 200)
      .map(r => ({ ...r, nome: r.email === 'anon' ? '' : info(r.email).nome }));

    res.json({
      area: kind, pagina: AREA_TRACK[kind].path,
      days, owner: OWNER_EMAIL, incluindo_dono: !skip, gerado_em: Date.now(),
      resumo,
      secoes: Object.values(S).map(x => ({ id: x.id, vistas: x.vistas, pessoas: x.pessoas.size, tempo_ms: x.tempo_ms })),
      ferramentas: Object.values(T).map(x => ({ id: x.id, cliques: x.cliques, pessoas: x.pessoas.size })).sort((a, b) => b.cliques - a.cliques),
      acoes: Object.values(A).map(x => ({ id: x.id, vezes: x.vezes, pessoas: x.pessoas.size })).sort((a, b) => b.vezes - a.vezes),
      scroll: scrollFunil,
      porDia: Object.keys(porDia).map(Number).sort((a, b) => a - b).map(d => ({ dia: d, n: porDia[d] })),
      pessoas, recente,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Passo a passo de UMA pessoa na área (lifetime).
router.get(`/api/admin/analytics/:area(${AREA_RE})/user`, requireOwner, (req, res) => {
  try {
    const kind = req.params.area;
    const email = String(req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'email_obrigatorio' });
    let meta = null;
    try { meta = db.prepare(`SELECT email, name, role FROM users WHERE email=?`).get(email); } catch (e) {}
    const passos = db.prepare(`
      SELECT kind, meta, dur_ms, ts FROM analytics_events
      WHERE email=? AND ((kind IN ('view','dur') AND path IN (?,?)) OR kind=?)
      ORDER BY ts DESC, id DESC LIMIT 600`).all(email, ...areaPaths(kind), kind);
    res.json({ email, meta: meta || { email, name: '', role: null }, passos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RESUMO SEMANAL (digest por e-mail) ────────────────────────────────────────
// Dados 100% reais das tabelas analytics_events / utm_* / erp_coins (regra 7).
// server.js agenda o envio (segunda ~8h BRT) e expõe preview/send admin.
function buildDigestData(days) {
  const d = Math.max(1, Math.min(90, days || 7));
  const since = Date.now() - d * 86400000;
  const one = (sql, ...a) => { try { return db.prepare(sql).get(...a).n; } catch (e) { return 0; } };
  const all = (sql, ...a) => { try { return db.prepare(sql).all(...a); } catch (e) { return []; } };
  return {
    days: d,
    periodo_inicio: since,
    gerado_em: Date.now(),
    uso: {
      usuarios: one(`SELECT COUNT(DISTINCT email) n FROM analytics_events WHERE kind IN ('view','login') AND ts>=? AND email!='anon'`, since),
      visitas:  one(`SELECT COUNT(*) n FROM analytics_events WHERE kind='view' AND ts>=?`, since),
      sessoes:  one(`SELECT COUNT(DISTINCT sid) n FROM analytics_events WHERE kind='view' AND ts>=?`, since),
      tempo_ms: one(`SELECT COALESCE(SUM(dur_ms),0) n FROM analytics_events WHERE kind='dur' AND ts>=?`, since),
      top_usuarios: all(`
        SELECT v.email, COUNT(*) AS visitas,
               (SELECT COALESCE(SUM(dur_ms),0) FROM analytics_events x WHERE x.kind='dur' AND x.email=v.email AND x.ts>=?) AS tempo_ms
        FROM analytics_events v WHERE v.kind='view' AND v.ts>=? AND v.email!='anon'
        GROUP BY v.email ORDER BY tempo_ms DESC, visitas DESC LIMIT 5`, since, since),
      top_paginas: all(`
        SELECT path, COUNT(*) AS visitas FROM analytics_events
        WHERE kind='view' AND ts>=? GROUP BY path ORDER BY visitas DESC LIMIT 5`, since),
    },
    utm: {
      cliques:  one(`SELECT COUNT(*) n FROM utm_clicks WHERE ts>=? AND bot=0`, since),
      clickers: one(`SELECT COUNT(DISTINCT ip_hash) n FROM utm_clicks WHERE ts>=? AND bot=0`, since),
      top_links: all(`
        SELECT l.email, l.campaign, l.source,
               (SELECT COUNT(*) FROM utm_clicks c WHERE c.token=l.token AND c.ts>=? AND c.bot=0) AS cliques
        FROM utm_links l ORDER BY cliques DESC LIMIT 5`, since).filter(x => x.cliques > 0),
    },
    coins: {
      ganhos: one(`SELECT COALESCE(SUM(coins),0) n FROM erp_coins WHERE coins>0 AND created_at >= datetime(?/1000,'unixepoch')`, since),
    },
  };
}

function _fmtDur(ms) {
  const s = Math.round((+ms || 0) / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  return Math.floor(m / 60) + 'h' + (m % 60 ? (m % 60) + 'm' : '');
}
function buildDigestHTML(data) {
  const esc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tr = (cells) => '<tr>' + cells.map((c, i) => `<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;${i > 0 ? 'text-align:right;font-family:monospace' : ''}">${c}</td>`).join('') + '</tr>';
  const h3 = (t) => `<h3 style="margin:20px 0 8px;font-size:14px;color:#334155">${t}</h3>`;
  const u = data.uso, m = data.utm;
  return `
  <div style="font-family:system-ui,sans-serif;max-width:560px;color:#0f172a">
    <h2 style="margin:0 0 4px">📊 Office — resumo da semana</h2>
    <p style="margin:0 0 16px;color:#64748b;font-size:13px">Últimos ${data.days} dias · dados reais do Analytics + UTM</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px"><tr>
      <td style="padding:10px;background:#f1f5f9;border-radius:8px"><b>${u.usuarios}</b><br><span style="font-size:11px;color:#64748b">usuários</span></td>
      <td style="width:8px"></td>
      <td style="padding:10px;background:#f1f5f9;border-radius:8px"><b>${u.visitas}</b><br><span style="font-size:11px;color:#64748b">visitas</span></td>
      <td style="width:8px"></td>
      <td style="padding:10px;background:#f1f5f9;border-radius:8px"><b>${_fmtDur(u.tempo_ms)}</b><br><span style="font-size:11px;color:#64748b">tempo total</span></td>
      <td style="width:8px"></td>
      <td style="padding:10px;background:#f1f5f9;border-radius:8px"><b>${m.cliques}</b><br><span style="font-size:11px;color:#64748b">cliques UTM</span></td>
    </tr></table>
    ${h3('👥 Top usuários (tempo ativo)')}
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      ${u.top_usuarios.length ? u.top_usuarios.map(x => tr([esc(x.email), x.visitas + ' visitas', _fmtDur(x.tempo_ms)])).join('') : tr(['— sem navegação no período', '', ''])}
    </table>
    ${h3('📄 Top páginas')}
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      ${u.top_paginas.length ? u.top_paginas.map(x => tr([esc(x.path), x.visitas + '×'])).join('') : tr(['—', ''])}
    </table>
    ${h3('🔗 Links compartilhados (cliques)')}
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      ${m.top_links.length ? m.top_links.map(x => tr([esc(x.email) + ' · ' + esc(x.campaign) + ' <span style="color:#94a3b8">(' + esc(x.source) + ')</span>', x.cliques + '×'])).join('') : tr(['— nenhum clique no período', ''])}
    </table>
    <p style="margin:18px 0 0;font-size:12px;color:#64748b">🪙 ${data.coins.ganhos} ERP Coins distribuídos no período · Reports completos: /admin/analytics · /admin/utm</p>
  </div>`;
}

module.exports = router;
module.exports.logPageView = logPageView;
module.exports.OWNER_EMAIL = OWNER_EMAIL;
module.exports.buildDigestData = buildDigestData;
module.exports.buildDigestHTML = buildDigestHTML;
