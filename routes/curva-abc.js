// ── MÓDULO 14 · CURVA ABC — Classificação de contas (Fit × Propensão) ────────
// Router modular ADITIVO (não altera nada existente). Espelha routes/jarvis.js.
// Cruza dado REAL de Zoho CRM (zoho_deals) + Cases (cs_clientes) + SAP 4ME
// (clientes_sap_4me) + playbook JARVIS (LOBs/gatilhos 2026) + aprendizados de
// campo (jarvis_aprendizados) pra classificar contas em A/B/C (matriz 2D).
// Regra 7: nenhum sinal ausente é inventado — fica etiquetado "⏳ aguarda dado".

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, requireAuth } = require('../server-context');

const CURVA_ABC_HTML = path.join(__dirname, '../public/curva-abc.html');
const PLAYBOOK_PATH = path.join(__dirname, '../modulos/11-jarvis-sdr/playbook.json');

let PLAYBOOK = { lobs: [], gatilhos_urgencia_2026: [] };
try {
  PLAYBOOK = JSON.parse(fs.readFileSync(PLAYBOOK_PATH, 'utf8'));
} catch (e) {
  console.warn('[curva-abc] playbook não carregado:', e.message);
}
const LOBS_CORE = (PLAYBOOK.lobs || []).map(l => l.nome.toLowerCase());
const TEM_GATILHOS_2026 = (PLAYBOOK.gatilhos_urgencia_2026 || []).length > 0;

