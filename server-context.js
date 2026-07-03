// ── CONTEXTO COMPARTILHADO DO BACKEND ──────────────────────────────────────────

const fs0 = require('fs');
const os0 = require('os');
const path = require('path');
const crypto = require('crypto');

// Detecta o usuário atual automaticamente (Ruds, rudac, ou qualquer outro)
const _winUser = os0.userInfo().username;
const _localCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/node_modules`,
  'C:/Users/Ruds/.epiuse-optimizer/node_modules',
];
const localModules = _localCandidates.find(p => fs0.existsSync(p)) || '';
const IS_LOCAL_DEV = process.platform === 'win32' && !!localModules;

// Carrega .env off-repo (API keys não vão no git)
const _envCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/.env`,
  'C:/Users/Ruds/.epiuse-optimizer/.env',
  path.resolve(__dirname, '.env'),
];
for (const _ep of _envCandidates) {
  if (fs0.existsSync(_ep)) {
    try {
      const _lines = fs0.readFileSync(_ep, 'utf8').replace(/^﻿/, '').split('\n');
      _lines.forEach(l => {
        const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      });
      console.log(`[boot-context] .env carregado: ${_ep}`);
    } catch {}
    break;
  }
}

if (IS_LOCAL_DEV) {
  require('module').Module._nodeModulePaths = () => [localModules, 'node_modules'];
}

// Imports dinâmicos baseados no ambiente
const express   = IS_LOCAL_DEV ? require(localModules + '/express')            : require('express');
const multer    = IS_LOCAL_DEV ? require(localModules + '/multer')             : require('multer');
const Anthropic = IS_LOCAL_DEV ? require(localModules + '/@anthropic-ai/sdk')  : require('@anthropic-ai/sdk');
const rateLimit = IS_LOCAL_DEV ? require(localModules + '/express-rate-limit') : require('express-rate-limit');

let Resend;
try { Resend = (IS_LOCAL_DEV ? require(localModules + '/resend') : require('resend')).Resend; }
catch (e) { console.warn('[boot-context] resend não instalado — emails serão ignorados:', e.message); }

const seoChecker = require('./scripts/integrations/seo_checker');

