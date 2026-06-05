# EPI-USE Office — Marketing Platform

> Plataforma interna do time de RevOps & Marketing da EPI-USE Brasil.
> Roda em `localhost:3000` (PC/Notebook) e em Railway (produção).

[![versão](https://img.shields.io/badge/versão-0.12.0-blue)](#changelog)
[![stack](https://img.shields.io/badge/stack-Node.js%20%2B%20Vanilla%20JS-green)](#arquitetura)
[![status](https://img.shields.io/badge/status-produção-brightgreen)](#deploy)

---

## O que é

O **EPI-USE Office** é uma plataforma web interna que centraliza ferramentas de marketing, inteligência de mercado e operação do time. Tudo em vanilla HTML/CSS/JS + Node.js (zero frameworks pesados).

**6 áreas operacionais:**
| Área | Foco | Página |
|---|---|---|
| 🔵 Intelligence | CRM, pipeline, lead scoring | `/area?id=intelligence` |
| 🟢 Inbound & Growth | Mídia paga, SEO, LinkedIn | `/area?id=inbound` |
| 🟡 Eventos | 30+ eventos/ano, MDF SAP | `/area?id=eventos` |
| 🟠 Outbound | Apollo, prospecção C-Level | `/area?id=outbound` |
| 🟣 Voices & Conteúdo | Programa de Voices, blog | `/area?id=voices` |
| 🟤 Conteúdo Editorial | 693 artigos, jornadas de compra | `/area?id=conteudo` |

---

## Setup local (primeira vez)

### Pré-requisitos
- Node.js 20+ (testar: `node -v`)
- Python 3.10+ (para scripts de sync)
- Git

### Instalação

```bash
git clone https://github.com/RudaCosta/epiuse-mkt-office.git
cd epiuse-mkt-office
npm install
cp .env.example .env
# preencher .env com as chaves (ver docs/ONBOARDING.md)
node server.js
```

Acesse: `http://localhost:3000`

### Inicialização automática (Windows — recomendado)

O servidor sobe automaticamente ao login e reinicia se cair:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/lifecycle/install-task.ps1
```

Para iniciar/parar manualmente:
```powershell
scripts/lifecycle/start-office.ps1
scripts/lifecycle/stop-office.ps1
```

---

## Páginas disponíveis

| Rota | Descrição |
|---|---|
| `/` | Office Home — hub de navegação |
| `/area?id=X` | Dashboard por área (funil + KPIs + ferramentas) |
| `/painel` | Painel da Duda — daily digest operacional |
| `/pipeline` | Pipeline Apollo (contatos, empresas, sequências) |
| `/optimizer` | Profile Optimizer V1 (LinkedIn kit) |
| `/optimizer-v2` | Profile Optimizer V2 (findskill.ai style) |
| `/voices` | Hub dos Voices ativos |
| `/relatorio` | Relatório mensal consolidado |
| `/metas` | Metas 30d/90d por área |
| `/artigos` | Base de 693 artigos pesquisáveis |
| `/cases` | Cases publicáveis por LOB |
| `/inbound` | Pipeline editorial (brief → artigo → carrossel) |
| `/cowork` | Cowork — disparo de workflows de agentes |
| `/jornadas` | Jornadas de compra por LOB |
| `/projecoes` | Cenários de paid media (CAC, ROI) |
| `/design` | Design System (tokens, cores, tipografia) |
| `/war-room` | War Room — visão executiva |
| `/changelog` | Histórico de versões |

---

## Arquitetura

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para detalhe completo.

**Resumo:**
- **Backend:** `server.js` — Express + SQLite (`better-sqlite3`)
- **Frontend:** HTML/CSS/JS vanilla — sem build step
- **Design tokens:** `public/design-tokens.css` (gerado por `scripts/design/gen_tokens.py`)
- **Dados:** `public/api/*.json` — fontes de dados estáticas + sync via scripts
- **Deploy:** Railway (auto-deploy no push para `master`)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Web server | Express 4 |
| Banco de dados | SQLite via `better-sqlite3` |
| IA | Anthropic SDK (`@anthropic-ai/sdk`) |
| E-mail | Resend |
| Autenticação | MSAL (Azure AD) |
| Frontend | Vanilla HTML/CSS/JS |
| Python scripts | pandas, openpyxl, python-pptx |

---

## Variáveis de ambiente

Ver `.env.example` para a lista completa. Chaves obrigatórias:

```
ANTHROPIC_API_KEY=       # Claude API
APOLLO_API_KEY=          # Apollo.io outbound
RESEND_API_KEY=          # E-mail transacional
EDITOR_TOKEN=            # Token interno para sync de cases
SESSION_SECRET=          # Express session
```

> ⚠️ O arquivo `.env` nunca é comittado. Solicitar ao Rudá.

---

## Módulos

Ver [`docs/MODULES.md`](docs/MODULES.md) para mapa detalhado.

| # | Módulo | Status |
|---|---|---|
| 00 | Design System | ✅ Ativo |
| 01 | Relatório Mensal | ✅ Ativo |
| 02 | Voices Optimizer | ✅ Ativo (V1 + V2) |
| 03 | Metas FY26 | ✅ Ativo |
| 04 | Artigos Blog | ✅ Ativo (693 artigos) |
| 05 | Cases CS | ✅ Ativo |
| 06 | Inbound Pipeline | ✅ Ativo |
| 07 | Pipeline Apollo | ✅ Ativo |
| 10 | Painel Duda | 🚧 Em construção |
| 99 | Integrações Pendentes | 📋 Roadmap |

---

## Roadmap

Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) para visão completa.

**Próximas prioridades:**
1. Painel Duda (Módulo 10) — dashboard operacional com real-time
2. Integração GA4 — tráfego orgânico no relatório
3. Integração LinkedIn API — seguidores e engajamento automático
4. Voice Agents (Módulo B) — automação de posts dos Voices

---

## Contribuindo

Ver [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) para padrões de código, commits e fluxo de trabalho.

**Regras inegociáveis:**
- Zero frameworks pesados (React/Vue/Angular)
- Só vanilla HTML/CSS/JS no frontend
- Dados REAIS ou etiqueta clara de placeholder
- Aprovação Duda antes de publicação externa
- Deploy só sob ordem explícita do Rudá ("sobe", "deploy", "push")

---

## Time

| Pessoa | Papel |
|---|---|
| **Rudá Costa** | RevOps & Marketing — estratégia, produto |
| **Duda** | Brand Experience — operação, aprovações |
| **Roberto** | Country Manager Brasil — aprovação executiva |

---

## Links

- **Produção:** Railway (URL via Rudá)
- **Repo:** https://github.com/RudaCosta/epiuse-mkt-office
- **Changelog:** `/changelog` ou `public/api/changelog.json`

---

*EPI-USE Office v0.12.0 · junho/2026*
