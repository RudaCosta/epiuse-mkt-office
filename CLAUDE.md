# EPI-USE Marketing — Escritório Virtual

> Este arquivo é carregado automaticamente em toda sessão do Claude Code nesta pasta.
> Define identidade, regras e estrutura do escritório virtual de agentes.

---

## 🏢 O que é este projeto

Workspace de Marketing da **EPI-USE Brasil** organizado como um **escritório virtual de agentes de IA**. Contém:

1. **Vault Obsidian** (`vault/`) — memória compartilhada e workspaces dos agentes
2. **5 sub-agentes Claude Code** (`.claude/agents/`) — CEO + Criativos + LPs + Propostas + Campanhas
3. **7 slash commands** (`.claude/commands/`) — atalhos para fluxos comuns
4. **Aplicações construídas** — Profile Optimizer (Módulo A), Marketing Hub portals, Office Engine (em design)
5. **Documentos mestres** — `EPI-USE-OFFICE-MASTER-BRIEF.md` e `vault/00-contexto/`

---

## 🚀 Comece sempre por aqui

Em qualquer sessão nova, faça **NA ORDEM**:

1. **⚠️ PRIMEIRA AÇÃO OBRIGATÓRIA:** ler `vault/00-contexto/pendencias.md` e listar as pendências bloqueadas (🔴 e 🟡) pro Rudá ANTES de qualquer outra coisa. Regra estabelecida 26/mai/2026: lembrar dele toda conversa até resolver.
2. **Leia o contexto** — `vault/00-contexto/empresa.md` + `projetos.md` + `branding.md` + `pessoas.md`
3. **Veja o estado do escritório** — `vault/workspaces/ceo/_vt.md`
4. **Pegue o pedido do humano** e roteie pelo slash command certo

## 🥇 Regras de ouro (acordadas com Rudá — INEGOCIÁVEIS)

1. **Lembrar pendências em TODA conversa** — abrir `vault/00-contexto/pendencias.md` e listar 🔴 + 🟡 no topo da primeira resposta de cada nova sessão E também recapitular brevemente quando o user vier com pedido novo durante a mesma sessão.

2. **Avisar quando bater ~75% do contexto** — usar marcador no início da resposta tipo `⚠️ Estamos em ~75% da conversa. Sugiro /compact pra não perder histórico.` Estimar pelo volume de mensagens trocadas + tamanho de outputs.

3. **Push pra Railway SÓ sob ordem explícita E para CADA push individual** — Rudá tem que falar literalmente "sobe", "deploy", "push", "sobe pro railway" antes de CADA `git push`. Uma ordem dada no início da sessão NÃO autoriza pushes posteriores. Se eu fizer mudanças e quiser deployar, eu PERGUNTO "quer que eu suba?". Caso negativo: faço só commit local, ou nem isso. **Violei essa regra em 26/mai (0.4.7, 0.4.9, 0.4.10, 0.4.11) — Rudá ralou. Não repetir.**

4. **Sempre re-sync os cases** depois de cada push (workaround do P0 do SQLite Railway não persistir) usando `eubr-voices-edit-2026` como EDITOR_TOKEN.

5. **Ler arquivos automaticamente quando user passar path** (27/mai/2026) — quando user mandar `@"C:\..."` ou `@"G:\..."`, eu já leio direto via skill (`xlsx`/`pdf`/`pptx`/Read/Bash) **sem perguntar**. Suporto: PDF (pypdf), XLS/XLSX (pandas + openpyxl), PPT/PPTX (python-pptx), DOCX (python-docx), MD/TXT, imagens (Vision), CSV. SharePoint URL não dá pra ler — pedir baixar local ou anexar no chat. **Violação 27/mai:** disse "não achei" sem nem tentar — Rudá ralou.

6. **Marcar conteúdo INVENTADO vs REAL em tudo que gerar** (27/mai/2026) — quando um dashboard, card, número, sugestão ou texto for placeholder/estimativa/IA-gerado/exemplo, deixar **etiqueta clara**:
   - `📝 Dado de demonstração` (mock/seed)
   - `⚠️ Estimativa — premissa: X` (calculado)
   - `🤖 Gerado por IA — revisar` (Sonnet/Haiku output)
   - `⏳ Aguardando integração [X]` (placeholder pendente)
   - `🔮 Projeção (não realizado)` (forecast)

   Nunca deixar número fictício se passando por real. Aplica em: `/relatorio`, `/projecoes`, `/pipeline`, kits do Optimizer, sugestões de pauta, cenários de paid media, etc.

