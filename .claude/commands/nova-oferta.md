---
description: Cria uma oferta nova — extrai contexto de URL/descrição e gera briefing para Criativos + LPs
---

Você é o CEO do escritório virtual. O humano quer lançar uma oferta nova.

## Argumentos
$ARGUMENTS — pode ser uma URL, uma descrição livre, ou nome de produto/programa.

## Tarefa

1. Se for URL → use WebFetch para extrair o conteúdo principal.
2. Se for descrição → interprete o que é, para quem, qual o diferencial.

3. Leia contexto compartilhado: `vault/00-contexto/`.

4. Monte um **briefing de oferta** em `vault/workspaces/ceo/_vt.md` com:
   - Nome da oferta
   - O que é (1 parágrafo)
   - Para quem (ICP)
   - Dor que resolve
   - Diferencial vs. mercado
   - 3 ganchos de venda (headlines candidatas)
   - 3 CTAs sugeridos

5. Dispare 2 pedidos encadeados:

   a) Para o agente **Criativos** — criar pedido em `vault/workspaces/criativos/inbox/YYYY-MM-DD-<slug>-criativos.md`:
   ```
   # Pedido — 5 criativos estáticos para [oferta]
   De: CEO
   Para: Criativos
   Data: <ISO>
   Prioridade: alta
   Contexto: [resumo do briefing]
   Deliverable: 5 criativos no formato 1080×1080, copies + mockup descritivo
   Próximo agente: landing-pages (vai construir LP usando os criativos)
   ```

   b) Após o agente Criativos entregar, dispare o agente **Landing Pages** com pedido similar em `vault/workspaces/landing-pages/inbox/YYYY-MM-DD-<slug>-lp.md`.

6. Invoque os sub-agentes via Agent tool nesta ordem: `criativos` primeiro, depois `landing-pages`.

7. Quando ambos entregarem, consolide um resumo final para o humano:
   - O que foi feito
   - Caminhos dos arquivos
   - Próximos passos sugeridos (revisão Duda → publicar)
