#!/usr/bin/env node
/**
 * log_voice_ssi.js — registra medição SSI semanal de um Voice
 * Uso:
 *   node scripts/sync/log_voice_ssi.js carlos-furigo --ssi=42 [--seguidores=1234] [--posts=3] [--nota="..."] [--target=local|railway|all]
 *
 * Envia POST pra /api/voices/:slug/ssi (autenticado por EDITOR_TOKEN).
 * Default target = all (local + Railway).
 */
'use strict';

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));
const flag = (k, def) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : def; };

if (!slug) { console.error('uso: node log_voice_ssi.js <slug> --ssi=N [--seguidores=N] [--posts=N] [--nota="X"] [--target=all]'); process.exit(1); }

const ssi = parseInt(flag('ssi'), 10);
if (isNaN(ssi) || ssi < 0 || ssi > 100) { console.error('--ssi=0-100 obrigatório'); process.exit(1); }

const body = {
  ssi,
  seguidores: flag('seguidores') ? parseInt(flag('seguidores'), 10) : null,
  posts_mes: flag('posts') ? parseInt(flag('posts'), 10) : null,
  nota: flag('nota', ''),
};
const target = flag('target', 'all');
const TOKEN = process.env.EDITOR_TOKEN;
if (!TOKEN) { console.error('ERRO: variável de ambiente EDITOR_TOKEN não definida.'); process.exit(1); }
const URLS = {
  local: 'http://localhost:3000',
  railway: 'https://epiuse-voices-optimizer.up.railway.app',
};
const targets = target === 'all' ? ['local', 'railway'] : [target];

(async () => {
  for (const t of targets) {
    const url = `${URLS[t]}/api/voices/${slug}/ssi`;
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-editor-token': TOKEN }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) console.log(`[${t}] OK · SSI ${ssi} registrado · delta baseline ${j.delta_baseline >= 0 ? '+' : ''}${j.delta_baseline} · próxima medição ${j.proxima}`);
      else console.error(`[${t}] ERRO:`, j.error);
    } catch (e) { console.error(`[${t}] ERRO:`, e.message); }
  }
})();
