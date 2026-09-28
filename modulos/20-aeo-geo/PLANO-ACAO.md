# PLANO DE AÇÃO — AEO / SEO / GEO

> Como sair de **48 · 17 · 60** (ChatGPT · Perplexity · Google) para virar
> **a resposta** quando um decisor pesquisa "SAP + HubSpot + RevOps no Brasil".
> Dividido em **3 blocos** e etiquetado **[com Office]** × **[fora do Office]**.

Priorização: **🔥 quick-win** (baixo esforço, alto impacto) · **🏗️ fundação** ·
**♻️ recorrente**.

---

## Como os LLMs decidem quem citar (o "porquê" de tudo abaixo)

1. **Grounding em entidades** — o modelo precisa saber que a EPI-USE _existe_, o
   que ela _é_, e conectar isso a fontes confiáveis (site, LinkedIn, Wikidata,
   diretórios). Menção rasa (nota 3–5/10 hoje) = o modelo "sabe o nome" mas não
   tem lastro pra te recomendar.
2. **Prova estruturada e citável** — números, definições, FAQ, reviews. LLM cita
   frase que _parece fato verificável_.
3. **Frescor + rastreabilidade** — Perplexity e AI Overviews leem a web agora.
   Site lento/JS-pesado/sem schema = invisível pra eles (nosso caso: Perplexity 17).
4. **Consenso entre fontes** — quando LinkedIn + site + diretório + review dizem a
   mesma coisa, a confiança do modelo sobe e ele passa a te dar como resposta.

---

## BLOCO 1 — Fundação técnica (JUNTO com a migração HubSpot) 🏗️

> ⭐ Maior alavanca e **one-time**. Se entrar na migração, custa quase nada. Refazer
> depois custa 5×. É o que destrava a Perplexity (17 → alvo 45+).

| # | Ação | Onde | Esforço | Impacto |
|---|---|---|---|---|
| 1.1 | **Schema.org / JSON-LD** em todo template: `Organization`, `Service`, `FAQPage`, `Article`, `BreadcrumbList`, `Review`/`AggregateRating` quando houver. | HubSpot CMS (fora do Office) | Médio | 🔥 Alto |
| 1.2 | **`sameAs`** no schema Organization apontando p/ LinkedIn, Crunchbase, Instagram, YouTube, grupo EPI-USE global — costura a entidade pros LLMs. | HubSpot CMS | Baixo | 🔥 Alto |
| 1.3 | **`llms.txt` + `llms-full.txt`** na raiz do domínio (padrão emergente que curadores de IA leem): quem é a EPI-USE, LOBs, links canônicos. | HubSpot (arquivo estático) | Baixo | 🔥 Alto |
| 1.4 | **`robots.txt` liberando crawlers de IA**: `GPTBot`, `PerplexityBot`, `Google-Extended`, `ClaudeBot`, `CCBot`, `Applebot-Extended`. Sem isso a IA não te lê. | HubSpot | Baixo | 🔥 Alto |
| 1.5 | **Conteúdo server-side / HTML semântico** (não depender de JS pra renderizar texto) — HubSpot CMS já entrega SSR, ao contrário do WorkControl. | HubSpot | — (grátis na migração) | 🔥 Alto |
| 1.6 | **Core Web Vitals** verdes (LCP < 2,5s) + **sitemap.xml** limpo + canonicals. HubSpot resolve boa parte por padrão. | HubSpot | Baixo | Médio |
| 1.7 | **NAP consistente** (Nome/Endereço/Telefone) idêntico em site, Google Business, LinkedIn, diretórios — desambigua a entidade. | fora do Office | Baixo | Médio |
| 1.8 | **Páginas-âncora de entidade**: `/quem-somos`, `/sap-hubspot-revops`, glossário — as URLs canônicas que o LLM vai citar. | HubSpot + [Office gera o conteúdo] | Médio | 🔥 Alto |

**Checklist de migração** (entregar pra TI/agência que faz o HubSpot): itens
1.1–1.6 são "não-negociáveis do dia 1". Ver `PENDENCIAS.md` P1.

---

## BLOCO 2 — Autoridade e prova social (fora do Office, mas o Office ajuda a produzir) 🔥

> É isto que fecha o **sentimento HubSpot = 0** e a **profundidade de menção = 3–5/10**.
> LLM não inventa reputação: ele repete o que fontes confiáveis dizem.

