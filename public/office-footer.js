// ════════════════════════════════════════════════════════════════════════════
// <office-footer> — Web Component global persistente
// Status do sistema + versão atual + dropdown de versões anteriores
// ════════════════════════════════════════════════════════════════════════════

const OFFICE_FOOTER_VERSION = '0.22.0';
const OFFICE_FOOTER_BUILD = '2026-06-08';

// SemVer real a partir de v1.0.0 (jun/2026). Versões 0.x eram pré-release.
// Bug fix → 1.0.1 | Feature nova → 1.1.0 | Refactor grande → 2.0.0
// Histórico pré-1.0 preservado abaixo para referência.
const OFFICE_VERSION_HISTORY = [
  // ─── SPRINT 18 · RD Station OAuth2 + KPIs e-mail reais (05/jun/2026) ───
  { ver: '0.14.0', date: '05/jun/2026', label: 'SPRINT 18 — RD Station integrado (OAuth2). scripts/integrations/rd_fetch.js + /auth/rd-callback + POST /api/relatorio/rd-refresh. Snapshot popula segmentações com tamanho real (paginação até 1000), workflows ativos, LPs publicadas, emails enviados. Card e-mail no /relatorio mostra: base de leads, enviados no mês, workflows ativos, LPs publicadas (fim do ⏳ "RD pendente"). Top páginas GA4 + duração média ponderada no FY também.', path: null, status: 'current' },
  // ─── SPRINT 17 · Relatório FY + GA4 anual (04/jun/2026) ───
  { ver: '0.13.0', date: '04/jun/2026', label: 'SPRINT 17 — Relatório FY (jul→jun) e GA4 12 meses. /relatorio ganha FY26 + FY27 no seletor · /api/relatorio/snapshot?fy=26|27 agrega site/linkedin/eventos/voices do ano fiscal · ga4_fetch.js ganha refreshFY(fy) (popula 12 meses) · POST /api/relatorio/ga4-refresh-fy. FY26 confirmado: 32.142 usuários · 50.404 visualizações · 36.365 sessões reais agregados do GA4. Regra de ouro 13 (dados automatizados, zero planilha) memorizada.', path: null, status: 'snapshot' },
  // ─── SPRINT 16 · Infra prod + GA4 (04/jun/2026) ───
  { ver: '0.12.0', date: '04/jun/2026', label: 'SPRINT 16 — Infra de produção + GA4. SSO Microsoft ATIVO (login @epiuse) · Railway Volume /data (SQLite persiste) · domínio office.epiuse.com.br · sync cases reescrito em Node.js (sem Python) · integração GA4 Data API (ga4_fetch.js + bloco site no /relatorio, aguarda Service Account). Botão login Microsoft na tela de entrada.', path: null, status: 'snapshot' },
  // ─── SPRINT 15 · Módulo C Painel (04/jun/2026) ───
  { ver: '0.11.0', date: '04/jun/2026', label: 'SPRINT 15 — Módulo C · Daily Digest + Inbox por área no Painel da Duda. APIs /api/painel/digest + /api/painel/inbox-duda. Auto-refresh 60s. Versionamento sincronizado (nav · footer · changelog · package.json).', path: null, status: 'snapshot' },
  { ver: '0.10.1', date: '04/jun/2026', label: 'Fix cowork — auto-cria pasta inbox em workspaces inexistentes. Correção de 5 erros nos pipe-* no Railway.', path: null, status: 'snapshot' },
  // ─── SPRINT 14 · Cowork (04/jun/2026) ───
  { ver: '0.10.0', date: '04/jun/2026', label: 'SPRINT 14 — Cowork + workflows dinâmicos entre agentes. /cowork · workflows JSON · feed unificado · 2 workflows seed (criar-artigo · nova-oferta).', path: null, status: 'snapshot' },
  // ─── SPRINT 9-13 · Optimizer + Agentes (01-03/jun/2026) ───
  { ver: '0.9.5',  date: '03/jun/2026', label: 'Padrão visual Anderson Costa aplicado nos 2 Optimizers (V1+V2) — tema dark navy #0d1b2e · Inter · print A4.', path: null, status: 'snapshot' },
  { ver: '0.9.4',  date: '02/jun/2026', label: 'Optimizer V2 — framework findskill.ai (mantém V1). 5 variáveis + 10 páginas A4 + 3 career goals.', path: null, status: 'snapshot' },
  { ver: '0.9.3',  date: '02/jun/2026', label: 'Optimizer refundado — input transcrição direto + Pág 1 com Voice Index + Resumo executivo.', path: null, status: 'snapshot' },
  { ver: '0.9.2',  date: '02/jun/2026', label: 'Optimizer simplificado — 1 template .md · IA gera artifact final. 3.500 linhas → ~400.', path: null, status: 'snapshot' },
  { ver: '0.9.1',  date: '01/jun/2026', label: 'Optimizer ZERO TOKENS — fluxo copia-prompt → cola-JSON. Office vira coletor + renderizador.', path: null, status: 'snapshot' },
  { ver: '0.9.0',  date: '01/jun/2026', label: 'SPRINT 9 — Optimizer refundado (Voice dropdown · PDF institucional por área A4 · fluxo rascunho→revisão→pronto).', path: null, status: 'snapshot' },
  { ver: '0.8.3',  date: '01/jun/2026', label: 'Pipeline 5 agentes (briefing→artigo→capa+carrossel+copy) · 17 agentes totais · Carrossel busca nos 693 artigos.', path: null, status: 'snapshot' },
  { ver: '0.8.2',  date: '01/jun/2026', label: 'Agente relatorio-mensal completo (skill + workspace + cron dia 1 08:05) · overflow nav agrupado em 5 seções.', path: null, status: 'snapshot' },
  { ver: '0.8.1',  date: '01/jun/2026', label: 'Arquitetura agentes 3-camadas + ciclo inbox/outbox real · 6 agentes de área · F9 duplicar Voice · F10 dark auto OS.', path: null, status: 'snapshot' },
  { ver: '0.8.0',  date: '31/mai/2026', label: 'SSO Microsoft (Entra ID) + 6 módulos por área com dado REAL ao vivo de Apollo/LinkedIn/Artigos/Cases.', path: null, status: 'snapshot' },
  // ─── SPRINT 7 · Estabilização + Design Codex + Dados Reais (30/mai/2026) ───
  { ver: '0.7.1',  date: '30/mai/2026', label: 'DADOS REAIS (Regra 7): /metas KPIs despluguei o fake (era 7.844 chumbado/errado → 10.481 real via API) · auditoria DE/PARA completa (AUDITORIA-DADOS-REAIS.md) · footer history consertado (0.6.1→0.6.4 estavam sumidos)', path: null, status: 'snapshot' },
  { ver: '0.7.0',  date: '30/mai/2026', label: 'ESTABILIZAÇÃO + DESIGN CODEX: localhost always-on (fix better-sqlite3 Node 24 + Tarefa Agendada, aposenta PM2) · /api/health · paleta Codex oficial (#013A6A + Open Sans, dark preservado) · protocolo multi-tool · backup tag v0.6.4-snapshot', path: null, status: 'snapshot' },
  // ─── SPRINT 6 · Design System + Brand oficial (28/mai/2026) ───
  { ver: '0.6.4',  date: '28/mai/2026', label: 'Logos EPI-USE no nav (theme-aware) · refactor 10 telas → design-tokens.css · /design viewer com hierarquia 3 brands', path: null, status: 'snapshot' },
  { ver: '0.6.3',  date: '28/mai/2026', label: 'Brand assets consolidados: ERP.ngo + Group Elephant + Open Sans self-hosted + GE PPT', path: null, status: 'snapshot' },
  { ver: '0.6.2',  date: '28/mai/2026', label: 'Cores REAIS extraídas do PPT Template Jan 2026 (XML do .pptx)', path: null, status: 'snapshot' },
  { ver: '0.6.1',  date: '28/mai/2026', label: 'DESIGN.md REAL (Brand Guide V1.1: Navy #001844 + Red) · setup PM2 · modularização /modulos/', path: null, status: 'snapshot' },
  { ver: '0.6.0',  date: '28/mai/2026', label: 'DESIGN SYSTEM unificado (Google Labs DESIGN.md spec) · /design viewer · gen_tokens.py · Rule 8 (não hardcodar hex)', path: null, status: 'snapshot' },
  { ver: '0.5.1',  date: '28/mai/2026', label: '/metas-fy26 oficial (29 metas × 6 áreas, LinkedIn 69.9% real-time) · Bug fix menu /relatorio (scrollTo shadowing) · Layout encavalado fixado · Rule 7 NO FAKE DATA · mapa-fontes-dados.md auditoria 20+ métricas · Memes-rudugues.md · Hooks lifecycle doc (manual setup)', path: null, status: 'snapshot' },
  { ver: '0.5.0',  date: '27/mai/2026', label: 'SPRINT MONSTRO: /relatorio (espelha PPT mensal) · /artigos (693 do Manus) · /jornadas (matriz LOB×etapa+gaps) · /projecoes (paid media) · /pipeline (Apollo MVP) · Skill relatorio-mensal (auto-PPT) · 5 endpoints novos · 17m história LinkedIn real', path: null, status: 'snapshot' },
  { ver: '0.4.12', date: '27/mai/2026', label: 'Optimizer split em 2 calls Sonnet (~70+70s, sem timeout) · ERP.ngo branding (logo + tokens) · Export PDF do kit (html2pdf)', path: null, status: 'snapshot' },
  { ver: '0.4.11', date: '26/mai/2026', label: 'HOTFIX: extract da transcrição (Haiku 5× rápido + AbortController + timer visual)', path: null, status: 'snapshot' },
  { ver: '0.4.10', date: '26/mai/2026', label: 'HOTFIX: + Novo Voice agora cria de verdade (PUT virou upsert)', path: null, status: 'snapshot' },
  { ver: '0.4.9', date: '26/mai/2026', label: 'Optimizer 3 modos: transcrição entrevista (Claude extrai tudo) · roteiro 12 perguntas · manual (fallback)', path: '/_versoes-office/v0.4.9-optimizer.html', status: 'snapshot' },
  { ver: '0.4.8', date: '26/mai/2026', label: 'Painel Metas LinkedIn + footer history corrigido', path: '/_versoes-office/v0.4.8-metas.html', status: 'snapshot' },
  { ver: '0.4.7', date: '26/mai/2026', label: 'Polish pré-apresentação: header /cases EPI-USE Brasil + decisões SSO/RD', path: null, status: 'snapshot' },
  { ver: '0.4.6', date: '26/mai/2026', label: 'Decorator drag-drop real no game + bateria 0.4.1→0.4.6', path: '/_versoes-office/v0.4.6-game.html', status: 'snapshot' },
  { ver: '0.4.5', date: '26/mai/2026', label: 'Sync Cases 1-click (botão OneDrive → Railway)', path: '/_versoes-office/v0.4.6-cases.html', status: 'snapshot' },
  { ver: '0.4.4', date: '26/mai/2026', label: 'Studio merge no Carrossel (mode=single)', path: '/_versoes-office/v0.4.6-inbound-carousel.html', status: 'snapshot' },
  { ver: '0.4.3', date: '26/mai/2026', label: 'RD Station endpoint (bloqueado por token, dropado depois)', path: '/_versoes-office/v0.4.6-inbound-calendar.html', status: 'snapshot' },
  { ver: '0.4.2', date: '26/mai/2026', label: 'Sync real 19 Cases Roberto + KPIs Customer Reference', path: '/_versoes-office/v0.4.6-cases.html', status: 'snapshot' },
  { ver: '0.4.1', date: '26/mai/2026', label: 'Optimizer 7 Pilares × 30 critérios + Voice Index 0-100', path: '/_versoes-office/v0.4.6-optimizer.html', status: 'snapshot' },
  { ver: '0.4.0', date: '25/mai/2026', label: 'Refactor: top menu remodel + Cases & CS Hub + Calendar API + paleta Gather', path: null, status: 'snapshot' },
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
        .foot a.erp-link { display: inline-flex; align-items: center; gap: 5px; }
        .foot a.erp-link img { display: block; opacity: 0.9; transition: opacity .15s; }
        .foot a.erp-link:hover img { opacity: 1; }
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
            <span id="ver-status-chip" style="font-size:9px;padding:2px 6px;border-radius:99px;margin-left:6px;background:rgba(134,158,195,.12);color:#869ec3" title="status do ambiente">…</span>
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
        <a href="https://erp.ngo" target="_blank" rel="noopener" class="erp-link" title="ERP.ngo · 1% receita global → conservação de elefantes e combate à pobreza rural"><img src="/assets/erp-ngo/erp-logo-white.svg" alt="ERP.ngo" height="14"> erp.ngo</a>
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
    // Status chip: detecta se essa versao é prod (live) ou local (snapshot)
    fetch('/api/changelog.json?t=' + Date.now())
      .then(r => r && r.ok ? r.json() : null)
      .then(cl => {
        if (!cl || !cl.releases) return;
        const me = cl.releases.find(r => r.version === OFFICE_FOOTER_VERSION);
        const chip = this.shadowRoot.getElementById('ver-status-chip');
        if (!chip || !me) return;
        if (me.status === 'live') {
          chip.textContent = '● live';
          chip.style.background = 'rgba(16,185,129,.18)';
          chip.style.color = '#6ee7b7';
          chip.title = 'Esta versão está em produção (Railway)';
        } else {
          chip.textContent = '◐ local';
          chip.style.background = 'rgba(251,191,36,.18)';
          chip.style.color = '#fcd34d';
          chip.title = 'Versão local — ainda não foi pra produção (commit pendente)';
        }
      })
      .catch(() => {});
  }
}

customElements.define('office-footer', OfficeFooter);
