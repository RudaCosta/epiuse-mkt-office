// ════════════════════════════════════════════════════════════════════════════
// routes/cafezinho.js — Cafezinho, a área pessoal do time (Módulo 22)
//
// Por que existe: o Office inteiro é tela de trabalho. A única coisa "pessoal"
// era o /memes (100% hardcoded, ninguém posta nada) e a mesa do game (só muda
// por commit). No papo quinzenal de café de 14/ago/2026 saiu um monte de
// folclore do time — signos, a garrafa nova da Bruna toda semana, o tarot da
// Fernanda, Suits como série em comum, "é proibido spoiler" — e não tinha
// onde isso morar.
//
// Como funciona:
//  - cafe_perfil  → o cartão que CADA UM edita do seu próprio jeito. A gravação
//                   usa SEMPRE o e-mail da sessão; o body nem é olhado pra isso,
//                   então ninguém edita o card de ninguém.
//  - cafe_posts   → o mural. tipo = meme | ideia | causo | serie.
//                   spoiler=1 renderiza borrado no front (a regra do café
//                   virou mecânica de UI).
//  - cafe_reacoes → reação emoji com UNIQUE(post_id,email,emoji): clicar de
//                   novo tira a reação em vez de duplicar.
//
// O folclore que é DO GRUPO (não de uma pessoa) mora em
// public/api/cafezinho-seed.json — arquivo estático, editável ao vivo durante
// a call sem deploy e sem restart.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const { db } = require('../server-context');
const { requireAdmin } = require('./users');

const TIPOS = ['meme', 'ideia', 'causo', 'serie'];
const REACOES = ['☕', '😂', '🔥', '🛸', '💋'];

db.exec(`
  CREATE TABLE IF NOT EXISTS cafe_perfil (
    email           TEXT PRIMARY KEY,
    apelido         TEXT DEFAULT '',
    emoji           TEXT DEFAULT '',        -- emoji-assinatura da pessoa
    frase           TEXT DEFAULT '',        -- a frase que ela repete no café
    serie           TEXT DEFAULT '',        -- série/filme que ela está vendo
    item_assinatura TEXT DEFAULT '',        -- o objeto dela (garrafa, tarot...)
    signo_manual    TEXT DEFAULT '',        -- só se quiser sobrescrever o derivado
    cor             TEXT DEFAULT '',        -- hex do card (opcional)
    updated_at      TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cafe_posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL,
    autor      TEXT DEFAULT '',             -- nome no momento do post
    tipo       TEXT DEFAULT 'meme',         -- meme | ideia | causo | serie
    texto      TEXT NOT NULL,
    emoji      TEXT DEFAULT '☕',
    link       TEXT DEFAULT '',             -- URL externa opcional (imagem/vídeo)
    spoiler    INTEGER DEFAULT 0,
    pinned     INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_cafe_posts_created ON cafe_posts(created_at);
  CREATE TABLE IF NOT EXISTS cafe_reacoes (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    email   TEXT NOT NULL,
    emoji   TEXT NOT NULL,
    UNIQUE(post_id, email, emoji)
  );
  CREATE INDEX IF NOT EXISTS idx_cafe_reacoes_post ON cafe_reacoes(post_id);
`);

