const express = require('express');
const router = express.Router();
const path = require('path');
const { db, requireAuth, requireEditorToken } = require('../server-context');

// Rota da página executiva (com autenticação obrigatória)
router.get('/clientes-sap-4me', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/clientes-sap-4me.html'));
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

module.exports = router;
