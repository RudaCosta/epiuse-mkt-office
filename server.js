// ── AMBIENTE ──────────────────────────────────────────────────────────────────
// Local Windows dev: carrega módulos e .env de fora do Google Drive
// Railway Linux: usa node_modules normais instalados pelo npm install
const localModules = 'C:/Users/Ruds/.epiuse-optimizer/node_modules';
const fs0 = require('fs');
const IS_LOCAL_DEV = process.platform === 'win32' && fs0.existsSync(localModules);

if (IS_LOCAL_DEV) {
  require('module').Module._nodeModulePaths = () => [localModules, 'node_modules'];
  const _dotenvParsed = require(localModules + '/dotenv').config({ path: 'C:/Users/Ruds/.epiuse-optimizer/.env' }).parsed || {};
  Object.keys(_dotenvParsed).forEach(k => { process.env[k] = _dotenvParsed[k]; });
}
// Railway: ANTHROPIC_API_KEY vem direto das env vars do projeto (sem .env)

const express   = IS_LOCAL_DEV ? require(localModules + '/express')            : require('express');
const multer    = IS_LOCAL_DEV ? require(localModules + '/multer')             : require('multer');
const Anthropic = IS_LOCAL_DEV ? require(localModules + '/@anthropic-ai/sdk')  : require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── ROTAS DO OFFICE ENGINE ────────────────────────────────────────────────────
const OPTIMIZER_PATH = path.join(__dirname, 'public/optimizer.html');
app.get('/optimizer', (req, res) => res.sendFile(OPTIMIZER_PATH));

if (IS_LOCAL_DEV) {
  // Local: / = Office Engine Game | /dashboard = War Room clássico | /hub = Marketing Hub
  const OFFICE_GAME_PATH = path.resolve('G:/Meu Drive/Claude MKT EUBR/dashboard-escritorio.html');
  const DASHBOARD_PATH   = path.resolve('G:/Meu Drive/Claude MKT EUBR/dashboard-classic.html');
  const MKT_HUB_PATH     = path.resolve('G:/Meu Drive/Claude MKT EUBR/Estudos/portal-mkt-hub-FINAL.html');
  const VERSIONS_DIR     = path.resolve('G:/Meu Drive/Claude MKT EUBR/_versoes-office');
  app.get('/',          (req, res) => res.sendFile(OFFICE_GAME_PATH));
  app.get('/game',      (req, res) => res.sendFile(OFFICE_GAME_PATH));
  app.get('/dashboard', (req, res) => res.sendFile(DASHBOARD_PATH));
  app.get('/hub',       (req, res) => res.sendFile(MKT_HUB_PATH));
  app.use('/_versoes-office', express.static(VERSIONS_DIR));
} else {
  // Railway: servimos os HTMLs do Office direto do public/
  const OFFICE_PROD    = path.join(__dirname, 'public/office.html');
  const DASHBOARD_PROD = path.join(__dirname, 'public/dashboard.html');
  const HUB_PROD       = path.join(__dirname, 'public/hub.html');
  app.get('/',          (req, res) => res.sendFile(OFFICE_PROD));
  app.get('/game',      (req, res) => res.sendFile(OFFICE_PROD));
  app.get('/dashboard', (req, res) => res.sendFile(DASHBOARD_PROD));
  app.get('/hub',       (req, res) => res.sendFile(HUB_PROD));
}