// ── EDITOR AUTH E SEGURANÇA (ECC Security Guidelines) ─────────────────────────
// Em vez de fallbacks fixos chumbados no código fonte, geramos UUIDs dinâmicos em runtime 
// se as variáveis não estiverem setadas, bloqueando acesso externo por tokens padrões.
const EDITOR_TOKEN = process.env.EDITOR_TOKEN;
if (!EDITOR_TOKEN) {
  console.warn('[boot-context] ⚠️ EDITOR_TOKEN não definido no ambiente. Gerando token dinâmico descartável para segurança.');
}
const ACTIVE_EDITOR_TOKEN = EDITOR_TOKEN || crypto.randomBytes(32).toString('hex');

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.warn('[boot-context] ⚠️ SESSION_SECRET não definido no ambiente. Gerando chave de sessão aleatória descartável.');
}
const ACTIVE_SESSION_SECRET = SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Check puro do token, comparação constant-time (evita timing attack).
function hasValidEditorToken(req) {
  const t = req.query.token || req.headers['x-editor-token'];
  if (!t || typeof t !== 'string') return false;
  const a = Buffer.from(t), b = Buffer.from(ACTIVE_EDITOR_TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Rotas de ESCRITA sensíveis: token server-to-server OU sessão SSO de quem é
// do time de marketing (qualquer role exceto 'hub' — colaborador comum só lê).
function requireEditorToken(req, res, next) {
  if (hasValidEditorToken(req)) return next();
  const role = req.session && req.session.user && req.session.user.role;
  if (role && role !== 'hub') return next();
  return res.status(401).json({ success: false, error: 'Token inválido' });
}

// Gate global de /api/*: qualquer sessão autenticada (inclusive role 'hub' —
// o Marketing Hub, game e brindes dependem dessas APIs) OU token de editor.
// Dev local fica aberto: não há SSO configurado na máquina do desenvolvedor
// e as telas locais do Office precisam continuar funcionando sem token.
function requireApiAccess(req, res, next) {
  if (IS_LOCAL_DEV) return next();
  if (req.session && req.session.user) return next();
  if (hasValidEditorToken(req)) return next();
  return res.status(401).json({ error: 'auth_required' });
}

// ── PATHS DE DADOS ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const DB_DIR = IS_LOCAL_DEV
  ? localModules.replace(/[\\/]node_modules$/, '')
  : (process.env.DATA_DIR || path.join(__dirname, 'data'));
if (!fs0.existsSync(DB_DIR)) fs0.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'db.sqlite');

// ── SQLite DATABASE ───────────────────────────────────────────────────────────
const Database = (() => {
  try { return IS_LOCAL_DEV ? require(localModules + '/better-sqlite3') : require('better-sqlite3'); }
  catch (e) { console.error('[boot-context] FATAL: better-sqlite3 não encontrado:', e.message); process.exit(1); }
})();

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── CLIENTS COMPARTILHADOS ────────────────────────────────────────────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = (Resend && process.env.RESEND_API_KEY) ? new Resend(process.env.RESEND_API_KEY) : null;

// ── SSO MICROSOFT CONFIGURAÇÃO ────────────────────────────────────────────────
let msalNode = null;
try { msalNode = IS_LOCAL_DEV ? require(localModules + '/@azure/msal-node') : require('@azure/msal-node'); }
catch(e){ console.warn('[sso-context] @azure/msal-node ausente:', e.message); }

const SSO_ENABLED = !!(msalNode && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID);
const SSO_REDIRECT = IS_LOCAL_DEV
  ? (process.env.AZURE_REDIRECT_URI_DEV || ('http://localhost:' + PORT + '/auth/callback'))
  : (process.env.AZURE_REDIRECT_URI || 'https://epiuse-voices-optimizer.up.railway.app/auth/callback');
const SSO_DOMAINS = (process.env.SSO_ALLOWED_DOMAINS || 'epiuse.com.br').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const SSO_SCOPES = ['openid', 'profile', 'email', 'User.Read', 'offline_access'];

let msalClient = null;
if (SSO_ENABLED) {
  msalClient = new msalNode.ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/' + process.env.AZURE_TENANT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET
    }
  });
}

function requireAuth(req, res, next) {
  // Dev local: nunca bloqueia (não há Azure configurado na máquina do dev).
  if (IS_LOCAL_DEV) return next();
  // Em produção, exigir SSO configurado é o padrão (fail-closed). Antes,
  // faltar as env vars do Azure deixava a aplicação inteira aberta pra
  // qualquer visitante — isso foi corrigido aqui (ver SECURITY.md).
  // Escape explícito e documentado: SSO_ENFORCE=false (uso só emergencial).
  if (process.env.SSO_ENFORCE === 'false') return next();
  if (!SSO_ENABLED) {
    console.error('[auth] BLOQUEADO: SSO não configurado em produção (faltam AZURE_CLIENT_ID/AZURE_CLIENT_SECRET/AZURE_TENANT_ID). Acesso negado por padrão até a configuração ser concluída no Railway.');
    if (req.path.startsWith('/api/')) return res.status(503).json({ error: 'auth_not_configured' });
    return res.status(503).send('Autenticação não configurada. Contate o administrador.');
  }
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'auth_required' });
  // Manda pra tela de login branded (com portas Office/Game), não direto pro Microsoft.
  res.redirect('/login?returnTo=' + encodeURIComponent(req.originalUrl));
}

module.exports = {
  IS_LOCAL_DEV,
  localModules,
  PORT,
  DB_DIR,
  DB_PATH,
  db,
  ACTIVE_EDITOR_TOKEN,
  ACTIVE_SESSION_SECRET,
  hasValidEditorToken,
  requireEditorToken,
  requireApiAccess,
  requireAuth,
  client,
  resend,
  seoChecker,
  SSO_ENABLED,
  SSO_REDIRECT,
  SSO_DOMAINS,
  SSO_SCOPES,
  msalClient,
  rateLimit,
  multer,
  express
};
