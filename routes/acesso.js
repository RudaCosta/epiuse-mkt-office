// ════════════════════════════════════════════════════════════════════════════
// routes/acesso.js — Permissões do Office (Módulo 13 · v2)
//
// UMA camada decide quem entra onde: páginas, APIs e arquivos de public/.
// Roda antes de qualquer rota e antes do express.static. Nega por padrão: o que
// não tem regra aqui só o super admin vê.
//
// Por que existe: antes cada módulo inventava o próprio guard (ou nenhum). O
// express.static servia todo HTML e JSON sem login, o enforcement pulava /api/*
// e 112 APIs não tinham proteção nenhuma. Um papel enxergava a área de todos.
//
// Modelo:
//   • Cada PAPEL tem um conjunto de ÁREAS (ROLE_AREAS).
//   • Cada caminho pertence a uma ou mais áreas (REGRAS). Basta ter uma.
//   • O super admin (por e-mail, ver users.js) passa em tudo.
//   • Áreas extras por pessoa (users.areas_extra) — só o super admin concede.
//   • O editor token (credencial de máquina) passa só em /api/*, pelo header;
//     o guard da própria rota continua decidindo.
// ════════════════════════════════════════════════════════════════════════════
const path = require('path');
const ctx = require('../server-context');
const users = require('./users');

const PUBLIC_DIR = path.join(__dirname, '../public');

// ── Áreas ────────────────────────────────────────────────────────────────────
const AREAS = {
  publico:      { nome: 'Público',                     desc: 'Login e links externos — sem conta' },
  logado:       { nome: 'Colaborador EPI-USE',         desc: 'Hub, Cafezinho, Loja, Campanhas, Meus Links' },
  time:         { nome: 'Time de Marketing',           desc: 'Home, Relatório, Metas, UTM, Agentes, Ideias' },
  intelligence: { nome: 'Intelligence & CRM',          desc: 'LinkedIn, Editorial, GA4/RD, Stratview' },
  growth:       { nome: 'Growth & Performance',        desc: 'Jornadas, AEO/SEO/GEO, LinkedIn' },
  eventos:      { nome: 'Field Marketing & Eventos',   desc: 'Eventos, Field Marketing, Development Funds' },
  pipeline:     { nome: 'Biz Dev / Pipeline',          desc: 'JARVIS, Pipeline, Curva ABC, Área de Clientes' },
  brand:        { nome: 'Brand Experience',            desc: 'Voices, Raccoon, Cases, Inbound, Blog Converter' },
  conteudo:     { nome: 'Conteúdo / Redatoria',        desc: 'Pipeline de conteúdo, Editorial, Jornadas' },
  voices:       { nome: 'Pautas dos Voices',           desc: 'Revisão e publicação das pautas' },
  diretoria:    { nome: 'Diretoria',                   desc: 'Painel da diretoria e visão executiva' },
  admin:        { nome: 'Administração',               desc: 'Usuários, analytics, coins, comunicados — só super admin' },
};

// Áreas que o super admin pode conceder a alguém além do papel (admin nunca).
const AREAS_CONCEDIVEIS = Object.keys(AREAS).filter(a => !['publico', 'logado', 'admin'].includes(a));

// ── Papel → áreas ─────────────────────────────────────────────────────────────
// Diretoria vê só a página dela (decisão Rudá, 04/out/2026: "todas as áreas,
// somente eu mesmo").
const ROLE_AREAS = {
  head:              ['logado', 'time', ...AREAS_CONCEDIVEIS],
  intelligence:      ['logado', 'time', 'intelligence'],
  growth:            ['logado', 'time', 'growth'],
  field:             ['logado', 'time', 'eventos'],
  pipeline:          ['logado', 'time', 'pipeline'],
  brand:             ['logado', 'time', 'brand', 'voices'],
  conteudo:          ['logado', 'time', 'conteudo', 'voices'],
  'country-manager': ['logado', 'diretoria'],
  diretoria:         ['logado', 'diretoria'],
  voice:             ['logado', 'voices'],
  hub:               ['logado'],
};

