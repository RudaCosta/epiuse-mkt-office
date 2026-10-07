// ════════════════════════════════════════════════════════════════════════════
// routes/alertas.js — Central de Alertas & Relatórios (Módulo 31)
//
// Antes: o sino mostrava 4 frases escritas à mão no voices.json em maio (nunca
// mudavam), o badge contava tudo e nunca zerava, e o "resumo semanal" saía com
// um remetente que a Resend recusa. Ninguém olhava.
//
// Agora:
//   • REGRAS lê dado real (SQLite, integrações, events.json) e gera alertas com
//     nível (crítico · importante · para saber), área dona e link de ação.
//   • A cada 30 min uma varredura grava o estado (alertas_estado): quando abriu,
//     quando mudou, quando resolveu sozinho. Cada pessoa marca como lido ou
//     silencia (alertas_leitura). Badge = só o que é crítico/importante e não lido.
//   • E-mail: crítico sai na hora (dia útil 8h–19h, 1x por ocorrência, só se
//     sobreviveu a 2 varreduras); relatório semanal toda segunda 8h; mensal no
//     1º dia útil 9h. Destinatários em /admin/alertas (padrão: NOTIFY_EMAIL).
//   • Visibilidade segue routes/acesso.js: cada um vê os alertas das áreas que
//     abre; 'admin' é só do super admin.
// ════════════════════════════════════════════════════════════════════════════
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { db, IS_LOCAL_DEV } = require('../server-context');
const mailer = require('./email');
const rel = require('./alertas-relatorios');
const acesso = require('./acesso');

const HOUR = 36e5, DAY = 24 * HOUR;
const VARREDURA_MS = 30 * 60 * 1000;
const CACHE_MS = 5 * 60 * 1000;            // o sino reaproveita a varredura recente
const MIN_IDADE_EMAIL_MS = 25 * 60 * 1000; // crítico precisa sobreviver a 2 varreduras
const REENVIO_MIN_MS = DAY;                // alerta que pisca não manda 2 e-mails no mesmo dia
const { ms, fmtIdade, dataBRT, BRT_MS } = rel;

const NIVEIS = ['critico', 'importante', 'info'];
const AREA_LABEL = {
  admin: 'Administração', time: 'Time de Marketing', intelligence: 'Intelligence & CRM',
  growth: 'Growth & Performance', eventos: 'Field Marketing & Eventos', pipeline: 'Biz Dev / Pipeline',
  brand: 'Brand Experience', conteudo: 'Conteúdo', voices: 'Pautas dos Voices',
};
// Papel de quem é dona de cada área (pra "donas recebem os alertas da área").
const AREA_ROLE = { intelligence: 'intelligence', growth: 'growth', eventos: 'field', pipeline: 'pipeline', brand: 'brand', conteudo: 'conteudo' };

const all = (sql, ...a) => { try { return db.prepare(sql).all(...a); } catch (_) { return []; } };
const one = (sql, ...a) => { try { return db.prepare(sql).get(...a) || {}; } catch (_) { return {}; } };
const agoraISO = () => new Date().toISOString();
const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;

// ── Tabelas ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS app_blobs (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS alertas_estado (
    id           TEXT PRIMARY KEY,     -- regra[:sub] — estável entre varreduras
    regra        TEXT,
    nivel        TEXT,                 -- critico | importante | info
    areas        TEXT,                 -- JSON: áreas de acesso que enxergam
    titulo       TEXT,
    chave        TEXT DEFAULT '',      -- assinatura estável (sem idade): muda → volta a "não lido"
    detalhe      TEXT DEFAULT '',
    href         TEXT DEFAULT '',
    aberto_em    TEXT,                 -- início da ocorrência atual
    mudou_em     TEXT,                 -- última mudança de título/nível (volta a "não lido")
    visto_em     TEXT,                 -- última varredura que o encontrou
    resolvido_em TEXT,                 -- NULL = aberto
    email_em     TEXT                  -- último e-mail de crítico enviado
  );
  CREATE INDEX IF NOT EXISTS idx_alertas_aberto ON alertas_estado(resolvido_em);
  CREATE TABLE IF NOT EXISTS alertas_leitura (
    email          TEXT,
    alerta_id      TEXT,
    lido_em        TEXT,
    silenciado_ate TEXT,
    PRIMARY KEY (email, alerta_id)
  );
  -- Uma linha por ocorrência (abre → resolve). alertas_estado guarda só a atual;
  -- os relatórios contam aberturas/resoluções do período por aqui.
  CREATE TABLE IF NOT EXISTS alertas_ocorrencias (
    seq          INTEGER PRIMARY KEY AUTOINCREMENT,
    alerta_id    TEXT,
    nivel        TEXT,
    areas        TEXT,
    aberto_em    TEXT,
    resolvido_em TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_alertas_oc_id ON alertas_ocorrencias(alerta_id, resolvido_em);
`);
try { db.exec(`ALTER TABLE alertas_estado ADD COLUMN chave TEXT DEFAULT ''`); } catch (_e) { /* já existe */ }

function lerBlob(k) { try { const r = db.prepare('SELECT value FROM app_blobs WHERE key=?').get(k); return r && r.value ? JSON.parse(r.value) : null; } catch (_) { return null; } }
function gravarBlob(k, v) {
  db.prepare(`INSERT INTO app_blobs (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(k, JSON.stringify(v));
}

// ── Fontes que moram no server.js (registradas no boot) ─────────────────────
// eventos: lista do events.json + enriquecimento (mesmo slug da área Eventos)
// relatorio: snapshot mensal da tela /relatorio
const FONTES = { eventos: null, relatorio: null };
function registrar(nome, fn) { FONTES[nome] = fn; }
function eventos() { return FONTES.eventos ? FONTES.eventos() : { lista: [] }; }

// Saúde das integrações que rodam no server.js (GA4/RD diário).
function registrarSaude(fonte, ok, erro) {
  try {
    const k = 'saude.' + fonte, cur = lerBlob(k) || {};
    gravarBlob(k, ok ? { ...cur, ultima_ok_ts: agoraISO(), erro: null, erro_ts: null }
                     : { ...cur, erro: String(erro || 'erro').slice(0, 240), erro_ts: agoraISO() });
  } catch (e) { console.warn('[alertas] saude:', e.message); }
}
function saudeDiaria(fonte) {
  const s = lerBlob('saude.' + fonte);
  if (!s) return { status: 'aguardando' };
  const ok = ms(s.ultima_ok_ts), er = ms(s.erro_ts);
  if (er && (!ok || er > ok)) return { status: 'erro', erro: s.erro, ultima_ok_ts: s.ultima_ok_ts };
  if (ok && Date.now() - ok > 50 * HOUR) return { status: 'parado', ultima_ok_ts: s.ultima_ok_ts };
  return { status: 'ok', ultima_ok_ts: s.ultima_ok_ts };
}

function hojeBRT() { return dataBRT(Date.now()); }

// Dia útil no Brasil: seg–sex e fora dos feriados nacionais (fixos + móveis
// ligados à Páscoa). Recebe um Date já deslocado pro fuso BRT (ler com getUTC*).
function pascoa(y) {                    // algoritmo de Meeus/Jones/Butcher
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, mes - 1, dia);
}
const FERIADOS_FIXOS = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']);
function ehFeriado(d) {
  const y = d.getUTCFullYear();
  if (FERIADOS_FIXOS.has(d.toISOString().slice(5, 10))) return true;
  const hoje = Date.UTC(y, d.getUTCMonth(), d.getUTCDate()), p = pascoa(y);
  return [-48, -47, -2, 60].some(off => hoje === p + off * DAY);   // Carnaval (seg/ter), Sexta Santa, Corpus Christi
}
function ehDiaUtil(d) { const w = d.getUTCDay(); return w >= 1 && w <= 5 && !ehFeriado(d); }
function diasAte(dataStr) { return Math.round((ms(dataStr) - ms(hojeBRT())) / DAY); }

