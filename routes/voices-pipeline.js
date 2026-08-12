// ════════════════════════════════════════════════════════════════════════════
// routes/voices-pipeline.js — Pipeline de validação e publicação dos Voices
// (Módulo 20)
//
// Fecha o ciclo entre a Redatoria, o Voice e a Duda:
//   Redatoria escreve a pauta (content_pipeline, módulo já existente)
//     → atribui a um Voice
//       → Voice lê, comenta parágrafo a parágrafo e pede ajuste OU aprova
//         → Duda dá o OK final (regra do CLAUDE.md: nada externo sai sem ela)
//           → o link rastreado é gerado NA HORA, já atribuído ao Voice
//             → Voice publica no LinkedIn e cola a URL do post
//
// Por que o link nasce só na aprovação da Duda: link rastreado é imutável por
// design (módulo 18) — se ele existisse antes, uma troca de destino durante a
// revisão criaria um segundo token e o Voice poderia publicar o errado.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const { db } = require('../server-context');
const utm = require('./utm');

// ── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS voice_pautas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id    INTEGER,               -- pauta de origem em content_pipeline (opcional)
    voice_id      TEXT,                  -- slug do Voice (voices.json / voices_publicados)
    voice_nome    TEXT,
    voice_email   TEXT,                  -- e-mail SSO: quem revisa e leva os cliques/coins
    titulo        TEXT NOT NULL,
    corpo         TEXT DEFAULT '',       -- texto atual da pauta (parágrafos separados por \\n\\n)
    destino_url   TEXT DEFAULT '',       -- conteúdo que o post divulga (vira o link rastreado)
    estado        TEXT DEFAULT 'enviada',
    -- enviada → em_revisao → ajustes_pedidos ⇄ em_revisao → aprovada_voice
    --   → liberada (OK da Duda + link gerado) → publicada
    prazo         TEXT DEFAULT '',       -- data sugerida de publicação (YYYY-MM-DD)
    atribuida_por TEXT DEFAULT '',
    utm_token     TEXT DEFAULT '',       -- token do link rastreado (só após liberada)
    post_url      TEXT DEFAULT '',       -- URL do post no LinkedIn (o Voice cola)
    publicado_em  TEXT DEFAULT '',
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_vp_voice  ON voice_pautas(voice_email);
  CREATE INDEX IF NOT EXISTS idx_vp_estado ON voice_pautas(estado);

  -- Comentário ancorado no PARÁGRAFO (não em offset de caractere): a âncora
  -- sobrevive a reescrita do texto. Guardamos também o hash do parágrafo pra
  -- detectar quando ele mudou depois do comentário (vira "trecho reescrito").
  CREATE TABLE IF NOT EXISTS voice_pauta_comentarios (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pauta_id   INTEGER NOT NULL,
    par_idx    INTEGER NOT NULL,
    par_hash   TEXT DEFAULT '',
    par_trecho TEXT DEFAULT '',          -- começo do parágrafo, pra exibir comentário órfão
    autor      TEXT, autor_nome TEXT, papel TEXT,
    texto      TEXT NOT NULL,
    resolvido  INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_vpc_pauta ON voice_pauta_comentarios(pauta_id);

  -- Auditoria do fluxo: quem fez o quê e quando.
  CREATE TABLE IF NOT EXISTS voice_pauta_eventos (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    pauta_id INTEGER NOT NULL,
    evento   TEXT, autor TEXT, autor_nome TEXT, detalhe TEXT,
    ts       INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_vpe_pauta ON voice_pauta_eventos(pauta_id);
`);

// ── Papéis ───────────────────────────────────────────────────────────────────
// Voice: enxerga e age SÓ nas próprias pautas.
// Redatoria (conteudo) e Brand (duda) + head: enxergam todas.
const EDITORES = new Set(['conteudo', 'brand', 'head']);
const APROVADORES = new Set(['brand', 'head']); // quem dá o OK final (Duda; head cobre o Rudá)

function sess(req) { return (req.session && req.session.user) || null; }
function sessEmail(req) { const u = sess(req); return u && u.email ? String(u.email).toLowerCase() : null; }
function sessRole(req) { const u = sess(req); return u ? u.role : null; }
function sessNome(req) { const u = sess(req); return (u && (u.name || u.given)) || (sessEmail(req) || '').split('@')[0]; }
function isEditor(req) { return EDITORES.has(sessRole(req)); }
function isAprovador(req) { return APROVADORES.has(sessRole(req)); }

function requireLogin(req, res, next) {
  if (!sessEmail(req)) return res.status(401).json({ error: 'auth_required' });
  next();
}
// Área do pipeline: Voice (as suas) ou time editorial (todas).
function requireArea(req, res, next) {
  const em = sessEmail(req);
  if (!em) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'auth_required' });
    return res.redirect('/login');
  }
  next();
}

// Pauta que o usuário pode ver/agir: dono (Voice) ou time editorial.
function podeVer(req, pauta) {
  if (!pauta) return false;
  if (isEditor(req)) return true;
  return String(pauta.voice_email || '').toLowerCase() === sessEmail(req);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const paragrafos = (corpo) => String(corpo || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
const hashPar = (t) => crypto.createHash('sha1').update(String(t || '')).digest('hex').slice(0, 12);

function logEvento(pauta_id, evento, req, detalhe) {
  try {
    db.prepare(`INSERT INTO voice_pauta_eventos (pauta_id, evento, autor, autor_nome, detalhe, ts)
                VALUES (?,?,?,?,?,?)`)
      .run(pauta_id, evento, sessEmail(req) || '', sessNome(req) || '', detalhe || '', Date.now());
  } catch (e) { /* auditoria nunca derruba a ação */ }
}

function getPauta(id) {
  try { return db.prepare(`SELECT * FROM voice_pautas WHERE id=?`).get(id); } catch (e) { return null; }
}

// Enriquece a pauta com o que a tela precisa (contagens + link pronto).
function enrich(p, req) {
  if (!p) return p;
  const abertos = db.prepare(`SELECT COUNT(*) n FROM voice_pauta_comentarios
                              WHERE pauta_id=? AND resolvido=0`).get(p.id).n;
  const total = db.prepare(`SELECT COUNT(*) n FROM voice_pauta_comentarios WHERE pauta_id=?`).get(p.id).n;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
  return Object.assign({}, p, {
    comentarios_abertos: abertos,
    comentarios_total: total,
    link_rastreado: p.utm_token ? (proto + '://' + req.get('host') + '/go/' + p.utm_token) : '',
  });
}

// ── Estados ──────────────────────────────────────────────────────────────────
const ESTADOS = ['enviada', 'em_revisao', 'ajustes_pedidos', 'aprovada_voice', 'liberada', 'publicada'];
const ESTADO_LABEL = {
  enviada: 'Enviada pra você', em_revisao: 'Em revisão', ajustes_pedidos: 'Ajustes pedidos',
  aprovada_voice: 'Aguardando OK da Duda', liberada: 'Liberada pra publicar', publicada: 'Publicada',
};

// ── Listagem ─────────────────────────────────────────────────────────────────
router.get('/api/voices/pautas', requireArea, (req, res) => {
  try {
    const em = sessEmail(req), editor = isEditor(req);
    const filtros = [], params = [];
    if (!editor) { filtros.push('LOWER(voice_email)=?'); params.push(em); }
    const est = String(req.query.estado || '').trim();
    if (est && ESTADOS.includes(est)) { filtros.push('estado=?'); params.push(est); }
    const vid = String(req.query.voice || '').trim();
    if (editor && vid) { filtros.push('voice_id=?'); params.push(vid); }
    const where = filtros.length ? ' WHERE ' + filtros.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM voice_pautas${where}
                             ORDER BY updated_at DESC LIMIT 300`).all(...params);
    const pautas = rows.map(p => enrich(p, req));
    const porEstado = {};
    ESTADOS.forEach(e => { porEstado[e] = pautas.filter(p => p.estado === e).length; });
    res.json({
      papel: editor ? (isAprovador(req) ? 'aprovador' : 'redatoria') : 'voice',
      email: em, estados: ESTADOS, estado_label: ESTADO_LABEL,
      resumo: porEstado, pautas,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Detalhe (texto em parágrafos + comentários + histórico) ──────────────────
router.get('/api/voices/pautas/:id', requireArea, (req, res) => {
  try {
    const p = getPauta(parseInt(req.params.id, 10));
    if (!p) return res.status(404).json({ error: 'nao_encontrada' });
    if (!podeVer(req, p)) return res.status(403).json({ error: 'nao_e_sua' });

    const pars = paragrafos(p.corpo);
    const hashes = pars.map(hashPar);
    const coments = db.prepare(`SELECT * FROM voice_pauta_comentarios WHERE pauta_id=?
                                ORDER BY par_idx ASC, id ASC`).all(p.id)
      .map(c => Object.assign({}, c, {
        // Comentário "solto": o parágrafo que ele apontava foi reescrito ou sumiu.
        orfao: !(c.par_idx < hashes.length && hashes[c.par_idx] === c.par_hash),
      }));
    const eventos = db.prepare(`SELECT * FROM voice_pauta_eventos WHERE pauta_id=?
                                ORDER BY ts DESC LIMIT 100`).all(p.id);

    res.json({
      pauta: enrich(p, req), paragrafos: pars, comentarios: coments, eventos,
      estado_label: ESTADO_LABEL,
      permissoes: {
        editar: isEditor(req),                                        // Redatoria/Duda editam o texto
        comentar: true,                                               // dono e time comentam
        pedir_ajustes: !isEditor(req) || isAprovador(req),
        aprovar_voice: String(p.voice_email || '').toLowerCase() === sessEmail(req),
        aprovar_duda: isAprovador(req),
        publicar: String(p.voice_email || '').toLowerCase() === sessEmail(req),
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Atribuir pauta a um Voice (Redatoria/Duda/head) ──────────────────────────
router.post('/api/voices/pautas', requireLogin, express.json({ limit: '256kb' }), (req, res) => {
  if (!isEditor(req)) return res.status(403).json({ error: 'so_time_editorial' });
  const b = req.body || {};
  const titulo = String(b.titulo || '').trim().slice(0, 300);
  const voice_email = String(b.voice_email || '').toLowerCase().trim();
  if (!titulo) return res.status(400).json({ error: 'titulo_obrigatorio' });
  if (!voice_email) return res.status(400).json({ error: 'voice_obrigatorio' });
  try {
    let corpo = String(b.corpo || '');
    let content_id = parseInt(b.content_id, 10) || null;
    // Puxa o texto direto da pauta da Redatoria quando veio de lá.
    if (content_id && !corpo) {
      const c = db.prepare(`SELECT titulo, corpo, copy_text FROM content_pipeline WHERE id=?`).get(content_id);
      if (c) corpo = c.corpo || c.copy_text || '';
    }
    const r = db.prepare(`INSERT INTO voice_pautas
        (content_id, voice_id, voice_nome, voice_email, titulo, corpo, destino_url, prazo, atribuida_por, estado)
        VALUES (?,?,?,?,?,?,?,?,?, 'enviada')`)
      .run(content_id, String(b.voice_id || '').slice(0, 60), String(b.voice_nome || '').slice(0, 120),
           voice_email, titulo, corpo, String(b.destino_url || '').trim().slice(0, 500),
           String(b.prazo || '').slice(0, 10), sessEmail(req));
    logEvento(r.lastInsertRowid, 'enviada', req, 'pauta atribuída a ' + voice_email);
    res.json({ success: true, id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Editar a pauta (só time editorial) ───────────────────────────────────────
router.patch('/api/voices/pautas/:id', requireLogin, express.json({ limit: '256kb' }), (req, res) => {
  const p = getPauta(parseInt(req.params.id, 10));
  if (!p) return res.status(404).json({ error: 'nao_encontrada' });
  if (!isEditor(req)) return res.status(403).json({ error: 'so_time_editorial' });
  if (p.estado === 'publicada') return res.status(400).json({ error: 'ja_publicada' });
  const b = req.body || {};
  try {
    const campos = [], vals = [];
    if (b.titulo !== undefined) { campos.push('titulo=?'); vals.push(String(b.titulo).slice(0, 300)); }
    if (b.corpo !== undefined) { campos.push('corpo=?'); vals.push(String(b.corpo)); }
    if (b.destino_url !== undefined) { campos.push('destino_url=?'); vals.push(String(b.destino_url).trim().slice(0, 500)); }
    if (b.prazo !== undefined) { campos.push('prazo=?'); vals.push(String(b.prazo).slice(0, 10)); }
    if (!campos.length) return res.status(400).json({ error: 'nada_pra_mudar' });
    // Texto revisado devolve a pauta pro Voice olhar de novo.
    let novoEstado = p.estado;
    if (b.corpo !== undefined && p.estado === 'ajustes_pedidos') novoEstado = 'em_revisao';
    campos.push('estado=?'); vals.push(novoEstado);
    campos.push("updated_at=datetime('now')");
    db.prepare(`UPDATE voice_pautas SET ${campos.join(', ')} WHERE id=?`).run(...vals, p.id);
    logEvento(p.id, 'editada', req, b.corpo !== undefined ? 'texto revisado' : 'metadados atualizados');
    res.json({ success: true, estado: novoEstado });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Comentar num parágrafo ───────────────────────────────────────────────────
router.post('/api/voices/pautas/:id/comentario', requireLogin, express.json({ limit: '8kb' }), (req, res) => {
  const p = getPauta(parseInt(req.params.id, 10));
  if (!p) return res.status(404).json({ error: 'nao_encontrada' });
  if (!podeVer(req, p)) return res.status(403).json({ error: 'nao_e_sua' });
  const b = req.body || {};
  const texto = String(b.texto || '').trim().slice(0, 2000);
  const idx = parseInt(b.par_idx, 10);
  if (!texto) return res.status(400).json({ error: 'texto_obrigatorio' });
  const pars = paragrafos(p.corpo);
  if (!(idx >= 0 && idx < pars.length)) return res.status(400).json({ error: 'paragrafo_invalido' });
  try {
    const r = db.prepare(`INSERT INTO voice_pauta_comentarios
        (pauta_id, par_idx, par_hash, par_trecho, autor, autor_nome, papel, texto)
        VALUES (?,?,?,?,?,?,?,?)`)
      .run(p.id, idx, hashPar(pars[idx]), pars[idx].slice(0, 120),
           sessEmail(req), sessNome(req), isEditor(req) ? (isAprovador(req) ? 'brand' : 'redatoria') : 'voice', texto);
    // Marca que o Voice começou a mexer (sem exigir clique num botão "iniciar").
    if (p.estado === 'enviada') {
      db.prepare(`UPDATE voice_pautas SET estado='em_revisao', updated_at=datetime('now') WHERE id=?`).run(p.id);
    }
    logEvento(p.id, 'comentou', req, 'parágrafo ' + (idx + 1));
    res.json({ success: true, id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Resolver / reabrir comentário ────────────────────────────────────────────
router.patch('/api/voices/pautas/:id/comentario/:cid', requireLogin, express.json({ limit: '2kb' }), (req, res) => {
  const p = getPauta(parseInt(req.params.id, 10));
  if (!p) return res.status(404).json({ error: 'nao_encontrada' });
  if (!podeVer(req, p)) return res.status(403).json({ error: 'nao_e_sua' });
  try {
    const resolvido = (req.body || {}).resolvido ? 1 : 0;
    const r = db.prepare(`UPDATE voice_pauta_comentarios SET resolvido=? WHERE id=? AND pauta_id=?`)
                .run(resolvido, parseInt(req.params.cid, 10), p.id);
    if (!r.changes) return res.status(404).json({ error: 'comentario_nao_encontrado' });
    res.json({ success: true, resolvido: !!resolvido });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Transições de estado ─────────────────────────────────────────────────────
// pedir_ajustes | aprovar_voice | aprovar_duda | publicar | reabrir
router.post('/api/voices/pautas/:id/acao', requireLogin, express.json({ limit: '4kb' }), (req, res) => {
  const p = getPauta(parseInt(req.params.id, 10));
  if (!p) return res.status(404).json({ error: 'nao_encontrada' });
  if (!podeVer(req, p)) return res.status(403).json({ error: 'nao_e_sua' });
  const acao = String((req.body || {}).acao || '');
  const dono = String(p.voice_email || '').toLowerCase() === sessEmail(req);
  const set = (estado, extra) => {
    const campos = ['estado=?'], vals = [estado];
    Object.entries(extra || {}).forEach(([k, v]) => { campos.push(k + '=?'); vals.push(v); });
    campos.push("updated_at=datetime('now')");
    db.prepare(`UPDATE voice_pautas SET ${campos.join(', ')} WHERE id=?`).run(...vals, p.id);
  };

  try {
    if (acao === 'pedir_ajustes') {
      if (!dono && !isEditor(req)) return res.status(403).json({ error: 'sem_permissao' });
      const abertos = db.prepare(`SELECT COUNT(*) n FROM voice_pauta_comentarios
                                  WHERE pauta_id=? AND resolvido=0`).get(p.id).n;
      if (!abertos) return res.status(400).json({ error: 'sem_comentarios',
        motivo: 'Comente nos parágrafos que precisam mudar antes de pedir ajuste.' });
      set('ajustes_pedidos');
      logEvento(p.id, 'ajustes_pedidos', req, abertos + ' comentário(s) aberto(s)');
      return res.json({ success: true, estado: 'ajustes_pedidos' });
    }

    if (acao === 'aprovar_voice') {
      if (!dono) return res.status(403).json({ error: 'so_o_voice_aprova' });
      if (p.estado === 'liberada' || p.estado === 'publicada') {
        return res.status(400).json({ error: 'ja_aprovada' });
      }
      set('aprovada_voice');
      logEvento(p.id, 'aprovada_voice', req, 'texto aprovado pelo Voice');
      return res.json({ success: true, estado: 'aprovada_voice' });
    }

    if (acao === 'aprovar_duda') {
      if (!isAprovador(req)) return res.status(403).json({ error: 'so_brand_aprova' });
      if (p.estado !== 'aprovada_voice') {
        return res.status(400).json({ error: 'fora_de_ordem',
          motivo: 'O Voice precisa aprovar o texto antes do OK final.' });
      }
      if (!p.destino_url) {
        return res.status(400).json({ error: 'sem_destino',
          motivo: 'Defina o link do conteúdo que o post vai divulgar — é ele que vira o link rastreado.' });
      }
      // Link nasce aqui, já atribuído ao VOICE: os cliques e os ERP Coins são dele.
      const r = utm.criarLink({
        email: p.voice_email, dest: p.destino_url,
        campaign: p.titulo, source: 'linkedin', host: req.get('host'),
      });
      if (r.erro) return res.status(400).json({ error: r.erro, motivo: r.motivo });
      set('liberada', { utm_token: r.token });
      logEvento(p.id, 'liberada', req, 'OK final + link ' + r.token + (r.reused ? ' (reusado)' : ''));
      return res.json({ success: true, estado: 'liberada', token: r.token });
    }

    if (acao === 'publicar') {
      if (!dono) return res.status(403).json({ error: 'so_o_voice_publica' });
      if (p.estado !== 'liberada') {
        return res.status(400).json({ error: 'nao_liberada',
          motivo: 'A pauta precisa do OK final antes de ser publicada.' });
      }
      const url = String((req.body || {}).post_url || '').trim().slice(0, 500);
      if (!/^https?:\/\/.+/i.test(url)) return res.status(400).json({ error: 'post_url_invalida' });
      set('publicada', { post_url: url, publicado_em: new Date().toISOString().slice(0, 19).replace('T', ' ') });
      logEvento(p.id, 'publicada', req, url);
      return res.json({ success: true, estado: 'publicada' });
    }

    if (acao === 'reabrir') {
      if (!isEditor(req)) return res.status(403).json({ error: 'so_time_editorial' });
      set('em_revisao');
      logEvento(p.id, 'reaberta', req, 'voltou pra revisão');
      return res.json({ success: true, estado: 'em_revisao' });
    }

    return res.status(400).json({ error: 'acao_invalida' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Voices disponíveis pra atribuição (roster real) ──────────────────────────
router.get('/api/voices/roster', requireLogin, (req, res) => {
  if (!isEditor(req)) return res.status(403).json({ error: 'so_time_editorial' });
  try {
    const lista = [];
    // Voices publicados (DB) + os do arquivo curado, sem duplicar.
    try {
      db.prepare(`SELECT data FROM voices_publicados`).all().forEach(r => {
        try { const v = JSON.parse(r.data); lista.push({ id: v.id, nome: v.nome, cargo: v.cargo || '' }); } catch (e) {}
      });
    } catch (e) {}
    try {
      const f = JSON.parse(require('fs').readFileSync(
        path.join(__dirname, '../public/api/voices.json'), 'utf8'));
      (f.voices || []).forEach(v => {
        if (!lista.some(x => x.id === v.id)) lista.push({ id: v.id, nome: v.nome, cargo: v.cargo || '' });
      });
    } catch (e) {}
    // E-mail cadastrado (users) por nome, quando existir — a atribuição precisa dele.
    const users = db.prepare(`SELECT email, name FROM users WHERE active=1`).all();
    const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    lista.forEach(v => {
      const u = users.find(u => norm(u.name) === norm(v.nome));
      v.email = u ? u.email : '';
    });
    res.json({ voices: lista, usuarios: users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Pautas da Redatoria ainda não atribuídas (pra o time escolher) ───────────
router.get('/api/voices/pautas-disponiveis', requireLogin, (req, res) => {
  if (!isEditor(req)) return res.status(403).json({ error: 'so_time_editorial' });
  try {
    const rows = db.prepare(`
      SELECT c.id, c.titulo, c.lob, c.pilar, c.estado, c.corpo, c.url_publicado
      FROM content_pipeline c
      WHERE c.id NOT IN (SELECT COALESCE(content_id,-1) FROM voice_pautas)
      ORDER BY c.updated_at DESC LIMIT 100`).all();
    res.json({ pautas: rows.map(r => ({ ...r, tem_corpo: !!(r.corpo || '').trim() })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Páginas ──────────────────────────────────────────────────────────────────
router.get('/voices/pautas', requireArea, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/voices-pautas.html'));
});
router.get('/voices/pauta', requireArea, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/voices-pauta.html'));
});

// Contagens pro sino de alertas (server.js consome).
function alertasDoUsuario(email, role) {
  const out = [];
  try {
    const em = String(email || '').toLowerCase();
    if (!em) return out;
    const minhas = db.prepare(`SELECT COUNT(*) n FROM voice_pautas
      WHERE LOWER(voice_email)=? AND estado IN ('enviada','em_revisao')`).get(em).n;
    if (minhas) out.push({ tipo: 'action', msg: `📝 Você tem ${minhas} pauta(s) esperando sua revisão`, href: '/voices/pautas' });
    const liberadas = db.prepare(`SELECT COUNT(*) n FROM voice_pautas
      WHERE LOWER(voice_email)=? AND estado='liberada'`).get(em).n;
    if (liberadas) out.push({ tipo: 'action', msg: `🚀 ${liberadas} pauta(s) liberada(s) — link pronto pra publicar`, href: '/voices/pautas' });
    if (APROVADORES.has(role)) {
      const okPendente = db.prepare(`SELECT COUNT(*) n FROM voice_pautas WHERE estado='aprovada_voice'`).get().n;
      if (okPendente) out.push({ tipo: 'action', msg: `✅ ${okPendente} pauta(s) esperando seu OK final`, href: '/voices/pautas' });
    }
  } catch (e) { /* sino nunca quebra */ }
  return out;
}

module.exports = router;
module.exports.alertasDoUsuario = alertasDoUsuario;
module.exports.ESTADOS = ESTADOS;
module.exports.ESTADO_LABEL = ESTADO_LABEL;
