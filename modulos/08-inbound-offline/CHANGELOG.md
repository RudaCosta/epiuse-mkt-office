# 📜 CHANGELOG — Módulo 08 · Inbound / Content Factory + Carrossel

> Histórico de mudanças do inbound (engine de conteúdo, Raccoon Studio, carrossel/arte,
> pipeline editorial e syncs da planilha da Duda). Datas em pt-BR. Regra 9.

## 2026-06-16

### Arte / Carrossel (`public/inbound/carousel.html`)
- **Logos GRANDES** no lockup do topo: EPI·USE + LOB de 40px → **66px** (caixas brancas maiores, sombra reforçada).
- **Selo ERP.ngo** no rodapé de 40px → **52px** (equilíbrio com o topo).
- **Botão "🎨 Editar no Canva"** (card "Refinar no Canva"): baixa o PNG 1080×1350 do slide atual, copia o texto (headline · número · contexto · fonte) e abre o Canva pra Duda refinar.
  - Limitação honesta: autofill direto no template de marca = só **Canva Teams/Enterprise**. `CANVA_URL` é constante trocável por um share-link de template de marca quando houver.
- **ServiceNow** já contemplado como LOB (logo + paleta verde) no seletor.

### PPTX em produção (Railway)
- **`railway.json`** força **Builder = DOCKERFILE** → imagem com Python3 + python-pptx. Resolve o `python: not found` na geração de PPTX do relatório — todos geram sem depender da máquina do Rudá.

### Pipeline editorial (`server.js`)
- **DELETE `/api/content/:id`** agora remove também a linha espelhada no `editorial_calendar` (fonte=raccoon), fechando o gap de limpeza.
- Limpeza dos **3 itens-teste** de "reforma tributária" (ids 81/82/83) — pipeline e calendário com 0 raccoon.

### Sync da planilha da Duda (tarefa diária `EPI-USE-Office-Calendar-Sync`)
- **`run-calendar-sync.ps1`**: novo passo `raccoon_to_xlsx.py --from-prod --apply` — itens **agendados** do Rax (fonte=raccoon) vão pra **célula-dia** da xlsx da Duda (backup `.bak` + dedup). Roda DEPOIS dos syncs xlsx→prod.
- **`sync_calendario_duda.js`**: **guarda anti-loop** — ignora linhas `Rax:` ao ler a planilha, evitando duplicata no round-trip prod→xlsx→prod.

### Contexto do engine (docs)
- **`lob-positioning.md`** — mapa LOB × Solução × Indústria (11 LOBs + 11 indústrias, cases marcados INTERNO).
- **`art-template-brief.md`** — spec do template de arte + brief do botão Canva.

### Infra / dados
- Volume Railway **persistente** confirmado: deploy não apaga dados (22 cases intactos pós-deploy). Workaround da Regra 4 (re-sync de cases) tende a obsoleto.

---

> Convenção: cada entrada = data + seções por área. Mudança de design passa pelo `vault/00-contexto/DESIGN.md` (Regra 8). Deploy só sob ordem explícita "sobe" (Regra 3).
