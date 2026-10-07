# Pendências — Metas FY27

- [ ] **Conferir em prod depois do deploy:** a barra "Ao vivo" deve mostrar Apollo e GA4 atualizados. GA4 "parado" = `GA4_PROPERTY_ID` ou credencial ausente no Railway. Tráfego com aviso "cache não tem <mês>" some depois do primeiro ciclo do refresh do FY (≈3 min após o boot).
- [x] **GA4 cobre o site novo?** Sim — a tag do GA4 está no HubSpot CMS (Rudá, 07/out/2026).
- [ ] **Relatório mensal:** depois do deploy, o refresh automático rebusca FY26/FY27 com a correção das linhas — os números de site do /relatorio mudam (passam a ser os certos). Pra fixar no repositório, rodar `POST /api/relatorio/ga4-refresh-fy?fy=26&force=1` na máquina local e commitar o `ga4-snapshot.json`.
- [ ] **Premissas pra Rudá validar:** "Tráfego (site) 15.000" = sessões/mês? "Pautas 25" = por mês? Ajustar rótulo no `areas.json` se não for.
- [ ] **Planilha FY27 com nome de FY26:** o arquivo `public/api/metas-fy26.json` (gerado por `scripts/sync/build_metas_pessoas.py`) carrega as metas FY27. Renomear numa faxina, junto com os scripts.
- [ ] **Metas que podem subir pro placar** quando houver integração no servidor: Zoho (SQOs, oportunidades, vendas, pipeline R$, no-show), RD (MQLs, abertura, CTR — exige outros endpoints), LinkedIn (seguidores, impressões, engajamento), HubSpot (LPs).
- [ ] **Field Marketing:** o placar depende do kanban — pedir pra Gabrielle mover os eventos já realizados para "Pós-evento"/"Concluído" e registrar a captura de leads.
