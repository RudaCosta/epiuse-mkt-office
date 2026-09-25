# Pendências — Módulo 24 Blog Converter

## 🟢 Melhorias futuras (não bloqueiam)

- [ ] **Publicação direta no HubSpot** — usar `manage_blog_post` (MCP HubSpot já conectado) pra criar o rascunho direto, sem copiar/colar manual. Requer decidir se cria como draft.
- [ ] **Upload `.md` / `.txt`** — Bruna escolheu só docx+pdf no MVP; texto colado cobre md/txt. Adicionar upload desses se pedir.
- [ ] **OCR em PDF escaneado** — pypdf só extrai texto nativo. PDF de imagem retorna vazio (erro claro). Adicionar OCR se aparecer o caso.
- [ ] **Histórico de conversões** — salvar conversões no SQLite pra reabrir/versionar. Hoje é stateless.
- [ ] **Escolha manual de componentes** — modo híbrido (IA + ajuste dos blocos) foi descartado no MVP; reavaliar se a IA errar muito na curadoria.

## ⚠️ Riscos conhecidos

- Qualidade depende do modelo do OpenRouter. Modelo free pode truncar HTML de artigo muito longo (setar `max_tokens` alto e, se truncar, quebrar em partes ou usar modelo pago via `BLOG_CONVERTER_MODEL`).
- Extração de arquivo só roda onde há Python (local). Em Railway, cair pro texto colado.
