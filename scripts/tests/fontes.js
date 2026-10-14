#!/usr/bin/env node
// Central de Fontes (Módulo 36), de ponta a ponta: sobe um Graph/Google/Zoho de
// mentira, sobe o Office apontando pra ele e confere que o agendador baixa cada
// planilha, roda o parser de verdade e grava no Office; que atalho de pasta no
// OneDrive é resolvido; que planilha sem mudança não é reprocessada; e que link
// errado, permissão negada e falta de credencial viram o status certo (e alerta).
//
// Uso: node scripts/tests/fontes.js   (sai com 1 se algo falhar)
// Os JSONs de public/api que os parsers reescrevem voltam ao original no fim.
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const XLSX = require(path.join(ROOT, 'node_modules/xlsx'));
const Database = require(path.join(ROOT, 'node_modules/better-sqlite3'));
const assinatura = require(path.join(ROOT, 'node_modules/cookie-signature'));

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'fontes-teste-'));
const PORT = 3990 + Math.floor(Math.random() * 8);
const MOCK = 4590 + Math.floor(Math.random() * 8);
const SECRET = 'segredo-de-teste';
const TOKEN = 'token-de-teste';
const B = `http://127.0.0.1:${PORT}`;
const TEM_PANDAS = spawnSync('python3', ['-c', 'import pandas, openpyxl']).status === 0;

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) falhas++; };
const espera = (ms) => new Promise(r => setTimeout(r, ms));

// ── Backup dos JSONs que os parsers reescrevem ──────────────────────────────
const API = path.join(ROOT, 'public/api');
const backup = {};
for (const f of fs.readdirSync(API)) if (f.endsWith('.json')) backup[f] = fs.readFileSync(path.join(API, f));
function restaurar() {
  for (const [f, buf] of Object.entries(backup)) {
    const p = path.join(API, f);
    try { if (!fs.readFileSync(p).equals(buf)) fs.writeFileSync(p, buf); } catch (_) { fs.writeFileSync(p, buf); }
  }
  for (const f of fs.readdirSync(API)) if (/\.json\.bak-/.test(f)) fs.unlinkSync(path.join(API, f));
}

