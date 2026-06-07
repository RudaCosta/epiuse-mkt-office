// home.js — EPI-USE Office HOME (Sprint 20 · v2 pipeline)
// Carrega digest + métricas + áreas + alertas em paralelo
// Tema é gerenciado pelo office-nav (NÃO duplicar — Ressalva R4)

(function() {
  'use strict';

  // ── HELPERS ─────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const fmt = n => n == null ? '—' : (typeof n === 'number' ? n.toLocaleString('pt-BR') : n);
  const esc = s => String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function saudacao() {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // SVG sparkline minimalista (4-8 pontos)
  function spark(pts, cor) {
    if (!pts || pts.length < 2) return '<svg viewBox="0 0 100 28"></svg>';
    const max = Math.max(...pts), min = Math.min(...pts), rng = (max-min) || 1;
    const w = 100, h = 28, pad = 2;
    const xs = pts.map((_, i) => pad + i * (w - 2*pad) / (pts.length-1));
    const ys = pts.map(v => h - pad - (v - min) * (h - 2*pad) / rng);
    const line = pts.map((v, i) => (i ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1)).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="area-spark" preserveAspectRatio="none">
      <path d="${line}" fill="none" stroke="${cor||'#869ec3'}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  // ── NOME do usuário (SSO ou fallback) ───────────────────────────
  async function getNome() {
    try {
      const r = await fetch('/api/auth/status');
      const d = await r.json();
      if (d.authenticated && d.user) {
        return (d.user.name || '').split(' ')[0] || 'Rudá';
      }
    } catch {}
    try { return (localStorage.getItem('office.user') || 'Rudá').split(' ')[0]; }
    catch { return 'Rudá'; }
  }

  // ── HERO ────────────────────────────────────────────────────────
  async function renderHero() {
    const nome = await getNome();
    $('hero-saudacao').textContent = `${saudacao()}, ${nome} 👋`;
    const hoje = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    $('hero-data').textContent = hoje;
  }

  // ── DIGEST (3 cards) ────────────────────────────────────────────
  async function renderDigest() {
    const target = $('digest-grid');
    try {
      const [voicesR, eventosR, pendR] = await Promise.all([
        fetch('/api/voices.json').then(r => r.json()).catch(() => ({})),
        fetch('/api/events.json').then(r => r.json()).catch(() => ({})),
        fetch('/api/pendencias').then(r => r.json()).catch(() => ({}))
      ]);
      const voicesAtivos = (voicesR.voices || []).length;
      const voicesMeta = voicesR.programa?.vagas_total || 5;
      const ev7d = countEventos7d(eventosR);
      const bloqueados = (pendR.buckets?.bloqueadas || []).length + (pendR.buckets?.achados || []).length;
      target.innerHTML = `
        <div class="home-digest-card">
          <div class="label">Voices ativos</div>
          <div class="value">${voicesAtivos}/${voicesMeta}</div>
          <div class="sub">programa MVP em curso</div>
        </div>
        <div class="home-digest-card${ev7d === 0 ? '' : ' warn'}">
          <div class="label">Eventos · próximos 7d</div>
          <div class="value">${ev7d}</div>
          <div class="sub">${ev7d === 0 ? 'sem eventos esta semana' : 'na agenda'}</div>
        </div>
        <div class="home-digest-card${bloqueados > 0 ? ' alert' : ''}">
          <div class="label">Pendências 🔴 / ⚠️</div>
          <div class="value">${bloqueados}</div>
          <div class="sub">${bloqueados === 0 ? 'tudo no eixo' : 'ver Alertas & Bloqueios ↓'}</div>
        </div>`;
    } catch (e) {
      target.innerHTML = '<div class="home-empty">Erro ao carregar digest.</div>';
    }
  }

  function countEventos7d(ev) {
    try {
      const lista = []
        .concat((ev.abas?.brasil?.eventos) || [])
        .concat((ev.abas?.latam?.eventos) || []);
      const hoje = new Date();
      const ymHoje = hoje.getFullYear() * 100 + (hoje.getMonth() + 1);
      // contagem aproximada: eventos do mês corrente
      return lista.filter(e => {
        if (e.y && e.m) return (e.y * 100 + e.m) === ymHoje;
        return false;
      }).length;
    } catch { return 0; }
  }

  // ── METAS FY26 STRIP ────────────────────────────────────────────
  async function renderMetas() {
    const target = $('metas-strip');
    try {
      const r = await fetch('/api/areas.json'); const d = await r.json();
      const metas = [];
      (d.areas || []).forEach(a => {
        (a.funil || []).forEach(s => {
          if (s.valor != null && s.meta) {
            const pct = Math.round(100 * s.valor / s.meta);
            metas.push({ nome: a.nome.split(' ')[0], estagio: s.estagio, valor: s.valor, meta: s.meta, pct, cor: a.cor });
          }
        });
      });
      const top = metas.sort((a, b) => b.pct - a.pct).slice(0, 5);
      if (!top.length) { target.innerHTML = '<div class="home-empty">Sem metas com valor real ainda.</div>'; return; }
      target.innerHTML = top.map(m => {
        const cls = m.pct >= 75 ? 'ok' : m.pct >= 50 ? 'warn' : 'off';
        const fill = m.pct >= 75 ? '#10b981' : m.pct >= 50 ? '#fbbf24' : '#ef4444';
        return `<div class="home-meta-cell">
          <div class="nome">${esc(m.nome)} · ${esc(m.estagio.slice(0, 20))}</div>
          <div class="pct ${cls}">${m.pct}%</div>
          <div class="bar"><i style="width:${Math.min(100,m.pct)}%;background:${fill}"></i></div>
        </div>`;
      }).join('');
    } catch {
      target.innerHTML = '<div class="home-empty">⏳ Aguarda integração de metas.</div>';
    }
  }

  // ── GRID 6 ÁREAS + SAP card disabled (7º) ───────────────────────
  async function renderAreas() {
    const target = $('areas-grid');
    try {
      const r = await fetch('/api/areas.json'); const d = await r.json();
      const areas = d.areas || [];
      const cards = areas.map(a => {
        const cor = a.cor || '#869ec3';
        const kpis = (a.kpis || []).slice(0, 2).map(k => {
          const v = k.valor != null ? fmt(k.valor) : '<span style="color:var(--home-text-muted)">⏳</span>';
          return `<div class="area-kpi"><span>${esc(k.label).slice(0, 22)}</span><strong>${v}</strong></div>`;
        }).join('');
        // sparkline: usa valores numéricos do funil se houver, senão omite
        const valoresNum = (a.funil || []).map(s => s.valor).filter(v => typeof v === 'number');
        const sparkSvg = valoresNum.length >= 2 ? spark(valoresNum, cor) : '';
        return `<a class="home-area-card" href="/area/${esc(a.id)}" style="--area-color:${cor}">
          <div>
            <div class="area-head">
              <span class="area-icon">${esc(a.icon||'📂')}</span>
            </div>
            <div class="area-nome">${esc(a.nome)}</div>
            <div class="area-dona">👤 ${esc(a.dona)}</div>
            <div class="area-kpis">${kpis}</div>
            ${sparkSvg}
          </div>
          <div class="area-footer"><span>Abrir módulo</span><span class="arrow">→</span></div>
        </a>`;
      }).join('');
      // SAP Competitor "em breve" (Ressalva: skill não funciona ainda)
      const sapCard = `<div class="home-area-card disabled" style="--area-color:#a37d57" aria-disabled="true">
        <div>
          <div class="area-head">
            <span class="area-icon">🔍</span>
            <span class="area-emcoming">🔜 em breve</span>
          </div>
          <div class="area-nome">SAP Competitor Intel</div>
          <div class="area-dona">👤 Bruna · skill em construção</div>
          <div class="area-kpis">
            <div class="area-kpi"><span>Concorrentes mapeados</span><strong>⏳</strong></div>
            <div class="area-kpi"><span>LinkedIn ranking</span><strong>⏳</strong></div>
          </div>
        </div>
        <div class="area-footer"><span>Indisponível</span><span class="arrow">·</span></div>
      </div>`;
      target.innerHTML = cards + sapCard;
    } catch {
      target.innerHTML = '<div class="home-empty">Erro ao carregar áreas.</div>';
    }
  }

  // ── ALERTAS & BLOQUEIOS (substitui War Room) ────────────────────
  async function renderAlertas() {
    const target = $('alerts-list');
    try {
      const r = await fetch('/api/pendencias'); const d = await r.json();
      const bloq = d.buckets?.bloqueadas || [];
      const ach = d.buckets?.achados || [];
      const items = [
        ...bloq.map(x => ({ ...x, tipo: 'b', tag: '🔴 BLOQ' })),
        ...ach.map(x => ({ ...x, tipo: 'a', tag: '⚠️ ACHADO' }))
      ];
      if (!items.length) {
        target.innerHTML = '<div class="home-empty">🎉 Sem bloqueios ativos.</div>';
        return;
      }
      target.innerHTML = items.map(i => `<div class="home-alert-item">
        <span class="tag ${i.tipo}">${i.tag}</span>
        <div style="flex:1; min-width:0;">
          <div class="titulo">${esc(i.titulo)}</div>
          <div class="desc">${esc((i.descricao||'').slice(0, 140))}</div>
        </div>
      </div>`).join('');
    } catch {
      target.innerHTML = '<div class="home-empty">Erro ao carregar alertas.</div>';
    }
  }

  // ── INIT ────────────────────────────────────────────────────────
  function init() {
    renderHero();
    renderDigest();
    renderMetas();
    renderAreas();
    renderAlertas();
    // auto-refresh a cada 60s
    setInterval(() => { renderDigest(); renderAlertas(); }, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
