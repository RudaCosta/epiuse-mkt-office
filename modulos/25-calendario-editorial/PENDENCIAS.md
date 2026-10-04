# Pendências — Módulo 25 · Calendário Editorial

## ✅ Fase 2 — Graph API ligada no servidor (04/out/2026)

Permissão liberada em 02/out; desde a v1.1 o servidor lê a planilha da nuvem no boot e a cada 6h
(`routes/editorial.js`). **Falta só validar em prod** depois do deploy: a área `/area/brand` mostra
`Calendário editorial · nuvem · há Xh` na barra "Ao vivo"; erro aparece em "Precisa de atenção".

- Se der 403: conferir `Files.Read.All` (aplicativo) + admin consent no app do Azure.
- Se der 404: o link mudou → atualizar `EDITORIAL_SHARE_URL` no Railway.
- Desligar sem deploy: `EDITORIAL_AUTO=0`.

## 🟡 Melhorias (não-bloqueadas)
- Filtros na tela de calendário (LOB / formato / status).
- Link direto do card de pauta pro fluxo do Blog Converter / Raccoon.
- Badge de "desatualizado" se `last_sync` > X dias.

## ⚠️ Se o link da planilha mudar
O `EDITORIAL_SHARE_URL` (ou o default em `graph_fetch.js`) precisa ser atualizado. Um link novo
de compartilhamento gera um `shareId` diferente.
