// ════════════════════════════════════════════════════════════════════════════
// routes/users.js — Users & Roles (SSO Microsoft)
// Fonte de verdade do perfil/role de cada pessoa. Resolve role -> persona +
// landing, faz upsert no login (auth.js) e expõe CRUD admin em /api/admin/users.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const { db, requireEditorToken, IS_LOCAL_DEV } = require('../server-context');

// Super admin: atrelado à IDENTIDADE, não ao papel. Promover alguém a 'head' no
// painel não dá a essa pessoa poder sobre as permissões dos outros — e o editor
// token (credencial de máquina) também não: com ele, qualquer um que o tivesse
// criava contas e mudava papéis.
const SUPER_ADMINS = new Set(String(process.env.SUPER_ADMIN_EMAILS || 'ruda.costa@epiuse.com.br')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
function isSuperAdmin(req) {
  const e = req.session && req.session.user && req.session.user.email;
  return !!e && SUPER_ADMINS.has(String(e).toLowerCase());
}
// Áreas além das do papel, concedidas pelo super admin (JSON array de ids).
try { db.exec(`ALTER TABLE users ADD COLUMN areas_extra TEXT DEFAULT '[]'`); } catch (_e) { /* já existe */ }

function requireSuperAdmin(req, res, next) {
  if (isSuperAdmin(req)) return next();
  // Na máquina local (Windows, sem SSO) não há sessão: o token ainda serve lá.
  if (IS_LOCAL_DEV) return requireEditorToken(req, res, next);
  if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'forbidden' });
  return res.status(403).send('Acesso restrito.');
}

// role -> { persona (home), landing }. persona casa com os ids de personas.json.
// Quem não está cadastrado entra como 'hub' e cai no Marketing Hub central.
const ROLE_CONFIG = {
  'head':            { persona: 'ruda',      landing: '/',     admin: true },
  'intelligence':    { persona: 'bruna',     landing: '/' },
  'growth':          { persona: 'gui',       landing: '/' },
  'field':           { persona: 'field',     landing: '/' },
  'pipeline':        { persona: 'marlison',  landing: '/' },
  'brand':           { persona: 'duda',      landing: '/' },
  'conteudo':        { persona: 'conteudo',  landing: '/' },
  'country-manager': { persona: 'roberto',   landing: '/area/diretoria' }, // Roberto Medeiros (EPI-USE BR)
  'diretoria':       { persona: 'roberto',   landing: '/area/diretoria' }, // Alexandre Ormigo (Stratview) + big bosses
  'voice':           { persona: 'visitante', landing: '/voices/pautas' }, // EPI-USE Voice: revisa e publica as próprias pautas
  'hub':             { persona: 'visitante', landing: '/hub' },
};
const ROLES = Object.keys(ROLE_CONFIG);
const DEFAULT_ROLE = 'hub';

// Saída de pessoa do time (acesso + nome espalhado pelo banco) é tratada em
// routes/offboarding.js, que roda no fim do boot — precisa das tabelas de todos
// os módulos, e várias só existem depois que os routers carregam.

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
  // admin (menu e alertas de administração) só pro super admin, nunca pelo papel.
  const admin = !!cfg.admin && !!user && SUPER_ADMINS.has(String(user.email || '').toLowerCase());
  return { role, persona, landing: cfg.landing, admin };
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

// Admin guard: super admin (por e-mail) OU editor token válido.
function requireAdmin(req, res, next) {
  if (isSuperAdmin(req)) return next();
  return requireEditorToken(req, res, next);
}

// Guard da Visão Executiva: super admin, Diretoria (country-manager e diretoria)
// OU editor token válido (uso local/programático).
function requireExec(req, res, next) {
  const role = req.session && req.session.user && req.session.user.role;
  if (isSuperAdmin(req) || role === 'country-manager' || role === 'diretoria') return next();
  return requireEditorToken(req, res, next);
}

// Só ids de área conhecidos e concedíveis entram (admin nunca é concedível).
function limparAreas(v) {
  const ok = require('./acesso').AREAS_CONCEDIVEIS;
  return [...new Set((Array.isArray(v) ? v : []).filter(x => ok.includes(x)))];
}

// ── Página admin ──────────────────────────────────────────────────────────────
router.get('/admin/usuarios', requireSuperAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-usuarios.html'));
});

// ── API CRUD ────────────────────────────────────────────────────────────────
router.get('/api/admin/users', requireSuperAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM users ORDER BY role, email').all();
    const ac = require('./acesso');
    res.set('Cache-Control', 'no-store');
    res.json({ roles: ROLES, role_config: ROLE_CONFIG, users: rows,
               areas: ac.AREAS, role_areas: ac.ROLE_AREAS, concediveis: ac.AREAS_CONCEDIVEIS,
               super_admins: [...SUPER_ADMINS] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cria ou atualiza (upsert) um usuário pelo email.
router.post('/api/admin/users', requireSuperAdmin, express.json(), (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'email_invalido' });
    const role = ROLES.includes(b.role) ? b.role : DEFAULT_ROLE;
    if (role === 'head' && !SUPER_ADMINS.has(email)) return res.status(400).json({ error: 'head_so_super_admin' });
    const name = (b.name || '').trim();
    const persona = (b.persona || '').trim();
    const active = b.active === false || b.active === 0 ? 0 : 1;
    const extras = JSON.stringify(limparAreas(b.areas_extra));
    const exists = getUserByEmail(email);
    if (exists) {
      db.prepare(`UPDATE users SET name=?, role=?, persona=?, active=?, areas_extra=?, updated_at=datetime('now') WHERE email=?`)
        .run(name || exists.name, role, persona, active, extras, email);
    } else {
      db.prepare(`INSERT INTO users (email, name, role, persona, active, areas_extra) VALUES (?,?,?,?,?,?)`)
        .run(email, name, role, persona, active, extras);
    }
    res.json({ success: true, user: getUserByEmail(email) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Atualiza campos de um usuário existente.
router.put('/api/admin/users/:email', requireSuperAdmin, express.json(), (req, res) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const u = getUserByEmail(email);
    if (!u) return res.status(404).json({ error: 'nao_encontrado' });
    const b = req.body || {};
    const role = ROLES.includes(b.role) ? b.role : u.role;
    if (role === 'head' && !SUPER_ADMINS.has(email)) return res.status(400).json({ error: 'head_so_super_admin' });
    // O super admin não se rebaixa nem se desativa pelo painel: trancaria o Office.
    if (SUPER_ADMINS.has(email) && (role !== 'head' || b.active === false || b.active === 0)) {
      return res.status(400).json({ error: 'super_admin_protegido' });
    }
    const name = b.name !== undefined ? String(b.name).trim() : u.name;
    const persona = b.persona !== undefined ? String(b.persona).trim() : u.persona;
    const active = b.active !== undefined ? (b.active ? 1 : 0) : u.active;
    const extras = b.areas_extra !== undefined ? JSON.stringify(limparAreas(b.areas_extra)) : (u.areas_extra || '[]');
    db.prepare(`UPDATE users SET name=?, role=?, persona=?, active=?, areas_extra=?, updated_at=datetime('now') WHERE email=?`)
      .run(name, role, persona, active, extras, email);
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
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.isSuperAdmin = isSuperAdmin;
module.exports.SUPER_ADMINS = SUPER_ADMINS;
