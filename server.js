// ── AMBIENTE ──────────────────────────────────────────────────────────────────
// Local Windows dev: carrega módulos e .env de fora do Google Drive
// Railway Linux: usa node_modules normais instalados pelo npm install
const localModules = 'C:/Users/Ruds/.epiuse-optimizer/node_modules';
const fs0 = require('fs');
const IS_LOCAL_DEV = process.platform === 'win32' && fs0.existsSync(localModules);

if (IS_LOCAL_DEV) {
  require('module').Module._nodeModulePaths = () => [localModules, 'node_modules'];
  const _dotenvParsed = require(localModules + '/dotenv').config({ path: 'C:/Users/Ruds/.epiuse-optimizer/.env' }).parsed || {};
  Object.keys(_dotenvParsed).forEach(k => { process.env[k] = _dotenvParsed[k]; });
}
// Railway: ANTHROPIC_API_KEY vem direto das env vars do projeto (sem .env)

const express   = IS_LOCAL_DEV ? require(localModules + '/express')            : require('express');
const multer    = IS_LOCAL_DEV ? require(localModules + '/multer')             : require('multer');
const Anthropic = IS_LOCAL_DEV ? require(localModules + '/@anthropic-ai/sdk')  : require('@anthropic-ai/sdk');
const rateLimit = IS_LOCAL_DEV ? require(localModules + '/express-rate-limit') : require('express-rate-limit');
// Resend é opcional — se require falhar, segue sem email
let Resend;
try { Resend = (IS_LOCAL_DEV ? require(localModules + '/resend') : require('resend')).Resend; }
catch (e) { console.warn('[boot] resend não instalado — emails serão skipped:', e.message); }
const fs = require('fs');
const path = require('path');

// ── EDITOR AUTH ───────────────────────────────────────────────────────────────
// Token simples (MVP). Override via env var em produção.
const EDITOR_TOKEN = process.env.EDITOR_TOKEN || 'epiuse-2026';
function requireEditorToken(req, res, next) {
  const t = req.query.token || req.headers['x-editor-token'];
  if (t !== EDITOR_TOKEN) return res.status(401).json({ success: false, error: 'Token inválido' });
  next();
}

// ── PATHS DE DADOS ────────────────────────────────────────────────────────────
const VOICES_JSON_PATH = path.join(__dirname, 'public/api/voices.json');
const VOICES_MD_DIR    = path.join(__dirname, 'public/api/voices');

// ── SQLite DATABASE ───────────────────────────────────────────────────────────
// Railway: montar volume em /data e setar DATA_DIR=/data nas env vars do projeto
// Local dev Windows: C:/Users/Ruds/.epiuse-optimizer/db.sqlite
const Database = (() => {
  try { return IS_LOCAL_DEV ? require(localModules + '/better-sqlite3') : require('better-sqlite3'); }
  catch (e) { console.error('[boot] FATAL: better-sqlite3 não encontrado:', e.message); process.exit(1); }
})();

const DB_DIR = IS_LOCAL_DEV
  ? 'C:/Users/Ruds/.epiuse-optimizer'
  : (process.env.DATA_DIR || path.join(__dirname, 'data'));
if (!fs0.existsSync(DB_DIR)) fs0.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'db.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    voice_id        TEXT NOT NULL,
    post_url        TEXT NOT NULL,
    post_id         TEXT DEFAULT '',
    published_at    TEXT DEFAULT '',
    captured_at     TEXT NOT NULL,
    content_type    TEXT DEFAULT 'post',
    content_preview TEXT DEFAULT '',
    pillar          TEXT,
    likes           INTEGER DEFAULT 0,
    comments        INTEGER DEFAULT 0,
    reposts         INTEGER DEFAULT 0,
    views           INTEGER,
    created_at      TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_posts_voice ON posts(voice_id);
  CREATE INDEX IF NOT EXISTS idx_posts_url   ON posts(post_url);
  CREATE TABLE IF NOT EXISTS recruitment_applications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nome         TEXT NOT NULL,
    email        TEXT NOT NULL,
    linkedin     TEXT NOT NULL,
    area         TEXT NOT NULL,
    motivo       TEXT DEFAULT '',
    utm_source   TEXT DEFAULT '',
    utm_medium   TEXT DEFAULT '',
    utm_campaign TEXT DEFAULT '',
    utm_voice    TEXT DEFAULT '',
    timestamp    TEXT NOT NULL,
    ip           TEXT DEFAULT '',
    created_at   TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cs_clientes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sharepoint_id   TEXT UNIQUE,
    conta           TEXT NOT NULL,
    cliente_nome    TEXT NOT NULL,
    contato_principal TEXT DEFAULT '',
    contato_email   TEXT DEFAULT '',
    csm             TEXT DEFAULT '',
    lob             TEXT DEFAULT '',
    status          TEXT DEFAULT 'live',
    nps             INTEGER,
    valor_anual     REAL,
    ultimo_contato  TEXT,
    observacoes     TEXT DEFAULT '',
    case_publicavel INTEGER DEFAULT 0,
    case_resumo     TEXT DEFAULT '',
    updated_at      TEXT DEFAULT (datetime('now')),
    synced_at       TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_cs_status ON cs_clientes(status);
  CREATE INDEX IF NOT EXISTS idx_cs_csm    ON cs_clientes(csm);
  CREATE TABLE IF NOT EXISTS editorial_calendar (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id     TEXT UNIQUE,
    fonte           TEXT NOT NULL,
    data            TEXT NOT NULL,
    canal           TEXT DEFAULT 'linkedin',
    autor           TEXT DEFAULT '',
    titulo          TEXT NOT NULL,
    resumo          TEXT DEFAULT '',
    pilar           TEXT DEFAULT '',
    status          TEXT DEFAULT 'planned',
    url_post        TEXT DEFAULT '',
    updated_at      TEXT DEFAULT (datetime('now')),
    synced_at       TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_cal_data ON editorial_calendar(data);
`);

// Migra JSONL legado → SQLite (roda só uma vez se as tabelas estiverem vazias)
(function migrateJSONL() {
  const postsFile = path.join(__dirname, 'posts.jsonl');
  if (fs0.existsSync(postsFile) && db.prepare('SELECT COUNT(*) as n FROM posts').get().n === 0) {
    const lines = fs0.readFileSync(postsFile, 'utf8').trim().split('\n').filter(Boolean);
    const ins = db.prepare('INSERT OR IGNORE INTO posts (voice_id,post_url,post_id,published_at,captured_at,content_type,content_preview,pillar,likes,comments,reposts,views) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    db.transaction(() => {
      for (const line of lines) {
        try {
          const p = JSON.parse(line);
          ins.run(p.voice_id,p.post_url,p.post_id||'',p.published_at||'',p.captured_at||new Date().toISOString(),p.content_type||'post',p.content_preview||'',p.pillar??null,p.metrics?.likes||0,p.metrics?.comments||0,p.metrics?.reposts||0,p.metrics?.views??null);
        } catch {}
      }
    })();
    console.log(`[migrate] ${lines.length} post(s) migrado(s) de JSONL → SQLite`);
    fs0.renameSync(postsFile, postsFile + '.migrated');
  }

  const recruitFile = path.join(__dirname, 'recruitment-applications.jsonl');
  if (fs0.existsSync(recruitFile) && db.prepare('SELECT COUNT(*) as n FROM recruitment_applications').get().n === 0) {
    const lines = fs0.readFileSync(recruitFile, 'utf8').trim().split('\n').filter(Boolean);
    const ins = db.prepare('INSERT OR IGNORE INTO recruitment_applications (nome,email,linkedin,area,motivo,utm_source,utm_medium,utm_campaign,utm_voice,timestamp,ip) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    db.transaction(() => {
      for (const line of lines) {
        try {
          const r = JSON.parse(line);
          ins.run(r.nome,r.email,r.linkedin,r.area,r.motivo||'',r.utm_source||'',r.utm_medium||'',r.utm_campaign||'',r.utm_voice||'',r.timestamp,r.ip||'');
        } catch {}
      }
    })();
    console.log(`[migrate] ${lines.length} inscrição(ões) migrada(s) de JSONL → SQLite`);
    fs0.renameSync(recruitFile, recruitFile + '.migrated');
  }
})();

console.log(`[boot] SQLite: ${DB_PATH}`);

function backupFile(p) {
  if (!fs.existsSync(p)) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${p}.bak.${ts}`;
  try { fs.copyFileSync(p, bak); } catch (e) { console.warn('[backup-fail]', p, e.message); }
}

// ── EMAIL (opcional via Resend) ───────────────────────────────────────────────
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'ruda.costa@epiuse.com.br';
const FROM_EMAIL   = process.env.FROM_EMAIL   || 'voices@resend.dev';
const resend = (Resend && process.env.RESEND_API_KEY) ? new Resend(process.env.RESEND_API_KEY) : null;
if (resend) console.log(`[boot] email pronto: from=${FROM_EMAIL} to=${NOTIFY_EMAIL}`);
else        console.log(`[boot] email desabilitado (sem RESEND_API_KEY) — inscrições só em JSONL + console`);

