// ── MÓDULO 11 · JARVIS — Copiloto SDR/BDR/LDR (biz dev) ───────────────────────
// Router modular ADITIVO (não altera nada existente). Espelha routes/inbound.js.
// Guia o vendedor em tempo real: escuta a conversa (transcrição do front) e
// recomenda falas via Claude, ancorado na base de conhecimento REAL da EPI-USE.
// Persona: SDR sênior 20 anos, prospecção B2B SAP/ServiceNow.

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
  db,
  requireAuth,
  client,
  rateLimit
} = require('../server-context');

const JARVIS_HTML = path.join(__dirname, '../public/jarvis.html');
const MOD_DIR = path.join(__dirname, '../modulos/11-jarvis-sdr');
const PLAYBOOK_PATH = path.join(MOD_DIR, 'playbook.json');

// ── BASE DE CONHECIMENTO (carregada 1x no boot) ───────────────────────────────
let PLAYBOOK = {};
try {
  PLAYBOOK = JSON.parse(fs.readFileSync(PLAYBOOK_PATH, 'utf8'));
  console.log('[jarvis] playbook carregado:', PLAYBOOK?._meta?.versao || '?');
} catch (e) {
  console.warn('[jarvis] playbook não carregado:', e.message);
}

// ── KB CURADA (battle cards + produtos SAP) — arquivos versionados, Regra 7 ────
// Alimentados por material REAL (Rudá entrega arquivo → Claude estrutura → commit).
// Começam vazios com etiqueta "aguarda ingestão"; injeta no prompt só quando houver dado.
function loadKb(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(MOD_DIR, file), 'utf8')); }
  catch (e) { console.warn(`[jarvis] ${file} não carregado:`, e.message); return fallback; }
}
let KB_PRODUTOS = loadKb('kb-produtos-sap.json', { produtos: [] });
let KB_BATTLE   = loadKb('kb-battle-cards.json', { battle_cards: [] });
console.log('[jarvis] KB:', (KB_PRODUTOS.produtos || []).length, 'produtos ·',
            (KB_BATTLE.battle_cards || []).length, 'battle cards');

