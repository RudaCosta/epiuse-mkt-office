# Pendências — Metas FY27

- [ ] **Conferir em prod depois do deploy:** a barra "Ao vivo" deve mostrar Apollo e GA4 atualizados. GA4 "sem credencial"/"parado" = `GA4_PROPERTY_ID`/`GA4_SA_JSON` ausente no Railway (o mesmo vale pro Relatório). O tráfego aparece depois da 1ª busca do Relatório (≈75 s após o boot).
- [x] **GA4 cobre o site novo?** Sim — a tag do GA4 está no HubSpot CMS (Rudá, 07/out/2026).
- [ ] **Premissas pra Rudá validar:** "Tráfego (site) 15.000" = sessões/mês? "Pautas 25" = por mês? Ajustar rótulo no `areas.json` se não for.
- [ ] **Planilha FY27 com nome de FY26:** o arquivo `public/api/metas-fy26.json` (gerado por `scripts/sync/build_metas_pessoas.py`) carrega as metas FY27. Renomear numa faxina, junto com os scripts.
- [ ] **Metas que podem subir pro placar** quando houver integração no servidor: Zoho (SQOs, oportunidades, vendas, pipeline R$, no-show), RD (MQLs, abertura, CTR — exige outros endpoints), LinkedIn (seguidores, impressões, engajamento), HubSpot (LPs).
- [ ] **Field Marketing:** o placar depende do kanban — pedir pra Gabrielle mover os eventos já realizados para "Pós-evento"/"Concluído" e registrar a captura de leads.
