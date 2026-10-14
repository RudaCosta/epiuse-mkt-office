// ════════════════════════════════════════════════════════════════════════════
// scripts/tests/tracking-dono.js — tracking é uma área só (Analytics) e só o
// dono vê. Nenhum menu, botão, página pública ou nota de versão mostra isso
// pra mais ninguém (Rudá, 14/out/2026).
//
// Roda: node scripts/tests/tracking-dono.js   (sem servidor, sem rede)
// ════════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const ler = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas++; };

const PAINEIS = /\/admin\/(analytics|intelligence|eventos|pipeline|brand|relatorio|metas|hub)\b|\/cafezinho\/tracking/;

// 1) Menu: um item só, e só pro e-mail do dono
const nav = ler('public/office-nav.js');
const linksNav = nav.match(/href: '\/admin\/[a-z]+'/g) || [];
const trkNav = linksNav.filter(h => PAINEIS.test(h));
ok(trkNav.length === 1 && trkNav[0] === "href: '/admin/analytics'", 'menu: tracking num item só (/admin/analytics)' + (trkNav.length !== 1 ? ' — achou: ' + trkNav.join(', ') : ''));
ok(/if \(this\._owner && grpA && !grpA\.links\.some\(l => l\.href === '\/admin\/analytics'\)\)/.test(nav), 'menu: item Analytics só com this._owner (e-mail do dono, não super admin)');

// 2) Nenhuma página/JS público aponta pros painéis nem pergunta "sou o dono?"
const pub = [];
(function walk(d) {
  for (const n of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const rel = path.join(d, n.name);
    if (n.isDirectory()) { if (!/_versoes|node_modules/.test(n.name)) walk(rel); }
    else if (/\.(html|js)$/.test(n.name)) pub.push(rel);
  }
})('public');
const comLink = pub.filter(f => f !== path.join('public', 'office-nav.js') && PAINEIS.test(ler(f)));
ok(!comLink.length, 'páginas públicas: nenhum link pros painéis' + (comLink.length ? ' — ' + comLink.join(', ') : ''));
const perguntaDono = pub.filter(f => f !== path.join('public', 'office-nav.js') && ler(f).includes('/api/analytics/owner') && !/relatorio\.html$/.test(f));
ok(!perguntaDono.length, 'páginas públicas: nenhum chip de dono (só o Relatório consulta, pro template)' + (perguntaDono.length ? ' — ' + perguntaDono.join(', ') : ''));
ok(!/ownerChip|ownChip|own-pill|Tracking do Cafezinho/.test(pub.map(ler).join('\n')), 'páginas públicas: sem chips/pílulas "Quem viu"');

// 3) Analytics e abas só em private/, servidos com requireOwner
ok(!fs.existsSync(path.join(ROOT, 'public/admin-analytics.html')) && fs.existsSync(path.join(ROOT, 'private/admin-analytics.html')), 'Analytics: HTML em private/');
const tabs = ler('private/analytics-tabs.js');
['/admin/analytics', '/admin/intelligence', '/admin/eventos', '/admin/pipeline', '/admin/brand', '/admin/relatorio', '/admin/metas', '/admin/hub', '/cafezinho/tracking']
  .forEach(p => ok(tabs.includes(`'${p}'`), `abas: ${p}`));
const an = ler('routes/analytics.js');
ok(/router\.get\('\/admin\/analytics-tabs\.js', requireOwner,/.test(an), 'rota das abas com requireOwner');
ok(/router\.get\('\/admin\/analytics', requireOwner,[\s\S]{0,120}private\/admin-analytics\.html/.test(an), 'rota do Analytics serve private/ com requireOwner');
['private/admin-analytics.html', 'private/admin-area-tracking.html', 'private/cafezinho-tracking.html']
  .forEach(f => ok(ler(f).includes('<script src="/admin/analytics-tabs.js"></script>'), `abas em ${f}`));
const cafe = ler('routes/cafezinho.js');
ok(!/painel:\s*email/.test(cafe) && !/owner: email === OWNER_EMAIL \}/.test(cafe), 'Cafezinho: API não manda link do painel nem flag de dono');

// 4) Changelog do time sem menção a tracking de pessoas
const { changelogSemTracking } = require(path.join(ROOT, 'routes/acesso'));
const cl = JSON.parse(ler('public/api/changelog.json'));
const f = changelogSemTracking(cl);
const RX = /quem viu|quem acessou|rastreamento de quem|analytics de uso|analytics e tracking|so_dono|ado[çc][ãa]o do time|painel só do Rudá/i;
const sobra = f.releases.filter(r => RX.test(JSON.stringify(r)) || PAINEIS.test(JSON.stringify(r))).map(r => r.version);
ok(!sobra.length, 'changelog do time: nenhuma menção a tracking' + (sobra.length ? ' — ' + sobra.join(', ') : ''));
ok(f.releases.length === cl.releases.length, 'changelog do time: mesmas versões (só o texto muda)');
ok(cl.releases.filter(r => r.so_dono).every(r => f.releases.find(x => x.version === r.version).title === '🔧 Ajustes internos do Office'), 'changelog do time: release so_dono vira "Ajustes internos"');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok ✓');
process.exit(falhas ? 1 : 0);