// ── Regras: caminho → áreas ───────────────────────────────────────────────────
// Ordem importa: a PRIMEIRA que casa decide. Mais específica antes da genérica.
// Sintaxe: '/exato' · '/prefixo/*' (inclui o próprio prefixo) · ':param' casa um
// segmento · 'METODO /caminho' restringe o método.
const P = 'publico', L = 'logado', T = 'time', INT = 'intelligence', GRO = 'growth',
      EVE = 'eventos', PIP = 'pipeline', BRA = 'brand', CON = 'conteudo', VOI = 'voices',
      DIR = 'diretoria', ADM = 'admin';

const REGRAS = [
  // ── Público (sem conta) ───────────────────────────────────────────────────
  ['/login', P], ['/auth/login', P], ['/auth/callback', P], ['/auth/logout', P],
  ['/go/*', P],                       // link rastreado: quem clica não tem conta
  ['/v/:slug', P],                    // link da bio do Voice (só redireciona)
  ['/assets/*', P],                   // fontes e licenças
  ['GET /api/auth/status', P], ['GET /api/version', P], ['GET /api/health', P],

  // ── Administração (super admin) ───────────────────────────────────────────
  ['/admin/utm', T], ['/api/admin/utm/*', T],           // UTM é ferramenta do time
  ['/admin/*', ADM], ['/api/admin/*', ADM],
  ['/auth/rd-callback', ADM],
  ['/cafezinho/tracking', ADM], ['/api/cafezinho/tracking', ADM], ['/api/cafezinho/pin/*', ADM],
  ['/api/applications/*', ADM], ['/api/voices-publicados/*', ADM],
  ['/api/jarvis/diag-llm', ADM], ['/api/jarvis/sync-zoho-calls', ADM], ['/api/jarvis/ingest-zoho-call', ADM],
  // syncs de máquina (scripts com editor token; o token passa por cima disto)
  ['POST /api/cases/sync', ADM], ['POST /api/cases/sync-from-onedrive', BRA],
  ['POST /api/clientes-sap-4me/sync', ADM], ['POST /api/editorial/sync', ADM],
  ['POST /api/events.json', ADM], ['POST /api/inbound/calendar', ADM], ['POST /api/inbound/sync-rd', ADM],
  ['POST /api/linkedin/update-today', ADM], ['POST /api/metas', ADM], ['POST /api/zoho/sync', ADM],
  ['/api/relatorio/ga4-refresh', ADM], ['/api/relatorio/ga4-refresh-fy', ADM], ['/api/relatorio/rd-refresh', ADM],

  // ── Colaborador logado (inclui visitante) ─────────────────────────────────
  ['/alertas', L],                    // central de alertas (Módulo 34)
  ['/hub', L], ['/hub/brindes', L], ['/hub/solicitacao-brindes', L], ['/hub/solicitar-brindes', L],
  ['/brindes', L], ['/game', L], ['/game-hub', L], ['/escolher-visao', L], ['/brand', L],
  ['/onboarding', L], ['/design', L], ['/erp-impacto', L], ['/seja-voice', L], ['/artigos', L],
  ['/optimizer', L], ['/optimizer-v3', L], ['/voices/optimizer-v3', L],
  ['/campanhas', L], ['/meus-links', L], ['/loja', L], ['/ranking', L], ['/cafezinho', L],
  ['GET /api/acesso/me', L], ['POST /api/users/me/view', L],
  ['POST /api/analytics/track', L], ['GET /api/analytics/owner', L],
  ['/api/translate', L], ['/api/translate/status', L],
  ['/api/game/*', L], ['/api/cafezinho/*', L], ['/api/loja/*', L], ['GET /api/ranking', L],
  ['POST /api/utm/link', L], ['/api/utm/link/:token', L], ['GET /api/utm/mine', L],
  ['POST /api/brindes', L],
  ['/api/onboarding/*', L], ['POST /api/seja-voice', L], ['GET /api/artigos', L],
  ['/api/optimizer/*', L], ['/api/analisar-perfil', L], ['/api/analisar-perfil/*', L],
  ['/api/voices/optimizer-v3/*', L], ['/api/optimizer-v3/*', L],
  ['GET /api/voices/:slug/optimizer-input', L], ['GET /api/voices/:slug/ssi', L],
  ['GET /api/campanhas-ativas.json', L], ['GET /api/changelog.json', L], ['GET /api/team.json', L],
  ['GET /api/hub/resumo', L],         // Marketing Hub (Módulo 35): lista branca, sem dado de vendas/CRM
  ['GET /api/office-desks.json', L], ['GET /api/events.json', L], ['GET /api/datas-especiais-2026.json', L],
  ['GET /api/voices.json', L], ['GET /api/cafezinho-seed.json', L],
  ['GET /api/kit-voice-template.md', L], ['GET /api/kit-voice-template-v2.md', L],

  // ── Pautas dos Voices (Voice vê as dele; editorial vê todas — checado na rota) ─
  ['/voices/pautas', VOI], ['/voices/pauta', VOI],
  ['/api/voices/pautas', VOI], ['/api/voices/pautas/*', VOI], ['/api/voices/pautas-disponiveis', VOI],
  ['/api/voices/roster', VOI],

  // ── Diretoria ─────────────────────────────────────────────────────────────
  ['/area/diretoria', DIR], ['/diretoria', DIR], ['/executivo', DIR],
  ['/api/executivo', DIR], ['GET /api/pipeline-snapshot.json', DIR],
  ['GET /api/ga4-snapshot.json', [INT, DIR]], ['GET /api/linkedin-historical.json', [T, DIR]],
  ['/api/rd/*', [T, DIR]],

  // ── Intelligence ──────────────────────────────────────────────────────────
  ['/area/intelligence', INT],
  ['/linkedin', [INT, GRO]], ['/api/linkedin/intelligence', [INT, GRO]],
  ['/editorial', [INT, BRA, CON]], ['/editorial/*', [INT, BRA, CON]], ['/api/editorial/*', [INT, BRA, CON]],
  ['/generator-stratview', [INT, BRA]], ['/api/stratview/*', [INT, BRA]],
  ['GET /api/rd-snapshot.json', INT], ['GET /api/zoho-leads-snapshot.json', INT],

  // ── Growth ────────────────────────────────────────────────────────────────
  ['/area/growth', GRO],
  ['/jornadas', [GRO, CON]], ['/api/jornadas', [GRO, CON]],
  ['/aeo', [GRO, BRA]], ['/aeo-geo', [GRO, BRA]], ['/seo', [GRO, BRA]], ['/geo', [GRO, BRA]],

  // ── Field Marketing & Eventos ─────────────────────────────────────────────
  ['/area/eventos', EVE], ['/field-marketing', EVE], ['/development-funds', EVE],
  ['/api/field-marketing', EVE], ['/api/field-marketing/*', EVE], ['GET /api/field-template.json', EVE],

  // ── Biz Dev / Pipeline ────────────────────────────────────────────────────
  ['/area/pipeline', PIP], ['/api/area/pipeline', PIP], ['/api/area/pipeline/*', PIP],
  ['/jarvis', PIP], ['/api/jarvis/*', PIP],
  ['/pipeline', [PIP, INT]],
  ['/curva-abc', PIP], ['/api/curva-abc/*', PIP],
  ['/area-clientes', PIP], ['/clientes-sap-4me', PIP], ['/api/area-clientes/*', PIP],

  // ── Brand Experience / Conteúdo ───────────────────────────────────────────
  // O pipeline de conteúdo mora dentro da página de Brand (/content-pipeline redireciona pra lá).
  ['/area/brand', [BRA, CON]], ['/api/area/brand', [BRA, CON]], ['/area/conteudo', [CON, BRA]],
  ['/voices', BRA], ['/voices/painel', BRA], ['/painel', BRA],
  ['/raccoon', BRA], ['/api/raccoon/*', BRA], ['/cases', BRA], ['/blog-converter', BRA],
  ['/api/blog-converter/*', BRA], ['/optimizer-v2', BRA], ['/inbound/*', BRA],
  ['/content-pipeline', [BRA, CON]], ['/api/content', [BRA, CON]], ['/api/content/*', [BRA, CON]],
  ['/api/seo-review', [BRA, CON]],
  ['POST /api/voice/:slug/generate-pautas', BRA],
  ['POST /api/voices/extract', BRA], ['POST /api/voices/create-from-profile', BRA],
  ['/api/voices/:slug', BRA], ['/api/voices/:slug/*', BRA],
  ['POST /api/posts', BRA], ['/api/posts/timeline/*', BRA],
  ['GET /api/inbound/calendar', T],            // home de todo o time lê o calendário
  ['/api/inbound/*', BRA],
  ['/api/painel/*', BRA],
  ['GET /api/voices/:file', BRA],               // public/api/voices/*.md (perfis)

  // ── Time de Marketing (ferramentas comuns) ────────────────────────────────
  ['/', T], ['/changelog', T], ['/relatorio', T], ['/metas', T], ['/metas-fy26', T], ['/metas-fy27', T], ['/metas/*', T],
  ['/memes', T], ['/ideias', T], ['/horas', T], ['/war-room', T], ['/agentes', T], ['/agentes/*', T],
  ['/area', T], ['/planilhas', T], ['/cowork', T], ['/cockpit', T], ['/dashboard', T],
  ['/hub/brindes/painel-admin', T], ['/hub/solicitacao-brindes/painel-admin', T],
  ['/hub/solicitar-brindes/painel-admin', T],
  ['/api/brindes', T], ['/api/brindes/*', T],
  ['/api/areas.json', T], ['/api/agentes.json', T], ['/api/agentes/*', T], ['/api/personas.json', T],
  ['/api/deadlines-2026.json', T], ['/api/development-funds', [T, EVE]], ['/api/development-funds.json', [T, EVE]],
  ['/api/relatorio/*', T], ['/api/relatorio-outreach.json', T],
  ['GET /api/cases', T], ['GET /api/clientes-sap-4me', [T, PIP]],
  ['GET /api/pipeline', [T, PIP]], ['GET /api/zoho/pipeline', [T, PIP]],
  ['/api/linkedin/historical', T], ['/api/linkedin/followers', T],
  ['/api/metas', T], ['/api/metas/*', T], ['/api/ideias', T], ['/api/ideias/*', T],
  ['/api/sprints', T], ['/api/sprints-pm.xlsx', T], ['/api/pendencias', T],
  // Alertas (Módulo 34): cada um vê os das áreas que abre — filtro na rota
  ['GET /api/alerts', L], ['POST /api/alerts/lidos', L], ['POST /api/alerts/silenciar', L],
  ['/api/planilhas', T], ['/api/planilhas/*', T], ['/api/workflows', T], ['/api/workflows/*', T],
  ['/api/cowork/*', T], ['GET /api/posts', T], ['/api/freshness', T],
  ['/api/horas', T], ['/api/horas/*', T], ['/api/design-tokens.json', L],

  // ── JSONs de dados em public/api ──────────────────────────────────────────
  ['GET /api/artigos.json', L], ['GET /api/loja-coins.json', L],
  ['GET /api/metas-fy26.json', T], ['GET /api/kpis-historical.json', T], ['GET /api/linkedin-routine.json', T],
  ['GET /api/campanha-classificacao.json', T], ['GET /api/rd-canais.json', [T, DIR]],
  ['GET /api/area-clientes-kb.json', PIP],
  ['GET /api/comunicados.json', ADM],          // fila de e-mails, com destinatários

  // ── Fechados de propósito ─────────────────────────────────────────────────
  ['/area/:id', ADM],                // área que não existe na lista acima
  ['/_versoes-office/*', ADM],       // versões antigas arquivadas
  ['/emails/*', ADM],                // templates de e-mail
  ['/img/*', P],
  // HTML que só é servido pela rota limpa. Antes, /admin-usuarios.html abria
  // direto pelo express.static e furava o guard de /admin/usuarios.
  ['/admin-alertas', ADM], ['/admin-analytics', ADM], ['/admin-coins', ADM], ['/admin-comunicados', ADM],
  ['/admin-inscricoes', ADM], ['/admin-usuarios', ADM], ['/admin-utm', ADM],
  ['/agente', ADM], ['/area-eventos', ADM], ['/area-intelligence', ADM], ['/artigos-generator', ADM],
  ['/area-brand', ADM], ['/area-pipeline', ADM],
  ['/home', ADM], ['/loja-coins', ADM], ['/office', ADM], ['/voices-pauta', ADM], ['/voices-pautas', ADM],
];

