#!/usr/bin/env node
/**
 * sync_zoho_leads.js — regenera public/api/zoho-leads-snapshot.json
 *
 * Alimenta a seção "🧲 Leads · Zoho CRM" da home (kanban do SDR + saúde da base + origens).
 *
 * COMO FUNCIONA (mesmo padrão do sync_zoho_deals.js):
 * o Zoho MCP está autenticado DENTRO da sessão Claude, não neste processo. Então:
 *   1) O Claude roda as COQL abaixo via MCP (`executeCOQLQuery`).
 *   2) Salva as respostas cruas num JSON.
 *   3) Este script converte esse JSON no formato do snapshot.
 *
 * ⚠️ COQL agregado do Zoho SÓ funciona com ALIAS no COUNT e com GROUP BY:
 *      SELECT Lead_Status, COUNT(id) AS total FROM Leads WHERE id is not null GROUP BY Lead_Status
 *    (sem o "AS total" a API devolve INVALID_QUERY/DUPLICATE_DATA)
 *
 * Uso:
 *   node scripts/sync/sync_zoho_leads.js --from-file raw.json [--dry-run]
 *   node scripts/sync/sync_zoho_leads.js --queries        # imprime as COQL pro Claude rodar
 */
'use strict';

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../../public/api/zoho-leads-snapshot.json');
const SDR_OWNER_ID = process.env.ZOHO_SDR_OWNER_ID || '2907496000042527001'; // Marlison Estrela
const SDR_CVID     = process.env.ZOHO_SDR_CVID     || '2907496000000087501';

// As 3 consultas que alimentam o snapshot (o Claude roda via MCP e salva o resultado).
const QUERIES = {
  status:  "SELECT Lead_Status, COUNT(id) AS total FROM Leads WHERE id is not null GROUP BY Lead_Status",
  origem:  "SELECT Lead_Source, COUNT(id) AS total FROM Leads WHERE id is not null GROUP BY Lead_Source",
  sdr:     `SELECT Lead_Status, COUNT(id) AS total FROM Leads WHERE Owner = '${SDR_OWNER_ID}' GROUP BY Lead_Status`
};

if (process.argv.includes('--queries')) {
  console.log(JSON.stringify(QUERIES, null, 2));
  console.log('\n→ Rode cada uma via MCP Zoho (executeCOQLQuery) e salve como:');
  console.log('  { "status": <resp>, "origem": <resp>, "sdr": <resp> }');
  process.exit(0);
}

const FROM = process.argv.includes('--from-file')
  ? process.argv[process.argv.indexOf('--from-file') + 1] : null;
const DRY = process.argv.includes('--dry-run');

if (!FROM) {
  console.error('❌ uso: node sync_zoho_leads.js --from-file raw.json  (ou --queries pra ver as COQL)');
  process.exit(1);
}

// aceita tanto {status:{data:{data:[...]}}} quanto {status:{data:[...]}}
const rows = (o) => (o && o.data && o.data.data) || (o && o.data) || [];
const raw  = JSON.parse(fs.readFileSync(FROM, 'utf8'));

// ── etapas do kanban do SDR: ordem do fluxo + tipo (ativo/ganho/saída) ────────
const ORDEM_SDR = [
  ['Tentando Contato', 'ativo'],
  ['Em Contato', 'ativo'],
  ['Pré-Qualificação', 'ativo'],
  ['Reunião Agendada | Handover', 'ganho'],
  ['Desqualificado / Encerramento', 'saida']
];

const sdrMap = {};
rows(raw.sdr).forEach(r => { sdrMap[r.Lead_Status || '(sem status)'] = r.total; });
const etapas = ORDEM_SDR.filter(([n]) => sdrMap[n] != null)
  .map(([etapa, tipo]) => ({ etapa, valor: sdrMap[etapa], tipo }));
const sdrTotal = etapas.reduce((a, e) => a + e.valor, 0);

const statusList = rows(raw.status)
  .map(r => ({ status: r.Lead_Status || '(sem status)', valor: r.total }))
  .sort((a, b) => b.valor - a.valor);
const baseTotal = statusList.reduce((a, s) => a + s.valor, 0);

const origens = rows(raw.origem)
  .map(r => ({ origem: r.Lead_Source || '(sem origem)', valor: r.total }))
  .sort((a, b) => b.valor - a.valor);

