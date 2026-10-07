// horas.js — Banco de Horas MKT (Módulo 32 · v2)
// Registro rápido (chips + stepper), prévia do saldo, gráfico de 6 meses,
// histórico agrupado por mês com saldo corrido, editar/apagar com desfazer e
// painel do time pro super admin (a flag `admin` vem do servidor).
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const MES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const CIRC = 2 * Math.PI * 86;

  const ICO_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  const ICO_DEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';

  const S = {
    resumo: null,      // /api/horas/resumo
    registros: [],     // histórico exibido
    vendo: null,       // e-mail de outra pessoa (só admin) ou null
    filtro: 'todos',
    tipo: 'mais',
    horas: 1,
    categoria: 'outro',
    editId: null,
    novoId: null,
  };

  // ── formatação ─────────────────────────────────────────────
  function fmtH(h, sinal = true) {
    const a = Math.abs(h);
    const hh = Math.floor(a + 1e-9), mm = Math.round((a - hh) * 60);
    const corpo = mm ? (hh ? `${hh}h${String(mm).padStart(2, '0')}` : `${mm}min`) : `${hh}h`;
    if (!sinal || h === 0) return h === 0 ? '0h' : corpo;
    return (h > 0 ? '+' : '−') + corpo;
  }
  const tom = h => h > 0 ? 'mais' : h < 0 ? 'menos' : '';
  const isoLocal = d => d.toLocaleDateString('sv-SE');
  function hojeMenos(n) { const d = new Date(); d.setDate(d.getDate() - n); return isoLocal(d); }
  function parseIso(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
  function fmtDataCurta(iso) {
    if (!iso) return '—';
    if (iso === hojeMenos(0)) return 'hoje';
    if (iso === hojeMenos(1)) return 'ontem';
    const d = parseIso(iso);
    return `${d.getDate()} ${MES_C[d.getMonth()]}`;
  }
  const primeiro = n => String(n || '').trim().split(/\s+/)[0] || '';
  const iniciais = (n, e) => (String(n || e || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('') || '?').toUpperCase();

  // ── toast ──────────────────────────────────────────────────
  let toastT = null;
  function toast(msg, { erro = false, desfazer = null } = {}) {
    const t = $('toast'), b = $('toast-btn');
    $('toast-txt').textContent = msg;
    t.classList.toggle('err', erro);
    b.hidden = !desfazer;
    b.onclick = desfazer ? () => { t.classList.remove('on'); desfazer(); } : null;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), desfazer ? 6000 : 3200);
  }

  async function api(url, opts = {}) {
    const r = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
    if (r.status === 401) { location.href = '/login?returnTo=/horas'; throw new Error('auth'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Erro ao falar com o servidor.');
    return d;
  }

  // ── HERO / ANEL ────────────────────────────────────────────
  function renderHero() {
    const R = S.resumo; if (!R) return;
    const saldo = R.saldo, lim = R.limite || 8;
    const wrap = $('ring-wrap');
    const cor = saldo > 0 ? 'var(--o-mais)' : saldo < 0 ? 'var(--o-menos)' : 'var(--o-corn)';
    wrap.style.setProperty('--tone', cor);
    contaAte($('saldo-num'), saldo);
    // O anel mostra o caminho até o próximo aviso (múltiplos de 8h).
    const frac = saldo > 0 ? ((saldo % lim) || (saldo >= lim ? lim : 0)) / lim : Math.min(Math.abs(saldo) / lim, 1);
    requestAnimationFrame(() => { $('ring-arc').style.strokeDashoffset = String(CIRC * (1 - frac)); });
    $('ring-sub').textContent = saldo > 0
      ? (saldo >= lim ? `Passou de +${Math.floor(saldo / lim) * lim}h. O Rudá já foi avisado.` : `Faltam ${fmtH(lim - saldo, false)} pro aviso de +${lim}h.`)
      : saldo < 0 ? 'Você está devendo horas. Sem pressa: compense quando der.' : 'Tudo zerado. Nada a compensar.';
    $('st-mais').textContent = R.mes.mais ? fmtH(R.mes.mais) : '0h';
    $('st-menos').textContent = R.mes.menos ? fmtH(-R.mes.menos) : '0h';
    $('st-ult').textContent = fmtDataCurta(R.ultimo_registro);
    const nome = primeiro(R.nome);
    if (nome) $('hero-txt').textContent = `Oi, ${nome}. Registre quando ficar a mais ou sair mais cedo. O saldo acumula sem prazo de validade e só você vê o seu.`;
  }

  function contaAte(el, alvo) {
    const de = parseFloat(el.dataset.v || '0');
    el.dataset.v = String(alvo);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || de === alvo) { el.textContent = fmtH(alvo); return; }
    const t0 = performance.now(), dur = 900;
    const passo = t => {
      const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmtH(Math.round((de + (alvo - de) * e) * 2) / 2);
      if (k < 1) requestAnimationFrame(passo); else el.textContent = fmtH(alvo);
    };
    requestAnimationFrame(passo);
  }

  // ── FORM ───────────────────────────────────────────────────
  function renderCategorias() {
    const cats = (S.resumo && S.resumo.categorias) || { outro: 'Outro' };
    $('chips-c').innerHTML = Object.entries(cats).map(([k, v]) =>
      `<button type="button" class="chip" data-c="${esc(k)}" aria-pressed="${k === S.categoria}">${esc(v)}</button>`).join('');
  }

  function syncForm() {
    document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tipo === S.tipo)));
    document.querySelectorAll('#chips-h .chip').forEach(b => b.setAttribute('aria-pressed', String(parseFloat(b.dataset.h) === S.horas)));
    document.querySelectorAll('#chips-c .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === S.categoria)));
    const dv = $('f-date').value;
    document.querySelectorAll('#chips-d .chip').forEach(b => b.setAttribute('aria-pressed', String(hojeMenos(+b.dataset.d) === dv)));
    $('h-out').textContent = fmtH(S.horas, false);
    const val = S.tipo === 'mais' ? S.horas : -S.horas;
    const btn = $('f-submit');
    btn.className = 'btn submit ' + S.tipo;
    btn.textContent = (S.editId ? 'Salvar ' : 'Registrar ') + fmtH(val);
    renderPrevia(val);
  }

  function renderPrevia(val) {
    const R = S.resumo; if (!R) return;
    let atual = R.saldo;
    if (S.editId) { const r = S.registros.find(x => x.id === S.editId); if (r) atual -= r.hours; }
    const depois = Math.round((atual + val) * 100) / 100;
    const lim = R.limite || 8;
    const el = $('prev-num');
    el.textContent = fmtH(depois);
    el.style.color = depois > 0 ? 'var(--o-mais-l)' : depois < 0 ? 'var(--o-menos-l)' : 'var(--o-text)';
    $('prev-arrow').textContent = `saldo atual ${fmtH(R.saldo)} → ${fmtH(depois)}`;
    const prox = Math.max(lim, (Math.floor(Math.max(depois, 0) / lim) + 1) * lim);
    const pct = depois > 0 ? Math.min(100, (depois / prox) * 100) : 0;
    $('prev-bar').style.width = pct + '%';
    $('prev-meta').textContent = depois > 0 ? `${fmtH(depois, false)} de ${prox}h` : 'Saldo zerado ou negativo não gera aviso.';
  }

  function setHoras(h) { S.horas = Math.min(16, Math.max(0.5, Math.round(h * 2) / 2)); syncForm(); }

  function resetForm() {
    S.editId = null; S.tipo = 'mais'; S.horas = 1; S.categoria = 'outro';
    $('f-date').value = hojeMenos(0);
    $('f-reason').value = '';
    $('edit-bar').classList.remove('on');
    syncForm();
  }

  function iniciarEdicao(r) {
    S.editId = r.id;
    S.tipo = r.hours < 0 ? 'menos' : 'mais';
    S.horas = Math.abs(r.hours);
    S.categoria = r.categoria && S.resumo.categorias[r.categoria] ? r.categoria : 'outro';
    $('f-date').value = r.date;
    $('f-reason').value = r.reason || '';
    $('edit-txt').textContent = `Editando o registro de ${fmtDataCurta(r.date)} (${fmtH(r.hours)})`;
    $('edit-bar').classList.add('on');
    syncForm();
    $('registrar').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hookForm() {
    document.querySelector('.seg').addEventListener('click', e => {
      const b = e.target.closest('button[data-tipo]'); if (!b) return;
      S.tipo = b.dataset.tipo; syncForm();
    });
    $('chips-h').addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (b) setHoras(parseFloat(b.dataset.h)); });
    $('h-mais').addEventListener('click', () => setHoras(S.horas + 0.5));
    $('h-menos').addEventListener('click', () => setHoras(S.horas - 0.5));
    $('chips-d').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; $('f-date').value = hojeMenos(+b.dataset.d); syncForm(); });
    $('f-date').addEventListener('change', syncForm);
    $('chips-c').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; S.categoria = b.dataset.c; syncForm(); });
    $('edit-cancel').addEventListener('click', resetForm);

    $('form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('f-submit');
      const payload = {
        date: $('f-date').value,
        hours: S.tipo === 'mais' ? S.horas : -S.horas,
        reason: $('f-reason').value.trim(),
        categoria: S.categoria,
      };
      btn.disabled = true;
      try {
        const antes = S.resumo ? S.resumo.saldo : 0;
        if (S.editId) {
          await api('/api/horas/' + S.editId, { method: 'PATCH', body: JSON.stringify(payload) });
          toast('Registro atualizado.');
        } else {
          const d = await api('/api/horas', { method: 'POST', body: JSON.stringify(payload) });
          S.novoId = d.id;
          toast(`Registrado ${fmtH(payload.hours)}. Saldo: ${fmtH(d.saldo)}.`);
          const lim = (S.resumo && S.resumo.limite) || 8;
          if (Math.floor(d.saldo / lim) > Math.floor(antes / lim) && d.saldo >= lim) confete();
        }
        S.vendo = null;
        resetForm();
        await carregar();
        $('historico').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        if (err.message !== 'auth') toast(err.message, { erro: true });
      } finally { btn.disabled = false; }
    });

    // Atalho N → foca o registro (fora de campos de texto)
    document.addEventListener('keydown', e => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName)) return;
      e.preventDefault();
      $('registrar').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => $('f-reason').focus({ preventScroll: true }), 350);
    });
  }

  // ── GRÁFICO ────────────────────────────────────────────────
  function renderChart(serie) {
    const max = Math.max(1, ...serie.map(s => Math.max(s.mais, s.menos)));
    const atual = isoLocal(new Date()).slice(0, 7);
    $('chart').innerHTML = serie.map((s, i) => {
      const m = parseInt(s.mes.slice(5), 10) - 1;
      const hM = (s.mais / max) * 100, hN = (s.menos / max) * 100;
      return `<div class="col${s.mes === atual ? ' atual' : ''}" title="${MES[m]}: +${s.mais}h / −${s.menos}h">
        <div class="up">${s.mais ? `<div class="bar m" style="height:${hM}%;--i:${i}"></div>` : ''}</div>
        <div class="mid"><div class="val">${s.mais ? fmtH(s.mais) : ''}</div><div class="axis"></div><div class="val">${s.menos ? fmtH(-s.menos) : ''}</div></div>
        <div class="dn">${s.menos ? `<div class="bar n" style="height:${hN}%;--i:${i}"></div>` : ''}</div>
        <div class="mes">${MES_C[m]}</div>
      </div>`;
    }).join('');
    const tot = serie.reduce((a, s) => a + s.mais - s.menos, 0);
    $('chart-sub').textContent = `Horas a mais e a menos por mês · saldo do período ${fmtH(Math.round(tot * 100) / 100)}.`;
  }

  // ── HISTÓRICO ──────────────────────────────────────────────
  function renderHist() {
    const box = $('hist');
    const meu = !S.vendo;
    // saldo corrido: do mais antigo pro mais novo
    const asc = [...S.registros].reverse();
    let acc = 0; const corrido = {};
    asc.forEach(r => { acc = Math.round((acc + r.hours) * 100) / 100; corrido[r.id] = acc; });

    const lista = S.registros.filter(r => S.filtro === 'todos' || (S.filtro === 'mais' ? r.hours > 0 : r.hours < 0));
    if (!lista.length) {
      box.innerHTML = S.registros.length
        ? '<div class="vazio card">Nada com esse filtro.</div>'
        : `<div class="vazio card"><span class="em">🕰️</span>${meu ? 'Nenhum registro ainda. Que tal começar pelo de hoje?' : 'Essa pessoa ainda não registrou horas.'}</div>`;
      return;
    }
    const grupos = [];
    lista.forEach(r => {
      const k = r.date.slice(0, 7);
      let g = grupos[grupos.length - 1];
      if (!g || g.k !== k) { g = { k, itens: [], mais: 0, menos: 0 }; grupos.push(g); }
      g.itens.push(r); if (r.hours > 0) g.mais += r.hours; else g.menos -= r.hours;
    });
    const cats = (S.resumo && S.resumo.categorias) || {};
    const souAdmin = S.resumo && S.resumo.admin;
    let i = 0;
    box.innerHTML = grupos.map(g => {
      const [y, m] = g.k.split('-').map(Number);
      return `<div class="mes-grp">
        <div class="mes-h">${MES[m - 1]} ${y}<span>${g.mais ? fmtH(g.mais) : ''}${g.mais && g.menos ? ' · ' : ''}${g.menos ? fmtH(-g.menos) : ''}</span></div>
        <div class="lst">${g.itens.map(r => {
          const d = parseIso(r.date);
          const cat = cats[r.categoria] ? `<span class="cat">${esc(cats[r.categoria])}</span>` : '';
          const podeEditar = meu;
          const podeApagar = meu || souAdmin;
          return `<div class="it${r.id === S.novoId ? ' novo' : ''}" style="--i:${i++}">
            <div class="dt"><b>${d.getDate()}</b><small>${DOW[d.getDay()]}</small></div>
            <div class="hrs ${tom(r.hours)}">${fmtH(r.hours)}</div>
            <div class="it-tx"><div class="mot">${esc(r.reason) || '<span style="color:var(--o-muted)">sem motivo</span>'}</div><div class="meta">${cat}${r.updated_at ? 'editado' : ''}</div></div>
            <div class="run" title="Saldo depois deste registro">saldo ${fmtH(corrido[r.id])}</div>
            <div class="acts">
              ${podeEditar ? `<button type="button" class="ico" data-edit="${r.id}" aria-label="Editar registro de ${fmtDataCurta(r.date)}">${ICO_EDIT}</button>` : ''}
              ${podeApagar ? `<button type="button" class="ico del" data-del="${r.id}" aria-label="Apagar registro de ${fmtDataCurta(r.date)}">${ICO_DEL}</button>` : ''}
            </div>
          </div>`;
        }).join('')}</div>
      </div>`;
    }).join('');
    S.novoId = null;
  }

  function hookHist() {
    $('hist').addEventListener('click', async e => {
      const ed = e.target.closest('[data-edit]');
      if (ed) { const r = S.registros.find(x => x.id === +ed.dataset.edit); if (r) iniciarEdicao(r); return; }
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const r = S.registros.find(x => x.id === +del.dataset.del); if (!r) return;
      try {
        await api('/api/horas/' + r.id, { method: 'DELETE' });
        if (S.editId === r.id) resetForm();
        await carregar();
        const meu = !S.vendo;
        toast(`Registro de ${fmtDataCurta(r.date)} (${fmtH(r.hours)}) apagado.`, {
          desfazer: meu ? async () => {
            try {
              const d = await api('/api/horas', { method: 'POST', body: JSON.stringify({ date: r.date, hours: r.hours, reason: r.reason, categoria: r.categoria || 'outro' }) });
              S.novoId = d.id; await carregar(); toast('Registro restaurado.');
            } catch (err) { toast(err.message, { erro: true }); }
          } : null,
        });
      } catch (err) { if (err.message !== 'auth') toast(err.message, { erro: true }); }
    });
    document.querySelector('.filtros').addEventListener('click', e => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      S.filtro = b.dataset.f;
      document.querySelectorAll('.filtros .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      renderHist();
    });
    $('viewing-back').addEventListener('click', () => { S.vendo = null; carregarHist(); renderTime(); });
  }

  // ── TIME (super admin) ─────────────────────────────────────
  function renderTime() {
    const R = S.resumo;
    const sec = $('sec-time');
    if (!R || !R.admin) { sec.hidden = true; return; }
    sec.hidden = false;
    const time = R.time || [];
    $('team').innerHTML = time.length ? time.map((p, i) => {
      const nome = p.user_name || p.user_email.split('@')[0];
      return `<button type="button" class="tc${p.alerta ? ' alerta' : ''}" style="--i:${i}" data-email="${esc(p.user_email)}" data-nome="${esc(nome)}" aria-pressed="${S.vendo === p.user_email}">
        <div class="tc-top"><div class="av">${esc(iniciais(p.user_name, p.user_email))}</div>
          <div><div class="tc-nm">${esc(nome)}</div><div class="tc-em">${esc(p.user_email)}</div></div></div>
        <div class="tc-sd ${tom(p.saldo)}">${fmtH(p.saldo)}</div>
        <div class="tc-ft">${fmtH(p.mais)} · ${fmtH(-p.menos)} · ${p.registros} registro${p.registros === 1 ? '' : 's'} · último ${fmtDataCurta(p.ultimo_registro)}</div>
        ${p.alerta ? `<span class="tag-al">⚠ passou de +${R.limite}h</span>` : ''}
      </button>`;
    }).join('') : '<div class="vazio card" style="grid-column:1/-1">Ninguém registrou horas ainda.</div>';
  }

  function hookTime() {
    $('team').addEventListener('click', e => {
      const b = e.target.closest('.tc'); if (!b) return;
      const meuEmail = S.resumo && S.resumo.email;
      S.vendo = b.dataset.email === meuEmail ? null : b.dataset.email;
      renderTime();
      carregarHist(b.dataset.nome);
      $('historico').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ── CARGA ──────────────────────────────────────────────────
  async function carregarHist(nome) {
    const url = S.vendo ? `/api/horas?limit=500&email=${encodeURIComponent(S.vendo)}` : '/api/horas?limit=500';
    try {
      const d = await api(url);
      S.registros = d.registros || [];
      if (S.vendo) {
        const n = nome || (S.resumo.time || []).find(p => p.user_email === S.vendo)?.user_name || S.vendo;
        $('hist-title').textContent = `Histórico de ${primeiro(n)}`;
        $('viewing-txt').textContent = `Você está vendo os registros de ${n} (saldo ${fmtH(d.saldo)}).`;
        $('viewing').classList.add('on');
        renderChart(d.serie || []);
      } else {
        $('hist-title').textContent = 'Meu histórico';
        $('viewing').classList.remove('on');
        renderChart(S.resumo.serie || []);
      }
      renderHist();
    } catch (err) {
      if (err.message !== 'auth') $('hist').innerHTML = '<div class="vazio card">Não deu pra carregar o histórico.</div>';
    }
  }

  async function carregar() {
    S.resumo = await api('/api/horas/resumo');
    renderHero();
    if (!$('chips-c').children.length) renderCategorias();
    renderTime();
    syncForm();
    await carregarHist();
  }

  // ── confete leve ao cruzar +8h ─────────────────────────────
  function confete() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('confetti'), ctx = cv.getContext('2d');
    const W = cv.width = innerWidth, H = cv.height = innerHeight;
    const css = getComputedStyle(document.documentElement);
    const cores = ['--o-mais', '--o-corn', '--o-red', '--o-warn'].map(v => css.getPropertyValue(v).trim() || 'white');
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 3, r: Math.random() * 6.3, vr: (Math.random() - .5) * .3, c: cores[Math.floor(Math.random() * cores.length)] }));
    const t0 = performance.now();
    (function f(t) {
      ctx.clearRect(0, 0, W, H);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-4, -2.5, 8, 5); ctx.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(f); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  // ── reveal ao rolar ────────────────────────────────────────
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    $('f-date').value = hojeMenos(0);
    $('f-date').max = hojeMenos(0);
    hookForm(); hookHist(); hookTime(); initReveal();
    // Deep links do menu/⌘K: /horas#registrar e /horas?tipo=menos&h=2
    const q = new URLSearchParams(location.search);
    if (q.get('tipo') === 'menos') S.tipo = 'menos';
    if (q.get('h')) S.horas = Math.min(16, Math.max(0.5, Math.round(parseFloat(q.get('h')) * 2) / 2)) || 1;
    syncForm();
    carregar().then(() => {
      if (location.hash === '#registrar' || q.has('tipo') || q.has('h')) {
        $('registrar').classList.add('in');
        $('registrar').scrollIntoView({ block: 'start' });
        $('f-reason').focus({ preventScroll: true });
      }
    }).catch(err => { if (err.message !== 'auth') toast(err.message, { erro: true }); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
