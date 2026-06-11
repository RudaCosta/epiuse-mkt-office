// ════════════════════════════════════════════════════════════════════════════
// i18n.js — Internacionalização EPI-USE Office
// Suporta PT (default), EN, ES. Persiste em localStorage.office.lang
// Aplica em qualquer elemento com [data-i18n="key"] ou via T(key)
// ════════════════════════════════════════════════════════════════════════════

window.OFFICE_I18N = {
  pt: {
    // Nav tabs
    'nav.home':         'Home',
    'nav.intelligence': 'Intelligence',
    'nav.growth':       'Growth',
    'nav.events':       'Eventos',
    'nav.pipeline':     'Pipeline',
    'nav.brand':        'Brand/Voices',
    'nav.content':      'Conteúdo',
    'nav.metas':        'Metas FY',
    // Nav user menu
    'nav.theme':        'Tema',
    'nav.language':     'Idioma',
    'nav.logout':       'Sair / Limpar local',
    'nav.profile':      'Editar perfil',
    'nav.login':        'Entrar',
    // Home sections
    'home.greeting.morning':   'Bom dia',
    'home.greeting.afternoon': 'Boa tarde',
    'home.greeting.evening':   'Boa noite',
    'home.online':       'Escritório Online',
    'home.viewAs':       'Ver como…',
    'home.today':        'Hoje',
    'home.digest':       'Daily Digest',
    'home.topGoals':     'Top metas FY26',
    'home.growthTrend':  'Growth trend · LinkedIn 12 meses',
    'home.areas':        'Áreas · resumo',
    'home.quickActions': 'Acessos rápidos',
    'home.agenda':       'Agenda EPI-USE / SAP',
    'home.birthdays':    'Próximos aniversários',
    'home.alerts':       'Alertas & Bloqueios',
    'home.focus':        'Meu foco',
    'home.live':         'AO VIVO',
    'home.realtime':     'REAL-TIME',
    'home.followers':    'Seguidores totais',
    'home.last12m':      'últimos 12m',
    // Calendar
    'cal.viewAnnual':    'Ver cronograma anual',
    'cal.viewCompact':   'Vista compacta',
    'cal.brNext':        'Próximos itens (Brasil)',
    'cal.latam':         'LATAM & Internacional',
    'cal.items':         'itens',
    // Footer
    'footer.online':     'sistemas online',
    'footer.versions':   'Versões anteriores',
    'footer.current':    'atual',
    'footer.changelog':  'Changelog completo',
    // Common
    'common.loading':    'Carregando…',
    'common.empty':      'Nada por aqui.',
    'common.open':       'Abrir',
    'common.save':       'Salvar',
    'common.cancel':     'Cancelar',
    'common.close':      'Fechar',
  },
  en: {
    'nav.home':         'Home',
    'nav.intelligence': 'Intelligence',
    'nav.growth':       'Growth',
    'nav.events':       'Events',
    'nav.pipeline':     'Pipeline',
    'nav.brand':        'Brand/Voices',
    'nav.content':      'Content',
    'nav.metas':        'FY Goals',
    'nav.theme':        'Theme',
    'nav.language':     'Language',
    'nav.logout':       'Sign out / Clear local',
    'nav.profile':      'Edit profile',
    'nav.login':        'Sign in',
    'home.greeting.morning':   'Good morning',
    'home.greeting.afternoon': 'Good afternoon',
    'home.greeting.evening':   'Good evening',
    'home.online':       'Office Online',
    'home.viewAs':       'View as…',
    'home.today':        'Today',
    'home.digest':       'Daily Digest',
    'home.topGoals':     'Top FY26 goals',
    'home.growthTrend':  'Growth trend · LinkedIn 12 months',
    'home.areas':        'Areas · summary',
    'home.quickActions': 'Quick actions',
    'home.agenda':       'EPI-USE / SAP Agenda',
    'home.birthdays':    'Upcoming birthdays',
    'home.alerts':       'Alerts & Blockers',
    'home.focus':        'My focus',
    'home.live':         'LIVE',
    'home.realtime':     'REAL-TIME',
    'home.followers':    'Total followers',
    'home.last12m':      'last 12m',
    'cal.viewAnnual':    'View annual schedule',
    'cal.viewCompact':   'Compact view',
    'cal.brNext':        'Upcoming items (Brazil)',
    'cal.latam':         'LATAM & International',
    'cal.items':         'items',
    'footer.online':     'systems online',
    'footer.versions':   'Previous versions',
    'footer.current':    'current',
    'footer.changelog':  'Full changelog',
    'common.loading':    'Loading…',
    'common.empty':      'Nothing here.',
    'common.open':       'Open',
    'common.save':       'Save',
    'common.cancel':     'Cancel',
    'common.close':      'Close',
  },
  es: {
    'nav.home':         'Inicio',
    'nav.intelligence': 'Intelligence',
    'nav.growth':       'Growth',
    'nav.events':       'Eventos',
    'nav.pipeline':     'Pipeline',
    'nav.brand':        'Brand/Voices',
    'nav.content':      'Contenido',
    'nav.metas':        'Metas FY',
    'nav.theme':        'Tema',
    'nav.language':     'Idioma',
    'nav.logout':       'Salir / Limpiar local',
    'nav.profile':      'Editar perfil',
    'nav.login':        'Entrar',
    'home.greeting.morning':   'Buenos días',
    'home.greeting.afternoon': 'Buenas tardes',
    'home.greeting.evening':   'Buenas noches',
    'home.online':       'Oficina en línea',
    'home.viewAs':       'Ver como…',
    'home.today':        'Hoy',
    'home.digest':       'Resumen diario',
    'home.topGoals':     'Top metas FY26',
    'home.growthTrend':  'Tendencia · LinkedIn 12 meses',
    'home.areas':        'Áreas · resumen',
    'home.quickActions': 'Accesos rápidos',
    'home.agenda':       'Agenda EPI-USE / SAP',
    'home.birthdays':    'Próximos cumpleaños',
    'home.alerts':       'Alertas y Bloqueos',
    'home.focus':        'Mi foco',
    'home.live':         'EN VIVO',
    'home.realtime':     'TIEMPO REAL',
    'home.followers':    'Seguidores totales',
    'home.last12m':      'últimos 12m',
    'cal.viewAnnual':    'Ver cronograma anual',
    'cal.viewCompact':   'Vista compacta',
    'cal.brNext':        'Próximos ítems (Brasil)',
    'cal.latam':         'LATAM e Internacional',
    'cal.items':         'ítems',
    'footer.online':     'sistemas en línea',
    'footer.versions':   'Versiones anteriores',
    'footer.current':    'actual',
    'footer.changelog':  'Changelog completo',
    'common.loading':    'Cargando…',
    'common.empty':      'Nada por aquí.',
    'common.open':       'Abrir',
    'common.save':       'Guardar',
    'common.cancel':     'Cancelar',
    'common.close':      'Cerrar',
  }
};

