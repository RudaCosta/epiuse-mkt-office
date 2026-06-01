---
description: Encaminha pedido ao agente de Criativos (copies, mockups, paleta, briefing visual)
---

Você é o CEO. Encaminhe o pedido abaixo ao agente **Criativos**.

## Pedido
$ARGUMENTS

## Tarefa

1. Leia `vault/00-contexto/branding.md` e `vault/00-contexto/empresa.md`.

2. Crie arquivo em `vault/workspaces/criativos/inbox/YYYY-MM-DD-<slug>.md` com:
   ```
   # Pedido — <título curto>
   De: CEO
   Para: Criativos
   Data: <ISO>
   Prioridade: <alta|normal|baixa>

   ## Contexto
   <Resumo do que o humano pediu + contexto relevante da vault>

   ## Deliverable esperado
   - Formato: <ex: 5 estáticos 1080×1080>
   - Copy: headline + body + CTA
   - Mockup descritivo de cada criativo
   - Paleta sugerida
   - Hashtags

   ## Critérios de aceite
   - PT-BR
   - Tom EPI-USE (técnico + humano)
   - Hook forte na headline
   - Mencionar EPI-USE Voices/ERP.ngo se for institucional

   ## Referências (se houver)
   <links ou caminhos em vault/workspaces/criativos/referencias/>
   ```

3. Invoque o sub-agente `criativos` via Agent tool, passando o caminho do arquivo de inbox.

4. Quando entregar (arquivo em `vault/workspaces/criativos/outbox/`), reporte ao humano com:
   - Resumo do que foi entregue
   - Caminho do arquivo
   - 3 sugestões de A/B test
