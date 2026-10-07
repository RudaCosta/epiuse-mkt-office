// ════════════════════════════════════════════════════════════════════════════
// routes/alertas-relatorios.js — dados e HTML dos e-mails do Módulo 31
//
//   • e-mail de alerta crítico (sai na hora, em horário comercial)
//   • relatório semanal (segunda ~8h): o que precisa de você, o que andou na
//     semana × semana anterior, o que vem nos próximos 14 dias, saúde das fontes
//   • relatório mensal (1º dia útil ~9h): KPIs do /relatorio do mês fechado,
//     operação do mês × mês anterior, alertas do mês, saúde das fontes
//
// Regra 7: tudo vem do SQLite/JSON do próprio Office. Sem dado → etiqueta
// "⏳ Aguarda integração", nunca número inventado.
// HTML de e-mail: tabelas + estilo inline (cliente de e-mail não lê CSS
// externo nem var()), cores do Brand Guide 2026.
// ════════════════════════════════════════════════════════════════════════════
const { db } = require('../server-context');
const { OFFICE_URL } = require('./email');

const DAY = 864e5;
const BRT_MS = -3 * 36e5;   // Brasil sem horário de verão desde 2019

// ── Cores (Brand Guide 2026 — mesmas do DESIGN.md) ──────────────────────────
const C = {
  deep: '#001844', azul1: '#26476b', azul2: '#355b7e', azul3: '#487494', azul4: '#5585a3', azul5: '#6797b8',
  cinza: '#f2f2f2', borda: '#dde3ea', texto: '#1f2a3d', mudo: '#5b6b82',
  red: '#CE181E', ok: '#53bb41', warn: '#f89921', info: '#0980bb',
};
const FONTE = "Lato,'Open Sans',Calibri,Verdana,Arial,sans-serif";
const NIVEL = {
  critico:    { emoji: '🔴', label: 'Crítico',    cor: C.red },
  importante: { emoji: '🟡', label: 'Importante', cor: C.warn },
  info:       { emoji: '🔵', label: 'Para saber', cor: C.info },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const all = (sql, ...a) => { try { return db.prepare(sql).all(...a); } catch (_) { return []; } };
const one = (sql, ...a) => { try { return db.prepare(sql).get(...a) || {}; } catch (_) { return {}; } };
// SQLite grava 'YYYY-MM-DD HH:MM:SS' em UTC; ISO já vem com Z; data pura = meio-dia
function ms(s) {
  if (s == null || s === '') return null;
  if (typeof s === 'number') return s;
  let x = String(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) x += 'T12:00:00Z';
  else if (/^\d{4}-\d{2}-\d{2} \d/.test(x)) x = x.replace(' ', 'T') + 'Z';
  const t = Date.parse(x);
  return isNaN(t) ? null : t;
}
const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataBRT = (t) => new Date(t + BRT_MS).toISOString().slice(0, 10);   // AAAA-MM-DD no fuso BRT
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
function fmtData(s) {
  const t = ms(s); if (t == null) return '—';
  const d = new Date(t + BRT_MS);
  return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
function fmtIdade(msDur) {
  const h = Math.floor(msDur / 36e5);
  if (h < 1) return 'menos de 1h';
  if (h < 48) return h + 'h';
  return Math.floor(h / 24) + ' dias';
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = (mes) => { const [y, m] = mes.split('-').map(Number); return `${MESES[m - 1]}/${y}`; };
function limitesMes(mes) {   // [início, fim) do mês no fuso BRT, em ms UTC
  const [y, m] = mes.split('-').map(Number);
  return { ini: Date.UTC(y, m - 1, 1) - BRT_MS, fim: Date.UTC(y, m, 1) - BRT_MS };
}
function mesAnterior(mes) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}
const link = (href) => (/^https?:/.test(href) ? href : OFFICE_URL + (href || '/'));

// Conta linhas cuja data cai em [ini, fim). Pré-filtra por prefixo de data
// (os dois formatos gravados começam com AAAA-MM-DD) e confere em JS.
function contar(sql, col, ini, fim, ...extra) {
  const desde = new Date(ini - DAY).toISOString().slice(0, 10);
  return all(sql, desde, ...extra).filter(r => { const t = ms(r[col]); return t != null && t >= ini && t < fim; }).length;
}

// Posts novos de Voices no período. A tabela posts guarda um snapshot por
// atualização de métricas: cada URL conta 1x, na data do post (published_at
// informada ou, sem ela, a primeira vez que a URL foi registrada).
function postsNovos(ini, fim) {
  return all(`SELECT MAX(published_at) pub, MIN(captured_at) prim FROM posts GROUP BY post_url`).filter(p => {
    const t = /^\d{4}-\d{2}-\d{2}/.test(String(p.pub || '')) ? ms(String(p.pub).slice(0, 10)) : ms(p.prim);
    return t != null && t >= ini && t < fim;
  }).length;
}

// ── MOVIMENTO de um período (números reais do banco) ────────────────────────
function movimento(ini, fim, eventosFn) {
  const validas = `COALESCE(NULLIF(status,''),'novo') NOT IN ('teste','ignorado')`;
  const m = {
    pautas_criadas:     contar(`SELECT created_at FROM voice_pautas WHERE substr(created_at,1,10) >= ?`, 'created_at', ini, fim),
    pautas_publicadas:  contar(`SELECT publicado_em FROM voice_pautas WHERE estado='publicada' AND substr(publicado_em,1,10) >= ?`, 'publicado_em', ini, fim),
    posts_voices:       postsNovos(ini, fim),
    inscricoes:         contar(`SELECT created_at FROM recruitment_applications WHERE substr(created_at,1,10) >= ? AND ${validas}`, 'created_at', ini, fim),
    conteudos_publicados: contar(`SELECT publicado_em FROM content_pipeline WHERE estado='publicado' AND substr(publicado_em,1,10) >= ?`, 'publicado_em', ini, fim),
    calls_jarvis:       contar(`SELECT criado_em FROM jarvis_calls WHERE substr(criado_em,1,10) >= ?`, 'criado_em', ini, fim),
    aprendizados_jarvis: contar(`SELECT criado_em FROM jarvis_aprendizados WHERE substr(criado_em,1,10) >= ?`, 'criado_em', ini, fim),
    cliques_links:      one(`SELECT COUNT(*) n FROM utm_clicks WHERE ts >= ? AND ts < ? AND COALESCE(bot,0)=0`, ini, fim).n ?? null,
    coins:              one(`SELECT COALESCE(SUM(coins),0) n FROM erp_coins WHERE coins > 0 AND created_at >= datetime(?/1000,'unixepoch') AND created_at < datetime(?/1000,'unixepoch')`, ini, fim).n ?? null,
    apollo: apolloDelta(ini, fim),
    eventos_realizados: [],
  };
  if (eventosFn) {
    try {
      const a = dataBRT(ini), b = dataBRT(fim - 1);
      m.eventos_realizados = (eventosFn().lista || [])
        .filter(e => e.data_evento && e.data_evento >= a && e.data_evento <= b)
        .sort((x, y) => x.data_evento.localeCompare(y.data_evento));
    } catch (_) { /* events.json ilegível — seção fica vazia */ }
  }
  return m;
}

// Apollo guarda totais acumulados por dia (apollo_hist). O período é a
// diferença entre o último dia antes do fim e o último dia até o início.
function apolloDelta(ini, fim) {
  const a = dataBRT(ini), b = dataBRT(fim - 1);
  const fimRow = one(`SELECT * FROM apollo_hist WHERE dia <= ? ORDER BY dia DESC LIMIT 1`, b);
  const iniRow = one(`SELECT * FROM apollo_hist WHERE dia <= ? ORDER BY dia DESC LIMIT 1`, a);
  if (!fimRow.dia) return { disponivel: false, obs: '⏳ Aguarda integração Apollo (APOLLO_API_KEY no servidor)' };
  if (!iniRow.dia || iniRow.dia === fimRow.dia) return { disponivel: false, obs: '⏳ Histórico do Apollo ainda curto pra comparar o período' };
  const d = (k) => { const v = (fimRow[k] || 0) - (iniRow[k] || 0); return v < 0 ? null : v; };
  return {
    disponivel: true, de: iniRow.dia, ate: fimRow.dia,
    entregues: d('entregues'), respondidos: d('respondidos'), reunioes: d('reunioes'), bounces: d('bounces'),
    seq_ativas: fimRow.seq_ativas, contatos: fimRow.contatos,
    obs: [d('entregues'), d('respondidos'), d('reunioes')].some(v => v == null)
      ? '⚠️ Total do Apollo caiu no período (sequência arquivada?) — comparação parcial' : '',
  };
}

function usoOffice(ini, fim) {
  return {
    usuarios: one(`SELECT COUNT(DISTINCT email) n FROM analytics_events WHERE kind IN ('view','login') AND ts >= ? AND ts < ? AND email != 'anon'`, ini, fim).n ?? null,
    visitas: one(`SELECT COUNT(*) n FROM analytics_events WHERE kind='view' AND ts >= ? AND ts < ?`, ini, fim).n ?? null,
    top_paginas: all(`SELECT path, COUNT(*) visitas FROM analytics_events WHERE kind='view' AND ts >= ? AND ts < ? GROUP BY path ORDER BY visitas DESC LIMIT 5`, ini, fim),
  };
}

function proximosEventos(eventosFn, dias) {
  if (!eventosFn) return [];
  try {
    const hoje = dataBRT(Date.now()), ate = dataBRT(Date.now() + dias * DAY);
    return (eventosFn().lista || [])
      .filter(e => e.data_evento && e.data_evento >= hoje && e.data_evento <= ate)
      .sort((a, b) => a.data_evento.localeCompare(b.data_evento));
  } catch (_) { return []; }
}
function proximoCalendario(dias) {
  const hoje = dataBRT(Date.now()), ate = dataBRT(Date.now() + dias * DAY);
  return all(`SELECT data, tipo, titulo, formato, status, lob FROM edt_calendario WHERE data >= ? AND data <= ? ORDER BY data ASC LIMIT 12`, hoje, ate);
}
function prazosPautas(dias) {
  const hoje = dataBRT(Date.now()), ate = dataBRT(Date.now() + dias * DAY);
  return all(`SELECT titulo, voice_nome, prazo, estado FROM voice_pautas WHERE estado <> 'publicada' AND prazo <> '' AND prazo >= ? AND prazo <= ? ORDER BY prazo ASC LIMIT 8`, hoje, ate);
}

// ── HTML: blocos ────────────────────────────────────────────────────────────
function moldura({ preheader, kicker, titulo, subtitulo, corpo, rodape }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.cinza}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cinza}"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${C.borda};font-family:${FONTE};color:${C.texto}">
  <tr><td style="background:${C.deep};padding:22px 26px">
    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${C.azul5};font-weight:700">${esc(kicker)}</div>
    <div style="font-size:21px;font-weight:800;color:#ffffff;margin-top:6px;line-height:1.25">${esc(titulo)}</div>
    ${subtitulo ? `<div style="font-size:13px;color:#c9d6e6;margin-top:6px;line-height:1.5">${esc(subtitulo)}</div>` : ''}
  </td></tr>
  <tr><td style="padding:8px 26px 22px">${corpo}</td></tr>
  <tr><td style="padding:14px 26px 20px;border-top:1px solid ${C.borda};font-size:11.5px;color:${C.mudo};line-height:1.6">
    ${rodape || ''}
    <div style="margin-top:6px">EPI-USE Office · dados reais do Office. <a href="${link('/alertas')}" style="color:${C.azul3}">Central de alertas</a> · quem recebe cada e-mail é definido pelo admin do Office</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}
