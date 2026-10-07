# Changelog — Central de Alertas & Relatórios

## v1.0 · 07/out/2026 (0.96.0)
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

### Revisão adversarial (07/out/2026, antes do deploy)
Revisão multi-agente em 5 dimensões, com verificação cética. Correções:
- **E-mail:** o `reply_to` era descartado pelo SDK v4 (só lê `replyTo`). Endereços configurados em env (`NOTIFY_EMAIL`, `EGG_NOTIFY_EMAIL`, `BRINDES_NOTIFY_EMAIL`, `ALERTAS_EMAILS`) voltam a valer mesmo fora do domínio, como antes. Uma fila espaça as chamadas à Resend (limite de ~2/s) e tenta de novo em caso de 429.
- **"Não lido" estável:** alertas com idade no título ("há 37h" → "há 38h") não voltam a acender o sino; só muda quando o estado muda de verdade (coluna `chave`).
- **Voice parou de postar:** passa a usar a data do post, não a da última atualização de métricas, e inclui os Voices aprovados por inscrição (`voices_publicados`). O relatório conta "posts novos" por URL.
- **Calendário editorial:** uma falha pontual com sync bom de poucas horas é importante, não crítica (sem e-mail).
- **Crítico sem destinatário** não é mais marcado como avisado; sai assim que alguém for configurado.
- **Contagem por ocorrência** (`alertas_ocorrencias`): o mensal e o semanal contam cada abertura e resolução, inclusive de alerta que reabriu.
- **Feriados nacionais** (fixos + Carnaval, Sexta Santa e Corpus Christi): sem e-mail crítico, semanal ou mensal em feriado.
- **Agenda única:** o painel calcula o próximo envio com as mesmas regras do envio, incluindo a guarda do digest antigo.
- **Rotas `/api/admin/alertas/*`** só para o super admin; o editor token não basta, exceto no Office local.
