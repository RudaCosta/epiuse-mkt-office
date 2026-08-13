# Módulo 21 — Comunicados por e-mail

**Status:** ✅ construído (v0.86.0 · 11/ago/2026)
**Rota:** `/admin/comunicados` (head ou editor token)
**Código:** `routes/comunicados.js` · `public/api/comunicados.json` · `public/emails/` · `public/admin-comunicados.html`

## Por que existe
Rudá pediu: *"quero automático — tudo eu peço e você manda."*

O obstáculo é de ambiente, não de código: **o egress da sessão do Claude é allowlist**. Verificado na prática — `api.github.com` responde 200, mas `api.resend.com` e `office.epiuse.com.br` dão 000. Ou seja, quem escreve o comunicado não consegue falar nem com a Resend nem com a produção.

A solução inverte o caminho: o comunicado é **commitado como conteúdo curado** e quem envia é o **próprio Office**, que já tem a `RESEND_API_KEY`.

```
Rudá pede → escrevo o e-mail no repo → "sobe" → deploy → Office envia em ~90s
```

Sem copiar-e-colar no Outlook, sem depender de link (o corpo vai no e-mail).

## Como adicionar um comunicado
1. Escrever o corpo em `public/emails/<nome>.html` (HTML de e-mail: tabelas + estilo inline, nada de flex/grid nem CSS externo).
2. Adicionar a entrada em `public/api/comunicados.json`:

```json
{
  "id": "assunto-2026-08-11",
  "assunto": "…",
  "para": ["fulano@epiuse.com.br"],
  "cc": ["outro@epiuse.com.br"],
  "html_file": "nome.html",
  "resumo": "uma linha do que é, aparece no painel",
  "auto": true,
  "ativo": true
}
```

3. Commitar e subir. O envio sai sozinho ~90s depois do boot (e a cada hora, pra pegar o que ficou pendente).

> **O `id` é a trava de envio único.** Nunca reaproveite um id — um id já enviado jamais sai de novo sozinho. Para reenviar de propósito, use o botão **Reenviar** no painel.

## Travas
Isto manda e-mail pra gente de verdade, então:

| Trava | O que faz |
|---|---|
| **Allowlist de domínio** | Só envia pra `@epiuse.com.br` (ajustável em `COMUNICADOS_DOMINIOS`). Vale pro `cc` também. |
| **Envio único por id** | `PRIMARY KEY` no log; reenvio só explícito. |
| **Teto por rodada** | Máx. 5 por vez (`COMUNICADOS_MAX_RODADA`) — um JSON errado não vira disparo em massa. |
| **Kill switch** | `COMUNICADOS_ENABLED=false` desliga tudo. |
| **Sem path traversal** | `html_file` passa por `path.basename` — só lê de `public/emails/`. |
| **Falha visível** | Toda tentativa é registrada com o motivo e aparece no painel. Nada falha em silêncio. |

**Ordem de validação:** conteúdo (destinatários, corpo, assunto) é validado **antes** da checagem de chave/kill-switch — assim um destinatário inválido é reportado como tal em qualquer ambiente, e a trava de domínio é testável sem precisar de chave.

## Painel `/admin/comunicados`
Mostra se a chave está configurada, se o envio automático está ligado, o remetente e os domínios permitidos. Por comunicado: status, destinatários, erro (quando houver), **ver o e-mail** (prévia real), **enviar agora**, **reenviar** e **cancelar** (tira da fila automática antes que saia).

## Pendência humana
`RESEND_API_KEY` precisa estar setada no Railway. Sem ela o painel mostra *"Chave de e-mail: AUSENTE — nada sai"* e cada tentativa fica registrada como `falhou: sem RESEND_API_KEY no ambiente`. É a mesma pendência que já bloqueia o digest semanal.

## Cópia fixa (v0.86.1)
Todo comunicado copia automaticamente `ruda.costa@epiuse.com.br` — pedido do Rudá, pra ele ver tudo que sai em nome do time sem depender de alguém lembrar de incluí-lo. Configurável em `COMUNICADOS_COPIA_SEMPRE` (lista separada por vírgula).

A cópia fixa **não duplica** quem já é destinatário ou já está no `cc`, e passa pela mesma allowlist de domínio. O painel mostra a cópia fixa configurada e, por comunicado, o **cc efetivo** — quem realmente vai receber. O log de envio grava o cc efetivo, não o declarado.

## 🐞 Envio recusado se passava por enviado (corrigido em v0.86.2)
O SDK da Resend (v4) **não lança exceção** quando a API recusa o envio — ele devolve `{ data, error }`. O código original fazia `await resend.emails.send(...)` dentro de `try/catch` e tratava "não lançou" como sucesso. Resultado: um envio recusado (domínio não verificado, destinatário não permitido, chave inválida) era gravado como **enviado**, e ninguém recebia nada. Falha invisível — o pior tipo, porque não há o que investigar.

Agora o `error` é verificado explicitamente e vira `falhou` com o motivo real. O `id` da mensagem na Resend é gravado nos envios bem-sucedidos, pra rastreio do lado deles.

**Nota:** o mesmo padrão existe em outros pontos do `server.js` (ex.: `sendRecruitmentEmail`, que loga `[EMAIL-SENT]` independente do resultado). Não foram alterados aqui pra manter o escopo, mas têm a mesma falha latente.

## 🧪 Testar envio
Botão no topo de `/admin/comunicados`: manda um e-mail mínimo na hora e devolve a resposta **crua** da Resend, incluindo o objeto de erro completo. Não passa pela fila nem grava no log — é sonda, não comunicado. É o caminho rápido pra descobrir por que nada chega (domínio não verificado, chave inválida, destinatário recusado) sem precisar de deploy a cada tentativa.

## 📮 Causa raiz: o remetente era inválido (v0.86.3)
O padrão histórico do projeto era `FROM_EMAIL = voices@resend.dev`. **O `resend.dev` não é nosso domínio** — a Resend só aceita como remetente `onboarding@resend.dev` (o único endereço de teste) ou `algo@<domínio que verificamos>`. Ou seja: todo envio era recusado na origem, e com o bug do `{data,error}` isso ainda era registrado como "enviado".

Agora há uma **cadeia de remetentes**: tenta o configurado e, se a recusa for de domínio/remetente, refaz com `onboarding@resend.dev`. Se a recusa for por outro motivo (rate limit, chave inválida), não insiste — trocar o remetente não resolveria. O painel mostra a cadeia e o log registra qual funcionou.

**Limitação que continua valendo:** com domínio não verificado, a Resend entrega **apenas para o e-mail dono da conta**. Para alcançar a Duda, a Bruna e o resto do time é preciso verificar `epiuse.com.br` na Resend (SPF/DKIM no DNS) e apontar `FROM_EMAIL=voices@epiuse.com.br`. Nenhum código contorna isso — é regra da Resend.
