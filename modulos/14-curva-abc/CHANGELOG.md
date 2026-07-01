# Changelog — Módulo 14 Curva ABC

## v0.1.0 (2026-07-01)
- MVP inicial: router `routes/curva-abc.js` com tabelas `curva_abc_contas` + `curva_abc_historico`
- Endpoints: `POST /api/curva-abc/sync`, `GET /api/curva-abc/contas`, `POST /api/curva-abc/contas/:id/override`, `GET /api/curva-abc/resumo`
- Cálculo de Fit/Propensão a partir de `cs_clientes` + `clientes_sap_4me` + `zoho_deals` (dado já sincronizado no SQLite)
- UI `public/curva-abc.html`: matriz 2D + lista filtrável + painel de override
- Card "Curva ABC" registrado na área Pipeline (`public/api/areas.json`)
- Sync live via Zoho/Apollo MCP fica como próximo passo (ver PENDENCIAS.md) — v0.1.0 usa as tabelas já sincronizadas no SQLite
