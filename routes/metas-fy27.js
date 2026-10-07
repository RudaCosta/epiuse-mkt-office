// ── MÓDULO 31 · METAS FY27 — placar ao vivo ─────────────────────────────────
// /metas-fy27 só mostra "realizado" quando a fonte se atualiza SOZINHA em prod:
//   • Apollo  — refresh no servidor a cada 6h (routes/area-pipeline.js) +
//               histórico diário (apollo_hist) para as janelas de 7/30 dias.
//   • Office  — o que o time faz dentro do Office entra na hora: Voices e
//               posts (Módulo 30), kanban e captura dos eventos (Field
//               Marketing), pautas da Redatoria (content_pipeline).
//   • GA4     — refresh diário do mês corrente (server.js) + os meses do FY27
//               que faltarem, buscados aqui (boot + 24h).
// A META vem da planilha da equipe (metas-fy26.json, que hoje carrega o FY27)
// e do funil de cada área (areas.json). Sem fonte automática, a meta vira
// link para onde é medida. Regras de processo, cabeçalhos e prazos vencidos
// da planilha saem da página (seguem na planilha). Regra 7: nada chumbado.

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { db, requireAuth } = require('../server-context');

const API = (f) => path.join(__dirname, '../public/api', f);
const DAY = 86400000;
const GA4_STALE_MS = 30 * 60 * 60 * 1000; // refresh diário → >30h sem atualizar = parado

const all = (sql, ...a) => { try { return db.prepare(sql).all(...a); } catch (_) { return []; } };
const one = (sql, ...a) => { try { return db.prepare(sql).get(...a) || {}; } catch (_) { return {}; } };
const lerJSON = (f) => { try { return JSON.parse(fs.readFileSync(API(f), 'utf8')); } catch (_) { return null; } };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// "60 / mês" → 60 · "500–800 / mês" → 500 · "≥ 4 novas/tri" → 4
const num = (v) => { if (v == null) return null; if (typeof v === 'number') return Number.isFinite(v) ? v : null; const m = String(v).replace(/\./g, '').match(/\d+(?:,\d+)?/); return m ? Number(m[0].replace(',', '.')) : null; };
const ms = (s) => { if (!s) return null; let x = String(s); if (/^\d{4}-\d{2}-\d{2}$/.test(x)) x += 'T12:00:00Z'; else if (/^\d{4}-\d{2}-\d{2} \d/.test(x)) x = x.replace(' ', 'T') + 'Z'; const t = Date.parse(x); return isNaN(t) ? null : t; };
const dia = (t) => new Date(t).toISOString().slice(0, 10);

// ── Ano fiscal EPI-USE (jul → jun) ──────────────────────────────────────────
const FY = { nome: 'FY27', inicio: '2026-07-01', fim: '2027-06-30' };
function relogio(agora = Date.now()) {
  const i = Date.parse(FY.inicio + 'T03:00:00Z'), f = Date.parse(FY.fim + 'T03:00:00Z') + DAY;
  const y = new Date(agora).getUTCFullYear();
  const yi = Date.UTC(y, 0, 1), yf = Date.UTC(y + 1, 0, 1);
  const clamp = (v) => Math.max(0, Math.min(100, v));
  return {
    ...FY,
    pct: Math.round(clamp((agora - i) / (f - i) * 100) * 10) / 10,
    dias_passados: Math.max(0, Math.floor((agora - i) / DAY)),
    dias_restantes: Math.max(0, Math.ceil((f - agora) / DAY)),
    ano: y,
    ano_pct: Math.round(clamp((agora - yi) / (yf - yi) * 100) * 10) / 10,
  };
}

// ── Áreas (cor fixa por área, nunca pelo ranking) ───────────────────────────
const AREAS = {
  pipeline:     { curto: 'Biz Dev',         nome: 'Biz Dev / Pipeline',        dona: 'Marlison Estrela',      ic: '📞', cor: '--color-spot-aws-orange',        href: '/area/pipeline' },
  intelligence: { curto: 'Intelligence',    nome: 'Intelligence & CRM',        dona: 'Bruna Yamagami',        ic: '🧠', cor: '--color-brand-cornflower-blue',  href: '/area/intelligence' },
  eventos:      { curto: 'Field Marketing', nome: 'Field Marketing & Eventos', dona: 'Gabrielle Senne',       ic: '📅', cor: '--color-spot-canary-yellow',     href: '/area/eventos' },
  brand:        { curto: 'Brand / Voices',  nome: 'Brand Experience / Voices', dona: 'Eduarda Hirose (Duda)', ic: '🎨', cor: '--color-spot-teal-green',        href: '/area/brand' },
  conteudo:     { curto: 'Conteúdo',        nome: 'Conteúdo / Redatoria',      dona: 'Lisiane de Assis',      ic: '✍️', cor: '--color-spot-servicenow-green',  href: '/area/conteudo' },
  growth:       { curto: 'Growth',          nome: 'Growth & Performance',      dona: 'Guilherme Marques (Gui)', ic: '🚀', cor: '--color-spot-azure-blue',      href: '/area/growth' },
  design:       { curto: 'Design',          nome: 'Envelopamento Visual',      dona: 'Designer Pleno/Sênior', ic: '🖌️', cor: '--color-brand-stone-gray',       href: null },
};
const AREA_DA_PLANILHA = (a) => /sdr|prospec/i.test(a) ? 'pipeline' : /intellig|crm/i.test(a) ? 'intelligence'
  : /evento|field/i.test(a) ? 'eventos' : /designer|visual/i.test(a) ? 'design' : null;

