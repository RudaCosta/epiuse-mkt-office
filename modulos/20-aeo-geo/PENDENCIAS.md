# PENDÊNCIAS — Módulo 20 (AEO/SEO/GEO)

Decisões e ações que dependem de humano. Claude não resolve sozinho.

---

## 🔴 P0 — Decisão de posicionamento (Rudá + Roberto) — BLOQUEIA o resto

Escolher o caminho (ver `DECISIONS.md` D2):
- [ ] **Caminho 3 (recomendado)** — posicionar na intersecção **SAP × HubSpot × RevOps**.
- [ ] Caminho 1 — otimizar como consultoria SAP e rerodar o Grader na categoria certa.
- [ ] Caminho 2 — virar agência HubSpot (não recomendado).

> Todo o Bloco 2 (diretório, cases, mensagem) e Bloco 3 (conteúdo) se ajustam à
> escolha. O default assumido nos docs e no dashboard é o **Caminho 3**.

---

## 🟡 P1 — Checklist técnico pra quem faz a migração HubSpot (Rudá → TI/agência)

Entregar o **Bloco 1** do `PLANO-ACAO.md` como requisito de migração (não-negociáveis do dia 1):
- [ ] JSON-LD (Organization, Service, FAQPage, Article, BreadcrumbList) nos templates.
- [ ] `sameAs` costurando LinkedIn/Crunchbase/redes.
- [ ] `llms.txt` + `llms-full.txt` na raiz.
- [ ] `robots.txt` liberando GPTBot/PerplexityBot/Google-Extended/ClaudeBot/CCBot.
- [ ] Conteúdo server-side + Core Web Vitals verdes + sitemap.xml.

> Perguntar à agência/TI se o tema HubSpot escolhido já traz schema/SSR — a maioria traz, mas confirmar.

---

## 🟡 P2 — Autoridade externa (Rudá/Duda executam)

- [ ] Solicitar/criar listagem no **HubSpot Solutions Partner Directory**.
- [ ] Campanha de **reviews** (G2/Clutch/Google Business) — meta 5–10 reais. Office pode montar o e-mail/fluxo de pedido.
- [ ] Completar **Wikidata** + **Crunchbase** com SAP+HubSpot+`sameAs`.

---

## 🟢 P3 — Office (dá pra fazer sem bloqueio, quando o Rudá liberar)

- [ ] Estruturar **métrica citável** nos 22 cases de `/cases` (número + prazo).
- [ ] Rodar `pipe-briefing`→`pipe-artigo` pro **topic cluster SAP+HubSpot+RevOps** (banco de perguntas no `PLANO-ACAO.md`).
- [ ] Tornar o **score GEO ≥ 70 do `seo_checker`** gate obrigatório no `/content-pipeline`.
- [ ] Estrutura de ingestão de **novos snapshots do Grader** no dashboard `/aeo-geo` (hoje o baseline está fixo em 20/jul/2026).

---

## Regra 3 (deploy)
Nada disto foi para produção/Railway. Só commit + push na branch
`claude/aeo-seo-geo-improvement-jlvj45`. Deploy só sob ordem explícita do Rudá.