const h2 = (t, sub) => `<div style="margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid ${C.deep}">
  <span style="font-size:15px;font-weight:800;color:${C.deep}">${t}</span>${sub ? `<span style="font-size:12px;color:${C.mudo}"> · ${esc(sub)}</span>` : ''}</div>`;
const vazio = (t) => `<div style="font-size:13px;color:${C.mudo};padding:6px 0">${esc(t)}</div>`;
const botao = (href, txt) => `<a href="${esc(link(href))}" style="display:inline-block;background:${C.deep};color:#ffffff;text-decoration:none;font-size:12.5px;font-weight:700;padding:8px 14px;border-radius:6px">${esc(txt)}</a>`;

function delta(atual, anterior) {
  if (atual == null || anterior == null) return '';
  const d = atual - anterior;
  if (d === 0) return `<span style="color:${C.mudo};font-size:11.5px">estável</span>`;
  const cor = d > 0 ? C.ok : C.warn;
  return `<span style="color:${cor};font-size:11.5px;font-weight:700">${d > 0 ? '▲' : '▼'} ${fmtNum(Math.abs(d))}</span>`;
}
// Linhas de métrica: [rótulo, valor atual, valor anterior, obs]
function tabelaMetricas(linhas) {
  // Larguras fixas: o número fica na mesma coluna em todas as tabelas do e-mail.
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;table-layout:fixed">
  ${linhas.map(([rot, at, ant, obs]) => `<tr>
    <td width="60%" style="padding:7px 0;border-bottom:1px solid ${C.borda};color:${C.texto}">${esc(rot)}${obs ? `<div style="font-size:11px;color:${C.mudo}">${esc(obs)}</div>` : ''}</td>
    <td width="16%" style="padding:7px 0;border-bottom:1px solid ${C.borda};text-align:right;font-weight:800;color:${C.deep};white-space:nowrap">${at == null ? `<span style="font-weight:400;font-size:11.5px;color:${C.mudo}">⏳ sem dado</span>` : fmtNum(at)}</td>
    <td width="24%" style="padding:7px 0 7px 10px;border-bottom:1px solid ${C.borda};text-align:right">${delta(at, ant)}</td>
  </tr>`).join('')}
  </table>`;
}
function listaSimples(itens) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">${itens.map(i => `<tr>
    <td style="padding:6px 10px 6px 0;border-bottom:1px solid ${C.borda};white-space:nowrap;color:${C.azul1};font-weight:700;vertical-align:top">${i.quando}</td>
    <td style="padding:6px 0;border-bottom:1px solid ${C.borda};color:${C.texto}">${i.texto}${i.sub ? `<div style="font-size:11.5px;color:${C.mudo}">${i.sub}</div>` : ''}</td>
  </tr>`).join('')}</table>`;
}

