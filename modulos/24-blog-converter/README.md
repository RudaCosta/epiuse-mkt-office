# Módulo 24 — Blog Converter

> **Área:** 🎨 Brand Experience · **Rota:** `/blog-converter` · **Versão do módulo:** v3.0 · **Status:** ✅ em produção (set/2026)

## Propósito

Converter artigos (texto colado, `.docx` ou `.pdf`) para o **template HTML visual padronizado do blog EPI-USE** (inline styles, pronto pra colar no editor do HubSpot). Extensão do Raccoon, mas **separada do módulo principal** (08-inbound-offline) — vive por conta própria.

A conversão é feita pela **IA Claude do próprio Office** (Anthropic SDK, `claude-sonnet-4-6`, a mesma `ANTHROPIC_API_KEY` que já roda o Optimizer). **Não usa OpenRouter.** A IA lê o artigo e faz a **seleção editorial de componentes por seção** — cards 2x2 pra pilares, cards comparativos pra contrastes, fluxo numerado pra processos, callouts pra dicas/avisos, badge pra produtos, resumo, FAQ, CTA — no nível do padrão-ouro (`example-gold.html`, que entra no prompt como few-shot). Também gera os metadados de SEO. Não inventa fatos: só reorganiza e formata o conteúdo fornecido.

> **Histórico:** v1.0 tentou OpenRouter (deu 404/429); v2.0 foi um motor determinístico local (grátis, mas sem seleção inteligente de componentes — abaixo do padrão-ouro); v3.0 usa o Claude do Office (confiável + qualidade). Ver `CHANGELOG.md` e `DECISIONS.md`.

## Arquivos-chave

| Arquivo | O quê |
|---|---|
| `../../public/blog-converter.html` | **A tela inteira** — single-file, dark theme, design tokens. Contém o motor de conversão em JS (client-side) e a extração de arquivo no navegador (mammoth.js/pdf.js via CDN). |
| `template-spec.md` | Fonte da verdade do template (12 componentes + regras + dados HubSpot). O `.md` mestre da Bruna — referência dos estilos inline usados no HTML gerado. |
| `server.js` → `/blog-converter` | Rota que serve a página. |
| `extract_text.py`, `server.js` → `/api/blog-converter/{extract,convert}` | **Legado (não usado pela tela v2.0).** Eram a extração server-side (python) e a conversão via OpenRouter da v1.0. Mantidos por ora; podem ser removidos numa limpeza. |

## Fluxo (v2.0 — tudo no navegador)

```
Cola texto  ─┐
Sobe .docx ─┼─► extração no navegador (mammoth / pdf.js)  ─► motor determinístico (JS)
Sobe .pdf  ─┘                                                        │
                                                                     ▼
                                     { html inline HubSpot, seo{título,meta,slug,keywords} }
                                                                     ▼
                        Preview renderizado + código copiável + SEO + mini-guia + biblioteca de blocos
```

## O que o motor monta (determinístico)

- **Lead** (1º parágrafo, com barra vermelha).
- **Sumário "Neste artigo"** automático a partir das seções.
- **Seções `<h2 id>`** — por `##` (recomendado) ou heurística de título (linha curta, sem pontuação final).
- **Listas** — inclusive blocos mistos (linha de intro + bullets).
- **Blockquote** — linhas com `>`.
- **Box de Resumo** — seção titulada "Resumo/Conclusão" vira caixa escura com bullets.
- **FAQ accordion** — seção "Perguntas Frequentes" (perguntas terminadas em `?`).
- **CTA final** — consome a chamada do fim do texto ("converse/fale com/saiba mais…").
- **SEO** — título, meta description (do lead), slug, keywords por frequência.

A **biblioteca de componentes** na lateral serve pra **enriquecer à mão** (cards comparativos, fluxo numerado, callouts) — o motor entrega o esqueleto, a pessoa incrementa.

## Como aplicar no HubSpot (mini-guia)

1. Copiar o HTML gerado (botão "Copiar HTML").
2. No HubSpot: novo post no blog **"Artigo"** (ID `216571523122`) ou **"Cases de Sucesso"** (`222053726081`).
3. No editor de rich text, alternar para o modo **`<> Fonte / Source code`** e colar o HTML.
4. Colar título, meta description e slug (aba SEO) a partir dos metadados gerados.
5. Revisar links internos (`/nome-da-pagina`) e o CTA (`https://www.epiuse.com.br/fale-conosco`).
6. Pré-visualizar (o FAQ accordion usa `onclick` inline, funciona no HubSpot).

## Etiquetas de dado (Regra 6/7)

Nenhum dado de métrica/KPI é inventado — é só **transformação estrutural** do texto que a Bruna fornece. O motor não escreve conteúdo novo (não gera fatos): reorganiza e formata o que já existe. A tela sinaliza "revise e ajuste os blocos antes de publicar".

## Config

- **`ANTHROPIC_API_KEY`** — a mesma chave que o Office já usa (Optimizer/Voices). Está setada no Railway. Sem ela, o endpoint responde 503 com mensagem clara (é o caso do localhost, que não tem a chave — só prod tem).
- Modelo: `claude-sonnet-4-6` (hardcoded no endpoint, alinhado ao que o Optimizer usa). **Não** usa `BLOG_CONVERTER_MODEL`/`OPENROUTER_*` — se essas vars ficaram no Railway da v1, podem ser removidas (não têm mais efeito).
- Libs de leitura de arquivo (navegador): cdnjs — mammoth 1.9.0 · pdf.js 3.11.174.
- Custo: ~1-3 centavos por artigo, no orçamento Claude que a empresa já paga.
