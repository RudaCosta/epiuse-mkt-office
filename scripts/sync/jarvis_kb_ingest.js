#!/usr/bin/env node
// jarvis_kb_ingest.js — valida e mescla itens na KB do JARVIS (produtos SAP / battle cards).
//
// Divisão de trabalho (Regra 5 + Regra 7):
//   - O Claude LÊ o arquivo que o Rudá entrega (xlsx/pdf/pptx/docx) e produz um JSON normalizado.
//   - ESTE script valida esse JSON contra o schema da KB, mescla por `id` e grava o arquivo certo.
//   - Nada é inventado: o que entra vem do material real. Itens sem campos obrigatórios são rejeitados.
//
// Uso:
//   node scripts/sync/jarvis_kb_ingest.js produtos      <input.json> [--dry-run] [--replace]
//   node scripts/sync/jarvis_kb_ingest.js battle-cards  <input.json> [--dry-run] [--replace]
//
//   input.json pode ser um array de itens OU { produtos:[...] } / { battle_cards:[...] }.
//   --dry-run  : valida e mostra o resultado, sem gravar.
//   --replace  : substitui a lista inteira (default = merge por id, preservando o resto).
'use strict';

const fs = require('fs');
const path = require('path');

const MOD_DIR = path.join(__dirname, '..', '..', 'modulos', '11-jarvis-sdr');
const TARGETS = {
  'produtos':     { file: 'kb-produtos-sap.json', key: 'produtos',     req: ['id', 'nome', 'lob', 'o_que_e'] },
  'battle-cards': { file: 'kb-battle-cards.json', key: 'battle_cards', req: ['id', 'tema', 'nossa_vantagem'] },
};

function die(msg) { process.stderr.write('❌ ' + msg + '\n'); process.exit(1); }

// ── args ──────────────────────────────────────────────────────────────────────
const [tipo, inputPath, ...flags] = process.argv.slice(2);
const dryRun  = flags.includes('--dry-run');
const replace = flags.includes('--replace');
const target  = TARGETS[tipo];

if (!target || !inputPath) {
  die('uso: node jarvis_kb_ingest.js <produtos|battle-cards> <input.json> [--dry-run] [--replace]');
}
if (!fs.existsSync(inputPath)) die(`input não encontrado: ${inputPath}`);

// ── lê input (Claude normalizou) ───────────────────────────────────────────────
let raw;
try { raw = JSON.parse(fs.readFileSync(inputPath, 'utf8')); }
catch (e) { die(`input não é JSON válido: ${e.message}`); }
let itens = Array.isArray(raw) ? raw : (raw[target.key] || []);
if (!Array.isArray(itens) || !itens.length) die(`input sem itens em "${target.key}" (nem array na raiz).`);

// ── valida (Regra 7: campos obrigatórios, nada de placeholder vazio) ────────────
const aceitos = [], rejeitados = [];
for (const it of itens) {
  const faltando = target.req.filter(f => !String(it && it[f] != null ? it[f] : '').trim());
  if (faltando.length) { rejeitados.push({ id: it && it.id, faltando }); continue; }
  if (!it.fonte) it.fonte = path.basename(inputPath); // rastreabilidade da origem
  aceitos.push(it);
}
if (rejeitados.length) {
  process.stderr.write('⚠️  itens rejeitados (faltam obrigatórios):\n');
  rejeitados.forEach(r => process.stderr.write(`   - ${r.id || '(sem id)'} → falta: ${r.faltando.join(', ')}\n`));
}
if (!aceitos.length) die('nenhum item válido pra ingerir.');

// ── carrega KB atual e mescla por id ────────────────────────────────────────────
const kbPath = path.join(MOD_DIR, target.file);
let kb;
try { kb = JSON.parse(fs.readFileSync(kbPath, 'utf8')); }
catch (e) { die(`KB alvo não carregada (${target.file}): ${e.message}`); }

const atual = Array.isArray(kb[target.key]) ? kb[target.key] : [];
let novos = 0, atualizados = 0, final;
if (replace) {
  final = aceitos;
} else {
  const byId = new Map(atual.map(x => [x.id, x]));
  for (const it of aceitos) { (byId.has(it.id) ? atualizados++ : novos++); byId.set(it.id, it); }
  final = [...byId.values()];
}
kb[target.key] = final;
kb._meta = kb._meta || {};
kb._meta.estado = `✅ ativo (${final.length} ${target.key})`;
kb._meta.atualizado_em = new Date().toISOString().slice(0, 10);

// ── grava (ou dry-run) ──────────────────────────────────────────────────────────
const out = JSON.stringify(kb, null, 2) + '\n';
if (dryRun) {
  process.stdout.write(out);
  process.stderr.write(`\n🧪 DRY-RUN — nada gravado. ${target.key}: +${novos} novos, ${atualizados} atualizados, total ${final.length}.\n`);
} else {
  fs.writeFileSync(kbPath, out, 'utf8');
  process.stderr.write(`✅ ${target.file}: +${novos} novos, ${atualizados} atualizados, total ${final.length}. Estado: ${kb._meta.estado}\n`);
  process.stderr.write('   → o JARVIS pega no próximo boot do server. Deploy só sob "sobe" (Regra 3).\n');
}