function cartaoAlerta(a) {
  const n = NIVEL[a.nivel] || NIVEL.info;
  const desde = a.aberto_em ? ` · aberto há ${fmtIdade(Date.now() - ms(a.aberto_em))}` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;border:1px solid ${C.borda};border-left:4px solid ${n.cor};border-radius:6px">
  <tr><td style="padding:10px 12px">
    <div style="font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${n.cor}">${n.emoji} ${n.label} · ${esc(a.area_label || '')}<span style="color:${C.mudo};font-weight:400;letter-spacing:0;text-transform:none">${desde}</span></div>
    <div style="font-size:14.5px;font-weight:800;color:${C.deep};margin-top:3px">${esc(a.titulo)}</div>
    ${a.detalhe ? `<div style="font-size:12.5px;color:${C.texto};margin-top:3px;line-height:1.5">${esc(a.detalhe)}</div>` : ''}
    ${a.href ? `<div style="margin-top:8px"><a href="${esc(link(a.href))}" style="font-size:12.5px;font-weight:700;color:${C.azul2}">Resolver no Office →</a></div>` : ''}
  </td></tr></table>`;
}

function blocoFontes(fontes) {
  if (!fontes || !fontes.length) return vazio('Nenhuma fonte automática monitorada nesta visão.');
  const cor = { ok: C.ok, atencao: C.warn, parado: C.red, desligado: C.mudo };
  const lbl = { ok: 'ok', atencao: 'atenção', parado: 'parado', desligado: 'desligado' };
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">${fontes.map(f => `<tr>
    <td style="padding:6px 0;border-bottom:1px solid ${C.borda}"><b style="color:${C.deep}">${esc(f.nome)}</b><div style="font-size:11.5px;color:${C.mudo}">${esc(f.detalhe || '')}</div></td>
    <td style="padding:6px 0;border-bottom:1px solid ${C.borda};text-align:right;white-space:nowrap;font-weight:800;color:${cor[f.status] || C.mudo}">● ${lbl[f.status] || f.status}</td>
  </tr>`).join('')}</table>`;
}