function buildEmailHTML(app) {
  const safe = (s) => String(s||'').replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
  const utmRow = (k, v) => v ? `<tr><td style="padding:4px 12px;color:#64748b;font-size:12px">${k}</td><td style="padding:4px 12px;color:#334155;font-size:12px"><b>${safe(v)}</b></td></tr>` : '';
  return `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px">
  <table cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <tr><td style="background:linear-gradient(135deg,#0a1628,#2563EB);padding:24px;color:#fff">
      <div style="font-size:11px;letter-spacing:.2em;opacity:.7;text-transform:uppercase;margin-bottom:6px">EPI-USE Voices · LP</div>
      <div style="font-size:20px;font-weight:700">🎙️ Nova inscrição: ${safe(app.nome)}</div>
    </td></tr>
    <tr><td style="padding:22px 24px">
      <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#1e293b">
        <tr><td style="padding:6px 0;color:#64748b;width:130px">Nome</td><td style="padding:6px 0"><b>${safe(app.nome)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">E-mail</td><td style="padding:6px 0"><a href="mailto:${safe(app.email)}" style="color:#2563EB">${safe(app.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">LinkedIn</td><td style="padding:6px 0"><a href="${safe(app.linkedin)}" style="color:#2563EB">${safe(app.linkedin)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Vaga</td><td style="padding:6px 0"><b>${safe(app.area)}</b></td></tr>
      </table>
      <div style="margin:16px 0 6px;color:#64748b;font-size:11px;letter-spacing:.16em;text-transform:uppercase">Motivo</div>
      <div style="background:#f8fafc;border-left:3px solid #2563EB;padding:12px 14px;border-radius:4px;font-size:13px;color:#334155;line-height:1.55;white-space:pre-wrap">${safe(app.motivo)}</div>
    </td></tr>
    <tr><td style="padding:0 24px 18px"><div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px">
      <div style="font-size:10px;letter-spacing:.18em;color:#92400e;text-transform:uppercase;font-weight:700;margin-bottom:6px">🎯 ATRIBUIÇÃO</div>
      <table cellpadding="0" cellspacing="0" style="width:100%;font-size:12px">
        ${utmRow('source', app.utm_source)}${utmRow('medium', app.utm_medium)}${utmRow('campaign', app.utm_campaign)}${utmRow('voice', app.utm_voice) || `<tr><td colspan="2" style="padding:4px 12px;color:#92400e;font-size:12px;font-style:italic">— sem UTM (acesso direto) —</td></tr>`}
      </table>
    </div></td></tr>
    <tr><td style="padding:14px 24px 22px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
      <div>Recebido em ${safe(app.timestamp)}</div>
      <div style="margin-top:6px"><a href="https://epiuse-voices-optimizer.up.railway.app/painel" style="color:#2563EB;text-decoration:none">→ Ver todas inscrições no Painel da Duda</a></div>
    </td></tr>
  </table>
  </body></html>`;
}

async function sendRecruitmentEmail(app) {
  if (!resend) { console.log('[EMAIL-SKIPPED] sem RESEND_API_KEY'); return; }
  try {
    const r = await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      subject: `🎙️ Nova inscrição EPI-USE Voices — ${app.nome}`,
      html: buildEmailHTML(app),
      reply_to: app.email
    });
    console.log(`[EMAIL-SENT] id=${r.data?.id || 'unknown'} to=${NOTIFY_EMAIL}`);
  } catch (e) {
    console.error(`[EMAIL-FAIL] ${e.message}`);
  }
}

const app = express();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Trust proxy 1 hop pra Railway (rate limit reconhece IP real)
app.set('trust proxy', 1);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── RATE LIMITERS ─────────────────────────────────────────────────────────────
// Optimizer é caro (Claude Vision tokens): 10 análises por hora por IP
const optimizerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de 10 análises/hora atingido. Tente novamente em uma hora.' }
});

// Form da LP de recrutamento: 5 inscrições por hora por IP (anti-spam)
const recruitmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de 5 inscrições/hora atingido.' }
});

// Inbound Brief→Post: 20 gerações por hora por IP (suficiente p/ uso normal, anti-abuse de Claude API)
const inboundGenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de 20 gerações/hora atingido. Aguarde 1h.' }
});

// ── ROTAS DO OFFICE ENGINE ────────────────────────────────────────────────────
const OPTIMIZER_PATH = path.join(__dirname, 'public/optimizer.html');
app.get('/optimizer', (req, res) => res.sendFile(OPTIMIZER_PATH));

// Páginas v3.0 — servem do public/ em qualquer ambiente
const PAINEL_PATH     = path.join(__dirname, 'public/painel.html');
const VOICES_PATH     = path.join(__dirname, 'public/voices.html');
const SEJA_VOICE_PATH = path.join(__dirname, 'public/seja-voice.html');
const CHANGELOG_PATH  = path.join(__dirname, 'public/changelog.html');
app.get('/painel',     (req, res) => res.sendFile(PAINEL_PATH));
// /voices/painel é o caminho canônico (Painel da Duda é parte do projeto Voices) —
// redireciona pro /painel real mantendo URLs antigas válidas.
app.get('/voices/painel', (req, res) => res.redirect(301, '/painel'));
app.get('/voices',     (req, res) => res.sendFile(VOICES_PATH));
app.get('/seja-voice', (req, res) => res.sendFile(SEJA_VOICE_PATH));
app.get('/changelog',  (req, res) => res.sendFile(CHANGELOG_PATH));

// ── MODULE G · CASES & CS HUB (sprint 0.4.0) ─────────────────────────────────
const CASES_PATH = path.join(__dirname, 'public/cases.html');
app.get('/cases', (req, res) => res.sendFile(CASES_PATH));

