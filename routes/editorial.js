/**
 * routes/editorial.js — Módulo 25 · Calendário Editorial
 * 3 telas: /editorial/insights · /editorial/calendario · /editorial/pautas
 * API: GET dados por aba · POST /api/editorial/sync (mirror da planilha) · POST resync
 *
 * O sync é MIRROR: cada aba é substituída por inteiro (o time deleta/edita na planilha,
 * o Office reflete). Fonte fixa 'planilha-editorial'.
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');
const { db, requireAuth, requireEditorToken } = require('../server-context');

const EDT_DIR = path.join(__dirname, '../public/editorial');

// ── PÁGINAS ───────────────────────────────────────────────────────────────────
router.get('/editorial', requireAuth, (req, res) => res.redirect(302, '/editorial/calendario'));
router.get('/editorial/insights',   requireAuth, (req, res) => res.sendFile(path.join(EDT_DIR, 'insights.html')));
router.get('/editorial/calendario', requireAuth, (req, res) => res.sendFile(path.join(EDT_DIR, 'calendario.html')));
router.get('/editorial/pautas',     requireAuth, (req, res) => res.sendFile(path.join(EDT_DIR, 'pautas.html')));

// ── API · LEITURA ─────────────────────────────────────────────────────────────
router.get('/api/editorial/insights', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM edt_insights WHERE id = 1').get();
    if (!row) return res.json({ titulo: '', subtitle: '', tables: [], last_sync: null });
    res.json({
      titulo: row.titulo, subtitle: row.subtitle,
      tables: JSON.parse(row.tables_json || '[]'),
      last_sync: row.synced_at || null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/editorial/calendario', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM edt_calendario ORDER BY data ASC').all();
    const last = db.prepare('SELECT MAX(synced_at) AS s FROM edt_calendario').get();
    res.json({ posts: rows, last_sync: last?.s || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/editorial/pautas', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM edt_pautas ORDER BY editoria, tema').all();
    const last = db.prepare('SELECT MAX(synced_at) AS s FROM edt_pautas').get();
    res.json({ pautas: rows, last_sync: last?.s || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── API · SYNC (mirror completo das 3 abas) ───────────────────────────────────
router.post('/api/editorial/sync', requireEditorToken, (req, res) => {
  const { insights, calendario, pautas } = req.body || {};
  const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
  const now = () => "datetime('now')";
  let counts = { insights: 0, calendario: 0, pautas: 0 };

  try {
    const tx = db.transaction(() => {
      // Insights — 1 linha (id=1)
      if (insights && Array.isArray(insights.tables)) {
        db.prepare(`
          INSERT INTO edt_insights (id, titulo, subtitle, tables_json, synced_at)
          VALUES (1, @titulo, @subtitle, @tables_json, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            titulo=excluded.titulo, subtitle=excluded.subtitle,
            tables_json=excluded.tables_json, synced_at=datetime('now')
        `).run({
          titulo: clip(insights.titulo, 300),
          subtitle: clip(insights.subtitle, 500),
          tables_json: JSON.stringify(insights.tables).slice(0, 200000),
        });
        counts.insights = insights.tables.length;
      }

      // Calendário — mirror (apaga tudo da fonte e reinsere)
      if (Array.isArray(calendario)) {
        db.prepare("DELETE FROM edt_calendario WHERE fonte = 'planilha-editorial'").run();
        const ins = db.prepare(`
          INSERT INTO edt_calendario
            (external_id, fonte, semana, data, dia, tipo, titulo, lob, solucao, narrativa, formato, cta, copy, status, synced_at)
          VALUES
            (@external_id, 'planilha-editorial', @semana, @data, @dia, @tipo, @titulo, @lob, @solucao, @narrativa, @formato, @cta, @copy, @status, datetime('now'))
          ON CONFLICT(external_id) DO UPDATE SET
            semana=excluded.semana, data=excluded.data, dia=excluded.dia, tipo=excluded.tipo,
            titulo=excluded.titulo, lob=excluded.lob, solucao=excluded.solucao, narrativa=excluded.narrativa,
            formato=excluded.formato, cta=excluded.cta, copy=excluded.copy, status=excluded.status,
            synced_at=datetime('now')
        `);
        for (const it of calendario) {
          if (!it || !it.data) continue;
          ins.run({
            external_id: clip(it.external_id || `edt-cal-${it.data}`, 120),
            semana: clip(it.semana, 40), data: clip(it.data, 10), dia: clip(it.dia, 20),
            tipo: clip(it.tipo, 80), titulo: clip(it.titulo, 300), lob: clip(it.lob, 60),
            solucao: clip(it.solucao, 80), narrativa: clip(it.narrativa, 80),
            formato: clip(it.formato, 80), cta: clip(it.cta, 20),
            copy: clip(it.copy, 8000), status: clip(it.status || 'Planejado', 40),
          });
          counts.calendario++;
        }
      }

      // Pautas — mirror
      if (Array.isArray(pautas)) {
        db.prepare("DELETE FROM edt_pautas WHERE fonte = 'planilha-editorial'").run();
        const ins = db.prepare(`
          INSERT INTO edt_pautas
            (external_id, fonte, editoria, tema, volumetria, keyword, resumo, fontes, link_doc, link_artigo, chamada, synced_at)
          VALUES
            (@external_id, 'planilha-editorial', @editoria, @tema, @volumetria, @keyword, @resumo, @fontes, @link_doc, @link_artigo, @chamada, datetime('now'))
          ON CONFLICT(external_id) DO UPDATE SET
            editoria=excluded.editoria, tema=excluded.tema, volumetria=excluded.volumetria,
            keyword=excluded.keyword, resumo=excluded.resumo, fontes=excluded.fontes,
            link_doc=excluded.link_doc, link_artigo=excluded.link_artigo, chamada=excluded.chamada,
            synced_at=datetime('now')
        `);
        for (const p of pautas) {
          if (!p || (!p.tema && !p.editoria)) continue;
          ins.run({
            external_id: clip(p.external_id || `edt-pauta-${counts.pautas}`, 120),
            editoria: clip(p.editoria, 80), tema: clip(p.tema, 400),
            volumetria: clip(p.volumetria, 40), keyword: clip(p.keyword, 120),
            resumo: clip(p.resumo, 4000), fontes: clip(p.fontes, 1000),
            link_doc: clip(p.link_doc, 800), link_artigo: clip(p.link_artigo, 800),
            chamada: clip(p.chamada, 4000),
          });
          counts.pautas++;
        }
      }
    });
    tx();
    res.json({ success: true, counts });
  } catch (e) {
    console.error('[editorial/sync]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── API · RESYNC (botão 🔄) — roda o parser e re-sincroniza ────────────────────
// Fase 1: lê a cópia local. Fase 2 (--graph): puxa da nuvem via Microsoft Graph.
let _resyncRunning = false;
router.post('/api/editorial/resync', requireAuth, (req, res) => {
  if (_resyncRunning) return res.status(429).json({ success: false, error: 'Resync já em andamento.' });
  _resyncRunning = true;
  const useGraph = String(req.query.graph || '') === '1' || process.env.EDITORIAL_USE_GRAPH === '1';
  const script = path.join(__dirname, '../scripts/sync/sync_calendario_editorial.js');
  const args = [script];
  if (useGraph) args.push('--graph');

  const child = spawn(process.execPath, args, {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, OFFICE_URL: `http://localhost:${process.env.PORT || 3000}` },
  });
  let out = '', err = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { err += d; });
  child.on('close', (code) => {
    _resyncRunning = false;
    if (code === 0) {
      res.json({ success: true, log: out.slice(-1500), source: useGraph ? 'graph' : 'local' });
    } else {
      const hint = /não encontrado|not found|ENOENT/i.test(out + err)
        ? 'Arquivo-fonte não encontrado. Na Fase 1 o resync lê a cópia local; a leitura ao vivo da nuvem depende da Fase 2 (Graph + permissão de TI).'
        : (err.slice(-800) || out.slice(-800));
      res.status(500).json({ success: false, error: hint, source: useGraph ? 'graph' : 'local' });
    }
  });
  child.on('error', (e) => { _resyncRunning = false; res.status(500).json({ success: false, error: e.message }); });
});

module.exports = router;
