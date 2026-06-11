// ════════════════════════════════════════════════════════════════════════════
// <office-nav> — Web Component vanilla, sem build, sem deps
// Nav global persistente em todas as rotas do Office Engine v3.3+
// Briefing do Claude Design: 5 seções, logomark à esquerda, controles à direita.
// ════════════════════════════════════════════════════════════════════════════

// Versão atual exposta no chip ao lado do logomark.
// Fonte ÚNICA da verdade: public/api/changelog.json#current via /api/version
// Fallback hardcoded usado SÓ se fetch falhar (offline, etc).
// Sincronização automática — não editar manualmente, basta bumpar changelog.json.
let OFFICE_NAV_VERSION = '0.39.1';
// Promise compartilhada — nav + footer reaproveitam o mesmo fetch
window.__officeVersionPromise = window.__officeVersionPromise || fetch('/api/version')
  .then(r => r.ok ? r.json() : null)
  .then(d => { if (d && d.current) { OFFICE_NAV_VERSION = d.current; window.__officeVersion = d.current; } return d; })
  .catch(() => null);

// Tokens CSS globais ERP.ngo (v0.4.12) — injetados em document.head pra ficar
// disponíveis em todas as páginas. Cores oficiais do brand guide ERP.ngo v1.0.
// Doc fonte: vault/00-contexto/branding-erp-ngo.md
(function injectERPNgoTokens() {
  if (document.getElementById('erp-ngo-tokens')) return;
  const style = document.createElement('style');
  style.id = 'erp-ngo-tokens';
  style.textContent = `
    :root {
      --erp-blue-navy:   #131B41;
      --erp-blue-mid:    #0066B2;
      --erp-blue-light:  #BFDCF3;
      --erp-brown-mid:   #74685B;
      --erp-brown-light: #BBA997;
    }
  `;
  document.head.appendChild(style);
})();

// GLOBAL polish stylesheets (v0.24.0) — injeta em TODAS paginas que carregam office-nav.js
// Inclui Lexend + Source Sans 3 (consulting fonts) + polish-pro.css + consulting-dark.css
(function injectGlobalPolish() {
  if (document.getElementById('global-polish-loader')) return;
  const marker = document.createElement('meta');
  marker.id = 'global-polish-loader'; marker.name = 'global-polish'; marker.content = 'loaded';
  document.head.appendChild(marker);

  // Preconnect Google Fonts
  ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].forEach((href, i) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'preconnect'; l.href = href;
    if (i === 1) l.crossOrigin = '';
    document.head.appendChild(l);
  });

  // Google Fonts CSS (Lexend + Source Sans 3 + Fira Code)
  if (!document.querySelector('link[href*="Lexend"]')) {
    const fontsLink = document.createElement('link');
    fontsLink.rel = 'stylesheet';
    fontsLink.href = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=Fira+Code:wght@500;600;700&display=swap';
    document.head.appendChild(fontsLink);
  }

  // polish-pro.css + consulting-dark.css
  ['/css/polish-pro.css', '/css/consulting-dark.css'].forEach(href => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  });
})();

// Auto-load i18n.js se não estiver presente (idempotente)
(function ensureI18n() {
  if (window.OFFICE_I18N) return;
  if (document.querySelector('script[src="/i18n.js"]')) return;
  const s = document.createElement('script');
  s.src = '/i18n.js';
  s.async = false;
  document.head.appendChild(s);
})();

// Helpers idioma — fallback PT se i18n.js ainda não carregou
function getLangCode() {
  try { var v = localStorage.getItem('office.lang'); if (v === 'en' || v === 'es' || v === 'pt') return v; } catch (e) {}
  return 'pt';
}
function getLangFlag() {
  var c = getLangCode();
  return c === 'en' ? '🇺🇸' : (c === 'es' ? '🇪🇸' : '🇧🇷');
}
function cycleLang() {
  var ORDER = ['pt','en','es'];
  var cur = getLangCode();
  var next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
  if (window.setLang) {
    window.setLang(next);
  } else {
    try { localStorage.setItem('office.lang', next); } catch (e) {}
    location.reload();
  }
}

// NAV POR AREA/DONA (v0.7.x) — cada item = 1 modulo (funil de meta + numeros + projetos + ferramentas).
// Fonte: /api/areas.json. Telas antigas viram "ferramentas" dentro de cada modulo (deep-links seguem valendo).
const OFFICE_NAV_TABS = [
  { id: 'hub',          label: 'Home',         icon: '🏠', href: '/',                  matches: ['hub','home'] },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠', href: '/area/intelligence', matches: ['area-intelligence'] },
  { id: 'growth',       label: 'Growth',       icon: '🚀', href: '/area/growth',       matches: ['area-growth'] },
  { id: 'eventos',      label: 'Eventos',      icon: '📅', href: '/area/eventos',      matches: ['area-eventos'] },
  { id: 'pipeline',     label: 'Pipeline',     icon: '📞', href: '/area/pipeline',     matches: ['area-pipeline','pipeline'] },
  { id: 'brand',        label: 'Brand/Voices', icon: '🎨', href: '/area/brand',        matches: ['area-brand','voices','inbound','cases','painel','optimizer'] },
  { id: 'conteudo',     label: 'Conteúdo',     icon: '📣', href: '/area/conteudo',     matches: ['area-conteudo','artigos','jornadas'] },
  { id: 'metas',        label: 'Metas FY',     icon: '🎯', href: '/metas-fy26',        matches: ['metas','metas-fy26','relatorio'] }
];

// Breadcrumbs por rota — aparece sutil abaixo do nav em rotas profundas
const OFFICE_NAV_BREADCRUMBS = {
  'inbound':       ['📡 Inbound'],
  'inbound-brief': ['📡 Inbound', 'Brief → Post'],
  'inbound-carousel': ['📡 Inbound', 'Carrossel + Capa'],
  'inbound-calendar': ['📡 Inbound', 'Calendário Editorial'],
  'inbound-studio': ['📡 Inbound', 'Template Studio'],
  'inbound-playbook': ['📡 Inbound', 'Playbook'],
  'voices': ['🎙️ Voices'],
  'painel': ['🎙️ Voices', '🎯 Painel da Duda'],
  'optimizer': ['🎙️ Voices', '🪪 Profile Optimizer'],
  'cases': ['🤝 Cases & CS']
};

