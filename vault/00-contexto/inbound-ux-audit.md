# OFFICE ENGINE — Auditoria de UX/UI &amp; Plano de Reorganização

**De:** Claude Design (sessão EUBR Inbound)
**Para:** Claude Code (sessão Office Engine)
**Data:** 24 mai 2026
**Status atual analisado:** v3.0 (módulos A, B, C, D + Inbound v1 em handoff)
**Objetivo:** organizar a plataforma como produto único antes de adicionar Inbound (Módulo F)

---

## 🎯 TL;DR — O problema central

Hoje o Office Engine é **6 produtos isolados** dentro de um mesmo domínio, não 1 plataforma com 6 módulos. Cada módulo:
- tem seu **próprio header** (estilos diferentes)
- tem **botões de navegação inconsistentes** (uns têm "← Office Engine", outros têm "Game/Dashboard/Painel/Voices", outros não têm nada)
- **repete informação** que já existe em outro lugar (calendário aparece em 3 telas, roadmap em 2, voices status em 2)
- **não diz onde você está** (sem breadcrumb)
- **força refresh** pra voltar (rotas internas não preservam estado)

**A correção é arquitetural, não cosmética.** Antes de plugar o Inbound Engine, precisamos:
1. Criar **1 sistema de navegação global** (top bar única, persistente)
2. Definir **fonte única de verdade** por tipo de dado (calendar, roadmap, voices, alerts)
3. Padronizar **header / footer / breadcrumb** em todos os módulos
4. Adicionar **command palette** (Cmd+K) pra pular entre tudo

---

## 📸 Estado atual — o que vejo nas 7 telas

Refs em `public/inbound/refs-state/` (já copiadas).

### 1. War Room (`/dashboard`) — `01-war-room.png`
**O que tem:** header "EPI-USE OFFICE" em mono pixel, status de 8 projetos, Voices ativos, Roadmap com 5 prioridades, Agenda 2026 (30 eventos), Time (8 pessoas), Alertas, Histórico de versões.

**Problemas:**
- Header sem nav global — só toggle "Modo Game"
- Agenda 2026 está dentro do dashboard, mas também aparece no MKT Hub e dentro do modo Game (Eventos & Calendário)
- Voices section duplicada com a do Painel da Duda
- Roadmap duplicado com o do Painel da Duda (Fases lá vs Prioridades aqui)
- Alertas duplicados com Painel da Duda
- Não tem como pular pra um módulo específico sem voltar pro spawn ou modo game

### 2. Profile Optimizer (`/optimizer`) — `02-optimizer.png`
**O que tem:** header "EPI-USE VOICES · Profile Optimizer — by Ruds", botões "← Office Engine", "ERP.ngo — 1% para conservação na África", "Modo escuro". Form de URL + screenshots + contexto.

**Problemas:**
- **Single back button** ("← Office Engine") — mas pra onde exatamente? Volta pro Game ou pro Dashboard?
- "Modo escuro" toggle por módulo — devia ser global
- Header diz "EPI-USE VOICES" mas o módulo é **Profile Optimizer** — ambiguidade de qual produto vc tá vendo

### 3. MKT Hub (`/hub`) — `03-mkt-hub.png`
**O que tem:** header "MKT Hub · EPI-USE Brasil" + tabs "MKT Hub / Onboarding" + botões "INTERNO / Sair". Hero gigante, serviços (8 cards), processo (4 etapas), brand assets (paleta, tipografia, logos, uso correto/proibido), templates, calendário & campanhas.

**Problemas críticos:**
- **Sem nav de volta** — só "Sair". Tem que dar refresh pra sair do hub.
- **Calendário (SAP NOW, CIO Cerrado, Safari Tech) é o MESMO** que aparece no War Room (Agenda EPI-USE/SAP)
- **Brand Assets** é exatamente o Brand Book que ficou no projeto de design system (fonte de verdade) — aqui é cópia
- Não há link pro Inbound Playbook que vai chegar (que cobre regras editoriais)

### 4. Voice Agent — Anderson Costa (`/voices/anderson`) — `04-voice-agent.png`
**O que tem:** header "ANDERSON COSTA · DELIVERY STRATEGIC ACCOUNT · #01" + botões "Game / Dashboard / Painel" + "Voltar à galeria". Banner amarelo de dados provisórios. Perfil completo + instruções do agente + ações rápidas.

**Problemas:**
- **3 botões de navegação no topo direito** (Game/Dashboard/Painel) mas **não tem** o botão de "Office Engine" como o Optimizer tem. Inconsistência feia.
- "Voltar à galeria" é um 4º caminho de volta — agora são 4 jeitos diferentes só dessa tela
- Banner de pendências (4 chips amarelos) parece local mas é a mesma info que já está nos Alertas do War Room

