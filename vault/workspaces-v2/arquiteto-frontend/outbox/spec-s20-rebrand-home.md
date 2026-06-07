# Spec S20 — Rebrand HOME (Command Center)

> **Autor:** Arquiteto Frontend V2
> **Data:** 2026-06-07
> **Status:** ⏸️ Aguardando aprovação humana (Rudá)
> **Entrada:** `plano-s20-rebrand-home.md` (aprovado PM Rudá)
> **Versão alvo:** v0.12.0
> **Princípio guia:** menor mudança segura · vanilla HTML/CSS/JS · consumir `design-tokens.css` · zero hex hardcoded · mobile-first.

---

## ⚠️ Decisão estrutural prévia (precisa confirmação)

A rota `/` hoje serve `public/office.html` que é o **GAME (Spawn Gate + canvas pixel art)** — NÃO um catálogo de apps como o plano descreve. O "dashboard cards" mencionado no plano é `public/dashboard.html`, servido em `/dashboard`.

**Duas leituras possíveis do plano:**
- **(A) Reescrever `office.html`** — `/` vira o novo command center; o game vai pra `/game` (já existe alias!) e o Spawn Gate atual desaparece da rota raiz.
- **(B) Reescrever `dashboard.html`** — manter game como home `/`; o command center vive em `/dashboard`.

**Recomendação do Arquiteto:** **opção (A)**. Justificativa:
1. `/game` já é alias servido por `server.js:1532` — basta inverter `/` para apontar pra um `home.html` novo (ou refactorar `office.html` inteiro).
2. O plano diz "command center pessoal do Rudá no dia-a-dia" — não faz sentido obrigar passar pelo Spawn Gate diariamente.
3. `dashboard.html` (914+ linhas, War Room) é grande demais pra refactor cirúrgico — melhor manter como referência e deixar dormindo.

**Implementação proposta:** criar `public/home.html` NOVO + alterar `server.js:1531` para servir `home.html` em `/`. O `office.html` (game) continua acessível via `/game`. Zero quebra de rota existente; reversão = 1 linha.

→ **Confirmar opção (A) ou (B) antes de C3.**

---

## 1. Audit do `office.html` (atual)

### 1.1 Estrutura atual
Arquivo de **1.368 linhas** — game canvas com:
- Spawn Gate (linhas 132-147): tela de "nome do jogador" + 2 botões (Modo Game · Dashboard)
- HUD top bar (linhas 152-161): logo · WASD hint · zone name · botão Decorar · link "Sair" pro dashboard · nome SSO
- Game canvas (linha 150): mapa 50×30 tiles, WASD, zonas de interação
- 3 modais: iframe, info, events (calendário)
- ZONES (linhas 369-490): 16+ zonas (Coffee, Hub, Inbound, baias Voices, SAP Lab, áreas MKT bullpen, etc.)

### 1.2 O que REUSAR (no `home.html` novo)
| Item | Origem (path:linha) | Uso no novo |
|---|---|---|
| `<link rel="stylesheet" href="/design-tokens.css">` | `office.html:9` | Idem (obrigatório por Regra 8) |
| `<script type="module" src="/office-nav.js">` | `office.html:10` | Idem (nav global) |
| `<script type="module" src="/office-footer.js">` | `office.html:11` | Idem |
| Daily Digest 3-cards (KPI grid) | `painel.html:62-73` | Copiar pattern p/ "Voices hoje · Eventos 7d · Pendências 🔴" |
| Toast wrapper + animation | `office.html:122-125` | Reuso pra feedback de cliques (botão SAP disabled, etc.) |
| Pattern `hdr-chip.online` (status pulse verde) | `painel.html:51-54` | Chip "Escritório Online" |
| Fetch padrão `/api/areas` + `/api/voices` + `/api/events` | server.js | Endpoints já existem |
| Tipografia oficial: Open Sans via `design-tokens.css` | `design-tokens.css:6` | Já carregada — só usar `var(--type-*)` |

