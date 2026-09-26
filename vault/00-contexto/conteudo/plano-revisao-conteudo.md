# 🗺️ Plano — Programa de Revisão TOTAL de Conteúdo (F1–F7)

> **Criado:** 07/jul/2026 (sessão de planejamento com Rudá) · **Status:** em execução
> **Objetivo:** unificar a categorização de todo o conteúdo (blog · LinkedIn · calendário · pipeline · jornadas · RAG) na taxonomia mestra v1.1 — LOB × oferta × funil — com checkpoints humanos entre fases.
> **Docs irmãos:** `auditoria-categorizacao-conteudo.md` (o porquê) · `taxonomia-conteudo.md` (o quê) · `public/api/taxonomia-conteudo.json` (fonte-máquina).

---

## Decisões que governam o programa (Rudá, 07/jul)

1. **Q1:** Qualtrics e WFS = ofertas dentro de `hcm`.
2. **Q2:** EPI-USE Labs/PRISM = LOB próprio `labs` → **10 LOBs canônicos**.
3. **Q3:** Funil com **4 etapas** (`topo` `meio` `fundo` `pos`).
4. **Método F3:** heurística por keywords + IA em lote etiquetada (`🤖 revisar`), campos Manus **read-only**.
5. Regras do repo respeitadas sempre: **zero deploy Railway sem ordem explícita** · dados IA etiquetados (Regras 6/7) · vanilla JS · tokens de design.

## Fases

| # | Entrega | Status | Risco |
|---|---|---|---|
| **F1** | Taxonomia v1.1 (10 LOBs, ~44 ofertas, funil 4) + `taxonomia-conteudo.json` servido em `/api/taxonomia-conteudo.json` via express.static | ✅ 07/jul | nulo |
| **F2** | Decisões Q1–Q3 congeladas | ✅ 07/jul (refinamentos nível 2 seguem abertos pra Bruna/Duda/Lisiane) | — |
| **F3a** | Blindagens: `sync_artigos_blog.py` com merge-preserve por `id` (re-sync do Manus não destrói mais enriquecimento) · `build_artigos_scores.py` parou de mutar `etapa_funil` | ✅ 07/jul | nulo |
| **F3b** | `build_artigos_taxonomia.py` — reclassificação dos 707 artigos, heurística **aplicada** | ✅ 07/jul — números abaixo | baixo (só adiciona campos) |
| **F3c** | Fallback IA nos 311 sem LOB: `python scripts/sync/build_artigos_taxonomia.py --apply --ia` (precisa `ANTHROPIC_API_KEY`; claude-haiku-4-5, lotes de 20, slugs validados, etiqueta `ia`) | ⏳ rodar na máquina do Rudá | baixo |
| **F3d** | Leitura canônica: filtros `?lob=&funil=&oferta=&metodo=` no `GET /api/artigos` · `/api/jornadas` v2 agrupando por `lob`×`funil` (10 LOBs sempre presentes, `pos` fora do cálculo de gap, fila de não-classificados exposta) + `jornadas.html` no MESMO commit · selects canônicos + badge `🤖 revisar` em `artigos.html` | ✅ 07/jul (lógica validada com dados reais; validação visual pendente no localhost — server não roda no ambiente remoto por falta dos node_modules off-repo) | médio (mitigado: filtros legados `?linha/?etapa` preservados) |
| **F4** | LinkedIn: `sync_linkedin_posts.py` — **testado contra a planilha real da Bruna**: 214 posts, LOB e funil 100% mapeados, soluções→ofertas via aliases GUIA_LOB adicionados na taxonomia (zero sem mapa). Gera `public/api/linkedin-posts.json` (marcado `criterio_funil: planilha-bruna-v1 pendente re-tag`). Re-tag de funil (evento-cobertura=topo) segue humano com a Bruna | ✅ 07/jul (lado repo) · 🙋 re-tag com Bruna | nulo |
| **F5** | Travar inputs: dropdown de slugs no `/content-pipeline` (opção "legado" retém valor e não força reclassificação em edições não-relacionadas) · coluna `editorial_calendar.lob` + `content_pipeline.oferta` (ALTER idempotente) · endpoint admin `POST /api/admin/migrate-taxonomia?dry=1` (requireEditorToken; estados slug/bucket/unknown/empty; só `fonte IN ('redatoria','raccoon')` no calendário — RD Station intocado) · escritores atualizados (`editoriaToLob()` no sync Redatoria, `import-redatoria`, espelho agendado, upsert calendar) · validação de `lob` no POST sempre e no PUT só quando o valor MUDA (item legado salva sem migrar) · `suggestCTA` cobre os 10 slugs | ✅ 07/jul (lógica testada; rodar migração no localhost: `curl -X POST "localhost:3000/api/admin/migrate-taxonomia?dry=1" -H "x-editor-token: $EDITOR_TOKEN"` → revisar → sem `dry`) | médio→baixo (`pilar` intocado = rollback trivial) |
| **F6** | 7 jornadas faltantes (hcm, btm, tech, cloud, ilab, ams, labs) no template das jornadas S/4HANA e ServiceNow da FY27 + Matriz Personas×Conteúdos preenchida | ✅ 21/jul (`vault/00-contexto/conteudo/jornadas-de-compra.md` — DRAFT 🤖, pendente validação Lisiane+Duda+dono do LOB; cases "a divulgar" em btm/cloud/ilab/labs precisam de referências reais) | nulo |
| **F7** | RAG/NotebookLM + JARVIS: metadados `lob`/`oferta`/`funil` nos documentos indexados; substituir `_postToLob()`/`_LOB_CANON` do `/api/linkedin/intelligence` pela leitura dos slugs canônicos de `linkedin-posts.json` | ⏳ | baixo |

