# Plano S20 — Rebrand HOME (Command Center)

> **Autor:** PM Técnico V2
> **Data:** 2026-06-07
> **Status:** ⏸️ Aguardando aprovação humana (Rudá)
> **Versão alvo:** v0.12.0 (bump menor — sem breaking change de rota)
> **Substitui no roadmap:** S20 "Events Cockpit" foi reordenado pelo Rudá; este S20 passa a ser "Rebrand HOME". Events Cockpit volta pra fila (proposta: S21 ou após).

---

## 1. Contexto resumido

- Home atual (`public/office.html`) virou catálogo de apps — pouco útil no dia-a-dia.
- Brand Guide V1.1 oficial (PDF em `vault/00-contexto/brand-guide-oficial/`) define paleta Navy `#001844` + Red `#cd1543` + Blue Light `#869ec3` + Grey `#cfd1d3` e fontes Maven Pro + Avenir. Esses tokens já existem no DESIGN.md / `design-tokens.css` (Regra 8 — fonte única).
- 6 áreas vivem em `public/api/areas.json` com `dona · icon · cor · kpis · ferramentas` — fonte boa pra alimentar os cards.
- War Room atual precisa parsear `vault/00-contexto/pendencias.md` (já tem estrutura 🔴/🟡/🟢/✅).
- SAP Competitor card precisa virar disabled + selo "🔜".

---

## 2. Objetivo

Transformar a HOME do EPI-USE Office em **command center pessoal do Rudá**, com identidade Brand V1.1, light mode redesenhado do zero, dark mode revisto, e foco em 5 blocos: saudação + daily digest + metas FY26 + grid das 6 áreas + alertas/bloqueios.

## 3. Não-objetivos (fora do escopo deste sprint)

- **Não** refatorar páginas internas de cada área (`/area/intelligence`, etc.) — só a HOME.
- **Não** trocar rotas existentes (`/office` continua sendo a home; `/dashboard` mantém alias se hoje existe).
- **Não** mexer em `design-tokens.css` salvo se faltar token (qualquer mudança passa pelo workflow do DESIGN.md — Regra 8).
- **Não** integrar dado novo (GA4, Zoho) — fica pro S17/S19. Usa o que `areas.json` + `pendencias.md` + endpoints existentes já entregam.
- **Não** publicar / deploy Railway (Regra 3 — só sob ordem explícita por push).
- **Não** mexer em SSO, lifecycle, ou qualquer infra.

## 4. Limites de alteração (escopo seguro)

**Pode tocar:**
- `public/office.html` (refactor visual)
- `public/css/home.css` (criar novo arquivo isolado se hoje o CSS está inline — preserva o resto)
- `public/js/home.js` (idem — script isolado da home)
- `server.js` — **só** adicionar `GET /api/pendencias` que lê + parseia `vault/00-contexto/pendencias.md` (read-only). Sem novas dependências npm.
- `public/api/areas.json` — adicionar campo `disabled:true` + `selo:"🔜 em breve"` no card SAP Competitor (se ele estiver lá; senão é HTML).

**NÃO pode tocar:**
- `design-tokens.css` direto · `DESIGN.md` (a não ser que falte token — neste caso PARA e pede ao arquiteto-frontend)
- Qualquer página `/area/*`, `/voices`, `/cases`, `/pipeline`, etc.
- Qualquer rota de API existente (só adiciona a nova).
- Estrutura de pastas / lifecycle / scripts PS1.

## 5. Sequência de entrega (5 checkpoints)

| # | Etapa | Entrega | Checkpoint humano |
|---|---|---|---|
| **C1** | **Audit + wireframe** | Print da home atual + wireframe ASCII/Figma-lite dos 5 blocos novos (saudação · digest · metas · grid 6 áreas · alertas). Lista de tokens que faltam no DESIGN.md (se faltar algum). | Rudá aprova layout antes do código. |
| **C2** | **API pendências + parser** | Endpoint `GET /api/pendencias` retornando JSON `{bloqueadas:[], dropadas:[], pendentes:[], entregues:[]}` a partir de `pendencias.md`. Validado com curl. | Rudá vê o JSON e confirma que parseia certo. |
| **C3** | **HOME light mode** | `office.html` refatorado · light mode aplicado · grid 6 áreas com hover spec (`aspect-ratio 3/4` · `box-shadow` · `backdrop-filter` · `grid-template-rows 1fr auto`) · SAP card disabled · Quick Actions. Sem dark mode ainda. | Rudá testa em localhost, aprova light. |
| **C4** | **Dark mode + toggle polido** | Dark mode revisto (mais Brand · menos genérico) · toggle nav com transição suave · persistência localStorage · hero secundário com elefante (SVG ou foto se já existe em `public/assets/`). | Rudá testa toggle ida/volta. |
| **C5** | **War Room → Alertas & Bloqueios + polish final** | Bloco renomeado · consumindo `/api/pendencias` · daily digest preenchido com último relatório / próximas tarefas (do que já existe nos endpoints) · metas FY26 puxando de `areas.json.funil[].meta`. Atualiza `CHANGELOG.md` do `modulos/00-design-system` se for o caso. | Rudá aprova → bump v0.12.0 (commit local; push só sob ordem). |

