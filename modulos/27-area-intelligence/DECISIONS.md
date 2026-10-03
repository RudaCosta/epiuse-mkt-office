# Decisões — Área Intelligence

- **Página dedicada, template genérico intacto:** só `/area/intelligence` muda; as outras áreas seguem em `area.html` (rota registrada antes do `/area/:id`).
- **Regra 7:** cada bloco mostra a fonte e o frescor (`atualizado há Xd` / `parado desde dd/mmm`). Dado parado é exibido como achado, não escondido. Metas sem fonte = `⏳ aguarda integração`.
- **GA4:** usa o último mês **fechado** antes da coleta. O mês da coleta é parcial e a variação dele compara 30 dias com poucos dias (ex.: +762% em jun/26) — descartado.
- **Atribuição:** só fatos (maior origem, % sem origem). Não agrupamos origens em "marketing" × "vendas" porque essa classificação não existe na fonte.
- **Deals sem R$:** a página é do time; valores ficam na visão executiva (`/executivo`, restrita).
- **Tracking no mesmo pipeline do Módulo 17** (beacon `/api/analytics/track`, tabela `analytics_events`), como o onboarding (Módulo 26). Sem terceiros.
- **Painel fora de `public/`:** o `express.static` roda antes do SSO; colocando o HTML em `private/` (mesma convenção do Cafezinho), nem a casca do painel é servida a quem não é o dono.
- **Dono fora por padrão no painel:** evita que os testes do Rudá poluam a leitura; toggle para incluir.
- **v1.1 — utilidade antes de vitrine:** a página é a mesa de trabalho da dona da área. Ordem: atalhos → o que precisa de atenção → agente/projetos → números → dados em abas. Animações ficam (fundo, contadores, barras, tilt, partículas), mas sem textos de apresentação.
- **Atalhos sem duplicar fonte:** "Do dia a dia" vem do `personas.json` (persona com `area: intelligence`), o mesmo que alimenta a Home. Editou lá, muda nos dois lugares.
- **Fila de atenção sem estado próprio:** é calculada dos dados (não tem "marcar como feito"); some quando a fonte é corrigida. Evita lista manual desatualizada.

