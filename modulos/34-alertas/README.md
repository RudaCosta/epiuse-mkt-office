# Módulo 34 — Central de Alertas & Relatórios por e-mail

**Status:** ✅ v1.0 (0.96.0 · 07/out/2026)
**Rotas:** `/alertas` (todo mundo logado) · `/admin/alertas` (super admin) · sino do `office-nav`
**Código:** `routes/alertas.js` (motor, API, agendador) · `routes/alertas-relatorios.js` (dados + HTML dos e-mails) · `routes/email.js` (envio único do Office) · `public/alertas.html` · `public/admin-alertas.html` · `public/office-nav.js` (sino)
**Teste:** `node scripts/tests/alertas.js`

## Por que existe
Pedido do Rudá (05/out): *"reformulação completa nos alertas, quero que sejam úteis, envie e-mails de coisas importantes, relatórios semanais e mensais automaticamente."*

O que havia antes não servia:
- O sino mostrava **4 frases escritas à mão no `voices.json` em maio**, que nunca mudavam (regra 7).
- O badge contava tudo e nunca zerava: não existia "lido" nem "silenciar".
- "Ver tudo" levava à área Brand pra qualquer pessoa.
- Todo e-mail do Office (inscrição de Voice, brindes, Loja, banco de horas, resumo semanal) saía com `FROM_EMAIL=voices@resend.dev`, remetente que a Resend recusa, e **ninguém checava o `{ error }`** que o SDK devolve. Resultado: nada chegava e o log dizia que tinha chegado.

## Como funciona

```
a cada 30 min ─► REGRAS (dado real) ─► alertas_estado (abre · muda · resolve sozinho)
                                         │
             ┌───────────────────────────┼──────────────────────────────┐
             ▼                           ▼                              ▼
   sino + /alertas (por área,   e-mail de CRÍTICO (dia útil     relatório SEMANAL (seg 8h)
   lido/silenciar por pessoa)   8h–19h, 1x por ocorrência)      relatório MENSAL (1º dia útil 9h)
```

### Níveis
| Nível | Exemplo | Onde aparece |
|---|---|---|
| 🔴 Crítico | Apollo sem atualizar há 26h+, calendário editorial com erro no Graph, Cases sem sync há 7 dias | sino + e-mail na hora + relatórios |
| 🟡 Importante | pauta parada 7d, prazo vencido, evento em 14d sem briefing, bounce ≥ 5%, resgate esperando 48h | sino + relatório semanal |
| 🔵 Para saber | resgate novo, inscrição nova, sequência marcada como fraca | só no sino e em `/alertas` |

O catálogo completo de regras (com o limiar de cada uma) está em `/admin/alertas` → "O que é monitorado", gerado do próprio código.

### Quem vê
Segue o `routes/acesso.js`: cada alerta tem área(s) dona(s) e cada pessoa vê os das áreas que abre. `admin` (e-mail, Loja, inscrições, comunicados) é só do super admin. Alertas pessoais (resgate decidido, pauta esperando a revisão do próprio Voice) são calculados na hora e não vão por e-mail.

### Quem recebe e-mail
Configurado em `/admin/alertas` (guardado em `app_blobs['alertas.config']`):
- Por canal (crítico · semanal · mensal): liga/desliga + lista de e-mails. Padrão: `ALERTAS_EMAILS` ou `NOTIFY_EMAIL`.
- "Donas das áreas" (desligado por padrão): recebem os críticos da área delas e/ou um semanal só da área. A dona é achada pelo papel em Permissões.
- Só passam endereços da allowlist (`COMUNICADOS_DOMINIOS` + `COMUNICADOS_EMAILS_EXTRA`), a mesma do Módulo 21.

### Relatórios
- **Semanal** (seg a qua, a partir das 8h, 1x por semana ISO): precisa de você (alertas abertos), o que andou × semana anterior (pautas, posts, inscrições, conteúdo, Apollo, JARVIS, cliques, coins), próximos 14 dias (eventos, calendário, prazos de pautas), saúde das fontes, uso do Office. Substitui o "resumo semanal" do Módulo 17.
- **Mensal** (1º dia útil, a partir das 9h; se perder, tenta até o dia 7): KPIs do `/relatorio` do mês fechado (mesma função `_relatorioSnapshotMes`), operação × mês anterior, alertas do mês, saúde das fontes, links pro `/relatorio?mes=` e pro PPT.

## Variáveis de ambiente
| Variável | Padrão | Para quê |
|---|---|---|
| `RESEND_API_KEY` | — | sem ela nada sai (vira alerta pro admin) |
| `FROM_EMAIL` | `onboarding@resend.dev` | remetente; com fallback automático pro de teste |
| `ALERTAS_EMAILS` | `NOTIFY_EMAIL` | destinatários padrão dos 3 canais (endereços de env passam na allowlist mesmo fora do domínio, ver D12) |
| `ALERTAS_EMAIL_ENABLED` | `true` | `false` desliga todo envio automático |
| `ALERTAS_EMAIL_LOCAL` | `false` | no Office local (Windows) o envio automático fica desligado, pra não duplicar com o Railway |
| `ALERTAS_AGENDADOR` | `true` | `false` não roda varredura nem agendador (testes) |
| `OFFICE_URL` | `https://office.epiuse.com.br` | base dos links nos e-mails |

## Tabelas
- `alertas_estado`: um registro por alerta (id estável `regra[:sub]`): aberto/mudou/visto/resolvido/e-mail.
- `alertas_leitura`: lido e silenciado por pessoa.
- `alertas_ocorrencias`: uma linha por abertura → resolução (base das contagens dos relatórios).
- `email_log`: toda tentativa de e-mail do Office (enviado · falhou · pulado).

## Como adicionar uma regra
1. Em `routes/alertas.js`, adicionar um objeto em `REGRAS` com `id`, `areas`, `nivel`, `nome`, `quando` (texto que aparece no admin) e `run()` → `[{ titulo, detalhe, href, sub?, nivel?, areas? }]`.
2. `run()` só lê dado real; sem dado, devolve `[]`. Nunca estimar.
3. Cobrir no `scripts/tests/alertas.js`.
