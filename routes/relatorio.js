// ── MÓDULO 31 · RELATÓRIO DE MARKETING AO VIVO (/relatorio) ─────────────────
// Só entra o que se atualiza SOZINHO em produção:
//   • Site (GA4)        — o próprio servidor busca na Data API (boot + 12h) e
//                         guarda cada mês no SQLite (sobrevive a deploy).
//   • E-mail (RD)       — refresh diário do server.js; aqui gravamos 1 foto por
//                         dia (relatorio_rd_hist) pra ter a posição de cada mês.
//   • Outbound (Apollo) — refresh 6h do Módulo 29 + apollo_hist (1 linha/dia):
//                         o mês = diferença entre o fim do mês e o fim do anterior.
//   • Voices & links    — tudo que o time faz no Office (pautas, posts, cliques
//                         reais nos links rastreados, inscrições): ao vivo.
//   • Cases             — cs_clientes (sync diário 07:00), com frescor.
//   • Calendário        — planilha editorial lida via Graph a cada 6h (Módulo 25).
// Ficaram de fora (viraram link): LinkedIn (XLS manual), Zoho (sync manual),
// SAP 4 ME, eventos, metas, Instagram, rd-canais (tinha modo "simulado") e o
// relatorio-outreach.json (foto parada). Regra 7: sem dado → status explícito.
//
// Exporta PPTX (scripts/relatorio/gerar_pptx.py, padrão do PPT EPI-USE) e PDF
// (o mesmo PPTX convertido pelo LibreOffice). Quem exportou entra no tracking.

const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const router = express.Router();
const { db, requireAuth, DB_DIR, tokenConfere } = require('../server-context');
const { OWNER_EMAIL } = require('./analytics');

const ROOT = path.join(__dirname, '..');
const DAY = 86400000;
const BRT = -3 * 3600000;                         // Brasil sem horário de verão desde 2019
const GA4_BLOB = 'relatorio.ga4';
const GA4_MS = 12 * 60 * 60 * 1000;               // GA4: boot + a cada 12h
const RD_REC_MS = 3 * 60 * 60 * 1000;             // foto do RD: a cada 3h (1 linha por dia)
const STALE = { ga4: 30, rd: 30, apollo: 26, cases: 36 };   // horas sem atualizar = parado
const TEMPLATE_DIR = path.join(DB_DIR, 'templates');
const TEMPLATE_PATH = path.join(TEMPLATE_DIR, 'epiuse-ppt-template.pptx');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const all = (sql, ...a) => { try { return db.prepare(sql).all(...a); } catch (_) { return []; } };
const one = (sql, ...a) => { try { return db.prepare(sql).get(...a) || {}; } catch (_) { return {}; } };
const readJSON = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fb; } };
// SQLite grava 'YYYY-MM-DD HH:MM:SS' em UTC; 'YYYY-MM-DD' = dia (meio-dia BRT)
const ms = (s) => { if (s == null || s === '') return null; if (typeof s === 'number') return s; let x = String(s); if (/^\d{4}-\d{2}-\d{2}$/.test(x)) x += 'T15:00:00Z'; else if (/^\d{4}-\d{2}-\d{2} \d/.test(x)) x = x.replace(' ', 'T') + 'Z'; const t = Date.parse(x); return isNaN(t) ? null : t; };
const diaBRT = (t) => new Date(t + BRT).toISOString().slice(0, 10);
const mesBRT = (t) => new Date(t + BRT).toISOString().slice(0, 7);
const pct = (a, b) => (a != null && b) ? Math.round(1000 * (a - b) / b) / 10 : null;
const horasDesde = (iso) => { const t = ms(iso); return t ? (Date.now() - t) / 3600000 : null; };

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_blobs (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT (datetime('now')));
    -- 1 foto do RD Station por dia (a última do dia vence): posição de cada mês
    CREATE TABLE IF NOT EXISTS relatorio_rd_hist (dia TEXT PRIMARY KEY, dados TEXT, atualizado_em TEXT);
  `);
} catch (e) { console.warn('[relatorio] tabelas:', e.message); }

function blobLe(key) { const r = one('SELECT value FROM app_blobs WHERE key = ?', key); try { return r.value ? JSON.parse(r.value) : null; } catch (_) { return null; } }
function blobGrava(key, v) {
  try {
    db.prepare(`INSERT INTO app_blobs (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(key, JSON.stringify(v));
  } catch (e) { console.warn('[relatorio] blob:', e.message); }
}

// ── MESES ──────────────────────────────────────────────────────────────────
const mesAtual = () => mesBRT(Date.now());
function limites(mes) {                            // [início, fim) do mês em BRT, epoch ms
  const [y, m] = mes.split('-').map(Number);
  return { ini: Date.UTC(y, m - 1, 1) - BRT, fim: Date.UTC(y, m, 1) - BRT };
}
function mesAnterior(mes) { const [y, m] = mes.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7); }
function ultimosMeses(n, ate) { const out = []; let m = ate; for (let i = 0; i < n; i++) { out.unshift(m); m = mesAnterior(m); } return out; }
const rotulo = (mes) => { const [y, m] = mes.split('-'); return `${MESES[Number(m) - 1]} de ${y}`; };
const ultimoDia = (mes) => { const [y, m] = mes.split('-').map(Number); return `${mes}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`; };

