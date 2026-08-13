// ════════════════════════════════════════════════════════════════════════════
// routes/comunicados.js — Fila de comunicados por e-mail (Módulo 21)
//
// Por que existe: quem escreve o comunicado (eu, via chat) não tem como falar
// com a Resend nem com a produção — o egress do ambiente é allowlist. Então o
// caminho é invertido: o comunicado é COMMITADO como conteúdo curado
// (public/api/comunicados.json + o HTML em public/emails/), e é o próprio
// Office, que já tem a RESEND_API_KEY, quem envia sozinho depois do deploy.
//
// Fluxo: peço → escrevo o comunicado no repo → sobe → o Office envia em ~90s.
// Também dá pra disparar/cancelar na mão em /admin/comunicados.
//
// Travas (isto manda e-mail pra gente de verdade):
//   · destinatário só em domínio da allowlist (padrão: epiuse.com.br)
//   · id estável = envio único; reenvio só explícito pelo painel
//   · teto por rodada, pra um JSON errado não virar disparo em massa
//   · COMUNICADOS_ENABLED=false desliga tudo
//   · toda tentativa (inclusive falha) fica registrada e visível
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, resend } = require('../server-context');
const { requireAdmin } = require('./users');

const FROM_EMAIL = process.env.FROM_EMAIL || 'voices@resend.dev';
const DOMINIOS_OK = String(process.env.COMUNICADOS_DOMINIOS || 'epiuse.com.br')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const HABILITADO = String(process.env.COMUNICADOS_ENABLED || 'true') !== 'false';
const MAX_POR_RODADA = parseInt(process.env.COMUNICADOS_MAX_RODADA, 10) || 5;

const JSON_PATH = path.join(__dirname, '../public/api/comunicados.json');
const EMAILS_DIR = path.join(__dirname, '../public/emails');

db.exec(`
  CREATE TABLE IF NOT EXISTS comunicados_envios (
    id          TEXT PRIMARY KEY,        -- id do comunicado (estável) = trava de reenvio
    assunto     TEXT,
    para        TEXT,
    cc          TEXT,
    status      TEXT,                    -- enviado | falhou | cancelado
    erro        TEXT DEFAULT '',
    tentativas  INTEGER DEFAULT 0,
    enviado_em  TEXT,
    criado_em   TEXT DEFAULT (datetime('now'))
  );
`);

function lerFila() {
  try {
    const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    return Array.isArray(j.comunicados) ? j.comunicados : [];
  } catch (e) { return []; }
}
function lerCorpo(c) {
  if (c.html) return c.html;
  if (c.html_file) {
    // trava de path traversal: só arquivo direto dentro de public/emails
    const nome = path.basename(String(c.html_file));
    try { return fs.readFileSync(path.join(EMAILS_DIR, nome), 'utf8'); } catch (e) { return null; }
  }
  return null;
}
function destinatariosOk(lista) {
  const arr = (Array.isArray(lista) ? lista : [lista]).filter(Boolean).map(s => String(s).toLowerCase().trim());
  if (!arr.length) return { ok: false, motivo: 'sem destinatário' };
  const fora = arr.filter(e => !DOMINIOS_OK.some(d => e.endsWith('@' + d)));
  if (fora.length) return { ok: false, motivo: 'domínio não permitido: ' + fora.join(', ') };
  return { ok: true, lista: arr };
}
function registro(id) {
  try { return db.prepare(`SELECT * FROM comunicados_envios WHERE id=?`).get(id); } catch (e) { return null; }
}

// Estado de um comunicado do JSON cruzado com o log de envio.
function estadoDe(c) {
  const r = registro(c.id);
  if (r) return { status: r.status, erro: r.erro, enviado_em: r.enviado_em, tentativas: r.tentativas };
  if (c.ativo === false) return { status: 'inativo' };
  return { status: 'pendente' };
}