// ── Onde cada meta "de fora" é medida ───────────────────────────────────────
const ONDE = {
  zoho:     { nome: 'Zoho CRM', href: 'https://crm.zoho.com/crm/', ext: true, por: 'sync manual (depende de sessão do Claude)' },
  apollo:   { nome: 'Apollo', href: 'https://app.apollo.io/', ext: true, por: 'a API cobre só e-mails das sequências' },
  linkedin: { nome: 'LinkedIn da empresa', href: '/linkedin', ext: false, por: 'export manual (XLS) — LinkedIn não tem API aberta' },
  perfil:   { nome: 'Perfil pessoal no LinkedIn', href: null, ext: false, por: 'atividade de cada pessoa (conexões, comentários, SSI) — LinkedIn não tem API' },
  rd:       { nome: 'RD Station', href: 'https://app.rdstation.com.br/', ext: true, por: 'a API atual não traz MQL, abertura nem CTR' },
  hubspot:  { nome: 'HubSpot', href: 'https://app.hubspot.com/', ext: true, por: 'sem integração no servidor' },
  site:     { nome: 'Blog / Artigos', href: '/artigos', ext: false, por: 'base de artigos importada à parte' },
  eventos:  { nome: 'Área Field Marketing', href: '/area/eventos', ext: false, por: 'registro manual pós-evento' },
  df:       { nome: 'SAP Development Funds', href: '/development-funds', ext: false, por: 'tracker atualizado à mão' },
  canva:    { nome: 'Canva', href: 'https://www.canva.com/', ext: true, por: 'entregas do design — sem API' },
};

// ── APOLLO (blob + histórico diário) ────────────────────────────────────────
function apolloDados() {
  let snap = null;
  try { const r = one(`SELECT value FROM app_blobs WHERE key='apollo.pipeline'`); snap = r.value ? JSON.parse(r.value) : null; } catch (_) {}
  const hist = all(`SELECT * FROM apollo_hist ORDER BY dia DESC LIMIT 120`).reverse();
  let status = { status: snap ? 'ok' : 'aguardando', ultima_sync_ts: snap ? snap.ultima_sync_ts : null, intervalo_h: 6 };
  try { status = require('./area-pipeline').apolloStatus(snap); } catch (_) {}
  return { snap, hist, status };
}
// Variação de um campo acumulado numa janela de N dias (mesma regra da área Pipeline)
function janela(hist, campo, dias) {
  const h = hist.filter(r => r[campo] != null);
  if (h.length < 2) return null;
  const last = h[h.length - 1], lastT = ms(last.dia), alvo = lastT - dias * DAY;
  // Base = 1º registro DENTRO da janela: com buraco no histórico a janela encolhe
  // (e a meta fica proporcional) em vez de somar dias de fora dela.
  const base = h.find(r => ms(r.dia) >= alvo);
  const span = Math.round((lastT - ms(base.dia)) / DAY);
  if (span < 1) return null;
  return { v: Math.max(0, last[campo] - base[campo]), dias: span, desde: base.dia, ate: last.dia };
}
// Série diária: diferença dia a dia (acumulado) ou valor do dia (estoque)
function serieHist(hist, campo, modo, dias = 30) {
  const h = hist.filter(r => r[campo] != null).slice(-(dias + 1));
  const pts = [];
  for (let i = modo === 'delta' ? 1 : 0; i < h.length; i++) {
    pts.push({ x: h[i].dia, y: modo === 'delta' ? Math.max(0, h[i][campo] - h[i - 1][campo]) : h[i][campo] });
  }
  return pts;
}