window.OFFICE_LANGS = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English',   flag: '🇺🇸' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' }
];

window.getLang = function() {
  try {
    const saved = localStorage.getItem('office.lang');
    if (['pt','en','es'].includes(saved)) return saved;
  } catch {}
  // auto-detect browser language
  const nav = (navigator.language || 'pt').slice(0,2).toLowerCase();
  if (['en','es'].includes(nav)) return nav;
  return 'pt';
};

window.setLang = function(lang) {
  if (!['pt','en','es'].includes(lang)) return;
  try { localStorage.setItem('office.lang', lang); } catch {}
  document.documentElement.setAttribute('lang', lang === 'pt' ? 'pt-BR' : lang);
  window.applyI18n();
  document.dispatchEvent(new CustomEvent('office:langchange', { detail: { lang } }));
};

window.T = function(key, fallback) {
  const lang = window.getLang();
  const dict = window.OFFICE_I18N[lang] || window.OFFICE_I18N.pt;
  return dict[key] || window.OFFICE_I18N.pt[key] || fallback || key;
};

window.applyI18n = function() {
  // Aplica em [data-i18n="key"] elementos
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const val = window.T(key);
    if (val) el.textContent = val;
  });
  // Atributos: [data-i18n-attr-title="key"] → seta title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', window.T(key));
  });
};

// ════════════════════════════════════════════════════════════════════════════
// MOTOR DE TRADUÇÃO RUNTIME — varre text nodes e troca PT→EN/ES por dicionário
// SÓ traduz match EXATO no dicionário → dado real (nomes, títulos de artigo,
// números) nunca casa, nunca é traduzido. Cobre TODAS páginas sem tagging manual.
// Dicionário expansível: window.OFFICE_PHRASES['frase pt'] = { en:'...', es:'...' }
// ════════════════════════════════════════════════════════════════════════════