// Janela de comparação: mês fechado → mês anterior inteiro. Mês em andamento →
// o mesmo pedaço do mês anterior (dia 1 até o mesmo dia/hora), pra não comparar
// 5 dias com 30.
function janelas(mes) {
  const cur = limites(mes), ant = limites(mesAnterior(mes));
  const andamento = mes === mesAtual();
  const fimCur = andamento ? Date.now() : cur.fim;
  const fimAnt = andamento ? Math.min(ant.fim, ant.ini + (Date.now() - cur.ini)) : ant.fim;
  return { cur: { ini: cur.ini, fim: fimCur }, ant: { ini: ant.ini, fim: fimAnt }, andamento };
}

// ════════════════════════════════════════════════════════════════════════════
// SITE · GA4 — cache por mês no SQLite. Só vale dado da busca corrigida
// (fetch_v ≥ 2): a v1 às vezes gravava o mês anterior no lugar do atual.
// ════════════════════════════════════════════════════════════════════════════
const GA4 = { running: null, erro: null, erro_ts: null, ultima_ok_ts: null };
const ga4Creds = () => !!(process.env.GA4_PROPERTY_ID && (process.env.GA4_SA_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS));

function ga4Meses() {
  const b = blobLe(GA4_BLOB) || { meses: {} };
  const meses = { ...(b.meses || {}) };
  // O refresh diário do server.js também grava no arquivo: entra se for mais novo
  const f = readJSON(path.join(ROOT, 'public/api/ga4-snapshot.json'), { meses: {} });
  Object.values(f.meses || {}).forEach(m => {
    if (!m || !(m.fetch_v >= 2) || m.usuarios == null) return;   // v1 (meses trocados) não entra
    const c = meses[m.mes];
    if (!c || (ms(m.atualizado_em) || 0) > (ms(c.atualizado_em) || 0)) meses[m.mes] = m;
  });
  return { meses, estado: b.estado || {} };
}

// Mês "fechado" no GA4 = buscado depois de terminar (+6h de folga pro processamento)
const ga4Fechado = (m) => !!m && (ms(m.atualizado_em) || 0) >= limites(m.mes).fim + 6 * 3600000;

async function ga4Refresh(origem) {
  if (!ga4Creds()) return null;
  if (GA4.running) return GA4.running;
  GA4.running = (async () => {
    const ga4 = require(path.join(ROOT, 'scripts/integrations/ga4_fetch.js'));
    const { meses } = ga4Meses();
    const atual = mesAtual();
    // Mês atual sempre; os 12 anteriores só se faltam ou foram buscados antes de fechar.
    const alvo = ultimosMeses(13, atual).filter(m => m === atual || !meses[m] || !ga4Fechado(meses[m]));
    let ok = 0;
    for (const m of alvo) {
      try {
        const r = await ga4.refreshAndCache(m);   // grava também no arquivo (compat)
        meses[m] = { ...r, fetch_v: r.fetch_v || 2 };
        ok++;
      } catch (e) { GA4.erro = String(e.message || e).split('\n')[0].slice(0, 200); GA4.erro_ts = new Date().toISOString(); break; }
    }
    if (ok) { GA4.ultima_ok_ts = new Date().toISOString(); if (ok === alvo.length) GA4.erro = null; }
    blobGrava(GA4_BLOB, { meses, estado: { ultima_ok_ts: GA4.ultima_ok_ts, erro: GA4.erro, erro_ts: GA4.erro_ts } });
    console.log(`[relatorio] GA4 (${origem}): ${ok}/${alvo.length} mês(es) atualizados${GA4.erro ? ' · erro: ' + GA4.erro : ''}`);
  })().catch(e => { GA4.erro = e.message; GA4.erro_ts = new Date().toISOString(); }).finally(() => { GA4.running = null; });
  return GA4.running;
}

