# 🤖 Operação do Escritório Virtual — Guia Prático

> Atualizado 01/jun/2026 · v0.8.1 · ver tela viva em `/agentes` e `/war-room` no Office.

Este doc ensina como **usar os agentes** do escritório no dia a dia. Não é teoria — é o passo a passo que Duda/Roberto/Rudá precisam saber.

---

## 🏢 Quem é quem (3 camadas)

```
                    [👤 humano: Rudá/Duda/Roberto]
                              ↓ pedido
                    ┌─────────────────────────┐
                    │  🎯 CEO (ceo-mkt)       │  ← lê TODO o mestre, orquestra
                    └────────────┬────────────┘
                                 ↓ delega pra área dona
        ┌────────┬────────┬─────┴────┬────────┬────────┐
        ↓        ↓        ↓          ↓        ↓        ↓
      🧠 Intel  🚀 Growth  📅 Eventos  📞 Pipeline  🎨 Brand  📣 Conteúdo
      (Bruna)  (Gui)      (Fernanda)  (Marlison)   (Duda)    (Lisiane)
        │        │           │           │          │          │
        └────────┴───────────┴───────────┴──────────┴──────────┘
                              ↓ acionam quando precisam
              ┌────────┬─────────────┬────────┬────────┐
              ↓        ↓             ↓        ↓
            🎨 Criativos  💻 LPs   📄 Propostas  📊 Campanhas
            (executores transversais)
```

**Princípio:** cada agente lê **só a fatia que precisa** do contexto mestre (`vault/00-contexto/`). Subagente abre fresco a cada invocação → menos token, menos alucinação cruzada. **Só o CEO lê tudo.**

---

## 🚦 Fluxo padrão (1 pedido de ponta a ponta)

### Caminho A — Você pede pelo Office (UI)

1. Abre `/agentes` no Office (Office nav → overflow → 🤖 Agentes & Contexto)
2. Clica no agente certo (ex: `/agentes/area-growth` se é dor de tráfego/SEO)
3. Botão **"+ Novo pedido pro inbox"**
4. Preenche título curto + descrição + seu nome
5. Pedido vai pra `vault/workspaces/area-growth/inbox/2026-06-01-titulo-curto.md`
6. **War Room** (`/war-room`) agora mostra 📥 1 no card do Gui

### Caminho B — Você pede pelo chat com Claude

1. Conversa normal: *"preciso de um plano de mídia paga LinkedIn pra SAP NOW"*
2. Claude (rodando o CEO) lê contexto mestre, decide que é Growth
3. Cria pedido no inbox do `area-growth` automaticamente
4. Invoca o subagente `area-growth` via Agent tool
5. Subagente entrega no outbox: `vault/workspaces/area-growth/outbox/plano-paid-sapnow.md`
6. CEO consolida e te responde

### Quando o agente entrega

- Vai pra `vault/workspaces/<agente>/outbox/`
- Depois de aprovado, move pra `vault/entregas/` (versão final, read-only)
- Atualiza `vault/workspaces/<agente>/_vt.md` (memória de trabalho)

---

## 🎯 Quem chamar pra cada tipo de pedido

| Quero… | Agente |
|---|---|
| Plano de mídia, análise de concorrente, projeção paid | `area-growth` ou `campanhas` |
| Roteiro de evento, brindes, MDF, tática elefante | `area-eventos` |
| Outbound, sequência Apollo, lead scoring | `area-pipeline` |
| Mapear pauta pra Voice, distribuir cases pra Voices | `area-brand` |
| Pauta editorial, calendário, briefing pro redator | `area-conteudo` |
| CRM higiene, dashboards, lead scoring | `area-intelligence` |
| **Copy de anúncio, mockup visual** | `criativos` (via área dona) |
| **LP, quiz, dashboard HTML** | `landing-pages` (via área dona) |
| **Proposta comercial a partir de reunião** | `propostas` |

**Regra:** sempre que possível, chama o **agente da área dona** — ele decide se precisa acionar executor. Não pula etapa.

---

## ⌨️ Comandos rápidos (slash commands no chat)

