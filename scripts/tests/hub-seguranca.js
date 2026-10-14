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
const termos = (texto, lista = PROIBIDO) => lista.filter(t => new RegExp('(^|[^a-z_])' + t.trim().replace(/ /g, '\\s') + '($|[^a-z_])').test(texto));   // palavra inteira ("ideal" ≠ "deal")
const achados = termos(txt);
ok(!achados.length, 'resumo: nenhum termo de vendas/CRM/meta' + (achados.length ? ' — achou: ' + achados.join(', ') : ''));
ok(r.time && typeof r.time.textos_revisados === 'boolean', 'resumo: avisa se o texto de IA já foi revisado (selo 🤖 na página)');

// 2) A página não lê JSON cru do time e não traz o link do painel no HTML
const html = fs.readFileSync(path.join(ROOT, 'public/hub.html'), 'utf8');
const crus = ['/api/team.json', '/api/voices.json', '/api/artigos.json', '/api/events.json', '/api/areas.json', '/api/personas.json'].filter(u => html.includes(u));
ok(!crus.length, 'hub.html: só /api/hub/resumo (sem JSON cru)' + (crus.length ? ' — usa: ' + crus.join(', ') : ''));
ok(!/href="\/admin\//.test(html), 'hub.html: nenhum link de /admin no HTML (o chip do painel só ganha href pro dono)');
ok(html.includes('<span class="ri">${esc(x.ic)}</span>'), 'hub.html: ícone do resultado da busca escapado (flag do evento não vira HTML)');
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

// 4) Brechas da revisão pré-deploy: caminho torto e JSONs do time pra colaborador
const acesso = require(path.join(ROOT, 'routes/acesso'));
for (const p of ['/img/..%2fapi%2fzoho-leads-snapshot.json', '/img/%2E%2E/api/team.json', '/go/..%2Fapi%2Fpipeline-snapshot.json',
  '/img/../api/team.json', '/img/..%5capi%5cteam.json', '/api/game/..%2fteam.json', '/x/%00'])
  ok(acesso.caminhoTorto(p), `caminho torto recusado: ${p}`);
for (const p of ['/hub', '/img/campanhas/golplaca-fante.jpg', '/v/ana.costa', '/api/utm/link/abc%40x', '/api/admin/users/ruda.costa%40epiuse.com.br'])
  ok(!acesso.caminhoTorto(p), `caminho legítimo passa: ${p}`);
const teamCheio = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/api/team.json'), 'utf8'));
const teamColab = acesso.teamParaColaborador(teamCheio);
const tTxt = JSON.stringify(teamColab).toLowerCase();
const tAch = termos(tTxt, PROIBIDO.filter(t => t !== 'aniversario'));   // aniversário é usado pelo Cafezinho e pelo Game
ok(!tAch.length, 'team.json pra colaborador: sem meta/SLA/termo de vendas/CRM' + (tAch.length ? ' — achou: ' + tAch.join(', ') : ''));
ok(!/rd\s?station|lead scoring|outbound/.test(tTxt), 'team.json pra colaborador: foco interno das áreas não sai');
const apelidos = (teamCheio.areas || []).filter(a => a.responsavel && a.responsavel.apelido).map(a => a.responsavel.apelido);
ok(apelidos.every(ap => (teamColab.areas || []).some(a => a.responsavel.apelido === ap)), 'team.json pra colaborador: mantém o apelido (Cafezinho casa Duda/Gui)');
const clColab = acesso.changelogParaColaborador(JSON.parse(fs.readFileSync(path.join(ROOT, 'public/api/changelog.json'), 'utf8')));
ok(!clColab.next && (clColab.releases || []).every(x => Object.keys(x).every(k => ['version', 'date', 'status'].includes(k))), 'changelog.json pra colaborador: só versão, data e status');

// 5) Painel único do tracking: config 'hub' e HTML fora de public/
const painel = fs.readFileSync(path.join(ROOT, 'private/admin-area-tracking.html'), 'utf8');
ok(/\bhub:\s*\{\s*\n?\s*kind: 'hub'/.test(painel), 'painel: config hub presente');
ok(!fs.existsSync(path.join(ROOT, 'public/admin-area-tracking.html')), 'painel: HTML só em private/');
const an = fs.readFileSync(path.join(ROOT, 'routes/analytics.js'), 'utf8');
ok(/hub:\s*\{ path: '\/hub',\s*painel: '\/admin\/hub' \}/.test(an), 'analytics: AREA_TRACK.hub → /admin/hub (requireOwner por e-mail)');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok ✓');
process.exit(falhas ? 1 : 0);
