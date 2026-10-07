// ════════════════════════════════════════════════════════════════════════════
// routes/horas.js — Módulo 32: Banco de Horas MKT (v2)
// Controle interno de horas a mais (+) e a menos (−) do time de marketing.
// Saldo acumulativo, sem validade e sem aprovação. Cada pessoa vê só o próprio
// saldo; o super admin (Rudá) vê o painel do time inteiro.
// Notifica o Rudá por e-mail (Resend) a cada +8h acumuladas por alguém.
//
// v2 (out/2026): categorias, edição de registro, resumo do mês, série de 6
// meses, exportação CSV e flag `admin` vinda do servidor (o front não adivinha).
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const path = require('path');
const router = express.Router();
const { db, requireAuth } = require('../server-context');
const mailer = require('./email');   // remetente com fallback + log (Módulo 33)

const NOTIFY_EMAIL = mailer.NOTIFY_EMAIL;
const THRESHOLD_H  = 8;

// Categorias do registro (gravadas na coluna `project`, que já existia na v1).
const CATEGORIAS = {
  evento:      'Evento',
  campanha:    'Campanha / entrega',
  deadline:    'Deadline',
  viagem:      'Viagem',
  reuniao:     'Reunião fora do horário',
  compensacao: 'Compensação / folga',
  pessoal:     'Saída pessoal',
  outro:       'Outro',
};

// ── SCHEMA ───────────────────────────────────────────────────────────────────
db.exec(`CREATE TABLE IF NOT EXISTS hour_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email  TEXT    NOT NULL,
  user_name   TEXT    NOT NULL DEFAULT '',
  date        TEXT    NOT NULL,
  hours       REAL    NOT NULL,
  reason      TEXT    NOT NULL DEFAULT '',
  project     TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
)`);
try { db.exec(`ALTER TABLE hour_logs ADD COLUMN updated_at TEXT`); } catch (_e) { /* já existe */ }
db.exec(`CREATE INDEX IF NOT EXISTS idx_hour_logs_user ON hour_logs (user_email, date)`);

db.exec(`CREATE TABLE IF NOT EXISTS hour_notifications (
  user_email  TEXT    NOT NULL,
  threshold   REAL    NOT NULL,
  sent_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_email, threshold)
)`);

// ── HELPERS ──────────────────────────────────────────────────────────────────
// Painel do time inteiro: só o super admin (por e-mail), não qualquer 'head'.
function isAdmin(req) {
  return require('./users').isSuperAdmin(req);
}

function getEmail(req) {
  return req.session?.user?.email?.toLowerCase();
}

const escHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Data de hoje no fuso de Brasília (o servidor do Railway roda em UTC).
function hojeBR() {
  return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
}

function getSaldo(email) {
  const row = db.prepare('SELECT COALESCE(SUM(hours), 0) AS saldo FROM hour_logs WHERE user_email = ?').get(email);
  return row ? Math.round(row.saldo * 100) / 100 : 0;
}

function getTime() {
  return db.prepare(`
    SELECT user_email, MAX(user_name) AS user_name,
           COALESCE(SUM(hours), 0) AS saldo,
           COALESCE(SUM(CASE WHEN hours > 0 THEN hours END), 0) AS mais,
           COALESCE(SUM(CASE WHEN hours < 0 THEN -hours END), 0) AS menos,
           COUNT(*) AS registros, MAX(date) AS ultimo_registro
    FROM hour_logs GROUP BY user_email ORDER BY saldo DESC
  `).all().map(p => ({ ...p, alerta: p.saldo >= THRESHOLD_H }));
}

// Mais/menos por mês (últimos N meses, inclusive o atual), meses vazios com zero.
function getSerie(email, meses = 6) {
  const rows = db.prepare(`
    SELECT substr(date, 1, 7) AS mes,
           COALESCE(SUM(CASE WHEN hours > 0 THEN hours END), 0) AS mais,
           COALESCE(SUM(CASE WHEN hours < 0 THEN -hours END), 0) AS menos
    FROM hour_logs WHERE user_email = ? GROUP BY mes
  `).all(email);
  const porMes = Object.fromEntries(rows.map(r => [r.mes, r]));
  const [y, m] = hojeBR().split('-').map(Number);
  const out = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const k = d.toISOString().slice(0, 7);
    out.push({ mes: k, mais: porMes[k]?.mais || 0, menos: porMes[k]?.menos || 0 });
  }
  return out;
}