### 5. Painel da Duda (`/painel`) — `05-painel-duda.png`
**O que tem:** header pixel "PAINEL DA DUDA · OPERAÇÃO · EPI-USE VOICES" + botões "Game / Dashboard" + KPIs globais (5 cards laranja), pipeline de voices, alertas, performance, top post, roadmap por fases, ações rápidas.

**Problemas:**
- **Mistura 2 produtos:** o painel operacional (KPIs + pipeline) deveria ser o war room; o roadmap de fases deveria estar centralizado
- "Game" e "Dashboard" no topo — mas onde está o link pro próprio módulo Voices Gallery? E pro Optimizer? Cada módulo tá listando uns nem todos.
- Cor laranja dos KPIs é a única cor diferenciada — mas usa só aqui, contradiz o brand kit (vermelho = spark único)
- Top post tem dois "Abrir" diferentes (no LinkedIn + abrir Voice) — confuso qual faz o quê

### 6. Office Engine 2D Game (`/game`) — `06-office-game.png`
**O que tem:** mapa com Coffee Corner, Marketing Hub, Voices Area (Anderson/Carlos/Vagas), Optimizer, SAP Lab, ERP.ngo Memorial, Mesa da Duda (Office), Events. Avatar "Visitante" entrando.

**Problemas:**
- **Não tem botão pra sair pro Dashboard** dentro do game (precisa F5 ou tecla específica não-descoberta?)
- A "Mesa da Duda" é uma sala fechada mas o painel da Duda já tem nav "Dashboard/Game" — informação dispersa
- Sem indicação visual de "onde tem novidade" (badges nas zonas com novo conteúdo)
- Mapa não inclui Inbound HQ ainda (esperado — vai entrar agora)
- Spaces como "Vaga 5/6/7" são feios; melhor não desenhar até existir

### 7. LP "Seja um Voice" (`/lp-recruitment`) — `07-lp-voice.png`
**O que tem:** header "EPI-USE VOICES" + botões "Game / Dashboard / Voices". Hero "Você é o próximo Voice?", o programa, voices ativos, benefícios, 3 vagas abertas, FAQ, form de inscrição.

**Problemas:**
- 3 botões de navegação, mas falta "Painel" e "Optimizer" — inconsistência com voice agent
- Form de inscrição é o mesmo lugar do Painel da Duda → "Recrutar Voice" → confuso ter 2 entradas
- Hero "Voice" colorido em magenta/laranja é uma 3ª paleta que escapa do brand

---

## 🏗️ A grande proposta: 4 mudanças arquiteturais

### Mudança 1 · **Global Navigation Bar** (top, persistente em TODAS as rotas)

Criar **um único componente** `office-nav.html` (ou `<office-nav>` web component) que TODO módulo carrega no topo. Aspecto:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [EPI-USE]  Hub · Voices · MKT · Inbound · Painel    [Ruds]  [⌘K] [🌙] [⌥] │
└────────────────────────────────────────────────────────────────────────────┘
                                                          ↑       ↑    ↑   ↑
                                                       user  search dark menu
