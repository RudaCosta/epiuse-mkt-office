// ════════════════════════════════════════════════════════════════════════════
// scripts/tests/hub-seguranca.js — o Marketing Hub (empresa toda) não vaza
// dado de vendas/CRM e o tracking dele é só do dono (Módulo 35).
//
// Roda: node scripts/tests/hub-seguranca.js   (sem servidor, sem rede)
// ════════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');

let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas++; };

// 1) /api/hub/resumo: só campos da lista branca, nenhum termo de vendas/CRM
const { resumo } = require(path.join(ROOT, 'routes/hub'));
const r = resumo();
ok(JSON.stringify(Object.keys(r)) === JSON.stringify(['agenda', 'artigos', 'voices', 'campanhas', 'time']), 'resumo: só as 5 chaves da página');
const chaves = (lista) => [...new Set(lista.flatMap(o => Object.keys(o || {})))].sort().join(',');
ok(chaves((r.time && r.time.areas) || []) === 'foco,icon,id,nome,responsavel', 'resumo: área do time só com id/nome/icon/foco/responsável');
ok(chaves([(r.time || {}).lideranca]) === 'cargo,foco,icon,nome', 'resumo: liderança sem aniversário, papel interno ou decisões');
const ev = (r.agenda && r.agenda.brasil || []).concat(r.agenda && r.agenda.latam || []);
ok(ev.every(e => Object.keys(e).every(k => ['m', 'd', 'n', 'lob', 'who', 'country', 'flag', 'local'].includes(k))), 'resumo: evento só com campos de agenda');
ok(chaves(r.campanhas || []) === 'cta,id,imagem,nome,org,tagline,tipo,url', 'resumo: campanha só com campos públicos');
ok((r.campanhas || []).every(c => !c.url || /^https:\/\//.test(c.url)), 'resumo: link de campanha só https');
const txt = JSON.stringify(r).toLowerCase();
const PROIBIDO = ['kpis_principais', 'kpi', 'sla', 'zoho', 'apollo', 'hubspot', 'rd station', 'deal', 'pipeline', 'oportunidade',
  'receita', 'faturamento', 'forecast', 'mdf', 'leads', 'lead scoring', 'aniversario', 'voices_connect', 'decide', 'baia', 'meta '];
const achados = PROIBIDO.filter(t => new RegExp('(^|[^a-z_])' + t.trim().replace(/ /g, '\\s') + '($|[^a-z_])').test(txt));   // palavra inteira ("ideal" ≠ "deal")
ok(!achados.length, 'resumo: nenhum termo de vendas/CRM/meta' + (achados.length ? ' — achou: ' + achados.join(', ') : ''));

// 2) A página não lê JSON cru do time e não traz o link do painel no HTML
const html = fs.readFileSync(path.join(ROOT, 'public/hub.html'), 'utf8');
const crus = ['/api/team.json', '/api/voices.json', '/api/artigos.json', '/api/events.json', '/api/areas.json', '/api/personas.json'].filter(u => html.includes(u));
ok(!crus.length, 'hub.html: só /api/hub/resumo (sem JSON cru)' + (crus.length ? ' — usa: ' + crus.join(', ') : ''));
ok(!/href="\/admin\//.test(html), 'hub.html: nenhum link de /admin no HTML (painel entra via JS só pro dono)');
ok(!/mktepiuse|PW\s*=/.test(html), 'hub.html: sem senha do gate antigo');

// 3) Permissões: colaborador abre o Hub e a API dele, nunca o painel nem a API do tracking
const { pode } = require(path.join(ROOT, 'routes/acesso'));
const colab = { email: 'colaborador@epiuse.com.br', role: 'hub' };
const sdr = { email: 'sdr@epiuse.com.br', role: 'pipeline' };
ok(pode(colab, 'GET', '/hub') && pode(colab, 'GET', '/api/hub/resumo'), 'colaborador abre /hub e /api/hub/resumo');
ok(pode(colab, 'POST', '/api/analytics/track'), 'colaborador grava o próprio beacon');
for (const u of [colab, sdr]) {
  ok(!pode(u, 'GET', '/admin/hub'), `${u.role}: /admin/hub fechado`);
  ok(!pode(u, 'GET', '/api/admin/analytics/hub'), `${u.role}: /api/admin/analytics/hub fechado`);
}
for (const p of ['/api/pipeline-snapshot.json', '/api/zoho-leads-snapshot.json', '/api/rd-snapshot.json', '/api/area/pipeline', '/api/areas.json'])
  ok(!pode(colab, 'GET', p), `colaborador: ${p} fechado`);

// 4) Painel único do tracking: config 'hub' e HTML fora de public/
const painel = fs.readFileSync(path.join(ROOT, 'private/admin-area-tracking.html'), 'utf8');
ok(/\bhub:\s*\{\s*\n?\s*kind: 'hub'/.test(painel), 'painel: config hub presente');
ok(!fs.existsSync(path.join(ROOT, 'public/admin-area-tracking.html')), 'painel: HTML só em private/');
const an = fs.readFileSync(path.join(ROOT, 'routes/analytics.js'), 'utf8');
ok(/hub:\s*\{ path: '\/hub',\s*painel: '\/admin\/hub' \}/.test(an), 'analytics: AREA_TRACK.hub → /admin/hub (requireOwner por e-mail)');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok ✓');
process.exit(falhas ? 1 : 0);