| # | Ação | Onde | Esforço | Impacto |
|---|---|---|---|---|
| 2.1 | **Listar no HubSpot Solutions Partner Directory** (fonte nota 88 que hoje **não** nos lista). Se seguir o Caminho 3, listar como parceiro com foco SAP+RevOps. | fora do Office | Médio | 🔥 Alto |
| 2.2 | **Reviews em G2 / Clutch / Google Business** — meta inicial: 5–10 reviews reais de clientes. Fonte "avaliações públicas" está em 58 por falta de volume. | fora do Office (Office monta o pedido/fluxo) | Médio | 🔥 Alto |
| 2.3 | **Wikidata / Crunchbase** completos e consistentes (setor, fundação, SAP+HubSpot, `sameAs`). LLM usa como "verdade base" da entidade. | fora do Office | Baixo | Alto |
| 2.4 | **Cases com resultado numérico e nomeável** (com aprovação) — LLM cita "reduziu X% / Y meses". O Office já tem 22 cases em `/cases`; falta **estruturar métrica citável**. | [com Office — `/cases`] | Médio | 🔥 Alto |
| 2.5 | **Presença editorial de terceiros**: guest posts, entrevistas, participação em eventos SAP/HubSpot indexáveis. LinkedIn já é sinal forte (82) — ampliar pra fora dele. | [Office prioriza pautas] + fora | Médio | Alto |
| 2.6 | **Perfis sociais no schema `sameAs`** e ativos (LinkedIn já entrega; reforçar YouTube/Instagram com conteúdo técnico citável). | fora do Office | Baixo | Médio |

---

## BLOCO 3 — Conteúdo answer-first (100% dentro do Office) ♻️🔥

> Aqui o Office **já está armado**: `/content-pipeline` (kanban 7 estados) +
> `seo_checker.js` (score SEO+GEO/AEO determinístico) + pipeline de 5 agentes
> (briefing → artigo → capa → carrossel → copy LI). Falta **apontar a mira** pro
> AEO e usar o checker como **gate de publicação**.

| # | Ação | Onde | Esforço | Impacto |
|---|---|---|---|---|
| 3.1 | **Topic cluster "SAP + HubSpot + RevOps"**: 1 pillar page + 8–12 artigos-satélite respondendo perguntas reais de decisor (ver banco de perguntas abaixo). | [com Office — pipe-briefing → pipe-artigo] | Médio | 🔥 Alto |
| 3.2 | **Estrutura answer-first obrigatória** em todo artigo: H2 = pergunta, 1º parágrafo = resposta direta (≤50 palavras), TL;DR no topo, FAQ no rodapé com `FAQPage` schema. | [com Office — `seo_checker.js` já valida isso] | Baixo | 🔥 Alto |
| 3.3 | **Gate de publicação**: nenhum conteúdo sai do `/content-pipeline` sem score GEO ≥ 70 no `seo_checker`. Tornar o check obrigatório no fluxo. | [com Office] | Baixo | Alto |
| 3.4 | **Glossário / páginas de definição** ("O que é RevOps?", "SAP SuccessFactors + HubSpot: como integrar") — LLM adora citar definição limpa. | [com Office] | Médio | Alto |
| 3.5 | **Páginas de comparação** ("SAP nativo vs HubSpot vs integração") sem citar concorrente nominalmente (Regra da casa). | [com Office] | Médio | Médio |
| 3.6 | **Dados/estatísticas próprios citáveis** — publicar 1–2 números originais (ex: benchmark de X projetos SAP+CRM). LLM cita fonte primária de dado. | [com Office + dado real] | Médio | 🔥 Alto |

### Banco de perguntas-alvo (o que o decisor pergunta pra IA — miramos ser a resposta)
- "Como integrar SAP SuccessFactors com HubSpot?"
- "Consultoria que faz RevOps sobre SAP no Brasil?"
- "Como levar dado de RH/Payroll do SAP pro CRM de marketing?"
- "Quem implementa HubSpot com integração a ERP SAP no Brasil?"
- "RevOps para empresa que já roda SAP S/4HANA — por onde começar?"

---

## Sequência recomendada (o que fazer primeiro)

1. **Semana 0 — decisão de posicionamento** (Rudá/Roberto — `PENDENCIAS.md` P0).
2. **Durante a migração HubSpot — Bloco 1 inteiro** (janela one-time, não perder).
3. **Paralelo — Bloco 2.1 / 2.2 / 2.3** (diretório, reviews, Wikidata — destravam sentimento).
4. **Contínuo — Bloco 3** (Office roda o pipeline de conteúdo com a nova mira).
5. **Mensal — re-rodar o AEO Grader** e atualizar o baseline no dashboard `/aeo-geo` pra medir progresso real.

---

## Como o Office mede o progresso

- **Dashboard `/aeo-geo`** — guarda o baseline 20/jul/2026 e recebe cada novo snapshot do Grader (comparativo MoM, igual aos outros reports do Office).
- **`seo_checker.js`** — score por artigo antes de publicar (já existe, vira gate).
- **`/linkedin` + `/relatorio`** — LinkedIn já é a fonte de IA mais forte (82); manter alimentando.

> **Meta realista 90 dias** (🔮 projeção — não realizado, premissa: Bloco 1 na
> migração + 6 artigos answer-first + diretório/reviews): Perplexity 17 → **40+**,
> ChatGPT 48 → **62+**, Google 60 → **72+**. Medir, não prometer.
