# Módulo 24 — Blog Converter

> **Área:** 🎨 Brand Experience · **Rota:** `/blog-converter` · **Versão do módulo:** v2.0 · **Status:** ✅ em produção (set/2026)

## Propósito

Converter artigos (texto colado, `.docx` ou `.pdf`) para o **template HTML visual padronizado do blog EPI-USE** (inline styles, pronto pra colar no editor do HubSpot). Extensão do Raccoon, mas **separada do módulo principal** (08-inbound-offline) — vive por conta própria.

A conversão é **100% determinística e local (no navegador)** — sem IA, sem API, sem custo, sem limite. Transformar um texto que já existe em HTML é transformação estrutural, não geração; um LLM só traria 404 (modelo aposentado), 429 (rate limit) e custo. O motor detecta a estrutura do texto (lead, seções, listas, resumo, FAQ, CTA) e monta os componentes do template + os metadados de SEO.

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

Nenhuma. Não depende de chave de API nem de variável de ambiente. As libs de leitura de arquivo vêm do cdnjs (mammoth 1.9.0 · pdf.js 3.11.174).