```

**O que tem:**
- **Logomark fixa à esquerda** — único caminho de volta ao Hub (`/`). Sempre clicável.
- **Tabs de seções principais** — 5 entradas, sempre visíveis. A tab atual fica destacada em azul-céu (`--d-accent`).
- **Usuário** — nome do user (Ruds, Visitante, etc) com pop-over de "Trocar nome / Sair".
- **Cmd+K** — abre command palette.
- **Toggle dark/light** — global, persiste em localStorage (resolve o toggle local do Optimizer).
- **⋯ menu** — esconde itens raramente usados (Histórico de versões, ERP.ngo Memorial, Sobre).

**Remove tudo isto que tá pulverizado:**
- ❌ "← Office Engine" (Optimizer)
- ❌ "Game / Dashboard / Painel" (Voice Agent)
- ❌ "Game / Dashboard" (Painel)
- ❌ "Game / Dashboard / Voices" (LP)
- ❌ "INTERNO / Sair" (MKT Hub)
- ❌ "Modo Game" toggle (War Room)

Substitui por: nav global persistente. Pronto.

---

### Mudança 2 · **5 seções principais** (a IA da plataforma)

Hoje você tem 8+ rotas sem hierarquia. Proposta de **5 áreas, cada uma com sub-rotas claras**:

| Tab | Rota raiz | O que contém | Substitui |
|---|---|---|---|
| **🏠 Hub** | `/` | Spawn + War Room (visão geral, KPIs cruzados, atalhos) | spawn-gate + dashboard atuais |
| **🎙️ Voices** | `/voices` | Galeria, perfil individual, LP de recrutamento, Profile Optimizer | `/voices`, `/lp`, `/optimizer` (passa a ser ferramenta DENTRO de voices) |
| **📡 Inbound** | `/inbound` | Playbook + Brief→Post + Calendar editorial + Studio | módulo novo (handoff anterior) |
| **📈 MKT Hub** | `/hub` | Brand assets, templates, processos, eventos SAP/EPI-USE | `/hub` atual |
| **⚙️ Painel** | `/painel` | Operação Duda: pipeline, alertas, roadmap, fases, recrutamento | `/painel` atual + roadmap migrado do War Room |

**Modo Game vira um "view mode"**, não uma seção:
- Botão `⊞` no header global troca o Hub entre "Dashboard view" e "Game view"
- Continua acessível, mas não compete por hierarquia com Voices/Inbound/MKT
- A persistência de view fica em localStorage

---

### Mudança 3 · **Fonte única de verdade** para cada conjunto de dados

Hoje o **calendário de eventos** está em 3 lugares (War Room + MKT Hub + Game/Events) — todos os 3 leem (presumo) da mesma fonte mas renderizam diferente.

**Centraliza:**

| Dado | Antes (onde aparece) | Depois (fonte única) |
|---|---|---|
| **Eventos SAP/EPI-USE** | War Room · MKT Hub · Game/Events | `Inbound /calendar` é o source. Outros viram **widgets** (top 3 próximos) que linkam pra lá. |
| **Roadmap** | War Room (Prioridades) · Painel (Fases) | `Painel /painel#roadmap` é o source. War Room mostra só os 3 próximos itens. |
| **Voices ativos** | War Room · Painel · LP | `Voices /voices` é o source. War Room/Painel mostram contagem. |
| **Alertas & pendências** | War Room · Painel | `Painel /painel#alerts` é o source. War Room mostra só count + 1 destaque. |
| **Time** | War Room | `Painel /painel#team` é o source. War Room remove. |
| **Brand assets** | MKT Hub | `MKT Hub /hub#brand` é o source. Outros linkam. Inbound puxa `colors_and_type.css` da raiz. |
| **Histórico de versões** | War Room (footer) | `/changelog` próprio (rota nova, simples). War Room mantém link no footer. |

**Resultado:** cada tela tem **menos coisa**, mais foco. Quem entra no War Room vê visão geral; quem clica num widget vai ao source completo.

---

### Mudança 4 · **Cmd+K Command Palette**

Adicionar atalho `Cmd/Ctrl+K` global que abre um modal de busca/jump:

```
┌─────────────────────────────────────────────────┐
│ 🔍 Buscar ação, módulo, voice, evento…          │
├─────────────────────────────────────────────────┤
│ MÓDULOS                                         │
│   🏠 Hub                          ↵             │
│   🎙️ Voices · Galeria              ↵            │
│   📡 Inbound · Brief→Post          ↵            │
│   ⚙️ Painel da Duda                ↵            │
│                                                 │
│ AÇÕES RÁPIDAS                                   │
│   ✎ Novo post (Brief→Post)         ↵           │
│   + Recrutar Voice                  ↵          │
│   ↓ Exportar PNG (Studio)           ↵          │
│                                                 │
│ VOICES                                          │
│   👤 Anderson Costa                 ↵          │
│   👤 Carlos Furigo                  ↵          │
└─────────────────────────────────────────────────┘
```

Implementação leve: array de actions no JS global do header, fuzzy match nativo (sem fuse.js), ↑↓↵ pra navegar.

---

## 🆕 Funcionalidades novas que recomendo

Além de organizar, sugiro adicionar:

### A. **Notification center** (sino no header global)
Hoje os alertas (Carlos Furigo pendente, SSI não coletado, budget…) ficam **só** no War Room. Você nunca sabe quantos tem se está navegando em outro módulo.

Sugestão:
- Badge vermelho no sino mostra count
- Click abre dropdown com lista
- Cada alerta vira clicável → leva à tela de resolução
- Persiste localmente (dismiss state)

### B. **Recent activity feed** no Hub
Card no War Room: "últimas 24h" mostrando o que mudou:
- "Carlos Furigo aprovou kit ✓"
- "+3 posts gerados via Brief→Post"
- "Calendário recebeu 2 eventos da Bruna"
- "v3.1 deployed"

Linka a cada item para o detalhe.

