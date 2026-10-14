// ════════════════════════════════════════════════════════════════════════════
// routes/fontes.js — Central de Fontes (Módulo 36)
//
// Pedido do Rudá (14/out/2026): "todas as planilhas, MCPs, APIs, integrações,
// calendários — tudo que for de fora e precise beber de alguma fonte — quero que
// você atualize e bole um meio de ser sempre atualizado."
//
// Três peças:
//  1. REGISTRO — toda fonte de fora num lugar só: dona, telas que usam, como
//     atualiza, de quanto em quanto tempo e quando atualizou DE VERDADE (lido do
//     próprio dado, nunca digitado). scripts/tests/fontes-cobertura.js falha se
//     aparecer script de sync ou JSON em public/api/ que não esteja aqui.
//  2. MOTOR — no servidor, baixa as planilhas da nuvem (OneDrive/SharePoint pelo
//     Graph, com o mesmo app do Azure do SSO; Google Sheets pelo link) e roda o
//     MESMO parser que roda no PC. Planilha igual à última (mesmo hash) não é
//     reprocessada. Integrações por API (Zoho) rodam igual, com a chave no Railway.
//     Assim nada depende do PC do Rudá ligado.
//  3. COBRANÇA — /fontes mostra a saúde de cada uma; o que atrasa ou quebra vira
//     alerta pra área dona (Módulo 34); fonte curada à mão ganha lembrete de revisão.
//
// API: GET /api/fontes · POST /api/fontes/:id/atualizar · POST /api/fontes/:id/revisado
//      PUT /api/fontes/:id/config (só super admin: link da planilha)
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const { db, IS_LOCAL_DEV, DB_DIR, PORT, ACTIVE_EDITOR_TOKEN, requireAuth } = require('../server-context');

const router = express.Router();
const ROOT = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'public/api');
const ARQ_DIR = path.join(DB_DIR, 'fontes');
const HOUR = 36e5, DAY = 24 * HOUR;

