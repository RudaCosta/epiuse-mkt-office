// home.js — EPI-USE Office HOME v2 (25/set/2026)
// Hub de navegação: busca ⌘K · atalhos da persona · áreas com atalhos · explorar · agenda · aniversários.
// Sem KPIs e sem tags de sync (decisão Rudá) — números moram em /area/:id e /relatorio.
// Visual 100% tokens do DESIGN.md v4.0 (css/home-v2.css). Tema é do office-nav (não duplicar).

(function() {
  'use strict';

  // ── HELPERS ─────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function saudacao() {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // ── NOME do usuário (SSO > persona ativa > office.user) ─────────
  async function getNome() {
    try {
      const r = await fetch('/api/auth/status');
      const d = await r.json();
      if (d.authenticated && d.user) {
        return (d.user.name || '').split(' ')[0] || 'Rudá';
      }
    } catch {}
    // persona selecionada no "Ver como" tem prioridade sobre office.user
    const ov = (typeof readPersonaOverride === 'function') ? readPersonaOverride() : null;
    const pid = ov && ov.persona;
    if (pid && PERSONAS?.personas?.[pid]?.nome) {
      return PERSONAS.personas[pid].nome.split(' ')[0];
    }
    try {
      let v = localStorage.getItem('office.user') || 'Rudá';
      // migra valor legado JSON {"nome":"X"} salvo por versão antiga
      if (v.startsWith('{')) { const p = JSON.parse(v); v = p.nome || p.name || 'Rudá'; localStorage.setItem('office.user', v); }
      return v.split(' ')[0];
    } catch { return 'Rudá'; }
  }

  // ── HERO ────────────────────────────────────────────────────────
  async function renderHero() {
    const nome = await getNome();
    // saudação traduz (dict); nome é dado real → data-no-translate
    const nomeSafe = String(nome).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    $('hero-saudacao').innerHTML = `${saudacao()}<span data-no-translate>, ${nomeSafe} 👋</span>`;
    const LOC = { pt:'pt-BR', en:'en-US', es:'es-ES' };
    const lang = (window.getLang ? window.getLang() : 'pt');
    const hoje = new Date().toLocaleDateString(LOC[lang] || 'pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    $('hero-data').setAttribute('data-no-translate', ''); // formatada localmente (locale-aware)
    $('hero-data').textContent = hoje;
    // re-formata a data quando trocar idioma
    if (!window.__heroDateHook) {
      window.__heroDateHook = true;
      document.addEventListener('office:langchange', () => { try { renderHero(); } catch(e){} });
    }
  }


  // ── BUSCA ⌘K — reaproveita a paleta global do office-nav.js ──────
  function initSearch() {
    const btn = $('hx-search'); if (!btn) return;
    const kbd = $('hx-kbd');
    if (kbd && /Mac|iPhone|iPad/.test(navigator.platform || '')) kbd.textContent = '⌘ K';
    btn.addEventListener('click', () => {
      try { if (typeof OfficeCommandPalette !== 'undefined') return OfficeCommandPalette.open(); } catch (e) {}
      // fallback: dispara o atalho de teclado que o office-nav escuta
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true }));
    });
  }

  // ── MANADA ANIMADA (hero) — elefante + filhote em SVG/JS puro ──────
  // Brand Guide 2026 · seção 04: imagem = natureza e animais em estado natural.
  // Liga ao ERP.ngo (1% da receita → elefantes e rinocerontes). Respeita prefers-reduced-motion.
  function elephantSVG(cls) {
    // de perfil, virado pra ESQUERDA (sentido da caminhada)
    return `<svg class="hx-el ${cls}" viewBox="0 0 124 84" aria-hidden="true">
      <path class="el-tail" d="M101 36 q9 6 7 18" fill="none" stroke-width="2.5" stroke-linecap="round"/>
      <g class="el-leg el-back-far"><rect x="86" y="48" width="10" height="24" rx="4"/></g>
      <g class="el-leg el-front-far"><rect x="50" y="48" width="10" height="24" rx="4"/></g>
      <ellipse class="el-body" cx="72" cy="40" rx="33" ry="21"/>
      <g class="el-leg el-back"><rect x="93" y="48" width="10" height="25" rx="4"/></g>
      <g class="el-leg el-front"><rect x="57" y="48" width="10" height="25" rx="4"/></g>
      <g class="el-head">
        <circle class="el-skull" cx="38" cy="33" r="16"/>
        <path class="el-trunk" d="M27 40 Q15 52 19 66" fill="none" stroke-width="7.5" stroke-linecap="round"/>
        <path class="el-tusk" d="M30 44 q-6 4 -11 2" fill="none" stroke-width="2.4" stroke-linecap="round"/>
        <ellipse class="el-ear" cx="50" cy="32" rx="11" ry="14"/>
        <circle class="el-eye" cx="32" cy="29" r="1.8"/>
      </g>
    </svg>`;
  }

  function initElephant() {
    const hero = document.querySelector('.hx-hero'); if (!hero || $('hx-herd')) return;
    const herd = document.createElement('a');
    herd.id = 'hx-herd'; herd.className = 'hx-herd';
    herd.href = 'https://erp.ngo'; herd.target = '_blank'; herd.rel = 'noopener';
    herd.title = '1% da receita protege elefantes e rinocerontes · erp.ngo';
    herd.setAttribute('aria-label', 'ERP.ngo: 1% da receita protege elefantes e rinocerontes');
    herd.innerHTML = elephantSVG('el-mae') + elephantSVG('el-filhote');
    hero.appendChild(herd);

    const els = [...herd.querySelectorAll('.hx-el')].map((svg, i) => ({
      svg, fase: i * 1.7,
      legs: [...svg.querySelectorAll('.el-leg')],
      trunk: svg.querySelector('.el-trunk'),
      tail: svg.querySelector('.el-tail'),
      head: svg.querySelector('.el-head'),
    }));
    // pivô de cada pata = topo (quadril/ombro)
    els.forEach(e => e.legs.forEach(g => {
      const r = g.querySelector('rect');
      g.style.transformOrigin = `${+r.getAttribute('x') + 5}px ${r.getAttribute('y')}px`;
      g.style.transformBox = 'view-box';
    }));

    const reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduz) { herd.classList.add('is-still'); return; }

    let x = null, pausaAte = 0, last = performance.now(), passo = 0;
    const VEL = 34;                 // px/s — passo calmo de manada
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const W = hero.clientWidth, w = herd.offsetWidth || 200;
      if (x === null) x = W * 0.62;
      const parado = now < pausaAte;
      if (!parado) {
        x -= VEL * dt; passo += dt * 5.2;
        if (x < -w - 20) { x = W + 20; }                       // reentra pela direita
        if (Math.random() < dt * 0.06) pausaAte = now + 2600;   // de vez em quando para pra "farejar"
      }
      herd.style.transform = `translateX(${x.toFixed(1)}px)`;
      els.forEach(e => {
        const t = passo + e.fase, t2 = now / 1000 + e.fase;
        const amp = parado ? 0 : 16;
        // passada diagonal: dianteira-perto + traseira-longe em fase
        const a = Math.sin(t) * amp, b = Math.sin(t + Math.PI) * amp;
        e.legs[0].style.transform = `rotate(${b}deg)`; // back-far
        e.legs[1].style.transform = `rotate(${a}deg)`; // front-far
        e.legs[2].style.transform = `rotate(${a}deg)`; // back
        e.legs[3].style.transform = `rotate(${b}deg)`; // front
        const bob = parado ? 0 : Math.abs(Math.sin(t)) * -1.4;
        e.svg.style.transform = `translateY(${bob.toFixed(2)}px)`;
        // tromba: balanço contínuo; parado = "fareja" pra cima
        const sway = parado ? 10 + Math.sin(t2 * 2.2) * 6 : Math.sin(t2 * 1.6) * 5;
        const cx = 15 - sway * 0.6, cy = 52 - sway * 0.5, ex = 19 - sway * 0.4, ey = 66 - sway * 1.1;
        e.trunk.setAttribute('d', `M27 40 Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
        e.tail.setAttribute('d', `M101 36 q${(9 + Math.sin(t2 * 3) * 3).toFixed(1)} 6 ${(7 + Math.sin(t2 * 3 + 1) * 4).toFixed(1)} 18`);
        e.head.style.transform = `rotate(${(parado ? -3 : Math.sin(t) * 1.2).toFixed(2)}deg)`;
      });
      if (!document.hidden) requestAnimationFrame(frame);
      else document.addEventListener('visibilitychange', () => { last = performance.now(); requestAnimationFrame(frame); }, { once: true });
    }
    requestAnimationFrame(frame);
  }

  // ── ÁREAS — cada card = porta de entrada + atalhos diretos (sem números) ──
  let AREAS = [];
  let MINHA_AREA = null; // área da persona ativa (vai pro topo, destacada)

  async function loadAreas() {
    if (AREAS.length) return AREAS;
    try { const d = await fetch('/api/areas.json').then(r => r.json()); AREAS = d.areas || []; } catch { AREAS = []; }
    return AREAS;
  }

  function areaLinks(a) {
    // ferramentas (com ícone/desc) + subabas que ainda não apareceram — dedup por href
    const seen = new Set(); const out = [];
    for (const f of (a.ferramentas || [])) if (f.href && !seen.has(f.href)) { seen.add(f.href); out.push(f); }
    for (const s of (a.subabas || [])) if (s.href && !seen.has(s.href)) { seen.add(s.href); out.push({ icon: '↗', ...s }); }
    return out;
  }

  async function renderAreas() {
    const target = $('areas-grid'); if (!target) return;
    const areas = (await loadAreas()).slice();
    if (!areas.length) { target.innerHTML = '<p class="hx-empty">Não consegui carregar as áreas agora.</p>'; return; }
    if (MINHA_AREA) areas.sort((x, y) => (y.id === MINHA_AREA) - (x.id === MINHA_AREA));
    target.innerHTML = areas.map(a => {
      const links = areaLinks(a);
      const vis = links.slice(0, 5), extra = links.length - vis.length;
      const dona = String(a.dona || '').replace(/\s*\(.*\)\s*$/, '');
      const mine = a.id === MINHA_AREA;
      return `<article class="hx-area${mine ? ' is-mine' : ''}" data-area="${esc(a.id)}">
        <a class="hx-area-head" href="/area/${esc(a.id)}">
          <span class="hx-area-ico" aria-hidden="true">${esc(a.icon || '📂')}</span>
          <span class="hx-area-id">
            ${mine ? '<span class="hx-pill">Sua área</span>' : ''}
            <span class="hx-area-nome">${esc(a.nome)}</span>
            <span class="hx-area-dona">${esc(dona)}</span>
          </span>
          <span class="hx-area-go" aria-hidden="true">→</span>
        </a>
        ${a.foco ? `<p class="hx-area-foco">${esc(a.foco)}</p>` : ''}
        <ul class="hx-area-links">
          ${vis.map(l => `<li><a href="${esc(l.href)}" title="${esc(l.desc || l.label)}"><span aria-hidden="true">${esc(l.icon || '↗')}</span>${esc(l.label)}</a></li>`).join('')}
          ${extra > 0 ? `<li><a class="hx-more" href="/area/${esc(a.id)}">Ver tudo da área</a></li>` : ''}
        </ul>
      </article>`;
    }).join('');
  }

  // ── EXPLORAR — resto do Office, fonte única: OFFICE_NAV_OVERFLOW (office-nav.js) ──
  async function renderExplorar() {
    const target = $('explore-grid'); if (!target) return;
    const nav = window.OFFICE_NAV_OVERFLOW || [];
    const areas = await loadAreas();
    const jaTem = new Set();
    areas.forEach(a => areaLinks(a).forEach(l => jaTem.add(l.href)));
    document.querySelectorAll('.hx-quick a[href]').forEach(el => jaTem.add(el.getAttribute('href')));
    const grupos = []; let cur = null;
    for (const it of nav) {
      if (it.section) { cur = { titulo: it.section, itens: [] }; grupos.push(cur); continue; }
      if (!cur || !it.href || jaTem.has(it.href)) continue;
      cur.itens.push(it);
    }
    const html = grupos.filter(g => g.itens.length).map(g => `
      <div class="hx-exp-group">
        <h3 class="hx-exp-title">${esc(g.titulo)}</h3>
        <ul>${g.itens.map(it => {
          const ext = it.external ? ' target="_blank" rel="noopener"' : '';
          return `<li><a href="${esc(it.href)}"${ext}>${esc(it.label)}${it.external ? ' <span aria-hidden="true">↗</span>' : ''}</a></li>`;
        }).join('')}</ul>
      </div>`).join('');
    target.innerHTML = html;
    const sec = document.querySelector('[data-sec="explorar"]');
    if (sec && !html) sec.hidden = true;
  }

  // ── AGENDA UNIFICADA (eventos + posts + artigos + MDF/deadlines + datas) ──
  // Cores = tokens do Brand Guide (secundárias + spot). Vermelho só em deadline.
  const MES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const MES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const T = n => `var(--color-${n})`;
  const LOB_CORES = {
    HCM: T('spot-azure-blue'), ERP: T('spot-teal-green'), Cross: T('brand-cornflower-blue'), BTP: T('spot-aws-orange'),
    Cloud: T('spot-french-blue'), Branding: T('brand-royal-blue'), Institucional: T('brand-service-line-blue'),
    WFS: T('brand-steel-blue'), SN: T('spot-servicenow-green'), BTM: T('brand-dark-slate-blue')
  };
  const ANO = new Date().getFullYear();
  const CAMADAS = [
    { id:'evento', label:'Eventos',       cor: T('spot-azure-blue') },
    { id:'artigo', label:'Artigos',       cor: T('brand-cornflower-blue') },
    { id:'post',   label:'Posts',         cor: T('spot-teal-green') },
    { id:'mdf',    label:'MDF/Deadlines', cor: T('brand-red') },
    { id:'data',   label:'Datas',         cor: T('spot-aws-orange') },
  ];
  let AG_ITEMS = [];
  const AG_ATIVAS = new Set(CAMADAS.map(c => c.id));

  const diaFromISO = iso => { const p = String(iso).split('-'); return p[2] ? String(parseInt(p[2], 10)) : '?'; };
  const mesFromISO = iso => { const p = String(iso).split('-'); return p[1] ? parseInt(p[1], 10) : null; };
  const parseDayNum = d => { const n = parseInt(String(d).replace(/[^0-9]/g, ''), 10); return isNaN(n) ? null : n; };
  const agVisiveis = () => AG_ITEMS.filter(i => AG_ATIVAS.has(i.camada));

  function agItem(e) {
    const tag = e.tag ? `<span class="hx-tag">${esc(e.tag)}</span>` : '';
    return `<li class="hx-ev" style="--c:${e.cor}">
      <span class="hx-ev-date"><b>${esc(e.d)}</b>${MES_CURTO[e.m - 1] || ''}</span>
      <span class="hx-ev-info">
        <span class="hx-ev-nome">${e.flag ? esc(e.flag) + ' ' : ''}${esc(e.n)}${tag}</span>
        ${e.who ? `<span class="hx-ev-who">${esc(e.who)}</span>` : ''}
      </span>
    </li>`;
  }

  function renderEventos() {
    const grid = $('evt-grid'); if (!grid) return;
    const items = agVisiveis();
    const hoje = new Date();
    const Y = hoje.getFullYear(), M = hoje.getMonth() + 1, todayD = hoje.getDate();
    const dim = new Date(Y, M, 0).getDate();
    const firstDow = new Date(Y, M - 1, 1).getDay();
    const isBR = i => !i.country || i.country === 'BR';

    const byDay = {};
    items.filter(i => i.m === M && isBR(i)).forEach(it => { const d = parseDayNum(it.d); if (d) (byDay[d] = byDay[d] || []).push(it); });

    let cells = ['D','S','T','Q','Q','S','S'].map(x => `<span class="hx-dow" aria-hidden="true">${x}</span>`).join('');
    for (let i = 0; i < firstDow; i++) cells += '<span class="hx-day is-empty"></span>';
    for (let d = 1; d <= dim; d++) {
      const list = byDay[d] || [];
      const dots = list.slice(0, 3).map(it => `<i style="--c:${it.cor}"></i>`).join('');
      const nomes = list.map(i => i.n).join(' · ');
      cells += `<span class="hx-day${d === todayD ? ' is-today' : ''}${list.length ? ' has' : ''}"${nomes ? ` title="${esc(nomes)}"` : ''}>
        <span class="hx-day-n">${d}</span><span class="hx-dots">${dots}</span></span>`;
    }

    const ordem = (a, b) => (a.m - b.m) || ((parseDayNum(a.d) || 99) - (parseDayNum(b.d) || 99));
    const proximos = items.filter(isBR)
      .filter(i => i.m > M || (i.m === M && (parseDayNum(i.d) || 0) >= todayD))
      .sort(ordem).slice(0, 8);
    const latam = items.filter(i => i.camada === 'evento' && !isBR(i) && i.m >= M).sort(ordem).slice(0, 20);

    grid.innerHTML = `
      <div class="hx-agenda">
        <div class="hx-cal" aria-label="Calendário de ${MES_NOMES[M - 1]}">
          <div class="hx-cal-head"><span>${MES_NOMES[M - 1]}</span><span class="hx-muted">${Y}</span></div>
          <div class="hx-cal-grid">${cells}</div>
        </div>
        <div class="hx-next">
          <h3 class="hx-mini-title">Próximos no Brasil</h3>
          ${proximos.length ? `<ul class="hx-ev-list">${proximos.map(agItem).join('')}</ul>` : '<p class="hx-empty">Nada no horizonte por aqui.</p>'}
        </div>
      </div>
      ${latam.length ? `<details class="hx-acc">
        <summary>🌎 LATAM &amp; Internacional</summary>
        <ul class="hx-ev-list">${latam.map(agItem).join('')}</ul>
      </details>` : ''}`;
  }

  async function initEventos() {
    try {
      const [ev, cal, dl, df, dat] = await Promise.all([
        fetch('/api/events.json').then(r => r.json()).catch(() => ({ abas: {} })),
        fetch(`/api/inbound/calendar?from=${ANO}-01-01&to=${ANO}-12-31`).then(r => r.json()).catch(() => ({ posts: [] })),
        fetch('/api/deadlines-2026.json').then(r => r.json()).catch(() => ({ itens: [] })),
        fetch('/api/development-funds').then(r => r.json()).catch(() => ({ requests: [] })),
        fetch('/api/datas-especiais-2026.json').then(r => r.json()).catch(() => ({ itens: [] })),
      ]);
      const cor = id => CAMADAS.find(c => c.id === id).cor;
      const items = [];
      // 1 — Eventos EPI-USE/SAP (BR + LATAM)
      for (const aba of Object.values(ev.abas || {})) {
        for (const e of (aba.eventos || [])) {
          if (!e.m) continue;
          const country = e.country || 'BR';
          items.push({ camada:'evento', m:e.m, d:String(e.d || 'TBC'), n:e.n, country,
            who:[e.who, country !== 'BR' ? country : ''].filter(Boolean).join(' · '),
            flag:e.flag || '', tag:e.lob || '', cor: LOB_CORES[e.lob] || cor('evento') });
        }
      }
      // 2 — Editorial (artigos Redatoria + posts Duda)
      for (const p of (cal.posts || [])) {
        const m = mesFromISO(p.data); if (!m) continue;
        const camada = p.fonte === 'redatoria' ? 'artigo' : 'post';
        items.push({ camada, m, d:diaFromISO(p.data), n:p.titulo || '(sem título)',
          who:[p.autor, p.canal].filter(Boolean).join(' · '), tag:p.pilar || '', cor: cor(camada) });
      }
      // 3 — Deadlines MDF gerais
      for (const it of (dl.itens || [])) {
        const m = mesFromISO(it.data); if (!m) continue;
        items.push({ camada:'mdf', m, d:diaFromISO(it.data), n:it.nome, who:'deadline SAP', tag:'MDF', cor: cor('mdf') });
      }
      // 4 — Claims DF a reclamar (expiração) — só não derrubados, claim pendente
      for (const r of (df.requests || [])) {
        if (r.derrubado || (+r.claim || 0) > 0 || !r.expiracao) continue;
        const m = mesFromISO(r.expiracao); if (!m) continue;
        items.push({ camada:'mdf', m, d:diaFromISO(r.expiracao), n:`Expira claim: ${r.nome}`,
          who: r.status || '', tag:'claim', cor: cor('mdf') });
      }
      // 5 — Datas comemorativas (sem feriado, pra não poluir)
      for (const it of (dat.itens || [])) {
        if (!it.data || !['comemorativa','premiacao','efemeride'].includes(it.tipo)) continue;
        const m = mesFromISO(it.data); if (!m) continue;
        items.push({ camada:'data', m, d:diaFromISO(it.data), n:it.nome, who:it.descricao || '', tag:'', cor: cor('data') });
      }
      AG_ITEMS = items;

      // Filtros por camada (chips on/off, sem contadores)
      const tabs = $('evt-tabs');
      if (tabs) {
        tabs.innerHTML = CAMADAS.map(c =>
          `<button type="button" class="hx-chip" aria-pressed="true" data-cam="${c.id}" style="--c:${c.cor}"><i aria-hidden="true"></i>${c.label}</button>`
        ).join('');
        tabs.querySelectorAll('.hx-chip').forEach(btn => btn.addEventListener('click', () => {
          const id = btn.dataset.cam, on = !AG_ATIVAS.has(id);
          on ? AG_ATIVAS.add(id) : AG_ATIVAS.delete(id);
          btn.setAttribute('aria-pressed', String(on));
          renderEventos();
        }));
      }
      renderEventos();
    } catch (e) {
      const g = $('evt-grid'); if (g) g.innerHTML = '<p class="hx-empty">Não consegui carregar a agenda agora.</p>';
    }
  }

  // ── ANIVERSÁRIOS ────────────────────────────────────────────────
  async function renderBdays() {
    const target = $('bday-grid');
    try {
      const r = await fetch('/api/team.json'); const team = await r.json();
      const all = [
        ...(team.lideranca || []).map(p => ({ nome: p.nome, papel: p.cargo, icon: p.icon, color: '#6797b8', aniversario: p.aniversario })),
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

      // ── confete/lembrete de aniversário ──
      const bdayToday = sorted.filter(p => p._days === 0);
      if (bdayToday.length) {
        const me = await getNome();
        const meLower = (me || '').toLowerCase();
        const isMeBday = bdayToday.some(p => p.nome.toLowerCase().startsWith(meLower));
        const todayKey = 'bday-seen-' + today.toISOString().slice(0, 10);

        if (isMeBday && !localStorage.getItem(todayKey)) {
          localStorage.setItem(todayKey, '1');
          const outros = all.filter(p => !p.nome.toLowerCase().startsWith(meLower)).map(p => p.nome.split(' ')[0]);
          showBdayConfetti(me, outros);
        } else if (!isMeBday && !localStorage.getItem(todayKey + '-toast')) {
          localStorage.setItem(todayKey + '-toast', '1');
          const nomes = bdayToday.map(p => p.nome.split(' ')[0]);
          showBdayToast(nomes);
        }
      }

      target.innerHTML = sorted.map(p => {
        const isToday = p._days === 0;
        const isSoon = p._days > 0 && p._days <= 30;
        const badge = isToday ? `<span class="home-bday-badge today">🎉 HOJE</span>`
          : isSoon ? `<span class="home-bday-badge soon">em ${p._days}d</span>`
          : `<span class="home-bday-badge future">em ${p._days}d</span>`;
        const grad = isToday ? 'var(--color-brand-red)' : 'linear-gradient(135deg,var(--color-brand-service-line-blue),var(--color-brand-cornflower-blue))';
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

  // ── CONFETE (só pro aniversariante, 1x/dia) ────────────────────
  function showBdayConfetti(nome, outrosNomes) {
    var ov = document.createElement('div');
    ov.id = 'bday-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;overflow:hidden';
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    ov.appendChild(cv);
    var assinatura = outrosNomes.length ? outrosNomes.join(', ') : 'Todo o time';
    var banner = document.createElement('div');
    banner.id = 'bday-banner';
    banner.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);'
      + 'background:linear-gradient(135deg,#001844 0%,#26476b 100%);border:3px solid #CE181E;border-radius:24px;'
      + 'padding:40px 56px;text-align:center;font-family:Lato,sans-serif;'
      + 'box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 80px rgba(206,24,30,.3);'
      + 'pointer-events:auto;cursor:pointer;opacity:0;'
      + 'transition:transform .6s cubic-bezier(.34,1.56,.64,1),opacity .4s ease';
    banner.innerHTML = '<div style="font-size:52px;margin-bottom:12px">🎂🎉🥳</div>'
      + '<div style="font-size:28px;font-weight:700;color:#fff;line-height:1.3;margin-bottom:8px">'
      + 'Feliz Aniversário, ' + esc(nome) + '!</div>'
      + '<div style="font-size:15px;color:#6797b8;line-height:1.5;max-width:340px;margin:0 auto 16px">'
      + 'O escritório inteiro celebra você hoje.<br>Obrigado por liderar essa manada! 🐘</div>'
      + '<div style="font-size:13px;color:#f2f2f2;margin-top:12px">' + esc(assinatura) + ' ❤️</div>'
      + '<div style="font-size:11px;color:rgba(103,151,184,.5);margin-top:8px">clique pra fechar</div>';
    ov.appendChild(banner);
    document.body.appendChild(ov);

    var ctx = cv.getContext('2d'), W, H, pieces = [];
    var colors = ['#CE181E','#001844','#26476b','#6797b8','#487494','#f89921','#53bb41','#f2f2f2'];
    function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    function Piece() {
      this.x = Math.random() * W; this.y = Math.random() * H - H;
      this.w = 6 + Math.random() * 8; this.h = 4 + Math.random() * 6;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.vy = 1.5 + Math.random() * 3; this.vx = (Math.random() - .5) * 2;
      this.rot = Math.random() * 360; this.rv = (Math.random() - .5) * 8;
    }
    for (var i = 0; i < 200; i++) pieces.push(new Piece());
    var duration = 8000, started = Date.now();
    function draw() {
      var elapsed = Date.now() - started;
      ctx.clearRect(0, 0, W, H);
      var ga = elapsed > duration - 2000 ? Math.max(0, 1 - (elapsed - (duration - 2000)) / 2000) : 1;
      pieces.forEach(function(p) {
        p.x += p.vx; p.y += p.vy; p.rot += p.rv;
        if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
        ctx.globalAlpha = ga; ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (elapsed < duration) requestAnimationFrame(draw);
      else cv.style.display = 'none';
    }
    draw();
    setTimeout(function() {
      banner.style.transform = 'translate(-50%,-50%) scale(1)'; banner.style.opacity = '1';
    }, 300);
    banner.addEventListener('click', function() {
      ov.style.transition = 'opacity .5s'; ov.style.opacity = '0';
      setTimeout(function() { ov.remove(); }, 600);
    });
  }

  // ── TOAST LEMBRETE (pros demais, 1x/dia) ───────────────────────
  function showBdayToast(nomes) {
    var txt = nomes.length === 1
      ? 'Hoje é aniversário do(a) ' + nomes[0] + '! 🎂🎉'
      : 'Hoje é aniversário de ' + nomes.join(' e ') + '! 🎂🎉';
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);'
      + 'z-index:99998;background:linear-gradient(135deg,#001844,#26476b);border:2px solid #CE181E;'
      + 'border-radius:16px;padding:16px 28px;font-family:Lato,sans-serif;font-size:15px;color:#fff;'
      + 'box-shadow:0 8px 32px rgba(0,0,0,.4);opacity:0;transition:opacity .4s,transform .4s;cursor:pointer;'
      + 'text-align:center;max-width:400px';
    toast.textContent = txt;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    toast.addEventListener('click', function() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 400);
    });
    setTimeout(function() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 400);
    }, 8000);
  }

  // ── HOME POR ROLE — persona define ordem das seções e atalhos ──
  let PERSONAS = null;

  // Override manual do "Ver como". Formato novo: JSON {persona, for:<email|null>}.
  // Aceita formato legado (string crua) e migra na leitura.
  function readPersonaOverride() {
    let raw = null;
    try { raw = localStorage.getItem('office.persona'); } catch { return null; }
    if (!raw) return null;
    if (raw[0] === '{') {
      try { const o = JSON.parse(raw); return (o && o.persona) ? { persona: o.persona, for: o.for || null } : null; }
      catch { return null; }
    }
    return { persona: raw, for: null }; // legado
  }
  function writePersonaOverride(persona, email) {
    try { localStorage.setItem('office.persona', JSON.stringify({ persona, for: email || null })); } catch {}
  }
  function clearPersonaOverride() {
    try { localStorage.removeItem('office.persona'); } catch {}
  }

  // Persona vem de: SSO (DB) quando autenticado > override manual ("Ver como") > visitante.
  // Regra-chave: quando logado via SSO, a persona do login é AUTORITATIVA — um override
  // antigo só é honrado se foi escolhido pela MESMA identidade logada (preview do próprio).
  async function getPersonaId() {
    let st = null;
    try { st = await fetch('/api/auth/status').then(r => r.json()); } catch {}
    const ov = readPersonaOverride();
    const ovValid = ov && PERSONAS?.personas?.[ov.persona];

    if (st && st.authenticated) {
      const email = (st.user && st.user.email || '').toLowerCase();
      // Persona do SSO: do DB (st.persona) ou fallback mapa email -> persona.
      let ssoPersona = (st.persona && PERSONAS?.personas?.[st.persona]) ? st.persona : null;
      if (!ssoPersona && email && PERSONAS?.emails?.[email]) ssoPersona = PERSONAS.emails[email];
      // Preview do próprio usuário (override marcado pra este email) tem prioridade.
      if (ovValid && ov.for && ov.for === email) return ov.persona;
      // Override stale (de outra identidade ou legado) não pode sequestrar o login: descarta.
      if (ov && (!ov.for || ov.for !== email)) clearPersonaOverride();
      return ssoPersona || 'visitante';
    }

    // Não autenticado: override manual segue valendo (exploração livre).
    if (ovValid) return ov.persona;
    return 'visitante';
  }

  // Persona → área própria (card "Sua área" vai pro topo)
  const PERSONA_AREA = { duda:'brand', bruna:'intelligence', gui:'growth', field:'eventos', marlison:'pipeline', conteudo:'conteudo' };

  function applyPersona(pid) {
    const p = PERSONAS?.personas?.[pid];
    if (!p) return;
    const wrap = document.querySelector('.hx-wrap');
    (p.ordem || []).forEach(secId => {
      const el = document.querySelector(`[data-sec="${secId}"]`);
      if (el && wrap) { el.hidden = false; wrap.appendChild(el); }
    });
    (p.esconde || []).forEach(secId => {
      const el = document.querySelector(`[data-sec="${secId}"]`);
      if (el) el.hidden = true;
    });
    MINHA_AREA = p.area || PERSONA_AREA[pid] || null;
    renderQuick(p);
    renderAreas().then(renderExplorar);
  }

  // ── Atalhos por persona (personas.json → quick[] | quick_default[]) ──
  function renderQuick(p) {
    const items = (p && p.quick && p.quick.length) ? p.quick : (PERSONAS?.quick_default || []);
    const box = document.querySelector('.hx-quick');
    if (!box) return;
    box.innerHTML = items.map(it => {
      if (it.modal) {
        return `<a href="#" data-modal="${esc(it.modal)}"><span class="hx-q-ico" aria-hidden="true">${esc(it.icon || '🔗')}</span><span>${esc(it.label)}</span></a>`;
      }
      const ext = it.external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${esc(it.href)}"${ext}><span class="hx-q-ico" aria-hidden="true">${esc(it.icon || '🔗')}</span><span>${esc(it.label)}${it.external ? ' ↗' : ''}</span></a>`;
    }).join('');
    box.querySelectorAll('a[data-modal]').forEach(a => a.addEventListener('click', ev => {
      ev.preventDefault(); if (typeof window.openReportModal === 'function') window.openReportModal(a.dataset.modal);
    }));
    const sec = document.querySelector('[data-sec="atalhos"]');
    if (sec) sec.hidden = !items.length;
  }

  async function initPersonas() {
    try {
      PERSONAS = await fetch('/api/personas.json').then(r => r.json());
    } catch (e) { PERSONAS = null; }
    const pid = PERSONAS ? await getPersonaId() : 'visitante';
    let currentEmail = null;
    try { const st = await fetch('/api/auth/status').then(r => r.json()); currentEmail = (st && st.user && st.user.email || '').toLowerCase() || null; } catch {}
    const sel = $('persona-select');
    if (sel && PERSONAS) {
      sel.innerHTML = Object.entries(PERSONAS.personas).map(([id, p]) =>
        `<option value="${esc(id)}" ${id === pid ? 'selected' : ''}>${esc(p.icon)} Ver como: ${esc(p.nome)}</option>`).join('');
      sel.addEventListener('change', () => {
        writePersonaOverride(sel.value, currentEmail);
        applyPersona(sel.value);
        renderHero();
      });
    } else if (sel) sel.closest('label').hidden = true;
    if (PERSONAS) applyPersona(pid);
    else { renderQuick(null); renderAreas().then(renderExplorar); }
  }

  function init() {
    renderHero();
    initSearch();
    initElephant();
    initPersonas();
    initEventos();
    renderBdays();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