### 1.3 O que SAI da rota `/` (vai pra `/game`)
- Spawn Gate inteiro (`#spawn`)
- Canvas `#gc` + HUD do game (`#hud`)
- World constants (COLS, ROWS, TS, mapTiles)
- OBJECTS array
- ZONES array
- Sistema de render (renderMap, renderObjects, renderPlayer, renderZones, renderMinimap)
- DECORATOR panel
- Iframe modal · Info modal · Events modal (NÃO vão pra home — quem quiser usa o game ou rotas diretas)
- `Press Start 2P` (não usar na home — Open Sans só)
- `Inter` Google Font (não usar — tem Open Sans self-hosted no design-tokens)

### 1.4 O que vem de outros lugares
- **Estrutura de KPI grid** — `painel.html:62-73`
- **Padrão de section header (linha + label uppercase)** — `painel.html:57-60`
- **Lista de áreas + ferramentas + KPIs** — `public/api/areas.json` (já existe, 6 áreas)
- **Pendências bloqueadas/pendentes** — parse de `vault/00-contexto/pendencias.md` via NOVO endpoint `/api/pendencias`
- **Metas FY26** — `public/api/metas-fy26.json` (já existe!) + cross-ref com `areas.json:funil[].meta`
- **Voices ativos** — `public/api/voices.json` (já existe)
- **Próximos eventos** — `public/api/events.json` (já existe)
- **Hero elefante** — VERIFICAR `public/assets/logos-group-elephant/` (existe pasta — listar conteúdo no C1)

---

## 2. Wireframe textual da home nova

Layout vertical, **mobile-first** (320px → empilha tudo; ≥768px ativa grid; ≥1024px otimiza espaçamento). Max-width `1280px` (segue padrão do `dashboard.html`).