7. **REAL DATA ONLY — não trabalhamos com dados fakes** (28/mai/2026) — **TODO dashboard, métrica, KPI, card, gráfico tem que ser dado REAL**. Quando placeholder for inevitável (integração ainda não rolou), **etiqueta clara `⏳ Aguarda integração [fonte]`** + linkar com plano de transformação em `vault/00-contexto/mapa-fontes-dados.md`. Cada novo dado/dashboard que eu criar passa pelo crivo: "isso é real?". Se não for, **bloquear publicação** e expor o gap pro Rudá decidir (integrar agora ou marcar pendente). **Esta regra ATUALIZA e ESTENDE a regra 6** — regra 6 cobre conteúdo gerado (IA, exemplos), regra 7 cobre **dados de fonte** (números, métricas, KPIs). Inventar número se passando por real **NÃO É PERMITIDO** em hipótese alguma.

   **Mapa-fonte completo:** `vault/00-contexto/mapa-fontes-dados.md` (auditoria 20+ métricas) — manter sempre atualizado.

8. **Design System — DESIGN.md é fonte única da verdade** (28/mai/2026 · v1.0 oficial com Brand Guide V1.1) — toda mudança de cor, tipografia, spacing, rounded, elevation ou componente atômico do Office passa por `vault/00-contexto/DESIGN.md` (formato Google Labs DESIGN.md spec). **Nunca hardcodar hex em CSS local** — sempre `var(--color-*)` consumindo o `public/design-tokens.css` (gerado por `scripts/design/gen_tokens.py`). **Brand Guide oficial:** `vault/00-contexto/brand-guide-oficial/EPIUSE Brand Guide V1.1.pdf` · cores reais Navy `#001844` + Red `#cd1543` + Blue Light `#869ec3` + Grey `#cfd1d3` · fontes **Maven Pro** (primary) + **Avenir** (secondary).

   **Workflow:**
   1. Editar `vault/00-contexto/DESIGN.md` (YAML frontmatter + markdown body)
   2. Rodar `python modulo-a-profile-optimizer/scripts/design/gen_tokens.py`
   3. Reload browser → mudança propaga em TODAS as telas que consomem o CSS
   4. Validar visualmente em `/design` (viewer Storybook lite)

   **Sub-palettes preservadas:** `primary-*` (Office app azul) · `secondary-*` (ERP.ngo navy `#131B41`) · `tertiary-*` (ERP.ngo brown) · `brand-epiuse-*` (legacy corporate). **NÃO misturar identidades** sem propósito.

   **Telas novas SEMPRE devem linkar** `<link rel="stylesheet" href="/design-tokens.css">` no `<head>`.

9. **Modularização — cada módulo tem seu próprio histórico** (28/mai/2026) — pra evitar alucinação de contexto entre módulos diferentes, cada um vive em `modulos/NN-nome/` com seu próprio `README.md` (propósito · status · arquivos-chave) · `CHANGELOG.md` (histórico de versões) · `DECISIONS.md` (decisões arquiteturais + rationale) · `PENDENCIAS.md` (TODO específico). Quando user pedir algo de um módulo X, abrir SÓ `modulos/NN-X/` + `CLAUDE.md` raiz — não puxar contexto de outros módulos. Índice geral em `modulos/README.md`.

   **Módulos existentes (28/mai):** `00-design-system` · `01-relatorio-mensal` · `02-voices-optimizer` · `03-metas-fy26` · `04-artigos-blog` · `05-cases-cs` · `06-inbound` · `07-pipeline-apollo` · `99-integracoes-pendentes`.

10. **Localhost lifecycle = Tarefa Agendada Windows** (30/mai/2026 · v0.7.0 — substitui PM2) — Office sobe sozinho **ao fazer login** (tarefa `EPI-USE-Office`) + **auto-restart a cada 5min** se cair (tarefa `EPI-USE-Office-Health` via `/api/health`). Zero `.bat`, zero PM2 (era frágil no Windows). **NUNCA matar processo node sem ordem explícita do Rudá.** Reiniciar manual: `scripts/lifecycle/start-office.ps1`. Parar manual: `scripts/lifecycle/stop-office.ps1`. Logs: `logs/office.log` + `logs/office.err.log`. Setup inicial (1x): `powershell -ExecutionPolicy Bypass -File scripts/lifecycle/install-task.ps1` (sem admin). **⚠️ Causa raiz de instabilidade (resolvida 30/mai):** Node foi pra v24 e o `better-sqlite3` (binário nativo) ficou incompatível (ABI 108 vs 137) → server crashava no boot. Fix: `better-sqlite3@12.x` (prebuilt) em `C:\Users\Ruds\.epiuse-optimizer`. Se o Node atualizar de novo e o localhost cair, rodar `npm install better-sqlite3@latest` naquela pasta. Scripts `.ps1` devem ser **ASCII-only** (PowerShell 5.1 quebra com acento sem BOM).

