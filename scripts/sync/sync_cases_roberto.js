#!/usr/bin/env node
// sync_cases_roberto.js — le xlsx do Roberto e imprime JSON (equivalente ao .py)
// Node.js — nao requer Python, funciona na maquina rudac
'use strict';

// Resolve modules do optimizer (mesmo padrao dos outros scripts — Node v24 nao
// aceita require('xlsx') direto sem node_modules local)
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
const os   = require('os');
const fs   = require('fs');

// ── LOCALIZA O XLSX ───────────────────────────────────────────────────────────
const user = os.userInfo().username;         // rudac, Ruds, etc.
const od   = `C:/Users/${user}/OneDrive - EPI USE BRASIL SERVICOS EM SISTEMAS LTDA`;
const nome = 'Controle de Cases Cliente Referencia Empresas Transformadoras 2025.xlsx';
const dir  = `${od}/MARKETING/Customer Reference/Empresas Transformadoras`;

const candidates = [
  path.join(dir, nome),
  `C:/Users/rudac/OneDrive - EPI USE BRASIL SERVICOS EM SISTEMAS LTDA/MARKETING/Customer Reference/Empresas Transformadoras/${nome}`,
  `C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVICOS EM SISTEMAS LTDA/MARKETING/Customer Reference/Empresas Transformadoras/${nome}`,
  // Com acentos (variante alternativa do OneDrive)
  `C:/Users/rudac/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referência Empresas Transformadoras 2025.xlsx`,
  `C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referência Empresas Transformadoras 2025.xlsx`,
];

let filePath = candidates.find(c => fs.existsSync(c));
if (!filePath) {
  process.stderr.write(JSON.stringify({ error: 'Arquivo xlsx nao encontrado. Candidatos: ' + JSON.stringify(candidates) }) + '\n');
  process.exit(1);
}

// ── LE PLANILHA ───────────────────────────────────────────────────────────────
const wb       = XLSX.readFile(filePath, { cellDates: true });
const dfCases  = XLSX.utils.sheet_to_json(wb.Sheets['Cases']            || wb.Sheets[wb.SheetNames[0]], { defval: '' });
const dfPerg   = XLSX.utils.sheet_to_json(wb.Sheets['Perguntas Referência'] || wb.Sheets['Perguntas Referencia'] || wb.Sheets[wb.SheetNames[1]] || {}, { defval: '' });

// ── MAPAS ─────────────────────────────────────────────────────────────────────
const statusMap = {
  'Publicado':  'case-publicado',
  'Em edição': 'em-edicao',
  'Em edicao':  'em-edicao',
  'Negociação': 'negociacao',
  'Negociacao': 'negociacao',
  'Declinado':  'declinado',
};

function clean(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (s.toLowerCase() === 'nan' || s.toLowerCase() === 'none') return '';
  return s;
}

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // remove acentos
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .substring(0, 60);
}

// ── MONTA RESPOSTAS DE QUALIFICACAO ───────────────────────────────────────────
const respostas = {};
for (const r of dfPerg) {
  const emp = clean(r['Empresa'] || r[Object.keys(r)[0]]);
  if (!emp) continue;
  const vals = Object.values(r).slice(7, 10).map(clean).filter(Boolean);
  if (vals.length) respostas[emp] = vals.join(' \n\n').substring(0, 2000);
}

// ── PROCESSA CASES ────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const items = [];

dfCases.forEach((r, i) => {
  const emp = clean(r['Empresa'] || r[Object.keys(r)[0]]);
  if (!emp) return;

  const statusRaw = clean(r['Status']);
  const status    = statusMap[statusRaw] || 'em-avaliacao';
  const casePub   = status === 'case-publicado' ? 1 : 0;
  const url       = clean(r['Mais Informações'] || r['Mais Informacoes'] || '');
  const obs       = clean(r['Observações| Controle Marketing'] || r['Observacoes| Controle Marketing'] || '');
  const civ       = clean(r['CIV'] || '').substring(0, 300);
  const maisInfo  = url.includes('http') ? url : '';

  const resumeParts = [];
  if (maisInfo)             resumeParts.push(`[Case publicado] ${maisInfo}`);
  if (civ)                  resumeParts.push(`CIV: ${civ}`);
  if (respostas[emp])       resumeParts.push(`Resposta de qualificacao:\n${respostas[emp].substring(0, 600)}...`);

  items.push({
    sharepoint_id:     `roberto-cases-2025-${slugify(emp)}-${i}`,
    conta:             `EUBR-CR-${String(i + 1).padStart(3, '0')}`,
    cliente_nome:      emp,
    contato_principal: clean(r['Nome e Cargo do Contato'] || ''),
    contato_email:     clean(r['E-mail do Contato'] || r['Email do Contato'] || ''),
    csm:               clean(r['Contato EUBR'] || ''),
    lob:               clean(r['Área EUBR'] || r['Area EUBR'] || '').substring(0, 50),
    status,
    nps:               null,
    valor_anual:       null,
    ultimo_contato:    today,
    observacoes:       (obs || civ).substring(0, 2000),
    case_publicavel:   casePub,
    case_resumo:       resumeParts.join('\n\n').substring(0, 1000),
  });
});

process.stdout.write(JSON.stringify({ items }, null, 2));
