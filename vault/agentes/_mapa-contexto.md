# 🗺️ Mapa de Agentes × Contexto (3 camadas)

> Atualizado 31/mai/2026. O escritório agora espelha a organização por ÁREA/DONA. 3 camadas: CEO orquestra → 6 agentes de área (1 por dona) → 4 executores transversais. Ver tela viva em `/agentes` no Office.

## Arquitetura

```mermaid
graph TD
    H[👤 Rudá / Duda] -->|pedido| CEO

    subgraph MESTRE["🧠 Contexto mestre — vault/00-contexto/"]
        EMP[empresa]; PRJ[projetos]; BRD[branding]; PES[pessoas]; DSG[DESIGN]; MAP[mapa-fontes]
    end

    CEO[🎯 ceo-mkt · lê TUDO · orquestra]

    CEO --> AI[🧠 area-intelligence<br/>Bruna]
    CEO --> AG[🚀 area-growth<br/>Gui]
    CEO --> AE[📅 area-eventos<br/>Fernanda]
    CEO --> AP[📞 area-pipeline<br/>Marlison]
    CEO --> AB[🎨 area-brand<br/>Duda]
    CEO --> AC[📣 area-conteudo<br/>Lisiane]

    AG --> CAM & CRI & AC
    AE --> CRI & LP
    AP --> PRO & AI
    AB --> CRI & LP
    AC --> CRI
    AI --> CAM

    CRI[🎨 criativos]; LP[💻 landing-pages]; PRO[📄 propostas]; CAM[📊 campanhas]

    CEO -.lê.-> MESTRE
    AI -.lê.-> EMP & PRJ & MAP
    AG -.lê.-> EMP & PRJ & BRD & MAP
    AE -.lê.-> EMP & PRJ & BRD
    AP -.lê.-> EMP & PRJ & MAP
    AB -.lê.-> BRD & PES & DSG & PRJ
    AC -.lê.-> BRD & EMP & PRJ
```

## Camadas

### 🎯 Orquestrador
- **ceo-mkt** — lê o mestre todo, decompõe pedidos, delega pra área dona ou executor, consolida.

### 🏢 Agentes de área (1 por dona) — donos do contexto da área
| Agente | Dona | Lê | Módulo | Aciona |
|---|---|---|---|---|
| `area-intelligence` | Bruna | empresa·projetos·mapa-fontes | `/area/intelligence` | campanhas |
| `area-growth` | Gui | empresa·projetos·branding·mapa-fontes | `/area/growth` | campanhas·criativos·conteúdo |
| `area-eventos` | Fernanda | empresa·projetos·branding | `/area/eventos` | criativos·LPs |
| `area-pipeline` | Marlison | empresa·projetos·mapa-fontes | `/area/pipeline` | propostas·intelligence |
| `area-brand` | Duda | branding·pessoas·DESIGN·projetos | `/area/brand` | criativos·LPs |
| `area-conteudo` | Lisiane | branding·empresa·projetos | `/area/conteudo` | criativos |

### 🛠️ Executores transversais (chamados pelas áreas)
`criativos` · `landing-pages` · `propostas` · `campanhas` — cada um com seu escopo (ver `.claude/agents/<nome>.md`).

## Princípio (Regra 9 estendida aos agentes)
1 fonte mestre · cada agente declara seu escopo · subagente abre fresco (herda só o que o CEO/área passa + sua fatia) → menos token, menos alucinação cruzada. CEO = única visão global.

Ver: [[_index]] · perfis em `vault/agentes/` · definições em `.claude/agents/`.
