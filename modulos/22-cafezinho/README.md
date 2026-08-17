# Módulo 22 — ☕ Cafezinho (área pessoal do time)

**Status:** ✅ construído (v0.87.0 · 14/ago/2026)
**Rota:** `/cafezinho` (qualquer pessoa logada, inclusive role `hub`)
**Código:** `routes/cafezinho.js` · `public/cafezinho.html` · `public/api/cafezinho-seed.json`

## Por que existe

O Office inteiro é tela de trabalho. A única coisa "pessoal" que existia era o `/memes` — bonito, mas 100% hardcoded, ninguém do time posta nada lá — e a mesa do game, que só muda por commit.

No papo quinzenal de café de 14/ago/2026 saiu um monte de folclore que não tinha onde morar: os signos do time, a Duda na Paris Fashion Week, a garrafa nova da Bruna toda semana, o tarot da Fernanda, Suits como série em comum, "é proibido spoiler", eclipse em Leão e a descoberta de que todo mundo ali acredita em ET.

O Cafezinho é o lugar disso. É o primeiro canto do Office sem KPI, sem funil e sem meta.

## Como o time usa

1. **Cartão pessoal** — cada um clica em ✏️ Editar no próprio card e preenche apelido, emoji, a frase que repete no café, a série que está vendo e o item-assinatura. Só o dono edita o dele.
2. **Mural** — qualquer um posta `meme`, `ideia`, `causo` ou `serie`, com emoji e link opcional. Reação emoji é toggle (clicar de novo tira).
3. **Spoiler** — marcou o checkbox, o post entra borrado e só abre no clique. A regra número 1 do café virou mecânica de UI.

## Signo é dado derivado, não inventado

Os aniversários já estavam em `public/api/team.json`. A função `signoDe()` no front calcula por faixa de data e bate 5/5 com o que o time falou: Rudá 30/07 Leão · Bruna 10/06 Gêmeos · Fernanda 13/12 Sagitário · Marlison 05/11 Escorpião · Duda 12/09 Virgem. Ninguém digita signo — o campo `signo_manual` existe só pra corrigir se sair errado.

## Travas

| Trava | O que faz |
|---|---|
| Sessão manda no e-mail | `PUT /api/cafezinho/perfil` grava **sempre** no e-mail da sessão. Se o body mandar outro, é ignorado — ninguém edita o cartão de ninguém. |
| Link só http(s) | `linkSeguro()` recusa `javascript:` e `data:` antes de virar `href`. |
| Apagar post | Só o autor, ou `head`/editor token. |
| Reação sem duplicata | `UNIQUE(post_id, email, emoji)` + toggle. |
| Sem upload | `uploads/` é efêmero e não está no volume do Railway. Meme aqui é emoji + texto + link externo. |
| Limite de body | `8kb` no perfil e no post, `2kb` na reação. |

## O arquivo que dá pra editar ao vivo

`public/api/cafezinho-seed.json` guarda o folclore que é **do grupo** (`em_comum`) e as tags de cada pessoa (`lore`). É estático, servido pelo `express.static` — editar e salvar já reflete no F5, sem deploy e sem restart. Foi feito pra ser preenchido durante o papo, enquanto o time fala.

Uma pessoa pode ter várias tags (a Bruna já tem garrafa + vôlei). A chave `quem` casa com os slugs de `office-desks.json`.

## Onde ele encosta no resto

- `public/api/team.json` — nome, cargo, aniversário e gradiente do avatar.
- `public/api/office-desks.json` — os itens da mesa aparecem no rodapé de cada cartão. Nesta versão a Bruna ganhou `garrafa_agua` e a Fernanda ganhou `tarot`, saindo do `padrao: true`.
- `server.js` — mount do router + `'/cafezinho'` no `HUB_LOCK_PAGES` (sem isso, colaborador cai de volta no `/hub`).
- `public/office-nav.js` — entrada "☕ Cafezinho" na seção 🎮 Extras.
- `/memes` **não foi tocado** — continua sendo o museu, agora linkado do hero.

## Pendência humana

- **Localhost não loga.** Como todo módulo com sessão (loja, ranking, meus-links), o `/cafezinho` mostra o gate 🔐 no local — SSO só resolve em prod. Validar os cartões e o mural com dado real é no Railway.
- **Faltam itens de mesa reais** do Roberto, Anderson e Carlos (ainda `padrao: true` em `office-desks.json`).
- **Fernanda ainda não tem e-mail @epiuse cadastrado** (`/admin/usuarios`, role `field`) — até lá ela cai como `hub` e não consegue editar o próprio cartão.

## Fora de escopo (v2)

Upload de imagem em base64 no SQLite · coins por post no mural · aniversariante do mês no topo · comentários em post.
