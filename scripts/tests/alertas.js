#!/usr/bin/env node
// Motor de alertas (Módulo 31): regras com dado semeado, estado (abre/muda/
// resolve), visibilidade por área, lido/silenciar via HTTP, e-mail de crítico
// (sem chave → registra "pulado" e não re-tenta) e os HTML dos relatórios.
//
// Uso: node scripts/tests/alertas.js   (sai com 1 se algo falhar)
const os = require('os');
const fs = require('fs');
const path = require('path');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'alertas-teste-'));
process.env.DATA_DIR = DATA;
process.env.ALERTAS_AGENDADOR = 'false';
delete process.env.RESEND_API_KEY;
delete process.env.APOLLO_API_KEY;
process.env.EGG_NOTIFY_EMAIL = 'dono.da.conta@gmail.com';   // endereço de env = confiável

const ROOT = path.join(__dirname, '../..');
const { db } = require(path.join(ROOT, 'server-context'));

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) falhas++; };
const isoDiasAtras = (d) => new Date(Date.now() - d * 864e5).toISOString().replace('T', ' ').slice(0, 19);
const dataDias = (d) => new Date(Date.now() + d * 864e5 - 3 * 36e5).toISOString().slice(0, 10);

// Tabelas que no app nascem no server.js (o resto vem dos próprios routers)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, name TEXT DEFAULT '', azure_oid TEXT DEFAULT '', role TEXT DEFAULT 'hub',
    persona TEXT DEFAULT '', active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    default_view TEXT DEFAULT '', areas_extra TEXT DEFAULT '[]');
  CREATE TABLE IF NOT EXISTS recruitment_applications (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, email TEXT, linkedin TEXT, area TEXT,
    status TEXT DEFAULT 'novo', utm_source TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS cs_clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, conta TEXT, cliente_nome TEXT, status TEXT, synced_at TEXT);
  CREATE TABLE IF NOT EXISTS content_pipeline (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, estado TEXT, agendado_para TEXT, publicado_em TEXT);
  CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, voice_id TEXT, post_url TEXT, published_at TEXT DEFAULT '', captured_at TEXT);
  CREATE TABLE IF NOT EXISTS edt_calendario (external_id TEXT PRIMARY KEY, data TEXT, tipo TEXT, titulo TEXT, formato TEXT, status TEXT, lob TEXT, synced_at TEXT);
  CREATE TABLE IF NOT EXISTS voices_publicados (id TEXT PRIMARY KEY, inscricao_id INTEGER, data TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS erp_coins (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, evento TEXT, ref TEXT, coins INTEGER, dia TEXT, created_at TEXT DEFAULT (datetime('now')));
`);
db.prepare(`INSERT INTO users (email, name, role) VALUES (?,?,?)`).run('ruda.costa@epiuse.com.br', 'Rudá Costa', 'head');
db.prepare(`INSERT INTO users (email, name, role) VALUES (?,?,?)`).run('eduarda.hirose@epiuse.com.br', 'Eduarda Hirose', 'brand');
db.prepare(`INSERT INTO users (email, name, role) VALUES (?,?,?)`).run('marlison.estrela@epiuse.com.br', 'Marlison Estrela', 'pipeline');

const express = require('express');
const alertas = require(path.join(ROOT, 'routes/alertas'));
require(path.join(ROOT, 'routes/loja'));
require(path.join(ROOT, 'routes/voices-pipeline'));
require(path.join(ROOT, 'routes/comunicados'));
const mailer = require(path.join(ROOT, 'routes/email'));
const ids = () => alertas.varrer().map(a => a.id).sort();
const estado = (id) => db.prepare('SELECT * FROM alertas_estado WHERE id=?').get(id);

(async () => {
  console.log('\n1) banco vazio');
  const vazios = ids();
  ok(vazios.join() === 'email.entrega:chave,fonte.apollo:chave', 'sem dado → só os avisos de chave ausente pro admin (nada inventado)');

  console.log('\n2) regras com dado semeado');
  db.prepare(`INSERT INTO coin_redemptions (email, item_id, item_nome, coins, status, created_at) VALUES (?,?,?,?, 'pendente', ?)`)
    .run('alguem@epiuse.com.br', 'caneca', 'Caneca', 100, isoDiasAtras(3));
  db.prepare(`INSERT INTO voice_pautas (voice_id, voice_nome, voice_email, titulo, estado, prazo, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run('anderson-costa', 'Anderson', 'anderson@epiuse.com.br', 'Pauta velha', 'em_revisao', dataDias(-2), isoDiasAtras(10), isoDiasAtras(12));
  db.prepare(`INSERT INTO cs_clientes (conta, cliente_nome, status, synced_at) VALUES ('c','Cliente','live',?)`).run(isoDiasAtras(3));
  db.prepare(`INSERT INTO content_pipeline (titulo, estado, agendado_para) VALUES ('Artigo X','agendado',?)`).run(dataDias(-4));
  alertas.registrar('eventos', () => ({ lista: [
    { event_id: 'brasil-10-evento-a', regiao: 'brasil', nome: 'Evento A', data_evento: dataDias(5), status: 'planejamento', tem_briefing: false, captura: {} },
    { event_id: 'latam-10-evento-b', regiao: 'latam', nome: 'Evento LATAM', data_evento: dataDias(5), status: 'planejamento', tem_briefing: false, captura: {} },
    { event_id: 'brasil-9-evento-c', regiao: 'brasil', nome: 'Evento C', data_evento: dataDias(-10), status: 'live', tem_briefing: true, captura: {} },
    { event_id: 'brasil-9-evento-d', regiao: 'brasil', nome: 'Evento D', data_evento: dataDias(-10), status: 'live', tem_briefing: true, captura: { leads: 12 } },
  ] }));
  // Apollo: snapshot salvo há 30h, com tarefas atrasadas e bounce alto
  db.prepare(`INSERT OR REPLACE INTO app_blobs (key, value) VALUES ('apollo.pipeline', ?)`).run(JSON.stringify({
    ultima_sync_ts: new Date(Date.now() - 30 * 36e5).toISOString(), ultima_sync: dataDias(-1),
    sequencias: [
      { id: 's1', nome: 'Seq CFO', ativa: true, arquivada: false, entregues: 100, bounces: 9, tarefas_atrasadas: 4, fraca: true },
      { id: 's2', nome: 'Seq arquivada', ativa: true, arquivada: true, entregues: 100, bounces: 50, tarefas_atrasadas: 9 },
    ],
  }));
  const lista = ids();
  const tem = (id) => lista.includes(id);
  ok(tem('loja.resgates') && estado('loja.resgates').nivel === 'importante', 'resgate pendente há 3 dias → importante');
  ok(tem('pautas.paradas') && tem('pautas.prazo'), 'pauta parada 10 dias + prazo vencido');
  ok(tem('fonte.cases') && estado('fonte.cases').nivel === 'importante', 'cases sem sync há 3 dias → importante');
  ok(tem('conteudo.agendado-vencido'), 'conteúdo agendado com data passada');
  ok(tem('eventos.sem-briefing:brasil-10-evento-a') && !lista.some(i => i.includes('latam')), 'evento BR sem briefing (LATAM ignorado)');
  ok(tem('eventos.pos-evento') && /Evento C/.test(estado('eventos.pos-evento').detalhe) && !/Evento D/.test(estado('eventos.pos-evento').detalhe), 'pós-evento: só o que não tem leads');
  ok(tem('fonte.apollo') && estado('fonte.apollo').nivel === 'critico', 'Apollo sem atualizar há 30h → crítico');
  ok(tem('apollo.tarefas') && /^4 /.test(estado('apollo.tarefas').titulo), 'tarefas atrasadas só de sequência não arquivada');
  ok(tem('apollo.bounce:s1') && !tem('apollo.bounce:s2'), 'bounce alto (8,3%) só na sequência ativa');
  ok(tem('apollo.fracas'), 'sequência fraca vira "para saber"');

  console.log('\n3) estado: muda, escala e resolve');
  const abertoAntes = estado('fonte.cases').aberto_em;
  db.prepare(`UPDATE cs_clientes SET synced_at=?`).run(isoDiasAtras(8));
  alertas.varrer();
  ok(estado('fonte.cases').nivel === 'critico' && estado('fonte.cases').aberto_em === abertoAntes, 'cases 8 dias → crítico, mesma ocorrência');
  db.prepare(`UPDATE coin_redemptions SET status='aprovado', decided_at=datetime('now')`).run();
  alertas.varrer();
  ok(!!estado('loja.resgates').resolvido_em, 'resgate decidido → alerta resolvido sozinho');

  console.log('\n4) visibilidade por área + lido/silenciar (HTTP)');
  const app = express();
  let quem = null;
  app.use((req, res, next) => { req.session = { user: quem }; next(); });
  app.use(alertas);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const get = async (u) => (await fetch(base + u)).json();
  const post = async (u, b) => (await fetch(base + u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();

  quem = { email: 'eduarda.hirose@epiuse.com.br', role: 'brand', areasExtra: [] };
  let r = await get('/api/alerts');
  const idsDuda = r.alertas.map(a => a.id);
  ok(idsDuda.includes('pautas.paradas') && idsDuda.includes('fonte.cases'), 'Brand vê pautas e cases');
  ok(!idsDuda.some(i => i.startsWith('apollo') || i.startsWith('fonte.apollo') || i.startsWith('eventos')), 'Brand não vê Apollo nem Eventos');
  ok(r.nao_lidos > 0 && r.alertas.every(a => typeof a.titulo === 'string' && a.msg === a.titulo), 'badge conta não lidos e mantém compat (msg)');
  await post('/api/alerts/lidos', { ids: ['pautas.paradas'] });
  r = await get('/api/alerts');
  ok(r.alertas.find(a => a.id === 'pautas.paradas').lido === true, 'marcar como lido');
  await post('/api/alerts/silenciar', { id: 'fonte.cases', dias: 7 });
  r = await get('/api/alerts');
  ok(!r.alertas.some(a => a.id === 'fonte.cases'), 'silenciado some da lista');
  r = await get('/api/alerts?todos=1');
  ok(r.alertas.find(a => a.id === 'fonte.cases').silenciado === true, '…mas aparece com ?todos=1');
  const sil = await post('/api/alerts/silenciar', { id: 'apollo.tarefas', dias: 7 });
  ok(sil.error === 'nao_encontrado', 'não silencia alerta que não enxerga');
  // Mudança de texto volta a "não lido"
  db.prepare(`INSERT INTO voice_pautas (voice_id, voice_nome, titulo, estado, updated_at) VALUES ('x','X','Outra parada','enviada',?)`).run(isoDiasAtras(9));
  alertas.varrer();
  r = await get('/api/alerts');
  ok(r.alertas.find(a => a.id === 'pautas.paradas').lido === false, 'título mudou (1 → 2 pautas) → volta a não lido');

  quem = { email: 'marlison.estrela@epiuse.com.br', role: 'pipeline', areasExtra: [] };
  r = await get('/api/alerts');
  ok(r.alertas.some(a => a.id === 'fonte.apollo') && !r.alertas.some(a => a.id === 'pautas.paradas'), 'Pipeline vê Apollo e não vê pautas');
  quem = null;
  r = await fetch(base + '/api/alerts');
  ok(r.status === 401, 'sem sessão → 401');
  srv.close();

  console.log('\n5) e-mail de crítico (sem RESEND_API_KEY)');
  const d1 = await alertas.despacharCriticos({ forcar: true });
  ok(d1.enviados === 0 && d1.tentativas.length >= 1, 'tenta enviar os críticos (sem chave = 0 entregues)');
  const log = db.prepare(`SELECT * FROM email_log WHERE tipo='alerta-critico'`).all();
  ok(log.length >= 1 && log.every(l => l.status === 'pulado'), 'tentativa registrada como "pulado" no email_log');
  ok(!!estado('fonte.apollo').email_em, 'crítico marcado como notificado');
  const d2 = await alertas.despacharCriticos();
  ok(d2.enviados === 0 && !d2.tentativas, 'não re-tenta a mesma ocorrência');
  const bloqueado = await mailer.enviar({ tipo: 'teste', para: 'alguem@gmail.com', assunto: 'x', html: 'x' });
  ok(!bloqueado.ok && bloqueado.etapa === 'destinatario', 'destinatário fora do domínio é barrado');

  console.log('\n6) relatórios');
  const sem = alertas.montarSemanal(null);
  ok(/Semana do Marketing/.test(sem.html) && sem.html.includes('Apollo sem atualizar'), 'semanal completo traz os alertas abertos');
  ok(/crítico/.test(sem.assunto), 'assunto do semanal sinaliza crítico');
  const semBrand = alertas.montarSemanal(['brand'], 'Brand Experience');
  ok(!semBrand.html.includes('Apollo sem atualizar') && semBrand.html.includes('Pautas criadas'), 'semanal da Brand: só a área dela');
  alertas.registrar('relatorio', (mes) => ({ success: true, mes, site: null, linkedin: { total_atual: 10640, novos: 120, novos_mom_pct: 5 }, email: null, instagram: null,
    cases: { publicado: 3, em_edicao: 1, live: 20 }, voices: { ativos: 2, total: 2 }, alertas: [{ tipo: 'warn', msg: 'Newsletter estagnada' }] }));
  const mens = alertas.montarMensal('2026-09');
  ok(/setembro\/2026/.test(mens.assunto) && mens.html.includes('10.640'), 'mensal usa os números do /relatorio');
  ok(mens.html.includes('⏳ Aguarda integração GA4'), 'sem dado de site → etiqueta ⏳ (regra 7)');
  ok(mens.html.includes('/relatorio?mes=2026-09'), 'link abre o relatório no mês');

  console.log('\n7) configuração');
  const cfgRuim = alertas._interno.salvarConfig({ critico: { ativo: true, para: ['fulano@gmail.com'] } });
  ok(!cfgRuim.ok, 'recusa destinatário fora da allowlist');
  const cfgOk = alertas._interno.salvarConfig({ semanal: { ativo: false, para: ['ruda.costa@epiuse.com.br'] }, donas: { semanal: true } });
  ok(cfgOk.ok && cfgOk.config.semanal.ativo === false && cfgOk.config.donas.semanal === true, 'salva canal e donas');
  ok(alertas._interno.semanaISO(new Date(Date.UTC(2026, 9, 5))) === '2026-W41', 'semana ISO (05/out/2026 = W41)');

  console.log('\n8) correções da revisão');
  // motor-1: idade no título não volta o alerta pra "não lido"
  const app3 = express();
  app3.use((req, res, next) => { req.session = { user: { email: 'eduarda.hirose@epiuse.com.br', role: 'brand', areasExtra: [] } }; next(); });
  app3.use(alertas);
  const srv3 = app3.listen(0);
  const b3 = `http://127.0.0.1:${srv3.address().port}`;
  db.prepare(`UPDATE cs_clientes SET synced_at=?`).run(isoDiasAtras(3));
  alertas.varrer();
  await fetch(b3 + '/api/alerts/lidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ['fonte.cases'] }) });
  db.prepare(`UPDATE cs_clientes SET synced_at=?`).run(isoDiasAtras(4));   // "há 3 dias" → "há 4 dias"
  alertas.varrer();
  let r3 = await (await fetch(b3 + '/api/alerts?todos=1')).json();
  const cs = r3.alertas.find(a => a.id === 'fonte.cases');
  ok(cs && /4 dias/.test(cs.titulo) && cs.lido === true, 'idade mudou no título, alerta continua lido');
  // acesso-1: rotas de admin não aceitam só o editor token
  const tk = await fetch(b3 + '/api/admin/alertas', { headers: { 'x-editor-token': 'qualquer' } });
  ok(tk.status === 403, 'rota de admin recusa quem não é super admin (mesmo com token)');
  srv3.close();

  // motor-2/3: snapshot de métricas não conta como post novo; Voice de inscrição entra
  db.prepare(`INSERT INTO voices_publicados (id, data) VALUES (?, ?)`).run('nova-voice', JSON.stringify({ id: 'nova-voice', nome: 'Nova Voice', status: 'ativo' }));
  db.prepare(`INSERT INTO posts (voice_id, post_url, captured_at) VALUES ('nova-voice','https://li/post/1',?)`).run(new Date(Date.now() - 30 * 864e5).toISOString());
  db.prepare(`INSERT INTO posts (voice_id, post_url, captured_at) VALUES ('nova-voice','https://li/post/1',?)`).run(new Date().toISOString());   // só atualizou métricas
  const lista8 = alertas.varrer().map(a => a.id);
  ok(lista8.includes('voices.sem-post:nova-voice'), 'Voice de inscrição sem post há 30 dias alerta, mesmo com snapshot de hoje');
  const rel = require(path.join(ROOT, 'routes/alertas-relatorios'));
  const m8 = rel.movimento(Date.now() - 7 * 864e5, Date.now() + 1000, null);
  ok(m8.posts_voices === 0, 'relatório não conta atualização de métricas como post novo');

  // motor-4: falha pontual do calendário com sync bom recente = importante; dado velho = crítico
  const ed = require(path.join(ROOT, 'routes/editorial'));
  const autoOrig = ed.autoStatus;
  ed.autoStatus = () => ({ ativo: true, status: 'erro', erro: '503', ultima_ok_ts: new Date(Date.now() - 3 * 36e5).toISOString() });
  alertas.varrer();
  ok(estado('fonte.calendario').nivel === 'importante', 'calendário: 1 falha com sync de 3h atrás → importante');
  ed.autoStatus = () => ({ ativo: true, status: 'parado', erro: null, ultima_ok_ts: new Date(Date.now() - 30 * 36e5).toISOString() });
  alertas.varrer();
  ok(estado('fonte.calendario').nivel === 'critico', 'calendário: 30h sem sync → crítico');
  ed.autoStatus = autoOrig;
  alertas.varrer();
  ok(!!estado('fonte.calendario').resolvido_em, '…e resolve quando volta');

  // motor-5: sem destinatário não marca o crítico como avisado
  alertas._interno.salvarConfig({ critico: { ativo: true, para: [] }, donas: { criticos: false } });
  db.prepare(`UPDATE alertas_estado SET email_em=NULL WHERE nivel='critico'`).run();
  const d5 = await alertas.despacharCriticos({ forcar: true });
  ok(d5.motivo === 'sem destinatário configurado' && !db.prepare(`SELECT 1 FROM alertas_estado WHERE nivel='critico' AND email_em IS NOT NULL`).get(), 'sem destinatário: nada marcado como avisado');

  // motor-6: reabrir conta como nova ocorrência
  const ocAntes = db.prepare(`SELECT COUNT(*) n FROM alertas_ocorrencias WHERE alerta_id='loja.resgates'`).get().n;
  db.prepare(`INSERT INTO coin_redemptions (email, item_id, item_nome, coins, status) VALUES ('x@epiuse.com.br','c','C',1,'pendente')`).run();
  alertas.varrer();
  db.prepare(`UPDATE coin_redemptions SET status='aprovado', decided_at=datetime('now')`).run();
  alertas.varrer();
  const oc = db.prepare(`SELECT COUNT(*) n, SUM(resolvido_em IS NOT NULL) r FROM alertas_ocorrencias WHERE alerta_id='loja.resgates'`).get();
  ok(oc.n === ocAntes + 1 && oc.r === oc.n, 'reabertura vira nova ocorrência, e as duas fecham');

  // motor-7: feriados nacionais
  const du = (iso) => alertas._interno.ehDiaUtil(new Date(iso + 'T12:00:00Z'));
  ok(!du('2026-11-02') && !du('2027-01-01') && !du('2027-02-08') && !du('2026-06-04') && du('2026-11-03'), 'Finados, Ano Novo, Carnaval e Corpus Christi não são dia útil');

  // email-2: endereço de variável de ambiente passa na allowlist
  ok(mailer.enderecoPermitido('dono.da.conta@gmail.com') && !mailer.enderecoPermitido('outro@gmail.com'), 'endereço configurado em env é aceito; outro externo não');

  // motor-8: painel respeita a guarda antiga do digest
  db.prepare(`INSERT OR REPLACE INTO app_blobs (key, value) VALUES ('digest.lastSent', ?)`).run(alertas._interno.semanaISO(new Date(Date.now() - 3 * 36e5)));
  db.prepare(`DELETE FROM app_blobs WHERE key='alertas.semanal.ultimo'`).run();
  alertas._interno.salvarConfig({ semanal: { ativo: true, para: ['ruda.costa@epiuse.com.br'] } });
  ok(!/próxima varredura|hoje/.test(alertas._interno.proximos().semanal), 'semana já marcada pelo digest antigo → painel aponta a semana seguinte');

  console.log(falhas ? `\n✗ ${falhas} falha(s)` : '\n✓ tudo certo');
  try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (_) {}
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