// Voices do programa (voices.json) + aprovados por inscrição (voices_publicados),
// do mesmo jeito que a Área Brand monta a lista.
function voicesAtivos() {
  let vs = [];
  try { vs = (JSON.parse(fs.readFileSync(path.join(__dirname, '../public/api/voices.json'), 'utf8')).voices || []).slice(); } catch (_) {}
  all(`SELECT data FROM voices_publicados ORDER BY created_at ASC`).forEach(r => {
    try { const v = JSON.parse(r.data); if (v && v.id && !vs.some(x => x.id === v.id)) vs.push(v); } catch (_) {}
  });
  return vs.filter(v => v && v.id && v.status !== 'inativo');
}
// Data do post mais recente de um Voice. A tabela posts guarda um snapshot por
// atualização de métricas: a data de cada post é a published_at informada ou,
// sem ela, a primeira vez que a URL foi registrada.
function ultimoPost(voiceId) {
  let max = 0;
  all(`SELECT MAX(published_at) pub, MIN(captured_at) prim FROM posts WHERE voice_id=? GROUP BY post_url`, voiceId).forEach(p => {
    const pub = /^\d{4}-\d{2}-\d{2}/.test(String(p.pub || '')) ? ms(String(p.pub).slice(0, 10)) : null;
    const t = pub || ms(p.prim);
    if (t && t > max) max = t;
  });
  return max || null;
}

