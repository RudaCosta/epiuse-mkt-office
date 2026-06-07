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

  // ── EVENTOS BR/LATAM/TODOS (grid mensal) ────────────────────────
  const MES_NOMES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const LOB_CORES = {
    HCM:'#60a5fa', ERP:'#34d399', Cross:'#c084fc', BTP:'#fb923c', Cloud:'#22d3ee',
    Branding:'#f472b6', Institucional:'#f87171', WFS:'#fbbf24', SN:'#818cf8', BTM:'#2dd4bf'
  };
  let EV_BR = [], EV_LATAM = [], EV_TAB = 'brasil';

  function evGetActive() {
    if (EV_TAB === 'brasil') return EV_BR;
    if (EV_TAB === 'latam') return EV_LATAM;
    return [...EV_BR, ...EV_LATAM];
  }

  function renderEvtMonth(m, eventos, mode) {
    const evs = eventos.filter(e => e.m === m).sort((a,b) => String(a.d).localeCompare(String(b.d)));
    const isEmpty = evs.length === 0;
    const cls = mode === 'past' ? 'past' : mode === 'current' ? 'current' : (isEmpty ? 'empty' : '');
    const curBadge = mode === 'current' ? ' <span style="font-size:8px;color:#34d399;background:rgba(16,185,129,.18);padding:3px 5px;border-radius:4px;margin-left:6px;letter-spacing:.1em">AGORA</span>' : '';
    const countTxt = mode === 'past' ? 'passou' : `${evs.length} ${evs.length === 1 ? 'evento' : 'eventos'}`;
    let body = isEmpty ? '<div class="home-evt-empty">— sem eventos —</div>' : evs.map(e => {
      const cor = LOB_CORES[e.lob] || '#94a3b8';
      const flag = e.flag ? `<span style="margin-right:4px">${e.flag}</span>` : '';
      const country = e.country && e.country !== 'BR' ? ` · ${esc(e.country)}` : '';
      return `<div class="home-evt-item">
        <div class="home-evt-day">${esc(e.d)}</div>
        <div class="home-evt-info">
          <div class="nome">${flag}${esc(e.n)}<span class="lob" style="background:${cor}22;color:${cor}">${esc(e.lob||'')}</span></div>
          <div class="who">${esc(e.who||'')}${country}</div>
        </div>
      </div>`;
    }).join('');
    return `<div class="home-evt-month ${cls}">
      <div class="home-evt-month-head">
        <span class="home-evt-month-name">${MES_NOMES[m-1]}${curBadge}</span>
        <span class="home-evt-month-count">${countTxt}</span>
      </div>
      ${body}
    </div>`;
  }

  function renderEventos() {
    const grid = $('evt-grid');
    const evs = evGetActive();
    $('evt-count').textContent = `${evs.length} eventos`;
    const cur = new Date().getMonth() + 1;
    const start = Math.max(1, cur - 1);
    let html = '';
    for (let m = start; m <= 12; m++) {
      html += renderEvtMonth(m, evs, m === cur ? 'current' : 'future');
    }
    if (start > 1) {
      html += `<div class="home-evt-divider"><span></span><span class="txt">↓ Já passou ↓</span><span></span></div>`;
      for (let m = 1; m < start; m++) html += renderEvtMonth(m, evs, 'past');
    }
    grid.innerHTML = html;
  }

  async function initEventos() {
    try {
      const r = await fetch('/api/events.json'); const data = await r.json();
      EV_BR    = (data?.abas?.brasil?.eventos) || data.eventos || [];
      EV_LATAM = (data?.abas?.latam?.eventos)  || [];
      // labels
      document.querySelectorAll('.home-evt-tab').forEach(btn => {
        const tab = btn.dataset.tab;
        if (tab === 'brasil') btn.textContent = `🇧🇷 BRASIL (${EV_BR.length})`;
        else if (tab === 'latam') btn.textContent = `🌎 LATAM (${EV_LATAM.length})`;
        else btn.textContent = `TODOS (${EV_BR.length + EV_LATAM.length})`;
        btn.addEventListener('click', () => {
          EV_TAB = tab;
          document.querySelectorAll('.home-evt-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
          renderEventos();
        });
      });
      renderEventos();
    } catch (e) {
      $('evt-grid').innerHTML = '<div class="home-empty">Falha ao carregar agenda</div>';
    }
  }

  // ── ANIVERSÁRIOS ────────────────────────────────────────────────
  async function renderBdays() {
    const target = $('bday-grid');
    try {
      const r = await fetch('/api/team.json'); const team = await r.json();
      const all = [
        ...(team.lideranca || []).map(p => ({ nome: p.nome, papel: p.cargo, icon: p.icon, color: '#34d399', aniversario: p.aniversario })),
        ...(team.areas || []).map(a => ({ nome: a.responsavel.nome, papel: a.nome, icon: a.icon, color: a.color, aniversario: a.responsavel.aniversario, avatar_grad: a.responsavel.avatar_grad }))
      ].filter(p => p.aniversario);

      const today = new Date(); const Y = today.getFullYear();
      const nextOcc = ddmm => {
        const [d, m] = ddmm.split('/').map(n => parseInt(n, 10));
        let next = new Date(Y, m-1, d);
        if (next < new Date(Y, today.getMonth(), today.getDate())) next = new Date(Y+1, m-1, d);
        return next;
      };
      const daysUntil = date => Math.floor((date - new Date(Y, today.getMonth(), today.getDate())) / 86400000);
      const sorted = all.map(p => ({...p, _date: nextOcc(p.aniversario), _days: daysUntil(nextOcc(p.aniversario))}))
        .sort((a, b) => a._days - b._days);
      const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

      target.innerHTML = sorted.map(p => {
        const isToday = p._days === 0;
        const isSoon = p._days > 0 && p._days <= 30;
        const badge = isToday ? `<span class="home-bday-badge today">🎉 HOJE</span>`
          : isSoon ? `<span class="home-bday-badge soon">em ${p._days}d</span>`
          : `<span class="home-bday-badge future">em ${p._days}d</span>`;
        const grad = p.avatar_grad ? `linear-gradient(135deg,${p.avatar_grad[0]},${p.avatar_grad[1]})` : `linear-gradient(135deg,${p.color},${p.color}88)`;
        return `<div class="home-bday-card${isToday ? ' today' : ''}">
          <div class="home-bday-head">
            <div class="home-bday-person">
              <div class="home-bday-avatar" style="background:${grad}">${isToday ? '🎂' : '👤'}</div>
              <div class="home-bday-info">
                <div class="nome">${esc(p.nome)}</div>
                <div class="papel">${esc(p.papel||'')}</div>
              </div>
            </div>
            ${badge}
          </div>
          <div class="home-bday-date">🎂 ${p._date.getDate().toString().padStart(2,'0')} ${MESES[p._date.getMonth()].toUpperCase()}</div>
        </div>`;
      }).join('') || '<div class="home-empty">Nenhum aniversário cadastrado.</div>';
    } catch {
      target.innerHTML = '<div class="home-empty">Erro ao carregar aniversários.</div>';
    }
  }

  // ── TIME · 6 ÁREAS (responsáveis) ───────────────────────────────
  async function renderTeam() {
    const target = $('team-grid');
    try {
      const r = await fetch('/api/team.json'); const team = await r.json();
      target.innerHTML = (team.areas || []).map(a => {
        const respGrad = a.responsavel?.avatar_grad
          ? `linear-gradient(135deg,${a.responsavel.avatar_grad[0]},${a.responsavel.avatar_grad[1]})`
          : `linear-gradient(135deg,${a.color},${a.color}88)`;
        const voicesLine = a.voices_connect ? `<div class="home-team-voices">🎙️ Voices: ${esc(a.voices_connect)}</div>` : '';
        return `<div class="home-team-card" style="--team-color:${a.color};--team-bg:${a.color_bg}">
          <div class="home-team-head">
            <div class="home-team-icon">${esc(a.icon||'📂')}</div>
            <div class="home-team-name">${esc(a.nome)}</div>
          </div>
          <div class="home-team-resp">
            <div class="home-team-resp-avatar" style="background:${respGrad}">👤</div>
            <div class="home-team-resp-info">
              <div class="home-team-resp-name">${esc(a.responsavel?.nome||'—')}${a.responsavel?.apelido ? ` <span style="opacity:.7">(${esc(a.responsavel.apelido)})</span>` : ''}</div>
              <div class="home-team-resp-tag">Responsável</div>
            </div>
          </div>
          <div class="home-team-foco">${esc(a.foco||'')}</div>
          ${voicesLine}
        </div>`;
      }).join('');
    } catch {
      target.innerHTML = '<div class="home-empty">Erro ao carregar time.</div>';
    }
  }

  // ── FADE-IN SECTIONS ────────────────────────────────────────────
  function initSectionFadeIn() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.home-section').forEach(s => s.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.home-section').forEach(s => io.observe(s));
  }

  // ── INIT ────────────────────────────────────────────────────────
  function init() {
    renderHero();
    renderDigest();
    renderMetas();
    renderAreas();
    initEventos();
    renderBdays();
    renderTeam();
    renderAlertas();
    initSectionFadeIn();
    setInterval(() => { renderDigest(); renderAlertas(); }, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
