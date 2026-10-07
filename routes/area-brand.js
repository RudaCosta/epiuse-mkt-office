// ── MÓDULO 30 · ÁREA BRAND EXPERIENCE / VOICES (Duda) ───────────────────────
// Página /area/brand só com fontes que se atualizam SOZINHAS:
//   • Voices        — roster (programa + publicados de inscrição) e tudo que o
//                     time faz no Office: pautas (Módulo 20), posts publicados,
//                     cliques reais nos links rastreados (Módulo 18).
//   • Inscrições    — /seja-voice grava na hora (recruitment_applications).
//   • Cases         — cs_clientes, sync diário 07:00 (tarefa agendada → Railway).
//   • Calendário    — planilha editorial lida da nuvem via Graph a cada 6h
//                     (routes/editorial.js). Sem o auto-sync ok, o bloco vira link.
// Ficaram de fora (viraram link): SSI, kit, "posts do mês" e pendências
// chumbados no voices.json; LinkedIn routine (JSON estático); digest/inbox da
// Duda. Regra 7: sem dado → status explícito, nunca número inventado.

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { db, requireAuth } = require('../server-context');

const VOICES_JSON = path.join(__dirname, '../public/api/voices.json');
const DAY = 86400000;
const CASES_STALE_MS = 36 * 60 * 60 * 1000; // sync diário 07:00 → >36h = parado

const all = (sql, ...a) => { try { return db.prepare(sql).all(...a); } catch (_) { return []; } };
const one = (sql, ...a) => { try { return db.prepare(sql).get(...a) || {}; } catch (_) { return {}; } };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// SQLite grava 'YYYY-MM-DD HH:MM:SS' em UTC; ISO já vem com Z
const ms = (s) => { if (!s) return null; let x = String(s); if (/^\d{4}-\d{2}-\d{2}$/.test(x)) x += 'T12:00:00Z'; else if (/^\d{4}-\d{2}-\d{2} \d/.test(x)) x = x.replace(' ', 'T') + 'Z'; const t = Date.parse(x); return isNaN(t) ? null : t; };
const dia = (t) => new Date(t).toISOString().slice(0, 10);

// Coluna bot (v0.77) pode não existir num banco antigo → trata como 0
const BOT0 = (() => { try { return db.prepare(`PRAGMA table_info(utm_clicks)`).all().some(c => c.name === 'bot') ? 'COALESCE(c.bot,0)=0' : '1=1'; } catch (_) { return '1=1'; } })();

// ── VOICES ──────────────────────────────────────────────────────────────────
function lerArquivo() { try { return JSON.parse(fs.readFileSync(VOICES_JSON, 'utf8')); } catch (_) { return { programa: {}, voices: [], vagas_abertas: [] }; } }