function validar(body, { parcial = false } = {}) {
  const out = {};
  if (!parcial || body.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) return { erro: 'Data inválida (use AAAA-MM-DD).' };
    if (body.date > hojeBR()) return { erro: 'Não dá pra registrar horas numa data futura.' };
    if (body.date < '2020-01-01') return { erro: 'Data muito antiga.' };
    out.date = body.date;
  }
  if (!parcial || body.hours !== undefined) {
    const h = Math.round(parseFloat(body.hours) * 100) / 100;
    if (isNaN(h) || h === 0) return { erro: 'Informe as horas (diferente de zero).' };
    if (Math.abs(h) > 16) return { erro: 'Máximo de 16h por registro.' };
    out.hours = h;
  }
  if (!parcial || body.reason !== undefined) {
    out.reason = String(body.reason || '').trim().slice(0, 500);
    // U+FFFD = texto chegou fora de UTF-8 (acento vira losango). Melhor recusar do que gravar quebrado.
    if (out.reason.includes('�')) return { erro: 'O motivo chegou com acentos corrompidos. Digite de novo, por favor.' };
  }
  if (!parcial || body.categoria !== undefined) {
    const c = String(body.categoria || 'outro');
    out.project = CATEGORIAS[c] ? c : 'outro';
  }
  return { dados: out };
}

async function checkAndNotify(email, name) {
  const saldo = getSaldo(email);
  if (saldo < THRESHOLD_H) return;

  const bucket = Math.floor(saldo / THRESHOLD_H) * THRESHOLD_H;
  const ja = db.prepare('SELECT 1 FROM hour_notifications WHERE user_email = ? AND threshold = ?').get(email, bucket);
  if (ja) return;
  db.prepare('INSERT OR IGNORE INTO hour_notifications (user_email, threshold) VALUES (?, ?)').run(email, bucket);

  const nome = escHtml(name || email.split('@')[0]);
  await mailer.enviar({
    tipo: 'horas', para: NOTIFY_EMAIL,
    assunto: `⏰ Banco de Horas — ${name || email} atingiu +${saldo.toFixed(1)}h acumuladas`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#001844;margin:0 0 16px">⏰ Alerta de Banco de Horas</h2>
        <p style="font-size:15px;line-height:1.6;color:#333">
          <strong>${nome}</strong> (${escHtml(email)}) atingiu
          <strong style="color:#CE181E">+${saldo.toFixed(1)}h</strong> acumuladas no banco de horas.
        </p>
        <p style="font-size:13px;color:#666;margin-top:16px">
          Você recebe este aviso a cada +${THRESHOLD_H}h acumuladas.<br>
          <a href="${mailer.OFFICE_URL}/horas" style="color:#001844">Abrir o painel do time →</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="font-size:11px;color:#999">EPI-USE Office · Banco de Horas MKT</p>
      </div>`,
  });
}

// ── PÁGINA ───────────────────────────────────────────────────────────────────
router.get('/horas', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/horas.html'));
});

// ── API: saldo simples (usado pelo atalho da home) ───────────────────────────
router.get('/api/horas/saldo', requireAuth, (req, res) => {
  const email = getEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  res.json({ meu: getSaldo(email), limite: THRESHOLD_H });
});

// ── API: resumo da página (saldo, mês, série, time se admin) ─────────────────
router.get('/api/horas/resumo', requireAuth, (req, res) => {
  const email = getEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const admin = isAdmin(req);
  const mes = hojeBR().slice(0, 7);
  const m = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN hours > 0 THEN hours END), 0) AS mais,
           COALESCE(SUM(CASE WHEN hours < 0 THEN -hours END), 0) AS menos,
           COUNT(*) AS registros
    FROM hour_logs WHERE user_email = ? AND substr(date, 1, 7) = ?
  `).get(email, mes);
  const ultimo = db.prepare('SELECT date FROM hour_logs WHERE user_email = ? ORDER BY date DESC LIMIT 1').get(email);
  res.json({
    admin,
    email,
    nome: req.session?.user?.name || '',
    saldo: getSaldo(email),
    limite: THRESHOLD_H,
    hoje: hojeBR(),
    mes: { chave: mes, ...m },
    ultimo_registro: ultimo ? ultimo.date : null,
    serie: getSerie(email),
    categorias: CATEGORIAS,
    time: admin ? getTime() : undefined,
  });
});

