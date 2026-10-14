#!/usr/bin/env node
// Cobertura da Central de Fontes (Módulo 36): todo script de sync/integração e
// todo JSON de dados em public/api/ tem que estar no registro de routes/fontes.js
// (ou na lista do que não é fonte, com o motivo). Fonte nova sem dono, prazo e
// "última atualização" é exatamente o que deixava dado parado meses sem ninguém ver.
//
// Uso: node scripts/tests/fontes-cobertura.js   (sai com 1 se faltar algo)
process.env.DATA_DIR = process.env.DATA_DIR || require('os').tmpdir() + '/fontes-cobertura';
process.env.FONTES_AGENDADOR = 'false';
require('fs').mkdirSync(process.env.DATA_DIR, { recursive: true });

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const { FONTES, NAO_SAO_FONTE } = require(path.join(ROOT, 'routes/fontes'));
const { AREAS } = require(path.join(ROOT, 'routes/acesso'));

const problemas = [];
const MODOS = ['servidor', 'motor', 'pc', 'manual', 'pendente'];

// ── O registro em si ────────────────────────────────────────────────────────
const ids = new Set();
for (const f of FONTES) {
  const quem = `fonte "${f.id}"`;
  if (ids.has(f.id)) problemas.push(`${quem} repetida`);
  ids.add(f.id);
  if (!MODOS.includes(f.modo)) problemas.push(`${quem}: modo "${f.modo}" inválido`);
  if (!f.nome || !f.dona || !f.areas || !f.areas.length) problemas.push(`${quem}: falta nome, dona ou área`);
  (f.areas || []).forEach(a => { if (!AREAS[a]) problemas.push(`${quem}: área "${a}" não existe em routes/acesso.js`); });
  if (['motor', 'pc', 'servidor'].includes(f.modo) && !f.sla_h) problemas.push(`${quem}: automática sem sla_h`);
  if (f.modo === 'manual' && !f.revisar_dias) problemas.push(`${quem}: curada à mão sem revisar_dias`);
  if (f.modo === 'pendente' && !f.falta) problemas.push(`${quem}: pendente sem dizer o que falta`);
  if (['motor', 'pc'].includes(f.modo) && !f.ultima) problemas.push(`${quem}: sem ultima() — de onde sai a data real?`);
  if (f.modo === 'servidor' && (!f.estado || !f.acao)) problemas.push(`${quem}: servidor sem estado()/acao()`);
  if (f.modo === 'motor') {
    if (!f.motor || !['planilha', 'api'].includes(f.motor.tipo) || !(f.motor.cmds || []).length) problemas.push(`${quem}: motor incompleto`);
    for (const [cmd, script] of (f.motor && f.motor.cmds) || []) {
      if (!['node', 'python'].includes(cmd)) problemas.push(`${quem}: comando "${cmd}" (use node ou python)`);
      if (!fs.existsSync(path.join(ROOT, script))) problemas.push(`${quem}: script ${script} não existe`);
      if (!(f.scripts || []).includes(script)) problemas.push(`${quem}: ${script} roda no motor mas não está em scripts`);
    }
    for (const a of (f.motor && f.motor.persistir) || []) {
      if (!(f.arquivos || []).includes(a)) problemas.push(`${quem}: persiste ${a} mas não lista em arquivos`);
    }
  }
  (f.scripts || []).forEach(s => { if (!fs.existsSync(path.join(ROOT, s))) problemas.push(`${quem}: script ${s} não existe`); });
  (f.arquivos || []).forEach(a => { if (!fs.existsSync(path.join(ROOT, 'public/api', a))) problemas.push(`${quem}: public/api/${a} não existe`); });
  (f.telas || []).forEach(t => { if (!t.startsWith('/')) problemas.push(`${quem}: tela "${t}" deve começar com /`); });
}

// ── Scripts de sync/integração ──────────────────────────────────────────────
const doRegistro = new Set(FONTES.flatMap(f => f.scripts || []));
const scripts = ['scripts/sync', 'scripts/integrations'].flatMap(d =>
  fs.readdirSync(path.join(ROOT, d)).filter(n => /\.(js|py)$/.test(n)).map(n => `${d}/${n}`));
for (const s of scripts) {
  if (!doRegistro.has(s) && !NAO_SAO_FONTE.scripts[s]) problemas.push(`${s} não está em nenhuma fonte (nem em NAO_SAO_FONTE.scripts)`);
}

// ── JSONs de dados em public/api ────────────────────────────────────────────
const arquivos = new Set(FONTES.flatMap(f => f.arquivos || []));
for (const a of fs.readdirSync(path.join(ROOT, 'public/api')).filter(n => n.endsWith('.json'))) {
  if (!arquivos.has(a) && !NAO_SAO_FONTE.arquivos[a]) problemas.push(`public/api/${a} não está em nenhuma fonte (nem em NAO_SAO_FONTE.arquivos)`);
}

console.log(`fontes: ${FONTES.length} · scripts: ${scripts.length} · JSONs em public/api: ${fs.readdirSync(path.join(ROOT, 'public/api')).filter(n => n.endsWith('.json')).length}`);
if (problemas.length) {
  console.log(`\n${problemas.length} problema(s):`);
  problemas.forEach(p => console.log('  ' + p));
  process.exit(1);
}
console.log('tudo registrado ✓');
