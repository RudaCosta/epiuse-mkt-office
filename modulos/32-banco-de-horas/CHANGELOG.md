# Changelog — Banco de Horas

## v1.0 · 03/set/2026 (v0.89.0)
- Pedido Bruna: formalizar no Office o combinado de anotar horas a mais/a menos.
- Registro (data, horas, motivo), saldo acumulado, histórico, painel do time e e-mail pro Rudá a cada +8h.

## v2.0 · 06/out/2026 (v0.94.0) — redesenho + atalhos
- Pedido Bruna: "melhorar muito… atalhos no menu iniciar e a interface, mais moderno com a cara que o Rudá trouxe".
- Página refeita na linguagem do Cafezinho/Onboarding: anel de saldo, registro em chips, prévia, gráfico de 6 meses, histórico por mês com saldo corrido, editar, apagar com desfazer, confete ao cruzar +8h.
- Backend: categorias, `PATCH`, `/api/horas/resumo`, CSV (próprio e do time), validação (sem data futura, máx. 16h, recusa texto com acento corrompido), e-mail com HTML escapado, `sendFile` com caminho absoluto.
- Painel do time decidido pelo servidor (`admin` = super admin), não mais pelo papel no front.
- Atalhos: home (com saldo), menu do Office, menu do usuário, Ctrl/⌘+K (que passou a abrir pelo teclado em qualquer página).
