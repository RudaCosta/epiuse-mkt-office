// ════════════════════════════════════════════════════════════════════════════
// routes/loja.js — Loja de ERP Coins (Módulo 19)
// Vira a chave do "acúmulo silencioso" (decisão revogada pelo Rudá em 14/jul):
// o usuário agora VÊ o saldo e resgata brindes com os coins.
//  - Saldo = SUM(coins) do ledger erp_coins (ganhos positivos; resgates entram
//    como lançamentos NEGATIVOS evento='resgate'; negativa de resgate gera
//    estorno positivo evento='estorno').
//  - Catálogo = tabela coin_shop_items no SQLite (persiste no volume), editável
//    pelo admin em /admin/coins. Migração importa do JSON antigo (loja-coins.json)
//    na 1ª vez, se houver itens lá.
//  - Resgate debita na hora e cria pedido 'pendente'; aprovação é do admin
//    (head/editor token) em /admin/coins → aprovar | negar (estorna) | entregue.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, resend } = require('../server-context');
const { requireAdmin } = require('./users');

const FROM_EMAIL = process.env.FROM_EMAIL || 'voices@resend.dev';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'ruda.costa@epiuse.com.br';

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
  CREATE TABLE IF NOT EXISTS coin_shop_items (
    id          TEXT PRIMARY KEY,       -- slug (ex: 'elefante-pelucia')
    nome        TEXT NOT NULL,
    emoji       TEXT DEFAULT '🎁',
    preco_coins INTEGER NOT NULL,
    descricao   TEXT DEFAULT '',
    ativa       INTEGER DEFAULT 1,
    ordem       INTEGER DEFAULT 0,
    updated_at  TEXT DEFAULT (datetime('now'))
  );
