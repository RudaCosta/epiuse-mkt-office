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
  requireAuth,
  client,
  rateLimit
} = require('../server-context');

const JARVIS_HTML = path.join(__dirname, '../public/jarvis.html');
const PLAYBOOK_PATH = path.join(__dirname, '../modulos/11-jarvis-sdr/playbook.json');

// ── BASE DE CONHECIMENTO (carregada 1x no boot) ───────────────────────────────
let PLAYBOOK = {};
try {
  PLAYBOOK = JSON.parse(fs.readFileSync(PLAYBOOK_PATH, 'utf8'));
  console.log('[jarvis] playbook carregado:', PLAYBOOK?._meta?.versao || '?');
} catch (e) {
  console.warn('[jarvis] playbook não carregado:', e.message);
}

// ── BACKEND DE IA: odysseus (Anthropic-compat) | Anthropic padrão ─────────────
// odysseus expõe /v1/messages (Anthropic-compatible), então reusamos a MESMA classe
// Anthropic do client compartilhado — só trocando baseURL + key (via env off-repo).
// Se as vars do odysseus não existirem, cai no client padrão (ANTHROPIC_API_KEY).
// Config (Railway + .env local): JARVIS_LLM_BASE_URL · JARVIS_LLM_API_KEY · JARVIS_LLM_MODEL.
const ODY_BASE = (process.env.JARVIS_LLM_BASE_URL || process.env.ODYSSEUS_BASE_URL || '').trim();
const ODY_KEY  = (process.env.JARVIS_LLM_API_KEY  || process.env.ODYSSEUS_API_KEY  || '').trim();
const AI_MODEL = (process.env.JARVIS_LLM_MODEL     || 'claude-haiku-4-5').trim();
let aiClient = client;          // default: client Anthropic compartilhado
let usingOdysseus = false;
if (ODY_BASE) {
  try {
    aiClient = new client.constructor({ baseURL: ODY_BASE.replace(/\/+$/, ''), apiKey: ODY_KEY || 'odysseus' });
    usingOdysseus = true;
    console.log('[jarvis] backend de IA: odysseus @', ODY_BASE, '· modelo', AI_MODEL);
  } catch (e) {
    console.warn('[jarvis] falha ao iniciar odysseus, usando Anthropic padrão:', e.message);
  }
}
// Pronto se odysseus configurado OU há chave Anthropic.
function aiReady() { return usingOdysseus || !!process.env.ANTHROPIC_API_KEY; }
const AI_OFFLINE_MSG = 'Backend de IA indisponível: configure odysseus (JARVIS_LLM_BASE_URL) ou ANTHROPIC_API_KEY no ambiente.';

// ── RATE LIMIT (anti-abuso da API do Claude) ──────────────────────────────────
const jarvisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 240, // loop ao vivo precisa de mais folga que o inbound (chamadas curtas)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Limite de chamadas/hora atingido. Aguarde um pouco.' }
});

// ── SYSTEM PROMPT (persona sênior + playbook real) ────────────────────────────
function buildSystemPrompt() {
  const p = PLAYBOOK || {};
  const persona = p.persona_jarvis || {};
  return [
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
    }, null, 0),
    ``,
    `=== REGRAS ===`,
    `- PT-BR sempre. Vender a DOR, nunca a tecnologia pela tecnologia.`,
    `- NUNCA citar concorrentes ou clientes nominalmente.`,
    `- Sem promessas absurdas (ROI garantido, prazos imbatíveis).`,
    `- Falas sugeridas devem soar naturais na boca de um vendedor humano, curtas (1-2 frases).`,
    `- Sempre empurrar para um próximo passo concreto com data.`
  ].join('\n');
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
    backend: usingOdysseus ? 'odysseus' : 'anthropic',
    modelo: AI_MODEL,
    ia_pronta: aiReady(),
    lobs: (PLAYBOOK.lobs || []).map(l => l.nome),
    personas: Object.keys(PLAYBOOK.pitches_por_persona || {}),
    industrias: (PLAYBOOK.matriz_industria || []).map(i => i.industria),
    gatilhos: PLAYBOOK.gatilhos_urgencia_2026 || []
  });
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

    const userPrompt = [
      `CONTEXTO DA CALL:`,
      ctxLines,
      ``,
      `TRANSCRIÇÃO RECENTE:`,
      transcriptText,
      ``,
      lastUtterance ? `ÚLTIMA FALA A REAGIR (do prospect): "${lastUtterance}"` : '',
      ``,
      `Com base nisso, oriente o SDR AGORA. Responda APENAS com um JSON válido neste formato:`,
      `{`,
      `  "proxima_pergunta": "1 pergunta de descoberta poderosa pra fazer agora (SPIN/MEDDIC)",`,
      `  "talk_track": "1-2 frases que o SDR pode falar agora, naturais e consultivas",`,
      `  "objecao": "se houve objeção, o contorno em 1-2 frases; senão string vazia",`,
      `  "sinais": ["sinal de compra ou risco observado", "..."],`,
      `  "lob_sugerida": "LOB EPI-USE mais aderente ao que foi dito",`,
      `  "temperatura": 0-100 (quão quente está a oportunidade, inteiro),`,
      `  "proximo_passo": "o próximo passo concreto a propor (com ideia de prazo)"`,
      `}`
    ].filter(Boolean).join('\n');

    const completion = await aiClient.messages.create({
      model: AI_MODEL,
      max_tokens: 700,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: userPrompt }]
    });

    const raw = completion.content?.[0]?.text || '';
    const parsed = safeParseJson(raw);
    if (!parsed) {
      return res.json({ success: true, gerado_por_ia: true, fallback: true, talk_track: raw.slice(0, 400), proxima_pergunta: '', objecao: '', sinais: [], temperatura: null, proximo_passo: '' });
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
    const userPrompt = [
      `Monte um PRÉ-CALL BRIEF curto pra eu (SDR) abrir esta conversa com confiança.`,
      `Prospect: ${context.prospect || '—'} | Empresa: ${context.empresa || '—'} | Indústria: ${context.industria || '—'} | LOB: ${context.lob || '—'} | Persona: ${context.persona || '—'} | Estágio: ${context.estagio || '—'}`,
      ``,
      `Responda APENAS com JSON válido:`,
      `{`,
      `  "abertura": "frase de abertura consultiva ancorada na dor da persona/indústria",`,
      `  "dores_provaveis": ["dor 1", "dor 2", "dor 3"],`,
      `  "gatilho_2026": "o gatilho de urgência mais relevante pra usar",`,
      `  "perguntas_chave": ["pergunta de descoberta 1", "2", "3"],`,
      `  "prova_social": "1 prova social objetiva da EPI-USE Brasil relevante"`,
      `}`
    ].join('\n');

    const completion = await aiClient.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: userPrompt }]
    });
    const parsed = safeParseJson(completion.content?.[0]?.text || '');
    if (!parsed) return res.status(502).json({ success: false, error: 'Resposta da IA não pôde ser interpretada.' });
    res.json({ success: true, gerado_por_ia: true, ...parsed });
  } catch (e) {
    console.error('[jarvis/brief] erro:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