// Extensões servidas sem login: código e mídia do front. JSON/MD/XLSX NÃO entram
// (são dados) — passam pelas regras acima.
const ASSET_EXT = /\.(css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|mp3|wav|mp4|webm)$/i;

// ── Matcher ───────────────────────────────────────────────────────────────────
function compilar([padrao, areas]) {
  let metodo = null, p = padrao;
  const m = /^(GET|POST|PUT|PATCH|DELETE) (.+)$/.exec(padrao);
  if (m) { metodo = m[1]; p = m[2]; }
  const curinga = p.endsWith('/*');
  const base = curinga ? p.slice(0, -2) : p;
  const corpo = base.split('/').map(seg =>
    seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/');
  const re = new RegExp('^' + corpo + (curinga ? '(?:/.*)?' : '') + '/?$');
  return { padrao, metodo, re, areas: Array.isArray(areas) ? areas : [areas] };
}
const COMPILADAS = REGRAS.map(compilar);

// Devolve as áreas exigidas por (método, caminho), ou null se nenhuma regra casa.
function areasDoCaminho(metodo, caminho) {
  let p = caminho;
  // /relatorio.html → mesma regra de /relatorio (antes o .html direto furava tudo)
  if (/\.html$/i.test(p)) p = p.replace(/\.html$/i, '').replace(/\/index$/, '/') || '/';
  const met = metodo === 'HEAD' ? 'GET' : metodo;
  for (const r of COMPILADAS) {
    if (r.metodo && r.metodo !== met) continue;
    if (r.re.test(p)) return { areas: r.areas, regra: r.padrao };
  }
  return null;
}

function parseExtras(v) {
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a.filter(x => AREAS_CONCEDIVEIS.includes(x)) : []; }
  catch (_e) { return []; }
}