// ════════════════════════════════════════════════════════════════════════════
// REGRAS — cada uma lê dado real e devolve 0..n alertas.
// { sub?, nivel?, areas?, titulo, detalhe, href, chave? } — o que faltar vem da regra.
// chave = o que define "mudou" (sem idade/contagem regressiva no meio); sem ela,
// vale o título. Mudou → o alerta volta a "não lido".
// ════════════════════════════════════════════════════════════════════════════
const REGRAS = [
  // ── Integrações que congelam dado quando param ────────────────────────────
  {
    id: 'fonte.apollo', areas: ['pipeline'], nivel: 'critico', nome: 'Apollo parou de atualizar',
    quando: 'Refresh automático (a cada 6h) sem sucesso há mais de 26h, ou falhando desde o boot. Sem chave no servidor vira aviso pro admin.',
    run() {
      const st = require('./area-pipeline').apolloStatusAtual();
      if (st.status === 'erro') return [{ titulo: 'Apollo não está atualizando', detalhe: `Erro: ${st.erro}. Os números de outbound da área Pipeline estão congelados.`, href: '/area/pipeline' }];
      if (st.status === 'parado') return [{ chave: 'parado', titulo: `Apollo sem atualizar há ${fmtIdade(Date.now() - ms(st.ultima_sync_ts))}`, detalhe: (st.erro ? `Último erro: ${st.erro}. ` : '') + 'Sequências, respostas e reuniões da área Pipeline estão congeladas.', href: '/area/pipeline' }];
      if (st.status === 'sem-chave' && !IS_LOCAL_DEV) return [{ sub: 'chave', nivel: 'importante', areas: ['admin'], titulo: 'Apollo sem chave no servidor', detalhe: 'Falta APOLLO_API_KEY no Railway — a área Pipeline fica sem máquina de outbound.', href: '/area/pipeline' }];
      return [];
    },
  },
  {
    id: 'fonte.calendario', areas: ['brand', 'conteudo', 'intelligence'], nivel: 'critico', nome: 'Calendário editorial parou de sincronizar',
    quando: 'Leitura automática da planilha no OneDrive (Graph, a cada 6h) sem sucesso há mais de 26h (crítico). Uma falha com o último sync bom recente é só importante.',
    run() {
      const st = require('./editorial').autoStatus();
      if (!st.ativo || (st.status !== 'erro' && st.status !== 'parado')) return [];
      const e = String(st.erro || '');
      const dica = /403/.test(e) ? ' 403 = permissão do app no Azure.' : /404/.test(e) ? ' 404 = o link EDITORIAL_SHARE_URL mudou.' : '';
      // Falha pontual (503, resync manual que deu erro) com dado de poucas horas
      // não congela nada: importante. Crítico é quando o dado já está velho.
      const recente = st.status === 'erro' && st.ultima_ok_ts && Date.now() - ms(st.ultima_ok_ts) < 26 * HOUR;
      return [{
        nivel: recente ? 'importante' : 'critico', chave: st.status,
        titulo: st.status === 'erro' ? 'Calendário editorial não sincroniza' : `Calendário editorial sem sincronizar há ${fmtIdade(Date.now() - ms(st.ultima_ok_ts))}`,
        detalhe: (e ? `Erro: ${e}.` : '') + dica + ' Enquanto isso, a área Brand mostra só o link da planilha.', href: '/area/brand',
      }];
    },
  },
  {
    id: 'fonte.cases', areas: ['brand'], nivel: 'importante', nome: 'Sync de Cases parado',
    quando: 'Sync diário (07:00, PC do Rudá → servidor) sem chegar há mais de 36h; vira crítico com 7 dias.',
    run() {
      const r = one(`SELECT COUNT(*) n, MAX(synced_at) s FROM cs_clientes`);
      const t = ms(r.s);
      if (!r.n || !t || Date.now() - t <= 36 * HOUR) return [];
      const idade = Date.now() - t;
      return [{ nivel: idade >= 7 * DAY ? 'critico' : 'importante', chave: 'parado', titulo: `Cases sem sincronizar há ${fmtIdade(idade)}`,
        detalhe: 'A tarefa EPI-USE-Office-Cases-Sync (07:00) não chegou ao servidor. Causa mais comum: EDITOR_TOKEN desatualizado no .env do PC (erro 401).', href: '/area/brand' }];
    },
  },
  {
    id: 'fonte.ga4', areas: ['intelligence'], nivel: 'importante', nome: 'GA4 (site) parou de atualizar',
    quando: 'Refresh diário do GA4 falhou ou não roda há mais de 50h (só onde há credencial).',
    run() {
      if (!process.env.GA4_PROPERTY_ID) return [];
      const s = saudeDiaria('ga4');
      if (s.status === 'erro') return [{ titulo: 'GA4 não está atualizando', detalhe: `Erro: ${s.erro}. Os números de site do relatório ficam congelados.`, href: '/relatorio' }];
      if (s.status === 'parado') return [{ chave: 'parado', titulo: `GA4 sem atualizar há ${fmtIdade(Date.now() - ms(s.ultima_ok_ts))}`, detalhe: 'Os números de site do relatório ficam congelados.', href: '/relatorio' }];
      return [];
    },
  },
  {
    id: 'fonte.rd', areas: ['intelligence'], nivel: 'importante', nome: 'RD Station parou de atualizar',
    quando: 'Refresh diário do RD falhou ou não roda há mais de 50h (só onde há credencial).',
    run() {
      if (!process.env.RD_REFRESH_TOKEN) return [];
      const s = saudeDiaria('rd');
      if (s.status === 'erro') return [{ titulo: 'RD Station não está atualizando', detalhe: `Erro: ${s.erro}. Os números de e-mail marketing do relatório ficam congelados.`, href: '/relatorio' }];
      if (s.status === 'parado') return [{ chave: 'parado', titulo: `RD Station sem atualizar há ${fmtIdade(Date.now() - ms(s.ultima_ok_ts))}`, detalhe: 'Os números de e-mail marketing do relatório ficam congelados.', href: '/relatorio' }];
      return [];
    },
  },
  {
    id: 'email.entrega', areas: ['admin'], nivel: 'importante', nome: 'E-mails do Office não estão chegando',
    quando: 'A última tentativa de envio falhou (e nenhuma deu certo depois), nos últimos 7 dias — ou o servidor está sem RESEND_API_KEY.',
    run() {
      const s = mailer.saude();
      if (!s.configurado) return IS_LOCAL_DEV ? [] : [{ sub: 'chave', titulo: 'E-mail desligado: sem RESEND_API_KEY', detalhe: 'Nenhum alerta crítico nem relatório sai por e-mail até a chave existir no Railway.', href: '/admin/alertas' }];
      const f = s.ultima_falha;
      if (f && (!s.ultimo_ok || ms(f.ts) > ms(s.ultimo_ok)) && Date.now() - ms(f.ts) < 7 * DAY) {
        return [{ titulo: 'E-mails do Office não estão chegando', detalhe: `Última falha (${f.tipo}): ${f.erro}`, href: '/admin/alertas' }];
      }
      return [];
    },
  },
  {
    id: 'comunicados.falha', areas: ['admin'], nivel: 'importante', nome: 'Comunicado não saiu',
    quando: 'Comunicado da fila (Módulo 21) com envio falhado nos últimos 30 dias.',
    run() {
      const r = all(`SELECT assunto, erro FROM comunicados_envios WHERE status='falhou' AND criado_em >= datetime('now','-30 days') ORDER BY criado_em DESC`);
      if (!r.length) return [];
      return [{ titulo: `${plural(r.length, 'comunicado')} não ${r.length === 1 ? 'saiu' : 'saíram'}`, detalhe: `"${r[0].assunto}": ${r[0].erro || 'erro sem detalhe'}`, href: '/admin/comunicados' }];
    },
  },

  // ── Filas com prazo ───────────────────────────────────────────────────────
  {
    id: 'loja.resgates', areas: ['admin'], nivel: 'info', nome: 'Resgates da Loja esperando decisão',
    quando: 'Resgate pendente na Loja de Coins; vira importante quando algum espera há mais de 48h.',
    run() {
      const r = one(`SELECT COUNT(*) n, MIN(created_at) antigo FROM coin_redemptions WHERE status='pendente'`);
      if (!r.n) return [];
      const idade = Date.now() - ms(r.antigo);
      return [{ nivel: idade > 48 * HOUR ? 'importante' : 'info', titulo: `${plural(r.n, 'resgate')} da Loja esperando sua decisão`,
        detalhe: `O mais antigo espera há ${fmtIdade(idade)}. Os coins já saíram do saldo de quem pediu.`, href: '/admin/coins' }];
    },
  },
  {
    id: 'voices.inscricoes', areas: ['admin'], nivel: 'info', nome: 'Inscrições de Voice pra triar',
    quando: 'Inscrição nova em /seja-voice; vira importante quando a mais antiga passa de 3 dias.',
    run() {
      const r = one(`SELECT COUNT(*) n, MIN(created_at) antigo FROM recruitment_applications WHERE COALESCE(NULLIF(status,''),'novo')='novo'`);
      if (!r.n) return [];
      const idade = Date.now() - ms(r.antigo);
      return [{ nivel: idade > 3 * DAY ? 'importante' : 'info', titulo: `${plural(r.n, 'inscrição', 'inscrições')} de Voice pra triar`,
        detalhe: `A mais antiga chegou há ${fmtIdade(idade)}.`, href: '/admin/inscricoes' }];
    },
  },
  {
    id: 'pautas.paradas', areas: ['brand', 'conteudo'], nivel: 'importante', nome: 'Pautas de Voice paradas',
    quando: 'Pauta não publicada sem nenhuma movimentação há mais de 7 dias.',
    run() {
      const rows = all(`SELECT titulo, voice_nome, estado, updated_at FROM voice_pautas WHERE estado <> 'publicada'`)
        .map(p => ({ ...p, idade: Date.now() - (ms(p.updated_at) || Date.now()) }))
        .filter(p => p.idade > 7 * DAY).sort((a, b) => b.idade - a.idade);
      if (!rows.length) return [];
      let lbl = {}; try { lbl = require('./voices-pipeline').ESTADO_LABEL || {}; } catch (_) {}
      const p = rows[0];
      return [{ titulo: `${plural(rows.length, 'pauta')} de Voice ${rows.length === 1 ? 'parada' : 'paradas'} há mais de 7 dias`,
        detalhe: `Mais antiga: "${p.titulo}" (${p.voice_nome || 'sem Voice'} · ${lbl[p.estado] || p.estado}) — ${fmtIdade(p.idade)} sem movimento.`, href: '/voices/pautas' }];
    },
  },
  {
    id: 'pautas.prazo', areas: ['brand', 'conteudo'], nivel: 'importante', nome: 'Pauta com prazo vencido',
    quando: 'O prazo de publicação da pauta já passou e ela não foi publicada.',
    run() {
      const rows = all(`SELECT titulo, voice_nome, prazo FROM voice_pautas WHERE estado <> 'publicada' AND prazo <> '' AND prazo < ? ORDER BY prazo ASC`, hojeBRT());
      if (!rows.length) return [];
      return [{ titulo: `${plural(rows.length, 'pauta')} com prazo vencido`,
        detalhe: rows.slice(0, 3).map(r => `"${r.titulo}" (${r.voice_nome || '—'}, prazo ${r.prazo.split('-').reverse().slice(0, 2).join('/')})`).join(' · ') + (rows.length > 3 ? ` · +${rows.length - 3}` : ''), href: '/voices/pautas' }];
    },
  },
  {
    id: 'voices.sem-post', areas: ['brand'], nivel: 'importante', nome: 'Voice parou de postar',
    quando: 'Voice ativo (programa + aprovados por inscrição) que já postava e está há mais de 14 dias sem post novo (data do post, não da atualização de métricas) nem pauta publicada.',
    run() {
      const out = [];
      for (const v of voicesAtivos()) {
        const a = ultimoPost(v.id);
        const b = ms(one(`SELECT MAX(publicado_em) t FROM voice_pautas WHERE voice_id=? AND estado='publicada'`, v.id).t);
        const ult = Math.max(a || 0, b || 0);
        if (!ult || Date.now() - ult <= 14 * DAY) continue;   // nunca registrou = não dá pra dizer que parou
        out.push({ sub: v.id, chave: 'parado', titulo: `${v.nome}: ${fmtIdade(Date.now() - ult)} sem post`, detalhe: 'Último post registrado no Office. Vale puxar uma pauta nova ou checar se o post só não foi registrado.', href: '/area/brand' });
      }
      return out;
    },
  },
  {
    id: 'conteudo.agendado-vencido', areas: ['conteudo', 'brand'], nivel: 'importante', nome: 'Conteúdo agendado com data passada',
    quando: 'Item do pipeline de conteúdo em "agendado" com a data de publicação vencida há mais de 1 dia.',
    run() {
      const rows = all(`SELECT titulo, agendado_para FROM content_pipeline WHERE estado='agendado' AND COALESCE(agendado_para,'') <> ''`)
        .filter(r => { const t = ms(r.agendado_para); return t && Date.now() - t > DAY; });
      if (!rows.length) return [];
      return [{ titulo: `${plural(rows.length, 'conteúdo')} ${rows.length === 1 ? 'agendado' : 'agendados'} com a data já passada`,
        detalhe: rows.slice(0, 3).map(r => `"${r.titulo}"`).join(' · ') + ' — publicar ou reagendar.', href: '/content-pipeline' }];
    },
  },

  // ── Eventos (Brasil — os de LATAM são tocados pelos times de lá) ──────────
  {
    id: 'eventos.sem-briefing', areas: ['eventos'], nivel: 'importante', nome: 'Evento chegando sem briefing',
    quando: 'Evento do Brasil nos próximos 14 dias sem briefing preenchido na área Eventos.',
    run() {
      const hoje = hojeBRT();
      return (eventos().lista || [])
        .filter(e => e.regiao === 'brasil' && e.data_evento && e.data_evento >= hoje && diasAte(e.data_evento) <= 14 && !e.tem_briefing && e.status !== 'concluido')
        .map(e => {
          const n = diasAte(e.data_evento);
          return { sub: e.event_id, chave: 'sem-briefing', titulo: `${e.nome} ${n === 0 ? 'é hoje' : `em ${plural(n, 'dia')}`} — sem briefing`,
            detalhe: [e.data_evento.split('-').reverse().join('/'), e.local, e.responsavel].filter(Boolean).join(' · ') + '. Briefing, checklist e brindes ficam na área Eventos.', href: '/area/eventos' };
        });
    },
  },
  {
    id: 'eventos.pos-evento', areas: ['eventos'], nivel: 'importante', nome: 'Evento sem pós-evento',
    quando: 'Evento do Brasil que aconteceu há 3 a 30 dias e ainda não tem leads/ROI registrados.',
    run() {
      const rows = (eventos().lista || []).filter(e => {
        if (e.regiao !== 'brasil' || !e.data_evento || e.status === 'concluido') return false;
        const d = -diasAte(e.data_evento);
        const c = e.captura || {};
        return d >= 3 && d <= 30 && !(c.leads || c.deals || c.qualificados);
      });
      if (!rows.length) return [];
      return [{ titulo: `${plural(rows.length, 'evento')} sem pós-evento registrado`,
        detalhe: rows.slice(0, 4).map(e => `${e.nome} (${e.data_evento.split('-').reverse().slice(0, 2).join('/')})`).join(' · ') + ' — registrar leads, deals e custo pra fechar o ROI.', href: '/area/eventos' }];
    },
  },

  // ── Outbound (Apollo) ─────────────────────────────────────────────────────
  {
    id: 'apollo.tarefas', areas: ['pipeline'], nivel: 'importante', nome: 'Tarefas atrasadas no Apollo',
    quando: 'Sequências ativas com tarefas manuais vencidas (ligação, LinkedIn).',
    run() {
      const seqs = require('./area-pipeline').apolloSequencias().filter(s => s.ativa && !s.arquivada && s.tarefas_atrasadas > 0)
        .sort((a, b) => b.tarefas_atrasadas - a.tarefas_atrasadas);
      const tot = seqs.reduce((a, s) => a + s.tarefas_atrasadas, 0);
      if (!tot) return [];
      return [{ titulo: `${plural(tot, 'tarefa')} manuais atrasadas no Apollo`,
        detalhe: seqs.slice(0, 3).map(s => `${s.nome} (${s.tarefas_atrasadas})`).join(' · '), href: '/area/pipeline' }];
    },
  },
  {
    id: 'apollo.bounce', areas: ['pipeline'], nivel: 'importante', nome: 'Bounce alto em sequência',
    quando: 'Sequência ativa com 50+ e-mails e bounce de 5% ou mais — risco pra reputação do domínio.',
    run() {
      return require('./area-pipeline').apolloSequencias().filter(s => s.ativa && !s.arquivada).map(s => {
        const env = (s.entregues || 0) + (s.bounces || 0);
        const taxa = env ? s.bounces / env : 0;
        if (env < 50 || taxa < 0.05) return null;
        return { sub: s.id, titulo: `Bounce de ${(taxa * 100).toFixed(1).replace('.', ',')}% em "${s.nome}"`,
          detalhe: `${s.bounces} de ${env} e-mails voltaram. Limpar a lista antes de seguir: bounce alto derruba a entrega de todas as sequências.`, href: '/area/pipeline' };
      }).filter(Boolean);
    },
  },
  {
    id: 'apollo.fracas', areas: ['pipeline'], nivel: 'info', nome: 'Sequência com desempenho fraco',
    quando: 'O próprio Apollo marcou a sequência ativa como de desempenho fraco.',
    run() {
      const seqs = require('./area-pipeline').apolloSequencias().filter(s => s.ativa && !s.arquivada && s.fraca);
      if (!seqs.length) return [];
      return [{ titulo: `${plural(seqs.length, 'sequência')} ${seqs.length === 1 ? 'marcada' : 'marcadas'} como fraca pelo Apollo`,
        detalhe: seqs.slice(0, 4).map(s => s.nome).join(' · '), href: '/area/pipeline' }];
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════
// VARREDURA — roda as regras e grava o estado
// ════════════════════════════════════════════════════════════════════════════
let ULTIMA = { ts: 0, erros: {} };

function coletar() {
  const out = [], ok = new Set(), erros = {};
  for (const r of REGRAS) {
    try {
      for (const a of (r.run() || [])) {
        if (!a || !a.titulo) continue;
        out.push({
          id: a.sub ? `${r.id}:${a.sub}` : r.id, regra: r.id,
          nivel: NIVEIS.includes(a.nivel) ? a.nivel : r.nivel,
          areas: a.areas || r.areas, titulo: String(a.titulo).slice(0, 200),
          chave: String(a.chave != null ? a.chave : a.titulo).slice(0, 200),
          detalhe: String(a.detalhe || '').slice(0, 600), href: a.href || '',
        });
      }
      ok.add(r.id);
    } catch (e) {
      erros[r.id] = e.message;
      console.warn(`[alertas] regra ${r.id} falhou:`, e.message);
    }
  }
  return { out, ok, erros };
}

function varrer() {
  const { out, ok, erros } = coletar();
  const agora = agoraISO();
  const ids = new Set(out.map(a => a.id));
  const sel = db.prepare('SELECT * FROM alertas_estado WHERE id=?');
  const ins = db.prepare(`INSERT INTO alertas_estado (id, regra, nivel, areas, titulo, chave, detalhe, href, aberto_em, mudou_em, visto_em, resolvido_em)
    VALUES (@id,@regra,@nivel,@areas,@titulo,@chave,@detalhe,@href,@agora,@agora,@agora,NULL)
    ON CONFLICT(id) DO UPDATE SET regra=excluded.regra, nivel=excluded.nivel, areas=excluded.areas, titulo=excluded.titulo,
      chave=excluded.chave, detalhe=excluded.detalhe, href=excluded.href, aberto_em=excluded.aberto_em, mudou_em=excluded.mudou_em,
      visto_em=excluded.visto_em, resolvido_em=NULL`);
  const upd = db.prepare(`UPDATE alertas_estado SET nivel=@nivel, areas=@areas, titulo=@titulo, chave=@chave, detalhe=@detalhe, href=@href,
      visto_em=@agora, mudou_em=@mudou_em WHERE id=@id`);
  const abreOc = db.prepare(`INSERT INTO alertas_ocorrencias (alerta_id, nivel, areas, aberto_em) VALUES (?,?,?,?)`);
  const nivelOc = db.prepare(`UPDATE alertas_ocorrencias SET nivel=? WHERE alerta_id=? AND resolvido_em IS NULL
    AND (CASE nivel WHEN 'critico' THEN 0 WHEN 'importante' THEN 1 ELSE 2 END) > (CASE ? WHEN 'critico' THEN 0 WHEN 'importante' THEN 1 ELSE 2 END)`);
  const fechaOc = db.prepare(`UPDATE alertas_ocorrencias SET resolvido_em=? WHERE alerta_id=? AND resolvido_em IS NULL`);
  const resolve = (id) => { db.prepare(`UPDATE alertas_estado SET resolvido_em=? WHERE id=?`).run(agora, id); fechaOc.run(agora, id); };
  db.transaction(() => {
    for (const a of out) {
      const ex = sel.get(a.id);
      const row = { ...a, areas: JSON.stringify(a.areas), agora };
      if (!ex || ex.resolvido_em) { ins.run(row); abreOc.run(a.id, a.nivel, row.areas, agora); }   // novo ou reaberto
      else {
        const antes = ex.chave || ex.titulo;   // registro anterior à coluna chave
        upd.run({ ...row, mudou_em: (antes !== a.chave || ex.nivel !== a.nivel) ? agora : ex.mudou_em });
        nivelOc.run(a.nivel, a.id, a.nivel);   // ocorrência guarda o nível mais grave que atingiu
      }
    }
    // Resolve o que sumiu — só de regras que rodaram bem (regra quebrada não "resolve" nada).
    for (const r of all(`SELECT id, regra FROM alertas_estado WHERE resolvido_em IS NULL`)) {
      if (!ids.has(r.id) && ok.has(r.regra)) resolve(r.id);
      // Regra que não existe mais no código: fecha também.
      else if (!REGRAS.some(x => x.id === r.regra)) resolve(r.id);
    }
    db.prepare(`DELETE FROM alertas_estado WHERE resolvido_em IS NOT NULL AND resolvido_em < datetime('now','-120 days')`).run();
    db.prepare(`DELETE FROM alertas_ocorrencias WHERE resolvido_em IS NOT NULL AND resolvido_em < datetime('now','-400 days')`).run();
    db.prepare(`DELETE FROM alertas_leitura WHERE alerta_id NOT IN (SELECT id FROM alertas_estado) AND alerta_id NOT LIKE 'p:%'`).run();
    db.prepare(`DELETE FROM alertas_leitura WHERE alerta_id LIKE 'p:%' AND COALESCE(lido_em,'') < datetime('now','-60 days')`).run();
  })();
  ULTIMA = { ts: Date.now(), erros };
  return out;
}
function garantirFresco() { if (Date.now() - ULTIMA.ts > CACHE_MS) varrer(); }

function abertos() {
  return all(`SELECT * FROM alertas_estado WHERE resolvido_em IS NULL`).map(r => {
    let areas = []; try { areas = JSON.parse(r.areas || '[]'); } catch (_) {}
    return { ...r, areas, area_label: AREA_LABEL[areas[0]] || '' };
  });
}
const ordenar = (a, b) => NIVEIS.indexOf(a.nivel) - NIVEIS.indexOf(b.nivel)
  || (a.lido === b.lido ? 0 : a.lido ? 1 : -1)
  || String(b.aberto_em || '').localeCompare(String(a.aberto_em || ''));
function visivelPara(a, areas) {           // areas = null → tudo (super admin)
  if (!areas) return true;
  return (a.areas || []).some(x => x !== 'admin' && areas.includes(x));
}

// ── Contexto de quem pede ───────────────────────────────────────────────────
function contexto(req) {
  const u = req.session && req.session.user;
  if (!u || !u.email) return IS_LOCAL_DEV ? { email: 'local', superAdmin: true, areas: null, user: null } : null;
  const sa = acesso.ehSuperAdmin(u);
  return { email: String(u.email).toLowerCase(), superAdmin: sa, areas: sa ? null : acesso.areasDoUsuario(u), user: u };
}

// Alertas pessoais (calculados na hora, não vão por e-mail): resgate decidido,
// pautas que esperam a revisão do próprio Voice etc. id = hash do texto → muda
// o texto (ex.: 2 → 3 pautas), volta a "não lido".
function pessoais(c) {
  const out = [];
  if (!c.user) return out;
  const pid = (t) => 'p:' + crypto.createHash('sha1').update(c.email + '|' + t).digest('hex').slice(0, 16);
  const lbl = { aprovado: '✅ aprovado', negado: '❌ negado (coins devolvidos)', entregue: '📦 entregue' };
  all(`SELECT item_nome, status, decided_at FROM coin_redemptions WHERE email=? AND status IN ('aprovado','negado','entregue')
       AND decided_at >= datetime('now','-7 days') ORDER BY decided_at DESC LIMIT 3`, c.email)
    .forEach(r => { const t = `Seu resgate "${r.item_nome}": ${lbl[r.status] || r.status}`; out.push({ id: pid(t), nivel: 'info', titulo: t, detalhe: '', href: '/loja', aberto_em: r.decided_at, areas: [], area_label: 'Pessoal', pessoal: true }); });
  try {
    require('./voices-pipeline').alertasDoUsuario(c.email, c.user.role).forEach(a => {
      const t = String(a.msg || '').replace(/^\W+\s*/, '');
      out.push({ id: pid(t), nivel: a.tipo === 'action' ? 'importante' : 'info', titulo: t, detalhe: '', href: a.href || '', aberto_em: null, areas: [], area_label: 'Pautas dos Voices', pessoal: true });
    });
  } catch (_) { /* pipeline ausente em ambiente isolado */ }
  return out;
}

function listarPara(c, { incluirSilenciados = false } = {}) {
  garantirFresco();
  const leitura = {};
  all(`SELECT alerta_id, lido_em, silenciado_ate FROM alertas_leitura WHERE email=?`, c.email).forEach(r => { leitura[r.alerta_id] = r; });
  const agora = Date.now();
  const lista = [...abertos().filter(a => visivelPara(a, c.areas)), ...pessoais(c)].map(a => {
    const l = leitura[a.id] || {};
    const silenciado = !!(l.silenciado_ate && ms(l.silenciado_ate) > agora);
    const lido = !!(l.lido_em && (!a.mudou_em || ms(l.lido_em) >= ms(a.mudou_em)));
    return {
      id: a.id, nivel: a.nivel, titulo: a.titulo, detalhe: a.detalhe || '', href: a.href || '',
      areas: a.areas, area_label: a.area_label, desde: a.aberto_em || null, pessoal: !!a.pessoal,
      lido, silenciado, silenciado_ate: silenciado ? l.silenciado_ate : null,
      // compat com consumidores antigos do /api/alerts
      tipo: a.nivel === 'info' ? 'info' : (a.nivel === 'critico' ? 'action' : 'warn'), msg: a.titulo,
    };
  }).filter(a => incluirSilenciados || !a.silenciado).sort(ordenar);
  return lista;
}

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO (app_blobs 'alertas.config') — editada em /admin/alertas
// ════════════════════════════════════════════════════════════════════════════
const PADRAO_PARA = String(process.env.ALERTAS_EMAILS || mailer.NOTIFY_EMAIL)
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
function config() {
  const c = lerBlob('alertas.config') || {};
  const canal = (k) => ({ ativo: c[k] ? c[k].ativo !== false : true, para: (c[k] && Array.isArray(c[k].para)) ? c[k].para : PADRAO_PARA });
  return {
    critico: canal('critico'), semanal: canal('semanal'), mensal: canal('mensal'),
    donas: { criticos: !!(c.donas && c.donas.criticos), semanal: !!(c.donas && c.donas.semanal) },
    horario: { inicio: 8, fim: 19 },
  };
}
function salvarConfig(body) {
  const atual = config(), erros = [];
  const canal = (k) => {
    const b = body[k] || {};
    const para = Array.isArray(b.para) ? [...new Set(b.para.map(s => String(s).toLowerCase().trim()).filter(Boolean))] : atual[k].para;
    const fora = para.filter(e => !mailer.enderecoPermitido(e));
    if (fora.length) erros.push(`${k}: endereço não permitido (${fora.join(', ')})`);
    if (para.length > 15) erros.push(`${k}: no máximo 15 destinatários`);
    return { ativo: b.ativo !== undefined ? !!b.ativo : atual[k].ativo, para };
  };
  const novo = { critico: canal('critico'), semanal: canal('semanal'), mensal: canal('mensal'),
    donas: { criticos: !!(body.donas && body.donas.criticos), semanal: !!(body.donas && body.donas.semanal) } };
  if (erros.length) return { ok: false, erros };
  gravarBlob('alertas.config', novo);
  return { ok: true, config: config() };
}
function donasDe(areas) {
  const out = [];
  for (const a of areas || []) {
    const role = AREA_ROLE[a];
    if (!role) continue;
    all(`SELECT email, name FROM users WHERE active=1 AND role=?`, role)
      .filter(u => mailer.enderecoPermitido(u.email)).forEach(u => out.push({ email: u.email.toLowerCase(), nome: u.name, area: a }));
  }
  return out;
}
function todasDonas() { return donasDe(Object.keys(AREA_ROLE)); }

// ── Saúde das fontes (pro relatório e pro admin) ────────────────────────────
function fontes(areas) {
  const lista = [];
  const quando = (t) => (t ? `atualizado há ${fmtIdade(Date.now() - ms(t))}` : 'sem atualização registrada');
  try {
    const st = require('./area-pipeline').apolloStatusAtual();
    lista.push({ nome: 'Apollo (outbound)', areas: ['pipeline'], status: st.status === 'ok' ? 'ok' : st.status === 'sem-chave' ? 'desligado' : st.status === 'aguardando' ? 'atencao' : 'parado',
      detalhe: st.status === 'sem-chave' ? 'sem APOLLO_API_KEY' : quando(st.ultima_sync_ts) });
  } catch (_) {}
  try {
    const st = require('./editorial').autoStatus();
    lista.push({ nome: 'Calendário editorial (OneDrive)', areas: ['brand', 'conteudo', 'intelligence'], status: !st.ativo ? 'desligado' : st.status === 'ok' ? 'ok' : st.status === 'aguardando' ? 'atencao' : 'parado',
      detalhe: !st.ativo ? 'leitura automática desligada' : quando(st.ultima_ok_ts) });
  } catch (_) {}
  const cs = one(`SELECT COUNT(*) n, MAX(synced_at) s FROM cs_clientes`);
  lista.push({ nome: 'Cases (planilha CS)', areas: ['brand'], status: !cs.n ? 'desligado' : (Date.now() - ms(cs.s) > 36 * HOUR ? 'parado' : 'ok'), detalhe: cs.n ? quando(cs.s) : 'sem dados' });
  for (const [k, nome, env] of [['ga4', 'GA4 (site)', 'GA4_PROPERTY_ID'], ['rd', 'RD Station (e-mail mkt)', 'RD_REFRESH_TOKEN']]) {
    if (!process.env[env]) { lista.push({ nome, areas: ['intelligence'], status: 'desligado', detalhe: 'sem credencial neste servidor' }); continue; }
    const s = saudeDiaria(k);
    lista.push({ nome, areas: ['intelligence'], status: s.status === 'ok' ? 'ok' : s.status === 'aguardando' ? 'atencao' : 'parado', detalhe: s.erro ? `erro: ${s.erro}` : quando(s.ultima_ok_ts) });
  }
  const em = mailer.saude();
  lista.push({ nome: 'E-mail (Resend)', areas: ['admin'], status: !em.configurado ? 'desligado' : (em.ultima_falha && (!em.ultimo_ok || ms(em.ultima_falha.ts) > ms(em.ultimo_ok))) ? 'parado' : 'ok',
    detalhe: !em.configurado ? 'sem RESEND_API_KEY' : em.ultimo_ok ? `último envio ok há ${fmtIdade(Date.now() - ms(em.ultimo_ok))}` : 'nenhum envio registrado ainda' });
  return areas ? lista.filter(f => f.areas.some(a => areas.includes(a))) : lista;
}

// ════════════════════════════════════════════════════════════════════════════
// E-MAILS
// ════════════════════════════════════════════════════════════════════════════
function envioAutomaticoLiberado() {
  if (process.env.ALERTAS_EMAIL_ENABLED === 'false') return false;
  // O Office local (PC do Rudá) tem outro banco: mandar de lá duplicaria tudo.
  if (IS_LOCAL_DEV && process.env.ALERTAS_EMAIL_LOCAL !== 'true') return false;
  return true;
}
const brtAgora = () => new Date(Date.now() + BRT_MS);   // ler com getUTC*
function emHorarioComercial(cfg) {
  const b = brtAgora(), h = b.getUTCHours();
  return ehDiaUtil(b) && h >= cfg.horario.inicio && h < cfg.horario.fim;
}
function semanaISO(d) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y = dt.getUTCFullYear();
  return y + '-W' + String(Math.ceil((((dt - Date.UTC(y, 0, 1)) / DAY) + 1) / 7)).padStart(2, '0');
}

// Alertas abertos vistos por um conjunto de áreas (null = tudo), sem pessoais.
function abertosDe(areas) { return abertos().filter(a => visivelPara(a, areas)).sort(ordenar); }

async function despacharCriticos({ forcar = false } = {}) {
  const cfg = config();
  if (!forcar && (!cfg.critico.ativo || !emHorarioComercial(cfg))) return { enviados: 0, motivo: !cfg.critico.ativo ? 'canal desligado' : 'fora do horário' };
  const agora = Date.now();
  const cand = abertos().filter(a => a.nivel === 'critico' && (forcar || (
    agora - ms(a.aberto_em) >= MIN_IDADE_EMAIL_MS &&
    (!a.email_em || (ms(a.email_em) < ms(a.aberto_em) && agora - ms(a.email_em) >= REENVIO_MIN_MS)))));
  if (!cand.length) return { enviados: 0, motivo: 'nenhum crítico novo' };
  // Quem recebe o quê: lista configurada recebe tudo; donas (se ligado) só a área delas.
  const porPessoa = {};
  const add = (em, a) => { (porPessoa[em] = porPessoa[em] || new Map()).set(a.id, a); };
  for (const a of cand) {
    cfg.critico.para.forEach(em => add(em, a));
    if (cfg.donas.criticos) donasDe(a.areas).forEach(d => add(d.email, a));
  }
  // Ninguém pra receber: não marca nada, pra sair quando alguém for configurado.
  if (!Object.keys(porPessoa).length) return { enviados: 0, motivo: 'sem destinatário configurado' };
  const res = [];
  for (const [em, mapa] of Object.entries(porPessoa)) {
    const lista = [...mapa.values()];
    res.push({ para: em, ...(await mailer.enviar({ tipo: 'alerta-critico', para: em, assunto: rel.assuntoCriticos(lista), html: rel.htmlCriticos(lista) })) });
  }
  // Marca mesmo se a entrega falhou: a falha vira o alerta "email.entrega" e
  // não fica re-tentando (e enchendo o log) a cada 30 min.
  const marca = db.prepare(`UPDATE alertas_estado SET email_em=? WHERE id=?`);
  cand.forEach(a => marca.run(agoraISO(), a.id));
  return { enviados: res.filter(r => r.ok).length, tentativas: res };
}

// Conta por ocorrência (um alerta que abriu e fechou 2x conta 2), não pelo
// estado atual — que só guarda a ocorrência mais recente.
function ocorrencias(areas) {
  return all(`SELECT nivel, areas, aberto_em, resolvido_em FROM alertas_ocorrencias`).map(r => {
    let ar = []; try { ar = JSON.parse(r.areas || '[]'); } catch (_) {}
    return { ...r, areas: ar, ab: ms(r.aberto_em), re: ms(r.resolvido_em) };
  }).filter(r => visivelPara(r, areas));
}
function resolvidosEntre(ini, fim, areas) {
  return ocorrencias(areas).filter(r => r.nivel !== 'info' && r.re && r.re >= ini && r.re < fim).length;
}

function montarSemanal(areas, rotulo) {
  garantirFresco();
  return rel.htmlSemanal({
    areas, rotulo, agora: Date.now(), eventosFn: FONTES.eventos ? eventos : null,
    alertas: abertosDe(areas), resolvidos: resolvidosEntre(Date.now() - 7 * DAY, Date.now(), areas),
    fontes: fontes(areas),
  });
}
function mesFechadoDe(b) { return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() - 1, 1)).toISOString().slice(0, 7); }
function mesFechado() { return mesFechadoDe(brtAgora()); }
function montarMensal(mes) {
  garantirFresco();
  const L = rel.limitesMes(mes);
  const porNivel = {};
  let ab = 0, res = 0;
  ocorrencias(null).forEach(r => {
    if (r.ab >= L.ini && r.ab < L.fim) { ab++; porNivel[r.nivel] = (porNivel[r.nivel] || 0) + 1; }
    if (r.re && r.re >= L.ini && r.re < L.fim) res++;
  });
  return rel.htmlMensal({
    mes, snapshotFn: FONTES.relatorio, eventosFn: FONTES.eventos ? eventos : null,
    fontes: fontes(null), alertasAbertos: abertosDe(null),
    alertasMes: { abertos: ab, resolvidos: res, porNivel },
  });
}