window.OFFICE_PHRASES = {
  // ── Nav / chrome ──
  'Home': { en: 'Home', es: 'Inicio' },
  'Eventos': { en: 'Events', es: 'Eventos' },
  'Conteúdo': { en: 'Content', es: 'Contenido' },
  'Metas FY': { en: 'FY Goals', es: 'Metas FY' },
  'Entrar': { en: 'Sign in', es: 'Entrar' },
  'Notificações': { en: 'Notifications', es: 'Notificaciones' },
  'Ver tudo →': { en: 'See all →', es: 'Ver todo →' },
  'Carregando…': { en: 'Loading…', es: 'Cargando…' },
  'Carregando...': { en: 'Loading...', es: 'Cargando...' },
  'Nenhum alerta no momento.': { en: 'No alerts right now.', es: 'Ninguna alerta por ahora.' },
  'Trocar nome de exibição': { en: 'Change display name', es: 'Cambiar nombre' },
  'Changelog': { en: 'Changelog', es: 'Changelog' },
  'Sair (limpa preferências)': { en: 'Sign out (clear prefs)', es: 'Salir (limpiar prefs)' },
  'Agentes & Contexto': { en: 'Agents & Context', es: 'Agentes y Contexto' },
  'Relatório Mensal': { en: 'Monthly Report', es: 'Informe Mensual' },
  'Field Marketing': { en: 'Field Marketing', es: 'Field Marketing' },
  'Pipeline de Conteúdo': { en: 'Content Pipeline', es: 'Pipeline de Contenido' },
  'Jornadas de Compra': { en: 'Buyer Journeys', es: 'Jornadas de Compra' },
  'Artigos do Blog': { en: 'Blog Articles', es: 'Artículos del Blog' },
  'Design System': { en: 'Design System', es: 'Design System' },
  'Histórico de versões': { en: 'Version history', es: 'Historial de versiones' },
  'Modo Game': { en: 'Game Mode', es: 'Modo Juego' },
  // ── Home ──
  'Escritório Online': { en: 'Office Online', es: 'Oficina en línea' },
  'Bom dia': { en: 'Good morning', es: 'Buenos días' },
  'Boa tarde': { en: 'Good afternoon', es: 'Buenas tardes' },
  'Boa noite': { en: 'Good evening', es: 'Buenas noches' },
  'Hoje': { en: 'Today', es: 'Hoy' },
  'Meu foco': { en: 'My focus', es: 'Mi foco' },
  'Daily Digest': { en: 'Daily Digest', es: 'Resumen diario' },
  'Top metas FY26': { en: 'Top FY26 goals', es: 'Top metas FY26' },
  'Áreas · resumo': { en: 'Areas · summary', es: 'Áreas · resumen' },
  'Acessos rápidos': { en: 'Quick actions', es: 'Accesos rápidos' },
  'Próximos aniversários': { en: 'Upcoming birthdays', es: 'Próximos cumpleaños' },
  'Alertas & Bloqueios': { en: 'Alerts & Blockers', es: 'Alertas y Bloqueos' },
  'AO VIVO': { en: 'LIVE', es: 'EN VIVO' },
  'REAL-TIME': { en: 'REAL-TIME', es: 'TIEMPO REAL' },
  'Seguidores totais': { en: 'Total followers', es: 'Seguidores totales' },
  'Ver calendário completo →': { en: 'View full calendar →', es: 'Ver calendario completo →' },
  'Ver cronograma anual': { en: 'View annual schedule', es: 'Ver cronograma anual' },
  'Vista compacta': { en: 'Compact view', es: 'Vista compacta' },
  'Tudo em 1 lugar — clique nas camadas pra filtrar:': { en: 'All in one place — click the layers to filter:', es: 'Todo en un lugar — clic en las capas para filtrar:' },
  'Próximos itens (Brasil)': { en: 'Upcoming items (Brazil)', es: 'Próximos ítems (Brasil)' },
  // ── Comuns ──
  'Abrir': { en: 'Open', es: 'Abrir' },
  'Salvar': { en: 'Save', es: 'Guardar' },
  'Cancelar': { en: 'Cancel', es: 'Cancelar' },
  'Fechar': { en: 'Close', es: 'Cerrar' },
  'Atualizar': { en: 'Refresh', es: 'Actualizar' },
  'Hoje': { en: 'Today', es: 'Hoy' },
  'Mês anterior': { en: 'Previous month', es: 'Mes anterior' },
  'Próximo mês': { en: 'Next month', es: 'Mes siguiente' },
  'Selecione um dia': { en: 'Select a day', es: 'Selecciona un día' },
  'Clique em qualquer dia do calendário': { en: 'Click any day on the calendar', es: 'Clic en cualquier día del calendario' },
  // ── Footer ──
  'sistemas online': { en: 'systems online', es: 'sistemas en línea' },
  'Versões anteriores': { en: 'Previous versions', es: 'Versiones anteriores' },
  '📜 Changelog completo →': { en: '📜 Full changelog →', es: '📜 Changelog completo →' },
  'EPI-USE OFFICE': { en: 'EPI-USE OFFICE', es: 'EPI-USE OFFICE' },
  // ── Trust strip footer ──
  'dados off-repo': { en: 'data off-repo', es: 'datos off-repo' },
};

