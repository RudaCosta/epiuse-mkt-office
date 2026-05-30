# 🤝 Protocolo Multi-tool — Claude · Codex · Obsidian · openclaw

> Como usar várias ferramentas de IA no MESMO reppositório sem se atropelarem.
> Modelo escolhido pelo Rudá (30/mai/2026): **"livre com trava"** — todos podem editar,
> mas com um arquivo de trava (`_LOCK.md`) + branches git separadas por ferramenta.

---

## 🎯 Por que isso existe

Rudá está rodando **Claude Code**, **Codex** e **Obsidian** (e testando **openclaw**) no mesmo
projeto `G:\Meu Drive\Claude MKT EUBR\`. Sem regra, duas ferramentas editam o mesmo arquivo ao
mesmo tempo → conflito, retrabalho, ou pior: uma sobrescreve a outra silenciosamente.

Resposta às 2 perguntas do Rudá:
- **"Dá pra usar duas ao mesmo tempo ou é loucura?"** → Dá, com disciplina. A trava + branches resolvem.
- **"E quando acabar os créditos de uma?"** → A outra assume lendo `_LOCK.md` + `vault/00-contexto/` (fonte única). Nada se perde porque o estado vive em arquivos versionados, não na cabeça da ferramenta.

---

## 📐 Regra 1 — Fonte ÚNICA de verdade

Tudo que é "estado do projeto" mora em **`vault/00-contexto/`**. Toda ferramenta LÊ daqui no começo
de cada sessão e ESCREVE aqui ao terminar. Nenhuma ferramenta guarda contexto só "na memória".

| Arquivo | Papel |
|---|---|
| `_LOCK.md` | **Trava viva** — quem está mexendo em quê AGORA |
| `ROADMAP.md` | Backlog único compartilhado (todas leem antes de pegar tarefa) |
| `empresa.md` · `projetos.md` · `branding.md` · `pessoas.md` | Contexto de negócio |
| `DESIGN.md` | Design system (fonte dos tokens) |
| `mapa-fontes-dados.md` | Auditoria de dados reais vs pendentes |

Os arquivos de identidade de cada ferramenta (`CLAUDE.md`, `AGENTS.md`) são **ponteiros finos**
pra cá — não duplicam regras. Se divergirem, `vault/00-contexto/` vence.

---

## 📐 Regra 2 — Donos por área (padrão, mas flexível)

Pra reduzir colisão, cada ferramenta tem um território natural:

| Ferramenta | Território padrão | Força |
|---|---|---|
| **Claude Code** | Backend (`server.js`), infra, lifecycle, deploy Railway, integrações, scripts Python | Agentic longo, executa, lê arquivos, roda comando |
| **Codex** | Exploração de design/frontend (paletas, mockups, `*.codex.*`) | Iteração visual rápida |
| **Obsidian** | Conhecimento humano — notas do Rudá/Duda, briefings, decisões | Edição humana, RAG |
| **openclaw** | ⏳ *a definir* — Rudá ainda testando (ver Regra 5) | ? |

Território **não é cerca**: se o Codex quiser mexer no backend, pode — mas **avisa na trava primeiro**.

---

## 📐 Regra 3 — A trava (`_LOCK.md`)

Antes de editar arquivos de produção, a ferramenta **escreve uma linha** em `_LOCK.md`:

```
| ferramenta | arquivos/área | início (ISO) | status |
| claude     | server.js, scripts/lifecycle/ | 2026-05-30T03:30 | 🔴 editando |
| codex      | DESIGN.codex.md | 2026-05-29T14:00 | ✅ liberado |
```

- `🔴 editando` = não mexa nesses arquivos
- `✅ liberado` = pode pegar
- Ao terminar, troca pra `✅ liberado` (ou apaga a linha).
- **Quem vai editar lê a trava primeiro.** Se o alvo está 🔴 por outra ferramenta, escolhe outro arquivo ou espera.

É honra/disciplina (não há lock técnico forçado), mas resolve 95% dos atropelos com humano no comando.

---

## 📐 Regra 4 — Branches git por ferramenta

Repo git: `modulo-a-profile-optimizer/` (remote: GitHub `RudaCosta/modulo-a-profile-optimizer`).

Convenção:
- `claude/<tarefa>` — trabalho do Claude
- `codex/<tarefa>` — trabalho do Codex
- `human/<tarefa>` — edições manuais do Rudá
- `master` — só merge revisado (via PR ou merge local consciente)

**Fluxo quando acabam créditos de uma ferramenta:**
1. A ferramenta que vai parar faz commit do que tem na sua branch (mesmo incompleto) + atualiza `_LOCK.md` pra `✅ liberado` + anota em `ROADMAP.md` onde parou.
2. A outra ferramenta lê `_LOCK.md` + `ROADMAP.md`, faz `git checkout` da branch, e continua.
3. Nada se perde porque o estado está em git + vault, não na sessão.

> ⚠️ **Regra de ouro Claude #3 continua valendo:** push pro Railway/GitHub só sob ordem explícita do Rudá, por push. Branches locais e commits locais são livres; `git push` não.

---

## 📐 Regra 5 — openclaw (⏳ aguardando info do Rudá)

Rudá mencionou estar testando **openclaw** mas ainda não explicou o que é / como conecta.
**Não inventar integração.** Quando Rudá detalhar (o que faz, qual território, como acessa o repo),
preencher a linha na tabela da Regra 2 e este bloco. Até lá, openclaw = caixa-preta — trata como
"humano externo": se editar, que avise na trava.

---

## 📐 Regra 6 — Sincronização de contexto entre ferramentas

- **Codex ↔ Claude:** ambos leem `vault/00-contexto/`. Quando o Codex gera algo bom (ex: `DESIGN.codex.md`),
  o Claude promove pro arquivo oficial (`DESIGN.md`) **só com decisão do Rudá** (foi o que rolou no v0.7.0).
- **Obsidian ↔ todos:** Obsidian edita os `.md` da vault diretamente (é a interface humana da mesma pasta).
  Toda ferramenta vê na hora.
- **Conflito de merge:** se duas branches tocaram o mesmo arquivo, **Rudá decide** qual vence (ou Claude
  faz o merge mostrando o diff). Nunca auto-resolver silenciosamente arquivo de produção.

---

## ✅ Checklist rápido (cola na parede)

Antes de editar produção, QUALQUER ferramenta:
1. Leu `vault/00-contexto/_LOCK.md`? Alvo está livre?
2. Escreveu sua linha 🔴 na trava?
3. Está na branch certa (`<ferramenta>/<tarefa>`)?
4. Ao terminar: commit local + trava pra ✅ + anotou no `ROADMAP.md`?
5. Push? **Só com ordem explícita do Rudá.**

---

*Criado v0.7.0 · 30/mai/2026 · revisar quando openclaw for definido.*
