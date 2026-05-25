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
const POSTS_JSONL      = path.join(__dirname, 'posts.jsonl');

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

// ── ROTAS DO OFFICE ENGINE ────────────────────────────────────────────────────
const OPTIMIZER_PATH = path.join(__dirname, 'public/optimizer.html');
app.get('/optimizer', (req, res) => res.sendFile(OPTIMIZER_PATH));

// Páginas v3.0 — servem do public/ em qualquer ambiente
const PAINEL_PATH     = path.join(__dirname, 'public/painel.html');
const VOICES_PATH     = path.join(__dirname, 'public/voices.html');
const SEJA_VOICE_PATH = path.join(__dirname, 'public/seja-voice.html');
app.get('/painel',     (req, res) => res.sendFile(PAINEL_PATH));
app.get('/voices',     (req, res) => res.sendFile(VOICES_PATH));
app.get('/seja-voice', (req, res) => res.sendFile(SEJA_VOICE_PATH));

if (IS_LOCAL_DEV) {
  // Local: / = Office Engine Game | /dashboard = War Room clássico | /hub = Marketing Hub
  const OFFICE_GAME_PATH = path.resolve('G:/Meu Drive/Claude MKT EUBR/dashboard-escritorio.html');
  const DASHBOARD_PATH   = path.resolve('G:/Meu Drive/Claude MKT EUBR/dashboard-classic.html');
  const MKT_HUB_PATH     = path.resolve('G:/Meu Drive/Claude MKT EUBR/Estudos/portal-mkt-hub-FINAL.html');
  const VERSIONS_DIR     = path.resolve('G:/Meu Drive/Claude MKT EUBR/_versoes-office');
  app.get('/',          (req, res) => res.sendFile(OFFICE_GAME_PATH));
  app.get('/game',      (req, res) => res.sendFile(OFFICE_GAME_PATH));
  app.get('/dashboard', (req, res) => res.sendFile(DASHBOARD_PATH));
  app.get('/hub',       (req, res) => res.sendFile(MKT_HUB_PATH));
  app.use('/_versoes-office', express.static(VERSIONS_DIR));
} else {
  // Railway: servimos os HTMLs do Office direto do public/
  const OFFICE_PROD    = path.join(__dirname, 'public/office.html');
  const DASHBOARD_PROD = path.join(__dirname, 'public/dashboard.html');
  const HUB_PROD       = path.join(__dirname, 'public/hub.html');
  app.get('/',          (req, res) => res.sendFile(OFFICE_PROD));
  app.get('/game',      (req, res) => res.sendFile(OFFICE_PROD));
  app.get('/dashboard', (req, res) => res.sendFile(DASHBOARD_PROD));
  app.get('/hub',       (req, res) => res.sendFile(HUB_PROD));
}

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
  // Append JSONL local (1 linha por inscrição) — em prod isso vai pra Railway logs
  const line = JSON.stringify(clean) + '\n';
  const logPath = path.join(__dirname, 'recruitment-applications.jsonl');
  try {
    fs.appendFileSync(logPath, line);
  } catch (e) {
    console.error('[RECRUITMENT-WRITE-FAIL]', e.message);
  }
  console.log(`[RECRUITMENT] ${clean.nome} (${clean.email}) → vaga ${clean.area} | utm_source=${clean.utm_source}`);

  // Dispara email (não bloqueia response — best effort)
  sendRecruitmentEmail(clean).catch(e => console.error('[EMAIL-UNCAUGHT]', e.message));

  res.json({ success: true, message: 'Inscrição recebida. Você será contactado em até 5 dias úteis.' });
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
    fs.appendFileSync(POSTS_JSONL, JSON.stringify(clean) + '\n');
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

  let raw = '';
  try { raw = fs.existsSync(POSTS_JSONL) ? fs.readFileSync(POSTS_JSONL, 'utf8') : ''; }
  catch (e) { return res.status(500).json({ success: false, error: e.message }); }

  const allSnapshots = raw.trim().split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  // Filter by voice
  let filtered = voiceFilter ? allSnapshots.filter(p => p.voice_id === voiceFilter) : allSnapshots;

  // Group by post_url, keep latest snapshot per post
  const byUrl = new Map();
  for (const snap of filtered) {
    const existing = byUrl.get(snap.post_url);
    if (!existing || new Date(snap.captured_at) > new Date(existing.captured_at)) {
      byUrl.set(snap.post_url, snap);
    }
  }
  let posts = [...byUrl.values()].sort((a, b) => new Date(b.published_at || b.captured_at) - new Date(a.published_at || a.captured_at));

  // Filter by period
  if (period !== 'all') {
    const days = parseInt(period, 10);
    const cutoff = Date.now() - days * 86400000;
    posts = posts.filter(p => new Date(p.published_at || p.captured_at).getTime() >= cutoff);
  }

  res.json({ success: true, posts, total: posts.length });
});

// GET /api/posts/timeline/:post_id — todos snapshots de 1 post (evolução)
app.get('/api/posts/timeline/:post_id', (req, res) => {
  const pid = String(req.params.post_id).slice(0, 60);
  let raw = '';
  try { raw = fs.existsSync(POSTS_JSONL) ? fs.readFileSync(POSTS_JSONL, 'utf8') : ''; }
  catch (e) { return res.status(500).json({ success: false, error: e.message }); }
  const snaps = raw.trim().split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } })
                  .filter(s => s && s.post_id === pid)
                  .sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
  res.json({ success: true, snapshots: snaps });
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
  if (fs.existsSync(POSTS_JSONL)) {
    const raw = fs.readFileSync(POSTS_JSONL, 'utf8');
    const byUrl = new Map();
    raw.trim().split('\n').filter(Boolean).forEach(l => {
      try { const s = JSON.parse(l); if (s.voice_id === slug) {
        const ex = byUrl.get(s.post_url);
        if (!ex || new Date(s.captured_at) > new Date(ex.captured_at)) byUrl.set(s.post_url, s);
      }} catch {}
    });
    recentPosts = [...byUrl.values()].sort((a, b) => new Date(b.published_at || b.captured_at) - new Date(a.published_at || a.captured_at)).slice(0, 5);
  }

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

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,   // aumentado: JSON completo pode ter 5-6k tokens
      messages: [{ role: 'user', content }]
    });

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎙️  EPI-USE Voices — Profile Optimizer`);
  console.log(`🚀  http://localhost:${PORT}\n`);
});
