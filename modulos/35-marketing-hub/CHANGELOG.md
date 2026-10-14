# Changelog — Marketing Hub

## v2.1 · 13/out/2026 (0.97.0) — revisão de segurança antes do deploy
- **Crítico (já existia, fechado aqui):** caminho com ponto/barra codificados (`/img/..%2fapi%2fzoho-leads-snapshot.json`) passava pela regra pública de `/img/*` e o `express.static` servia qualquer arquivo de `public/` sem login — snapshots do Zoho/Apollo/RD, `team.json` inteiro, personas. Agora `caminhoTorto()` recusa com 400 antes de tudo.
- `team.json` pra colaborador: o `foco` interno das áreas (Apollo, RD/HubSpot, lead scoring, MDF) virou o texto curado do Hub; o `apelido` voltou (o Cafezinho casa Duda/Gui por ele).
- `SSO_ENFORCE=false` e editor token recebem `team.json`/`changelog.json` inteiros (antes saíam filtrados e o `/changelog` ficava sem títulos no escape).
- Voices no programa somam os aprovados por inscrição (`voices_publicados`), igual ao overlay do `/api/voices.json`.
- Selo visível "🤖 Gerado por IA — revisar" nos textos "Fale com… sobre" até a Duda revisar (`FALE_SOBRE_REVISADO` em `routes/hub.js`).
- Busca: ícone do resultado escapado (a `flag` de um evento não vira HTML).
- Beacon das áreas com teto de 400 passos por pessoa a cada 10 min (o Hub abriu o beacon pra empresa toda).
- Correção da documentação: o endereço do painel aparece no JS da página e no menu; o que protege é o servidor (`/admin/hub` e a API só pro e-mail do dono). O link visível continua só pro dono.
- `scripts/tests/hub-seguranca.js` cobre tudo isso (42 verificações).

## v2.0 · 07/out/2026 (0.97.0)
- Pedido Rudá: "reformule toda esta área… bem visual e atrativo, com animações JS… será pra toda empresa, então precisa impactar" + tracking de quem acessou e viu o quê, painel e link só pro perfil dele; depois: "revisa bem as questões de segurança pra não vazar nenhuma info de vendas, CRM".
- `/hub` refeito do zero (antes: abas + gate de senha desligado). Busca com ranking (atalho `/`), órbita de atalhos, números ao vivo com fonte e data, ferramentas com filtro, agenda BR/LATAM com contagem pro próximo evento, campanhas ativas, deck institucional + materiais, "Pra quem eu peço?" com o time, serviços e faixa "Amplifique" (EPI-USE Voices + ERP.ngo).
- Logos (3 MB em base64) só carregam quando o modal abre — antes vinham em toda visita.
- Removido o gate de senha antigo (a senha estava em texto puro no HTML de um repositório público).
- Tracking `kind='hub'` + painel `/admin/hub` + link no menu e chip na página só pro dono.
- **Segurança (vendas/CRM):** a página lê só `/api/hub/resumo` (lista branca). O "foco" interno das áreas (cita ferramentas de CRM/outbound e verba de parceiro) foi trocado por um texto curto de "pra que me procurar". `team.json` (metas/SLA de cada área, KPI de CRM) e `changelog.json` (notas com número de leads e integrações de CRM) agora chegam filtrados pra quem não é do time de Marketing. Teste `scripts/tests/hub-seguranca.js`.