async function enviarSemanal({ para } = {}) {
  const cfg = config();
  const res = [];
  const destinos = para ? [].concat(para) : cfg.semanal.para;
  if (destinos.length) {
    const { assunto, html } = montarSemanal(null);
    for (const em of destinos) res.push({ para: em, ...(await mailer.enviar({ tipo: 'relatorio-semanal', para: em, assunto, html })) });
  }
  // Donas: versão só da área delas (quem já recebe a completa não recebe de novo).
  if (!para && cfg.donas.semanal) {
    const porDona = {};
    todasDonas().forEach(d => { if (!destinos.includes(d.email)) (porDona[d.email] = porDona[d.email] || []).push(d.area); });
    for (const [em, ars] of Object.entries(porDona)) {
      const { assunto, html } = montarSemanal(ars, ars.map(a => AREA_LABEL[a]).join(' + '));
      res.push({ para: em, ...(await mailer.enviar({ tipo: 'relatorio-semanal', para: em, assunto, html })) });
    }
  }
  return res;
}
async function enviarMensal(mes, { para } = {}) {
  const destinos = para ? [].concat(para) : config().mensal.para;
  const { assunto, html } = montarMensal(mes);
  const res = [];
  for (const em of destinos) res.push({ para: em, ...(await mailer.enviar({ tipo: 'relatorio-mensal', para: em, assunto, html })) });
  return res;
}

