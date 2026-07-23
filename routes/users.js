// ════════════════════════════════════════════════════════════════════════════
// routes/users.js — Users & Roles (SSO Microsoft)
// Fonte de verdade do perfil/role de cada pessoa. Resolve role -> persona +
// landing, faz upsert no login (auth.js) e expõe CRUD admin em /api/admin/users.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const { db, requireEditorToken } = require('../server-context');

// role -> { persona (home), landing }. persona casa com os ids de personas.json.
// Quem não está cadastrado entra como 'hub' e cai no Marketing Hub central.
const ROLE_CONFIG = {
  'head':            { persona: 'ruda',      landing: '/',     admin: true },
  'intelligence':    { persona: 'bruna',     landing: '/' },
  'growth':          { persona: 'gui',       landing: '/' },
  'field':           { persona: 'fernanda',  landing: '/' },
  'pipeline':        { persona: 'marlison',  landing: '/' },
  'brand':           { persona: 'duda',      landing: '/' },
  'conteudo':        { persona: 'conteudo',  landing: '/' },
  'country-manager': { persona: 'roberto',   landing: '/area/diretoria' }, // Roberto Medeiros (EPI-USE BR)
  'diretoria':       { persona: 'roberto',   landing: '/area/diretoria' }, // Alexandre Ormigo (Stratview) + big bosses
  'hub':             { persona: 'visitante', landing: '/hub' },
};
const ROLES = Object.keys(ROLE_CONFIG);
const DEFAULT_ROLE = 'hub';

function resolveRoleConfig(role) {
  return ROLE_CONFIG[role] || ROLE_CONFIG[DEFAULT_ROLE];
}

function getUserByEmail(email) {
  if (!email) return null;
  try {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  } catch (e) { console.warn('[users] getUserByEmail:', e.message); return null; }
}

// Cria (role 'hub') se novo; atualiza nome/oid se já existe. Não rebaixa role.
function upsertUser({ email, name, oid }) {
  if (!email) return null;
  const em = String(email).toLowerCase();
  try {
    const existing = getUserByEmail(em);
    if (existing) {
      db.prepare(`UPDATE users SET name = COALESCE(NULLIF(?,''), name),
                  azure_oid = COALESCE(NULLIF(?,''), azure_oid),
                  updated_at = datetime('now') WHERE email = ?`)
        .run(name || '', oid || '', em);
    } else {
      db.prepare(`INSERT INTO users (email, name, azure_oid, role) VALUES (?, ?, ?, ?)`)
        .run(em, name || '', oid || '', DEFAULT_ROLE);
    }
    return getUserByEmail(em);
  } catch (e) { console.warn('[users] upsertUser:', e.message); return null; }
}

// Resolve {role, persona, landing, admin} de um registro de usuário.
function profileFor(user) {
  const role = (user && user.active !== 0 && user.role) || DEFAULT_ROLE;
  const cfg = resolveRoleConfig(role);
  const persona = (user && user.persona) || cfg.persona;
  return { role, persona, landing: cfg.landing, admin: !!cfg.admin };
}

// Landing de acordo com a visualização escolhida (office|game).
//  - office: landing normal do role (head/áreas → '/', country/diretoria → /area/diretoria, hub → /hub)
//  - game:   colaborador (hub) → /game-hub; demais (time mkt) → /game
function landingForView(role, view) {
  const cfg = resolveRoleConfig(role);
  if (view === 'game') return role === 'hub' ? '/game-hub' : '/game';
  return cfg.landing; // 'office' (default)
}

// Grava a visualização preferida (office|game) do usuário. Idempotente.
function setUserView(email, view) {
  if (!email) return null;
  const v = view === 'game' ? 'game' : 'office';
  try {
    db.prepare(`UPDATE users SET default_view=?, updated_at=datetime('now') WHERE email=?`)
      .run(v, String(email).toLowerCase());
    return v;
  } catch (e) { console.warn('[users] setUserView:', e.message); return null; }
}

