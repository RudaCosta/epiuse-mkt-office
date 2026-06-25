// routes/optimizer-v3.js
// Profile Optimizer v3 — Groq Vision (free) + 21 LinkedIn Skills
// Pipeline: REDATOR (vision) -> REVISOR (texto), mecanica raccoon
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = (() => {
  try { return require('multer'); } catch (_) {
    const u = process.env.USERNAME || 'Ruds';
    return require(`C:/Users/${u}/.epiuse-optimizer/node_modules/multer`);
  }
})();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 8 * 1024 * 1024, files: 5 }
});

const MODEL_VISION = process.env.GROQ_MODEL_VISION || 'meta-llama/llama-4-scout-17b-16e-instruct';
const MODEL_TEXT = process.env.GROQ_MODEL_TEXT || 'llama-3.3-70b-versatile';

const LINKEDIN_21_SKILLS = `
21 LINKEDIN OPTIMIZATION SKILLS (cobrir TODAS no diagnostico + plano):

PERFIL VISUAL
1. Foto de perfil — alta resolucao, fundo neutro, rosto 60% do frame, expressao confiante
2. Cover image (banner) 1584x396 — descricao visual com proposta de valor + CTA
3. Selo Open to / Provide Services — Voices = OFF, usar Creator Mode
4. URL personalizada — linkedin.com/in/nome-sobrenome
5. Headline (220 chars) — pillar + nicho + diferencial + prova

NARRATIVA
6. Seccao Sobre — 1a pessoa PT-BR, hook 3 primeiras linhas, CTA final
7. Featured section — 3 a 6 pinned posts/artigos/PDFs
8. Experience — bullets quantificados (verbo + acao + numero + impacto)
9. Education — certificacoes SAP + cursos recentes
10. Licenses & Certifications — SAP Certified com URLs

AUTORIDADE
11. Skills endorsement — top 3 = nicho principal
12. Recommendations — 3+ recebidas + 3+ dadas
13. Publications — link de artigos blog EPI-USE / Medium
14. Languages — minimo PT + EN
15. Volunteer — incluir ERP.ngo (1% Africa)

PRESENCA ATIVA
16. Creator Mode — ATIVAR
17. Newsletter LinkedIn — cadencia quinzenal + tema + 1a edicao
18. Activity heatmap — 2 posts/semana + 10 comentarios estrategicos
19. Services page — Voices SKIP
20. Profile views — checklist palavras-chave
21. Social Selling Index (SSI) — baseline + meta 70+

REGRAS EPI-USE (NAO NEGOCIAVEL): PT-BR · Mencionar EPI-USE Voices + ERP.ngo em Sobre · Tom tecnico + humano · Mobile-first · Hook forte (sem "Hoje quero falar...") · Numero real ou [preencher: X] · Sem cliente nominal sem aprovacao Duda · Sem concorrente nominal.
`;

function buildPromptRedator(url) {
  return `Voce e o Profile Optimizer v3 do programa EPI-USE Voices (programa de influencia executiva da EPI-USE Brasil — maior consultoria SAP HCM/Payroll do Brasil, grupo groupelephant.com, 3.700+ pessoas em 40 paises, SAP Gold Partner).

MISSAO: analisar perfil LinkedIn (URL + screenshots) e gerar Kit v3 cobrindo TODAS as 21 skills.

${LINKEDIN_21_SKILLS}

URL: ${url}
[Analise as imagens em anexo]

SAIDA OBRIGATORIA — JSON puro:
{
  "nome": "string",
  "cargo_atual": "string",
  "empresa_atual": "string",
  "diagnostico_21_skills": [
    { "skill_num": 1, "skill_nome": "Foto de perfil", "status": "ok|alerta|critico", "observacao": "string", "acao": "string" }
  ],
  "headline_sugerida": "string (max 220 chars)",
  "url_sugerida": "string (apenas slug)",
  "sobre_texto": "string (PT-BR 1a pessoa, [preencher: ...] onde faltar, ate 2600 chars)",
  "cover_image_brief": "string (descricao banner 1584x396)",
  "featured_sugestoes": [{ "tipo": "post|artigo|pdf", "titulo": "string", "descricao_breve": "string" }],
  "experiencias_otimizadas": [{ "cargo": "string", "empresa": "string", "bullets_quantificados": ["string"] }],
  "skills_top3": ["string", "string", "string"],
  "skills_adicionar": ["string"],
  "skills_remover": ["string"],
  "recommendations_estrategia": {
    "pedir_de": ["string"],
    "oferecer_para": ["string"],
    "template_pedido_recommendation": "string"
  },
  "creator_mode": { "ativar": true, "justificativa": "string", "hashtags_pilar": ["#SAP"] },
  "newsletter": { "ativar": true, "tema": "string", "cadencia": "quinzenal", "edicao_1_titulo": "string" },
  "checklist_priorizado": [{ "item": "string", "prioridade": "urgente|normal|bonus", "skill_num_referencia": 1, "passo": "string" }],
  "proximos_passos_30dias": ["string"]
}

CRITICO: cobrir TODAS as 21 skills (numerar 1 a 21). Se nao aplicavel, status "ok" + obs "nao aplicavel - skip".`;
}

