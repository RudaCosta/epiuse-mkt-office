# Pendências — Cafezinho

- 🔴 **Validar em prod (Railway):** localhost não loga (SSO), então cartões, mural e tracking só dão pra conferir com dado real depois do merge/deploy.
- 🟡 **LGPD / transparência:** o tracking registra o que cada colega vê. Decidir se entra um aviso discreto na página (ex.: rodapé "o Office registra acessos e interações nesta página").
- 🟡 **Retenção:** `cafe_tracking` cresce sem limite. Com 6-8 pessoas é irrelevante; se abrir pro time todo, podar > 365 dias.
- Itens de mesa reais de Roberto, Anderson e Carlos (`office-desks.json`).
- Gabrielle Senne: e-mail @epiuse em `/admin/usuarios` (role `field`) e aniversário no `team.json` (sem isso, sem signo e fora da linha do ano).