// ── Agenda: as MESMAS condições decidem o envio e o que o painel anuncia ─────
// Semanal: seg–qua (dia útil) a partir das 8h, 1x por semana ISO. Segunda
// feriado → sai na terça. Mensal: 1º dia útil do mês (até o dia 7) a partir das 9h.
const HORA_SEMANAL = 8, HORA_MENSAL = 9;
// 'digest.lastSent' = guarda do resumo antigo (v0.76): não manda 2x na semana da troca.
function ultimoSemanal() {
  return lerBlob('alertas.semanal.ultimo') || one(`SELECT value FROM app_blobs WHERE key='digest.lastSent'`).value || null;
}
const condSemanal = (d) => { const w = d.getUTCDay(); return w >= 1 && w <= 3 && ehDiaUtil(d) && semanaISO(d) !== ultimoSemanal(); };
const condMensal = (d) => d.getUTCDate() <= 7 && ehDiaUtil(d) && mesFechadoDe(d) !== lerBlob('alertas.mensal.ultimo');

async function talvezSemanal() {
  if (!config().semanal.ativo) return;
  const b = brtAgora();
  if (b.getUTCHours() < HORA_SEMANAL || !condSemanal(b)) return;
  const wk = semanaISO(b);
  gravarBlob('alertas.semanal.ultimo', wk);
  const r = await enviarSemanal();
  console.log(`[alertas] relatório semanal ${wk}: ${r.filter(x => x.ok).length}/${r.length} enviado(s)`);
}
async function talvezMensal() {
  if (!config().mensal.ativo) return;
  const b = brtAgora();
  if (b.getUTCHours() < HORA_MENSAL || !condMensal(b)) return;
  const mes = mesFechadoDe(b);
  gravarBlob('alertas.mensal.ultimo', mes);
  const r = await enviarMensal(mes);
  console.log(`[alertas] relatório mensal ${mes}: ${r.filter(x => x.ok).length}/${r.length} enviado(s)`);
}