function buildPrompt(fields) {
  const {
    linkedin_url,
    nome,
    area_principal,
    anos_experiencia,
    resultado_1,
    resultado_2,
    resultado_3,
    diferencial_humano,
    publico_alvo,
    tom_voz,
    ssi_score,
    seguidores,
    data_entrada_epiuse,
    cargo_oficial,
    foto_oficial
  } = fields;

  const resultados = [resultado_1, resultado_2, resultado_3]
    .filter(Boolean)
    .map((r, i) => `  ${i + 1}. ${r}`)
    .join('\n');

  return `Você é o Profile Optimizer do programa EPI-USE Voices — programa de influência executiva da EPI-USE Brasil.

CONTEXTO DO PROGRAMA:
- EPI-USE Brasil (Razão social: EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA): maior consultoria SAP especializada em HCM/Payroll do Brasil; em evolução para EPI-USE 5.0 (Transformação Empresarial)
- Grupo: EPI-USE / groupelephant.com | 42+ anos de atuação | 10 grupos de marcas | 4.500+ profissionais | 40+ países | 2.000+ clientes empresariais | 1.800+ organizações com software licenciado | SAP Gold Partner
- Braços do grupo no Brasil: EPI-USE Brasil (consultoria SAP), EPI-USE Labs (P&D de IPs), Stratview (Analytics), Valcann (Cloud & Infra)
- LOBs: SAP HCM/SuccessFactors, SAP ERP/S4HANA (Clean Core + Reforma Tributária), SAP BTP, SAP Signavio, ServiceNow HRSD/ITSM, Analytics/Stratview
- IPs proprietários: TalenTools (acelerador de RH), PRISM (analytics/reporting)
- ERP.ngo: 1% da receita global destinada à conservação de elefantes e combate à pobreza rural na África (erp.ngo)
- Todos os participantes do EPI-USE Voices são embaixadores do ERP.ngo
- ATENÇÃO: Use SEMPRE "EPI-USE Brasil" por extenso — nunca apenas "EPI-USE", pois existem outras entidades do grupo globalmente

BANNER OFICIAL DA EPI-USE BRASIL (LINKEDIN):
- Link direto da imagem: https://epiusebr-my.sharepoint.com/:i:/g/personal/ti_brasil_epiuse_com_br/IQBWQpKomSTBRZ1VHGjafYUVAXA1AFQuNVFVdmaakKYPKRE?e=ntPEIx
- Pasta completa de assets: https://epiusebr-my.sharepoint.com/:f:/g/personal/ti_brasil_epiuse_com_br/IgCzGSd6PzslRICvk26vZY_fAaJ50os-DQG516n4lhIPBy0?e=P2DJQH

DADOS FORNECIDOS PELO USUÁRIO:
- URL LinkedIn: ${linkedin_url}
- Nome: ${nome || '(ver screenshot)'}
- Área principal: ${area_principal || '(ver screenshot)'}
- Anos de experiência: ${anos_experiencia || '(não informado)'}
- Cargo oficial na EPI-USE Brasil: ${cargo_oficial || '(não informado)'}
- Data de entrada na EPI-USE Brasil: ${data_entrada_epiuse || '(não informada)'}
- Resultados reais com números:
${resultados || '  (não informados — use placeholders)'}
- Diferencial humano (família, paixões pessoais, causas, mentoria): ${diferencial_humano || '(não informado)'}
- Público-alvo desejado: ${publico_alvo || '(não informado)'}
- Tom de voz preferido: ${tom_voz || 'equilibrado'}
- SSI Score atual: ${ssi_score || '(não medido)'}
- Seguidores atuais: ${seguidores || '(não informado)'}
- Foto oficial EPI-USE disponível: ${(foto_oficial === 'true' || foto_oficial === true) ? 'Sim — usar no perfil' : 'Não confirmado — sugerir tirar foto'}

MISSÃO:
Analisar o perfil LinkedIn (URL + screenshots) + dados fornecidos acima e gerar um Kit de Perfil LinkedIn personalizado e completo.

REGRAS OBRIGATÓRIAS:
- Tudo em Português do Brasil
- Seção "Sobre" SEMPRE em 1ª pessoa
- Mencionar EPI-USE Voices E ERP.ngo na seção Sobre
- Usar SEMPRE "EPI-USE Brasil" por extenso — NUNCA apenas "EPI-USE"
- Cargo sugerido deve incluir "EPI-USE Brasil" (ex: "Consultor SAP HCM | EPI-USE Brasil")
- Usar os resultados reais fornecidos — não inventar números
- Onde não há número real, usar placeholder: [preencher: ex. X% de redução]
- Headline: máximo 220 caracteres, área de expertise + empresa + diferencial
- Competências: priorizar tecnologias atuais (SAP BTP, Clean Core, S/4HANA, SuccessFactors) — remover versões legadas (SAP R/3, etc.)
- Tom deve seguir a preferência indicada: ${tom_voz || 'equilibrado'}
- Formatação mobile: parágrafos curtos, sem paredes de texto
- Seção Sobre: máximo 2.600 caracteres (limite LinkedIn)
- ERP.ngo DEVE ser sugerido como "Causas Sociais" no LinkedIn para este perfil
- Sempre gerar exatamente 5 Destaques Estratégicos (seção Featured do LinkedIn)

Retorne a análise em JSON estruturado. Retorne APENAS o JSON, sem texto antes ou depois:
{
  "nome": "string",
  "cargo_atual": "string",
  "empresa_atual": "EPI-USE Brasil",
  "diagnostico": {
    "pontos_positivos": ["string"],
    "problemas_encontrados": [
      { "elemento": "string", "situacao_atual": "string", "meta": "string", "urgencia": "alta|media|baixa" }
    ]
  },
  "headline_sugerida": "string",
  "url_sugerida": "string",
  "sobre_texto": "string (com [preencher: descrição] para placeholders)",
  "competencias": {
    "adicionar": ["string"],
    "remover": ["string"],
    "manter": ["string"]
  },
  "destaques": [
    { "numero": 1, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" },
    { "numero": 2, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" },
    { "numero": 3, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" },
    { "numero": 4, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" },
    { "numero": 5, "titulo": "string", "descricao": "string", "tipo": "artigo|projeto|conquista|curso|evento" }
  ],
  "ssi_diagnostico": {
    "nivel": "baixo|medio|bom|excelente",
    "observacoes": "string",
    "dicas": ["string (dica concreta de como melhorar o SSI)"]
  },
  "secao_fotos": {
    "foto_sugestao": "string (orientações concretas para a foto de perfil)",
    "imagens_perfil": ["string (sugestões de imagens de capa/kickoffs/eventos para usar no perfil)"]
  },
  "erp_ngo": {
    "passo_causas_sociais": "string (passo a passo: como adicionar ERP.ngo como Causa Social no LinkedIn)",
    "como_virar_embaixador": "string (orientações para se posicionar como embaixador ERP.ngo)"
  },
  "checklist": [
    { "item": "string", "prioridade": "urgente|normal|bonus", "passo": "string" }
  ],
  "proximos_passos": ["string"],
  "estrategia_idioma": {
    "orientacoes": ["string (dica prática sobre estratégia de idioma para este profissional)"],
    "instrucao_perfil_en": "string (passo a passo: como criar o perfil secundário em inglês no LinkedIn — LinkedIn → Eu → Ver perfil → Adicionar perfil em outro idioma)"
  },
  "linha_editorial": {
    "pilares": [
      { "percentual": "40%", "nome": "Thought Leadership", "exemplos": ["string (tema concreto personalizado para este Voice e sua área)"] },
      { "percentual": "30%", "nome": "Cases", "exemplos": ["string"] },
      { "percentual": "20%", "nome": "Pessoas", "exemplos": ["string"] },
      { "percentual": "10%", "nome": "Propósito", "exemplos": ["string"] }
    ],
    "calendario_4_semanas": [
      { "semana": 1, "post_1": "string (tema específico e personalizado para este Voice)", "post_2": "string" },
      { "semana": 2, "post_1": "string", "post_2": "string" },
      { "semana": 3, "post_1": "string", "post_2": "string" },
      { "semana": 4, "post_1": "string", "post_2": "string" }
    ],
    "nota_algoritmo": "string (dica importante: primeiras 4 semanas sem links externos no corpo do post — o algoritmo LinkedIn penaliza)"
  },
  "social_selling": {
    "perfis_para_alertas": ["string (perfil LinkedIn sugerido para este Voice seguir/comentar — ex: VP SAP Brasil, CIO de empresa-alvo)"],
    "exemplo_comentario": "string (modelo de comentário de alto impacto contextualizado para a área deste Voice — mencionar EPI-USE Brasil e dado concreto)",
    "dica_30_min": "string (instrução sobre a tática: nos primeiros 30 min após publicação de um líder do nicho, comentar com insight de valor)"
  },
  "recomendacoes": {
    "meta": "8 a 12 recomendações ativas",
    "perfis_prioritarios": ["string (tipo de perfil a solicitar recomendação — ex: cliente atual, parceiro SAP, gestor interno)"],
    "template_mensagem": "string (mensagem personalizada para solicitar recomendação — pronta para copiar e enviar no LinkedIn — mencionar contexto específico do projeto ou parceria)"
  },
  "kpis": {
    "instrucoes_baseline": "string (instrução para registrar o baseline ANTES de começar — incluir link https://www.linkedin.com/sales/ssi para SSI)",
    "metas_90_dias": [
      { "kpi": "SSI Score", "meta": "> 70" },
      { "kpi": "Visualizações de perfil/semana", "meta": "+150%" },
      { "kpi": "Seguidores", "meta": "+30%" },
      { "kpi": "Convites recebidos/semana", "meta": "+25%" },
      { "kpi": "Mensagens diretas recebidas/semana", "meta": "+20%" },
      { "kpi": "Posts publicados (90 dias)", "meta": "24 (2x/semana)" },
      { "kpi": "Impressões médias por post", "meta": "baseline + 100%" }
    ]
  }
}`;
}

