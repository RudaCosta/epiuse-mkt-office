#!/usr/bin/env node
// Cobertura das permissões: toda rota registrada e todo arquivo de public/ tem
// que casar com uma regra explícita de routes/acesso.js. O que cai no "nega por
// padrão" sem estar listado aqui é rota nova esquecida — e quebraria pra todo
// mundo menos o super admin.
//
// Uso: node scripts/tests/acesso-cobertura.js   (sai com 1 se faltar regra)
process.env.DATA_DIR = process.env.DATA_DIR || require('os').tmpdir() + '/acesso-cobertura';
require('fs').mkdirSync(process.env.DATA_DIR, { recursive: true });

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const { areasDoCaminho, ASSET_EXT } = require(path.join(ROOT, 'routes/acesso'));

// ── rotas registradas no código ─────────────────────────────────────────────
const fontes = ['server.js', ...fs.readdirSync(path.join(ROOT, 'routes')).map(f => 'routes/' + f)]
  .filter(f => f.endsWith('.js'));
const re = /(?:app|router)\.(get|post|put|delete|patch)\(\s*(\[[^\]]*\]|['"`][^'"`]+['"`])/g;
const rotas = [];
for (const f of fontes) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  let m;
  while ((m = re.exec(src))) {
    for (const p of m[2].match(/['"`]([^'"`]+)['"`]/g).map(x => x.slice(1, -1))) {
      if (!p.startsWith('/') || p.includes('${')) continue;      // rotas montadas por template ficam de fora
      rotas.push({ origem: f, metodo: m[1].toUpperCase(), caminho: p.replace(/\(.*?\)/g, '') });
    }
  }
}

// ── arquivos de public/ que não são asset ───────────────────────────────────
const arquivos = [];
(function andar(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) andar(abs);
    else {
      const url = '/' + path.relative(path.join(ROOT, 'public'), abs).split(path.sep).join('/');
      if (!ASSET_EXT.test(url)) arquivos.push(url);
    }
  }
})(path.join(ROOT, 'public'));

// Um ":param" vira um valor de exemplo pra testar a regra.
const exemplo = p => p.replace(/:[A-Za-z_]+/g, 'x1');

const semRegra = [];
for (const r of rotas) {
  if (!areasDoCaminho(r.metodo, exemplo(r.caminho))) semRegra.push(`${r.metodo.padEnd(6)} ${r.caminho}   (${r.origem})`);
}
for (const a of arquivos) {
  if (!areasDoCaminho('GET', a)) semRegra.push(`GET    ${a}   (arquivo em public/)`);
}

console.log(`rotas: ${rotas.length} · arquivos de dados/páginas em public/: ${arquivos.length}`);
if (semRegra.length) {
  console.log(`\n${semRegra.length} sem regra (cairiam em "só super admin"):`);
  semRegra.forEach(x => console.log('  ' + x));
  process.exit(1);
}
console.log('todas com regra ✓');
