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
