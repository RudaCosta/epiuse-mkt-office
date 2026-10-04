# Módulos — Índice

> Cada módulo vive aqui com seu próprio contexto.
> Ver [`docs/MODULES.md`](../docs/MODULES.md) para documentação detalhada de cada um.

---

## Módulos existentes

| Pasta | Módulo | Status |
|---|---|---|
| `10-painel-duda/` | Painel da Duda (Módulo C) | 🚧 Em construção |
| `11-jarvis-sdr/` | JARVIS — Copiloto SDR/BDR (biz dev · `/jarvis`) | 🟢 v0.10 (captura áudio da call + STT free no navegador · beta) |
| `20-aeo-geo/` | AEO/SEO/GEO — Visibilidade em IA (`/aeo-geo`) | 🟢 v0.1 (diagnóstico AEO Grader + plano de ação + dashboard) |
| `22-cafezinho/` | Cafezinho — área pessoal do time (cartões flip, aniversários, zodíaco, mural) + tracking só do dono (`/cafezinho`) | ✅ v2.0 |
| `24-blog-converter/` | Blog Converter — artigo → template HTML do blog (brand · `/blog-converter`) | ✅ v3.0 (IA via Gemini grátis do Office · seleção de componentes · docx/pdf no navegador) |
| `25-calendario-editorial/` | Calendário Editorial — planilha do marketing em 3 telas (`/editorial/*`, Intelligence + Brand) | ✅ v1.0 Fase 1 (parse 3 abas · resync) · ⏳ Fase 2 Graph aguarda TI |
| `26-onboarding/` | Onboarding de Marketing — trilha com modo foco, animações e ERP Coins (`/onboarding`) | ✅ v2.2 · certificado + rastreamento |
| `27-area-intelligence/` | Área Intelligence — página de trabalho da Bruna (atalhos, fila de atenção, dados em abas) + tracking "quem viu o quê" só do dono (`/area/intelligence`, `/admin/intelligence`) | ✅ v1.1 |
| `28-area-eventos/` | Área Eventos — página visual do Field Marketing (contagem regressiva, calendário BR+LATAM animado, MDF, ROI) + tracking "quem viu o quê" só do dono (`/area/eventos`, `/admin/eventos`) | ✅ v1.0 |
| `29-area-pipeline/` | Área Pipeline / Biz Dev — só fontes automáticas: Apollo com refresh no servidor (máquina de outbound animada, sequências, ritmo) + voz do campo do JARVIS; Zoho virou link · tracking "quem viu o quê" só do dono (`/area/pipeline`, `/admin/pipeline`) | ✅ v1.0 |

## Módulos sem pasta própria (documentados em `docs/MODULES.md`)

| # | Módulo | Página |
|---|---|---|
| 00 | Design System | `/design` |
| 01 | Relatório Mensal | `/relatorio` |
| 02 | Voices Optimizer | `/optimizer`, `/optimizer-v2` |
| 03 | Metas FY26 | `/metas` |
| 04 | Artigos Blog | `/artigos` |
| 05 | Cases CS | `/cases` |
| 06 | Inbound Pipeline | `/inbound`, `/cowork`, `/jornadas` |
| 07 | Pipeline Apollo | `/pipeline` |
| 99 | Integrações Pendentes | — |

---

## Como criar um novo módulo

```
modulos/NN-nome-do-modulo/
├── README.md       ← propósito · status · arquivos-chave
├── CHANGELOG.md    ← histórico de versões do módulo
├── DECISIONS.md    ← decisões arquiteturais + rationale
└── PENDENCIAS.md   ← TODOs específicos do módulo
```

Regra: ao trabalhar em um módulo, abrir **somente** `modulos/NN-nome/` + `CLAUDE.md` raiz — não puxar contexto de outros módulos.
