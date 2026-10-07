// ── MÓDULO 29 · ÁREA PIPELINE (Biz Dev / Development Sales) ─────────────────
// Página /area/pipeline só com fontes que se atualizam SOZINHAS:
//   • Apollo  — o próprio servidor busca na API a cada 6h (APOLLO_API_KEY no
//               Railway). Antes era um JSON estático que só mudava no deploy
//               (parado desde 09/jun) — por isso virou refresh no servidor.
//   • JARVIS  — memória viva (jarvis_calls / jarvis_aprendizados), gravada a
//               cada call salva no /jarvis ou ingerida do Zoho/3CX.
// Fontes de sync manual (Zoho deals, planilha de metas, outreach) saíram da
// página e viraram links. Regra 7: sem chave/sem dado → status explícito.

const express = require('express');
const router = express.Router();
const { db, requireAuth } = require('../server-context');

const BLOB = 'apollo.pipeline';
const REFRESH_MS = 6 * 60 * 60 * 1000;   // a cada 6h
const MANUAL_GAP_MS = 10 * 60 * 1000;    // botão "atualizar agora": no máx. 1x a cada 10 min
const STALE_MS = 26 * 60 * 60 * 1000;    // sem refresh bem-sucedido há >26h = parado
const apolloKey = () => (process.env.APOLLO_API_KEY || '').trim();

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_blobs (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    -- 1 linha por dia (último refresh do dia vence): base pros números de 7/30 dias
    CREATE TABLE IF NOT EXISTS apollo_hist (
      dia TEXT PRIMARY KEY,
      contatos INTEGER, contas INTEGER, seq_total INTEGER, seq_ativas INTEGER,
      entregues INTEGER, abertos INTEGER, respondidos INTEGER, cliques INTEGER,
      bounces INTEGER, reunioes INTEGER, ts TEXT
    );
  `);
} catch (e) { console.warn('[area-pipeline] tabelas:', e.message); }

// ── APOLLO ──────────────────────────────────────────────────────────────────
const STATE = { running: null, lastTry: 0, lastError: null, lastErrorTs: null };

async function apollo(p, body, method = 'POST') {
  const r = await fetch('https://api.apollo.io/api/v1' + p, {
    method,
    headers: { 'X-Api-Key': apolloKey(), 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`${p} -> HTTP ${r.status}`);
  return r.json();
}
const total = (r) => (r && r.pagination && r.pagination.total_entries != null ? r.pagination.total_entries : null);
const n0 = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function readBlob() {
  try {
    const row = db.prepare('SELECT value FROM app_blobs WHERE key = ?').get(BLOB);
    return row && row.value ? JSON.parse(row.value) : null;
  } catch (_) { return null; }
}

async function refreshApollo() {
  if (!apolloKey()) throw new Error('APOLLO_API_KEY ausente');
  const [contacts, accounts] = await Promise.all([
    apollo('/contacts/search', { page: 1, per_page: 1 }),
    apollo('/accounts/search', { page: 1, per_page: 5 }),
  ]);

  // Sequências (todas as páginas)
  const camps = [];
  for (let page = 1; page <= 10; page++) {
    const r = await apollo('/emailer_campaigns/search', { page, per_page: 100 });
    camps.push(...(r.emailer_campaigns || []));
    const tp = r.pagination && r.pagination.total_pages;
    if (!tp || page >= tp) break;
  }

  // Opcionais: donos das sequências e funil por estágio do contato. Se a chave
  // não tiver permissão, segue sem (não derruba o refresh).
  const users = {};
  try {
    const r = await apollo('/users/search?per_page=100', null, 'GET');
    (r.users || []).forEach(u => { users[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name || u.email || ''; });
  } catch (_) {}
  let estagios = null;
  try {
    const r = await apollo('/contact_stages', null, 'GET');
    const st = (r.contact_stages || []).slice().sort((a, b) => n0(a.display_order) - n0(b.display_order));
    estagios = [];
    for (const s of st) {
      const c = await apollo('/contacts/search', { page: 1, per_page: 1, contact_stage_ids: [s.id] });
      estagios.push({ id: s.id, nome: s.name, categoria: s.category || null, contatos: total(c) });
    }
    // Se a API ignorar o filtro, todo estágio volta com o total da base: descarta.
    const soma = estagios.reduce((a, e) => a + n0(e.contatos), 0), base = total(contacts) || 0;
    if (estagios.length > 1 && soma > base * 1.05) estagios = null;
  } catch (_) { estagios = null; }

  const snap = buildSnapshot({ contacts, accounts, camps, users, estagios });
  saveSnapshot(snap);
  return snap;
}

// Monta o snapshot a partir das respostas cruas da API (separado da busca pra
// poder ser testado com uma resposta salva).
function buildSnapshot({ contacts, accounts, camps, users = {}, estagios = null, now = new Date() }) {
  const seqs = camps.map(c => ({
    id: c.id, nome: c.name || '(sem nome)', ativa: !!c.active, arquivada: !!c.archived,
    criada_em: c.created_at || null, usada_em: c.last_used_at || null,
    dono: users[c.user_id] || null, status: c.status_reason || null,
    passos: (c.emailer_steps || []).map(s => ({ pos: s.position, tipo: s.type, espera: s.wait_time, modo: s.wait_mode })),
    agendados: n0(c.unique_scheduled), entregues: n0(c.unique_delivered), abertos: n0(c.unique_opened),
    respondidos: n0(c.unique_replied), cliques: n0(c.unique_clicked), bounces: n0(c.unique_bounced),
    reunioes: n0(c.unique_demoed), descadastros: n0(c.unique_unsubscribed), spam: n0(c.unique_spam_blocked),
    taxa_abertura: n0(c.open_rate), taxa_resposta: n0(c.reply_rate), taxa_bounce: n0(c.bounce_rate), taxa_clique: n0(c.click_rate),
    fraca: !!c.is_performing_poorly, tarefas_atrasadas: n0(c.overdue_manual_tasks_count),
    passos_fracos: n0(c.underperforming_touches_count),
  }));
  const vivas = seqs.filter(s => !s.arquivada);
  const soma = (k) => seqs.reduce((a, s) => a + s[k], 0);
  return {
    fonte: 'Apollo API (refresh automático no servidor, a cada 6h)',
    auto: true,
    ultima_sync: now.toISOString().slice(0, 10),
    ultima_sync_ts: now.toISOString(),
    conta: 'EPI-USE Brasil',
    contatos_total: total(contacts),
    contatos_obs: '🟡 base Apollo total — inclui importados/seed (filtrar Brasil/label p/ pipeline puro).',
    contas_total: total(accounts),
    top_contas: (accounts.accounts || []).slice(0, 5).map(a => a.name).filter(Boolean),
    sequencias_total: vivas.length,
    sequencias_ativas: vivas.filter(s => s.ativa).length,
    sequencias_obs: `🟢 ${vivas.filter(s => s.ativa).length} ativa(s) de ${vivas.length} cadastradas (real).`,
    totais: {
      agendados: soma('agendados'), entregues: soma('entregues'), abertos: soma('abertos'), respondidos: soma('respondidos'),
      cliques: soma('cliques'), bounces: soma('bounces'), reunioes: soma('reunioes'), descadastros: soma('descadastros'),
    },
    estagios,
    sequencias: seqs,
    'pipeline_R$': null,
    'pipeline_R$_obs': '⏳ Apollo nao tem valor R$ de oportunidade — fica no CRM (Zoho).',
  };
}

function saveSnapshot(snap) {
  db.prepare(`INSERT INTO app_blobs (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(BLOB, JSON.stringify(snap));
  const t = snap.totais;
  db.prepare(`INSERT OR REPLACE INTO apollo_hist
    (dia, contatos, contas, seq_total, seq_ativas, entregues, abertos, respondidos, cliques, bounces, reunioes, ts)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    snap.ultima_sync, snap.contatos_total, snap.contas_total, snap.sequencias_total, snap.sequencias_ativas,
    t.entregues, t.abertos, t.respondidos, t.cliques, t.bounces, t.reunioes, snap.ultima_sync_ts
  );
}

function runRefresh(origem) {
  if (STATE.running) return STATE.running;
  STATE.lastTry = Date.now();
  STATE.running = refreshApollo()
    .then(s => { STATE.lastError = null; console.log(`[area-pipeline] Apollo OK (${origem}) — ${s.contatos_total} contatos · ${s.sequencias_ativas}/${s.sequencias_total} seq ativas`); return s; })
    .catch(e => { STATE.lastError = e.message; STATE.lastErrorTs = new Date().toISOString(); console.warn(`[area-pipeline] Apollo falhou (${origem}):`, e.message); return null; })
    .finally(() => { STATE.running = null; });
  return STATE.running;
}

if (apolloKey()) {
  setTimeout(() => runRefresh('boot'), 60 * 1000).unref();
  setInterval(() => runRefresh('6h'), REFRESH_MS).unref();
  console.log('[area-pipeline] refresh Apollo agendado (boot + a cada 6h)');
} else {
  console.log('[area-pipeline] refresh Apollo inativo (sem APOLLO_API_KEY)');
}

function apolloStatus(snap) {
  const k = !!apolloKey();
  const last = snap && snap.ultima_sync_ts ? Date.parse(snap.ultima_sync_ts) : null;
  let status = 'ok';
  if (!k && !snap) status = 'sem-chave';
  else if (!snap) status = STATE.lastError ? 'erro' : 'aguardando';
  else if (Date.now() - last > STALE_MS) status = 'parado';
  return {
    status, chave: k, ultima_sync_ts: snap ? snap.ultima_sync_ts : null,
    proxima_ts: k && last ? new Date(Math.max(Date.now(), last + REFRESH_MS)).toISOString() : null,
    intervalo_h: REFRESH_MS / 3600000,
    erro: STATE.lastError, erro_ts: STATE.lastErrorTs,
  };
}

// Mesmo formato do antigo pipeline-snapshot.json — usado por /api/pipeline e
// pelo overlay do /api/areas.json (home, diretoria, curva ABC) pra todo mundo
// ler o dado vivo. null = ainda não houve refresh no servidor.
function apolloSnapshot() {
  const s = readBlob();
  if (!s) return null;
  const { sequencias, estagios, totais, ...compat } = s;
  return compat;
}

// ── JARVIS (memória viva) ───────────────────────────────────────────────────
function jarvisResumo() {
  const q = (sql, ...a) => { try { return db.prepare(sql).all(...a); } catch (_) { return []; } };
  const one = (sql, ...a) => { try { return db.prepare(sql).get(...a) || {}; } catch (_) { return {}; } };
  const tot = one('SELECT COUNT(*) n, MAX(criado_em) ultima FROM jarvis_calls');
  if (tot.n == null) return { disponivel: false };
  const d30 = one(`SELECT COUNT(*) n, AVG(temperatura) temp, AVG(duracao_seg) dur FROM jarvis_calls WHERE criado_em >= datetime('now','-30 days')`);
  const p30 = one(`SELECT COUNT(*) n FROM jarvis_calls WHERE criado_em >= datetime('now','-60 days') AND criado_em < datetime('now','-30 days')`);
  const datas = q(`SELECT criado_em FROM jarvis_calls WHERE criado_em >= datetime('now','-84 days')`).map(r => r.criado_em);
  const porSdr = q(`SELECT COALESCE(NULLIF(criado_por,''),'—') quem, COUNT(*) n FROM jarvis_calls
    WHERE criado_em >= datetime('now','-90 days') GROUP BY quem ORDER BY n DESC LIMIT 8`);
  const porLob = q(`SELECT COALESCE(NULLIF(lob,''),'(sem LOB)') lob, COUNT(*) n FROM jarvis_calls
    WHERE criado_em >= datetime('now','-90 days') GROUP BY lob ORDER BY n DESC LIMIT 8`);
  const apr = q(`SELECT tipo, texto, COUNT(*) freq, MAX(criado_em) ultima FROM jarvis_aprendizados
    WHERE criado_em >= datetime('now','-90 days') GROUP BY tipo, lower(texto) ORDER BY freq DESC, ultima DESC LIMIT 400`);
  const aprendizados = {};
  apr.forEach(a => { (aprendizados[a.tipo] = aprendizados[a.tipo] || []).length < 10 && aprendizados[a.tipo].push({ texto: a.texto, freq: a.freq, ultima: a.ultima }); });
  const recentes = q(`SELECT c.id, c.prospect, c.empresa, c.lob, c.temperatura, c.duracao_seg, c.criado_em, c.criado_por, c.resumo, c.fonte_audio,
      (SELECT COUNT(*) FROM jarvis_aprendizados a WHERE a.call_id = c.id) apr
    FROM jarvis_calls c ORDER BY c.criado_em DESC, c.id DESC LIMIT 8`);
  const aprTot = one('SELECT COUNT(*) n FROM jarvis_aprendizados');
  return {
    disponivel: true,
    total_calls: tot.n, ultima_call: tot.ultima || null, total_aprendizados: aprTot.n || 0,
    calls_30d: d30.n || 0, calls_30d_anterior: p30.n || 0,
    temperatura_media_30d: d30.temp != null ? Math.round(d30.temp) : null,
    duracao_media_30d: d30.dur != null ? Math.round(d30.dur) : null,
    datas_84d: datas, por_sdr: porSdr, por_lob: porLob, aprendizados, recentes,
  };
}

// ── ROTAS ───────────────────────────────────────────────────────────────────
// Colaborador fora do time (role 'hub') não vê a área (a página já o manda pro
// /hub); a API segue a mesma regra porque traz calls e nomes de empresas.
const semHub = (req, res, next) => (req.session && req.session.user && req.session.user.role === 'hub')
  ? res.status(403).json({ success: false, error: 'forbidden' }) : next();
// (A página /area/pipeline e o redirect de /pipeline ficam no server.js,
//  antes do /area/:id genérico.)
router.get('/api/area/pipeline', requireAuth, semHub, (req, res) => {
  try {
    const snap = readBlob();
    const hist = (() => { try { return db.prepare(`SELECT * FROM apollo_hist ORDER BY dia DESC LIMIT 60`).all().reverse(); } catch (_) { return []; } })();
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      gerado_em: new Date().toISOString(),
      apollo: { ...apolloStatus(snap), dados: snap, hist },
      jarvis: jarvisResumo(),
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// "🔄 Atualizar agora" — qualquer pessoa logada; no máx. 1x a cada 10 min.
router.post('/api/area/pipeline/refresh', requireAuth, semHub, async (req, res) => {
  if (!apolloKey()) return res.status(409).json({ success: false, error: 'APOLLO_API_KEY não configurada no servidor.' });
  const espera = MANUAL_GAP_MS - (Date.now() - STATE.lastTry);
  if (!STATE.running && espera > 0) return res.status(429).json({ success: false, error: `Atualizado há pouco. Tente em ${Math.ceil(espera / 60000)} min.` });
  const s = await runRefresh('manual');
  if (!s) return res.status(502).json({ success: false, error: STATE.lastError || 'Falha no Apollo.' });
  res.json({ success: true, ultima_sync_ts: s.ultima_sync_ts });
});

module.exports = router;
module.exports.apolloSnapshot = apolloSnapshot;
module.exports.buildSnapshot = buildSnapshot;
module.exports.apolloStatus = apolloStatus;   // Módulo 33 (Metas FY27) mostra o frescor do Apollo
