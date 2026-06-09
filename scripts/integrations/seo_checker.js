/**
 * seo_checker.js — análise SEO + GEO determinística (sem IA, sem token).
 * SEO clássico (Google) + GEO/AIO/AEO/LLMO (otimização para respostas de IA).
 * Usado por POST /api/content/:id/seo-check.
 */
'use strict';

function countWords(t) { return (String(t||'').trim().match(/\S+/g) || []).length; }
function kwDensity(texto, kw) {
  if (!kw) return 0;
  const t = String(texto||'').toLowerCase();
  const k = String(kw).toLowerCase().trim();
  if (!k) return 0;
  const total = countWords(t) || 1;
  const hits = (t.match(new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g')) || []).length;
  return +(100 * hits / total).toFixed(2);
}

// ── SEO clássico ─────────────────────────────────────────────────────────────
function checkSEO({ titulo = '', corpo = '', tema_keyword = '' }) {
  const checklist = [];
  const add = (item, ok, nota) => checklist.push({ item, ok, nota });

  const tLen = titulo.length;
  add('Título 30–60 caracteres', tLen >= 30 && tLen <= 60, `${tLen} chars`);
  add('Keyword no título', tema_keyword ? titulo.toLowerCase().includes(tema_keyword.toLowerCase()) : false,
      tema_keyword ? '' : 'sem keyword definida');

  const words = countWords(corpo);
  add('Corpo ≥ 300 palavras', words >= 300, `${words} palavras`);

  const dens = kwDensity(corpo, tema_keyword);
  add('Densidade keyword 0.5–2.5%', dens >= 0.5 && dens <= 2.5, `${dens}%`);

  const h2 = (corpo.match(/^#{2,3}\s|<h2|<h3/gim) || []).length;
  add('≥ 2 subtítulos (H2/H3)', h2 >= 2, `${h2} encontrados`);

  const hasList = /^[-*]\s|^\d+\.\s|<ul|<ol/im.test(corpo);
  add('Tem lista (bullets/numerada)', hasList, hasList ? '' : 'listas ajudam featured snippet');

  const firstPara = corpo.split(/\n\n/)[0] || '';
  add('Keyword nos 1ºs 100 chars', tema_keyword ? firstPara.slice(0,100).toLowerCase().includes(tema_keyword.toLowerCase()) : false, '');

  const ok = checklist.filter(c => c.ok).length;
  return { score: Math.round(100 * ok / checklist.length), ok, total: checklist.length, checklist };
}

// ── GEO / AIO / AEO / LLMO (otimização para IA) ──────────────────────────────
// Heurísticas: respostas diretas, dados citáveis, estrutura Q&A, autoridade.
function checkGEO({ titulo = '', corpo = '', tema_keyword = '' }) {
  const checklist = [];
  const add = (item, ok, nota) => checklist.push({ item, ok, nota });
  const txt = corpo.toLowerCase();

  // AEO — Answer Engine: pergunta + resposta direta no início
  const hasQuestion = /\?/.test(corpo) || /^(o que|como|por que|quando|quais|quanto)/im.test(corpo);
  add('AEO · formato pergunta-resposta', hasQuestion, 'IA extrai respostas diretas');

  // Resposta direta curta no início (≤ 50 palavras no 1º parágrafo)
  const firstPara = (corpo.split(/\n\n/)[0] || '');
  const fpw = countWords(firstPara);
  add('AIO · resposta direta no início (≤50 palavras)', fpw > 0 && fpw <= 50, `1º parágrafo: ${fpw} palavras`);

  // Dados/números citáveis (IA prefere fatos concretos)
  const hasData = /\d+%|\d+\s*(mil|milhões|bilhões|x|anos)|R\$\s*\d/i.test(corpo);
  add('GEO · dados/estatísticas citáveis', hasData, 'números aumentam citação por LLM');

  // Estrutura escaneável (subtítulos)
  const h = (corpo.match(/^#{2,3}\s|<h[23]/gim) || []).length;
  add('LLMO · estrutura em seções', h >= 2, `${h} seções`);

  // Entidade/marca clara (EPI-USE, SAP, etc — autoridade)
  const hasEntity = /(epi-?use|sap|successfactors|erp|servicenow|signavio)/i.test(corpo);
  add('GEO · entidades/marcas nomeadas', hasEntity, 'ajuda grounding do LLM');

  // Definição explícita (frases "é um/é uma" — LLM cita definições)
  const hasDef = /\b(é uma?|significa|consiste em|refere-se a|trata-se de)\b/i.test(txt);
  add('AIO · definições explícitas', hasDef, 'LLM cita definições claras');

  // Conclusão/takeaway (LLM resume conclusões)
  const hasConclusion = /(em resumo|conclusão|portanto|takeaway|resumindo|principais pontos)/i.test(txt);
  add('LLMO · conclusão/takeaway resumível', hasConclusion, '');

  const ok = checklist.filter(c => c.ok).length;
  return { score: Math.round(100 * ok / checklist.length), ok, total: checklist.length, checklist };
}

// ── CTA: sugere conteúdo de conversão por pilar/LOB ──────────────────────────
function suggestCTA({ lob = '', pilar = '' } = {}) {
  const l = (lob + ' ' + pilar).toLowerCase();
  if (/rh|hcm|successfactors|payroll|talent/.test(l))
    return { cta: 'Agende um diagnóstico de RH digital', destino: '/contato?origem=blog-rh' };
  if (/servicenow/.test(l))
    return { cta: 'Baixe o guia ServiceNow para o seu setor', destino: '/contato?origem=blog-servicenow' };
  if (/signavio|processo/.test(l))
    return { cta: 'Solicite um mapeamento de processos', destino: '/contato?origem=blog-processos' };
  if (/erp|s\/4|btp|cloud/.test(l))
    return { cta: 'Fale com um especialista SAP', destino: '/contato?origem=blog-erp' };
  return { cta: 'Fale com o time EPI-USE', destino: '/contato?origem=blog' };
}

module.exports = { checkSEO, checkGEO, suggestCTA, countWords, kwDensity };
