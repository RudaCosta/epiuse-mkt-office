# Pendências — Central de Alertas & Relatórios

## 🔴 Pra os e-mails chegarem no time
- **Verificar o domínio `epiuse.com.br` na Resend** (SPF/DKIM no DNS) e setar `FROM_EMAIL=office@epiuse.com.br` (ou similar) no Railway. Até lá a Resend só entrega no e-mail dono da conta. Pra receber já, colocar esse e-mail em `COMUNICADOS_EMAILS_EXTRA` e na lista dos canais em `/admin/alertas`.

## 🟡 Validar depois do deploy
- Abrir `/admin/alertas` → "Enviar pra mim" no semanal e no mensal. Conferir a chegada e o visual no Outlook/Gmail.
- Conferir se os alertas abertos fazem sentido com o dado de produção. O primeiro esperado é `fonte.cases`, por causa do `EDITOR_TOKEN` local pendente.
- Decidir se as donas recebem os críticos e o semanal da área (D7).

## 🟢 Ideias de regra (não implementadas)
- Brindes: pedido aguardando aprovação há mais de X dias (o status vive dentro do JSON `brindes_requests.data`, com aprovações por pessoa).
- Metas FY: KPI com realizado abaixo da trajetória do mês.
- LinkedIn: queda forte de novos seguidores (hoje só no relatório mensal, em "Sinais").
- JARVIS: nenhuma call salva em 14 dias com Apollo ativo.
