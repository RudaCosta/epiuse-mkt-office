# Changelog — Relatório de Marketing (`/relatorio`)

## v2.0 · 06/out/2026
- Página refeita do zero (pedido Rudá: "reformule toda esta área… corte as integrações que não têm atualização automática… bem visual e atrativo, com animações JS… relatório no padrão de PPT da EPI-USE em PPT e PDF… tracking de quem acessou, só o meu perfil vê").
- Nova API `GET /api/relatorio/live` só com fontes automáticas (GA4, RD, Apollo, Voices, links, Cases, calendário). Mês em andamento compara com o mesmo período do mês anterior.
- **GA4 corrigido:** o fetch casava o período pela posição da linha e trocava meses (no snapshot, jul=ago, set=out, fev=mar, mai=jun). Agora casa pelo nome do período; meses antigos são rebuscados no boot e guardados no SQLite.
- **RD:** foto diária (`relatorio_rd_hist`) e disparos por mês (`enviados_por_mes`).
- Cortado: Análise/Performance de canais (`rd-canais.json`, tinha toggle "simulado"), outreach estático, Instagram, KPIs digitados dos reports antigos, Zoho e SAP 4 ME (viraram link).
- PPTX v2.0 no padrão EPI-USE + PDF via LibreOffice; template oficial opcional (upload só do dono).
- Tracking `kind='relatorio'` + downloads gravados no servidor + painel `/admin/relatorio` + link no menu só pro dono.

## v1.x (até 05/jun/2026)
- Dashboard com seções fixas (KPIs digitais, LinkedIn, canais RD, conteúdo, eventos, Voices, Zoho, Apollo, Cases, SAP 4 ME) e botão "Baixar PPT" (`/api/relatorio/download-pptx`, hoje redireciona pro export novo).
