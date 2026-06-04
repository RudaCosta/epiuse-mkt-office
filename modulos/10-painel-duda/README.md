# Módulo 10 · Painel da Duda

**Status:** ✅ v1 ao vivo (0.11.0)
**Dona:** Duda
**Rota:** `/painel`

## Propósito

Command center diário da Duda. Responde 3 perguntas em <5s ao abrir de manhã:
1. **O que merece minha atenção hoje?** (Daily Digest)
2. **Quem tá esperando algo de mim?** (Inbox das áreas dela)
3. **Como o programa Voices tá indo?** (KPIs + tabela — pré-existente)

## Áreas que a Duda toca

```
AREAS_DUDA = ['area-brand', 'criativos', 'landing-pages', 'pipe-capa', 'pipe-carrossel']
```

Filtro aplicado em `/api/painel/inbox-duda` e nos contadores do digest.

## Arquivos-chave

- `public/painel.html` — UI completa (header · Daily Digest · Inbox Duda · KPIs · tabela voices · performance · kanban · ações)
- `server.js` (bloco MODULE PAINEL DA DUDA) — 2 endpoints novos
- `public/api/voices.json` — fonte primária dos voices
- `vault/workspaces/<area>/inbox|outbox/` — fonte do inbox da Duda

## APIs

| Endpoint | Retorna |
|---|---|
| `GET /api/painel/digest` | saudação contextual · voices_ativos/meta · pendencias{total, lista} · inbox_areas{hoje, semana, total, novos_hoje} · workflows_ativos_7d |
| `GET /api/painel/inbox-duda` | inbox[] + outbox[] agregados das 5 áreas, ordenados por mtime desc |

## Próximas evoluções (não implementadas)

- 📅 Calendário editorial 30d (depende de integração GA4 + LinkedIn API)
- 🔔 Notificação push quando novo item entrar no inbox dela
- ✅ "Marcar como feito" direto do digest (move inbox → outbox + grava decisão no _vt.md)
- 📊 Velocity (quantos pedidos a Duda fechou por semana)
