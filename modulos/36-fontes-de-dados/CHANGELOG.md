# Changelog — Central de Fontes

## v1.0 · 14/out/2026 (0.100.0)
- Registro único com 31 fontes, cada uma com dona, área, telas, modo, prazo e data real:
  - 5 integrações por API;
  - 9 planilhas;
  - 1 ainda no PC;
  - 10 curadas à mão;
  - 6 ainda não integradas.
- Motor no servidor: OneDrive/SharePoint (Graph, inclusive atalho de pasta compartilhada), Google Sheets por link e Zoho pela API. Planilha sem mudança não é reprocessada. JSON gerado fica guardado no banco e volta depois de um deploy.
- Tela `/fontes`:
  - status de cada fonte, com filtro por status, área e busca;
  - "Atualizar agora";
  - "Marcar como revisada";
  - link da planilha (só super admin);
  - âncora `#id` vinda do alerta.
- Alertas: regra `fontes.registro` (erro/atraso → importante, revisão vencida → para saber) para a área dona. "Saúde das fontes" dos relatórios semanal e mensal vem do registro.
- Parsers aceitam `FONTE_ARQUIVO`: Cases, SAP for Me, Calendário da Duda, Redatoria, Eventos, Artigos (+ escores SEO/GEO), rotina do LinkedIn, Metas.
- Correções achadas na auditoria:
  - consulta de oportunidades do Zoho (campo renomeado → `Origem_da_Oportunidade`);
  - Redatoria lia só as abas jan–jun/26 (agora detecta as abas de mês);
  - `sync_zoho_leads.js` ganhou `--api` e as carteiras por dono;
  - `build_artigos_scores.py` cria a pasta do relatório;
  - `sync_eventos.py` não deixa `.bak` em `public/api` no servidor.
- Testes: `scripts/tests/fontes.js` (ponta a ponta, 34 verificações) e `scripts/tests/fontes-cobertura.js`.
