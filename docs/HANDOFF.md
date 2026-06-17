# 🤝 Handoff — EPI-USE Office

> **Comece por aqui.** Guia único de passagem do projeto para um(a) novo(a) colaborador(a).
> Reúne tudo: o que ler, como rodar, pastas, syncs, deploy e regras inegociáveis.
> Atualizado: junho/2026.

---

## 1. Ordem de leitura (faça nesta sequência)

| # | Documento | Por quê |
|---|---|---|
| 1 | **Este HANDOFF.md** | Visão geral + acessos necessários |
| 2 | [README.md](../README.md) | O que é o produto + setup local |
| 3 | [ONBOARDING.md](ONBOARDING.md) | Time, papéis, primeiros passos (30 min) |
| 4 | [ARCHITECTURE.md](ARCHITECTURE.md) | Como o sistema é montado (Node + SQLite + JSON) |
| 5 | [MODULES.md](MODULES.md) | Todas as páginas e funcionalidades |
| 6 | [SYNCS.md](SYNCS.md) | Os syncs e as tarefas agendadas |
| 7 | [CONTRIBUTING.md](CONTRIBUTING.md) | Regras de commit, padrões, deploy |
| 8 | [ROADMAP.md](ROADMAP.md) | O que vem por aí |
| 9 | `CLAUDE.md` / `AGENTS.md` (raiz) | Regras pro assistente de IA do projeto |

---

## 2. O que é, em uma frase

Plataforma web **interna** do time de RevOps & Marketing da EPI-USE Brasil. Centraliza inteligência de mercado, pipeline, conteúdo, metas e operação. **Vanilla HTML/CSS/JS + Node/Express + SQLite**, zero frameworks pesados. Roda em `localhost:3000` (PC) e em `office.epiuse.com.br` (Railway).

---

## 3. Acessos que você precisa pedir ao Rudá

Sem esses, o app roda mas algumas integrações ficam off (degradam com elegância):

| Acesso | Para quê |
|---|---|
| Repositório GitHub (`RudaCosta/epiuse-mkt-office`) | Código + deploy |
| Conta Railway (projeto Office) | Produção, logs, variáveis de ambiente |
| Valores do `.env` (ver `.env.example`) | `ANTHROPIC_API_KEY`, `EDITOR_TOKEN`, `RD_*`, `RESEND_API_KEY` |
| OneDrive MARKETING (Duda/Roberto) | xlsx que alimentam os syncs (calendário, cases, metas) |
| Apollo / Zoho / RD Station | Pipeline, deals, email marketing |

> **Segredos nunca vão pro repo.** Local: `.env` (ou `C:/Users/Ruds/.epiuse-optimizer/.env`). Produção: variáveis no painel do Railway.

---

## 4. Setup local (resumo)

```bash
git clone https://github.com/RudaCosta/epiuse-mkt-office.git
cd epiuse-mkt-office
npm install                 # Node 20+
cp .env.example .env        # preencher as chaves com o Rudá
node server.js              # http://localhost:3000
```

Para scripts de sync: Python 3.10+ com `pip install pandas openpyxl python-pptx python-docx`.

No PC do Rudá o app sobe sozinho (tarefa agendada). Em outra máquina, suba manual com `node server.js` ou `scripts/lifecycle/start-office.ps1`.

---

## 5. Mapa de pastas

```
epiuse-mkt-office/
├── server.js              ← ponto de entrada (Express, ~4800 linhas)
├── routes/                ← rotas separadas (auth, cases, inbound, sap)
├── public/                ← TODAS as páginas (.html vanilla) + /api/*.json (dados)
│   ├── *.html             ← telas (home, metas-fy26, raccoon, cases, pipeline...)
│   ├── api/*.json         ← dados servidos (metas-fy26, cases, areas, pipeline...)
│   └── design-tokens.css  ← tokens do Design System (gerados)
├── scripts/
│   ├── sync/              ← integrações (ver SYNCS.md)
│   ├── lifecycle/         ← subir/parar app + tarefas agendadas Windows
│   └── design/            ← gen_tokens.py (Design System)
├── modulos/               ← módulos com README/CHANGELOG próprios (08-inbound, 10-painel...)
├── data/                  ← insumos locais (ex.: data/metas/*.xlsx)
├── vault/                 ← contexto/memória (empresa, branding, pessoas, DESIGN.md)
├── docs/                  ← ESTA documentação
├── vault-backups/         ← backups automáticos antes de sobrescrever dados
├── Dockerfile             ← build de produção (Node 20 + Python3 + python-pptx)
├── railway.json           ← força Builder = DOCKERFILE no Railway
└── .env.example           ← modelo das variáveis de ambiente
```

---

## 6. Deploy (produção)

- **Como:** `git push origin master` → Railway builda pelo `Dockerfile` e publica em `office.epiuse.com.br`.
- **Builder:** Dockerfile (Node 20 + Python3 + python-pptx) — fixado por `railway.json`.
- **Dados:** Railway usa **volume persistente** (`/data/db.sqlite`) — sobrevivem a deploys.
- ⚠️ **Regra inegociável:** **só dar push sob ordem explícita do Rudá** ("sobe"/"deploy"/"push"), e **por push** — uma ordem não autoriza os próximos.

---

## 7. Regras inegociáveis (resumo — detalhe em CONTRIBUTING.md)

1. **Deploy só sob ordem explícita** do Rudá, por push.
2. **Dados REAIS** — nunca número fictício como real; usar etiquetas (`⏳ Aguardando integração`, `📝 Demonstração`, `⚠️ Estimativa`).
3. **Aprovação da Duda** antes de qualquer publicação externa.
4. **Stack vanilla** — sem React/Vue/Angular/Webpack/TypeScript.
5. **Português do Brasil** em toda interface e conteúdo.
6. **Nunca citar cliente/concorrente nominalmente** em conteúdo público sem aprovação.
7. **Nunca matar o `node` local** sem ordem (tarefa agendada cuida dele).
8. **Backup antes de sobrescrever** dado de produção/planilha (vai pra `vault-backups/`).
9. **Mudança de design** passa por `vault/00-contexto/DESIGN.md` + `gen_tokens.py` (nunca hex hardcoded).

---

## 8. Contatos

| Pessoa | Papel | Aprova |
|---|---|---|
| **Rudá Costa** | RevOps & Marketing (dono do produto) | Código, infra, deploy |
| **Duda** | Brand Experience (operação) | Publicações externas, conteúdo |
| **Roberto** | Country Manager Brasil | Cases, LOBs, executivo |
| **Lisiane de Assis** | CEO Redatoria | Tom de voz dos artigos |

---

**Dúvida de "onde mexo pra X?"** → [MODULES.md](MODULES.md) (por página) + [SYNCS.md](SYNCS.md) (por dado).
