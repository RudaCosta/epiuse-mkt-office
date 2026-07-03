#!/usr/bin/env node
/**
 * sync_rd_station.js — Integração Dinâmica Completa com RD Station Marketing V2.
 * Realiza autenticação via OAuth2 (refresh token de longa duração) ou chave direta,
 * consulta LPs, Popups e Estatísticas de Campanhas de E-mail da API da RD Station,
 * mapeia os dados para o formato do Calendário Editorial e faz o upsert no SQLite
 * (local e em produção via API de calendário /api/inbound/calendar).
 *
 * Uso:
 *   node scripts/sync/sync_rd_station.js [--target=local|railway|all] [--dry-run]
 */
'use strict';

const _fs0 = require('fs');
const _os0 = require('os');
const _winUser = _os0.userInfo().username;
const _localCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/node_modules`,
  'C:/Users/Ruds/.epiuse-optimizer/node_modules',
];
const _localModules = _localCandidates.find(p => _fs0.existsSync(p)) || '';

// Carrega .env off-repo (mesmo padrão do server.js) com prioridade máxima
const _envCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/.env`,
  'C:/Users/Ruds/.epiuse-optimizer/.env',
  require('path').resolve(__dirname, '../../.env'),
];
for (const _ep of _envCandidates) {
  if (_fs0.existsSync(_ep)) {
    try {
      const _lines = _fs0.readFileSync(_ep, 'utf8').replace(/^﻿/, '').split('\n');
      _lines.forEach(l => {
        const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      });
      console.log(`[rd-sync] .env carregado de: ${_ep}`);
    } catch (e) {
      console.warn(`[rd-sync] Erro ao carregar .env de ${_ep}:`, e.message);
    }
    break;
  }
}

// Carrega dotenv da raiz apenas como fallback para variáveis não definidas
const _dotenvPath = _localModules ? require('path').join(_localModules, 'dotenv') : 'dotenv';
try {
  require(_dotenvPath).config({ path: require('path').join(__dirname, '../../.env') });
} catch (e) {}

const path   = require('path');
const args   = process.argv.slice(2);
const flag   = (k, def) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : def; };
const target = flag('target', 'all');
const DRY_RUN = process.argv.includes('--dry-run');

const TOKEN = process.env.EDITOR_TOKEN;
if (!TOKEN) { console.error('ERRO: variável de ambiente EDITOR_TOKEN não definida.'); process.exit(1); }
let RD_API_KEY = process.env.RD_API_KEY;

// Credenciais OAuth2 para renovação automática (mesma lógica do Zoho CRM)
const RD_CLIENT_ID = process.env.RD_CLIENT_ID;
const RD_CLIENT_SECRET = process.env.RD_CLIENT_SECRET;
const RD_REFRESH_TOKEN = process.env.RD_REFRESH_TOKEN;

const URLS = {
  local: process.env.OFFICE_URL || 'http://localhost:3000',
  railway: 'https://epiuse-voices-optimizer.up.railway.app',
};

const targets = target === 'all' ? ['local', 'railway'] : [target];

// Data atual e janela de consulta (emails limitados a no máximo 45 dias retroativos no plano básico da RD)
const now = new Date();
const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
const sixtyDaysAhead = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
const start_date = fortyDaysAgo.toISOString().slice(0, 10);
const end_date = sixtyDaysAhead.toISOString().slice(0, 10);

// Endpoints da API RD Station Marketing V2
const sources = [
  { url: `https://api.rd.services/platform/analytics/emails?start_date=${start_date}&end_date=${end_date}`, fonte: 'email' },
  { url: 'https://api.rd.services/platform/landing_pages', fonte: 'landing-pages' },
  { url: 'https://api.rd.services/platform/popups', fonte: 'popups' },
];

function mapRDItem(item, fonte) {
  const id = item.id || item.uuid || item.email_campaign_id || item.identifier;
  let dataRaw = item.scheduled_at || item.sent_at || item.send_date || item.published_at || item.created_at || '';
  const data = String(dataRaw).slice(0, 10);
  
  if (!id || !data) return null;

  let canal = 'rd';
  let pilar = 'RD Station';
  let autor = item.from_name || item.created_by_name || 'RD Station';
  let titulo = item.subject || item.email_campaign_name || item.name || item.title || '(sem título)';
  let resumo = item.preheader || item.description || '';
  let status = 'planned';

  if (fonte === 'email') {
    canal = 'email';
    pilar = 'Email Marketing';
    status = 'published';
  } else if (fonte === 'landing-pages') {
    canal = 'landing-page';
    pilar = 'Conversão';
    status = item.is_published ? 'published' : 'planned';
  } else if (fonte === 'popups') {
    canal = 'popup';
    pilar = 'Conversão';
    status = item.is_published || item.status === 'active' ? 'published' : 'planned';
  }

  return {
    external_id: `rd-${fonte}-${id}`,
    fonte: 'rd-station',
    data,
    canal,
    autor: String(autor).slice(0, 100),
    titulo: String(titulo).slice(0, 200),
    resumo: String(resumo).slice(0, 500),
    pilar,
    status,
    url_post: item.public_url || item.url || ''
  };
}

