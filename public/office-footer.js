// ════════════════════════════════════════════════════════════════════════════
// <office-footer> — Web Component global persistente
// Status do sistema + versão atual + dropdown de versões anteriores
// ════════════════════════════════════════════════════════════════════════════

const OFFICE_FOOTER_VERSION = '0.4.6';
const OFFICE_FOOTER_BUILD = '2026-05-26';

// Schema semver pré-1.0 — explicação em vault/00-contexto/versioning.md
// Versões antigas que começavam com "v2.X" ou "v3.X" foram renumeradas pra 0.2.X / 0.3.X
// (semver indica pré-1.0 enquanto não há "release oficial"). URLs dos snapshots no
// disco mantêm o prefixo antigo (v3.X) pra não quebrar links — só o label visual mudou.
const OFFICE_VERSION_HISTORY = [
  { ver: '0.4.0', date: '25/mai/2026', label: 'Refactor: top menu remodel + Cases & CS Hub + Calendar API + paleta Gather + Inbound paleta unificada + RD Station + SSO doc', path: null, status: 'current' },
  { ver: '0.3.5', date: '25/mai/2026', label: 'Quick wins + Optimizer Sonnet + Voices auto-fill via Vision', path: '/_versoes-office/v3.4-inbound-hub.html', status: 'snapshot' },
  { ver: '0.3.4', date: '25/mai/2026', label: 'Inbound Engine + Carrossel Hub + chip de versão + footer dropdown', path: '/_versoes-office/v3.4-inbound-hub.html', status: 'snapshot' },
  { ver: '0.3.3', date: '24/mai/2026', label: 'office-nav + office-footer + SQLite', path: '/_versoes-office/v3.1-game-engine.html', status: 'snapshot' },
  { ver: '0.3.2', date: '24/mai/2026', label: 'Painel da Duda + post tracker', path: '/_versoes-office/v3.2-painel.html', status: 'snapshot' },
  { ver: '0.3.1', date: '23/mai/2026', label: 'Voices + LP Seja um Voice', path: '/_versoes-office/v3.1-voices.html', status: 'snapshot' },
  { ver: '0.3.0', date: '23/mai/2026', label: 'Sprint Maximalist — Painel + Voice Agents + LP', path: '/_versoes-office/v3.0-game-engine.html', status: 'snapshot' },
  { ver: '0.2.2', date: '23/mai/2026', label: 'Optimizer integrado ao Voices + agenda dinâmica', path: '/_versoes-office/v2.2-game-engine.html', status: 'snapshot' },
  { ver: '0.2.1', date: '23/mai/2026', label: 'Game Engine 2D + Dashboard duplo', path: '/_versoes-office/v2.1-game-engine.html', status: 'snapshot' },
  { ver: '0.2.0', date: '23/mai/2026', label: 'Office Engine 2D inaugural', path: '/_versoes-office/v2.0-game-engine.html', status: 'snapshot' }
];

class OfficeFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.hookEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin-top: 32px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .foot {
          background: rgba(6, 14, 26, 0.85);
          border-top: 1px solid rgba(37, 99, 235, 0.18);
          padding: 14px 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 11px;
          color: #475569;
        }
        .foot a { color: #60a5fa; text-decoration: none; cursor: pointer; }
        .foot a:hover { text-decoration: underline; }
        .foot .sep { opacity: 0.4; }
        .status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #10b981;
        }
        .status::before {
          content: '';
          width: 6px; height: 6px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 6px #10b981;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .ver-tag {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 10px;
          color: #94a3b8;
          letter-spacing: 0.08em;
        }
        /* Dropdown de versões */
        .ver-picker {
          position: relative;
          display: inline-block;
        }
        .ver-trigger {
          background: rgba(37,99,235,0.10);
          border: 1px solid rgba(37,99,235,0.25);
          color: #60a5fa;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding: 4px 9px;
          border-radius: 5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: background .15s, border-color .15s;
        }
        .ver-trigger:hover { background: rgba(37,99,235,0.20); border-color: rgba(37,99,235,0.50); }
        .ver-trigger .arrow { font-size: 8px; opacity: 0.7; }
        .ver-menu {
          display: none;
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          min-width: 320px;
          max-width: 92vw;
          background: #0d1e36;
          border: 1px solid rgba(37,99,235,0.30);
          border-radius: 10px;
          padding: 6px;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.5);
          z-index: 50;
          max-height: 60vh;
          overflow-y: auto;
        }
        .ver-menu.open { display: block; }
        .ver-menu .ver-head {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 9px;
          color: #64748b;
          padding: 8px 10px 6px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .ver-menu .ver-item {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 6px;
          text-decoration: none;
          color: #cbd5e1;
          font-size: 12px;
          transition: background .12s;
          cursor: pointer;
        }
        .ver-menu .ver-item:hover { background: rgba(37,99,235,0.10); text-decoration: none; }
        .ver-menu .ver-item.disabled {
          color: #64748b;
          cursor: default;
          pointer-events: none;
        }
        .ver-menu .ver-item .v {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #60a5fa;
          min-width: 40px;
        }
        .ver-menu .ver-item.disabled .v { color: #94a3b8; }
        .ver-menu .ver-item.current .v {
          color: #10b981;
        }
        .ver-menu .ver-item.current::after {
          content: 'atual';
          font-size: 9px;
          font-family: 'JetBrains Mono', monospace;
          color: #10b981;
          background: rgba(16,185,129,0.12);
          padding: 1px 6px;
          border-radius: 3px;
          margin-left: auto;
        }
        .ver-menu .ver-item .lbl { flex: 1; line-height: 1.3; }
        .ver-menu .ver-item .lbl .meta { display: block; font-size: 10px; color: #64748b; margin-top: 2px; }
        .ver-menu .ver-foot {
          padding: 8px 10px;
          border-top: 1px solid rgba(148,163,184,0.10);
          margin-top: 4px;
          font-size: 11px;
        }
        .ver-menu .ver-foot a {
          color: #60a5fa;
          text-decoration: none;
        }
        .ver-menu .ver-foot a:hover { text-decoration: underline; }

        @media (max-width: 580px) {
          .foot { font-size: 10px; gap: 8px; padding: 12px 14px; }
          .ver-tag, .ver-trigger { font-size: 9px; }
          .ver-menu { min-width: 280px; }
        }
      </style>
      <footer class="foot" role="contentinfo">
        <span class="ver-tag">EPI-USE OFFICE</span>
        <div class="ver-picker">
          <button class="ver-trigger" id="ver-trigger" type="button" title="Ver versões anteriores">
            <span>${OFFICE_FOOTER_VERSION}</span>
            <span class="arrow">▴</span>
          </button>
          <div class="ver-menu" id="ver-menu" role="menu">
            <div class="ver-head">Versões anteriores</div>
            ${OFFICE_VERSION_HISTORY.map(v => {
              const isCurrent = v.status === 'current';
              const cls = isCurrent ? 'current disabled' : '';
              const href = isCurrent || !v.path ? '#' : v.path;
              const target = isCurrent ? '' : ' target="_blank" rel="noopener"';
              return `<a class="ver-item ${cls}" href="${href}"${target}>
                <span class="v">${v.ver}</span>
                <span class="lbl">${v.label}<span class="meta">${v.date}</span></span>
              </a>`;
            }).join('')}
            <div class="ver-foot">
              <a href="/changelog">📜 Changelog completo →</a>
            </div>
          </div>
        </div>
        <span class="sep">·</span>
        <span class="status">sistemas online</span>
        <span class="sep">·</span>
        <a href="https://erp.ngo" target="_blank" rel="noopener">🐘 ERP.ngo</a>
        <span class="sep">·</span>
        <span>build ${OFFICE_FOOTER_BUILD}</span>
      </footer>
    `;
  }

  hookEvents() {
    const trigger = this.shadowRoot.getElementById('ver-trigger');
    const menu = this.shadowRoot.getElementById('ver-menu');
    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', () => menu?.classList.remove('open'));
  }
}

customElements.define('office-footer', OfficeFooter);