11. **Roadmap SEMPRE aberto no início de cada atividade** (30/mai/2026 · REGRA DE OURO) — toda nova atividade/sessão começa abrindo o STATUS do roadmap no plano (painel direito do Claude), com **data e hora** no topo + **pendências humanas do Rudá** (o que está bloqueado esperando ele). Gerar snapshot versionado em `roadmap/roadmap-MM-DD-AAAA-HH.md` (1 `.md` por atividade). Fonte viva: `vault/00-contexto/ROADMAP.md` + `vault/00-contexto/SPRINTS.md`.

12. **Repo vive em `C:\epiuse-mkt-office\` (NÃO mais no Google Drive)** (30/mai/2026 · v0.7.1) — código + vault no git (GitHub `RudaCosta/epiuse-mkt-office`), em disco LOCAL. Drive (`G:\Meu Drive\Claude MKT EUBR\`) virou SÓ backup legado + arquivos-fonte (brand PDFs, planilhas xls/docx, PPTs que o app lê). **Editar SEMPRE em `C:\epiuse-mkt-office\`** — editar no Drive sofre clobber do sync (causou o caos de versionamento). Multi-máquina via `git clone`/`git pull`. node_modules nativos em `C:\Users\Ruds\.epiuse-optimizer`.

---

## 📋 Slash commands disponíveis

| Comando | Quando usar |
|---|---|
| `/onboard` | Primeira sessão ou após adicionar contexto novo |
| `/nova-oferta <url\|descrição>` | Lançar campanha completa (copy + criativos + LP) |
| `/criativos <pedido>` | Mockups e copies de anúncios |
| `/lp <pedido>` | LP, quiz, dashboard HTML |
| `/proposta <transcrição>` | Proposta comercial a partir de reunião |
| `/campanha <url\|brief>` | Análise de concorrente ou plano de mídia |
| `/contratar <especialidade>` | CEO contrata novo agente |

---

## 👥 Sub-agentes (invocáveis via Agent tool) — arquitetura 3 camadas

> Mapa visual: tela `/agentes` no Office + `vault/agentes/_mapa-contexto.md`. Cada agente lê SÓ sua fatia do contexto mestre (escopo declarado no próprio `.claude/agents/<nome>.md`).

**🎯 Orquestrador** — `ceo-mkt`: pedido envolve múltiplas áreas, priorização, ou contratar agente.

**🏢 Agentes de área** (1 por dona — donos do contexto da área):

| `subagent_type` | Dona | Use quando o pedido for sobre… |
|---|---|---|
| `area-intelligence` | Bruna | CRM, lead scoring, attribution, higiene de base, funil |
| `area-growth` | Gui | mídia paga, SEO/pautas, LinkedIn growth, briefing agência |
| `area-eventos` | Fernanda | eventos BR/LATAM, MDF SAP, ativações, tática elefante |
| `area-pipeline` | Marlison | outbound Apollo, prospecção C-Level, sequências |
| `area-brand` | Duda | identidade visual, Voices, Inbound, Cases, tom |
| `area-conteudo` | Lisiane | artigos, curadoria, jornadas de compra por LOB |

**🛠️ Executores transversais** (chamados pelas áreas via inbox):

| `subagent_type` | Use quando |
|---|---|
| `criativos` | Design gráfico, copy de anúncio, briefing visual |
| `landing-pages` | Codar HTML single-file (LP, quiz, dashboard) |
| `propostas` | Transformar transcrição em proposta comercial |
| `campanhas` | Analisar Meta Ads ou estruturar campanha |
| `relatorio-mensal` | Gerar PPT mensal pra diretoria (skill `relatorio-mensal` + python-pptx) |

**🏭 Pipeline de Conteúdo** (cadeia 5-etapas — cada agente aciona o próximo):

| `subagent_type` | Etapa | Input → Output |
|---|---|---|
| `pipe-briefing` | 1/5 — Briefing Architect | Pauta crua → briefing estruturado (tese·CTA·SEO) |
| `pipe-artigo` | 2/5 — Redator SEO/GEO | Briefing → artigo publicável (600-2000 palavras) |
| `pipe-capa` | 3/5 — Art Director | Artigo → brief visual capa OG 1200×630 |
| `pipe-carrossel` | 4/5 — Carousel Designer | Artigo → 8 slides LI (md + JSON) |
| `pipe-copy-li` | 5/5 — LI Copywriter | Artigo+carrossel → 3 versões de copy do post |

**Roteamento:** pedido de uma área → agente de área (que aciona executores). Pedido transversal/multi-área → `ceo-mkt`. Pedido puramente de execução (ex: "codar essa LP") → executor direto.

---

## 📂 Estrutura da vault

```
vault/
├── 00-contexto/      ← memória compartilhada (TODOS os agentes leem)
│   ├── empresa.md    ← EPI-USE Brasil, frentes, LOBs
│   ├── projetos.md   ← Voices, Hubs, Office Engine
│   ├── branding.md   ← cores, tom, regras
│   └── pessoas.md    ← Duda, Roberto, Voices ativos
│
├── agentes/          ← perfis Obsidian dos agentes
│   ├── _index.md     ← diretório
│   ├── ceo.md
│   ├── criativos.md
│   ├── landing-pages.md
│   ├── propostas.md
│   └── campanhas.md
│
├── workspaces/<agente>/
│   ├── inbox/        ← pedidos recebidos
│   ├── outbox/       ← entregas (pendente revisão)
│   └── _vt.md        ← memória de trabalho do agente
│
└── entregas/         ← versões finais aprovadas (read-only)
```

---

## 🎯 Projetos ativos (resumo)

| Projeto | Status | Caminho |
|---|---|---|
| **Profile Optimizer (Módulo A)** | ✅ Construído | `modulo-a-profile-optimizer/` |
| **EPI-USE Voices — programa** | ✅ MVP rodando (2 Voices ativos) | (operação humana + Módulo A) |
| **Marketing Hub portal** | ✅ Em produção | `Estudos/onboarding-epiuse-brasil.html` |
| **Sales Hub portal** | ✅ Em produção | `Estudos/mkt-hub-epiuse-brasil.html` |
| **Office Engine** | 📐 Spec pronta, a codar | `EPI-USE-OFFICE-MASTER-BRIEF.md` |
| **Painel da Duda (Módulo C)** | ⏳ A construir | `modulo-c-painel/` |
| **Voice Agents (Módulo B)** | ⏳ A construir | `modulo-b-agentes/` |

---

## ⚖️ Regras inegociáveis

### Sempre
- Português do Brasil em toda interface e conteúdo
- Branding EPI-USE — ler `vault/00-contexto/branding.md`
- Mobile-first em qualquer página/conteúdo
- Aprovação Duda antes de qualquer publicação externa
- Mencionar EPI-USE Voices + ERP.ngo quando institucional

### Nunca
- Frameworks pesados (React/Vue/Angular) — só vanilla HTML/CSS/JS
- Publicar automaticamente no LinkedIn ou em ads
- Citar concorrentes nominalmente em conteúdo público
- Citar clientes nominalmente sem aprovação
- Conteúdo político ou religioso
- Promessas absurdas (ROI garantido, prazos imbatíveis)

---

## 🔁 Fluxo de trabalho típico

```
Você (humano)
    │
    ▼
