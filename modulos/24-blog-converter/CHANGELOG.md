# Changelog — Módulo 24 Blog Converter

## v3.0 — 28/set/2026 (IA via Claude do próprio Office)

> Badge `v3.0` + `IA · Claude` no cabeçalho da tela. **Versionamento próprio do módulo** — não altera a versão global do Office (que segue 0.90.0 pro Blog Converter).

- 🤖 **Conversão via Claude (Anthropic SDK) do próprio Office** — o mesmo cliente/chave (`ANTHROPIC_API_KEY`) que já roda o Profile Optimizer e a extração dos Voices. **Não usa OpenRouter** (fim do 404/429). Modelo `claude-sonnet-4-6`.
  - **Por quê o pivô (de novo):** a Bruna mostrou o **padrão-ouro** que espera (artigo do Joule com cards 2x2, cards comparativos, fluxo numerado, callout, badge SAP, blockquote, resumo, FAQ). Isso é **seleção editorial de componente por seção** — código determinístico não faz. Só IA que entende o conteúdo entrega esse nível.
  - **Por que Claude do Office e não OpenRouter:** já está configurado, é confiável (API oficial), e reusa o orçamento Claude que a empresa já paga (não é gasto novo tipo os US$10 do OpenRouter). ~1-3 centavos por artigo.
- 🏆 **Few-shot com o padrão-ouro:** `example-gold.html` (o artigo do Joule da Bruna) entra no prompt como exemplo de qualidade/riqueza esperada — é o que calibra o output.
- 📎 **Extração de arquivo no navegador mantida** (mammoth.js/pdf.js) — funciona em prod.
- ⚙️ Endpoint `/api/blog-converter/convert` reescrito pra Anthropic SDK (parse por delimitadores ===HTML===/===SEO===, aviso de truncamento se `stop_reason=max_tokens`).
- 🧱 Biblioteca de blocos segue pra ajustes manuais pontuais.

## v2.0 — 28/set/2026 (motor determinístico local — reescrita) — SUPERADA pela v3.0

> Não chegou a produção. A conversão determinística montava lead/sumário/seções/listas/resumo/FAQ/CTA, mas **não fazia seleção inteligente de componentes** (cards, fluxo, callouts, badge). Ao ver o padrão-ouro da Bruna, ficou claro que o teto de qualidade do determinístico era insuficiente → pivô pra Claude (v3.0). A extração de arquivo no navegador desta versão foi preservada.

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
