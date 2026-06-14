const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, requireAuth, requireEditorToken } = require('../server-context');

const CASES_PATH = path.join(__dirname, '../public/cases.html');

// Rota de visualização da página (Requer Autenticação)
router.get('/cases', requireAuth, (req, res) => {
  res.sendFile(CASES_PATH);
});

// API: lista clientes com filtros (Requer Autenticação)
router.get('/api/cases', requireAuth, (req, res) => {
  try {
    const q = req.query;
    let sql = 'SELECT * FROM cs_clientes WHERE 1=1';
    const params = [];
    if (q.status) { sql += ' AND status = ?'; params.push(q.status); }
    if (q.csm)    { sql += ' AND csm    = ?'; params.push(q.csm); }
    if (q.lob)    { sql += ' AND lob    = ?'; params.push(q.lob); }
    sql += ' ORDER BY cliente_nome ASC';
    const rows = db.prepare(sql).all(...params);
    
    const all = db.prepare('SELECT status, nps, case_publicavel FROM cs_clientes').all();
    const kpis = {
      total: all.length,
      live: all.filter(r => r.status === 'live').length,
      churn_risk: all.filter(r => r.status === 'churn-risk').length,
      onboarding: all.filter(r => r.status === 'onboarding').length,
      case_publicado: all.filter(r => r.status === 'case-publicado').length,
      em_edicao: all.filter(r => r.status === 'em-edicao').length,
      negociacao: all.filter(r => r.status === 'negociacao').length,
      declinado: all.filter(r => r.status === 'declinado').length,
      publicaveis: all.filter(r => r.case_publicavel === 1).length,
      nps_medio: (() => {
        const valid = all.map(r => r.nps).filter(n => n !== null && n !== undefined);
        if (!valid.length) return null;
        return Math.round(valid.reduce((s, n) => s + n, 0) / valid.length);
      })(),
      synced_at: rows[0]?.synced_at || null
    };
    res.json({ kpis, clientes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sync direto do OneDrive local (chama scripts/sync/sync_cases_roberto.py)
router.post('/api/cases/sync-from-onedrive', requireEditorToken, (req, res) => {
  const { spawn } = require('child_process');
  const scriptPath = path.join(__dirname, '../scripts', 'sync', 'sync_cases_roberto.py');
  if (!fs.existsSync(scriptPath)) {
    return res.status(503).json({ success: false, error: `Script não encontrado: ${scriptPath}. Esta rota só funciona em ambiente local com Python + OneDrive sync.` });
  }

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const py = spawn(pythonCmd, [scriptPath], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  let stdout = '', stderr = '';
  
  py.stdout.on('data', d => stdout += d.toString('utf8'));
  py.stderr.on('data', d => stderr += d.toString('utf8'));
  py.on('error', err => res.status(500).json({ success: false, error: `Falha ao invocar Python: ${err.message}` }));
  
  py.on('close', code => {
    if (code !== 0) {
      return res.status(500).json({ success: false, error: `Python exit code ${code}`, stderr: stderr.slice(0, 1000) });
    }
    let payload;
    try { payload = JSON.parse(stdout); }
    catch (e) { return res.status(500).json({ success: false, error: `JSON inválido do script: ${e.message}`, raw: stdout.slice(0, 500) }); }
    
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!items.length) return res.json({ success: true, upserted: 0, note: 'Script retornou 0 itens.' });

    const upsert = db.prepare(`
      INSERT INTO cs_clientes (sharepoint_id, conta, cliente_nome, contato_principal, contato_email, csm, lob, status, nps, valor_anual, ultimo_contato, observacoes, case_publicavel, case_resumo, synced_at)
      VALUES (@sharepoint_id, @conta, @cliente_nome, @contato_principal, @contato_email, @csm, @lob, @status, @nps, @valor_anual, @ultimo_contato, @observacoes, @case_publicavel, @case_resumo, datetime('now'))
      ON CONFLICT(sharepoint_id) DO UPDATE SET
        conta=excluded.conta, cliente_nome=excluded.cliente_nome,
        contato_principal=excluded.contato_principal, contato_email=excluded.contato_email,
        csm=excluded.csm, lob=excluded.lob, status=excluded.status, nps=excluded.nps,
        valor_anual=excluded.valor_anual, ultimo_contato=excluded.ultimo_contato,
        observacoes=excluded.observacoes, case_publicavel=excluded.case_publicavel,
        case_resumo=excluded.case_resumo,
        synced_at=datetime('now'), updated_at=datetime('now')
    `);
    
    let n = 0;
    db.transaction(() => {
      for (const it of items) {
        try { upsert.run(it); n++; }
        catch (e) { console.warn('[sync-from-onedrive] item falhou:', e.message); }
      }
    })();
    res.json({ success: true, upserted: n, total_received: items.length, fonte: 'OneDrive local (script Python)' });
  });
});

// API: upsert via cron (recebe array de clientes da planilha SharePoint)
router.post('/api/cases/sync', requireEditorToken, (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ success: false, error: 'items[] vazio.' });
  
  const upsert = db.prepare(`
    INSERT INTO cs_clientes (sharepoint_id, conta, cliente_nome, contato_principal, contato_email, csm, lob, status, nps, valor_anual, ultimo_contato, observacoes, case_publicavel, case_resumo, synced_at)
    VALUES (@sharepoint_id, @conta, @cliente_nome, @contato_principal, @contato_email, @csm, @lob, @status, @nps, @valor_anual, @ultimo_contato, @observacoes, @case_publicavel, @case_resumo, datetime('now'))
    ON CONFLICT(sharepoint_id) DO UPDATE SET
      conta=excluded.conta,
      cliente_nome=excluded.cliente_nome,
      contato_principal=excluded.contato_principal,
      contato_email=excluded.contato_email,
      csm=excluded.csm,
      lob=excluded.lob,
      status=excluded.status,
      nps=excluded.nps,
      valor_anual=excluded.valor_anual,
      ultimo_contato=excluded.ultimo_contato,
      observacoes=excluded.observacoes,
      case_publicavel=excluded.case_publicavel,
      case_resumo=excluded.case_resumo,
      synced_at=datetime('now'),
      updated_at=datetime('now')
  `);
  
  const tx = db.transaction((arr) => {
    let n = 0;
    for (const it of arr) {
      try {
        upsert.run({
          sharepoint_id: String(it.sharepoint_id || it.id || '').slice(0, 100) || `gen-${Date.now()}-${n}`,
          conta:         String(it.conta || '').slice(0, 100),
          cliente_nome:  String(it.cliente_nome || it.cliente || '').slice(0, 200),
          contato_principal: String(it.contato_principal || it.contato || '').slice(0, 100),
          contato_email: String(it.contato_email || it.email || '').slice(0, 100),
          csm:           String(it.csm || '').slice(0, 100),
          lob:           String(it.lob || '').slice(0, 50),
          status:        String(it.status || 'live').slice(0, 30),
          nps:           it.nps != null ? parseInt(it.nps, 10) : null,
          valor_anual:   it.valor_anual != null ? parseFloat(it.valor_anual) : null,
          ultimo_contato: String(it.ultimo_contato || '').slice(0, 30),
          observacoes:   String(it.observacoes || '').slice(0, 2000),
          case_publicavel: it.case_publicavel ? 1 : 0,
          case_resumo:   String(it.case_resumo || '').slice(0, 1000)
        });
        n++;
      } catch (e) { console.warn('[cases/sync] item falhou:', e.message); }
    }
    return n;
  });
  const n = tx(items);
  res.json({ success: true, upserted: n, total_received: items.length });
});

// Seed inicial (se tabela estiver vazia)
(function seedCases() {
  try {
    if (db.prepare('SELECT COUNT(*) as n FROM cs_clientes').get().n > 0) return;
    const seed = [
      { sharepoint_id: 'seed-1', conta: 'EUBR-2024-001', cliente_nome: 'Drogaria Venancio', contato_principal: '— (anonimizado)', contato_email: '', csm: 'Marlison Estrela', lob: 'HCM', status: 'live', nps: 9, valor_anual: null, ultimo_contato: '2026-04-15', observacoes: 'Migração ECC → SuccessFactors em 14 meses · 280 lojas. Case publicável.', case_publicavel: 1, case_resumo: '280 lojas migradas em 14 meses do ECC para SuccessFactors. Bridge marketing→vendas via Voices.' },
      { sharepoint_id: 'seed-2', conta: 'EUBR-2025-007', cliente_nome: 'Cliente Cloud LATAM', contato_principal: '— (anonimizado)', contato_email: '', csm: 'Marlison Estrela', lob: 'Cloud', status: 'onboarding', nps: null, valor_anual: null, ultimo_contato: '2026-05-10', observacoes: 'Em onboarding · projeto BTP/Joule. Não publicar sem aprovação Roberto.', case_publicavel: 0, case_resumo: '' },
      { sharepoint_id: 'seed-3', conta: 'EUBR-2024-019', cliente_nome: 'Renner Group', contato_principal: '— (anonimizado)', contato_email: '', csm: 'Bruna Yamagami', lob: 'ERP', status: 'live', nps: 8, valor_anual: null, ultimo_contato: '2026-05-20', observacoes: 'S/4HANA Cloud · contrato anual confirmado renewal 2026.', case_publicavel: 0, case_resumo: '' }
    ];
    const ins = db.prepare(`INSERT OR IGNORE INTO cs_clientes (sharepoint_id, conta, cliente_nome, contato_principal, contato_email, csm, lob, status, nps, valor_anual, ultimo_contato, observacoes, case_publicavel, case_resumo, synced_at) VALUES (@sharepoint_id, @conta, @cliente_nome, @contato_principal, @contato_email, @csm, @lob, @status, @nps, @valor_anual, @ultimo_contato, @observacoes, @case_publicavel, @case_resumo, datetime('now'))`);
    db.transaction(() => { seed.forEach(s => ins.run(s)); })();
    console.log(`[cases-seed] ${seed.length} cliente(s) anonimizado(s) carregado(s) em cs_clientes.`);
  } catch (e) {
    console.warn('[cases-seed] falhou ao seedar ou tabela inexistente:', e.message);
  }
})();

module.exports = router;
