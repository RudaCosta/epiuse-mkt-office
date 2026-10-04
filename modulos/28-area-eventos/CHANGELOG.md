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
