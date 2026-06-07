# 🔬 Sprint Pipeline V2 — experimento paralelo

> **Origem:** inspirado no `squads/office-engine/` (Codex · OpenSquad framework)
> **Status:** experimental · roda em paralelo com fluxo v1 (atual)
> **Quando usar:** sprints que precisam de checkpoints humanos rígidos (ex: rebrand HOME, mudanças que tocam produção)

---

## 🎯 Por que existe

O fluxo **v1** (atual) é ágil: Claude lê pedido → planeja → coda → testa → entrega. **Funciona bem pra sprints pequenas (<2h)**, mas pode pular checkpoint humano em sprints grandes — e o Rudá já apontou (Regra 14): "sprint só fecha com aprovação PM".

O fluxo **v2** força **3 checkpoints humanos explícitos** antes de qualquer código entrar. Mais lento. Mais seguro. Inspirado no padrão Codex Squad.

---

## 🤖 Os 3 agentes V2

Em `.claude/agents-v2/`:

| Agente | Papel | Output |
|---|---|---|
| `pm-tecnico` | Traduz pedido em escopo + riscos + checkpoints | `vault/workspaces-v2/pm-tecnico/outbox/plano-<slug>.md` |
| `arquiteto-frontend` | Spec técnica HTML/CSS/JS antes de codar | `vault/workspaces-v2/arquiteto-frontend/outbox/spec-<slug>.md` |
| `revisor-qa` | Revisa plano+spec, classifica (aprovado/ressalva/bloqueado) | `vault/workspaces-v2/revisor-qa/outbox/review-<slug>.md` |

---

## 🔄 Pipeline (6 steps · 3 checkpoints humanos)

```
1. INTAKE              ← Rudá captura pedido (checkpoint)
2. PLANEJAMENTO        ← pm-tecnico produz plano
3. APROVAR PLANO       ← Rudá aprova/ajusta (checkpoint)
4. ESPECIFICAÇÃO       ← arquiteto-frontend produz spec
5. REVISÃO             ← revisor-qa classifica
6. APROVAR EXECUÇÃO    ← Rudá libera código (checkpoint)
   ↓
   Execução normal (Claude coda · testa · entrega)
```

Cada checkpoint = **agente PARA + espera Rudá responder**. Sem isso, nada avança.

---

## 🆚 V1 vs V2 — quando usar

| Situação | Fluxo |
|---|---|
| Bug pequeno · fix óbvio | V1 — direto |
| Mudança visual pequena · 1 tela | V1 — direto |
| Sprint grande (≥1 dia) | V2 — checkpoints |
| Toca produção (Railway push) | V2 — checkpoints |
| Rebrand · mudança estrutural | V2 — checkpoints |
| Nova rota/módulo | V2 — checkpoints |
| Hot fix urgente | V1 (não tem tempo pra V2) |

**Default sugerido:** V1 pra micro, V2 pra qualquer coisa que demore mais de 2h.

---

## 🧪 Como testar

1. Próxima sprint grande (ex: Sprint 20 — Rebrand HOME), rodar via V2
2. Comparar com sprints recentes feitas em V1 (Sprint 15 Painel, Sprint 19 Sync)
3. Medir: nº de iterações · tempo total · quantos retrabalhos · satisfação do PM

---

## 📁 Estrutura

```
.claude/agents-v2/           ← 3 agentes V2 (pm-tecnico, arquiteto-frontend, revisor-qa)
vault/workspaces-v2/         ← workspaces V2 (inbox · outbox · _vt por agente)
vault/00-contexto/v2-pipeline/  ← docs do pattern (este README)
```

**V1 segue funcionando inalterado** em `.claude/agents/` + `vault/workspaces/`.

---

## 🎬 Como invocar (na prática)

Quando o Rudá pedir "vamos rodar a próxima sprint em V2":

1. Eu (Claude) leio o pedido + invoco `pm-tecnico` via Agent tool
2. PM Técnico salva plano + me devolve "aprova?"
3. Rudá aprova → invoco `arquiteto-frontend`
4. Arquiteto salva spec + me devolve "aprova?"
5. Rudá aprova → invoco `revisor-qa`
6. Revisor classifica → me devolve veredito
7. Se APROVADO → eu codifico
8. Se BLOQUEADO → volta pro PM Técnico
9. Sprint fecha SÓ quando Rudá diz "fechado"

---

*Experimento criado 07/jun/2026 inspirado no `squads/office-engine/` do Codex.*