// Próximo envio de cada (pro painel), andando dia a dia com as condições acima.
function proximoEnvio(cond, hora) {
  const b = brtAgora();
  for (let i = 0; i < 70; i++) {
    const d = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() + i, hora));
    if (!cond(d)) continue;
    if (i === 0) return b.getUTCHours() >= hora ? 'na próxima varredura (até 30 min)' : `hoje às ${hora}h`;
    return `${d.toISOString().slice(0, 10).split('-').reverse().join('/')} às ${hora}h`;
  }
  return '—';
}
function proximos() {
  const cfg = config();
  let semanal = cfg.semanal.ativo ? proximoEnvio(condSemanal, HORA_SEMANAL) : 'desligado';
  let mensal = cfg.mensal.ativo ? proximoEnvio(condMensal, HORA_MENSAL) : 'desligado';
  if (!envioAutomaticoLiberado()) { semanal = 'não sai deste ambiente'; mensal = semanal; }
  return { semanal, mensal, ultimo_semanal: ultimoSemanal(), ultimo_mensal: lerBlob('alertas.mensal.ultimo') };
}

let rodando = false;
async function tick() {
  if (rodando) return;
  rodando = true;
  try {
    varrer();
    if (!envioAutomaticoLiberado()) return;
    await despacharCriticos();
    await talvezSemanal();
    await talvezMensal();
  } catch (e) { console.warn('[alertas] tick:', e.message); }
  finally { rodando = false; }
}
if (process.env.ALERTAS_AGENDADOR !== 'false') {
  setTimeout(tick, 2 * 60 * 1000).unref();          // ~2 min após o boot (integrações já tentaram)
  setInterval(tick, VARREDURA_MS).unref();
  console.log(`[alertas] varredura a cada 30 min · e-mail automático ${envioAutomaticoLiberado() ? 'ligado' : 'desligado neste ambiente'}`);
}

