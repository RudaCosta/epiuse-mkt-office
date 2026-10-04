# Changelog — Área Eventos

## v1.0 · 04/out/2026
- `/area/eventos` sai do template genérico `area.html` e ganha página própria (pedido Rudá: "bem visual e atrativo, com animações JS").
- Visual: fundo de palco (refletores + luzes subindo), confete quando a contagem aparece, contagem regressiva com dígitos animados, letreiro dos próximos eventos, linha do ano com marcador "hoje", rio de meses com pills por LOB, donut e barras por país interativos, fluxo de status com conector animado, medidores do MDF e funil de ROI.
- Junta numa tela o que estava espalhado: calendário LATAM (`events.json`), registro do Field Marketing (`/api/field-marketing`) e SAP Development Funds (`/api/development-funds`).
- Fila "Precisa de atenção" com o que tem prazo: claims do MDF vencendo/vencidos, captura pós-evento faltando, briefing faltando.
- Tracking "quem viu o quê" (`kind='eventos'`) + painel owner-only `/admin/eventos`.
- Tracking generalizado: `AREA_TRACK` em `routes/analytics.js` e um único painel `private/admin-area-tracking.html` (ex-`admin-intelligence.html`) para Intelligence e Eventos.

## v1.0.1 · 04/out/2026
- Fundo sem os dois refletores (feixes de luz que varriam a tela), a pedido do Rudá. Ficam as luzes subindo e o confete.

## v1.1 · 04/out/2026 — Field Marketing v2
- `/field-marketing` reescrita na linguagem da área (tokens do DESIGN.md, Lato/Open Sans; sai Inter e as cores hex fixas).
- Radar dos próximos eventos, busca e filtros, linha do tempo por mês e kanban com arrastar-e-soltar.
- Editor em abas: briefing com checklist persistido (56 tarefas com vencimento, D-Day, planos B), brindes e pós-evento com funil e custo por lead.
- API `GET /api/field-marketing` passa a devolver `briefing`, `brindes` e `atualizado_em`.
- `/area/eventos` usa a data confirmada no Field quando houver.

## v1.2 · 04/out/2026 — uma página só
- Pedido Rudá: "de preferência uma página só". A operação do Field (radar, kanban, editor com briefing/checklist, brindes, pós-evento) foi pra dentro da `/area/eventos`.
- `/field-marketing` vira redirect 301 → `/area/eventos#calendario`; `public/field-marketing.html` removida. Links do nav, Home (personas), game, onboarding e relatório de adoção apontam pra área.
- Salvar usa a sessão do time de Marketing (hotfix 0.91.1), com mensagem pedindo login quando falta.
- Painel `/admin/eventos` com rótulos das novas ações (editor, kanban, busca).

