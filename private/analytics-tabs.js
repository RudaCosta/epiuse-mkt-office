// Abas do Analytics — a ÚNICA área de tracking do Office (pedido Rudá, 14/out/2026:
// "os menus e botões de tracking têm que ser uma área só").
// Fica em private/ e é servido por /admin/analytics-tabs.js só pro e-mail do dono
// (requireOwner): a lista de painéis não aparece pra mais ninguém, nem no código-fonte.
// Uso: <script src="/admin/analytics-tabs.js"></script> no ponto onde as abas entram.
(function () {
  var TABS = [
    ['📊', 'Uso do Office', '/admin/analytics'],
    ['🎓', 'Onboarding', '/admin/analytics#onboarding'],
    ['🧠', 'Intelligence', '/admin/intelligence'],
    ['🎪', 'Eventos', '/admin/eventos'],
    ['🎯', 'Pipeline', '/admin/pipeline'],
    ['🎨', 'Brand', '/admin/brand'],
    ['📈', 'Relatório', '/admin/relatorio'],
    ['🏁', 'Metas FY27', '/admin/metas'],
    ['🏢', 'Marketing Hub', '/admin/hub'],
    ['☕', 'Cafezinho', '/cafezinho/tracking']
  ];
  var me = document.currentScript;
  if (!me) return;
  var css = document.createElement('style');
  css.textContent =
    '.an-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;margin:0 0 20px;padding:4px;border-radius:999px;' +
    'background:color-mix(in srgb,var(--color-brand-steel-blue) 18%,transparent);border:1px solid color-mix(in srgb,var(--color-brand-cornflower-blue) 22%,transparent)}' +
    '.an-tabs::-webkit-scrollbar{display:none}' +
    '.an-tabs a{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;font:700 12.5px/1.2 Lato,"Open Sans",system-ui,sans-serif;' +
    'color:var(--color-text-muted);text-decoration:none;white-space:nowrap;transition:background .2s,color .2s}' +
    '.an-tabs a:hover{color:var(--color-text);background:color-mix(in srgb,var(--color-brand-cornflower-blue) 16%,transparent)}' +
    '.an-tabs a[aria-current]{color:var(--color-text);background:var(--color-brand-royal-blue);box-shadow:0 0 0 1px color-mix(in srgb,var(--color-brand-cornflower-blue) 45%,transparent)}' +
    '.an-tabs .an-lock{flex:0 0 auto;align-self:center;padding:0 10px 0 6px;font:700 11px/1 Lato,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--color-text-dim)}' +
    '@media (min-width:900px){.an-tabs{flex-wrap:wrap;overflow:visible;border-radius:22px}}';
  document.head.appendChild(css);

  var path = location.pathname.replace(/\/+$/, '');
  var hash = location.hash;
  var nav = document.createElement('nav');
  nav.className = 'an-tabs';
  nav.setAttribute('aria-label', 'Analytics');
  var lock = document.createElement('span');
  lock.className = 'an-lock';
  lock.textContent = '🔒 Analytics';
  nav.appendChild(lock);
  TABS.forEach(function (t) {
    var a = document.createElement('a');
    a.href = t[2];
    a.textContent = t[0] + ' ' + t[1];
    var p = t[2].split('#'), alvoHash = p[1] ? '#' + p[1] : '';
    var ativo = p[0] === path && (alvoHash ? hash === alvoHash : !(path === '/admin/analytics' && hash === '#onboarding'));
    if (ativo) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  });
  me.insertAdjacentElement('beforebegin', nav);
  // Celular: a faixa rola na horizontal; só rola se a aba ativa estiver fora da área visível.
  var cur = nav.querySelector('[aria-current]');
  if (cur) requestAnimationFrame(function () {
    var nr = nav.getBoundingClientRect(), cr = cur.getBoundingClientRect();
    if (cr.right > nr.right || cr.left < nr.left) nav.scrollLeft += cr.left - nr.left - 16;
  });
  // Onboarding é uma seção da mesma página: atualiza a aba ativa quando o hash muda.
  window.addEventListener('hashchange', function () {
    hash = location.hash;
    nav.querySelectorAll('a').forEach(function (a) {
      var h = a.getAttribute('href'), on = h === path + hash || (h === path && hash !== '#onboarding');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  });
})();
