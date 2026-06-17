# Syncs & Tarefas Agendadas — EPI-USE Office

> Referência de todos os scripts de sincronização e das tarefas agendadas do Windows.
> Os syncs ligam fontes externas (OneDrive/xlsx, RD Station, Zoho, Apollo, blog) ao app.
> Atualizado: junho/2026.

---

## 1. Como os dados fluem

```
Fontes externas                       Office (Node/SQLite + public/api/*.json)        Produção
─────────────────                     ──────────────────────────────────────         ─────────
xlsx OneDrive (Duda, Roberto) ──┐
RD Station (email mkt)          ├──►  scripts/sync/*  ──►  DB SQLite / *.json  ──►  Railway (deploy)
Zoho CRM (deals)                │                                  ▲
Apollo (prospecção)             │                                  │
blog epiuse.com.br (693 art.) ──┘            tarefas agendadas (Windows) rodam os scripts
```

- **Local (PC do Rudá):** o app sobe sozinho no login e as tarefas agendadas rodam os syncs.
- **Produção (Railway):** recebe os dados via `git push` (deploy) + alguns syncs POSTam direto no prod (`office.epiuse.com.br`) usando `EDITOR_TOKEN`.

---

## 2. Scripts de sync (`scripts/sync/`)

| Script | O que faz | Fonte → Destino | Como rodar |
|---|---|---|---|
| `sync_calendario_duda.js` | Lê o calendário editorial (xlsx da Duda no OneDrive) e POSTa no app | xlsx OneDrive → `editorial_calendar` (fonte=`planilha-duda`) | `OFFICE_URL=<url> node scripts/sync/sync_calendario_duda.js` |
| `sync_redatoria_to_calendar.js` | Cronograma da Redatoria → calendário | xlsx Redatoria → `editorial_calendar` (fonte=`redatoria`) | `node scripts/sync/sync_redatoria_to_calendar.js` |
| `sync_cronograma_redatoria.js` | Importa cronograma de produção da Redatoria | xlsx → DB | `node scripts/sync/sync_cronograma_redatoria.js` |
| `raccoon_to_xlsx.py` | Itens **agendados** do Rax (fonte=raccoon no prod) → célula-dia da xlsx da Duda | prod `/api/inbound/calendar` → xlsx OneDrive | `python scripts/sync/raccoon_to_xlsx.py --from-prod --apply` |
| `sync_cases_roberto.py` / `.js` | Cases de sucesso (xlsx do Roberto) → base de cases | xlsx OneDrive → `cs_clientes` / `cases.json` | `python scripts/sync/sync_cases_roberto.py` |
| `deploy-cases-to-site.ps1` | Publica os cases no site público via FTP | DB/JSON → www.epiuse.com.br | `powershell -File scripts/sync/deploy-cases-to-site.ps1` |
| `sync_rd_station.js` | Integração RD Station Marketing V2 (campanhas de email) | RD Station API → calendário/relatório | `node scripts/sync/sync_rd_station.js` (usa `RD_*` do `.env`) |
| `sync_zoho_deals.js` | Deals do Zoho CRM → pipeline | Zoho API → `pipeline-snapshot.json` | `node scripts/sync/sync_zoho_deals.js` |
| `sync_clientes_sap_4me.js` | Base de clientes SAP (4me) | fonte → `/clientes-sap-4me` | `node scripts/sync/sync_clientes_sap_4me.js` |
| `sync_artigos_blog.py` | Scrape dos 693 artigos do blog (corpo + metadados) | epiuse.com.br/artigo/... → `artigos/*.json` | `python scripts/sync/sync_artigos_blog.py` |
| `build_artigos_scores.py` | Calcula score de relevância 2026 dos artigos | artigos.json → scores | `python scripts/sync/build_artigos_scores.py` |
| `sync_linkedin_historical.py` | LinkedIn histórico (xls export) → série mensal | xls → `linkedin-historical.json` | `python scripts/sync/sync_linkedin_historical.py` |
| `log_voice_ssi.js` | Registra a medição semanal de SSI de um Voice | manual → DB | `node scripts/sync/log_voice_ssi.js` |
| `sync_ideias_to_xlsx.py` | Espelha o Mural de Ideias → planilha OneDrive | DB → xlsx OneDrive | `python scripts/sync/sync_ideias_to_xlsx.py` |
| `seed_ideias.py` | Popula o Mural de Ideias inicial | seed → DB | `python scripts/sync/seed_ideias.py` |
| `build_metas_pessoas.py` | **Metas da equipe** (Marlison, Bruna, Isabela, Designer) → metas | `data/metas/Metas_Equipe_EUBR_RevOps_v2.xlsx` → `public/api/metas-fy26.json` | `python scripts/sync/build_metas_pessoas.py --apply` |
| `sync_metas_fy26.py` | **(legado)** Metas FY26 a partir do docx oficial | docx → `metas-fy26.json` | substituído por `build_metas_pessoas.py` |

