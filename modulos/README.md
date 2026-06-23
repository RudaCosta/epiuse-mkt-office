# Módulos — Índice

> Cada módulo vive aqui com seu próprio contexto.
> Ver [`docs/MODULES.md`](../docs/MODULES.md) para documentação detalhada de cada um.

---

## Módulos existentes

| Pasta | Módulo | Status |
|---|---|---|
| `10-painel-duda/` | Painel da Duda (Módulo C) | 🚧 Em construção |
| `11-jarvis-sdr/` | JARVIS — Copiloto SDR/BDR (biz dev · `/jarvis`) | 🟢 v0.1 (GUI + voz + IA) |

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