Comando ou pedido em linguagem natural
    │
    ▼
CEO (ceo-mkt) ────► lê vault/00-contexto/
    │
    ▼
Cria pedido em vault/workspaces/<agente>/inbox/<slug>.md
    │
    ▼
Invoca sub-agente via Agent tool
    │
    ▼
Sub-agente trabalha e entrega em outbox/
    │
    ▼
CEO valida ────► move para vault/entregas/
    │
    ▼
Reporta ao humano com:
    • Resumo do entregue
    • Caminho do arquivo
    • Próximos passos sugeridos
```

---

## 🛠️ Integrações e MCPs já conectados

| Serviço | Para que serve | Tools |
|---|---|---|
| **Apollo** | Prospect + enrichment | `apollo:*` skills |
| **NotebookLM** | RAG sobre material EPI-USE | `mcp__notebooklm__*` |
| **Claude in Chrome** | Automação browser | `mcp__Claude_in_Chrome__*` |
| **Figma** | Design system | `mcp__83d8039e*__*` |
| **Canva** | Templates rápidos | `mcp__0daa2472*__*` |
| **Computer Use** | Apps nativos quando preciso | `mcp__computer-use__*` |

---

## 📚 Documentos para ler em primeira sessão

Por ordem de prioridade:
1. Este `CLAUDE.md` (você já está lendo)
2. `vault/README.md` — guia da vault
3. `vault/00-contexto/empresa.md` — quem é EPI-USE
4. `vault/00-contexto/projetos.md` — o que está rodando
5. `vault/00-contexto/branding.md` — como falar e desenhar
6. `vault/agentes/_index.md` — diretório dos agentes
7. `EPI-USE-OFFICE-MASTER-BRIEF.md` — visão da fase futura (Office Engine 2D)

---

## 🤝 Pessoas-chave

- **Rudá Costa** — RevOps & Marketing, estratégico
- **Duda** — Brand Experience, operacional, aprovações
- **Roberto** — Country Manager Brasil, aprovação executiva
- **Lisiane de Assis** — CEO Redatoria, guardiã do tom de voz

---

*Versão 1.0 — fundação do escritório virtual · maio/2026*
