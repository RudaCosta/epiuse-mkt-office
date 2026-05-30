# EPI-USE Marketing — Escritório Virtual

> Este arquivo é carregado automaticamente em toda sessão do Codex nesta pasta.
> Define identidade, regras e estrutura do escritório virtual de agentes.

---

## 🏢 O que é este projeto

Workspace de Marketing da **EPI-USE Brasil** organizado como um **escritório virtual de agentes de IA**. Contém:

1. **Vault Obsidian** (`vault/`) — memória compartilhada e workspaces dos agentes
2. **5 sub-agentes Codex** (`.Codex/agents/`) — CEO + Criativos + LPs + Propostas + Campanhas
3. **7 slash commands** (`.Codex/commands/`) — atalhos para fluxos comuns
4. **Aplicações construídas** — Profile Optimizer (Módulo A), Marketing Hub portals, Office Engine (em design)
5. **Documentos mestres** — `EPI-USE-OFFICE-MASTER-BRIEF.md` e `vault/00-contexto/`

---

## 🚀 Comece sempre por aqui

Em qualquer sessão nova, faça:

1. **Leia o contexto** — `vault/00-contexto/empresa.md` + `projetos.md` + `branding.md` + `pessoas.md`
2. **Veja o estado do escritório** — `vault/workspaces/ceo/_vt.md`
3. **Pegue o pedido do humano** e roteie pelo slash command certo

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

## 👥 Sub-agentes (invocáveis via Agent tool)

| `name` (subagent_type) | Use quando |
|---|---|
| `ceo-mkt` | Pedido envolve múltiplos agentes ou priorização |
| `criativos` | Design gráfico, copy de anúncio, briefing visual |
| `landing-pages` | Codar HTML single-file (LP, quiz, dashboard) |
| `propostas` | Transformar transcrição em proposta comercial |
| `campanhas` | Analisar Meta Ads ou estruturar campanha |

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
| **Codex in Chrome** | Automação browser | `mcp__Claude_in_Chrome__*` |
| **Figma** | Design system | `mcp__83d8039e*__*` |
| **Canva** | Templates rápidos | `mcp__0daa2472*__*` |
| **Computer Use** | Apps nativos quando preciso | `mcp__computer-use__*` |

---

## 📚 Documentos para ler em primeira sessão

Por ordem de prioridade:
1. Este `AGENTS.md` (você já está lendo)
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