`);

// Migração 1x: importa itens do JSON antigo se a tabela estiver vazia.
try {
  const vazia = db.prepare(`SELECT COUNT(*) n FROM coin_shop_items`).get().n === 0;
  if (vazia) {
    const j = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'));
    const itens = Array.isArray(j.itens) ? j.itens : [];
    if (itens.length) {
      const ins = db.prepare(`INSERT OR IGNORE INTO coin_shop_items (id,nome,emoji,preco_coins,descricao,ativa,ordem) VALUES (?,?,?,?,?,?,?)`);
      itens.forEach((it, i) => ins.run(String(it.id||('item'+i)).slice(0,60), String(it.nome||it.id||'').slice(0,80),
        String(it.emoji||'🎁').slice(0,8), parseInt(it.preco_coins,10)||0, String(it.desc||it.descricao||'').slice(0,200),
        it.ativa===false?0:1, i));
      console.log(`[loja] catálogo migrado do JSON: ${itens.length} itens`);
    }
  }
} catch (e) { /* JSON pode não existir — ok, catálogo começa vazio */ }

function sessionUser(req) { return (req.session && req.session.user) || null; }
function slug(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // tira acentos (Pelúcia→Pelucia)
    .toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// Itens ATIVOS (loja do usuário), mapeados pro shape que o front espera.
function lerCatalogo() {
  try {
    return db.prepare(`SELECT id,nome,emoji,preco_coins,descricao,ativa,ordem FROM coin_shop_items
                       WHERE ativa=1 ORDER BY ordem ASC, nome ASC`).all()
      .map(i => ({ id: i.id, nome: i.nome, emoji: i.emoji, preco_coins: i.preco_coins, desc: i.descricao, ativa: true }));
  } catch (e) { return []; }
}
// Todos os itens (admin), incluindo inativos.
function lerCatalogoAll() {
  try {
    return db.prepare(`SELECT id,nome,emoji,preco_coins,descricao,ativa,ordem FROM coin_shop_items
                       ORDER BY ordem ASC, nome ASC`).all()
      .map(i => ({ id: i.id, nome: i.nome, emoji: i.emoji, preco_coins: i.preco_coins, desc: i.descricao, ativa: !!i.ativa, ordem: i.ordem }));
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
    // ✉️ Aviso pro admin (best-effort — nunca bloqueia a resposta)
    if (resend) {
      resend.emails.send({
        from: FROM_EMAIL, to: NOTIFY_EMAIL,
        subject: `🎁 Resgate na Loja de Coins — ${u.name || email} pediu "${item.nome}"`,
        html: `<div style="font-family:system-ui,sans-serif"><h2 style="margin:0 0 8px">🎁 Novo resgate pendente</h2>
          <p><b>${String(u.name || email)}</b> (${email}) resgatou <b>${String(item.nome)}</b> por <b>${preco} coins</b>.</p>
          <p><a href="https://office.epiuse.com.br/admin/coins" style="color:#2563EB">→ Aprovar/negar no painel</a></p></div>`,
      }).then(() => console.log(`[loja] email de resgate enviado (${item.id})`))
        .catch(e => console.warn('[loja] email de resgate falhou:', e.message));
    } else console.log('[loja] email de resgate skipped (sem RESEND_API_KEY)');
    res.json({ success: true, id: out.id, saldo: out.saldo, status: 'pendente' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Ranking do time (qualquer usuário logado) ─────────────────────────────────
// Dados 100% reais do ledger erp_coins + utm_clicks. Conquistas = eventos
// distintos que a pessoa já destravou. Nome/área vêm da tabela users.
router.get('/api/ranking', (req, res) => {
  const u = sessionUser(req);
  if (!u || !u.email) return res.status(401).json({ error: 'auth_required' });
  try {
    const rows = db.prepare(`
      SELECT c.email,
             SUM(CASE WHEN c.coins > 0 THEN c.coins ELSE 0 END) AS ganhos,
             SUM(c.coins) AS saldo,
             COUNT(DISTINCT CASE WHEN c.coins > 0 THEN c.evento END) AS tipos,
             (SELECT u2.name FROM users u2 WHERE u2.email = c.email) AS nome,
             (SELECT u2.role FROM users u2 WHERE u2.email = c.email) AS role,
             (SELECT COUNT(*) FROM utm_clicks k JOIN utm_links l ON l.token = k.token
                WHERE l.email = c.email AND k.bot = 0) AS cliques
      FROM erp_coins c
      GROUP BY c.email
      HAVING ganhos > 0
      ORDER BY ganhos DESC
      LIMIT 100
    `).all();
    const conquistasDe = db.prepare(`SELECT DISTINCT evento FROM erp_coins WHERE email=? AND coins>0`);
    const ranking = rows.map((r, i) => ({
      pos: i + 1,
      email: r.email,
      nome: r.nome || r.email.split('@')[0],
      role: r.role || null,
      ganhos: r.ganhos, saldo: r.saldo, cliques: r.cliques,
      conquistas: conquistasDe.all(r.email).map(x => x.evento),
      eu: r.email === String(u.email).toLowerCase(),
    }));
    res.json({ ranking, gerado_em: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Página do ranking (qualquer usuário logado; enforcement cuida do login).
router.get('/ranking', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/ranking.html'));
});

// ── Admin: fila de resgates + decisão ─────────────────────────────────────────
router.get('/api/admin/loja', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, (SELECT u.name FROM users u WHERE u.email=r.email) AS nome
      FROM coin_redemptions r ORDER BY (r.status='pendente') DESC, r.id DESC LIMIT 300
    `).all();
    const pendentes = db.prepare(`SELECT COUNT(*) n FROM coin_redemptions WHERE status='pendente'`).get().n;
    res.json({ resgates: rows, pendentes, catalogo: lerCatalogoAll() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: CRUD do catálogo ───────────────────────────────────────────────────
router.get('/api/admin/loja/catalogo', requireAdmin, (req, res) => {
  res.json({ itens: lerCatalogoAll() });
});
// Cria ou atualiza um item (upsert por id). Body: {id?, nome, emoji, preco_coins, desc, ativa, ordem}
router.post('/api/admin/loja/catalogo', requireAdmin, express.json({ limit: '4kb' }), (req, res) => {
  const b = req.body || {};
  const nome = String(b.nome || '').trim().slice(0, 80);
  const preco = parseInt(b.preco_coins, 10);
  if (!nome) return res.status(400).json({ error: 'nome_obrigatorio' });
  if (!preco || preco <= 0) return res.status(400).json({ error: 'preco_invalido' });
  const id = slug(b.id || nome) || ('item-' + Date.now());
  const emoji = String(b.emoji || '🎁').slice(0, 8);
  const desc = String(b.desc || '').slice(0, 200);
  const ativa = b.ativa === false ? 0 : 1;
  const ordem = parseInt(b.ordem, 10) || 0;
  try {
    db.prepare(`INSERT INTO coin_shop_items (id,nome,emoji,preco_coins,descricao,ativa,ordem,updated_at)
                VALUES (?,?,?,?,?,?,?,datetime('now'))
                ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, emoji=excluded.emoji,
                  preco_coins=excluded.preco_coins, descricao=excluded.descricao,
                  ativa=excluded.ativa, ordem=excluded.ordem, updated_at=datetime('now')`)
      .run(id, nome, emoji, preco, desc, ativa, ordem);
    res.json({ success: true, id, itens: lerCatalogoAll() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/api/admin/loja/catalogo/:id', requireAdmin, (req, res) => {
  try {
    db.prepare(`DELETE FROM coin_shop_items WHERE id=?`).run(slug(req.params.id));
    res.json({ success: true, itens: lerCatalogoAll() });
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
