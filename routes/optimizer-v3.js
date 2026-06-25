// routes/optimizer-v3.js
// Profile Optimizer v3 — Groq Vision + 21 LinkedIn Skills
// Pipeline: REDATOR (vision/texto) -> REVISOR (texto), mecanica raccoon
// + SSI extraction from screenshot + write to voices.json history
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
const VOICES_JSON = path.join(__dirname, '../public/api/voices.json');

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

function buildPromptRedator(url, transcricao) {
  return `Voce e o Profile Optimizer v3 do programa EPI-USE Voices (programa de influencia executiva da EPI-USE Brasil — maior consultoria SAP HCM/Payroll do Brasil, grupo groupelephant.com, 3.700+ pessoas em 40 paises, SAP Gold Partner).

MISSAO: gerar Kit v3 cobrindo TODAS as 21 skills, baseado nas imagens do perfil${transcricao ? ' E na transcricao da entrevista com o Voice abaixo' : ''}.

${LINKEDIN_21_SKILLS}

URL: ${url}
${transcricao ? `\n--- TRANSCRICAO DA ENTREVISTA (use pra capturar tom de voz, lado humano, resultados quantitativos):\n${transcricao.slice(0, 12000)}\n---\n` : ''}
[Analise as imagens em anexo (se houver)]

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
4. Placeholder [preencher: ...] onde falta numero?
5. Diagnostico cobre TODAS as 21 skills?
6. Checklist prioriza urgentes corretamente?
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

function buildPromptSsi() {
  return `Voce e leitor de Social Selling Index do LinkedIn. A imagem em anexo e um print da pagina https://linkedin.com/sales/ssi.

EXTRAIR (numeros visiveis na imagem):
- ssi_total: 0-100 (numero grande de destaque)
- componentes (cada 0-25):
  - marca: "Estabelecer sua marca profissional"
  - pessoas: "Encontrar as pessoas certas"
  - insights: "Interagir com insights"
  - relacao: "Construir relacionamentos"
- data: data da medicao se visivel no print (formato YYYY-MM-DD); se nao visivel, retornar null

SAIDA — JSON puro:
{
  "ssi_total": 0-100,
  "componentes": { "marca": 0-25, "pessoas": 0-25, "insights": 0-25, "relacao": 0-25 },
  "data_print": "YYYY-MM-DD" ou null,
  "confianca": "alta|media|baixa"
}

Se nao conseguir ler o print, retorne { "ssi_total": null, "erro": "descricao do problema" }.`;
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

// ── PAGES ─────────────────────────────────────────────────────────────────────
router.get('/voices/optimizer-v3', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/optimizer-v3.html'));
});
router.get('/optimizer-v3', (req, res) => res.redirect(301, '/voices/optimizer-v3'));

router.get('/api/voices/optimizer-v3/health', (req, res) => {
  res.json({
    ok: true,
    service: 'profile-optimizer-v3',
    motor: `Groq · ${MODEL_VISION} / ${MODEL_TEXT}`,
    groq_key_set: !!process.env.GROQ_API_KEY,
    voices_json_ok: fs.existsSync(VOICES_JSON)
  });
});
router.get('/api/optimizer-v3/health', (req, res) => res.redirect(301, '/api/voices/optimizer-v3/health'));

// ── ANALISAR ──────────────────────────────────────────────────────────────────
router.post('/api/voices/optimizer-v3/analisar', upload.array('screenshots', 5), async (req, res) => {
  const files = req.files || [];
  try {
    const { linkedin_url, transcricao, voice_slug } = req.body;
    if (!linkedin_url) return res.status(400).json({ success: false, error: 'URL obrigatoria.' });
    if (!files.length && !(transcricao && transcricao.trim().length >= 100)) {
      return res.status(400).json({ success: false, error: 'Envie screenshots OU transcricao (>=100 chars).' });
    }
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ success: false, error: 'GROQ_API_KEY ausente.' });

    const hasImages = files.length > 0;
    const content = [];
    if (hasImages) {
      for (const f of files) {
        const b64 = fs.readFileSync(f.path).toString('base64');
        content.push({ type: 'image_url', image_url: { url: `data:${f.mimetype};base64,${b64}` } });
      }
    }
    content.push({ type: 'text', text: buildPromptRedator(linkedin_url, transcricao) });

    // Sem imagens: usa modelo de texto. Com imagens: vision.
    const redatorModel = hasImages ? MODEL_VISION : MODEL_TEXT;
    console.log(`[opt-v3] Etapa 1: redator (${redatorModel}) imgs=${files.length} trans=${(transcricao||'').length}`);
    const redatorRaw = await callGroq({
      messages: [{ role: 'user', content }],
      model: redatorModel,
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
      console.warn('[opt-v3] revisor falhou:', e.message);
      revisao = { aprovado: null, issues: [], comentario_geral: `Revisor offline: ${e.message}` };
    }

    res.json({
      success: true,
      versao: '3.1.0',
      motor: `Groq · ${redatorModel} -> ${MODEL_TEXT}`,
      etiqueta: '🤖 Gerado por IA (Groq) — REVISAR com a Duda antes de publicar',
      kit, revisao,
      input_usado: { screenshots: files.length, transcricao_chars: (transcricao||'').length, voice_slug: voice_slug || null }
    });
  } catch (error) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
    console.error('[opt-v3] erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── SSI EXTRACT ───────────────────────────────────────────────────────────────
router.post('/api/voices/optimizer-v3/ssi', upload.single('screenshot'), async (req, res) => {
  const f = req.file;
  try {
    if (!f) return res.status(400).json({ success: false, error: 'screenshot obrigatorio.' });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ success: false, error: 'GROQ_API_KEY ausente.' });

    const voiceSlug = String(req.body?.voice_slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 60);

    const b64 = fs.readFileSync(f.path).toString('base64');
    const content = [
      { type: 'image_url', image_url: { url: `data:${f.mimetype};base64,${b64}` } },
      { type: 'text', text: buildPromptSsi() }
    ];
    console.log('[opt-v3] SSI vision extract');
    const raw = await callGroq({
      messages: [{ role: 'user', content }],
      model: MODEL_VISION,
      maxTokens: 800,
      temperature: 0.1
    });

    try { fs.unlinkSync(f.path); } catch (_) {}

    let parsed;
    try { parsed = parseJSON(raw); } catch (e) { throw new Error(`SSI JSON invalido: ${e.message}`); }
    if (parsed.erro) return res.status(422).json({ success: false, error: 'Nao foi possivel ler o print: ' + parsed.erro });
    const ssi = parseInt(parsed.ssi_total, 10);
    if (isNaN(ssi) || ssi < 0 || ssi > 100) return res.status(422).json({ success: false, error: 'SSI extraido invalido (esperado 0-100), recebeu: ' + parsed.ssi_total });

    const today = parsed.data_print || new Date().toISOString().slice(0, 10);
    const comp = parsed.componentes || {};
    const entry = {
      data: today,
      ssi,
      marca: comp.marca ?? null,
      pessoas: comp.pessoas ?? null,
      insights: comp.insights ?? null,
      relacao: comp.relacao ?? null,
      nota: 'extraido via Profile Optimizer v3 (Groq Vision)',
      confianca: parsed.confianca || 'media'
    };

    let saved = false, historico = [], delta = null, voiceName = null;
    if (voiceSlug && fs.existsSync(VOICES_JSON)) {
      try {
        const data = JSON.parse(fs.readFileSync(VOICES_JSON, 'utf8'));
        const v = (data.voices || []).find(x => x.id === voiceSlug || x.slug === voiceSlug);
        if (v) {
          v.ssi_historico = v.ssi_historico || [];
          // delta vs ultima medicao
          const prev = v.ssi_historico[v.ssi_historico.length - 1];
          if (prev && prev.ssi != null) delta = ssi - prev.ssi;
          v.ssi_historico.push(entry);
          if (v.ssi_baseline == null) v.ssi_baseline = ssi;
          v.ssi_atual = ssi;
          v.proxima_medicao_ssi = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
          fs.writeFileSync(VOICES_JSON, JSON.stringify(data, null, 2), 'utf8');
          saved = true;
          historico = v.ssi_historico;
          voiceName = v.nome || voiceSlug;
        }
      } catch (e) { console.warn('[opt-v3] SSI save falhou:', e.message); }
    }

    res.json({
      success: true,
      ssi_total: ssi,
      componentes: comp,
      data: today,
      delta,
      saved,
      voice_slug: voiceSlug || null,
      voice_name: voiceName,
      historico: historico.map(h => ({ data: h.data, ssi_total: h.ssi, marca: h.marca, pessoas: h.pessoas, insights: h.insights, relacao: h.relacao })),
      etiqueta: '🤖 Extraido por IA (Groq Vision) — confirmar numero'
    });
  } catch (error) {
    try { if (f) fs.unlinkSync(f.path); } catch (_) {}
    console.error('[opt-v3] SSI erro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
