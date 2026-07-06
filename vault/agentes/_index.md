# 🏢 Diretório do Escritório Virtual EPI-USE

> Todos os agentes ativos. Cada link abre o perfil (estilo Obsidian).
> Para invocar via Claude Code, use o slash command correspondente.

> Arquitetura em **3 camadas** (ver [[_mapa-contexto]] e tela `/agentes` no Office): CEO orquestra → 6 agentes de área (1 por dona) → 4 executores transversais.

## 🎯 Orquestrador

| Agente | Cargo | Invocação | Definição |
|---|---|---|---|
| 👔 ceo-mkt | CEO Operacional (lê o mestre todo) | delegação | `.claude/agents/ceo-mkt.md` |

## 🏢 Agentes de área (1 por dona)

| Agente | Dona | Área | Módulo |
|---|---|---|---|
| 🧠 area-intelligence | Bruna Yamagami | Marketing Intelligence & CRM | `/area/intelligence` |
| 🚀 area-growth | Guilherme (Gui) | Growth & Performance | `/area/growth` |
| 📅 area-eventos | Fernanda Mattos Tavares | Field Marketing & Eventos | `/area/eventos` |
| 📞 area-pipeline | Marlison Estrela | Development Sales / Pipeline | `/area/pipeline` |
| 🎨 area-brand | Eduarda (Duda) | Brand Experience / Voices | `/area/brand` |
| 📣 area-conteudo | Lisiane de Assis | Conteúdo / Redatoria | `/area/conteudo` |

## 🛠️ Executores transversais (chamados pelas áreas)

| Agente | Cargo | Slash command | Perfil |
|---|---|---|---|
| 🎨 [[criativos]] | Diretor de Arte + Copy | `/criativos` | [criativos.md](./criativos.md) |
| 💻 [[landing-pages]] | Frontend + UX Writer | `/lp` | [landing-pages.md](./landing-pages.md) |
| 📄 [[propostas]] | Pré-Vendas + Solution Architect | `/proposta` | [propostas.md](./propostas.md) |
| 📊 [[campanhas]] | Mídia Paga + Competitive Intel | `/campanha` | [campanhas.md](./campanhas.md) |
| ✍️ [[copywriter]] | Redator + Copywriter | `/texto` | [copywriter.md](./copywriter.md) |
| 🎨 [[designer]] | Diretor de Arte + Designer | `/design` | [designer.md](./designer.md) |
| 🧠 [[marketing-intelligence]] | BI + CRM Analyst | `/intelligence` | [marketing-intelligence.md](./marketing-intelligence.md) |
| 🔍 [[revisor-qa]] | QA Editor + Revisor | `/revisar` | [revisor-qa.md](./revisor-qa.md) |


## 🤖 Copiloto SDR (JARVIS) — área Pipeline

| Item | O que é | Definição |
|---|---|---|
| 🤖 [[jarvis]] | **App em runtime** — copiloto SDR ao vivo (NÃO é sub-agente). Tela `/jarvis` + `routes/jarvis.js`. | [jarvis.md](./jarvis.md) |
| 🧠 jarvis-sdr | **Sub-agente destilador** — processa as calls salvas em aprendizados curados (offline). Ligado à Pipeline (Marlison). | `.claude/agents/jarvis-sdr.md` |

> O app ao vivo e o destilador se conectam pela **memória viva** (SQLite `jarvis_calls` + `jarvis_aprendizados`), que também **pauta os próximos conteúdos** (loop campo→conteúdo).

## Comandos do escritório

| Comando | Quem age | O que faz |
|---|---|---|
| `/onboard` | CEO | Preenche contexto inicial da vault |
| `/nova-oferta <url\|descrição>` | CEO → Criativos → LPs | Lança oferta completa (copy + criativo + LP) |
| `/criativos <pedido>` | Criativos | Mockups + copies para anúncios |
| `/lp <pedido>` | Landing Pages | HTML single-file (LP, quiz, dashboard) |
| `/proposta <transcrição>` | Propostas | Proposta comercial formatada |
| `/campanha <url\|brief>` | Campanhas | Análise de concorrente OU plano de funil |
| `/contratar <especialidade>` | CEO | Cria novo agente do zero |

## Vagas abertas

| Cargo | Quando contratar | Como |
|---|---|---|
| Vídeos com IA (Cling/Sora) | Quando precisar transformar criativos estáticos em vídeo | `/contratar agente que faça vídeos de IA usando Cling` |
| Email Marketing | Quando volume de email passar de 4/mês | `/contratar agente de email marketing` |
| SEO técnico | Já existe via skill `searchfit-seo:*` | (não precisa contratar) |

## Histórico de contratações

- maio/2026 — CEO, Criativos, Landing Pages, Propostas, Campanhas (fundação)
