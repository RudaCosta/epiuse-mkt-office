# 🗺️ ROADMAP único — EPI-USE Office

> Fonte única do backlog. TODAS as ferramentas (Claude/Codex/Obsidian/openclaw) leem antes de pegar tarefa.
> Trava de quem-mexe-em-quê: `_LOCK.md`. Protocolo: `multi-tool-protocol.md`.
> Última atualização: 04/jun/2026 (v0.11.0).

---

## 🟢 Agora no ar
- **v0.11.0** rodando em `http://localhost:3000` (sobe sozinho ao logar · auto-restart 5min)
- Produção Railway: versão anterior (defasada — aguarda push autorizado por Rudá)

---

## ✅ Sprints concluídas (S1 → S16)

| Sprint | Versões | Entrega principal |
|---|---|---|
| S1-S3 | 0.2.x–0.3.x | Game 2D · Voices · Painel Duda · Inbound · SQLite |
| S4 | 0.4.0–0.4.12 | Optimizer Vision · Voice Index · PDF · Cases reais |
| S5 | 0.5.0–0.5.1 | /relatorio · /artigos · /jornadas · /projecoes · /pipeline · Regra 7 |
| S6 | 0.6.0–0.6.4 | Design System (DESIGN.md + gen_tokens) · Brand oficial · logos |
| S7 | 0.7.0–0.7.1 | Localhost always-on · paleta Codex · dados reais · migração C:\ |
| S8 | 0.8.0 | SSO Microsoft + 6 módulos por área com dado real |
| S9-S11 | 0.8.1–0.8.3 | Arquitetura 3-camadas · relatorio-mensal · pipeline 5 agentes |
| S12-S13 | 0.9.0–0.9.5 | Optimizer refundado (zero tokens · V2 findskill · padrão Anderson) |
| S14 | 0.10.0–0.10.1 | Cowork + workflows dinâmicos entre agentes |
| S15 | 0.11.0 | Módulo C · Daily Digest + Inbox por área no Painel da Duda |
| S16 | 1.0.0 | Lançamento oficial · SemVer real · versionamento sincronizado |

---

## 🚀 Próximas prioridades (pós-v1.0.0)

### 🔴 P0 — Bloqueado por ação humana
- **Railway Volume SQLite** — Rudá cria Volume no dashboard (30min) → sem isso cases reais somem a cada deploy
- **Push v1.0.0 para Railway** — aguarda ordem explícita de Rudá

### 🟡 P1 — Dados reais (desbloqueios em aberto)
- Apollo → /pipeline já roda com dado real
- GA4 + Search Console → aguarda Service Account JSON + Property ID (Teams DM)
- Instagram Graph → aguarda Business + FB App
- LinkedIn → atualizar xls mensal
- Planilha Duda (calendar editorial) → Rudá cobrar Duda

### 🟡 P2 — SSO Microsoft (código pronto, faltam 5 passos no Azure)
- Ver `vault/00-contexto/pendencias.md` → B1 para checklist completo

### 🟢 P3 — Qualidade
- Smoke test das 10 rotas restantes (8/18 validadas até agora)
- Remover botão "📤 Sync RD" do /inbound/calendar (RD Station dropado 26/mai)
- Shadow DOM no office-nav/footer (isolamento de estilos)

### 🔵 Backlog futuro
- Cron diário Cases OneDrive → Railway prod (1h de trabalho, já spec em pendencias.md P2)
- Report PDF automático (pós dados reais)
- Office Engine 2D (spec pronta em `EPI-USE-OFFICE-MASTER-BRIEF.md`)
- openclaw — integrar quando Rudá explicar o que é