### C. **Onboarding tour** (1ª vez)
Hoje você cai no spawn gate sem entender o produto. Sugestão:
- Tour de 4 passos quando user é novo (1ª visita detectada via localStorage):
  1. "Este é o Hub — visão geral cruzada"
  2. "Aqui são os Voices — programa de influência"
  3. "O Inbound é onde o conteúdo nasce"
  4. "Pressione Cmd+K a qualquer momento"
- Pula no canto direito ("Pular tutorial")

### D. **Page-specific actions** (bottom-right floating)
Substitui "Ações rápidas" do final do Painel por um **FAB** (floating action button) consistente em cada módulo:
- Em /voices → "+ Recrutar"
- Em /inbound/calendar → "+ Novo post"
- Em /inbound/studio → "↓ Exportar"
- Em /optimizer → "→ Analisar"

Padrão visual: pill grande no canto inferior direito, cor `--d-accent`.

### E. **Status do sistema** (rodapé sutil)
Rodapé global em TODAS as rotas:
```
EPI-USE Office · v3.X · last deploy 2h ago · 🟢 sistemas online · ERP.ngo
```

Substitui o histórico de versões pulverizado em diferentes telas.

### F. **Multi-user awareness** (preparar Fase 3)
Já que "Multiplayer presence" está no roadmap (Fase 3), o header pode mostrar agora:
- Quantos users online (mesmo que mock por enquanto)
- Pequeno avatar lá no canto

Plantar a semente visual.

### G. **Theme: 1 dark, 1 light** — não fazer outras
Padronizar em **2 temas globais** controlados pelo header. Optimizer atual permite toggle local — virar global.

Tokens já estão em `colors_and_type.css`. Adicionar `[data-theme="light"]` overrides e persistir em localStorage. Pronto.

### H. **Empty states elegantes**
Hoje "Vaga #04" e "Vaga #05" no Voices ficam visíveis mas são placeholders. Trocar por empty state honesto:
- Card "—" estilo "Esta vaga abrirá em Q3. [Avise-me]"
- Não ocupa espaço como se tivesse conteúdo

### I. **Print/export** dos painéis
War Room, Painel, e Hub podem ter botão "Exportar PDF da página" (print stylesheet escondendo nav + ações). Útil pra reuniões com Roberto/Duda.

### J. **Dark elephants 🐘 — easter egg**
Em todas as áreas com `bg navy + glow`, esconder pequeno SVG do elefante semitransparente no canto. Já existe no War Room (cover.css `::after`) — replicar como **padrão visual** de marca em qualquer surface dark.

---

## 🎨 Sistema visual — o que padronizar

### Header global — anatomia
```html
<office-nav>
  ├ Logomark "EPI-USE" mono blue, link to /
  ├ Tab strip (5 items, current highlighted)
  ├ Spacer
  ├ User chip (name from localStorage)
  ├ Cmd+K trigger (kbd hint)
  ├ Theme toggle (☾/☀)
  └ Overflow menu (⋯)
</office-nav>
```

CSS variables únicas (já tem em `colors_and_type.css` + extensões do `inbound-shell.css`):
- `--d-bg`, `--d-card`, `--d-accent`, `--d-ink`, `--d-ink-2`, `--d-ink-3`
- Mono = JetBrains Mono · Sans = Open Sans
- Spacing scale 4/8/12/16/24/32/48/64/96

### Footer global — anatomia
```
EPI-USE Office · v3.X · 🟢 online · /changelog · ERP.ngo
```

Discreto, presente em todas as rotas.

### Page header — anatomia
Cada módulo herda mesma anatomia:
```html
<page-head>
  <eyebrow>Section label</eyebrow>          <!-- ex: "Tool 01 · Core" -->
  <h1>Page title <em>highlight</em></h1>
  <sub>Page description, 1-2 lines</sub>
  <meta>Pills, dates, status</meta>
</page-head>
```

---

## 📋 Checklist para o Claude Code

Em ordem de execução:

### Sprint v3.1 — Foundation
- [ ] Criar `<office-nav>` web component (`public/office-nav.js`)
  - 5 tabs, logomark, user chip, cmd+k, theme toggle, overflow menu
  - Auto-mark active tab via `data-route` attribute do `<body>`
  - Theme toggle persiste em localStorage com chave `office.theme`
- [ ] Criar `<office-footer>` web component
  - Versão + last deploy + status + changelog link
- [ ] Adicionar tags em TODAS as rotas existentes:
  - `<office-nav></office-nav>` no início do `<body>`
  - `<office-footer></office-footer>` no fim
  - `<body data-route="hub|voices|inbound|hub-mkt|painel">`
- [ ] Remover todos os back-buttons/nav ad-hoc das telas individuais
- [ ] Criar `/changelog` route — página simples lendo histórico de versões