function voicesResumo() {
  const f = lerArquivo();
  const lista = (f.voices || []).map(v => ({ id: v.id, numero: v.numero, nome: v.nome, cargo: v.cargo || '', nicho: v.nicho || '', tags: v.tags || [],
    status_label: v.status_label || v.status || '', linkedin: v.linkedin || '', origem: 'programa' }));
  all(`SELECT data, created_at FROM voices_publicados ORDER BY created_at ASC`).forEach(r => {
    try {
      const v = JSON.parse(r.data);
      if (!v || !v.id || lista.some(x => x.id === v.id)) return;
      lista.push({ id: v.id, numero: v.numero, nome: v.nome, cargo: v.cargo || '', nicho: v.nicho || '', tags: v.tags || [],
        status_label: v.status_label || 'Novo', linkedin: v.linkedin || '', origem: 'inscricao', desde: r.created_at });
    } catch (_) {}
  });

  // E-mails de cada Voice: os das pautas atribuídas + o usuário do Office com o mesmo nome
  const emails = {};
  const add = (id, e) => { if (!id || !e) return; (emails[id] = emails[id] || new Set()).add(String(e).toLowerCase()); };
  all(`SELECT DISTINCT voice_id, voice_email FROM voice_pautas WHERE voice_email <> ''`).forEach(r => add(r.voice_id, r.voice_email));
  const users = all(`SELECT email, name FROM users WHERE active=1`);
  lista.forEach(v => { const u = users.find(x => norm(x.name) === norm(v.nome)); if (u) add(v.id, u.email); });

  // Pautas por Voice e estado
  const est = {};
  all(`SELECT voice_id, estado, COUNT(*) n FROM voice_pautas GROUP BY voice_id, estado`).forEach(r => { (est[r.voice_id] = est[r.voice_id] || {})[r.estado] = r.n; });

  // Posts publicados: pauta publicada (URL colada pelo Voice) + post registrado no tracker. Um post = uma URL.
  const posts = {};
  const addPost = (vid, url, quando) => {
    const t = ms(quando); if (!vid || !url) return;
    const k = String(url).split('?')[0].replace(/\/+$/, '');
    const m = (posts[vid] = posts[vid] || new Map());
    if (!m.has(k) || (t && t < (m.get(k) || Infinity))) m.set(k, t);
  };
  all(`SELECT voice_id, post_url, publicado_em, updated_at FROM voice_pautas WHERE estado='publicada' AND post_url <> ''`).forEach(r => addPost(r.voice_id, r.post_url, r.publicado_em || r.updated_at));
  all(`SELECT voice_id, post_url, MIN(CASE WHEN published_at <> '' THEN published_at ELSE captured_at END) q FROM posts GROUP BY voice_id, post_url`).forEach(r => addPost(r.voice_id, r.post_url, r.q));

  // Tokens rastreados de cada Voice: os das pautas liberadas + os links criados pelo próprio Voice
  const tokens = {};
  all(`SELECT voice_id, utm_token FROM voice_pautas WHERE utm_token <> ''`).forEach(r => (tokens[r.voice_id] = tokens[r.voice_id] || new Set()).add(r.utm_token));
  lista.forEach(v => (emails[v.id] ? [...emails[v.id]] : []).forEach(e =>
    all(`SELECT token FROM utm_links WHERE LOWER(email)=?`, e).forEach(r => (tokens[v.id] = tokens[v.id] || new Set()).add(r.token))));

  const agora = Date.now(), d30 = agora - 30 * DAY;
  const tokDono = {};
  Object.keys(tokens).forEach(id => tokens[id].forEach(t => { tokDono[t] = id; }));
  const tokList = Object.keys(tokDono);
  const cliques = {}, porDia = {};
  if (tokList.length) {
    const ph = tokList.map(() => '?').join(',');
    all(`SELECT c.token, c.ts FROM utm_clicks c WHERE ${BOT0} AND c.token IN (${ph})`, ...tokList).forEach(c => {
      const id = tokDono[c.token]; const x = (cliques[id] = cliques[id] || { total: 0, d30: 0 });
      x.total++;
      if (c.ts >= d30) { x.d30++; const d = dia(c.ts); porDia[d] = (porDia[d] || 0) + 1; }
    });
  }

  const voices = lista.map(v => {
    const p = posts[v.id] ? [...posts[v.id].values()] : [];
    const ult = p.filter(Boolean).sort((a, b) => b - a)[0] || null;
    return {
      ...v,
      pautas: est[v.id] || {},
      posts_total: p.length,
      posts_30d: p.filter(t => t && t >= d30).length,
      ultimo_post: ult ? new Date(ult).toISOString() : null,
      cliques_total: (cliques[v.id] || {}).total || 0,
      cliques_30d: (cliques[v.id] || {}).d30 || 0,
      tem_email: !!emails[v.id],
    };
  });

  // Posts por mês (6 meses) — todos os Voices
  const meses = [];
  const ref = new Date(); ref.setUTCDate(1);
  for (let i = 5; i >= 0; i--) { const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1)); meses.push({ mes: d.toISOString().slice(0, 7), n: 0 }); }
  Object.values(posts).forEach(m => m.forEach(t => { if (!t) return; const k = new Date(t).toISOString().slice(0, 7); const x = meses.find(y => y.mes === k); if (x) x.n++; }));

  const dias30 = [];
  for (let i = 29; i >= 0; i--) { const d = dia(agora - i * DAY); dias30.push({ dia: d, n: porDia[d] || 0 }); }

  return {
    programa: { vagas_total: (f.programa || {}).vagas_total || null, meta_posts_semana: (f.programa || {}).meta_posts_mes || null },
    voices,
    vagas_abertas: (f.vagas_abertas || []).filter(vg => !voices.some(v => v.numero === vg.numero)).map(vg => ({ numero: vg.numero, nicho: vg.nicho, tags: vg.tags || [] })),
    posts_por_mes: meses,
    cliques_por_dia: dias30,
  };
}

