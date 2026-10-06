// ════════════════════════════════════════════════════════════════════════════
// routes/email.js — envio de e-mail do Office, num lugar só (Módulo 31)
//
// Por que existe: cada módulo mandava e-mail do seu jeito, com
// FROM_EMAIL='voices@resend.dev' — remetente que a Resend recusa (o resend.dev
// não é nosso) — e sem checar o { error } que o SDK v4 devolve em vez de lançar.
// Resultado: inscrição de Voice, brindes, resgate da Loja, banco de horas e o
// resumo semanal "saíam" e ninguém recebia. Falha invisível.
//
// Aqui: cadeia de remetentes (o configurado → onboarding@resend.dev), trava de
// destinatário por domínio, checagem do retorno e log de TODA tentativa em
// email_log — que o motor de alertas lê pra avisar quando o e-mail parou.
// O Módulo 21 (comunicados) usa as mesmas peças, com o log próprio dele.
// ════════════════════════════════════════════════════════════════════════════
const { db, resend } = require('../server-context');

// ── Remetente ────────────────────────────────────────────────────────────────
// A Resend só aceita onboarding@resend.dev (teste) ou algo@<domínio verificado>.
// Tenta o configurado e, se a recusa for de remetente/domínio, refaz com o de
// teste. Some quando o domínio for verificado e o FROM_EMAIL apontar pra ele.
const FALLBACK_FROM = 'onboarding@resend.dev';
const FROM_EMAIL = process.env.FROM_EMAIL || FALLBACK_FROM;
const REMETENTES = [...new Set(
  [FROM_EMAIL, FALLBACK_FROM].filter(f => f && (f === FALLBACK_FROM || !/@resend\.dev$/i.test(f)))
)];

