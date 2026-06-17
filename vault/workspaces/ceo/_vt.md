# 👔 CEO — Working Table

> Memória viva do CEO. Atualizado a cada sessão.

## Onboard realizado em: 2026-05-23
## Última atualização: 2026-06-17 · usuária: Bruna Yamagami (Marketing Intelligence & CRM)

---

## Estado atual dos projetos (atualizado 17/jun/2026)

| Projeto | Status | Prioridade |
|---|---|---|
| **Profile Optimizer (Módulo A)** | ✅ Construído e funcionando (v0.9.5+) | Manutenção |
| **Marketing Hub (onboarding)** | ✅ Ativo em produção | Manutenção |
| **Sales Hub** | ✅ Ativo em produção | Manutenção |
| **EPI-USE Voices — programa** | 🟡 MVP (2/5 Voices ativos) | Alta |
| **Office Engine (escritório virtual)** | ✅ v1.0.0 localhost · prod Railway desatualizada | PUSH pendente (Rudá) |
| **Painel da Duda (Módulo C)** | ✅ Daily Digest + Inbox por área (S15/0.11.0) | Manutenção |
| **Voice Agents (Módulo B)** | ⏳ A construir | PRIORIDADE 3 |
| **SAP Competitor Intelligence** | ✅ Skill ativa | Uso pontual |
| **Field Marketing** | ✅ /field-marketing (92 eventos, S30) | Manutenção |
| **Content Pipeline** | ✅ /content-pipeline kanban + SEO checker (S31) | Manutenção |
| **Clientes SAP 4 ME** | ✅ /clientes-sap-4me (705 projetos, S29) | Manutenção |
| **Railway Volume** | ✅ Volume /data persistente (09/jun) | Resolvido |

---

## Voices ativos (maio/2026)

| Voice | Nicho | Status | Pendência |
|---|---|---|---|
| Anderson Costa | SAP HCM · SuccessFactors | 🟡 Piloto — kit gerado | Ajustes finais no kit |
| Carlos Furigo Cardoso | SAP BTP · Clean Core · AWS | 🟡 Onboarding | Campos em laranja para preencher |

**Vagas abertas:** 3 de 5 no MVP (prioridade: Signavio, Analytics, Indústria)

---

## Decisões recentes
- Escritório fundado com 5 agentes (CEO + Criativos + LPs + Propostas + Campanhas)
- Stack definida: HTML/CSS/JS vanilla, Node.js, Claude Vision

## Pedidos em andamento
- (nenhum — sessão pausada por tokens)

## Railway — deploy pendente do Profile Optimizer
- **Project ID**: `c363947a-dd68-4ba7-a715-fbaf37e932d5`
- **Environment ID**: `d8cc8800-a89d-4921-96ec-ef9550364dd4`
- **Link**: https://railway.com/project/c363947a-dd68-4ba7-a715-fbaf37e932d5?environmentId=d8cc8800-a89d-4921-96ec-ef9550364dd4
- **O que falta**: criar repo GitHub → conectar ao Railway → setar `ANTHROPIC_API_KEY` → URL pública pronta

## Próximos passos (atualizado 17/jun/2026)

1. **🔴 SSO Microsoft (B1)** — Azure: adicionar Redirect URIs + admin consent + setar env vars Railway (passos humanos Rudá)
2. **S17 GA4** — `ga4_fetch.js` pronto; falta Rudá entregar Service Account JSON + Property ID
3. **S18 Apollo cron** — Tarefa Windows diária 6h para Apollo
4. **S19 Zoho CRM** — pipeline R$ (deals Opportunity Source=SDR)
5. Onboarding de 3 novas Voices (prioridade: Signavio, Analytics, Indústria)
6. Validação visual Voice Index em prod (Anderson Costa, ~5min)

## Notas operacionais
- Sempre revisar entregas no `outbox/` antes de mover para `entregas/`
- Aprovação obrigatória da Duda antes de qualquer publicação externa
- MDF: alertar se ação de evento for citada sem Business Plan submetido antes
- Contratar agente de Vídeo (Cling) só quando volume justificar
