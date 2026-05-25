// ════════════════════════════════════════════════════════════════════════════
// <office-nav> — Web Component vanilla, sem build, sem deps
// Nav global persistente em todas as rotas do Office Engine v3.3+
// Briefing do Claude Design: 5 seções, logomark à esquerda, controles à direita.
// ════════════════════════════════════════════════════════════════════════════

// Versão atual exposta no chip ao lado do logomark.
// Manter em sincronia com office-footer.js (OFFICE_FOOTER_VERSION).
const OFFICE_NAV_VERSION = 'v3.4';

const OFFICE_NAV_TABS = [
  { id: 'hub',      label: 'Hub',      icon: '🏠', href: '/dashboard',   matches: ['hub'] },
  { id: 'voices',   label: 'Voices',   icon: '🎙️', href: '/voices',     matches: ['voices'] },
  { id: 'inbound',  label: 'Inbound',  icon: '📡', href: '/inbound',     matches: ['inbound'] },
  { id: 'hub-mkt',  label: 'MKT Hub',  icon: '📈', href: '/hub',         matches: ['hub-mkt'] },
  { id: 'painel',   label: 'Painel',   icon: '⚙️', href: '/painel',     matches: ['painel'] }
];

const OFFICE_NAV_OVERFLOW = [
  { label: '📜 Histórico de versões',   href: '/changelog' },
  { label: '🪪 Profile Optimizer',       href: '/optimizer' },
  { label: '📨 Seja um Voice (LP)',      href: '/seja-voice' },
  { label: '🐘 ERP.ngo',                 href: 'https://erp.ngo', external: true },
  { label: '🎮 Modo Game',               href: '/game' }
];

class OfficeNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.hookEvents();
  }

  getActiveRoute() {
    // 1. data-route do body tem prioridade
    const bodyRoute = document.body?.dataset?.route;
    if (bodyRoute) return bodyRoute;
    // 2. fallback: detecta da URL
    const path = location.pathname;
    if (path === '/' || path === '/dashboard' || path.startsWith('/game')) return 'hub';
    if (path.startsWith('/voices') || path.startsWith('/optimizer') || path.startsWith('/seja-voice')) return 'voices';
    if (path.startsWith('/inbound')) return 'inbound';
    if (path.startsWith('/hub')) return 'hub-mkt';
    if (path.startsWith('/painel')) return 'painel';
    if (path.startsWith('/changelog')) return 'changelog';
    return '';
  }

  getUser() {
    try { return localStorage.getItem('office.user') || 'Visitante'; }
    catch { return 'Visitante'; }
  }

  getTheme() {
    try { return localStorage.getItem('office.theme') || 'dark'; }
    catch { return 'dark'; }
  }

  render() {
    const activeRoute = this.getActiveRoute();
    const user = this.getUser();
    const theme = this.getTheme();
    const themeIcon = theme === 'dark' ? '☾' : '☀';

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
          font-family: 'Press Start 2P', 'Courier New', monospace;
          font-size: 11px;
          color: var(--nav-accent);
          text-decoration: none;
          letter-spacing: 0.06em;
          padding: 6px 10px;
          border-radius: 6px;
          transition: background .15s;
          white-space: nowrap;
        }
        .logo:hover { background: var(--nav-hover-bg); }
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
          background: var(--nav-active-bg);
          border-color: var(--nav-active-border);
          color: var(--nav-accent);
          font-weight: 600;
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
        @media (max-width: 720px) {
          .logo { font-size: 9px; padding: 5px 7px; }
          .tab { padding: 7px 10px; font-size: 11px; }
          .tab-label { display: none; }
          .ctrl-btn .kbd { display: none; }
        }
      </style>

      <nav class="nav-bar" role="navigation" aria-label="Office navigation">
        <a class="logo" href="/dashboard" aria-label="Voltar ao Hub">EPI-USE</a>
        <a class="ver-chip" href="/changelog" title="Versão atual — clique para ver histórico">${OFFICE_NAV_VERSION}</a>

        <div class="tabs" role="tablist">
          ${OFFICE_NAV_TABS.map(t => {
            const isActive = t.matches.includes(activeRoute);
            return `<a class="tab ${isActive ? 'active' : ''}" href="${t.href}" data-tab="${t.id}" role="tab" aria-selected="${isActive}">
              <span class="tab-ico">${t.icon}</span>
              <span class="tab-label">${t.label}</span>
            </a>`;
          }).join('')}
        </div>

        <div class="controls">
          <button class="ctrl-btn" id="cmdk-btn" title="Command palette (em breve)" type="button">⌘<span class="kbd">K</span></button>
          <button class="ctrl-btn" id="theme-btn" title="Trocar tema (light em breve)" type="button">${themeIcon}</button>
          <button class="user-chip" id="user-btn" type="button">👤 ${user}</button>
          <div class="overflow-wrap">
            <button class="ctrl-btn" id="more-btn" title="Mais opções" type="button">⋯</button>
            <div class="overflow-menu" id="overflow-menu">
              ${OFFICE_NAV_OVERFLOW.map(it => {
                const tgt = it.external ? ' target="_blank" rel="noopener"' : '';
                return `<a class="overflow-item" href="${it.href}"${tgt}>${it.label}</a>`;
              }).join('')}
            </div>
          </div>
        </div>
      </nav>
    `;
  }

  hookEvents() {
    const overflowBtn = this.shadowRoot.getElementById('more-btn');
    const overflowMenu = this.shadowRoot.getElementById('overflow-menu');
    const userBtn = this.shadowRoot.getElementById('user-btn');
    const cmdkBtn = this.shadowRoot.getElementById('cmdk-btn');
    const themeBtn = this.shadowRoot.getElementById('theme-btn');

    overflowBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      overflowMenu.classList.toggle('open');
    });

    // Click fora fecha overflow
    document.addEventListener('click', () => overflowMenu?.classList.remove('open'));

    userBtn?.addEventListener('click', () => {
      const cur = this.getUser();
      const next = prompt('Trocar nome de exibição:', cur === 'Visitante' ? '' : cur);
      if (next !== null) {
        const clean = next.trim().slice(0, 24) || 'Visitante';
        try { localStorage.setItem('office.user', clean); } catch {}
        this.render();
        this.hookEvents();
      }
    });

    cmdkBtn?.addEventListener('click', () => {
      alert('⌘K Command Palette chega na v3.5 (próxima sprint).');
    });

    themeBtn?.addEventListener('click', () => {
      alert('Light mode chega na v3.5 — por enquanto, dark only.');
    });

    // Keyboard shortcut placeholder
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        alert('⌘K Command Palette chega na v3.5.');
      }
    });
  }
}

customElements.define('office-nav', OfficeNav);