// Áreas efetivas de um usuário de sessão: papel + extras concedidas.
function areasDoUsuario(u) {
  if (!u) return [];
  // "Todas as áreas, somente eu mesmo": o papel head só vale inteiro pro super
  // admin. Alguém que fique com head por engano enxerga o time, não as áreas.
  const base = (u.role === 'head' && !ehSuperAdmin(u)) ? ['logado', 'time']
             : (ROLE_AREAS[u.role] || ROLE_AREAS.hub);
  return [...new Set([...base, ...(u.areasExtra || [])])];
}

function ehSuperAdmin(u) {
  return !!(u && u.email && users.SUPER_ADMINS.has(String(u.email).toLowerCase()));
}

function pode(u, metodo, caminho) {
  const r = areasDoCaminho(metodo, caminho);
  const exigidas = r ? r.areas : [ADM];
  if (exigidas.includes(P)) return true;
  if (!u) return false;
  if (ehSuperAdmin(u)) return true;
  const minhas = areasDoUsuario(u);
  return exigidas.some(a => minhas.includes(a));
}

// ── Montagem ─────────────────────────────────────────────────────────────────
function montar(app, express) {
  // Cabeçalhos básicos de segurança em toda resposta.
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');           // o game abre páginas do próprio Office em iframe
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=15552000');
    next();
  });

  // 1) Assets do front: servidos antes da sessão (sem custo de lookup).
  const servirAsset = express.static(PUBLIC_DIR, { index: false, fallthrough: true });
  app.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api/') && ASSET_EXT.test(req.path)) {
      return servirAsset(req, res, next);
    }
    next();
  });

  // 2) Sessão
  const session = ctx.IS_LOCAL_DEV ? require(ctx.localModules + '/express-session') : require('express-session');
  let store;
  try {
    const SQLiteStore = (ctx.IS_LOCAL_DEV ? require(ctx.localModules + '/connect-sqlite3') : require('connect-sqlite3'))(session);
    store = new SQLiteStore({ db: 'sessions.sqlite', dir: ctx.DB_DIR });
  } catch (e) { console.warn('[sso] connect-sqlite3 ausente, usando MemoryStore:', e.message); }
  app.use(session({
    name: 'eubr.sid',
    secret: ctx.ACTIVE_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !ctx.IS_LOCAL_DEV, maxAge: 1000 * 60 * 60 * 24 * 7 },
  }));

  // 3) Re-hidratação: papel e áreas vêm do banco a cada request. Mudança feita
  // no painel de permissões vale no próximo clique, sem relogar. Se a leitura
  // falhar, não mexe na sessão (um erro momentâneo não rebaixa ninguém).
  app.use((req, res, next) => {
    try {
      const u = req.session && req.session.user;
      if (u && u.email) {
        const row = users.getUserByEmail(u.email);
        if (row) {
          const prof = users.profileFor(row);
          u.role = prof.role; u.persona = prof.persona; u.admin = prof.admin;
          u.areasExtra = row.active === 0 ? [] : parseExtras(row.areas_extra);
        }
      }
    } catch (_e) { /* nunca quebra a request */ }
    next();
  });

  // 4) Autorização
  const LOCAL_ABERTO = ctx.IS_LOCAL_DEV;                    // Windows do Rudá, sem SSO
  const ENFORCE_OFF = process.env.SSO_ENFORCE === 'false';  // escape de emergência
  if (ENFORCE_OFF) console.warn('[acesso] ⚠️ SSO_ENFORCE=false — Office ABERTO sem login. Use só em emergência.');

  app.use((req, res, next) => {
    const u = req.session && req.session.user;
    if (LOCAL_ABERTO && !u) return next();
    if (ENFORCE_OFF) return next();
    if (pode(u, req.method, req.path)) return next();

    // Credencial de máquina: só em /api, só pelo header. O guard da rota decide.
    if (req.path.startsWith('/api/') && ctx.tokenConfere(req.headers['x-editor-token'])) return next();

    const ehApi = req.path.startsWith('/api/');
    if (!u) {
      if (ehApi) return res.status(401).json({ error: 'auth_required' });
      return res.redirect('/login?returnTo=' + encodeURIComponent(req.originalUrl));
    }
    if (ehApi) return res.status(403).json({ error: 'forbidden' });
    // Visitante que cai numa página do time volta pro Hub (comportamento antigo).
    if ((u.role || 'hub') === 'hub') return res.redirect('/hub');
    // A raiz é a home do time; quem não é do time vai pra própria landing
    // (Diretoria → /area/diretoria, Voice → /voices/pautas).
    if (req.path === '/') return res.redirect(users.resolveRoleConfig(u.role).landing);
    return res.status(403).sendFile(path.join(__dirname, '../private/sem-acesso.html'));
  });

  // 5) O que cada um precisa saber de SI MESMO. Nunca devolve as áreas de outra
  // pessoa — só as suas e as regras (que dizem o que cada página exige, não quem
  // tem acesso a ela).
  app.get('/api/acesso/me', (req, res) => {
    const u = req.session && req.session.user;
    res.set('Cache-Control', 'no-store');
    if (!u) return res.json({ autenticado: false, areas: [], superAdmin: false });
    const sa = ehSuperAdmin(u);
    res.json({
      autenticado: true,
      superAdmin: sa,
      areas: sa ? Object.keys(AREAS) : areasDoUsuario(u),
      regras: REGRAS.filter(([p]) => !/^(POST|PUT|PATCH|DELETE) /.test(p) && !p.includes('/api/'))
                    .map(([p, a]) => [p.replace(/^GET /, ''), Array.isArray(a) ? a : [a]]),
    });
  });

  // 6) personas.json filtrado: cada pessoa recebe só a própria persona (o "Ver
  // como" das outras e o mapa e-mail → persona ficam só pro super admin).
  app.get('/api/personas.json', (req, res, next) => {
    const u = req.session && req.session.user;
    if (ehSuperAdmin(u) || (LOCAL_ABERTO && !u)) return next();   // arquivo inteiro (express.static)
    try {
      const full = JSON.parse(require('fs').readFileSync(path.join(PUBLIC_DIR, 'api/personas.json'), 'utf8'));
      const pid = (u && u.persona && full.personas[u.persona]) ? u.persona : 'visitante';
      res.set('Cache-Control', 'no-store');
      res.json({ quick_default: full.quick_default || [], personas: { [pid]: full.personas[pid] } });
    } catch (e) { res.status(500).json({ error: 'personas_indisponivel' }); }
  });

  // 7) team.json e changelog.json abrem pra todo colaborador (Cafezinho, Game e
  // rodapé usam), mas carregam coisa só do time de Marketing: meta e SLA de cada
  // área (calls/e-mails do SDR, KPI de CRM) e notas de versão com número de lead,
  // oportunidade e integração de CRM. Quem não tem a área 'time' recebe só os
  // campos que essas telas usam. Lista branca: campo novo no arquivo não vaza.
  const doTime = (u) => ehSuperAdmin(u) || areasDoUsuario(u).includes('time');
  const lerApi = (f) => JSON.parse(require('fs').readFileSync(path.join(PUBLIC_DIR, 'api', f), 'utf8'));
  const so = (o, campos) => { const r = {}; for (const k of campos) if (o && o[k] !== undefined) r[k] = o[k]; return r; };
  const PESSOA = ['id', 'nome', 'cargo', 'icon', 'aniversario', 'mesa_itens', 'papel'];
  app.get('/api/team.json', (req, res, next) => {
    const u = req.session && req.session.user;
    if (doTime(u) || (LOCAL_ABERTO && !u)) return next();   // arquivo inteiro (express.static)
    try {
      const t = lerApi('team.json');
      const pessoas = (l) => (Array.isArray(l) ? l : []).map(p => so(p, PESSOA));
      res.set('Cache-Control', 'no-store');
      res.json({
        atualizado_em: t.atualizado_em,
        lideranca: pessoas(t.lideranca),
        areas: (t.areas || []).map(a => ({
          ...so(a, ['id', 'nome', 'icon', 'color', 'color_bg', 'foco']),
          responsavel: so(a.responsavel, ['nome', 'aniversario', 'mesa_itens', 'avatar_grad']),
        })),
        parceiros_externos: pessoas(t.parceiros_externos),
        supervisao_executiva: pessoas(t.supervisao_executiva),
      });
    } catch (e) { res.status(500).json({ error: 'team_indisponivel' }); }
  });
  app.get('/api/changelog.json', (req, res, next) => {
    const u = req.session && req.session.user;
    if (doTime(u) || (LOCAL_ABERTO && !u)) return next();
    try {
      const c = lerApi('changelog.json');
      res.set('Cache-Control', 'no-store');
      res.json({ current: c.current, atualizado_em: c.atualizado_em,
        releases: (c.releases || []).map(r => so(r, ['version', 'date', 'status'])) });
    } catch (e) { res.status(500).json({ error: 'changelog_indisponivel' }); }
  });
}

module.exports = {
  montar, pode, areasDoCaminho, areasDoUsuario, ehSuperAdmin, parseExtras,
  AREAS, AREAS_CONCEDIVEIS, ROLE_AREAS, REGRAS, ASSET_EXT,
};