// ════════════════════════════════════════════════════════════════════════════
// ROTAS
// ════════════════════════════════════════════════════════════════════════════
router.get('/api/alerts', (req, res) => {
  try {
    const c = contexto(req);
    if (!c) return res.status(401).json({ alertas: [], error: 'auth_required' });
    const todos = req.query.todos === '1';
    const lista = listarPara(c, { incluirSilenciados: todos });
    res.set('Cache-Control', 'no-store');
    res.json({
      alertas: lista,
      count: lista.filter(a => !a.silenciado).length,
      nao_lidos: lista.filter(a => !a.lido && !a.silenciado && a.nivel !== 'info').length,
      gerado_em: new Date(ULTIMA.ts || Date.now()).toISOString(),
      pode_configurar: c.superAdmin,
    });
  } catch (e) {
    res.status(500).json({ alertas: [], error: e.message });
  }
});

router.post('/api/alerts/lidos', express.json({ limit: '16kb' }), (req, res) => {
  const c = contexto(req);
  if (!c) return res.status(401).json({ error: 'auth_required' });
  const b = req.body || {};
  const visiveis = new Set(listarPara(c, { incluirSilenciados: true }).map(a => a.id));
  const ids = (b.todos ? [...visiveis] : (Array.isArray(b.ids) ? b.ids : [])).filter(id => visiveis.has(id)).slice(0, 300);
  const st = db.prepare(`INSERT INTO alertas_leitura (email, alerta_id, lido_em) VALUES (?,?,?)
    ON CONFLICT(email, alerta_id) DO UPDATE SET lido_em=excluded.lido_em`);
  const agora = agoraISO();
  db.transaction(() => ids.forEach(id => st.run(c.email, id, agora)))();
  res.json({ success: true, marcados: ids.length });
});

