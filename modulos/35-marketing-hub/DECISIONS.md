# Decisões — Marketing Hub

- **Lista branca no servidor, não filtro no front (07/out/2026).** O Hub é aberto pra empresa toda; tudo que a página baixa aparece no DevTools. Por isso ela não lê `team.json`/`voices.json`/`artigos.json` direto: `/api/hub/resumo` devolve só os campos mostrados. Campo novo num desses arquivos não chega no Hub sem alguém mexer em `routes/hub.js` — e o teste barra termos de vendas/CRM.
- **"Pra que me procurar" curado em vez do `foco` do `team.json`.** O `foco` é a descrição interna da área (ferramentas de CRM, outbound, MDF). Área sem texto curado sai sem descrição, nunca cai no texto interno.
- **`team.json` e `changelog.json` filtrados pra quem não tem a área `time`.** Os dois são abertos a todo colaborador porque Cafezinho, Game e o rodapé usam. Colaborador recebe só nome/cargo/aniversário/mesa/foco (time) e versão/data/status (notas). Time de Marketing e super admin recebem o arquivo inteiro. O editor token não fura o filtro (não é pessoa do time).
- **Painel no `private/`, gate por e-mail.** Mesmo padrão dos Módulos 27–33: `requireOwner` + regra `/admin/*` = super admin; o endereço do painel só entra no DOM depois que `/api/analytics/owner` confirma o dono.
- **Institucional virou seção, não aba.** `/hub?tab=institucional` (submenu) rola até a seção — uma página só deixa o scroll e o "quem viu o quê" coerentes.
- **Rolagem da página inteira** (antes: container interno com `overflow`). O funil de scroll do tracking mede `window`.
