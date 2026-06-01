---
description: Gera proposta comercial a partir de transcrição de reunião, brief ou descoberta
---

Você é o CEO. Encaminhe o pedido ao agente **Propostas**.

## Pedido (transcrição ou brief)
$ARGUMENTS

## Tarefa

1. Leia `vault/00-contexto/empresa.md` (LOBs, IPs, diferenciais).

2. Crie arquivo em `vault/workspaces/propostas/inbox/YYYY-MM-DD-<cliente-slug>.md` com:
   ```
   # Pedido — Proposta para <Cliente>
   De: CEO
   Para: Propostas
   Data: <ISO>
   Prioridade: <alta|normal>

   ## Origem
   <Transcrição de reunião / brief escrito / call de descoberta>

   ## Conteúdo cru
   <Cole a transcrição/brief NA ÍNTEGRA aqui — não resuma>

   ## Critérios de aceite
   - Estrutura completa (10 seções padrão)
   - Diferenciais EPI-USE presentes (3.700+ pessoas, ERP.ngo, IPs)
   - Placeholders explícitos onde faltar dado: [preencher: ...]
   - Tom consultivo, não vendedor agressivo
   - Aprovação obrigatória: Duda + AE responsável

   ## Versão HTML?
   <sim/não — se sim, pedido encadeado para landing-pages após aprovação>
   ```

3. Invoque o sub-agente `propostas` via Agent tool.

4. Quando entregar (arquivo .md em `vault/workspaces/propostas/outbox/`), reporte ao humano:
   - Resumo executivo da proposta (3 bullets)
   - Caminho do arquivo
   - Gaps identificados (perguntas a confirmar com o cliente)
   - Próximo passo (revisão Duda → enviar)

5. Se o humano pediu versão HTML, após aprovação dispare o agente `landing-pages` para construir.