```
┌──────────────────────────────────────────────────────────────────────┐
│ [HEADER MINIMAL · sticky · 64px]                                     │
│  🏢 EPI-USE Office  ·  "Bom dia, Rudá"  ·  ● Escritório Online       │
│                                            ☀️/🌙  ·  👤 Rudá Costa  │
├──────────────────────────────────────────────────────────────────────┤
│ [HERO STRIP · 88px · gradient navy→blue-light]                       │
│  🐘 Elefante SVG (left)  ·  Centro: "Command Center · FY26"          │
│  ·  Right: chip versão "v0.12.0"                                     │
├──────────────────────────────────────────────────────────────────────┤
│ [DIGEST PESSOAL · 3 cards · grid 1/2/3 cols responsive]              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                                 │
│  │ 🎙️ VOICES│ │ 📅 EVENT │ │ 🔴 ALERT │                                 │
│  │  2 ativos│ │  3 em 7d │ │  1 bloq. │                                 │
│  │  posts hj│ │  próx:X  │ │  SSO B1  │                                 │
│  └─────────┘ └─────────┘ └─────────┘                                 │
├──────────────────────────────────────────────────────────────────────┤
│ [METAS FY26 · strip horizontal · scrollable mobile]                  │
│ SEC HDR "── METAS FY26 ──"                                           │
│  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐                            │
│  │Site  ││LinkedIn││Insta ││Email ││Events│                            │
│  │ ⏳   ││ 42% ▓▓▓░││ ⏳   ││ ⏳   ││ 0/30 │                            │
│  └──────┘└──────┘└──────┘└──────┘└──────┘                            │
├──────────────────────────────────────────────────────────────────────┤
│ [GRID 6 ÁREAS + SAP · grid auto-fill minmax(260px, 1fr)]             │
│ SEC HDR "── ÁREAS ──"                                                │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐            │
│  │ 🧠 Intelligence │ │ 🚀 Growth       │ │ 📅 Eventos      │            │
│  │ Bruna Yamagami │ │ Gui Marques    │ │ Isabela        │            │
│  │ ────           │ │ ────           │ │ ────           │            │
│  │ KPI 1: 39.166  │ │ KPI 1: 10.640  │ │ KPI 1: ⏳      │            │
│  │ KPI 2: 14.027  │ │ KPI 2: +159/mo │ │ KPI 2: ⏳      │            │
│  │ ▁▂▃▄ spark     │ │ ▂▃▅▇ spark     │ │ ─── spark      │            │
│  │ [Abrir área →] │ │ [Abrir área →] │ │ [Abrir área →] │            │
│  └────────────────┘ └────────────────┘ └────────────────┘            │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐            │
│  │ 📞 Pipeline    │ │ 🎨 Brand       │ │ 📣 Conteúdo    │            │
│  │ Marlison       │ │ Duda           │ │ Lisiane        │            │
│  │ ...            │ │ ...            │ │ ...            │            │
│  └────────────────┘ └────────────────┘ └────────────────┘            │
│  ┌────────────────┐                                                  │
│  │ ⚗️ SAP Comp.    │ ← DISABLED · opacity 0.55 · cursor not-allowed   │
│  │ 🔜 em breve    │                                                  │
│  └────────────────┘                                                  │
├──────────────────────────────────────────────────────────────────────┤
│ [QUICK ACTIONS · 3 buttons inline]                                   │
│  [🪪 Optimizer]  [🤝 Cowork]  [🎯 Painel Duda]                       │
├──────────────────────────────────────────────────────────────────────┤
│ [ALERTAS & BLOQUEIOS · lista]                                        │
│ SEC HDR "── ALERTAS & BLOQUEIOS ──"                                  │
│  ● 🔴 B1 · SSO Microsoft — falta config Azure (3 passos)             │
│  ● 🔴 B2 · Planilha Duda — calendar editorial                        │
│  ● ⚠️  P0 · Volume Railway SQLite (cada deploy reseta cases)         │
├──────────────────────────────────────────────────────────────────────┤
│ [FOOTER]  office-footer.js já cuida                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Breakpoints
- **`< 480px`** (mobile portrait): header colapsa nome SSO; hero esconde texto centro (só elefante + chip versão); digest 1 coluna; metas strip horizontal scroll; grid áreas 1 coluna; quick actions empilham.
- **`480-767px`** (mobile landscape / tablet portrait): digest 2 cols; áreas 1 col.
- **`768-1023px`**: digest 3 cols; áreas 2 cols.
- **`≥1024px`**: digest 3 cols; áreas 3 cols.

---

## 3. Swatches do Dark Mode (CRÍTICO — aprovar antes de C4)

**Princípio:** todos derivados do `design-tokens.css` existente (`--color-neutral-dark-*` já está lá). Onde precisar de um navy/red Brand puro, usar `--color-primary-navy/red` direto.

### Dark mode — 11 cores
| Token home | Hex (referência) | Origem token | Uso |
|---|---|---|---|
| `--home-bg` | `#0a1525` | `--color-neutral-dark-bg` | Fundo geral da página |
| `--home-bg-2` | `#050d18` | `--color-neutral-dark-bg-2` | Footer / áreas mortas |
| `--home-surface` | `#0f1e35` | `--color-neutral-dark-surface` | Cards (digest · áreas · alertas) |
| `--home-surface-2` | `#142547` | `--color-neutral-dark-surface-2` | Hover state dos cards |
| `--home-accent-navy` | `#001844` | `--color-primary-navy` | Barra lateral esquerda dos cards de área (3px solid) |
| `--home-accent-red` | `#cd1543` | `--color-primary-red` | Badges 🔴 · CTAs primários · pulse de alerta |
| `--home-accent-blue` | `#869ec3` | `--color-secondary-blue-light` | Links · spark lines · hover de chips |
| `--home-border` | `rgba(134,158,195,0.18)` | `--color-neutral-dark-border` | Borda padrão de cards |
| `--home-text` | `#e6ebf2` | `--color-neutral-dark-text` | Body text |
| `--home-text-muted` | `#869ec3` | `--color-neutral-dark-text-muted` | Labels · KPI sub |
| `--home-hero-grad` | `linear-gradient(135deg, #001844 0%, #142547 100%)` | composto | Background do hero strip |

