# Módulo 20 — Pipeline de validação e publicação dos Voices

**Status:** ✅ construído (v0.85.0 · 05/ago/2026)
**Rotas:** `/voices/pautas` (lista) · `/voices/pauta?id=N` (revisão)
**Código:** `routes/voices-pipeline.js` · `public/voices-pautas.html` · `public/voices-pauta.html`

## Propósito
Fecha o ciclo entre a **Redatoria**, o **Voice** e a **Duda** — o pedaço que faltava entre "a Redatoria escreveu" e "o Voice publicou no LinkedIn", com rastreio de clique no fim.

```
Redatoria escreve (content_pipeline, módulo existente)
  → atribui a um Voice
    → Voice lê, comenta parágrafo a parágrafo, pede ajuste OU aprova
      → Duda dá o OK final
        → link rastreado é gerado NA HORA, já no nome do Voice
          → Voice publica no LinkedIn e cola a URL do post
```

## Estados
| Estado | Significado |
|---|---|
| `enviada` | Redatoria atribuiu; o Voice ainda não abriu |
| `em_revisao` | Voice está mexendo (entra sozinho no 1º comentário) |
| `ajustes_pedidos` | Voice devolveu com comentários abertos |
| `aprovada_voice` | Voice aprovou o texto → esperando a Duda |
| `liberada` | OK final da Duda **+ link rastreado gerado** |
| `publicada` | Voice colou a URL do post |

## Decisões

**1. O link nasce só na aprovação da Duda.** Link rastreado é imutável por design (módulo 18): trocar o destino cria um token novo. Se o link existisse antes da revisão, uma troca de destino no meio do caminho deixaria dois tokens vivos e o Voice poderia publicar o errado. Gerando na liberação, existe um único link e ele já reflete o destino final.

**2. O link é emitido no nome do VOICE, não de quem aprovou.** Os cliques e os ERP Coins são dele — é o trabalho dele que gerou o alcance. Para isso, `routes/utm.js` passou a exportar `criarLink({email, dest, campaign, source})`, separado da rota que usa a sessão.

**3. Comentário ancorado em PARÁGRAFO, não em offset de caractere.** Offset quebra em qualquer reescrita. A âncora é o índice do parágrafo + um hash do conteúdo: se a Redatoria reescrever aquele parágrafo, o comentário não some — aparece marcado como **"trecho reescrito"**, com o trecho original preservado (`par_trecho`) pra dar contexto. Nada de comentário órfão invisível.

**4. Pedir ajuste exige comentário.** `pedir_ajustes` é bloqueado sem nenhum comentário aberto — evita o "não gostei" sem dizer onde, que só gera ida e volta.

**5. A Duda não pode aprovar antes do Voice.** `aprovar_duda` exige estado `aprovada_voice`; e sem `destino_url` não libera (sem destino não há link a gerar). Erros com motivo legível na tela.

**6. Papéis.** Novo role `voice` (landing `/voices/pautas`). `conteudo`/`brand`/`head` = time editorial (veem todas, editam o texto). `brand`/`head` = aprovadores do OK final. O Voice só enxerga e age nas próprias pautas — testado contra acesso cruzado.

## Tabelas
- `voice_pautas` — a pauta atribuída, seu estado, `destino_url`, `utm_token`, `post_url`
- `voice_pauta_comentarios` — comentário por parágrafo (`par_idx` + `par_hash` + `par_trecho`)
- `voice_pauta_eventos` — auditoria (quem fez o quê e quando)

## API
| Método | Rota | Quem |
|---|---|---|
| GET | `/api/voices/pautas` | Voice (as suas) · time editorial (todas) |
| GET | `/api/voices/pautas/:id` | dono ou time |
| POST | `/api/voices/pautas` | time editorial (atribuir) |
| PATCH | `/api/voices/pautas/:id` | time editorial (editar texto) |
| POST | `/api/voices/pautas/:id/comentario` | dono ou time |
| PATCH | `/api/voices/pautas/:id/comentario/:cid` | resolver/reabrir |
| POST | `/api/voices/pautas/:id/acao` | `pedir_ajustes` · `aprovar_voice` · `aprovar_duda` · `publicar` · `reabrir` |
| GET | `/api/voices/roster` | time editorial (Voices + e-mail cadastrado) |
| GET | `/api/voices/pautas-disponiveis` | time editorial (pautas da Redatoria ainda não atribuídas) |

## Integrações
- **Módulo 18 (UTM):** `criarLink()` na liberação; o clique credita ERP Coins ao Voice.
- **content_pipeline:** a atribuição puxa título e texto de uma pauta da Redatoria.
- **Sino de alertas:** pauta esperando revisão / link liberado (Voice) · OK pendente (Duda).

## Pendências humanas
- Cadastrar o **e-mail** dos Voices em `/admin/usuarios` com role `voice` — sem e-mail o Voice não aparece na lista de atribuição (a tela mostra "sem e-mail cadastrado").