// ── E-MAIL: ALERTA CRÍTICO ──────────────────────────────────────────────────
function htmlCriticos(alertas) {
  const n = alertas.length;
  return moldura({
    preheader: alertas.map(a => a.titulo).join(' · '),
    kicker: 'EPI-USE Office · alerta crítico',
    titulo: n === 1 ? alertas[0].titulo : `${n} alertas críticos pedem atenção`,
    subtitulo: 'Algo parou de funcionar ou está prestes a estourar. Cada item abaixo leva direto pra onde se resolve.',
    corpo: alertas.map(cartaoAlerta).join('') +
      `<div style="margin-top:16px">${botao('/alertas', 'Ver todos os alertas')}</div>`,
    rodape: 'Alertas críticos saem uma vez por ocorrência, em dia útil das 8h às 19h. Se resolver antes, o e-mail nem sai.',
  });
}
function assuntoCriticos(alertas) {
  return alertas.length === 1 ? `🔴 ${alertas[0].titulo}` : `🔴 ${alertas.length} alertas críticos no Office`;
}

// ── RELATÓRIO SEMANAL ───────────────────────────────────────────────────────
// opts: { agora, areas (null = tudo), alertas (abertos, já filtrados), resolvidos, fontes, eventosFn }
function dadosSemanal(opts) {
  const fim = opts.agora || Date.now(), ini = fim - 7 * DAY;
  return {
    ini, fim,
    atual: movimento(ini, fim, opts.eventosFn),
    anterior: movimento(ini - 7 * DAY, ini, opts.eventosFn),
    uso: usoOffice(ini, fim),
    proximos_eventos: proximosEventos(opts.eventosFn, 14),
    calendario: proximoCalendario(7),
    prazos: prazosPautas(7),
  };
}
const ve = (areas, ...quais) => !areas || quais.some(q => areas.includes(q));

