# Módulo 26 — Onboarding de Marketing

**Status:** ✅ v2.0 · Fase 1 de 4 (02/out/2026) · **Rota:** `/onboarding` · **Arquivo:** `public/onboarding.html`
**Propósito:** trilha de onboarding para novos colaboradores de Marketing/Comercial, liberada **em fases**.

## Experiência (v2)
- **Mapa da trilha:** 5 nós num caminho animado (Kit Dia 1 → Etapas 1–4), anel de progresso, fundo com estrelas.
- **Modo foco (player):** uma ideia por tela, barra de segmentos estilo stories, setas do teclado, swipe no mobile.
- **Quiz:** uma pergunta por tela com feedback imediato; aprovação com ≥ 3/4 → confete + badge.
- **Gavetas:** Kit Dia 1 (acessos · time · rotina) e Dicionário (botão flutuante).

## Fases
| Fase | Conteúdo | Status |
|---|---|---|
| 1 | Kit Dia 1 + Etapa 1 (Marca & Grupo: 10 telas + quiz) | ✅ no ar |
| 2 | Etapa 2 — Estratégia, demanda, RevOps, eventos | ⏳ travada no mapa |
| 3 | Etapa 3 — SAP & técnico | ⏳ |
| 4 | Etapa 4 — Comercial (Receita Previsível, SDR) | ⏳ |

O conteúdo bruto das etapas 2–4 (links, treinamentos, textos) está arquivado em `public/_versoes-office/onboarding-v1.html`.

## Técnico
- Vanilla JS, tokens do DESIGN.md (transparências via `color-mix`), sem hex local.
- 10 animações da Etapa 1: globo de pontos, linha do tempo, órbita das marcas, braços BR, anel de receita, LOBs, cards 3D, fluxo ERP.ngo, paleta, links.
- Animações param ao trocar de tela; respeitam `prefers-reduced-motion`.
- Progresso em `localStorage` (`eubr-onboarding-v2`), só conveniência por navegador.
- Liberado para role `hub` (`HUB_LOCK_PAGES` em `server.js`).
