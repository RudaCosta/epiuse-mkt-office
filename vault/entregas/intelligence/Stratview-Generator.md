# Stratview Generator — Gerador de Artigos Executivos

**URL:** /generator-stratview  
**Status:** ✅ Produção (v0.57.4)  
**Dona:** Bruna Yamagami (Intelligence & CRM)

## O que é

Ferramenta de geração de artigos executivos para Oracle HCM · OCI · AI, construída com Gemini 2.5 Flash. Cria conteúdo técnico de alto nível para personas CIO e CHRO, com capa branded, áudio TTS e publicação no WordPress.

## Funcionalidades

- Geração de ideias com Google Trends (grounding)
- Redação de artigos B2B (600–2000 palavras)
- Refinamento por persona: CIO (OCI/infra) · CHRO (HCM/employee experience)
- Capa Canvas branded (navy gradient + rede)
- Áudio TTS via Gemini (PCM16 → WAV)
- Publicação como rascunho no WordPress
- Histórico de artigos gerados (SQLite)

## Integração

Backend: `/api/artigos/*` (proxy Gemini — chave nunca exposta no client)  
Banco: `stratview_articles` (SQLite local)  