// ── MEMÓRIA (persistência SQLite — contas classificadas + audit trail) ───────
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS curva_abc_contas (
      conta_id                TEXT PRIMARY KEY,
      nome_empresa            TEXT NOT NULL,
      fonte                   TEXT,            -- zoho | cases | sap4me | combinação (ex: "zoho+sap4me")
      vertical                TEXT,            -- LOB predominante conhecido
      fit_score               INTEGER DEFAULT 0,
      fit_max                 INTEGER DEFAULT 4,
      fit_sinais_json         TEXT DEFAULT '[]',
      propensao_score         INTEGER DEFAULT 0,
      propensao_max           INTEGER DEFAULT 4,
      propensao_sinais_json   TEXT DEFAULT '[]',
      classificacao_calculada TEXT,             -- A | B | C
      classificacao_final     TEXT,             -- default = calculada; sobrescrita por override
      override_por            TEXT,
      override_motivo         TEXT,
      atualizado_em           TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_curva_abc_class ON curva_abc_contas(classificacao_final);
    CREATE INDEX IF NOT EXISTS idx_curva_abc_vertical ON curva_abc_contas(vertical);

    CREATE TABLE IF NOT EXISTS curva_abc_historico (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      conta_id            TEXT,
      classificacao_antes TEXT,
      classificacao_depois TEXT,
      motivo              TEXT,
      usuario             TEXT,
      criado_em           TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_curva_abc_hist_conta ON curva_abc_historico(conta_id);
  `);
  console.log('[curva-abc] tabelas prontas (curva_abc_contas + curva_abc_historico)');
} catch (e) {
  console.warn('[curva-abc] falha ao preparar tabelas:', e.message);
}

function slugConta(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function lobBateComForca(lobOuVertical) {
  const v = String(lobOuVertical || '').toLowerCase();
  if (!v) return false;
  return LOBS_CORE.some(nome => nome.includes(v) || v.includes(nome.split(' ')[0].replace(/[()]/g, '')));
}

// ── ENGINE DE CLASSIFICAÇÃO — junta contas conhecidas nas 3 fontes reais ─────
// Regra 7: cada ponto do score vem de uma linha real de tabela; sinal ausente
// não conta nem a favor nem contra (fica de fora, não é simulado).
function coletarContas() {
  const contas = new Map(); // conta_id -> { nome_empresa, fontes:Set, vertical, sinais fit/propensão brutos }

  function upsertConta(nome, fonte) {
    const id = slugConta(nome);
    if (!id) return null;
    if (!contas.has(id)) {
      contas.set(id, { conta_id: id, nome_empresa: nome.trim(), fontes: new Set(), verticais: new Set(), fitSinais: [], propensaoSinais: [] });
    }
    const c = contas.get(id);
    c.fontes.add(fonte);
    return c;
  }

  // Fonte 1: Zoho deals (conta + solution + stage → propensão de deal aberto)
  let zohoDeals = [];
  try { zohoDeals = db.prepare('SELECT conta, solution, stage, campanha, valor FROM zoho_deals WHERE conta IS NOT NULL AND conta != ""').all(); }
  catch (e) { /* tabela pode não existir ainda em ambiente novo */ }
  for (const d of zohoDeals) {
    const c = upsertConta(d.conta, 'zoho');
    if (!c) continue;
    if (d.solution) c.verticais.add(d.solution);
    const stageAberto = d.stage && !/perdid|closed.?lost|cancel/i.test(d.stage);
    if (stageAberto && !c.propensaoSinais.some(s => s.chave === 'deal_aberto_zoho')) {
      c.propensaoSinais.push({ chave: 'deal_aberto_zoho', texto: `Deal aberto no Zoho (stage: ${d.stage || 'sem stage'})` });
    }
  }

  // Fonte 2: Cases de sucesso (conta/cliente + lob → fit por vertical + case parecido)
  let cases = [];
  try { cases = db.prepare('SELECT conta, cliente_nome, lob, status, case_publicavel FROM cs_clientes').all(); }
  catch (e) { /* ok */ }
  const lobsComCase = new Set(cases.map(c => (c.lob || '').toLowerCase()).filter(Boolean));
  for (const cs of cases) {
    const nome = cs.cliente_nome || cs.conta;
    if (!nome) continue;
    const c = upsertConta(nome, 'cases');
    if (!c) continue;
    if (cs.lob) c.verticais.add(cs.lob);
    if (!c.fitSinais.some(s => s.chave === 'ja_e_cliente_case')) {
      c.fitSinais.push({ chave: 'ja_e_cliente_case', texto: `Já é cliente com case de sucesso registrado (${cs.status || 'status n/d'})` });
    }
  }

  // Fonte 3: SAP 4ME (conta_parceiro/nome_cliente + área/subsolução → conta-irmã SAP)
  let sap4me = [];
  try { sap4me = db.prepare('SELECT conta_parceiro, nome_cliente, area_subsolucao, pais, etapa FROM clientes_sap_4me').all(); }
  catch (e) { /* ok */ }
  for (const s of sap4me) {
    const nome = s.nome_cliente || s.conta_parceiro;
    if (!nome) continue;
    const c = upsertConta(nome, 'sap4me');
    if (!c) continue;
    if (s.area_subsolucao) c.verticais.add(s.area_subsolucao);
    if (!c.fitSinais.some(s2 => s2.chave === 'conta_irma_sap')) {
      c.fitSinais.push({ chave: 'conta_irma_sap', texto: `Conta-irmã já usuária SAP ativa (${s.pais || 'país n/d'}, etapa: ${s.etapa || 'n/d'})` });
    }
  }

  // Fonte 4: dores de campo reais (jarvis_aprendizados) — casadas por LOB/vertical
  let doresPorLob = new Set();
  try {
    const rows = db.prepare("SELECT DISTINCT lob FROM jarvis_aprendizados WHERE tipo = 'dor' AND lob IS NOT NULL AND lob != ''").all();
    doresPorLob = new Set(rows.map(r => r.lob.toLowerCase()));
  } catch (e) { /* tabela do jarvis pode não existir ainda */ }

  for (const c of contas.values()) {
    // Fit: vertical bate com força EPI-USE
    const verticalTexto = [...c.verticais].join(', ');
    const bateForca = [...c.verticais].some(lobBateComForca);
    if (bateForca) c.fitSinais.push({ chave: 'lob_core', texto: `Vertical (${verticalTexto}) alinhada com LOB forte EPI-USE` });

    // Fit: já existe case publicado nessa vertical (mesmo que não seja o case da própria conta)
    const caseParecido = [...c.verticais].some(v => lobsComCase.has(v.toLowerCase()));
    if (caseParecido && !c.fitSinais.some(s => s.chave === 'ja_e_cliente_case')) {
      c.fitSinais.push({ chave: 'case_parecido_vertical', texto: `Existe case de sucesso EPI-USE publicado na mesma vertical (${verticalTexto})` });
    }

    // Propensão: gatilho de urgência 2026 (aplica a toda a base quando o playbook tem gatilhos ativos e a conta tem LOB core — proxy real, sem simular por conta específica)
    if (TEM_GATILHOS_2026 && bateForca) {
      c.propensaoSinais.push({ chave: 'gatilho_2026', texto: 'Vertical exposta a gatilho de urgência 2026 do playbook (ex: fim do suporte ECC, Reforma Tributária)' });
    }

    // Propensão: dor de campo real já ouvida numa call pra essa vertical
    const dorOuvida = [...c.verticais].some(v => doresPorLob.has(v.toLowerCase()));
    if (dorOuvida) {
      c.propensaoSinais.push({ chave: 'dor_campo_real', texto: `Dor real já ouvida em call de campo pra vertical (${verticalTexto})` });
    }

    c.vertical = verticalTexto || null;
  }

  return contas;
}

function classificar(fitScore, propensaoScore) {
  const fitNivel = fitScore >= 3 ? 'alto' : fitScore === 2 ? 'medio' : 'baixo';
  const propNivel = propensaoScore >= 3 ? 'alto' : propensaoScore === 2 ? 'medio' : 'baixo';
  if (fitNivel === 'alto' && propNivel === 'alto') return 'A';
  if ((fitNivel === 'alto' && propNivel === 'medio') || (fitNivel === 'medio' && propNivel === 'alto')) return 'B';
  return 'C';
}

// ── ROTA DE PÁGINA ────────────────────────────────────────────────────────────
router.get('/curva-abc', requireAuth, (req, res) => {
  res.sendFile(CURVA_ABC_HTML);
});

// ── API: recalcula a classificação de todas as contas conhecidas (dado real) ─
router.post('/api/curva-abc/sync', requireAuth, (req, res) => {
  try {
    const contas = coletarContas();
    const upsert = db.prepare(`
      INSERT INTO curva_abc_contas (conta_id, nome_empresa, fonte, vertical, fit_score, fit_sinais_json, propensao_score, propensao_sinais_json, classificacao_calculada, classificacao_final, atualizado_em)
      VALUES (@conta_id, @nome_empresa, @fonte, @vertical, @fit_score, @fit_sinais_json, @propensao_score, @propensao_sinais_json, @classificacao_calculada, @classificacao_final, datetime('now'))
      ON CONFLICT(conta_id) DO UPDATE SET
        nome_empresa=excluded.nome_empresa, fonte=excluded.fonte, vertical=excluded.vertical,
        fit_score=excluded.fit_score, fit_sinais_json=excluded.fit_sinais_json,
        propensao_score=excluded.propensao_score, propensao_sinais_json=excluded.propensao_sinais_json,
        classificacao_calculada=excluded.classificacao_calculada,
        -- só reescreve a classificação final se não houver override manual registrado
        classificacao_final=CASE WHEN override_por IS NULL OR override_por = '' THEN excluded.classificacao_calculada ELSE classificacao_final END,
        atualizado_em=datetime('now')
    `);

    let n = 0;
    db.transaction(() => {
      for (const c of contas.values()) {
        const fitScore = Math.min(c.fitSinais.length, 4);
        const propensaoScore = Math.min(c.propensaoSinais.length, 4);
        const classificacao = classificar(fitScore, propensaoScore);
        upsert.run({
          conta_id: c.conta_id,
          nome_empresa: c.nome_empresa,
          fonte: [...c.fontes].join('+'),
          vertical: c.vertical,
          fit_score: fitScore,
          fit_sinais_json: JSON.stringify(c.fitSinais),
          propensao_score: propensaoScore,
          propensao_sinais_json: JSON.stringify(c.propensaoSinais),
          classificacao_calculada: classificacao,
          classificacao_final: classificacao
        });
        n++;
      }
    })();

    res.json({ success: true, contas_processadas: n });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── API: lista contas classificadas (com filtros) ────────────────────────────
router.get('/api/curva-abc/contas', requireAuth, (req, res) => {
  try {
    const q = req.query;
    let sql = 'SELECT * FROM curva_abc_contas WHERE 1=1';
    const params = [];
    if (q.classificacao) { sql += ' AND classificacao_final = ?'; params.push(q.classificacao.toUpperCase()); }
    if (q.vertical) { sql += ' AND vertical LIKE ?'; params.push(`%${q.vertical}%`); }
    if (q.fonte) { sql += ' AND fonte LIKE ?'; params.push(`%${q.fonte}%`); }
    sql += ' ORDER BY classificacao_final ASC, fit_score DESC, propensao_score DESC';
    const rows = db.prepare(sql).all(...params).map(r => ({
      ...r,
      fit_sinais: JSON.parse(r.fit_sinais_json || '[]'),
      propensao_sinais: JSON.parse(r.propensao_sinais_json || '[]')
    }));
    res.json({ total: rows.length, contas: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: override manual (AE/SDR ajusta classificação final com motivo) ─────
router.post('/api/curva-abc/contas/:id/override', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { classificacao, motivo, usuario } = req.body || {};
    if (!['A', 'B', 'C'].includes(String(classificacao || '').toUpperCase())) {
      return res.status(400).json({ success: false, error: 'classificacao precisa ser A, B ou C' });
    }
    if (!motivo || !String(motivo).trim()) {
      return res.status(400).json({ success: false, error: 'motivo é obrigatório pro override (audit trail)' });
    }
    const atual = db.prepare('SELECT classificacao_final FROM curva_abc_contas WHERE conta_id = ?').get(id);
    if (!atual) return res.status(404).json({ success: false, error: 'conta não encontrada' });

    const novaClass = String(classificacao).toUpperCase();
    db.prepare(`
      UPDATE curva_abc_contas
      SET classificacao_final = ?, override_por = ?, override_motivo = ?, atualizado_em = datetime('now')
      WHERE conta_id = ?
    `).run(novaClass, usuario || 'não identificado', motivo, id);

    db.prepare(`
      INSERT INTO curva_abc_historico (conta_id, classificacao_antes, classificacao_depois, motivo, usuario)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, atual.classificacao_final, novaClass, motivo, usuario || 'não identificado');

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── API: resumo/KPIs pro card da área e dashboard ────────────────────────────
router.get('/api/curva-abc/resumo', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT classificacao_final, vertical FROM curva_abc_contas').all();
    const kpis = {
      total: rows.length,
      A: rows.filter(r => r.classificacao_final === 'A').length,
      B: rows.filter(r => r.classificacao_final === 'B').length,
      C: rows.filter(r => r.classificacao_final === 'C').length,
    };
    const porVertical = {};
    for (const r of rows) {
      const v = r.vertical || 'sem vertical identificada';
      porVertical[v] = (porVertical[v] || 0) + 1;
    }
    res.json({ kpis, por_vertical: porVertical });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