// Usuário logado escolhe/troca a visualização. Grava o default e diz pra onde ir.
router.post('/api/users/me/view', express.json(), (req, res) => {
  const u = req.session && req.session.user;
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  const view = (req.body && req.body.view) === 'game' ? 'game' : 'office';
  const saved = setUserView(u.email, view);
  if (!saved) return res.status(500).json({ error: 'save_failed' });
  res.json({ success: true, view: saved, redirect: landingForView(u.role || 'hub', saved) });
});

// Middleware: exige que a sessão tenha um dos roles informados.
function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.session && req.session.user && req.session.user.role;
    if (role && roles.includes(role)) return next();
    if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'forbidden', need: roles });
    return res.status(403).send('Acesso restrito.');
  };
}

// Admin guard: passa se for 'head' na sessão OU se trouxer editor token válido.
function requireAdmin(req, res, next) {
  const role = req.session && req.session.user && req.session.user.role;
  if (role === 'head') return next();
  return requireEditorToken(req, res, next);
}

// Guard da Visão Executiva (CMO): head (Rudá) OU country-manager (Roberto) na
// sessão, OU editor token válido (uso local/programático).
function requireExec(req, res, next) {
  const role = req.session && req.session.user && req.session.user.role;
  if (role === 'head' || role === 'country-manager') return next();
  return requireEditorToken(req, res, next);
}

// ── Página admin ──────────────────────────────────────────────────────────────
router.get('/admin/usuarios', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-usuarios.html'));
});

// ── API CRUD ────────────────────────────────────────────────────────────────
router.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM users ORDER BY role, email').all();
    res.json({ roles: ROLES, role_config: ROLE_CONFIG, users: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cria ou atualiza (upsert) um usuário pelo email.
router.post('/api/admin/users', requireAdmin, express.json(), (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'email_invalido' });
    const role = ROLES.includes(b.role) ? b.role : DEFAULT_ROLE;
    const name = (b.name || '').trim();
    const persona = (b.persona || '').trim();
    const active = b.active === false || b.active === 0 ? 0 : 1;
    const exists = getUserByEmail(email);
    if (exists) {
      db.prepare(`UPDATE users SET name=?, role=?, persona=?, active=?, updated_at=datetime('now') WHERE email=?`)
        .run(name || exists.name, role, persona, active, email);
    } else {
      db.prepare(`INSERT INTO users (email, name, role, persona, active) VALUES (?,?,?,?,?)`)
        .run(email, name, role, persona, active);
    }
    res.json({ success: true, user: getUserByEmail(email) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Atualiza campos de um usuário existente.
router.put('/api/admin/users/:email', requireAdmin, express.json(), (req, res) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const u = getUserByEmail(email);
    if (!u) return res.status(404).json({ error: 'nao_encontrado' });
    const b = req.body || {};
    const role = ROLES.includes(b.role) ? b.role : u.role;
    const name = b.name !== undefined ? String(b.name).trim() : u.name;
    const persona = b.persona !== undefined ? String(b.persona).trim() : u.persona;
    const active = b.active !== undefined ? (b.active ? 1 : 0) : u.active;
    db.prepare(`UPDATE users SET name=?, role=?, persona=?, active=?, updated_at=datetime('now') WHERE email=?`)
      .run(name, role, persona, active, email);
    res.json({ success: true, user: getUserByEmail(email) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
// helpers reusados por routes/auth.js e server.js
module.exports.ROLE_CONFIG = ROLE_CONFIG;
module.exports.ROLES = ROLES;
module.exports.resolveRoleConfig = resolveRoleConfig;
module.exports.getUserByEmail = getUserByEmail;
module.exports.upsertUser = upsertUser;
module.exports.profileFor = profileFor;
module.exports.landingForView = landingForView;
module.exports.setUserView = setUserView;
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
module.exports.requireExec = requireExec;
