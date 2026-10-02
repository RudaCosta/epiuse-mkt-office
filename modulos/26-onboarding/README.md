# Módulo 26 — Onboarding de Marketing

**Status:** ✅ v1.0 (02/out/2026) · **Rota:** `/onboarding` · **Arquivo:** `public/onboarding.html`
**Propósito:** trilha de onboarding para novos colaboradores do Marketing/Comercial em 4 etapas + "Dia 1".

| Etapa | Conteúdo |
|---|---|
| Dia 1 | Checklist de acessos · time MKT/comercial · home office + Multidados · Dicionário (busca) |
| 1 · Marca | Group Elephant · EPI-USE Brasil · 4 frentes de receita · LOBs · IPs · metas · ERP.ngo · brand/tom · Voices e incentivos |
| 2 · Estratégia | Persona/dor · canais de demanda + funil · inbound · Redatoria/site/SEO · RevOps · eventos/MDF/PBC · concorrentes · ferramentas |
| 3 · Técnico | Mapa SAP · ECC→S/4 Clean Core · process mining/Signavio · trilhas SAP · treinamentos de marketing |
| 4 · Comercial | Receita Previsível · cadência SDR · processo comercial |

- 11 animações canvas vanilla (pausam fora da tela, respeitam `prefers-reduced-motion`, cores via tokens).
- Progresso + quiz por etapa salvos em `localStorage` (`eubr-onboarding-v1`) — só conveniência por navegador.
- Liberado para role `hub` (`HUB_LOCK_PAGES` em `server.js`) — novo colaborador acessa sem permissão extra.
