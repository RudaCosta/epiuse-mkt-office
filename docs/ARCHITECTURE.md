# Arquitetura — EPI-USE Office

> Documento técnico para desenvolvedores. Atualizado: junho/2026.

---

## Visão geral

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (cliente)                     │
│         Vanilla HTML + CSS + JS · design-tokens.css     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / fetch()
┌────────────────────▼────────────────────────────────────┐
│                server.js (Express 4)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Routes  │  │ SQLite   │  │ Anthropic│  │ Resend │  │
│  │  /api/*  │  │ (melhor- │  │   SDK    │  │  Mail  │  │
│  │  pages   │  │ sqlite3) │  │  Claude  │  │        │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              public/api/*.json  (dados)                  │
│   areas.json · pipeline-snapshot.json · changelog.json  │
│   metas-fy26.json · cases.json · artigos/*.json         │
└─────────────────────────────────────────────────────────┘
```

---

## Estrutura de pastas

```
epiuse-mkt-office/
│
├── server.js                  ← ponto de entrada (Express)
├── package.json               ← dependências + versão
├── .env                       ← secrets (não comitado)
├── .env.example               ← template das vars
│
├── public/                    ← servido estaticamente em /
│   ├── *.html                 ← páginas (uma por rota)
│   ├── office-nav.js          ← navegação global injetada em todas as páginas
│   ├── office-footer.js       ← rodapé global
│   ├── design-tokens.css      ← tokens de design (gerado — não editar diretamente)
│   └── api/
│       ├── areas.json         ← fonte única das 6 áreas (funil, KPIs, ferramentas)
│       ├── pipeline-snapshot.json  ← snapshot Apollo (sync diário)
│       ├── changelog.json     ← histórico de versões
│       ├── metas-fy26.json    ← metas FY26 por área
│       └── cases.json         ← cases para /cases
│
├── vault/                     ← memória dos agentes (Obsidian-style)
│   ├── 00-contexto/           ← contexto compartilhado (todos os agentes leem)
│   │   ├── empresa.md         ← EPI-USE Brasil
│   │   ├── projetos.md        ← projetos ativos
│   │   ├── branding.md        ← tom de voz, cores
│   │   ├── pessoas.md         ← Voices ativos, time
│   │   ├── DESIGN.md          ← design system spec (fonte da verdade)
│   │   └── pendencias.md      ← bloqueios e pendências ativas
│   ├── workflows/             ← definições de fluxos do Cowork
│   └── cowork-runs/           ← histórico de execuções (runtime, não comitar)
│
├── modulos/                   ← documentação por módulo
│   ├── README.md              ← índice de módulos
│   └── 10-painel-duda/        ← ex: módulo em construção
│       └── README.md
│
├── scripts/
│   ├── design/
│   │   └── gen_tokens.py      ← gera public/design-tokens.css a partir de DESIGN.md
│   ├── lifecycle/
│   │   ├── install-task.ps1   ← instala Tarefas Agendadas Windows (1x, sem admin)
│   │   ├── start-office.ps1   ← inicia servidor
│   │   ├── stop-office.ps1    ← para servidor
│   │   └── office-health.ps1  ← healthcheck (chamado a cada 5min)
│   ├── integrations/
│   │   ├── apollo_pipeline_sync.js  ← sync Apollo → pipeline-snapshot.json
│   │   └── ga4_oauth_setup.js       ← setup OAuth GA4
│   └── sync/
│       ├── sync_artigos_blog.py     ← importa artigos do site
│       ├── sync_cases_roberto.py    ← importa cases aprovados
│       └── sync_metas_fy26.py       ← sync metas FY26
│
├── docs/                      ← documentação para humanos (esta pasta)
│   ├── ARCHITECTURE.md        ← este arquivo
│   ├── ONBOARDING.md          ← guia para novos membros
│   ├── MODULES.md             ← mapa de módulos
│   ├── ROADMAP.md             ← roadmap de produto
│   └── CONTRIBUTING.md        ← padrões de contribuição
│
└── logs/                      ← logs de runtime (não comitar)
    ├── office.log
    ├── office.err.log
    └── office-health.log
```

---

## Servidor (`server.js`)

Express 4 com as seguintes responsabilidades:

| Rota | Tipo | Descrição |
|---|---|---|
| `GET /` | HTML | Serve `public/office.html` |
| `GET /:page` | HTML | Serve `public/:page.html` |
| `GET /api/*` | JSON | Dados estáticos de `public/api/` |
| `POST /api/optimizer-input` | JSON | Processa entrada do Profile Optimizer |
| `POST /api/cowork-run` | JSON | Dispara workflow do Cowork |
| `GET /api/health` | JSON | Healthcheck (`{ status: "ok" }`) |

---

## Design System

**Fonte da verdade:** `vault/00-contexto/DESIGN.md`

**Workflow de mudança:**
1. Editar `vault/00-contexto/DESIGN.md`
2. Rodar `python scripts/design/gen_tokens.py`
3. O arquivo `public/design-tokens.css` é regenerado
4. Reload no browser — mudança propaga em todas as páginas

**Paletas:**
- `--color-primary-*` → Office app (azul)
- `--brand-epiuse-navy: #001844` → Corporate Navy
- `--brand-epiuse-red: #cd1543` → Corporate Red
- `--brand-epiuse-blue-light: #869ec3` → Blue Light
- `--brand-epiuse-grey: #cfd1d3` → Grey

**Fontes:** Maven Pro (primary) + Avenir (secondary)

---

## Banco de dados (SQLite)

Localizado em `~/.epiuse-optimizer/` (fora do repo — não sincroniza).

Tabelas principais:
- `voices` — perfis dos Voices ativos
- `cases` — cases publicáveis
- `sessions` — sessões Express

> ⚠️ **Railway não persiste SQLite entre deploys.** Workaround: re-sync dos cases após cada push usando `EDITOR_TOKEN`.

---

## Lifecycle (Windows)

O servidor é gerenciado por **Tarefas Agendadas do Windows** (substituiu PM2 em v0.7.0):

| Tarefa | Trigger | Script |
|---|---|---|
| `EPI-USE-Office` | Login do Windows | `start-office.ps1` |
| `EPI-USE-Office-Health` | A cada 5 min | `office-health.ps1` |

**Causa raiz histórica (resolvida):** Node.js v24 quebrou `better-sqlite3` (ABI 108 vs 137). Fix: `better-sqlite3@12.x` com prebuilt binaries.

---

## Deploy (Railway)

- Push para `master` → deploy automático
- Variáveis de ambiente configuradas no painel Railway
- **NUNCA fazer push sem ordem explícita do Rudá**

---

## Integrações externas

| Serviço | Status | Dados |
|---|---|---|
| Apollo.io | ✅ Ativo | pipeline-snapshot.json (sync diário) |
| Anthropic Claude | ✅ Ativo | Profile Optimizer, Cowork |
| Resend | ✅ Ativo | E-mails transacionais |
| Google Analytics 4 | ⏳ Pendente | OAuth configurado, sync não finalizado |
| LinkedIn API | ⏳ Pendente | Seguidores, engajamento |
| Zoho CRM | ⏳ Pendente | Pipeline CRM → dashboard |

---

*Atualizado em: junho/2026 · v0.12.0*
