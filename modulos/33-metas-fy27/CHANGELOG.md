# Changelog — Metas FY27

## v1.0 · 07/out/2026 (0.95.0)
- Número do módulo: 33 (o 31 virou o Relatório de Marketing e o 32 o Banco de Horas, que entraram antes).
- `/metas-fy27` refeita do zero (pedido Rudá: "reformule toda esta área, refaça ou corte as integrações que não têm atualização automática… centralize aqui, senão gere links… bem visual e atrativo, com animações JS… tracking só pro meu perfil").
- **Placar com 13 metas de realizado automático:** Apollo (refresh 6h + histórico diário), Office ao vivo (Voices, posts, kanban e captura dos eventos, pautas) e GA4 (diário).
- **Cortado:** endpoint `/api/metas/fy26|fy27`, que cruzava "realizado" de JSONs estáticos (outreach, LinkedIn, events) e chumbava o DDF como `realizado = 80.000`. Página FY26 → redirect pro placar; versões antigas em `_versoes-office/`.
- **Fora do automático:** 58 metas da planilha e dos funis das áreas, com link de onde são medidas (Zoho, Apollo, LinkedIn, RD, HubSpot, Blog, Field Marketing, Development Funds, Canva).
- **Saíram da página:** 24 regras/rituais, 9 prazos vencidos, 3 cabeçalhos e 5 metas repetidas (contagem e lista visíveis na página).
- Visual: faíscas subindo, anéis por área + relógio do FY, contadores, gauges com marca de "hoje", sparklines, corrida até a meta, acordeão, fluxo das fontes, drawers com gráfico e linha da meta.
- Tracking "quem viu o quê" (`kind='metas'`) + painel `/admin/metas` + link no menu só pro dono (conferido por e-mail).
- **Revisão adversarial antes do deploy (07/out):** GA4 gravava max(mês, mês anterior) — o Relatório (Módulo 31) corrigiu na mesma época e o placar passou a ler o cache dele; GA4 parado/sem chave vira "aguardando" em vez de usar o arquivo do git; eventos contam o FY27; janela do Apollo encolhe com buraco no histórico e avisa quando o Apollo para; pautas sem import/Rax; LinkedIn pessoal com destino próprio; "Reuniões realizadas" e "Eventos planejados" do funil voltaram (fora do automático); prazo vencido mostra a data; beacon barra `__proto__` e só grava quem abre a página; sparkline de linha desenhava só até ~84%; seção alta nunca contava como vista no celular; falha no 1º carregamento travava a página; foco/leitor de tela nos filtros, cards e drawer; refresh não fecha mais os grupos abertos.
