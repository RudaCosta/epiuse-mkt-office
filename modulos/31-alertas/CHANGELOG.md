# Changelog — Central de Alertas & Relatórios

## v1.0 · 06/out/2026 (0.93.0)
- Motor de alertas com 18 regras de dado real em 6 frentes: integrações (Apollo, calendário, Cases, GA4, RD, e-mail), comunicados, filas com prazo (Loja, inscrições, pautas paradas e vencidas, conteúdo agendado vencido, Voice sem postar), eventos do Brasil (sem briefing, sem pós-evento) e outbound (tarefas atrasadas, bounce alto, sequência fraca).
- Estado persistido: o alerta abre, muda (volta a "não lido") e **resolve sozinho** quando o dado normaliza. Regra que quebra não resolve nada por engano.
- Sino refeito: nível por cor, área, idade e ponto de "não lido". Badge só conta crítico e importante ainda não lidos. Clicar marca como lido, ✕ silencia por 7 dias e "Marcar tudo como lido". Atualiza a cada 5 min.
- Nova página `/alertas` (todos) com filtros por nível e área, silenciados e explicação dos níveis.
- Nova página `/admin/alertas`: destinatários por canal, donas das áreas, prévia e "enviar pra mim" de cada e-mail, alertas abertos, catálogo de regras, saúde das fontes e log de e-mails.
- E-mail de crítico na hora (dia útil 8h–19h, 1x por ocorrência, só depois de 2 varreduras).
- Relatório semanal (segunda 8h) e mensal (1º dia útil 9h), em HTML de e-mail com as cores do Brand Guide 2026. Etiqueta ⏳ onde falta dado.
- `routes/email.js`: um caminho só pra todo e-mail do Office, com cadeia de remetentes, allowlist, checagem do `{ error }` e `email_log`. Inscrição, brindes, Loja, banco de horas e easter egg migrados; comunicados reaproveitam as mesmas peças.
- Saiu: os 4 alertas escritos à mão no `voices.json`, o `/api/alerts` antigo do `server.js` e o digest semanal do Módulo 17 (incorporado ao relatório semanal).
- `/relatorio?mes=AAAA-MM` abre direto no mês (link do e-mail mensal).