function sessionUser(req) { return (req.session && req.session.user) || null; }
function txt(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

// Link externo: só http(s). Bloqueia javascript:/data: antes de chegar no href.
function linkSeguro(v) {
  const s = txt(v, 400);
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : '';
}

// ── Feed: perfis + mural + reações agregadas ─────────────────────────────────
router.get('/api/cafezinho/feed', (req, res) => {
  const u = sessionUser(req);
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  const email = String(u.email).toLowerCase();
  try {
    // O JOIN em users traz o role — é por ele que o front casa o cartão salvo
    // com a pessoa certa do team.json (que é organizado por área, não por e-mail).
    const perfis = db.prepare(`SELECT p.email, p.apelido, p.emoji, p.frase, p.serie,
                                      p.item_assinatura, p.signo_manual, p.cor, p.updated_at,
                                      COALESCE(u.role,'') role
                               FROM cafe_perfil p
                               LEFT JOIN users u ON u.email = p.email`).all();
    const posts = db.prepare(`SELECT id, email, autor, tipo, texto, emoji, link, spoiler, pinned, created_at
                              FROM cafe_posts ORDER BY pinned DESC, id DESC LIMIT 200`).all();
    const reacoes = db.prepare(`SELECT post_id, emoji, COUNT(*) n,
                                       SUM(CASE WHEN email=? THEN 1 ELSE 0 END) meu
                                FROM cafe_reacoes GROUP BY post_id, emoji`).all(email);
    const porPost = {};
    reacoes.forEach(r => {
      (porPost[r.post_id] = porPost[r.post_id] || []).push({ emoji: r.emoji, n: r.n, meu: !!r.meu });
    });
    posts.forEach(p => {
      p.spoiler = !!p.spoiler;
      p.pinned = !!p.pinned;
      p.meu = String(p.email).toLowerCase() === email;
      p.reacoes = porPost[p.id] || [];
    });
    res.json({
      me: { email, nome: u.name || u.given || email, admin: !!u.admin, role: u.role || '' },
      reacoes_disponiveis: REACOES,
      tipos: TIPOS,
      perfis,
      posts
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Salvar o próprio cartão ──────────────────────────────────────────────────
// O e-mail vem SEMPRE da sessão. Se o body mandar outro, é ignorado.
router.put('/api/cafezinho/perfil', express.json({ limit: '8kb' }), (req, res) => {
  const u = sessionUser(req);
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  const email = String(u.email).toLowerCase();
  const b = req.body || {};
  try {
    db.prepare(`
      INSERT INTO cafe_perfil (email, apelido, emoji, frase, serie, item_assinatura, signo_manual, cor, updated_at)
      VALUES (?,?,?,?,?,?,?,?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        apelido=excluded.apelido, emoji=excluded.emoji, frase=excluded.frase,
        serie=excluded.serie, item_assinatura=excluded.item_assinatura,
        signo_manual=excluded.signo_manual, cor=excluded.cor, updated_at=datetime('now')
    `).run(email, txt(b.apelido, 40), txt(b.emoji, 8), txt(b.frase, 160),
           txt(b.serie, 80), txt(b.item_assinatura, 60), txt(b.signo_manual, 20), txt(b.cor, 24));
    const perfil = db.prepare(`SELECT * FROM cafe_perfil WHERE email=?`).get(email);
    res.json({ ok: true, perfil });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Postar no mural ──────────────────────────────────────────────────────────
router.post('/api/cafezinho/post', express.json({ limit: '8kb' }), (req, res) => {
  const u = sessionUser(req);
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  const email = String(u.email).toLowerCase();
  const b = req.body || {};
  const texto = txt(b.texto, 600);
  if (!texto) return res.status(400).json({ error: 'texto_vazio' });
  const tipo = TIPOS.indexOf(txt(b.tipo, 12)) >= 0 ? txt(b.tipo, 12) : 'meme';
  try {
    const info = db.prepare(`INSERT INTO cafe_posts (email, autor, tipo, texto, emoji, link, spoiler)
                             VALUES (?,?,?,?,?,?,?)`)
      .run(email, txt(u.name || u.given || email, 60), tipo, texto,
           txt(b.emoji, 8) || '☕', linkSeguro(b.link), b.spoiler ? 1 : 0);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Apagar post: só o autor, ou admin (head/editor token) ────────────────────
router.delete('/api/cafezinho/post/:id', (req, res) => {
  const u = sessionUser(req);
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  const email = String(u.email).toLowerCase();
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'id_invalido' });
  try {
    const post = db.prepare(`SELECT email FROM cafe_posts WHERE id=?`).get(id);
    if (!post) return res.status(404).json({ error: 'nao_encontrado' });
    const ehAdmin = u.role === 'head' || !!u.admin;
    if (String(post.email).toLowerCase() !== email && !ehAdmin) {
      return res.status(403).json({ error: 'nao_e_seu' });
    }
    db.transaction(() => {
      db.prepare(`DELETE FROM cafe_reacoes WHERE post_id=?`).run(id);
      db.prepare(`DELETE FROM cafe_posts WHERE id=?`).run(id);
    })();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reagir (toggle) ──────────────────────────────────────────────────────────
router.post('/api/cafezinho/reagir', express.json({ limit: '2kb' }), (req, res) => {
  const u = sessionUser(req);
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  const email = String(u.email).toLowerCase();
  const b = req.body || {};
  const id = parseInt(b.post_id, 10);
  const emoji = txt(b.emoji, 8);
  if (!id || REACOES.indexOf(emoji) < 0) return res.status(400).json({ error: 'reacao_invalida' });
  try {
    const ja = db.prepare(`SELECT id FROM cafe_reacoes WHERE post_id=? AND email=? AND emoji=?`).get(id, email, emoji);
    if (ja) db.prepare(`DELETE FROM cafe_reacoes WHERE id=?`).run(ja.id);
    else db.prepare(`INSERT OR IGNORE INTO cafe_reacoes (post_id, email, emoji) VALUES (?,?,?)`).run(id, email, emoji);
    const n = db.prepare(`SELECT COUNT(*) n FROM cafe_reacoes WHERE post_id=? AND emoji=?`).get(id, emoji).n;
    res.json({ ok: true, emoji, n, meu: !ja });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Fixar/desfixar no topo do mural (admin) ──────────────────────────────────
router.post('/api/cafezinho/pin/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'id_invalido' });
  try {
    const p = db.prepare(`SELECT pinned FROM cafe_posts WHERE id=?`).get(id);
    if (!p) return res.status(404).json({ error: 'nao_encontrado' });
    const novo = p.pinned ? 0 : 1;
    db.prepare(`UPDATE cafe_posts SET pinned=? WHERE id=?`).run(novo, id);
    res.json({ ok: true, pinned: !!novo });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Página ───────────────────────────────────────────────────────────────────
router.get('/cafezinho', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cafezinho.html'));
});

module.exports = router;
