# Pendências — Área Pipeline

- [ ] **Confirmar `APOLLO_API_KEY` nas variáveis do Railway** (a mesma do `.env` local). Sem ela a página mostra "Apollo sem chave" e esconde os números do Apollo.
- [ ] **Zoho deals automático:** OAuth (`ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN`) + refresh no servidor, como o Apollo. Aí oportunidades/vendas voltam pra página.
- [ ] **Histórico do Apollo:** os números de 30 dias ficam completos 30 dias depois do 1º refresh em prod.
- [ ] Desligar a tarefa Windows `EPI-USE-Apollo-Sync` quando o refresh de prod estiver confirmado (ela só regrava o JSON estático de fallback).
