# Decisões — Central de Alertas & Relatórios

## D1 · Alerta só de dado real, e resolve sozinho
Regra 7. Cada regra lê SQLite/integração/JSON vivo; sem dado, não dispara. Alerta não é tarefa manual: o usuário não "fecha". Ele some quando a causa some. O usuário só pode **ler** ou **silenciar (pra si)**.

## D2 · Três níveis, e só o crítico vira e-mail na hora
E-mail demais é ignorado. Crítico = algo parou e congela dado ou trabalho. O resto espera o semanal. Crítico só sai em dia útil 8h–19h, depois de sobreviver a 2 varreduras (sem e-mail por instabilidade momentânea), uma vez por ocorrência e no máximo 1x por dia se ficar piscando.

## D3 · Marca o crítico como notificado mesmo se a entrega falhar
Senão, com o domínio não verificado, ele re-tentaria a cada 30 min e encheria o log. A falha vira o alerta `email.entrega` (visível no sino do admin) e aparece em `/admin/alertas`. Exceção: se não havia **nenhum** destinatário configurado, nada é marcado, e o alerta sai assim que alguém for configurado.

## D4 · Envio automático desligado no Office local
O PC do Rudá tem outro banco: os dois mandariam o mesmo relatório. O local só manda com `ALERTAS_EMAIL_LOCAL=true`. A prévia e o "enviar pra mim" funcionam igual.

## D5 · Eventos: alertas só do Brasil
A aba LATAM do `events.json` é tocada pelos times de lá. Alertar a Gabrielle por evento da Argentina sem briefing seria ruído. No relatório, LATAM aparece em "próximos dias", sinalizado.

## D6 · "Voice parou de postar" só pra quem já postava
Voice sem nenhum post registrado não "parou". Ou não começou, ou o tracking não foi feito. Antes, o sino acusava os dois Voices o tempo todo. Agora a regra exige pelo menos um post registrado.

## D7 · Donas recebem e-mail só se o Rudá ligar
Mandar e-mail automático pro time é ação pra fora. O padrão é só o `NOTIFY_EMAIL`. Ligar "donas" em `/admin/alertas` é decisão explícita. Além disso, enquanto o domínio não for verificado na Resend, só o dono da conta recebe.

## D8 · Semanal seg–qua; mensal até o dia 7
Se o servidor estiver fora na segunda (deploy, queda), o semanal ainda sai até quarta. Depois disso não vale mais a pena. Mesmo raciocínio pro mensal (1º dia útil, tolerância até o dia 7). A guarda é por semana ISO / mês em `app_blobs`, e a chave antiga `digest.lastSent` é respeitada na semana da troca.

## D10 · Dia útil = sem fim de semana e sem feriado nacional
Crítico, semanal e mensal respeitam os feriados nacionais fixos e os móveis ligados à Páscoa (Carnaval, Sexta Santa, Corpus Christi). Feriado estadual ou municipal fica de fora: o time não é de uma cidade só. Segunda feriado → o semanal sai na terça.

## D11 · Configuração de e-mail só pelo super admin
`/api/admin/alertas/*` usa `requireSuperAdmin`. Ali se escolhe quem recebe e-mail e se lê o log de envios, que traz nomes de inscritos e de clientes. O editor token é credencial de máquina e não precisa disso. No Office local ele continua valendo.

## D12 · Endereço de env é confiável
O operador que define `NOTIFY_EMAIL`, `EGG_NOTIFY_EMAIL`, `BRINDES_NOTIFY_EMAIL` ou `ALERTAS_EMAILS` no Railway já decidiu quem recebe. Esses endereços passam na allowlist mesmo fora de `epiuse.com.br`, como antes do Módulo 33. Listas editáveis na tela continuam presas à allowlist.

## D13 · "Mudou" é o estado, não o relógio
A regra pode devolver uma `chave` sem idade nem contagem regressiva. O alerta só volta a "não lido" quando a chave ou o nível mudam. "2 pautas paradas" → "3 pautas paradas" é mudança; "há 37h" → "há 38h" não é.

## D9 · Fontes do server.js entram por registro, não por cópia
A lista de eventos (slug + enriquecimento) e o snapshot do `/relatorio` viraram funções no `server.js` (`_listarEventosField`, `_relatorioSnapshotMes`) e são entregues ao módulo com `alertas.registrar()`. Um slug só e um cálculo só: o e-mail mensal mostra exatamente o número da tela.