// ── API: listar registros (próprios; admin pode pedir de outra pessoa) ───────
router.get('/api/horas', requireAuth, (req, res) => {
  const email = getEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const alvo = isAdmin(req) && req.query.email ? String(req.query.email).toLowerCase() : email;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const offset = parseInt(req.query.offset, 10) || 0;
  const rows = db.prepare(`
    SELECT id, user_email, user_name, date, hours, reason, project AS categoria, created_at, updated_at
    FROM hour_logs WHERE user_email = ?
    ORDER BY date DESC, id DESC LIMIT ? OFFSET ?
  `).all(alvo, limit, offset);
  const total = db.prepare('SELECT COUNT(*) AS c FROM hour_logs WHERE user_email = ?').get(alvo).c;
  res.json({ registros: rows, total, saldo: getSaldo(alvo), email: alvo, serie: getSerie(alvo) });
});

// ── API: exportar CSV (próprio; admin exporta o time todo) ───────────────────
router.get('/api/horas/export.csv', requireAuth, (req, res) => {
  const email = getEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const todos = isAdmin(req) && req.query.todos === '1';
  const rows = todos
    ? db.prepare('SELECT * FROM hour_logs ORDER BY user_email, date, id').all()
    : db.prepare('SELECT * FROM hour_logs WHERE user_email = ? ORDER BY date, id').all(email);
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const linhas = [['Pessoa', 'E-mail', 'Data', 'Horas', 'Categoria', 'Motivo', 'Registrado em'].map(q).join(';')];
  for (const r of rows) {
    linhas.push([r.user_name, r.user_email, r.date, String(r.hours).replace('.', ','),
      CATEGORIAS[r.project] || r.project || '', r.reason, r.created_at].map(q).join(';'));
  }
  const nome = todos ? 'banco-de-horas-time' : 'meu-banco-de-horas';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nome}-${hojeBR()}.csv"`);
  res.send('﻿' + linhas.join('\r\n'));
});

// ── API: novo registro ───────────────────────────────────────────────────────
router.post('/api/horas', requireAuth, (req, res) => {
  const email = getEmail(req);
  const name = req.session?.user?.name || '';
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const { erro, dados } = validar(req.body || {});
  if (erro) return res.status(400).json({ error: erro });

  const r = db.prepare(`
    INSERT INTO hour_logs (user_email, user_name, date, hours, reason, project)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(email, name, dados.date, dados.hours, dados.reason, dados.project);

  checkAndNotify(email, name);
  res.json({ success: true, id: r.lastInsertRowid, saldo: getSaldo(email) });
});

// ── API: editar registro (só o próprio) ──────────────────────────────────────
router.patch('/api/horas/:id', requireAuth, (req, res) => {
  const email = getEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const row = db.prepare('SELECT * FROM hour_logs WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!row) return res.status(404).json({ error: 'Registro não encontrado.' });
  if (row.user_email !== email) return res.status(403).json({ error: 'Só dá pra editar os próprios registros.' });
  const { erro, dados } = validar(req.body || {}, { parcial: true });
  if (erro) return res.status(400).json({ error: erro });
  const campos = Object.keys(dados);
  if (!campos.length) return res.json({ success: true, saldo: getSaldo(email) });
  db.prepare(`UPDATE hour_logs SET ${campos.map(c => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .run(...campos.map(c => dados[c]), row.id);
  checkAndNotify(email, row.user_name);
  res.json({ success: true, saldo: getSaldo(email) });
});

// ── API: apagar registro (o próprio; admin apaga qualquer um) ────────────────
router.delete('/api/horas/:id', requireAuth, (req, res) => {
  const email = getEmail(req);
  if (!email) return res.status(401).json({ error: 'auth_required' });
  const row = db.prepare('SELECT * FROM hour_logs WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!row) return res.status(404).json({ error: 'Registro não encontrado.' });
  if (row.user_email !== email && !isAdmin(req)) return res.status(403).json({ error: 'Só dá pra apagar os próprios registros.' });
  db.prepare('DELETE FROM hour_logs WHERE id = ?').run(row.id);
  res.json({ success: true, saldo: getSaldo(email) });
});

module.exports = router;