```
/nova-oferta <url|descrição>     ← CEO → Criativos + LPs (lança oferta completa)
/criativos <pedido>              ← direto pro Criativos
/lp <pedido>                     ← direto pro LP
/proposta <transcrição>          ← Propostas (transforma reunião em proposta)
/campanha <url|brief>            ← Campanhas (concorrente OU plano de mídia)
/onboard                         ← CEO faz onboarding do contexto
/contratar <especialidade>       ← CEO cria agente novo
```

---

## 📂 Estrutura de pastas (onde ficam os pedidos)

```
vault/
├── 00-contexto/              ← MESTRE (todos leem o que precisam)
│   ├── empresa.md
│   ├── projetos.md
│   ├── branding.md
│   ├── pessoas.md
│   ├── DESIGN.md
│   └── mapa-fontes-dados.md
│
├── workspaces/<agente>/
│   ├── inbox/                ← pedidos recebidos
│   ├── outbox/               ← entregas pendentes revisão
│   └── _vt.md                ← memória de trabalho do agente
│
└── entregas/                 ← versões finais aprovadas
    ├── criativos/
    ├── lps/
    ├── propostas/
    └── campanhas/
```

---

## 🧠 Memória mestre — quem lê o quê

| Agente | empresa | projetos | branding | pessoas | DESIGN | mapa-fontes |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| ceo-mkt | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| area-intelligence | ✅ | ✅ | — | — | — | ✅ |
| area-growth | ✅ | ✅ | ✅ | — | — | ✅ |
| area-eventos | ✅ | ✅ | ✅ | — | — | — |
| area-pipeline | ✅ | ✅ | — | — | — | ✅ |
| area-brand | — | ✅ | ✅ | ✅ | ✅ | — |
| area-conteudo | ✅ | ✅ | ✅ | — | — | — |
| criativos | — | — | ✅ | — | ✅ | — |
| landing-pages | — | — | ✅ | — | ✅ | — |
| propostas | ✅ | ✅ | ✅ | — | — | — |
| campanhas | ✅ | ✅ | ✅ | — | — | — |

---

## ⚡ Painéis de controle

| URL | Pra que |
|---|---|
| `/agentes` | Mapa visual 3 camadas · busca · contadores live |
| `/agentes/:slug` | Workspace de 1 agente: inbox · outbox · _vt · entregas |
| `/war-room` | KPIs gerais + lista ordenada por pendência |
| `/area/:id` | Módulo de cada área com link pro agente dono |

---

## ❓ Perguntas frequentes

**P: Como sei que o agente terminou?**
R: Aparece arquivo no `outbox/` do agente. War Room mostra 📤 +1. CEO consolida e te responde no chat.

**P: Posso falar com 2 agentes ao mesmo tempo?**
R: Sim. CEO decompõe e dispara em paralelo. Cada subagente abre fresco.

**P: O agente lembra das conversas anteriores?**
R: Não da sessão atual (subagente abre fresco). MAS lê `_vt.md` do workspace dele — então decisões importantes ficam ali pra próxima vez.

**P: Posso editar um pedido depois de criado?**
R: Sim — abre o `.md` direto no `inbox/` e edita. O agente vai ler a versão atual.

**P: Como cancelar um pedido?**
R: Apaga o `.md` do `inbox/` antes do agente rodar. Se já rodou, está em `outbox/`.

---

## 🛠️ Pra quem está construindo

- Adicionar agente novo: criar `.claude/agents/<slug>.md` com YAML frontmatter + corpo + criar `vault/workspaces/<slug>/{inbox,outbox,_vt.md}` + entrada em `public/api/agentes.json` + `vault/agentes/<slug>.md` (perfil estilo Obsidian).
- Escopo de cada agente está no `.claude/agents/*.md` (seção "🧭 Escopo de contexto").
- Quando o user reclamar "o agente não está fazendo o que pedi": checar o `.md` em `inbox/` (pedido entrou certo?) e o `_vt.md` (memória de trabalho contradiz?).

---

*Versão 1.0 — junho/2026 · Rudá*
