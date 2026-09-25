# Módulo 23 — Visão Única do Funil (Site → RD → Zoho)

**Status:** 📐 desenhado (25/set/2026) · aguarda credenciais
**Propósito:** juntar numa tela só (`/funil`) o que hoje está em 3 ferramentas, do clique até a receita.

## Divisão de papéis (decisão Rudá 25/set/2026)

| Camada | Ferramenta oficial | Mede |
|---|---|---|
| Site (CMS) | **HubSpot CMS** — só CMS, **sem** CRM nem Marketing Hub | visitas, páginas, origem de tráfego, bounce |
| Marketing | **RD Station** | leads, conversões (forms/LPs), e-mail, automações, lead scoring |
| Vendas | **Zoho CRM** | deals, pipeline, receita |

## Funil unificado

```
HubSpot CMS          RD Station                     Zoho CRM
visitas/página  →  conversões → leads → MQL  →  deal → ganho (R$)
      └──── chave: URL + UTM ────┘└──── chave: e-mail ────┘
```

- **Site → RD:** o formulário RD embutido na página grava `conversion_identifier` + URL/UTM da conversão. Taxa de conversão por página = conversões RD (por identificador) ÷ visitas HubSpot (mesma URL).
- **RD → Zoho:** e-mail do lead. Precisa confirmar se a integração nativa RD→Zoho está ativa (ou se é importação manual).
- **Links do Office → site:** `/go/<token>` (módulo 18) já anexa UTM, e isso aparece nas duas pontas.

## Fontes e estado

| Fonte | Script | Estado |
|---|---|---|
| HubSpot CMS analytics | `scripts/integrations/hubspot_fetch.js` (a criar) → `public/api/hubspot-snapshot.json` | ⏳ Private App token com escopo `content` + analytics |
| RD Station | `scripts/integrations/rd_fetch.js` (existe, OAuth2) | 🟠 snapshot parado em 21/jun — refresh token provavelmente expirou |
| Zoho CRM | `zoho-leads-snapshot.json` via Zoho MCP | 🟡 sync manual; deals até abr/2026 |
| GA4 | `ga4_fetch.js` | 🟠 parado em 05/jun; verificar se a tag GA4 está no tema HubSpot novo |

## KPIs da tela `/funil`
Visitas → conversões → leads novos → MQL → deals criados → deals ganhos (R$), mês a mês e por **página/LOB** (SuccessFactors, S/4, Signavio, LeanIX, BTP, ServiceNow, AMS). Tudo com dado real (regra 7); se uma fonte faltar, o card mostra `⏳ Aguarda integração [fonte]`.

## Pendências (Rudá)
1. **HubSpot:** criar um Private App (Settings → Integrations → Private Apps) com escopos `content` e `business-intelligence`/analytics → token no `.env` off-repo como `HUBSPOT_TOKEN`.
2. **RD:** refazer o OAuth (`node scripts/integrations/rd_fetch.js exchange <code>`) — o snapshot parou em 21/jun.
3. **Script RD no site:** confirmar que o código de monitoramento do RD (loader) está no header global do tema HubSpot. Sem ele o RD não liga visitas → lead.
4. **RD→Zoho:** confirmar como o lead passa do RD pro Zoho (nativo, Zapier ou manual).
5. **Padrão de `conversion_identifier`** por página: `site-<lob>-<acao>` (ex.: `site-successfactors-contato`).
