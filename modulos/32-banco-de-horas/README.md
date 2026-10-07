# Módulo 32 — ⏰ Banco de Horas MKT

**Status:** ✅ v2.0 · redesenho + atalhos (06/out/2026, v0.94.0) · v1 em 03/set/2026 (v0.89.0)
**Rota:** `/horas` (área `time` — só o time de Marketing)
**Código:** `routes/horas.js` · `public/horas.html` · `public/js/horas.js`
**Dona:** Bruna (Intelligence) · painel do time: Rudá (super admin)

## Por que existe

O time tinha um combinado interno de anotar as horas a mais pra controle. O módulo formaliza isso no Office: cada pessoa registra quando fica a mais (+) ou sai mais cedo (−), o saldo acumula, e o Rudá é avisado por e-mail quando alguém passa de +8h.

## Regras

- Saldo **acumulativo**, sem validade e **sem aprovação**.
- Cada pessoa vê **só o próprio** saldo. O **super admin** (por e-mail, `SUPER_ADMIN_EMAILS`) vê o painel do time e pode apagar registros de qualquer um.
- E-mail pro `NOTIFY_EMAIL` (Rudá) a cada **+8h** acumuladas (8, 16, 24…), uma vez por patamar (`hour_notifications`).
- Máx. 16h por registro, sem datas futuras.

## Experiência (v2 · linguagem do `/cafezinho` e `/onboarding`)

| Seção | O que tem |
|---|---|
| Hero | anel animado com o saldo e o caminho até o próximo aviso de +8h · a mais / a menos no mês · último registro · CSV |
| Visão do time | só super admin: cartão por pessoa (saldo, +/−, alerta +8h), clique abre o histórico dela · CSV do time |
| Registrar | "Fiquei a mais / Saí mais cedo", chips de horas + stepper de 30 min, Hoje/Ontem/data, categoria, motivo · prévia do saldo depois do registro · atalho `N` |
| Últimos 6 meses | barras a mais × a menos por mês |
| Histórico | agrupado por mês, saldo corrido, filtro, editar, apagar com "Desfazer" |

## Atalhos

- Home: "Seus atalhos" de cada persona do time (`public/api/personas.json`) com selo do saldo (`home.js → badgeHoras`).
- Menu do Office (overflow → Escritório Virtual) e menu do usuário (saldo + "Registrar horas").
- Ctrl/⌘+K: "Banco de Horas", "Registrar horas a mais", "Registrar horas a menos".
- Deep links: `/horas#registrar`, `/horas?tipo=menos&h=2#registrar`.

## API

| Método | Rota | Quem |
|---|---|---|
| GET | `/api/horas/resumo` | saldo, mês, série 6 meses, categorias, `admin`, `time` (só admin) |
| GET | `/api/horas/saldo` | saldo simples (home/menu) |
| GET | `/api/horas?email=` | histórico (email só pro admin) |
| GET | `/api/horas/export.csv?todos=1` | CSV próprio · `todos=1` só admin |
| POST | `/api/horas` | novo registro |
| PATCH | `/api/horas/:id` | editar (só o próprio) |
| DELETE | `/api/horas/:id` | apagar (próprio; admin qualquer um) |

Tabelas: `hour_logs` (categoria na coluna `project`) · `hour_notifications`.
Permissões: `routes/acesso.js` → `/horas` e `/api/horas/*` na área `time`.
