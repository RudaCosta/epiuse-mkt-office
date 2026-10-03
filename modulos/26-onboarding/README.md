# Módulo 26 — Onboarding de Marketing

**Status:** ✅ v2.2 · 4 etapas + ERP Coins + certificado + rastreamento (03/out/2026) · **Rota:** `/onboarding` · **Arquivo:** `public/onboarding.html`
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

## Certificado
- Liberado com a conquista **🏆 Trilha Completa** (verificada no servidor). Nº `EUBR-ONB-AAAA-000123` derivado da linha do ledger; nome do SSO (`/api/onboarding/me → certificado`).
- Gerado no navegador (canvas 2000×1414, logos oficiais de `/assets/`): **⬇️ PNG**, **in Adicionar ao perfil** (link oficial "Add to profile" do LinkedIn com nº e link de verificação) e **📣 Postar** (celular: compartilhamento nativo com imagem; desktop: baixa a imagem, copia o texto e abre o LinkedIn com o post pré-preenchido).
- Link de verificação = a própria `https://office.epiuse.com.br/onboarding` (nenhuma página nova).

## Rastreamento (quem fez o quê)
- Cada passo vai para o beacon existente `POST /api/analytics/track` com `kind:'onb'` e grava em `analytics_events` (coluna `meta`, adicionada sem perder dados).
- Passos: `kit.open` · `kit.acc.<id>.on|off` · `kit.complete` · `dict.open` · `eN.start` · `eN.slide.i/n` · `eN.quiz.qK.ok|ko` · `eN.quiz.result.S/N.pass|fail` · `cert.view|download|linkedin.perfil|linkedin.post|linkedin.abrir|copy|share`.
- Painel: **`/admin/analytics` → "🎓 Onboarding — quem fez o quê"** (tabela por pessoa) + **ficha da pessoa → "Onboarding · passo a passo"**. Histórico completo, só o dono vê.

## Técnico
- Vanilla JS, tokens do DESIGN.md (transparências via `color-mix`), sem hex local.
- 10 animações da Etapa 1: globo de pontos, linha do tempo, órbita das marcas, braços BR, anel de receita, LOBs, cards 3D, fluxo ERP.ngo, paleta, links.
- Animações param ao trocar de tela; respeitam `prefers-reduced-motion`.
- Progresso em `localStorage` (`eubr-onboarding-v2`), só conveniência por navegador.
- Liberado para role `hub` (`HUB_LOCK_PAGES` em `server.js`).