// ── Destinatários permitidos ─────────────────────────────────────────────────
// Domínios da casa + endereços liberados um a um (com domínio não verificado a
// Resend só entrega no e-mail dono da conta, que pode ser pessoal).
const DOMINIOS_OK = String(process.env.COMUNICADOS_DOMINIOS || 'epiuse.com.br')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const EMAILS_EXTRA = String(process.env.COMUNICADOS_EMAILS_EXTRA || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const NOTIFY_EMAIL = (process.env.NOTIFY_EMAIL || 'ruda.costa@epiuse.com.br').toLowerCase();
// Base dos links dentro dos e-mails (o e-mail é lido fora do Office).
const OFFICE_URL = String(process.env.OFFICE_URL || process.env.BASE_URL || 'https://office.epiuse.com.br').replace(/\/+$/, '');

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
function enderecoPermitido(e) {
  const em = String(e || '').toLowerCase().trim();
  if (!EMAIL_RE.test(em)) return false;
  return DOMINIOS_OK.some(d => em.endsWith('@' + d)) || EMAILS_EXTRA.includes(em);
}
function destinatariosOk(lista) {
  const arr = [...new Set((Array.isArray(lista) ? lista : [lista]).filter(Boolean).map(s => String(s).toLowerCase().trim()))];
  if (!arr.length) return { ok: false, motivo: 'sem destinatário' };
  const fora = arr.filter(e => !enderecoPermitido(e));
  if (fora.length) return { ok: false, motivo: 'destinatário não permitido: ' + fora.join(', ') };
  return { ok: true, lista: arr };
}

// A Resend devolve o erro como objeto ({name, message, statusCode}).
function erroLegivel(err) {
  if (!err) return 'erro desconhecido';
  if (typeof err === 'string') return err;
  const txt = [err.name, err.message].filter(Boolean).join(': ');
  return txt || JSON.stringify(err);
}
// A recusa é do remetente/domínio? (só então vale tentar o próximo)
function ehErroDeRemetente(err) {
  return /domain|from|sender|verif|not allowed|403/.test((erroLegivel(err) || '').toLowerCase());
}

// Tenta cada remetente; só troca quando a recusa é de remetente/domínio.
// Devolve { data, error, remetente }. Exige `resend` configurado.
async function enviarComFallback(payload, prefixo = '[email]') {
  let ultimo = null;
  for (const from of REMETENTES) {
    const r = await resend.emails.send({ from, ...payload });
    if (!r || !r.error) return { ...r, remetente: from };
    ultimo = { ...r, remetente: from };
    if (!ehErroDeRemetente(r.error)) break;
    console.warn(`${prefixo} remetente "${from}" recusado (${erroLegivel(r.error)}) — tentando o próximo`);
  }
  return ultimo;
}

// ── Log ──────────────────────────────────────────────────────────────────────
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo       TEXT,                 -- alerta-critico | relatorio-semanal | relatorio-mensal | inscricao | brindes | loja | horas | egg | teste
      assunto    TEXT,
      para       TEXT,
      status     TEXT,                 -- enviado | falhou | pulado
      erro       TEXT DEFAULT '',
      remetente  TEXT DEFAULT '',
      resend_id  TEXT DEFAULT '',
      ts         TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_email_log_ts ON email_log(ts);
  `);
} catch (e) { console.warn('[email] tabela:', e.message); }

function registrar(tipo, assunto, para, status, erro, remetente, rid) {
  try {
    db.prepare(`INSERT INTO email_log (tipo, assunto, para, status, erro, remetente, resend_id) VALUES (?,?,?,?,?,?,?)`)
      .run(tipo || '', String(assunto || '').slice(0, 200), (para || []).join(', '), status,
           String(erro || '').slice(0, 300), remetente || '', rid || '');
  } catch (e) { console.warn('[email] log:', e.message); }
}

// ── Envio ────────────────────────────────────────────────────────────────────
// Nunca lança. Devolve { ok, para, resend_id, remetente } ou { ok:false, etapa, erro }.
async function enviar({ tipo = 'geral', para, cc, assunto, html, reply_to } = {}) {
  const d = destinatariosOk(para);
  if (!d.ok) { registrar(tipo, assunto, [].concat(para || []), 'falhou', d.motivo); return { ok: false, etapa: 'destinatario', erro: d.motivo }; }
  if (!assunto || !html) { registrar(tipo, assunto, d.lista, 'falhou', 'sem assunto/corpo'); return { ok: false, etapa: 'conteudo', erro: 'sem assunto/corpo' }; }
  // Cópia fora da allowlist cai fora (não derruba o envio principal).
  const ccOk = [...new Set([].concat(cc || []).map(s => String(s).toLowerCase().trim()))]
    .filter(e => enderecoPermitido(e) && !d.lista.includes(e));
  if (!resend) {
    registrar(tipo, assunto, d.lista, 'pulado', 'sem RESEND_API_KEY');
    console.log(`[email] ${tipo} pulado (sem RESEND_API_KEY) → ${d.lista.join(', ')}`);
    return { ok: false, etapa: 'chave', erro: 'sem RESEND_API_KEY no ambiente' };
  }
  try {
    const payload = { to: d.lista, subject: assunto, html };
    if (ccOk.length) payload.cc = ccOk;
    if (reply_to && EMAIL_RE.test(String(reply_to))) payload.reply_to = String(reply_to);
    const r = await enviarComFallback(payload, `[email:${tipo}]`);
    if (r && r.error) {
      const msg = erroLegivel(r.error);
      registrar(tipo, assunto, d.lista, 'falhou', msg, r.remetente);
      console.warn(`[email] ${tipo} recusado → ${d.lista.join(', ')}: ${msg}`);
      return { ok: false, etapa: 'resend', erro: msg, remetente: r.remetente };
    }
    const rid = (r && r.data && r.data.id) || '';
    registrar(tipo, assunto, d.lista, 'enviado', '', r && r.remetente, rid);
    console.log(`[email] ${tipo} enviado id=${rid || '?'} de=${r && r.remetente} → ${d.lista.join(', ')}`);
    return { ok: true, para: d.lista, resend_id: rid, remetente: r && r.remetente };
  } catch (e) {
    const msg = String((e && e.message) || e);
    registrar(tipo, assunto, d.lista, 'falhou', msg);
    console.warn(`[email] ${tipo} falhou:`, msg);
    return { ok: false, etapa: 'excecao', erro: msg };
  }
}

// ── Saúde (lida pelo motor de alertas e pelo /admin/alertas) ─────────────────
function saude() {
  const one = (sql) => { try { return db.prepare(sql).get() || {}; } catch (_) { return {}; } };
  const ok = one(`SELECT ts, tipo FROM email_log WHERE status='enviado' ORDER BY id DESC LIMIT 1`);
  const falha = one(`SELECT ts, tipo, erro FROM email_log WHERE status='falhou' ORDER BY id DESC LIMIT 1`);
  const f7 = one(`SELECT COUNT(*) n FROM email_log WHERE status='falhou' AND ts >= datetime('now','-7 days')`).n || 0;
  return {
    configurado: !!resend, from: FROM_EMAIL, remetentes: REMETENTES,
    dominios_permitidos: DOMINIOS_OK, emails_extra: EMAILS_EXTRA,
    ultimo_ok: ok.ts || null, ultimo_ok_tipo: ok.tipo || null,
    ultima_falha: falha.ts ? { ts: falha.ts, tipo: falha.tipo, erro: falha.erro } : null,
    falhas_7d: f7,
  };
}
function ultimos(limit = 30) {
  try { return db.prepare(`SELECT * FROM email_log ORDER BY id DESC LIMIT ?`).all(Math.min(200, limit)); }
  catch (_) { return []; }
}

module.exports = {
  enviar, enviarComFallback, saude, ultimos, registrar,
  enderecoPermitido, destinatariosOk, erroLegivel, ehErroDeRemetente,
  FROM_EMAIL, FALLBACK_FROM, REMETENTES, DOMINIOS_OK, EMAILS_EXTRA, NOTIFY_EMAIL, OFFICE_URL,
};