### Light mode — 11 cores
| Token home | Hex (referência) | Origem token | Uso |
|---|---|---|---|
| `--home-bg` | `#f0f4f8` | `--color-neutral-light-bg` | Fundo geral |
| `--home-bg-2` | `#e7e6e6` | `--color-neutral-light-bg-2` | Footer / áreas mortas |
| `--home-surface` | `#ffffff` | `--color-neutral-light-surface` | Cards |
| `--home-surface-2` | `#f5f7fa` | `--color-neutral-light-surface-2` | Hover state cards |
| `--home-accent-navy` | `#001844` | `--color-primary-navy` | Barra lateral · headings · CTAs |
| `--home-accent-red` | `#cd1543` | `--color-primary-red` | Badges 🔴 · alertas |
| `--home-accent-blue` | `#869ec3` | `--color-secondary-blue-light` | Links secundários · spark lines (versão escura mais saturada `#395170`) |
| `--home-border` | `#d7dad6` | `--color-neutral-light-border` | Borda padrão |
| `--home-text` | `#1f2933` | `--color-neutral-light-text` | Body text |
| `--home-text-muted` | `#797979` | `--color-neutral-light-text-muted` | Labels · KPI sub |
| `--home-hero-grad` | `linear-gradient(135deg, #001844 0%, #395170 100%)` | composto | Hero strip mantém navy mesmo em light (Brand statement) |

**Decisão chave:** o **hero strip** permanece com fundo navy/Brand mesmo em light mode — reforça identidade EPI-USE. Texto no hero sempre branco.

**Toggle:** `[data-theme="dark"|"light"]` no `<html>` — já mapeado em `design-tokens.css:164-190`. Default = dark (continuidade com o que Rudá usa hoje). Persistir em `localStorage.theme`.

---

## 4. Spec do hover card (CSS dos cards de área)

```css
/* Card de área — estrutura fixa */
.area-card {
  /* Layout */
  aspect-ratio: 3 / 4;
  min-width: 260px;
  max-width: 320px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;  /* head · kpis · spark · footer */
  padding: var(--space-lg);
  gap: var(--space-md);

  /* Visual */
  background: var(--home-surface);
  border: 1px solid var(--home-border);
  border-left: 3px solid var(--home-accent-navy);
  border-radius: var(--radius);  /* 12px */
  box-shadow: 0 1rem 2rem -1rem rgba(0,24,68,0.45);
  backdrop-filter: blur(calc(var(--cardblur, 5) * 1px));

  /* Interaction */
  cursor: pointer;
  text-decoration: none;
  color: var(--home-text);
  transition: transform 180ms ease, box-shadow 180ms ease,
              border-color 180ms ease, background 180ms ease;
}

.area-card:hover {
  transform: translateY(-4px);
  background: var(--home-surface-2);
  border-color: var(--home-accent-blue);
  box-shadow: 0 1.4rem 2.6rem -1rem rgba(0,24,68,0.65);
}

.area-card:focus-visible {
  outline: 2px solid var(--home-accent-red);
  outline-offset: 3px;
}

/* Estado DISABLED (SAP Competitor) */
.area-card.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
  pointer-events: none;  /* bloqueia click */
  filter: grayscale(0.4);
}

.area-card.is-disabled::after {
  content: '🔜 em breve';
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  font: var(--type-label-sm-font-weight) var(--type-label-sm-font-size)/1 var(--type-label-sm-font-family);
  letter-spacing: var(--type-label-sm-letter-spacing);
  text-transform: uppercase;
  padding: 4px 8px;
  background: var(--home-accent-red);
  color: white;
  border-radius: var(--rounded-sm);
}

/* Mobile — relaxa aspect-ratio (vertical demais em phone) */
@media (max-width: 480px) {
  .area-card {
    aspect-ratio: auto;
    min-height: 220px;
    max-width: none;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .area-card { transition: none; }
  .area-card:hover { transform: none; }
}
```

**Sub-componentes do card:**
- `.area-card__head` → ícone (32px) + nome área + dona (text-muted, 12px)
- `.area-card__kpis` → 2 KPIs em pilha vertical (label uppercase 11px + valor 24px Open Sans bold)
- `.area-card__spark` → SVG inline 100% × 32px (3 ou 4 pontos — basta histórico simples)
- `.area-card__footer` → "Abrir área →" alinhado à direita, accent-blue

**Fallback KPI null:** mostrar `⏳` + label `aguarda integração` (cumpre Regras 6+7).

---

## 5. Arquivos-alvo por checkpoint

> Critério geral: cada checkpoint precisa **smoke test manual** + **rodar localhost 3000** + **screenshot** antes de marcar feito (Regra "não dizer feito sem prova").

