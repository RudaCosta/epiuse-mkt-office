# Módulo 25 — Calendário Editorial

**Status:** ✅ v1.0 (Fase 1 — dados semeados) · ⏳ Fase 2 (Graph) aguarda TI
**Rotas:** `/editorial/insights` · `/editorial/calendario` · `/editorial/pautas`
**Dona do dado:** Bruna Yamagami (Intelligence) + Duda (Brand) — aparece nas 2 áreas
**Criado:** 30/set/2026

---

## Propósito

Espelhar no Office a **planilha de Calendário Editorial do LinkedIn** que o time de marketing
mantém no OneDrive (`epiusebr-my.sharepoint.com`, personal do TI). A planilha tem 3 abas e é
editada pelo time inteiro na nuvem — o Office **reflete** (mirror), não edita de volta.

## As 3 telas (separadas — decisão da Bruna)

| Tela | Rota | Aba fonte | Conteúdo |
|---|---|---|---|
| 💡 Insights | `/editorial/insights` | `💡 Insights` | 3 tabelas de BI: performance por formato, por tema, melhor dia da semana (214 posts / 365 dias) |
| 📅 Calendário | `/editorial/calendario` | `📅 Calendário` | Planejamento semana a semana (ago→out/26), 40 posts com tipo/LOB/narrativa/formato/copy/status |
| 📝 Pautas | `/editorial/pautas` | `Sugestão de Pautas` | 7 pautas por editoria: keyword, volumetria, resumo, links do doc e do artigo |

## Arquivos-chave

| Arquivo | Papel |
|---|---|
| `scripts/sync/sync_calendario_editorial.js` | Parser das 3 abas → POST `/api/editorial/sync` |
| `scripts/integrations/graph_fetch.js` | **Fase 2** — baixa o .xlsx da nuvem via Microsoft Graph |
| `routes/editorial.js` | Páginas + APIs (`/api/editorial/{insights,calendario,pautas,sync,resync}`) |
| `public/editorial/{insights,calendario,pautas}.html` | As 3 telas |
| `public/editorial/editorial.css` | Estilo compartilhado (design-tokens) |
| `public/editorial/editorial-common.js` | Botão Resync + toast + helpers |
| `server.js` | Tabelas `edt_insights` · `edt_calendario` · `edt_pautas` + mount do router |
| `vault/00-contexto/conteudo/calendario-editorial-marketing.xlsx` | Cópia local (fonte da Fase 1) |

## Como sincronizar

- **Botão 🔄 Resync** em cada tela → `POST /api/editorial/resync` → roda o parser → sincroniza.
- **Manual:** `node scripts/sync/sync_calendario_editorial.js`
- **Dry-run (só mostra o parse):** `node scripts/sync/sync_calendario_editorial.js --dry-run`
- **Da nuvem (Fase 2):** `node scripts/sync/sync_calendario_editorial.js --graph`

## Semântica do sync

**Mirror completo:** cada sync apaga os registros de `fonte='planilha-editorial'` e reinsere.
Assim, quando o time deleta/edita algo na planilha, o Office reflete (sem lixo antigo).
Insights é 1 linha (id=1) com as tabelas em JSON.

## Fases

- **Fase 1 (feita):** resync lê a **cópia local** (`vault/.../calendario-editorial-marketing.xlsx`).
- **Fase 2 (pendente TI):** resync com `--graph` baixa da nuvem ao vivo pelo link de
  compartilhamento, usando o app do Azure do SSO. Ver [`PENDENCIAS.md`](./PENDENCIAS.md).
