const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, requireAuth, requireEditorToken } = require('../server-context');

// Rota da página (nome público: "Área de Clientes"). Auth obrigatória.
router.get('/area-clientes', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/clientes-sap-4me.html'));
});

// Redirect da URL antiga → mantém links legados funcionando
router.get('/clientes-sap-4me', requireAuth, (req, res) => {
  res.redirect(301, '/area-clientes');
});

// Sincronização via POST (Requer Token do Editor)
router.post('/api/clientes-sap-4me/sync', requireEditorToken, (req, res) => {
  const items = Array.isArray(req.body?.clientes) ? req.body.clientes : [];
  if (!items.length) return res.status(400).json({ success: false, error: 'clientes[] vazio.' });
  
  const upsert = db.prepare(`
    INSERT INTO clientes_sap_4me (pkg_id, projeto_id, conta_parceiro, nome_cliente, pais, area_subsolucao, pacotes, escopo_pacote, etapa, data_kickoff, golive_planejado, golive_confirmado, relevante_nivel, gerente_projeto, synced_at)
    VALUES (@pkg_id, @projeto_id, @conta_parceiro, @nome_cliente, @pais, @area_subsolucao, @pacotes, @escopo_pacote, @etapa, @data_kickoff, @golive_planejado, @golive_confirmado, @relevante_nivel, @gerente_projeto, datetime('now'))
    ON CONFLICT(pkg_id) DO UPDATE SET
      projeto_id=excluded.projeto_id, conta_parceiro=excluded.conta_parceiro, nome_cliente=excluded.nome_cliente, pais=excluded.pais,
      area_subsolucao=excluded.area_subsolucao, pacotes=excluded.pacotes, escopo_pacote=excluded.escopo_pacote,
      etapa=excluded.etapa, data_kickoff=excluded.data_kickoff, golive_planejado=excluded.golive_planejado,
      golive_confirmado=excluded.golive_confirmado, relevante_nivel=excluded.relevante_nivel,
      gerente_projeto=excluded.gerente_projeto, synced_at=datetime('now')
  `);
  
  let n = 0;
  db.transaction((arr) => {
    for (const it of arr) {
      try {
        upsert.run({
          pkg_id:            String(it.pkg_id || it.projeto_id || '').slice(0,120),
          projeto_id:        String(it.projeto_id || '').slice(0,100),
          conta_parceiro:    String(it.conta_parceiro || '').slice(0,200),
          nome_cliente:      String(it.nome_cliente || '').slice(0,300),
          pais:              String(it.pais || '').slice(0,100),
          area_subsolucao:   String(it.area_subsolucao || '').slice(0,300),
          pacotes:           String(it.pacotes || '').slice(0,100),
          escopo_pacote:     String(it.escopo_pacote || '').slice(0,300),
          etapa:             String(it.etapa || '').slice(0,60),
          data_kickoff:      it.data_kickoff ? String(it.data_kickoff).slice(0,10) : null,
          golive_planejado:  it.golive_planejado ? String(it.golive_planejado).slice(0,10) : null,
          golive_confirmado: it.golive_confirmado ? String(it.golive_confirmado).slice(0,10) : null,
          relevante_nivel:   String(it.relevante_nivel || '').slice(0,20),
          gerente_projeto:   String(it.gerente_projeto || '').slice(0,200),
        });
        n++;
      } catch (e) { console.warn('[sap4me-sync] upsert falhou:', e.message); }
    }
  })(items);
  res.json({ success: true, upserted: n, total_received: items.length });
});