// ── Envio ────────────────────────────────────────────────────────────────────
async function enviarUm(c, { forcar = false, por = 'auto' } = {}) {
  const r = registro(c.id);
  if (r && r.status === 'enviado' && !forcar) return { id: c.id, pulou: 'já enviado' };
  if (r && r.status === 'cancelado' && !forcar) return { id: c.id, pulou: 'cancelado' };
  if (c.ativo === false && !forcar) return { id: c.id, pulou: 'inativo' };

  const grava = (status, erro) => {
    try {
      db.prepare(`INSERT INTO comunicados_envios (id, assunto, para, cc, status, erro, tentativas, enviado_em)
                  VALUES (?,?,?,?,?,?,1,?)
                  ON CONFLICT(id) DO UPDATE SET status=excluded.status, erro=excluded.erro,
                    tentativas=comunicados_envios.tentativas+1, enviado_em=excluded.enviado_em,
                    assunto=excluded.assunto, para=excluded.para, cc=excluded.cc`)
        .run(c.id, c.assunto || '', (c.para || []).join(', '), (c.cc || []).join(', '),
             status, erro || '', status === 'enviado' ? new Date().toISOString() : null);
    } catch (e) { console.warn('[comunicados] log:', e.message); }
  };

  // A validação do conteúdo vem ANTES de checar chave/kill-switch de propósito:
  // um destinatário inválido tem que ser reportado como tal em qualquer
  // ambiente, e assim a trava de domínio é exercitável sem precisar de chave.
  const dPara = destinatariosOk(c.para);
  if (!dPara.ok) { grava('falhou', dPara.motivo); return { id: c.id, erro: dPara.motivo }; }
  let cc = [];
  if (c.cc && (Array.isArray(c.cc) ? c.cc.length : c.cc)) {
    const dCc = destinatariosOk(c.cc);
    if (!dCc.ok) { grava('falhou', 'cc — ' + dCc.motivo); return { id: c.id, erro: 'cc — ' + dCc.motivo }; }
    cc = dCc.lista;
  }
  const html = lerCorpo(c);
  if (!html) { grava('falhou', 'corpo não encontrado (' + (c.html_file || 'inline') + ')'); return { id: c.id, erro: 'sem_corpo' }; }
  if (!c.assunto) { grava('falhou', 'sem assunto'); return { id: c.id, erro: 'sem_assunto' }; }

  if (!HABILITADO) { grava('falhou', 'envio desligado (COMUNICADOS_ENABLED=false)'); return { id: c.id, erro: 'desligado' }; }
  if (!resend) { grava('falhou', 'sem RESEND_API_KEY no ambiente'); return { id: c.id, erro: 'sem_resend' }; }

  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: dPara.lista, cc: cc.length ? cc : undefined,
      subject: c.assunto, html,
    });
    grava('enviado', '');
    console.log(`[comunicados] enviado "${c.id}" → ${dPara.lista.join(', ')}${cc.length ? ' (cc ' + cc.join(', ') + ')' : ''} [${por}]`);
    return { id: c.id, enviado: true };
  } catch (e) {
    grava('falhou', String(e.message || e).slice(0, 300));
    console.warn(`[comunicados] falhou "${c.id}":`, e.message);
    return { id: c.id, erro: e.message };
  }
}

// ── Rodada automática ────────────────────────────────────────────────────────
async function rodada() {
  try {
    const fila = lerFila().filter(c => c && c.id && c.auto !== false && c.ativo !== false);
    const pendentes = fila.filter(c => {
      const r = registro(c.id);
      return !r || (r.status !== 'enviado' && r.status !== 'cancelado');
    }).slice(0, MAX_POR_RODADA);
    if (!pendentes.length) return;
    console.log(`[comunicados] rodada: ${pendentes.length} pendente(s)`);
    for (const c of pendentes) await enviarUm(c, { por: 'auto' });
  } catch (e) { console.warn('[comunicados] rodada:', e.message); }
}
// .unref(): os timers não seguram o event loop sozinhos — em produção quem
// mantém o processo vivo é o servidor HTTP, e assim scripts/testes que só
// requerem o módulo conseguem terminar.
setTimeout(rodada, 90000).unref();               // ~90s após o boot (deploy → envia)
setInterval(rodada, 60 * 60 * 1000).unref();     // e de hora em hora

// ── API ──────────────────────────────────────────────────────────────────────
router.get('/api/admin/comunicados', requireAdmin, (req, res) => {
  try {
    const fila = lerFila().map(c => {
      const st = estadoDe(c);
      return {
        id: c.id, assunto: c.assunto, para: c.para || [], cc: c.cc || [],
        auto: c.auto !== false, ativo: c.ativo !== false,
        tem_corpo: !!lerCorpo(c), html_file: c.html_file || null,
        resumo: c.resumo || '', ...st,
      };
    });
    res.json({
      envio_habilitado: HABILITADO,
      resend_configurado: !!resend,
      from: FROM_EMAIL, dominios_permitidos: DOMINIOS_OK,
      comunicados: fila,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Prévia do corpo, pra conferir antes de disparar.
router.get('/api/admin/comunicados/:id/preview', requireAdmin, (req, res) => {
  const c = lerFila().find(x => x.id === req.params.id);
  if (!c) return res.status(404).send('Comunicado não encontrado.');
  const html = lerCorpo(c);
  if (!html) return res.status(404).send('Corpo do comunicado não encontrado.');
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

router.post('/api/admin/comunicados/:id/enviar', requireAdmin, express.json({ limit: '2kb' }), async (req, res) => {
  const c = lerFila().find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'nao_encontrado' });
  const forcar = !!(req.body || {}).forcar; // reenvio explícito
  const r = await enviarUm(c, { forcar, por: 'painel' });
  res.json({ success: !!r.enviado, ...r });
});

router.post('/api/admin/comunicados/:id/cancelar', requireAdmin, (req, res) => {
  try {
    const c = lerFila().find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'nao_encontrado' });
    db.prepare(`INSERT INTO comunicados_envios (id, assunto, para, cc, status, erro, tentativas)
                VALUES (?,?,?,?,'cancelado','',0)
                ON CONFLICT(id) DO UPDATE SET status='cancelado'`)
      .run(c.id, c.assunto || '', (c.para || []).join(', '), (c.cc || []).join(', '));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/admin/comunicados', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-comunicados.html'));
});

module.exports = router;
module.exports.rodada = rodada;