function siteDoMes(mes) {
  const { meses, estado } = ga4Meses();
  const serie = ultimosMeses(13, mes).map(m => {
    const x = meses[m];
    return { mes: m, usuarios: x ? x.usuarios : null, visualizacoes: x ? x.visualizacoes : null, sessoes: x ? x.sessoes : null, duracao_s: x ? x.duracao_sessao_s : null };
  });
  const x = meses[mes], p = meses[mesAnterior(mes)];
  const andamento = mes === mesAtual();
  const fechado = ga4Fechado(x);
  const base = { serie, atualizado_em: (estado.ultima_ok_ts || (x && x.atualizado_em)) || null };
  if (!x) return { disponivel: false, motivo: ga4Creds() ? 'buscando' : 'sem-credencial', ...base };
  // Mês parcial (em andamento ou buscado antes de fechar): sem variação, pra não comparar pedaço com mês cheio
  const compara = !andamento && fechado && p;
  return {
    disponivel: true, parcial: !fechado, ...base,
    usuarios: x.usuarios, visualizacoes: x.visualizacoes, sessoes: x.sessoes, duracao_s: x.duracao_sessao_s,
    pags_por_sessao: x.sessoes ? Math.round(100 * x.visualizacoes / x.sessoes) / 100 : null,
    mom: compara ? {
      usuarios: pct(x.usuarios, p.usuarios), visualizacoes: pct(x.visualizacoes, p.visualizacoes),
      sessoes: pct(x.sessoes, p.sessoes), duracao_s: pct(x.duracao_sessao_s, p.duracao_sessao_s),
    } : null,
    top_pages: (x.top_pages || []).slice(0, 8).map(t => ({ path: t.path, titulo: t.title || '', visualizacoes: t.visualizacoes, usuarios: t.usuarios })),
    buscado_em: x.atualizado_em,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// E-MAIL · RD STATION — foto diária da base (segmentações padrão + automação)
// ════════════════════════════════════════════════════════════════════════════
const RD_SNAP = path.join(ROOT, 'public/api/rd-snapshot.json');
function rdExtrai(rd) {
  const seg = (re) => { const s = ((rd.segmentations || {}).top || []).find(x => re.test(x.name || '')); return s ? s.contatos : null; };
  const em = rd.emails || {};
  return {
    base_leads: seg(/todos os contatos/i),
    leads: seg(/^leads \(est/i),
    leads_qualificados: seg(/leads qualificados/i),
    oportunidades: seg(/^oportunidades$/i),
    clientes: seg(/^clientes \(est/i),
    segmentacoes: (rd.segmentations || {}).total ?? null,
    workflows_ativos: (rd.workflows || {}).ativos ?? null,
    workflows_total: (rd.workflows || {}).total ?? null,
    lps_publicadas: (rd.landing_pages || {}).publicadas ?? null,
    emails_total: em.total ?? null,
    emails_enviados_total: em.total_enviados ?? null,
    enviados_por_mes: em.enviados_por_mes || (em.mes_atual ? { [em.mes_atual]: em.enviados_mes_atual } : {}),
    erros: (rd.errors || []).length,
  };
}
function rdGravaFoto() {
  const rd = readJSON(RD_SNAP, null);
  if (!rd || !rd.atualizado_em) return;
  const t = ms(rd.atualizado_em); if (!t) return;
  try {
    db.prepare(`INSERT INTO relatorio_rd_hist (dia, dados, atualizado_em) VALUES (?, ?, ?)
      ON CONFLICT(dia) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em
      WHERE excluded.atualizado_em >= relatorio_rd_hist.atualizado_em`).run(diaBRT(t), JSON.stringify(rdExtrai(rd)), rd.atualizado_em);
  } catch (e) { console.warn('[relatorio] foto RD:', e.message); }
}

function emailDoMes(mes) {
  const rd = readJSON(RD_SNAP, null);
  const hist = all('SELECT dia, dados, atualizado_em FROM relatorio_rd_hist ORDER BY dia ASC').map(r => { try { return { dia: r.dia, at: r.atualizado_em, ...JSON.parse(r.dados) }; } catch (_) { return null; } }).filter(Boolean);
  if (!rd && !hist.length) return { disponivel: false, motivo: process.env.RD_REFRESH_TOKEN ? 'buscando' : 'sem-credencial' };
  const doArq = rd ? { dia: diaBRT(ms(rd.atualizado_em) || Date.now()), at: rd.atualizado_em, ...rdExtrai(rd) } : null;
  const ultHist = hist[hist.length - 1] || null;
  const atual = (!doArq || (ultHist && (ms(ultHist.at) || 0) > (ms(doArq.at) || 0))) ? ultHist : doArq;   // a foto mais nova
  const fimMes = ultimoDia(mes), fimAnt = ultimoDia(mesAnterior(mes));
  const ultimaAte = (dia) => [...hist].reverse().find(h => h.dia <= dia) || null;
  // Posição do mês: última foto dentro do mês. Mês em andamento = agora.
  let ref = mes === mesAtual() ? atual : ultimaAte(fimMes);
  let tipo = 'fim-do-mes';
  if (mes === mesAtual()) tipo = 'agora';
  else if (!ref || ref.dia < `${mes}-01`) { ref = atual; tipo = 'atual'; }   // histórico ainda não cobre o mês
  const antRef = tipo === 'atual' ? null : ultimaAte(fimAnt);
  // E-mails disparados no mês: a foto mais nova sabe contar por mês de envio
  const env = Object.assign({}, ...hist.map(h => h.enviados_por_mes || {}), atual.enviados_por_mes || {});
  return {
    disponivel: true,
    referencia: { tipo, dia: ref.dia },
    base_leads: ref.base_leads, leads: ref.leads, leads_qualificados: ref.leads_qualificados,
    oportunidades: ref.oportunidades, clientes: ref.clientes,
    segmentacoes: ref.segmentacoes, workflows_ativos: ref.workflows_ativos, workflows_total: ref.workflows_total,
    lps_publicadas: ref.lps_publicadas,
    base_delta: antRef && ref.base_leads != null && antRef.base_leads != null ? ref.base_leads - antRef.base_leads : null,
    enviados_mes: env[mes] != null ? env[mes] : null,
    enviados_mes_anterior: env[mesAnterior(mes)] != null ? env[mesAnterior(mes)] : null,
    enviados_serie: ultimosMeses(6, mes).map(m => ({ mes: m, n: env[m] != null ? env[m] : null })),
    historico_desde: hist.length ? hist[0].dia : null,
    atualizado_em: atual.at || null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// OUTBOUND · APOLLO — totais acumulados por dia (apollo_hist, Módulo 29)
// ════════════════════════════════════════════════════════════════════════════
const AP_K = ['entregues', 'abertos', 'respondidos', 'cliques', 'bounces', 'reunioes'];
function outboundDoMes(mes) {
  const blob = blobLe('apollo.pipeline');
  const hist = all('SELECT * FROM apollo_hist ORDER BY dia ASC');
  if (!blob && !hist.length) return { disponivel: false, motivo: (process.env.APOLLO_API_KEY || '').trim() ? 'buscando' : 'sem-credencial' };
  const ini = `${mes}-01`, fim = ultimoDia(mes);
  const base = [...hist].reverse().find(h => h.dia < ini) || null;
  const noMes = hist.filter(h => h.dia >= ini && h.dia <= fim);
  const ult = noMes[noMes.length - 1] || null;
  let doMes = null;
  if (ult && (base || noMes.length >= 2)) {
    const b = base || noMes[0];
    doMes = { desde: base ? null : b.dia, ate: ult.dia, completo: !!base && mes !== mesAtual() };
    let neg = false;
    AP_K.forEach(k => { const d = (ult[k] || 0) - (b[k] || 0); if (d < 0) neg = true; doMes[k] = Math.max(0, d); });
    if (neg) doMes.aviso = 'sequência arquivada no mês — número pode estar subcontado';
    doMes.taxa_abertura = doMes.entregues ? Math.round(1000 * doMes.abertos / doMes.entregues) / 10 : null;
    doMes.taxa_resposta = doMes.entregues ? Math.round(1000 * doMes.respondidos / doMes.entregues) / 10 : null;
  }
  // Ritmo dia a dia dentro do mês (diferença entre fotos consecutivas)
  const dias = [];
  let prev = base;
  noMes.forEach(h => { if (prev) dias.push({ dia: h.dia, entregues: Math.max(0, (h.entregues || 0) - (prev.entregues || 0)), respondidos: Math.max(0, (h.respondidos || 0) - (prev.respondidos || 0)), reunioes: Math.max(0, (h.reunioes || 0) - (prev.reunioes || 0)) }); prev = h; });
  const t = (blob && blob.totais) || {};
  const seqs = ((blob && blob.sequencias) || []).filter(s => !s.arquivada);
  return {
    disponivel: true,
    mes: doMes,
    historico_desde: hist.length ? hist[0].dia : null,
    dias,
    contatos: blob ? blob.contatos_total : null, contas: blob ? blob.contas_total : null,
    sequencias_ativas: blob ? blob.sequencias_ativas : null, sequencias_total: blob ? blob.sequencias_total : null,
    acumulado: { ...t, taxa_abertura: t.entregues ? Math.round(1000 * t.abertos / t.entregues) / 10 : null, taxa_resposta: t.entregues ? Math.round(1000 * t.respondidos / t.entregues) / 10 : null },
    top_sequencias: seqs.slice().sort((a, b) => (b.ativa - a.ativa) || (b.entregues - a.entregues)).slice(0, 6)
      .map(s => ({ nome: s.nome, ativa: s.ativa, dono: s.dono, entregues: s.entregues, respondidos: s.respondidos, reunioes: s.reunioes, taxa_resposta: s.taxa_resposta != null ? Math.round(s.taxa_resposta * 1000) / 10 : null })),
    estagios: blob && Array.isArray(blob.estagios) ? blob.estagios.map(e => ({ nome: e.nome, contatos: e.contatos })) : null,
    atualizado_em: blob ? blob.ultima_sync_ts : null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// VOICES, LINKS RASTREADOS E INSCRIÇÕES — ao vivo (tabelas do próprio Office)
// ════════════════════════════════════════════════════════════════════════════
const BOT0 = (() => { try { return db.prepare('PRAGMA table_info(utm_clicks)').all().some(c => c.name === 'bot') ? 'COALESCE(bot,0)=0' : '1=1'; } catch (_) { return '1=1'; } })();
const dentro = (t, j) => t != null && t >= j.ini && t < j.fim;

// Um post = uma URL (pauta publicada + post registrado no tracker, sem duplicar),
// datado pela primeira vez que apareceu. Exportada: o relatório semanal por
// e-mail (Módulo 34) conta com a mesma lista, pra os dois números baterem.
function postsVoices() {
  const posts = new Map();
  const add = (vid, vnome, url, quando) => {
    const t = ms(quando); if (!vid || !url) return;
    const k = String(url).split('?')[0].replace(/\/+$/, '');
    const cur = posts.get(k);
    if (!cur || (t && t < (cur.t || Infinity))) posts.set(k, { vid, vnome, t });
  };
  all(`SELECT voice_id, voice_nome, post_url, publicado_em, updated_at FROM voice_pautas WHERE estado='publicada' AND post_url <> ''`).forEach(r => add(r.voice_id, r.voice_nome, r.post_url, r.publicado_em || r.updated_at));
  all(`SELECT voice_id, post_url, MIN(CASE WHEN published_at <> '' THEN published_at ELSE captured_at END) q FROM posts GROUP BY voice_id, post_url`).forEach(r => add(r.voice_id, null, r.post_url, r.q));
  return [...posts.values()];
}

function voicesDoMes(mes) {
  const J = janelas(mes);
  const f = readJSON(path.join(ROOT, 'public/api/voices.json'), { voices: [] });
  const roster = (f.voices || []).map(v => ({ id: v.id, nome: v.nome }));
  all('SELECT data FROM voices_publicados').forEach(r => { try { const v = JSON.parse(r.data); if (v && v.id && !roster.some(x => x.id === v.id)) roster.push({ id: v.id, nome: v.nome }); } catch (_) {} });
  const nome = (id, fb) => (roster.find(v => v.id === id) || {}).nome || fb || id;

  const lista = postsVoices();
  const porVoice = {};
  lista.filter(p => dentro(p.t, J.cur)).forEach(p => { const k = p.vid; (porVoice[k] = porVoice[k] || { id: k, nome: nome(k, p.vnome), posts: 0 }).posts++; });
  const posts6m = ultimosMeses(6, mes).map(m => ({ mes: m, n: lista.filter(p => p.t && mesBRT(p.t) === m).length }));

  const pautas = all('SELECT created_at, publicado_em, estado FROM voice_pautas');
  const criadas = pautas.filter(p => dentro(ms(p.created_at), J.cur)).length;
  const publicadas = pautas.filter(p => p.estado === 'publicada' && dentro(ms(p.publicado_em), J.cur)).length;
  const emAndamento = pautas.filter(p => p.estado !== 'publicada').length;

  const validas = `COALESCE(status,'novo') NOT IN ('teste','ignorado')`;
  const insc = all(`SELECT created_at FROM recruitment_applications WHERE ${validas}`).map(r => ms(r.created_at));
  const ids = new Set([...roster.map(v => v.id), ...lista.map(p => p.vid)]);   // quem posta conta no programa
  return {
    roster: ids.size,
    posts_mes: lista.filter(p => dentro(p.t, J.cur)).length,
    posts_mes_anterior: lista.filter(p => dentro(p.t, J.ant)).length,
    voices_que_postaram: Object.keys(porVoice).length,
    por_voice: Object.values(porVoice).sort((a, b) => b.posts - a.posts).slice(0, 8),
    posts_6m: posts6m,
    pautas_criadas: criadas, pautas_publicadas: publicadas, pautas_em_andamento: emAndamento,
    inscricoes_mes: insc.filter(t => dentro(t, J.cur)).length,
    inscricoes_mes_anterior: insc.filter(t => dentro(t, J.ant)).length,
  };
}

function linksDoMes(mes) {
  const J = janelas(mes);
  const q = (j) => all(`SELECT c.token, c.ts, c.ip_hash, l.campaign, l.source, l.medium FROM utm_clicks c
    LEFT JOIN utm_links l ON l.token = c.token WHERE ${BOT0.replace(/bot/, 'c.bot')} AND c.ts >= ? AND c.ts < ?`, j.ini, j.fim);
  const cur = q(J.cur), ant = q(J.ant);
  const porDia = {};
  cur.forEach(c => { const d = diaBRT(c.ts); porDia[d] = (porDia[d] || 0) + 1; });
  const dias = [];
  const ini = limites(mes).ini, fimMes = limites(mes).fim;
  for (let t = ini + 12 * 3600000; t < fimMes; t += DAY) { const d = diaBRT(t); dias.push({ dia: d, n: porDia[d] || 0, futuro: t > Date.now() }); }
  const grupo = (k) => { const m = {}; cur.forEach(c => { const v = (c[k] || '').trim() || '(sem ' + (k === 'source' ? 'origem' : 'campanha') + ')'; m[v] = (m[v] || 0) + 1; }); return Object.entries(m).map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n); };
  const criados = one(`SELECT COUNT(*) n FROM utm_links WHERE created_at >= ? AND created_at < ?`,
    new Date(J.cur.ini).toISOString().replace('T', ' ').slice(0, 19), new Date(J.cur.fim).toISOString().replace('T', ' ').slice(0, 19)).n;
  return {
    cliques: cur.length, cliques_anterior: ant.length,
    pessoas: new Set(cur.map(c => c.ip_hash).filter(Boolean)).size,
    links_criados: criados == null ? null : criados,
    por_dia: dias,
    por_origem: grupo('source').slice(0, 6),
    por_campanha: grupo('campaign').slice(0, 8),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CASES (sync diário) e CALENDÁRIO EDITORIAL (Graph 6h)
// ════════════════════════════════════════════════════════════════════════════
function casesAgora() {
  const rows = all('SELECT cliente_nome, lob, status, nps, case_publicavel, synced_at FROM cs_clientes');
  if (!rows.length) return { disponivel: false, motivo: 'sem-dado' };
  const porStatus = {}, porLob = {};
  let sync = null;
  rows.forEach(r => {
    const s = r.status || 'live'; porStatus[s] = (porStatus[s] || 0) + 1;
    const l = (r.lob || '').trim() || '(sem LOB)'; porLob[l] = (porLob[l] || 0) + 1;
    const t = ms(r.synced_at); if (t && (!sync || t > sync)) sync = t;
  });
  const nps = rows.map(r => r.nps).filter(n => n != null);
  return {
    disponivel: true, total: rows.length,
    publicaveis: rows.filter(r => r.case_publicavel === 1).length,
    nps_medio: nps.length ? Math.round(nps.reduce((a, n) => a + n, 0) / nps.length) : null, nps_n: nps.length,
    por_status: porStatus,
    por_lob: Object.entries(porLob).map(([lob, n]) => ({ lob, n })).sort((a, b) => b.n - a.n).slice(0, 8),
    atualizado_em: sync ? new Date(sync).toISOString() : null,
  };
}

function editorialDoMes(mes) {
  let auto = { status: 'desligado' };
  try { auto = require('./editorial').autoStatus(); } catch (_) {}
  if (auto.status !== 'ok') return { disponivel: false, motivo: auto.status, auto };
  const rows = all(`SELECT data, tipo, titulo, lob, formato, status FROM edt_calendario WHERE data >= ? AND data <= ? ORDER BY data ASC`, `${mes}-01`, ultimoDia(mes));
  const conta = (k, fb) => { const m = {}; rows.forEach(r => { const v = (r[k] || '').trim() || fb; m[v] = (m[v] || 0) + 1; }); return Object.entries(m).map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n); };
  return {
    disponivel: true, auto, total: rows.length,
    por_status: conta('status', 'Planejado'), por_formato: conta('formato', '(sem formato)').slice(0, 6), por_lob: conta('lob', '(sem LOB)').slice(0, 6),
    itens: rows.slice(0, 40).map(r => ({ data: r.data, titulo: r.titulo, formato: r.formato, status: r.status || 'Planejado', lob: r.lob })),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// FONTES (dentro × fora) e DESTAQUES (frases montadas dos números — sem IA)
// ════════════════════════════════════════════════════════════════════════════
function statusPor(horas, limite) { return horas == null ? 'sem-dado' : (horas > limite ? 'parado' : 'ok'); }
function fontes(d) {
  const ga = ga4Meses().estado;
  const ga4St = !ga4Creds() ? 'sem-credencial' : (GA4.erro && !GA4.ultima_ok_ts ? 'erro' : statusPor(horasDesde(ga.ultima_ok_ts || GA4.ultima_ok_ts || d.site.atualizado_em), STALE.ga4));
  const rdSt = d.email.disponivel ? statusPor(horasDesde(d.email.atualizado_em), STALE.rd) : (d.email.motivo || 'sem-dado');
  const apSt = d.outbound.disponivel ? statusPor(horasDesde(d.outbound.atualizado_em), STALE.apollo) : (d.outbound.motivo || 'sem-dado');
  const csSt = d.cases.disponivel ? statusPor(horasDesde(d.cases.atualizado_em), STALE.cases) : 'sem-dado';
  return {
    dentro: [
      { id: 'ga4', nome: 'Site · Google Analytics 4', cadencia: 'servidor busca a cada 12h', status: ga4St, atualizado_em: ga.ultima_ok_ts || d.site.atualizado_em || null, erro: ga4St === 'erro' ? GA4.erro : null },
      { id: 'rd', nome: 'E-mail & base · RD Station', cadencia: 'servidor busca 1x/dia', status: rdSt, atualizado_em: d.email.atualizado_em || null },
      { id: 'apollo', nome: 'Outbound · Apollo', cadencia: 'servidor busca a cada 6h', status: apSt, atualizado_em: d.outbound.atualizado_em || null },
      { id: 'voices', nome: 'EPI-USE Voices · pautas e posts', cadencia: 'ao vivo (Office)', status: 'ok', atualizado_em: d.gerado_em },
      { id: 'links', nome: 'Links rastreados · UTM', cadencia: 'ao vivo (cada clique)', status: 'ok', atualizado_em: d.gerado_em },
      { id: 'cases', nome: 'Cases · Customer Success', cadencia: 'sync diário 07:00', status: csSt, atualizado_em: d.cases.atualizado_em || null },
      { id: 'editorial', nome: 'Calendário editorial · planilha', cadencia: 'servidor lê a cada 6h', status: d.editorial.disponivel ? 'ok' : (d.editorial.motivo || 'desligado'), atualizado_em: d.editorial.auto ? d.editorial.auto.ultima_ok_ts : null },
    ],
    fora: [
      { id: 'linkedin', nome: 'LinkedIn da empresa', motivo: 'Export manual (XLS) — sem API de página', href: '/linkedin' },
      { id: 'zoho', nome: 'Zoho CRM · deals', motivo: 'Sync manual, sem rotina automática', href: '/area/intelligence' },
      { id: 'eventos', nome: 'Eventos & Field Marketing', motivo: 'Calendário editado à mão', href: '/area/eventos' },
      { id: 'sap4me', nome: 'SAP 4 ME · projetos', motivo: 'Planilha enviada do PC', href: '/clientes-sap-4me' },
      { id: 'metas', nome: 'Metas FY27', motivo: 'Planilha oficial, sync manual', href: '/metas-fy27' },
      { id: 'instagram', nome: 'Instagram', motivo: 'Sem integração — números só nos reports antigos', href: null },
    ],
  };
}

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('pt-BR');
const sinal = (p) => p == null ? '' : ` (${p > 0 ? '+' : ''}${String(p).replace('.', ',')}% vs mês anterior)`;
function destaques(d) {
  const out = [];
  const s = d.site;
  if (s.disponivel) {
    out.push({ fonte: 'ga4', tom: s.mom && s.mom.usuarios != null ? (s.mom.usuarios >= 0 ? 'up' : 'down') : 'info',
      texto: `${fmt(s.usuarios)} pessoas visitaram o site${s.parcial ? ' até agora' : ''}${sinal(s.mom && s.mom.usuarios)}.` });
    const tp = (s.top_pages || []).find(p => p.path && p.path !== '/');
    if (tp) out.push({ fonte: 'ga4', tom: 'info', texto: `Página mais vista depois da home: ${tp.titulo ? tp.titulo.split(' - ')[0] : tp.path} (${fmt(tp.visualizacoes)} visualizações).` });
  }
  const e = d.email;
  if (e.disponivel && e.base_leads != null) out.push({ fonte: 'rd', tom: e.base_delta > 0 ? 'up' : 'info', texto: `Base de leads no RD: ${fmt(e.base_leads)} contatos${e.base_delta != null ? ` (${e.base_delta >= 0 ? '+' : ''}${fmt(e.base_delta)} no mês)` : ''}.` });
  if (e.disponivel && e.enviados_mes != null) out.push({ fonte: 'rd', tom: 'info', texto: `${fmt(e.enviados_mes)} e-mail(s) de marketing disparados no RD.` });
  const o = d.outbound;
  if (o.disponivel && o.mes) out.push({ fonte: 'apollo', tom: o.mes.reunioes > 0 ? 'up' : 'info', texto: `Outbound: ${fmt(o.mes.entregues)} e-mails entregues, ${fmt(o.mes.respondidos)} respostas${o.mes.taxa_resposta != null ? ` (${String(o.mes.taxa_resposta).replace('.', ',')}%)` : ''} e ${fmt(o.mes.reunioes)} reunião(ões)${o.mes.desde ? ` desde ${o.mes.desde.split('-').reverse().slice(0, 2).join('/')}` : ''}.` });
  const v = d.voices;
  if (v.posts_mes || v.posts_mes_anterior) out.push({ fonte: 'voices', tom: v.posts_mes >= v.posts_mes_anterior ? 'up' : 'down', texto: `${fmt(v.posts_mes)} post(s) dos Voices publicados por ${fmt(v.voices_que_postaram)} Voice(s) (mês anterior: ${fmt(v.posts_mes_anterior)}).` });
  const l = d.links;
  if (l.cliques || l.cliques_anterior) out.push({ fonte: 'links', tom: l.cliques >= l.cliques_anterior ? 'up' : 'down', texto: `${fmt(l.cliques)} cliques reais nos links rastreados, de ${fmt(l.pessoas)} pessoa(s) (mês anterior: ${fmt(l.cliques_anterior)}).` });
  if (v.inscricoes_mes) out.push({ fonte: 'voices', tom: 'up', texto: `${fmt(v.inscricoes_mes)} nova(s) inscrição(ões) para o programa EPI-USE Voices.` });
  return out;
}

function montar(mes) {
  const d = { success: true, mes, rotulo: rotulo(mes), em_andamento: mes === mesAtual(), gerado_em: new Date().toISOString() };
  d.meses = ultimosMeses(12, mesAtual()).reverse().map(m => ({ mes: m, rotulo: rotulo(m), em_andamento: m === mesAtual() }));
  d.site = siteDoMes(mes);
  d.email = emailDoMes(mes);
  d.outbound = outboundDoMes(mes);
  d.voices = voicesDoMes(mes);
  d.links = linksDoMes(mes);
  d.cases = casesAgora();
  d.editorial = editorialDoMes(mes);
  d.fontes = fontes(d);
  d.destaques = destaques(d);
  return d;
}

// Mês padrão: o último fechado (o relatório da diretoria é do mês que passou)
const mesValido = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m || '') && m <= mesAtual() && m >= ultimosMeses(12, mesAtual())[0];
const mesDaQuery = (q) => mesValido(q) ? q : mesAnterior(mesAtual());

// ── ROTAS ──────────────────────────────────────────────────────────────────
const sessEmail = (req) => String((req.session && req.session.user && req.session.user.email) || '').toLowerCase();
const soDono = (req, res, next) => sessEmail(req) === OWNER_EMAIL ? next() : res.status(403).json({ success: false, error: 'forbidden' });

// Sessão do time ou token de máquina no header (o gerador rodado à mão no PC)
const sessaoOuToken = (req, res, next) => tokenConfere(req.headers['x-editor-token']) ? next() : requireAuth(req, res, next);

router.get('/api/relatorio/live', sessaoOuToken, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(montar(mesDaQuery(req.query.mes)));
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── EXPORTAÇÃO · PPTX (python-pptx) e PDF (LibreOffice) ─────────────────────
const PYBIN = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
function sofficeBin() {
  const c = [process.env.SOFFICE_BIN, '/usr/bin/soffice', '/usr/bin/libreoffice', '/usr/lib/libreoffice/program/soffice',
    'C:/Program Files/LibreOffice/program/soffice.exe', '/Applications/LibreOffice.app/Contents/MacOS/soffice'].filter(Boolean);
  return c.find(p => { try { return fs.existsSync(p); } catch (_) { return false; } }) || null;
}
const run = (bin, args, opts) => new Promise((ok, ko) => execFile(bin, args, opts, (err, stdout, stderr) => err ? ko(Object.assign(err, { stderr, stdout })) : ok(stdout)));
let exportando = 0;   // no máx. 2 gerações ao mesmo tempo (LibreOffice é pesado)

function registraExport(req, formato, mes) {
  try {
    db.prepare(`INSERT INTO analytics_events (sid, email, path, kind, dur_ms, ua, ts, meta) VALUES (?,?,?,?,?,?,?,?)`)
      .run(String(req.sessionID || '').slice(0, 40), sessEmail(req) || 'anon', '/relatorio', 'relatorio', 0,
        String(req.headers['user-agent'] || '').slice(0, 200), Date.now(), `export.${formato}.${mes}`);
  } catch (_) { /* tracking nunca derruba o download */ }
}

router.get('/api/relatorio/export', requireAuth, async (req, res) => {
  const formato = req.query.formato === 'pdf' ? 'pdf' : 'pptx';
  const mes = mesDaQuery(req.query.mes);
  if (formato === 'pdf' && !sofficeBin()) return res.status(503).json({ success: false, error: 'PDF indisponível neste servidor (LibreOffice não instalado).' });
  if (exportando >= 2) return res.status(429).json({ success: false, error: 'Já tem relatório sendo gerado — tente em alguns segundos.' });
  exportando++;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relatorio-'));
  try {
    const dados = montar(mes);
    dados.gerado_por = (req.session && req.session.user && req.session.user.name) || '';
    const jsonPath = path.join(dir, 'dados.json');
    fs.writeFileSync(jsonPath, JSON.stringify(dados), 'utf8');
    const nome = `EPI-USE Brasil - Relatorio de Marketing - ${mes}`;
    const pptx = path.join(dir, nome + '.pptx');
    const args = [path.join(ROOT, 'scripts/relatorio/gerar_pptx.py'), '--data', jsonPath, '--output', pptx];
    if (fs.existsSync(TEMPLATE_PATH)) args.push('--template', TEMPLATE_PATH);
    await run(PYBIN, args, { timeout: 120000, cwd: ROOT });
    let arquivo = pptx;
    if (formato === 'pdf') {
      // Perfil do LibreOffice por execução: duas conversões ao mesmo tempo não brigam
      const perfil = 'file://' + path.join(dir, 'lo-perfil').replace(/\\/g, '/');
      await run(sofficeBin(), [`-env:UserInstallation=${perfil}`, '--headless', '--norestore', '--convert-to', 'pdf', '--outdir', dir, pptx], { timeout: 150000 });
      arquivo = pptx.replace(/\.pptx$/, '.pdf');
      if (!fs.existsSync(arquivo)) throw new Error('LibreOffice não gerou o PDF');
    }
    registraExport(req, formato, mes);
    res.download(arquivo, path.basename(arquivo), () => fs.rm(dir, { recursive: true, force: true }, () => {}));
  } catch (e) {
    console.error(`[relatorio] export ${formato} ${mes} falhou: ${e.message}\n${e.stderr || ''}`);
    fs.rm(dir, { recursive: true, force: true }, () => {});
    if (!res.headersSent) res.status(500).json({ success: false, error: `Erro ao gerar o ${formato.toUpperCase()}.` });
  } finally { exportando--; }
});
// Compat: link antigo do botão "Baixar PPT"
router.get('/api/relatorio/download-pptx', requireAuth, (req, res) => {
  res.redirect(302, '/api/relatorio/export?formato=pptx' + (mesValido(req.query.mes) ? '&mes=' + req.query.mes : ''));
});

// Capacidades do servidor (a página esconde o PDF se não houver LibreOffice)
router.get('/api/relatorio/capacidades', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ pptx: true, pdf: !!sofficeBin(), template_oficial: fs.existsSync(TEMPLATE_PATH) });
});

// ── TEMPLATE OFICIAL (opcional · só o dono) ─────────────────────────────────
// O .pptx oficial da marca não vai pro git (repositório público). O dono sobe
// uma vez; fica no volume (DATA_DIR/templates) e o gerador passa a usar os
// layouts dele. Sem template, o gerador desenha o padrão do Brand Guide 2026.
router.get('/api/relatorio/template', requireAuth, soDono, (req, res) => {
  let st = null; try { st = fs.statSync(TEMPLATE_PATH); } catch (_) {}
  res.json({ tem: !!st, bytes: st ? st.size : null, enviado_em: st ? st.mtime.toISOString() : null });
});
router.post('/api/relatorio/template', requireAuth, soDono, express.raw({ type: () => true, limit: '40mb' }), (req, res) => {
  const buf = req.body;
  // .pptx = zip (PK\x03\x04) com ppt/presentation.xml dentro
  if (!Buffer.isBuffer(buf) || buf.length < 1000 || buf.readUInt32LE(0) !== 0x04034b50 || !buf.includes('ppt/presentation.xml')) {
    return res.status(400).json({ success: false, error: 'Envie o arquivo .pptx do template oficial.' });
  }
  try {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
    const tmp = TEMPLATE_PATH + '.' + crypto.randomBytes(4).toString('hex');
    fs.writeFileSync(tmp, buf); fs.renameSync(tmp, TEMPLATE_PATH);
    res.json({ success: true, bytes: buf.length });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
router.delete('/api/relatorio/template', requireAuth, soDono, (req, res) => {
  try { fs.unlinkSync(TEMPLATE_PATH); } catch (_) {}
  res.json({ success: true });
});

// ── AGENDA ─────────────────────────────────────────────────────────────────
rdGravaFoto();                                                    // a foto que já existe no arquivo
setTimeout(rdGravaFoto, 150 * 1000).unref();                      // depois do refresh diário do boot (40s)
setInterval(rdGravaFoto, RD_REC_MS).unref();
if (ga4Creds()) {
  setTimeout(() => ga4Refresh('boot'), 75 * 1000).unref();
  setInterval(() => ga4Refresh('12h'), GA4_MS).unref();
  console.log('[relatorio] GA4 por mês agendado (boot + a cada 12h)');
} else {
  console.log('[relatorio] GA4 inativo (sem credenciais — esperado em local)');
}

module.exports = router;
module.exports.montar = montar;
module.exports.postsVoices = postsVoices;
// Módulo 33 (Metas FY27): o placar lê este mesmo cache do GA4 — uma busca só no servidor.
module.exports.ga4Resumo = () => {
  const { meses, estado } = ga4Meses();
  const ult = estado.ultima_ok_ts || GA4.ultima_ok_ts || null;
  const status = !ga4Creds() ? 'sem-chave' : (GA4.erro && !ult) ? 'erro' : !ult ? 'aguardando' : statusPor(horasDesde(ult), STALE.ga4);
  return { meses, fechado: ga4Fechado, status, ultima_ok_ts: ult, erro: GA4.erro };
};