// ── Persistência (app_blobs, a mesma KV do resto do Office) ─────────────────
db.exec(`CREATE TABLE IF NOT EXISTS app_blobs (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT (datetime('now')))`);
function blobLinha(k) {
  try { return db.prepare('SELECT value, updated_at FROM app_blobs WHERE key = ?').get(k) || null; } catch (_) { return null; }
}
function lerBlob(k) {
  const r = blobLinha(k);
  try { return r && r.value ? JSON.parse(r.value) : null; } catch (_) { return null; }
}
function gravarBlob(k, v) {
  db.prepare(`INSERT INTO app_blobs (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .run(k, typeof v === 'string' ? v : JSON.stringify(v));
}
const estadoDe = (id) => lerBlob('fonte.' + id) || {};
const salvarEstado = (id, st) => gravarBlob('fonte.' + id, st);
const configDe = (id) => (lerBlob('fontes.config') || {})[id] || {};
const revisaoDe = (id) => (lerBlob('fontes.revisoes') || {})[id] || null;

// ── Datas ───────────────────────────────────────────────────────────────────
// Aceita ISO, "AAAA-MM-DD" (meio-dia UTC) e "AAAA-MM-DD HH:MM:SS" (UTC do SQLite).
function ms(v) {
  if (!v) return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const t = /^\d{4}-\d{2}-\d{2}$/.test(s) ? Date.parse(s + 'T12:00:00Z')
          : /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? Date.parse(s.replace(' ', 'T') + 'Z')
          : Date.parse(s);
  return isNaN(t) ? null : t;
}
const agoraISO = () => new Date().toISOString();
const isoOuNull = (t) => (t ? new Date(t).toISOString() : null);

// ── De onde sai a "última atualização" de cada fonte ───────────────────────
const _jsonCache = {};
function lerApi(arquivo) {
  const f = path.join(API_DIR, arquivo);
  try {
    const m = fs.statSync(f).mtimeMs;
    if (!_jsonCache[arquivo] || _jsonCache[arquivo].m !== m) _jsonCache[arquivo] = { m, d: JSON.parse(fs.readFileSync(f, 'utf8')) };
    return _jsonCache[arquivo].d;
  } catch (_) { return null; }
}
// Primeiro campo de data preenchido do JSON (aceita caminho "a.b").
const doJson = (arquivo, ...campos) => () => {
  const d = lerApi(arquivo);
  for (const c of campos) {
    const t = ms(c.split('.').reduce((o, k) => (o == null ? o : o[k]), d));
    if (t) return t;
  }
  return null;
};
const doSql = (sql) => () => {
  try { const r = db.prepare(sql).get(); return r && r.s ? ms(r.s) : null; } catch (_) { return null; }
};

// ── Ações registradas por quem mora no server.js (GA4/RD diário) ───────────
const ACOES = {};
function registrarAcao(nome, fn) { ACOES[nome] = fn; }

// Saúde gravada pelo refresh diário do server.js (mesma chave do Módulo 34)
function saudeBlob(fonte) {
  const s = lerBlob('saude.' + fonte) || {};
  const ok = ms(s.ultima_ok_ts), er = ms(s.erro_ts);
  return { ok_ts: ok, erro: er && (!ok || er > ok) ? s.erro || 'erro' : null };
}

// Planilhas do Marketing moram no OneDrive do Rudá (a pasta MARKETING sincroniza
// no PC dele). "onedrive:/caminho" = esse OneDrive; "onedrive:fulano@x:/caminho"
// aponta outro. Se a pasta for um atalho de pasta compartilhada, o motor resolve.
const UPN = () => process.env.FONTES_ONEDRIVE_UPN
  || String(process.env.SUPER_ADMIN_EMAILS || 'ruda.costa@epiuse.com.br').split(',')[0].trim();
const od = (p) => 'onedrive:' + p;
const ZOHO = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'];

// ════════════════════════════════════════════════════════════════════════════
// REGISTRO
//  modo: 'servidor' (integração com motor próprio em outro módulo) · 'motor'
//  (este arquivo baixa/roda) · 'pc' (tarefa agendada no PC do Rudá) · 'manual'
//  (curada à mão, com lembrete de revisão) · 'pendente' (ainda não integrada)
//  sla_h: a partir daqui está atrasada · revisar_dias: idem pra curadas à mão
//  regraPropria: alerta dedicado no Módulo 34 (aqui não duplica)
//  scripts/arquivos: o que a fonte usa/gera (base do teste de cobertura)
// ════════════════════════════════════════════════════════════════════════════
const FONTES = [
  // ── Integrações por API ──────────────────────────────────────────────────
  {
    id: 'apollo', nome: 'Apollo — outbound', ic: '📨', tipo: 'API', modo: 'servidor',
    areas: ['pipeline'], dona: 'Marlison (Pipeline)', telas: ['/area/pipeline', '/relatorio', '/metas-fy27'],
    sla_h: 26, regraPropria: 'fonte.apollo',
    como: 'API do Apollo: o servidor busca no boot e a cada 6h.',
    scripts: ['scripts/integrations/apollo_pipeline_sync.js'],
    estado() {
      const s = require('./area-pipeline').apolloStatusAtual();
      return { falta: s.status === 'sem-chave' ? 'Falta APOLLO_API_KEY no Railway.' : null,
               erro: s.status === 'erro' ? s.erro : null, ok_ts: ms(s.ultima_sync_ts) };
    },
    acao: () => require('./area-pipeline').runRefresh('manual'),
  },
  {
    id: 'ga4', nome: 'Google Analytics 4 — site', ic: '📈', tipo: 'API', modo: 'servidor',
    areas: ['intelligence'], dona: 'Bruna (Intelligence)', telas: ['/relatorio', '/metas-fy27'],
    sla_h: 50, regraPropria: 'fonte.ga4',
    como: 'GA4 Data API: o servidor busca o mês a cada 12h e o dia a cada 24h.',
    scripts: ['scripts/integrations/ga4_fetch.js', 'scripts/integrations/ga4_oauth_setup.js', 'scripts/integrations/ga4_probe.js'],
    arquivos: ['ga4-snapshot.json'],
    estado() {
      if (!process.env.GA4_PROPERTY_ID) return { falta: 'Falta GA4_PROPERTY_ID (e a credencial do Google) no Railway.' };
      const s = saudeBlob('ga4');
      return { erro: s.erro, ok_ts: s.ok_ts };
    },
    acao: () => (ACOES['ga4-rd'] ? ACOES['ga4-rd']() : null),
  },
  {
    id: 'rd', nome: 'RD Station — e-mail marketing e leads', ic: '✉️', tipo: 'API', modo: 'servidor',
    areas: ['intelligence'], dona: 'Bruna (Intelligence)', telas: ['/relatorio'],
    sla_h: 50, regraPropria: 'fonte.rd',
    como: 'API do RD Station: o servidor busca a cada 24h e grava uma foto por dia.',
    scripts: ['scripts/integrations/rd_fetch.js', 'scripts/sync/sync_rd_station.js'],
    arquivos: ['rd-snapshot.json', 'rd-canais.json'],
    estado() {
      if (!process.env.RD_REFRESH_TOKEN) return { falta: 'Falta RD_REFRESH_TOKEN no Railway.' };
      const s = saudeBlob('rd');
      return { erro: s.erro, ok_ts: s.ok_ts };
    },
    acao: () => (ACOES['ga4-rd'] ? ACOES['ga4-rd']() : null),
  },
  {
    id: 'zoho-deals', nome: 'Zoho CRM — oportunidades do Marketing e do SDR', ic: '💼', tipo: 'API', modo: 'motor',
    areas: ['intelligence', 'pipeline'], dona: 'Bruna (Intelligence)', telas: ['/relatorio', '/inbound/zoho-pipeline'],
    sla_h: 30, como: 'API do Zoho (COQL): o servidor busca a cada 12h.',
    motor: { tipo: 'api', requer: ZOHO, cadencia_h: 12, cmds: [['node', 'scripts/sync/sync_zoho_deals.js']] },
    ultima: doSql('SELECT MAX(synced_at) AS s FROM zoho_deals'),
    scripts: ['scripts/sync/sync_zoho_deals.js'],
  },
  {
    id: 'zoho-leads', nome: 'Zoho CRM — base de leads e kanban do SDR', ic: '🧲', tipo: 'API', modo: 'motor',
    areas: ['intelligence', 'pipeline'], dona: 'Bruna (Intelligence)', telas: ['/', '/area/intelligence'],
    sla_h: 30, como: 'API do Zoho (COQL agregado): o servidor busca a cada 12h.',
    motor: { tipo: 'api', requer: ZOHO, cadencia_h: 12, cmds: [['node', 'scripts/sync/sync_zoho_leads.js', '--api']], persistir: ['zoho-leads-snapshot.json'] },
    ultima: doJson('zoho-leads-snapshot.json', '_meta.gerado_em_ts', '_meta.gerado_em'),
    scripts: ['scripts/sync/sync_zoho_leads.js'], arquivos: ['zoho-leads-snapshot.json'],
  },

  // ── Planilhas na nuvem (o servidor baixa e roda o parser do PC) ──────────
  {
    id: 'editorial', nome: 'Calendário editorial (planilha do Marketing)', ic: '🗓️', tipo: 'Planilha', modo: 'servidor',
    areas: ['brand', 'conteudo', 'intelligence'], dona: 'Duda (Brand)', telas: ['/editorial', '/area/brand', '/relatorio'],
    sla_h: 26, regraPropria: 'fonte.calendario',
    como: 'O servidor lê a planilha no OneDrive (Graph) no boot e a cada 6h.',
    scripts: ['scripts/sync/sync_calendario_editorial.js', 'scripts/integrations/graph_fetch.js'],
    estado() {
      const s = require('./editorial').autoStatus();
      if (!s.ativo) return { falta: 'Leitura automática desligada (sem AZURE_* ou EDITORIAL_AUTO=0).' };
      return { erro: s.status === 'erro' ? s.erro : null, ok_ts: ms(s.ultima_ok_ts) };
    },
    acao: () => require('./editorial').autoRoda('manual'),
  },
  {
    id: 'cases', nome: 'Cases de clientes (controle do CS)', ic: '🏆', tipo: 'Planilha', modo: 'motor',
    areas: ['brand'], dona: 'Roberto (CS) · Duda', telas: ['/cases', '/area/brand', '/relatorio'],
    sla_h: 36, regraPropria: 'fonte.cases',
    como: 'O servidor baixa a planilha do OneDrive a cada 6h e importa os cases.',
    motor: {
      tipo: 'planilha', cadencia_h: 6,
      locais: [
        od('/MARKETING/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referência Empresas Transformadoras 2025.xlsx'),
        od('/MARKETING/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referencia Empresas Transformadoras 2025.xlsx'),
      ],
      cmds: [['node', 'scripts/sync/sync_cases_roberto.js']], postar: '/api/cases/sync',
    },
    ultima: doSql('SELECT MAX(synced_at) AS s FROM cs_clientes'),
    scripts: ['scripts/sync/sync_cases_roberto.js', 'scripts/sync/sync_cases_roberto.py'],
  },
  {
    id: 'calendario-duda', nome: 'Calendário de conteúdo da Duda (Inbound)', ic: '📅', tipo: 'Planilha', modo: 'motor',
    areas: ['brand'], dona: 'Duda (Brand)', telas: ['/inbound/calendar', '/'],
    sla_h: 36, como: 'O servidor baixa a planilha do OneDrive a cada 6h e atualiza a agenda.',
    motor: {
      tipo: 'planilha', cadencia_h: 6,
      locais: [od('/MARKETING/Inbound/Conteúdo/CALENDÁRIO EDITORIAL EPI-USE (1).xlsx')],
      cmds: [['node', 'scripts/sync/sync_calendario_duda.js']],
    },
    ultima: doSql("SELECT MAX(synced_at) AS s FROM editorial_calendar WHERE fonte = 'planilha-duda'"),
    scripts: ['scripts/sync/sync_calendario_duda.js', 'scripts/sync/raccoon_to_xlsx.py'],
  },
  {
    id: 'redatoria', nome: 'Cronograma da Redatoria (Google Sheets)', ic: '✍️', tipo: 'Planilha', modo: 'motor',
    areas: ['conteudo'], dona: 'Lisiane (Redatoria)', telas: ['/inbound/calendar', '/content-pipeline'],
    sla_h: 36, como: 'O servidor baixa a planilha do Google pelo link a cada 6h e atualiza a agenda.',
    motor: {
      tipo: 'planilha', cadencia_h: 6,
      locais: ['https://docs.google.com/spreadsheets/d/1KfnsRY_gDTSLx3w-SDvFuJtIzkW6kMgNfbsYt_EJ2uM/edit'],
      cmds: [['node', 'scripts/sync/sync_redatoria_to_calendar.js']],
    },
    ultima: doSql("SELECT MAX(synced_at) AS s FROM editorial_calendar WHERE fonte = 'redatoria'"),
    scripts: ['scripts/sync/sync_redatoria_to_calendar.js', 'scripts/sync/sync_cronograma_redatoria.js'],
  },
  {
    id: 'eventos', nome: 'Eventos EPI-USE Brasil (planilha de eventos)', ic: '🎪', tipo: 'Planilha', modo: 'motor',
    areas: ['eventos'], dona: 'Gabrielle (Field Marketing)', telas: ['/field-marketing', '/area/eventos', '/hub'],
    sla_h: 36, como: 'O servidor baixa a planilha do OneDrive a cada 6h e refaz a camada Brasil do calendário.',
    motor: {
      tipo: 'planilha', cadencia_h: 6,
      locais: [od('/MARKETING/Planejamento/2026/EPI-USE Brasil 2026 - Eventos.xlsx')],
      cmds: [['python', 'scripts/sync/sync_eventos.py', '--apply']], persistir: ['events.json'],
    },
    ultima: doJson('events.json', 'atualizado_em'),
    scripts: ['scripts/sync/sync_eventos.py'], arquivos: ['events.json'],
  },
  {
    id: 'artigos', nome: 'Base de artigos do blog', ic: '📰', tipo: 'Planilha', modo: 'motor',
    areas: ['conteudo', 'growth'], dona: 'Lisiane (Redatoria)', telas: ['/artigos', '/jornadas', '/hub'],
    sla_h: 45 * 24, como: 'O servidor baixa a planilha do OneDrive 1x por dia, refaz a base e recalcula SEO/GEO.',
    motor: {
      tipo: 'planilha', cadencia_h: 24,
      locais: [od('/MARKETING/Projetos/EPI-USE Voices/estudo/Conteudos Blog EUBR 2026 (via manus).xlsx')],
      cmds: [['python', 'scripts/sync/sync_artigos_blog.py'], ['python', 'scripts/sync/build_artigos_scores.py', '--apply']],
      persistir: ['artigos.json'],
    },
    ultima: doJson('artigos.json', 'gerado_em'),
    scripts: ['scripts/sync/sync_artigos_blog.py', 'scripts/sync/build_artigos_scores.py'], arquivos: ['artigos.json'],
  },
  {
    id: 'linkedin-rotina', nome: 'LinkedIn da empresa — rotina diária (seguidores e posts)', ic: '🔗', tipo: 'Planilha', modo: 'motor',
    areas: ['growth', 'intelligence'], dona: 'Gui (Growth)', telas: ['/area/growth', '/relatorio'],
    sla_h: 48, como: 'A rotina do Cowork grava a planilha; com o link colado, o servidor lê a cada 6h.',
    motor: {
      tipo: 'planilha', cadencia_h: 6, locais: [],
      cmds: [['python', 'scripts/integrations/linkedin_routine.py']], persistir: ['linkedin-routine.json'],
    },
    ultima: doJson('linkedin-routine.json', 'atualizado_em'),
    scripts: ['scripts/integrations/linkedin_routine.py'], arquivos: ['linkedin-routine.json'],
  },
  {
    id: 'sap4me', nome: 'Clientes SAP for Me (Brasil + global)', ic: '🌎', tipo: 'Planilha', modo: 'motor',
    areas: ['pipeline', 'brand'], dona: 'Roberto (CS)', telas: ['/clientes-sap-4me', '/relatorio'],
    sla_h: 45 * 24, como: 'Exportação do portal SAP for Me; com o link colado, o servidor lê 1x por dia.',
    motor: {
      tipo: 'planilha', cadencia_h: 24, locais: [],
      cmds: [['node', 'scripts/sync/sync_clientes_sap_4me.js', '--target', 'local']],
    },
    ultima: doSql('SELECT MAX(synced_at) AS s FROM clientes_sap_4me'),
    scripts: ['scripts/sync/sync_clientes_sap_4me.js'],
  },
  {
    id: 'metas', nome: 'Metas da equipe RevOps', ic: '🎯', tipo: 'Planilha', modo: 'motor',
    areas: ['time'], dona: 'Rudá', telas: ['/metas-fy27', '/metas'],
    sla_h: 90 * 24, como: 'Planilha de metas por pessoa; com o link colado, o servidor lê 1x por dia.',
    motor: {
      tipo: 'planilha', cadencia_h: 24, locais: [],
      cmds: [['python', 'scripts/sync/build_metas_pessoas.py', '--apply']], persistir: ['metas-fy26.json'],
    },
    ultima: doJson('metas-fy26.json', 'gerado_em'),
    scripts: ['scripts/sync/build_metas_pessoas.py', 'scripts/sync/sync_metas_fy26.py'], arquivos: ['metas-fy26.json'],
  },

  // ── Ainda no PC ──────────────────────────────────────────────────────────
  {
    id: 'linkedin-historico', nome: 'LinkedIn — histórico de seguidores e reports mensais', ic: '📊', tipo: 'Planilha', modo: 'pc',
    areas: ['growth', 'intelligence'], dona: 'Gui (Growth)', telas: ['/relatorio', '/metas'],
    sla_h: 35 * 24,
    como: 'Lê o xls de seguidores e os 13 PPTs dos reports no PC (tarefa EPI-USE-Office-LinkedIn-Sync, 08:30). Muitos arquivos: fica no PC.',
    ultima: doJson('linkedin-historical.json', 'gerado_em'),
    scripts: ['scripts/sync/sync_linkedin_historical.py'], arquivos: ['linkedin-historical.json'],
  },

  // ── Curadas à mão (o Office lembra a dona de revisar) ─────────────────────
  {
    id: 'eventos-latam', nome: 'Calendário LATAM de marketing (SharePoint)', ic: '🌎', tipo: 'Calendário', modo: 'manual',
    areas: ['eventos'], dona: 'Gabrielle (Field Marketing)', telas: ['/field-marketing', '/hub'],
    revisar_dias: 30, como: 'Camada LATAM do calendário, copiada do calendário oficial do grupo.',
  },
  {
    id: 'dev-funds', nome: 'Development Funds (portal SAP PartnerEdge)', ic: '💰', tipo: 'Portal', modo: 'manual',
    areas: ['eventos'], dona: 'Gabrielle (Field Marketing)', telas: ['/development-funds'],
    revisar_dias: 30, como: 'Espelho manual do portal da SAP (propostas e pedidos de MDF).',
    ultima: doJson('development-funds.json', 'atualizado_em'), arquivos: ['development-funds.json'],
  },
  {
    id: 'deadlines', nome: 'Prazos da SAP (MDF, treinamentos)', ic: '⏰', tipo: 'E-mail', modo: 'manual',
    areas: ['eventos'], dona: 'Gabrielle (Field Marketing)', telas: ['/inbound/calendar', '/war-room'],
    revisar_dias: 60, como: 'Datas que chegam por e-mail da SAP, lançadas à mão.',
    ultima: doJson('deadlines-2026.json', 'atualizado_em'), arquivos: ['deadlines-2026.json'],
  },
  {
    id: 'voices', nome: 'Programa EPI-USE Voices (cadastro e SSI)', ic: '🎙️', tipo: 'Cadastro', modo: 'manual',
    areas: ['brand'], dona: 'Duda (Brand)', telas: ['/voices', '/hub', '/area/brand'],
    revisar_dias: 30, como: 'Cadastro do programa; Voices aprovados por inscrição entram sozinhos.',
    ultima: doSql('SELECT MAX(created_at) AS s FROM voices_publicados'),
    scripts: ['scripts/sync/log_voice_ssi.js'], arquivos: ['voices.json'],
  },
  {
    id: 'time', nome: 'Time de Marketing (pessoas, áreas, aniversários)', ic: '👥', tipo: 'Cadastro', modo: 'manual',
    areas: ['time'], dona: 'Rudá', telas: ['/', '/hub', '/cafezinho'],
    revisar_dias: 90, como: 'Editado à mão a cada entrada ou saída de pessoa.',
    ultima: doJson('team.json', 'atualizado_em'), arquivos: ['team.json'],
  },
  {
    id: 'campanhas', nome: 'Campanhas ativas', ic: '📣', tipo: 'Cadastro', modo: 'manual',
    areas: ['growth'], dona: 'Gui (Growth)', telas: ['/hub', '/campanhas'],
    revisar_dias: 30, como: 'Lista curada das campanhas no ar.',
    ultima: doJson('campanhas-ativas.json', 'atualizado_em'), arquivos: ['campanhas-ativas.json', 'campanha-classificacao.json'],
  },
  {
    id: 'datas-especiais', nome: 'Datas especiais do ano', ic: '🎉', tipo: 'Calendário', modo: 'manual',
    areas: ['conteudo'], dona: 'Lisiane (Redatoria)', telas: ['/inbound/calendar'],
    revisar_dias: 365, como: 'Calendário anual de datas comemorativas.',
    ultima: doJson('datas-especiais-2026.json', 'gerado_em'), arquivos: ['datas-especiais-2026.json'],
  },
  {
    id: 'clientes-kb', nome: 'Base de conhecimento da Área de Clientes', ic: '📚', tipo: 'Cadastro', modo: 'manual',
    areas: ['pipeline'], dona: 'Marlison (Pipeline)', telas: ['/area-clientes'],
    revisar_dias: 90, como: 'Números institucionais com fonte, revisados à mão.',
    ultima: doJson('area-clientes-kb.json', '_meta.atualizado_em'), arquivos: ['area-clientes-kb.json'],
  },
  {
    id: 'jarvis-kb', nome: 'JARVIS — produtos SAP e battle cards', ic: '🤖', tipo: 'Cadastro', modo: 'manual',
    areas: ['pipeline'], dona: 'Marlison (Pipeline)', telas: ['/jarvis'],
    revisar_dias: 90, como: 'Material de produto entregue ao Claude e validado pelo script de ingestão.',
    scripts: ['scripts/sync/jarvis_kb_ingest.js'],
  },
  {
    id: 'field-template', nome: 'Processo de eventos (Gantt modelo)', ic: '🧭', tipo: 'Planilha', modo: 'manual',
    areas: ['eventos'], dona: 'Gabrielle (Field Marketing)', telas: ['/field-marketing'],
    revisar_dias: 180, como: 'Modelo de tarefas por fase do evento, importado da planilha Gantt.',
    ultima: doJson('field-template.json', 'gerado_em'),
    scripts: ['scripts/sync/parse_field_template.py'], arquivos: ['field-template.json'],
  },

  // ── Ainda não integradas ──────────────────────────────────────────────────
  { id: 'hubspot-cms', nome: 'HubSpot CMS — visitas do site por página', ic: '🌐', tipo: 'API', modo: 'pendente',
    areas: ['intelligence', 'growth'], dona: 'Bruna (Intelligence)', telas: ['/relatorio'],
    falta: 'Criar um Private App no HubSpot e pôr HUBSPOT_TOKEN no Railway.' },
  { id: 'search-console', nome: 'Google Search Console — SEO', ic: '🔎', tipo: 'API', modo: 'pendente',
    areas: ['growth'], dona: 'Gui (Growth)', telas: ['/relatorio'],
    falta: 'Dar acesso à propriedade do site para a conta de serviço do Google.' },
  { id: 'instagram', nome: 'Instagram — seguidores e alcance', ic: '📸', tipo: 'API', modo: 'pendente',
    areas: ['growth'], dona: 'Gui (Growth)', telas: ['/relatorio'],
    falta: 'Conta Business + app no Facebook + token de longa duração.' },
  { id: 'linkedin-api', nome: 'LinkedIn — engajamento por post (API oficial)', ic: '🔗', tipo: 'API', modo: 'pendente',
    areas: ['growth'], dona: 'Gui (Growth)', telas: ['/relatorio'],
    falta: 'Admin da página + app aprovado na Community Management API.' },
  { id: 'outlook-agenda', nome: 'Agenda do Outlook — reuniões agendadas', ic: '📆', tipo: 'Calendário', modo: 'pendente',
    areas: ['pipeline'], dona: 'Marlison (Pipeline)', telas: ['/area/pipeline'],
    falta: 'Permissão Calendars.Read no app do Azure (mesma TI do SSO).' },
  { id: 'trello', nome: 'Trello — tarefas do time', ic: '📋', tipo: 'API', modo: 'pendente',
    areas: ['time'], dona: 'Rudá', telas: [],
    falta: 'Gerar Key + Token em trello.com/app-key.' },
];
const POR_ID = Object.fromEntries(FONTES.map(f => [f.id, f]));

// O que não é fonte de fora (o teste de cobertura exige que esteja listado aqui
// ou no registro — nada fica sem dono por esquecimento).
const NAO_SAO_FONTE = {
  arquivos: {
    'agentes.json': 'catálogo dos agentes do escritório (configuração)',
    'areas.json': 'cadastro das áreas do time (configuração)',
    'personas.json': 'personas do "Ver como" (configuração)',
    'changelog.json': 'histórico de versões do Office',
    'design-tokens.json': 'gerado do DESIGN.md (design system)',
    'office-desks.json': 'mapa do Office Game (configuração)',
    'comunicados.json': 'fila de comunicados escrita pelo próprio Office',
    'cafezinho-seed.json': 'semente do Cafezinho (conteúdo do próprio Office)',
    'loja-coins.json': 'catálogo da Loja (configuração)',
    'kpis-historical.json': 'legado vazio — substituído pelo /relatorio ao vivo',
    'pipeline-snapshot.json': 'legado vazio — substituído pelo Apollo no servidor (fonte apollo)',
    'relatorio-outreach.json': 'legado vazio — substituído pelo Apollo no servidor (fonte apollo)',
  },
  scripts: {
    'scripts/sync/seed_ideias.py': 'carga inicial do Mural de Ideias (uma vez só)',
    'scripts/sync/sync_ideias_to_xlsx.py': 'saída: espelha as ideias do Office na planilha (não alimenta o Office)',
    'scripts/sync/deploy-cases-to-site.ps1': 'saída: publica cases no site',
    'scripts/integrations/seo_checker.js': 'checagem de SEO sob demanda (não é fonte)',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// MOTOR — baixar planilha, rodar parser, guardar resultado
// ════════════════════════════════════════════════════════════════════════════
class ErroFonte extends Error {
  // tipo: 'sem-link' · 'nao-achou' · 'permissao' · 'credencial' · 'formato' · 'rede' · 'parser'
  constructor(msg, tipo) { super(msg); this.tipo = tipo; }
}
const GRAPH = () => process.env.FONTES_GRAPH_URL || 'https://graph.microsoft.com/v1.0';
const LOGIN = () => process.env.FONTES_LOGIN_URL || 'https://login.microsoftonline.com';
const GOOGLE = () => process.env.FONTES_GOOGLE_URL || 'https://docs.google.com';
const graphCreds = () => !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
const MAX_BYTES = 30 * 1024 * 1024;

// Só três tipos de link entram — o servidor nunca busca URL arbitrária.
function tipoLink(l) {
  const s = String(l || '').trim();
  if (/^onedrive:(?:[^:/\s]+@[^:/\s]+:)?\/\S/i.test(s)) return 'onedrive';
  let u; try { u = new URL(s); } catch (_) { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.hostname === 'docs.google.com' && /^\/spreadsheets\/d\/[\w-]{20,}/.test(u.pathname)) return 'google';
  if (/(^|\.)sharepoint\.com$/i.test(u.hostname) || u.hostname === '1drv.ms' || /(^|\.)onedrive\.live\.com$/i.test(u.hostname)) return 'share';
  return null;
}
function linksDe(f) {
  const cfg = configDe(f.id);
  if (cfg.link) return { links: [cfg.link], configurado: true };
  const env = process.env['FONTE_' + f.id.toUpperCase().replace(/-/g, '_') + '_URL'];
  if (env) return { links: [env], configurado: true };
  return { links: (f.motor && f.motor.locais) || [], configurado: false };
}

// fetch com erro de rede/timeout em português (vai pra tela e pro alerta).
async function buscar(url, opts) {
  try { return await fetch(url, opts); }
  catch (e) {
    const host = (() => { try { return new URL(url).host; } catch (_) { return url; } })();
    if (e && e.name === 'TimeoutError') throw new ErroFonte(`${host} demorou demais para responder`, 'rede');
    throw new ErroFonte(`não consegui conectar em ${host}`, 'rede');
  }
}

let _graphTk = null;
async function graphToken() {
  if (_graphTk && _graphTk.exp > Date.now() + 60e3) return _graphTk.v;
  if (!graphCreds()) throw new ErroFonte('servidor sem as credenciais do app do Azure (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET)', 'credencial');
  const body = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID, client_secret: process.env.AZURE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
  });
  const r = await buscar(`${LOGIN()}/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', body, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new ErroFonte(`login no Graph falhou (${r.status} ${j.error || ''})`.trim(), 'credencial');
  _graphTk = { v: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return _graphTk.v;
}
async function graphJson(url) {
  const r = await buscar(url, { headers: { Authorization: 'Bearer ' + await graphToken() }, signal: AbortSignal.timeout(30000) });
  if (r.status === 404 || r.status === 400) throw new ErroFonte('não encontrado', 'nao-achou');
  if (r.status === 401 || r.status === 403) throw new ErroFonte('o app do Azure não tem permissão de ler esse arquivo (Files.Read.All + consentimento do admin)', 'permissao');
  if (!r.ok) throw new ErroFonte(`Graph respondeu ${r.status}`, 'rede');
  return r.json();
}
const encSeg = (segs) => segs.map(encodeURIComponent).join('/');
async function itemOneDrive(link) {
  const m = /^onedrive:(?:([^:/\s]+@[^:/\s]+):)?(\/.+)$/i.exec(link.trim());
  const upn = (m[1] || UPN()).toLowerCase();
  const segs = m[2].split('/').filter(Boolean);
  const base = `${GRAPH()}/users/${encodeURIComponent(upn)}/drive/root`;
  try { return await graphJson(`${base}:/${encSeg(segs)}`); }
  catch (e) { if (e.tipo !== 'nao-achou') throw e; }
  // Atalho ("Adicionar atalho a Meus arquivos"): o caminho direto não atravessa a
  // pasta compartilhada. Acha o atalho no caminho e continua no drive de origem.
  for (let i = 1; i < segs.length; i++) {
    let it;
    try { it = await graphJson(`${base}:/${encSeg(segs.slice(0, i))}`); }
    catch (e) { if (e.tipo === 'nao-achou') break; throw e; }
    const ri = it.remoteItem;
    if (ri && ri.parentReference && ri.parentReference.driveId) {
      return graphJson(`${GRAPH()}/drives/${ri.parentReference.driveId}/items/${ri.id}:/${encSeg(segs.slice(i))}`);
    }
  }
  throw new ErroFonte(`não achei "${segs.join('/')}" no OneDrive de ${upn}`, 'nao-achou');
}
function shareId(url) {
  return 'u!' + Buffer.from(url, 'utf8').toString('base64').replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
}
async function lerCorpo(r) {
  const len = Number(r.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new ErroFonte('arquivo grande demais (> 30 MB)', 'formato');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new ErroFonte('arquivo grande demais (> 30 MB)', 'formato');
  return buf;
}

// → { buf, meta: { nome, modificado_em, modificado_por, url } }
async function baixarLink(link) {
  const tipo = tipoLink(link);
  if (!tipo) throw new ErroFonte('link não suportado: use um link do OneDrive/SharePoint ou do Google Sheets', 'formato');
  if (tipo === 'google') {
    const id = /\/spreadsheets\/d\/([\w-]+)/.exec(new URL(link).pathname)[1];
    const r = await buscar(`${GOOGLE()}/spreadsheets/d/${id}/export?format=xlsx`, { redirect: 'follow', signal: AbortSignal.timeout(60000) });
    if (r.status === 404) throw new ErroFonte('planilha do Google não encontrada', 'nao-achou');
    if (!r.ok || /text\/html/i.test(r.headers.get('content-type') || '')) {
      throw new ErroFonte('a planilha do Google não está aberta para "qualquer pessoa com o link"', 'permissao');
    }
    return { buf: await lerCorpo(r), meta: { nome: null, modificado_em: null, modificado_por: null, url: link } };
  }
  const item = tipo === 'onedrive' ? await itemOneDrive(link) : await graphJson(`${GRAPH()}/shares/${shareId(link)}/driveItem`);
  if (item.folder) throw new ErroFonte('o link aponta para uma pasta, não para a planilha', 'formato');
  const driveId = item.parentReference && item.parentReference.driveId;
  const urlConteudo = driveId ? `${GRAPH()}/drives/${driveId}/items/${item.id}/content` : `${GRAPH()}/shares/${shareId(link)}/driveItem/content`;
  const r = await buscar(urlConteudo, { headers: { Authorization: 'Bearer ' + await graphToken() }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new ErroFonte(`download falhou (${r.status})`, r.status === 403 ? 'permissao' : 'rede');
  const quem = item.lastModifiedBy && item.lastModifiedBy.user;
  return {
    buf: await lerCorpo(r),
    meta: { nome: item.name || null, modificado_em: item.lastModifiedDateTime || null, modificado_por: (quem && quem.displayName) || null, url: item.webUrl || null },
  };
}

function executar(cmd, script, args, env) {
  return new Promise((resolve) => {
    const bin = cmd === 'node' ? process.execPath : (process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3'));
    const ch = spawn(bin, [path.join(ROOT, script), ...args], {
      cwd: ROOT,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', ...env },
    });
    let out = '', err = '';
    const t = setTimeout(() => ch.kill('SIGKILL'), 5 * 60e3);
    ch.stdout.on('data', d => { out += d; if (out.length > 8e6) out = out.slice(-8e6); });
    ch.stderr.on('data', d => { err += d; if (err.length > 2e5) err = err.slice(-2e5); });
    ch.on('close', code => { clearTimeout(t); resolve({ code, out, err }); });
    ch.on('error', e => { clearTimeout(t); resolve({ code: -1, out, err: e.message }); });
  });
}
// Primeira linha que explica a falha (sem stack nem caminho do servidor — vai pra tela).
function motivo(txt) {
  const linhas = String(txt || '').split('\n').map(l => l.trim()).filter(Boolean);
  const l = linhas.find(x => /erro|error|falh|não|nao|invalid|faltam/i.test(x) && !/^at\s/.test(x)) || linhas[linhas.length - 1] || 'falhou';
  return l.replace(/^Error:\s*/, '').replace(/\/[^\s'"]*\/(?=[^/\s]+\.(xlsx|json|py|js)\b)/g, '').slice(0, 240);
}
async function postarLocal(caminho, texto) {
  let corpo = texto.trim();
  if (!corpo.startsWith('{')) corpo = corpo.slice(corpo.indexOf('{'), corpo.lastIndexOf('}') + 1);
  try { JSON.parse(corpo); } catch (_) { throw new ErroFonte('o parser não devolveu JSON válido', 'parser'); }
  const r = await buscar(`http://127.0.0.1:${PORT}${caminho}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-editor-token': ACTIVE_EDITOR_TOKEN },
    body: corpo, signal: AbortSignal.timeout(60000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroFonte(`o Office recusou os dados (${r.status}${j.error ? ': ' + j.error : ''})`, 'parser');
}

// JSON gerado no servidor vive em public/api (o código todo lê de lá), mas um
// deploy volta a pasta pra versão do repositório. Guarda no banco e devolve no boot.
function persistir(arquivo) {
  try { gravarBlob(arquivo, fs.readFileSync(path.join(API_DIR, arquivo), 'utf8')); }
  catch (e) { console.warn('[fontes] não guardei', arquivo, e.message); }
}
function restaurarArquivos() {
  for (const f of FONTES) {
    for (const arquivo of (f.motor && f.motor.persistir) || []) {
      if (arquivo === 'events.json') continue;            // server.js já devolve no boot
      const b = blobLinha(arquivo);
      if (!b || !b.value) continue;
      const doRepo = f.ultima ? f.ultima() : null;
      if (doRepo && ms(b.updated_at) <= doRepo) continue;   // o do repositório é mais novo
      try { fs.writeFileSync(path.join(API_DIR, arquivo), b.value); console.log(`[fontes] ${arquivo} restaurado do banco`); }
      catch (e) { console.warn('[fontes] restaurar', arquivo, e.message); }
    }
  }
}

async function rodarMotor(f, origem) {
  const st = estadoDe(f.id);
  st.tentativa_ts = agoraISO(); st.origem = origem;
  salvarEstado(f.id, st);
  const { links, configurado } = linksDe(f);
  try {
    let arquivo = '', hash = null, meta = null;
    if (f.motor.tipo === 'planilha') {
      if (!links.length) throw new ErroFonte('falta o link da planilha', 'sem-link');
      let baixado = null, ultimoErro = null;
      for (const l of links) {
        try { baixado = await baixarLink(l); break; }
        catch (e) { ultimoErro = e; if (e.tipo !== 'nao-achou') break; }
      }
      if (!baixado) throw ultimoErro;
      if (baixado.buf.slice(0, 2).toString() !== 'PK') throw new ErroFonte('o arquivo baixado não é uma planilha .xlsx', 'formato');
      hash = crypto.createHash('sha256').update(baixado.buf).digest('hex');
      meta = baixado.meta;
      fs.mkdirSync(ARQ_DIR, { recursive: true });
      arquivo = path.join(ARQ_DIR, f.id + '.xlsx');
      fs.writeFileSync(arquivo, baixado.buf);
      // Planilha igual à última processada: o Office já está com ela.
      if (hash === st.hash && st.ultima_ok_ts && origem !== 'manual') {
        Object.assign(st, { verificado_ts: agoraISO(), erro: null, erro_tipo: null, erro_ts: null, arquivo: meta, mudou: false });
        salvarEstado(f.id, st);
        return { ok: true, mudou: false };
      }
    } else {
      const falta = (f.motor.requer || []).filter(k => !process.env[k]);
      if (falta.length) throw new ErroFonte('faltam no Railway: ' + falta.join(', '), 'credencial');
    }
    let log = '';
    for (const [cmd, script, ...args] of f.motor.cmds) {
      const r = await executar(cmd, script, args, {
        FONTE_ARQUIVO: arquivo, OFFICE_URL: `http://127.0.0.1:${PORT}`, EDITOR_TOKEN: ACTIVE_EDITOR_TOKEN,
      });
      if (r.code !== 0) throw new ErroFonte(motivo(r.err + '\n' + r.out), 'parser');
      if (f.motor.postar) await postarLocal(f.motor.postar, r.out);
      else log += r.out + r.err;
    }
    for (const a of f.motor.persistir || []) persistir(a);
    const agora = agoraISO();
    Object.assign(st, {
      ultima_ok_ts: agora, verificado_ts: agora, erro: null, erro_tipo: null, erro_ts: null,
      hash, arquivo: meta, mudou: true, log: log.split('\n').filter(Boolean).slice(-6).join('\n').slice(0, 800),
    });
    salvarEstado(f.id, st);
    console.log(`[fontes] ${f.id} atualizada (${origem})`);
    return { ok: true, mudou: true };
  } catch (e) {
    Object.assign(st, {
      erro: String(e.message || e).slice(0, 240), erro_tipo: e.tipo || 'erro', erro_ts: agoraISO(),
      erro_no_padrao: e.tipo === 'nao-achou' && !configurado,
    });
    salvarEstado(f.id, st);
    console.warn(`[fontes] ${f.id} falhou (${origem}):`, st.erro);
    return { ok: false, erro: st.erro };
  }
}

// Fila: uma fonte por vez; pedir de novo a mesma enquanto roda devolve a mesma promessa.
const FILA = { cadeia: Promise.resolve(), rodando: new Map() };
function enfileirar(f, origem) {
  if (FILA.rodando.has(f.id)) return FILA.rodando.get(f.id);
  const p = FILA.cadeia
    .then(async () => (f.motor ? rodarMotor(f, origem) : { ok: true, resultado: await f.acao() }))
    .catch(e => ({ ok: false, erro: e.message }))
    .finally(() => FILA.rodando.delete(f.id));
  FILA.cadeia = p;
  FILA.rodando.set(f.id, p);
  return p;
}

// ════════════════════════════════════════════════════════════════════════════
// AVALIAÇÃO — status de cada fonte
//  em-dia · atrasada · erro · revisar (curada à mão) · aguarda (falta algo humano)
//  · pendente (não integrada)
// ════════════════════════════════════════════════════════════════════════════
const tenta = (fn) => { try { return fn(); } catch (_) { return null; } };

function faltaDe(f) {
  if (f.modo === 'pendente') return f.falta;
  if (f.modo === 'servidor') return (tenta(() => f.estado()) || {}).falta || null;
  if (f.modo !== 'motor') return null;
  if (f.motor.tipo === 'api') {
    const falta = (f.motor.requer || []).filter(k => !process.env[k]);
    return falta.length ? `Falta no Railway: ${falta.join(', ')}.` : null;
  }
  const { links, configurado } = linksDe(f);
  if (!links.length) return 'Falta o link da planilha (OneDrive/SharePoint ou Google Sheets).';
  if (links.some(l => tipoLink(l) !== 'google') && !graphCreds()) return 'Servidor sem as credenciais do app do Azure (AZURE_*).';
  const st = estadoDe(f.id);
  if (!configurado && st.erro_no_padrao && ms(st.erro_ts) >= (ms(st.ultima_ok_ts) || 0)) {
    return 'Não achei a planilha no caminho de sempre do OneDrive. Cole o link dela.';
  }
  return null;
}

function avaliar(f, agora = Date.now()) {
  const st = estadoDe(f.id);
  const falta = faltaDe(f);
  const ultima = f.ultima ? tenta(f.ultima) : null;
  const rev = revisaoDe(f.id);
  let erro = null, okServidor = null;
  if (f.modo === 'servidor') {
    const s = tenta(() => f.estado()) || {};
    erro = s.erro || null; okServidor = s.ok_ts || null;
  } else if (f.modo === 'motor' && st.erro && ms(st.erro_ts) > (ms(st.ultima_ok_ts) || 0)
             && st.erro_tipo !== 'sem-link' && !st.erro_no_padrao) {
    // Credencial que FALTA nem chega a rodar (faltaDe); a que existe e é recusada é erro.
    erro = st.erro;
  }
  const conferida = Math.max(ultima || 0, okServidor || 0, ms(st.verificado_ts) || 0,
    f.modo === 'manual' && rev ? ms(rev.ts) || 0 : 0) || null;
  const limite = f.modo === 'manual' ? (f.revisar_dias || 30) * DAY : (f.sla_h || 48) * HOUR;
  let status;
  if (f.modo === 'pendente') status = 'pendente';
  else if (erro) status = 'erro';
  else if (conferida && agora - conferida <= limite) status = 'em-dia';
  else if (falta) status = 'aguarda';
  else status = f.modo === 'manual' ? 'revisar' : 'atrasada';
  return {
    status, falta, erro,
    atualizada_ts: isoOuNull(Math.max(ultima || 0, okServidor || 0, ms(st.ultima_ok_ts) || 0) || null),
    conferida_ts: isoOuNull(conferida),
    revisao: rev, arquivo: st.arquivo || null, tentativa_ts: st.tentativa_ts || null,
    proxima_ts: f.motor && !falta && motorLigado()
      ? isoOuNull((ms(st.tentativa_ts) || agora) + cadencia(f, st) * HOUR) : null,
  };
}

const ORDEM = { erro: 0, atrasada: 1, aguarda: 2, revisar: 3, 'em-dia': 4, pendente: 5 };

// ── Agendador ───────────────────────────────────────────────────────────────
function motorLigado() {
  if (process.env.FONTES_AGENDADOR === 'false' || process.env.FONTES_AUTO === '0') return false;
  return !IS_LOCAL_DEV || process.env.FONTES_AUTO_LOCAL === '1';   // no PC do Rudá as tarefas do Windows já cuidam
}
// Caminho padrão que não existe: tenta de novo só 1x por dia.
const cadencia = (f, st) => (st.erro_no_padrao ? Math.max(24, f.motor.cadencia_h) : f.motor.cadencia_h || 6);
function devida(f) {
  if (!f.motor) return false;
  const st = estadoDe(f.id);
  const falta = faltaDe(f);
  if (falta && !st.erro_no_padrao) return false;
  const t = ms(st.tentativa_ts);
  return !t || Date.now() - t >= cadencia(f, st) * HOUR;
}
function tick() {
  if (!motorLigado()) return;
  for (const f of FONTES) if (devida(f)) enfileirar(f, 'agenda');
}
restaurarArquivos();
if (motorLigado()) {
  // Padrão: 3 min depois do boot (as integrações do boot já rodaram), depois a cada 10 min.
  setTimeout(tick, Number(process.env.FONTES_TICK_INICIAL_MS) || 3 * 60e3).unref();
  setInterval(tick, Number(process.env.FONTES_TICK_MS) || 10 * 60e3).unref();
  console.log('[fontes] motor de fontes ligado (planilhas da nuvem + APIs, verificação a cada 10 min)');
}

// ════════════════════════════════════════════════════════════════════════════
// QUEM VÊ O QUÊ
// ════════════════════════════════════════════════════════════════════════════
function quem(req) {
  const acesso = require('./acesso');
  const u = req.session && req.session.user;
  const superAdmin = acesso.ehSuperAdmin(u) || (IS_LOCAL_DEV && !u);
  const areas = superAdmin ? Object.keys(acesso.AREAS) : acesso.areasDoUsuario(u);
  return { u, superAdmin, areas, gestao: superAdmin || areas.includes('gestao') };
}
const enxerga = (q, f) => q.gestao || f.areas.some(a => q.areas.includes(a));

function serializar(f, q) {
  const a = avaliar(f);
  const { links, configurado } = linksDe(f);
  return {
    id: f.id, nome: f.nome, ic: f.ic, tipo: f.tipo, modo: f.modo, areas: f.areas, dona: f.dona,
    telas: f.telas || [], como: f.como || '', sla_h: f.sla_h || null, revisar_dias: f.revisar_dias || null,
    cadencia_h: (f.motor && f.motor.cadencia_h) || null, motor_tipo: (f.motor && f.motor.tipo) || null,
    ...a,
    arquivo: a.arquivo ? { ...a.arquivo, url: q.superAdmin ? a.arquivo.url : null } : null,
    pode_atualizar: !!(f.motor || f.acao) && !(f.motor && a.falta && !a.falta.startsWith('Não achei')),
    pode_revisar: f.modo === 'manual',
    // Onde a planilha mora só aparece pro super admin (é ele quem configura).
    ...(q.superAdmin && f.motor && f.motor.tipo === 'planilha' ? { link: configurado ? links[0] : '', link_padrao: (f.motor.locais || [])[0] || '' } : {}),
  };
}

// ── Rotas ───────────────────────────────────────────────────────────────────
router.get('/fontes', requireAuth, (req, res) => res.sendFile(path.join(ROOT, 'public/fontes.html')));

router.get('/api/fontes', requireAuth, (req, res) => {
  const q = quem(req);
  const lista = FONTES.filter(f => enxerga(q, f)).map(f => serializar(f, q))
    .sort((a, b) => (ORDEM[a.status] - ORDEM[b.status]) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const resumo = {};
  lista.forEach(f => { resumo[f.status] = (resumo[f.status] || 0) + 1; });
  res.set('Cache-Control', 'no-store');
  res.json({ gerado_em: agoraISO(), motor_ligado: motorLigado(), pode_configurar: q.superAdmin, resumo, fontes: lista });
});

const _ultimoManual = {};
router.post('/api/fontes/:id/atualizar', requireAuth, async (req, res) => {
  const f = POR_ID[req.params.id];
  const q = quem(req);
  if (!f || !enxerga(q, f)) return res.status(404).json({ error: 'fonte não encontrada' });
  if (!f.motor && !f.acao) return res.status(400).json({ error: 'essa fonte não se atualiza pelo servidor' });
  if (Date.now() - (_ultimoManual[f.id] || 0) < 60e3) return res.status(429).json({ error: 'acabou de rodar — espere um minuto' });
  _ultimoManual[f.id] = Date.now();
  const r = await enfileirar(f, 'manual');
  res.json({ ...r, fonte: serializar(f, q) });
});

router.post('/api/fontes/:id/revisado', requireAuth, (req, res) => {
  const f = POR_ID[req.params.id];
  const q = quem(req);
  if (!f || !enxerga(q, f)) return res.status(404).json({ error: 'fonte não encontrada' });
  if (f.modo !== 'manual') return res.status(400).json({ error: 'só fontes curadas à mão são marcadas como revisadas' });
  const todas = lerBlob('fontes.revisoes') || {};
  todas[f.id] = { ts: agoraISO(), por: (q.u && (q.u.name || q.u.email)) || 'local' };
  gravarBlob('fontes.revisoes', todas);
  res.json({ ok: true, fonte: serializar(f, q) });
});

router.put('/api/fontes/:id/config', requireAuth, (req, res) => {
  const f = POR_ID[req.params.id];
  const q = quem(req);
  if (!q.superAdmin) return res.status(403).json({ error: 'forbidden' });
  if (!f || !f.motor || f.motor.tipo !== 'planilha') return res.status(404).json({ error: 'fonte sem planilha configurável' });
  const link = String((req.body && req.body.link) || '').trim();
  if (link && !tipoLink(link)) return res.status(400).json({ error: 'Use um link do OneDrive/SharePoint (https://…sharepoint.com/…) ou do Google Sheets.' });
  const todas = lerBlob('fontes.config') || {};
  if (link) todas[f.id] = { link, por: q.u ? q.u.email : 'local', em: agoraISO() };
  else delete todas[f.id];
  gravarBlob('fontes.config', todas);
  // Link novo: esquece o hash e o erro antigos e roda já.
  const st = estadoDe(f.id);
  delete st.hash; delete st.erro_no_padrao; st.tentativa_ts = null;
  salvarEstado(f.id, st);
  if (link && motorLigado()) enfileirar(f, 'manual');
  res.json({ ok: true, fonte: serializar(f, q) });
});

// ════════════════════════════════════════════════════════════════════════════
// PRO MÓDULO 34 (alertas e relatórios)
// ════════════════════════════════════════════════════════════════════════════
const fmtIdade = (d) => {
  const h = Math.round(d / HOUR);
  return h < 48 ? `${h}h` : `${Math.round(d / DAY)} dias`;
};
// Alertas das fontes sem regra própria no Módulo 34. Só cobra o que já teve dado
// e parou (ou quebrou): fonte que nunca atualizou fica só em /fontes, sem alerta
// — nada de aviso a partir de dado inexistente (mesma regra do Módulo 34).
function paraAlertas() {
  const out = [];
  for (const f of FONTES) {
    if (f.regraPropria || f.modo === 'pendente') continue;
    const a = avaliar(f);
    // Fonte do time todo (cadastro do time, metas) cobra quem faz a gestão, não o time inteiro.
    const areas = f.areas.includes('time') ? ['gestao'] : f.areas;
    const idade = a.conferida_ts ? fmtIdade(Date.now() - ms(a.conferida_ts)) : null;
    if (a.status === 'erro') {
      out.push({ sub: f.id, areas, nivel: 'importante', chave: 'erro',
        titulo: `${f.nome}: não está atualizando`, detalhe: `Erro: ${a.erro}. ${f.como}`, href: '/fontes#' + f.id });
    } else if (a.status === 'atrasada' && a.conferida_ts) {
      out.push({ sub: f.id, areas, nivel: 'importante', chave: 'atrasada',
        titulo: `${f.nome}: sem atualizar${idade ? ' há ' + idade : ''}`, detalhe: f.como, href: '/fontes#' + f.id });
    } else if (a.status === 'revisar' && a.conferida_ts) {
      out.push({ sub: f.id, areas, nivel: 'info', chave: 'revisar',
        titulo: `Revisar ${f.nome}${idade ? ` (última revisão há ${idade})` : ''}`,
        detalhe: `${f.como} Confira se está em dia e marque como revisada em /fontes.`, href: '/fontes#' + f.id });
    }
  }
  return out;
}
// Linhas do bloco "Saúde das fontes" dos relatórios (formato do Módulo 34).
function paraRelatorio(areas) {
  const mapa = { 'em-dia': 'ok', revisar: 'atencao', atrasada: 'parado', erro: 'parado', aguarda: 'desligado' };
  return FONTES.filter(f => f.modo !== 'pendente' && (!areas || f.areas.some(a => areas.includes(a)))).map(f => {
    const a = avaliar(f);
    const quando = a.conferida_ts ? `conferida há ${fmtIdade(Date.now() - ms(a.conferida_ts))}` : 'sem atualização registrada';
    return { nome: f.nome, areas: f.areas, status: mapa[a.status] || 'desligado',
      detalhe: a.erro ? `erro: ${a.erro}` : (a.status === 'aguarda' ? a.falta : quando) };
  });
}

module.exports = router;
module.exports.FONTES = FONTES;
module.exports.NAO_SAO_FONTE = NAO_SAO_FONTE;
module.exports.registrarAcao = registrarAcao;
module.exports.avaliar = avaliar;
module.exports.paraAlertas = paraAlertas;
module.exports.paraRelatorio = paraRelatorio;
module.exports._interno = { tipoLink, rodarMotor, enfileirar, baixarLink, motorLigado, tick, linksDe };