async function fetchRDPaginated(url, token, maxPages = 5) {
  const results = [];
  let next = url;
  
  for (let i = 0; i < maxPages && next; i++) {
    const r = await fetch(next, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`RD HTTP ${r.status}: ${body.slice(0, 200)}`);
    }
    
    const data = await r.json();
    const items = Array.isArray(data) ? data : (data.items || data.email_marketing || data.email_campaigns || data.landing_pages || data.popups || []);
    results.push(...items);
    
    next = data?.next_page_url || data?.paging?.next || null;
  }
  
  return results;
}

async function refreshRDToken(clientId, clientSecret, refreshToken) {
  console.log('[rd-sync] Renovando Access Token via OAuth2 (refresh_token)...');
  const res = await fetch('https://api.rd.services/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`Falha OAuth RD: ${JSON.stringify(json)}`);
  }
  console.log('[rd-sync] Access Token renovado com sucesso.');
  return json.access_token;
}

(async () => {
  console.log(`[rd-sync] === Iniciando Sincronização do RD Station ===`);
  
  console.log(`[rd-sync] Diagnóstico de chaves carregadas:`);
  console.log(`  - RD_API_KEY: ${RD_API_KEY ? RD_API_KEY.slice(0, 5) + '...' : 'não configurada'}`);
  console.log(`  - RD_CLIENT_ID: ${RD_CLIENT_ID ? RD_CLIENT_ID.slice(0, 8) + '...' : 'não configurada'}`);
  console.log(`  - RD_CLIENT_SECRET: ${RD_CLIENT_SECRET ? RD_CLIENT_SECRET.slice(0, 6) + '...' : 'não configurada'}`);
  console.log(`  - RD_REFRESH_TOKEN: ${RD_REFRESH_TOKEN ? RD_REFRESH_TOKEN.slice(0, 10) + '...' : 'não configurada'}`);

  let token = RD_API_KEY;

  // Se possuir credenciais OAuth2 no .env, realiza o refresh automático
  if (RD_CLIENT_ID && RD_CLIENT_SECRET && RD_REFRESH_TOKEN) {
    try {
      token = await refreshRDToken(RD_CLIENT_ID, RD_CLIENT_SECRET, RD_REFRESH_TOKEN);
    } catch (e) {
      console.error('[rd-sync] ERRO crítico na renovação do token OAuth2:', e.message);
      process.exit(1);
    }
  }

  if (!token) {
    console.error('[rd-sync] ERRO: Nenhuma credencial do RD Station configurada (RD_API_KEY ou RD_CLIENT_ID/SECRET/REFRESH_TOKEN).');
    process.exit(1);
  }

  const allMappedItems = [];
  const tried = [];

  for (const src of sources) {
    try {
      console.log(`[rd-sync] Buscando dados do endpoint RD: ${src.url.split('?')[0]}`);
      const items = await fetchRDPaginated(src.url, token);
      console.log(`[rd-sync] Retornados ${items.length} itens do endpoint: ${src.fonte}`);
      
      let mappedCount = 0;
      for (const it of items) {
        const mapped = mapRDItem(it, src.fonte);
        if (mapped) {
          allMappedItems.push(mapped);
          mappedCount++;
        }
      }
      tried.push({ endpoint: src.fonte, fetched: items.length, mapped: mappedCount, ok: true });
    } catch (e) {
      console.error(`[rd-sync] Erro ao buscar ${src.fonte}:`, e.message);
      tried.push({ endpoint: src.fonte, ok: false, error: e.message });
    }
  }

  console.log(`[rd-sync] Total de itens mapeados prontos para envio: ${allMappedItems.length}`);

  if (allMappedItems.length === 0) {
    console.warn('[rd-sync] Nenhum item mapeado para sincronizar.');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: Dados Mapeados ---');
    allMappedItems.forEach(it => {
      console.log(`  [${it.canal}] ${it.data} | ${it.titulo.slice(0, 70)} (Status: ${it.status})`);
    });
    return;
  }

  // Faz o disparo para salvar nas bases (local / Railway) via endpoint genérico do calendário
  for (const t of targets) {
    const baseUrl = URLS[t];
    if (!baseUrl) continue;
    const url = `${baseUrl}/api/inbound/calendar`;
    
    try {
      console.log(`[rd-sync] Enviando payload de ${allMappedItems.length} itens para: ${url}`);
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-editor-token': TOKEN
        },
        body: JSON.stringify({ items: allMappedItems })
      });
      
      const j = await r.json();
      if (r.ok && j.success) {
        console.log(`[${t}] Sincronização OK · ${j.upserted} itens upsertados com sucesso no SQLite.`);
      } else {
        console.error(`[${t}] ERRO ao salvar no banco:`, j.error || 'Erro desconhecido');
      }
    } catch (e) {
      console.error(`[${t}] FALHA crítica ao enviar para o servidor:`, e.message);
    }
  }
})();