function htmlSemanal(opts) {
  const d = dadosSemanal(opts);
  const areas = opts.areas || null;
  const A = d.atual, P = d.anterior;
  const alertas = (opts.alertas || []).filter(a => a.nivel !== 'info');
  const crit = alertas.filter(a => a.nivel === 'critico').length;
  let corpo = '';

  // 1. Precisa de você
  corpo += h2('🎯 Precisa de você', alertas.length ? `${alertas.length} aberto(s)` : '');
  corpo += alertas.length ? alertas.slice(0, 12).map(cartaoAlerta).join('') +
    (alertas.length > 12 ? vazio(`+ ${alertas.length - 12} outro(s) em /alertas`) : '')
    : vazio('✅ Nada crítico nem importante aberto. Bom sinal.');
  if (opts.resolvidos) corpo += `<div style="font-size:12.5px;color:${C.ok};font-weight:700;margin-top:6px">✅ ${opts.resolvidos} alerta(s) resolvido(s) nesta semana</div>`;

  // 2. O que andou
  const blocos = [];
  if (ve(areas, 'brand', 'conteudo')) blocos.push(['🎙️ Voices & Brand', [
    ['Pautas criadas', A.pautas_criadas, P.pautas_criadas],
    ['Pautas publicadas', A.pautas_publicadas, P.pautas_publicadas],
    ['Posts novos de Voices', A.posts_voices, P.posts_voices],
    ['Inscrições no /seja-voice', A.inscricoes, P.inscricoes],
  ]]);
  if (ve(areas, 'conteudo', 'brand', 'intelligence')) blocos.push(['✍️ Conteúdo', [
    ['Conteúdos publicados (pipeline)', A.conteudos_publicados, P.conteudos_publicados],
  ]]);
  if (ve(areas, 'pipeline')) {
    const ap = A.apollo, pp = P.apollo;
    blocos.push(['🎯 Pipeline / Biz Dev', [
      ['E-mails entregues (Apollo)', ap.disponivel ? ap.entregues : null, pp.disponivel ? pp.entregues : null, ap.obs],
      ['Respostas (Apollo)', ap.disponivel ? ap.respondidos : null, pp.disponivel ? pp.respondidos : null],
      ['Reuniões marcadas (Apollo)', ap.disponivel ? ap.reunioes : null, pp.disponivel ? pp.reunioes : null],
      ['Calls salvas no JARVIS', A.calls_jarvis, P.calls_jarvis],
      ['Aprendizados de campo (JARVIS)', A.aprendizados_jarvis, P.aprendizados_jarvis],
    ]]);
  }
  if (ve(areas, 'time')) blocos.push(['🔗 Links & engajamento', [
    ['Cliques nos links rastreados (sem bots)', A.cliques_links, P.cliques_links],
    ['ERP Coins distribuídos', A.coins, P.coins],
  ]]);
  if (blocos.length) {
    corpo += h2('📈 O que andou na semana', 'comparado com os 7 dias anteriores');
    blocos.forEach(([t, linhas]) => {
      corpo += `<div style="font-size:12px;font-weight:800;color:${C.azul1};text-transform:uppercase;letter-spacing:.06em;margin:14px 0 2px">${t}</div>` + tabelaMetricas(linhas);
    });
  }
  if (ve(areas, 'eventos') && A.eventos_realizados.length) {
    corpo += `<div style="font-size:12px;font-weight:800;color:${C.azul1};text-transform:uppercase;letter-spacing:.06em;margin:14px 0 2px">🎪 Eventos que aconteceram</div>` +
      listaSimples(A.eventos_realizados.map(e => ({ quando: fmtData(e.data_evento), texto: `${esc(e.flag || '')} ${esc(e.nome)}`, sub: e.captura && (e.captura.leads || e.captura.deals) ? `${fmtNum(+e.captura.leads || 0)} leads · ${fmtNum(+e.captura.deals || 0)} deals` : '⏳ pós-evento ainda sem leads/ROI' })));
  }

  // 3. Próximos dias
  let prox = '';
  if (ve(areas, 'eventos') && d.proximos_eventos.length) {
    prox += `<div style="font-size:12px;font-weight:800;color:${C.azul1};margin:12px 0 2px">EVENTOS (14 DIAS)</div>` + listaSimples(d.proximos_eventos.slice(0, 8).map(e => ({
      quando: fmtData(e.data_evento), texto: `${esc(e.flag || '')} ${esc(e.nome)}`,
      sub: [e.regiao === 'latam' ? 'LATAM' : 'Brasil', e.responsavel, e.tem_briefing ? 'briefing ok' : (e.regiao === 'brasil' ? '⚠️ sem briefing' : '')].filter(Boolean).map(esc).join(' · '),
    })));
  }
  if (ve(areas, 'conteudo', 'brand', 'intelligence') && d.calendario.length) {
    prox += `<div style="font-size:12px;font-weight:800;color:${C.azul1};margin:12px 0 2px">CALENDÁRIO EDITORIAL (7 DIAS)</div>` + listaSimples(d.calendario.map(c => ({
      quando: fmtData(c.data), texto: esc(c.titulo || c.tipo || '(sem título)'), sub: [c.tipo, c.formato, c.status].filter(Boolean).map(esc).join(' · '),
    })));
  }
  if (ve(areas, 'brand', 'conteudo') && d.prazos.length) {
    prox += `<div style="font-size:12px;font-weight:800;color:${C.azul1};margin:12px 0 2px">PRAZOS DE PAUTAS (7 DIAS)</div>` + listaSimples(d.prazos.map(p => ({
      quando: fmtData(p.prazo), texto: esc(p.titulo), sub: esc(p.voice_nome || ''),
    })));
  }
  if (prox) corpo += h2('🗓️ Próximos dias') + prox;

  // 4. Fontes
  corpo += h2('🔌 Saúde das fontes automáticas') + blocoFontes(opts.fontes);

  // 5. Uso do Office (só pra quem administra)
  if (ve(areas, 'admin')) {
    corpo += h2('👥 Uso do Office') + tabelaMetricas([
      ['Pessoas que usaram', d.uso.usuarios, null], ['Páginas abertas', d.uso.visitas, null],
    ]) + (d.uso.top_paginas.length ? `<div style="font-size:12px;color:${C.mudo};margin-top:6px">Mais abertas: ${d.uso.top_paginas.map(p => `${esc(p.path)} (${fmtNum(p.visitas)})`).join(' · ')}</div>` : '');
  }

  corpo += `<div style="margin-top:20px">${botao('/alertas', 'Abrir a central de alertas')}</div>`;
  const periodo = `${fmtData(new Date(d.ini).toISOString())} a ${fmtData(new Date(d.fim - 1).toISOString())}`;
  return {
    assunto: `📬 Semana do Marketing (${periodo})` + (crit ? ` · 🔴 ${crit} crítico(s)` : alertas.length ? ` · ${alertas.length} pendência(s)` : ' · tudo em dia'),
    html: moldura({
      preheader: alertas.length ? `${alertas.length} pendência(s) aberta(s). ${A.pautas_publicadas} pauta(s) publicada(s), ${fmtNum(A.cliques_links)} cliques.` : 'Nada pendente. Veja o que andou na semana.',
      kicker: 'EPI-USE Office · relatório semanal',
      titulo: 'Semana do Marketing',
      subtitulo: `${periodo}${opts.rotulo ? ' · ' + opts.rotulo : ''}`,
      corpo,
      rodape: 'Sai toda segunda às 8h. Os números são do próprio Office (SQLite + integrações automáticas).',
    }),
  };
}