// ── PAUTAS (Módulo 20) ──────────────────────────────────────────────────────
const ESTADOS = ['enviada', 'em_revisao', 'ajustes_pedidos', 'aprovada_voice', 'liberada', 'publicada'];
function pautasResumo() {
  const resumo = {}; ESTADOS.forEach(e => { resumo[e] = 0; });
  all(`SELECT estado, COUNT(*) n FROM voice_pautas GROUP BY estado`).forEach(r => { resumo[r.estado] = r.n; });
  const abertas = all(`SELECT id, titulo, voice_id, voice_nome, estado, prazo, updated_at, created_at FROM voice_pautas
    WHERE estado <> 'publicada' ORDER BY updated_at ASC LIMIT 200`).map(p => ({ ...p, parada_dias: Math.floor((Date.now() - (ms(p.updated_at) || Date.now())) / DAY) }));
  const eventos = all(`SELECT e.pauta_id, e.evento, e.autor_nome, e.ts, p.titulo, p.voice_nome FROM voice_pauta_eventos e
    JOIN voice_pautas p ON p.id = e.pauta_id ORDER BY e.ts DESC, e.id DESC LIMIT 14`);
  // Ritmo: pautas criadas × publicadas por semana (12 semanas)
  const sem = [];
  const seg = (t) => { const d = new Date(t); const k = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - k); };
  const s0 = seg(Date.now());
  for (let i = 11; i >= 0; i--) sem.push({ semana: dia(s0 - i * 7 * DAY), criadas: 0, publicadas: 0 });
  const idx = (t) => sem.findIndex(x => x.semana === dia(seg(t)));
  all(`SELECT created_at, publicado_em, estado FROM voice_pautas WHERE created_at >= datetime('now','-90 days') OR publicado_em >= date('now','-90 days')`).forEach(p => {
    const c = ms(p.created_at); if (c != null) { const i = idx(c); if (i >= 0) sem[i].criadas++; }
    const q = p.estado === 'publicada' ? ms(p.publicado_em) : null; if (q != null) { const i = idx(q); if (i >= 0) sem[i].publicadas++; }
  });
  const disp = one(`SELECT COUNT(*) n FROM content_pipeline WHERE id NOT IN (SELECT COALESCE(content_id,-1) FROM voice_pautas)`).n;
  return { resumo, total: ESTADOS.reduce((a, e) => a + resumo[e], 0), abertas, eventos, semanas: sem, redatoria_disponiveis: disp == null ? null : disp };
}

// ── INSCRIÇÕES (/seja-voice) — só contagens, sem nomes (dado pessoal) ───────
function inscricoesResumo() {
  const porStatus = {};
  all(`SELECT COALESCE(NULLIF(status,''),'novo') s, COUNT(*) n FROM recruitment_applications GROUP BY s`).forEach(r => { porStatus[r.s] = r.n; });
  const validas = `COALESCE(status,'novo') NOT IN ('teste','ignorado')`;
  const tot = one(`SELECT COUNT(*) n, MAX(created_at) ultima FROM recruitment_applications WHERE ${validas}`);
  const d30 = one(`SELECT COUNT(*) n FROM recruitment_applications WHERE ${validas} AND created_at >= datetime('now','-30 days')`).n || 0;
  const p30 = one(`SELECT COUNT(*) n FROM recruitment_applications WHERE ${validas} AND created_at >= datetime('now','-60 days') AND created_at < datetime('now','-30 days')`).n || 0;
  const porArea = all(`SELECT COALESCE(NULLIF(TRIM(area),''),'(sem área)') area, COUNT(*) n FROM recruitment_applications WHERE ${validas}
    GROUP BY LOWER(area) ORDER BY n DESC LIMIT 6`);
  const porOrigem = all(`SELECT COALESCE(NULLIF(utm_source,''),'direto') origem, COUNT(*) n FROM recruitment_applications WHERE ${validas}
    GROUP BY origem ORDER BY n DESC LIMIT 5`);
  return { total: tot.n || 0, ultima: tot.ultima || null, d30, d30_anterior: p30, por_status: porStatus, por_area: porArea, por_origem: porOrigem };
}