// ── GA4 (meses do FY completos, refresh diário do mês corrente fica no server.js) ──
const mesAnterior = () => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); };
const inicioMesSeguinte = (k) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 1);
function ga4Dados() {
  const s = lerJSON('ga4-snapshot.json');
  const todos = (s && s.meses) || {};
  // Só meses que o servidor buscou já com a correção das linhas (linhas_por_nome).
  // O arquivo do git (recriado a cada deploy) traz meses antigos com o bug e sem frescor.
  const meses = {};
  Object.keys(todos).forEach(k => { const m = todos[k]; if (m && m.sessoes != null && m.linhas_por_nome) meses[k] = m; });
  const keys = Object.keys(meses).sort();
  const atual = new Date().toISOString().slice(0, 7);
  // "Fechado" = buscado pelo menos 1 dia depois que o mês acabou (dia completo + processamento do GA4)
  const fechados = keys.filter(k => k < atual && (ms(meses[k].atualizado_em) || 0) >= inicioMesSeguinte(k) + DAY);
  // Frescor pelo dado mais novo de fato buscado (o carimbo global não prova que a busca deu certo)
  const t = keys.reduce((mx, k) => Math.max(mx, ms(meses[k].atualizado_em) || 0), 0) || null;
  let status = 'ok';
  if (!keys.length) status = process.env.GA4_PROPERTY_ID ? 'aguardando' : 'sem-chave';
  else if (!t || Date.now() - t > GA4_STALE_MS) status = 'parado';
  return { meses, keys, fechados, atual, status, ultima_sync_ts: t ? new Date(t).toISOString() : null };
}
const GA4 = { running: false };
async function ga4CompletaFY() {
  if (!process.env.GA4_PROPERTY_ID || GA4.running) return;
  GA4.running = true;
  const ga = require('../scripts/integrations/ga4_fetch.js');
  try {
    // FY26 também: rebusca os meses gravados com o bug das linhas (o /relatorio lê esses meses).
    for (const fy of [26, 27]) {
      const r = await ga.refreshFY(fy);
      console.log(`[metas-fy27] GA4 FY${fy} — ${r.meses_obtidos.length} mês(es) ok${r.erros.length ? ` · ${r.erros.length} erro(s): ${r.erros[0].erro}` : ''}`);
    }
    // Mês que acabou: a última gravação dele foi no último dia, ainda incompleto.
    // Rebusca até ter uma cópia feita 2 dias depois da virada.
    const ant = mesAnterior(), fim = inicioMesSeguinte(ant);
    const m = ((ga.readSnapshot() || {}).meses || {})[ant];
    if (Date.now() >= fim + DAY && (!m || !m.linhas_por_nome || (ms(m.atualizado_em) || 0) < fim + 2 * DAY)) {
      await ga.refreshAndCache(ant);
      console.log(`[metas-fy27] GA4 ${ant} rebuscado (mês fechado)`);
    }
  } catch (e) { console.warn('[metas-fy27] GA4 falhou:', e.message); }
  finally { GA4.running = false; }
}
if (process.env.GA4_PROPERTY_ID) {
  // public/api é recriado a cada deploy: sem isso só o mês corrente voltava pro cache.
  // 3 min depois do boot e, a partir daí, a cada 24h — defasado do refresh diário do server.js.
  setTimeout(() => { ga4CompletaFY(); setInterval(ga4CompletaFY, 24 * 60 * 60 * 1000).unref(); }, 3 * 60 * 1000).unref();
}

// ── EVENTOS (kanban + captura pós-evento, gravados no Office) ───────────────
// Meses do FY27 (jul → jun), na ordem
const FY_MESES = Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.UTC(+FY.inicio.slice(0, 4), +FY.inicio.slice(5, 7) - 1 + i, 1)); return d.toISOString().slice(0, 7); });
// A meta é da planilha FY27: conta só eventos com data dentro de jul/26 → jun/27.
// Data = data_evento; sem ela, o mês do slug (brasil-<mês>-…) no ano do calendário.
// Sem data nenhuma, o evento fica de fora (não dá pra saber de que ano é).
function eventosDados(anoCalendario) {
  const rows = all(`SELECT event_id, nome, data_evento, status, captura_json, updated_at FROM field_events WHERE event_id LIKE 'brasil-%'`);
  const mesDe = (r) => {
    const d = String(r.data_evento || '');
    if (/^\d{4}-\d{2}/.test(d)) return d.slice(0, 7);
    const m = /^brasil-(\d{1,2})-/.exec(r.event_id);
    return m && anoCalendario ? `${anoCalendario}-${String(m[1]).padStart(2, '0')}` : null;
  };
  const doFY = rows.map(r => ({ ...r, mes: mesDe(r) })).filter(r => r.mes && FY_MESES.includes(r.mes));
  const feitos = doFY.filter(r => r.status === 'pos-evento' || r.status === 'concluido');
  const porMesFeitos = FY_MESES.map(() => 0), porMesLeads = FY_MESES.map(() => 0);
  let leads = 0, comCaptura = 0, ultima = null;
  doFY.forEach(r => {
    let c = {}; try { c = JSON.parse(r.captura_json || '{}'); } catch (_) {}
    const l = Number(c.leads) || 0;
    if (l > 0) { leads += l; comCaptura++; porMesLeads[FY_MESES.indexOf(r.mes)] += l; }
    const t = ms(r.updated_at); if (t && (!ultima || t > ultima)) ultima = t;
  });
  feitos.forEach(r => { porMesFeitos[FY_MESES.indexOf(r.mes)]++; });
  return { realizados: feitos.length, leads, com_captura: comCaptura, registrados: doFY.length, porMesFeitos, porMesLeads, ultima: ultima ? new Date(ultima).toISOString() : null };
}

