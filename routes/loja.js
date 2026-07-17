// ════════════════════════════════════════════════════════════════════════════
// routes/loja.js — Loja de ERP Coins (Módulo 19)
// Vira a chave do "acúmulo silencioso" (decisão revogada pelo Rudá em 14/jul):
// o usuário agora VÊ o saldo e resgata brindes com os coins.
//  - Saldo = SUM(coins) do ledger erp_coins (ganhos positivos; resgates entram
//    como lançamentos NEGATIVOS evento='resgate'; negativa de resgate gera
//    estorno positivo evento='estorno').
//  - Catálogo = public/api/loja-coins.json (fonte CURADA — regra 7 REAL DATA
//    ONLY: sobe VAZIO até o Rudá passar itens e preços reais).
//  - Resgate debita na hora e cria pedido 'pendente'; aprovação é do admin
//    (head/editor token) em /admin/coins → aprovar | negar (estorna) | entregue.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../server-context');
const { requireAdmin } = require('./users');

const CATALOGO_PATH = path.join(__dirname, '../public/api/loja-coins.json');

db.exec(`
  CREATE TABLE IF NOT EXISTS coin_redemptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL,
    item_id    TEXT NOT NULL,
    item_nome  TEXT NOT NULL,
    coins      INTEGER NOT NULL,        -- preço pago (positivo)
    status     TEXT DEFAULT 'pendente', -- pendente | aprovado | negado | entregue
    obs        TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    decided_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_redemptions_email ON coin_redemptions(email);
  CREATE INDEX IF NOT EXISTS idx_redemptions_status ON coin_redemptions(status);
`);

function sessionUser(req) { return (req.session && req.session.user) || null; }

function lerCatalogo() {
  try {
    const j = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'));
    return Array.isArray(j.itens) ? j.itens : [];
  } catch (e) { return []; }
}
function saldoDe(email) {
  try {
    return db.prepare(`SELECT COALESCE(SUM(coins),0) n FROM erp_coins WHERE email=?`).get(email).n;
  } catch (e) { return 0; }
}

// ── Estado do usuário: saldo + histórico + catálogo ───────────────────────────
router.get('/api/loja/me', (req, res) => {
  const u = sessionUser(req);
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  const email = String(u.email).toLowerCase();
  try {
    const ganhos = db.prepare(`SELECT COALESCE(SUM(coins),0) n FROM erp_coins WHERE email=? AND coins>0`).get(email).n;
    const gastos = db.prepare(`SELECT COALESCE(SUM(-coins),0) n FROM erp_coins WHERE email=? AND coins<0`).get(email).n;
    const ledger = db.prepare(`SELECT evento, ref, coins, dia, created_at FROM erp_coins
                               WHERE email=? ORDER BY id DESC LIMIT 100`).all(email);
    const resgates = db.prepare(`SELECT id, item_id, item_nome, coins, status, obs, created_at, decided_at
                                 FROM coin_redemptions WHERE email=? ORDER BY id DESC LIMIT 50`).all(email);
    const catalogo = lerCatalogo().filter(i => i && i.ativa !== false);
    res.json({ email, saldo: ganhos - gastos, ganhos, gastos, ledger, resgates, catalogo });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Resgate — debita na hora + cria pedido pendente (transacional) ────────────
router.post('/api/loja/resgatar', express.json({ limit: '2kb' }), (req, res) => {
  const u = sessionUser(req);
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  const email = String(u.email).toLowerCase();
  const itemId = String((req.body || {}).item_id || '').slice(0, 60);
  const catalogo = lerCatalogo().filter(i => i && i.ativa !== false);
  if (!catalogo.length) return res.status(400).json({ error: 'catalogo_vazio' });
  const item = catalogo.find(i => i.id === itemId);
  if (!item) return res.status(400).json({ error: 'item_invalido' });
  const preco = parseInt(item.preco_coins, 10);
  if (!preco || preco <= 0) return res.status(400).json({ error: 'preco_invalido' });
  try {
    const out = db.transaction(() => {
      const saldo = saldoDe(email);
      if (saldo < preco) return { erro: 'saldo_insuficiente', saldo };
      const r = db.prepare(`INSERT INTO coin_redemptions (email, item_id, item_nome, coins) VALUES (?,?,?,?)`)
        .run(email, item.id, String(item.nome || item.id).slice(0, 80), preco);
      const rid = r.lastInsertRowid;
      // Débito no ledger: linha negativa, ref única por resgate (não colide no UNIQUE).
      db.prepare(`INSERT INTO erp_coins (email, evento, ref, coins) VALUES (?,?,?,?)`)
        .run(email, 'resgate', 'resgate:' + rid, -preco);
      return { id: Number(rid), saldo: saldo - preco };
    })();
    if (out.erro) return res.status(400).json({ error: out.erro, saldo: out.saldo });
    res.json({ success: true, id: out.id, saldo: out.saldo, status: 'pendente' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: fila de resgates + decisão ─────────────────────────────────────────
router.get('/api/admin/loja', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, (SELECT u.name FROM users u WHERE u.email=r.email) AS nome
      FROM coin_redemptions r ORDER BY (r.status='pendente') DESC, r.id DESC LIMIT 300
    `).all();
    res.json({ resgates: rows, catalogo: lerCatalogo() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// acao: aprovar | negar (estorna os coins) | entregue
router.post('/api/admin/loja/:id', requireAdmin, express.json({ limit: '2kb' }), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const acao = String((req.body || {}).acao || '');
  const obs = String((req.body || {}).obs || '').slice(0, 200);
  if (!['aprovar', 'negar', 'entregue'].includes(acao)) return res.status(400).json({ error: 'acao_invalida' });
  try {
    const r = db.prepare(`SELECT * FROM coin_redemptions WHERE id=?`).get(id);
    if (!r) return res.status(404).json({ error: 'nao_encontrado' });
    const novo = acao === 'aprovar' ? 'aprovado' : acao === 'negar' ? 'negado' : 'entregue';
    // transições válidas: pendente→aprovado|negado · aprovado→entregue|negado
    const ok = (r.status === 'pendente' && (novo === 'aprovado' || novo === 'negado')) ||
               (r.status === 'aprovado' && (novo === 'entregue' || novo === 'negado'));
    if (!ok) return res.status(400).json({ error: 'transicao_invalida', de: r.status, para: novo });
    db.transaction(() => {
      db.prepare(`UPDATE coin_redemptions SET status=?, obs=?, decided_at=datetime('now') WHERE id=?`)
        .run(novo, obs || r.obs, id);
      if (novo === 'negado') {
        // Estorno: devolve os coins (idempotente — ref única impede duplicar).
        db.prepare(`INSERT OR IGNORE INTO erp_coins (email, evento, ref, coins) VALUES (?,?,?,?)`)
          .run(r.email, 'estorno', 'estorno:' + id, r.coins);
      }
    })();
    res.json({ success: true, id, status: novo });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Página da loja (qualquer usuário logado; enforcement cuida do login).
router.get('/loja', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/loja-coins.html'));
});

module.exports = router;