// Overflow agrupado por seção (Sprint 11.2 — UX/UI melhor)
// Cada item com `section` vira separador. Itens sem section são extras.
const OFFICE_NAV_OVERFLOW = [
  { section: '🤖 Escritório Virtual' },
  { label: '🤖 Agentes & Contexto',      href: '/agentes' },
  { label: '⚡ Central (pendências+prazos)', href: '/war-room' },

  { section: '📊 Reports & Análises' },
  { label: '📈 Relatório Mensal',        href: '/relatorio' },
  { label: '💶 Development Funds (SAP)',  href: '/development-funds' },
  { label: '🌐 Clientes SAP 4 ME',       href: '/clientes-sap-4me' },
  { label: '📣 Field Marketing',         href: '/field-marketing' },
  { label: '✍️ Pipeline de Conteúdo',     href: '/content-pipeline' },
  { label: '🗺️ Jornadas de Compra',      href: '/jornadas' },
  { label: '📚 Artigos do Blog',         href: '/artigos' },
  { label: '📊 Planilhas (Live API)',    href: '/planilhas' },

  { section: '🎙️ Voices & Optimizer' },
  { label: '🪪 Profile Optimizer (V1)',   href: '/optimizer' },
  { label: '🪪 Profile Optimizer V2 (findskill)', href: '/optimizer-v2' },
  { label: '🎯 Painel da Duda',          href: '/voices/painel' },
  { label: '📨 Seja um Voice (LP)',      href: '/seja-voice' },

  { section: '🎨 Design & Sistema' },
  { label: '🎨 Design System',           href: '/design' },
  { label: '📜 Histórico de versões',   href: '/changelog' },

  { section: '🐘 ERP.ngo' },
  { label: '🐘 Impacto FY26 (ERP.ngo)',  href: '/erp-impacto' },

  { section: '🎮 Extras' },
  { label: '🎮 Modo Game',               href: '/game' },
  { label: '🐘 ERP.ngo',                 href: 'https://erp.ngo', external: true }
];

class OfficeNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.hookEvents();
    // Re-render quando versão real chegar do servidor (auto-sync)
    if (window.__officeVersionPromise) {
      window.__officeVersionPromise.then(d => {
        if (d && d.current && d.current !== this._lastVersion) {
          this._lastVersion = d.current;
          this.render();
          this.hookEvents();
        }
      });
    }
  }

  getActiveRoute() {
    // 1. data-route do body tem prioridade
    const bodyRoute = document.body?.dataset?.route;
    if (bodyRoute) return bodyRoute;
    // 2. fallback: detecta da URL
    const path = location.pathname;
    if (path === '/' || path === '/dashboard' || path.startsWith('/game')) return 'hub';
    if (path.startsWith('/painel') || path === '/voices/painel') return 'painel';
    if (path.startsWith('/voices') || path.startsWith('/optimizer') || path.startsWith('/seja-voice')) return 'voices';
    if (path === '/inbound/brief') return 'inbound-brief';
    if (path === '/inbound/carousel') return 'inbound-carousel';
    if (path === '/inbound/calendar') return 'inbound-calendar';
    if (path === '/inbound/studio') return 'inbound-studio';
    if (path === '/inbound/playbook') return 'inbound-playbook';
    if (path.startsWith('/inbound')) return 'inbound';
    if (path.startsWith('/cases')) return 'cases';
    if (path.startsWith('/relatorio')) return 'relatorio';
    if (path.startsWith('/artigos') || path.startsWith('/jornadas')) return 'artigos';
    if (path.startsWith('/metas')) return 'metas';
    if (path.startsWith('/pipeline')) return 'pipeline';
    if (path.startsWith('/hub')) return 'hub-mkt';
    if (path.startsWith('/changelog')) return 'changelog';
    return '';
  }

  // Mapa route → tab id (várias rotas mapeiam pro mesmo tab principal)
  getActiveTab() {
    const r = this.getActiveRoute();
    if (r.startsWith('inbound')) return 'inbound';
    if (r === 'painel' || r === 'voices') return 'voices';
    return r;
  }

  getUser() {
    try { return localStorage.getItem('office.user') || 'Visitante'; }
    catch { return 'Visitante'; }
  }

  getTheme() {
    try {
      const saved = localStorage.getItem('office.theme');
      if (['dark','light','armory','elephant'].includes(saved)) return saved;
      // F10: auto-detect OS preference (default fallback = dark)
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
      return 'dark';
    } catch { return 'dark'; }
  }

  render() {
    const activeRoute = this.getActiveRoute();
    const activeTab = this.getActiveTab();
    const breadcrumb = OFFICE_NAV_BREADCRUMBS[activeRoute] || null;
    const user = this.getUser();
    const theme = this.getTheme();
    const THEME_ICON = { dark: '☾', light: '☀', armory: '◆', elephant: '🐘' };
    const THEME_LABEL = { dark: 'escuro', light: 'claro', armory: 'armory', elephant: 'elephant' };
    const themeIcon = THEME_ICON[theme] || '☾';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --nav-bg: rgba(6, 14, 26, 0.92);
          --nav-border: rgba(37, 99, 235, 0.25);
          --nav-text: #e2e8f0;
          --nav-muted: #64748b;
          --nav-accent: #60a5fa;
          --nav-active-bg: rgba(37, 99, 235, 0.18);
          --nav-active-border: rgba(37, 99, 235, 0.5);
          --nav-hover-bg: rgba(255, 255, 255, 0.05);
          display: block;
          position: sticky;
          top: 0;
          z-index: 100;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .nav-bar {
          background: var(--nav-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--nav-border);
          display: flex;
          align-items: center;
          height: 48px;
          padding: 0 14px;
          gap: 8px;
        }
        .logo {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          padding: 6px 10px;
          border-radius: 6px;
          transition: background .15s, filter .15s;
          white-space: nowrap;
          filter: brightness(1) saturate(1);
        }
        .logo:hover { background: var(--nav-hover-bg); }
        /* Dark theme: logo branco · Light: cor original RGB */
        :host-context([data-theme="dark"]) .logo img,
        .logo img { filter: brightness(0) invert(1); transition: filter .15s; }
        :host-context([data-theme="light"]) .logo img { filter: none; }
        .ver-chip {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 9px;
          font-weight: 700;
          color: #94a3b8;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(148,163,184,0.18);
          padding: 3px 7px;
          border-radius: 4px;
          letter-spacing: 0.06em;
          text-decoration: none;
          margin-left: -2px;
          transition: color .15s, border-color .15s, background .15s;
          white-space: nowrap;
        }
        .ver-chip:hover { color: var(--nav-accent); border-color: rgba(37,99,235,0.45); background: rgba(37,99,235,0.10); }
        .tabs {
          display: flex;
          gap: 2px;
          margin-left: 6px;
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tabs::-webkit-scrollbar { display: none; }
        .tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--nav-muted);
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid transparent;
          white-space: nowrap;
          transition: all .15s;
          font-weight: 500;
        }
        .tab:hover { background: var(--nav-hover-bg); color: var(--nav-text); }
        .tab.active {
          background: linear-gradient(180deg, rgba(37,99,235,0.28) 0%, rgba(37,99,235,0.18) 100%);
          border-color: rgba(96,165,250,0.55);
          color: #93c5fd;
          font-weight: 700;
          box-shadow: 0 1px 0 rgba(96,165,250,0.40) inset, 0 -2px 0 rgba(96,165,250,0.55) inset;
        }
        .tab.active::before {
          content: '';
          width: 5px; height: 5px;
          background: #60a5fa;
          border-radius: 50%;
          box-shadow: 0 0 6px #60a5fa;
        }
        .tab-ico { font-size: 13px; }
        .spacer { flex: 1; }
        .controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ctrl-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--nav-border);
          color: var(--nav-text);
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          transition: background .15s, border-color .15s;
        }
        .ctrl-btn:hover { background: var(--nav-hover-bg); border-color: rgba(37,99,235,0.45); }
        .ctrl-btn .kbd {
          display: inline-block;
          background: rgba(0,0,0,0.4);
          padding: 1px 5px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 10px;
          margin-left: 4px;
        }
        .user-chip {
          font-size: 12px;
          font-weight: 600;
          color: var(--nav-accent);
          background: rgba(37,99,235,0.12);
          border: 1px solid var(--nav-border);
          padding: 5px 12px;
          border-radius: 14px;
          white-space: nowrap;
          cursor: pointer;
          font-family: inherit;
        }
        .user-chip:hover { background: rgba(37,99,235,0.22); }
        .overflow-wrap { position: relative; }
        .overflow-menu {
          display: none;
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          min-width: 220px;
          background: #0d1e36;
          border: 1px solid var(--nav-border);
          border-radius: 10px;
          padding: 6px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          z-index: 10;
        }
        .overflow-menu.open { display: block; }
        .overflow-item {
          display: block;
          font-size: 13px;
          color: var(--nav-text);
          text-decoration: none;
          padding: 9px 12px;
          border-radius: 6px;
          transition: background .12s;
        }
        .overflow-item:hover { background: var(--nav-hover-bg); }
        .overflow-section {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--nav-text-muted, #869ec3);
          padding: 10px 12px 4px;
          margin-top: 4px;
          border-top: 1px solid rgba(134,158,195,.12);
          opacity: .75;
        }
        .overflow-section:first-child { border-top: none; margin-top: 0; padding-top: 4px; }

        /* ── Breadcrumb sutil ── */
        .crumbs {
          background: rgba(6, 14, 26, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(37,99,235,0.10);
          padding: 6px 18px;
          font-size: 11px;
          color: var(--nav-muted);
          display: flex;
          gap: 6px;
          align-items: center;
          letter-spacing: 0.02em;
        }
        .crumbs .sep { opacity: 0.4; }
        .crumbs .item { color: var(--nav-muted); }
        .crumbs .item.current { color: var(--nav-accent); font-weight: 600; }

        /* ── Notification bell ── */
        .bell-wrap { position: relative; }
        .bell-btn {
          background: transparent;
          border: 1px solid transparent;
          color: var(--nav-text);
          font-size: 14px;
          padding: 5px 9px;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          position: relative;
          transition: background .15s, border-color .15s;
        }
        .bell-btn:hover { background: var(--nav-hover-bg); border-color: var(--nav-border); }
        .bell-badge {
          position: absolute;
          top: 1px; right: 1px;
          background: #ef4444;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          min-width: 14px; height: 14px;
          padding: 0 4px;
          border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          line-height: 1;
        }
        .bell-panel {
          display: none;
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          width: 320px; max-height: 60vh;
          overflow-y: auto;
          background: #0d1e36;
          border: 1px solid var(--nav-border);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          z-index: 10;
        }
        .bell-panel.open { display: block; }
        .bell-panel .bp-head {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 11px;
          color: var(--nav-muted);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
          display: flex; justify-content: space-between; align-items: center;
        }
        .bell-panel .bp-item {
          padding: 10px 14px;
          font-size: 12px;
          color: var(--nav-text);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          display: block;
          text-decoration: none;
        }
        .bell-panel .bp-item:hover { background: var(--nav-hover-bg); }
        .bell-panel .bp-item.empty { color: var(--nav-muted); font-style: italic; cursor: default; }
        .bell-panel .bp-item .bp-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 3px;
          margin-right: 6px;
          letter-spacing: 0.06em;
        }
        .bp-tag.warn { background: rgba(251,191,36,0.18); color: #fbbf24; }
        .bp-tag.info { background: rgba(96,165,250,0.18); color: #60a5fa; }

        /* ── User dropdown real (substitui prompt()) ── */
        .user-menu {
          display: none;
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          min-width: 240px;
          background: #0d1e36;
          border: 1px solid var(--nav-border);
          border-radius: 10px;
          padding: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          z-index: 10;
        }
        .user-menu.open { display: block; }
        .user-menu .um-head {
          padding: 8px 10px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 6px;
        }
        .user-menu .um-name {
          font-size: 13px; font-weight: 600; color: var(--nav-text);
        }
        .user-menu .um-sub {
          font-size: 11px; color: var(--nav-muted); margin-top: 2px;
        }
        .user-menu .um-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px;
          font-size: 12px;
          color: var(--nav-text);
          text-decoration: none;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
          font-family: inherit;
        }
        .user-menu .um-item:hover { background: var(--nav-hover-bg); }
        .user-menu .um-item .ic { font-size: 13px; opacity: 0.85; }
        .user-wrap { position: relative; }

        /* ── Skip-to-content a11y ── */
        .skip-link {
          position: absolute;
          left: -9999px;
          top: 8px;
          background: var(--nav-accent);
          color: #06141a;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          z-index: 999;
        }
        .skip-link:focus { left: 8px; }

        /* ── Mobile hamburger ── */
        .hamburger {
          display: none;
          background: transparent;
          border: 1px solid var(--nav-border);
          color: var(--nav-text);
          font-size: 16px;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
        }
        .mobile-tabs {
          display: none;
          background: rgba(6,14,26,0.97);
          border-bottom: 1px solid var(--nav-border);
          padding: 8px;
          flex-direction: column;
          gap: 4px;
        }
        .mobile-tabs.open { display: flex; }
        .mobile-tabs .tab { font-size: 14px; padding: 12px 14px; }

        @media (max-width: 720px) {
          .logo { font-size: 9px; padding: 5px 7px; }
          .ver-chip { font-size: 8px; padding: 2px 5px; }
          .tabs { display: none; }
          .hamburger { display: inline-block; }
          .user-chip .user-name { display: none; }
          .ctrl-btn .kbd { display: none; }
          .bell-panel, .user-menu { width: 92vw; right: -8px; }
        }
      </style>

      <a href="#main" class="skip-link">Pular pro conteúdo</a>

      <nav class="nav-bar" role="navigation" aria-label="Office navigation">
        <a class="logo" href="/" aria-label="Voltar ao Office" title="EPI-USE Brasil Office">
          <img src="/assets/logos-epi-use/epi-use-logo-rgb.svg" alt="EPI-USE" height="20" style="display:block">
        </a>
        <a class="ver-chip" href="/changelog" title="Versão atual — clique para ver histórico">${OFFICE_NAV_VERSION}</a>

        <button class="hamburger" id="hamburger-btn" type="button" aria-label="Menu" title="Menu">☰</button>

        <div class="tabs" role="tablist">
          ${OFFICE_NAV_TABS.map(t => {
            const isActive = t.id === activeTab;
            return `<a class="tab ${isActive ? 'active' : ''}" href="${t.href}" data-tab="${t.id}" role="tab" aria-selected="${isActive}">
              <span class="tab-ico">${t.icon}</span>
              <span class="tab-label">${t.label}</span>
            </a>`;
          }).join('')}
        </div>

        <div class="controls">
          <button class="ctrl-btn" id="lang-btn" title="Idioma · Language · Idioma" type="button">${(typeof getLangFlag === 'function' ? getLangFlag() : '🇧🇷')}</button>
          <div class="bell-wrap">
            <button class="bell-btn" id="bell-btn" type="button" title="Notificações" aria-label="Notificações">🔔<span class="bell-badge" id="bell-badge" style="display:none">0</span></button>
            <div class="bell-panel" id="bell-panel" role="menu">
              <div class="bp-head"><span>Notificações</span><a href="/painel" style="color:var(--nav-accent);text-decoration:none;font-size:10px">Ver tudo →</a></div>
              <div id="bell-items"><div class="bp-item empty">Carregando…</div></div>
            </div>
          </div>
          <button class="ctrl-btn" id="theme-btn" title="Trocar tema (dark→armory→elephant→light)" type="button">${themeIcon}</button>
          <div class="user-wrap">
            <button class="user-chip" id="user-btn" type="button">👤 <span class="user-name">${user}</span></button>
            <div class="user-menu" id="user-menu" role="menu">
              <div class="um-head">
                <div class="um-name">👤 ${user}</div>
                <div class="um-sub">EPI-USE Office · ${OFFICE_NAV_VERSION}</div>
              </div>
              <button class="um-item" id="um-rename" type="button"><span class="ic">✏️</span>Trocar nome de exibição</button>
              <button class="um-item" id="um-theme" type="button"><span class="ic">${themeIcon}</span>Tema: ${THEME_LABEL[theme]||'escuro'}</button>
              <a class="um-item" href="/changelog"><span class="ic">📜</span>Changelog</a>
              <a class="um-item" href="https://erp.ngo" target="_blank" rel="noopener"><span class="ic">🐘</span>ERP.ngo</a>
              <button class="um-item" id="um-logout" type="button"><span class="ic">↪</span>Sair (limpa preferências)</button>
            </div>
          </div>
          <div class="overflow-wrap">
            <button class="ctrl-btn" id="more-btn" title="Mais opções" type="button">⋯</button>
            <div class="overflow-menu" id="overflow-menu">
              ${OFFICE_NAV_OVERFLOW.map(it => {
                if (it.section) {
                  return `<div class="overflow-section">${it.section}</div>`;
                }
                const tgt = it.external ? ' target="_blank" rel="noopener"' : '';
                return `<a class="overflow-item" href="${it.href}"${tgt}>${it.label}</a>`;
              }).join('')}
            </div>
          </div>
        </div>
      </nav>

      <div class="mobile-tabs" id="mobile-tabs" role="menu">
        ${OFFICE_NAV_TABS.map(t => {
          const isActive = t.id === activeTab;
          return `<a class="tab ${isActive ? 'active' : ''}" href="${t.href}"><span class="tab-ico">${t.icon}</span><span>${t.label}</span></a>`;
        }).join('')}
      </div>

      ${breadcrumb ? `
      <div class="crumbs" role="navigation" aria-label="Breadcrumb">
        ${breadcrumb.map((c, i) => `
          <span class="item ${i === breadcrumb.length - 1 ? 'current' : ''}">${c}</span>
          ${i < breadcrumb.length - 1 ? '<span class="sep">›</span>' : ''}
        `).join('')}
      </div>` : ''}
    `;
  }

  hookEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    const overflowBtn = $('more-btn');
    const overflowMenu = $('overflow-menu');
    const userBtn = $('user-btn');
    const userMenu = $('user-menu');
    const langBtn = $('lang-btn');
    const themeBtn = $('theme-btn');
    const bellBtn = $('bell-btn');
    const bellPanel = $('bell-panel');
    const hamburgerBtn = $('hamburger-btn');
    const mobileTabs = $('mobile-tabs');

    // Helper: fecha todos os dropdowns exceto o que abriu
    const closeAll = (except) => {
      [overflowMenu, userMenu, bellPanel, mobileTabs].forEach(el => {
        if (el && el !== except) el.classList.remove('open');
      });
    };

    overflowBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = overflowMenu.classList.contains('open');
      closeAll();
      if (!isOpen) overflowMenu.classList.add('open');
    });

    userBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userMenu.classList.contains('open');
      closeAll();
      if (!isOpen) userMenu.classList.add('open');
    });

    bellBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = bellPanel.classList.contains('open');
      closeAll();
      if (!isOpen) bellPanel.classList.add('open');
    });

    hamburgerBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileTabs.classList.contains('open');
      closeAll();
      if (!isOpen) mobileTabs.classList.add('open');
    });

    // Click fora (no document) fecha tudo
    document.addEventListener('click', () => closeAll());

    // User menu actions
    $('um-rename')?.addEventListener('click', () => {
      const cur = this.getUser();
      const next = prompt('Trocar nome de exibição:', cur === 'Visitante' ? '' : cur);
      if (next !== null) {
        const clean = next.trim().slice(0, 24) || 'Visitante';
        try { localStorage.setItem('office.user', clean); } catch {}
        this.render();
        this.hookEvents();
      }
    });

    $('um-theme')?.addEventListener('click', () => {
      const ORDER = ['dark','armory','elephant','light'];
      const cur = this.getTheme();
      const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
      try { localStorage.setItem('office.theme', next); } catch {}
      applyTheme(next);
      this.render();
      this.hookEvents();
    });

    $('um-logout')?.addEventListener('click', () => {
      if (!confirm('Limpar preferências locais (nome, tema, drafts)?')) return;
      try {
        ['office.user', 'office.theme', 'inbound.brief.draft', 'inbound.calendar'].forEach(k => localStorage.removeItem(k));
      } catch {}
      location.reload();
    });

    // Notification bell — busca /api/alerts uma vez
    this.loadAlerts();

    langBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleLang();
      this.render();
      this.hookEvents();
    });

    themeBtn?.addEventListener('click', () => {
      const ORDER = ['dark','armory','elephant','light'];
      const cur = this.getTheme();
      const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
      try { localStorage.setItem('office.theme', next); } catch {}
      applyTheme(next);
      this.render();
      this.hookEvents();
    });

    // Aplica tema salvo na primeira montagem (idempotente)
    applyTheme(this.getTheme());
  }

  async loadAlerts() {
    const items = this.shadowRoot.getElementById('bell-items');
    const badge = this.shadowRoot.getElementById('bell-badge');
    if (!items) return;
    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const alerts = data.alertas || [];
      if (alerts.length === 0) {
        items.innerHTML = '<div class="bp-item empty">Nenhum alerta no momento.</div>';
        badge.style.display = 'none';
        return;
      }
      badge.textContent = alerts.length > 9 ? '9+' : String(alerts.length);
      badge.style.display = 'inline-flex';
      items.innerHTML = alerts.slice(0, 10).map(a => {
        const tagCls = a.tipo === 'warn' ? 'warn' : 'info';
        const tagLbl = a.tipo === 'warn' ? '⚠' : 'i';
        return `<a class="bp-item" href="/painel"><span class="bp-tag ${tagCls}">${tagLbl}</span>${(a.msg || '').slice(0, 140)}</a>`;
      }).join('');
    } catch (e) {
      items.innerHTML = '<div class="bp-item empty">Não foi possível carregar alertas.</div>';
      badge.style.display = 'none';
    }
  }
}

customElements.define('office-nav', OfficeNav);

// ════════════════════════════════════════════════════════════════════════════
// THEME APPLY — seta data-theme no <html> + injeta tokens de light mode globais
// (cada página tem suas próprias CSS vars; só sobrescrevemos as comuns)
// ════════════════════════════════════════════════════════════════════════════
function applyTheme(theme) {
  const html = document.documentElement;
  // SEMPRE seta o atributo explicitamente. Páginas como /optimizer dependem
  // do CSS `[data-theme="dark"]` ativar (não funciona se o atributo for removido).
  const valid = ['dark','light','armory','elephant'];
  const t = valid.includes(theme) ? theme : 'dark';
  html.setAttribute('data-theme', t);
}

// Garante que o stylesheet de light mode global existe (injetado 1x)
(function ensureLightStyles() {
  if (document.getElementById('office-light-tokens')) return;
  const style = document.createElement('style');
  style.id = 'office-light-tokens';
  style.textContent = `
    /* Office Engine — Light Mode override (apenas onde o token existe globalmente).
       Páginas que usam CSS vars locais escuras hardcoded ficam parcialmente cobertas —
       é o trade-off prático sem reescrever 8 HTMLs. */
    :root[data-theme="light"] {
      --bg: #f8fafc;
      --bg-2: #f1f5f9;
      --surface: #ffffff;
      --surface-2: #f8fafc;
      --border: rgba(15, 23, 42, 0.08);
      --border-light: rgba(15, 23, 42, 0.06);
      --text: #0f172a;
      --text-dim: #334155;
      --text-muted: #64748b;
      --primary: #2563eb;
      --primary-light: #3b82f6;
      color-scheme: light;
    }
    :root[data-theme="light"] body {
      background: #f8fafc !important;
      color: #0f172a !important;
    }

    /* ─── GRID PATTERN GLOBAL — aplica em TODAS rotas com data-route ───────
       Opt-out: seja-voice (LP externa). Standalone — não depende de
       consulting-dark.css estar carregado na página. !important pra vencer
       hardcodes locais nas páginas legadas. */
    @media screen {
      body[data-route]:not([data-route="seja-voice"]) {
        background:
          linear-gradient(rgba(134,158,195,.04) 1px, transparent 1px) 0 0/48px 48px,
          linear-gradient(90deg, rgba(134,158,195,.04) 1px, transparent 1px) 0 0/48px 48px,
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(205,21,67,.12), transparent 60%),
          radial-gradient(ellipse 60% 50% at 100% 100%, rgba(20,184,166,.05), transparent 60%),
          #050b18 !important;
        background-attachment: fixed !important;
        font-family: 'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif !important;
        color: #e6ebf2 !important;
        -webkit-font-smoothing: antialiased;
      }
    }
    body[data-route]:not([data-route="seja-voice"]) h1,
    body[data-route]:not([data-route="seja-voice"]) h2,
    body[data-route]:not([data-route="seja-voice"]) h3 {
      font-family: 'Lexend', 'Source Sans 3', sans-serif;
      letter-spacing: -0.012em;
      font-weight: 600;
    }
    /* Light mode preserva grid mas mais sutil */
    :root[data-theme="light"] body[data-route]:not([data-route="seja-voice"]) {
      background:
        linear-gradient(rgba(0,24,68,.025) 1px, transparent 1px) 0 0/48px 48px,
        linear-gradient(90deg, rgba(0,24,68,.025) 1px, transparent 1px) 0 0/48px 48px,
        radial-gradient(ellipse 80% 60% at 50% -10%, rgba(205,21,67,.06), transparent 60%),
        #f4f7fb !important;
      color: #0f172a !important;
    }

    /* ─── ARMORY THEME ─────────────────────────────────────────────────────
       Inspirado em armory.framer.ai — terminal/tech sharp, slate-black bg,
       neon green accents, monospace, edges rectos. Aplica em todas páginas. */
    :root[data-theme="armory"] {
      --bg: #0a0a0a;
      --bg-2: #111111;
      --surface: #161616;
      --surface-2: #1c1c1c;
      --border: rgba(0, 255, 153, 0.18);
      --border-light: rgba(255, 255, 255, 0.06);
      --text: #f5f5f5;
      --text-dim: #c0c0c0;
      --text-muted: #888888;
      --primary: #00ff99;
      --primary-light: #5cffb8;
      --accent: #00ff99;
      --danger: #ff4444;
      --color-primary-500: #00ff99;
      --color-primary-600: #00d985;
      --color-surface-0: #0a0a0a;
      --color-surface-1: #161616;
      --color-surface-2: #1c1c1c;
      --color-text-primary: #f5f5f5;
      --color-text-secondary: #c0c0c0;
      --color-text-muted: #888888;
      --color-border: rgba(255,255,255,0.08);
      --dk-surface: #161616;
      --dk-text: #f5f5f5;
      --dk-text-muted: #888888;
      --home-text: #f5f5f5;
      --home-text-muted: #888888;
      color-scheme: dark;
    }
    :root[data-theme="armory"] body {
      background: #0a0a0a !important;
      color: #f5f5f5 !important;
      font-family: 'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', monospace !important;
    }
    :root[data-theme="armory"] h1,
    :root[data-theme="armory"] h2,
    :root[data-theme="armory"] h3,
    :root[data-theme="armory"] h4,
    :root[data-theme="armory"] .home-section-title {
      font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
      letter-spacing: -0.02em !important;
      text-transform: uppercase;
      color: #f5f5f5 !important;
    }
    :root[data-theme="armory"] .kpi,
    :root[data-theme="armory"] .card,
    :root[data-theme="armory"] .home-area-card,
    :root[data-theme="armory"] .home-digest-card,
    :root[data-theme="armory"] .dk-glass {
      background: #161616 !important;
      border: 1px solid rgba(0, 255, 153, 0.15) !important;
      border-radius: 2px !important;
      box-shadow: none !important;
    }
    :root[data-theme="armory"] a { color: #00ff99 !important; }
    :root[data-theme="armory"] button,
    :root[data-theme="armory"] .btn {
      border-radius: 2px !important;
      letter-spacing: 0.05em;
    }

    /* ─── ELEPHANT THEME ───────────────────────────────────────────────────
       Inspirado em groupelephant.com — bege/cream warm bg, deep green primary,
       serif headings, organic/conservation tone, soft edges. */
    :root[data-theme="elephant"] {
      --bg: #f5f1e8;
      --bg-2: #ebe5d4;
      --surface: #ffffff;
      --surface-2: #faf6ec;
      --border: rgba(45, 74, 51, 0.15);
      --border-light: rgba(45, 74, 51, 0.08);
      --text: #1f3024;
      --text-dim: #3d4f3a;
      --text-muted: #6b7464;
      --primary: #2d4a33;
      --primary-light: #4a6b50;
      --accent: #a8723f;
      --color-primary-500: #2d4a33;
      --color-primary-600: #1f3024;
      --color-surface-0: #f5f1e8;
      --color-surface-1: #ffffff;
      --color-surface-2: #faf6ec;
      --color-text-primary: #1f3024;
      --color-text-secondary: #3d4f3a;
      --color-text-muted: #6b7464;
      --color-border: rgba(45,74,51,0.15);
      --dk-surface: #ffffff;
      --dk-text: #1f3024;
      --dk-text-muted: #6b7464;
      --home-text: #1f3024;
      --home-text-muted: #6b7464;
      color-scheme: light;
    }
    :root[data-theme="elephant"] body {
      background: #f5f1e8 !important;
      color: #1f3024 !important;
      font-family: 'Source Sans 3', 'Inter', sans-serif !important;
    }
    :root[data-theme="elephant"] h1,
    :root[data-theme="elephant"] h2,
    :root[data-theme="elephant"] h3,
    :root[data-theme="elephant"] h4,
    :root[data-theme="elephant"] .home-section-title {
      font-family: 'Lexend', 'Playfair Display', 'Source Serif Pro', Georgia, serif !important;
      color: #1f3024 !important;
      letter-spacing: -0.01em !important;
      font-weight: 600 !important;
    }
    :root[data-theme="elephant"] .kpi,
    :root[data-theme="elephant"] .card,
    :root[data-theme="elephant"] .home-area-card,
    :root[data-theme="elephant"] .home-digest-card,
    :root[data-theme="elephant"] .dk-glass {
      background: #ffffff !important;
      border: 1px solid rgba(45, 74, 51, 0.12) !important;
      border-radius: 14px !important;
      box-shadow: 0 1px 3px rgba(45,74,51,0.04) !important;
      color: #1f3024 !important;
    }
    :root[data-theme="elephant"] a { color: #2d4a33 !important; }
    :root[data-theme="elephant"] .chip-online {
      background: rgba(45,74,51,0.10) !important;
      color: #2d4a33 !important;
    }
  `;
  document.head.appendChild(style);
})();

// Aplica o tema salvo o quanto antes (evita FOUC se o nav demorar pra montar)
(function preApplyTheme() {
  try {
    const saved = localStorage.getItem('office.theme') || 'dark';
    const valid = ['dark','light','armory','elephant'].includes(saved) ? saved : 'dark';
    applyTheme(valid);
  } catch {}
})();

// ════════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE — Cmd+K modal global
// ════════════════════════════════════════════════════════════════════════════
const OfficeCommandPalette = (() => {
  let overlay = null;
  let input = null;
  let list = null;
  let items = [];      // [{id, label, hint, icon, action: fn|url, group}]
  let filtered = [];
  let selectedIdx = 0;
  let isOpen = false;

  // Catalog estática + voices carregadas async em build()
  function baseItems() {
    return [
      // Rotas
      { group:'Rotas', icon:'🏠', label:'Home',                 hint:'/',           action:'/' },
      { group:'Rotas', icon:'🎮', label:'Modo Game (mapa 2D)',  hint:'/game',       action:'/game' },
      { group:'Rotas', icon:'🎙️', label:'Voice Agents',         hint:'/voices',     action:'/voices' },
      { group:'Rotas', icon:'📡', label:'Inbound Engine',       hint:'/inbound',    action:'/inbound' },
      { group:'Rotas', icon:'✎',  label:'Brief → Post',         hint:'/inbound/brief',    action:'/inbound/brief' },
      { group:'Rotas', icon:'▥',  label:'Carrossel Hub',        hint:'/inbound/carousel', action:'/inbound/carousel' },
      { group:'Rotas', icon:'▦',  label:'Calendário Editorial', hint:'/inbound/calendar', action:'/inbound/calendar' },
      { group:'Rotas', icon:'▤',  label:'Playbook (deck 19 slides)', hint:'/inbound/playbook', action:'/inbound/playbook' },
      { group:'Rotas', icon:'⚙️', label:'Painel da Duda',       hint:'/painel',     action:'/painel' },
      { group:'Rotas', icon:'🪪', label:'Profile Optimizer',    hint:'/optimizer',  action:'/optimizer' },
      { group:'Rotas', icon:'📨', label:'LP Seja um Voice',     hint:'/seja-voice', action:'/seja-voice' },
      { group:'Rotas', icon:'📜', label:'Changelog',            hint:'/changelog',  action:'/changelog' },
      // Ações
      { group:'Ações', icon:'☾',  label:'Alternar tema (dark→armory→elephant→light)', hint:'persiste', action: () => {
          const ORDER = ['dark','armory','elephant','light'];
          const cur = (localStorage.getItem('office.theme') || 'dark');
          const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
          try { localStorage.setItem('office.theme', next); } catch {}
          applyTheme(next);
        }},
      { group:'Ações', icon:'🐘', label:'ERP.ngo (externo)',    hint:'1% receita global pra conservação', action: () => window.open('https://erp.ngo', '_blank') },
    ];
  }

  async function build() {
    items = baseItems();
    // Tenta carregar voices ativos pra adicionar atalhos diretos
    try {
      const res = await fetch('/api/voices.json');
      const data = await res.json();
      (data.voices || []).forEach(v => {
        items.push({ group:'Voices', icon:'🎙️', label:v.nome, hint:`${v.cargo} · ${v.nicho}`, action:`/voices?v=${v.id}` });
      });
    } catch {}
  }

  function ensureDom() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'office-cmdk-overlay';
    overlay.innerHTML = `
      <style>
        #office-cmdk-overlay {
          position: fixed; inset: 0; background: rgba(2, 6, 23, .7);
          backdrop-filter: blur(8px); display: none;
          align-items: flex-start; justify-content: center;
          z-index: 9999; padding: 80px 16px 16px;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        #office-cmdk-overlay.open { display: flex; }
        #office-cmdk-box {
          width: min(640px, 100%); max-height: 70vh;
          background: #0d1e36; border: 1px solid rgba(37, 99, 235, 0.35);
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,.5);
          display: flex; flex-direction: column;
        }
        :root[data-theme="light"] #office-cmdk-box {
          background: #ffffff; border-color: rgba(37, 99, 235, 0.25);
          box-shadow: 0 24px 60px rgba(15,23,42,.20);
        }
        #office-cmdk-input {
          width: 100%; background: transparent; color: #e2e8f0;
          border: none; outline: none; padding: 18px 22px;
          font-size: 16px; font-family: inherit;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }
        :root[data-theme="light"] #office-cmdk-input { color: #0f172a; border-bottom-color: rgba(15,23,42,.10); }
        #office-cmdk-input::placeholder { color: #64748b; }
        #office-cmdk-list {
          overflow-y: auto; padding: 6px 0 8px;
        }
        .cmdk-group {
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          color: #64748b; padding: 10px 22px 4px;
          letter-spacing: 0.16em; text-transform: uppercase;
        }
        .cmdk-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 22px; cursor: pointer;
          color: #cbd5e1; font-size: 14px;
        }
        :root[data-theme="light"] .cmdk-item { color: #334155; }
        .cmdk-item:hover, .cmdk-item.selected {
          background: rgba(37, 99, 235, .15);
          color: #60a5fa;
        }
        :root[data-theme="light"] .cmdk-item:hover, :root[data-theme="light"] .cmdk-item.selected {
          background: rgba(37, 99, 235, .08); color: #2563eb;
        }
        .cmdk-icon { font-size: 16px; min-width: 22px; text-align: center; }
        .cmdk-label { flex: 1; font-weight: 500; }
        .cmdk-hint {
          font-family: 'JetBrains Mono', monospace; font-size: 10px;
          color: #64748b; letter-spacing: 0.04em;
        }
        #office-cmdk-footer {
          padding: 8px 16px; border-top: 1px solid rgba(255,255,255,.06);
          display: flex; justify-content: space-between; align-items: center;
          font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #64748b;
        }
        :root[data-theme="light"] #office-cmdk-footer { border-top-color: rgba(15,23,42,.08); }
        .cmdk-kbd {
          background: rgba(255,255,255,.06); padding: 2px 6px;
          border-radius: 3px; font-size: 10px;
        }
        :root[data-theme="light"] .cmdk-kbd { background: rgba(15,23,42,.06); color: #334155; }
        .cmdk-empty { padding: 30px 22px; color: #64748b; text-align: center; font-size: 13px; }
      </style>
      <div id="office-cmdk-box">
        <input id="office-cmdk-input" placeholder="Buscar rotas, Voices, ações…" autocomplete="off" />
        <div id="office-cmdk-list"></div>
        <div id="office-cmdk-footer">
          <span><span class="cmdk-kbd">↑↓</span> navegar · <span class="cmdk-kbd">Enter</span> abrir · <span class="cmdk-kbd">Esc</span> fechar</span>
          <span>EPI-USE Office · Cmd+K</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    input = overlay.querySelector('#office-cmdk-input');
    list = overlay.querySelector('#office-cmdk-list');

    // Click no overlay fora da box fecha
    overlay.addEventListener('click', e => { if (e.target.id === 'office-cmdk-overlay') close(); });

    input.addEventListener('input', () => { selectedIdx = 0; renderList(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(filtered.length - 1, selectedIdx + 1); renderList(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(0, selectedIdx - 1); renderList(); }
      else if (e.key === 'Enter') { e.preventDefault(); runSelected(); }
    });
  }

  function renderList() {
    const q = (input.value || '').trim().toLowerCase();
    filtered = !q ? items : items.filter(it =>
      it.label.toLowerCase().includes(q) ||
      (it.hint || '').toLowerCase().includes(q) ||
      (it.group || '').toLowerCase().includes(q)
    );
    if (filtered.length === 0) {
      list.innerHTML = '<div class="cmdk-empty">Nada encontrado pra "' + q + '"</div>';
      return;
    }
    // Agrupar por group preservando ordem
    const groups = [];
    const map = new Map();
    filtered.forEach((it, i) => {
      if (!map.has(it.group)) { map.set(it.group, []); groups.push(it.group); }
      map.get(it.group).push({ ...it, _gidx: i });
    });
    let html = '';
    let globalIdx = 0;
    groups.forEach(g => {
      html += `<div class="cmdk-group">${g}</div>`;
      map.get(g).forEach(it => {
        const sel = globalIdx === selectedIdx ? ' selected' : '';
        html += `<div class="cmdk-item${sel}" data-idx="${globalIdx}">
          <span class="cmdk-icon">${it.icon || '•'}</span>
          <span class="cmdk-label">${it.label}</span>
          <span class="cmdk-hint">${it.hint || ''}</span>
        </div>`;
        globalIdx++;
      });
    });
    list.innerHTML = html;
    list.querySelectorAll('.cmdk-item').forEach(el => {
      el.addEventListener('click', () => { selectedIdx = parseInt(el.dataset.idx, 10); runSelected(); });
      el.addEventListener('mouseenter', () => { selectedIdx = parseInt(el.dataset.idx, 10); list.querySelectorAll('.cmdk-item').forEach(x => x.classList.remove('selected')); el.classList.add('selected'); });
    });
    // Scroll into view
    const sel = list.querySelector('.cmdk-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function runSelected() {
    const it = filtered[selectedIdx];
    if (!it) return;
    close();
    if (typeof it.action === 'function') it.action();
    else if (typeof it.action === 'string') window.location.href = it.action;
  }

  async function open() {
    if (!items.length) await build();
    ensureDom();
    isOpen = true;
    overlay.classList.add('open');
    input.value = '';
    selectedIdx = 0;
    renderList();
    setTimeout(() => input.focus(), 30);
  }

  function close() {
    isOpen = false;
    overlay?.classList.remove('open');
  }

  return { open, close };
})();

/* ── SSO Microsoft · bootstrap do menu de usuario (add 31/mai/2026, fix selectors)
   Aditivo: le /api/auth/status e injeta item Entrar/Sair no #user-menu (Shadow DOM).
   Nao trava nada — se SSO off, mantem o comportamento antigo (Visitante).        */
;(function(){
  function setName(sr, txt){
    var n1 = sr.querySelector('.user-name'); if(n1) n1.textContent = txt;
    var n2 = sr.querySelector('.um-name');   if(n2) n2.textContent = txt;
    var av = sr.querySelector('.um-avatar'); if(av) av.textContent = (txt||'V')[0].toUpperCase();
  }
  function addItem(menu, html, href, onClick){
    var el = document.createElement(href ? 'a' : 'button');
    el.className = 'um-item'; el.innerHTML = html;
    if(href){ el.href = href; } else { el.type = 'button'; }
    if(onClick){ el.addEventListener('click', onClick); }
    menu.insertBefore(el, menu.firstChild ? menu.firstChild.nextSibling : null); // logo apos o um-head
    return el;
  }
  function initSSO(tries){
    tries = tries || 0;
    var nav = document.querySelector('office-nav');
    var sr  = nav && nav.shadowRoot;
    var btn = sr && sr.getElementById('user-btn');
    var menu = sr && sr.getElementById('user-menu');
    if(!btn || !menu){ if(tries < 40) return setTimeout(function(){ initSSO(tries+1); }, 150); return; }
    if(menu.dataset.ssoDone) return; // idempotente
    fetch('/api/auth/status').then(function(r){ return r.json(); }).then(function(s){
      if(!s || !s.enabled) return;          // SSO desligado => nada muda
      menu.dataset.ssoDone = '1';
      if(s.authenticated && s.user){
        setName(sr, s.user.given || (s.user.name||'').split(' ')[0] || s.user.email);
        var rn = sr.getElementById('um-rename'); if(rn) rn.style.display='none'; // identidade real, sem renomear
        addItem(menu, '🚪 Sair ('+s.user.email+')', '/auth/logout');
      } else {
        setName(sr, 'Entrar');
        addItem(menu, '🔐 Entrar com Microsoft', '/auth/login?returnTo=' + encodeURIComponent(location.pathname + location.search));
      }
    }).catch(function(){});
  }
  if(document.readyState !== 'loading') initSSO(); else document.addEventListener('DOMContentLoaded', function(){ initSSO(); });
})();
