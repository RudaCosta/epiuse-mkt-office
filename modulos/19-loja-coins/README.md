# Módulo 19 — Loja de ERP Coins

**Status:** ✅ construído (v0.76.0) · catálogo **⏳ em definição** (decisão do Rudá 14/jul)
**Propósito:** dar visibilidade e utilidade aos ERP Coins — saldo, histórico e resgate de brindes com aprovação. **Revoga a decisão do "acúmulo silencioso"** (módulo 16, decisão 1) por ordem explícita do Rudá.

## Arquivos-chave
- `routes/loja.js` — tabela `coin_redemptions`; `GET /api/loja/me` (saldo + ledger + resgates + catálogo); `POST /api/loja/resgatar` (débito transacional + pedido pendente); admin `GET /api/admin/loja` + `POST /api/admin/loja/:id` (aprovar|negar|entregue); página `GET /loja`.
- `public/loja-coins.html` — página do usuário (saldo, catálogo, meus resgates, histórico).
- **Catálogo = tabela `coin_shop_items`** (SQLite, persiste no volume). Editável pelo admin em `/admin/coins` (seção "🛒 Catálogo da Loja": add/editar/ativar/remover). CRUD: `GET/POST /api/admin/loja/catalogo` + `DELETE /api/admin/loja/catalogo/:id` (requireAdmin). Migração 1x importa do `public/api/loja-coins.json` antigo se houver itens. Ids são slugs sem acento (`Elefante Pelúcia`→`elefante-pelucia`).
- **Aviso de pendentes** (v0.78.0): `/api/admin/loja` devolve `pendentes`; o `/admin/coins` mostra badge + número no `<title>`.
- `public/admin-coins.html` — seção "🎁 Resgates da Loja" (fila com aprovar/negar/entregue).
- `server.js` — mount + `HUB_LOCK_PAGES += '/loja'`. `office-nav.js` — "🏪 Loja de Coins" (autenticados). `hub.html` — card no Acesso Rápido.

## Mecânica contábil (ledger único)
Tudo vive no `erp_coins` (mesmo ledger dos ganhos):
- **Saldo** = `SUM(coins)` por email.
- **Resgate** = débito imediato (linha **negativa** `evento='resgate', ref='resgate:<id>'`) + pedido `pendente` em `coin_redemptions`. Transacional (`db.transaction`) com checagem de saldo — sem saldo negativo.
- **Negado** → **estorno automático** (linha positiva `evento='estorno', ref='estorno:<id>'`, `INSERT OR IGNORE` = idempotente).
- Transições válidas: `pendente→aprovado|negado` · `aprovado→entregue|negado`.

## Acesso
- `/loja` + `/api/loja/*`: qualquer usuário logado (colaborador incluído — está no HUB_LOCK allowlist).
- Admin (fila/decisão): `requireAdmin` de `routes/users.js` (head OU editor token) — mesmo guard do `/admin/coins`.

## Pendência humana
- **Rudá passa os itens e preços do catálogo** (via chat → edito o JSON → deploy). Até lá a página mostra saldo/histórico + banner "⏳ Catálogo em definição" e `POST /resgatar` responde `catalogo_vazio`.