// ── CONTEÚDO (pautas da Redatoria no Office) ────────────────────────────────
// Importação em lote (external_id, grava a data do import) e o gerador de IA (autor 'Rax')
// ficam de fora: inflariam "pautas no mês" sem ninguém ter escrito pauta nova.
const PAUTA_DA_REDATORIA = `COALESCE(external_id,'') = '' AND COALESCE(autor,'') <> 'Rax'`;
function pautasDados() {
  const d30 = one(`SELECT COUNT(*) n FROM content_pipeline WHERE ${PAUTA_DA_REDATORIA} AND created_at >= datetime('now','-30 days')`).n;
  const tot = one(`SELECT COUNT(*) n, MAX(created_at) ultima FROM content_pipeline WHERE ${PAUTA_DA_REDATORIA}`);
  const sem = [];
  const seg = (t) => { const d = new Date(t); const k = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - k); };
  const s0 = seg(Date.now());
  for (let i = 11; i >= 0; i--) sem.push({ x: dia(s0 - i * 7 * DAY), y: 0 });
  all(`SELECT created_at FROM content_pipeline WHERE ${PAUTA_DA_REDATORIA} AND created_at >= datetime('now','-90 days')`).forEach(r => {
    const t = ms(r.created_at); if (t == null) return;
    const i = sem.findIndex(s => s.x === dia(seg(t))); if (i >= 0) sem[i].y++;
  });
  return { d30: d30 == null ? null : d30, total: tot.n == null ? null : tot.n, ultima: tot.ultima || null, semanas: sem };
}

// ── Status de uma meta (contra o ritmo esperado hoje) ───────────────────────
function avalia(m) {
  const v = num(m.valor), a = num(m.alvo);
  m.pct = v != null && a ? Math.round(v * 1000 / a) / 10 : null;
  const esperado = m.ritmo != null ? Math.max(1, m.ritmo) : 100;
  if (m.pct == null) m.status = v == null ? 'aguardando' : 'sem-meta';
  else if (m.pct >= 100) m.status = 'batida';
  else {
    const s = m.pct / esperado * 100;
    m.status = s >= 100 ? 'adiantada' : s >= 75 ? 'caminho' : s >= 50 ? 'atras' : 'longe';
  }
  return m;
}

