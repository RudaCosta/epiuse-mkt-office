# 🗺️ ROADMAP único — EPI-USE Office

> Fonte única do backlog. TODAS as ferramentas (Claude/Codex/Obsidian/openclaw) leem antes de pegar tarefa.
> Trava de quem-mexe-em-quê: `_LOCK.md`. Protocolo: `multi-tool-protocol.md`.
> Última atualização: 30/mai/2026 (v0.7.0, Opus 4.8).

---

## 🟢 Agora no ar (local)
- **v0.6.4** rodando em `http://localhost:3000` (sobe sozinho ao logar · auto-restart 5min)
- Produção Railway: **v0.4.6** (defasada — precisa redeploy quando Rudá autorizar)

---

## 🚀 Sprint v0.7.0 — Estabilização + Design Codex + Multi-tool (EM ANDAMENTO)

| Bloco | O quê | Status |
|---|---|---|
| 0 | Backup local (tag `v0.6.4-snapshot`) | ✅ feito |
| A | Localhost always-on (fix better-sqlite3 Node 24 + Tarefa Agendada) | ✅ feito |
| E | Multi-tool "livre com trava" (_LOCK + protocolo + este ROADMAP) | ✅ feito |
| B | **Migração design → paleta Codex oficial** (#013A6A + Open Sans) | ⏳ aguarda OK Rudá + olho da Duda |
| C | Varredura de bugs (smoke 18 rotas) | 🟡 parcial (8 rotas OK) |
| D | Railway P0 persistência SQLite (DATA_DIR já no código) | ⏳ Rudá cria Volume no dashboard |
| F | Bump v0.7.0 + changelog + push | ⏳ aguarda ordem de push |

---

## 🔮 Próxima leva (pós-v0.7.0)
- **SSO Microsoft** (login @epiuse) — credenciais em mãos, mas **secret precisa ser rotacionado** (foi colado no chat). ~11-15h. Doc: `sso-microsoft-plan.md`.
- **openclaw** — integrar quando Rudá explicar o que é.
- Refactor final: hex hardcoded → tokens nas telas restantes + Shadow DOM (office-nav/footer).

---

## 📋 Backlog herdado (do plano antigo, ainda válido)
- **P0** Railway Volume SQLite (= Bloco D)
- **P3** Validar Voice Index em produção (1 kit real)
- **F9/F10** Duplicar Voice · dark auto pelo OS
- **F2** Editor token via session cookie (pré-SSO)
- **GA4 + Search Console** — aguarda Service Account JSON + Property ID (Teams DM)
- **Trello API** — aguarda Key + Token + Board IDs (Teams DM)
- Integrações pendentes: Instagram Graph · RD Personal Token · CRM oficial (qual?)

> Detalhe técnico de cada item: `C:\Users\Ruds\.claude\plans\...dreamy-adleman.md` (plano mestre Claude).
