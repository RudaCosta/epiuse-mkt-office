# Módulo 24 — Blog Converter

> **Área:** 🎨 Brand Experience · **Rota:** `/blog-converter` · **Status:** ✅ MVP construído (set/2026)

## Propósito

Converter artigos (texto colado, `.docx` ou `.pdf`) para o **template HTML visual padronizado do blog EPI-USE** (inline styles, pronto pra colar no editor do HubSpot). Extensão do Raccoon, mas **separada do módulo principal** (08-inbound-offline) — vive por conta própria.

A conversão é feita por **IA** (OpenRouter, mesmo padrão do Raccoon SEO/GEO): a IA lê o artigo, escolhe os componentes visuais do template (lead, sumário, cards, fluxo, callouts, resumo, FAQ, CTA), monta o HTML inline e gera os metadados de SEO (título, meta description, slug, keywords).

## Arquivos-chave

| Arquivo | O quê |
|---|---|
| `template-spec.md` | Fonte da verdade do template (12 componentes + regras + dados HubSpot). O `.md` mestre da Bruna. |
| `extract_text.py` | Extrator de texto de `.docx` (python-docx) e `.pdf` (pypdf). Chamado pelo endpoint de upload. |
| `../../public/blog-converter.html` | A página (single-file, dark theme, design tokens). |
| `server.js` → `/blog-converter`, `/api/blog-converter/extract`, `/api/blog-converter/convert` | Rota + endpoints. |

## Fluxo

```
Cola texto  ─┐
Sobe .docx ─┼─► (extract_text.py se arquivo) ─► POST /api/blog-converter/convert
Sobe .pdf  ─┘                                         │
                                                      ▼
                                       OpenRouter (lê template-spec + artigo)
                                                      ▼
                                   { html inline HubSpot, seo{título,meta,slug,keywords} }
                                                      ▼
                              Preview renderizado + código copiável + mini-guia HubSpot
```

## Como aplicar no HubSpot (mini-guia)

1. Copiar o HTML gerado (botão "Copiar HTML").
2. No HubSpot: novo post no blog **"Artigo"** (ID `216571523122`) ou **"Cases de Sucesso"** (`222053726081`).
3. No editor de rich text, alternar para o modo **`<> Fonte / Source code`** e colar o HTML.
4. Colar título, meta description e slug (aba SEO) a partir dos metadados gerados.
5. Revisar links internos (`/nome-da-pagina`) e o CTA (`https://www.epiuse.com.br/fale-conosco`).
6. Pré-visualizar (o FAQ accordion usa `onclick` inline, funciona no HubSpot).

## Etiquetas de dado (Regra 6/7)

O HTML e o SEO são **🤖 Gerado por IA — revisar**. A página deixa isso explícito no output. Nenhum dado de métrica/KPI é inventado aqui — é só transformação de conteúdo que a Bruna fornece.

## Config

- `OPENROUTER_API_KEY` — necessária pra conversão (mesma do Raccoon).
- `BLOG_CONVERTER_MODEL` — override do modelo (default: `OPENROUTER_MODEL` ou `google/gemini-2.0-flash-exp:free`).