// ── METAS AO VIVO ───────────────────────────────────────────────────────────
// Cada meta diz de onde vem o alvo (planilha ou funil da área) e como o realizado
// é calculado — o drawer da página mostra isso pra quem quiser conferir.
// serie.alvo = a série está na mesma unidade da meta (estoque ou mês) → o gráfico
// desenha a linha da meta; em séries diárias/semanais ela não entra (não comparável).
function metasVivas(ctx) {
  const { areas, plan, ap, ga4, ev, voices, pautas, rel } = ctx;
  const funil = (areaId, re) => { const a = (areas.areas || []).find(x => x.id === areaId); const f = ((a && a.funil) || []).find(s => re.test(s.estagio || '')); return f ? num(f.meta) : null; };
  const planilha = (re) => { const m = (plan.metas || []).find(x => re.test(x.label || '')); return m ? num(m.valor) : null; };
  const F_FUNIL = 'Funil da área (areas.json)', F_PLAN = 'Planilha de metas da equipe FY27';
  const M = [];
  const hist0 = ap.hist.length ? ap.hist[0].dia : null;
  const pendHist = hist0 ? `⏳ acumulando histórico desde ${hist0.split('-').reverse().join('/')}` : '⏳ o histórico começa no 1º refresh automático do Apollo';

  // Janela de N dias sobre o histórico do Apollo; meta proporcional enquanto o histórico não cobre a janela
  // Apollo parado: o número é dos dias até o último refresh que deu certo — avisa no card.
  const parado = ap.status.status === 'parado' || ap.status.status === 'erro';
  const congelado = (w) => parado && w ? { etiqueta: `⚠️ Apollo sem atualizar — contagem até ${w.ate.split('-').reverse().join('/')}` } : {};
  const viaJanela = (campo, dias, alvo) => {
    const w = janela(ap.hist, campo, dias);
    if (!w) return { valor: null, alvo, nota: pendHist };
    if (w.dias < dias) {
      // Nunca arredonda a meta proporcional pra 0 (viraria "sem meta")
      return { valor: w.v, alvo: alvo != null ? Math.max(1, Math.round(alvo * w.dias / dias)) : null, alvo_cheio: alvo,
        nota: `últimos ${w.dias} de ${dias} dias`, etiqueta: `⚠️ Estimativa — meta proporcional a ${w.dias} de ${dias} dias (histórico com menos dias que a janela)`, ...congelado(w) };
    }
    return { valor: w.v, alvo, nota: `últimos ${dias} dias`, ...congelado(w) };
  };

  // ── Biz Dev / Pipeline (Apollo) ──
  const a = ap.snap;
  M.push({ id: 'sdr-emails', area: 'pipeline', titulo: 'E-mails entregues', unidade: 'e-mails', janela: '30 dias', fonte: 'apollo',
    ...viaJanela('entregues', 30, funil('pipeline', /e-?mails enviados/i)), alvo_fonte: F_FUNIL + ' · 30/dia × 22 dias úteis',
    como: 'Diferença do total de e-mails entregues pelas sequências do Apollo entre hoje e 30 dias atrás (histórico diário do refresh automático).',
    serie: { tipo: 'barras', rotulo: 'entregues por dia', pontos: serieHist(ap.hist, 'entregues', 'delta') } });
  M.push({ id: 'sdr-reunioes', area: 'pipeline', titulo: 'Reuniões marcadas', unidade: 'reuniões', janela: '30 dias', fonte: 'apollo',
    ...viaJanela('reunioes', 30, planilha(/reuni[oõ]es qualificadas agendadas \/ m[eê]s/i) || funil('pipeline', /reuni/i)), alvo_fonte: F_PLAN,
    como: 'Reuniões marcadas nas sequências do Apollo (unique_demoed) nos últimos 30 dias. Reunião marcada fora do Apollo não entra.',
    serie: { tipo: 'barras', rotulo: 'reuniões por dia', pontos: serieHist(ap.hist, 'reunioes', 'delta') } });
  M.push({ id: 'sdr-contas', area: 'pipeline', titulo: 'Contas novas no Apollo', unidade: 'contas', janela: '7 dias', fonte: 'apollo',
    ...viaJanela('contas', 7, planilha(/contas perfiladas/i)), alvo_fonte: F_PLAN + ' · contas perfiladas / semana',
    como: 'Quantas contas entraram na base do Apollo nos últimos 7 dias (diferença do total de contas).',
    serie: { tipo: 'barras', rotulo: 'contas novas por dia', pontos: serieHist(ap.hist, 'contas', 'delta') } });
  M.push({ id: 'sdr-sequencias', area: 'pipeline', titulo: 'Sequências ativas', unidade: 'sequências', janela: 'agora', fonte: 'apollo',
    valor: a ? a.sequencias_ativas : null, alvo: funil('pipeline', /sequ[eê]ncias ativas/i), alvo_fonte: F_FUNIL,
    nota: a ? `de ${a.sequencias_total} cadastradas` : '⏳ aguardando o refresh do Apollo',
    como: 'Sequências não arquivadas e ativas no Apollo, no último refresh automático.',
    serie: { tipo: 'linha', rotulo: 'sequências ativas', alvo: true, pontos: serieHist(ap.hist, 'seq_ativas', 'nivel', 60) } });

  // ── Intelligence & CRM (Apollo) ──
  M.push({ id: 'intel-base', area: 'intelligence', titulo: 'Base de contatos', unidade: 'contatos', janela: 'agora', fonte: 'apollo',
    valor: a ? a.contatos_total : null, alvo: funil('intelligence', /base crm|contatos/i), alvo_fonte: F_FUNIL,
    nota: a ? 'total da base do Apollo (inclui importados)' : '⏳ aguardando o refresh do Apollo',
    como: 'Total de contatos na base do Apollo no último refresh. Inclui importados — não é só pipeline.',
    serie: { tipo: 'linha', rotulo: 'contatos na base', alvo: true, pontos: serieHist(ap.hist, 'contatos', 'nivel', 60) } });
  M.push({ id: 'intel-empresas', area: 'intelligence', titulo: 'Empresas mapeadas', unidade: 'empresas', janela: 'agora', fonte: 'apollo',
    valor: a ? a.contas_total : null, alvo: funil('intelligence', /empresas mapeadas/i), alvo_fonte: F_FUNIL,
    nota: a ? 'contas na base do Apollo' : '⏳ aguardando o refresh do Apollo',
    como: 'Total de contas (empresas) na base do Apollo no último refresh.',
    serie: { tipo: 'linha', rotulo: 'empresas na base', alvo: true, pontos: serieHist(ap.hist, 'contas', 'nivel', 60) } });

  // ── Field Marketing & Eventos (Office) ──
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mesSerie = (arr) => arr.map((y, i) => ({ x: FY_MESES[i], y, rot: MESES[Number(FY_MESES[i].slice(5)) - 1] }));
  M.push({ id: 'eventos-realizados', area: 'eventos', titulo: 'Eventos BR realizados', unidade: 'eventos', janela: FY.nome, fonte: 'office',
    valor: ev.realizados, alvo: planilha(/eventos executados no ano/i) || funil('eventos', /^executados$/i), alvo_fonte: F_PLAN,
    ritmo: rel.pct, nota: `marcados como pós-evento ou concluído no kanban · ${ev.registrados} evento(s) BR do ${FY.nome} com registro no Office`,
    como: `Eventos do Brasil com data no ${FY.nome} (jul/26 → jun/27) que o Field Marketing moveu para "Pós-evento" ou "Concluído" no kanban do Office. Evento que aconteceu e não foi movido não conta — por isso o número pode ficar abaixo da agenda.`,
    serie: { tipo: 'barras', rotulo: 'eventos realizados por mês', pontos: mesSerie(ev.porMesFeitos) } });
  M.push({ id: 'eventos-leads', area: 'eventos', titulo: 'Leads capturados em eventos', unidade: 'leads', janela: FY.nome, fonte: 'office',
    valor: ev.leads, alvo: funil('eventos', /leads capturados/i), alvo_fonte: F_FUNIL, ritmo: rel.pct,
    etiqueta: `⚠️ Estimativa — premissa: a meta de leads é do ${FY.nome} inteiro`,
    nota: ev.com_captura ? `soma da captura pós-evento de ${ev.com_captura} evento(s)` : 'nenhuma captura pós-evento registrada ainda',
    como: `Soma do campo "leads" da captura pós-evento dos eventos BR com data no ${FY.nome} (aba Pós-evento do evento, na área Field Marketing).`,
    serie: { tipo: 'barras', rotulo: 'leads por mês do evento', pontos: mesSerie(ev.porMesLeads) } });

  // ── Brand Experience / Voices (Office) ──
  const vs = (voices && voices.voices) || [];
  const ativos = vs.filter(v => v.posts_30d > 0).length;
  const posts30 = vs.reduce((s, v) => s + (v.posts_30d || 0), 0);
  const ppm = ((voices && voices.posts_por_mes) || []).map(p => ({ x: p.mes, y: p.n }));
  M.push({ id: 'brand-voices', area: 'brand', titulo: 'Voices no programa', unidade: 'Voices', janela: 'agora', fonte: 'office',
    valor: voices ? vs.length : null, alvo: funil('brand', /voices recrutados/i), alvo_fonte: F_FUNIL,
    nota: voices ? vs.map(v => String(v.nome || '').split(' ')[0]).filter(Boolean).join(' · ') : '—',
    como: 'Voices do programa (roster) + os publicados a partir de inscrições do /seja-voice.',
    serie: null });
  M.push({ id: 'brand-ativos', area: 'brand', titulo: 'Voices ativos', unidade: 'Voices', janela: '30 dias', fonte: 'office',
    valor: voices ? ativos : null, alvo: funil('brand', /^ativos$/i), alvo_fonte: F_FUNIL,
    nota: 'Voice com pelo menos 1 post nos últimos 30 dias',
    como: 'Conta o Voice que publicou ao menos um post nos últimos 30 dias (URL colada na pauta publicada ou post registrado no tracker).',
    serie: null });
  M.push({ id: 'brand-posts', area: 'brand', titulo: 'Posts dos Voices', unidade: 'posts', janela: '30 dias', fonte: 'office',
    valor: voices ? posts30 : null, alvo: funil('brand', /posts\/m[eê]s/i), alvo_fonte: F_FUNIL + ' · 2/semana × 5 Voices',
    nota: 'um post = uma URL publicada no LinkedIn',
    como: 'Posts dos Voices nos últimos 30 dias: URL colada na pauta publicada + post registrado no tracker, sem duplicar.',
    serie: { tipo: 'barras', rotulo: 'posts por mês', alvo: true, pontos: ppm } });

  // ── Conteúdo / Redatoria (GA4 + Office) ──
  // GA4 fora do ar = "aguardando" (o arquivo do git não vale como número ao vivo)
  const ga4ok = ga4.status === 'ok';
  const ult = ga4ok ? ga4.fechados[ga4.fechados.length - 1] : null;
  const mAtual = ga4ok ? ga4.meses[ga4.atual] : null;
  const anterior = mesAnterior();
  const mesTxt = (k) => `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(k.slice(5)) - 1]}/${k.slice(2, 4)}`;
  const g12 = ga4ok ? ga4.fechados.slice(-12).map(k => ({ x: k, y: ga4.meses[k].sessoes })) : [];
  M.push({ id: 'conteudo-trafego', area: 'conteudo', titulo: 'Tráfego do site', unidade: 'sessões', janela: ult ? `mês ${mesTxt(ult)}` : 'último mês', fonte: 'ga4',
    valor: ult ? ga4.meses[ult].sessoes : null, alvo: funil('conteudo', /tr[aá]fego/i), alvo_fonte: F_FUNIL,
    etiqueta: '⚠️ Estimativa — premissa: a meta de tráfego é lida como sessões por mês (GA4). O site migrou pro HubSpot CMS em ago/26: o GA4 só conta tudo se a tag dele estiver lá.',
    nota: !ga4ok ? (ga4.status === 'parado' ? `⏳ GA4 sem atualizar desde ${(ga4.ultima_sync_ts || '').slice(0, 10).split('-').reverse().join('/')}` : '⏳ aguardando o primeiro refresh do GA4')
      : !ult ? '⏳ aguardando o GA4 fechar o primeiro mês'
      : ult === anterior ? `último mês fechado${mAtual ? ` · ${mesTxt(ga4.atual)} até agora: ${Number(mAtual.sessoes).toLocaleString('pt-BR')}` : ''}`
      : `⚠️ o cache do GA4 ainda não tem ${mesTxt(anterior)} — mostrando ${mesTxt(ult)}`,
    como: 'Sessões do site no último mês fechado, pelo GA4 (refresh diário no servidor). Só entram meses buscados pelo servidor depois que o mês acabou.',
    serie: { tipo: 'barras', rotulo: 'sessões por mês', alvo: true, pontos: g12 } });
  M.push({ id: 'conteudo-pautas', area: 'conteudo', titulo: 'Pautas da Redatoria', unidade: 'pautas', janela: '30 dias', fonte: 'office',
    valor: pautas.d30, alvo: funil('conteudo', /^pautas$/i), alvo_fonte: F_FUNIL,
    etiqueta: '⚠️ Estimativa — premissa: a meta de pautas é lida como mensal',
    nota: pautas.total != null ? `${pautas.total} pauta(s) no pipeline do Office` : '—',
    como: 'Pautas criadas no pipeline de conteúdo do Office (content_pipeline) nos últimos 30 dias. Ficam de fora as importadas em lote da planilha editorial (entram com a data do import) e as geradas pelo Rax (IA).',
    serie: { tipo: 'barras', rotulo: 'pautas por semana', pontos: pautas.semanas } });

  return M.map(m => avalia({ ritmo: null, etiqueta: null, ...m }));
}

