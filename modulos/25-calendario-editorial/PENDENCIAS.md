# Pendências — Módulo 25 · Calendário Editorial

## 🟢 Fase 2 — Graph API (permissão liberada 02/out/2026 · falta implementar)

**O que falta:** o app do Azure (o MESMO do SSO) precisa da permissão de **APLICATIVO**
`Files.Read.All` (ou `Sites.Read.All`) + **admin consent**. Mesma pessoa que aprovou o consent
do SSO faz — ~2 min no Azure Portal (App registrations → o app do Office → API permissions →
Microsoft Graph → Application permissions → Files.Read.All → Grant admin consent).

**Depois de liberado:**
1. Confirmar `.env` do Office tem `EDITORIAL_SHARE_URL` (default já é o link da planilha atual).
2. Testar: `node scripts/integrations/graph_fetch.js` (baixa da nuvem).
3. Ligar o resync na nuvem: setar `EDITORIAL_USE_GRAPH=1` no `.env` OU chamar
   `POST /api/editorial/resync?graph=1`.
4. (Opcional) Cron diário — Tarefa Windows chamando `sync_calendario_editorial.js --graph`.

**Enquanto não sai:** Fase 1 funciona — o resync lê a cópia local
(`vault/00-contexto/conteudo/calendario-editorial-marketing.xlsx`). Pra atualizar hoje, é preciso
substituir essa cópia (ou apontar `XLSX_PATHS[0]` pra um OneDrive sincronizado).

## 🟡 Melhorias (não-bloqueadas)
- Filtros na tela de calendário (LOB / formato / status).
- Link direto do card de pauta pro fluxo do Blog Converter / Raccoon.
- Badge de "desatualizado" se `last_sync` > X dias.

## ⚠️ Se o link da planilha mudar
O `EDITORIAL_SHARE_URL` (ou o default em `graph_fetch.js`) precisa ser atualizado. Um link novo
de compartilhamento gera um `shareId` diferente.