// ── CASES (cs_clientes · sync diário) ───────────────────────────────────────
function casesResumo() {
  const rows = all(`SELECT cliente_nome, lob, status, nps, case_publicavel, case_resumo, synced_at FROM cs_clientes`);
  if (!rows.length) return { disponivel: false };
  const porStatus = {}, porLob = {};
  let sync = null;
  rows.forEach(r => {
    porStatus[r.status || 'live'] = (porStatus[r.status || 'live'] || 0) + 1;
    const l = (r.lob || '').trim() || '(sem LOB)'; porLob[l] = (porLob[l] || 0) + 1;
    const t = ms(r.synced_at); if (t && (!sync || t > sync)) sync = t;
  });
  const nps = rows.map(r => r.nps).filter(n => n != null);
  return {
    disponivel: true,
    total: rows.length,
    publicaveis: rows.filter(r => r.case_publicavel === 1).length,
    nps_medio: nps.length ? Math.round(nps.reduce((a, n) => a + n, 0) / nps.length) : null,
    nps_n: nps.length,
    por_status: porStatus,
    por_lob: Object.entries(porLob).map(([lob, n]) => ({ lob, n })).sort((a, b) => b.n - a.n),
    lista_publicaveis: rows.filter(r => r.case_publicavel === 1 || r.status === 'case-publicado' || r.status === 'em-edicao')
      .map(r => ({ cliente: r.cliente_nome, lob: r.lob || '', status: r.status || '', resumo: (r.case_resumo || '').slice(0, 220) }))
      .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR')).slice(0, 24),
    synced_at: sync ? new Date(sync).toISOString() : null,
    status: !sync ? 'sem-data' : (Date.now() - sync > CASES_STALE_MS ? 'parado' : 'ok'),
  };
}

// ── CALENDÁRIO EDITORIAL (Módulo 25 · planilha via Graph) ───────────────────
function calendarioResumo() {
  let auto = { status: 'desligado', ativo: false };
  try { auto = require('./editorial').autoStatus(); } catch (_) {}
  const last = one(`SELECT MAX(synced_at) s FROM edt_calendario`).s || null;
  const hoje = new Date().toISOString().slice(0, 10);
  const ate = dia(Date.now() + 28 * DAY);
  const proximos = all(`SELECT data, dia, tipo, titulo, lob, formato, status, narrativa FROM edt_calendario
    WHERE data >= ? AND data <= ? ORDER BY data ASC LIMIT 40`, hoje, ate);
  const porStatus = all(`SELECT COALESCE(NULLIF(status,''),'Planejado') status, COUNT(*) n FROM edt_calendario WHERE data >= ? GROUP BY status ORDER BY n DESC`, hoje);
  const porFormato = all(`SELECT COALESCE(NULLIF(formato,''),'(sem formato)') formato, COUNT(*) n FROM edt_calendario WHERE data >= ? GROUP BY formato ORDER BY n DESC LIMIT 6`, hoje);
  return { auto, last_sync: last, proximos, por_status: porStatus, por_formato: porFormato };
}

// ── ROTA ────────────────────────────────────────────────────────────────────
// Só o time: colaborador (hub) e Voice (role 'voice', que só pode ver as
// próprias pautas) ficam de fora — a página mostra pautas e cliques de todos.
const soTime = (req, res, next) => {
  const role = req.session && req.session.user && req.session.user.role;
  return (role === 'hub' || role === 'voice') ? res.status(403).json({ success: false, error: 'forbidden' }) : next();
};
// (A página /area/brand fica no server.js, antes do /area/:id genérico.)
router.get('/api/area/brand', requireAuth, soTime, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      gerado_em: new Date().toISOString(),
      voices: voicesResumo(),
      pautas: pautasResumo(),
      inscricoes: inscricoesResumo(),
      cases: casesResumo(),
      calendario: calendarioResumo(),
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
module.exports.voicesResumo = voicesResumo;   // Módulo 33 (Metas FY27): Voices e posts ao vivo