### Sprint v3.2 — Information architecture
- [ ] Mover **Roadmap** do War Room → apenas no Painel. War Room exibe widget "3 próximos".
- [ ] Mover **Time** do War Room → apenas no Painel. War Room remove.
- [ ] Mover **Calendário SAP** do War Room + MKT Hub → fonte única em `/inbound/calendar`. War Room/MKT Hub exibem widget "próximos 3".
- [ ] Consolidar **alertas** → fonte em Painel. War Room mostra count + destaque.
- [ ] Remover **brand assets duplicados** do MKT Hub → linkar pro design system.

### Sprint v3.3 — Inbound integration (puxa do HANDOFF.md anterior)
- [ ] Copiar pasta `public/inbound/` do projeto Claude Design
- [ ] Adicionar rotas `/inbound`, `/inbound/brief`, `/inbound/calendar`, `/inbound/studio`, `/inbound/playbook` no `server.js`
- [ ] Adicionar zona "Inbound HQ" no modo Game
- [ ] Adicionar `📡 Inbound` na tab strip do office-nav

### Sprint v3.4 — Polish &amp; new features
- [ ] **Cmd+K** command palette (modal global ativado por keyboard shortcut)
- [ ] **Notification center** (sino no header, lê alertas do Painel via api)
- [ ] **Recent activity feed** card no War Room
- [ ] **FAB** (floating action button) page-specific em cada módulo
- [ ] **Onboarding tour** de 4 passos pra novos users
- [ ] **Empty states** — substituir "Vaga 5/6/7" por placeholders honestos
- [ ] **Print stylesheet** para War Room/Painel/Hub

### Sprint v3.5 — Light mode global
- [ ] Adicionar `[data-theme="light"]` overrides no `colors_and_type.css` global
- [ ] Toggle persiste em `localStorage['office.theme']`
- [ ] Remover toggle local do Optimizer

---

## 🔌 Sobre o Inbound Engine (HANDOFF.md anterior)

O documento `HANDOFF.md` do projeto Claude Design já lista os 4 arquivos a copiar (`inbound-hub.html`, `inbound-brief.html`, `inbound-calendar.html`, `inbound-studio.html`, `EUBR Inbound Playbook.html`) e as 6 rotas a adicionar. **Faça essa cópia no Sprint v3.3**, depois que o foundation (nav global) estiver pronto — assim o Inbound já nasce com a nav unificada e não precisa retrabalho.

> ⚠️ **Importante:** as 4 telas do Inbound atualmente têm sua própria nav-bar interna (`<nav class="inbound-nav">`). Quando integrar, **delete essa nav local** delas e deixe só `<office-nav>` global. O CSS continua compatível porque é dark-mode com mesmos tokens.

---

## 🌟 Visão final — como fica

Imagina o Office Engine v4.0:

1. **Você abre `/`** → Hub aparece em modo Dashboard ou Game (lembrou da última escolha).
2. **Tab strip no topo** sempre disponível. Você sabe onde tá, vê onde pode ir.
3. **Cmd+K** te leva pra qualquer canto em 2 keystrokes.
4. **Cada módulo tem 1 responsabilidade** — não duplica dado de outro.
5. **Voices é o coração** — programa de influência, com Optimizer/LP/Galeria orbitando.
6. **Inbound é o estúdio** — onde conteúdo nasce, com calendário + brief + studio + playbook.
7. **MKT Hub é o brand center** — onde a marca vive (assets, templates, processo).
8. **Painel é a sala de máquinas** — Duda controla operação, alertas, roadmap, recrutamento.
9. **War Room é a vitrine** — só widgets cruzados, sem detalhes profundos.

E tudo isso continua **single-file HTML por rota, zero build, zero dependência nova**. Compatível com Railway.

---

## 📎 Anexos disponíveis neste projeto

- `HANDOFF.md` — handoff técnico do módulo Inbound (cópia de arquivos + rotas)
- `inbound-hub.html`, `inbound-brief.html`, `inbound-calendar.html`, `inbound-studio.html` — telas do módulo F
- `EUBR Inbound Playbook.html` — deck de 19 slides do playbook editorial
- `inbound-shell.css` + `colors_and_type.css` — tokens compartilhados
- `refs-state/01..07.png` — screenshots do estado atual referenciados acima

---

*Esta auditoria foi feita olhando 7 screenshots do estado v3.0 (mai 2026). Quando aplicar, valide com o time. Algumas decisões (ex: Modo Game como view-mode ao invés de seção) são opinativas — vale conversar com Duda/Roberto antes.*

*— Claude Design · sessão EUBR Inbound*