// API: lista clientes (com filtros opcionais)
app.get('/api/cases', (req, res) => {
  try {
    const q = req.query;
    let sql = 'SELECT * FROM cs_clientes WHERE 1=1';
    const params = [];
    if (q.status) { sql += ' AND status = ?'; params.push(q.status); }
    if (q.csm)    { sql += ' AND csm    = ?'; params.push(q.csm); }
    if (q.lob)    { sql += ' AND lob    = ?'; params.push(q.lob); }
    sql += ' ORDER BY cliente_nome ASC';
    const rows = db.prepare(sql).all(...params);
    // KPIs agregados
    const all = db.prepare('SELECT status, nps FROM cs_clientes').all();
    const kpis = {
      total: all.length,
      live: all.filter(r => r.status === 'live').length,
      churn_risk: all.filter(r => r.status === 'churn-risk').length,
      onboarding: all.filter(r => r.status === 'onboarding').length,
      nps_medio: (() => {
        const valid = all.map(r => r.nps).filter(n => n !== null && n !== undefined);
        if (!valid.length) return null;
        return Math.round(valid.reduce((s, n) => s + n, 0) / valid.length);
      })(),
      synced_at: rows[0]?.synced_at || null
    };
    res.json({ kpis, clientes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: upsert via cron (recebe array de clientes da planilha SharePoint).
// Protegido pelo mesmo EDITOR_TOKEN dos PUT de voices.
app.post('/api/cases/sync', requireEditorToken, (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ success: false, error: 'items[] vazio.' });
  const upsert = db.prepare(`
    INSERT INTO cs_clientes (sharepoint_id, conta, cliente_nome, contato_principal, contato_email, csm, lob, status, nps, valor_anual, ultimo_contato, observacoes, case_publicavel, case_resumo, synced_at)
    VALUES (@sharepoint_id, @conta, @cliente_nome, @contato_principal, @contato_email, @csm, @lob, @status, @nps, @valor_anual, @ultimo_contato, @observacoes, @case_publicavel, @case_resumo, datetime('now'))
    ON CONFLICT(sharepoint_id) DO UPDATE SET
      conta=excluded.conta,
      cliente_nome=excluded.cliente_nome,
      contato_principal=excluded.contato_principal,
      contato_email=excluded.contato_email,
      csm=excluded.csm,
      lob=excluded.lob,
      status=excluded.status,
      nps=excluded.nps,
      valor_anual=excluded.valor_anual,
      ultimo_contato=excluded.ultimo_contato,
      observacoes=excluded.observacoes,
      case_publicavel=excluded.case_publicavel,
      case_resumo=excluded.case_resumo,
      synced_at=datetime('now'),
      updated_at=datetime('now')
  `);
  const tx = db.transaction((arr) => {
    let n = 0;
    for (const it of arr) {
      try {
        upsert.run({
          sharepoint_id: String(it.sharepoint_id || it.id || '').slice(0, 100) || `gen-${Date.now()}-${n}`,
          conta:         String(it.conta || '').slice(0, 100),
          cliente_nome:  String(it.cliente_nome || it.cliente || '').slice(0, 200),
          contato_principal: String(it.contato_principal || it.contato || '').slice(0, 100),
          contato_email: String(it.contato_email || it.email || '').slice(0, 100),
          csm:           String(it.csm || '').slice(0, 100),
          lob:           String(it.lob || '').slice(0, 50),
          status:        String(it.status || 'live').slice(0, 30),
          nps:           it.nps != null ? parseInt(it.nps, 10) : null,
          valor_anual:   it.valor_anual != null ? parseFloat(it.valor_anual) : null,
          ultimo_contato: String(it.ultimo_contato || '').slice(0, 30),
          observacoes:   String(it.observacoes || '').slice(0, 2000),
          case_publicavel: it.case_publicavel ? 1 : 0,
          case_resumo:   String(it.case_resumo || '').slice(0, 1000)
        });
        n++;
      } catch (e) { console.warn('[cases/sync] item falhou:', e.message); }
    }
    return n;
  });
  const n = tx(items);
  res.json({ success: true, upserted: n, total_received: items.length });
});

// Seed inicial de cases anonimizados (rodada uma vez se tabela vazia)
(function seedCases() {
  if (db.prepare('SELECT COUNT(*) as n FROM cs_clientes').get().n > 0) return;
  const seed = [
    { sharepoint_id: 'seed-1', conta: 'EUBR-2024-001', cliente_nome: 'Drogaria Venancio', contato_principal: '— (anonimizado)', contato_email: '', csm: 'Marlison Estrela', lob: 'HCM', status: 'live', nps: 9, valor_anual: null, ultimo_contato: '2026-04-15', observacoes: 'Migração ECC → SuccessFactors em 14 meses · 280 lojas. Case publicável.', case_publicavel: 1, case_resumo: '280 lojas migradas em 14 meses do ECC para SuccessFactors. Bridge marketing→vendas via Voices.' },
    { sharepoint_id: 'seed-2', conta: 'EUBR-2025-007', cliente_nome: 'Cliente Cloud LATAM', contato_principal: '— (anonimizado)', contato_email: '', csm: 'Marlison Estrela', lob: 'Cloud', status: 'onboarding', nps: null, valor_anual: null, ultimo_contato: '2026-05-10', observacoes: 'Em onboarding · projeto BTP/Joule. Não publicar sem aprovação Roberto.', case_publicavel: 0, case_resumo: '' },
    { sharepoint_id: 'seed-3', conta: 'EUBR-2024-019', cliente_nome: 'Renner Group', contato_principal: '— (anonimizado)', contato_email: '', csm: 'Bruna Yamagami', lob: 'ERP', status: 'live', nps: 8, valor_anual: null, ultimo_contato: '2026-05-20', observacoes: 'S/4HANA Cloud · contrato anual confirmado renewal 2026.', case_publicavel: 0, case_resumo: '' }
  ];
  const ins = db.prepare(`INSERT INTO cs_clientes (sharepoint_id, conta, cliente_nome, contato_principal, contato_email, csm, lob, status, nps, valor_anual, ultimo_contato, observacoes, case_publicavel, case_resumo, synced_at) VALUES (@sharepoint_id, @conta, @cliente_nome, @contato_principal, @contato_email, @csm, @lob, @status, @nps, @valor_anual, @ultimo_contato, @observacoes, @case_publicavel, @case_resumo, datetime('now'))`);
  db.transaction(() => { seed.forEach(s => ins.run(s)); })();
  console.log(`[seed] ${seed.length} cliente(s) anonimizado(s) carregado(s) em cs_clientes. Substitua via /api/cases/sync.`);
})();

// ── MODULE F · INBOUND ENGINE ──────────────────────────────────────────────────
// Pacote vindo do projeto Claude Design (sessão EUBR Inbound, 25/mai/2026).
// 6 telas single-file. Assets (CSS/JS/refs/assets) servidos pelo express.static
// global da linha 202. Aqui só definimos as URLs limpas sem extensão.
const INBOUND_DIR = path.join(__dirname, 'public/inbound');
app.get('/inbound',           (req, res) => res.sendFile(path.join(INBOUND_DIR, 'index.html')));
app.get('/inbound/brief',     (req, res) => res.sendFile(path.join(INBOUND_DIR, 'brief.html')));
app.get('/inbound/calendar',  (req, res) => res.sendFile(path.join(INBOUND_DIR, 'calendar.html')));
app.get('/inbound/studio',    (req, res) => res.sendFile(path.join(INBOUND_DIR, 'studio.html')));
app.get('/inbound/carousel',  (req, res) => res.sendFile(path.join(INBOUND_DIR, 'carousel.html')));
app.get('/inbound/playbook',  (req, res) => res.sendFile(path.join(INBOUND_DIR, 'playbook.html')));

// ── INBOUND CALENDAR API (sprint 0.4.0) ─────────────────────────────────────
// GET retorna posts agendados; POST faz upsert (usado pelo frontend e pelo cron de sync)
app.get('/api/inbound/calendar', (req, res) => {
  try {
    const from = req.query.from || new Date(Date.now() - 7*24*3600*1000).toISOString().slice(0,10);
    const to   = req.query.to   || new Date(Date.now() + 90*24*3600*1000).toISOString().slice(0,10);
    const rows = db.prepare('SELECT * FROM editorial_calendar WHERE data >= ? AND data <= ? ORDER BY data ASC').all(from, to);
    const last = db.prepare('SELECT MAX(synced_at) AS s FROM editorial_calendar').get();
    res.json({ posts: rows, range: { from, to }, last_sync: last?.s || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/inbound/calendar', requireEditorToken, (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ success: false, error: 'items[] vazio.' });
  const upsert = db.prepare(`
    INSERT INTO editorial_calendar (external_id, fonte, data, canal, autor, titulo, resumo, pilar, status, url_post, synced_at)
    VALUES (@external_id, @fonte, @data, @canal, @autor, @titulo, @resumo, @pilar, @status, @url_post, datetime('now'))
    ON CONFLICT(external_id) DO UPDATE SET
      fonte=excluded.fonte, data=excluded.data, canal=excluded.canal, autor=excluded.autor,
      titulo=excluded.titulo, resumo=excluded.resumo, pilar=excluded.pilar, status=excluded.status,
      url_post=excluded.url_post, synced_at=datetime('now'), updated_at=datetime('now')
  `);
  let n = 0;
  db.transaction((arr) => {
    for (const it of arr) {
      try {
        upsert.run({
          external_id: String(it.external_id || it.id || `${it.fonte}-${it.data}-${(it.titulo||'').slice(0,30)}`).slice(0,200),
          fonte:  String(it.fonte || 'manual').slice(0, 30),
          data:   String(it.data || '').slice(0, 10),
          canal:  String(it.canal || 'linkedin').slice(0, 30),
          autor:  String(it.autor || '').slice(0, 100),
          titulo: String(it.titulo || '').slice(0, 300),
          resumo: String(it.resumo || '').slice(0, 2000),
          pilar:  String(it.pilar || '').slice(0, 50),
          status: String(it.status || 'planned').slice(0, 30),
          url_post: String(it.url_post || '').slice(0, 500)
        });
        n++;
      } catch (e) { console.warn('[calendar] upsert falhou:', e.message); }
    }
  })(items);
  res.json({ success: true, upserted: n });
});

// Webhook pra cron sync com RD Station (lê a API de Conversões/Posts/Email)
// Por enquanto: endpoint que retorna metadata + sample request curl pra testar manual.
// Quando RD_API_KEY estiver no Railway, o cron diário 6h vai chamar /api/inbound/sync-rd.
app.post('/api/inbound/sync-rd', requireEditorToken, async (req, res) => {
  if (!process.env.RD_API_KEY) {
    return res.status(503).json({ success: false, error: 'RD_API_KEY não configurada no env.' });
  }
  try {
    // Endpoint genérico da RD — vai precisar ajustar conforme o tipo de "post" que se quer puxar.
    // Doc: https://developers.rdstation.com/reference
    // MVP: puxar email campaigns agendados/enviados, mapear pra editorial_calendar.
    const url = 'https://api.rd.services/platform/email_marketing';
    const rdRes = await fetch(url, { headers: { 'Authorization': `Bearer ${process.env.RD_API_KEY}` } });
    if (!rdRes.ok) throw new Error(`RD respondeu HTTP ${rdRes.status}`);
    const data = await rdRes.json();
    const emails = Array.isArray(data?.email_marketing) ? data.email_marketing : [];
    // Mapeia pra editorial_calendar
    const items = emails.slice(0, 100).map(e => ({
      external_id: `rd-email-${e.id}`,
      fonte: 'rd-station',
      data: (e.scheduled_at || e.sent_at || '').slice(0,10),
      canal: 'email',
      autor: e.from_name || 'EPI-USE',
      titulo: e.subject || '(sem assunto)',
      resumo: e.preheader || '',
      pilar: 'Email Marketing',
      status: e.status || 'planned',
      url_post: ''
    })).filter(i => i.data);
    res.json({ success: true, fetched: emails.length, mapped: items.length, items });
    // TODO: chamar /api/inbound/calendar internamente pra persistir, ou retornar pro caller decidir
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── /api/alerts: feed unificado pro sino de notificação do office-nav ──
// Fonte: voices.json#alertas + alertas operacionais derivados (ex: posts atrasados)
app.get('/api/alerts', (req, res) => {
  try {
    const voicesPath = path.join(__dirname, 'public/api/voices.json');
    const voices = JSON.parse(fs0.readFileSync(voicesPath, 'utf8'));
    const alertas = [...(voices.alertas || [])];

    // Adiciona alertas derivados de runtime
    const now = Date.now();
    const D14 = 14 * 24 * 3600 * 1000;
    try {
      const recentPosts = db.prepare("SELECT voice_id, MAX(captured_at) AS last_at FROM posts GROUP BY voice_id").all();
      const voicesAtivos = (voices.voices || []).filter(v => v.status !== 'inativo');
      for (const v of voicesAtivos) {
        const row = recentPosts.find(p => p.voice_id === v.id);
        if (!row || (now - new Date(row.last_at).getTime()) > D14) {
          alertas.push({ tipo: 'warn', msg: `${v.nome}: sem post registrado nos últimos 14 dias.` });
        }
      }
    } catch (e) { /* sqlite offline ou tabela vazia — segue sem o alerta derivado */ }

    res.json({ alertas, count: alertas.length });
  } catch (e) {
    res.status(500).json({ alertas: [], error: e.message });
  }
});

// ── INBOUND GENERATE: substitui window.claude.complete() do artifact host ──
// Aceita format='post' (Brief→Post, default) ou 'carousel' (cover + N slides + cta).
// Usado por /inbound/brief e /inbound/carousel.
function buildPostPrompt(b) {
  return [
    'Você é o redator do time de Marketing/RevOps da EPI-USE Brasil.',
    'Siga o playbook editorial: foto humana > arte; número-herói > parágrafo; CTA no final.',
    '',
    `CATEGORIA: ${b.cat}`,
    `LOB: ${b.lob}`,
    `MODO: ${b.mode === 'camp' ? 'Campanha United We Rise' : 'Institucional'}`,
    `PERSONA-ALVO: ${b.persona.toUpperCase()}`,
    `CLIENTE/REFERÊNCIA: ${b.client || '—'}`,
    `NÚMERO-CHAVE: ${b.metric || '—'}`,
    `AUTOR HUMANO (reshare): ${b.author || '—'}`,
    '',
    'BRIEF BRUTO:',
    b.brief,
    '',
    'Gere um objeto JSON com EXATAMENTE estas chaves:',
    '{',
    '  "headline": "4-6 palavras · ponha *termo-chave* entre asteriscos para itálico",',
    '  "heroNumber": "número-herói como string (ex: \\"38%\\" ou \\"14m\\") ou null",',
    '  "context": "1 linha · máx 12 palavras",',
    '  "linkedinCopy": "PT-BR · 3-5 linhas curtas · gancho no início · pergunta/CTA no fim · sem emoji",',
    '  "hashtags": "5-7 hashtags separadas por espaço",',
    '  "distribution": "1 linha · perfil corporativo OU shared pelo executivo X OU carrossel"',
    '}',
    '',
    'NÃO inclua nada antes ou depois do JSON. Apenas o objeto.'
  ].join('\n');
}

function buildCarouselPrompt(b) {
  const n = Math.max(2, Math.min(10, parseInt(b.contentCount, 10) || 4));
  return [
    'Você é o redator do time de Marketing/RevOps da EPI-USE Brasil.',
    'Tarefa: ESTRUTURAR um carrossel para LinkedIn em português brasileiro, voltado para mercado BR.',
    '',
    'REGRAS CRÍTICAS:',
    '1. NÃO INVENTE NENHUM NÚMERO OU ESTATÍSTICA. Se o brief não trouxer dados verificáveis, deixe "number" e "source" como string vazia "".',
    '2. SÓ use números que estejam EXPLICITAMENTE no brief OU que sejam fatos públicos comprovados (ex: ECC end-of-support em 31/12/2027, Reforma Tributária a partir de 2026).',
    '3. NUNCA escreva "fonte: invente algo plausível". Se não souber, deixe vazio.',
    '4. PT-BR. Voz EPI-USE: sóbria, confiante, específica. Sem emoji. Sem floreio.',
    '5. Headlines de 4-6 palavras. Marque a palavra-chave com *asteriscos*.',
    '6. Contexto de até 12 palavras. Cita persona-alvo explicitamente quando relevante.',
    '',
    'CONTEXTO:',
    `TEMA: ${b.topic || ''}`,
    `LOB: ${b.lob}`,
    `PERSONA: ${b.persona.toUpperCase()} (Brasil)`,
    `SLIDES DE CONTEÚDO: ${n}`,
    '',
    'BRIEF / DADOS:',
    b.brief || '(sem dados extras)',
    '',
    'Gere SOMENTE este JSON, sem markdown:',
    '{',
    '  "cover": {',
    '    "eyebrow": "string curta · ex: \\"GUIA CHRO · 2026\\" ou \\"\\"",',
    '    "headline": "4-9 palavras com *destaque*",',
    '    "sub": "subtítulo · 1 linha · pode estar vazio"',
    '  },',
    '  "slides": [',
    '    {',
    '      "tag": "ex: \\"PONTO 01\\" ou \\"O RISCO\\"",',
    '      "headline": "4-6 palavras com *destaque*",',
    '      "number": "se houver fato verificável no brief, escreva (ex: \\"78%\\"); senão \\"\\"",',
    '      "context": "1 linha · até 12 palavras · explica o número",',
    '      "source": "instituto + ano · OBRIGATÓRIO se houver number · senão \\"\\""',
    `    } ... ${n} itens`,
    '  ],',
    '  "cta": {',
    '    "headline": "verbo de ação · com *destaque* · ex: \\"Vamos *juntos*?\\"",',
    '    "sub": "1 linha · convite específico",',
    '    "url": "epiuse.com.br"',
    '  }',
    '}'
  ].join('\n');
}

// ── INBOUND EXTRACT: parseia texto bruto da Redatoria → campos estruturados do brief ──
// Recebe { text } (texto cru que a Lisiane mandou). Retorna { dor, persona, lob, cat, mode,
// client, metric, brief_resumido, key_points[] } pra auto-popular o formulário.
app.post('/api/inbound/extract', inboundGenLimiter, async (req, res) => {
  const text = String((req.body || {}).text || '').slice(0, 8000);
  if (!text.trim()) return res.status(400).json({ success: false, error: 'Texto é obrigatório.' });

  const prompt = [
    'Você é o redator do time de Marketing/RevOps da EPI-USE Brasil.',
    'Tarefa: ler o texto bruto enviado pela Redatoria (parceira de conteúdo Lisiane de Assis) e extrair os elementos editoriais que o Inbound Engine precisa.',
    '',
    'TEXTO BRUTO DA REDATORIA:',
    '"""',
    text,
    '"""',
    '',
    'EXTRAIA os seguintes campos e devolva SOMENTE este JSON, sem markdown:',
    '{',
    '  "dor": "string · 1 frase · a dor central que o conteúdo endereça (ex: \\"CHROs ainda rodam folha em ECC e perdem prazo do end-of-support\\")",',
    '  "persona": "uma das opções: chro · cio · cfo · ceo · ops · diretor-rh · diretor-ti · arquiteto · cdo · coo",',
    '  "lob": "uma das opções: sfsf · erp · btm · sig · sn · wfs · cloud · inst (HCM=sfsf, Cloud ERP=erp, BTP=btm, Signavio=sig, ServiceNow=sn, Workforce=wfs, AWS/Valcann=cloud, Institucional=inst)",',
    '  "cat": "uma das opções: case · event · award · kickoff · product · video · inst (case=case sucesso, event=feira/evento, award=premiação, kickoff=go-live, product=carrossel produto, video, inst=institucional)",',
    '  "mode": "instit ou camp (default instit; camp = se for parte da campanha United We Rise)",',
    '  "client": "string · nome do cliente/referência citado · vazio se não houver",',
    '  "metric": "string · número-herói extraído do texto · vazio se não houver (ex: \\"280 lojas\\" ou \\"38%\\" ou \\"14 meses\\")",',
    '  "brief_resumido": "string · 3-6 linhas · síntese editorial do conteúdo, em PT-BR, voz EPI-USE (sóbria, confiante, específica) · preserva fatos verificáveis · será o input pro próximo passo (Brief→Post)",',
    '  "key_points": ["array de 3-5 bullets curtos · pontos editorialmente relevantes que devem aparecer no post/carrossel"]',
    '}',
    '',
    'REGRAS:',
    '- NÃO INVENTE números. Se não estiver no texto, deixe metric vazio.',
    '- Se a persona não estiver clara, escolha a mais plausível pelo contexto.',
    '- NÃO inclua nada antes ou depois do JSON.'
  ].join('\n');

  try {
    const completion = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    const raw = completion.content[0].text;
    const clean = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(clean);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('[inbound/extract]', e.message);
    res.status(500).json({ success: false, error: e.message || 'Falha na extração.' });
  }
});

app.post('/api/inbound/generate', inboundGenLimiter, async (req, res) => {
  const b = req.body || {};
  const format = b.format === 'carousel' ? 'carousel' : 'post';
  const payload = {
    brief:   String(b.brief || '').slice(0, 6000),
    cat:     String(b.cat || 'thought').slice(0, 40),
    lob:     String(b.lob || 'Cross').slice(0, 40),
    mode:    String(b.mode || 'instit').slice(0, 20),
    persona: String(b.persona || 'CFO').slice(0, 20),
    client:  String(b.client || '').slice(0, 100),
    metric:  String(b.metric || '').slice(0, 60),
    author:  String(b.author || '').slice(0, 60),
    topic:   String(b.topic || '').slice(0, 200),
    contentCount: b.contentCount
  };

  if (!payload.brief.trim() && !payload.topic.trim()) {
    return res.status(400).json({ success: false, error: 'Brief ou tema é obrigatório.' });
  }

  const prompt = format === 'carousel' ? buildCarouselPrompt(payload) : buildPostPrompt(payload);
  const maxTokens = format === 'carousel' ? 2500 : 1200;

  try {
    const completion = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });
    const raw = completion.content[0].text;
    const clean = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(clean);
    res.json({ success: true, format, ...data });
  } catch (e) {
    console.error('[inbound/generate]', format, e.message);
    res.status(500).json({ success: false, error: e.message || 'Falha na geração.' });
  }
});

// Single source of truth — local e Railway servem do mesmo public/.
// (Antes o local lia de G:/Meu Drive/.../dashboard-classic.html que ficou stale.
// Agora qualquer edição em public/ aparece imediatamente nos 2 ambientes.)
const OFFICE_HTML    = path.join(__dirname, 'public/office.html');
const DASHBOARD_HTML = path.join(__dirname, 'public/dashboard.html');
const HUB_HTML       = path.join(__dirname, 'public/hub.html');
app.get('/',          (req, res) => res.sendFile(OFFICE_HTML));
app.get('/game',      (req, res) => res.sendFile(OFFICE_HTML));
app.get('/dashboard', (req, res) => res.sendFile(DASHBOARD_HTML));
app.get('/hub',       (req, res) => res.sendFile(HUB_HTML));

// ── UTM REDIRECT: /v/:slug ────────────────────────────────────────────────────
// Bio link de cada Voice. Adiciona UTMs e redireciona pra /seja-voice.
// Loga clique pra futura análise.
app.get('/v/:slug', (req, res) => {
  const slug = req.params.slug.replace(/[^a-z0-9-]/g, '').slice(0, 50);
  const referer = req.get('referer') || 'direct';
  const ua = (req.get('user-agent') || 'unknown').slice(0, 120);
  console.log(`[BIO-CLICK] voice=${slug} ref=${referer} ua="${ua}"`);
  const dest = `/seja-voice?utm_source=linkedin&utm_medium=bio&utm_campaign=voices-mvp&utm_voice=${slug}`;
  res.redirect(302, dest);
});

// ── FORM SUBMIT: /api/seja-voice (LP recrutamento) ────────────────────────────
app.post('/api/seja-voice', recruitmentLimiter, async (req, res) => {
  const data = req.body || {};
  // Sanitização básica
  const clean = {
    nome:        String(data.nome || '').slice(0, 100),
    email:       String(data.email || '').slice(0, 100),
    linkedin:    String(data.linkedin || '').slice(0, 200),
    area:        String(data.area || '').slice(0, 50),
    motivo:      String(data.motivo || '').slice(0, 800),
    utm_source:  String(data.utm_source || '').slice(0, 50),
    utm_medium:  String(data.utm_medium || '').slice(0, 50),
    utm_campaign: String(data.utm_campaign || '').slice(0, 50),
    utm_voice:   String(data.utm_voice || '').slice(0, 50),
    timestamp:   data.timestamp || new Date().toISOString(),
    ip:          req.ip || 'unknown'
  };
  if (!clean.nome || !clean.email || !clean.linkedin || !clean.area || !clean.motivo) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios não preenchidos.' });
  }
  try {
    db.prepare('INSERT INTO recruitment_applications (nome,email,linkedin,area,motivo,utm_source,utm_medium,utm_campaign,utm_voice,timestamp,ip) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(clean.nome,clean.email,clean.linkedin,clean.area,clean.motivo,clean.utm_source,clean.utm_medium,clean.utm_campaign,clean.utm_voice,clean.timestamp,clean.ip);
  } catch (e) {
    console.error('[RECRUITMENT-WRITE-FAIL]', e.message);
  }
  console.log(`[RECRUITMENT] ${clean.nome} (${clean.email}) → vaga ${clean.area} | utm_source=${clean.utm_source}`);

  // Dispara email (não bloqueia response — best effort)
  sendRecruitmentEmail(clean).catch(e => console.error('[EMAIL-UNCAUGHT]', e.message));

  res.json({ success: true, message: 'Inscrição recebida. Você será contactado em até 5 dias úteis.' });
});

// GET /api/applications — lista inscrições (requer token de editor)
app.get('/api/applications', requireEditorToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM recruitment_applications ORDER BY created_at DESC LIMIT 200').all();
    res.json({ success: true, applications: rows, total: rows.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// VOICE EDITOR — atualiza voices.json e .md de cada Voice via token auth
// ─────────────────────────────────────────────────────────────────────────────

// PUT /api/voices/:slug — atualiza campos editáveis do Voice em voices.json
app.put('/api/voices/:slug', requireEditorToken, (req, res) => {
  const slug = String(req.params.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!slug) return res.status(400).json({ success: false, error: 'slug inválido' });

  let data;
  try {
    data = JSON.parse(fs.readFileSync(VOICES_JSON_PATH, 'utf8'));
  } catch (e) {
    return res.status(500).json({ success: false, error: 'falha ao ler voices.json: ' + e.message });
  }

  const voice = (data.voices || []).find(v => v.id === slug);
  if (!voice) return res.status(404).json({ success: false, error: 'Voice não encontrado: ' + slug });

  const patch = req.body || {};
  // Campos editáveis (whitelist)
  const editable = ['nicho', 'tags', 'audiencia', 'linkedin', 'ssi_baseline', 'seguidores_baseline',
                    'posts_mes_atual', 'kit_gerado', 'ultimo_post', 'pendencia',
                    'tom_voz', 'lado_humano', 'resultados'];

  const dadosAConfirmar = new Set(voice.dados_a_confirmar || []);
  let touchedAnyProv = false;

  for (const key of editable) {
    if (!(key in patch)) continue;
    let val = patch[key];
    // sanitize ints
    if (key === 'ssi_baseline' || key === 'seguidores_baseline' || key === 'posts_mes_atual') {
      val = (val === null || val === '') ? null : Number(val);
      if (Number.isNaN(val)) val = null;
    }
    // sanitize arrays from string (comma-separated)
    if ((key === 'tags' || key === 'audiencia') && typeof val === 'string') {
      val = val.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (key === 'resultados' && typeof val === 'string') {
      val = val.split('\n').map(s => s.trim()).filter(Boolean);
    }
    if (key === 'kit_gerado') val = !!val;

    // Se valor era {valor, provisorio} e agora foi editado, vira valor cru (não mais provisório)
    voice[key] = val;
    if (dadosAConfirmar.has(key)) {
      dadosAConfirmar.delete(key);
      touchedAnyProv = true;
    }
  }

  voice.dados_a_confirmar = [...dadosAConfirmar];
  data.programa = data.programa || {};
  data.programa.atualizado_em = new Date().toISOString().slice(0, 10);

  // Backup + write
  backupFile(VOICES_JSON_PATH);
  try {
    fs.writeFileSync(VOICES_JSON_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    return res.status(500).json({ success: false, error: 'falha ao salvar: ' + e.message });
  }

  console.log(`[VOICE-EDIT] ${slug} updated. prov_removed=${touchedAnyProv} dados_a_confirmar=${[...dadosAConfirmar].length}`);
  res.json({ success: true, voice });
});

// PUT /api/voices/:slug/md — atualiza arquivo .md do agente
app.put('/api/voices/:slug/md', requireEditorToken, express.text({ type: '*/*', limit: '100kb' }), (req, res) => {
  const slug = String(req.params.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!slug) return res.status(400).json({ success: false, error: 'slug inválido' });
  const md = String(req.body || '');
  if (md.length < 50) return res.status(400).json({ success: false, error: 'markdown muito curto' });
  if (md.length > 50000) return res.status(400).json({ success: false, error: 'markdown excede 50KB' });

  const mdPath = path.join(VOICES_MD_DIR, slug + '.md');
  backupFile(mdPath);
  try {
    fs.writeFileSync(mdPath, md);
  } catch (e) {
    return res.status(500).json({ success: false, error: 'falha ao salvar md: ' + e.message });
  }
  console.log(`[VOICE-MD] ${slug} updated (${md.length} chars)`);
  res.json({ success: true, bytes: md.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST TRACKER — registrar/atualizar posts publicados no LinkedIn
// ─────────────────────────────────────────────────────────────────────────────

const postsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de 60 posts/hora atingido.' }
});

// POST /api/posts — cria snapshot de um post
app.post('/api/posts', postsLimiter, (req, res) => {
  const b = req.body || {};
  const clean = {
    voice_id:         String(b.voice_id || '').replace(/[^a-z0-9-]/g, '').slice(0, 60),
    post_url:         String(b.post_url || '').slice(0, 500),
    post_id:          '',
    published_at:     String(b.published_at || '').slice(0, 20),
    captured_at:      new Date().toISOString(),
    content_type:     ['post', 'article', 'video', 'image', 'document'].includes(b.content_type) ? b.content_type : 'post',
    content_preview:  String(b.content_preview || '').slice(0, 500),
    pillar:           ['Thought Leadership', 'Cases', 'Pessoas', 'Propósito'].includes(b.pillar) ? b.pillar : null,
    metrics: {
      likes:    Math.max(0, parseInt(b.metrics?.likes, 10) || 0),
      comments: Math.max(0, parseInt(b.metrics?.comments, 10) || 0),
      reposts:  Math.max(0, parseInt(b.metrics?.reposts, 10) || 0),
      views:    b.metrics?.views ? Math.max(0, parseInt(b.metrics.views, 10) || 0) : null
    }
  };

  if (!clean.voice_id || !clean.post_url) {
    return res.status(400).json({ success: false, error: 'voice_id e post_url obrigatórios' });
  }

  // Derive post_id from URL (último segmento ou hash)
  const idMatch = clean.post_url.match(/(?:activity|share|posts)[-_:](\d+)/i) || clean.post_url.match(/-(\d{15,25})-/) || [];
  clean.post_id = idMatch[1] || clean.post_url.split('/').filter(Boolean).pop() || clean.post_url.slice(-30);

  try {
    db.prepare('INSERT INTO posts (voice_id,post_url,post_id,published_at,captured_at,content_type,content_preview,pillar,likes,comments,reposts,views) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(clean.voice_id,clean.post_url,clean.post_id,clean.published_at,clean.captured_at,clean.content_type,clean.content_preview||'',clean.pillar,clean.metrics.likes,clean.metrics.comments,clean.metrics.reposts,clean.metrics.views??null);
  } catch (e) {
    return res.status(500).json({ success: false, error: 'falha ao gravar: ' + e.message });
  }
  console.log(`[POST] ${clean.voice_id} | ${clean.metrics.likes}❤️ ${clean.metrics.comments}💬 ${clean.metrics.reposts}🔄 | ${clean.post_url.slice(0, 60)}`);
  res.json({ success: true, post: clean });
});

// GET /api/posts?voice=X&period=7d|30d|90d|all — retorna posts agregados (último snapshot por post_url)
app.get('/api/posts', (req, res) => {
  const voiceFilter = req.query.voice ? String(req.query.voice).replace(/[^a-z0-9-]/g, '') : null;
  const period = ['7d', '30d', '90d', 'all'].includes(req.query.period) ? req.query.period : 'all';

  try {
    let cutoff = null;
    if (period !== 'all') {
      cutoff = new Date(Date.now() - parseInt(period, 10) * 86400000).toISOString();
    }

    let sql = `
      SELECT p.* FROM posts p
      WHERE p.captured_at = (
        SELECT MAX(p2.captured_at) FROM posts p2 WHERE p2.post_url = p.post_url
      )
    `;
    const params = [];
    if (voiceFilter)  { sql += ' AND p.voice_id = ?'; params.push(voiceFilter); }
    if (cutoff)       { sql += ' AND (p.published_at >= ? OR (p.published_at = \'\' AND p.captured_at >= ?))'; params.push(cutoff, cutoff); }
    sql += ' ORDER BY CASE WHEN p.published_at != \'\' THEN p.published_at ELSE p.captured_at END DESC';

    const rows = db.prepare(sql).all(...params);
    const posts = rows.map(r => ({
      voice_id: r.voice_id, post_url: r.post_url, post_id: r.post_id,
      published_at: r.published_at, captured_at: r.captured_at,
      content_type: r.content_type, content_preview: r.content_preview, pillar: r.pillar,
      metrics: { likes: r.likes, comments: r.comments, reposts: r.reposts, views: r.views }
    }));
    res.json({ success: true, posts, total: posts.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/posts/timeline/:post_id — todos snapshots de 1 post (evolução)
app.get('/api/posts/timeline/:post_id', (req, res) => {
  const pid = String(req.params.post_id).slice(0, 60);
  try {
    const snaps = db.prepare('SELECT * FROM posts WHERE post_id = ? ORDER BY captured_at ASC').all(pid)
      .map(r => ({
        voice_id: r.voice_id, post_url: r.post_url, post_id: r.post_id,
        published_at: r.published_at, captured_at: r.captured_at,
        content_type: r.content_type, content_preview: r.content_preview, pillar: r.pillar,
        metrics: { likes: r.likes, comments: r.comments, reposts: r.reposts, views: r.views }
      }));
    res.json({ success: true, snapshots: snaps });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GERAR PAUTAS — Claude API com contexto do Voice
// ─────────────────────────────────────────────────────────────────────────────

const pautasLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,  // custa tokens — limita pra evitar abuso
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de 5 gerações/hora atingido.' }
});

app.post('/api/voice/:slug/generate-pautas', pautasLimiter, async (req, res) => {
  const slug = String(req.params.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!slug) return res.status(400).json({ success: false, error: 'slug inválido' });

  // 1. Carrega voice
  let voicesData, voice, mdContent, eventsData, recentPosts = [];
  try {
    voicesData = JSON.parse(fs.readFileSync(VOICES_JSON_PATH, 'utf8'));
    voice = (voicesData.voices || []).find(v => v.id === slug);
    if (!voice) return res.status(404).json({ success: false, error: 'Voice não encontrado' });

    const mdPath = path.join(VOICES_MD_DIR, slug + '.md');
    mdContent = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';

    const eventsPath = path.join(__dirname, 'public/api/events.json');
    if (fs.existsSync(eventsPath)) eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
  } catch (e) {
    return res.status(500).json({ success: false, error: 'falha ao ler contexto: ' + e.message });
  }

  // 2. Recent posts do voice (últimos 5)
  recentPosts = db.prepare(`
    SELECT p.* FROM posts p
    WHERE p.voice_id = ?
      AND p.captured_at = (SELECT MAX(p2.captured_at) FROM posts p2 WHERE p2.post_url = p.post_url)
    ORDER BY CASE WHEN p.published_at != '' THEN p.published_at ELSE p.captured_at END DESC
    LIMIT 5
  `).all(slug).map(r => ({
    voice_id: r.voice_id, post_url: r.post_url,
    published_at: r.published_at, captured_at: r.captured_at,
    content_preview: r.content_preview || '', pillar: r.pillar,
    metrics: { likes: r.likes, comments: r.comments, reposts: r.reposts, views: r.views }
  }));

  // 3. Eventos próximos (próximas 4 semanas)
  const nowMonth = new Date().getMonth() + 1;
  const nearMonths = [nowMonth, nowMonth + 1 > 12 ? 1 : nowMonth + 1];
  const upcomingEvents = (eventsData?.eventos || []).filter(e => nearMonths.includes(e.m)).slice(0, 8);

  // 4. Helper pra extrair valor de {valor, provisorio} ou cru
  const unwrap = (v) => (v && typeof v === 'object' && 'valor' in v) ? v.valor : v;

  // 5. Monta o prompt
  const linkedinUrl = unwrap(voice.linkedin);
  const tomVoz = unwrap(voice.tom_voz) || '(não definido)';
  const ladoHumano = unwrap(voice.lado_humano) || '(não definido)';
  const resultados = unwrap(voice.resultados) || [];

  const prompt = `Você é um copywriter B2B especialista em SAP e LinkedIn. Sua missão: gerar 3 sugestões de pauta de post para ${voice.nome}, ${voice.cargo} na EPI-USE Brasil.

CONTEXTO DO VOICE:
- Nome: ${voice.nome}
- Cargo: ${voice.cargo}
- Empresa: ${voice.empresa}
- Nicho: ${voice.nicho}
- Audiência-alvo: ${(voice.audiencia || []).join(', ')}
- Tom de voz: ${tomVoz}
- Lado humano: ${ladoHumano}
- Resultados concretos:
${resultados.map(r => '  - ' + r).join('\n') || '  (a definir)'}

EVENTOS DAS PRÓXIMAS 8 SEMANAS (use como gancho temporal):
${upcomingEvents.map(e => `- ${e.d}/${e.m}: ${e.n} (${e.lob})`).join('\n') || '  (sem eventos próximos)'}

${recentPosts.length > 0 ? `POSTS RECENTES DESTE VOICE (NÃO REPITA esses temas):
${recentPosts.map(p => `- [${p.pillar || '?'}] ${p.content_preview.slice(0, 100)}`).join('\n')}

` : ''}REGRAS DO PROGRAMA EPI-USE VOICES:
- PT-BR obrigatório
- Hook forte na primeira linha
- Sem clientes nominais (anonimizar como "Fortune 500 BR" ou "holding com 12 filiais")
- Sem concorrentes nominais (TIVIT, Stefanini, Accenture, etc.)
- Sem promessas absurdas
- 1x/mês mencionar EPI-USE Brasil; ERP.ngo quando relevante
- Distribuir entre 4 pilares: Thought Leadership (40%) | Cases (30%) | Pessoas (20%) | Propósito (10%)

GERE 3 PAUTAS DISTINTAS. Cada uma deve:
1. Ter um hook forte e específico
2. Indicar pilar editorial
3. Justificar relevância AGORA (gancho temporal)
4. Trazer 1 dado/insight concreto pra o Voice expandir
5. Sugerir CTA claro

Retorne APENAS JSON válido, sem texto antes/depois:
{
  "pautas": [
    { "titulo": "string", "hook": "string", "pilar": "Thought Leadership|Cases|Pessoas|Propósito", "gancho_temporal": "string", "insight_chave": "string", "cta_sugerido": "string" }
  ]
}`;

  // 6. Chama Claude
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    let rawText = response.content[0].text;
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ success: false, error: 'IA não retornou JSON válido' });
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[PAUTAS] ${slug} gerou ${parsed.pautas?.length || 0} pautas`);
    res.json({ success: true, pautas: parsed.pautas || [], generated_at: new Date().toISOString() });
  } catch (e) {
    console.error('[PAUTAS-FAIL]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

function buildPrompt(fields) {
  const {
    linkedin_url,
    nome,
    area_principal,
    anos_experiencia,
    resultado_1,
    resultado_2,
    resultado_3,
    diferencial_humano,
    publico_alvo,
    tom_voz,
    ssi_score,
    seguidores,
    data_entrada_epiuse,
    cargo_oficial,
    foto_oficial
  } = fields;

  const resultados = [resultado_1, resultado_2, resultado_3]
    .filter(Boolean)
    .map((r, i) => `  ${i + 1}. ${r}`)
    .join('\n');

  return `Você é o Profile Optimizer do programa EPI-USE Voices — programa de influência executiva da EPI-USE Brasil.

CONTEXTO DO PROGRAMA:
- EPI-USE Brasil (Razão social: EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA): maior consultoria SAP especializada em HCM/Payroll do Brasil; em evolução para EPI-USE 5.0 (Transformação Empresarial)
- Grupo: EPI-USE / groupelephant.com | 42+ anos de atuação | 10 grupos de marcas | 4.500+ profissionais | 40+ países | 2.000+ clientes empresariais | 1.800+ organizações com software licenciado | SAP Gold Partner
- Braços do grupo no Brasil: EPI-USE Brasil (consultoria SAP), EPI-USE Labs (P&D de IPs), Stratview (Analytics), Valcann (Cloud & Infra)
- LOBs: SAP HCM/SuccessFactors, SAP ERP/S4HANA (Clean Core + Reforma Tributária), SAP BTP, SAP Signavio, ServiceNow HRSD/ITSM, Analytics/Stratview
- IPs proprietários: TalenTools (acelerador de RH), PRISM (analytics/reporting)
- ERP.ngo: 1% da receita global destinada à conservação de elefantes e combate à pobreza rural na África (erp.ngo)
- Todos os participantes do EPI-USE Voices são embaixadores do ERP.ngo
- ATENÇÃO: Use SEMPRE "EPI-USE Brasil" por extenso — nunca apenas "EPI-USE", pois existem outras entidades do grupo globalmente

BANNER OFICIAL DA EPI-USE BRASIL (LINKEDIN):
- Link direto da imagem: https://epiusebr-my.sharepoint.com/:i:/g/personal/ti_brasil_epiuse_com_br/IQBWQpKomSTBRZ1VHGjafYUVAXA1AFQuNVFVdmaakKYPKRE?e=ntPEIx
- Pasta completa de assets: https://epiusebr-my.sharepoint.com/:f:/g/personal/ti_brasil_epiuse_com_br/IgCzGSd6PzslRICvk26vZY_fAaJ50os-DQG516n4lhIPBy0?e=P2DJQH

DADOS FORNECIDOS PELO USUÁRIO:
- URL LinkedIn: ${linkedin_url}
- Nome: ${nome || '(ver screenshot)'}
- Área principal: ${area_principal || '(ver screenshot)'}
- Anos de experiência: ${anos_experiencia || '(não informado)'}
- Cargo oficial na EPI-USE Brasil: ${cargo_oficial || '(não informado)'}
- Data de entrada na EPI-USE Brasil: ${data_entrada_epiuse || '(não informada)'}
- Resultados reais com números:
${resultados || '  (não informados — use placeholders)'}
- Diferencial humano (família, paixões pessoais, causas, mentoria): ${diferencial_humano || '(não informado)'}
- Público-alvo desejado: ${publico_alvo || '(não informado)'}
- Tom de voz preferido: ${tom_voz || 'equilibrado'}
- SSI Score atual: ${ssi_score || '(não medido)'}
- Seguidores atuais: ${seguidores || '(não informado)'}
- Foto oficial EPI-USE disponível: ${(foto_oficial === 'true' || foto_oficial === true) ? 'Sim — usar no perfil' : 'Não confirmado — sugerir tirar foto'}

MISSÃO:
Analisar o perfil LinkedIn (URL + screenshots) + dados fornecidos acima e gerar um Kit de Perfil LinkedIn personalizado e completo.

REGRAS OBRIGATÓRIAS:
- Tudo em Português do Brasil
- Seção "Sobre" SEMPRE em 1ª pessoa
- Mencionar EPI-USE Voices E ERP.ngo na seção Sobre
- Usar SEMPRE "EPI-USE Brasil" por extenso — NUNCA apenas "EPI-USE"
- Cargo sugerido deve incluir "EPI-USE Brasil" (ex: "Consultor SAP HCM | EPI-USE Brasil")
- Usar os resultados reais fornecidos — não inventar números
- Onde não há número real, usar placeholder: [preencher: ex. X% de redução]
- Headline: máximo 220 caracteres, área de expertise + empresa + diferencial
- Competências: priorizar tecnologias atuais (SAP BTP, Clean Core, S/4HANA, SuccessFactors) — remover versões legadas (SAP R/3, etc.)
- Tom deve seguir a preferência indicada: ${tom_voz || 'equilibrado'}
- Formatação mobile: parágrafos curtos, sem paredes de texto
- Seção Sobre: máximo 2.600 caracteres (limite LinkedIn)
- ERP.ngo DEVE ser sugerido como "Causas Sociais" no LinkedIn para este perfil
- Sempre gerar exatamente 5 Destaques Estratégicos (seção Featured do LinkedIn)

Retorne a análise em JSON estruturado. Retorne APENAS o JSON, sem texto antes ou depois:
{
  "nome": "string",
  "cargo_atual": "string",
  "empresa_atual": "EPI-USE Brasil",
  "diagnostico": {
    "pontos_positivos": ["string"],
    "problemas_encontrados": [
      { "elemento": "string", "situacao_atual": "string", "meta": "string", "urgencia": "alta|media|baixa" }
    ]
  },
  "headline_sugerida": "string",
  "url_sugerida": "string",
  "sobre_texto": "string (com [preencher: descrição] para placeholders)",
  "competencias": {
    "adicionar": ["string"],
    "remover": ["string"],
    "manter": ["string"]
  },
  "destaques": [
    { "numero": 1, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" },
    { "numero": 2, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" },
    { "numero": 3, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" },
    { "numero": 4, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" },
    { "numero": 5, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" }
  ],
  "ssi_diagnostico": {
    "nivel": "baixo|medio|bom|excelente",
    "observacoes": "string",
    "dicas": ["string (dica concreta de como melhorar o SSI)"]
  },
  "secao_fotos": {
    "foto_sugestao": "string (orientações concretas para a foto de perfil)",
    "imagens_perfil": ["string (sugestões de imagens de capa/kickoffs/eventos para usar no perfil)"]
  },
  "erp_ngo": {
    "passo_causas_sociais": "string (passo a passo: como adicionar ERP.ngo como Causa Social no LinkedIn)",
    "como_virar_embaixador": "string (orientações para se posicionar como embaixador ERP.ngo)"
  },
  "checklist": [
    { "item": "string", "prioridade": "urgente|normal|bonus", "passo": "string" }
  ],
  "proximos_passos": ["string"],
  "estrategia_idioma": {
    "orientacoes": ["string (dica prática sobre estratégia de idioma para este profissional)"],
    "instrucao_perfil_en": "string (passo a passo: como criar o perfil secundário em inglês no LinkedIn — LinkedIn → Eu → Ver perfil → Adicionar perfil em outro idioma)"
  },
  "linha_editorial": {
    "pilares": [
      { "percentual": "40%", "nome": "Thought Leadership", "exemplos": ["string (tema concreto personalizado para este Voice e sua área)"] },
      { "percentual": "30%", "nome": "Cases", "exemplos": ["string"] },
      { "percentual": "20%", "nome": "Pessoas", "exemplos": ["string"] },
      { "percentual": "10%", "nome": "Propósito", "exemplos": ["string"] }
    ],
    "calendario_4_semanas": [
      { "semana": 1, "post_1": "string (tema específico e personalizado para este Voice)", "post_2": "string" },
      { "semana": 2, "post_1": "string", "post_2": "string" },
      { "semana": 3, "post_1": "string", "post_2": "string" },
      { "semana": 4, "post_1": "string", "post_2": "string" }
    ],
    "nota_algoritmo": "string (dica importante: primeiras 4 semanas sem links externos no corpo do post — o algoritmo LinkedIn penaliza)"
  },
  "social_selling": {
    "perfis_para_alertas": ["string (perfil LinkedIn sugerido para este Voice seguir/comentar — ex: VP SAP Brasil, CIO de empresa-alvo)"],
    "exemplo_comentario": "string (modelo de comentário de alto impacto contextualizado para a área deste Voice — mencionar EPI-USE Brasil e dado concreto)",
    "dica_30_min": "string (instrução sobre a tática: nos primeiros 30 min após publicação de um líder do nicho, comentar com insight de valor)"
  },
  "recomendacoes": {
    "meta": "8 a 12 recomendações ativas",
    "perfis_prioritarios": ["string (tipo de perfil a solicitar recomendação — ex: cliente atual, parceiro SAP, gestor interno)"],
    "template_mensagem": "string (mensagem personalizada para solicitar recomendação — pronta para copiar e enviar no LinkedIn — mencionar contexto específico do projeto ou parceria)"
  },
  "kpis": {
    "instrucoes_baseline": "string (instrução para registrar o baseline ANTES de começar — incluir link https://www.linkedin.com/sales/ssi para SSI)",
    "metas_90_dias": [
      { "kpi": "SSI Score", "meta": "> 70" },
      { "kpi": "Visualizações de perfil/semana", "meta": "+150%" },
      { "kpi": "Seguidores", "meta": "+30%" },
      { "kpi": "Convites recebidos/semana", "meta": "+25%" },
      { "kpi": "Mensagens diretas recebidas/semana", "meta": "+20%" },
      { "kpi": "Posts publicados (90 dias)", "meta": "24 (2x/semana)" },
      { "kpi": "Impressões médias por post", "meta": "baseline + 100%" }
    ]
  }
}`;
}

app.post('/api/analisar-perfil', optimizerLimiter, upload.array('screenshots', 5), async (req, res) => {
  const files = req.files || [];

  try {
    const {
      linkedin_url,
      nome,
      area_principal,
      anos_experiencia,
      resultado_1,
      resultado_2,
      resultado_3,
      diferencial_humano,
      publico_alvo,
      tom_voz,
      ssi_score,
      seguidores,
      data_entrada_epiuse,
      cargo_oficial,
      foto_oficial
    } = req.body;

    if (!linkedin_url) {
      return res.status(400).json({ success: false, error: 'URL do LinkedIn é obrigatória.' });
    }

    const content = [];

    for (const file of files) {
      const imageData = fs.readFileSync(file.path);
      const base64 = imageData.toString('base64');
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: file.mimetype, data: base64 }
      });
    }

    content.push({
      type: 'text',
      text: buildPrompt({
        linkedin_url, nome, area_principal, anos_experiencia,
        resultado_1, resultado_2, resultado_3,
        diferencial_humano, publico_alvo, tom_voz,
        ssi_score, seguidores,
        data_entrada_epiuse, cargo_oficial, foto_oficial
      })
    });

    // Sonnet 4.6: ~12-18s p/ esse prompt vs ~25-45s do Opus 4.6 — mesma qualidade
    // estrutural. Usuário reportou erros/timeout com Opus; Sonnet resolve.
    const t0 = Date.now();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content }]
    });
    console.log(`[optimizer] análise concluída em ${((Date.now() - t0) / 1000).toFixed(1)}s · ${response.usage?.input_tokens || '?'}→${response.usage?.output_tokens || '?'} tokens`);

    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });

    // Extrair JSON — remove blocos markdown se Claude os incluir
    let rawText = response.content[0].text;
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: 'A IA não retornou um JSON válido. Tente novamente.' });
    }

    let kit;
    try {
      kit = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message);
      return res.status(500).json({ success: false, error: 'Resposta da IA incompleta (JSON truncado). Tente novamente ou reduza o número de screenshots.' });
    }
    res.json({ success: true, kit });

  } catch (error) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
    console.error('Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// VOICES VISION — extrai dados de perfil LinkedIn via Claude Vision
// (a) extract: Voice existente, preenche campos faltantes
// (b) create-from-profile: novo Voice do zero, retorna esqueleto pra revisão
// ════════════════════════════════════════════════════════════════════════════

const voicesVisionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,    // 8/h por IP — Vision é caro
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de 8 análises Vision/hora atingido.' }
});

function buildExtractPrompt(linkedin_url, nome) {
  return `Você analisa o perfil LinkedIn de ${nome || 'um Voice'} (URL: ${linkedin_url || 'ver screenshots'}) e extrai dados estruturados pra atualizar o perfil dele no programa EPI-USE Voices.

Use o que VOCÊ CONSEGUE VER nos screenshots. Não invente números. Onde não houver evidência, retorne null.

Retorne APENAS este JSON, sem texto antes/depois:
{
  "ssi_baseline": "número 0-100 se aparecer na URL https://linkedin.com/sales/ssi (provavelmente null)",
  "seguidores_baseline": "número de seguidores se visível",
  "tom_voz": "string 1-2 frases descrevendo o tom — formal/coloquial, técnico/storytelling, etc — inferido dos posts ou Sobre",
  "lado_humano": "string 1 frase — paixões/causas/diferencial humano visível no perfil (família, mentoria, comunidade, esportes, etc)",
  "resultados": ["array de 3-5 strings com resultados quantitativos REAIS do perfil — extrair de Sobre, Destaques, recomendações. Ex: '14 anos consultoria SAP HCM' · 'liderou migração para 280 lojas Drogaria Venancio'. Se não houver, retornar array vazio []"]
}`;
}

function buildCreatePrompt(nome, linkedin_url, area_principal) {
  return `Você está cadastrando ${nome} como novo Voice do programa EPI-USE Voices (LinkedIn: ${linkedin_url}, área: ${area_principal || 'não informada'}).

Analise os screenshots do perfil dele e extraia TUDO que conseguir ver pra montar o esqueleto do Voice. Retorne APENAS este JSON:

{
  "nome": "${nome}",
  "cargo": "cargo atual visível no LinkedIn",
  "empresa": "EPI-USE Brasil",
  "nicho": "string · 3-6 palavras · ex: 'SAP HCM · SuccessFactors · Folha de Pagamento'",
  "tags": ["array de 3-5 tags técnicas relevantes pro nicho — ex: 'SAP HCM', 'SuccessFactors', 'Payroll'"],
  "audiencia": ["array de 2-4 personas que esse Voice vai atingir — ex: 'CHROs', 'Diretores de RH', 'Líderes de Folha'"],
  "tom_voz": "string 1-2 frases — tom natural visível nos posts/Sobre",
  "lado_humano": "string 1 frase — diferencial humano visível",
  "resultados": ["array 3-5 resultados quantitativos REAIS extraídos do perfil — não inventar"],
  "seguidores_baseline": "número se visível, senão null",
  "ssi_baseline": null
}`;
}

app.post('/api/voices/extract', voicesVisionLimiter, upload.array('screenshots', 5), async (req, res) => {
  const files = req.files || [];
  try {
    const { linkedin_url, nome } = req.body;
    if (!linkedin_url && files.length === 0) {
      return res.status(400).json({ success: false, error: 'Forneça URL LinkedIn ou pelo menos 1 screenshot.' });
    }
    const content = [];
    for (const file of files) {
      const base64 = fs.readFileSync(file.path).toString('base64');
      content.push({ type: 'image', source: { type: 'base64', media_type: file.mimetype, data: base64 } });
    }
    content.push({ type: 'text', text: buildExtractPrompt(linkedin_url, nome) });

    const t0 = Date.now();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content }]
    });
    console.log(`[voices/extract] ${((Date.now() - t0)/1000).toFixed(1)}s · ${response.usage?.input_tokens||'?'}→${response.usage?.output_tokens||'?'}`);
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });

    let raw = response.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ success: false, error: 'JSON inválido da IA. Tente novamente.' });
    const data = JSON.parse(m[0]);
    res.json({ success: true, ...data });
  } catch (e) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    console.error('[voices/extract]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/voices/create-from-profile', voicesVisionLimiter, upload.array('screenshots', 5), async (req, res) => {
  const files = req.files || [];
  try {
    const { nome, linkedin_url, area_principal } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    if (!linkedin_url && files.length === 0) {
      return res.status(400).json({ success: false, error: 'Forneça URL LinkedIn ou pelo menos 1 screenshot.' });
    }
    const content = [];
    for (const file of files) {
      const base64 = fs.readFileSync(file.path).toString('base64');
      content.push({ type: 'image', source: { type: 'base64', media_type: file.mimetype, data: base64 } });
    }
    content.push({ type: 'text', text: buildCreatePrompt(nome.trim(), linkedin_url, area_principal) });

    const t0 = Date.now();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content }]
    });
    console.log(`[voices/create] ${((Date.now() - t0)/1000).toFixed(1)}s · ${response.usage?.input_tokens||'?'}→${response.usage?.output_tokens||'?'}`);
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });

    let raw = response.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ success: false, error: 'JSON inválido da IA. Tente novamente.' });
    const data = JSON.parse(m[0]);
    // Adiciona campos infra que o user vai precisar revisar/preencher
    data.linkedin = linkedin_url || null;
    data.status = 'onboarding';
    data.status_label = 'Onboarding';
    data.id = (nome.toLowerCase().replace(/[^a-z\s]/g,'').trim().replace(/\s+/g,'-')).slice(0, 40);
    res.json({ success: true, ...data });
  } catch (e) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    console.error('[voices/create]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎙️  EPI-USE Voices — Profile Optimizer`);
  console.log(`🚀  http://localhost:${PORT}\n`);
});
