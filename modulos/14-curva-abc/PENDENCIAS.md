# Pendências — Módulo 14 Curva ABC

## 🔴 Bloqueadas (dependem do Rudá/Marlison)
- **Calibrar thresholds do score** (D5 em DECISIONS.md) — rodar v0.1.0 numa amostra real de contas e revisar com o Marlison/AE se os cortes A/B/C fazem sentido no campo.
- **Definir permissão de override** — hoje qualquer usuário autenticado pode overridar qualquer conta (`requireAuth` genérico). Perguntar se AE só edita as dele e Marlison só as dele (usaria os roles do módulo 13-sso-roles).

## 🟡 Melhorias planejadas (não bloqueiam o MVP)
- Sync ao vivo via `mcp__Zoho_CRM__executeCOQLQuery` e `mcp__Apollo_io__apollo_mixed_companies_search` direto no endpoint `/api/curva-abc/sync` (v0.1.0 usa as tabelas já sincronizadas no SQLite local — `zoho_deals`, `cs_clientes`, `clientes_sap_4me` — como primeira fonte, mais simples e sem depender de credenciais MCP em prod)
- Enriquecimento de porte/faturamento via `apollo_organizations_enrich` para contas sem esse dado
- 3º eixo de valor potencial (D2) quando faturamento estiver mais completo
- Alertas automáticos quando uma conta muda de tier (ex: virou A) — hoje é só visual no dashboard