app.post('/api/analisar-perfil', upload.array('screenshots', 5), async (req, res) => {
  const files = req.files || [];

  try {
    const {
      linkedin_url,
      nome,
      area_principal,
      anos_experiencia,
      resultado_1,
      resultado_2,
      resultado_3,
      diferencial_humano,
      publico_alvo,
      tom_voz,
      ssi_score,
      seguidores,
      data_entrada_epiuse,
      cargo_oficial,
      foto_oficial
    } = req.body;

    if (!linkedin_url) {
      return res.status(400).json({ success: false, error: 'URL do LinkedIn é obrigatória.' });
    }

    const content = [];

    for (const file of files) {
      const imageData = fs.readFileSync(file.path);
      const base64 = imageData.toString('base64');
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: file.mimetype, data: base64 }
      });
    }

    content.push({
      type: 'text',
      text: buildPrompt({
        linkedin_url, nome, area_principal, anos_experiencia,
        resultado_1, resultado_2, resultado_3,
        diferencial_humano, publico_alvo, tom_voz,
        ssi_score, seguidores,
        data_entrada_epiuse, cargo_oficial, foto_oficial
      })
    });

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,   // aumentado: JSON completo pode ter 5-6k tokens
      messages: [{ role: 'user', content }]
    });

    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });

    // Extrair JSON — remove blocos markdown se Claude os incluir
    let rawText = response.content[0].text;
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: 'A IA não retornou um JSON válido. Tente novamente.' });
    }

    let kit;
    try {
      kit = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message);
      return res.status(500).json({ success: false, error: 'Resposta da IA incompleta (JSON truncado). Tente novamente ou reduza o número de screenshots.' });
    }
    res.json({ success: true, kit });

  } catch (error) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
    console.error('Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎙️  EPI-USE Voices — Profile Optimizer`);
  console.log(`🚀  http://localhost:${PORT}\n`);
});
