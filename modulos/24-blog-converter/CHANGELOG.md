# Changelog — Módulo 24 Blog Converter

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