// ── RELATÓRIO MENSAL ────────────────────────────────────────────────────────
// opts: { mes 'AAAA-MM', snapshotFn, eventosFn, fontes, alertasAbertos, alertasMes:{abertos,resolvidos,porNivel} }
function htmlMensal(opts) {
  const mes = opts.mes, mesAnt = mesAnterior(mes);
  const L = limitesMes(mes), LA = limitesMes(mesAnt);
  const A = movimento(L.ini, L.fim, opts.eventosFn), P = movimento(LA.ini, LA.fim, opts.eventosFn);
  let snap = null;
  try { snap = opts.snapshotFn ? opts.snapshotFn(mes) : null; } catch (e) { console.warn('[alertas] snapshot mensal:', e.message); }
  const pend = (fonte) => `⏳ Aguarda integração ${fonte}`;
  const pct = (v) => (v == null ? '' : `${v > 0 ? '▲' : v < 0 ? '▼' : '='} ${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs mês anterior`);
  const kpi = (rot, val, mom, fonte, sufixo) => [rot, val == null ? null : val, null, val == null ? pend(fonte) : (pct(mom) + (sufixo ? (mom != null ? ' · ' : '') + sufixo : ''))];
  let corpo = '';

  // 1. KPIs do relatório (mesmos números da tela /relatorio)
  corpo += h2('📊 KPIs do mês', 'mesmos números da tela /relatorio');
  if (!snap) corpo += vazio('⏳ Snapshot do relatório indisponível neste servidor.');
  else {
    const s = snap.site || {}, li = snap.linkedin || {}, em = snap.email || {}, ig = snap.instagram || {}, cs = snap.cases || {};
    corpo += tabelaMetricas([
      kpi('Site — usuários', s.usuarios, s.usuarios_mom_pct, 'GA4', s.atualizado_em ? `atualizado ${fmtData(s.atualizado_em)}` : ''),
      kpi('Site — visualizações', s.visualizacoes, s.visualizacoes_mom_pct, 'GA4'),
      kpi('LinkedIn — seguidores (total)', li.total_atual, null, 'LinkedIn'),
      kpi('LinkedIn — novos seguidores', li.novos, li.novos_mom_pct, 'LinkedIn'),
      kpi('LinkedIn — impressões', li.impressoes, li.impressoes_mom_pct, 'LinkedIn (report)'),
      kpi('LinkedIn — engajamento', li.engajamento, li.engajamento_mom_pct, 'LinkedIn (report)'),
      kpi('E-mail — leads', em.leads, em.leads_mom_pct, 'RD Station'),
      kpi('Instagram — novos seguidores', ig.seguidores_novos, ig.seguidores_mom_pct, 'Instagram (report)'),
      ['Cases publicados (hoje)', cs.publicado ?? null, null, cs.em_edicao != null ? `${fmtNum(cs.em_edicao)} em edição · ${fmtNum(cs.live)} clientes live` : pend('Cases')],
      ['Voices ativos (hoje)', snap.voices ? snap.voices.ativos : null, null, snap.voices ? `de ${snap.voices.total} no programa` : pend('Voices')],
    ]);
    if ((snap.alertas || []).length) {
      corpo += `<div style="font-size:12px;font-weight:800;color:${C.azul1};margin:12px 0 4px">SINAIS DO RELATÓRIO</div>` +
        snap.alertas.map(a => `<div style="font-size:12.5px;color:${C.texto};padding:3px 0">⚠️ ${esc(a.msg)}</div>`).join('');
    }
  }

  // 2. Operação do mês
  const ap = A.apollo, pp = P.apollo;
  corpo += h2('⚙️ Operação do mês', `comparado com ${nomeMes(mesAnt)}`);
  corpo += tabelaMetricas([
    ['Pautas de Voices publicadas', A.pautas_publicadas, P.pautas_publicadas],
    ['Posts novos de Voices', A.posts_voices, P.posts_voices],
    ['Inscrições no /seja-voice', A.inscricoes, P.inscricoes],
    ['Conteúdos publicados (pipeline)', A.conteudos_publicados, P.conteudos_publicados],
    ['Cliques nos links rastreados', A.cliques_links, P.cliques_links],
    ['E-mails entregues (Apollo)', ap.disponivel ? ap.entregues : null, pp.disponivel ? pp.entregues : null, ap.obs],
    ['Respostas (Apollo)', ap.disponivel ? ap.respondidos : null, pp.disponivel ? pp.respondidos : null],
    ['Reuniões marcadas (Apollo)', ap.disponivel ? ap.reunioes : null, pp.disponivel ? pp.reunioes : null],
    ['Calls salvas no JARVIS', A.calls_jarvis, P.calls_jarvis],
    ['Eventos realizados', A.eventos_realizados.length, P.eventos_realizados.length],
    ['ERP Coins distribuídos', A.coins, P.coins],
  ]);

  // 3. Alertas do mês
  const am = opts.alertasMes || {};
  corpo += h2('🔔 Alertas do mês');
  corpo += tabelaMetricas([
    ['Alertas abertos no mês', am.abertos ?? null, null, am.porNivel ? `${am.porNivel.critico || 0} crítico(s) · ${am.porNivel.importante || 0} importante(s) · ${am.porNivel.info || 0} informativo(s)` : ''],
    ['Resolvidos no mês', am.resolvidos ?? null, null],
  ]);
  const abertos = (opts.alertasAbertos || []).filter(a => a.nivel !== 'info');
  corpo += abertos.length
    ? `<div style="font-size:12px;font-weight:800;color:${C.azul1};margin:12px 0 2px">AINDA ABERTOS HOJE</div>` + abertos.slice(0, 8).map(cartaoAlerta).join('')
    : vazio('✅ Nenhum alerta crítico ou importante aberto hoje.');

  // 4. Fontes
  corpo += h2('🔌 Saúde das fontes automáticas') + blocoFontes(opts.fontes);

  corpo += `<div style="margin-top:20px">${botao('/relatorio?mes=' + mes, 'Abrir o relatório completo')}
    &nbsp; <a href="${esc(link('/api/relatorio/download-pptx?mes=' + mes))}" style="font-size:12.5px;font-weight:700;color:${C.azul2}">Baixar o PPT →</a></div>`;
  return {
    assunto: `📊 Marketing em ${nomeMes(mes)} — relatório mensal`,
    html: moldura({
      preheader: `Fechamento de ${nomeMes(mes)}: KPIs, operação e alertas.`,
      kicker: 'EPI-USE Office · relatório mensal',
      titulo: `Marketing em ${nomeMes(mes)}`,
      subtitulo: 'Fechamento do mês com os números reais do Office. Sem dado = etiqueta ⏳, nunca estimativa.',
      corpo,
      rodape: 'Sai no 1º dia útil de cada mês, às 9h. Números de hoje (cases, voices) são a foto do momento do envio.',
    }),
  };
}

module.exports = {
  htmlCriticos, assuntoCriticos, htmlSemanal, htmlMensal, dadosSemanal,
  movimento, limitesMes, mesAnterior, nomeMes, ms, fmtIdade, dataBRT, NIVEL, BRT_MS,
};