> **Regra de ouro dos syncs:** todo script tem **dry-run** (sem `--apply`) quando escreve em arquivo da Duda/produção. Sempre rode o dry-run antes do `--apply`. Os que escrevem em xlsx fazem backup `.bak-<timestamp>` antes.

---

## 3. Tarefas agendadas (Windows — PC do Rudá)

Registradas por `scripts/lifecycle/install-task.ps1` (sem admin). Rodam via `run-hidden.vbs` (sem janela). **Nunca matar o processo `node` sem ordem do Rudá.**

| Tarefa | Quando | Script | Faz |
|---|---|---|---|
| `EPI-USE-Office` | No login | `start-office.ps1` | Sobe o app local em `localhost:3000` |
| `EPI-USE-Office-Health` | A cada 5 min | `office-health.ps1` | Auto-restart se `/api/health` cair |
| `EPI-USE-Office-Calendar-Sync` | Diário ~07:15 | `run-calendar-sync.ps1` | Calendário Duda + Redatoria → prod, e Rax agendado → xlsx Duda |
| `EPI-USE-Office-Cases-Sync` | Diário | `run-cases-sync.ps1` | Cases do Roberto → prod |
| `EPI-USE-Apollo-Sync` | Diário | `run-apollo-sync.ps1` | Snapshot do pipeline Apollo |
| `EPI-USE-Office-LinkedIn-Sync` | Diário | `run-linkedin-sync.ps1` | Métricas LinkedIn |
| `EPI-USE-Office-LinkedIn-Routine` | Periódico | `run-linkedin-routine.ps1` | Rotina de seguidores LinkedIn |
| `EPI-USE-Ideias-Xlsx-Sync` | Diário | `run-ideias-xlsx-sync.ps1` | Mural de Ideias → xlsx OneDrive |
| `EPI-USE-LibreTranslate` (+ Health) | No login / 5 min | `start-libretranslate.ps1` | Servidor de tradução local |

> Ver/editar no Windows: **Agendador de Tarefas** (`taskschd.msc`) → tarefas `EPI-USE-*`.
> As tarefas `Office ...` (sem prefixo EPI-USE) são do Microsoft Office — **não mexer**.

---

## 4. Scripts de ciclo de vida (`scripts/lifecycle/`)

| Script | Faz |
|---|---|
| `install-task.ps1` | Registra todas as tarefas agendadas acima (rodar 1x no PC) |
| `start-office.ps1` | Sobe o server (`node server.js`) → logs em `logs/office.log` |
| `stop-office.ps1` | Para o server |
| `office-health.ps1` | Pinga `/api/health`; reinicia se cair |
| `run-hidden.vbs` | Roda um `.ps1` sem abrir janela (usado pelas tarefas) |
| `resync-railway-all.ps1` | Re-sincroniza tudo pro Railway de uma vez |
| `run-relatorio-mensal.ps1` | Gera o relatório mensal (PPTX) |

> **Scripts `.ps1` devem ser ASCII-only** (PowerShell 5.1 quebra com acento sem BOM).

---

## 5. Quando rodar o quê (na prática)

- **Duda editou o calendário** → roda sozinho via `EPI-USE-Office-Calendar-Sync` (ou manual: `run-calendar-sync.ps1`).
- **Atualizou metas da equipe** → copia o xlsx novo pra `data/metas/Metas_Equipe_EUBR_RevOps_v2.xlsx` e roda `python scripts/sync/build_metas_pessoas.py --apply` → commit → "sobe".
- **Novos cases do Roberto** → `EPI-USE-Office-Cases-Sync` (auto) ou `sync_cases_roberto.py`.
- **Atualizar artigos do blog** → `python scripts/sync/sync_artigos_blog.py` (re-scrape).
- **Depois de QUALQUER deploy** → conferir que os dados subiram (Railway usa volume persistente, mas valide).

Ver também: [ARCHITECTURE.md](ARCHITECTURE.md) · [ONBOARDING.md](ONBOARDING.md) · [CONTRIBUTING.md](CONTRIBUTING.md)
