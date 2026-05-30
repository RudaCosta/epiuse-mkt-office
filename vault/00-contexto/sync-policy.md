# Política de Sincronização de Documentos Externos

> Adotada em 25/mai/2026. Resposta direta à pergunta "como você atualiza os documentos?"

## Premissa

**Não há daemon de polling.** Cada "atualização" de dado externo no Office exige uma invocação — manual, agendada ou via webhook. Não fico "olhando" planilhas esperando mudança.

## Modos disponíveis

| Modo | Trigger | Custo Claude | Latência | Quando usar |
|---|---|---|---|---|
| **Manual** | Você pede "atualiza X no Office" | $0 | depende de você | Mudanças raras (team.json, branding) |
| **Scheduled task** (skill `schedule`) | Cron remoto: ex. "todo dia 7h" | ~$0.10/run de Haiku | até intervalo configurado | Planilha CS, calendário Duda |
| **Webhook real-time** | Power Automate (SharePoint) ou Apps Script (Google) dispara `POST /api/sync/X` | dev inicial maior | segundos | Dados críticos (status venda fechada) |

## Decisão por planilha/source

### Planilha CS (Roberto · SharePoint)
- **Link:** `https://epiusebr-my.sharepoint.com/:x:/g/personal/roberto_medeiros_epiuse_com_br/IQAGkABIW2bmXAf_-gmLlIKoAecPMsXYZd4IKF9LefeAXkU?e=vdM2Wk`
- **Modo:** scheduled task diária **07:00 BRT**
- **Endpoint:** `POST /api/cases/sync` (já implementado em `server.js`)
- **Token:** header `Authorization: Bearer <EDITOR_TOKEN>`
- **Schema esperado:** ver `cs_clientes` table no `server.js`
- **Setup pendente:** integrar com MCP SharePoint quando disponível. **Hoje funciona via call manual** com payload JSON

### Calendário editorial Duda (planilha a ser criada · SharePoint)
- **Status:** aguardando Duda criar
- **Modo:** scheduled task diária **06:00 BRT**
- **Endpoint:** `POST /api/inbound/calendar` (já implementado)
- **Vence:** SharePoint > RD Station em caso de conflito (Duda é a fonte editorial)

### RD Station (API)
- **Endpoint upstream:** `https://api.rd.services/platform/email_marketing`
- **Auth:** `Authorization: Bearer ${RD_API_KEY}` (env)
- **Modo:** scheduled task diária **06:00 BRT** (junto com Duda)
- **Endpoint local:** `POST /api/inbound/sync-rd` (implementado, pega últimos 100 emails)
- **API Key:** registrada em `.env` local (key fornecida em 25/mai)
- **Pendente Railway:** setar `RD_API_KEY` env var no projeto Railway

### Aniversários / team.json
- **Modo:** manual. Mudanças raras (não vale automatizar)
- **Localização:** `public/api/team.json` campo `aniversario` em cada `responsavel`

### Inscrições LP (`/seja-voice`) e Post Tracker
- **Modo:** webhook real-time (já é POST direto do form/extension)
- **Persistência:** SQLite tabelas `recruitment_applications` e `posts`

## Como ativar scheduled task pra um source novo

1. **Localmente:** rodar via `skill schedule create` ou Bash com cron
2. **Em produção (Railway):** Railway tem "Cron Jobs" feature — adicionar nas settings do serviço
3. **Comando exemplo (sync diário 7h pra Cases):**
   ```bash
   curl -X POST https://epiuse-voices-optimizer.up.railway.app/api/cases/sync \
     -H "Authorization: Bearer $EDITOR_TOKEN" \
     -H "Content-Type: application/json" \
     -d @clientes.json
   ```
4. **Pra automatizar a leitura do SharePoint:** Microsoft Graph API ou Power Automate disparando o POST acima

## SLA atual

- **CS Clientes:** dados aparecem no Office em até 24h após mudança na planilha (com sync diário ativo)
- **Calendário editorial:** dados aparecem em até 24h
- **Voices/Posts:** real-time (webhook direto)
- **Aniversários:** quando alguém mexer no team.json

## TODO

- [ ] Configurar Railway Cron Job pra `/api/cases/sync` rodar 07:00 BRT
- [ ] Configurar Railway Cron Job pra `/api/inbound/sync-rd` rodar 06:00 BRT
- [ ] Setar `RD_API_KEY` env var no Railway
- [ ] Quando MCP SharePoint estiver disponível: substituir leitura manual da planilha CS por pipeline automatizado
- [ ] Quando Duda criar a planilha editorial: adicionar URL aqui + cron equivalente