// ── Planilhas de teste ──────────────────────────────────────────────────────
function xlsx(abas) {
  const wb = XLSX.utils.book_new();
  for (const [nome, linhas] of Object.entries(abas)) {
    const ws = Array.isArray(linhas[0]) ? XLSX.utils.aoa_to_sheet(linhas) : XLSX.utils.json_to_sheet(linhas);
    XLSX.utils.book_append_sheet(wb, ws, nome);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
const serial = (iso) => (Date.parse(iso + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 864e5;
const FIX = {
  cases: xlsx({
    Cases: [
      { Empresa: 'Cliente Teste Alfa', Status: 'Publicado', 'Área EUBR': 'HCM', 'Mais Informações': 'https://exemplo.com/case' },
      { Empresa: 'Cliente Teste Beta', Status: 'Negociação', 'Área EUBR': 'ERP' },
    ],
    'Perguntas Referência': [{ Empresa: 'Cliente Teste Alfa' }],
  }),
  sap4me: xlsx({ Plan1: [
    { 'ID do projeto': 'P1', Pacotes: 'A', 'Nome do cliente': 'Cliente SAP Um', 'País': 'Brasil', 'Etapa do pacote': 'Live' },
    { 'ID do projeto': 'P2', Pacotes: 'B', 'Nome do cliente': 'Cliente SAP Dois', 'País': 'Chile', 'Etapa do pacote': 'Kick-off' },
  ] }),
  eventos: xlsx({ 'Eventos 2026': [
    ['Evento', 'Data', 'Início', 'Fim', '', 'LOB', '', '', '', '', '', 'Responsável', '', 'Local'],
    ['Evento Fontes Ponta a Ponta', '', new Date(Date.UTC(2026, 10, 12)), new Date(Date.UTC(2026, 10, 13)), '', 'HCM', '', '', '', '', '', 'EPI-USE', '', 'São Paulo'],
  ] }),
  redatoria: xlsx({
    'Divisões de temáticas': [['x']],
    Jan26: [['resumo'], ['Temas'], ['', 'ENTREGA', 'DATA POSTAGEM', 'EDITORIA', 'TEMA', 'VOLUMETRIA', 'KEYWORD', 'RESUMO'],
      ['SEMANA 1', serial('2026-01-05'), '', 'ServiceNow', 'Tema de teste de janeiro sobre ServiceNow', '', 'kw', 'resumo jan']],
    Set26: [['resumo'], ['Temas'], ['', 'ENTREGA', 'DATA POSTAGEM', 'EDITORIA', 'TEMA', 'VOLUMETRIA', 'KEYWORD', 'RESUMO'],
      ['SEMANA 1', serial('2026-09-07'), '', 'SAP S/4HANA', 'Tema de teste de setembro (aba nova)', '', 'kw', 'resumo set']],
  }),
};
const GOOGLE_ID = '1KfnsRY_gDTSLx3w-SDvFuJtIzkW6kMgNfbsYt_EJ2uM';
const GOOGLE_PRIVADA = '1PrivadaPrivadaPrivadaPrivadaXYZ';
const SHARE = {
  'https://epiusebr.sharepoint.com/:x:/g/eventos-teste': 'eventos',
  'https://epiusebr.sharepoint.com/:x:/g/sap4me-teste': 'sap4me',
  'https://epiusebr.sharepoint.com/:x:/g/negado': 'NEGADO',
};
const deShare = (id) => Buffer.from(id.slice(2).replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString('utf8');
const item = (nome) => ({ id: nome, name: nome + '.xlsx', file: {}, lastModifiedDateTime: '2026-10-10T12:00:00Z',
  lastModifiedBy: { user: { displayName: 'Pessoa Teste' } }, webUrl: 'https://epiusebr.sharepoint.com/arquivo/' + nome,
  parentReference: { driveId: 'D-SHARE' } });
const contagem = { download: {} };

// ── Graph / Google / Zoho de mentira ────────────────────────────────────────
const mock = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = decodeURIComponent(u.pathname);
  const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  let corpo = '';
  req.on('data', d => { corpo += d; });
  req.on('end', () => {
    if (req.method === 'POST' && /^\/login\/[^/]+\/oauth2\/v2\.0\/token$/.test(p)) return json(200, { access_token: 'tk-teste', expires_in: 3600 });
    if (p.startsWith('/graph/') && req.headers.authorization !== 'Bearer tk-teste') return json(401, {});
    const OD = '/graph/users/ruda.costa@epiuse.com.br/drive/root';
    // /MARKETING no OneDrive do Rudá é um atalho pra pasta compartilhada
    if (p === OD + ':/MARKETING') return json(200, { id: 'atalho', name: 'MARKETING', remoteItem: { id: 'I-MKT', parentReference: { driveId: 'D-SHARE' } } });
    if (p === '/graph/drives/D-SHARE/items/I-MKT:/Customer Reference/Empresas Transformadoras/Controle de Cases Cliente Referência Empresas Transformadoras 2025.xlsx') return json(200, item('cases'));
    if (p.startsWith(OD + ':/') || p.startsWith('/graph/drives/D-SHARE/items/I-MKT:/')) return json(404, { error: { code: 'itemNotFound' } });
    if (p.startsWith('/graph/shares/') && p.endsWith('/driveItem')) {
      const alvo = SHARE[deShare(p.split('/')[3])];
      if (alvo === 'NEGADO') return json(403, { error: { code: 'accessDenied' } });
      return alvo ? json(200, item(alvo)) : json(404, {});
    }
    const mc = /^\/graph\/drives\/D-SHARE\/items\/([^/]+)\/content$/.exec(p);
    if (mc) { res.writeHead(302, { Location: `http://localhost:${MOCK}/dl/${mc[1]}` }); return res.end(); }
    if (p.startsWith('/dl/')) {
      const nome = p.slice(4); contagem.download[nome] = (contagem.download[nome] || 0) + 1;
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); return res.end(FIX[nome]);
    }
    const mg = /^\/google\/spreadsheets\/d\/([\w-]+)\/export$/.exec(p);
    if (mg) {
      if (mg[1] === GOOGLE_PRIVADA) { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>faça login</html>'); }
      if (mg[1] === GOOGLE_ID) { res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); return res.end(FIX.redatoria); }
      return json(404, {});
    }
    if (p === '/zoho-accounts/oauth/v2/token') return json(200, { access_token: 'zk' });
    if (p === '/zoho-api/crm/v7/coql') {
      const q = (JSON.parse(corpo || '{}').select_query || '');
      if (/FROM Deals/.test(q)) return json(200, { data: [
        { id: 'D-1', Deal_Name: 'Oportunidade Teste', Account_Name: { name: 'Conta Teste' }, Amount: 1000, Stage: 'Qualificação',
          Origem_da_Oportunidade: 'MKT (EPI-USE)', Solution_new: ['Cloud'], Escopo2: ['BTP'], Created_Time: '2026-10-01T10:00:00-03:00', Closing_Date: '2026-12-01' },
      ] });
      if (/GROUP BY Owner/.test(q)) return json(200, { data: [{ Owner: { id: '2907496000042527001', name: 'Estrela' }, total: 7 }, { Owner: { id: '9', name: 'Admin' }, total: 3 }] });
      if (/WHERE Owner/.test(q)) return json(200, { data: [{ Lead_Status: 'Tentando Contato', total: 7 }] });
      if (/Lead_Source/.test(q)) return json(200, { data: [{ Lead_Source: 'Site', total: 10 }] });
      return json(200, { data: [{ Lead_Status: 'Tentando Contato', total: 10 }] });
    }
    json(404, {});
  });
});

// ── Sessões (mesmo store do express-session) ────────────────────────────────
function sessao(email, role) {
  const db = new Database(path.join(DATA, 'sessions.sqlite'));
  db.exec('CREATE TABLE IF NOT EXISTS sessions (sid PRIMARY KEY, expired, sess)');
  const sid = 'teste-' + Math.random().toString(36).slice(2);
  const exp = Date.now() + 864e5;
  db.prepare('INSERT INTO sessions (sid, expired, sess) VALUES (?,?,?)').run(sid, exp, JSON.stringify({
    cookie: { originalMaxAge: 864e5, expires: new Date(exp).toISOString(), secure: false, httpOnly: true, path: '/', sameSite: 'lax' },
    user: { email, name: email.split('@')[0], role, persona: '', admin: role === 'head' },
  }));
  db.close();
  return 'eubr.sid=' + encodeURIComponent('s:' + assinatura.sign(sid, SECRET));
}
async function api(cookie, metodo, caminho, corpo) {
  const r = await fetch(B + caminho, { method: metodo, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  let j = null; try { j = await r.json(); } catch (_) {}
  return { status: r.status, j };
}
const umaDe = (lista, id) => (lista.fontes || []).find(f => f.id === id) || {};
const sql = (q, ...a) => { const db = new Database(path.join(DATA, 'db.sqlite'), { readonly: true }); try { return db.prepare(q).get(...a); } finally { db.close(); } };
async function ate(cond, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await cond()) return true; } catch (_) {} await espera(500); }
  return false;
}

let office;
async function main() {
  await new Promise(r => mock.listen(MOCK, '127.0.0.1', r));
  const env = {
    ...process.env, PORT: String(PORT), DATA_DIR: DATA, SESSION_SECRET: SECRET, EDITOR_TOKEN: TOKEN,
    AZURE_TENANT_ID: 'tenant-teste', AZURE_CLIENT_ID: 'app-teste', AZURE_CLIENT_SECRET: 'segredo',
    FONTES_GRAPH_URL: `http://127.0.0.1:${MOCK}/graph`, FONTES_LOGIN_URL: `http://127.0.0.1:${MOCK}/login`,
    FONTES_GOOGLE_URL: `http://127.0.0.1:${MOCK}/google`,
    ZOHO_CLIENT_ID: 'z', ZOHO_CLIENT_SECRET: 'z', ZOHO_REFRESH_TOKEN: 'z',
    ZOHO_ACCOUNTS_URL: `http://127.0.0.1:${MOCK}/zoho-accounts`, ZOHO_API_URL: `http://127.0.0.1:${MOCK}/zoho-api`,
    FONTES_TICK_INICIAL_MS: '1500', FONTES_TICK_MS: '1500',
    ALERTAS_AGENDADOR: 'false', EDITORIAL_AUTO: '0', SSO_ENFORCE: '',
  };
  delete env.APOLLO_API_KEY; delete env.GA4_PROPERTY_ID; delete env.RD_REFRESH_TOKEN; delete env.RESEND_API_KEY;
  office = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  office.stdout.on('data', d => { log += d; }); office.stderr.on('data', d => { log += d; });
  const subiu = await ate(async () => (await fetch(B + '/api/health')).ok, 30000);
  ok(subiu, 'Office subiu');
  if (!subiu) { console.log(log.slice(-2000)); return; }

  const ruda = sessao('ruda.costa@epiuse.com.br', 'head');
  const gui = sessao('teste.growth@epiuse.com.br', 'growth');
  const duda = sessao('teste.brand@epiuse.com.br', 'brand');

  console.log('\n· Agendador (planilhas no caminho de sempre + Zoho)');
  const pronto = await ate(async () => {
    const l = (await api(ruda, 'GET', '/api/fontes')).j;
    return ['cases', 'redatoria', 'zoho-deals', 'zoho-leads', 'calendario-duda', 'eventos'].every(id => umaDe(l, id).tentativa_ts);
  });
  ok(pronto, 'rodou sozinho as fontes com caminho/credencial');
  let l = (await api(ruda, 'GET', '/api/fontes')).j;
  ok(l.motor_ligado === true && l.pode_configurar === true, 'super admin vê o motor ligado e pode configurar');
  const cases = umaDe(l, 'cases');
  ok(cases.status === 'em-dia' && (sql("SELECT COUNT(*) n FROM cs_clientes WHERE sharepoint_id LIKE 'roberto-cases-%'").n === 2), 'Cases: OneDrive via atalho → parser → 2 cases no banco');
  ok(cases.arquivo && cases.arquivo.modificado_por === 'Pessoa Teste' && cases.arquivo.url, 'Cases: guarda quem editou a planilha e o link (pro super admin)');
  ok(sql("SELECT COUNT(*) n FROM editorial_calendar WHERE fonte='redatoria'").n === 2, 'Redatoria: Google por link → as 2 abas de mês (inclusive a nova Set26)');
  ok(umaDe(l, 'redatoria').status === 'em-dia', 'Redatoria em dia');
  ok(sql("SELECT COUNT(*) n FROM zoho_deals WHERE opportunity_source='MKT (EPI-USE)'").n === 1, 'Zoho oportunidades: API → banco');
  const leads = JSON.parse(fs.readFileSync(path.join(API, 'zoho-leads-snapshot.json'), 'utf8'));
  ok(leads.base_total === 10 && leads.carteiras && leads.carteiras[0].owner.includes('(SDR)'), 'Zoho leads: API → snapshot com carteiras');
  ok(!!sql("SELECT 1 x FROM app_blobs WHERE key='zoho-leads-snapshot.json'"), 'snapshot do Zoho guardado no banco (sobrevive a deploy)');
  const ev = umaDe(l, 'eventos');
  ok(ev.status !== 'erro' && /caminho de sempre/.test(ev.falta || ''), 'Eventos: caminho padrão inexistente vira "aguarda link", não erro');
  ok(umaDe(l, 'calendario-duda').status !== 'erro', 'Calendário da Duda: idem');
  ok(umaDe(l, 'linkedin-rotina').status === 'aguarda' && !umaDe(l, 'linkedin-rotina').tentativa_ts, 'Sem link nenhum: nem tenta, aguarda');

  console.log('\n· Planilha sem mudança não é reprocessada');
  const antes = contagem.download.cases;
  const dbw = new Database(path.join(DATA, 'db.sqlite'));
  const st = JSON.parse(dbw.prepare("SELECT value FROM app_blobs WHERE key='fonte.cases'").get().value);
  const okAntes = st.ultima_ok_ts;
  st.tentativa_ts = '2000-01-01T00:00:00Z';
  dbw.prepare("UPDATE app_blobs SET value=? WHERE key='fonte.cases'").run(JSON.stringify(st));
  dbw.close();
  await ate(() => contagem.download.cases > antes, 15000);
  await espera(800);
  const st2 = JSON.parse(sql("SELECT value FROM app_blobs WHERE key='fonte.cases'").value);
  ok(contagem.download.cases > antes && st2.ultima_ok_ts === okAntes && st2.mudou === false && st2.verificado_ts > okAntes,
    'baixou de novo, viu o mesmo hash e só registrou a conferência');

  console.log('\n· Link configurado pelo super admin');
  let r = await api(gui, 'PUT', '/api/fontes/sap4me/config', { link: 'https://epiusebr.sharepoint.com/:x:/g/sap4me-teste' });
  ok(r.status === 403, 'quem não é super admin não troca link (403)');
  r = await api(ruda, 'PUT', '/api/fontes/sap4me/config', { link: 'http://169.254.169.254/latest' });
  ok(r.status === 400, 'link fora de OneDrive/SharePoint/Google é recusado (400)');
  r = await api(ruda, 'PUT', '/api/fontes/sap4me/config', { link: `https://docs.google.com/spreadsheets/d/${GOOGLE_PRIVADA}/edit` });
  ok(r.status === 200, 'link do Google salvo');
  await ate(async () => umaDe((await api(ruda, 'GET', '/api/fontes')).j, 'sap4me').status === 'erro', 15000);
  const sapErro = umaDe((await api(ruda, 'GET', '/api/fontes')).j, 'sap4me');
  ok(sapErro.status === 'erro' && /qualquer pessoa com o link/.test(sapErro.erro || ''), 'planilha do Google fechada → erro explicando o que fazer');
  const al = (await api(ruda, 'GET', '/api/alerts?todos=1')).j;
  ok((al.alertas || []).some(a => a.id === 'fontes.registro:sap4me'), 'fonte com erro vira alerta pra área dona');
  r = await api(ruda, 'PUT', '/api/fontes/sap4me/config', { link: 'https://epiusebr.sharepoint.com/:x:/g/sap4me-teste' });
  await ate(async () => umaDe((await api(ruda, 'GET', '/api/fontes')).j, 'sap4me').status === 'em-dia', 20000);
  ok(sql('SELECT COUNT(*) n FROM clientes_sap_4me').n === 2, 'SAP for Me: link do SharePoint → parser → 2 clientes');
  r = await api(ruda, 'PUT', '/api/fontes/metas/config', { link: 'https://epiusebr.sharepoint.com/:x:/g/negado' });
  await ate(async () => umaDe((await api(ruda, 'GET', '/api/fontes')).j, 'metas').tentativa_ts, 15000);
  await espera(500);
  ok(/permissão/.test(umaDe((await api(ruda, 'GET', '/api/fontes')).j, 'metas').erro || ''), 'Graph 403 → erro de permissão do app do Azure');

  if (TEM_PANDAS) {
    console.log('\n· Parser em Python (eventos)');
    await api(ruda, 'PUT', '/api/fontes/eventos/config', { link: 'https://epiusebr.sharepoint.com/:x:/g/eventos-teste' });
    await ate(async () => umaDe((await api(ruda, 'GET', '/api/fontes')).j, 'eventos').status === 'em-dia', 30000);
    const evj = JSON.parse(fs.readFileSync(path.join(API, 'events.json'), 'utf8'));
    ok(((evj.abas.brasil || {}).eventos || []).some(e => e.n === 'Evento Fontes Ponta a Ponta'), 'Eventos: planilha → camada Brasil do events.json');
    ok(!!sql("SELECT 1 x FROM app_blobs WHERE key='events.json'"), 'events.json guardado no banco');
    ok(!fs.readdirSync(API).some(f => /\.json\.bak-/.test(f)), 'sem arquivo .bak em public/api');
  } else console.log('\n· (pulado: pandas/openpyxl não instalados — parsers em Python)');

  console.log('\n· Quem vê e quem mexe');
  const lg = (await api(gui, 'GET', '/api/fontes')).j;
  ok(!umaDe(lg, 'cases').id && !!umaDe(lg, 'campanhas').id && !!umaDe(lg, 'artigos').id, 'Growth vê só as fontes das áreas dele');
  ok(lg.pode_configurar === false && !('link' in umaDe(lg, 'artigos')), 'sem link de planilha pra quem não é super admin');
  ok(!(umaDe(lg, 'artigos').arquivo || {}).url, 'sem endereço do arquivo pra quem não é super admin');
  r = await api(gui, 'POST', '/api/fontes/cases/atualizar');
  ok(r.status === 404, 'não atualiza fonte de outra área');
  r = await api(duda, 'POST', '/api/fontes/cases/atualizar');
  ok(r.status === 200 && r.j.ok === true, 'dona da área atualiza na hora ("Atualizar agora")');
  r = await api(duda, 'POST', '/api/fontes/cases/atualizar');
  ok(r.status === 429, 'segundo clique em menos de 1 min espera');
  r = await api(gui, 'POST', '/api/fontes/campanhas/revisado');
  ok(r.status === 200 && r.j.fonte.status === 'em-dia' && r.j.fonte.revisao, 'curada à mão: "marcar como revisada" põe em dia');
  r = await api(gui, 'POST', '/api/fontes/zoho-leads/revisado');
  ok(r.status === 404 || r.status === 400, 'automática não se marca como revisada');
  r = await fetch(B + '/api/fontes', { headers: { 'X-Editor-Token': TOKEN } });
  ok(r.status === 401, 'editor token sozinho não lê /api/fontes (precisa de sessão)');
  r = await fetch(B + '/fontes', { headers: { Cookie: gui }, redirect: 'manual' });
  ok(r.status === 200 && /Fontes de dados/.test(await r.text()), 'página /fontes abre pro time');
}

main().catch(e => { console.error(e); falhas++; }).finally(async () => {
  if (office) office.kill('SIGKILL');
  mock.close();
  restaurar();
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo ✓');
  process.exit(falhas ? 1 : 0);
});
