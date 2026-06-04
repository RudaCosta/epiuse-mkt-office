// apollo_pipeline_sync.js — puxa dados reais do Apollo (REST API) e grava pipeline-snapshot.json
// Rodado pela Tarefa Agendada diaria (EPI-USE-Apollo-Sync) — sync AUTOMATICO, sem Claude no meio.
// Uso manual: node scripts/integrations/apollo_pipeline_sync.js
const fs = require('fs');
const path = require('path');

let KEY = process.env.APOLLO_API_KEY;
if (!KEY) {
  // Tenta caminhos conhecidos do .env off-repo (Windows dev)
  const envCandidates = [
    'C:/Users/rudac/.epiuse-optimizer/.env',
    'C:/Users/Ruds/.epiuse-optimizer/.env',
    path.resolve(__dirname, '../../.env'),
  ];
  for (const p of envCandidates) {
    try {
      const t = fs.readFileSync(p, 'utf8');
      const m = t.match(/APOLLO_API_KEY=(.+)/);
      if (m) { KEY = m[1].trim(); break; }
    } catch {}
  }
}
if (!KEY) { console.error('APOLLO_API_KEY ausente (.env off-repo)'); process.exit(1); }

const H = { 'X-Api-Key': KEY, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' };
async function apollo(p, body) {
  const r = await fetch('https://api.apollo.io/api/v1' + p, { method: 'POST', headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(p + ' -> HTTP ' + r.status);
  return r.json();
}

(async () => {
  const contacts = await apollo('/contacts/search', { page: 1, per_page: 1 });
  const camps = await apollo('/emailer_campaigns/search', { per_page: 100 });
  const accounts = await apollo('/accounts/search', { page: 1, per_page: 5 });
  const list = camps.emailer_campaigns || [];
  const ativos = list.filter(c => c.active).length;
  const contasTotal = accounts.pagination ? accounts.pagination.total_entries : null;
  const topContas = (accounts.accounts || []).slice(0, 5).map(a => a.name).filter(Boolean);

  const snap = {
    fonte: 'Apollo API (sync automatico diario)',
    ultima_sync: new Date().toISOString().slice(0, 10),
    ultima_sync_ts: new Date().toISOString(),
    conta: 'EPI-USE Brasil',
    contatos_total: contacts.pagination ? contacts.pagination.total_entries : null,
    contatos_obs: '\u{1F7E1} base Apollo total — inclui importados/seed (filtrar Brasil/label p/ pipeline puro).',
    contas_total: contasTotal,
    top_contas: topContas,
    sequencias_total: list.length,
    sequencias_ativas: ativos,
    sequencias_obs: '\u{1F7E2} ' + ativos + ' ativa(s) de ' + list.length + ' cadastradas (real).',
    pipeline_R$: null,
    pipeline_R$_obs: '⏳ Apollo nao tem valor R$ de oportunidade — precisa CRM (HubSpot/Pipedrive/Salesforce).'
  };

  const out = path.resolve(__dirname, '../../public/api/pipeline-snapshot.json');
  fs.writeFileSync(out, JSON.stringify(snap, null, 2), 'utf8');
  console.log('OK pipeline-snapshot:', snap.contatos_total, 'contatos,', contasTotal, 'empresas,', list.length, 'seq (' + ativos + ' ativas)');
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
