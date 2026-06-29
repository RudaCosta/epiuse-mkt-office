# Decisões — Módulo 13 (SSO + Roles + Hub)

## 29/jun/2026 — fundação do módulo

- **Listados → visão própria; resto → Hub** (não hard-lock). Não-núcleo cai no `/hub` como tela central, mas pode navegar. _Rationale:_ pedido do Rudá; mantém o Office aberto pro time todo sem criar muro rígido.
- **Roles no SQLite + admin UI** (em vez de só estender o mapa `personas.json` ou usar grupos do Azure). _Rationale:_ Rudá quer gerenciar quem é o quê sem depender de IT/Azure nem de deploy. Grupos do Azure ficam pra um v2 se precisar governança.
- **Marketing Hub = portar o portal estático** (`_versoes-office/v0.4.6-hub.html`) em vez de página nova. _Rationale:_ reaproveita o portal que já existe e é conhecido; só troca o gate de senha `1337` pelo SSO.
- **Enforcement só em páginas, não em `/api/*`.** _Rationale:_ um `requireAuth` global em todas as APIs quebrava os fluxos por `X-Editor-Token` (ex: `resync-railway-all` que sincroniza cases). Cada API mantém seu próprio guard.
- **`requireAuth` segue seguro por design:** só bloqueia quando `SSO_ENABLED` (env `AZURE_*` presentes). Logo, ligar `SSO_ENFORCE=true` no repo NÃO derruba prod — só passa a exigir login depois que as credenciais entram no Railway.
- **Persona resolvida do DB** (via `/api/auth/status`), com o mapa `emails` de `personas.json` virando fallback legado.
- **Não deletar** registros de usuário — desativação via flag `active` (pedido do Rudá: "não delete, vamos apenas solicitar").
