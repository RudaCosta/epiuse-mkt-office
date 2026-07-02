# Módulo 16 — Campanhas em jogo + ERP Coins

> **Propósito:** área única com as campanhas que estão rolando AGORA na EPI-USE (`/campanhas`) — internas (ex.: ⚽ GOL de Placa do People & Culture) e de LinkedIn — com registro **silencioso** de participação por usuário (ERP Coins), pra futura troca por brindes/dinheiro.

## Status
✅ v0.72.0 (jul/2026). Coins acumulando em silêncio (decisão do Rudá: usuário NÃO é avisado por enquanto).

## Arquitetura

| Peça | O que é |
|---|---|
| `public/api/campanhas-ativas.json` | **Fonte curada** das campanhas (editar aqui pra entrar/sair campanha; `ativa:false` esconde sem apagar). |
| `public/campanhas.html` (rota `/campanhas`) | Página "Campanhas em jogo": hero Gol de Placa + cards com CTA. Cada clique de CTA registra participação e abre o destino. |
| `server.js` → tabela `erp_coins` | Ledger: email · evento (`share`/`golplaca`/`quest`) · ref · coins · dia. `UNIQUE(email,evento,ref,dia)` = anti-farm (1 crédito/ação/campanha/dia). |
| `POST /api/game/coins` | Registra evento pro email da **sessão SSO** (401 anônimo). Valores só no server: share 10 · golplaca 10 · quest 50. Responde `{ok:true}` **sem saldo**. |
| `GET /admin/coins` + `GET /api/admin/coins` | Painel do head (ranking + ledger). Não linkado em nenhum menu de usuário. |
| `GET/POST /api/admin/coins/backup|restore` | Export/import do ledger via editor token (workaround do SQLite sem volume). |
| Games | Estação "📣 Campanhas em jogo" + zona "⚽ GOL de Placa" (trave + bola no jardim) nos 2 mundos; quest completa também registra. Mascote **Fante** 🐘 veste a camisa 10 🇧🇷 enquanto `golplaca.ativa:true`. |
| Hub | Card "📣 Campanhas" no Acesso Rápido. |

## ⚠️ Persistência (P0 conhecido)
Os coins vivem no SQLite. **Sem Railway Volume (`DATA_DIR`) eles ZERAM a cada deploy.** Enquanto o volume não for montado (pendência humana do Rudá):
1. Antes de cada deploy: `GET /api/admin/coins/backup` (header `X-Editor-Token`) → salvar o JSON.
2. Depois do deploy: `POST /api/admin/coins/restore` com o JSON salvo.

## Como funciona a mecânica (honestidade do dado)
- **"Compartilhar no LinkedIn"** = registramos o **clique de intenção** (o LinkedIn não confirma shares sem API parceira). Ver DECISIONS.
- **Gol de Placa** = clique no formulário oficial da campanha (RD/People). O placar de elogios em si é do People — o Office só direciona.
- **Quest do game** = completion real do Giro do Escritório / Tour do Colaborador.
- Identidade = email da sessão SSO. Sem sessão, nada é registrado.

## Como atualizar as campanhas (fluxo do dia a dia)
1. Duda/Rudá manda a campanha nova (nome, descrição, URL do post/form).
2. Editar `public/api/campanhas-ativas.json` (ou pedir pro Claude via chat) + commit/deploy.
3. Campanha encerrou → `ativa:false`.

**Fase 2 (automação LinkedIn):** LinkedIn Community Management API — precisa de app aprovado no Marketing Developer Platform + admin da company page (pendência humana). Quando sair, um script tipo `rd_fetch` atualiza o JSON sozinho com os posts recentes da page.
