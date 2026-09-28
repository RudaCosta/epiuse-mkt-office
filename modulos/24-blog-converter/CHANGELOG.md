# Changelog — Módulo 24 Blog Converter

## v2.0 — 28/set/2026 (motor determinístico local — reescrita)

> Versão própria do módulo (badge `v2.0` no cabeçalho da tela). Independente da versão global do Office.

- ♻️ **Conversão 100% determinística em JS no navegador** — removida a dependência de IA/OpenRouter. Sem 404, sem 429, sem custo, sem limite, e **funciona em prod** (não só localhost).
  - **Por quê:** transformar um texto que já existe em HTML é transformação estrutural, não geração — não precisa de LLM. A dependência de IA trazia modelo aposentado (404), rate limit do free (429) e custo. Feedback direto da Bruna.
- 🧠 **Parser determinístico:** detecta lead, parágrafos de intro, seções `##`/heurística de título, listas (inclusive blocos mistos intro+bullets), blockquotes, seção Resumo (vira dark box), FAQ (accordion), e CTA final (consome a chamada do fim do texto).
- 🗂️ **Sumário "Neste artigo" automático** a partir das seções detectadas (com âncoras).
- 🔎 **SEO automático:** título, meta description (do lead), slug, keywords por frequência.
- 📎 **Extração de arquivo no navegador** — `.docx` via mammoth.js e `.pdf` via pdf.js (CDN). Substitui o python server-side (que só rodava no localhost). **Upload agora funciona em prod.**
- 🏷️ **Badge de versão próprio** (`v2.0` + `motor local`) no cabeçalho, no estilo do Raccoon.
- 🧱 Biblioteca de componentes vira ferramenta de **enriquecimento manual** (cards, fluxo, callouts) já que o motor monta o esqueleto sozinho.
- ⚠️ Endpoints server `/api/blog-converter/{extract,convert}` ficam **legados/não usados** pela tela (mantidos por ora; a tela é client-side).

## v1.0 (MVP)

## v0.90.0 — set/2026 (MVP)

- 🆕 Rota `/blog-converter` na área Brand Experience.
- 🆕 Página single-file `public/blog-converter.html` — dark theme + design tokens.
  - Entrada por texto colado, upload `.docx` ou upload `.pdf` (drag & drop).
  - Título opcional + escolha do blog (Artigo / Cases de Sucesso).
  - Preview renderizado do HTML, código copiável, metadados SEO copiáveis.
  - Mini-guia "Como aplicar no HubSpot".
  - Painel lateral com os 12 componentes do template (referência copiável).
- 🆕 `POST /api/blog-converter/extract` — extrai texto de `.docx`/`.pdf` via `extract_text.py`.
- 🆕 `POST /api/blog-converter/convert` — converte o artigo no template via OpenRouter.
- 🆕 `extract_text.py` — python-docx + pypdf.
- 🆕 `template-spec.md` — cópia da fonte mestre da Bruna (12 componentes + regras).
- 🔗 Registrado na nav (Brand matches, crumbs, overflow "Voices & Optimizer", spotlight).
