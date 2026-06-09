// ── AMBIENTE ──────────────────────────────────────────────────────────────────
// Local Windows dev: carrega modulos e .env de fora do OneDrive (evita clobber)
// Railway Linux: usa node_modules normais instalados pelo npm install
// Detecta o usuario atual automaticamente (Ruds, rudac, ou qualquer outro)
const fs0 = require('fs');
const os0 = require('os');
const _winUser = os0.userInfo().username; // rudac, Ruds, etc.
const _localCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/node_modules`,
  'C:/Users/Ruds/.epiuse-optimizer/node_modules',
];
const localModules = _localCandidates.find(p => fs0.existsSync(p)) || '';
const IS_LOCAL_DEV = process.platform === 'win32' && !!localModules;

// Carrega .env off-repo (API keys nao vao no git)
const _envCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/.env`,
  'C:/Users/Ruds/.epiuse-optimizer/.env',
  require('path').resolve(__dirname, '.env'),
];
for (const _ep of _envCandidates) {
  if (fs0.existsSync(_ep)) {
    try {
      const _lines = fs0.readFileSync(_ep, 'utf8').split('\n');
      _lines.forEach(l => {
        const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      });
      console.log(`[boot] .env carregado: ${_ep}`);
    } catch {}
    break;
  }
}
if (IS_LOCAL_DEV) {
  require('module').Module._nodeModulePaths = () => [localModules, 'node_modules'];
}
// Railway: variaveis de ambiente vem das env vars do projeto (sem .env)

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
const seoChecker = require('./scripts/integrations/seo_checker'); // SEO+GEO determinístico (sem deps)