// GET dos dados agregados e KPIs (Requer Autenticação)
router.get('/api/clientes-sap-4me', requireAuth, (req, res) => {
  try {
    const all = db.prepare('SELECT * FROM clientes_sap_4me').all();
    const total = all.length;
    if (!total) return res.json({ total: 0, kpis: {}, by_pais: [], by_etapa: [], by_area: [], proximos_golive: [], kickoffs_recentes: [], list: [], last_sync: null });

    const count = (pred) => all.filter(pred).length;
    const live = count(c => c.etapa === 'Live');
    const impl = count(c => c.etapa === 'Implementing');
    const notStarted = count(c => c.etapa === 'Not Started');
    const onHold = count(c => c.etapa === 'On hold');

    const hoje = new Date().toISOString().slice(0,10);
    const em90 = new Date(Date.now() + 90*86400000).toISOString().slice(0,10);
    const proximos = all
      .map(c => ({ ...c, golive: c.golive_confirmado || c.golive_planejado }))
      .filter(c => c.golive && c.golive >= hoje && c.golive <= em90 && c.etapa !== 'Live')
      .sort((a,b) => a.golive.localeCompare(b.golive))
      .slice(0, 20)
      .map(c => ({ nome_cliente: c.nome_cliente, pais: c.pais, area: c.area_subsolucao, golive: c.golive, etapa: c.etapa }));

    const desde90 = new Date(Date.now() - 90*86400000).toISOString().slice(0,10);
    const kickoffs = all
      .filter(c => c.data_kickoff && c.data_kickoff >= desde90 && c.data_kickoff <= hoje)
      .sort((a,b) => b.data_kickoff.localeCompare(a.data_kickoff))
      .slice(0, 20)
      .map(c => ({ nome_cliente: c.nome_cliente, pais: c.pais, area: c.area_subsolucao, kickoff: c.data_kickoff }));

    const agrupa = (campo) => {
      const m = {};
      for (const c of all) { const k = c[campo] || '(vazio)'; m[k] = (m[k]||0)+1; }
      return Object.entries(m).map(([k,v]) => ({ label: k, count: v })).sort((a,b) => b.count - a.count);
    };

    const last = db.prepare('SELECT MAX(synced_at) AS s FROM clientes_sap_4me').get();

    res.json({
      total,
      kpis: { live, implementing: impl, not_started: notStarted, on_hold: onHold,
              golive_90d: proximos.length, kickoffs_90d: kickoffs.length,
              brasil: count(c => c.pais === 'Brazil'), relevante_nivel: count(c => c.relevante_nivel === 'Yes') },
      by_pais: agrupa('pais'),
      by_etapa: agrupa('etapa'),
      by_area: agrupa('area_subsolucao').slice(0, 12),
      proximos_golive: proximos,
      kickoffs_recentes: kickoffs,
      list: all.map(c => ({ projeto_id: c.projeto_id, nome_cliente: c.nome_cliente, pais: c.pais,
              area: c.area_subsolucao, etapa: c.etapa, kickoff: c.data_kickoff,
              golive: c.golive_confirmado || c.golive_planejado, gerente: c.gerente_projeto })),
      last_sync: last?.s || null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ÁREA DE CLIENTES — base de conhecimento + chat ─────────────────────────────
// Municia os comerciais com números institucionais reais (slide + contexto interno)
// e dados vivos (SAP 4 ME por país, cases publicáveis). Regra de ouro do escritório:
// NUNCA inventar número — só responder com o que está na base/agregados, sempre com fonte.

const KB_PATH = path.join(__dirname, '../public/api/area-clientes-kb.json');
let _kbCache = null;
let _kbMtime = 0;
function loadKB() {
  try {
    const st = fs.statSync(KB_PATH);
    if (!_kbCache || st.mtimeMs !== _kbMtime) {
      _kbCache = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
      _kbMtime = st.mtimeMs;
    }
  } catch (e) {
    console.warn('[area-clientes] falha ao carregar KB:', e.message);
    _kbCache = _kbCache || { fontes: {}, itens: [] };
  }
  return _kbCache;
}

// Agregados vivos do SQLite (SAP 4 ME por país + etapa; cases publicáveis)
function liveContext() {
  const out = { sap4me: null, cases: [] };
  try {
    const all = db.prepare('SELECT pais, etapa FROM clientes_sap_4me').all();
    if (all.length) {
      const byPais = {}; const byEtapa = {};
      for (const c of all) {
        const p = c.pais || '(vazio)'; byPais[p] = (byPais[p] || 0) + 1;
        const e = c.etapa || '(vazio)'; byEtapa[e] = (byEtapa[e] || 0) + 1;
      }
      out.sap4me = {
        total: all.length,
        por_pais: Object.entries(byPais).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
        por_etapa: Object.entries(byEtapa).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      };
    }
  } catch (e) { /* tabela pode não existir ainda */ }
  try {
    out.cases = db.prepare("SELECT cliente_nome, lob, nps, case_resumo FROM cs_clientes WHERE case_publicavel = 1 AND case_resumo != '' ORDER BY cliente_nome").all();
  } catch (e) { /* idem */ }
  return out;
}

// Retrieval determinístico: pontua itens da KB por sobreposição de termos
function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function scoreItens(pergunta, itens) {
  const q = normalize(pergunta);
  const termos = q.split(/[^a-z0-9]+/).filter(t => t.length >= 3);
  return itens.map(it => {
    const hay = normalize([it.resposta, (it.tags || []).join(' '), it.categoria, it.valor].join(' '));
    let score = 0;
    for (const t of termos) if (hay.includes(t)) score += 1;
    for (const tag of (it.tags || [])) if (q.includes(normalize(tag))) score += 2;
    return { it, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
}

function fonteLabel(kb, key) {
  return (kb.fontes && kb.fontes[key]) || key || 'fonte não informada';
}

// GET base de conhecimento (para a UI listar temas/atalhos)
router.get('/api/area-clientes/kb', requireAuth, (req, res) => {
  const kb = loadKB();
  const live = liveContext();
  res.json({
    meta: kb._meta || {},
    fontes: kb.fontes || {},
    itens: (kb.itens || []).map(it => ({
      id: it.id, categoria: it.categoria, resposta: it.resposta, valor: it.valor,
      fonte: fonteLabel(kb, it.fonte), etiqueta: it.etiqueta, tela: it.tela
    })),
    live: {
      sap4me_total: live.sap4me ? live.sap4me.total : null,
      cases_publicaveis: live.cases.length,
    },
  });
});

// POST chat — resposta compilada com fontes. LLM grátis (Qwen via OpenRouter) quando
// disponível; senão, fallback determinístico (retrieval) que direciona pra tela/fonte certa.
router.post('/api/area-clientes/chat', requireAuth, async (req, res) => {
  const pergunta = String(req.body?.pergunta || '').trim().slice(0, 500);
  if (!pergunta) return res.status(400).json({ error: 'pergunta vazia' });

  const kb = loadKB();
  const live = liveContext();
  const ranked = scoreItens(pergunta, kb.itens || []);
  // Objetividade (modo determinístico): responde SÓ o que foi perguntado — o item
  // de MAIOR relevância, nada mais. O retrieval por keyword não consegue separar
  // com segurança uma pergunta dupla real (ex. "NPS e renovação") de um vizinho que
  // só compartilha tokens genéricos ("brasil", "licencas"), então não arrisca um 2º
  // item aqui: perguntas compostas ficam cobertas pelo modo IA (Qwen), que lê todo
  // o contexto. PISO de relevância (>=3): abaixo é ruído (1 termo casando por acaso,
  // ex. "cor" dentro de "recorrente") → responde "não tenho".
  const bestScore = ranked.length ? ranked[0].score : 0;
  const top = bestScore >= 3 ? [ranked[0].it] : [];

  // Fontes só dos itens realmente usados. `real` = dado confirmado (🟢) vs
  // pendente de integração (⏳) → a UI mostra isso de forma discreta.
  const sources = top.map(it => ({
    label: it.resposta, valor: it.valor, fonte: fonteLabel(kb, it.fonte),
    etiqueta: it.etiqueta, tela: it.tela, real: /^\s*🟢/.test(it.etiqueta || ''),
  }));

  // Bloco de contexto vivo textual (SAP 4 ME por país + cases publicáveis)
  let liveText = '';
  if (live.sap4me) {
    const topPaises = live.sap4me.por_pais.slice(0, 15).map(p => `${p.label}: ${p.count}`).join(' · ');
    liveText += `\n[Projetos SAP 4 ME — dado vivo, tela /clientes-sap-4me] Total: ${live.sap4me.total}. Por país: ${topPaises}. Por etapa: ${live.sap4me.por_etapa.map(e => `${e.label}: ${e.count}`).join(' · ')}.`;
  }
  if (live.cases.length) {
    liveText += `\n[Cases publicáveis — dado vivo, tela /cases] ${live.cases.slice(0, 10).map(c => `${c.cliente_nome} (${c.lob || 's/ LOB'}${c.nps ? ', NPS ' + c.nps : ''}): ${c.case_resumo}`).join(' | ')}`;
  }

  // Pergunta é especificamente sobre projetos por país? (para anexar o dado vivo)
  const perguntaPais = /pais|país|latam|regiao|região|onde atua|por pais|projetos sap/.test(normalize(pergunta));

  // Resposta determinística: curta e direta. 1 item = frase única; vários = bullets enxutos.
  const fallbackAnswer = () => {
    if (!top.length && !(perguntaPais && live.sap4me)) {
      return 'Não tenho esse número na base da Área de Clientes. Ele pode estar no CRM (Zoho) ou com o time de Intelligence — posso apontar o caminho se você disser qual dado exatamente.';
    }
    // Só o dado — a procedência (real/pendente + fonte) aparece discreta na UI.
    let ans = top.length === 1 ? top[0].resposta : top.map(it => '• ' + it.resposta).join('\n');
    if (perguntaPais && live.sap4me) {
      const topPaises = live.sap4me.por_pais.slice(0, 8).map(p => `${p.label}: ${p.count}`).join(' · ');
      const bloco = `🌐 Projetos SAP 4 ME por país (dado vivo — /clientes-sap-4me): ${topPaises}.`;
      ans = ans ? ans + '\n\n' + bloco : bloco;
    }
    return ans;
  };

  const orKey = process.env.OPENROUTER_API_KEY;
  // Qwen grátis por padrão; override por AREA_CLIENTES_MODEL ou OPENROUTER_MODEL.
  const model = process.env.AREA_CLIENTES_MODEL || 'qwen/qwen-2.5-72b-instruct:free';

  if (!orKey) {
    // Sem chave de IA é o modo normal da base — nada de aviso técnico pro comercial.
    return res.json({ mode: 'retrieval', answer: fallbackAnswer(), sources, model: null });
  }

  // Contexto para o LLM: só os itens que casaram + agregados vivos. O modelo é
  // instruído a NÃO inventar — se o número não estiver aqui, deve dizer que não tem.
  const ctxItens = top.map(it => `- ${it.resposta} [valor: ${it.valor || '—'} | etiqueta: ${it.etiqueta} | fonte: ${fonteLabel(kb, it.fonte)}${it.tela ? ' | tela: ' + it.tela : ''}]`).join('\n');
  const system = `Você é o assistente da "Área de Clientes" da EPI-USE Brasil, feito para municiar os comerciais com números institucionais REAIS.
REGRAS RÍGIDAS:
1. Responda em português do Brasil, EXCLUSIVAMENTE o que foi perguntado — 1 a 2 frases. Não liste dados que não foram pedidos, não faça introdução nem resumo do portfólio. Vendedor com pressa: dê o número, nada mais.
2. Use APENAS os dados do CONTEXTO abaixo. NUNCA invente, arredonde ou estime números que não estejam ali.
3. NÃO cite a fonte nem etiquetas dentro do texto — a interface já mostra a procedência de forma discreta. Escreva só o dado, limpo.
4. Se a informação pedida não estiver no contexto, diga claramente que não está disponível nesta base e sugira onde buscar (CRM/Zoho, Intelligence). Não preencha com achismo.
5. Sempre escreva "EPI-USE Brasil", nunca só "EPI-USE".`;
  const userMsg = `PERGUNTA DO COMERCIAL: ${pergunta}\n\nCONTEXTO (itens da base que casaram):\n${ctxItens || '(nenhum item específico casou)'}\n${liveText || ''}`;

  try {
    const orResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${orKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://epiuse-mkt-office-production.up.railway.app',
        'X-Title': 'EPI-USE Office - Area de Clientes',
      },
      body: JSON.stringify({
        model, temperature: 0.2, max_tokens: 700,
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
      }),
    });
    if (!orResp.ok) {
      const detail = await orResp.text().catch(() => '');
      console.warn('[area-clientes-chat] OpenRouter', orResp.status, detail.slice(0, 200));
      // Degradou pra base silenciosamente — motivo técnico só no log, não pro comercial.
      return res.json({ mode: 'retrieval', answer: fallbackAnswer(), sources, model: null });
    }
    const data = await orResp.json();
    const answer = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
    if (!answer) return res.json({ mode: 'retrieval', answer: fallbackAnswer(), sources, model: null });
    return res.json({ mode: 'llm', answer, sources, model });
  } catch (e) {
    console.warn('[area-clientes-chat] exceção:', e.message);
    return res.json({ mode: 'retrieval', answer: fallbackAnswer(), sources, model: null });
  }
});

module.exports = router;
