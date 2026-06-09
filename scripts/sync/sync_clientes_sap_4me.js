#!/usr/bin/env node
/**
 * sync_clientes_sap_4me.js
 * Lê o XLSX "clientes epiuse sap 4 me" (705 clientes globais SAP) e faz POST
 * pra /api/clientes-sap-4me/sync do Office.
 *
 * Uso:
 *   node scripts/sync/sync_clientes_sap_4me.js [--dry-run] [--target local|railway|all]
 *
 * Node v24: usa localModules pattern (mesmo dos outros syncs).
 */
'use strict';

const _fs0 = require('fs');
const _os0 = require('os');
const _winUser = _os0.userInfo().username;
const _localCandidates = [
  `C:/Users/${_winUser}/.epiuse-optimizer/node_modules`,
  'C:/Users/Ruds/.epiuse-optimizer/node_modules',
  'C:/Users/rudac/.epiuse-optimizer/node_modules',
];
const _localModules = _localCandidates.find(p => _fs0.existsSync(p)) || '';
const path = require('path');
const XLSX = require(_localModules ? path.join(_localModules, 'xlsx') : 'xlsx');
const fs   = require('fs');
const os   = require('os');

const EDITOR_TOKEN = process.env.EDITOR_TOKEN || 'eubr-voices-edit-2026';
const DRY_RUN = process.argv.includes('--dry-run');
const TARGET = process.argv.includes('--target')
  ? process.argv[process.argv.indexOf('--target') + 1]
  : 'local';

// ── LOCALIZA XLSX ─────────────────────────────────────────────────────────────
const user = os.userInfo().username;
const nome = 'clientes epiuse sap 4 me - tem brasil e todos inputados dos outros paises.xlsx';
const candidates = [
  `C:/Users/${user}/Desktop/ROADMAP MKT OFFICE JUN 2026/04 Cases/${nome}`,
  `C:/Users/Ruds/Desktop/ROADMAP MKT OFFICE JUN 2026/04 Cases/${nome}`,
  `C:/Users/rudac/Desktop/ROADMAP MKT OFFICE JUN 2026/04 Cases/${nome}`,
  `C:/epiuse-mkt-office/vault/00-contexto/cases/${nome}`,
];
const filePath = candidates.find(c => fs.existsSync(c));
if (!filePath) {
  process.stderr.write(JSON.stringify({ error: 'XLSX nao encontrado. Candidatos: ' + JSON.stringify(candidates) }) + '\n');
  process.exit(1);
}

// ── DATAS ─────────────────────────────────────────────────────────────────────
// Excel serial OU Date OU string. 9999-12-31 = placeholder "sem data" → null.
function toISO(v) {
  if (v == null || v === '') return null;
  let d;
  if (v instanceof Date) d = v;
  else if (typeof v === 'number') d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
  else { d = new Date(v); if (isNaN(d)) return null; }
  const y = d.getUTCFullYear();
  if (y >= 9999 || y < 2000) return null; // placeholder / lixo
  return d.toISOString().slice(0, 10);
}

// ── LÊ + MAPEIA ───────────────────────────────────────────────────────────────
const wb = XLSX.readFile(filePath, { cellDates: true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

const G = (r, ...keys) => { for (const k of keys) if (r[k] != null && r[k] !== '') return r[k]; return ''; };

const clientes = rows.map((r, i) => {
  const projId = String(G(r, 'ID do projeto', 'ID do Projeto') || `row-${i}`);
  const pacote = String(G(r, 'Pacotes') || i);
  return {
  // pkg_id = chave única por LINHA (cada projeto tem N pacotes; ID do projeto repete)
  pkg_id:            `${projId}-${pacote}-${i}`,
  projeto_id:        projId,
  conta_parceiro:    String(G(r, 'Conta do parceiro')),
  nome_cliente:      String(G(r, 'Nome do cliente')),
  pais:              String(G(r, 'País', 'Pais')),
  area_subsolucao:   String(G(r, 'Área de subsolução', 'Area de subsolucao')),
  pacotes:           String(G(r, 'Pacotes')),
  escopo_pacote:     String(G(r, 'Escopo do pacote')),
  etapa:             String(G(r, 'Etapa do pacote')),
  data_kickoff:      toISO(G(r, 'Data de kick-off')),
  golive_planejado:  toISO(G(r, 'Entrada em operação planejada', 'Entrada em operacao planejada')),
  golive_confirmado: toISO(G(r, 'Entrada em operação confirmada', 'Entrada em operacao confirmada')),
  relevante_nivel:   String(G(r, 'Relevante para o nivelamento')),
  gerente_projeto:   String(G(r, 'Gerente de projeto')),
  };
}).filter(c => c.nome_cliente);

process.stderr.write(`[sap4me] ${clientes.length} clientes lidos de ${path.basename(filePath)}\n`);

if (DRY_RUN) {
  const byPais = {}, byEtapa = {};
  for (const c of clientes) { byPais[c.pais] = (byPais[c.pais]||0)+1; byEtapa[c.etapa] = (byEtapa[c.etapa]||0)+1; }
  process.stderr.write('[sap4me] DRY RUN · etapas: ' + JSON.stringify(byEtapa) + '\n');
  process.stderr.write('[sap4me] paises: ' + JSON.stringify(byPais) + '\n');
  process.stdout.write(JSON.stringify({ clientes }, null, 2));
  process.exit(0);
}

// ── POST ──────────────────────────────────────────────────────────────────────
const TARGETS = {
  local:   ['http://localhost:3000/api/clientes-sap-4me/sync'],
  railway: ['https://epiuse-voices-optimizer.up.railway.app/api/clientes-sap-4me/sync'],
};
TARGETS.all = [...TARGETS.local, ...TARGETS.railway];
const urls = TARGETS[TARGET] || TARGETS.local;

(async () => {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-editor-token': EDITOR_TOKEN },
        body: JSON.stringify({ clientes }),
      });
      const json = await res.json();
      if (!res.ok) { console.error(`[sap4me] ERRO ${url}:`, json); process.exitCode = 1; }
      else console.log(`[sap4me] OK ${url} — ${json.upserted}/${json.total_received} upsertados`);
    } catch (e) { console.error(`[sap4me] ERRO ${url}:`, e.message); process.exitCode = 1; }
  }
})();