// ── MEMÓRIA VIVA (persistência SQLite — calls + dores aprendidas) ─────────────
// Aditivo: cria as tabelas no boot do router. Cloud-ready (volume /data no Railway).
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jarvis_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect TEXT, empresa TEXT, industria TEXT, lob TEXT, persona TEXT, estagio TEXT,
      transcript_json TEXT,
      role_map_json TEXT,
      temperatura INTEGER,
      resumo TEXT,
      duracao_seg INTEGER,
      criado_em TEXT DEFAULT (datetime('now')),
      criado_por TEXT
    );
    CREATE TABLE IF NOT EXISTS jarvis_aprendizados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id INTEGER,
      tipo TEXT,                 -- dor | objecao | gatilho | pergunta_vencedora | sinal
      texto TEXT,
      lob TEXT, industria TEXT, persona TEXT,
      fonte TEXT DEFAULT 'call', -- call (real) | manual
      criado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_jap_lob  ON jarvis_aprendizados(lob);
    CREATE INDEX IF NOT EXISTS idx_jap_tipo ON jarvis_aprendizados(tipo);
  `);
  console.log('[jarvis] memória viva pronta (jarvis_calls + jarvis_aprendizados)');
} catch (e) {
  console.warn('[jarvis] falha ao preparar memória viva:', e.message);
}

// ── BACKEND DE IA: odysseus (Anthropic-compat) | Anthropic padrão ─────────────
// odysseus expõe /v1/messages (Anthropic-compatible), então reusamos a MESMA classe
// Anthropic do client compartilhado — só trocando baseURL + key (via env off-repo).
// Se as vars do odysseus não existirem, cai no client padrão (ANTHROPIC_API_KEY).
// Config (Railway + .env local): JARVIS_LLM_BASE_URL · JARVIS_LLM_API_KEY · JARVIS_LLM_MODEL.
const ODY_BASE = (process.env.JARVIS_LLM_BASE_URL || process.env.ODYSSEUS_BASE_URL || '').trim();
const ODY_KEY  = (process.env.JARVIS_LLM_API_KEY  || process.env.ODYSSEUS_API_KEY  || '').trim();
const AI_MODEL = (process.env.JARVIS_LLM_MODEL     || 'claude-haiku-4-5').trim();
// Formato da API do backend de IA:
//   'anthropic' (padrão) → /v1/messages (API Anthropic ou gateway Anthropic-compat)
//   'openai'             → /v1/chat/completions (Ollama, LM Studio, odysseus local etc.)
const AI_FORMAT = (process.env.JARVIS_LLM_FORMAT || 'anthropic').trim().toLowerCase();
let aiClient = client;          // default: client Anthropic compartilhado
let usingOdysseus = false;
if (ODY_BASE && AI_FORMAT !== 'openai') {
  // gateway Anthropic-compat: reusa a MESMA classe Anthropic, só trocando baseURL + key
  try {
    aiClient = new client.constructor({ baseURL: ODY_BASE.replace(/\/+$/, ''), apiKey: ODY_KEY || 'odysseus' });
    usingOdysseus = true;
    console.log('[jarvis] backend de IA: odysseus(anthropic) @', ODY_BASE, '· modelo', AI_MODEL);
  } catch (e) {
    console.warn('[jarvis] falha ao iniciar odysseus, usando Anthropic padrão:', e.message);
  }
}
if (AI_FORMAT === 'openai') {
  console.log('[jarvis] backend de IA: OpenAI-compat @', ODY_BASE || '(JARVIS_LLM_BASE_URL vazio!)', '· modelo', AI_MODEL);
}

// Monta a URL de chat-completions tolerando base com ou sem /v1 no final.
function openaiChatUrl(base) {
  const b = (base || '').replace(/\/+$/, '');
  return /\/v1$/.test(b) ? `${b}/chat/completions` : `${b}/v1/chat/completions`;
}

// Monta a URL de listagem de modelos (health-check padrão OpenAI-compat: Groq, OpenRouter, Ollama).
function openaiModelsUrl(base) {
  const b = (base || '').replace(/\/+$/, '');
  return /\/v1$/.test(b) ? `${b}/models` : `${b}/v1/models`;
}

// Chamada unificada ao LLM — devolve só o TEXTO da resposta.
// Ramo 'openai' usa fetch (Ollama/LM Studio/odysseus); padrão usa o SDK Anthropic (inalterado).
async function callLLM({ system, user, maxTokens }) {
  if (AI_FORMAT === 'openai') {
    const resp = await fetch(openaiChatUrl(ODY_BASE), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ODY_KEY ? { Authorization: `Bearer ${ODY_KEY}` } : {})
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`LLM ${resp.status}: ${t.slice(0, 200)}`);
    }
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content || '';
  }
  const completion = await aiClient.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }]
  });
  return completion.content?.[0]?.text || '';
}

// Pronto se: openai com base setada · odysseus(anthropic) configurado · ou há chave Anthropic.
function aiReady() {
  if (AI_FORMAT === 'openai') return !!ODY_BASE;
  return usingOdysseus || !!process.env.ANTHROPIC_API_KEY;
}
const AI_OFFLINE_MSG = 'Backend de IA indisponível: configure o backend de IA (JARVIS_LLM_BASE_URL [+ JARVIS_LLM_FORMAT=openai p/ Ollama/LM Studio]) ou ANTHROPIC_API_KEY no ambiente.';

// ── RATE LIMIT (anti-abuso da API do Claude) ──────────────────────────────────
const jarvisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 240, // loop ao vivo precisa de mais folga que o inbound (chamadas curtas)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de chamadas/hora atingido. Aguarde um pouco.' }
});

// ── Normaliza o LOB do dropdown para a chave da estratégia FY27 ───────────────
function normalizeLobKey(lobStr) {
  const s = String(lobStr || '').toLowerCase();
  if (/successfactors|\bhcm\b|sfsf/.test(s)) return 'SuccessFactors';
  if (/s\/?4|s4hana|\berp\b/.test(s)) return 'S/4HANA';
  if (/servicenow/.test(s)) return 'ServiceNow';
  if (/signavio|process|\bbtm\b|leanix/.test(s)) return 'Process Excellence';
  if (/workforce|\bwfs\b/.test(s)) return 'WorkForce Software (WFS)';
  if (/qualtrics/.test(s)) return 'Qualtrics';
  return null;
}
// Normaliza a persona do dropdown para a chave de personas_detalhe.
function normalizePersonaKey(personaStr) {
  const s = String(personaStr || '').toLowerCase();
  if (/cfo/.test(s)) return 'CFO';
  if (/chro|\bcoo\b|rh/.test(s)) return 'CHRO';
  if (/cio|cto|arquit/.test(s)) return 'CIO';
  if (/gerente.*ti|\bti\b/.test(s)) return 'Gerente de TI';
  return null;
}

// Seleciona só as fatias da estratégia FY27 relevantes a ESTA call (mantém token baixo).
function selectFY27(ctx = {}) {
  const p = PLAYBOOK || {};
  const lobKey = normalizeLobKey(ctx.lob);
  const persKey = normalizePersonaKey(ctx.persona);
  const out = {};
  if (lobKey) {
    if (p.icp_por_lob && p.icp_por_lob[lobKey]) out.icp = { [lobKey]: p.icp_por_lob[lobKey] };
    if (p.diferenciacao_competitiva && p.diferenciacao_competitiva[lobKey]) out.diferenciacao_competitiva = { [lobKey]: p.diferenciacao_competitiva[lobKey], _uso_interno: p.diferenciacao_competitiva._uso_interno };
    if (p.jornadas && p.jornadas[lobKey]) out.jornada = { [lobKey]: p.jornadas[lobKey] };
    if (p.cases_reais) { const cs = (p.cases_reais.lista || []).filter(c => c.lob === lobKey); if (cs.length) out.cases = { _uso: p.cases_reais._uso, lista: cs }; }
  }
  if (persKey && p.personas_detalhe && p.personas_detalhe[persKey]) out.persona_detalhe = { [persKey]: p.personas_detalhe[persKey] };
  if (ctx.industria && Array.isArray(p.matriz_industria)) { const ind = p.matriz_industria.find(i => i.industria === ctx.industria); if (ind) out.industria = ind; }
  return out;
}

// Seleciona a fatia da KB curada (produtos SAP + battle cards) relevante ao LOB da call.
function selectKb(ctx = {}) {
  const lobKey = normalizeLobKey(ctx.lob);
  const out = {};
  const prods = (KB_PRODUTOS.produtos || []).filter(p => !lobKey || normalizeLobKey(p.lob) === lobKey);
  if (prods.length) out.produtos_sap = prods.slice(0, 6);
  const bcs = (KB_BATTLE.battle_cards || []).filter(b => !lobKey || normalizeLobKey(b.lob) === lobKey);
  if (bcs.length) out.battle_cards = bcs.slice(0, 6);
  return out;
}

// MEMÓRIA VIVA: recupera as dores/objeções/gatilhos REAIS já ouvidos em campo (calls salvas),
// priorizando o LOB da call. Alimenta o JARVIS com o que os SDRs realmente escutaram.
function recallDores(ctx = {}, k = 8) {
  try {
    const lobKey = normalizeLobKey(ctx.lob);
    const sql = `SELECT texto, tipo, COUNT(*) AS freq
                 FROM jarvis_aprendizados
                 WHERE tipo IN ('dor','objecao','gatilho') ${lobKey ? 'AND lob = ?' : ''}
                 GROUP BY lower(texto)
                 ORDER BY freq DESC, MAX(criado_em) DESC
                 LIMIT ?`;
    const stmt = db.prepare(sql);
    return lobKey ? stmt.all(lobKey, k) : stmt.all(k);
  } catch (e) { return []; }
}

// ── SYSTEM PROMPT (persona sênior + playbook real + estratégia FY27 + humanização) ──
function buildSystemPrompt(ctx = {}) {
  const p = PLAYBOOK || {};
  const persona = p.persona_jarvis || {};
  const fy27 = selectFY27(ctx);
  const linhas = [
    `Você é o JARVIS — copiloto de vendas que atua como ${persona.papel || 'SDR/BDR sênior com 20 anos de prospecção B2B SAP/ServiceNow'}.`,
    `Idioma: ${persona.idioma || 'Português do Brasil, consultivo e executivo'}.`,
    `Filosofia: ${persona.filosofia || 'Vender a dor e o resultado de negócio, nunca a tecnologia. Ouvir mais do que falar.'}`,
    ``,
    `Seu papel é ASSISTIR o SDR humano em TEMPO REAL durante uma reunião/ligação. Você NÃO fala com o cliente — você sussurra recomendações para o vendedor. Seja CURTO, acionável e específico do contexto.`,
    ``,
    `=== BASE DE CONHECIMENTO REAL — EPI-USE BRASIL (use SEMPRE, não invente fatos) ===`,
    JSON.stringify({
      empresa: p.empresa,
      pitches_por_persona: p.pitches_por_persona,
      gatilhos_urgencia_2026: p.gatilhos_urgencia_2026,
      lobs: p.lobs,
      matriz_industria: p.matriz_industria,
      frameworks: p.frameworks,
      objecoes: p.objecoes,
      regras_inegociaveis: p.regras_inegociaveis
    }, null, 0)
  ];
  if (Object.keys(fy27).length) {
    linhas.push(``, `=== CONTEXTO ESPECÍFICO DESTA CALL (estratégia FY27 — ancore as sugestões NISTO) ===`, JSON.stringify(fy27, null, 0));
  }
  const kb = selectKb(ctx);
  if (Object.keys(kb).length) {
    linhas.push(``, `=== CONHECIMENTO DE PRODUTO + BATTLE CARDS (uso INTERNO de coaching — battle card NUNCA nomeia concorrente na fala) ===`, JSON.stringify(kb, null, 0));
  }
  const dores = recallDores(ctx, 8);
  if (dores.length) {
    linhas.push(``, `=== MEMÓRIA VIVA — DORES JÁ OUVIDAS EM CAMPO (de calls reais; use pra ANTECIPAR a dor, não pra afirmar) ===`, JSON.stringify(dores.map(d => ({ dor: d.texto, tipo: d.tipo, vezes: d.freq })), null, 0));
  }
  linhas.push(
    ``,
    `=== HUMANIZAÇÃO DA "talk_track" (o que o SDR vai FALAR em voz alta) — OBRIGATÓRIO ===`,
    `A talk_track precisa soar como gente de verdade, não como IA. Aplique:`,
    `- 1ª pessoa, contrações naturais (tá, pra, dá pra, cê), frases curtas e de tamanho VARIADO.`,
    `- PROIBIDO: travessão (— ou –); palavras-robô (crucial, fundamental, robusto, sinergia, "no fim do dia", "nesse sentido", "potencializar", "alavancar"); "Entendo que X é um desafio para muitas empresas"; "Nossa especialização em..."; regra de três decorativa; conclusão motivacional genérica; emoji; jargão técnico à toa.`,
    `- Prefira PERGUNTAR a afirmar. Vá direto ao ponto, sem "deixa eu te explicar" nem floreio.`,
    `- Específico > genérico: use o número/dor concreta que apareceu na conversa.`,
    `Exemplos:`,
    `  ❌ "Entendo que a Reforma Tributária é um desafio. Nossa especialização em SAP pode mitigar riscos fiscais."`,
    `  ✅ "Deixa eu te perguntar: com a CBS/IBS entrando, quanto do fiscal de vocês ainda roda no braço hoje?"`,
    `  ❌ "Podemos agregar valor com uma solução robusta e inovadora."`,
    `  ✅ "Faz sentido a gente sentar 30 min e eu te mostrar onde dá pra cortar esse retrabalho?"`,
    ``,
    `=== REGRAS ===`,
    `- PT-BR sempre. Vender a DOR, nunca a tecnologia pela tecnologia.`,
    `- NUNCA citar concorrentes nominalmente na fala — use o argumento sem nome (veja diferenciacao_competitiva).`,
    `- NUNCA citar clientes nominalmente sem aprovação — anonimize os cases (ex: "um grande grupo do agro").`,
    `- Sem promessas absurdas (ROI garantido, prazos imbatíveis).`,
    `- Sempre empurrar para um próximo passo concreto com data.`
  );
  return linhas.join('\n');
}

// ── RAG-lite: recupera cases/conteúdos REAIS do catálogo de artigos (cloud-ready) ──
const ARTIGOS_PATH = path.join(__dirname, '../public/api/artigos.json');
let _artigosCache = null;
function loadArtigos() {
  if (_artigosCache) return _artigosCache;
  try { _artigosCache = JSON.parse(fs.readFileSync(ARTIGOS_PATH, 'utf8')).artigos || []; }
  catch (e) { console.warn('[jarvis] artigos.json não carregado:', e.message); _artigosCache = []; }
  return _artigosCache;
}
// Mapa LOB do JARVIS → linha_de_negocio do catálogo de artigos.
const LOB_TO_LINHA = {
  'SuccessFactors': 'Serviços HCM & RH',
  'WorkForce Software (WFS)': 'Serviços HCM & RH',
  'Qualtrics': 'Serviços HCM & RH',
  'S/4HANA': 'Serviços SAP ERP (S/4HANA)',
  'ServiceNow': 'ServiceNow',
  'Process Excellence': 'Excelência em Processos'
};
const _STOP = new Set(['para','como','isso','você','voce','sobre','quero','tem','uma','dos','das','que','com','por','não','nao','meu','minha','nossa','nosso','sim','mais','muito','está','esta','estamos','reunião','reuniao']);
function retrieveArtigos({ lob, query, k = 6 } = {}) {
  const arts = loadArtigos();
  if (!arts.length) return [];
  const lobKey = normalizeLobKey(lob);
  const linha = LOB_TO_LINHA[lobKey];
  const terms = String(query || '').toLowerCase().split(/[^a-zà-ú0-9]+/).filter(w => w.length >= 4 && !_STOP.has(w));
  const scored = arts.map(a => {
    const titulo = String(a.titulo || '').toLowerCase();
    let score = 0;
    if (linha && a.linha_de_negocio === linha) score += 3;
    for (const t of terms) if (titulo.includes(t)) score += 2;
    // dá um empurrãozinho pra fundo/meio de funil (mais úteis pra venda)
    if (/Fundo|Meio/.test(a.etapa_funil || '')) score += 0.5;
    return { a, score };
  }).filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map(x => ({ titulo: x.a.titulo, url: x.a.url, etapa: x.a.etapa_funil, linha: x.a.linha_de_negocio }));
  return scored;
}

// ── Helper: parse JSON tolerante (remove cercas markdown) ──────────────────────
function safeParseJson(raw) {
  if (!raw) return null;
  let t = String(raw).trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  // pega o primeiro objeto {...} se vier texto em volta
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  try { return JSON.parse(t); } catch { return null; }
}

// ── ROTA DE PÁGINA (rota limpa /jarvis) ───────────────────────────────────────
router.get('/jarvis', requireAuth, (req, res) => {
  res.sendFile(JARVIS_HTML);
});

// ── API: playbook (pro front popular dropdowns de LOB/persona/indústria) ──────
router.get('/api/jarvis/playbook', (req, res) => {
  res.json({
    versao: PLAYBOOK?._meta?.versao || null,
    backend: AI_FORMAT === 'openai' ? 'openai-compat' : (usingOdysseus ? 'odysseus' : 'anthropic'),
    formato: AI_FORMAT,
    modelo: AI_MODEL,
    ia_pronta: aiReady(),
    lobs: (PLAYBOOK.lobs || []).map(l => l.nome),
    personas: Object.keys(PLAYBOOK.pitches_por_persona || {}),
    industrias: (PLAYBOOK.matriz_industria || []).map(i => i.industria),
    gatilhos: PLAYBOOK.gatilhos_urgencia_2026 || [],
    kb: {
      produtos_sap: (KB_PRODUTOS.produtos || []).length,
      battle_cards: (KB_BATTLE.battle_cards || []).length,
      estado_produtos: KB_PRODUTOS?._meta?.estado || null,
      estado_battle: KB_BATTLE?._meta?.estado || null
    }
  });
});

// ── API: ping — testa conectividade do Railway com o backend de IA ───────────
// Útil p/ diagnosticar se o Quick Tunnel ainda está ativo.
router.get('/api/jarvis/ping', async (req, res) => {
  const base = { model: AI_MODEL, formato: AI_FORMAT, baseUrl: ODY_BASE || null };
  if (!aiReady()) return res.json({ ...base, ok: false, message: 'Backend não configurado (sem URL/chave).' });
  if (AI_FORMAT === 'openai') {
    try {
      // health-check padrão OpenAI-compat: GET /v1/models com a chave (Groq, OpenRouter, Ollama).
      const resp = await fetch(openaiModelsUrl(ODY_BASE), {
        headers: ODY_KEY ? { Authorization: `Bearer ${ODY_KEY}` } : {},
        signal: AbortSignal.timeout(6000)
      });
      if (resp.ok) return res.json({ ...base, ok: true, message: `provedor respondeu OK (HTTP ${resp.status})` });
      const txt = await resp.text().catch(() => '');
      const dica = resp.status === 401 ? ' (chave inválida? verifique JARVIS_LLM_API_KEY)' : '';
      return res.json({ ...base, ok: false, message: `HTTP ${resp.status}${dica} ${txt.slice(0, 80)}`.trim() });
    } catch (e) {
      return res.json({ ...base, ok: false, message: e.message });
    }
  }
  return res.json({ ...base, ok: true, message: 'Anthropic client configurado.' });
});

// ── API: coach ao vivo ────────────────────────────────────────────────────────
// Recebe contexto da call + transcrição recente + última fala do prospect.
// Devolve JSON com próxima pergunta, talk track, contorno de objeção, sinais e temperatura.
router.post('/api/jarvis/coach', jarvisLimiter, async (req, res) => {
  if (!aiReady()) {
    return res.status(503).json({ success: false, error: AI_OFFLINE_MSG });
  }
  try {
    const { context = {}, transcript = [], lastUtterance = '' } = req.body || {};
    const ctxLines = [
      `Prospect: ${context.prospect || '—'}`,
      `Empresa: ${context.empresa || '—'}`,
      `Indústria: ${context.industria || '—'}`,
      `LOB foco: ${context.lob || '—'}`,
      `Persona/cargo: ${context.persona || '—'}`,
      `Estágio: ${context.estagio || '—'}`
    ].join('\n');

    // só as últimas ~12 falas pra manter latência baixa
    const recent = Array.isArray(transcript) ? transcript.slice(-12) : [];
    const transcriptText = recent.map(t => {
      const who = t.speaker === 'prospect' ? 'PROSPECT' : 'SDR';
      return `${who}: ${t.text}`;
    }).join('\n') || '(sem transcrição ainda)';

    // RAG-lite: cases/conteúdos REAIS do catálogo (cloud-ready, sem Ollama)
    const queryTexto = [lastUtterance, recent.map(t => t.text).join(' ')].filter(Boolean).join(' ');
    const artigos = retrieveArtigos({ lob: context.lob, query: queryTexto, k: 6 });
    const artigosBloco = artigos.length
      ? [`=== CONTEÚDOS REAIS EPI-USE DISPONÍVEIS (use SÓ estes em conteudos_sugeridos; NUNCA invente URL) ===`,
         JSON.stringify(artigos.map(a => ({ titulo: a.titulo, url: a.url })), null, 0)].join('\n')
      : '';

    const userPrompt = [
      `CONTEXTO DA CALL:`,
      ctxLines,
      ``,
      `TRANSCRIÇÃO RECENTE:`,
      transcriptText,
      ``,
      lastUtterance ? `ÚLTIMA FALA A REAGIR (do prospect): "${lastUtterance}"` : '',
      artigosBloco ? `\n${artigosBloco}` : '',
      ``,
      `Com base nisso, oriente o SDR AGORA. Responda APENAS com um JSON válido neste formato:`,
      `{`,
      `  "proxima_pergunta": "1 pergunta de descoberta poderosa pra fazer agora (SPIN/MEDDIC)",`,
      `  "talk_track": "1-2 frases que o SDR pode falar agora — HUMANIZADAS (ver regras de humanização)",`,
      `  "objecao": "se houve objeção, o contorno em 1-2 frases; senão string vazia",`,
      `  "sinais": ["sinal de compra ou risco observado", "..."],`,
      `  "lob_sugerida": "LOB EPI-USE mais aderente ao que foi dito",`,
      `  "lob_detectada": "LOB EPI-USE que o cliente está falando agora (taxonomia real) — '' se não der pra inferir",`,
      `  "persona_detectada": "cargo/persona do prospect inferido da conversa (ex: CFO, CIO, CHRO, Gerente de TI) — '' se não der",`,
      `  "industria_detectada": "indústria/setor do cliente inferido da conversa — '' se não der",`,
      `  "estagio_detectado": "Cold call | Discovery | Demo | Negociação | Follow-up — '' se não der",`,
      `  "conteudos_sugeridos": [{"titulo": "título exato da lista", "url": "url exata da lista", "porque": "por que enviar agora"}],`,
      `  "temperatura": 0-100 (quão quente está a oportunidade, inteiro),`,
      `  "proximo_passo": "o próximo passo concreto a propor (com ideia de prazo)"`,
      `}`,
      `Em conteudos_sugeridos use NO MÁXIMO 3 itens, e SOMENTE da lista de conteúdos reais acima (se não houver lista, devolva []).`
    ].filter(Boolean).join('\n');

    const raw = await callLLM({ system: buildSystemPrompt(context), user: userPrompt, maxTokens: 800 });
    const parsed = safeParseJson(raw);
    if (!parsed) {
      return res.json({ success: true, gerado_por_ia: true, fallback: true, talk_track: raw.slice(0, 400), proxima_pergunta: '', objecao: '', sinais: [], conteudos_sugeridos: [], temperatura: null, proximo_passo: '' });
    }
    // saneamento: conteudos_sugeridos só com URLs que existem na lista real (anti-alucinação)
    if (Array.isArray(parsed.conteudos_sugeridos)) {
      const urlsOk = new Set(artigos.map(a => a.url));
      parsed.conteudos_sugeridos = parsed.conteudos_sugeridos.filter(c => c && urlsOk.has(c.url)).slice(0, 3);
    }
    res.json({ success: true, gerado_por_ia: true, ...parsed });
  } catch (e) {
    console.error('[jarvis/coach] erro:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── API: pré-call brief ───────────────────────────────────────────────────────
// Gera um ângulo de abertura por persona/LOB/indústria antes da call começar.
router.post('/api/jarvis/brief', jarvisLimiter, async (req, res) => {
  if (!aiReady()) {
    return res.status(503).json({ success: false, error: AI_OFFLINE_MSG });
  }
  try {
    const { context = {} } = req.body || {};
    // RAG-lite: conteúdos reais por LOB/indústria pra abrir a conversa
    const artigos = retrieveArtigos({ lob: context.lob, query: [context.industria, context.lob].filter(Boolean).join(' '), k: 5 });
    const artigosBloco = artigos.length
      ? [`=== CONTEÚDOS REAIS EPI-USE DISPONÍVEIS (use SÓ estes; NUNCA invente URL) ===`,
         JSON.stringify(artigos.map(a => ({ titulo: a.titulo, url: a.url })), null, 0)].join('\n')
      : '';
    const userPrompt = [
      `Monte um PRÉ-CALL BRIEF curto pra eu (SDR) abrir esta conversa com confiança.`,
      `Prospect: ${context.prospect || '—'} | Empresa: ${context.empresa || '—'} | Indústria: ${context.industria || '—'} | LOB: ${context.lob || '—'} | Persona: ${context.persona || '—'} | Estágio: ${context.estagio || '—'}`,
      artigosBloco ? `\n${artigosBloco}` : '',
      ``,
      `Responda APENAS com JSON válido:`,
      `{`,
      `  "abertura": "frase de abertura consultiva, HUMANIZADA (ver regras), ancorada na dor da persona/indústria",`,
      `  "dores_provaveis": ["dor 1", "dor 2", "dor 3"],`,
      `  "gatilho_2026": "o gatilho de urgência mais relevante pra usar",`,
      `  "perguntas_chave": ["pergunta de descoberta 1", "2", "3"],`,
      `  "prova_social": "1 prova social objetiva da EPI-USE Brasil relevante (case anonimizado se preciso)",`,
      `  "conteudos_sugeridos": [{"titulo": "título exato da lista", "url": "url exata da lista", "porque": "quando usar"}]`,
      `}`,
      `Em conteudos_sugeridos use NO MÁXIMO 3 itens, SOMENTE da lista acima (se não houver, devolva []).`
    ].filter(Boolean).join('\n');

    const raw = await callLLM({ system: buildSystemPrompt(context), user: userPrompt, maxTokens: 900 });
    const parsed = safeParseJson(raw);
    if (!parsed) return res.status(502).json({ success: false, error: 'Resposta da IA não pôde ser interpretada.' });
    if (Array.isArray(parsed.conteudos_sugeridos)) {
      const urlsOk = new Set(artigos.map(a => a.url));
      parsed.conteudos_sugeridos = parsed.conteudos_sugeridos.filter(c => c && urlsOk.has(c.url)).slice(0, 3);
    }
    res.json({ success: true, gerado_por_ia: true, ...parsed });
  } catch (e) {
    console.error('[jarvis/brief] erro:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── API: pesquisar produto na web (OpenRouter :online · foco sap.com/servicenow.com) ──
// Pré-call only (não no loop ao vivo). Reusa OPENROUTER_API_KEY já existente no ambiente.
const OR_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const OR_WEB_MODEL = (process.env.JARVIS_WEB_MODEL || 'perplexity/sonar').trim();
router.post('/api/jarvis/pesquisar', jarvisLimiter, async (req, res) => {
  if (!OR_KEY) {
    return res.status(503).json({ success: false, error: 'Pesquisa web indisponível: configure OPENROUTER_API_KEY no ambiente.' });
  }
  try {
    const { produto = '', duvida = '', lob = '' } = req.body || {};
    const termo = [produto, lob].filter(Boolean).join(' ').trim();
    if (!termo && !String(duvida).trim()) {
      return res.status(400).json({ success: false, error: 'Informe um produto ou uma dúvida técnica.' });
    }
    const prompt = [
      `Você é um especialista técnico em soluções SAP/ServiceNow apoiando um SDR da EPI-USE Brasil.`,
      `Pesquise informação TÉCNICA e ATUAL sobre: ${termo || duvida}.`,
      duvida ? `Dúvida específica a responder: "${duvida}".` : '',
      `Priorize fontes oficiais (site:sap.com, site:help.sap.com, site:servicenow.com). Responda em PT-BR.`,
      `Responda APENAS com JSON válido:`,
      `{`,
      `  "resumo": ["bullet técnico 1", "bullet 2", "bullet 3"],`,
      `  "como_explicar": "1-2 frases pra o SDR explicar ao prospect em linguagem de NEGÓCIO (humanizada, sem jargão à toa)",`,
      `  "fontes": [{"titulo": "título da página", "url": "url"}]`,
      `}`
    ].filter(Boolean).join('\n');

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OR_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://office.epiuse.com.br',
        'X-Title': 'EPI-USE Office - JARVIS'
      },
      body: JSON.stringify({ model: OR_WEB_MODEL, temperature: 0.2, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return res.status(502).json({ success: false, error: `OpenRouter ${resp.status}: ${t.slice(0, 200)}` });
    }
    const data = await resp.json();
    const rawTxt = data?.choices?.[0]?.message?.content || '';
    const parsed = safeParseJson(rawTxt);
    if (!parsed) {
      return res.json({ success: true, gerado_por_ia: true, etiqueta: '🌐 Pesquisa web — verificar', resumo: [rawTxt.slice(0, 600)], fontes: [] });
    }
    res.json({ success: true, gerado_por_ia: true, etiqueta: '🌐 Pesquisa web — verificar', ...parsed });
  } catch (e) {
    console.error('[jarvis/pesquisar] erro:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── API: encerrar & salvar a call (memória viva) ──────────────────────────────
// Salva a call no SQLite e EXTRAI (via IA) as dores/objeções/gatilhos reais ouvidos,
// gravando em jarvis_aprendizados. É assim que o JARVIS "aprende a dor" entre calls.
router.post('/api/jarvis/encerrar', requireAuth, jarvisLimiter, async (req, res) => {
  try {
    const { context = {}, transcript = [], roleMap = {}, temperatura = null, duracao_seg = null, call_id = null } = req.body || {};
    const turns = Array.isArray(transcript) ? transcript : [];
    if (!turns.length) {
      return res.status(400).json({ success: false, error: 'Sem transcrição para salvar.' });
    }
    const lobKey = normalizeLobKey(context.lob) || (context.lob || null);
    const temp = (temperatura != null && !isNaN(temperatura)) ? Math.round(temperatura) : null;
    const dur  = (duracao_seg != null && !isNaN(duracao_seg)) ? Math.round(duracao_seg) : null;
    const quem = (req.session && req.session.user && (req.session.user.name || req.session.user.email)) || 'sdr';

    // 1) salva (auto-save em background): UPDATE se já há call_id desta sessão, senão INSERT
    //    (evita duplicar a call a cada auto-save; re-extrai os aprendizados do zero no update)
    let callId = null;
    const existing = call_id ? db.prepare('SELECT id FROM jarvis_calls WHERE id = ?').get(call_id) : null;
    if (existing) {
      db.prepare(`UPDATE jarvis_calls SET prospect=?, empresa=?, industria=?, lob=?, persona=?, estagio=?,
                    transcript_json=?, role_map_json=?, temperatura=?, duracao_seg=? WHERE id=?`).run(
        context.prospect || null, context.empresa || null, context.industria || null,
        lobKey, context.persona || null, context.estagio || null,
        JSON.stringify(turns), JSON.stringify(roleMap || {}), temp, dur, existing.id
      );
      callId = existing.id;
      db.prepare('DELETE FROM jarvis_aprendizados WHERE call_id = ?').run(callId);
    } else {
      const callRow = db.prepare(`INSERT INTO jarvis_calls
        (prospect, empresa, industria, lob, persona, estagio, transcript_json, role_map_json, temperatura, duracao_seg, criado_por)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
        context.prospect || null, context.empresa || null, context.industria || null,
        lobKey, context.persona || null, context.estagio || null,
        JSON.stringify(turns), JSON.stringify(roleMap || {}), temp, dur, quem
      );
      callId = callRow.lastInsertRowid;
    }

    // 2) extrai aprendizados REAIS (só o que o PROSPECT/cliente disse) — se a IA estiver pronta
    let resumo = null, aprendizados = { dor: [], objecao: [], gatilho: [], pergunta_vencedora: [], sinal: [] };
    if (aiReady()) {
      const fala = turns.map(t => {
        const who = (t.speaker === 'prospect' || t.role === 'prospect') ? 'CLIENTE'
                  : (t.speaker === 'sdr' || t.role === 'sdr') ? 'SDR' : (t.voz || 'VOZ');
        return `${who}: ${t.text}`;
      }).join('\n').slice(0, 8000);
      const ext = [
        `Você é um analista de pré-vendas. Abaixo está a transcrição de uma call de prospecção B2B (SAP/ServiceNow).`,
        `Extraia SOMENTE o que apareceu DE FATO na conversa (não invente). Foque no que o CLIENTE disse.`,
        ``,
        `CONTEXTO: empresa=${context.empresa || '—'} · indústria=${context.industria || '—'} · LOB=${context.lob || '—'} · persona=${context.persona || '—'}`,
        ``,
        `TRANSCRIÇÃO:`,
        fala,
        ``,
        `Responda APENAS com JSON válido:`,
        `{`,
        `  "resumo": "2-3 frases do que rolou e onde parou",`,
        `  "dores": ["dor de negócio concreta dita pelo cliente", "..."],`,
        `  "objecoes": ["objeção levantada pelo cliente", "..."],`,
        `  "gatilhos": ["gatilho de urgência/contexto real (ex: prazo, projeto, mudança regulatória)", "..."],`,
        `  "perguntas_vencedoras": ["pergunta do SDR que abriu a conversa (se houve)", "..."],`,
        `  "sinais": ["sinal de compra ou de risco observado", "..."]`,
        `}`,
        `Listas vazias se não houver. Sem texto fora do JSON.`
      ].join('\n');
      try {
        const raw = await callLLM({ system: 'Extrator factual de calls de venda. Responde só JSON. PT-BR.', user: ext, maxTokens: 700 });
        const parsed = safeParseJson(raw);
        if (parsed) {
          resumo = parsed.resumo || null;
          const mapTipo = { dores: 'dor', objecoes: 'objecao', gatilhos: 'gatilho', perguntas_vencedoras: 'pergunta_vencedora', sinais: 'sinal' };
          const ins = db.prepare(`INSERT INTO jarvis_aprendizados (call_id, tipo, texto, lob, industria, persona, fonte)
                                  VALUES (?,?,?,?,?,?, 'call')`);
          const tx = db.transaction(() => {
            for (const [campo, tipo] of Object.entries(mapTipo)) {
              const arr = Array.isArray(parsed[campo]) ? parsed[campo] : [];
              for (const txt of arr) {
                const clean = String(txt || '').trim();
                if (!clean) continue;
                ins.run(callId, tipo, clean.slice(0, 400), lobKey, context.industria || null, context.persona || null);
                if (aprendizados[tipo]) aprendizados[tipo].push(clean);
              }
            }
          });
          tx();
          if (resumo) db.prepare('UPDATE jarvis_calls SET resumo = ? WHERE id = ?').run(resumo, callId);
        }
      } catch (e) {
        console.warn('[jarvis/encerrar] extração falhou (call salva mesmo assim):', e.message);
      }
    }

    const totalApr = Object.values(aprendizados).reduce((a, x) => a + x.length, 0);
    res.json({
      success: true,
      call_id: callId,
      resumo,
      aprendizados,
      total_aprendizados: totalApr,
      ia_disponivel: aiReady(),
      etiqueta: '🧠 Aprendizados extraídos da call real (revise antes de usar como verdade absoluta)'
    });
  } catch (e) {
    console.error('[jarvis/encerrar] erro:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── API: dores de campo (loop p/ guiar conteúdo) ──────────────────────────────
// Agrega o que os SDRs ouviram em campo, por LOB, pra pautar os próximos conteúdos.
router.get('/api/jarvis/dores-de-campo', requireAuth, (req, res) => {
  try {
    const lobKey = normalizeLobKey(req.query.lob);
    const limit = Math.min(parseInt(req.query.limit, 10) || 40, 200);
    const tipoFiltro = req.query.tipo ? String(req.query.tipo) : null;

    const where = ['1=1'];
    const params = [];
    if (lobKey) { where.push('lob = ?'); params.push(lobKey); }
    if (tipoFiltro) { where.push('tipo = ?'); params.push(tipoFiltro); }

    const dores = db.prepare(
      `SELECT texto, tipo, lob, industria, persona, COUNT(*) AS freq, MAX(criado_em) AS ultima
       FROM jarvis_aprendizados
       WHERE ${where.join(' AND ')}
       GROUP BY lower(texto)
       ORDER BY freq DESC, ultima DESC
       LIMIT ?`
    ).all(...params, limit);

    const porLob = db.prepare(
      `SELECT COALESCE(lob,'(sem LOB)') AS lob, tipo, COUNT(*) AS total
       FROM jarvis_aprendizados GROUP BY lob, tipo ORDER BY total DESC`
    ).all();

    const totalCalls = db.prepare('SELECT COUNT(*) AS n FROM jarvis_calls').get().n;
    const totalApr = db.prepare('SELECT COUNT(*) AS n FROM jarvis_aprendizados').get().n;

    res.json({
      success: true,
      etiqueta: '🧠 Dores reais ouvidas em campo (calls do JARVIS) — insumo pra pautar conteúdo',
      total_calls: totalCalls,
      total_aprendizados: totalApr,
      filtro_lob: lobKey || null,
      dores,
      por_lob: porLob
    });
  } catch (e) {
    console.error('[jarvis/dores-de-campo] erro:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
