# 🔍 Auditoria DE/PARA — Dados reais vs fake (Regra 7)

> Feito 30/mai/2026 (Opus 4.8) DEPOIS que o Rudá pegou o Claude afirmando "dados reais" sem conferir.
> Mea culpa: eu chamei de real o que era placeholder. Este doc conserta o registro com EVIDÊNCIA.
> Legenda: 🟢 real · 🟡 real-mas-stale/manual · 🔴 FAKE (chumbado sem fonte) · ⏳ aguarda integração

---

## Módulo a módulo (com evidência de código)

| Módulo | Métrica | Veredito | Evidência / Fonte | Ação |
|---|---|---|---|---|
| **/metas** | Seguidores hoje (era `7.844`) | 🔴→🟢 **CORRIGIDO** | era hardcoded em metas.html:172, ERRADO. Real = **10.481** (abr/26). Agora puxa de `linkedin-historical.json` | ✅ feito 30/mai |
| **/metas** | Ganhos 12m (era `1.456`) | 🔴→🟢 **CORRIGIDO** | hardcoded, inconsistente. Real = **2.279** (jan/25→abr/26) | ✅ feito |
| **/metas** | Demografia (SP 4.096, TI 2.107…) | 🟡 real-frozen | metas.html:260-290 hardcoded MAS bate com xls | wire pro json (próximo) |
| **/metas-fy26** | 29 metas — realizado | 🟢 honesto | metas-fy26.json: realizado **vazio** + `fonte: (pending)` | OK (não finge) |
| **/metas-fy26** | metas (targets) | 🟢 real | docx oficial "Metas EPI-USE FY26" | OK |
| **/relatorio** | LinkedIn (seguidores/novos/impressões/demografia) | 🟡 real-stale | server.js:1013 lê `linkedin-historical.json` (xls). Real, mas último ponto = abr/26 | atualizar xls mensal OU LinkedIn API |
| **/relatorio** | Site (usuários/views/sessão) | ⏳ não integrado | relatorio.html:390-392 mostra `—` + "Aguarda GA4" | **precisa GA4** (creds Rudá) |
| **/relatorio** | Instagram | ⏳ não integrado | relatorio.html:397-399 `—` "Aguarda Graph API" | **precisa Instagram Graph** |
| **/relatorio** | E-mail (abertura/cliques/leads) | ⏳ não integrado | relatorio.html:403-405 `—` | **precisa RD Personal Token** |
| **/cases** | 19 cases Roberto | 🟡 real-local | sync OneDrive→SQLite. **Em prod resetou p/ 3 seeds** no deploy | re-sync + Volume Railway |
| **/pipeline** | R$/MQL/SQL/reuniões | ⏳ vazio | Apollo MCP conectado mas não wired na UI | **build Apollo→pipeline** |
| **/artigos** | 693 artigos | 🟢 real | artigos.json (xls Manus) | OK |
| **/dashboard** | KPIs vários | 🔴 a auditar | provável hardcoded — não verifiquei ainda | **auditar próximo** |
| **/projecoes** | cenários paid media | 🔮 projeção (rotulado) | fórmula explícita, premissas marcadas | OK (é projeção, não finge real) |

---

## A verdade dura

1. **A maioria dos números de NEGÓCIO (site, instagram, email, pipeline, CRM) NÃO está integrada.** Mostra `—` (honesto na v0.7.0) ou estava chumbado (/metas, agora corrigido).
2. **O que é "real" hoje vem de ARQUIVO (xls/docx/json), não de API ao vivo** → fica STALE. LinkedIn parou em abr/26.
3. **GA4 nunca foi configurado.** Eu não tenho como configurar sozinho — precisa de Service Account no Google Cloud DO RUDÁ (não crio conta de terceiro).

## Plano pra virar TUDO real (por plataforma)

| Plataforma | Destrava | Credencial que preciso (Teams DM) | Esforço |
|---|---|---|---|
| **Google Analytics 4** | Site: usuários, views, sessão | Service Account JSON + GA4 Property ID | 3-4h |
| **Search Console** | SEO: queries, CTR, posição | (mesmo SA do GA4) | 2h |
| **Apollo** (✅ conectado) | Pipeline R$/MQL/SQL/reuniões/emails | nada — posso começar JÁ | 3-4h |
| **Trello** | Tarefas + parte do pipeline | API Key + Token + Board IDs | 3h |
| **RD Station** | Email: abertura/cliques/leads/newsletter | Personal API Token (admin master) | 2h |
| **Instagram Graph** | IG: seguidores/alcance | Business account + FB App | 3h |
| **LinkedIn** | Atualizar seguidores sem xls manual | Company Page Admin API (ou xls mensal) | 4h / 0h |

---

*Mantido vivo. Cada vez que um dado virar real, atualizar a linha aqui.*
