# Pendências — Central de Fontes

Depois do deploy, abrir `/fontes` (como super admin) e:
- [ ] **Conferir os caminhos padrão do OneDrive** (Cases, Eventos, Artigos, Calendário da Duda). Se algum aparecer "⏳ Não achei a planilha no caminho de sempre", colar o link de compartilhamento dele no card.
- [ ] **Colar o link das planilhas que só existem no PC:**
  - SAP for Me: exportação do portal, hoje no Desktop. Subir no OneDrive e colar o link.
  - Rotina do LinkedIn: hoje em `routines/` no PC. Subir no OneDrive e colar o link.
  - Metas da equipe RevOps: hoje no Desktop. Subir no OneDrive e colar o link.
- [ ] **Zoho pela API:** criar um "Self Client" em api-console.zoho.com (escopos `ZohoCRM.coql.READ,ZohoCRM.modules.READ`), gerar o refresh token e pôr `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` e `ZOHO_DC` no Railway. Sem isso, oportunidades e leads só atualizam por sessão do Claude com MCP.
- [ ] **Planilha da Redatoria aberta para edição por qualquer pessoa com o link** (permissão "anyone: writer" no Google). Conferido em 14/out. O motor só precisa de leitura: sugerir à Lisiane trocar para "qualquer pessoa com o link pode **ver**".
- [ ] **Revisar as curadas à mão vencidas** e clicar em "marcar como revisada":
  - Development Funds;
  - Prazos SAP;
  - Time de Marketing;
  - Campanhas ativas;
  - KB da Área de Clientes;
  - calendário LATAM;
  - KB do JARVIS;
  - Voices.
- [ ] **Histórico do LinkedIn** (xls do Sergio + PPTs) parado desde jun/2026: a tarefa do PC não está gerando. Rodar `scripts/lifecycle/run-linkedin-sync.ps1` e ver o log, ou decidir levar para o servidor (exige pôr o xls e os PPTs numa pasta do OneDrive).
- [ ] **(Opcional) Desligar as tarefas do Windows redundantes** (Cases 07:00, calendário) quando as fontes estiverem "em dia" pelo servidor.
- [ ] **Integrações não feitas** (ficam em `/fontes` como "não integradas", cada uma dizendo o que falta): HubSpot CMS, Search Console, Instagram, LinkedIn API, agenda do Outlook, Trello.
