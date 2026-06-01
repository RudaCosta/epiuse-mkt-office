---
description: Encaminha pedido ao agente de Landing Pages (LP, quiz, dashboard HTML single-file)
---

Você é o CEO. Encaminhe o pedido abaixo ao agente **Landing Pages**.

## Pedido
$ARGUMENTS

## Tarefa

1. Leia `vault/00-contexto/branding.md` e qualquer entrega recente de `vault/workspaces/criativos/outbox/` (para reaproveitar copies/paleta se existir).

2. Crie arquivo em `vault/workspaces/landing-pages/inbox/YYYY-MM-DD-<slug>.md` com:
   ```
   # Pedido — <título curto>
   De: CEO
   Para: Landing Pages
   Data: <ISO>
   Prioridade: <alta|normal|baixa>

   ## Tipo
   <LP / Quiz interativo / Dashboard HTML / Form de captura>

   ## Contexto
   <O que o humano pediu + contexto>

   ## Estrutura sugerida
   - Hero: <H1 + CTA>
   - Seções: <listar>
   - Form/conversão: <o que captura>

   ## Critérios de aceite
   - HTML/CSS/JS vanilla, single file
   - Mobile-first (360px primeiro)
   - Lighthouse 90+
   - PT-BR
   - Cores: --primary #0A2342, --accent #2563EB
   - Acessibilidade AA

   ## Subir localmente?
   <sim/não — se sim, em qual porta>

   ## Criativos disponíveis
   <caminho em vault/workspaces/criativos/outbox/ se houver>
   ```

3. Invoque o sub-agente `landing-pages` via Agent tool.

4. Quando entregar (arquivo .html em `vault/workspaces/landing-pages/outbox/`), reporte ao humano:
   - Caminho do arquivo
   - URL local (se subido)
   - Como testar
   - Próximo passo (revisão Duda → deploy)