function buildPromptRevisor(kit) {
  return `Voce e o Revisor v3 do Profile Optimizer EPI-USE Voices.

KIT RECEBIDO:
${JSON.stringify(kit, null, 2)}

VALIDAR:
1. Headline <= 220 chars?
2. Sobre menciona EPI-USE Voices E ERP.ngo?
3. Sobre em 1a pessoa PT-BR?
4. Placeholder [preencher: ...] onde falta numero (nao inventou)?
5. Diagnostico cobre TODAS as 21 skills?
6. Checklist prioriza urgentes corretamente (foto/headline/sobre antes de Newsletter)?
7. Tom tecnico + humano?
8. Cita cliente nominalmente? (PROIBIDO)
9. Compara nominalmente com concorrente? (PROIBIDO)

SAIDA — JSON puro:
{
  "aprovado": true|false,
  "issues": [{ "campo": "string", "severidade": "alta|media|baixa", "problema": "string", "sugestao": "string" }],
  "score_qualidade": 0-100,
  "comentario_geral": "string"
}`;
}

async function callGroq({ messages, model, maxTokens = 4000, temperature = 0.6 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY ausente');

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, messages,
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' }
    })
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Groq ${resp.status}: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(text) {
  if (!text) throw new Error('Resposta vazia');
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON nao encontrado');
  return JSON.parse(match[0]);
}

// canonical: /voices/optimizer-v3 (sub-pagina do Voices)
router.get('/voices/optimizer-v3', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/optimizer-v3.html'));
});
// backward-compat: redirect top-level pra canonical
router.get('/optimizer-v3', (req, res) => res.redirect(301, '/voices/optimizer-v3'));

router.get('/api/voices/optimizer-v3/health', (req, res) => {
  res.json({
    ok: true,
    service: 'profile-optimizer-v3',
    motor: `Groq · ${MODEL_VISION} / ${MODEL_TEXT}`,
    groq_key_set: !!process.env.GROQ_API_KEY
  });
});
// backward-compat health
router.get('/api/optimizer-v3/health', (req, res) => res.redirect(301, '/api/voices/optimizer-v3/health'));

router.post('/api/voices/optimizer-v3/analisar', upload.array('screenshots', 5), async (req, res) => {
  const files = req.files || [];
  try {
    const { linkedin_url } = req.body;
    if (!linkedin_url) return res.status(400).json({ success: false, error: 'URL obrigatoria.' });
    if (!files.length) return res.status(400).json({ success: false, error: 'Envie ao menos 1 screenshot.' });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ success: false, error: 'GROQ_API_KEY ausente no Railway.' });

    const content = [];
    for (const f of files) {
      const b64 = fs.readFileSync(f.path).toString('base64');
      content.push({ type: 'image_url', image_url: { url: `data:${f.mimetype};base64,${b64}` } });
    }
    content.push({ type: 'text', text: buildPromptRedator(linkedin_url) });

    console.log('[opt-v3] Etapa 1: redator vision');
    const redatorRaw = await callGroq({
      messages: [{ role: 'user', content }],
      model: MODEL_VISION,
      maxTokens: 6000,
      temperature: 0.5
    });
    let kit;
    try { kit = parseJSON(redatorRaw); }
    catch (e) {
      console.error('[opt-v3] parse redator falhou:', e.message);
      throw new Error(`Redator JSON invalido: ${e.message}`);
    }

    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });

    let revisao = null;
    try {
      console.log('[opt-v3] Etapa 2: revisor texto');
      const revisorRaw = await callGroq({
        messages: [{ role: 'user', content: buildPromptRevisor(kit) }],
        model: MODEL_TEXT,
        maxTokens: 2000,
        temperature: 0.3
      });
      revisao = parseJSON(revisorRaw);
    } catch (e) {
      console.warn('[opt-v3] revisor falhou (nao-bloqueante):', e.message);
      revisao = { aprovado: null, issues: [], comentario_geral: `Revisor offline: ${e.message}` };
    }

    res.json({
      success: true,
      versao: '3.0.0',
      motor: `Groq · ${MODEL_VISION} -> ${MODEL_TEXT}`,
      etiqueta: '🤖 Gerado por IA (Groq Llama-Vision) — REVISAR com a Duda antes de publicar',
      kit, revisao
    });
  } catch (error) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
    console.error('[opt-v3] erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