// ── METAS FORA DO AUTOMÁTICO + o que saiu da página ─────────────────────────
// Classifica cada linha da planilha. Ordem importa: a primeira que casa decide.
const CABECALHO = /^(regra|a[cç][aã]o|etapa)$/i;
const REGRA = [
  /save the date/i, /e-?mail antes/i, /lista subida/i, /day\+1/i, /comit[eê]/i, /relat[oó]rio inbound/i,
  /trava de produto/i, /private cloud/i, /business plan antecipado/i, /faturas/i, /cost breakdown/i,
  /proof of performance prazo/i, /due diligence/i, /^\d+\.\s/,
  // plano de ação pontual (SAP NOW) que repete as metas de compliance acima
  /^submeter (business plan|proof)/i, /^entregar lista/i,
];
const COBERTA = [
  /e-?mails personalizados \/ dia/i, /reuni[oõ]es qualificadas agendadas/i, /contas perfiladas/i,
  /eventos executados no ano/i,
];
const MESES_PT = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
// Prazo pontual que já passou (ex.: "Dez/2025", "05/Dez/2025", "26/06/2026", "Jun/2026")
function prazoVencido(txt, agora = Date.now()) {
  const s = norm(txt);
  let m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]) + DAY < agora;
  m = /(?:(\d{1,2})\/)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\w*\/(\d{4})/.exec(s);
  if (m) return Date.UTC(+m[3], MESES_PT[m[2]] - 1 + (m[1] ? 0 : 1), m[1] ? +m[1] + 1 : 1) < agora;
  return false;
}
// Pelo rótulo da meta primeiro; a "fonte" da planilha (ex.: "Apollo / Zoho CRM") só desempata.
function ondeMedir(area, txt, soRotulo = false) {
  const s = norm(txt);
  if (area === 'design') return 'canva';
  if (/ddf|edf|cota|business plan|proof of performance|mdf/.test(s)) return 'df';
  if (area === 'eventos') return 'eventos';
  if (/sqo|pipeline gerado|no-show|mql ?(→|->)? ?sql|conversao mql|zoho|inteligencia de mercado|oportunidade|vendas|duplicata/.test(s)) return 'zoho';
  if (/hubspot/.test(s)) return 'hubspot';
  if (/toques|liga[cç]|enriquec/.test(s)) return 'apollo';   // antes do LinkedIn: "toques (ligação + e-mail + LinkedIn)"
  // Atividade de cada pessoa no próprio perfil ≠ página da empresa
  if (/pessoal|coment|conex|c-level|social selling/.test(s)) return 'perfil';
  if (/linkedin|seguidor|postage|impress|alcance|engajamento|^cliques$/.test(s)) return 'linkedin';
  if (/mql|abertura|ctr|clique|inbound|landing/.test(s)) return 'rd';
  if (/artigo|wordpress|e-?book|blog/.test(s)) return 'site';
  return !soRotulo && area === 'pipeline' ? 'zoho' : null;
}
function metasFora(ctx) {
  const { areas, plan } = ctx;
  const corte = { regras: [], vencidas: [], cabecalhos: 0, cobertas: [] };
  const grupos = {};
  const add = (area, item) => { (grupos[area] = grupos[area] || []).push(item); };

  (plan.metas || []).forEach(m => {
    const area = AREA_DA_PLANILHA(m.area || '');
    const label = String(m.label || '').replace(/⚠️\s*/g, '').replace(/\s+/g, ' ').trim();
    if (!area || !label) return;
    const alvoTxt = String(m.valor == null ? '' : m.valor).replace(/\s+None$/, '').trim();
    if (CABECALHO.test(label) || /^(crit[eé]rio|prazo padr[aã]o)$/i.test(m.periodo || '')) { corte.cabecalhos++; return; }
    if (REGRA.some(r => r.test(label))) { corte.regras.push({ area, label }); return; }
    if (COBERTA.some(r => r.test(label))) { corte.cobertas.push({ area, label }); return; }
    const venceu = prazoVencido(alvoTxt) ? alvoTxt : prazoVencido(m.periodo) ? m.periodo : null;
    if (venceu) { corte.vencidas.push({ area, label, prazo: venceu }); return; }
    // Alvo numérico ganha a unidade de tempo quando o rótulo ainda não diz ("12" → "12 / mês")
    let alvo = alvoTxt;
    if (typeof m.valor === 'number') {
      const u = String(m.unidade || '').replace(/\(.*$/, '').trim();
      alvo = m.valor.toLocaleString('pt-BR') + (/^(dia|semana|m[eê]s|trimestre)$/i.test(u) && !norm(label).includes(norm(u)) ? ' / ' + u : '');
    }
    const janela = String(m.horizonte || m.periodo || '').replace(/^\S/, c => c.toUpperCase());
    add(area, { label, alvo, janela, origem: 'planilha', onde: ondeMedir(area, label, true) || ondeMedir(area, m.fonte || '') });
  });

  // Funil das áreas: estágio com meta e sem fonte automática nesta página
  // "Reuniões realizadas" do funil ≠ "Reuniões marcadas" do placar (Apollo): vai pra fora (Zoho)
  const vivasTxt = new Set(['e-mails enviados', 'sequencias ativas', 'base crm (contatos)', 'empresas mapeadas',
    'executados', 'leads capturados', 'voices recrutados', 'ativos', 'posts/mes', 'trafego (site)', 'pautas']);
  (areas.areas || []).forEach(a => {
    if (!AREAS[a.id]) return;
    (a.funil || []).forEach(f => {
      if (f.meta == null || vivasTxt.has(norm(f.estagio))) return;
      add(a.id, { label: f.estagio, alvo: Number(f.meta).toLocaleString('pt-BR'), janela: f.obs || '', origem: 'funil', onde: ondeMedir(a.id, f.estagio) || (a.id === 'conteudo' ? 'site' : null) });
    });
  });

  const ordem = ['pipeline', 'intelligence', 'eventos', 'brand', 'conteudo', 'growth', 'design'];
  return {
    grupos: ordem.filter(id => grupos[id]).map(id => ({ area: id, ...AREAS[id], itens: grupos[id] })),
    total: Object.values(grupos).reduce((s, g) => s + g.length, 0),
    corte: { regras: corte.regras.length, vencidas: corte.vencidas, cabecalhos: corte.cabecalhos, cobertas: corte.cobertas.length, regras_lista: corte.regras, cobertas_lista: corte.cobertas },
  };
}

// ── FONTES ──────────────────────────────────────────────────────────────────
function fontes(ap, ga4, ev, voices) {
  return {
    dentro: [
      { id: 'apollo', nome: 'Apollo', ic: '📨', modo: 'refresh no servidor a cada 6h', status: ap.status.status, ultima_ts: ap.status.ultima_sync_ts, erro: ap.status.erro || null },
      { id: 'office', nome: 'Office (ao vivo)', ic: '🏢', modo: 'Voices, posts, kanban de eventos, captura e pautas — entram na hora', status: 'ok', ultima_ts: ev.ultima },
      { id: 'ga4', nome: 'Google Analytics 4', ic: '📈', modo: 'refresh diário no servidor', status: ga4.status, ultima_ts: ga4.ultima_sync_ts },
    ],
    fora: Object.entries(ONDE).map(([id, o]) => ({ id, ...o })),
  };
}

// ── ROTA ────────────────────────────────────────────────────────────────────
// Página e API são do time de Marketing (routes/acesso.js: /metas-fy27 e /api/metas/*).
router.get('/api/metas/fy27/placar', requireAuth, (req, res) => {
  try {
    const rel = relogio();
    const areas = lerJSON('areas.json') || { areas: [] };
    const plan = lerJSON('metas-fy26.json') || { metas: [] };
    const ap = apolloDados();
    const ga4 = ga4Dados();
    const evAno = (lerJSON('events.json') || {}).ano || rel.ano;
    const ev = eventosDados(evAno);
    let voices = null;
    try { voices = require('./area-brand').voicesResumo(); } catch (e) { console.warn('[metas-fy27] voices:', e.message); }
    const pautas = pautasDados();
    const ctx = { areas, plan, ap, ga4, ev, voices, pautas, rel };
    const vivas = metasVivas(ctx);
    const fora = metasFora(ctx);

    const porArea = {};
    vivas.forEach(m => {
      const x = porArea[m.area] || (porArea[m.area] = { id: m.area, ...AREAS[m.area], metas: 0, com_pct: 0, soma: 0 });
      x.metas++;
      if (m.pct != null) { x.com_pct++; x.soma += Math.min(100, m.pct); }
    });
    const resumoAreas = Object.values(porArea).map(x => ({ ...x, media: x.com_pct ? Math.round(x.soma / x.com_pct) : null }));
    const cont = (s) => vivas.filter(m => m.status === s).length;

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      gerado_em: new Date().toISOString(),
      fy: rel,
      resumo: {
        vivas: vivas.length, batidas: cont('batida'), adiantadas: cont('adiantada'), caminho: cont('caminho'),
        atras: cont('atras'), longe: cont('longe'), aguardando: cont('aguardando') + cont('sem-meta'), fora: fora.total,
      },
      areas: resumoAreas,
      metas: vivas,
      fora,
      fontes: fontes(ap, ga4, ev, voices),
      planilha: { fonte: plan.fonte || null, gerado_em: plan.gerado_em || null },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
