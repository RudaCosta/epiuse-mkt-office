# Módulo 26 — Onboarding de Marketing

**Status:** ✅ v2.1 · 4 etapas liberadas + ERP Coins (02/out/2026) · **Rota:** `/onboarding` · **Arquivo:** `public/onboarding.html`
**Propósito:** trilha de onboarding para novos colaboradores de Marketing/Comercial, liberada **em fases**.

## Experiência (v2)
- **Mapa da trilha:** 5 nós num caminho animado (Kit Dia 1 → Etapas 1–4), anel de progresso, fundo com estrelas.
- **Modo foco (player):** uma ideia por tela, barra de segmentos estilo stories, setas do teclado, swipe no mobile.
- **Quiz:** uma pergunta por tela com feedback imediato; aprovação com ≥ 3/4 → confete + badge.
- **Gavetas:** Kit Dia 1 (acessos · time · rotina) e Dicionário (botão flutuante).

## Etapas
| Etapa | Telas | Conquista | Coins |
|---|---|---|---|
| Kit Dia 1 | checklist de 12 acessos | 🎒 Kit Completo | 50 |
| 1 · Marca & Grupo | 10 + quiz | 🐘 Guardião(ã) da Marca | 100 |
| 2 · Estratégia & Demanda | 9 + quiz | 🚀 Estrategista de Demanda | 100 |
| 3 · SAP & Técnico | 7 + quiz | 🧪 Fluente em SAP | 100 |
| 4 · Comercial | 6 + quiz | 📞 Mestre do Pipeline | 100 |
| Bônus | as 5 acima | 🏆 Trilha Completa | 150 |

## ERP Coins
- Crédito real no ledger `erp_coins` (o mesmo de `/loja` e `/ranking`), evento `onboarding`, `ref` = etapa, `dia='∀'` → **1x por pessoa**.
- `GET /api/onboarding/me` (conquistas + saldo + valores) · `POST /api/onboarding/conquista` `{etapa, respostas}`. Valores e gabarito só no server (`server.js`, `ONB_COINS` / `ONB_GABARITO`).
- **Ao mudar um quiz em `onboarding.html`, atualizar `ONB_GABARITO` no `server.js`** (senão o crédito é recusado com `quiz_reprovado`).
- Sem sessão SSO a trilha funciona, mas não credita; ao logar, conquistas feitas antes são creditadas (quiz guardado no navegador).
- Ranking mostra 🎓; `/admin/analytics` rotula cada conquista.

## Técnico
- Vanilla JS, tokens do DESIGN.md (transparências via `color-mix`), sem hex local.
- 10 animações da Etapa 1: globo de pontos, linha do tempo, órbita das marcas, braços BR, anel de receita, LOBs, cards 3D, fluxo ERP.ngo, paleta, links.
- Animações param ao trocar de tela; respeitam `prefers-reduced-motion`.
- Progresso em `localStorage` (`eubr-onboarding-v2`), só conveniência por navegador.
- Liberado para role `hub` (`HUB_LOCK_PAGES` em `server.js`).