> Se algum checkpoint estourar 4h, parar e renegociar escopo.

## 6. Critérios de aceite

- [ ] HOME carrega < 1.5s em localhost (mesma rede atual).
- [ ] Mobile-first: 320px (iPhone SE) renderiza sem scroll horizontal e sem overflow nos cards de área.
- [ ] Light mode usa **só** `var(--color-*)` do design-tokens (zero hex hardcoded — `grep` no `home.css` deve retornar 0 hex no padrão `#xxxxxx`).
- [ ] Dark mode: idem, via `[data-theme="dark"]` ou `prefers-color-scheme`.
- [ ] Toggle nav alterna instantaneamente (sem flash) e persiste em `localStorage.theme`.
- [ ] Cards das 6 áreas: hover funcional · clicáveis · cada um aponta pra `/area/<id>` existente.
- [ ] Card SAP Competitor: `cursor:not-allowed` · opacidade reduzida · selo "🔜 em breve" visível · click bloqueado.
- [ ] Bloco "Alertas & Bloqueios" lista pendências 🔴 + 🟡 do `pendencias.md` automaticamente (testar adicionando 1 linha no .md e fazendo reload).
- [ ] Quick Actions: 3 botões (Optimizer · Cowork · Painel Duda) levam às rotas certas.
- [ ] Saudação dinâmica por hora ("Bom dia/tarde/noite, Rudá").
- [ ] Daily digest preenchido com pelo menos: data atual · última versão · 1 KPI por área (do `areas.json`).
- [ ] Hero secundário: SVG/foto de elefante visível sem distorcer (preserva aspect-ratio).
- [ ] Maven Pro (h1-h3) + Avenir (body) carregadas — `document.fonts.check()` retorna true.
- [ ] Zero regressão: rotas existentes seguem funcionando (smoke test manual em `/cases`, `/voices`, `/pipeline`, `/relatorio`, `/painel`).

## 7. Riscos identificados

| # | Risco | Probab. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Parser do `pendencias.md` quebrar se Rudá mudar o formato do .md depois | Média | Médio | Parser defensivo: regex por emoji/heading; se não bater, retorna lista vazia + log no server. Documentar formato esperado em comentário do `pendencias.md`. |
| R2 | Mudança de tokens / fontes vazar pra outras telas sem querer | Alta | Alto | Isolar CSS da home em `home.css` próprio · só consumir vars existentes · não alterar `design-tokens.css` neste sprint. |
| R3 | Dark mode "menos genérico" é subjetivo — risco de retrabalho | Alta | Médio | C1 inclui paleta dark concreta (3 swatches) pra Rudá aprovar ANTES de C4. |
| R4 | Hero elefante: SVG/foto pode não existir em `public/assets/` ou ter direitos restritos | Média | Baixo | Em C1, listar opções (placeholder SVG inline · foto já no repo · pedir nova). Decisão na aprovação. |
| R5 | `areas.json` tem KPIs `null` em várias áreas → cards "vazios" | Alta | Médio | Renderização gracefully degrada: mostra "⏳ aguarda integração [X]" (Regras 6+7). Nunca inventar número (REAL DATA ONLY). |
| R6 | Refactor da home gerar conflito com `office.html` atual sendo editado em paralelo (Codex/openclaw) | Baixa | Alto | Antes de C3, checar `vault/00-contexto/_LOCK.md` e marcar lock pra `office.html`. |
| R7 | Bump v0.12.0 sem push acidental pra Railway | Baixa | Alto | Reforçar Regra 3 na entrega de C5. Commit local só. |
| R8 | Tempo total estourar (5 checkpoints × ~2h = 10h, vira 2 dias) | Média | Médio | Cada checkpoint é entrega independente; dá pra pausar entre eles. Reavaliar escopo em C2 se C1 demorar > 3h. |

## 8. Dependências

- ✅ DESIGN.md v1.0 + design-tokens.css gerado (existe)
- ✅ `areas.json` com 6 áreas (existe)
- ✅ `pendencias.md` com estrutura emoji-driven (existe)
- ⚠️ Assets do elefante (verificar em C1)
- ⚠️ Maven Pro + Avenir carregadas em algum CSS atual (verificar em C1; se não, adicionar `@font-face` ou link Google Fonts)

## 9. Estimativa

- C1: 1.5h (audit + wireframe)
- C2: 1.5h (API + parser + teste)
- C3: 3h (HTML + light CSS + grid hover)
- C4: 2h (dark mode + toggle)
- C5: 2h (digest + metas + alertas + polish)
- **Total:** ~10h em 2 sprints curtas (1 dia útil dividido em 2).

## 10. Próximo passo

Aguardar aprovação humana neste plano. Após "Aprova", abrir tarefa de execução pro **arquiteto-frontend** começando por **C1 (audit + wireframe)** — entregável em `vault/workspaces-v2/arquiteto-frontend/outbox/s20-c1-wireframe.md`.

---

**Plano salvo em:** `C:/epiuse-mkt-office/vault/workspaces-v2/pm-tecnico/outbox/plano-s20-rebrand-home.md`
**Aprova? Ajusta? Cancela?**
