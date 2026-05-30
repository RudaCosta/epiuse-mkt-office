# 🏢 Vault — Escritório Virtual EPI-USE Marketing

> Memória compartilhada do escritório virtual de agentes de IA.
> Compatível com Obsidian (abra esta pasta como vault).
> Última atualização: maio/2026

---

## Como funciona

1. **`00-contexto/`** — verdades sobre a empresa, projetos, branding, pessoas. **Todos os agentes leem isso.**
2. **`agentes/`** — definição de identidade de cada agente (cargo, especialidade, restrições).
3. **`workspaces/<agente>/`** — área de trabalho do agente:
   - `inbox/` — outros agentes deixam pedidos aqui
   - `outbox/` — agente entrega aqui
   - `_vt.md` — memória de trabalho (Working Table)
4. **`entregas/`** — versões finais aprovadas (read-only).

## Fluxo padrão

```
Você → CEO (chat principal)
       │
       ├─→ Criativos (workspaces/criativos/inbox/<pedido>.md)
       │     └─→ entrega em outbox/ e copia para entregas/
       │
       ├─→ Landing Pages (workspaces/landing-pages/inbox/...)
       │
       ├─→ Propostas (workspaces/propostas/inbox/...)
       │
       └─→ Campanhas (workspaces/campanhas/inbox/...)
```

## Comandos prontos (slash commands)

| Comando | O que faz |
|---|---|
| `/onboard` | Preenche contexto da empresa baseado no que o agente já sabe |
| `/nova-oferta` | Briefing de copy + criativos a partir de URL/descrição |
| `/criativos` | Encaminha pedido ao agente de Criativos |
| `/lp` | Pede LP ou quiz ao agente de Landing Pages |
| `/proposta` | Gera proposta comercial a partir de transcrição |
| `/campanha` | Análise de concorrentes + estrutura de campanha |
| `/contratar` | CEO cria novo agente especializado |

## Convenção de nomes

- Pedidos em `inbox/`: `YYYY-MM-DD-<slug>.md` (ex: `2026-05-22-quiz-coda.md`)
- Entregas em `outbox/`: mesmo nome + sufixo `-v1`, `-v2`
- Versões finais: copiar de `outbox/` para `entregas/`

## Princípios

1. **Tudo em Markdown** — não use formatos proprietários
2. **Tudo em PT-BR** — interfaces, conteúdo, comentários
3. **Branding EPI-USE sempre** — ver `00-contexto/branding.md`
4. **Nunca publicar sem revisão da Duda** — agentes propõem, humanos decidem
5. **ERP.ngo e EPI-USE Voices** quando relevante (sem forçar)