// ── higiene: achados calculados do dado real (nada inventado — Regra 7) ───────
const pct = (n) => baseTotal ? Math.round(100 * n / baseTotal) : 0;
const get = (arr, key, nome) => (arr.find(x => x[key] === nome) || {}).valor || 0;
const semStatus = get(statusList, 'status', '(sem status)');
const semOrigem = get(origens, 'origem', '(sem origem)');

const achados = [];
if (semStatus) achados.push({
  id: 'sem-status', severidade: 'alta', valor: semStatus, pct: pct(semStatus),
  texto: `${semStatus.toLocaleString('pt-BR')} leads (${pct(semStatus)}% da base) estão SEM status — não dá pra saber em que pé estão.`,
  acao: 'Definir status ou arquivar em massa.'
});
if (semOrigem) achados.push({
  id: 'sem-origem', severidade: 'alta', valor: semOrigem, pct: pct(semOrigem),
  texto: `${semOrigem.toLocaleString('pt-BR')} leads (${pct(semOrigem)}%) sem origem preenchida — quebra a atribuição de marketing.`,
  acao: 'Backfill de Lead_Source; tornar obrigatório na entrada.'
});
// duplicatas de taxonomia: mesmo status com grafias/variações diferentes
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
const grupos = {};
statusList.filter(s => s.status !== '(sem status)').forEach(s => {
  const k = norm(s.status).slice(0, 6); // prefixo: pega "prequalificado"/"prequalificacao", "desqualificado/..."
  (grupos[k] = grupos[k] || []).push(s);
});
const dups = Object.values(grupos).filter(g => g.length > 1);
if (dups.length) {
  const desc = dups.map(g => g.map(x => `'${x.status}' (${x.valor})`).join(' vs ')).join(' · ');
  achados.push({
    id: 'taxonomia-duplicada', severidade: 'media',
    valor: dups.flat().reduce((a, x) => a + x.valor, 0),
    texto: `Status duplicados convivendo: ${desc}.`,
    acao: 'Consolidar numa taxonomia única (a nova do SDR) e migrar os antigos.'
  });
}
if (sdrTotal) achados.push({
  id: 'adocao-taxonomia-nova', severidade: 'media', valor: sdrTotal, pct: pct(sdrTotal),
  texto: `Só ${sdrTotal} leads (${pct(sdrTotal)}% da base) usam a taxonomia nova do SDR — o resto é legado.`,
  acao: 'Migrar a base ativa pro fluxo novo.'
});

const snap = {
  _meta: {
    fonte: 'Zoho CRM · módulo Leads (org 657705661)',
    metodo: 'COQL agregado via MCP Zoho (contagem server-side sobre a base inteira)',
    gerado_em: new Date().toISOString().slice(0, 10),
    regra: 'REAL DATA ONLY (Regra 7) — todos os números vêm de contagem real do CRM. Nenhum valor estimado.',
    regenerar: 'node scripts/sync/sync_zoho_leads.js --from-file raw.json (dentro de sessão Claude com MCP Zoho)',
    nota_kanban: `A visão kanban do SDR é o custom-view ${SDR_CVID}. Os números por etapa são FOTOGRAFIA do estado atual (onde cada lead está parado), NÃO fluxo acumulado — por isso não é lido como taxa de conversão entre etapas.`
  },
  base_total: baseTotal,
  kanban_sdr: {
    titulo: 'Pipeline SDR · Marlison Estrela',
    custom_view_id: SDR_CVID,
    owner_id: SDR_OWNER_ID,
    total: sdrTotal,
    etapas
  },
  status_base_completa: statusList,
  origens,
  higiene: { titulo: 'Saúde da base de Leads', achados }
};

const out = JSON.stringify(snap, null, 2) + '\n';
if (DRY) { process.stdout.write(out); process.stderr.write(`\n🧪 DRY-RUN — nada gravado. base=${baseTotal} · SDR=${sdrTotal}\n`); }
else { fs.writeFileSync(OUT, out, 'utf8'); process.stderr.write(`✅ ${path.relative(process.cwd(), OUT)} — base=${baseTotal} leads · kanban SDR=${sdrTotal} · ${achados.length} achados de higiene\n`); }