const I18N_SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);

function i18nTranslateTextNode(node, lang) {
  // Guarda original PT na 1ª visita
  if (node.__i18nPt === undefined) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    node.__i18nPt = raw;
  }
  const original = node.__i18nPt;
  if (lang === 'pt') {
    if (node.nodeValue !== original) node.nodeValue = original;
    return;
  }
  const trimmed = original.trim();
  const entry = window.OFFICE_PHRASES[trimmed];
  if (entry && entry[lang]) {
    // Preserva espaços em volta
    const lead = original.match(/^\s*/)[0];
    const trail = original.match(/\s*$/)[0];
    node.nodeValue = lead + entry[lang] + trail;
  } else if (node.nodeValue !== original) {
    node.nodeValue = original; // sem tradução → volta PT
  }
}

function i18nWalk(root, lang) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (I18N_SKIP_TAGS.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
      if (p.closest && p.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let cur;
  while ((cur = walker.nextNode())) nodes.push(cur);
  for (const n of nodes) i18nTranslateTextNode(n, lang);
}

// Traduz uma raiz específica (ex: shadowRoot de web component)
window.translateRoot = function(root) {
  if (!root) return;
  i18nWalk(root, window.getLang());
};

window.translatePage = function() {
  const lang = window.getLang();
  i18nWalk(document.body, lang);
  // attrs comuns: placeholder, title, aria-label
  document.querySelectorAll('[placeholder],[title]').forEach(el => {
    ['placeholder','title'].forEach(attr => {
      const v = el.getAttribute(attr);
      if (!v) return;
      const key = '__i18n_' + attr;
      if (el[key] === undefined) el[key] = v;
      const orig = el[key];
      if (lang === 'pt') { if (el.getAttribute(attr) !== orig) el.setAttribute(attr, orig); return; }
      const e = window.OFFICE_PHRASES[orig.trim()];
      if (e && e[lang]) el.setAttribute(attr, e[lang]);
      else if (el.getAttribute(attr) !== orig) el.setAttribute(attr, orig);
    });
  });
};

// MutationObserver — conteúdo renderizado por JS (home, cards async) também traduz
let _i18nObserver = null;
function startI18nObserver() {
  if (_i18nObserver || !document.body) return;
  _i18nObserver = new MutationObserver(muts => {
    const lang = window.getLang();
    if (lang === 'pt') return; // PT default não precisa varrer dinâmico
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) i18nWalk(n, lang);
        else if (n.nodeType === 3) i18nTranslateTextNode(n, lang);
      }
    }
  });
  _i18nObserver.observe(document.body, { childList: true, subtree: true });
}

// Setar lang attr no <html> e aplicar i18n logo que possível
(function preApplyLang() {
  try {
    const lang = window.getLang();
    document.documentElement.setAttribute('lang', lang === 'pt' ? 'pt-BR' : lang);
  } catch {}
})();

function i18nBoot() {
  window.applyI18n();
  window.translatePage();
  // Traduz shadow roots de web components já montados (nav/footer carregam antes do i18n)
  document.querySelectorAll('office-nav, office-footer').forEach(el => {
    if (el.shadowRoot) { try { i18nWalk(el.shadowRoot, window.getLang()); } catch (e) {} }
  });
  startI18nObserver();
  document.dispatchEvent(new CustomEvent('office:i18nready'));
}

// setLang re-traduz tudo
const _origSetLang = window.setLang;
window.setLang = function(lang) {
  _origSetLang(lang);
  window.translatePage();
};

// Reaplica quando DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', i18nBoot);
} else {
  i18nBoot();
}
