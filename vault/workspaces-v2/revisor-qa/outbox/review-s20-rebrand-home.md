# Review S20 — Rebrand HOME (Command Center)

> **Autor:** Revisor QA V2
> **Data:** 2026-06-07
> **Entrada:** `plano-s20-rebrand-home.md` (PM Técnico) + `spec-s20-rebrand-home.md` (Arquiteto Frontend)
> **Status do Rudá:** aprovou plano + spec + 5 decisões (Opção A · split · SVG inline · checar elefante · SSO+fallback)
> **Versão alvo:** v0.12.0

---

## 1. Classificação final

**🟡 APROVADO COM RESSALVAS**

Plano + spec estão sólidos, escopo seguro, critérios de aceite mensuráveis, arquivos-alvo nomeados com path absoluto. NÃO bloqueia execução, mas C2/C3/C4 precisam tratar **5 ressalvas** explicitamente antes de marcar checkpoint como pronto.

Decisão técnica: pode começar por **C2** imediatamente (C1 = a própria spec, já entregue e aprovada).

---

## 2. Conferência checklist obrigatório (bloqueadores)

| Item | Status | Evidência |
|---|---|---|
| Arquivos-alvo com path absoluto | ✅ | Spec §5 lista cada path em `C:/epiuse-mkt-office/public/...` |
| Comando de teste por checkpoint | ✅ | C2 tem curl · C3 tem URL · C4 tem `document.fonts.check` · C5 tem smoke test |
| Critério de aceite mensurável | ✅ | "< 1.5s", "0 hex hardcoded", "≥ 90 lighthouse perf", "≥ 2 bloqueadas" |
| HTML/CSS/JS vanilla | ✅ | Spec recusa Chart.js (SVG inline), zero framework |
| Mobile-first com breakpoints | ✅ | Spec §2 lista 4 breakpoints (320 / 480 / 768 / 1024) + media query reduced-motion |
| Dados reais ou placeholder etiquetado | ✅ | Spec §4 trata KPI null → "⏳ aguarda integração" (Regras 6+7) |
| Branding EPI-USE preservado | ⚠️ | Ver Ressalva R3 — divergência tipografia plano vs design-tokens.css real |
| Push prod NÃO incluído sem ordem | ✅ | Spec C5: "Push: NÃO. Commit local. Rudá precisa falar 'sobe' pra cada push (Regra 3)" |
| CSS isolado da home | ✅ | Spec C3 cria `public/css/home.css` separado (decisão SPLIT) |
| Dark mode sem alterar design-tokens.css | ✅ | Spec usa tokens existentes via `[data-theme="dark"]` e cria `--home-*` derivados |

**Nenhum bloqueador encontrado.** Verificação adicional dos pontos sinalizados pelo Rudá abaixo.

---

## 3. Verificações extras solicitadas pelo Rudá

### 3.1 Asset elefante existe? (Decisão 4)
**✅ SIM.** Verificado: `C:/epiuse-mkt-office/public/assets/logos-group-elephant/ge-logo.svg` existe. **Desbloqueia C4** — não precisa Rudá fornecer asset novo nem usar placeholder genérico. Path absoluto pro código: `/assets/logos-group-elephant/ge-logo.svg` (servido pelo express static).

### 3.2 Alias `/game` existe?
**✅ SIM.** `server.js:1532` → `app.get('/game', (req, res) => res.sendFile(OFFICE_HTML));`. Opção A é segura: trocar `server.js:1531` de `OFFICE_HTML` pra `HOME_HTML` preserva o game em `/game`. **Reversão = 1 linha.**

### 3.3 Tokens disponíveis para a spec
Conferi `public/design-tokens.css`:

| Token usado na spec | Existe? |
|---|---|
| `--color-primary-navy` (#001844) | ✅ |
| `--color-primary-red` (#cd1543) | ✅ |
| `--color-secondary-blue-light` (#869ec3) | ✅ |
| `--color-secondary-blue-mid` (#395170) | ✅ |
| `--color-neutral-dark-bg/bg-2/surface/surface-2/border/text/text-muted` | ✅ (todos) |
| `--color-neutral-light-bg/bg-2/surface/surface-2/border/text/text-muted` | ✅ (todos) |
| `--space-xs/sm/md/lg/xl/2xl/3xl/4xl` | ✅ |
| `--rounded-sm/md/lg/xl/full` + `--radius` (alias de `--rounded-lg`) | ✅ |
| `--type-label-sm-*` (font-family/size/weight/letter-spacing/text-transform) | ✅ |
| `--cardblur` | ⚠️ **NÃO existe** — spec usa fallback `var(--cardblur, 5)` então não quebra, mas blur fica fixo em 5px sempre. OK pra esta sprint. |

**Veredito:** todos os tokens críticos existem. Risco T4 da spec já tem fallback bem definido.

### 3.4 Parser `/api/pendencias` — robustez do regex (C2)
Conferi formato real de `pendencias.md` (linha por linha do grep):
- `## 🔴 BLOQUEADO POR TERCEIROS` (não `## BLOQUEADAS`)
- `## 🟡 DROPADO` (não `## DROPADAS`)
- `## ⚠️ ACHADO 26/mai noite — SQLite no Railway...` ← **5º bucket que a spec esqueceu**
- `## 🟢 PENDENTE DE EXECUÇÃO`
- `## ✅ ENTREGUE`

Itens dentro são `### B1.`, `### B2.`, `### P0.`, `### P2.`, etc.

**⚠️ Ressalva R1 (ver §4):** parser proposto retorna 4 buckets (`bloqueadas/dropadas/pendentes/entregues`) mas o .md tem **5** (falta `achados` ou similar pro bloco ⚠️). Senão o P0 do SQLite vira invisível. Plano R1 manda parser defensivo, mas precisa cobrir esse bucket extra.

### 3.5 Hover card aspect-ratio 3/4 + 260px width em mobile
Spec §4 já trata: `@media (max-width: 480px) { .area-card { aspect-ratio: auto; min-height: 220px; max-width: none; } }`. **OK.** Mas há um risco escondido: `min-width: 260px` no card combinado com `grid auto-fill minmax(260px, 1fr)` no container vai forçar scroll horizontal em viewports entre **320-379px** (iPhone SE = 320px, container com padding 16px deixa só 288px úteis). Ressalva R2.

### 3.6 office-nav.js já gerencia tema!
**🚨 ACHADO NOVO — não estava em plano nem spec.** Confirmado em `public/office-nav.js`:
- Linha 728: comentário "THEME APPLY — seta data-theme no <html>"
- Linha 735: `html.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')`
- Linhas 747-900+: usa próprio bloco de light-mode overrides + comando `Cmd+K`

Spec C4 propõe `<button id="theme-toggle">☀️</button>` novo no header da home + função `initTheme()` em `home.js` lendo `localStorage.theme`. **Isso cria controle DUPLICADO** — vai concorrer com o toggle que o `office-nav` já provê. Ressalva R4 (alta prioridade).

---

## 4. Ressalvas a tratar durante execução

### R1 (alta) — Parser de pendências tem 5 buckets, não 4
**Onde:** C2 · `server.js` · função `parsePendencias()`
**Tratamento obrigatório:**
- Adicionar 5º bucket `achados` (ou nome melhor — `criticos_infra`?) pro heading `## ⚠️ ACHADO`.
- Retornar `{ bloqueadas, dropadas, achados, pendentes, entregues, gerado_em }`.
- Bloco `Alertas & Bloqueios` (C5) deve agregar `bloqueadas + achados` — senão o P0 SQLite Railway some da lista visível.
- Documentar mapping emoji→bucket em comentário no topo da função.
- **Teste:** `curl /api/pendencias | jq '.achados | length'` retorna ≥ 1 (P0 SQLite atual).

### R2 (média) — Grid auto-fill quebra entre 320-379px
**Onde:** C3 · `home.css` · grid de áreas
**Tratamento obrigatório:**
- Em `@media (max-width: 480px)` (já existe), trocar `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))` por `grid-template-columns: 1fr`. Forçar 1 coluna até 480px.
- A partir de 480px, sim aplica `minmax(260px, 1fr)`.
- **Teste:** DevTools 320px → grep visual: 0 scroll horizontal · cada card ocupa largura total.

### R3 (média) — Divergência tipografia plano vs realidade
**Onde:** Plano §1 cita "Maven Pro + Avenir". Realidade do `design-tokens.css`: tudo é **Open Sans** com fallback histórico pra Maven/Verdana. CLAUDE.md regra 8 também cita Maven+Avenir.
**Tratamento obrigatório:**
- C5 — **não tentar** carregar Maven Pro / Avenir via `@font-face` ou Google Fonts. Usar as vars `--type-*-font-family` que o design-tokens.css já provê (Open Sans hoje).
- Critério de aceite ajustado: `document.fonts.check('1em "Open Sans"')` é o teste correto (já tá certo na spec C4, só plano que ficou desatualizado).
- Decisão arquitetural maior (voltar pra Maven Pro / Avenir do Brand Guide V1.1) é fora deste sprint — abrir como pendência separada se Rudá quiser.

### R4 (alta) — Toggle de tema duplicado com office-nav
**Onde:** C4 · `home.html` e `home.js`
**Tratamento obrigatório:**
- **NÃO criar** `<button id="theme-toggle">` próprio no header da home.
- **NÃO criar** função `initTheme()` no `home.js`.
- O `<office-nav>` (Web Component custom element) JÁ provê toggle e persistência via Cmd+K. Reusar.
- Se Rudá quiser um toggle mais visível na home, conversa SEPARADA com Arquiteto pra **mover** o controle pro `office-nav.js` (assim toda tela ganha), nunca duplicar.
- Spec C4 muda: a parte do "toggle persistente" vira `// reuso do office-nav` + render do botão elefante no hero.
- **Teste:** abrir DevTools, mudar tema via `Cmd+K` no office-nav → home reflete sem necessidade de listener próprio.

### R5 (baixa) — Path de `pendencias.md` em Railway (T1 da spec)
**Onde:** C2 · `server.js`
**Tratamento obrigatório (já endereçado pelo Arquiteto mas reforço):**
- Usar `process.env.VAULT_PATH || path.join(__dirname, '../vault')` (NÃO `'..'` simples — em Railway `__dirname` é diferente).
- Logar path resolvido no boot: `console.log('[pendencias] lendo de', PENDENCIAS_MD);`.
- Se arquivo não existir, retornar `{ bloqueadas: [], dropadas: [], achados: [], pendentes: [], entregues: [], gerado_em: ISO, erro: 'arquivo nao encontrado' }` em vez de 500. Frontend exibe estado vazio gracioso.

---

## 5. Checklist de execução pro Claude Codificador (checkpoint a checkpoint)

### ✅ C1 — Audit + wireframe + swatches
- [x] Spec entregue e aprovada pelo Rudá. **Sem ação adicional.**

### ☐ C2 — Endpoint `/api/pendencias` + parser
- [ ] Abrir `C:/epiuse-mkt-office/server.js` e localizar bloco perto de `/api/areas` pra inserir.
- [ ] Definir `PENDENCIAS_MD = process.env.VAULT_PATH ? path.join(process.env.VAULT_PATH, '00-contexto/pendencias.md') : path.join(__dirname, '../vault/00-contexto/pendencias.md');`
- [ ] Implementar `parsePendencias(md)` cobrindo **5 buckets** (R1):
  - `## 🔴 BLOQUEADO POR TERCEIROS` → `bloqueadas`
  - `## 🟡 DROPADO` → `dropadas`
  - `## ⚠️ ACHADO` → `achados`
  - `## 🟢 PENDENTE DE EXECUÇÃO` → `pendentes`
  - `## ✅ ENTREGUE` → `entregues`
- [ ] Cada item: extrair título da heading `### X1. <texto>` + linhas seguintes até próximo `###` ou `##`.
- [ ] `app.get('/api/pendencias', ...)` retorna `{ bloqueadas, dropadas, achados, pendentes, entregues, gerado_em, fonte }`.
- [ ] Logar path resolvido no boot.
- [ ] **Teste:** `curl http://localhost:3000/api/pendencias | jq '{b: .bloqueadas|length, a: .achados|length}'` → `b ≥ 2 && a ≥ 1`.
- [ ] **Teste:** renomear pendencias.md temporariamente → reload → endpoint retorna estrutura vazia + campo `erro`, NÃO 500.
- [ ] Smoke test: `/cases /voices /pipeline /relatorio /painel /game /` todos respondem 200 ainda.
- [ ] **Screenshot ou print do curl** colado como prova antes de marcar feito.

### ☐ C3 — HOME light mode + grid 6 áreas
- [ ] Criar pasta `C:/epiuse-mkt-office/public/css/` (não existe).
- [ ] Criar pasta `C:/epiuse-mkt-office/public/js/` (não existe).
- [ ] Criar `public/home.html` com `<link rel="stylesheet" href="/design-tokens.css">` + `<link rel="stylesheet" href="/css/home.css">` + `<script type="module" src="/office-nav.js">` + `<script type="module" src="/js/home.js">` + `<script type="module" src="/office-footer.js">`.
- [ ] Criar `public/css/home.css` consumindo SÓ `var(--*)`. **Zero hex hardcoded** (grep ≡ 0).
- [ ] **R2:** em `@media (max-width: 480px)`, grid de áreas vira `grid-template-columns: 1fr`.
- [ ] Criar `public/js/home.js` (módulo ES) fetchando `/api/areas` + render dos cards.
- [ ] Card SAP Competitor: `.is-disabled` + `selo "🔜 em breve"` + `pointer-events:none`.
- [ ] KPI `null` → texto `⏳ aguarda integração` (Regras 6+7).
- [ ] `server.js:1528-1531`: adicionar `const HOME_HTML = path.join(__dirname, 'public/home.html');` e trocar `app.get('/', ...) → HOME_HTML`. Deixar `/game → OFFICE_HTML`.
- [ ] **Teste:** `http://localhost:3000/` carrega home nova; `/game` ainda carrega game; DevTools 320px sem scroll horizontal.
- [ ] **Teste:** `grep -E "#[0-9a-fA-F]{3,6}" public/css/home.css | wc -l` → **0**.
- [ ] **Screenshot mobile (320px) + desktop (1280px)** antes de marcar feito.
- [ ] Smoke test rotas existentes (`/cases /voices /pipeline /relatorio /painel`).

### ☐ C4 — Dark mode polido + hero elefante
- [ ] Em `public/css/home.css`, adicionar bloco `[data-theme="dark"]` se necessário (provavelmente nem precisa — tokens dark já são default).
- [ ] **R4: NÃO criar** `theme-toggle` próprio. Reuso de `<office-nav>` já carrega o toggle via Cmd+K. Anotar no `home.html` em comentário: `<!-- toggle de tema: ver office-nav.js (Cmd+K) -->`.
- [ ] Hero strip: `<img src="/assets/logos-group-elephant/ge-logo.svg" alt="EPI-USE Elephant" loading="lazy" width="64" height="64">` (asset confirmado existente).
- [ ] Hero usa `--home-hero-grad` (gradient navy → secondary-blue-mid).
- [ ] **Teste:** trocar tema via Cmd+K → home segue o tema sem flash branco; reload preserva.
- [ ] **Teste:** elefante visível em viewport 320px sem distorcer (`aspect-ratio` preservado).
- [ ] **Teste:** `document.fonts.check('1em "Open Sans"')` → `true` em ambos os temas.
- [ ] **Screenshot dark + light** antes de marcar feito.

### ☐ C5 — Daily Digest + Metas FY26 + Alertas + polish
- [ ] `home.js`: fetch paralelo de `/api/voices`, `/api/events`, `/api/pendencias`, `/api/metas-fy26` (ou `metas-fy26.json` direto se for static).
- [ ] Digest card 1: `🎙️ Voices` → contar `voices.json.length` ou ativos.
- [ ] Digest card 2: `📅 Eventos 7d` → contar `events.json` com `data` entre hoje e hoje+7.
- [ ] Digest card 3: `🔴 Alertas` → `pendencias.bloqueadas.length + pendencias.achados.length`.
- [ ] Metas FY26 strip: 5 chips (Site, LinkedIn, Insta, Email, Events). Valor real onde existir, `⏳` etiquetado onde for `null`.
- [ ] Saudação dinâmica: `Bom dia/tarde/noite, Rudá` por `new Date().getHours()`.
- [ ] Tentar fetch `/api/auth/status` pra nome SSO (decisão 5); fallback hardcoded "Rudá" se vier `enabled:false` ou 401.
- [ ] Lista "Alertas & Bloqueios": consumir `pendencias.bloqueadas` + `pendencias.achados` (R1 — não esquecer P0 SQLite).
- [ ] **Teste end-to-end:** adicionar linha `### B3. Teste QA` em `pendencias.md` → reload home → aparece na lista. Remover.
- [ ] **Teste lighthouse local** (DevTools → Lighthouse → Performance) ≥ 90.
- [ ] **Teste console:** zero erro/warning.
- [ ] Bumpar `package.json` `0.11.x → 0.12.0`.
- [ ] Commit local (mensagem: `feat(home): rebrand command center · S20 · v0.12.0`). **NÃO push.**
- [ ] Atualizar `modulos/00-design-system/CHANGELOG.md` se aplicável (esta sprint NÃO tocou tokens — provavelmente nada a adicionar lá; criar entrada em `modulos/<NN-home>/CHANGELOG.md` se módulo existir).
- [ ] **Screenshot completo do command center funcional** antes de marcar feito.
- [ ] Reportar pro Rudá: "Pronto local. Quer que eu suba?"

---

## 6. Riscos extras (além dos que PM + Arquiteto listaram)

| # | Risco novo | Probab. | Impacto | Mitigação |
|---|---|---|---|---|
| Q1 | Bucket `## ⚠️ ACHADO` esquecido pelo parser esconde P0 crítico do Railway | Alta | Alto | R1 — adicionar 5º bucket explícito. |
| Q2 | Toggle tema duplicado entre `home.html` e `office-nav` causa estado inconsistente (clicar um não atualiza o outro) | Alta | Médio | R4 — reusar office-nav, NÃO criar toggle próprio. |
| Q3 | Grid de áreas com `minmax(260px, 1fr)` força scroll horizontal em 320-379px | Alta | Médio | R2 — `1fr` único até 480px. |
| Q4 | Plano cita Maven Pro/Avenir mas design-tokens.css usa Open Sans — risco de carregar fontes extras desnecessariamente | Média | Baixo | R3 — não tentar carregar Maven/Avenir, usar `--type-*` existentes. |
| Q5 | `public/css/` e `public/js/` NÃO existem — codificador precisa criar pastas antes (não é apenas tocar arquivo) | Baixa | Baixo | C3 checklist primeiro item. |
| Q6 | `home.js` como ES module precisa `<script type="module">` — esquecer quebra silenciosamente | Baixa | Médio | C3 checklist do `home.html`. |

---

## 7. Próximo passo

**Pode codar.** Pipeline: começar por **C2** (endpoint pendências). C1 já entregue (spec).

Codificador segue checklist da §5 checkpoint por checkpoint, com prova visual/curl/grep antes de marcar cada um. As 5 ressalvas (R1-R5) são tratadas durante execução, não exigem volta ao Arquiteto nem ao PM.

Se Rudá quiser revisar as ressalvas R1 ou R4 antes (são as de maior peso arquitetural), responder com "pausa" antes de C2 começar.

---

**Review salvo em:** `C:/epiuse-mkt-office/vault/workspaces-v2/revisor-qa/outbox/review-s20-rebrand-home.md`
**Classificação:** 🟡 APROVADO COM RESSALVAS (R1 + R4 são alta prioridade)
