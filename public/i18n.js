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

// Setar lang attr no <html> e aplicar i18n logo que possível
(function preApplyLang() {
  try {
    const lang = window.getLang();
    document.documentElement.setAttribute('lang', lang === 'pt' ? 'pt-BR' : lang);
  } catch {}
})();

// Reaplica quando DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.applyI18n());
} else {
  window.applyI18n();
}
