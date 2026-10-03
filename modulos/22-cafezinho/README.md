# Módulo 22 — ☕ Cafezinho (área pessoal do time)

**Status:** ✅ v2.0 · redesenho visual + tracking (03/out/2026) · v1 em 14/ago/2026 (v0.87.0)
**Rota:** `/cafezinho` (qualquer pessoa logada, inclusive role `hub`)
**Código:** `routes/cafezinho.js` · `public/cafezinho.html` · `public/api/cafezinho-seed.json` · `private/cafezinho-tracking.html`

## Por que existe

O Office inteiro é tela de trabalho. A única coisa "pessoal" que existia era o `/memes` — bonito, mas 100% hardcoded, ninguém do time posta nada lá — e a mesa do game, que só muda por commit.

No papo quinzenal de café de 14/ago/2026 saiu um monte de folclore que não tinha onde morar: os signos do time, a Duda na Paris Fashion Week, a garrafa nova da Bruna toda semana, Suits como série em comum, "é proibido spoiler", eclipse em Leão e a descoberta de que todo mundo ali acredita em ET.

O Cafezinho é o lugar disso. É o primeiro canto do Office sem KPI, sem funil e sem meta.

## Experiência (v2 · mesma linguagem do `/onboarding`)

| Seção | O que tem | Dado |
|---|---|---|
| Hero | xícara SVG animada (vapor, órbita com o folclore do seed); clique = frase real do time + chuva de emoji · contadores animados | feed real |
| 👥 Quem senta à mesa | cartões 3D: inclinam no mouse, viram no clique (frente: avatar, signo, tags; verso: aniversário, série, item, lore, mesa do game) | team.json + perfis + seed + office-desks |
| 🎂 Próximo parabéns | contagem regressiva + linha do ano (marcador "hoje") + agenda completa | `aniversario` do team.json |
| 🔮 Roda do zodíaco | roda girando (pausa no hover), avatares no signo, clique mostra quem é de cada signo + barras por elemento | derivado do aniversário |
| 🤝 Em comum | cards flutuantes que viram | `em_comum` do seed |
| 📌 Mural | composer com pílulas de tipo, emojis rápidos, switch de spoiler, link opcional; filtros; reação otimista com animação; apagar em 2 cliques; painel lateral (termômetro, mais reagido, quem mais posta) | cafe_posts / cafe_reacoes |
| ✏️ Meu cartão | gaveta lateral com pré-visualização ao vivo | cafe_perfil |

Respeita `prefers-reduced-motion`. Nenhum número inventado: tudo sai de arquivo/tabela real.

## 📊 Tracking (só o dono)

- **Rota:** `/cafezinho/tracking` · API `GET /api/cafezinho/tracking?days=30&eu=0`.
- **Quem vê:** só a sessão SSO `ruda.costa@epiuse.com.br` (`OWNER_EMAIL` do módulo 17). Sem fallback de editor token. Qualquer outra pessoa recebe **404** (nem a existência vaza).
- **Link:** a URL vem no `feed` só pro dono (`painel`) e vira o botão "📊 Tracking do Cafezinho" no hero. Não está no menu nem no HTML público.
- **HTML em `private/`:** fora do `express.static` de propósito — em `public/` ele seria servido em `/cafezinho-tracking.html` sem passar pelo gate.
- **Fontes:** aberturas e tempo = `analytics_events` (módulo 17, histórico). "Viu o quê" = tabela nova `cafe_tracking`, gravada por `POST /api/cafezinho/track` (lote, e-mail sempre da sessão, whitelist de eventos).
- **Eventos:** `card` (cartão ≥60% na tela por 1,2s) · `flip` · `post` (≥50% por 1,5s) · `spoiler` · `secao` · `reacao` · `link` · `filtro` · `signo` · `xicara` · `postou` · `perfil` · `comum`.
- **Painel:** KPIs · aberturas por dia · heatmap dia×hora · funil de seções · tabela por pessoa (clique = timeline do que ela viu) · matriz "quem viu o cartão de quem" · por post: quem viu / abriu spoiler / não viu / reações · feed ao vivo (60s, sem re-animar).

## Como o time usa

1. **Cartão pessoal** — cada um clica em ✏️ Editar no próprio card e preenche apelido, emoji, a frase que repete no café, a série que está vendo e o item-assinatura. Só o dono edita o dele.
2. **Mural** — qualquer um posta `meme`, `ideia`, `causo` ou `serie`, com emoji e link opcional. Reação emoji é toggle (clicar de novo tira).
3. **Spoiler** — marcou o checkbox, o post entra borrado e só abre no clique. A regra número 1 do café virou mecânica de UI.

## Signo é dado derivado, não inventado

Os aniversários já estavam em `public/api/team.json`. A função `signoDe()` no front calcula por faixa de data e bate com o que o time falou: Rudá 30/07 Leão · Bruna 10/06 Gêmeos · Marlison 05/11 Escorpião · Duda 12/09 Virgem. Ninguém digita signo — o campo `signo_manual` existe só pra corrigir se sair errado.

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
- `public/api/office-desks.json` — os itens da mesa aparecem no rodapé de cada cartão. Nesta versão a Bruna ganhou `garrafa_agua`, saindo do `padrao: true`.
- `server.js` — mount do router + `'/cafezinho'` no `HUB_LOCK_PAGES` (sem isso, colaborador cai de volta no `/hub`).
- `public/office-nav.js` — entrada "☕ Cafezinho" na seção 🎮 Extras.
- `/memes` **não foi tocado** — continua sendo o museu, agora linkado do hero.

## Pendência humana

- **Localhost não loga.** Como todo módulo com sessão (loja, ranking, meus-links), o `/cafezinho` mostra o gate 🔐 no local — SSO só resolve em prod. Validar os cartões e o mural com dado real é no Railway.
- **Faltam itens de mesa reais** do Roberto, Anderson e Carlos (ainda `padrao: true` em `office-desks.json`).
- **Gabrielle Senne (Field Marketing) ainda não tem e-mail @epiuse cadastrado** (`/admin/usuarios`, role `field`) — até lá ela cai como `hub` e não consegue editar o próprio cartão. O aniversário dela também está em branco no `team.json`, então o cartão sai sem signo até ela informar.

## Fora de escopo (v2)

Upload de imagem em base64 no SQLite · coins por post no mural · aniversariante do mês no topo · comentários em post.