### C1 · Audit + wireframe + swatches (esta spec)
- **Cria:** `vault/workspaces-v2/arquiteto-frontend/outbox/spec-s20-rebrand-home.md` (este arquivo)
- **Edita:** nada
- **Teste:** revisão humana
- **Aceite:** Rudá aprovar (a) opção A/B · (b) swatches dark + light · (c) tratamento SAP disabled · (d) wireframe estrutural

### C2 · Endpoint `/api/pendencias` + parser
- **Cria:** nada
- **Edita:** `C:/epiuse-mkt-office/server.js` — adicionar:
  - Constante `PENDENCIAS_MD = path.join(__dirname, '../vault/00-contexto/pendencias.md')` *(verificar path relativo a `server.js` — provavelmente `../../vault/...`)*
  - Função `parsePendencias(md)` — regex defensiva por heading + emoji
  - `app.get('/api/pendencias', ...)` retornando `{ bloqueadas: [...], dropadas: [...], pendentes: [...], entregues: [...], gerado_em: ISO }`
- **Sem dependência npm nova** — `fs.readFileSync` + regex puro
- **Teste:**
  ```bash
  curl http://localhost:3000/api/pendencias | jq '.bloqueadas | length'
  ```
- **Aceite:** retorno JSON tem ≥2 bloqueadas (B1 SSO · B2 Planilha Duda) + parser não quebra se algum bloco estiver vazio + responde em < 100ms

### C3 · Estrutura HOME + light mode + grid 6 áreas (sem dark ainda)
- **Cria:**
  - `C:/epiuse-mkt-office/public/home.html` (novo — substitui `/` se opção A aprovada)
  - `C:/epiuse-mkt-office/public/css/home.css` (CSS isolado da home)
  - `C:/epiuse-mkt-office/public/js/home.js` (fetch áreas/voices/eventos/pendencias + render)
- **Edita:**
  - `C:/epiuse-mkt-office/server.js:1528` — adicionar `const HOME_HTML = path.join(__dirname, 'public/home.html');`
  - `C:/epiuse-mkt-office/server.js:1531` — trocar `OFFICE_HTML` por `HOME_HTML`
  - (deixa `/game` apontando pra `OFFICE_HTML` — game preservado)
- **Teste:**
  - `http://localhost:3000/` carrega nova home em light mode (forçar `data-theme="light"` no HTML)
  - `http://localhost:3000/game` carrega o game antigo
  - 6 cards renderizam (puxados de `/api/areas`)
  - SAP card 7º com selo "🔜 em breve" + click bloqueado
  - Hover sobe -4px + sombra mais escura
  - DevTools 320px: sem scroll horizontal, cards empilham
- **Aceite:** `grep -E "#[0-9a-fA-F]{6}" public/css/home.css | wc -l` retorna **0** (zero hex hardcoded — só `var(--*)`)

### C4 · Dark mode + toggle persistente + hero elefante
- **Cria:** nada
- **Edita:**
  - `public/css/home.css` — bloco `[data-theme="dark"]` com overrides (ou usar tokens already-themed)
  - `public/js/home.js` — função `initTheme()`: lê `localStorage.theme` (default `'dark'`) · seta `<html data-theme>` · liga toggle no header
  - `public/home.html` — botão `<button id="theme-toggle">☀️</button>` no header · `<svg>` ou `<img>` do elefante no hero
- **Assets a verificar** (Bash `ls C:/epiuse-mkt-office/public/assets/logos-group-elephant/`): se houver SVG, usa inline; senão `<img>` com `loading="lazy"`. Se nada servir, placeholder SVG inline minimal (sai como pendência).
- **Teste:**
  - Toggle alterna sem flash branco
  - Reload preserva o tema escolhido
  - Light → dark → light → reload → permanece no último
  - Hero elefante visível ≥ 320px sem distorcer
- **Aceite:** `document.fonts.check('1em "Open Sans"')` retorna `true` em ambos os modos