// ── RESILIÊNCIA: handlers globais de erro ───────────────────────────────────────
// Sem isto, QUALQUER erro async não tratado mata o processo Node → 502 até o
// Railway reiniciar (janela em que "as páginas não funcionam"). Aqui logamos e
// mantemos o processo vivo — um bug pontual numa rota não derruba o app inteiro.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] processo MANTIDO vivo:', err && err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] processo MANTIDO vivo:', reason && reason.stack || reason);
});

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
  ? localModules.replace(/[\\/]node_modules$/, '')  // ex: C:/Users/rudac/.epiuse-optimizer
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
  CREATE TABLE IF NOT EXISTS metas_linkedin (
    area_id         TEXT PRIMARY KEY,
    seg_30d         INTEGER,
    seg_90d         INTEGER,
    eventos_q       INTEGER,
    acoes           TEXT DEFAULT '',
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS zoho_deals (
    deal_id          TEXT PRIMARY KEY,
    conta            TEXT,
    nome_deal        TEXT,
    valor            REAL DEFAULT 0,
    stage            TEXT,
    campanha         TEXT,
    solution         TEXT,
    deal_scope       TEXT,
    opportunity_source TEXT,
    data_criacao     TEXT,
    data_fechamento  TEXT,
    synced_at        TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_zoho_source ON zoho_deals(opportunity_source);
  CREATE INDEX IF NOT EXISTS idx_zoho_criacao ON zoho_deals(data_criacao);
  CREATE INDEX IF NOT EXISTS idx_zoho_campanha ON zoho_deals(campanha);

  CREATE TABLE IF NOT EXISTS clientes_sap_4me (
    pkg_id           TEXT PRIMARY KEY,
    projeto_id       TEXT,
    conta_parceiro   TEXT,
    nome_cliente     TEXT,
    pais             TEXT,
    area_subsolucao  TEXT,
    pacotes          TEXT,
    escopo_pacote    TEXT,
    etapa            TEXT,
    data_kickoff     TEXT,
    golive_planejado TEXT,
    golive_confirmado TEXT,
    relevante_nivel  TEXT,
    gerente_projeto  TEXT,
    synced_at        TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sap4me_pais  ON clientes_sap_4me(pais);
  CREATE INDEX IF NOT EXISTS idx_sap4me_etapa ON clientes_sap_4me(etapa);
  CREATE INDEX IF NOT EXISTS idx_sap4me_area  ON clientes_sap_4me(area_subsolucao);

  CREATE TABLE IF NOT EXISTS field_events (
    event_id      TEXT PRIMARY KEY,      -- ex: brasil-1-NRF-Retail (slug do events.json)
    nome          TEXT,
    data_evento   TEXT,                  -- ISO se conhecida
    local         TEXT,
    lob           TEXT,
    pais          TEXT,
    responsavel   TEXT,
    porte         TEXT,                  -- Pequeno / Médio / Grande
    orcamento     REAL DEFAULT 0,
    status        TEXT DEFAULT 'planejamento', -- planejamento|pre-evento|live|pos-evento|concluido
    brindes_json  TEXT DEFAULT '[]',     -- [{item, qtd_planejada, qtd_distribuida}]
    captura_json  TEXT DEFAULT '{}',     -- {leads, qualificados, deals, custo, obs}
    briefing_json TEXT DEFAULT '{}',     -- {mensagem_chave, speakers, materiais, obs}
    updated_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_field_status ON field_events(status);
  CREATE INDEX IF NOT EXISTS idx_field_data   ON field_events(data_evento);

  CREATE TABLE IF NOT EXISTS content_pipeline (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id   TEXT,                  -- link opcional com editorial_calendar
    titulo        TEXT NOT NULL,
    tema_keyword  TEXT,
    lob           TEXT,
    pilar         TEXT,
    persona_alvo  TEXT,
    autor         TEXT,
    estado        TEXT DEFAULT 'recebido', -- recebido|seo_geo|persona|copy_cta|carrossel|agendado|publicado
    corpo         TEXT DEFAULT '',
    seo_json      TEXT DEFAULT '{}',     -- {score, checklist:[{item,ok,nota}]}
    geo_json      TEXT DEFAULT '{}',     -- {score, checklist GEO/AIO/AEO/LLMO}
    copy_text     TEXT DEFAULT '',
    cta_sugerido  TEXT DEFAULT '',
    carrossel_url TEXT DEFAULT '',
    agendado_para TEXT,
    publicado_em  TEXT,
    url_publicado TEXT DEFAULT '',
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_content_estado ON content_pipeline(estado);
`);

// Migração clientes_sap_4me: PK antiga era projeto_id (não-único → colapsava 705→500
// pacotes). Agora pkg_id (id-pacote). Dado é espelho re-sincronizável → drop+recreate.
(function migrateSap4me() {
  try {
    const cols = db.prepare("PRAGMA table_info(clientes_sap_4me)").all();
    const hasPkgId = cols.some(c => c.name === 'pkg_id');
    if (!hasPkgId) {
      db.exec('DROP TABLE IF EXISTS clientes_sap_4me');
      db.exec(`
        CREATE TABLE clientes_sap_4me (
          pkg_id TEXT PRIMARY KEY, projeto_id TEXT, conta_parceiro TEXT, nome_cliente TEXT,
          pais TEXT, area_subsolucao TEXT, pacotes TEXT, escopo_pacote TEXT, etapa TEXT,
          data_kickoff TEXT, golive_planejado TEXT, golive_confirmado TEXT,
          relevante_nivel TEXT, gerente_projeto TEXT, synced_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_sap4me_pais  ON clientes_sap_4me(pais);
        CREATE INDEX idx_sap4me_etapa ON clientes_sap_4me(etapa);
        CREATE INDEX idx_sap4me_area  ON clientes_sap_4me(area_subsolucao);
      `);
      console.log('[migrate] clientes_sap_4me recriada com PK pkg_id (re-sync necessário)');
    }
  } catch (e) { console.warn('[migrate] sap4me:', e.message); }
})();

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
// Persistência: em produção (não-local) o DB SÓ persiste entre deploys se DATA_DIR
// apontar para um Railway Volume montado (ex: /data). Sem isso, reseta a cada push.
if (!IS_LOCAL_DEV) {
  if (process.env.DATA_DIR && process.env.DATA_DIR.startsWith('/')) {
    console.log(`[boot] ✅ Persistência: usando volume DATA_DIR=${process.env.DATA_DIR}`);
  } else {
    console.warn('[boot] ⚠️  ATENÇÃO: DATA_DIR não setado para volume — SQLite vai RESETAR a cada deploy! Monte um Railway Volume e set DATA_DIR=/data.');
  }
}

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
app.use(express.json({ limit: '4mb' })); // 4mb cobre syncs grandes (SAP 4 ME 705 projetos ~370KB)

// ── SSO MICROSOFT (Entra ID) — Opcao A: qualquer dominio em SSO_ALLOWED_DOMAINS ──
const session = IS_LOCAL_DEV ? require(localModules + '/express-session') : require('express-session');
let msalNode = null;
try { msalNode = IS_LOCAL_DEV ? require(localModules + '/@azure/msal-node') : require('@azure/msal-node'); }
catch(e){ console.warn('[sso] @azure/msal-node ausente:', e.message); }

const SSO_ENABLED = !!(msalNode && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID);
const SSO_REDIRECT = IS_LOCAL_DEV
  ? (process.env.AZURE_REDIRECT_URI_DEV || ('http://localhost:' + PORT + '/auth/callback'))
  : (process.env.AZURE_REDIRECT_URI || 'https://epiuse-voices-optimizer.up.railway.app/auth/callback');
const SSO_DOMAINS = (process.env.SSO_ALLOWED_DOMAINS || 'epiuse.com.br').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const SSO_SCOPES = ['openid', 'profile', 'email', 'User.Read', 'offline_access'];

let sessionStore;
try {
  const SQLiteStore = (IS_LOCAL_DEV ? require(localModules + '/connect-sqlite3') : require('connect-sqlite3'))(session);
  sessionStore = new SQLiteStore({ db: 'sessions.sqlite', dir: DB_DIR });
} catch(e){ console.warn('[sso] connect-sqlite3 ausente, usando MemoryStore:', e.message); sessionStore = undefined; }

app.use(session({
  name: 'eubr.sid',
  secret: process.env.SESSION_SECRET || 'dev-insecure-trocar',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { httpOnly: true, sameSite: 'lax', secure: !IS_LOCAL_DEV, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

let msalClient = null;
if (SSO_ENABLED) {
  msalClient = new msalNode.ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/' + process.env.AZURE_TENANT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET
    }
  });
  console.log('[sso] Microsoft SSO ATIVO · redirect=' + SSO_REDIRECT + ' · dominios=' + SSO_DOMAINS.join(','));
} else {
  console.log('[sso] Microsoft SSO inativo (faltam credenciais ou modulo)');
}

app.get('/api/auth/status', (req, res) => {
  const u = req.session && req.session.user;
  res.json({ enabled: SSO_ENABLED, enforce: process.env.SSO_ENFORCE === 'true', authenticated: !!u, user: u || null });
});

app.get('/auth/login', async (req, res) => {
  if (!SSO_ENABLED) return res.status(503).send('SSO Microsoft nao configurado neste ambiente.');
  try {
    req.session.returnTo = req.query.returnTo || '/dashboard';
    const url = await msalClient.getAuthCodeUrl({ scopes: SSO_SCOPES, redirectUri: SSO_REDIRECT, prompt: 'select_account' });
    res.redirect(url);
  } catch(e){ console.error('[sso] login err', e); res.status(500).send('Erro ao iniciar login: ' + e.message); }
});

app.get('/auth/callback', async (req, res) => {
  if (!SSO_ENABLED) return res.status(503).send('SSO nao configurado.');
  if (req.query.error) return res.status(400).send('Login negado pelo Microsoft: ' + (req.query.error_description || req.query.error));
  try {
    const r = await msalClient.acquireTokenByCode({ code: req.query.code, scopes: SSO_SCOPES, redirectUri: SSO_REDIRECT });
    const acc = r.account || {};
    const claims = r.idTokenClaims || {};
    const email = (acc.username || claims.preferred_username || claims.email || '').toLowerCase();
    const domain = email.split('@')[1] || '';
    if (SSO_DOMAINS.length && !SSO_DOMAINS.includes(domain)) {
      return req.session.destroy(() => res.status(403).send('Acesso restrito a EPI-USE. O dominio "' + domain + '" nao esta autorizado.'));
    }
    req.session.user = {
      email,
      name: acc.name || claims.name || email,
      given: claims.given_name || '',
      oid: acc.homeAccountId || claims.oid || null,
      loginAt: new Date().toISOString()
    };
    const back = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(back);
  } catch(e){ console.error('[sso] callback err', e); res.status(500).send('Erro no callback do login: ' + e.message); }
});

// RD Station OAuth2 callback — captura ?code= e troca por refresh_token (1x)
app.get('/auth/rd-callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('faltou ?code= na URL');
  if (!process.env.RD_CLIENT_ID || !process.env.RD_CLIENT_SECRET) {
    return res.status(503).send('RD_CLIENT_ID/RD_CLIENT_SECRET nao definidos no servidor');
  }
  try {
    const rd = require(path.join(__dirname, 'scripts/integrations/rd_fetch.js'));
    const tokens = await rd.exchangeCodeForTokens(code);
    rd.writeTokens({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      atualizado_em: new Date().toISOString(),
    });
    res.send(`<h1>RD conectado OK</h1>
      <p>refresh_token salvo em <code>${rd.TOKENS_PATH}</code>.</p>
      <p><b>Importante:</b> copie o refresh_token abaixo e adicione como env var <code>RD_REFRESH_TOKEN</code> no Railway (depois disso o token salvo em arquivo deixa de ser necessario):</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:6px;word-wrap:break-word;white-space:pre-wrap">${tokens.refresh_token}</pre>
      <p>Em seguida, rode <code>POST /api/relatorio/rd-refresh</code> com X-Editor-Token pra popular o snapshot.</p>`);
  } catch (e) {
    res.status(500).send('Erro trocando code por token: ' + e.message);
  }
});

// POST /api/relatorio/rd-refresh — dispara fetch real e atualiza rd-snapshot.json
app.post('/api/relatorio/rd-refresh', requireEditorToken, async (req, res) => {
  try {
    const rd = require(path.join(__dirname, 'scripts/integrations/rd_fetch.js'));
    const out = await rd.fetchRD();
    res.json({
      success: true,
      segmentations: out.segmentations?.total ?? null,
      workflows: out.workflows?.total ?? null,
      workflows_ativos: out.workflows?.ativos ?? null,
      forms: out.forms?.total ?? null,
      landing_pages: out.landing_pages?.total ?? null,
      emails: out.emails?.total ?? null,
      atualizado_em: out.atualizado_em,
      errors: out.errors || [],
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/auth/logout', (req, res) => {
  const base = IS_LOCAL_DEV ? ('http://localhost:' + PORT) : (process.env.APP_BASE_URL || 'https://epiuse-voices-optimizer.up.railway.app');
  req.session.destroy(() => {
    if (SSO_ENABLED) {
      res.redirect('https://login.microsoftonline.com/' + process.env.AZURE_TENANT_ID +
        '/oauth2/v2.0/logout?post_logout_redirect_uri=' + encodeURIComponent(base + '/dashboard'));
    } else res.redirect('/dashboard');
  });
});

// middleware opcional — so bloqueia se SSO_ENFORCE=true (migracao segura: default off)
function requireAuth(req, res, next) {
  if (process.env.SSO_ENFORCE !== 'true' || !SSO_ENABLED) return next();
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'auth_required' });
  res.redirect('/auth/login?returnTo=' + encodeURIComponent(req.originalUrl));
}

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
app.get('/optimizer-v2', (req, res) => res.sendFile(path.join(__dirname, 'public/optimizer-v2.html')));

// SPRINT 9.1 — serve o template canônico do prompt (fonte da verdade no vault)
app.get('/api/optimizer/template', (req, res) => {
  try {
    const tplPath = path.join(__dirname, 'vault/00-contexto/prompts/kit-voice-template.md');
    if (!fs.existsSync(tplPath)) return res.status(404).type('text/plain').send('Template não encontrado em ' + tplPath);
    res.type('text/markdown; charset=utf-8').sendFile(tplPath);
  } catch (e) {
    res.status(500).type('text/plain').send('Erro: ' + e.message);
  }
});

// V2 — framework findskill.ai
app.get('/api/optimizer/template-v2', (req, res) => {
  try {
    const tplPath = path.join(__dirname, 'vault/00-contexto/prompts/kit-voice-template-v2.md');
    if (!fs.existsSync(tplPath)) return res.status(404).type('text/plain').send('Template V2 não encontrado em ' + tplPath);
    res.type('text/markdown; charset=utf-8').sendFile(tplPath);
  } catch (e) {
    res.status(500).type('text/plain').send('Erro: ' + e.message);
  }
});

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

// /api/version — single source of truth (lê current de public/api/changelog.json)
// nav/footer fetcham esse endpoint em runtime para evitar drift de versão.
app.get('/api/version', (req, res) => {
  try {
    const cl = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/api/changelog.json'), 'utf8'));
    // Diagnóstico de persistência (D1): volume Railway montado em DATA_DIR?
    const usandoVolume = !IS_LOCAL_DEV && !!process.env.DATA_DIR && process.env.DATA_DIR.startsWith('/');
    res.json({
      current: cl.current, atualizado_em: cl.atualizado_em,
      persistencia: {
        db_path: DB_PATH,
        data_dir: process.env.DATA_DIR || null,
        volume_ativo: usandoVolume,
        status: IS_LOCAL_DEV ? 'local-dev' : (usandoVolume ? 'volume-persistente' : 'efemero-reseta-no-deploy'),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/planilhas', (req, res) => res.sendFile(path.join(__dirname, 'public/planilhas.html')));

// ── PLANILHAS REGISTRY — todas as XLSX/XLS como API em tempo real ────────────
// Le do arquivo origem (Desktop/OneDrive/vault) on-demand · cache invalidado por mtime
// Cada planilha tem slug + lista de paths (primeiro que existir vence)
const PLANILHAS_REGISTRY_PATH = path.join(__dirname, 'vault/00-contexto/planilhas-registry.json');
const _planilhasCache = new Map(); // key: path · val: { mtime, json, parsedAt }

function _loadPlanilhasRegistry() {
  try { return JSON.parse(fs.readFileSync(PLANILHAS_REGISTRY_PATH, 'utf8')); }
  catch (e) { return { planilhas: [] }; }
}

function _resolvePath(paths) {
  if (!Array.isArray(paths)) return null;
  for (const p of paths) { if (fs.existsSync(p)) return p; }
  return null;
}

function _parsePlanilha(filePath, sheetIdx) {
  const XLSX = IS_LOCAL_DEV ? require(localModules + '/xlsx') : require('xlsx');
  const st = fs.statSync(filePath);
  const cached = _planilhasCache.get(filePath);
  if (cached && cached.mtime === st.mtimeMs) return cached.json;
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[sheetIdx || 0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const json = {
    sheet: sheetName,
    sheets_disponiveis: wb.SheetNames,
    total_linhas: rows.length,
    rows,
    arquivo: filePath,
    modificado_em: st.mtime,
    parseado_em: new Date().toISOString()
  };
  _planilhasCache.set(filePath, { mtime: st.mtimeMs, json, parsedAt: Date.now() });
  return json;
}

// GET /api/planilhas — lista todas + status de cada uma
app.get('/api/planilhas', (req, res) => {
  try {
    const reg = _loadPlanilhasRegistry();
    const status = reg.planilhas.map(p => {
      const resolved = _resolvePath(p.paths);
      const exists = !!resolved;
      let mtime = null, size = null;
      if (exists) { const st = fs.statSync(resolved); mtime = st.mtime; size = st.size; }
      return {
        slug: p.slug, nome: p.nome, dona: p.dona, categoria: p.categoria,
        descricao: p.descricao, endpoint: '/api/planilhas/' + p.slug,
        endpoint_alias: p.endpoint_alias || null,
        status: exists ? 'ok' : 'fora-do-ar',
        arquivo_resolvido: resolved,
        paths_tentados: p.paths,
        modificado_em: mtime, tamanho_bytes: size
      };
    });
    res.json({
      total: status.length,
      online: status.filter(s => s.status === 'ok').length,
      offline: status.filter(s => s.status === 'fora-do-ar').length,
      planilhas: status,
      obs: 'Cache invalidado automaticamente quando mtime do arquivo muda. Edita o XLSX no Desktop/OneDrive → proxima request ja pega versao nova.'
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/planilhas/:slug — retorna o JSON parsed da planilha
app.get('/api/planilhas/:slug', (req, res) => {
  try {
    const reg = _loadPlanilhasRegistry();
    const p = reg.planilhas.find(x => x.slug === req.params.slug);
    if (!p) return res.status(404).json({ error: 'planilha nao encontrada no registry', slug: req.params.slug });
    const resolved = _resolvePath(p.paths);
    if (!resolved) return res.status(404).json({ error: 'arquivo fora-do-ar', slug: p.slug, paths_tentados: p.paths });
    const sheetParam = req.query.sheet != null ? parseInt(req.query.sheet, 10) : (p.sheet || 0);
    const data = _parsePlanilha(resolved, sheetParam);
    res.json({ slug: p.slug, nome: p.nome, dona: p.dona, ...data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/sprints — alias historico para /api/planilhas/roadmap-pm (mantem compat /changelog)
app.get('/api/sprints', (req, res) => {
  try {
    const XLSX = IS_LOCAL_DEV ? require(localModules + '/xlsx') : require('xlsx');
    const sprintsPath = path.join(__dirname, 'public/api/sprints-pm.xlsx');
    const wb = XLSX.readFile(sprintsPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let headerIdx = rows.findIndex(r => String(r[0] || '').trim() === '#');
    if (headerIdx < 0) headerIdx = 1;
    const headers = (rows[headerIdx] || []).map(h => String(h || '').trim());
    const sprints = rows.slice(headerIdx + 1)
      .filter(r => r[0] && String(r[0]).trim())
      .map(r => Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), String(r[i] || '').trim()])));
    res.json({
      fonte: 'planilha PM do Ruda (atualizada via commit)',
      atualizado_em: fs.statSync(sprintsPath).mtime,
      total: sprints.length,
      sprints
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULOS POR AREA (v0.7.x — nav reorganizado por dona) ───────────────────
// /area/<id> -> template unico area.html (le /api/areas.json por id)
const AREA_PATH = path.join(__dirname, 'public/area.html');
app.get('/area', (req, res) => res.sendFile(AREA_PATH));
app.get('/area/:id', (req, res) => res.sendFile(AREA_PATH));

const AGENTES_PATH = path.join(__dirname, 'public/agentes.html');
const AGENTE_PATH  = path.join(__dirname, 'public/agente.html');
app.get('/agentes', (req, res) => res.sendFile(AGENTES_PATH));
app.get('/agentes/:slug', (req, res) => res.sendFile(AGENTE_PATH));
app.get('/war-room', (req, res) => res.sendFile(path.join(__dirname, 'public/war-room.html')));

// API: resumo de contadores de TODOS os workspaces (pra /agentes mostrar inbox count)
app.get('/api/agentes/_counters', (req, res) => {
  try {
    const wsRoot = path.join(__dirname, 'vault/workspaces');
    if (!fs.existsSync(wsRoot)) return res.json({});
    const out = {};
    fs.readdirSync(wsRoot).forEach(slug => {
      const dir = path.join(wsRoot, slug);
      if (!fs.statSync(dir).isDirectory()) return;
      const count = (sub) => {
        const d = path.join(dir, sub);
        if (!fs.existsSync(d)) return 0;
        return fs.readdirSync(d).filter(f => !f.startsWith('.') && !f.startsWith('_') && f.endsWith('.md')).length;
      };
      out[slug] = { inbox: count('inbox'), outbox: count('outbox') };
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST pedido no inbox do agente
app.post('/api/agentes/:slug/inbox', express.json(), (req, res) => {
  try {
    const slug = String(req.params.slug || '').replace(/[^a-z0-9-]/gi,'').toLowerCase();
    const { titulo, pedido, autor } = req.body || {};
    if (!titulo || !pedido) return res.status(400).json({ error: 'titulo e pedido sao obrigatorios' });
    const inboxDir = path.join(__dirname, 'vault/workspaces', slug, 'inbox');
    if (!fs.existsSync(inboxDir)) return res.status(404).json({ error: 'agente nao tem workspace' });
    const now = new Date();
    const stamp = now.toISOString().slice(0,10);
    const safeSlug = String(titulo).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
    const filename = stamp + '-' + safeSlug + '.md';
    const md = '# ' + titulo + '\n\n'
      + '> Pedido criado em ' + now.toISOString() + (autor?' por ' + autor:'') + '\n'
      + '> Status: 📥 inbox · aguardando agente `' + slug + '`\n\n'
      + '## Pedido\n\n' + pedido + '\n';
    fs.writeFileSync(path.join(inboxDir, filename), md, 'utf8');
    res.json({ ok: true, arquivo: filename, slug });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: workspace de um agente (inbox/outbox/_vt + entregas filtradas)
app.get('/api/agentes/:slug/workspace', (req, res) => {
  try {
    const slug = String(req.params.slug || '').replace(/[^a-z0-9-]/gi,'').toLowerCase();
    const wsDir = path.join(__dirname, 'vault/workspaces', slug);
    const out = { slug, inbox: [], outbox: [], vt: null, entregas: [] };
    if (!fs.existsSync(wsDir)) return res.status(404).json({ error: 'workspace nao encontrado', slug });
    const listDir = (sub) => {
      const dir = path.join(wsDir, sub);
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).filter(f => !f.startsWith('.') && !f.startsWith('_'))
        .map(f => {
          const st = fs.statSync(path.join(dir, f));
          return { nome: f, tamanho: st.size, modificado: st.mtime };
        }).sort((a,b) => new Date(b.modificado) - new Date(a.modificado));
    };
    out.inbox = listDir('inbox');
    out.outbox = listDir('outbox');
    const vtPath = path.join(wsDir, '_vt.md');
    if (fs.existsSync(vtPath)) {
      out.vt = fs.readFileSync(vtPath, 'utf8');
    }
    // entregas: filtrar por subdir que case com slug (criativos/lps/propostas/campanhas) OU prefixo do slug
    const entregasDir = path.join(__dirname, 'vault/entregas');
    if (fs.existsSync(entregasDir)) {
      const slugShort = slug.replace(/^area-/, '');
      const tryDirs = [slug, slugShort, slug.replace('-','')];
      for (const d of tryDirs) {
        const full = path.join(entregasDir, d);
        if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
          out.entregas = fs.readdirSync(full).filter(f => !f.startsWith('.'))
            .map(f => ({ nome: f, subdir: d }));
          break;
        }
      }
      // tambem busca arquivos na raiz que tenham o slug no nome
      const raiz = fs.readdirSync(entregasDir).filter(f => {
        const full = path.join(entregasDir, f);
        return fs.statSync(full).isFile() && f.toLowerCase().includes(slug.replace('area-',''));
      }).map(f => ({ nome: f, subdir: '(raiz)' }));
      out.entregas = out.entregas.concat(raiz);
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── MODULE PAINEL DA DUDA (sprint 15 · módulo 10 · 0.11.0) ─────────────────
// Áreas/agentes que a Duda toca (aprova, opera ou é dona)
const AREAS_DUDA = ['area-brand', 'criativos', 'landing-pages', 'pipe-capa', 'pipe-carrossel'];

function _listInboxOutbox(slug) {
  const dir = path.join(__dirname, 'vault/workspaces', slug);
  const out = { inbox: [], outbox: [] };
  ['inbox','outbox'].forEach(sub => {
    const subDir = path.join(dir, sub);
    if (!fs.existsSync(subDir)) return;
    out[sub] = fs.readdirSync(subDir)
      .filter(f => !f.startsWith('.') && !f.startsWith('_') && f.endsWith('.md'))
      .map(f => {
        const st = fs.statSync(path.join(subDir, f));
        return { agente: slug, tipo: sub, arquivo: f, modificado: st.mtime, tamanho: st.size };
      });
  });
  return out;
}

// Inbox Duda — feed dos workspaces das áreas dela
app.get('/api/painel/inbox-duda', (req, res) => {
  try {
    const out = { inbox: [], outbox: [], areas: AREAS_DUDA };
    AREAS_DUDA.forEach(slug => {
      const io = _listInboxOutbox(slug);
      out.inbox = out.inbox.concat(io.inbox);
      out.outbox = out.outbox.concat(io.outbox);
    });
    out.inbox.sort((a,b) => new Date(b.modificado) - new Date(a.modificado));
    out.outbox.sort((a,b) => new Date(b.modificado) - new Date(a.modificado));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Daily Digest — o que a Duda precisa olhar HOJE
app.get('/api/painel/digest', (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const sevenAgo = new Date(now); sevenAgo.setDate(sevenAgo.getDate() - 7);

    // pega voices
    let voicesData = { voices: [], programa: {} };
    try {
      voicesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/api/voices.json'), 'utf8'));
    } catch (e) {}

    const voices = voicesData.voices || [];
    const pendentes = voices.filter(v => v.pendencia || (v.dados_a_confirmar||[]).length > 0);
    const semBaseline = voices.filter(v => v.ssi_baseline == null);
    const sem_kit = voices.filter(v => !v.kit_pronto && !v.kit_status);

    // pega inboxes das áreas dela
    const inboxAreas = { hoje: 0, semana: 0, total: 0, novos_hoje: [] };
    AREAS_DUDA.forEach(slug => {
      const io = _listInboxOutbox(slug);
      io.inbox.forEach(item => {
        const m = new Date(item.modificado);
        inboxAreas.total++;
        if (m >= startOfDay) { inboxAreas.hoje++; inboxAreas.novos_hoje.push(item); }
        if (m >= sevenAgo) inboxAreas.semana++;
      });
    });
    inboxAreas.novos_hoje = inboxAreas.novos_hoje.slice(0, 8);

    // workflows ativos
    let workflowsAtivos = 0;
    try {
      if (fs.existsSync(COWORK_RUNS_DIR)) {
        const runs = fs.readdirSync(COWORK_RUNS_DIR).filter(f => f.endsWith('.json'));
        workflowsAtivos = runs.filter(f => {
          try { const r = JSON.parse(fs.readFileSync(path.join(COWORK_RUNS_DIR, f), 'utf8'));
                return new Date(r.criado_em) >= sevenAgo; }
          catch (e) { return false; }
        }).length;
      }
    } catch (e) {}

    res.json({
      gerado_em: now.toISOString(),
      cumprimento: _saudacao(now),
      voices_ativos: voices.length,
      voices_meta: voicesData.programa?.vagas_total || 5,
      pendencias: {
        total: pendentes.length + semBaseline.length,
        com_dados_provisorios: pendentes.length,
        sem_ssi_baseline: semBaseline.length,
        sem_kit: sem_kit.length,
        lista: pendentes.slice(0, 5).map(v => ({ id: v.id, nome: v.nome, motivo: v.pendencia || 'dados provisórios' }))
      },
      inbox_areas: inboxAreas,
      workflows_ativos_7d: workflowsAtivos,
      areas_duda: AREAS_DUDA
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function _saudacao(d) {
  const h = d.getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ── MODULE COWORK · workflows dinâmicos entre agentes (sprint 14 · 0.10.0) ──
const COWORK_PATH = path.join(__dirname, 'public/cowork.html');
app.get('/cowork', (req, res) => res.status(503).send('<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h2>Cowork temporariamente desabilitado</h2><p><a href="/">← Voltar</a></p></body></html>'));

const WORKFLOWS_DIR = path.join(__dirname, 'vault/workflows');
const COWORK_RUNS_DIR = path.join(__dirname, 'vault/cowork-runs');
if (!fs.existsSync(COWORK_RUNS_DIR)) fs.mkdirSync(COWORK_RUNS_DIR, { recursive: true });

function loadWorkflows() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8')); }
      catch (e) { return null; }
    })
    .filter(Boolean);
}

app.get('/api/workflows', (req, res) => res.status(503).json({ error: 'cowork desabilitado' }));

app.get('/api/workflows/:slug', (req, res) => res.status(503).json({ error: 'cowork desabilitado' }));

function fillTpl(tpl, vars) {
  return String(tpl || '').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] != null ? vars[k] : '');
}

app.post('/api/workflows/:slug/run', (req, res) => res.status(503).json({ error: 'cowork desabilitado' }));

app.get('/api/cowork/runs', (req, res) => res.status(503).json({ error: 'cowork desabilitado' }));

app.get('/api/cowork/atividade', (req, res) => res.status(503).json({ error: 'cowork desabilitado' }));

// ── MODULE H · METAS LINKEDIN (sprint 0.4.8 — apresentação corporativa) ─────
const METAS_PATH = path.join(__dirname, 'public/metas.html');
app.get('/metas', (req, res) => res.sendFile(METAS_PATH));

// GET metas (público — qualquer um do time vê os números)
app.get('/api/metas', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM metas_linkedin').all();
    const metas = {};
    for (const r of rows) {
      metas[r.area_id] = {
        seg_30d: r.seg_30d || '',
        seg_90d: r.seg_90d || '',
        eventos_q: r.eventos_q || '',
        acoes: r.acoes || ''
      };
    }
    res.json({ metas, updated_at: rows[0]?.updated_at || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST metas (protegido — só com EDITOR_TOKEN)
app.post('/api/metas', requireEditorToken, (req, res) => {
  const m = req.body?.metas || {};
  if (!Object.keys(m).length) return res.status(400).json({ success: false, error: 'metas{} vazio' });
  const upsert = db.prepare(`
    INSERT INTO metas_linkedin (area_id, seg_30d, seg_90d, eventos_q, acoes, updated_at)
    VALUES (@area_id, @seg_30d, @seg_90d, @eventos_q, @acoes, datetime('now'))
    ON CONFLICT(area_id) DO UPDATE SET
      seg_30d=excluded.seg_30d, seg_90d=excluded.seg_90d,
      eventos_q=excluded.eventos_q, acoes=excluded.acoes,
      updated_at=datetime('now')
  `);
  let n = 0;
  db.transaction(() => {
    for (const [area_id, data] of Object.entries(m)) {
      upsert.run({
        area_id,
        seg_30d: data.seg_30d ? parseInt(data.seg_30d, 10) : null,
        seg_90d: data.seg_90d ? parseInt(data.seg_90d, 10) : null,
        eventos_q: data.eventos_q ? parseInt(data.eventos_q, 10) : null,
        acoes: String(data.acoes || '').slice(0, 5000)
      });
      n++;
    }
  })();
  res.json({ success: true, upserted: n });
});

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
    // KPIs agregados — combina schema CS clássico (live/onboarding/churn-risk) + Customer Reference do Roberto (case-publicado/em-edicao/negociacao/declinado)
    const all = db.prepare('SELECT status, nps, case_publicavel FROM cs_clientes').all();
    const kpis = {
      total: all.length,
      // CS clássico
      live: all.filter(r => r.status === 'live').length,
      churn_risk: all.filter(r => r.status === 'churn-risk').length,
      onboarding: all.filter(r => r.status === 'onboarding').length,
      // Customer Reference (planilha Roberto)
      case_publicado: all.filter(r => r.status === 'case-publicado').length,
      em_edicao: all.filter(r => r.status === 'em-edicao').length,
      negociacao: all.filter(r => r.status === 'negociacao').length,
      declinado: all.filter(r => r.status === 'declinado').length,
      // Cross
      publicaveis: all.filter(r => r.case_publicavel === 1).length,
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

// v0.4.5 — Sync direto do OneDrive local (chama scripts/sync/sync_cases_roberto.py)
// Vantagem: 1 click no /cases atualiza tudo, sem precisar rodar curl manual.
// Roda local apenas (OneDrive sync precisa estar montado em C:\Users\...\OneDrive...).
// Em produção (Railway), retorna 503 — fonte de verdade lá deve vir via Graph API pós-SSO v0.5.0.
app.post('/api/cases/sync-from-onedrive', requireEditorToken, (req, res) => {
  const { spawn } = require('child_process');
  const scriptPath = path.join(__dirname, 'scripts', 'sync', 'sync_cases_roberto.py');
  if (!fs0.existsSync(scriptPath)) {
    return res.status(503).json({ success: false, error: `Script não encontrado: ${scriptPath}. Esta rota só funciona em ambiente local com Python + OneDrive sync.` });
  }

  // Detecta python (no Windows pode ser "python" ou "py")
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const py = spawn(pythonCmd, [scriptPath], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  let stdout = '', stderr = '';
  py.stdout.on('data', d => stdout += d.toString('utf8'));
  py.stderr.on('data', d => stderr += d.toString('utf8'));
  py.on('error', err => res.status(500).json({ success: false, error: `Falha ao invocar Python: ${err.message}` }));
  py.on('close', code => {
    if (code !== 0) {
      return res.status(500).json({ success: false, error: `Python exit code ${code}`, stderr: stderr.slice(0, 1000) });
    }
    let payload;
    try { payload = JSON.parse(stdout); }
    catch (e) { return res.status(500).json({ success: false, error: `JSON inválido do script: ${e.message}`, raw: stdout.slice(0, 500) }); }
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!items.length) return res.json({ success: true, upserted: 0, note: 'Script retornou 0 itens.' });

    // Reusa o upsert do endpoint /api/cases/sync
    const upsert = db.prepare(`
      INSERT INTO cs_clientes (sharepoint_id, conta, cliente_nome, contato_principal, contato_email, csm, lob, status, nps, valor_anual, ultimo_contato, observacoes, case_publicavel, case_resumo, synced_at)
      VALUES (@sharepoint_id, @conta, @cliente_nome, @contato_principal, @contato_email, @csm, @lob, @status, @nps, @valor_anual, @ultimo_contato, @observacoes, @case_publicavel, @case_resumo, datetime('now'))
      ON CONFLICT(sharepoint_id) DO UPDATE SET
        conta=excluded.conta, cliente_nome=excluded.cliente_nome,
        contato_principal=excluded.contato_principal, contato_email=excluded.contato_email,
        csm=excluded.csm, lob=excluded.lob, status=excluded.status, nps=excluded.nps,
        valor_anual=excluded.valor_anual, ultimo_contato=excluded.ultimo_contato,
        observacoes=excluded.observacoes, case_publicavel=excluded.case_publicavel,
        case_resumo=excluded.case_resumo,
        synced_at=datetime('now'), updated_at=datetime('now')
    `);
    let n = 0;
    db.transaction(() => {
      for (const it of items) {
        try { upsert.run(it); n++; }
        catch (e) { console.warn('[sync-from-onedrive] item falhou:', e.message); }
      }
    })();
    res.json({ success: true, upserted: n, total_received: items.length, fonte: 'OneDrive local (script Python)' });
  });
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
  const ins = db.prepare(`INSERT OR IGNORE INTO cs_clientes (sharepoint_id, conta, cliente_nome, contato_principal, contato_email, csm, lob, status, nps, valor_anual, ultimo_contato, observacoes, case_publicavel, case_resumo, synced_at) VALUES (@sharepoint_id, @conta, @cliente_nome, @contato_principal, @contato_email, @csm, @lob, @status, @nps, @valor_anual, @ultimo_contato, @observacoes, @case_publicavel, @case_resumo, datetime('now'))`);
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
// Studio foi mergeado no Carrossel via mode=single (v0.4.4) — preserva URL antiga via 301
app.get('/inbound/studio',    (req, res) => res.redirect(301, '/inbound/carousel?mode=single'));
app.get('/inbound/carousel',  (req, res) => res.sendFile(path.join(INBOUND_DIR, 'carousel.html')));
app.get('/inbound/playbook',       (req, res) => res.sendFile(path.join(INBOUND_DIR, 'playbook.html')));
app.get('/inbound/zoho-pipeline', (req, res) => res.sendFile(path.join(INBOUND_DIR, 'zoho-pipeline.html')));
app.get('/clientes-sap-4me', (req, res) => res.sendFile(path.join(__dirname, 'public/clientes-sap-4me.html')));
app.get('/field-marketing', (req, res) => res.sendFile(path.join(__dirname, 'public/field-marketing.html')));
app.get('/content-pipeline', (req, res) => res.sendFile(path.join(__dirname, 'public/content-pipeline.html')));
app.get('/development-funds', (req, res) => res.sendFile(path.join(__dirname, 'public/development-funds.html')));

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

// RD Station → Calendar editorial (sprint v0.4.3)
// IMPORTANTE: a API key precisa ser uma "Personal/Account API token" da conta RD Station EPI-USE
// (gerada em Configurações → Integrações → API), NÃO uma publisher key da App Marketplace.
// Endpoints públicos da RD: https://developers.rdstation.com/reference
//
// Fluxo:
//   1. Tenta endpoints possíveis (email_campaigns, landing_pages, popups)
//   2. Mapeia cada item pra schema editorial_calendar
//   3. Persiste via INSERT...ON CONFLICT(external_id) DO UPDATE
//   4. Retorna estatísticas

async function fetchRDPaginated(url, token, maxPages = 5) {
  const results = [];
  let next = url;
  for (let i = 0; i < maxPages && next; i++) {
    const r = await fetch(next, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`RD HTTP ${r.status} em ${next.split('/').slice(-2).join('/')}: ${body.slice(0,200)}`);
    }
    const data = await r.json();
    const items = Array.isArray(data) ? data : (data.items || data.email_marketing || data.email_campaigns || data.landing_pages || data.popups || []);
    results.push(...items);
    next = data?.next_page_url || data?.paging?.next || null;
  }
  return results;
}

function mapRDItem(item, fonte) {
  // Tenta múltiplos campos pq cada endpoint RD tem schema diferente
  const id = item.id || item.uuid || item.identifier;
  const data = (item.scheduled_at || item.sent_at || item.published_at || item.created_at || '').slice(0,10);
  if (!id || !data) return null;
  return {
    external_id: `rd-${fonte}-${id}`,
    fonte: 'rd-station',
    data,
    canal: fonte.includes('email') ? 'email' : fonte.includes('landing') ? 'landing-page' : (fonte.includes('popup') ? 'popup' : 'rd'),
    autor: item.from_name || item.created_by_name || 'RD Station',
    titulo: (item.subject || item.name || item.title || '(sem título)').slice(0, 200),
    resumo: (item.preheader || item.description || '').slice(0, 500),
    pilar: fonte.includes('email') ? 'Email Marketing' : fonte.includes('landing') ? 'Conversão' : 'RD Station',
    status: item.status === 'sent' || item.is_published ? 'published' : 'planned',
    url_post: item.url || item.public_url || ''
  };
}

app.post('/api/inbound/sync-rd', requireEditorToken, async (req, res) => {
  if (!process.env.RD_API_KEY) {
    return res.status(503).json({ success: false, error: 'RD_API_KEY não configurada no env.' });
  }
  const token = process.env.RD_API_KEY;
  const tried = [];
  const allItems = [];

  // Endpoints conhecidos da RD pra puxar conteúdo agendado/publicado
  const sources = [
    { url: 'https://api.rd.services/platform/email_marketing/emails', fonte: 'email' },
    { url: 'https://api.rd.services/platform/landing_pages', fonte: 'landing-pages' },
    { url: 'https://api.rd.services/platform/popups', fonte: 'popups' },
  ];

  for (const src of sources) {
    try {
      const items = await fetchRDPaginated(src.url, token);
      tried.push({ endpoint: src.fonte, fetched: items.length, ok: true });
      for (const it of items) {
        const mapped = mapRDItem(it, src.fonte);
        if (mapped) allItems.push(mapped);
      }
    } catch (e) {
      tried.push({ endpoint: src.fonte, ok: false, error: e.message });
    }
  }

  // Persiste no SQLite via upsert
  let upserted = 0;
  if (allItems.length) {
    const upsert = db.prepare(`
      INSERT INTO editorial_calendar (external_id, fonte, data, canal, autor, titulo, resumo, pilar, status, url_post, synced_at)
      VALUES (@external_id, @fonte, @data, @canal, @autor, @titulo, @resumo, @pilar, @status, @url_post, datetime('now'))
      ON CONFLICT(external_id) DO UPDATE SET
        data=excluded.data, canal=excluded.canal, autor=excluded.autor,
        titulo=excluded.titulo, resumo=excluded.resumo, pilar=excluded.pilar,
        status=excluded.status, url_post=excluded.url_post,
        synced_at=datetime('now'), updated_at=datetime('now')
    `);
    db.transaction(() => { allItems.forEach(i => upsert.run(i)); })();
    upserted = allItems.length;
  }

  const successCount = tried.filter(t => t.ok).length;
  if (successCount === 0) {
    return res.status(502).json({
      success: false,
      error: 'Nenhum endpoint RD respondeu OK. A RD_API_KEY pode ser uma publisher key da App Marketplace (não funciona pra ler dados de conta). Gere uma "Personal/Account API token" no painel RD Station EPI-USE: Configurações → Integrações → API.',
      tried
    });
  }

  res.json({
    success: true,
    fetched_total: allItems.length,
    upserted,
    sources_ok: successCount,
    sources_total: tried.length,
    tried
  });
});

// ── MODULE ZOHO PIPELINE (v0.27.0) ──────────────────────────────────────────
// GET  /api/zoho/pipeline   — agregações por período/dimensão (sem auth)
// POST /api/zoho/sync       — upsert de deals (editor token)

app.get('/api/zoho/pipeline', (req, res) => {
  try {
    const src = req.query.source || 'all'; // mkt | sdr | all
    const srcFilter = src === 'mkt' ? "AND opportunity_source = 'MKT (EPI-USE)'"
                    : src === 'sdr' ? "AND opportunity_source = 'SDR'"
                    : '';

    const now = new Date();
    const y   = now.getUTCFullYear();
    const m   = now.getUTCMonth(); // 0-based

    // período helpers
    const iso = (d) => d.toISOString().slice(0,10);
    const thisMthStart  = iso(new Date(Date.UTC(y, m, 1)));
    const lastMthStart  = iso(new Date(Date.UTC(y, m-1, 1)));
    const lastMthEnd    = iso(new Date(Date.UTC(y, m, 0)));
    const qStart = iso(new Date(Date.UTC(y, Math.floor(m/3)*3 - 3, 1)));
    const qEnd   = iso(new Date(Date.UTC(y, Math.floor(m/3)*3, 0)));
    const fyStart = iso(new Date(Date.UTC(y-1, 0, 1))); // último FY = ano ant completo
    const fyEnd   = iso(new Date(Date.UTC(y-1, 11, 31)));
    const since24 = iso(new Date(Date.UTC(y, m-24, 1)));

    const sumQ = (from, to) =>
      db.prepare(`SELECT COALESCE(SUM(valor),0) as s FROM zoho_deals WHERE data_criacao >= ? AND data_criacao <= ? ${srcFilter}`).get(from, to)?.s || 0;

    const kpis = {
      este_mes:     { label: 'Este mês',        valor: sumQ(thisMthStart, iso(now)) },
      ultimo_mes:   { label: 'Último mês',       valor: sumQ(lastMthStart, lastMthEnd) },
      ultimo_q:     { label: 'Último quarter',   valor: sumQ(qStart, qEnd) },
      ultimo_fy:    { label: 'Último FY',        valor: sumQ(fyStart, fyEnd) },
    };

    const porCampanha = db.prepare(
      `SELECT campanha, SUM(valor) as total, COUNT(*) as deals
       FROM zoho_deals WHERE data_criacao >= ? ${srcFilter}
       GROUP BY campanha ORDER BY total DESC LIMIT 20`
    ).all(since24);

    const porSolution = db.prepare(
      `SELECT solution, SUM(valor) as total, COUNT(*) as deals
       FROM zoho_deals WHERE solution IS NOT NULL AND solution != '' ${srcFilter}
       GROUP BY solution ORDER BY deals DESC LIMIT 15`
    ).all();

    const porDealScope = db.prepare(
      `SELECT deal_scope, SUM(valor) as total, COUNT(*) as deals
       FROM zoho_deals WHERE deal_scope IS NOT NULL AND deal_scope != '' ${srcFilter}
       GROUP BY deal_scope ORDER BY deals DESC LIMIT 20`
    ).all();

    const porMes = db.prepare(
      `SELECT substr(data_criacao,1,7) as mes, SUM(valor) as total, COUNT(*) as deals
       FROM zoho_deals WHERE data_criacao >= ? ${srcFilter}
       GROUP BY mes ORDER BY mes ASC`
    ).all(since24);

    const lastSync = db.prepare('SELECT MAX(synced_at) as s FROM zoho_deals').get()?.s || null;
    const totalDeals = db.prepare(`SELECT COUNT(*) as n FROM zoho_deals WHERE 1=1 ${srcFilter}`).get()?.n || 0;

    res.json({ kpis, por_campanha: porCampanha, por_solution: porSolution, por_deal_scope: porDealScope, por_mes: porMes, last_sync: lastSync, total_deals: totalDeals, source_filter: src });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/zoho/sync', requireEditorToken, (req, res) => {
  const items = Array.isArray(req.body?.deals) ? req.body.deals : [];
  if (!items.length) return res.status(400).json({ success: false, error: 'deals[] vazio.' });
  const upsert = db.prepare(`
    INSERT INTO zoho_deals (deal_id, conta, nome_deal, valor, stage, campanha, solution, deal_scope, opportunity_source, data_criacao, data_fechamento, synced_at)
    VALUES (@deal_id, @conta, @nome_deal, @valor, @stage, @campanha, @solution, @deal_scope, @opportunity_source, @data_criacao, @data_fechamento, datetime('now'))
    ON CONFLICT(deal_id) DO UPDATE SET
      conta=excluded.conta, nome_deal=excluded.nome_deal, valor=excluded.valor,
      stage=excluded.stage, campanha=excluded.campanha, solution=excluded.solution,
      deal_scope=excluded.deal_scope, opportunity_source=excluded.opportunity_source,
      data_criacao=excluded.data_criacao, data_fechamento=excluded.data_fechamento,
      synced_at=datetime('now')
  `);
  let n = 0;
  db.transaction((arr) => {
    for (const it of arr) {
      try {
        upsert.run({
          deal_id:            String(it.deal_id || it.id || '').slice(0,100),
          conta:              String(it.conta || '').slice(0,200),
          nome_deal:          String(it.nome_deal || it.Deal_Name || '').slice(0,300),
          valor:              parseFloat(it.valor ?? it.Amount ?? 0) || 0,
          stage:              String(it.stage || it.Stage || '').slice(0,100),
          campanha:           String(it.campanha || it.Lead_Source || '').slice(0,200),
          solution:           String(it.solution || '').slice(0,200),
          deal_scope:         String(it.deal_scope || '').slice(0,200),
          opportunity_source: String(it.opportunity_source || '').slice(0,100),
          data_criacao:       String(it.data_criacao || it.Created_Time || '').slice(0,10),
          data_fechamento:    String(it.data_fechamento || it.Closing_Date || '').slice(0,10),
        });
        n++;
      } catch (e) { console.warn('[zoho-sync] upsert falhou:', e.message); }
    }
  })(items);
  res.json({ success: true, upserted: n, total: items.length });
});

// ── CLIENTES SAP 4 ME (705 projetos globais) ─────────────────────────────────
app.post('/api/clientes-sap-4me/sync', requireEditorToken, (req, res) => {
  const items = Array.isArray(req.body?.clientes) ? req.body.clientes : [];
  if (!items.length) return res.status(400).json({ success: false, error: 'clientes[] vazio.' });
  // Substituição completa (espelho da planilha) — limpa e reinsere
  const upsert = db.prepare(`
    INSERT INTO clientes_sap_4me (pkg_id, projeto_id, conta_parceiro, nome_cliente, pais, area_subsolucao, pacotes, escopo_pacote, etapa, data_kickoff, golive_planejado, golive_confirmado, relevante_nivel, gerente_projeto, synced_at)
    VALUES (@pkg_id, @projeto_id, @conta_parceiro, @nome_cliente, @pais, @area_subsolucao, @pacotes, @escopo_pacote, @etapa, @data_kickoff, @golive_planejado, @golive_confirmado, @relevante_nivel, @gerente_projeto, datetime('now'))
    ON CONFLICT(pkg_id) DO UPDATE SET
      projeto_id=excluded.projeto_id, conta_parceiro=excluded.conta_parceiro, nome_cliente=excluded.nome_cliente, pais=excluded.pais,
      area_subsolucao=excluded.area_subsolucao, pacotes=excluded.pacotes, escopo_pacote=excluded.escopo_pacote,
      etapa=excluded.etapa, data_kickoff=excluded.data_kickoff, golive_planejado=excluded.golive_planejado,
      golive_confirmado=excluded.golive_confirmado, relevante_nivel=excluded.relevante_nivel,
      gerente_projeto=excluded.gerente_projeto, synced_at=datetime('now')
  `);
  let n = 0;
  db.transaction((arr) => {
    for (const it of arr) {
      try {
        upsert.run({
          pkg_id:            String(it.pkg_id || it.projeto_id || '').slice(0,120),
          projeto_id:        String(it.projeto_id || '').slice(0,100),
          conta_parceiro:    String(it.conta_parceiro || '').slice(0,200),
          nome_cliente:      String(it.nome_cliente || '').slice(0,300),
          pais:              String(it.pais || '').slice(0,100),
          area_subsolucao:   String(it.area_subsolucao || '').slice(0,300),
          pacotes:           String(it.pacotes || '').slice(0,100),
          escopo_pacote:     String(it.escopo_pacote || '').slice(0,300),
          etapa:             String(it.etapa || '').slice(0,60),
          data_kickoff:      it.data_kickoff ? String(it.data_kickoff).slice(0,10) : null,
          golive_planejado:  it.golive_planejado ? String(it.golive_planejado).slice(0,10) : null,
          golive_confirmado: it.golive_confirmado ? String(it.golive_confirmado).slice(0,10) : null,
          relevante_nivel:   String(it.relevante_nivel || '').slice(0,20),
          gerente_projeto:   String(it.gerente_projeto || '').slice(0,200),
        });
        n++;
      } catch (e) { console.warn('[sap4me-sync] upsert falhou:', e.message); }
    }
  })(items);
  res.json({ success: true, upserted: n, total_received: items.length });
});

app.get('/api/clientes-sap-4me', (req, res) => {
  try {
    const all = db.prepare('SELECT * FROM clientes_sap_4me').all();
    const total = all.length;
    if (!total) return res.json({ total: 0, kpis: {}, by_pais: [], by_etapa: [], by_area: [], proximos_golive: [], kickoffs_recentes: [], list: [], last_sync: null });

    const count = (pred) => all.filter(pred).length;
    const live = count(c => c.etapa === 'Live');
    const impl = count(c => c.etapa === 'Implementing');
    const notStarted = count(c => c.etapa === 'Not Started');
    const onHold = count(c => c.etapa === 'On hold');

    // Próximos go-lives (planejado >= hoje, ordena asc) — usa confirmado se houver, senão planejado
    const hoje = new Date().toISOString().slice(0,10);
    const em90 = new Date(Date.now() + 90*86400000).toISOString().slice(0,10);
    const proximos = all
      .map(c => ({ ...c, golive: c.golive_confirmado || c.golive_planejado }))
      .filter(c => c.golive && c.golive >= hoje && c.golive <= em90 && c.etapa !== 'Live')
      .sort((a,b) => a.golive.localeCompare(b.golive))
      .slice(0, 20)
      .map(c => ({ nome_cliente: c.nome_cliente, pais: c.pais, area: c.area_subsolucao, golive: c.golive, etapa: c.etapa }));

    // Kick-offs recentes (últimos 90 dias)
    const desde90 = new Date(Date.now() - 90*86400000).toISOString().slice(0,10);
    const kickoffs = all
      .filter(c => c.data_kickoff && c.data_kickoff >= desde90 && c.data_kickoff <= hoje)
      .sort((a,b) => b.data_kickoff.localeCompare(a.data_kickoff))
      .slice(0, 20)
      .map(c => ({ nome_cliente: c.nome_cliente, pais: c.pais, area: c.area_subsolucao, kickoff: c.data_kickoff }));

    const agrupa = (campo) => {
      const m = {};
      for (const c of all) { const k = c[campo] || '(vazio)'; m[k] = (m[k]||0)+1; }
      return Object.entries(m).map(([k,v]) => ({ label: k, count: v })).sort((a,b) => b.count - a.count);
    };

    const last = db.prepare('SELECT MAX(synced_at) AS s FROM clientes_sap_4me').get();

    res.json({
      total,
      kpis: { live, implementing: impl, not_started: notStarted, on_hold: onHold,
              golive_90d: proximos.length, kickoffs_90d: kickoffs.length,
              brasil: count(c => c.pais === 'Brazil'), relevante_nivel: count(c => c.relevante_nivel === 'Yes') },
      by_pais: agrupa('pais'),
      by_etapa: agrupa('etapa'),
      by_area: agrupa('area_subsolucao').slice(0, 12),
      proximos_golive: proximos,
      kickoffs_recentes: kickoffs,
      list: all.map(c => ({ projeto_id: c.projeto_id, nome_cliente: c.nome_cliente, pais: c.pais,
              area: c.area_subsolucao, etapa: c.etapa, kickoff: c.data_kickoff,
              golive: c.golive_confirmado || c.golive_planejado, gerente: c.gerente_projeto })),
      last_sync: last?.s || null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FIELD MARKETING (eventos events.json + enriquecimento SQLite) ────────────
function _slugifyEvent(aba, ev) {
  const n = String(ev.n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${aba}-${ev.m}-${n}`;
}
function _eventISO(ev, ano) {
  if (!ev.m || !ev.d || ev.d === 'TBC') return null;
  const dia = String(ev.d).split('-')[0].trim();
  if (!/^\d+$/.test(dia)) return null;
  return `${ano}-${String(ev.m).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
}

app.get('/api/field-marketing', (req, res) => {
  try {
    const events = JSON.parse(fs0.readFileSync(path.join(__dirname, 'public/api/events.json'), 'utf8'));
    const ano = events.ano || new Date().getFullYear();
    const enrich = {};
    for (const r of db.prepare('SELECT * FROM field_events').all()) enrich[r.event_id] = r;

    const lista = [];
    for (const [aba, conteudo] of Object.entries(events.abas || {})) {
      for (const ev of (conteudo.eventos || [])) {
        const id = _slugifyEvent(aba, ev);
        const e = enrich[id] || {};
        let captura = {}; try { captura = JSON.parse(e.captura_json || '{}'); } catch {}
        lista.push({
          event_id: id, regiao: aba, nome: ev.n, lob: ev.lob, who: ev.who,
          pais: ev.country, flag: ev.flag, mes: ev.m, dia: ev.d,
          data_evento: e.data_evento || _eventISO(ev, ano),
          status: e.status || 'planejamento',
          local: e.local || '', responsavel: e.responsavel || '', porte: e.porte || '',
          orcamento: e.orcamento || 0, captura,
          tem_briefing: !!(e.briefing_json && e.briefing_json !== '{}'),
        });
      }
    }
    // KPIs
    const byStatus = {};
    for (const e of lista) byStatus[e.status] = (byStatus[e.status]||0)+1;
    const comCaptura = lista.filter(e => e.captura && (e.captura.leads || e.captura.deals));
    const totLeads = comCaptura.reduce((s,e)=>s+(+e.captura.leads||0),0);
    const totQual  = comCaptura.reduce((s,e)=>s+(+e.captura.qualificados||0),0);
    const totDeals = comCaptura.reduce((s,e)=>s+(+e.captura.deals||0),0);
    const totCusto = comCaptura.reduce((s,e)=>s+(+e.captura.custo||0),0);

    res.json({
      total: lista.length, ano,
      kpis: {
        por_status: byStatus,
        eventos_com_captura: comCaptura.length,
        total_leads: totLeads, total_qualificados: totQual, total_deals: totDeals,
        custo_total: totCusto,
        custo_por_lead: totLeads ? Math.round(totCusto/totLeads) : null,
      },
      eventos: lista,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/field-marketing/:id', requireEditorToken, (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body || {};
    const existing = db.prepare('SELECT * FROM field_events WHERE event_id = ?').get(id) || {};
    const merged = {
      event_id: id,
      nome:        b.nome ?? existing.nome ?? '',
      data_evento: b.data_evento ?? existing.data_evento ?? null,
      local:       b.local ?? existing.local ?? '',
      lob:         b.lob ?? existing.lob ?? '',
      pais:        b.pais ?? existing.pais ?? '',
      responsavel: b.responsavel ?? existing.responsavel ?? '',
      porte:       b.porte ?? existing.porte ?? '',
      orcamento:   b.orcamento != null ? parseFloat(b.orcamento) || 0 : (existing.orcamento || 0),
      status:      b.status ?? existing.status ?? 'planejamento',
      brindes_json:  b.brindes  != null ? JSON.stringify(b.brindes)  : (existing.brindes_json || '[]'),
      captura_json:  b.captura  != null ? JSON.stringify(b.captura)  : (existing.captura_json || '{}'),
      briefing_json: b.briefing != null ? JSON.stringify(b.briefing) : (existing.briefing_json || '{}'),
    };
    db.prepare(`
      INSERT INTO field_events (event_id, nome, data_evento, local, lob, pais, responsavel, porte, orcamento, status, brindes_json, captura_json, briefing_json, updated_at)
      VALUES (@event_id,@nome,@data_evento,@local,@lob,@pais,@responsavel,@porte,@orcamento,@status,@brindes_json,@captura_json,@briefing_json,datetime('now'))
      ON CONFLICT(event_id) DO UPDATE SET
        nome=excluded.nome, data_evento=excluded.data_evento, local=excluded.local, lob=excluded.lob,
        pais=excluded.pais, responsavel=excluded.responsavel, porte=excluded.porte, orcamento=excluded.orcamento,
        status=excluded.status, brindes_json=excluded.brindes_json, captura_json=excluded.captura_json,
        briefing_json=excluded.briefing_json, updated_at=datetime('now')
    `).run(merged);
    res.json({ success: true, event_id: id });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── CONTENT PIPELINE (Redatoria → SEO/GEO → persona → copy/CTA → carrossel → publicado) ──
const CONTENT_ESTADOS = ['recebido','seo_geo','persona','copy_cta','carrossel','agendado','publicado'];

app.get('/api/content', (req, res) => {
  try {
    const all = db.prepare('SELECT * FROM content_pipeline ORDER BY updated_at DESC').all();
    const porEstado = {};
    for (const e of CONTENT_ESTADOS) porEstado[e] = 0;
    for (const it of all) porEstado[it.estado] = (porEstado[it.estado]||0)+1;
    const parse = (s) => { try { return JSON.parse(s||'{}'); } catch { return {}; } };
    res.json({
      estados: CONTENT_ESTADOS,
      total: all.length,
      por_estado: porEstado,
      itens: all.map(it => ({
        id: it.id, external_id: it.external_id, titulo: it.titulo, tema_keyword: it.tema_keyword,
        lob: it.lob, pilar: it.pilar, persona_alvo: it.persona_alvo, autor: it.autor,
        estado: it.estado, corpo: it.corpo,
        seo: parse(it.seo_json), geo: parse(it.geo_json),
        copy_text: it.copy_text, cta_sugerido: it.cta_sugerido, carrossel_url: it.carrossel_url,
        agendado_para: it.agendado_para, publicado_em: it.publicado_em, url_publicado: it.url_publicado,
        updated_at: it.updated_at,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/content', requireEditorToken, (req, res) => {
  try {
    const b = req.body || {};
    if (!b.titulo) return res.status(400).json({ success: false, error: 'titulo obrigatório.' });
    const r = db.prepare(`
      INSERT INTO content_pipeline (external_id, titulo, tema_keyword, lob, pilar, persona_alvo, autor, estado, corpo)
      VALUES (@external_id,@titulo,@tema_keyword,@lob,@pilar,@persona_alvo,@autor,@estado,@corpo)
    `).run({
      external_id: b.external_id || null, titulo: String(b.titulo).slice(0,300),
      tema_keyword: b.tema_keyword || '', lob: b.lob || '', pilar: b.pilar || '',
      persona_alvo: b.persona_alvo || '', autor: b.autor || '',
      estado: CONTENT_ESTADOS.includes(b.estado) ? b.estado : 'recebido', corpo: b.corpo || '',
    });
    res.json({ success: true, id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.put('/api/content/:id', requireEditorToken, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ex = db.prepare('SELECT * FROM content_pipeline WHERE id = ?').get(id);
    if (!ex) return res.status(404).json({ success: false, error: 'item não encontrado.' });
    const b = req.body || {};
    if (b.estado && !CONTENT_ESTADOS.includes(b.estado)) return res.status(400).json({ success: false, error: 'estado inválido.' });
    const m = {
      id,
      titulo: b.titulo ?? ex.titulo, tema_keyword: b.tema_keyword ?? ex.tema_keyword,
      lob: b.lob ?? ex.lob, pilar: b.pilar ?? ex.pilar, persona_alvo: b.persona_alvo ?? ex.persona_alvo,
      autor: b.autor ?? ex.autor, estado: b.estado ?? ex.estado, corpo: b.corpo ?? ex.corpo,
      copy_text: b.copy_text ?? ex.copy_text, cta_sugerido: b.cta_sugerido ?? ex.cta_sugerido,
      carrossel_url: b.carrossel_url ?? ex.carrossel_url,
      agendado_para: b.agendado_para ?? ex.agendado_para,
      publicado_em: b.estado === 'publicado' && !ex.publicado_em ? new Date().toISOString().slice(0,10) : (b.publicado_em ?? ex.publicado_em),
      url_publicado: b.url_publicado ?? ex.url_publicado,
    };
    db.prepare(`UPDATE content_pipeline SET titulo=@titulo, tema_keyword=@tema_keyword, lob=@lob, pilar=@pilar,
      persona_alvo=@persona_alvo, autor=@autor, estado=@estado, corpo=@corpo, copy_text=@copy_text,
      cta_sugerido=@cta_sugerido, carrossel_url=@carrossel_url, agendado_para=@agendado_para,
      publicado_em=@publicado_em, url_publicado=@url_publicado, updated_at=datetime('now') WHERE id=@id`).run(m);
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/content/:id/seo-check', requireEditorToken, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const it = db.prepare('SELECT * FROM content_pipeline WHERE id = ?').get(id);
    if (!it) return res.status(404).json({ success: false, error: 'item não encontrado.' });
    const input = { titulo: it.titulo, corpo: it.corpo, tema_keyword: it.tema_keyword };
    const seo = seoChecker.checkSEO(input);
    const geo = seoChecker.checkGEO(input);
    const cta = seoChecker.suggestCTA({ lob: it.lob, pilar: it.pilar });
    db.prepare('UPDATE content_pipeline SET seo_json=?, geo_json=?, cta_sugerido=?, updated_at=datetime(\'now\') WHERE id=?')
      .run(JSON.stringify(seo), JSON.stringify(geo), it.cta_sugerido || cta.cta, id);
    res.json({ success: true, seo, geo, cta });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/content/:id', requireEditorToken, (req, res) => {
  try {
    db.prepare('DELETE FROM content_pipeline WHERE id = ?').run(parseInt(req.params.id,10));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Importa itens fonte=redatoria do editorial_calendar pro pipeline (estado 'recebido')
app.post('/api/content/import-redatoria', requireEditorToken, (req, res) => {
  try {
    const posts = db.prepare("SELECT * FROM editorial_calendar WHERE fonte = 'redatoria'").all();
    const existing = new Set(db.prepare("SELECT external_id FROM content_pipeline WHERE external_id IS NOT NULL").all().map(r => r.external_id));
    const ins = db.prepare(`INSERT INTO content_pipeline (external_id, titulo, tema_keyword, lob, pilar, autor, estado, corpo)
      VALUES (@external_id,@titulo,@tema_keyword,@lob,@pilar,@autor,'recebido',@corpo)`);
    let n = 0;
    db.transaction(() => {
      for (const p of posts) {
        if (existing.has(p.external_id)) continue;
        ins.run({ external_id: p.external_id, titulo: p.titulo || '(sem título)', tema_keyword: '',
          lob: p.pilar || '', pilar: p.pilar || '', autor: p.autor || 'Redatoria', corpo: p.resumo || '' });
        n++;
      }
    })();
    res.json({ success: true, importados: n, total_redatoria: posts.length });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── DEVELOPMENT FUNDS (SAP DF LAC) — tracker EDF/DDF + proposals + requests ──
app.get('/api/development-funds', (req, res) => {
  try {
    const df = JSON.parse(fs0.readFileSync(path.join(__dirname, 'public/api/development-funds.json'), 'utf8'));
    const props = df.proposals || [];
    const reqs = df.requests || [];

    const isAprov = s => /approved/i.test(s || '');
    const propsValidos = props.filter(p => !p.derrubado);
    const propsDerrubados = props.filter(p => p.derrubado);

    // Pipeline de proposals por status
    const porStatus = {};
    for (const p of props) porStatus[p.status] = (porStatus[p.status] || 0) + 1;

    // Valor aprovado (€) — só proposals aprovadas e NÃO derrubadas
    const aprovadoValido = propsValidos.filter(p => isAprov(p.status)).reduce((s, p) => s + (+p.pc || 0), 0);
    const derrubadoTotal = propsDerrubados.reduce((s, p) => s + (+p.pc || 0), 0);
    // Em andamento (pending) — potencial
    const pendente = props.filter(p => /pending/i.test(p.status)).reduce((s, p) => s + (+p.pc || 0), 0);

    // Requests: a reclamar (válidos, claim=0, Claim Now) ordenados por expiração
    const reqsValidos = reqs.filter(r => !r.derrubado);
    const aReclamar = reqsValidos
      .filter(r => (+r.claim || 0) === 0 && /claim now/i.test(r.status))
      .sort((a, b) => (a.expiracao || '').localeCompare(b.expiracao || ''));
    const totalAReclamar = aReclamar.reduce((s, r) => s + (+r.aprovado || 0), 0);
    const totalClaimed = reqs.reduce((s, r) => s + (+r.claim || 0), 0);

    // Regra DDF: meta 70% até 1º/jul
    const ddf = df.budget?.ddf_alocado || 0;
    const meta70 = +(ddf * 0.7).toFixed(2);
    const hoje = new Date().toISOString().slice(0, 10);
    const em30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const expirandoEm30 = reqsValidos.filter(r => r.expiracao && r.expiracao >= hoje && r.expiracao <= em30 && (+r.claim || 0) === 0);

    res.json({
      programa: df.programa, periodo: df.periodo, budget: df.budget, regras: df.regras,
      kpis: {
        ddf_alocado: ddf,
        ddf_consumido: df.budget?.ddf_consumido || 0,
        meta_70pct_1jul: meta70,
        aprovado_valido: +aprovadoValido.toFixed(2),
        derrubado_total: +derrubadoTotal.toFixed(2),
        pendente: +pendente.toFixed(2),
        total_a_reclamar: +totalAReclamar.toFixed(2),
        total_claimed: +totalClaimed.toFixed(2),
        proposals_total: props.length,
        proposals_derrubadas: propsDerrubados.length,
        requests_expirando_30d: expirandoEm30.length,
      },
      por_status: porStatus,
      a_reclamar: aReclamar,
      expirando_30d: expirandoEm30,
      proposals: props,
      requests: reqs,
      derrubados: propsDerrubados.map(p => ({ numero: p.numero, nome: p.nome, pc: p.pc, motivo: p.motivo_derrubada })),
      atualizado_em: df.atualizado_em,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
const HOME_HTML      = path.join(__dirname, 'public/home.html');
const DASHBOARD_HTML = path.join(__dirname, 'public/dashboard.html');
const HUB_HTML       = path.join(__dirname, 'public/hub.html');
app.get('/',          (req, res) => res.sendFile(HOME_HTML));
app.get('/game',      (req, res) => res.sendFile(OFFICE_HTML));

// ── /api/pendencias — parsea vault/00-contexto/pendencias.md em 5 buckets ──
app.get('/api/pendencias', (req, res) => {
  try {
    const md = fs.readFileSync(path.join(__dirname, 'vault/00-contexto/pendencias.md'), 'utf8');
    // splita por ## (level 2 headings)
    const sections = md.split(/^## /m).slice(1); // remove preamble
    const buckets = { bloqueadas: [], dropadas: [], achados: [], pendentes: [], entregues: [] };
    const bucketMap = {
      '🔴': 'bloqueadas', '🟡': 'dropadas', '⚠️': 'achados',
      '🟢': 'pendentes', '✅': 'entregues'
    };
    for (const sec of sections) {
      const firstLine = sec.split('\n')[0];
      let bucket = null;
      for (const [emoji, key] of Object.entries(bucketMap)) {
        if (firstLine.includes(emoji)) { bucket = key; break; }
      }
      if (!bucket) continue;
      // parsea sub-items (### B1. ... ou ### P0. ...)
      const items = sec.split(/^### /m).slice(1);
      for (const item of items) {
        const lines = item.split('\n');
        const titulo = (lines[0] || '').replace(/\s*$/, '').trim();
        // pega 1-3 primeiras linhas com conteudo apos o titulo
        const corpo = lines.slice(1).filter(l => l.trim()).slice(0, 5).join(' ').slice(0, 300);
        if (titulo) items_collect(buckets[bucket], titulo, corpo, sec);
      }
      // se a secao nao tem subheadings, captura o body geral
      if (items.length === 0) {
        const corpo = sec.split('\n').slice(1, 4).filter(l => l.trim()).join(' ').slice(0, 300);
        if (corpo) buckets[bucket].push({ titulo: firstLine.trim(), descricao: corpo, secao: firstLine.trim() });
      }
    }
    res.json({
      gerado_em: new Date().toISOString(),
      fonte: 'vault/00-contexto/pendencias.md',
      total: Object.values(buckets).reduce((a, b) => a + b.length, 0),
      buckets
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
function items_collect(arr, titulo, descricao, secao) {
  arr.push({ titulo, descricao, secao: (secao.split('\n')[0] || '').trim().slice(0, 80) });
}

app.get('/dashboard', (req, res) => res.sendFile(DASHBOARD_HTML));
app.get('/hub',       (req, res) => res.sendFile(HUB_HTML));
// v0.5.0 — Novas rotas (Onda 2-6)
app.get('/relatorio', (req, res) => res.sendFile(path.join(__dirname, 'public/relatorio.html')));
app.get('/artigos',   (req, res) => res.sendFile(path.join(__dirname, 'public/artigos.html')));
app.get('/jornadas',  (req, res) => res.sendFile(path.join(__dirname, 'public/jornadas.html')));
app.get('/metas-fy26', (req, res) => res.sendFile(path.join(__dirname, 'public/metas-fy26.html')));
app.get('/metas/fy26', (req, res) => res.redirect(301, '/metas-fy26'));
app.get('/design', (req, res) => res.sendFile(path.join(__dirname, 'public/design.html')));
app.get('/erp-impacto', (req, res) => res.sendFile(path.join(__dirname, 'public/erp-impacto.html')));
app.get('/pipeline',  (req, res) => res.sendFile(path.join(__dirname, 'public/pipeline.html')));

// ════════════════════════════════════════════════════════════════════════════
// v0.5.0 ENDPOINTS — Artigos · LinkedIn historical · Jornadas · Relatório · Projeções
// ════════════════════════════════════════════════════════════════════════════
const ARTIGOS_JSON_PATH = path.join(__dirname, 'public/api/artigos.json');
const LINKEDIN_HIST_PATH = path.join(__dirname, 'public/api/linkedin-historical.json');
const METAS_FY26_PATH = path.join(__dirname, 'public/api/metas-fy26.json');

function _readJSON(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn(`[json] não conseguiu ler ${filePath}: ${e.message}`);
    return fallback;
  }
}

// GET /api/artigos?linha=X&etapa=Y&q=texto&voice=slug&status=reescrever&limit=50&offset=0
app.get('/api/artigos', (req, res) => {
  const data = _readJSON(ARTIGOS_JSON_PATH, { artigos: [], agregados: {} });
  let lista = data.artigos || [];
  const { linha, etapa, q, voice, status, limit = 50, offset = 0 } = req.query;
  if (linha) lista = lista.filter(a => a.linha_de_negocio === linha);
  if (etapa) lista = lista.filter(a => a.etapa_funil === etapa);
  if (status) lista = lista.filter(a => a.status_reaproveitamento === status);
  if (voice) lista = lista.filter(a => a.voice_atribuido === voice || (a.favorito_voices || []).includes(voice));
  if (q) {
    const qq = String(q).toLowerCase();
    lista = lista.filter(a => (a.titulo || '').toLowerCase().includes(qq));
  }
  const total = lista.length;
  const lim = Math.min(parseInt(limit) || 50, 200);
  const off = parseInt(offset) || 0;
  res.json({
    success: true,
    total,
    agregados: data.agregados,
    artigos: lista.slice(off, off + lim),
    gerado_em: data.gerado_em,
  });
});

// GET /api/jornadas — matriz LOB × etapa funil com gaps
app.get('/api/jornadas', (req, res) => {
  const data = _readJSON(ARTIGOS_JSON_PATH, { artigos: [] });
  const matriz = {};
  for (const a of data.artigos || []) {
    const lob = a.linha_de_negocio || 'Sem LOB';
    const et = a.etapa_funil || 'Sem Etapa';
    matriz[lob] = matriz[lob] || { 'Topo (Aprendizado)': [], 'Meio (Consideração)': [], 'Fundo (Decisão)': [] };
    if (!matriz[lob][et]) matriz[lob][et] = [];
    matriz[lob][et].push({ id: a.id, titulo: a.titulo, url: a.url });
  }
  // Calcula gaps (LOB sem Meio ou sem Fundo)
  const gaps = [];
  for (const [lob, etapas] of Object.entries(matriz)) {
    for (const [etapa, artigos] of Object.entries(etapas)) {
      if (artigos.length === 0 && etapa !== 'Sem Etapa') {
        gaps.push({ lob, etapa, situacao: 'crítico' });
      } else if (artigos.length < 3 && etapa !== 'Topo (Aprendizado)') {
        gaps.push({ lob, etapa, situacao: 'insuficiente', count: artigos.length });
      }
    }
  }
  res.json({ success: true, matriz, gaps });
});

// GET /api/linkedin/historical — 16+ meses + demografia + eventos
app.get('/api/linkedin/historical', (req, res) => {
  const data = _readJSON(LINKEDIN_HIST_PATH, null);
  if (!data) return res.status(404).json({ success: false, error: 'linkedin-historical.json não encontrado. Rode: python scripts/sync/sync_linkedin_historical.py' });
  res.json({ success: true, ...data });
});

// POST /api/linkedin/update-today — Ruda crava o nº de seguidores do dia em 5s (interim ate LinkedIn API)
app.post('/api/linkedin/update-today', requireEditorToken, (req, res) => {
  const total = parseInt(req.body && req.body.total, 10);
  if (!total || total < 1000 || total > 2000000) {
    return res.status(400).json({ success: false, error: 'Informe um total de seguidores válido (ex: 10640).' });
  }
  const data = _readJSON(LINKEDIN_HIST_PATH, null);
  if (!data || !Array.isArray(data.serie_mensal)) {
    return res.status(404).json({ success: false, error: 'linkedin-historical.json não encontrado.' });
  }
  const mes = new Date().toISOString().slice(0, 7);
  const anteriores = data.serie_mensal.filter(m => m.total_seguidores && m.mes < mes);
  const ultimoAnterior = anteriores.length ? anteriores[anteriores.length - 1].total_seguidores : null;
  let entry = data.serie_mensal.find(m => m.mes === mes);
  if (!entry) {
    entry = { mes, total_seguidores: null, novos: null, newsletter: null, posts_mes: null, impressoes: null };
    data.serie_mensal.push(entry);
  }
  entry.total_seguidores = total;
  if (req.body.novos != null) entry.novos = parseInt(req.body.novos, 10);
  else if (ultimoAnterior) entry.novos = total - ultimoAnterior;
  entry.fonte = 'manual (Rudá ' + new Date().toISOString().slice(0, 10) + ')';
  data.atualizado_em = new Date().toISOString().slice(0, 10);
  try { fs.writeFileSync(LINKEDIN_HIST_PATH, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  res.json({ success: true, mes, total_seguidores: total, novos: entry.novos });
});

// GET /api/relatorio/snapshot?fy=26|27 — agregado anual fiscal (jul→jun)
// Mantém retrocompat com ?mes=YYYY-MM (mensal).
function _fyMonths(fy) {
  const startYear = 2000 + fy - 1;
  const meses = [];
  for (let m = 7; m <= 12; m++) meses.push(`${startYear}-${String(m).padStart(2, '0')}`);
  for (let m = 1; m <= 6; m++) meses.push(`${startYear + 1}-${String(m).padStart(2, '0')}`);
  return meses;
}

function _snapshotFY(req, res) {
  const fy = parseInt(req.query.fy, 10);
  if (![26, 27].includes(fy)) return res.status(400).json({ success: false, error: 'FY invalido. Use 26 ou 27.' });
  const meses = _fyMonths(fy);
  const hoje = new Date().toISOString().slice(0, 7);
  const elegiveis = meses.filter(m => m <= hoje);

  const linkedin = _readJSON(LINKEDIN_HIST_PATH, { serie_mensal: [], demografia: {}, resumo: {}, eventos: [] });
  const sm = (linkedin.serie_mensal || []).filter(x => meses.includes(x.mes)).sort((a,b) => a.mes.localeCompare(b.mes));
  const seg_ini = sm[0]?.total_seguidores ?? null;
  const seg_fim = sm[sm.length - 1]?.total_seguidores ?? null;
  const novos_fy = sm.reduce((a, x) => a + (x.novos ?? x.novos_diario ?? 0), 0);
  const posts_fy = sm.reduce((a, x) => a + (x.posts_mes ?? 0), 0);
  const impr_fy = sm.reduce((a, x) => a + (x.impressoes ?? 0), 0);

  // GA4 agregado FY (real data only — só meses com cache)
  let site = null;
  try {
    const ga4 = _readJSON(path.join(__dirname, 'public/api/ga4-snapshot.json'), { meses: {} });
    const obtidos = meses.filter(m => ga4.meses && ga4.meses[m] && ga4.meses[m].usuarios != null);
    if (obtidos.length) {
      const sum = (k) => obtidos.reduce((a, m) => a + (ga4.meses[m][k] || 0), 0);
      // Duração média ponderada por sessões (mais correta que média simples)
      const tot_sess = sum('sessoes');
      const tot_segs = obtidos.reduce((a, m) => a + (ga4.meses[m].duracao_sessao_s || 0) * (ga4.meses[m].sessoes || 0), 0);
      const duracao_avg = tot_sess > 0 ? Math.round(tot_segs / tot_sess) : null;
      // Top pages agregadas no FY (soma visualizações por path)
      const pagesMap = new Map();
      obtidos.forEach(m => {
        (ga4.meses[m].top_pages || []).forEach(p => {
          const key = p.path;
          const cur = pagesMap.get(key) || { path: p.path, title: p.title, visualizacoes: 0, usuarios: 0 };
          cur.visualizacoes += p.visualizacoes || 0;
          cur.usuarios += p.usuarios || 0;
          if (p.title && !cur.title) cur.title = p.title;
          pagesMap.set(key, cur);
        });
      });
      const top_pages_fy = Array.from(pagesMap.values())
        .sort((a, b) => b.visualizacoes - a.visualizacoes)
        .slice(0, 10);
      site = {
        usuarios: sum('usuarios'),
        visualizacoes: sum('visualizacoes'),
        sessoes: sum('sessoes'),
        duracao_sessao_s: duracao_avg,
        top_pages: top_pages_fy,
        meses_com_dado: obtidos.length,
        meses_elegiveis: elegiveis.length,
        meses_total_fy: meses.length,
        fonte: 'GA4 Data API (agregado FY)',
        atualizado_em: ga4.atualizado_em || null,
      };
    }
  } catch (e) { console.warn('[relatorio FY] ga4 fail:', e.message); }

  // Email FY (RD Station) — estado atual da base + histórico de envios
  let email = null;
  try {
    const rd = _readJSON(path.join(__dirname, 'public/api/rd-snapshot.json'), null);
    if (rd && rd.emails) {
      email = {
        total_enviados_historico: rd.emails.total_enviados ?? null,
        enviados_mes_atual: rd.emails.enviados_mes_atual ?? null,
        mes_atual: rd.emails.mes_atual ?? null,
        total_na_conta: rd.emails.total ?? null,
        segmentacoes_total: rd.segmentations?.total ?? null,
        workflows_ativos: rd.workflows?.ativos ?? null,
        landing_pages_publicadas: rd.landing_pages?.publicadas ?? null,
        base_leads: (rd.segmentations?.top || []).find(s => /todos os contatos/i.test(s.name))?.contatos ?? null,
        base_leads_aprox: (rd.segmentations?.top || []).find(s => /todos os contatos/i.test(s.name))?.contatos_aprox || false,
        fonte: rd.fonte || 'RD Station Marketing API',
        atualizado_em: rd.atualizado_em || null,
      };
    }
  } catch (e) { console.warn('[relatorio FY] rd fail:', e.message); }

  // Cases — estado atual (não tem histórico mensal)
  let cases = { live: 0, publicado: 0, em_edicao: 0, negociacao: 0, declinado: 0 };
  try {
    const cs = db.prepare('SELECT status, COUNT(*) as n FROM cs_clientes GROUP BY status').all();
    cs.forEach(r => {
      const k = (r.status || '').replace('case-', '').replace('-', '_');
      if (k in cases) cases[k] = r.n;
    });
  } catch (e) { console.warn('[relatorio FY] cases fail:', e.message); }

  // Voices
  let voices = [];
  try {
    const vd = _readJSON(path.join(__dirname, 'public/api/voices.json'), { voices: [] });
    voices = (vd.voices || []).map(v => ({ id: v.id, nome: v.nome, status: v.status, area: v.area, ssi: v.ssi_baseline || null, seg: v.seguidores_baseline || null }));
  } catch {}

  // Eventos do FY
  const eventos_fy = (linkedin.eventos || []).filter(e => meses.includes((e.data || '').slice(0, 7)));

  res.json({
    success: true,
    modo: 'fy',
    fy,
    label: `FY${fy} (jul/${String(2000 + fy - 1).slice(-2)} → jun/${String(2000 + fy).slice(-2)})`,
    meses,
    meses_elegiveis: elegiveis,
    meses_com_dado: sm.map(x => x.mes),
    em_andamento: elegiveis.length < meses.length,
    site,
    email,
    linkedin: {
      total_atual: seg_fim,
      total_inicio: seg_ini,
      ganho_total: (seg_ini != null && seg_fim != null) ? (seg_fim - seg_ini) : null,
      ganho_pct: (seg_ini && seg_fim) ? Math.round(100 * (seg_fim - seg_ini) / seg_ini * 100) / 100 : null,
      novos: novos_fy,
      posts_mes: posts_fy,
      impressoes: impr_fy,
      newsletter: sm[sm.length - 1]?.newsletter ?? null,
      serie_12m: sm,
      eventos_mes: eventos_fy,
      tatica_elefante: {
        eventos_no_periodo: eventos_fy.length,
        seguidores_via_eventos: linkedin.resumo?.total_via_eventos || 0,
        pct_eventos: linkedin.resumo?.pct_eventos || 0,
      },
      demografia: linkedin.demografia,
    },
    cases,
    voices: {
      ativos: voices.filter(v => v.status === 'ativo' || v.status === 'onboarding').length,
      total: voices.length,
      lista: voices,
    },
    eventos_proximos: [],
    alertas: [],
    gerado_em: new Date().toISOString(),
  });
}

// GET /api/relatorio/snapshot?mes=YYYY-MM — agrega TUDO pra o relatório mensal
app.get('/api/relatorio/snapshot', (req, res) => {
  if (req.query.fy) return _snapshotFY(req, res);
  const mes = req.query.mes || new Date().toISOString().slice(0, 7);
  const linkedin = _readJSON(LINKEDIN_HIST_PATH, { serie_mensal: [], demografia: {}, resumo: {}, eventos: [] });

  // Recupera o mês específico + comparativo com mês anterior
  const sm = linkedin.serie_mensal || [];
  const idxAtual = sm.findIndex(m => m.mes === mes);
  const atual = idxAtual >= 0 ? sm[idxAtual] : null;
  const anterior = idxAtual > 0 ? sm[idxAtual - 1] : null;
  const mom = (a, b) => (a && b && b > 0) ? Math.round(100 * (a - b) / b * 100) / 100 : null;

  // Cases atuais
  let cases = { live: 0, publicado: 0, em_edicao: 0, negociacao: 0, declinado: 0 };
  try {
    const cs = db.prepare('SELECT status, COUNT(*) as n FROM cs_clientes GROUP BY status').all();
    cs.forEach(r => {
      const k = (r.status || '').replace('case-', '').replace('-', '_');
      if (k in cases) cases[k] = r.n;
    });
  } catch (e) { console.warn('[relatorio] cases fail:', e.message); }

  // Voices
  let voices = [];
  try {
    const vd = _readJSON(path.join(__dirname, 'public/api/voices.json'), { voices: [] });
    voices = (vd.voices || []).map(v => ({ id: v.id, nome: v.nome, status: v.status, area: v.area, ssi: v.ssi_baseline || null, seg: v.seguidores_baseline || null }));
  } catch {}

  // Eventos do mês
  const eventosMes = (linkedin.eventos || []).filter(e => (e.data || '').startsWith(mes));

  // Próximos eventos (events.json)
  let eventos_proximos = [];
  try {
    const ev = _readJSON(path.join(__dirname, 'public/api/events.json'), { eventos_brasil: [] });
    const all = (ev.eventos_brasil || []).concat(ev.eventos_latam || []);
    const hoje = new Date().toISOString().slice(0, 10);
    eventos_proximos = all.filter(e => (e.data_inicio || e.data || '') >= hoje).slice(0, 5);
  } catch {}

  // Site (GA4) — lê snapshot gravado por scripts/integrations/ga4_fetch.js (quota-safe)
  // Se não houver snapshot do mês → site:null (relatorio.html mostra etiqueta ⏳ aguarda GA4)
  let site = null;
  try {
    const ga4 = _readJSON(path.join(__dirname, 'public/api/ga4-snapshot.json'), { meses: {} });
    const s = ga4.meses && ga4.meses[mes];
    if (s && s.usuarios != null) {
      site = {
        usuarios: s.usuarios,
        visualizacoes: s.visualizacoes,
        sessoes: s.sessoes,
        duracao_sessao_s: s.duracao_sessao_s,
        usuarios_mom_pct: s.usuarios_mom_pct ?? null,
        visualizacoes_mom_pct: s.visualizacoes_mom_pct ?? null,
        duracao_sessao_mom_pct: s.duracao_sessao_mom_pct ?? null,
        top_pages: s.top_pages || [],
        fonte: s.fonte || 'GA4 Data API',
        atualizado_em: s.atualizado_em || ga4.atualizado_em || null,
      };
    }
  } catch (e) { console.warn('[relatorio] ga4 fail:', e.message); }

  // Email (RD Station) — lê snapshot gravado por scripts/integrations/rd_fetch.js
  let email = null;
  try {
    const rd = _readJSON(path.join(__dirname, 'public/api/rd-snapshot.json'), null);
    if (rd && rd.emails) {
      email = {
        total_enviados_historico: rd.emails.total_enviados ?? null,
        enviados_mes_atual: rd.emails.enviados_mes_atual ?? null,
        mes_atual: rd.emails.mes_atual ?? null,
        total_na_conta: rd.emails.total ?? null,
        segmentacoes_total: rd.segmentations?.total ?? null,
        workflows_ativos: rd.workflows?.ativos ?? null,
        landing_pages_publicadas: rd.landing_pages?.publicadas ?? null,
        base_leads: (rd.segmentations?.top || []).find(s => /todos os contatos/i.test(s.name))?.contatos ?? null,
        base_leads_aprox: (rd.segmentations?.top || []).find(s => /todos os contatos/i.test(s.name))?.contatos_aprox || false,
        fonte: rd.fonte || 'RD Station Marketing API',
        atualizado_em: rd.atualizado_em || null,
      };
    }
  } catch (e) { console.warn('[relatorio] rd fail:', e.message); }

  res.json({
    success: true,
    mes,
    site,
    email,
    linkedin: {
      total_atual: atual?.total_seguidores ?? null,
      novos: atual?.novos ?? atual?.novos_diario ?? null,
      novos_mom_pct: mom(atual?.novos ?? atual?.novos_diario, anterior?.novos ?? anterior?.novos_diario),
      newsletter: atual?.newsletter ?? null,
      impressoes: atual?.impressoes ?? null,
      posts_mes: atual?.posts_mes ?? null,
      serie_12m: sm.slice(-12),
      eventos_mes: eventosMes,
      tatica_elefante: {
        eventos_no_periodo: (linkedin.eventos || []).length,
        seguidores_via_eventos: linkedin.resumo?.total_via_eventos || 0,
        pct_eventos: linkedin.resumo?.pct_eventos || 0,
      },
      demografia: linkedin.demografia,
    },
    cases,
    voices: {
      ativos: voices.filter(v => v.status === 'ativo' || v.status === 'onboarding').length,
      total: voices.length,
      lista: voices,
    },
    eventos_proximos,
    alertas: _gerarAlertas(linkedin, atual, anterior),
    gerado_em: new Date().toISOString(),
  });
});

// POST /api/relatorio/ga4-refresh?mes=YYYY-MM — dispara fetch real do GA4 e atualiza snapshot
// Protegido por EDITOR_TOKEN. Usado manualmente ou por cron diário.
app.post('/api/relatorio/ga4-refresh', requireEditorToken, async (req, res) => {
  try {
    const ga4 = require(path.join(__dirname, 'scripts/integrations/ga4_fetch.js'));
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const result = await ga4.refreshAndCache(mes);
    res.json({ success: true, mes: result.mes, usuarios: result.usuarios, atualizado_em: result.atualizado_em });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/relatorio/ga4-refresh-fy?fy=26&force=1 — busca todos os meses do FY
app.post('/api/relatorio/ga4-refresh-fy', requireEditorToken, async (req, res) => {
  try {
    const ga4 = require(path.join(__dirname, 'scripts/integrations/ga4_fetch.js'));
    const fy = parseInt(req.query.fy, 10);
    if (![26, 27].includes(fy)) return res.status(400).json({ success: false, error: 'FY invalido. Use 26 ou 27.' });
    const force = req.query.force === '1' || req.query.force === 'true';
    const result = await ga4.refreshFY(fy, { force });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

function _gerarAlertas(linkedin, atual, anterior) {
  const a = [];
  // Newsletter estagnada
  const newsletters = (linkedin.serie_mensal || []).slice(-3).map(m => m.newsletter).filter(Boolean);
  if (newsletters.length === 3 && newsletters[0] === newsletters[1] && newsletters[1] === newsletters[2]) {
    a.push({ tipo: 'warn', msg: `Newsletter estagnada em ${newsletters[0]} há 3 meses — sem captação nova` });
  }
  // Queda forte MoM
  if (atual && anterior) {
    const na = atual.novos ?? atual.novos_diario;
    const nb = anterior.novos ?? anterior.novos_diario;
    if (na && nb && (na - nb) / nb < -0.3) {
      a.push({ tipo: 'warn', msg: `Queda forte de novos seguidores: ${nb} → ${na} (${Math.round(100*(na-nb)/nb)}% MoM)` });
    }
  }
  // Sem posts trackeados
  if (atual && !atual.posts_mes) {
    a.push({ tipo: 'info', msg: 'Posts/mês sem tracking — pedir Sergio retomar a métrica' });
  }
  return a;
}


// GET /api/metas/fy26 — Metas oficiais FY26 + realizado real cruzado
app.get('/api/metas/fy26', (req, res) => {
  const data = _readJSON(METAS_FY26_PATH, null);
  if (!data) return res.status(404).json({ success: false, error: 'metas-fy26.json não encontrado. Rode: python scripts/sync/sync_metas_fy26.py' });

  const linkedin = _readJSON(LINKEDIN_HIST_PATH, { resumo: {}, serie_mensal: [] });
  let casesPorLinha = {};
  let casesTotal = 0;
  try {
    const cs = db.prepare("SELECT status, linha_negocio, COUNT(*) as n FROM cs_clientes WHERE status='case-publicado' GROUP BY linha_negocio").all();
    cs.forEach(r => { casesPorLinha[r.linha_negocio || 'outros'] = r.n; casesTotal += r.n; });
  } catch (e) { console.warn('[metas/fy26] cases fail:', e.message); }

  let eventos_proprios_ano = 0;
  try {
    const ev = _readJSON(path.join(__dirname, 'public/api/events.json'), { eventos_brasil: [] });
    eventos_proprios_ano = (ev.eventos_brasil || []).filter(e => (e.tipo || '').toLowerCase().includes('proprio')).length;
  } catch {}

  // Cruzar realizado por categoria
  const metas_com_realizado = (data.metas || []).map(m => {
    let realizado = null, realizado_fonte = null;
    switch (m.categoria) {
      case 'linkedin_seguidores_totais': {
        const ultima = linkedin.serie_mensal?.filter(x => x.total_seguidores).slice(-1)[0];
        realizado = ultima?.total_seguidores || null;
        realizado_fonte = ultima ? `report ${ultima.mes}` : null;
        break;
      }
      case 'cases_publicados_ano':
        realizado = casesTotal; realizado_fonte = 'SQLite cs_clientes'; break;
      case 'cases_sap_erp_ano':
        realizado = Object.entries(casesPorLinha).filter(([k]) => /SAP ERP|S\/4/i.test(k)).reduce((s, [,n]) => s+n, 0);
        realizado_fonte = 'cs_clientes onde linha_negocio matches SAP ERP'; break;
      case 'cases_successfactors_ano':
        realizado = Object.entries(casesPorLinha).filter(([k]) => /SuccessFactors|HCM/i.test(k)).reduce((s, [,n]) => s+n, 0);
        realizado_fonte = 'cs_clientes onde linha_negocio matches HCM/SF'; break;
      case 'cases_workforce_ano':
        realizado = Object.entries(casesPorLinha).filter(([k]) => /WorkForce/i.test(k)).reduce((s, [,n]) => s+n, 0);
        realizado_fonte = 'cs_clientes onde linha_negocio matches WorkForce'; break;
      case 'cases_servicenow_ano':
        realizado = Object.entries(casesPorLinha).filter(([k]) => /ServiceNow/i.test(k)).reduce((s, [,n]) => s+n, 0);
        realizado_fonte = 'cs_clientes onde linha_negocio matches ServiceNow'; break;
      case 'cases_process_ano':
        realizado = Object.entries(casesPorLinha).filter(([k]) => /Process|Excelência/i.test(k)).reduce((s, [,n]) => s+n, 0);
        realizado_fonte = 'cs_clientes onde linha_negocio matches Process'; break;
      case 'eventos_proprios_ano':
        realizado = eventos_proprios_ano; realizado_fonte = 'events.json tipo=proprio'; break;
    }
    let progresso_pct = null;
    if (realizado != null && m.valor) progresso_pct = Math.round(100 * realizado / m.valor * 10) / 10;
    return { ...m, realizado, realizado_fonte, progresso_pct };
  });

  res.json({
    success: true,
    ano_fiscal: data.ano_fiscal,
    periodo_fiscal: data.periodo_fiscal,
    total_metas: data.total_metas,
    por_status_fonte: data.por_status_fonte,
    metas: metas_com_realizado,
    gerado_em: data.gerado_em,
  });
});

// GET /api/pipeline — dados REAIS do Apollo (snapshot via MCP, gravado em pipeline-snapshot.json)
// Sync diário headless = TODO (precisa Apollo REST API Key + cron). Hoje: snapshot manual real.
app.get('/api/pipeline', (req, res) => {
  const snap = _readJSON(path.join(__dirname, 'public/api/pipeline-snapshot.json'), null);
  if (!snap) {
    return res.json({ success: true, fonte: 'sem snapshot ainda', contatos_total: null, sequencias_total: null, ultima_sync: null });
  }
  res.json({ success: true, ...snap });
});

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

// GET /api/voices/:slug/optimizer-input — JSON pronto pra alimentar /api/analisar-perfil/p1
// SPRINT 9 Bloco A — Voice cadastrado vira input direto, sem digitar nada
app.get('/api/voices/:slug/optimizer-input', (req, res) => {
  const slug = String(req.params.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!slug) return res.status(400).json({ success: false, error: 'slug inválido' });
  let data;
  try { data = JSON.parse(fs.readFileSync(VOICES_JSON_PATH, 'utf8')); }
  catch (e) { return res.status(500).json({ success: false, error: 'falha ao ler voices.json: ' + e.message }); }
  const v = (data.voices || []).find(x => x.id === slug);
  if (!v) return res.status(404).json({ success: false, error: 'voice nao encontrado' });
  // Mapeamento: campos do voices.json -> campos esperados pelo /api/analisar-perfil/p1
  const r = Array.isArray(v.resultados) ? v.resultados : (v.resultados ? [v.resultados] : []);
  const input = {
    voice_slug: v.id,
    nome: v.nome || '',
    cargo_oficial: v.cargo || '',
    area_principal: v.nicho || '',
    publico_alvo: Array.isArray(v.audiencia) ? v.audiencia.join(', ') : (v.audiencia || ''),
    linkedin_url: v.linkedin || '',
    ssi_score: v.ssi_baseline || '',
    seguidores: v.seguidores_baseline || '',
    tom_voz: v.tom_voz || '',
    diferencial_humano: v.lado_humano || '',
    resultado_1: r[0] || '',
    resultado_2: r[1] || '',
    resultado_3: r[2] || '',
    anos_experiencia: v.anos_experiencia || '',
    data_entrada_epiuse: v.data_entrada_epiuse || '',
    foto_oficial: !!v.foto,
    foto_url: v.foto || '',
    // _fonte (Bloco B): marca cada campo como REAL/INFERIDO baseado em ter dado salvo
    _fontes: {
      nome: v.nome ? 'REAL' : 'PLACEHOLDER',
      cargo_oficial: v.cargo ? 'REAL' : 'PLACEHOLDER',
      area_principal: v.nicho ? 'REAL' : 'PLACEHOLDER',
      linkedin_url: v.linkedin ? 'REAL' : 'PLACEHOLDER',
      ssi_score: v.ssi_baseline ? 'REAL' : 'PLACEHOLDER',
      tom_voz: v.tom_voz ? 'REAL' : 'PLACEHOLDER',
      diferencial_humano: v.lado_humano ? 'REAL' : 'PLACEHOLDER',
      resultados: r.length > 0 ? 'REAL' : 'PLACEHOLDER'
    },
    _campos_faltando: (v.dados_a_confirmar || []),
    _voice_status: v.status || 'unknown'
  };
  res.json({ success: true, input });
});

// POST /api/voices/:slug/duplicate — duplica um Voice existente com novo slug
app.post('/api/voices/:slug/duplicate', requireEditorToken, (req, res) => {
  const srcSlug = String(req.params.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 60);
  if (!srcSlug) return res.status(400).json({ success: false, error: 'slug inválido' });
  let data;
  try { data = JSON.parse(fs.readFileSync(VOICES_JSON_PATH, 'utf8')); }
  catch (e) { return res.status(500).json({ success: false, error: 'falha ao ler voices.json: ' + e.message }); }
  data.voices = data.voices || [];
  const src = data.voices.find(v => v.id === srcSlug);
  if (!src) return res.status(404).json({ success: false, error: 'voice origem nao encontrado' });
  // gera slug novo (slug-copia, slug-copia-2, ...)
  let newSlug = (req.body && req.body.novo_slug) || (srcSlug + '-copia');
  newSlug = String(newSlug).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  let i = 2;
  while (data.voices.find(v => v.id === newSlug)) {
    newSlug = srcSlug + '-copia-' + i;
    i++;
  }
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = newSlug;
  copy.nome = 'Cópia de ' + (src.nome || src.id);
  copy.status = 'onboarding';
  copy.duplicado_de = srcSlug;
  copy.duplicado_em = new Date().toISOString();
  // limpa contadores específicos
  delete copy.posts_publicados;
  delete copy.ultimo_post;
  data.voices.push(copy);
  try { fs.writeFileSync(VOICES_JSON_PATH, JSON.stringify(data, null, 2)); }
  catch (e) { return res.status(500).json({ success: false, error: 'falha ao gravar: ' + e.message }); }
  res.json({ success: true, slug: newSlug, voice: copy });
});

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

  data.voices = data.voices || [];
  let voice = data.voices.find(v => v.id === slug);
  let isNew = false;
  if (!voice) {
    // Upsert: cria Voice novo do zero (fluxo "+ Novo Voice")
    isNew = true;
    voice = {
      id: slug,
      nome: req.body?.nome || slug,
      cargo: req.body?.cargo || '',
      area: req.body?.area || '',
      status: req.body?.status || 'onboarding',
      foto: req.body?.foto || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(req.body?.nome || slug)}`,
      linkedin: req.body?.linkedin || '',
      bio: req.body?.bio || '',
      tags: [],
      audiencia: [],
      tom_voz: '',
      lado_humano: '',
      resultados: [],
      ssi_baseline: null,
      seguidores_baseline: null,
      kit_gerado: false,
      pendencia: '',
      dados_a_confirmar: [],
      created_at: new Date().toISOString()
    };
    data.voices.push(voice);
  }

  const patch = req.body || {};
  // Campos editáveis (whitelist) — expandido pra criação também aceitar campos básicos
  const editable = ['nome', 'cargo', 'area', 'status', 'foto', 'bio', 'nicho', 'tags', 'audiencia', 'linkedin',
                    'ssi_baseline', 'seguidores_baseline',
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

  console.log(`[VOICE-${isNew ? 'CREATE' : 'EDIT'}] ${slug}. prov_removed=${touchedAnyProv} dados_a_confirmar=${[...dadosAConfirmar].length}`);
  res.json({ success: true, voice, created: isNew });
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
- Headline: máximo 220 caracteres, área de expertise + empresa + diferencial + LADO HUMANO se houver (ex: "pai de 2, apaixonado por trail running")
- Competências: priorizar tecnologias atuais (SAP BTP, Clean Core, S/4HANA, SuccessFactors) — remover versões legadas (SAP R/3, etc.) — sugerir competências baseado na expertise visível
- Tom deve seguir a preferência indicada: ${tom_voz || 'equilibrado'}
- Formatação mobile: parágrafos curtos, sem paredes de texto
- Seção Sobre: máximo 2.600 caracteres (limite LinkedIn)
- ERP.ngo DEVE ser sugerido como "Causas Sociais" no LinkedIn para este perfil — todo Voice é embaixador padrão
- Sempre gerar exatamente 5 Destaques Estratégicos (seção Featured do LinkedIn), variando entre:
  · Artigo TÉCNICO publicado fora do LinkedIn (StratView/blog SAP)
  · Artigo/post publicado DENTRO do LinkedIn
  · Link EXTERNO (column publicada, podcast, vídeo)
  · Imagem de kickoff/go-live/reunião estratégica/evento SAP-AWS
  · Publicação de PARCEIRO citando o Voice (SAP, EPI-USE Global, AWS) ou premiação/elogio/exposição
- "imagens_perfil" deve sugerir: kickoffs, go-lives, reuniões estratégicas, participação em eventos, prêmios, exposições com clientes/parceiros
- Recomendações: priorizar publicações de SAP, EPI-USE Labs, parceiros — associação de marca por proximidade
- Voluntariado: ERP.ngo sempre como Causa Social padrão

AVALIAÇÃO POR PILARES (CRÍTICO — usar escala de 4 níveis em CADA critério):
- 🟢 forte    — está no top 20% dos profissionais SAP/HCM, exemplar
- 🟡 ok       — médio, dá pra melhorar
- 🟠 fraco    — atrás da média, prioridade de ação
- 🔴 ausente  — não existe, gap crítico
- ⚪ na       — não aplicável a este perfil

Avalie EXATAMENTE estes 7 pilares e seus critérios (use o que vê nos screenshots + dados do form; quando não houver evidência, marque "ausente" ou "na" e justifique):

PILAR 1 — IDENTIDADE VISUAL & ESTRUTURAL:
  · URL customizada (linkedin.com/in/nome-sobrenome vs id aleatório)
  · Localização visível + área de atuação
  · Pronouns declarados
  · Primeiras 3 linhas do "Sobre" (gancho antes do "ver mais")
  · CTA no fim do "Sobre" (email/agenda/DM)
  · Modo Criador ativado + hashtags estratégicas
  · Cover story (vídeo 30s no avatar)

PILAR 2 — AUTORIDADE & PROVA SOCIAL:
  · Competências (Skills) Top 3 endossadas alinhadas com expertise
  · Certificações SAP/EPI-USE (S/4HANA, SuccessFactors, HXM, etc.)
  · Formação acadêmica com instituição relevante
  · Recomendações recebidas (qty + qualidade do recomendante)
  · Premiações (Top Voice, SAP Awards, EPI-USE Insights)
  · Eventos como palestrante (TechEd, SAPPHIRE, EPI-USE Insights)
  · Publicações próprias (artigos LinkedIn, blogs externos, StratView)
  · Newsletter própria

PILAR 3 — CONTEÚDO & ATIVIDADE:
  · Frequência de posts (ideal 1-3/semana)
  · Último post < 7 dias (atividade recente)
  · Mix de formato (texto / carrossel / vídeo / imagem / poll)
  · Engajamento médio (likes + comments / followers)
  · Comentários em posts alheios (pilar SSI "engajar com insights")
  · Polls/enquetes publicadas
  · Tagueamento de colegas/clientes/SAP
  · Compartilhamento de conteúdo SAP / EPI-USE mãe / parceiros

PILAR 4 — NETWORK & RELACIONAMENTO:
  · Conexões totais (>500 vira "500+")
  · Followers vs Conexões (ratio)
  · Membro de Grupos SAP Community, RH Brasil, ASUG
  · DM aberto (mensagens disponíveis fora da rede)

PILAR 5 — SSI INDEX (LinkedIn oficial):
  · Estabelecer marca profissional
  · Encontrar pessoas certas
  · Engajar com insights
  · Construir relacionamentos
  (Se SSI Score foi fornecido no form, use-o como referência. Senão, estime cada pilar do SSI pelos screenshots.)

PILAR 6 — ADERÊNCIA EPI-USE (institucional):
  · Capa oficial EPI-USE Brasil ativa
  · Cargo oficial EPI-USE (não inventado)
  · Foto oficial com fundo padrão / alta qualidade
  · Data de entrada na EPI-USE declarada
  · ERP.ngo no voluntariado
  · Menção EPI-USE Voices quando faz sentido
  · Citação ou tag de parceiros (SAP, AWS, HXM)

PILAR 7 — CONVERSÃO (lead → reunião):
  · Link em destaque (Calendly, Linktree, página EPI-USE)
  · CTA explícito em pelo menos 1 destaque
  · Email visível no Sobre ou Contato
  · Botão "Serviços" ativado (LinkedIn) com tags certas

Calcule o score de cada pilar (0-100) pela média ponderada dos critérios (forte=100, ok=70, fraco=40, ausente=10, na=ignorar).
Calcule o "voice_index_score" geral (0-100) = média simples dos 7 scores de pilar.

Retorne a análise em JSON estruturado. Retorne APENAS o JSON, sem texto antes ou depois:
{
  "nome": "string",
  "cargo_atual": "string",
  "empresa_atual": "EPI-USE Brasil",
  "voice_index_score": 0,
  "voice_index_resumo": "string (1-2 frases explicando o score geral — onde o Voice está forte e onde precisa atacar primeiro)",
  "pilares_avaliacao": [
    {
      "pilar": "Identidade Visual & Estrutural",
      "icone": "🪪",
      "score": 0,
      "criterios": [
        { "nome": "URL customizada", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string (1 frase)" },
        { "nome": "Localização visível", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Pronouns declarados", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Gancho nas 3 primeiras linhas do Sobre", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "CTA no fim do Sobre", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Modo Criador + hashtags", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Cover story (vídeo 30s)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Autoridade & Prova Social",
      "icone": "🏆",
      "score": 0,
      "criterios": [
        { "nome": "Top 3 Skills endossadas", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Certificações SAP/EPI-USE", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Formação acadêmica relevante", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Recomendações recebidas", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Premiações (Top Voice, SAP Awards)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Eventos como palestrante", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Publicações próprias (artigos)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Newsletter própria", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Conteúdo & Atividade",
      "icone": "📊",
      "score": 0,
      "criterios": [
        { "nome": "Frequência de posts (1-3/semana)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Último post < 7 dias", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Mix de formato (texto/carrossel/vídeo/poll)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Engajamento médio", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Comentários em posts alheios", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Polls/enquetes publicadas", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Tag de colegas/clientes/SAP", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Compartilha SAP/EPI-USE mãe/parceiros", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Network & Relacionamento",
      "icone": "🌐",
      "score": 0,
      "criterios": [
        { "nome": "Conexões totais (>500)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Ratio Followers/Conexões", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Membro de Grupos relevantes", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "DM aberto", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "SSI Index (LinkedIn oficial)",
      "icone": "📈",
      "score": 0,
      "criterios": [
        { "nome": "Estabelecer marca profissional", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Encontrar pessoas certas", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Engajar com insights", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Construir relacionamentos", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Aderência EPI-USE Brasil",
      "icone": "💼",
      "score": 0,
      "criterios": [
        { "nome": "Capa oficial EPI-USE Brasil", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Cargo oficial EPI-USE", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Foto oficial alta qualidade", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Data de entrada na EPI-USE declarada", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "ERP.ngo no voluntariado", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Menção EPI-USE Voices", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Tag/citação de parceiros (SAP, AWS)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Conversão (lead → reunião)",
      "icone": "🎯",
      "score": 0,
      "criterios": [
        { "nome": "Link em destaque (Calendly/agenda)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "CTA explícito em destaque", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Email visível no Sobre/Contato", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Botão Serviços ativado", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    }
  ],
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

// ════════════════════════════════════════════════════════════════════════════
// SPLIT P1/P2 (v0.4.12) — quebra o kit monolítico em 2 calls Sonnet ~70s cada
// pra evitar timeout 174s. P1 = identidade/conteúdo editável (header, sobre,
// destaques, competências). P2 = Voice Index (7 pilares) + estratégia + KPIs.
// Frontend chama p1, renderiza parcial, chama p2, faz merge {...p1, ...p2}.
// ════════════════════════════════════════════════════════════════════════════

function buildPromptP1(fields) {
  const {
    linkedin_url, nome, area_principal, anos_experiencia,
    resultado_1, resultado_2, resultado_3,
    diferencial_humano, publico_alvo, tom_voz,
    ssi_score, seguidores,
    data_entrada_epiuse, cargo_oficial, foto_oficial
  } = fields;
  const resultados = [resultado_1, resultado_2, resultado_3]
    .filter(Boolean).map((r, i) => `  ${i + 1}. ${r}`).join('\n');

  return `Você é o Profile Optimizer do programa EPI-USE Voices (PARTE 1/2 — IDENTIDADE & CONTEÚDO EDITÁVEL).

CONTEXTO DO PROGRAMA:
- EPI-USE Brasil: maior consultoria SAP HCM/Payroll do Brasil; em evolução para EPI-USE 5.0
- Grupo: EPI-USE / groupelephant.com | 42+ anos | 4.500+ profissionais | 40+ países | SAP Gold Partner
- LOBs: SAP HCM/SuccessFactors, S/4HANA, BTP, Signavio, ServiceNow, Stratview
- IPs: TalenTools, PRISM
- ERP.ngo: 1% receita global → conservação elefantes + combate pobreza rural África (erp.ngo)
- Todo Voice é embaixador ERP.ngo
- SEMPRE "EPI-USE Brasil" por extenso

DADOS FORNECIDOS:
- URL: ${linkedin_url}
- Nome: ${nome || '(ver screenshot)'}
- Área: ${area_principal || '(ver screenshot)'}
- Anos exp: ${anos_experiencia || '(não informado)'}
- Cargo oficial EPI-USE Brasil: ${cargo_oficial || '(não informado)'}
- Data entrada EPI-USE: ${data_entrada_epiuse || '(não informada)'}
- Resultados reais:
${resultados || '  (não informados — use placeholders [preencher])'}
- Diferencial humano: ${diferencial_humano || '(não informado)'}
- Público-alvo: ${publico_alvo || '(não informado)'}
- Tom: ${tom_voz || 'equilibrado'}
- SSI: ${ssi_score || '(não medido)'}
- Seguidores: ${seguidores || '(não informado)'}
- Foto oficial EPI-USE disponível: ${(foto_oficial === 'true' || foto_oficial === true) ? 'Sim' : 'Não confirmado'}

MISSÃO PARTE 1: Diagnóstico + headline + sobre + competências + 5 destaques + ERP.ngo + idioma.

REGRAS:
- Português Brasil
- "Sobre" em 1ª pessoa, máx 2.600 chars, mencionar EPI-USE Voices E ERP.ngo
- Headline máx 220 chars: expertise + EPI-USE Brasil + diferencial + LADO HUMANO se houver
- SEMPRE "EPI-USE Brasil" por extenso
- Competências: priorizar SAP BTP, Clean Core, S/4HANA, SuccessFactors — remover legados
- Resultados reais fornecidos OU placeholder [preencher: ...]
- Sempre 5 Destaques variando: artigo técnico fora LinkedIn | artigo dentro LinkedIn | link externo (podcast/vídeo) | imagem kickoff/go-live/evento SAP-AWS | publicação de PARCEIRO citando o Voice

Retorne APENAS o JSON, sem texto antes/depois:
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
  "headline_sugerida": "string (máx 220 chars)",
  "url_sugerida": "string (linkedin.com/in/nome-sobrenome)",
  "sobre_texto": "string (1ª pessoa, máx 2600 chars, mencionar EPI-USE Voices + ERP.ngo, com [preencher: ...] para placeholders)",
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
  "secao_fotos": {
    "foto_sugestao": "string (orientações concretas para foto de perfil)",
    "imagens_perfil": ["string (sugestões de capa/kickoffs/eventos)"]
  },
  "erp_ngo": {
    "passo_causas_sociais": "string (passo a passo: como adicionar ERP.ngo como Causa Social no LinkedIn)",
    "como_virar_embaixador": "string (como se posicionar como embaixador ERP.ngo)"
  },
  "estrategia_idioma": {
    "orientacoes": ["string (dica prática sobre idioma)"],
    "instrucao_perfil_en": "string (passo a passo: criar perfil secundário em inglês no LinkedIn)"
  }
}`;
}

function buildPromptP2(fields, p1) {
  const { tom_voz, ssi_score, area_principal, publico_alvo } = fields;
  return `Você é o Profile Optimizer do programa EPI-USE Voices (PARTE 2/2 — VOICE INDEX & ESTRATÉGIA).

PARTE 1 JÁ FEITA — perfil:
- Nome: ${p1.nome || '(?)'}
- Cargo: ${p1.cargo_atual || '(?)'}
- Headline sugerida: ${p1.headline_sugerida || '(?)'}
- Área: ${area_principal || '(?)'}
- Público-alvo: ${publico_alvo || '(não informado)'}
- Tom: ${tom_voz || 'equilibrado'}
- SSI: ${ssi_score || '(não medido)'}

CONTEXTO EPI-USE Brasil: maior consultoria SAP HCM/Payroll do Brasil; LOBs SAP HCM/SF, S/4HANA, BTP, Signavio, ServiceNow, Stratview. Todo Voice é embaixador ERP.ngo (1% receita → conservação elefantes + combate pobreza África).

MISSÃO PARTE 2: avaliar perfil em 7 pilares (Voice Index 0-100) + linha editorial 4 semanas + social selling + recomendações + checklist + KPIs + próximos passos.

AVALIAÇÃO POR PILARES — escala 4 níveis em CADA critério:
- 🟢 forte    — top 20%, exemplar
- 🟡 ok       — médio, dá pra melhorar
- 🟠 fraco    — atrás da média, prioridade
- 🔴 ausente  — gap crítico
- ⚪ na       — não aplicável

PILAR 1 IDENTIDADE VISUAL & ESTRUTURAL: URL customizada · Localização · Pronouns · Gancho 3 primeiras linhas Sobre · CTA no fim Sobre · Modo Criador+hashtags · Cover story
PILAR 2 AUTORIDADE & PROVA SOCIAL: Top 3 Skills endossadas · Certificações SAP/EPI-USE · Formação · Recomendações · Premiações · Eventos palestrante · Publicações próprias · Newsletter
PILAR 3 CONTEÚDO & ATIVIDADE: Frequência posts · Último<7d · Mix formato · Engajamento médio · Comentários alheios · Polls · Tag colegas/clientes/SAP · Compartilha SAP/EPI-USE/parceiros
PILAR 4 NETWORK & RELACIONAMENTO: Conexões >500 · Ratio Followers/Conexões · Grupos relevantes · DM aberto
PILAR 5 SSI INDEX: Estabelecer marca · Encontrar pessoas certas · Engajar com insights · Construir relacionamentos
PILAR 6 ADERÊNCIA EPI-USE: Capa oficial · Cargo oficial · Foto alta qualidade · Data entrada · ERP.ngo voluntariado · Menção Voices · Tag parceiros
PILAR 7 CONVERSÃO: Link destaque · CTA em destaque · Email visível · Botão Serviços

Score pilar (0-100) = média ponderada critérios (forte=100, ok=70, fraco=40, ausente=10, na=ignorar).
voice_index_score = média simples dos 7 pilares.

REGRAS LINHA EDITORIAL:
- Pilares: 40% Thought Leadership, 30% Cases, 20% Pessoas, 10% Propósito
- Calendário 4 semanas × 2 posts (8 temas personalizados pra área do Voice)
- Nota: primeiras 4 semanas SEM links externos no corpo (algoritmo penaliza)
- Tom: ${tom_voz || 'equilibrado'}

Retorne APENAS o JSON, sem texto antes/depois:
{
  "voice_index_score": 0,
  "voice_index_resumo": "string (1-2 frases — onde forte, onde atacar primeiro)",
  "pilares_avaliacao": [
    {
      "pilar": "Identidade Visual & Estrutural",
      "icone": "🪪",
      "score": 0,
      "criterios": [
        { "nome": "URL customizada", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Localização visível", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Pronouns declarados", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Gancho 3 primeiras linhas Sobre", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "CTA no fim do Sobre", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Modo Criador + hashtags", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Cover story (vídeo 30s)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Autoridade & Prova Social",
      "icone": "🏆",
      "score": 0,
      "criterios": [
        { "nome": "Top 3 Skills endossadas", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Certificações SAP/EPI-USE", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Formação acadêmica relevante", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Recomendações recebidas", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Premiações (Top Voice, SAP Awards)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Eventos como palestrante", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Publicações próprias (artigos)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Newsletter própria", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Conteúdo & Atividade",
      "icone": "📊",
      "score": 0,
      "criterios": [
        { "nome": "Frequência de posts (1-3/semana)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Último post < 7 dias", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Mix de formato (texto/carrossel/vídeo/poll)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Engajamento médio", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Comentários em posts alheios", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Polls/enquetes publicadas", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Tag de colegas/clientes/SAP", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Compartilha SAP/EPI-USE mãe/parceiros", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Network & Relacionamento",
      "icone": "🌐",
      "score": 0,
      "criterios": [
        { "nome": "Conexões totais (>500)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Ratio Followers/Conexões", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Membro de Grupos relevantes", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "DM aberto", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "SSI Index (LinkedIn oficial)",
      "icone": "📈",
      "score": 0,
      "criterios": [
        { "nome": "Estabelecer marca profissional", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Encontrar pessoas certas", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Engajar com insights", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Construir relacionamentos", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Aderência EPI-USE Brasil",
      "icone": "💼",
      "score": 0,
      "criterios": [
        { "nome": "Capa oficial EPI-USE Brasil", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Cargo oficial EPI-USE", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Foto oficial alta qualidade", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Data de entrada na EPI-USE declarada", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "ERP.ngo no voluntariado", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Menção EPI-USE Voices", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Tag/citação de parceiros (SAP, AWS)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    },
    {
      "pilar": "Conversão (lead → reunião)",
      "icone": "🎯",
      "score": 0,
      "criterios": [
        { "nome": "Link em destaque (Calendly/agenda)", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "CTA explícito em destaque", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Email visível no Sobre/Contato", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" },
        { "nome": "Botão Serviços ativado", "nivel": "forte|ok|fraco|ausente|na", "observacao": "string" }
      ]
    }
  ],
  "ssi_diagnostico": {
    "nivel": "baixo|medio|bom|excelente",
    "observacoes": "string",
    "dicas": ["string"]
  },
  "linha_editorial": {
    "pilares": [
      { "percentual": "40%", "nome": "Thought Leadership", "exemplos": ["string (tema personalizado pra área deste Voice)"] },
      { "percentual": "30%", "nome": "Cases", "exemplos": ["string"] },
      { "percentual": "20%", "nome": "Pessoas", "exemplos": ["string"] },
      { "percentual": "10%", "nome": "Propósito", "exemplos": ["string"] }
    ],
    "calendario_4_semanas": [
      { "semana": 1, "post_1": "string (tema específico pra este Voice)", "post_2": "string" },
      { "semana": 2, "post_1": "string", "post_2": "string" },
      { "semana": 3, "post_1": "string", "post_2": "string" },
      { "semana": 4, "post_1": "string", "post_2": "string" }
    ],
    "nota_algoritmo": "string (dica: primeiras 4 semanas sem links externos no corpo do post)"
  },
  "social_selling": {
    "perfis_para_alertas": ["string (perfis sugeridos pra seguir/comentar)"],
    "exemplo_comentario": "string (modelo de comentário de alto impacto contextualizado pra área deste Voice — mencionar EPI-USE Brasil + dado concreto)",
    "dica_30_min": "string (instrução tática: primeiros 30 min após publicação de líder do nicho, comentar com insight)"
  },
  "recomendacoes": {
    "meta": "8 a 12 recomendações ativas",
    "perfis_prioritarios": ["string"],
    "template_mensagem": "string (mensagem pronta pra copiar e enviar no LinkedIn pedindo recomendação)"
  },
  "checklist": [
    { "item": "string", "prioridade": "urgente|normal|bonus", "passo": "string" }
  ],
  "kpis": {
    "instrucoes_baseline": "string (incluir https://www.linkedin.com/sales/ssi)",
    "metas_90_dias": [
      { "kpi": "SSI Score", "meta": "> 70" },
      { "kpi": "Visualizações de perfil/semana", "meta": "+150%" },
      { "kpi": "Seguidores", "meta": "+30%" },
      { "kpi": "Convites recebidos/semana", "meta": "+25%" },
      { "kpi": "Mensagens diretas recebidas/semana", "meta": "+20%" },
      { "kpi": "Posts publicados (90 dias)", "meta": "24 (2x/semana)" },
      { "kpi": "Impressões médias por post", "meta": "baseline + 100%" }
    ]
  },
  "proximos_passos": ["string"]
}`;
}

// Helper: extrai req.body comum + arquivos pra base64
function _extractCommonInput(req) {
  const files = req.files || [];
  const fields = {
    linkedin_url: req.body.linkedin_url,
    nome: req.body.nome,
    area_principal: req.body.area_principal,
    anos_experiencia: req.body.anos_experiencia,
    resultado_1: req.body.resultado_1,
    resultado_2: req.body.resultado_2,
    resultado_3: req.body.resultado_3,
    diferencial_humano: req.body.diferencial_humano,
    publico_alvo: req.body.publico_alvo,
    tom_voz: req.body.tom_voz,
    ssi_score: req.body.ssi_score,
    seguidores: req.body.seguidores,
    data_entrada_epiuse: req.body.data_entrada_epiuse,
    cargo_oficial: req.body.cargo_oficial,
    foto_oficial: req.body.foto_oficial
  };
  const images = files.map(file => ({
    type: 'image',
    source: { type: 'base64', media_type: file.mimetype, data: fs.readFileSync(file.path).toString('base64') }
  }));
  return { fields, files, images };
}

// POST /api/analisar-perfil/p1 — header + sobre + destaques + ERP.ngo (~70s, max_tokens 8000)
app.post('/api/analisar-perfil/p1', optimizerLimiter, upload.array('screenshots', 5), async (req, res) => {
  const { fields, files, images } = _extractCommonInput(req);
  try {
    if (!fields.linkedin_url) return res.status(400).json({ success: false, error: 'URL do LinkedIn é obrigatória.' });
    const content = [...images, { type: 'text', text: buildPromptP1(fields) }];
    const t0 = Date.now();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content }]
    });
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[optimizer/p1] ${dur}s · ${response.usage?.input_tokens || '?'}→${response.usage?.output_tokens || '?'} · stop=${response.stop_reason}`);
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    if (response.stop_reason === 'max_tokens') {
      return res.status(500).json({ success: false, error: `P1 truncado (${response.usage.output_tokens} tokens). Reduza screenshots ou tente novamente.` });
    }
    let raw = response.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ success: false, error: 'JSON inválido da IA na parte 1.' });
    const p1 = JSON.parse(m[0]);
    res.json({ success: true, p1, dur_ms: Date.now() - t0 });
  } catch (e) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    console.error('[optimizer/p1]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/analisar-perfil/p2 — Voice Index + estratégia + KPIs (~70s, max_tokens 12000)
// Recebe p1_json no body pra ter contexto. NÃO precisa de screenshots (já analisados em p1).
app.post('/api/analisar-perfil/p2', optimizerLimiter, async (req, res) => {
  try {
    const { p1, ...fields } = req.body;
    if (!p1 || !p1.nome) return res.status(400).json({ success: false, error: 'p1 (resultado da parte 1) é obrigatório no body.' });
    const content = [{ type: 'text', text: buildPromptP2(fields, p1) }];
    const t0 = Date.now();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 12000,
      messages: [{ role: 'user', content }]
    });
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[optimizer/p2] ${dur}s · ${response.usage?.input_tokens || '?'}→${response.usage?.output_tokens || '?'} · stop=${response.stop_reason}`);
    if (response.stop_reason === 'max_tokens') {
      return res.status(500).json({ success: false, error: `P2 truncado (${response.usage.output_tokens} tokens). Tente novamente.` });
    }
    let raw = response.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ success: false, error: 'JSON inválido da IA na parte 2.' });
    const p2 = JSON.parse(m[0]);
    res.json({ success: true, p2, dur_ms: Date.now() - t0 });
  } catch (e) {
    console.error('[optimizer/p2]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// LEGACY: /api/analisar-perfil — mantém pra fallback. Faz p1+p2 sequencial internamente.
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

    // Sonnet 4.6: o JSON do kit completo + 7 pilares × ~7 critérios (v0.4.1) chega facilmente
    // em 14-18k tokens output. max_tokens=20000 dá margem confortável.
    const t0 = Date.now();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 20000,
      messages: [{ role: 'user', content }]
    });
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[optimizer] análise concluída em ${dur}s · ${response.usage?.input_tokens || '?'}→${response.usage?.output_tokens || '?'} tokens · stop=${response.stop_reason}`);

    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });

    // Se Claude bateu o teto de output, o JSON tá truncado — falha clara
    if (response.stop_reason === 'max_tokens') {
      return res.status(500).json({
        success: false,
        error: `Resposta truncada (estourou ${response.usage.output_tokens} tokens). Reduza pra 2-3 screenshots ou tente novamente.`
      });
    }

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
      console.error('JSON parse error:', parseErr.message, '· raw length:', rawText.length);
      return res.status(500).json({ success: false, error: 'Resposta da IA incompleta (JSON malformado). Tente novamente ou reduza o número de screenshots.' });
    }
    res.json({ success: true, kit });

  } catch (error) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
    console.error('Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// OPTIMIZER EXTRACT — Vision pass 1: pré-preenche todos os campos do form
// (Haiku 4.5, ~8s, retorna 14 campos + _faltando[] com o que não conseguiu)
// ════════════════════════════════════════════════════════════════════════════
function buildOptimizerExtractPrompt(linkedin_url) {
  return `Você analisa o perfil LinkedIn (URL: ${linkedin_url || 'não fornecida — usar screenshots'}) e pré-preenche o formulário do EPI-USE Voices Profile Optimizer.

Sua tarefa: extrair do que VOCÊ VÊ nos screenshots o máximo possível dos 14 campos abaixo. Onde não houver evidência, retorne null (NÃO INVENTE).

Retorne APENAS este JSON, sem texto antes/depois:
{
  "nome": "nome completo conforme aparece no perfil ou null",
  "cargo_atual": "headline OU cargo principal visível (ex: 'Head Products & Innovation | FIAP') ou null",
  "area_principal": "1-4 palavras do nicho técnico (ex: 'SAP HCM SuccessFactors', 'SAP BTP Cloud', 'Process Mining') ou null",
  "anos_experiencia": "número inteiro inferido das datas de experiência ou null",
  "ssi_score": "número 0-100 só se aparecer screenshot do linkedin.com/sales/ssi senão null",
  "seguidores": "número de seguidores se visível senão null",
  "cargo_oficial": "cargo oficial na EPI-USE Brasil se o perfil já cita (ex: 'Head of Products & Innovation') OU null se ainda não está atualizado",
  "data_entrada_epiuse": "data início se EPI-USE aparece na experiência (formato YYYY-MM ou 'YYYY') ou null",
  "foto_oficial": "true se a foto atual parece profissional/atual (rosto visível, fundo neutro), false se claramente precisa atualizar",
  "resultado_1": "1º resultado quantitativo REAL extraído (ex: '14 anos consultoria SAP HCM' · '280 lojas Drogaria Venancio em 14 meses'). Null se não houver.",
  "resultado_2": "2º resultado quantitativo OU null",
  "resultado_3": "3º resultado quantitativo OU null",
  "diferencial_humano": "1 frase sobre família/paixão/causa/mentoria/esporte visível no perfil (ex: 'pai do João, apaixonado por corrida') ou null",
  "publico_alvo": "1-3 personas que esse perfil deveria atingir (ex: 'CHROs, Diretores RH', 'CIOs, Arquitetos SAP') ou null",
  "tom_voz": "uma das opções: formal | equilibrado | coloquial | técnico-storytelling — inferido dos posts/Sobre, default 'equilibrado'",
  "_faltando": ["array com os NOMES dos campos que você retornou null/vazio — pra UI marcar pro user preencher manualmente"]
}

REGRAS:
- Não invente. Se a info não está visível, retorne null e adicione o nome do campo em _faltando.
- "tom_voz" SEMPRE retorna um valor (default 'equilibrado'), nunca null.
- _faltando deve listar exatamente os keys dos campos null/vazios.
- **CRÍTICO:** mesmo se não houver screenshots (só URL) ou nenhum dado, RETORNE o JSON com todos os campos null + _faltando listando todos. NUNCA retorne texto fora do JSON.`;
}

const optimizerExtractLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,    // mais permissivo que kit completo (10/h) — extract é barato
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de 15 extrações/hora atingido. Tente em 1h.' }
});

app.post('/api/optimizer/extract', optimizerExtractLimiter, upload.array('screenshots', 5), async (req, res) => {
  const files = req.files || [];
  try {
    const { linkedin_url } = req.body;
    if (!linkedin_url && files.length === 0) {
      return res.status(400).json({ success: false, error: 'Forneça URL LinkedIn ou pelo menos 1 screenshot.' });
    }
    const content = [];
    for (const file of files) {
      const base64 = fs.readFileSync(file.path).toString('base64');
      content.push({ type: 'image', source: { type: 'base64', media_type: file.mimetype, data: base64 } });
    }
    content.push({ type: 'text', text: buildOptimizerExtractPrompt(linkedin_url) });

    const t0 = Date.now();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',         // Haiku — barato, rápido (~5-10s pra Vision)
      max_tokens: 2500,
      messages: [{ role: 'user', content }]
    });
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[optimizer/extract] ${dur}s · ${response.usage?.input_tokens || '?'}→${response.usage?.output_tokens || '?'} · stop=${response.stop_reason}`);
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });

    let raw = response.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ success: false, error: 'JSON inválido da IA. Tente novamente.' });
    const data = JSON.parse(m[0]);
    res.json({ success: true, ...data });
  } catch (e) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    console.error('[optimizer/extract]', e.message);
    res.status(500).json({ success: false, error: e.message || 'Falha na extração.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// OPTIMIZER FROM-TRANSCRIPT (v0.4.9) — single textarea com transcrição da
// entrevista. Sonnet extrai os 14 campos do form + sinaliza o que faltou.
// User não precisa preencher nada manualmente — só cola e gera.
// ════════════════════════════════════════════════════════════════════════════
function buildOptimizerTranscriptPrompt(transcript, linkedin_url) {
  return `Você analisa a transcrição de uma entrevista feita com um colaborador da EPI-USE Brasil pra preencher o formulário do Profile Optimizer.

CONTEXTO: Pra otimizar o perfil LinkedIn do Voice, precisamos extrair 14 dados específicos da conversa. Use linguagem natural pra capturar tom e detalhes humanos. Se algo NÃO foi mencionado, retorna null + adiciona o campo em _faltando[].

URL LinkedIn (se disponível): ${linkedin_url || '(não fornecida)'}

═══ TRANSCRIÇÃO DA ENTREVISTA ═══
${transcript}
═══ FIM DA TRANSCRIÇÃO ═══

EXTRAIA EM JSON (APENAS o JSON, sem texto antes/depois):
{
  "nome": "nome completo se mencionado ou null",
  "cargo_atual": "cargo/headline atual (ex: 'Delivery Strategic Account | EPI-USE Brasil') ou null",
  "area_principal": "área SAP principal: SAP HCM / SuccessFactors | SAP BTP / Clean Core | SAP ERP / S/4HANA | SAP Signavio | Analytics / Stratview | ServiceNow HRSD / ITSM | Múltiplas áreas",
  "anos_experiencia": "número inteiro ou null",
  "ssi_score": "0-100 se mencionado SSI, senão null",
  "seguidores": "número se mencionado, senão null",
  "cargo_oficial": "cargo oficial EPI-USE Brasil se citado",
  "data_entrada_epiuse": "data ou ano de entrada (formato YYYY ou 'Mês de YYYY')",
  "foto_oficial": "true se mencionou ter foto oficial, false se admitiu não ter",
  "resultado_1": "1º resultado quantitativo concreto extraído (preferir os com NÚMEROS reais — ex: '14 anos consultoria SAP HCM' · 'Migrei 280 lojas Drogaria Venancio em 14 meses'). Capture com riqueza, NÃO resuma.",
  "resultado_2": "2º resultado quantitativo OU null",
  "resultado_3": "3º resultado quantitativo OU null",
  "diferencial_humano": "1-2 frases sobre família/paixões/causas/esportes/mentorias mencionados (ex: 'pai do João e Maria, apaixonado por trail running, mentor de jovens SAP'). NÃO invente.",
  "publico_alvo": "personas-alvo no LinkedIn mencionadas (ex: 'CHROs, Diretores de RH de empresas com SAP')",
  "tom_voz": "uma das opções: equilibrado | técnico | executivo | inspirador — inferir do tom da entrevista",
  "certificacoes": "lista de certificações SAP mencionadas ou null (string separada por vírgula)",
  "eventos_palestras": "eventos onde palestrou/participou (ex: 'SAP NOW 2025, BTP Experience 2026')",
  "frequencia_post_meta": "se mencionou meta de frequência de posts (ex: '2/semana')",
  "kickoffs_recentes": "kickoffs/go-lives recentes que viraram caso de sucesso",
  "trechos_destacados": "array de 3-5 trechos LITERAIS marcantes da entrevista que valem virar conteúdo de post — frases dele próprio entre aspas",
  "_faltando": ["array com NOMES dos campos null/vazios — pra UI sinalizar pro user"],
  "_confianca": "alta | media | baixa — qualidade geral da transcrição pra extração",
  "_observacoes": "string opcional: o que ficou ambíguo na entrevista, ou sugestões de pergunta de follow-up"
}

REGRAS CRÍTICAS:
- Não invente. Se o entrevistado não falou, retorna null e adiciona em _faltando.
- "tom_voz" SEMPRE retorna um valor (default 'equilibrado').
- "trechos_destacados" deve ter pelo menos 2 itens — frases LITERAIS dele, não paráfrases.
- Não corrija português coloquial nas frases dele; preserve voz natural.
- "resultado_*" são o coração — capture com NÚMEROS quando houver, e contexto suficiente pro Claude gerar Sobre depois.`;
}

const transcriptLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Limite 10/h atingido.' }
});

app.post('/api/optimizer/from-transcript', transcriptLimiter, async (req, res) => {
  try {
    const { transcript, linkedin_url } = req.body || {};
    if (!transcript || transcript.length < 100) {
      return res.status(400).json({ success: false, error: 'Transcrição precisa ter pelo menos 100 caracteres.' });
    }
    if (transcript.length > 80000) {
      return res.status(400).json({ success: false, error: 'Transcrição muito longa (>80k chars). Reduza pra trechos relevantes.' });
    }

    const t0 = Date.now();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',    // Haiku — 5x rápido que Sonnet, qualidade suficiente pra extract estruturado
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildOptimizerTranscriptPrompt(transcript, linkedin_url) }]
    });
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[optimizer/from-transcript] ${dur}s · ${response.usage?.input_tokens}→${response.usage?.output_tokens} · stop=${response.stop_reason}`);
    if (response.stop_reason === 'max_tokens') {
      return res.status(500).json({ success: false, error: 'Extração truncada — transcrição muito longa. Reduza pra trechos mais relevantes.' });
    }

    let raw = response.content[0].text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ success: false, error: 'JSON inválido da IA.' });
    const data = JSON.parse(m[0]);
    res.json({ success: true, ...data });
  } catch (e) {
    console.error('[optimizer/from-transcript]', e.message);
    res.status(500).json({ success: false, error: e.message });
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

// Healthcheck — usado pela Tarefa Agendada do Windows (office-health.ps1) e pelo Railway
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'epi-use-office',
    version: (() => { try { return require('./package.json').version; } catch { return 'unknown'; } })(),
    uptime_s: Math.round(process.uptime()),
    ts: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎙️  EPI-USE Voices — Profile Optimizer`);
  console.log(`🚀  http://localhost:${PORT}\n`);
});