## F3d — Mapa de gaps REAL (pós-taxonomia, 07/jul/2026)

Com a matriz canônica, o gap editorial ficou acionável (15 lacunas nos 396 já classificados — os 311 da fila IA podem mudar esses números):

- **`labs`**: 0 artigos em TODAS as etapas (LOB novo — Q2) → pauta do zero
- **`ams`**: meio e fundo zerados (1 artigo total, sendo AMS a linha com 97% de renovação!)
- **Fundo crítico** (0 artigos): `tech` · `servicenow` · `ilab` · `institucional`
- **Insuficiente** (<3): tech/meio 1 · btm/fundo 2 · servicenow/meio 1 · cloud/fundo 2 · ilab/meio 1

## F3b — Resultado real da 1ª aplicação (07/jul/2026)

Heurística aplicada nos 707 artigos (`--apply`, sem IA ainda). **Dados reais do report `data/metas/artigos_reclassificacao.json`:**

- **396 classificados** (56%): 337 por alias determinístico (confiança alta) + 59 por keywords (média)
- **311 na fila IA/humana** (44%) — majoritariamente o balde "Estratégia & ESG (ERP.ngo)" cujos títulos não têm sinal de LOB
- Distribuição LOB (classificados): hcm 150 · erp 93 · btm 50 · cloud 36 · institucional 26 · servicenow 20 · tech 13 · ilab 7 · ams 1
- **Funil: 0 divergências** entre heurística de intenção e rótulo Manus — onde o título tem sinal claro de meio/fundo (42 casos), o Manus já tinha acertado. Ou seja: o excesso de Topo (597) é parte gap editorial REAL, parte títulos sem sinal — a separação final vem da fila IA + revisão humana
- **Todos os 707 marcados `classificacao_pendente_revisao: true`** — nenhum número vira "real" sem revisão (Regra 7). Campos Manus 100% preservados; chaves legadas dos `agregados` recontadas e mantidas (artigos.html não quebra)

## Invariantes técnicos (contrato — não violar)

1. **Campos legados são read-only**: `linha_de_negocio`, `etapa_funil`, `oferta_especifica`, `linhas_de_negocio_multi`. Mutar quebra filtros exatos de `/api/artigos`, selects de `artigos.html`, `LOB_TO_LINHA` do `routes/jarvis.js` e `_ART_LOB` do server.
2. **`classificacao_metodo: "humano"` nunca é sobrescrito** pelo script (idempotência + respeito à revisão humana).
3. **Taxonomia = `public/api/taxonomia-conteudo.json`** — toda tela/script consome dali. Mudou LOB pai de uma oferta? Edita 1 linha no JSON + re-roda o script (idempotente).
4. **`editorial_calendar.pilar` fica intocado** (UI do calendário + RD Station dependem); canônico entra na coluna nova `lob`.
5. Server + página mudam **no mesmo commit** quando o shape de API muda (`/api/jornadas` v2 ↔ `jornadas.html`).

## 🔗 Achado 21/jul — Dashboard LinkedIn Intelligence do Gui (PR #38)

O Gui (área Growth) anexou no PR #38 um `index.html` = **Dashboard de LinkedIn Intelligence** (single-file), analisando os MESMOS 214 posts (mai/25–jun/26) da planilha da Bruna, com segmentação por LOB, solução, formato, tema, narrativa e funil + "Post Ideal / Post a Evitar" + rankings. Comentário dele: "Subir no claude".

- **Conexão direta com F4/F7:** é a versão visual da inteligência de LinkedIn que já consolidei no `linkedin-posts.json`. Faz sentido integrar ao Office (tela própria `/linkedin-intel` OU fundir na `/linkedin` existente), consumindo o `linkedin-posts.json` canônico em vez de dados embutidos.
- **NÃO integrado ainda** — decisão de escopo do Rudá + o dashboard do Gui provavelmente tem taxonomia própria (a 7ª+ taxonomia!) que precisa passar pelo de-para antes de virar tela oficial. Aguarda Rudá decidir.
- **Regra 3:** "subir no claude" do Gui NÃO autoriza deploy — só o Rudá, literalmente, por push.

## Checkpoints humanos restantes

- 🙋 **Rudá:** rodar F3c (`--apply --ia`) na máquina com `ANTHROPIC_API_KEY` OU autorizar rodar em sessão remota; depois revisar a fila (`fila_revisao_sem_lob` do report + badge `🤖 revisar` nas telas).
- 🙋 **Bruna:** validar de-para do LinkedIn + critério unificado de funil (evento-cobertura = topo) antes do re-tag dos 214 posts (F4).
- 🙋 **Duda/Lisiane:** refinar ofertas nível 2 e keywords (edição direta no JSON, sem código).