### C5 · Daily Digest preenchido + Metas FY26 + Alertas + polish final
- **Cria:** nada
- **Edita:**
  - `public/js/home.js` — wire up dos 3 cards do digest (fetch `/api/voices`, `/api/events`, `/api/pendencias`)
  - `public/js/home.js` — strip de metas (fetch `/api/metas-fy26.json` — já existe — ou derivar de `areas.json:funil[].meta`)
  - `public/js/home.js` — render lista alertas (consome `/api/pendencias.bloqueadas`)
  - `public/home.html` — saudação dinâmica (`Bom dia/tarde/noite` por `Date().getHours()`)
- **Bump:** `package.json` version `0.11.x → 0.12.0` · `modulos/00-design-system/CHANGELOG.md` (se tocou tokens — nesta sprint NÃO toca)
- **Teste end-to-end:**
  - Adicionar linha `### B3. Teste` em `pendencias.md` → reload home → aparece na lista
  - Cards áreas com KPI null exibem `⏳ aguarda integração`
  - Smoke test: `/cases /voices /pipeline /relatorio /painel /game` todos respondem 200
- **Aceite:** lighthouse local ≥ 90 perf · zero erro console · CHANGELOG atualizado
- **Push:** NÃO. Commit local. Rudá precisa falar "sobe" pra cada push (Regra 3).

---

## 6. Trade-offs / decisões abertas pro Rudá

1. **🔴 Opção A vs B** — refactor `office.html` (game vai pra `/game`) OU `dashboard.html` (game continua sendo `/`)?
   **Recomendação:** A. Esperando confirmação.

2. **Arquivo único vs split** — `home.html` inline (CSS+JS dentro) seguindo padrão atual do projeto, OU separar em `home.css` + `home.js`?
   **Recomendação:** SPLIT (`home.html` + `css/home.css` + `js/home.js`). Já que `office.html` tem 1.368 linhas e virou monstro, começar a home modularizada evita repetir o erro. Isolamento (Risco R2 do plano) também fica melhor com CSS em arquivo próprio.

3. **Spark line** — SVG inline gerado em JS (zero dependência, customizável) OU usar Chart.js (já carregado no `painel.html` por CDN)?
   **Recomendação:** SVG inline puro. 4 pontos de histórico = `<polyline points="0,20 10,15 20,8 30,5"/>`, custo zero. Chart.js seria overkill pra spark de 32px.

4. **Hero elefante** — qual asset? (verificar `public/assets/logos-group-elephant/` em C1 antes de codar C4). Se nada serve, placeholder SVG estilizado OU pedir Duda?

5. **Saudação SSO** — usar nome do SSO real (`/api/auth/status`) ou hardcoded "Rudá" como fallback (já que SSO ainda não tá enforced em prod)?
   **Recomendação:** tentar SSO; se `enabled:false` ou usuário não logado, mostrar "Rudá" hardcoded (é home pessoal dele).

---

## 7. Riscos técnicos novos (além dos do plano)

| # | Risco | Mitigação |
|---|---|---|
| T1 | Path relativo de `pendencias.md` pode quebrar em prod Railway (estrutura de pasta diferente) | Em C2, usar `process.env.VAULT_PATH` com fallback `path.join(__dirname, '../vault')`. Logar path resolvido no boot. |
| T2 | Trocar `/` de `office.html` pra `home.html` quebra bookmarks de quem usava o game | Mitigado: `/game` já é alias funcional. Documentar mudança no commit message. |
| T3 | `office-nav.js` pode esperar contexto do game (variáveis globais) | Verificar `office-nav.js` em C3 — provavelmente não, já que dashboard.html já usa o mesmo nav. |
| T4 | `--cardblur` não existe em `design-tokens.css` | Já tem fallback no CSS (`var(--cardblur, 5)`). Opcionalmente adicionar token em sprint futura via DESIGN.md (NÃO esta sprint). |

---

## 8. Próximo passo

Aguardar aprovação humana desta spec (decisões 1-5 da seção 6).

Após aprovação → tarefa pro **Revisor QA** validar a spec (sanity check estrutural) → depois execução começa por **C2** (endpoint `/api/pendencias`) já que **C1 = esta spec** está entregue.

---

**Spec salva em:** `C:/epiuse-mkt-office/vault/workspaces-v2/arquiteto-frontend/outbox/spec-s20-rebrand-home.md`
**Aprova? Ajusta? Cancela?**
