# Changelog — Marketing Hub

## v2.0 · 07/out/2026 (0.97.0)
- Pedido Rudá: "reformule toda esta área… bem visual e atrativo, com animações JS… será pra toda empresa, então precisa impactar" + tracking de quem acessou e viu o quê, painel e link só pro perfil dele; depois: "revisa bem as questões de segurança pra não vazar nenhuma info de vendas, CRM".
- `/hub` refeito do zero (antes: abas + gate de senha desligado). Busca com ranking (atalho `/`), órbita de atalhos, números ao vivo com fonte e data, ferramentas com filtro, agenda BR/LATAM com contagem pro próximo evento, campanhas ativas, deck institucional + materiais, "Pra quem eu peço?" com o time, serviços e faixa "Amplifique" (EPI-USE Voices + ERP.ngo).
- Logos (3 MB em base64) só carregam quando o modal abre — antes vinham em toda visita.
- Removido o gate de senha antigo (a senha estava em texto puro no HTML de um repositório público).
- Tracking `kind='hub'` + painel `/admin/hub` + link no menu e chip na página só pro dono.
- **Segurança (vendas/CRM):** a página lê só `/api/hub/resumo` (lista branca). O "foco" interno das áreas (cita ferramentas de CRM/outbound e verba de parceiro) foi trocado por um texto curto de "pra que me procurar". `team.json` (metas/SLA de cada área, KPI de CRM) e `changelog.json` (notas com número de leads e integrações de CRM) agora chegam filtrados pra quem não é do time de Marketing. Teste `scripts/tests/hub-seguranca.js`.
