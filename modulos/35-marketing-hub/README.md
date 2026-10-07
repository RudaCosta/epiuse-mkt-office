# Módulo 35 — Marketing Hub v2 · portal da empresa toda

**Status:** ✅ v2.0 · 07/out/2026 · **Rota:** `/hub` (painel do dono: `/admin/hub`) · **Dono:** Rudá Costa
**Propósito:** a vitrine do Marketing pra EPI-USE inteira (papel `hub` = qualquer colaborador). Ferramentas do Office, deck institucional, logos e fundos, agenda de eventos, campanhas e quem cuida de cada área, num lugar só. Números só de fonte real (regra 7) e nada de vendas/CRM no que a página recebe.

## Arquivos-chave
| Arquivo | Papel |
|---|---|
| `public/hub.html` | Página (vanilla, só tokens do DESIGN.md). Animações: constelação no fundo que reage ao cursor, título com palavra que gira (encolhe pra caber), órbita de atalhos, contadores, marquee de marcas, cards com luz + inclinação 3D, filtro com FLIP, linha do tempo arrastável, cards do time que viram, deck 3D, borda cônica animada, barra de progresso de leitura. `prefers-reduced-motion` desliga tudo. |
| `routes/hub.js` | `GET /api/hub/resumo` — **lista branca**: agenda, total de artigos, Voices no programa, campanhas ativas e o time (nome, área, texto "pra que me procurar"). Lê os JSONs do servidor e devolve só esses campos. |
| `routes/acesso.js` | Regra `GET /api/hub/resumo` (logado) + filtro de `team.json` e `changelog.json` pra quem não é do time de Marketing (passo 7). |
| `routes/analytics.js` | `AREA_TRACK.hub` → beacon `kind='hub'`, `GET /api/admin/analytics/hub(/user)`, `GET /admin/hub` (`requireOwner`, por e-mail). |
| `private/admin-area-tracking.html` | Painel único de tracking — config `hub` (seções, rótulos de cada clique, nomes das ferramentas). |
| `public/office-nav.js` | Link "👁️ Tracking · Marketing Hub" no menu só quando `/api/analytics/owner` confirma o e-mail do dono. |
| `scripts/tests/hub-seguranca.js` | Teste: lista branca sem termo de vendas/CRM, página sem JSON cru nem link de `/admin`, permissões do colaborador e do painel. |

## Seções (= `data-sec` do tracking)
`hero` (busca + números) · `ferramentas` · `agenda` · `campanhas` · `institucional` (`/hub?tab=institucional` rola até aqui) · `time` · `servicos` · `canais`.

## Números da página (todos com data da fonte na tela)
| Número | Fonte |
|---|---|
| Eventos no calendário (BR + LATAM) e eventos por vir | `events.json` (calendário oficial LATAM, SharePoint) |
| Artigos na base de conteúdo | `artigos.json` (`agregados.total_artigos`) |
| EPI-USE Voices no programa (X de Y vagas) | `voices.json` |
| Próximo evento (dias) | calculado do calendário; sem data confirmada mostra "data a confirmar" |
Sem fonte → `—` e "⏳ fonte indisponível". Nada chumbado: o "30+ eventos/ano", "48h SLA" e "20 conteúdos/mês" do Hub antigo saíram.

## Tracking "quem viu o quê" (só o dono)
Passos: `sec.<id>` · `tempo.<id>.<s>` · `scroll.<25|50|75|100>` · `tool.<id>` (cada card, material, canal, atalho da órbita/busca) · `cat.<filtro>` · `agenda.<brasil|latam|rolou|arrastou|busca>` · `busca.<usou|sem-resultado|clique>` · `campanha.<id>` · `time.<area>` · `logo.<nome>` · `cta.<botão>`. Quem abriu e o tempo total já vêm do servidor/office-nav.
O chip "👁️ Quem viu o quê" na página e o link do menu só aparecem pro e-mail do dono; o endereço do painel nem vai no HTML de quem não é.
