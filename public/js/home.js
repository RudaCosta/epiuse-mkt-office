// home.js — EPI-USE Office HOME (Sprint 20 · v2 pipeline)
// Carrega digest + métricas + áreas + alertas em paralelo
// Tema é gerenciado pelo office-nav (NÃO duplicar — Ressalva R4)

(function() {
  'use strict';
  // marca JS carregado — fallback sem JS mantem sections visiveis (CSS rule)
  document.documentElement.classList.add('js-loaded');

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
  // ── AGENDA UNIFICADA (eventos + posts + artigos + MDF/deadlines + ações) ───
  // Tudo num só lugar, agrupado por mês (layout de cards). Camadas filtráveis.
  const ANO = new Date().getFullYear();
  const CAMADAS = [
    { id:'evento',     label:'🔴 Eventos',        cor:'#cd1543' },
    { id:'artigo',     label:'📰 Artigos',        cor:'#001844' },
    { id:'post',       label:'📝 Posts (Duda)',   cor:'#0369a1' },
    { id:'mdf',        label:'💶 MDF/Deadlines',  cor:'#dc2626' },
    { id:'data',       label:'🎉 Datas',          cor:'#d97706' },
  ];
  let AG_ITEMS = [];                              // itens normalizados
  let AG_ATIVAS = new Set(CAMADAS.map(c => c.id)); // camadas visíveis

  function diaFromISO(iso){ const p=String(iso).split('-'); return p[2]?String(parseInt(p[2])):'?'; }
  function mesFromISO(iso){ const p=String(iso).split('-'); return p[1]?parseInt(p[1]):null; }

  function agGetVisiveis(){ return AG_ITEMS.filter(i => AG_ATIVAS.has(i.camada)); }

  function renderAgMonth(m, items, mode) {
    const evs = items.filter(e => e.m === m).sort((a,b) => String(a.d).localeCompare(String(b.d), undefined, {numeric:true}));
    const isEmpty = evs.length === 0;
    const cls = mode === 'past' ? 'past' : mode === 'current' ? 'current' : (isEmpty ? 'empty' : '');
    const curBadge = mode === 'current' ? ' <span style="font-size:8px;color:#34d399;background:rgba(16,185,129,.18);padding:3px 5px;border-radius:4px;margin-left:6px;letter-spacing:.1em">AGORA</span>' : '';
    const countTxt = mode === 'past' ? 'passou' : `${evs.length} ${evs.length === 1 ? 'item' : 'itens'}`;
    let body = isEmpty ? '<div class="home-evt-empty">— sem itens —</div>' : evs.map(e => {
      const flag = e.flag ? `<span style="margin-right:4px">${e.flag}</span>` : '';
      const tag = e.tag ? `<span class="lob" style="background:${e.cor}22;color:${e.cor}">${esc(e.tag)}</span>` : '';
      return `<div class="home-evt-item" style="border-left:3px solid ${e.cor};padding-left:8px">
        <div class="home-evt-day">${esc(e.d)}</div>
        <div class="home-evt-info">
          <div class="nome">${flag}${esc(e.n)}${tag}</div>
          <div class="who">${esc(e.who||'')}</div>
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
    const items = agGetVisiveis();
    $('evt-count').textContent = `${items.length} itens`;
    const cur = new Date().getMonth() + 1;
    const start = Math.max(1, cur - 1);
    let html = '';
    for (let m = start; m <= 12; m++) html += renderAgMonth(m, items, m === cur ? 'current' : 'future');
    if (start > 1) {
      html += `<div class="home-evt-divider"><span></span><span class="txt">↓ Já passou ↓</span><span></span></div>`;
      for (let m = 1; m < start; m++) html += renderAgMonth(m, items, 'past');
    }
    grid.innerHTML = html;
  }

  async function initEventos() {
    try {
      const [ev, cal, dl, df, dat] = await Promise.all([
        fetch('/api/events.json').then(r=>r.json()).catch(()=>({abas:{}})),
        fetch(`/api/inbound/calendar?from=${ANO}-01-01&to=${ANO}-12-31`).then(r=>r.json()).catch(()=>({posts:[]})),
        fetch('/api/deadlines-2026.json').then(r=>r.json()).catch(()=>({itens:[]})),
        fetch('/api/development-funds').then(r=>r.json()).catch(()=>({requests:[]})),
        fetch('/api/datas-especiais-2026.json').then(r=>r.json()).catch(()=>({itens:[]})),
      ]);
      const items = [];

      // 1 — Eventos EPI-USE/SAP (BR + LATAM)
      for (const aba of Object.values(ev.abas || {})) {
        for (const e of (aba.eventos || [])) {
          if (!e.m) continue;
          items.push({ camada:'evento', m:e.m, d:String(e.d||'TBC'), n:e.n,
            who:[e.who, e.country&&e.country!=='BR'?e.country:''].filter(Boolean).join(' · '),
            flag:e.flag||'', tag:e.lob||'', cor: LOB_CORES[e.lob] || '#cd1543' });
        }
      }
      // 2 — Editorial (artigos Redatoria + posts Duda)
      for (const p of (cal.posts || [])) {
        const m = mesFromISO(p.data); if (!m) continue;
        const camada = p.fonte === 'redatoria' ? 'artigo' : 'post';
        const cor = camada === 'artigo' ? '#001844' : '#0369a1';
        items.push({ camada, m, d:diaFromISO(p.data), n:p.titulo||'(sem título)',
          who:[p.autor, p.canal].filter(Boolean).join(' · '), tag:p.pilar||'', cor });
      }
      // 3 — Deadlines MDF gerais
      for (const it of (dl.itens || [])) {
        const m = mesFromISO(it.data); if (!m) continue;
        items.push({ camada:'mdf', m, d:diaFromISO(it.data), n:it.nome, who:'deadline SAP', tag:'MDF', cor:'#dc2626' });
      }
      // 4 — Claims DF a reclamar (expiração) — só não derrubados, claim pendente
      for (const r of (df.requests || [])) {
        if (r.derrubado || (+r.claim||0) > 0 || !r.expiracao) continue;
        const m = mesFromISO(r.expiracao); if (!m) continue;
        items.push({ camada:'mdf', m, d:diaFromISO(r.expiracao), n:`💶 Expira claim: ${r.nome}`,
          who:`€${Number(r.aprovado||0).toLocaleString('pt-BR')} · ${r.status||''}`, tag:'claim', cor:'#dc2626' });
      }
      // 5 — Datas comemorativas (só tipo comemorativa/premiacao, não feriado pra não poluir)
      for (const it of (dat.itens || [])) {
        if (!it.data) continue;
        if (!['comemorativa','premiacao','efemeride'].includes(it.tipo)) continue;
        const m = mesFromISO(it.data); if (!m) continue;
        items.push({ camada:'data', m, d:diaFromISO(it.data), n:it.nome, who:it.descricao||'', tag:'', cor: it.cor||'#d97706' });
      }

      AG_ITEMS = items;

      // Filtros por camada (substitui tabs BR/LATAM/TODOS)
      const tabsEl = $('evt-tabs');
      if (tabsEl) {
        const counts = {}; for (const c of CAMADAS) counts[c.id] = items.filter(i=>i.camada===c.id).length;
        tabsEl.innerHTML = CAMADAS.map(c =>
          `<button class="home-evt-tab active" data-cam="${c.id}" style="border-color:${c.cor}66">${c.label} (${counts[c.id]})</button>`
        ).join('');
        tabsEl.querySelectorAll('.home-evt-tab').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.cam;
            if (AG_ATIVAS.has(id)) { AG_ATIVAS.delete(id); btn.classList.remove('active'); }
            else { AG_ATIVAS.add(id); btn.classList.add('active'); }
            renderEventos();
          });
        });
      }
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
  // ── HOME POR ROLE (S38 v0.36.0) ─────────────────────────────────
  // personas.json define ordem/visibilidade das seções + KPIs do "Meu foco".
  // Persona vem de: localStorage override > SSO email > visitante.
  let PERSONAS = null;

  async function getPersonaId() {
    const manual = localStorage.getItem('office.persona');
    if (manual && PERSONAS?.personas?.[manual]) return manual;
    try {
      const st = await fetch('/api/auth/status').then(r => r.json());
      const email = st?.user?.email?.toLowerCase();
      if (email && PERSONAS?.emails?.[email]) return PERSONAS.emails[email];
    } catch (e) {}
    return 'visitante';
  }

  function applyPersona(pid) {
    const p = PERSONAS?.personas?.[pid];
    if (!p) return;
    const wrap = document.querySelector('.home-wrap');
    // Reordena: appendChild move cada seção pro fim na ordem definida
    (p.ordem || []).forEach(secId => {
      const el = document.querySelector(`[data-sec="${secId}"]`);
      if (el) { el.style.display = ''; wrap.appendChild(el); }
    });
    (p.esconde || []).forEach(secId => {
      const el = document.querySelector(`[data-sec="${secId}"]`);
      if (el) el.style.display = 'none';
    });
    // Seções fora de ordem+esconde ficam visíveis no fim (default)
    const conhecidas = new Set([...(p.ordem||[]), ...(p.esconde||[])]);
    document.querySelectorAll('[data-sec]').forEach(el => {
      if (!conhecidas.has(el.dataset.sec) && !['northstar','hoje','foco'].includes(el.dataset.sec)) el.style.display = '';
    });
    const ft = $('foco-title');
    if (ft) ft.textContent = `${p.icon || '🎯'} Foco · ${p.nome}`;
    if ((p.kpis || []).length) renderFoco(p.kpis);
    else { const f = document.querySelector('[data-sec="foco"]'); if (f) f.style.display = 'none'; }
    // Reorder via appendChild conflita com o IntersectionObserver do fade-in
    // (seções movidas ficam presas em opacity:0). Força .visible após aplicar.
    document.querySelectorAll('.home-section').forEach(s => s.classList.add('visible'));
  }

  // ── KPIs por fonte (todas APIs já existentes) ───────────────────
  const KPI_DEFS = {
    pipeline_fy:        { label: 'Pipeline MKT · FY', fonte: 'Zoho CRM', cor: '#60a5fa',
      get: async () => { const d = await fetch('/api/zoho/pipeline?source=all').then(r=>r.json()); const v = d?.kpis?.ultimo_fy?.valor; return v ? 'R$ ' + (v/1e6).toFixed(1) + 'M' : '—'; } },
    linkedin_total:     { label: 'Seguidores LinkedIn', fonte: 'XLS Bruna', cor: '#34d399',
      get: async () => { const d = await fetch('/api/linkedin/historical').then(r=>r.json()); const s = d?.serie_mensal||[]; return fmt(s.length ? s[s.length-1].total_seguidores : null); } },
    linkedin_novos:     { label: 'Novos no mês', fonte: 'LinkedIn', cor: '#34d399',
      get: async () => { const d = await fetch('/api/linkedin/historical').then(r=>r.json()); const s = d?.serie_mensal||[]; const n = s.length ? s[s.length-1].novos : null; return n != null ? '+' + fmt(n) : '—'; } },
    ddf_aprovado:       { label: 'DDF aprovado válido', fonte: 'SAP DF', cor: '#a78bfa',
      get: async () => { const d = await fetch('/api/development-funds').then(r=>r.json()); const v = d?.kpis?.aprovado_valido; return v ? '€ ' + (v/1e3).toFixed(1) + 'k' : '—'; } },
    posts_semana:       { label: 'Posts esta semana', fonte: 'Calendar Duda', cor: '#0ea5e9',
      get: async () => { const hoje = new Date().toISOString().slice(0,10); const fim = new Date(Date.now()+7*864e5).toISOString().slice(0,10); const d = await fetch(`/api/inbound/calendar?from=${hoje}&to=${fim}`).then(r=>r.json()); return fmt((d?.posts||[]).filter(p=>p.fonte!=='redatoria').length); } },
    content_aguardando: { label: 'Conteúdos aguardando', fonte: 'Pipeline Conteúdo', cor: '#fbbf24',
      get: async () => { const d = await fetch('/api/content').then(r=>r.json()); const pe = d?.por_estado||{}; return fmt((pe.seo_geo||0)+(pe.persona||0)+(pe.copy_cta||0)); } },
    voices_ativos:      { label: 'Voices ativos', fonte: 'Voices', cor: '#c084fc',
      get: async () => { const d = await fetch('/api/voices.json').then(r=>r.json()).catch(()=>null); const vs = d?.voices||[]; return fmt(Array.isArray(vs) ? vs.filter(v=>['ativo','piloto','onboarding'].includes(String(v.status||'').toLowerCase())).length : null); } },
    apollo_contatos:    { label: 'Contatos Apollo', fonte: 'Apollo', cor: '#60a5fa',
      get: async () => { const d = await fetch('/api/pipeline').then(r=>r.json()); return fmt(d?.contatos_total); } },
    apollo_sequencias:  { label: 'Sequências ativas', fonte: 'Apollo', cor: '#60a5fa',
      get: async () => { const d = await fetch('/api/pipeline').then(r=>r.json()); return fmt(d?.sequencias_ativas); } },
    ga4_usuarios:       { label: 'Usuários site (mês)', fonte: 'GA4', cor: '#f472b6',
      get: async () => { const d = await fetch('/api/relatorio/snapshot?mes=' + new Date().toISOString().slice(0,7)).then(r=>r.json()).catch(()=>null); return fmt(d?.site?.usuarios); } },
    eventos_30d:        { label: 'Eventos 30 dias', fonte: 'Field Marketing', cor: '#cd1543',
      get: async () => { const d = await fetch('/api/field-marketing').then(r=>r.json()); const hoje = new Date().toISOString().slice(0,10); const fim = new Date(Date.now()+30*864e5).toISOString().slice(0,10); return fmt((d?.eventos||[]).filter(e=>e.data_evento && e.data_evento>=hoje && e.data_evento<=fim).length); } },
    capturas_pendentes: { label: 'Capturas a preencher', fonte: 'Field Marketing', cor: '#fbbf24',
      get: async () => { const d = await fetch('/api/field-marketing').then(r=>r.json()); const hoje = new Date().toISOString().slice(0,10); return fmt((d?.eventos||[]).filter(e=>e.data_evento && e.data_evento<hoje && !(e.captura&&(e.captura.leads||e.captura.deals))).length); } },
    claims_df:          { label: 'Claims DF a reclamar', fonte: 'SAP DF', cor: '#dc2626',
      get: async () => { const d = await fetch('/api/development-funds').then(r=>r.json()); return fmt((d?.a_reclamar||[]).length); } },
    golives_30d:        { label: 'Go-lives SAP 30d', fonte: 'SAP 4 ME', cor: '#a78bfa',
      get: async () => { const d = await fetch('/api/clientes-sap-4me').then(r=>r.json()); const hoje = new Date().toISOString().slice(0,10); const fim = new Date(Date.now()+30*864e5).toISOString().slice(0,10); return fmt((d?.proximos_golive||[]).filter(g=>g.golive>=hoje&&g.golive<=fim).length); } },
    sap_live:           { label: 'Projetos SAP Live', fonte: 'SAP 4 ME', cor: '#34d399',
      get: async () => { const d = await fetch('/api/clientes-sap-4me').then(r=>r.json()); return fmt(d?.kpis?.live); } },
    cases_publicaveis:  { label: 'Cases publicados', fonte: 'Cases CS', cor: '#34d399',
      get: async () => { const d = await fetch('/api/cases').then(r=>r.json()); return fmt(d?.kpis?.case_publicado); } },
  };

  async function renderFoco(kpiIds) {
    const grid = $('foco-grid');
    const sec = document.querySelector('[data-sec="foco"]');
    if (!grid || !sec) return;
    sec.style.display = '';
    grid.innerHTML = kpiIds.map(id => {
      const def = KPI_DEFS[id];
      return `<div class="dk-glass" style="padding:16px 18px;border-left:3px solid ${def?.cor||'#60a5fa'}">
        <div style="font-size:10px;color:var(--dk-text-muted,#94a3b8);text-transform:uppercase;letter-spacing:.08em">${esc(def?.label||id)}</div>
        <div id="foco-${id}" style="font-size:26px;font-weight:800;font-family:'JetBrains Mono',monospace;margin-top:6px">…</div>
        <div style="font-size:9px;color:var(--dk-text-muted,#64748b);margin-top:4px">🟢 ${esc(def?.fonte||'')}</div>
      </div>`;
    }).join('');
    kpiIds.forEach(async id => {
      const def = KPI_DEFS[id]; if (!def) return;
      try { const v = await def.get(); const el = $('foco-' + id); if (el) el.textContent = v; }
      catch (e) { const el = $('foco-' + id); if (el) el.textContent = '—'; }
    });
  }

  // ── NORTH-STAR (3 números que importam) ─────────────────────────
  async function renderNorthstar() {
    const strip = $('northstar-strip');
    const sec = document.querySelector('[data-sec="northstar"]');
    if (!strip || !sec) return;
    const NS = ['pipeline_fy', 'linkedin_total', 'ddf_aprovado'];
    strip.innerHTML = NS.map(id => {
      const def = KPI_DEFS[id];
      return `<div class="dk-glass" style="padding:20px 24px;text-align:center;border-top:3px solid ${def.cor}">
        <div id="ns-${id}" style="font-size:34px;font-weight:800;font-family:'JetBrains Mono',monospace;line-height:1">…</div>
        <div style="font-size:11px;color:var(--dk-text-muted,#94a3b8);text-transform:uppercase;letter-spacing:.08em;margin-top:8px">${esc(def.label)}</div>
        <div style="font-size:9px;color:var(--dk-text-muted,#64748b);margin-top:3px">🟢 ${esc(def.fonte)}</div>
      </div>`;
    }).join('');
    NS.forEach(async id => {
      try { const v = await KPI_DEFS[id].get(); const el = $('ns-' + id); if (el) el.textContent = v; }
      catch (e) {}
    });
  }

  // ── HOJE (o que acontece hoje) ──────────────────────────────────
  async function renderHoje() {
    const list = $('hoje-list');
    const sec = document.querySelector('[data-sec="hoje"]');
    if (!list || !sec) return;
    const hoje = new Date().toISOString().slice(0,10);
    try {
      const [cal, fm, df] = await Promise.all([
        fetch(`/api/inbound/calendar?from=${hoje}&to=${hoje}`).then(r=>r.json()).catch(()=>({posts:[]})),
        fetch('/api/field-marketing').then(r=>r.json()).catch(()=>({eventos:[]})),
        fetch('/api/development-funds').then(r=>r.json()).catch(()=>({requests:[]})),
      ]);
      const itens = [];
      for (const p of (cal.posts||[])) itens.push({ ico: p.fonte==='redatoria'?'📰':'📝', txt: p.titulo, sub: [p.autor,p.canal].filter(Boolean).join(' · '), cor: p.fonte==='redatoria'?'#869ec3':'#0ea5e9' });
      for (const e of (fm.eventos||[])) if (e.data_evento === hoje) itens.push({ ico:'🔴', txt: e.nome, sub: 'evento · '+(e.lob||''), cor:'#cd1543' });
      for (const r of (df.requests||[])) if (!r.derrubado && (+r.claim||0)===0 && r.expiracao === hoje) itens.push({ ico:'💶', txt:'Expira HOJE: claim '+r.nome, sub:'€'+Number(r.aprovado||0).toLocaleString('pt-BR'), cor:'#dc2626' });
      list.innerHTML = itens.length ? itens.map(i => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;background:rgba(15,30,53,.4);border:1px solid rgba(96,165,250,.12);border-left:3px solid ${i.cor};border-radius:8px;font-size:13px">
          <span>${i.ico}</span>
          <span style="flex:1;color:var(--dk-text,#e2e8f0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.txt)}</span>
          <span style="font-size:10px;color:var(--dk-text-muted,#64748b);white-space:nowrap">${esc(i.sub)}</span>
        </div>`).join('') : '<div style="font-size:12px;color:var(--dk-text-muted,#64748b);padding:8px 0">Nada agendado pra hoje. ✨</div>';
    } catch (e) { list.innerHTML = ''; }
  }

  async function initPersonas() {
    try {
      PERSONAS = await fetch('/api/personas.json').then(r => r.json());
      const pid = await getPersonaId();
      // Seletor "Ver como…"
      const sel = $('persona-select');
      if (sel) {
        sel.innerHTML = Object.entries(PERSONAS.personas).map(([id, p]) =>
          `<option value="${id}" ${id===pid?'selected':''}>${p.icon} Ver como: ${p.nome}</option>`).join('');
        sel.addEventListener('change', () => {
          localStorage.setItem('office.persona', sel.value);
          applyPersona(sel.value);
        });
      }
      applyPersona(pid);
      renderNorthstar();
      renderHoje();
    } catch (e) { console.warn('personas:', e); }
  }

  function init() {
    renderHero();
    renderDigest();
    renderMetas();
    renderAreas();
    initEventos();
    renderBdays();
    renderTeam();
    renderAlertas();
    initPersonas();
    initSectionFadeIn();
    setInterval(() => { renderDigest(); renderAlertas(); }, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