router.post('/api/alerts/silenciar', express.json({ limit: '4kb' }), (req, res) => {
  const c = contexto(req);
  if (!c) return res.status(401).json({ error: 'auth_required' });
  const { id } = req.body || {};
  const dias = Math.max(0, Math.min(30, parseInt((req.body || {}).dias, 10) || 0));
  if (!listarPara(c, { incluirSilenciados: true }).some(a => a.id === id)) return res.status(404).json({ error: 'nao_encontrado' });
  const ate = dias ? new Date(Date.now() + dias * DAY).toISOString() : null;
  db.prepare(`INSERT INTO alertas_leitura (email, alerta_id, silenciado_ate, lido_em) VALUES (?,?,?,?)
    ON CONFLICT(email, alerta_id) DO UPDATE SET silenciado_ate=excluded.silenciado_ate, lido_em=COALESCE(excluded.lido_em, alertas_leitura.lido_em)`)
    .run(c.email, id, ate, dias ? agoraISO() : null);
  res.json({ success: true, silenciado_ate: ate });
});

router.get('/alertas', (req, res) => res.sendFile(path.join(__dirname, '../public/alertas.html')));
router.get('/admin/alertas', (req, res) => res.sendFile(path.join(__dirname, '../public/admin-alertas.html')));

// ── Admin (só super admin — /api/admin/* no acesso.js) ──────────────────────
// Só o super admin (o editor token não basta: aqui se escolhe quem recebe e-mail
// e se lê o log de envios). No Office local o requireSuperAdmin aceita o token.
const { requireSuperAdmin: requireAdmin } = require('./users');

router.get('/api/admin/alertas', requireAdmin, (req, res) => {
  try {
    garantirFresco();
    const ab = abertos();
    res.set('Cache-Control', 'no-store');
    res.json({
      config: config(),
      email: mailer.saude(),
      envio_automatico: envioAutomaticoLiberado(),
      ambiente_local: IS_LOCAL_DEV,
      agenda: proximos(),
      varredura: { ultima: ULTIMA.ts ? new Date(ULTIMA.ts).toISOString() : null, erros: ULTIMA.erros },
      regras: REGRAS.map(r => ({ id: r.id, nome: r.nome, quando: r.quando, nivel: r.nivel, areas: r.areas.map(a => AREA_LABEL[a] || a),
        abertos: ab.filter(a => a.regra === r.id).length, erro: ULTIMA.erros[r.id] || null })),
      abertos: ab.sort(ordenar),
      fontes: fontes(null),
      donas: todasDonas().map(d => ({ ...d, area_label: AREA_LABEL[d.area] })),
      envios: mailer.ultimos(40),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/api/admin/alertas/config', requireAdmin, express.json({ limit: '8kb' }), (req, res) => {
  const r = salvarConfig(req.body || {});
  if (!r.ok) return res.status(400).json({ success: false, erros: r.erros });
  res.json({ success: true, config: r.config });
});

router.post('/api/admin/alertas/varrer', requireAdmin, (req, res) => {
  try { const out = varrer(); res.json({ success: true, abertos: out.length, erros: ULTIMA.erros }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

const AREAS_OK = Object.keys(AREA_ROLE);
router.get('/api/admin/alertas/preview/:tipo', requireAdmin, (req, res) => {
  try {
    let out;
    if (req.params.tipo === 'semanal') {
      const area = AREAS_OK.includes(req.query.area) ? req.query.area : null;
      out = montarSemanal(area ? [area] : null, area ? AREA_LABEL[area] : '');
    } else if (req.params.tipo === 'mensal') {
      const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(req.query.mes || '')) ? req.query.mes : mesFechado();
      out = montarMensal(mes);
    } else if (req.params.tipo === 'critico') {
      garantirFresco();
      const crit = abertos().filter(a => a.nivel === 'critico');
      if (!crit.length) return res.type('html').send('<p style="font-family:sans-serif;padding:24px">✅ Nenhum alerta crítico aberto agora — não há e-mail de crítico a mostrar.</p>');
      out = { html: rel.htmlCriticos(crit) };
    } else return res.status(404).send('tipo inválido');
    res.set('Cache-Control', 'no-store').type('html').send(out.html);
  } catch (e) { res.status(500).send('Erro: ' + String(e.message).replace(/[<>&]/g, '')); }
});

// Envio na hora: { para: 'eu' | 'configurados' | '<e-mail permitido>' }
router.post('/api/admin/alertas/enviar/:tipo', requireAdmin, express.json({ limit: '4kb' }), async (req, res) => {
  try {
    const b = req.body || {};
    const c = contexto(req);
    let para;
    if (!b.para || b.para === 'eu') para = c && c.user ? c.email : mailer.NOTIFY_EMAIL;
    else if (b.para !== 'configurados') para = String(b.para).toLowerCase().trim();
    if (para && !mailer.enderecoPermitido(para)) return res.status(400).json({ success: false, error: `endereço não permitido: ${para}` });
    let r;
    if (req.params.tipo === 'semanal') r = await enviarSemanal({ para });
    else if (req.params.tipo === 'mensal') {
      const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(b.mes || '')) ? b.mes : mesFechado();
      r = await enviarMensal(mes, { para });
    } else if (req.params.tipo === 'critico') {
      garantirFresco();
      const crit = abertos().filter(a => a.nivel === 'critico');
      if (!crit.length) return res.json({ success: false, error: 'Nenhum alerta crítico aberto agora.' });
      const destinos = para ? [para] : config().critico.para;
      r = [];
      for (const em of destinos) r.push({ para: em, ...(await mailer.enviar({ tipo: 'alerta-critico', para: em, assunto: rel.assuntoCriticos(crit), html: rel.htmlCriticos(crit) })) });
    } else return res.status(404).json({ success: false, error: 'tipo inválido' });
    res.json({ success: r.some(x => x.ok), resultados: r });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
module.exports.registrar = registrar;
module.exports.registrarSaude = registrarSaude;
module.exports.varrer = varrer;
module.exports.listarPara = listarPara;
module.exports.despacharCriticos = despacharCriticos;
module.exports.montarSemanal = montarSemanal;
module.exports.montarMensal = montarMensal;
module.exports.REGRAS = REGRAS;
module.exports._interno = { config, salvarConfig, talvezSemanal, talvezMensal, semanaISO, fontes, contexto, ehDiaUtil, proximos, ultimoPost, voicesAtivos };
